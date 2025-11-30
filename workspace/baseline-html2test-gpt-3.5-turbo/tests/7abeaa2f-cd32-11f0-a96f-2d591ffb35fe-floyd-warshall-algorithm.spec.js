import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa2f-cd32-11f0-a96f-2d591ffb35fe.html';

/**
 * Page object representing the Floyd-Warshall demo page.
 * Encapsulates commonly used locators and actions to keep tests readable.
 */
class FloydWarshallPage {
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#start-btn');
    this.graphInput = page.locator('#graph-input');
    this.errorDiv = page.locator('#error');
    this.stepInfo = page.locator('#step-info');
    this.distanceMatrix = page.locator('#distance-matrix');
    this.predecessorMatrix = page.locator('#predecessor-matrix');
    this.controls = page.locator('#controls');
    this.prevStepBtn = page.locator('#prev-step');
    this.nextStepBtn = page.locator('#next-step');
    this.autoRunBtn = page.locator('#auto-run');
    this.resetBtn = page.locator('#reset');
  }

  // Click the Start button
  async start() {
    await this.startBtn.click();
  }

  // Set the graph input value
  async setInput(value) {
    await this.graphInput.fill(value);
  }

  // Read the distance matrix as an array of rows (each row is array of cell text)
  async readDistanceMatrix() {
    // Returns array of rows; each row is array of strings from td cells
    const rows = this.page.locator('#distance-matrix table tbody tr');
    const count = await rows.count();
    const result = [];
    for (let i = 0; i < count; i++) {
      const tds = rows.nth(i).locator('td');
      const tdCount = await tds.count();
      const row = [];
      for (let j = 0; j < tdCount; j++) {
        row.push((await tds.nth(j).innerText()).trim());
      }
      result.push(row);
    }
    return result;
  }

  // Read the predecessor matrix similarly
  async readPredecessorMatrix() {
    const rows1 = this.page.locator('#predecessor-matrix table tbody tr');
    const count1 = await rows.count1();
    const result1 = [];
    for (let i = 0; i < count; i++) {
      const tds1 = rows.nth(i).locator('td');
      const tdCount1 = await tds.count();
      const row1 = [];
      for (let j = 0; j < tdCount; j++) {
        row.push((await tds.nth(j).innerText()).trim());
      }
      result.push(row);
    }
    return result;
  }

  // Click next step
  async next() {
    await this.nextStepBtn.click();
  }

  // Click previous step
  async prev() {
    await this.prevStepBtn.click();
  }

  // Toggle auto run
  async toggleAuto() {
    await this.autoRunBtn.click();
  }

  // Click reset
  async reset() {
    await this.resetBtn.click();
  }

  // Get step info text
  async getStepInfo() {
    return (await this.stepInfo.innerText()).trim();
  }

  // Get error text
  async getErrorText() {
    return (await this.errorDiv.innerText()).trim();
  }

  // Check controls visibility
  async controlsVisible() {
    return !(await this.controls.getAttribute('hidden')) || (await this.controls.isVisible());
  }
}

