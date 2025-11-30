import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6cf-cd33-11f0-bdf9-b3d97e91273d.html';

// Page object encapsulating interactions with the Sliding Window app
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.windowSizeInput = page.locator('#windowSize');
    this.startBtn = page.locator('#startBtn');
    this.speedInput = page.locator('#speed');
    this.speedLabel = page.locator('#speedLabel');
    this.arrayVisual = page.locator('#arrayVisual');
    this.stepsDiv = page.locator('#steps');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the app is loaded
    await expect(this.page).toHaveTitle(/Sliding Window Visualizer/i);
  }

  async setArray(value) {
    await this.arrayInput.fill(value);
  }

  async setWindowSize(value) {
    await this.windowSizeInput.fill(String(value));
  }

  async setSpeed(value) {
    // move slider by setting value attribute
    await this.speedInput.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, value);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async getArrayItems() {
    return this.arrayVisual.locator('.array-item');
  }

  async getStepsText() {
    return this.stepsDiv.innerText();
  }

  async waitForStepText(text, options = {}) {
    // wait for a paragraph inside #steps to contain the text
    const locator = this.stepsDiv.locator('p', { hasText: text });
    await locator.waitFor({ timeout: options.timeout ?? 5000 });
  }

  async isStartDisabled() {
    return this.startBtn.isDisabled();
  }
}

