import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c5-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object to encapsulate interactions with the Floyd-Warshall app
class FloydWarshallPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numInput = page.locator('#numVertices');
    this.matrixInput = page.locator('#adjMatrix');
    this.startBtn = page.locator('#startBtn');
    this.errorDiv = page.locator('#error');
    this.outputDiv = page.locator('#output');
    // within output after run:
    this.stepControls = this.outputDiv.locator('.step-controls');
    this.prevBtn = this.outputDiv.locator('button', { hasText: '◀ Previous Step' });
    this.nextBtn = this.outputDiv.locator('button', { hasText: 'Next Step ▶' });
    this.stepInfo = this.outputDiv.locator('.step-info');
    this.matrixTable = this.outputDiv.locator('table');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getTitle() {
    return this.page.title();
  }

  async getHeaderText() {
    return this.page.locator('h1').innerText();
  }

  async getNumVerticesValue() {
    return this.numInput.inputValue();
  }

  async getMatrixTextareaValue() {
    return this.matrixInput.inputValue();
  }

  async setNumVertices(value) {
    await this.numInput.fill(String(value));
    // trigger change event explicitly (the app listens to 'change')
    await this.numInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  }

  async setMatrixTextarea(value) {
    await this.matrixInput.fill(value);
  }

  async clickRun() {
    await this.startBtn.click();
  }

  // Wait for visualization controls to appear (or a "No steps" message)
  async waitForOutput() {
    await Promise.race([
      this.stepControls.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
      this.outputDiv.waitFor({ state: 'visible', timeout: 2000 })
    ]);
  }

  async isErrorVisible() {
    const txt = (await this.errorDiv.textContent()) || '';
    return txt.trim().length > 0;
  }

  async getErrorText() {
    return (await this.errorDiv.textContent()) || '';
  }

  async waitForMatrixTable() {
    await this.matrixTable.waitFor({ state: 'visible', timeout: 2000 });
  }

  async clickNext() {
    await this.nextBtn.click();
  }

  async clickPrev() {
    await this.prevBtn.click();
  }

  async getStepInfoText() {
    return (await this.stepInfo.textContent()) || '';
  }

  async getMatrixCellsText() {
    // returns array of arrays of cell text from displayed table
    await this.waitForMatrixTable();
    return await this.page.$$eval('#output table tbody tr', (rows) =>
      rows.map((r) =>
        Array.from(r.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '')
      )
    );
  }

  async countInfinityCells() {
    await this.waitForMatrixTable();
    return await this.page.$$eval('#output table td.infinity', (els) => els.length);
  }

  async nextDisabled() {
    return await this.nextBtn.evaluate((b) => b.disabled);
  }

  async prevDisabled() {
    return await this.prevBtn.evaluate((b) => b.disabled);
  }
}

