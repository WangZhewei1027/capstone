import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa595-d59e-11f0-89ab-2f71529652ac.html';

// Page object encapsulating interactions with the adjacency matrix page
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.vertexCountInput = page.locator('#vertexCount');
    this.createButton = page.locator('#createMatrix');
    this.matrixContainer = page.locator('#matrixContainer');
    this.adjacencyTable = page.locator('#adjacencyMatrix');
    this.submitButton = page.locator('#submitMatrix');
    this.output = page.locator('#output');
  }

  // Navigates to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set vertex count value (string or number) and click Create
  async createMatrix(vertexCount) {
    await this.vertexCountInput.fill(String(vertexCount));
    await this.createButton.click();
  }

  // Returns number of table rows (tr elements)
  async getTableRowCount() {
    return await this.adjacencyTable.locator('tr').count();
  }

  // Returns header cell texts as an array (top header row)
  async getTopHeaderTexts() {
    const headerCells = this.adjacencyTable.locator('tr').first().locator('th,td');
    const count = await headerCells.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await headerCells.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Get number of input elements in a given table row index (1-based row index in the table, but the function expects matrix row index starting at 0)
  async getRowInputCount(matrixRowIndex) {
    // matrixRowIndex 0 corresponds to second tr (first is header)
    const row = this.adjacencyTable.locator('tr').nth(matrixRowIndex + 1);
    return await row.locator('input').count();
  }

  // Set a cell value at (row, col)
  async setCellValue(row, col, value) {
    const rowLocator = this.adjacencyTable.locator('tr').nth(row + 1);
    const input = rowLocator.locator('input').nth(col);
    await input.fill(String(value));
  }

  // Read entire matrix from the inputs as JS array
  async readMatrixFromInputs() {
    const rows = await this.adjacencyTable.locator('tr').count();
    const matrix = [];
    for (let i = 1; i < rows; i++) {
      const inputs = this.adjacencyTable.locator('tr').nth(i).locator('input');
      const inputCount = await inputs.count();
      const rowVals = [];
      for (let j = 0; j < inputCount; j++) {
        const v = await inputs.nth(j).inputValue();
        // parseInt can yield NaN; but the page uses parseInt; mimic expected behavior
        rowVals.push(v === '' ? NaN : parseInt(v));
      }
      matrix.push(rowVals);
    }
    return matrix;
  }

  // Click the submit button that writes matrix JSON to #output
  async submitMatrix() {
    await this.submitButton.click();
  }

  // Read and parse JSON from #output; returns parsed object or raw text if not JSON
  async getOutputParsed() {
    const text = await this.output.textContent();
    try {
      return JSON.parse(text || '');
    } catch (e) {
      return text;
    }
  }

  // Check whether matrixContainer is visible via computed style
  async isMatrixContainerVisible() {
    return await this.matrixContainer.evaluate(node => {
      return window.getComputedStyle(node).display !== 'none';
    });
  }
}