test.describe('Floyd-Warshall Algorithm Visualization (application id: 7abeaa2f-cd32-11f0-a96f-2d591ffb35fe)', () => {
  // Each test will capture console messages and page errors during load & interactions.
  // We will assert that no unexpected page errors occurred during the test runs.
  // Note: We intentionally do not inject or patch page code; we let any runtime errors surface naturally.

  test('Initial page load displays matrices and controls with default input', async ({ page }) => {
    // Capture console and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const fw = new FloydWarshallPage(page);
    // Navigate to the page (the page script auto-clicks start on load)
    await page.goto(APP_URL);

    // Wait for the controls to appear after the auto-start click
    await expect(fw.controls).toBeVisible();

    // Verify step-info indicates initial matrices loaded
    await expect(fw.stepInfo).toContainText('Initial distance');

    // Read and verify the distance matrix first row matches default input "0 3 INF 7"
    const dist = await fw.readDistanceMatrix();
    expect(dist.length).toBe(4); // 4x4 matrix expected
    expect(dist[0]).toEqual(['0', '3', '∞', '7']); // INF is shown as ∞

    // Verify that infinite cell has class 'infinite' and aria-label 'Infinity'
    const infinityCell = page.locator('#distance-matrix table tbody tr').nth(0).locator('td').nth(2);
    await expect(infinityCell).toHaveClass(/infinite/);
    await expect(infinityCell).toHaveAttribute('aria-label', 'Infinity');

    // Verify predecessor matrix shows '-' for infinities and for diagonal
    const pred = await fw.readPredecessorMatrix();
    expect(pred.length).toBe(4);
    // For initial matrix, diagonal should be '-' (null) in predecessor matrix
    expect(pred[0][0]).toBe('-');

    // Verify prev button is disabled at initial step, next is enabled (since more steps exist)
    await expect(fw.prevStepBtn).toBeDisabled();
    await expect(fw.nextStepBtn).toBeEnabled();

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length, 'No uncaught page errors should occur on load').toBe(0);

    // Also expect no console errors of type 'error' (we allow other console messages)
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error calls expected on load').toBe(0);
  });

  test('Next and Previous navigation updates matrices and button states correctly', async ({ page }) => {
    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const fw1 = new FloydWarshallPage(page);
    await page.goto(APP_URL);

    // Initial step
    await expect(fw.stepInfo).toContainText('Initial distance');

    // Click Next to advance to k = 0 step
    await fw.next();
    await expect(fw.stepInfo).toContainText('k = 0');

    const distAfterK0 = await fw.readDistanceMatrix();
    // Confirm that at least one update likely occurred: check an entry changed from ∞ or higher to a finite small number
    // For this specific input, after k=0 some distances may remain, but we assert the step-info update is present and prev becomes enabled.
    await expect(fw.prevStepBtn).toBeEnabled();

    // Advance to final step (there are n+1 steps for n=4 => 5 steps; initial + k=0..3)
    // Already at index 1, click next 3 more times to reach last
    await fw.next(); // k=1
    await fw.next(); // k=2
    await fw.next(); // k=3 (final)
    await expect(fw.stepInfo).toContainText('k = 3');

    // On final step, next should be disabled
    await expect(fw.nextStepBtn).toBeDisabled();

    // Click prev once to ensure we can go back
    await fw.prev();
    // Now next should be enabled again
    await expect(fw.nextStepBtn).toBeEnabled();

    // Ensure no uncaught page errors occurred during navigation
    expect(pageErrors.length, 'No uncaught page errors should occur during navigation').toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error during navigation').toBe(0);
  });

  test('Auto Run toggles and auto-advances, then pauses and re-enables controls', async ({ page }) => {
    const consoleMessages2 = [];
    const pageErrors2 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const fw2 = new FloydWarshallPage(page);
    await page.goto(APP_URL);

    // Ensure we start at initial step
    const initialInfo = await fw.getStepInfo();
    expect(initialInfo).toContain('Initial');

    // Toggle auto-run ON
    await fw.toggleAuto();
    // Button text should change to indicate Pause
    await expect(fw.autoRunBtn).toHaveText(/Pause/);

    // While auto-run is active, prev/next/reset/start and input should be disabled in UI state
    await expect(fw.prevStepBtn).toBeDisabled();
    await expect(fw.nextStepBtn).toBeDisabled();
    await expect(fw.resetBtn).toBeDisabled();
    await expect(fw.startBtn).toBeDisabled();
    // Wait enough time for auto-run to advance at least one step (interval = 1500ms in app)
    await page.waitForTimeout(1700);

    // Confirm that step advanced (stepInfo not equal to initial)
    const afterAutoInfo = await fw.getStepInfo();
    expect(afterAutoInfo).not.toBe(initialInfo);

    // Toggle auto-run OFF (pause)
    await fw.toggleAuto();
    await expect(fw.autoRunBtn).toHaveText(/Auto Run/);

    // Controls should be re-enabled after pause
    await expect(fw.prevStepBtn).toBeEnabled();
    await expect(fw.nextStepBtn).toBeEnabled();
    await expect(fw.resetBtn).toBeEnabled();
    await expect(fw.startBtn).toBeEnabled();

    // Ensure no uncaught page errors occurred during auto-run toggling
    expect(pageErrors.length, 'No uncaught page errors should occur during auto-run').toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error during auto-run').toBe(0);
  });

  test('Reset returns the display to the initial matrices', async ({ page }) => {
    const consoleMessages3 = [];
    const pageErrors3 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const fw3 = new FloydWarshallPage(page);
    await page.goto(APP_URL);

    // Advance a couple of steps
    await fw.next();
    await fw.next();
    const infoBeforeReset = await fw.getStepInfo();
    expect(infoBeforeReset).toContain('k =');

    // Click reset should bring us back to initial step
    await fw.reset();
    const infoAfterReset = await fw.getStepInfo();
    expect(infoAfterReset).toContain('Initial distance');

    // Matrices should match the initial default values again
    const dist1 = await fw.readDistanceMatrix();
    expect(dist[0]).toEqual(['0', '3', '∞', '7']);

    // Ensure no uncaught page errors occurred during reset
    expect(pageErrors.length, 'No uncaught page errors should occur during reset').toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error during reset').toBe(0);
  });

  test('Malformed input: mismatched row length shows descriptive error and hides controls', async ({ page }) => {
    const consoleMessages4 = [];
    const pageErrors4 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const fw4 = new FloydWarshallPage(page);
    await page.goto(APP_URL);

    // Replace input with a malformed matrix: second row has too few elements
    const badInput = '0 1 2\n3 4\n5 6 7';
    await fw.setInput(badInput);

    // Click Start to trigger parsing and error
    await fw.start();

    // The errorDiv should contain an error about row length mismatch
    const errorText = await fw.getErrorText();
    expect(errorText).toMatch(/Row \d+ length.*does not match expected size/);

    // Controls should be hidden
    await expect(fw.controls).toBeHidden();

    // Distance and predecessor matrix containers should be cleared
    await expect(fw.distanceMatrix).toBeEmpty();
    await expect(fw.predecessorMatrix).toBeEmpty();

    // Confirm that error was handled gracefully (no uncaught page errors) — parsing errors are caught and displayed
    expect(pageErrors.length, 'No uncaught page errors expected for malformed input').toBe(0);

    // There may be a console log of the error, but we disallow console.error here for cleanliness
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error expected for malformed input handling').toBe(0);
  });

  test('Malformed input: invalid token and negative weight show descriptive errors', async ({ page }) => {
    const consoleMessages5 = [];
    const pageErrors5 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const fw5 = new FloydWarshallPage(page);
    await page.goto(APP_URL);

    // Invalid token e.g., 'abc' should produce an "Invalid number" error
    await fw.setInput('0 1\nabc 0');
    await fw.start();
    let errorText1 = await fw.getErrorText();
    expect(errorText).toMatch(/Invalid number 'abc' in input/);

    // Now negative weight input should produce a negative weight error
    await fw.setInput('0 -1\n-1 0');
    await fw.start();
    errorText = await fw.getErrorText();
    expect(errorText).toMatch(/Negative weights not supported/);

    // Ensure no uncaught page errors occurred during these error scenarios
    expect(pageErrors.length, 'No uncaught page errors expected for invalid token or negative weight').toBe(0);
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error expected for invalid inputs').toBe(0);
  });

  test('Accessibility checks: controls have aria-labels and are keyboard focusable (tabIndex)', async ({ page }) => {
    const consoleMessages6 = [];
    const pageErrors6 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const fw6 = new FloydWarshallPage(page);
    await page.goto(APP_URL);

    // Controls should have appropriate aria-labels as defined in the HTML
    await expect(fw.prevStepBtn).toHaveAttribute('aria-label', /Previous step|Previous/);
    await expect(fw.nextStepBtn).toHaveAttribute('aria-label', /Next step|Next/);
    await expect(fw.autoRunBtn).toHaveAttribute('aria-label', /Auto run toggle|Auto Run/);
    await expect(fw.resetBtn).toHaveAttribute('aria-label', /Reset algorithm|Reset/);

    // Ensure buttons are keyboard focusable (tabIndex set to "0")
    // The HTML sets tabIndex = 0 for [prevStepBtn, nextStepBtn, autoRunBtn, resetBtn]
    await expect(fw.prevStepBtn).toHaveAttribute('tabindex', '0');
    await expect(fw.nextStepBtn).toHaveAttribute('tabindex', '0');
    await expect(fw.autoRunBtn).toHaveAttribute('tabindex', '0');
    await expect(fw.resetBtn).toHaveAttribute('tabindex', '0');

    // Ensure no uncaught page errors occurred during accessibility checks
    expect(pageErrors.length, 'No uncaught page errors expected during accessibility checks').toBe(0);
    const consoleErrors6 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error expected during accessibility checks').toBe(0);
  });
});