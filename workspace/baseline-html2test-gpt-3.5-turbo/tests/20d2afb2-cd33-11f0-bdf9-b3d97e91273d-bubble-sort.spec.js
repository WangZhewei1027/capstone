import { test, expect } from '@playwright/test';

// Page object for the Bubble Sort visualization page
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.sortBtn = page.locator('#sortBtn');
    this.speedRange = page.locator('#speedRange');
    this.container = page.locator('#container');
    this.bars = page.locator('#container .bar');
    this.codeBlock = page.locator('#codeBlock');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb2-cd33-11f0-bdf9-b3d97e91273d.html', { waitUntil: 'domcontentloaded' });
  }

  // Get the current value of the array input field
  async getInputValue() {
    return await this.input.inputValue();
  }

  // Set the value of the array input field
  async setInputValue(value) {
    await this.input.fill(value);
  }

  // Click the start sort button
  async clickStart() {
    await this.sortBtn.click();
  }

  // Set the speedRange value (works by evaluating in page context)
  async setSpeed(value) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('speedRange');
      if (el) el.value = v;
      // Also dispatch an input event to mimic user interaction if needed
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  // Return an array of bar text contents (numbers as strings)
  async getBarTexts() {
    return await this.bars.evaluateAll((nodes) => nodes.map(n => n.textContent.trim()));
  }

  // Return an array of bar heights (as px strings)
  async getBarHeights() {
    return await this.bars.evaluateAll((nodes) => nodes.map(n => getComputedStyle(n).height));
  }

  // Return classes for each bar (array of className strings)
  async getBarClassNames() {
    return await this.bars.evaluateAll((nodes) => nodes.map(n => n.className));
  }

  // Return background-color style values for each bar
  async getBarBackgroundColors() {
    return await this.bars.evaluateAll((nodes) => nodes.map(n => getComputedStyle(n).backgroundColor));
  }

  // Wait until the sort button becomes enabled (used to detect sort completion)
  async waitForSortComplete(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const btn = document.getElementById('sortBtn');
      return btn && !btn.disabled;
    }, { timeout });
  }

  // Wait until at least one bar has the provided class (comparing or swapping)
  async waitForBarClass(className, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const classes = await this.getBarClassNames();
      if (classes.some(c => c.includes(className))) return true;
      await this.page.waitForTimeout(50);
    }
    return false;
  }
}

