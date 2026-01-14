import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccbb900-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object Model for the adjacency matrix app
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numVertices = page.locator('#numVertices');
    this.directed = page.locator('#directed');
    this.weighted = page.locator('#weighted');
    this.edgesInput = page.locator('#edgesInput');
    this.generateBtn = page.locator('#generateMatrixBtn');
    this.matrixOutput = page.locator('#matrixOutput');
    this.graphSVG = page.locator('#graphSVG');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click generate button and wait a short time for DOM updates
  async clickGenerate() {
    await Promise.all([
      this.page.waitForTimeout(50), // allow potential event handlers to schedule
      this.generateBtn.click()
    ]);
  }

  async setNumVertices(value) {
    await this.numVertices.fill(String(value));
  }

  async setDirected(checked) {
    const isChecked = await this.directed.isChecked();
    if (isChecked !== checked) {
      await this.directed.click();
    }
  }

  async setWeighted(checked) {
    const isChecked = await this.weighted.isChecked();
    if (isChecked !== checked) {
      await this.weighted.click();
    }
  }

  async setEdges(text) {
    await this.edgesInput.fill(text);
  }

  // Returns a handle to the generated table if present
  async getMatrixTable() {
    return this.matrixOutput.locator('table');
  }

  // Parse matrix table into a 2D array of strings (cells)
  async readMatrixTable() {
    const table = await this.getMatrixTable();
    if (!(await table.count())) return null;
    // Extract header count to know size
    const headerCols = await table.locator('thead tr th').count();
    // the first th is corner, so number of vertices = headerCols - 1
    const n = headerCols > 0 ? headerCols - 1 : 0;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const cells = [];
      // Skip the row header first <th> in each row; then n td
      const row = table.locator(`tbody tr`).nth(i);
      // collect td values
      const tdCount = await row.locator('td').count();
      for (let j = 0; j < tdCount; j++) {
        const td = row.locator('td').nth(j);
        const txt = (await td.textContent())?.trim() ?? '';
        cells.push(txt);
      }
      rows.push(cells);
    }
    return rows;
  }

  // Count total number of direct children elements in the SVG (approximate measure of drawing)
  async countSVGChildren() {
    return await this.page.evaluate(() => {
      const svg = document.getElementById('graphSVG');
      if (!svg) return -1;
      return svg.children.length;
    });
  }

  // Helper to find SVG text elements that match given text content
  async findSVGTextByContent(content) {
    return this.page.locator(`#graphSVG text`, { hasText: content });
  }
}

