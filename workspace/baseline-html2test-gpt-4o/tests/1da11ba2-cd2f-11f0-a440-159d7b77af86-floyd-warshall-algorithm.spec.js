import { test, expect } from '@playwright/test';

// Page object model for the Floyd-Warshall visualization page
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/html2test/html/1da11ba2-cd2f-11f0-a440-159d7b77af86.html';
    this.inputTableBody = '#matrix-input';
    this.outputTableBody = '#matrix-output';
    this.calculateButtonSelector = 'button:has-text("Calculate")';
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Returns an array of arrays of cell text for a given table body id
  async readMatrix(tableBodySelector) {
    return await this.page.$$eval(
      `${tableBodySelector} tr`,
      (rows) =>
        rows.map((r) =>
          Array.from(r.querySelectorAll('td')).map((td) => td.innerText.trim())
        )
    );
  }

  async readInputMatrix() {
    return this.readMatrix(this.inputTableBody);
  }

  async readOutputMatrix() {
    return this.readMatrix(this.outputTableBody);
  }

  async clickCalculate() {
    await this.page.click(this.calculateButtonSelector);
  }

  async isCalculateButtonVisible() {
    return await this.page.isVisible(this.calculateButtonSelector);
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - UI and behavior', () => {
  // Test initial page load and default state
  test('Initial load: input matrix is rendered and output area is empty', async ({
    page,
  }) => {
    // Capture console messages and page errors for assertions later
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new FloydWarshallPage(page);
    await app.goto();

    // The calculate button should be visible and enabled
    expect(await app.isCalculateButtonVisible()).toBe(true);

    // The input matrix (initial adjacency) should be rendered with 4 rows and 4 cols
    const inputMatrix = await app.readInputMatrix();
    expect(Array.isArray(inputMatrix)).toBeTruthy();
    expect(inputMatrix.length).toBe(4);
    inputMatrix.forEach((row) => {
      expect(row.length).toBe(4);
    });

    // Verify exact expected textual values in the input table
    // Expected input:
    // [0, 5, ∞, 10]
    // [∞, 0, 3, ∞]
    // [∞, ∞, 0, 1]
    // [∞, ∞, ∞, 0]
    expect(inputMatrix[0]).toEqual(['0', '5', '∞', '10']);
    expect(inputMatrix[1]).toEqual(['∞', '0', '3', '∞']);
    expect(inputMatrix[2]).toEqual(['∞', '∞', '0', '1']);
    expect(inputMatrix[3]).toEqual(['∞', '∞', '∞', '0']);

    // Output matrix area should be empty before clicking Calculate
    const outputMatrixBefore = await app.readOutputMatrix();
    expect(outputMatrixBefore.length).toBe(0);

    // Ensure there are no uncaught page errors and no console errors
    // (We observe console messages and page errors and assert none occurred)
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test the main interaction: click Calculate and verify the computed shortest path matrix
  test('Clicking Calculate computes and renders the shortest path matrix correctly', async ({
    page,
  }) => {
    // Capture console messages and page errors for assertions later
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new FloydWarshallPage(page);
    await app.goto();

    // Click the Calculate button
    await app.clickCalculate();

    // After clicking, the output table should be rendered with 4x4 values
    const outputMatrix = await app.readOutputMatrix();
    expect(outputMatrix.length).toBe(4);
    outputMatrix.forEach((row) => {
      expect(row.length).toBe(4);
    });

    // Expected result of running Floyd-Warshall on the provided matrix:
    // [0, 5, 8, 9]
    // [∞, 0, 3, 4]
    // [∞, ∞, 0, 1]
    // [∞, ∞, ∞, 0]
    expect(outputMatrix[0]).toEqual(['0', '5', '8', '9']);
    expect(outputMatrix[1]).toEqual(['∞', '0', '3', '4']);
    expect(outputMatrix[2]).toEqual(['∞', '∞', '0', '1']);
    expect(outputMatrix[3]).toEqual(['∞', '∞', '∞', '0']);

    // Clicking the button again should be idempotent (matrix stays the same)
    await app.clickCalculate();
    const outputMatrixAfterSecondClick = await app.readOutputMatrix();
    expect(outputMatrixAfterSecondClick).toEqual(outputMatrix);

    // Ensure there are no uncaught page errors and no console errors during computation
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test visual and DOM updates in more detail and edge checking
  test('DOM updates: verify cell contents and presence of infinity symbol', async ({
    page,
  }) => {
    // Capture console messages and page errors for assertions later
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new FloydWarshallPage(page);
    await app.goto();

    // Ensure the Calculate button exists and is reachable via role-like query
    const button = await page.$('button');
    expect(button).not.toBeNull();
    expect(await button?.innerText()).toContain('Calculate');

    // Make sure there are '∞' characters present in input where expected
    const inputMatrix = await app.readInputMatrix();
    const infinityCountInInput = inputMatrix.flat().filter((c) => c === '∞')
      .length;
    // From the input matrix there should be 6 infinities
    expect(infinityCountInInput).toBe(6);

    // Click Calculate and verify the number of infinities in output (should be 6 as some infinite remain)
    await app.clickCalculate();
    const outputMatrix = await app.readOutputMatrix();
    const infinityCountInOutput = outputMatrix.flat().filter((c) => c === '∞')
      .length;
    expect(infinityCountInOutput).toBe(6);

    // Spot-check a few specific cells to ensure numeric/text conversion is correct
    expect(outputMatrix[0][2]).toBe('8'); // 0->2
    expect(outputMatrix[0][3]).toBe('9'); // 0->3 (via nodes)
    expect(outputMatrix[1][3]).toBe('4'); // 1->3 via node 2

    // Ensure there are no console errors or page errors observed
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge-case style test: ensure output table remains empty if Calculate isn't clicked
  test('Edge case: without clicking Calculate the output matrix should remain empty', async ({
    page,
  }) => {
    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new FloydWarshallPage(page);
    await app.goto();

    // Do not click Calculate. The output should remain empty.
    const outputMatrixBefore = await app.readOutputMatrix();
    expect(outputMatrixBefore.length).toBe(0);

    // Confirm the input table still present and unchanged
    const inputMatrix = await app.readInputMatrix();
    expect(inputMatrix[0][1]).toBe('5'); // sanity check

    // No console errors or page errors
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});