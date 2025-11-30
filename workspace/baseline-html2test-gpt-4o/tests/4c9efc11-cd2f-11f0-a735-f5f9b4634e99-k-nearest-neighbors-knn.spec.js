import { test, expect } from '@playwright/test';

// Page Object for the KNN demo page
class KNNPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/4c9efc11-cd2f-11f0-a735-f5f9b4634e99.html';
    this.kInput = page.locator('#kValue');
    this.classifyButton = page.locator('button:has-text("Classify New Point")');
    this.canvas = page.locator('#canvas');
    this.output = page.locator('#output');
  }

  // Navigate to the demo page
  async goto() {
    await this.page.goto(this.url);
  }

  // Get the numeric value currently in the K input (as string)
  async getKInputValue() {
    return await this.kInput.inputValue();
  }

  // Set the K input to a given value (string or number)
  async setKInputValue(value) {
    // Use fill to mimic typing / user input; works for number inputs too
    await this.kInput.fill(String(value));
  }

  // Click the classify button
  async clickClassify() {
    await Promise.all([
      this.page.waitForTimeout(50), // allow any synchronous UI updates; classify is synchronous
      this.classifyButton.click()
    ]);
  }

  // Get output innerHTML (to check strong tag presence)
  async getOutputInnerHTML() {
    return await this.page.$eval('#output', el => el.innerHTML);
  }

  // Get output text content (stripped of HTML)
  async getOutputText() {
    return await this.output.textContent();
  }

  // Get canvas data URL snapshot to compare visual changes
  async getCanvasDataURL() {
    return await this.page.$eval('#canvas', (c) => {
      // If canvas exists, return a data URL capturing its pixels
      try {
        return c.toDataURL();
      } catch (e) {
        // If anything goes wrong, return a distinctive string so tests can assert on it
        return `CANVAS_ERROR:${e && e.message}`;
      }
    });
  }

  // Get canvas dimensions
  async getCanvasSize() {
    return await this.page.$eval('#canvas', (c) => ({ width: c.width, height: c.height }));
  }
}