test.describe('Adjacency Matrix Visualization - FSM and UI tests', () => {
  // capture console error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push({
        message: err.message,
        stack: err.stack
      });
    });
  });

  test.afterEach(async () => {
    // No-op here; per-test assertions will validate console/page errors
  });

  test.describe('FSM States (S0_Idle and S1_MatrixGenerated)', () => {
    test('Initial Idle state renders controls and default inputs (S0_Idle)', async ({ page }) => {
      // Validate the initial UI renders the expected controls (generate button, inputs, textarea)
      const app = new AdjacencyPage(page);
      await app.goto();

      // Controls should exist
      await expect(app.generateBtn).toBeVisible();
      await expect(app.numVertices).toBeVisible();
      await expect(app.directed).toBeVisible();
      await expect(app.weighted).toBeVisible();
      await expect(app.edgesInput).toBeVisible();
      await expect(app.matrixOutput).toBeVisible();
      await expect(app.graphSVG).toBeVisible();

      // Default number of vertices should be 4 (as per HTML value)
      await expect(app.numVertices).toHaveValue('4');

      // The page script automatically triggers a generate on load. We still assert that the generate button exists.
      // Ensure there were no unexpected console errors or page errors on load.
      expect(consoleErrors, 'Console errors should be empty on load').toEqual([]);
      expect(pageErrors, 'Page errors should be empty on load').toEqual([]);
    });

    test('Generating matrix displays table and draws graph (S1_MatrixGenerated)', async ({ page }) => {
      // This test validates the transition from Idle -> Matrix Generated when the user clicks generate.
      const app = new AdjacencyPage(page);
      await app.goto();

      // Ensure we have a matrix table after generation. The page triggers an initial generation already;
      // still explicitly click generate to simulate user event.
      await app.clickGenerate();

      const matrixTable = await app.getMatrixTable();
      await expect(matrixTable).toHaveCount(1);

      // Read the produced matrix into an array
      const matrix = await app.readMatrixTable();
      expect(matrix, 'Matrix should be a 2D array').not.toBeNull();
      // Default n=4 -> expect 4 rows with 4 columns
      expect(matrix.length).toBe(4);
      matrix.forEach(row => expect(row.length).toBe(4));

      // Check specific known entries from default edges:
      // default edges in textarea: "0 1\n0 2\n1 2\n2 3" and undirected => matrix[0][1]=1 and matrix[1][0]=1
      expect(matrix[0][1]).toBe('1');
      expect(matrix[1][0]).toBe('1');
      // There should be an entry for edge 2-3
      expect(matrix[2][3]).toBe('1');
      expect(matrix[3][2]).toBe('1');

      // Graph SVG should contain SVG children representing edges and nodes (non-zero)
      const svgChildCount = await app.countSVGChildren();
      expect(svgChildCount).toBeGreaterThan(0);

      // No console / page errors produced during generation
      expect(consoleErrors, 'No console.error messages expected during matrix generation').toEqual([]);
      expect(pageErrors, 'No uncaught page errors expected during generation').toEqual([]);
    });
  });

  test.describe('Events and Transitions (GenerateMatrix and variations)', () => {
    test('Directed vs undirected produces asymmetric vs symmetric matrices', async ({ page }) => {
      // Validate transition with directed checkbox toggled
      const app = new AdjacencyPage(page);
      await app.goto();

      // Use n=3 and edges that will illustrate directionality
      await app.setNumVertices(3);
      // edges: 0->1 and 1->2 (directed)
      await app.setEdges('0 1\n1 2');
      await app.setDirected(true);
      await app.setWeighted(false);

      // Click generate and read matrix
      await app.clickGenerate();
      const matrix = await app.readMatrixTable();
      expect(matrix.length).toBe(3);
      // For directed graph, matrix[0][1] == 1, but matrix[1][0] == 0
      expect(matrix[0][1]).toBe('1');
      expect(matrix[1][0]).toBe('0');

      // Now toggle to undirected and regenerate: should be symmetric
      await app.setDirected(false);
      await app.clickGenerate();
      const symmetricMatrix = await app.readMatrixTable();
      expect(symmetricMatrix[0][1]).toBe('1');
      expect(symmetricMatrix[1][0]).toBe('1');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Weighted edges are rendered in matrix and labeled in SVG', async ({ page }) => {
      const app = new AdjacencyPage(page);
      await app.goto();

      // Setup weighted graph n=3 with edges including weights
      await app.setNumVertices(3);
      await app.setWeighted(true);
      await app.setDirected(false); // undirected to see single weight labels
      await app.setEdges('0 1 5\n1 2 7');

      await app.clickGenerate();

      const matrix = await app.readMatrixTable();
      expect(matrix.length).toBe(3);
      // weighted table should show weights (empty string for 0 entries)
      expect(matrix[0][1]).toBe('5');
      expect(matrix[1][0]).toBe('5');
      expect(matrix[1][2]).toBe('7');
      expect(matrix[2][1]).toBe('7');

      // Check that SVG contains text elements for those weights.
      // Weight labels are drawn as <text> elements with textContent equal to weight values.
      const weightFiveLocator = await app.findSVGTextByContent('5');
      const weightSevenLocator = await app.findSVGTextByContent('7');

      await expect(weightFiveLocator.first()).toBeVisible();
      await expect(weightSevenLocator.first()).toBeVisible();

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Invalid number of vertices (0) triggers alert and prevents generation', async ({ page }) => {
      const app = new AdjacencyPage(page);
      await app.goto();

      // set to valid initial state first to have an existing matrix
      await app.setNumVertices(3);
      await app.setEdges('0 1\n1 2');
      await app.setWeighted(false);
      await app.setDirected(false);
      await app.clickGenerate();
      const beforeMatrix = await app.readMatrixTable();
      expect(beforeMatrix.length).toBe(3);

      // Now set invalid number of vertices (0) and try to generate; expect an alert
      const dialogs = [];
      page.once('dialog', dialog => {
        dialogs.push({ message: dialog.message(), type: dialog.type() });
        dialog.accept();
      });

      await app.setNumVertices(0);
      await app.clickGenerate();

      // Ensure the alert was shown with expected message
      expect(dialogs.length).toBeGreaterThan(0);
      expect(dialogs[0].message).toContain('Number of vertices must be between 1 and 10');

      // Matrix should remain as before (generation prevented)
      const afterMatrix = await app.readMatrixTable();
      expect(afterMatrix).not.toBeNull();
      expect(afterMatrix.length).toBe(beforeMatrix.length);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Weighted parsing error (missing weight) triggers alert and cancels generation', async ({ page }) => {
      const app = new AdjacencyPage(page);
      await app.goto();

      // Prepare a previous valid matrix to compare later
      await app.setNumVertices(3);
      await app.setWeighted(false);
      await app.setEdges('0 1\n1 2');
      await app.clickGenerate();
      const priorMatrix = await app.readMatrixTable();
      expect(priorMatrix.length).toBe(3);

      // Now turn on weighted mode but provide an edge line missing the weight -> should alert
      const dialogs = [];
      page.once('dialog', dialog => {
        dialogs.push({ message: dialog.message(), type: dialog.type() });
        dialog.accept();
      });

      await app.setWeighted(true);
      // Missing weight on the first line
      await app.setEdges('0 1\n1 2 5');
      await app.clickGenerate();

      expect(dialogs.length).toBeGreaterThan(0);
      // The alert message for missing weight includes "expected: src dest weight"
      expect(dialogs[0].message).toContain('expected: src dest weight');

      // Generation should not proceed -> matrix remains prior state
      const matrixAfter = await app.readMatrixTable();
      expect(matrixAfter).not.toBeNull();
      expect(matrixAfter.length).toBe(priorMatrix.length);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Edges with out-of-range vertex indices trigger alert', async ({ page }) => {
      const app = new AdjacencyPage(page);
      await app.goto();

      // set n=3
      await app.setNumVertices(3);
      await app.setWeighted(false);
      await app.setEdges('0 5'); // dest 5 out of range

      const dialogs = [];
      page.once('dialog', dialog => {
        dialogs.push({ message: dialog.message(), type: dialog.type() });
        dialog.accept();
      });

      await app.clickGenerate();

      expect(dialogs.length).toBeGreaterThan(0);
      expect(dialogs[0].message).toContain('Invalid values in line');

      // No console or uncaught page error
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Console and page error observation', () => {
    test('No unexpected console.error or uncaught page errors during normal flows', async ({ page }) => {
      // This test explicitly drives a few normal flows and asserts there are no console errors or page errors observed.
      const app = new AdjacencyPage(page);
      await app.goto();

      // Normal generation (initial)
      await app.clickGenerate();

      // Toggle directed & weighted with valid inputs
      await app.setNumVertices(4);
      await app.setEdges('0 1\n1 2\n2 3');
      await app.setDirected(true);
      await app.setWeighted(false);
      await app.clickGenerate();

      await app.setWeighted(true);
      await app.setEdges('0 1 2\n1 2 3\n2 3 4');
      await app.clickGenerate();

      // After performing normal flows, ensure no console errors or uncaught page errors occurred
      expect(consoleErrors, 'Expected no console.error messages across normal flows').toEqual([]);
      expect(pageErrors, 'Expected no uncaught page errors across normal flows').toEqual([]);
    });
  });
});