test.describe('Sliding Window Maximum Visualizer - 20d2d6cf-cd33-11f0-bdf9-b3d97e91273d', () => {
  // Capture console messages and page errors for each test to assert no unexpected runtime errors occur.
  test.beforeEach(async ({ page }) => {
    // Ensure a clean listener set for each test by attaching new arrays on the page object
    page.__consoleMessages = [];
    page.__pageErrors = [];

    page.on('console', msg => {
      page.__consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      page.__pageErrors.push(err);
    });
  });

  // Helper to assert that no console errors or page errors occurred
  async function assertNoRuntimeErrors(page) {
    const errors = page.__pageErrors || [];
    const consoleErrors = (page.__consoleMessages || []).filter(m => m.type === 'error' || m.type === 'warning');
    // Assert there were no page-level errors (exceptions)
    expect(errors, `Expected no page errors but found: ${JSON.stringify(errors)}`).toHaveLength(0);
    // Assert there were no console error/warning messages
    expect(consoleErrors, `Expected no console error/warning messages but found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
  }

  test('Initial load: elements present and default state is correct', async ({ page }) => {
    // Test purpose: verify page loads, all interactive controls are present and default values are correct.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Inputs and controls exist
    await expect(app.arrayInput).toBeVisible();
    await expect(app.windowSizeInput).toBeVisible();
    await expect(app.startBtn).toBeVisible();
    await expect(app.speedInput).toBeVisible();
    await expect(app.speedLabel).toBeVisible();

    // Default speed label matches input value (800 ms from HTML)
    await expect(app.speedLabel).toHaveText(/800 ms/);

    // Visual containers empty initially
    await expect(app.arrayVisual).toBeEmpty();
    await expect(app.stepsDiv).toBeEmpty();

    // Start button should be enabled by default
    await expect(app.startBtn).toBeEnabled();

    // No runtime errors on initial load
    await assertNoRuntimeErrors(page);
  });

  test.describe('Form validation and error dialogs', () => {
    test('Clicking Start with empty array shows alert about entering an array', async ({ page }) => {
      // Test purpose: ensure alert is shown when array input is empty
      const app1 = new SlidingWindowPage(page);
      await app.goto();

      // Listen for dialog and capture message
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      // Ensure inputs clear
      await app.setArray('');
      await app.setWindowSize('3');
      await app.clickStart();

      expect(dialogMessage).toBe('Please enter an array.');

      // Ensure nothing mutated in DOM (still empty visual & steps)
      await expect(app.arrayVisual).toBeEmpty();
      await expect(app.stepsDiv).toBeEmpty();

      // No runtime errors
      await assertNoRuntimeErrors(page);
    });

    test('Clicking Start with invalid window size triggers validation alert', async ({ page }) => {
      // Test purpose: ensure invalid or missing window size is handled with an alert
      const app2 = new SlidingWindowPage(page);
      await app.goto();

      let dialogMessage1 = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await app.setArray('1,2,3');
      await app.setWindowSize('0'); // invalid (k < 1)
      await app.clickStart();

      expect(dialogMessage).toBe('Please enter a valid window size >= 1.');

      // No visualization should have started
      await expect(app.arrayVisual).toBeEmpty();
      await expect(app.stepsDiv).toBeEmpty();

      await assertNoRuntimeErrors(page);
    });

    test('Clicking Start with non-numeric array elements shows alert', async ({ page }) => {
      // Test purpose: ensure invalid numbers in the array are detected and alerted
      const app3 = new SlidingWindowPage(page);
      await app.goto();

      let dialogMessage2 = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await app.setArray('1, a, 3');
      await app.setWindowSize('2');
      await app.clickStart();

      expect(dialogMessage).toBe('Array contains invalid numbers.');

      // No visualization should have started
      await expect(app.arrayVisual).toBeEmpty();
      await expect(app.stepsDiv).toBeEmpty();

      await assertNoRuntimeErrors(page);
    });

    test('Clicking Start with window size larger than array shows alert', async ({ page }) => {
      // Test purpose: ensure k > arr.length is caught and alerted before visualization begins
      const app4 = new SlidingWindowPage(page);
      await app.goto();

      let dialogMessage3 = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await app.setArray('5,6,7');
      await app.setWindowSize('5'); // k > length
      await app.clickStart();

      expect(dialogMessage).toBe('Window size cannot be larger than the array length.');

      // No steps or visuals should be present
      await expect(app.arrayVisual).toBeEmpty();
      await expect(app.stepsDiv).toBeEmpty();

      await assertNoRuntimeErrors(page);
    });
  });

  test.describe('Visualization behavior and DOM updates', () => {
    test('Speed slider updates label when changed', async ({ page }) => {
      // Test purpose: verify that adjusting the speed slider updates the UI label
      const app5 = new SlidingWindowPage(page);
      await app.goto();

      // Set speed to minimum and check label updates
      await app.setSpeed('100');
      await expect(app.speedLabel).toHaveText(/100 ms/);

      // Set speed to 1500 and check label updates
      await app.setSpeed('1500');
      await expect(app.speedLabel).toHaveText(/1500 ms/);

      await assertNoRuntimeErrors(page);
    });

    test('Runs visualization for a small array and updates DOM accordingly', async ({ page }) => {
      // Test purpose: run a short visualization and assert expected DOM changes, steps, and button state
      const app6 = new SlidingWindowPage(page);
      await app.goto();

      // Make visualization fast for test
      await app.setSpeed('100');

      // Prepare a small array: [2,1,3], window k=2.
      // Expected windows:
      // [0..1] -> max 2 at index 0
      // [1..2] -> max 3 at index 2
      await app.setArray('2,1,3');
      await app.setWindowSize('2');

      // Intercept dialogs just in case (should not appear)
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

      // Start visualization. Immediately after clicking, the start button should become disabled.
      await app.clickStart();
      await expect(app.startBtn).toBeDisabled();

      // Wait for the visualization completion log text ("Sliding window maximum completed.") to appear
      await app.waitForStepText('Sliding window maximum completed.', { timeout: 10000 });

      // After completion, start button should be enabled again
      await expect(app.startBtn).toBeEnabled();

      // Steps should contain starting message and at least one window max message
      const stepsText = await app.getStepsText();
      expect(stepsText).toMatch(/Starting sliding window maximum with window size k=2/);
      expect(stepsText).toMatch(/Window \[0\.\.1\] max is value 2 at index 0/);
      expect(stepsText).toMatch(/Window \[1\.\.2\] max is value 3 at index 2/);
      expect(stepsText).toMatch(/Sliding window maximum completed/);

      // Visual array items should match the input numbers and the last window [1..2] should be highlighted
      const items = app.arrayVisual.locator('.array-item');
      await expect(items).toHaveCount(3);

      // Check text content of items in order
      const texts = [];
      for (let i = 0; i < 3; i++) {
        texts.push(await items.nth(i).innerText());
      }
      expect(texts).toEqual(['2', '1', '3']);

      // The final window should highlight indices 1 and 2 with .window class
      await expect(items.nth(0)).not.toHaveClass(/window/);
      await expect(items.nth(1)).toHaveClass(/window/);
      await expect(items.nth(2)).toHaveClass(/window/);

      // The current max for the final window should be index 2 (value 3) and thus have .current-max
      await expect(items.nth(2)).toHaveClass(/current-max/);

      // Ensure there were no runtime page errors or console error messages during the visualization
      await assertNoRuntimeErrors(page);
    });

    test('Deque visualization: rendering shows dashed border for indices in deque during run', async ({ page }) => {
      // Test purpose: while the visualization runs, elements that are part of the deque should have dashed borders
      // We'll run a short visualization and periodically sample the DOM to assert that at least once a dashed border appears.
      const app7 = new SlidingWindowPage(page);
      await app.goto();

      // Speed up visualization
      await app.setSpeed('100');

      // Input array that causes deque operations: [1,3,2,5], k=2
      await app.setArray('1,3,2,5');
      await app.setWindowSize('2');

      // Start visualization
      await app.clickStart();

      // Poll for a short time to find any element that has inline style borderStyle set to dashed.
      // This indicates the deque visualization applied (the code sets style.borderStyle = 'dashed' when deque includes index).
      const maxPoll = 20;
      let dashedFound = false;
      for (let i = 0; i < maxPoll; i++) {
        const count = await app.arrayVisual.locator('.array-item').count();
        for (let j = 0; j < count; j++) {
          const borderStyle = await app.arrayVisual.locator('.array-item').nth(j).evaluate(el => window.getComputedStyle(el).borderStyle);
          if (borderStyle === 'dashed') {
            dashedFound = true;
            break;
          }
        }
        if (dashedFound) break;
        // short wait before next poll
        await page.waitForTimeout(100);
      }

      // Wait for completion to avoid leaving the app running
      await app.waitForStepText('Sliding window maximum completed.', { timeout: 10000 });

      // Assert we observed dashed border styling at least once during the run
      expect(dashedFound).toBe(true);

      await assertNoRuntimeErrors(page);
    });
  });
});