// Keep console errors and page errors per test
test.describe('Bubble Sort Visualization - Comprehensive E2E tests', () => {
  let consoleErrors = [];
  let consoleWarnings = [];
  let pageErrors = [];

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];
    pageErrors = [];

    // Capture console messages and page errors for assertions later
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      } else {
        // keep other logs if needed (not asserted by default)
      }
    });

    page.on('pageerror', (err) => {
      // record the page error message
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    const app = new BubbleSortPage(page);
    await app.goto();
  });

  // afterEach assert that there were no runtime errors logged to console or pageerror
  test.afterEach(async () => {
    // Assert there were no uncaught runtime errors
    expect(pageErrors, `page errors should be empty, found: ${JSON.stringify(pageErrors)}`).toEqual([]);
    // Assert there were no console.error messages
    expect(consoleErrors, `console.error messages should be empty, found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    // We allow warnings but surface them if you want to inspect
  });

  // Test initial load and default state
  test('Initial page load populates bars from default input and UI elements are visible', async ({ page }) => {
    const app1 = new BubbleSortPage(page);

    // The input should contain the default array
    const inputVal = await app.getInputValue();
    expect(inputVal).toBe('5,3,8,4,2');

    // The code block with pseudocode should be visible
    await expect(app.codeBlock).toBeVisible();
    const codeText = await app.codeBlock.textContent();
    expect(codeText).toContain('function bubbleSort');

    // There should be 5 bars representing the 5 numbers
    const barTexts = await app.getBarTexts();
    expect(barTexts.length).toBe(5);
    expect(barTexts).toEqual(['5', '3', '8', '4', '2']);

    // Bars should have heights in px and larger values should generally have larger heights
    const heights = await app.getBarHeights();
    expect(heights.every(h => typeof h === 'string' && h.endsWith('px'))).toBeTruthy();

    // Verify that the sort button is visible and enabled by default
    await expect(app.sortBtn).toBeVisible();
    await expect(app.sortBtn).toBeEnabled();

    // The speedRange should be visible and have a default value
    const speedVal = await app.speedRange.inputValue();
    expect(Number(speedVal)).toBeGreaterThanOrEqual(50);
    expect(Number(speedVal)).toBeLessThanOrEqual(1000);
  });

  // Test that sorting works end-to-end and updates DOM as expected
  test('Starting bubble sort disables inputs, performs sorting, and results in sorted bars', async ({ page }) => {
    const app2 = new BubbleSortPage(page);

    // Set speed to a small value to make the animation fast for the test
    await app.setSpeed(10);

    // Ensure controls are enabled before starting
    await expect(app.sortBtn).toBeEnabled();
    await expect(app.input).toBeEnabled();
    await expect(app.speedRange).toBeEnabled();

    // Click start - this should disable controls while sorting runs
    await app.clickStart();

    // Immediately after clicking, controls should be disabled
    await expect(app.sortBtn).toBeDisabled();
    // input and speedRange should also be disabled
    // We check by evaluating the disabled property
    const inputDisabled = await page.$eval('#arrayInput', el => el.disabled === true);
    expect(inputDisabled).toBeTruthy();
    const speedDisabled = await page.$eval('#speedRange', el => el.disabled === true);
    expect(speedDisabled).toBeTruthy();

    // Wait for sorting to complete (sort button becomes enabled)
    await app.waitForSortComplete(10000);

    // After completion, controls should be re-enabled
    await expect(app.sortBtn).toBeEnabled();
    await expect(app.input).toBeEnabled();
    await expect(app.speedRange).toBeEnabled();

    // Verify final bar texts are sorted ascending
    const finalBarTexts = await app.getBarTexts();
    // Convert to numbers for sorting verification
    const finalNums = finalBarTexts.map(x => Number(x));
    const sorted = [...finalNums].sort((a, b) => a - b);
    expect(finalNums).toEqual(sorted);

    // Verify that the bars have green background color on sorted bars (at least one should be green)
    const bgColors = await app.getBarBackgroundColors();
    // The style uses rgb values; check for green-ish background (#34a853 -> rgb(52,168,83))
    const hasGreen = bgColors.some(c => c.includes('52') && c.includes('168') && c.includes('83'));
    expect(hasGreen).toBeTruthy();
  });

  // Test that invalid input triggers an alert dialog and does not start sorting
  test('Invalid input triggers alert dialog and prevents sorting', async ({ page }) => {
    const app3 = new BubbleSortPage(page);

    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Set invalid input (non-numeric)
    await app.setInputValue('a,b,c');

    // Click start - should trigger alert and leave controls enabled (no sort)
    await app.clickStart();

    // Wait a short time to ensure dialog handler has run
    await page.waitForTimeout(200);

    // Assert dialog was shown with expected message
    expect(dialogMessage).toBe('Please enter a valid comma-separated list of integers.');

    // Ensure sort button remains enabled since no sorting should have started
    await expect(app.sortBtn).toBeEnabled();

    // Ensure bars remain reflecting the previous valid state (initial default or previous)
    const barTexts1 = await app.getBarTexts();
    // Since parseInput returns null for invalid input, the app should not have recreated bars,
    // so the previous bars remain - ensure they are still numeric strings
    expect(barTexts.every(t => /^\d+$/.test(t))).toBeTruthy();
  });

  // Test that the UI indicates comparisons/swaps during sorting (class toggling)
  test('During sorting bars receive comparing and swapping classes', async ({ page }) => {
    const app4 = new BubbleSortPage(page);

    // Set a slower speed so we can observe the classes
    await app.setSpeed(300);

    // Start sorting
    const sortPromise = (async () => {
      await app.clickStart();
      // Wait for sort to complete
      await app.waitForSortComplete(15000);
    })();

    // Shortly after starting, wait until a bar has 'comparing' or 'swapping' class
    const sawComparingOrSwapping = await app.waitForBarClass('comparing', 3000) || await app.waitForBarClass('swapping', 3000);

    // Ensure we observed at least one of those transient classes during the animation
    expect(sawComparingOrSwapping).toBeTruthy();

    // Wait for the sorting process to clean up and finish
    await sortPromise;

    // At the end, there should be no bars with 'comparing' or 'swapping' classes
    const finalClasses = await app.getBarClassNames();
    const anyTransient = finalClasses.some(c => c.includes('comparing') || c.includes('swapping'));
    expect(anyTransient).toBeFalsy();
  });

  // Test accessibility and ARIA attributes presence
  test('Accessibility: container has aria-live and labels are present', async ({ page }) => {
    const app5 = new BubbleSortPage(page);

    // Verify visualization container has aria-live and aria-label present
    const hasAriaLive = await page.$eval('#container', el => el.getAttribute('aria-live'));
    expect(hasAriaLive).toBe('polite');

    const containerLabel = await page.$eval('#container', el => el.getAttribute('aria-label'));
    expect(containerLabel).toContain('Visualization of array bars');

    // Input has aria-label attribute
    const inputAria = await page.$eval('#arrayInput', el => el.getAttribute('aria-label'));
    expect(inputAria).toBe('Array input');

    // Code block has aria-label as well
    const codeAria = await page.$eval('#codeBlock', el => el.getAttribute('aria-label'));
    expect(codeAria).toContain('Bubble sort code example');
  });

  // Test speed control changes reflect in the input value
  test('Speed range control updates its value and is disabled during sorting', async ({ page }) => {
    const app6 = new BubbleSortPage(page);

    // Set speed to a new value and verify
    await app.setSpeed(150);
    const speedValAfter = await app.speedRange.inputValue();
    expect(Number(speedValAfter)).toBe(150);

    // Start sorting and ensure the speedRange is disabled while sorting runs
    const sortPromise1 = (async () => {
      await app.clickStart();
      await app.waitForSortComplete(10000);
    })();

    // After click, speedRange should be disabled
    const speedDisabled1 = await page.$eval('#speedRange', el => el.disabled === true);
    expect(speedDisabled).toBeTruthy();

    // Wait for completion
    await sortPromise;

    // After completion, speedRange should be enabled again
    const speedDisabledAfter = await page.$eval('#speedRange', el => el.disabled === false);
    expect(speedDisabledAfter).toBeTruthy();
  });
});