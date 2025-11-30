import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4765-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Floyd-Warshall demo page
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.vertexCount = page.locator('#vertexCount');
    this.generateMatrixBtn = page.locator('#generateMatrix');
    this.matrixInputDiv = page.locator('#matrixInput');
    this.matrixForm = page.locator('#matrixForm');
    this.runAlgorithmBtn = page.locator('#runAlgorithmBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.outputDiv = page.locator('#output');
  }

  // Returns a locator for an input in the matrix by indices
  matrixInput(i, j) {
    return this.page.locator(`form#matrixForm [name="weight_${i}_${j}"]`);
  }

  // Read textual content of full table (for debugging/assertion)
  async getMatrixHTML() {
    return this.matrixInputDiv.innerHTML();
  }

  // Click generate matrix for given n
  async generate(n) {
    await this.vertexCount.fill(String(n));
    await this.generateMatrixBtn.click();
    // wait for table rebuild - detect the presence of header V0 .. V{n-1}
    await this.page.waitForFunction(
      (n) => {
        const div = document.getElementById('matrixInput');
        if (!div) return false;
        const headers = Array.from(div.querySelectorAll('th')).map(h => h.textContent.trim());
        // first th is empty corner, then V0..V(n-1)
        return headers.includes(`V${Math.max(0, n-1)}`);
      },
      n
    );
  }

  // Set weight at i,j (string value, allows '∞' or '9999' or numbers)
  async setWeight(i, j, value) {
    const input = this.matrixInput(i, j);
    await input.fill(String(value));
  }

  // Get weight input value
  async getWeight(i, j) {
    return (await this.matrixInput(i, j).inputValue());
  }

  // Submit the form to run algorithm
  async runAlgorithm() {
    await this.runAlgorithmBtn.click();
    // wait for output to populate with details or message
    await this.page.waitForFunction(() => !!document.getElementById('output').innerHTML.trim());
  }

  // Click Show Path with start and end (numbers)
  async showPath(start, end) {
    const startSelect = this.page.locator('#startVertex');
    const endSelect = this.page.locator('#endVertex');
    const showBtn = this.page.locator('#showPathBtn');
    await startSelect.selectOption(String(start));
    await endSelect.selectOption(String(end));
    await showBtn.click();
    const pathOutput = this.page.locator('#pathOutput');
    await expect(pathOutput).toBeVisible();
    return pathOutput;
  }

  // Reset the UI
  async reset() {
    await this.resetBtn.click();
    // After reset, matrixInput should be rebuilt; wait for table presence
    await this.page.waitForSelector('#matrixInput table');
  }
}

