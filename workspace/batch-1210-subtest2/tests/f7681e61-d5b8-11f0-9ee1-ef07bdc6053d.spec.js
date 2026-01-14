import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7681e61-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Simple Page Object Model for the Floyd-Warshall demo
class FloydWarshallPage {
  constructor(page) {
    this.page = page;
    this.verticesInput = page.locator('input#vertices');
    this.createButton = page.locator("button[onclick='createMatrix()']");
    this.runButton = page.locator('#run-button');
    this.matrixContainer = page.locator('#matrix');
    this.resultContainer = page.locator('#result');
  }

  async navigate() {
    await this.page.goto(APP_URL);
  }

  // click the Create Matrix button
  async createMatrix() {
    await this.createButton.click();
    // Wait for the matrix to be rendered into the #matrix container
    await expect(this.matrixContainer.locator('table')).toBeVisible();
  }

  // set the number of vertices (value must be a string or number)
  async setVertices(n) {
    await this.verticesInput.fill(String(n));
  }

  // returns a locator for the input at (i, j) after matrix creation
  matrixInputLocator(i, j, numVertices) {
    // inputs are rendered in row-major order
    const index = i * numVertices + j;
    return this.matrixContainer.locator('input[type="number"]').nth(index);
  }

  // set a matrix cell and trigger change event to call updateMatrix
  async setMatrixValue(i, j, value, numVertices) {
    const input = this.matrixInputLocator(i, j, numVertices);
    // Use evaluate to set value and dispatch change so onchange handler runs
    await input.evaluate((el, v) => {
      el.value = v === null || v === undefined ? '' : String(v);
      // dispatch change event as the inline handler listens for onchange
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  // click run button
  async runFloydWarshall() {
    await this.runButton.click();
    // wait for result table to appear
    await expect(this.resultContainer.locator('table')).toBeVisible();
  }

  // read the result as a 2D array of strings (so we can inspect '∞')
  async readResultMatrix() {
    return await this.page.evaluate(() => {
      const resultDiv = document.getElementById('result');
      if (!resultDiv) return null;
      const rows = Array.from(resultDiv.querySelectorAll('tbody tr'));
      return rows.map(row =>
        Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim())
      );
    });
  }

  // number of inputs in matrix (numVertices^2)
  async countMatrixInputs() {
    return await this.matrixContainer.locator('input[type="number"]').count();
  }
}

test.describe('FSM: Floyd-Warshall Algorithm Visualization (f7681e61-...)', () => {
  let consoleErrors;
  let pageErrors;

  // Attach console and pageerror listeners before each test and reset arrays.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // capture console errors only
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure tests did not produce uncaught exceptions
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('S0_Idle: initial page render shows Create Matrix and vertices input, Run button hidden', async ({ page }) => {
    // Validate initial idle state (S0_Idle)
    const fw = new FloydWarshallPage(page);
    await fw.navigate();

    // The Create Matrix button should be present and have the expected onclick attribute
    await expect(fw.createButton).toBeVisible();
    const onclickAttr = await fw.createButton.getAttribute('onclick');
    expect(onclickAttr).toBe('createMatrix()');

    // The vertices input should have default value 3 and min/max attributes
    await expect(fw.verticesInput).toHaveValue('3');
    expect(await fw.verticesInput.getAttribute('min')).toBe('2');
    expect(await fw.verticesInput.getAttribute('max')).toBe('5');

    // Run button should be hidden as per evidence 'style="display:none;"'
    expect(await fw.runButton.getAttribute('style')).toContain('display:none');

    // Verify matrix container is empty initially (no table)
    await expect(fw.matrixContainer.locator('table')).toHaveCount(0);
  });

  test('Transition S0 -> S1: Create Matrix renders table, inputs with onchange and shows Run button', async ({ page }) => {
    // Validate CreateMatrix event and S1_MatrixCreated state
    const fw = new FloydWarshallPage(page);
    await fw.navigate();

    // Create the matrix
    await fw.createMatrix();

    // By default vertices input = 3, so expect 9 inputs
    const numVertices = Number(await fw.verticesInput.inputValue());
    expect(numVertices).toBeGreaterThanOrEqual(2);
    expect(numVertices).toBeLessThanOrEqual(5);

    const inputCount = await fw.countMatrixInputs();
    expect(inputCount).toBe(numVertices * numVertices);

    // Verify each input has an onchange inline handler (the HTML uses onchange='updateMatrix(i, j, this.value)')
    const firstInputOnChange = await fw.matrixInputLocator(0, 0, numVertices).getAttribute('onchange');
    // The attribute will contain 'updateMatrix' call; assert it exists
    expect(firstInputOnChange).toContain('updateMatrix');

    // Verify the run button is now visible
    await expect(fw.runButton).toBeVisible();

    // Check adjacencyMatrix global state in page: diagonal zeros and off-diagonals Infinity
    const diagZero = await page.evaluate(() => {
      return adjacencyMatrix.every((row, idx) => row[idx] === 0);
    });
    expect(diagZero).toBe(true);
    const offDiagInfinity = await page.evaluate(() => {
      // check at least one off-diagonal is Infinity for a 3x3 default
      for (let i = 0; i < adjacencyMatrix.length; i++) {
        for (let j = 0; j < adjacencyMatrix.length; j++) {
          if (i !== j && adjacencyMatrix[i][j] !== Infinity) {
            return false;
          }
        }
      }
      return true;
    });
    expect(offDiagInfinity).toBe(true);
  });

  test('Event UpdateMatrix: changing an input updates adjacencyMatrix; clearing sets Infinity', async ({ page }) => {
    // Validate UpdateMatrix event and correctness of updateMatrix()
    const fw = new FloydWarshallPage(page);
    await fw.navigate();

    // Create matrix of size 3
    await fw.createMatrix();
    const n = Number(await fw.verticesInput.inputValue());
    expect(n).toBe(3);

    // Set cell (0,1) to 5 and verify adjacencyMatrix updated
    await fw.setMatrixValue(0, 1, 5, n);
    const cell01 = await page.evaluate(() => adjacencyMatrix[0][1]);
    expect(cell01).toBe(5);

    // Clear cell (0,1) (set blank) to represent Infinity and verify
    await fw.setMatrixValue(0, 1, '', n); // '' will be interpreted as Infinity in updateMatrix
    const cell01ClearedIsInfinity = await page.evaluate(() => adjacencyMatrix[0][1] === Infinity);
    expect(cell01ClearedIsInfinity).toBe(true);

    // Also test another cell: set (1,2) to 3
    await fw.setMatrixValue(1, 2, 3, n);
    const cell12 = await page.evaluate(() => adjacencyMatrix[1][2]);
    expect(cell12).toBe(3);
  });

  test('Transition S1 -> S2 -> S3: Run Floyd-Warshall computes shortest paths and displays result', async ({ page }) => {
    // This test validates creating a matrix, updating a couple of edges, running the algorithm,
    // and observing the resulting distance matrix displayed in the DOM (S1 -> S2 -> S3 transitions).
    const fw = new FloydWarshallPage(page);
    await fw.navigate();

    // Create matrix of size 3
    await fw.createMatrix();
    const n = Number(await fw.verticesInput.inputValue());
    expect(n).toBe(3);

    // Setup edges:
    // 0 -> 1 = 2
    // 1 -> 2 = 3
    // Initially 0 -> 2 is Infinity; after Floyd-Warshall it should be 5 (via 1)
    await fw.setMatrixValue(0, 1, 2, n);
    await fw.setMatrixValue(1, 2, 3, n);

    // Sanity: check the adjacencyMatrix values
    const a01 = await page.evaluate(() => adjacencyMatrix[0][1]);
    const a12 = await page.evaluate(() => adjacencyMatrix[1][2]);
    expect(a01).toBe(2);
    expect(a12).toBe(3);

    // Ensure run button is visible then click it (RunFloydWarshall event)
    await expect(fw.runButton).toBeVisible();
    await fw.runFloydWarshall();

    // After running, the result DOM should be populated (S3_ResultDisplayed)
    const resultMatrix = await fw.readResultMatrix();
    expect(resultMatrix).not.toBeNull();
    // resultMatrix is an array of arrays of strings
    // Check cell (0,2) equals '5'
    expect(resultMatrix[0][2]).toBe('5');

    // Check some other entries: diagonal zeros displayed as '0'
    expect(resultMatrix[0][0]).toBe('0');
    expect(resultMatrix[1][1]).toBe('0');

    // Check that cells that remain unreachable are displayed as '∞'
    // For example, if 2->0 is unreachable, it should show '∞'
    const twoToZero = resultMatrix[2][0];
    expect(twoToZero).toBeDefined();
    // It could be '∞' or a numeric if connections exist; we assert that if it's not a number string it's '∞'
    if (!/^\d+$/.test(twoToZero)) {
      expect(twoToZero).toBe('∞');
    }
  });

  test('Edge cases: vertices boundary values and large matrix rendering (max allowed)', async ({ page }) => {
    // Validate edge behavior for vertices input boundaries (min=2, max=5)
    const fw = new FloydWarshallPage(page);
    await fw.navigate();

    // Test minimum allowed vertices = 2
    await fw.setVertices(2);
    await fw.createMatrix();
    let n = Number(await fw.verticesInput.inputValue());
    expect(n).toBe(2);
    let count = await fw.countMatrixInputs();
    expect(count).toBe(4);

    // Now test maximum allowed vertices = 5
    await fw.setVertices(5);
    await fw.createMatrix();
    n = Number(await fw.verticesInput.inputValue());
    expect(n).toBe(5);
    count = await fw.countMatrixInputs();
    expect(count).toBe(25);

    // Ensure run button visible for 5x5 as well
    await expect(fw.runButton).toBeVisible();

    // As an additional safety check, set a value and run Floyd-Warshall to ensure no runtime errors on larger matrix
    await fw.setMatrixValue(0, 1, 1, n);
    await fw.setMatrixValue(1, 2, 1, n);
    // click run and check result renders
    await fw.runFloydWarshall();
    const resultMatrix = await fw.readResultMatrix();
    expect(resultMatrix.length).toBe(5);
    expect(resultMatrix[0].length).toBe(5);
  });

  test('Robustness: ensure unexpected input changes do not throw unhandled exceptions', async ({ page }) => {
    // This test tries to simulate some atypical interactions to ensure no uncaught exceptions occur.
    const fw = new FloydWarshallPage(page);
    await fw.navigate();

    // Create a 3x3 matrix
    await fw.createMatrix();
    const n = Number(await fw.verticesInput.inputValue());

    // Using evaluate, set input values directly to non-numeric string then dispatch change.
    // The page code's updateMatrix uses parseInt(value) which will yield NaN and then will treat as Infinity.
    // We verify there are no uncaught exceptions and adjacencyMatrix entries become Infinity as expected.
    await fw.matrixInputLocator(0, 2, n).evaluate((el) => {
      el.value = 'not-a-number';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Confirm the corresponding adjacencyMatrix entry is Infinity (updateMatrix sets Infinity when parseInt fails)
    const isInfinity = await page.evaluate(() => adjacencyMatrix[0][2] === Infinity);
    expect(isInfinity).toBe(true);

    // Running algorithm after such entries should not throw errors
    await fw.runFloydWarshall();
    const resultMatrix = await fw.readResultMatrix();
    expect(resultMatrix).toBeTruthy();
  });
});