test.describe('Floyd-Warshall Algorithm Visualization - UI and behavior', () => {

  // Capture console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // no-op here; listeners will be added within test when needed
  });

  test('Initial page load shows default inputs and no runtime errors', async ({ page }) => {
    // Set up listeners to collect console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new FloydWarshallPage(page);
    await app.goto();

    // Verify page title and main header
    const title = await app.getTitle();
    expect(title).toContain('Floyd-Warshall Algorithm Visualization');

    const header = await app.getHeaderText();
    expect(header).toContain('Floyd-Warshall Algorithm Visualization');

    // Verify default numVertices and textarea content
    const numVal = await app.getNumVerticesValue();
    expect(numVal).toBe('4');

    const matrixText = await app.getMatrixTextareaValue();
    expect(matrixText.split('\n').length).toBeGreaterThanOrEqual(1);
    expect(matrixText.split('\n')[0].trim()).toContain('0 3 -1 7');

    // Wait a short time to ensure no immediate runtime errors were thrown on load
    await page.waitForTimeout(200);

    // Assert there were no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);

    // Optionally ensure console does not contain errors (allow warnings/info)
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  test('Running the algorithm renders controls and steps; step navigation updates state', async ({ page }) => {
    // Collect console messages and page errors during the run
    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const app1 = new FloydWarshallPage(page);
    await app.goto();

    // Start the algorithm visualization
    await app.clickRun();

    // Wait for the output controls to appear
    await app.waitForOutput();

    // There should be step-controls and step-info present
    expect(await app.stepControls.isVisible()).toBeTruthy();
    expect(await app.stepInfo.isVisible()).toBeTruthy();

    // Initial state is shown before any step
    const stepInfoInitial = await app.getStepInfoText();
    expect(stepInfoInitial).toMatch(/Initial state before any updates/i);

    // The matrix table should be present and show headers 0..3
    await app.waitForMatrixTable();
    // Check there are some infinity-marked cells
    const infCount = await app.countInfinityCells();
    expect(infCount).toBeGreaterThanOrEqual(1);

    // Next button should be enabled (we are at initial state)
    expect(await app.nextDisabled()).toBe(false);
    // Prev should be disabled at initial (-1) state
    expect(await app.prevDisabled()).toBe(true);

    // Click next once to move to first recorded update check
    await app.clickNext();
    await page.waitForTimeout(50); // short wait for DOM update

    const stepInfo1 = await app.getStepInfoText();
    // Expect to see k=0 (first outer loop) and indices i=0 j=0 included in step description
    expect(stepInfo1).toMatch(/k=0/);
    expect(stepInfo1).toMatch(/i=0/);
    expect(stepInfo1).toMatch(/j=0/);

    // Click Next several times and ensure stepInfo changes and prev becomes enabled
    await app.clickNext();
    await page.waitForTimeout(50);
    const stepInfo2 = await app.getStepInfoText();
    expect(stepInfo2.length).toBeGreaterThan(0);
    expect(await app.prevDisabled()).toBe(false);

    // Step through all remaining steps until algorithm finished
    // There are at most n^3 checks; use a safety limit to avoid infinite loops
    let stepsClicked = 0;
    const maxClicks = 200;
    while (!(await app.nextDisabled()) && stepsClicked < maxClicks) {
      await app.clickNext();
      // small delay for DOM update
      await page.waitForTimeout(10);
      stepsClicked++;
    }

    // After finishing, the step info should indicate completion
    const finalStepInfo = await app.getStepInfoText();
    expect(finalStepInfo).toMatch(/Algorithm finished/i);

    // There should be no uncaught page errors from running the algorithm
    await page.waitForTimeout(50);
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  test('Input validation: mismatched rows triggers an error message', async ({ page }) => {
    const consoleMessages2 = [];
    const pageErrors2 = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const app2 = new FloydWarshallPage(page);
    await app.goto();

    // Set number of vertices to 3 but provide only 2 rows in the adjacency matrix
    await app.setNumVertices(3);
    await app.setMatrixTextarea('0 1 2\n3 0 4'); // only 2 rows

    // Run
    await app.clickRun();

    // Expect error div to be populated with a rows count error
    await page.waitForTimeout(50);
    const errText = await app.getErrorText();
    expect(errText).toMatch(/Expected 3 rows/i);

    // No uncaught page errors should have occurred while validating input
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  test('Input validation: diagonal non-zero triggers diagonal error', async ({ page }) => {
    const consoleMessages3 = [];
    const pageErrors3 = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const app3 = new FloydWarshallPage(page);
    await app.goto();

    // Set vertices to 2 and provide a matrix with a non-zero diagonal entry
    await app.setNumVertices(2);
    await app.setMatrixTextarea('1 5\n3 0'); // matrix[0][0] === 1 -> invalid

    await app.clickRun();

    // Expect diagonal validation error
    await page.waitForTimeout(50);
    const errText1 = await app.getErrorText();
    expect(errText).toMatch(/Diagonal elements must be 0 or infinity/i);

    // No uncaught page errors should have occurred while validating input
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  test('Input validation: invalid number of vertices (out of range) shows error', async ({ page }) => {
    const consoleMessages4 = [];
    const pageErrors4 = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const app4 = new FloydWarshallPage(page);
    await app.goto();

    // Set invalid number 0
    await app.setNumVertices(0);

    // Run
    await app.clickRun();

    // Expect the appropriate error message
    await page.waitForTimeout(50);
    const errText2 = await app.getErrorText();
    expect(errText).toMatch(/Number of vertices must be an integer between 1 and 10/i);

    // No uncaught page errors should have occurred
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

  test('Changing numVertices updates default adjacency matrix when applicable', async ({ page }) => {
    const consoleMessages5 = [];
    const pageErrors5 = [];
    page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    const app5 = new FloydWarshallPage(page);
    await app.goto();

    // Change to 2 which has a predefined default -> expect textarea to update
    await app.setNumVertices(2);

    // read textarea value and validate it matches expected default for 2
    const matrixVal = await app.getMatrixTextareaValue();
    expect(matrixVal.trim()).toBe('0 1\n1 0');

    // Change to 5 which has predefined default in the app
    await app.setNumVertices(5);
    const matrixVal5 = await app.getMatrixTextareaValue();
    expect(matrixVal5.split('\n').length).toBe(5);
    // first line should match the default defined in the app for 5
    expect(matrixVal5.split('\n')[0].trim()).toMatch(/^0 3 8 -1 -4$/);

    // Change to a size not explicitly in defaultMatrix (e.g., 6) -> should produce lines with '∞' for off-diagonal
    await app.setNumVertices(6);
    const matrixVal6 = await app.getMatrixTextareaValue();
    const lines6 = matrixVal6.split('\n');
    expect(lines6.length).toBe(6);
    // off-diagonal should contain the unicode infinity char or similar symbol in the auto-generated case
    const nonDiagExample = lines6[0].split(/\s+/)[1];
    // Could be '∞' or another representation in case of environment differences; ensure not '0'
    expect(nonDiagExample).not.toBe('0');

    // Ensure no uncaught page errors occurred while changing sizes
    expect(pageErrors.length).toBe(0);
    const errorConsoleMsgs5 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
  });

});