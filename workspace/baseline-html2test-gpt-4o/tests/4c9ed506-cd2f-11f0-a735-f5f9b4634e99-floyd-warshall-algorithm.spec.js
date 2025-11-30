import { test, expect } from '@playwright/test';

// Test file: 4c9ed506-cd2f-11f0-a735-f5f9b4634e99-floyd-warshall-algorithm.spec.js
// Purpose: End-to-end tests for the Floyd-Warshall Algorithm Visualization page.
// Notes:
// - The page is static and has no explicit interactive controls (no buttons/inputs/forms).
// - The script computes all-pairs shortest paths and populates a table.
// - Tests validate DOM structure, computed distances, visual elements, and console/page errors.

// Page Object for the visualization page to encapsulate element queries and assertions.
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed506-cd2f-11f0-a735-f5f9b4634e99.html';
  }

  async goto() {
    await this.page.goto(this.url);
    // Ensure the table and graph root exist before proceeding
    await expect(this.page.locator('#distanceTable')).toBeVisible();
    await expect(this.page.locator('#graph')).toBeVisible();
  }

  graphRoot() {
    return this.page.locator('#graph');
  }

  nodeLocator(index) {
    return this.page.locator(`#node${index}`);
  }

  allNodes() {
    return this.page.locator('.node');
  }

  allEdges() {
    return this.page.locator('.edge');
  }

  distanceTable() {
    return this.page.locator('#distanceTable');
  }

  // Returns an array of row text contents (excluding header row if headerOnly=false)
  async getDistanceRows(includeHeader = true) {
    const rows = this.distanceTable().locator('tr');
    const count = await rows.count();
    const results = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cells = row.locator('th, td');
      const cellCount = await cells.count();
      const texts = [];
      for (let j = 0; j < cellCount; j++) {
        texts.push((await cells.nth(j).innerText()).trim());
      }
      results.push(texts);
    }
    return results;
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - E2E', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Collect page errors and console errors during the test run
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions from the page
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Capture console.error and other console messages
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });
  });

  test.afterEach(async () => {
    // After each test we don't automatically fail on errors here;
    // individual tests will assert the expected console/page error state.
  });

  test('Initial page load: static elements are present and visible', async ({ page }) => {
    // Purpose: Verify the page loads and primary containers are visible.
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    // Check heading and description are visible
    await expect(page.locator('h1')).toHaveText(/Floyd-Warshall Algorithm Visualization/);
    await expect(page.locator('p')).toContainText('Calculate shortest paths');

    // Graph container should be visible and have three nodes and three edges
    await expect(fw.graphRoot()).toBeVisible();
    await expect(fw.allNodes()).toHaveCount(3);
    await expect(fw.allEdges()).toHaveCount(3);

    // No interactive form controls should be present (the page is static)
    const interactiveCount = await page.locator('input, button, select, textarea, form').count();
    expect(interactiveCount).toBe(0);
  });

  test('Node elements: content and inline position styles are correct', async ({ page }) => {
    // Purpose: Ensure the nodes are rendered with the expected labels and inline styles.
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    // Validate each node text content and that inline style contains left/top values
    for (let i = 0; i < 3; i++) {
      const node = fw.nodeLocator(i);
      await expect(node).toBeVisible();
      await expect(node).toHaveText(String(i));

      // Ensure inline style includes 'top' and 'left' coordinates as in the HTML
      const style = await node.getAttribute('style');
      expect(style).toBeTruthy();
      expect(style).toMatch(/top:\s*\d+px/);
      expect(style).toMatch(/left:\s*\d+px/);
    }
  });

  test('Distance table: header and 3x3 computed distances are rendered correctly', async ({ page }) => {
    // Purpose: Verify that the algorithm executed and populated the table with expected distances.
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    const rows = await fw.getDistanceRows(true); // includes header row at index 0
    // Expect header + 9 computed rows
    expect(rows.length).toBe(1 + 3 * 3);

    // Verify header cells
    const header = rows[0];
    expect(header).toEqual(['From', 'To', 'Distance']);

    // Build expected results in the order they are inserted: for i from 0..2, for j from 0..2
    // Expected shortest path distances after Floyd-Warshall for the given graph:
    // [ [0, 1, 3],
    //   [∞, 0, 2],
    //   [∞, ∞, 0] ]
    const expected = [
      ['0', '0', '0'],
      ['0', '1', '1'],
      ['0', '2', '3'],
      ['1', '0', '∞'],
      ['1', '1', '0'],
      ['1', '2', '2'],
      ['2', '0', '∞'],
      ['2', '1', '∞'],
      ['2', '2', '0'],
    ];

    // rows[1]..rows[9] should match expected
    for (let k = 0; k < expected.length; k++) {
      const actualRow = rows[1 + k];
      const expectedRow = expected[k];
      expect(actualRow).toEqual(expectedRow);
    }
  });

  test('Clicking nodes does not change computed distances (no interactive behavior)', async ({ page }) => {
    // Purpose: Confirm that clicking visual nodes (divs) has no effect on the data table.
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    // Snapshot of the distance table before any interaction
    const before = await fw.getDistanceRows(true);

    // Click each node and edges to simulate user attempts to interact with the visualization
    for (let i = 0; i < 3; i++) {
      await fw.nodeLocator(i).click();
    }
    // Click the graph container and each edge
    await fw.graphRoot().click({ position: { x: 10, y: 10 } });
    const edgeCount = await fw.allEdges().count();
    for (let e = 0; e < edgeCount; e++) {
      await fw.allEdges().nth(e).click();
    }

    // Snapshot after clicks should be identical to before (no dynamic behavior implemented)
    const after = await fw.getDistanceRows(true);
    expect(after).toEqual(before);
  });

  test('No console errors or page errors occurred during correct execution', async ({ page }) => {
    // Purpose: Observe console and page errors; assert that the app runs without uncaught errors.
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    // Wait a short moment to let any potential runtime errors surface
    await page.waitForTimeout(100);

    // Assert that no uncaught page error was emitted
    expect(pageErrors.length, `Expected no page errors, but found: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

    // Assert that no console.error messages were emitted
    expect(consoleErrors.length, `Expected no console.error calls, but found: ${JSON.stringify(consoleErrors)}`).toBe(0);
  });

  test('Accessibility checks: table headers and node labels are available for assistive tech', async ({ page }) => {
    // Purpose: Basic accessibility checks - table has headers and node elements are text-accessible.
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    // Table headers should be present and accessible via role queries
    const table = page.locator('table#distanceTable');
    await expect(table).toHaveAttribute('id', 'distanceTable');

    // Ensure the table header cells exist and contain text
    const ths = table.locator('th');
    await expect(ths).toHaveCount(3);
    await expect(ths.nth(0)).toHaveText('From');
    await expect(ths.nth(1)).toHaveText('To');
    await expect(ths.nth(2)).toHaveText('Distance');

    // Node labels are textual and can be focused (divs are not tabbable by default; ensure text is present)
    for (let i = 0; i < 3; i++) {
      const node = fw.nodeLocator(i);
      await expect(node).toHaveText(String(i));
    }
  });

  test('Edge cases: ensure Infinity values are rendered as the symbol "∞"', async ({ page }) => {
    // Purpose: Verify that unreachable distances are displayed as the infinity symbol, not as text "Infinity".
    const fw = new FloydWarshallPage(page);
    await fw.goto();

    const rows = await fw.getDistanceRows(true);
    // Collect all distance cells (third cell of each data row)
    const distances = rows.slice(1).map(r => r[2]); // exclude header

    // Distances should include the '∞' symbol for unreachable pairs
    expect(distances).toContain('∞');

    // Ensure that no distance cell contains the string 'Infinity'
    for (const d of distances) {
      expect(d).not.toBe('Infinity');
    }
  });
});