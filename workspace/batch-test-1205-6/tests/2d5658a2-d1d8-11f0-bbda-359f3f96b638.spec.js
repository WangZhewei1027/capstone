import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d5658a2-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object encapsulating common interactions with the Adjacency Matrix page
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sizeInput = page.locator('#size');
    this.createButton = page.locator("button[onclick='createMatrix()']");
    this.matrixContainer = page.locator('#matrixContainer');
    this.tableLocator = this.matrixContainer.locator('table');
    this.inputsLocator = this.matrixContainer.locator('input[type="number"]');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getSizeValue() {
    return await this.sizeInput.inputValue();
  }

  async setSize(value) {
    // Fill the size input and blur to emulate user behavior
    await this.sizeInput.fill(String(value));
    await this.sizeInput.press('Tab');
  }

  async clickCreateMatrix() {
    await this.createButton.click();
  }

  async getInputCount() {
    return await this.inputsLocator.count();
  }

  // Returns array of values as strings for all matrix inputs in row-major order
  async getMatrixInputValues() {
    return await this.page.$$eval('#matrixContainer input', inputs => inputs.map(i => i.value));
  }

  // Set specific input by row and column (0-indexed) to a value, and trigger change by blurring
  async setMatrixInputAt(row, col, size, value) {
    const index = row * size + col;
    const locator = this.inputsLocator.nth(index);
    await locator.fill(String(value));
    // blur to trigger onchange event which uses updateMatrix()
    await locator.press('Tab');
  }

  async tableExists() {
    return (await this.tableLocator.count()) > 0;
  }

  async getHeaderLabels() {
    // collect header text from table header row
    return await this.page.$$eval('#matrixContainer table th', ths => ths.map(t => t.textContent.trim()));
  }
}