// Keep track of console messages and page errors for assertions
test.describe('Adjacency Matrix Application (7e8aa595-d59e-11f0-89ab-2f71529652ac)', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    pageErrors = [];
    consoleErrors = [];
    consoleMessages = [];

    // Listen for runtime page errors
    page.on('pageerror', (err) => {
      // Collect page error objects
      pageErrors.push(err);
    });

    // Listen for console events (log, error, warn, etc.)
    page.on('console', (msg) => {
      const type = msg.type();
      const text1 = msg.text1();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert that no unexpected page errors or console.error messages were emitted.
    // These assertions allow the page to naturally throw errors if they exist; the test will fail and
    // report them. This follows the constraint to observe errors but not to patch the page.
    expect(pageErrors, 'No page runtime errors should have been thrown').toEqual([]);
    expect(consoleErrors, 'No console.error messages should have been emitted').toEqual([]);
  });

  test.describe('Initial page load and default state', () => {
    test('should load the page and display initial controls with matrix hidden', async ({ page }) => {
      // Purpose: Verify initial state before any interaction
      const app = new AdjacencyMatrixPage(page);

      // Title and controls exist
      await expect(page.locator('h1')).toHaveText('Adjacency Matrix Demonstration');
      await expect(app.vertexCountInput).toBeVisible();
      await expect(app.createButton).toBeVisible();

      // Matrix container should be hidden by default
      const visible = await app.isMatrixContainerVisible();
      expect(visible).toBe(false);

      // Output should be empty initially
      const outputText = (await app.output.textContent()) || '';
      expect(outputText.trim()).toBe('');
    });
  });

  test.describe('Matrix creation and structure', () => {
    test('creating a 3x3 matrix builds table with headers and inputs defaulting to 0', async ({ page }) => {
      // Purpose: Verify that clicking Create builds the correct table structure and default input values
      const app1 = new AdjacencyMatrixPage(page);
      await app.createMatrix(3);

      // Matrix container should now be visible
      expect(await app.isMatrixContainerVisible()).toBe(true);

      // Table should have 1 header row + 3 data rows => 4 rows total
      const rowCount = await app.getTableRowCount();
      expect(rowCount).toBe(4);

      // Top header row should contain empty top-left and V0, V1, V2
      const topHeaders = await app.getTopHeaderTexts();
      // topHeaders may include the empty top-left header as first element
      // Example: ['', 'V0', 'V1', 'V2'] or similar depending on whitespace
      expect(topHeaders.length).toBeGreaterThanOrEqual(1);
      expect(topHeaders.some(t => t.includes('V0'))).toBe(true);
      expect(topHeaders.some(t => t.includes('V1'))).toBe(true);
      expect(topHeaders.some(t => t.includes('V2'))).toBe(true);

      // Each data row should contain 3 input elements with default value "0"
      for (let r = 0; r < 3; r++) {
        const inputCount1 = await app.getRowInputCount(r);
        expect(inputCount).toBe(3);

        // Check each input default value
        const rowLocator1 = app.adjacencyTable.locator('tr').nth(r + 1);
        const inputs1 = rowLocator.locator('input');
        for (let c = 0; c < 3; c++) {
          const val = await inputs.nth(c).inputValue();
          // The implementation sets value="0" for each input
          expect(val).toBe('0');
        }
      }
    });

    test('creating a 1x1 matrix and submitting yields [[0]] and updates when cell set to 1', async ({ page }) => {
      // Purpose: Small matrix edge case and ensuring submission reflects input values
      const app2 = new AdjacencyMatrixPage(page);
      await app.createMatrix(1);

      // Table rows: header + 1 row
      expect(await app.getTableRowCount()).toBe(2);
      expect(await app.getRowInputCount(0)).toBe(1);

      // Submit without changes -> should output [[0]]
      await app.submitMatrix();
      const parsed = await app.getOutputParsed();
      expect(parsed).toEqual([[0]]);

      // Now set the only cell to 1 and submit again
      await app.setCellValue(0, 0, 1);
      // sanity-check value set
      const inputsState = await app.readMatrixFromInputs();
      expect(inputsState).toEqual([[1]]);

      await app.submitMatrix();
      const parsed2 = await app.getOutputParsed();
      expect(parsed2).toEqual([[1]]);
    });

    test('creating matrix with vertexCount 0 results in a header-only table and submitting yields []', async ({ page }) => {
      // Purpose: Test behavior when user inputs 0 despite min=1 (edge-case handling)
      const app3 = new AdjacencyMatrixPage(page);
      // Fill 0 and click create - the page's JS will use parseInt and create header and zero rows
      await app.createMatrix(0);

      // Table should contain only the header row
      const rowCount1 = await app.getTableRowCount();
      expect(rowCount).toBe(1);

      // Submitting should produce an empty array representation because no data rows were created
      await app.submitMatrix();
      const parsed1 = await app.getOutputParsed();
      expect(parsed).toEqual([]);
    });
  });

  test.describe('Data flow, validation, and DOM updates', () => {
    test('setting various input values is reflected in the submitted JSON matrix', async ({ page }) => {
      // Purpose: Verify that input changes are read and serialized correctly by the Submit button
      const app4 = new AdjacencyMatrixPage(page);
      await app.createMatrix(3);

      // Set a pattern of values in the matrix
      // Row0: 0,1,0
      // Row1: 1,0,1
      // Row2: 0,0,1
      await app.setCellValue(0, 0, 0);
      await app.setCellValue(0, 1, 1);
      await app.setCellValue(0, 2, 0);

      await app.setCellValue(1, 0, 1);
      await app.setCellValue(1, 1, 0);
      await app.setCellValue(1, 2, 1);

      await app.setCellValue(2, 0, 0);
      await app.setCellValue(2, 1, 0);
      await app.setCellValue(2, 2, 1);

      // Read inputs directly and assert they match expectation before submit
      const inputMatrix = await app.readMatrixFromInputs();
      expect(inputMatrix).toEqual([
        [0, 1, 0],
        [1, 0, 1],
        [0, 0, 1],
      ]);

      // Submit and verify the output JSON matches
      await app.submitMatrix();
      const parsed21 = await app.getOutputParsed();
      expect(parsed).toEqual([
        [0, 1, 0],
        [1, 0, 1],
        [0, 0, 1],
      ]);
    });

    test('entering values outside min/max (e.g., 2) are accepted by inputs and reflected in output', async ({ page }) => {
      // Purpose: Verify that numeric inputs with min/max attributes do not block programmatic/txt input and submit uses parseInt
      const app5 = new AdjacencyMatrixPage(page);
      await app.createMatrix(2);

      // Set cell (0,1) to 2 even though max=1; the page JavaScript does not enforce this beyond the input attribute
      await app.setCellValue(0, 1, 2);
      await app.setCellValue(1, 0, 2);

      await app.submitMatrix();
      const parsed3 = await app.getOutputParsed();
      // parseInt will read 2 values; ensure they appear in the output
      expect(parsed).toEqual([
        [0, 2],
        [2, 0],
      ]);
    });
  });

  test.describe('Accessibility and visibility checks', () => {
    test('matrix container becomes visible after creation and remains visible until page reload', async ({ page }) => {
      // Purpose: Ensure visibility toggling occurs as intended
      const app6 = new AdjacencyMatrixPage(page);
      expect(await app.isMatrixContainerVisible()).toBe(false);

      await app.createMatrix(2);
      expect(await app.isMatrixContainerVisible()).toBe(true);

      // Inputs should be focusable and accessible via keyboard (basic check)
      // Focus the first cell input
      const firstInput = app.adjacencyTable.locator('tr').nth(1).locator('input').first();
      await firstInput.focus();
      expect(await page.evaluate((el) => document.activeElement === el, await firstInput.elementHandle())).toBe(true);
    });
  });

  test.describe('Console and runtime error observation', () => {
    test('should not emit any console.error or runtime page errors during normal flows (create + submit)', async ({ page }) => {
      // Purpose: Explicit check that no console.error or page errors happen for the main flows.
      // Note: The beforeEach and afterEach collect and assert error lists. This test performs interactions
      // that could reveal runtime errors and relies on afterEach assertions for final validation.

      const app7 = new AdjacencyMatrixPage(page);

      // Perform typical interactions
      await app.createMatrix(3);
      await app.setCellValue(0, 1, 1);
      await app.setCellValue(2, 2, 1);
      await app.submitMatrix();

      // Also inspect the console message array to ensure no messages of severity 'error' were emitted.
      // We collected them in beforeEach; here we assert the local array is empty.
      expect(consoleMessages.find(m => m.type === 'error')).toBeUndefined();
    });
  });
});