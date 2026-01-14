import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3b2-d59e-11f0-89ab-2f71529652ac.html';

// Page Object to encapsulate interactions with the Floyd-Warshall app
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#matrixInput');
    this.runButton = page.locator('button', { hasText: 'Run Floyd-Warshall' });
    this.output = page.locator('#output');
  }

  // Fill the matrix textarea with provided text
  async fillMatrix(text) {
    await this.textarea.fill(text);
  }

  // Click the run button and wait for an output table to appear (if applicable)
  async run() {
    await Promise.all([
      this.page.waitForResponse(response => response.ok() || response.status() === 404).catch(() => {}), // harmless wait to allow synchronous script to run
      this.runButton.click()
    ]);
    // The algorithm runs synchronously in page JS; wait for a table or at least for output content to change
    // Use a short wait for the #output to contain something (table or plain text)
    await this.page.waitForTimeout(50);
  }

  // Read the displayed matrix as a 2D array of trimmed cell text contents
  async getOutputMatrix() {
    const rows = this.output.locator('table tr');
    const rowCount = await rows.count();
    const matrix = [];
    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator('td');
      const cellCount = await cells.count();
      const row = [];
      for (let j = 0; j < cellCount; j++) {
        const text = (await cells.nth(j).innerText()).trim();
        row.push(text);
      }
      matrix.push(row);
    }
    return matrix;
  }

  // Helper to get raw output HTML
  async getOutputHTML() {
    return this.output.innerHTML();
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - App E2E', () => {
  // Collect console messages and page errors for each test to assert on them
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (log/debug/info/warn/error)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors during the test run
    expect(pageErrors, `No uncaught page errors should occur; got: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);

    // Also assert there were no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors, `No console.error messages should be emitted; got: ${consoleErrors.map(e => e.text).join(' || ')}`).toHaveLength(0);
  });

  test('Initial page load: UI elements are present and output is empty', async ({ page }) => {
    // Purpose: Verify initial state of the page after navigation
    const fw = new FloydWarshallPage(page);

    // Check the title and heading exist
    await expect(page.locator('h1')).toHaveText('Floyd-Warshall Algorithm');

    // Textarea should be visible and empty by default
    await expect(fw.textarea).toBeVisible();
    await expect(fw.textarea).toHaveValue('');

    // Run button should be visible and enabled
    await expect(fw.runButton).toBeVisible();
    await expect(fw.runButton).toBeEnabled();

    // Output container exists and initially has no table
    await expect(fw.output).toBeVisible();
    const tableExists = await page.locator('#output table').count();
    expect(tableExists).toBe(0);
  });

  test('Computes shortest paths for a simple 3-node graph', async ({ page }) => {
    // Purpose: Ensure the algorithm computes expected shortest paths and displays them
    const fw1 = new FloydWarshallPage(page);

    // Provide a 3x3 adjacency matrix:
    // 0, 5, Infinity
    // Infinity, 0, 3
    // Infinity, Infinity, 0
    const input = [
      '0, 5, Infinity',
      'Infinity, 0, 3',
      'Infinity, Infinity, 0'
    ].join('\n');

    await fw.fillMatrix(input);
    await fw.run();

    // Now read the output table and verify the computed distances:
    // Expected result:
    // 0, 5, 8   (0->2 via 1 gives 5+3=8)
    // ∞, 0, 3
    // ∞, ∞, 0
    const matrix1 = await fw.getOutputMatrix();
    expect(matrix.length).toBe(3);

    const flattened = matrix.flat();
    expect(flattened).toEqual([
      '0', '5', '8',
      '∞', '0', '3',
      '∞', '∞', '0'
    ]);
  });

  test('Handles input with varying whitespace and Infinity tokens correctly', async ({ page }) => {
    // Purpose: Ensure parsing tolerates whitespace and canonical "Infinity" token and displays symbol ∞
    const fw2 = new FloydWarshallPage(page);

    const input1 = '0 ,  2,Infinity\n  Infinity,0, 4\n Infinity , Infinity , 0';
    await fw.fillMatrix(input);
    await fw.run();

    const matrix2 = await fw.getOutputMatrix();
    expect(matrix.length).toBe(3);
    const flattened1 = matrix.flat();
    // 0,2,6? Wait: path 0->2 via 1 is 2+4=6
    expect(flattened).toEqual([
      '0', '2', '6',
      '∞', '0', '4',
      '∞', '∞', '0'
    ]);
  });

  test('Updates output when running multiple times with different matrices', async ({ page }) => {
    // Purpose: Verify that subsequent runs overwrite the previous output correctly
    const fw3 = new FloydWarshallPage(page);

    const first = '0,1\nInfinity,0';
    await fw.fillMatrix(first);
    await fw.run();

    let matrix3 = await fw.getOutputMatrix();
    expect(matrix.flat()).toEqual(['0', '1', '∞', '0']);

    const second = '0, 5, Infinity\nInfinity,0, 3\nInfinity, Infinity, 0';
    await fw.fillMatrix(second);
    await fw.run();

    matrix = await fw.getOutputMatrix();
    expect(matrix.flat()).toEqual([
      '0', '5', '8',
      '∞', '0', '3',
      '∞', '∞', '0'
    ]);
  });

  test('Displays NaN for malformed numeric input and does not throw uncaught errors', async ({ page }) => {
    // Purpose: Verify edge-case handling: malformed values become NaN in the matrix display
    // and no uncaught exceptions occur during processing.
    const fw4 = new FloydWarshallPage(page);

    // Intentionally malformed matrix with a non-numeric token "abc" and empty cell
    const input2 = '0, abc\n, 0';
    await fw.fillMatrix(input);
    await fw.run();

    // Expect table to be produced and contain 'NaN' text where parseFloat failed
    const matrix4 = await fw.getOutputMatrix();
    // At least one cell should contain 'NaN'
    const flattened2 = matrix.flat();
    const hasNaN = flattened.some(cell => cell === 'NaN');
    expect(hasNaN).toBe(true);

    // Ensure the app did not emit uncaught page errors (asserted globally in afterEach)
  });

  test('Empty input leads to a NaN cell in the displayed matrix', async ({ page }) => {
    // Purpose: Check behavior for empty textarea input: parse results in NaN cells shown
    const fw5 = new FloydWarshallPage(page);

    // Provide an empty string (simulate empty input)
    await fw.fillMatrix('');
    await fw.run();

    // The parser will create a 1x1 matrix with NaN value; ensure displayed cell exists and is 'NaN'
    const matrix5 = await fw.getOutputMatrix();
    expect(matrix.length).toBe(1);
    expect(matrix[0].length).toBe(1);
    expect(matrix[0][0]).toBe('NaN');
  });

  test('Display uses ∞ symbol for Infinity values', async ({ page }) => {
    // Purpose: Ensure the special Infinity values are rendered as the ∞ symbol
    const fw6 = new FloydWarshallPage(page);

    const input3 = '0, Infinity\nInfinity, 0';
    await fw.fillMatrix(input);
    await fw.run();

    const matrix6 = await fw.getOutputMatrix();
    expect(matrix.flat()).toEqual(['0', '∞', '∞', '0']);

    // Also assert that the output HTML includes the HTML entity (the actual character is used)
    const html = await page.locator('#output').innerHTML();
    expect(html.includes('∞')).toBe(true);
  });
});