test.describe('Adjacency Matrix Visualization - FSM tests', () => {
  let page;
  let app;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new AdjacencyMatrixPage(page);

    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for assertions (including console.log and console.table outputs)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture any uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Idle state: initial render shows Create Matrix button and default size input', async () => {
    // This test validates the Idle state (S0_Idle):
    // - The page should show the size input with default value 3
    // - The Create Matrix button should be present
    // - The matrix container should be empty (no table) before creation
    // - No uncaught page errors should have occurred during initial render

    // Verify size input default value
    const sizeValue = await app.getSizeValue();
    expect(sizeValue).toBe('3');

    // Verify Create Matrix button visible
    await expect(app.createButton).toBeVisible();

    // Matrix container should not contain a table yet
    expect(await app.tableExists()).toBe(false);

    // Ensure no page errors were thrown during load
    expect(pageErrors.length).toBe(0);

    // No adjacency matrix logs yet
    const hasAdjacencyLog = consoleMessages.some(m => m.text.includes('Adjacency Matrix:'));
    expect(hasAdjacencyLog).toBe(false);
  });

  test('Create Matrix transition: clicking Create Matrix builds table with correct number of inputs', async () => {
    // This test validates the CreateMatrix event and the transition S0_Idle -> S1_MatrixCreated:
    // - After clicking the button, a table should appear in #matrixContainer
    // - The number of inputs should equal size*size (default size 3 => 9 inputs)
    // - The table header should include indices 0..size-1
    // - No uncaught page errors should occur during creation

    const initialSize = parseInt(await app.getSizeValue(), 10);
    await app.clickCreateMatrix();

    // Table should now exist
    expect(await app.tableExists()).toBe(true);

    // Inputs count should be size*size
    const inputCount = await app.getInputCount();
    expect(inputCount).toBe(initialSize * initialSize);

    // Validate header labels include an empty top-left header and sequence 0..size-1
    const headers = await app.getHeaderLabels();
    // First header is empty string for corner
    expect(headers[0]).toBe('');
    // Next headers should be the indices
    for (let i = 1; i <= initialSize; i++) {
      expect(headers[i]).toBe(String(i - 1));
    }

    // Ensure inputs default values are "0"
    const values = await app.getMatrixInputValues();
    expect(values.every(v => v === '0')).toBe(true);

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Update Matrix transition: changing an input triggers updateMatrix and logs adjacency matrix', async () => {
    // This test validates the UpdateMatrix event within S1_MatrixCreated:
    // - Create the matrix then change one input (e.g., set (0,0) to 1)
    // - The onchange handler should call updateMatrix(), causing a console.log("Adjacency Matrix:")
    // - The DOM should reflect the changed value
    // - No uncaught page errors should occur during the update

    const size = parseInt(await app.getSizeValue(), 10);
    await app.clickCreateMatrix();

    // Clear previously captured console messages
    consoleMessages = [];

    // Set (0,0) to 1 and trigger change by blurring (Tab)
    await app.setMatrixInputAt(0, 0, size, 1);

    // Wait briefly to allow updateMatrix() to run and console messages to appear
    await page.waitForTimeout(100);

    // Verify DOM value changed
    const values1 = await app.getMatrixInputValues();
    expect(values[0]).toBe('1');

    // Verify that console.log recorded "Adjacency Matrix:"
    const hasAdjacencyLog1 = consoleMessages.some(m => m.text.includes('Adjacency Matrix:'));
    expect(hasAdjacencyLog).toBe(true);

    // Ensure no page errors thrown
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: creating a 1x1 matrix and updating its input logs correctly', async () => {
    // This test covers an edge case where size is set to 1:
    // - Set size to 1, create the matrix, expect exactly one input
    // - Update that input to 1 and expect the adjacency matrix log
    await app.setSize(1);
    await app.clickCreateMatrix();

    expect(await app.getInputCount()).toBe(1);

    // Clear console cache and update the single cell
    consoleMessages = [];
    await app.setMatrixInputAt(0, 0, 1, 1);
    await page.waitForTimeout(100);

    // DOM should reflect '1'
    const vals = await app.getMatrixInputValues();
    expect(vals.length).toBe(1);
    expect(vals[0]).toBe('1');

    // Console should include adjacency log
    expect(consoleMessages.some(m => m.text.includes('Adjacency Matrix:'))).toBe(true);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: setting size to 0 produces minimal table (no inputs) and does not crash', async () => {
    // Although size input has min=1 in markup, the test will directly set the value to 0 to see behavior.
    // This checks the application's robustness to unexpected input values:
    // - Set size to 0 and create matrix
    // - Expect a table may still be produced but with zero inputs
    // - Ensure no uncaught exceptions are thrown

    // Force size to 0
    await app.setSize(0);
    await app.clickCreateMatrix();

    // Table might exist but there should be zero inputs
    const inputCount1 = await app.getInputCount();
    expect(inputCount).toBe(0);

    // Ensure that no page errors occurred (function should handle size=0 gracefully)
    expect(pageErrors.length).toBe(0);

    // Confirm that attempting to update non-existent inputs does not produce errors:
    // (no inputs to update, so just ensure updateMatrix isn't implicitly called and crashed)
    // No adjacency log should be present because no onchange was triggered
    const hasAdjacencyLog2 = consoleMessages.some(m => m.text.includes('Adjacency Matrix:'));
    expect(hasAdjacencyLog).toBe(false);
  });

  test('Edge case: entering out-of-range value in a matrix cell is reflected in DOM and logged by updateMatrix', async () => {
    // This test sets a value outside the input's max (e.g., 2 where max=1) and verifies:
    // - The DOM input accepts the value (browsers typically allow programmatic or typed entry)
    // - updateMatrix reads the value (parseInt) and logs the matrix with that value
    // - No uncaught page errors occur

    const size1 = parseInt(await app.getSizeValue(), 10);
    await app.clickCreateMatrix();

    // Set [1,1] (row 1 col 1) to 2 (out of specified max=1) and trigger change
    const targetRow = 1;
    const targetCol = 1;
    await app.setMatrixInputAt(targetRow, targetCol, size, 2);

    // Wait briefly for updateMatrix to log
    await page.waitForTimeout(100);

    // Read DOM to ensure the cell shows '2'
    const values2 = await app.getMatrixInputValues();
    const index1 = targetRow * size + targetCol;
    expect(values[index]).toBe('2');

    // Verify adjacency log present
    const hasAdjacencyLog3 = consoleMessages.some(m => m.text.includes('Adjacency Matrix:'));
    expect(hasAdjacencyLog).toBe(true);

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
  });

  test('Observes console and page errors during typical usage and asserts none are thrown unexpectedly', async () => {
    // This test performs a typical sequence and then asserts the recorded console messages and page errors:
    // - Create matrix
    // - Toggle a few cells
    // - Confirm presence of adjacency logs and absence of page errors

    await app.clickCreateMatrix();

    // Toggle a few cells
    await app.setMatrixInputAt(0, 1, 3, 1);
    await app.setMatrixInputAt(2, 2, 3, 1);

    await page.waitForTimeout(100);

    // At least one adjacency log should be present
    expect(consoleMessages.some(m => m.text.includes('Adjacency Matrix:'))).toBe(true);

    // Collect any console errors specifically
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    // There should be no console.error messages emitted by the app for normal operation
    expect(consoleErrors.length).toBe(0);

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });
});