test.describe('K-Nearest Neighbors (KNN) Demonstration - UI and behavior tests', () => {
  // Collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages of type 'error'
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore any unexpected inspection errors
      }
    });

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err && err.message ? String(err.message) : String(err));
    });
  });

  test('Initial page load shows expected elements and default state', async ({ page }) => {
    // Purpose: Verify the page loads and default UI elements are present with expected defaults.
    const knn = new KNNPage(page);
    await knn.goto();

    // Check page title and header
    await expect(page).toHaveTitle(/K-Nearest Neighbors/i);
    const header = await page.locator('h1').textContent();
    expect(header).toContain('K-Nearest Neighbors');

    // Verify the K input exists and has the default value '3' as defined in the HTML
    const kVal = await knn.getKInputValue();
    expect(kVal).toBe('3');

    // The classify button must be visible and enabled
    await expect(knn.classifyButton).toBeVisible();
    await expect(knn.classifyButton).toBeEnabled();

    // Canvas should be visible and have expected dimensions
    await expect(knn.canvas).toBeVisible();
    const size = await knn.getCanvasSize();
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(size.width).toBe(500);
    expect(size.height).toBe(400);

    // Output area should initially be empty
    const outputText = await knn.getOutputText();
    // Trim to be safe
    expect((outputText || '').trim()).toBe('');

    // Ensure there were no console error messages or uncaught page errors on initial load
    expect(consoleErrors, 'Expected no console errors on initial load').toEqual([]);
    expect(pageErrors, 'Expected no uncaught page errors on initial load').toEqual([]);
  });

  test('Clicking "Classify New Point" with default K=3 updates output and canvas visually', async ({ page }) => {
    // Purpose: Validate that clicking the classify button performs classification,
    // updates the output HTML including a <strong> element, and changes the canvas drawing.
    const knn = new KNNPage(page);
    await knn.goto();

    // Snapshot the canvas before classification
    const before = await knn.getCanvasDataURL();
    expect(before).toMatch(/^data:image\/png;base64,/);

    // Click the classify button
    await knn.clickClassify();

    // The output innerHTML should include the classification with a <strong> tag.
    const innerHTML = await knn.getOutputInnerHTML();
    expect(innerHTML).toMatch(/New point classified as:/);
    // For the provided dataset and default K=3, the classification should be class 'A'
    expect(innerHTML).toContain('<strong>A</strong>');

    // Verify the visible text also reflects the new classification
    const text = (await knn.getOutputText()) || '';
    expect(text).toContain('New point classified as:');
    expect(text).toContain('A');

    // Snapshot the canvas after classification and ensure it changed (green point + lines drawn)
    const after = await knn.getCanvasDataURL();
    expect(after).toMatch(/^data:image\/png;base64,/);
    expect(after).not.toBe(before);

    // No console errors or uncaught page errors during interaction
    expect(consoleErrors, 'No console errors should have been emitted during classification').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should have occurred during classification').toEqual([]);
  });

  test('Changing K to 1 classifies based on the single nearest neighbor and changes the canvas', async ({ page }) => {
    // Purpose: Changing the K input and running classification should respect the new K.
    const knn = new KNNPage(page);
    await knn.goto();

    // Set K to 1 (only nearest neighbor)
    await knn.setKInputValue(1);
    const kVal = await knn.getKInputValue();
    expect(kVal).toBe('1');

    // Snapshot canvas then classify
    const before = await knn.getCanvasDataURL();
    await knn.clickClassify();

    // Expected classification for K=1 is class 'A' in this dataset
    const innerHTML = await knn.getOutputInnerHTML();
    expect(innerHTML).toContain('<strong>A</strong>');

    // Canvas should have changed after classification
    const after = await knn.getCanvasDataURL();
    expect(after).toMatch(/^data:image\/png;base64,/);
    expect(after).not.toBe(before);

    // No console or page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Edge case: setting K to 0 (below min) results in undefined classification (application behavior)', async ({ page }) => {
    // Purpose: Test how the app behaves when K is set to 0; the code does not guard against this,
    // so classification is expected to show "undefined" (observed behavior).
    const knn = new KNNPage(page);
    await knn.goto();

    // Force K to 0 even though the input min=1; we simulate a user typing 0
    await knn.setKInputValue(0);
    const kVal = await knn.getKInputValue();
    expect(kVal).toBe('0');

    // Classify
    await knn.clickClassify();

    // The application uses parseInt and then slices with k; k=0 yields no neighbors -> maxClass remains undefined
    const innerHTML = await knn.getOutputInnerHTML();
    expect(innerHTML).toContain('New point classified as:');
    // Because no neighbors, the maxClass variable is undefined and will be shown as the string 'undefined' in the output
    expect(innerHTML).toContain('<strong>undefined</strong>');

    // Ensure drawing still happens for the new point; canvas should change (green dot drawn even without neighbors)
    const snapshot = await knn.getCanvasDataURL();
    expect(snapshot).toMatch(/^data:image\/png;base64,/);

    // No uncaught exceptions should be thrown — this is graceful failure in UI logic, not a runtime error
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Edge case: non-numeric K (e.g., "abc") results in undefined classification (application behavior)', async ({ page }) => {
    // Purpose: Validate behavior when K input contains a non-numeric string. parseInt('abc') yields NaN,
    // which ends up producing similar behavior to k=0 (slice becomes empty) in this implementation.
    const knn = new KNNPage(page);
    await knn.goto();

    // Fill non-numeric value into the input
    await knn.setKInputValue('abc');
    const kVal = await knn.getKInputValue();
    // The input control may reflect what we filled ('abc') even though it's type=number in HTML
    expect(kVal).toBe('abc');

    // Classify
    await knn.clickClassify();

    // Expect 'undefined' displayed because parseInt yields NaN -> slice(0, NaN) -> equivalent to slice(0,0)
    const innerHTML = await knn.getOutputInnerHTML();
    expect(innerHTML).toContain('<strong>undefined</strong>');

    // Check no uncaught runtime errors happened
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Accessibility and basic interaction: K input is reachable and button triggers classification via keyboard', async ({ page }) => {
    // Purpose: Ensure basic keyboard accessibility: focus the input, change its value, tab to button and press Enter.
    const knn = new KNNPage(page);
    await knn.goto();

    // Focus K input and change value via keyboard typing
    await knn.kInput.focus();
    await page.keyboard.fill('2'); // simulate typing '2' into focused numeric input
    // Confirm value changed
    const kVal = await knn.getKInputValue();
    expect(kVal).toBe('2');

    // Tab to move to the button and press Enter to activate (keyboard activation)
    await page.keyboard.press('Tab');
    // Press Enter to click the focused element (should be the button)
    await page.keyboard.press('Enter');

    // After activation, output should update
    const innerHTML = await knn.getOutputInnerHTML();
    expect(innerHTML).toMatch(/New point classified as:/);
    // For K=2, expected nearest neighbors are both class A -> classification A
    expect(innerHTML).toContain('<strong>A</strong>');

    // Ensure no runtime errors occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});