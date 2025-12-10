import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a5-d59e-11f0-b3ae-79d1ce7b5503.html';

// Simple Page Object for the Adjacency Matrix app
class AdjacencyPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numInput = page.locator('#numVertices');
    this.createButton = page.locator('#createMatrix');
    this.matrixTable = page.locator('#matrixTable');
    this.submitButton = page.locator('#submitMatrix');
    this.result = page.locator('#result');
  }

  // Create a matrix for n vertices using the UI controls
  async createMatrix(n) {
    // fill the number of vertices then click create
    await this.numInput.fill(String(n));
    await this.createButton.click();
    // wait until the submit button becomes visible (the app shows it after creation)
    await this.submitButton.waitFor({ state: 'visible' });
  }

  // Read the rendered adjacency matrix inputs as a 2D array of numbers
  async readMatrixFromInputs() {
    const rows = this.matrixTable.locator('tr');
    const rowCount = await rows.count();
    const matrix = [];
    // rows[0] is header, so start from 1
    for (let i = 1; i < rowCount; i++) {
      const inputs = rows.nth(i).locator('input');
      const inputCount = await inputs.count();
      const rowValues = [];
      for (let j = 0; j < inputCount; j++) {
        const val = await inputs.nth(j).inputValue();
        // parse as integer similar to application behavior
        rowValues.push(parseInt(val));
      }
      matrix.push(rowValues);
    }
    return matrix;
  }

  // Populate an individual cell (i, j) where i and j are zero-based indices
  async setCell(i, j, value) {
    const row = this.matrixTable.locator('tr').nth(i + 1); // +1 to skip header row
    const input = row.locator('input').nth(j);
    await input.fill(String(value));
  }

  // Submit the matrix via UI
  async submitMatrix() {
    await this.submitButton.click();
    // ensure result area updated
    await this.result.waitFor();
  }

  // Read the JSON from the result <pre>
  async readResultJson() {
    const pre = this.result.locator('pre');
    await pre.waitFor();
    const text = await pre.textContent();
    // The app writes JSON.stringify(...) into the pre, parse it
    try {
      return JSON.parse(text || '');
    } catch (e) {
      // Return null if parsing fails so tests can assert appropriately
      return null;
    }
  }
}