// Tests grouped
test.describe('Floyd-Warshall Algorithm Visualization - e03a4765...', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages and their types
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Wait for initial matrix to be created
    await page.waitForSelector('#matrixInput table');
  });

  // Test initial page load and default state
  test('Initial load: default vertex count is 4 and matrix is 4x4 with diagonal zeros', async ({ page }) => {
    const fw = new FloydWarshallPage(page);

    // Verify vertexCount default value
    await expect(fw.vertexCount).toHaveValue('4');

    // Verify matrix table exists and has headers V0..V3
    const headerCells = page.locator('#matrixInput table tr:first-child th');
    await expect(headerCells.nth(1)).toHaveText('V0');
    await expect(headerCells.nth(4)).toHaveText('V3');

    // Check diagonal inputs are readOnly and value '0'
    for (let i = 0; i < 4; i++) {
      const input1 = fw.matrixInput(i, i);
      await expect(input).toHaveValue('0');
      // readOnly property is present
      const readOnly = await page.evaluate((el) => el.readOnly, await input.elementHandle());
      expect(readOnly).toBe(true);
      // style background color approximate
      const bg = await input.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bg).toBeTruthy();
    }

    // Check off-diagonal inputs default to '9999' (INF)
    const sample = fw.matrixInput(0, 1);
    await expect(sample).toHaveValue('9999');

    // Ensure no uncaught page errors occurred during load
    expect(pageErrors.length).toBe(0);
    // Ensure no console.error was emitted
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  // Test generating a different size matrix
  test('Generate matrix button produces table for given vertex count (3)', async ({ page }) => {
    const fw1 = new FloydWarshallPage(page);

    // Generate 3x3 matrix
    await fw.generate(3);

    // Check header includes V2
    const headerCells1 = page.locator('#matrixInput table tr:first-child th');
    await expect(headerCells.nth(3)).toHaveText('V2');

    // Check table row count equals 4 (1 header + 3 rows)
    const rows = page.locator('#matrixInput table tr');
    await expect(rows).toHaveCount(1 + 3);

    // Verify output div was cleared when generating
    await expect(fw.outputDiv).toBeEmpty();

    // Ensure no uncaught errors on generate
    expect(pageErrors.length).toBe(0);
    const errors1 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  // Test run algorithm with a simple path scenario and path reconstruction
  test('Run algorithm: computes steps and reconstructs shortest path (V0 -> V3)', async ({ page }) => {
    const fw2 = new FloydWarshallPage(page);

    // Prepare a graph:
    // V0 -> V1 (3), V1 -> V2 (4), V2 -> V3 (5) so that V0->V3 = 12 via V1,V2
    await fw.setWeight(0, 1, '3');
    await fw.setWeight(1, 2, '4');
    await fw.setWeight(2, 3, '5');

    // Ensure others remain INF (9999)
    await fw.setWeight(0, 2, '9999');
    await fw.setWeight(0, 3, '9999');
    await fw.setWeight(1, 3, '9999');

    // Run algorithm
    await fw.runAlgorithm();

    // After run, output should contain <details> entries with pre.step
    const details = page.locator('#output details');
    await expect(details).toHaveCount(4); // since n=4 iterations

    // The last <details> element should be open (per implementation)
    const lastDetailOpen = await details.nth(3).evaluate((d) => d.hasAttribute('open'));
    expect(lastDetailOpen).toBe(true);

    // Each details should contain a pre.step element
    const steps = page.locator('#output pre.step');
    await expect(steps).toHaveCount(4);

    // Verify that output includes "Distance matrix" label and "Path matrix"
    const lastStepText = await steps.nth(3).innerText();
    expect(lastStepText).toContain('Distance matrix:');
    expect(lastStepText).toContain('Path matrix');

    // Now use the shortest path reconstruction controls
    const pathOutput1 = await fw.showPath(0, 3);
    const text = await pathOutput.textContent();

    // Validate the reconstructed path and distance
    expect(text).toContain('Shortest path from V0 to V3:');
    expect(text).toContain('V0 → V1 → V2 → V3');
    expect(text).toContain('Distance: 12');

    // Ensure no console errors or page errors occurred during algorithm run
    const errors2 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test reset functionality clears output and re-creates matrix inputs
  test('Reset button clears output and regenerates matrix inputs', async ({ page }) => {
    const fw3 = new FloydWarshallPage(page);

    // Run algorithm quickly to populate output
    await fw.setWeight(0, 1, '2');
    await fw.runAlgorithm();

    // Ensure output is present
    await expect(fw.outputDiv).not.toBeEmpty();

    // Click reset and ensure output cleared and matrix exists
    await fw.reset();

    // Output should be empty
    await expect(fw.outputDiv).toBeEmpty();

    // Matrix input should exist and diagonal input still '0'
    await expect(fw.matrixInput(0, 0)).toHaveValue('0');

    // Ensure no page errors
    expect(pageErrors.length).toBe(0);
    const errors3 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  // Test invalid input handling: negative weight should trigger alert and prevent run
  test('Invalid input (negative weight) triggers alert and algorithm does not run', async ({ page }) => {
    const fw4 = new FloydWarshallPage(page);

    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Put an invalid negative number into matrix
    await fw.setWeight(0, 1, '-5');

    // Click run; the form handler will try to parse and throw, then alert the message
    await fw.runAlgorithm(); // runAlgorithm triggers click and waits for output to be non-empty OR any alert; but alert dismiss is handled

    // The alert dialog should have been shown with the parseMatrix error
    expect(dialogMessage).toBeTruthy();
    expect(dialogMessage).toContain('Invalid weight at (0,1). Must be non-negative number or ∞.');

    // After invalid input and alert, the output should not display the "Running Floyd-Warshall Algorithm..."
    const outputText = await fw.outputDiv.textContent();
    // Either empty or does not contain running message because parseMatrix prevented run
    expect(outputText).not.toContain('Running Floyd-Warshall Algorithm...');

    // Ensure a negative value remained in the input (form not modified by app)
    await expect(fw.matrixInput(0, 1)).toHaveValue('-5');

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);
    const errors4 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  // After all interactions, assert that there were no unexpected uncaught exceptions or console errors
  test('No uncaught exceptions or console.error messages occurred during tests', async ({ page }) => {
    // This test relies on the pageErrors and consoleMessages collected in beforeEach of the latest test run.
    // Since each test has its own page, we only assert that our arrays are present and contain no errors for this page instance.
    expect(Array.isArray(pageErrors)).toBe(true);
    const errorsFromConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorsFromConsole.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});