test.describe('Adjacency Matrix Visualization App', () => {
  // Arrays to capture console errors and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  // Setup before each test: open page and attach listeners to capture console & page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // Navigate to the application HTML page
    await page.goto(APP_URL);
  });

  // Teardown after each test: assert that no console errors or page errors occurred during the test
  test.afterEach(async () => {
    // Assert there were no console.error messages emitted
    expect(consoleErrors, `Expected no console.error messages, but got: ${consoleErrors.join(' | ')}`).toHaveLength(0);

    // Assert there were no uncaught page errors
    expect(pageErrors, `Expected no page errors, but got: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial page load shows default controls and hidden submit button', async ({ page }) => {
    // Purpose: Verify initial state of the page on load
    const app = new AdjacencyPage(page);

    // Title sanity check
    await expect(page).toHaveTitle(/Adjacency Matrix Visualization/);

    // numVertices should exist and default to "3"
    await expect(app.numInput).toHaveValue('3');

    // Create Matrix button should be visible
    await expect(app.createButton).toBeVisible();

    // The matrix table should be empty initially (no rows)
    const rows1 = app.matrixTable.locator('tr');
    await expect(rows).toHaveCount(0);

    // Submit button should be hidden initially (display)
    // We check the computed style via evaluate so we don't rely on Playwright's hidden/visible heuristics alone
    const submitDisplay = await page.evaluate(() => {
      return document.getElementById('submitMatrix').style.display;
    });
    expect(submitDisplay).toBe('none');
  });

  test('Creating a 3x3 matrix generates correct headers and input elements', async ({ page }) => {
    // Purpose: Test that clicking 'Create Matrix' with default 3 generates a 3x3 grid of inputs and headers
    const app1 = new AdjacencyPage(page);

    // Use helper to create matrix of size 3
    await app.createMatrix(3);

    // Validate header row: first TH blank, then V1..V3
    const headerCells = app.matrixTable.locator('tr').first().locator('th');
    // headerCells count should be 4 (one empty + 3 vertices)
    await expect(headerCells).toHaveCount(4);
    await expect(headerCells.nth(0)).toHaveText(''); // top-left corner blank
    await expect(headerCells.nth(1)).toHaveText('V1');
    await expect(headerCells.nth(2)).toHaveText('V2');
    await expect(headerCells.nth(3)).toHaveText('V3');

    // Validate there are 3 rows (rows include header + 3 data rows -> total 4)
    const allRows = app.matrixTable.locator('tr');
    await expect(allRows).toHaveCount(4);

    // For each data row: first th should be V1..V3, and there should be 3 input elements with default value '0' and min/max attributes
    for (let i = 0; i < 3; i++) {
      const row1 = allRows.nth(i + 1); // skip header
      const rowHeader = row.locator('th');
      await expect(rowHeader).toHaveText(`V${i + 1}`);

      const inputs1 = row.locator('input');
      await expect(inputs).toHaveCount(3);

      for (let j = 0; j < 3; j++) {
        const input1 = inputs.nth(j);
        await expect(input).toHaveValue('0');
        // check min and max attributes exist and are '0' and '1'
        const min = await input.getAttribute('min');
        const max = await input.getAttribute('max');
        expect(min).toBe('0');
        expect(max).toBe('1');
      }
    }

    // Submit button should now be visible (display removed)
    await expect(app.submitButton).toBeVisible();
  });

  test('Submitting the default matrix displays JSON with 3x3 zeros', async ({ page }) => {
    // Purpose: Verify the Submit action reads inputs and shows a JSON representation matching the matrix
    const app2 = new AdjacencyPage(page);

    await app.createMatrix(3);

    // Submit without changing any inputs
    await app.submitMatrix();

    // The result area should contain heading and a preformatted JSON
    await expect(app.result).toContainText('Adjacency Matrix:');

    const json = await app.readResultJson();
    // Expect a 3x3 matrix of zeros
    expect(json).toEqual([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  });

  test('Modifying matrix inputs and submitting reflects changes in the JSON result', async ({ page }) => {
    // Purpose: Ensure editing individual inputs is captured on submission
    const app3 = new AdjacencyPage(page);

    await app.createMatrix(3);

    // Set some cells to 1 to represent edges
    await app.setCell(0, 1, 1); // V1->V2
    await app.setCell(1, 2, 1); // V2->V3
    await app.setCell(2, 0, 1); // V3->V1

    // Submit and parse result
    await app.submitMatrix();
    const json1 = await app.readResultJson();

    // Validate changed cells are present and others remain 0
    expect(json).toEqual([
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ]);
  });

  test('Changing number of vertices to 1 generates a 1x1 matrix', async ({ page }) => {
    // Purpose: Test creating a minimal matrix (edge case)
    const app4 = new AdjacencyPage(page);

    // Create a 1x1 matrix
    await app.createMatrix(1);

    // There should be header + 1 data row = 2 rows total
    const rows2 = app.matrixTable.locator('tr');
    await expect(rows).toHaveCount(2);

    // Header should contain one vertex label
    const header = rows.nth(0).locator('th');
    await expect(header).toHaveCount(2); // one empty + one V1
    await expect(header.nth(1)).toHaveText('V1');

    // Row should have a single input with default 0
    const inputs2 = rows.nth(1).locator('input');
    await expect(inputs).toHaveCount(1);
    await expect(inputs.nth(0)).toHaveValue('0');

    // Submit and assert the JSON is [[0]]
    await app.submitMatrix();
    const json2 = await app.readResultJson();
    expect(json).toEqual([[0]]);
  });

  test('Edge case: entering out-of-range value is accepted and reflected in submission (no validation in app)', async ({ page }) => {
    // Purpose: The UI restricts min/max attributes but the app uses parseInt on input values.
    // This test verifies that if a user inputs a value outside 0/1 (e.g., 2), it is included in the result.
    const app5 = new AdjacencyPage(page);

    // Create a 2x2 matrix to test multiple cells
    await app.createMatrix(2);

    // Set cell (0,0) to 2 (out-of-range)
    await app.setCell(0, 0, 2);
    // Set cell (1,1) to -1 (another out-of-range / negative)
    await app.setCell(1, 1, -1);

    await app.submitMatrix();
    const json3 = await app.readResultJson();

    // The app does parseInt but does not clamp, so values should appear as entered
    expect(json).toEqual([
      [2, 0],
      [0, -1],
    ]);
  });

  test('DOM structure remains consistent after repeated creates (replacing previous table)', async ({ page }) => {
    // Purpose: Ensure creating a matrix multiple times replaces previous content cleanly
    const app6 = new AdjacencyPage(page);

    // First create a 3x3 matrix
    await app.createMatrix(3);
    let rows3 = app.matrixTable.locator('tr');
    await expect(rows).toHaveCount(4);

    // Now create a 2x2 matrix (should replace the previous table)
    await app.createMatrix(2);
    rows = app.matrixTable.locator('tr');
    await expect(rows).toHaveCount(3); // header + 2 rows

    // Confirm headers are V1, V2
    const header1 = rows.nth(0).locator('th');
    await expect(header.nth(1)).toHaveText('V1');
    await expect(header.nth(2)).toHaveText('V2');

    // Submit and assert size is 2x2
    await app.submitMatrix();
    const json4 = await app.readResultJson();
    expect(json).toEqual([[0, 0], [0, 0]]);
  });
});