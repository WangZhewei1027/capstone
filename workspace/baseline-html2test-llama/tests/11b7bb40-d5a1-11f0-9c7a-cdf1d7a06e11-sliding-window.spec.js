import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb40-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object for the Sliding Window application
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.start = page.locator('#start');
    this.end = page.locator('#end');
    this.window = page.locator('#window');
    this.windowElements = page.locator('#window .window-element');
  }

  // Navigate to the application page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Set the start input value
  async setStart(value) {
    await this.start.fill(String(value));
    // blur so the value is applied
    await this.start.evaluate((el) => el.blur());
  }

  // Set the end input value
  async setEnd(value) {
    await this.end.fill(String(value));
    await this.end.evaluate((el) => el.blur());
  }

  // Programmatically dispatch an input event on the #window element to trigger the listener
  async triggerWindowInput() {
    await this.page.dispatchEvent('#window', 'input');
  }

  // Return count of .window-element children currently in the #window div
  async countWindowElements() {
    return await this.windowElements.count();
  }

  // Get inline style.left and style.top for the element at index i
  async getWindowElementStylesAt(index) {
    const handle = await this.windowElements.nth(index).evaluateHandle(el => el);
    const styles = await this.page.evaluate((el) => {
      return {
        left: el.style.left,
        top: el.style.top,
      };
    }, handle);
    await handle.dispose();
    return styles;
  }

  // Get raw innerHTML of window (useful for debugging)
  async getWindowInnerHTML() {
    return await this.window.evaluate((el) => el.innerHTML);
  }
}

test.describe('Sliding Window - 11b7bb40-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // Capture console messages and page errors for each test
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect runtime page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async ({ page }) => {
    // close page handled by Playwright fixture; but keep a small check that we didn't accumulate catastrophic errors
    // This is not modifying the page or runtime, only asserting collected errors are empty for normal behavior tests below.
  });

  test('Initial load: inputs and window are present with default values and no window elements', async ({ page }) => {
    // Purpose: Verify the application loads with expected DOM elements and defaults.
    const app = new SlidingWindowPage(page);
    await app.goto();

    // Basic DOM checks
    await expect(app.start).toBeVisible();
    await expect(app.end).toBeVisible();
    await expect(app.window).toBeVisible();

    // Default input values as provided in HTML
    await expect(app.start).toHaveValue('0');
    await expect(app.end).toHaveValue('100');

    // There should be no .window-element children initially
    expect(await app.countWindowElements()).toBe(0);

    // Ensure no uncaught errors were thrown during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Dispatching input on #window with default start=0 and end=100 does not create window elements', async ({ page }) => {
    // Purpose: The script attaches an input listener to the #window div. Triggering it with defaults should not create elements.
    const app1 = new SlidingWindowPage(page);
    await app.goto();

    // Ensure initial state
    expect(await app.countWindowElements()).toBe(0);

    // Trigger the 'input' event on the #window element (the app's listener listens for this)
    await app.triggerWindowInput();

    // Give the application a small amount of time to run its interval and potentially modify the DOM
    await page.waitForTimeout(150);

    // After triggering, with start=0 the inner logic produces zero-length arrays and should end up creating zero elements
    expect(await app.countWindowElements()).toBe(0);

    // Validate that no page errors (ReferenceError, TypeError, etc.) occurred during this interaction
    expect(pageErrors.length).toBe(0);

    // Check console messages do not contain explicit 'ReferenceError' or 'TypeError' text
    const consoleText = consoleMessages.map(m => m.text).join('\n');
    expect(consoleText).not.toMatch(/ReferenceError|TypeError|SyntaxError|Uncaught/i);
  });

  test('Setting start=1 and end=5 and dispatching input creates 5 window elements with expected left positions', async ({ page }) => {
    // Purpose: With valid small start/end values, the script should create elements equal to windowEnd - windowStart + 1.
    const app2 = new SlidingWindowPage(page);
    await app.goto();

    // Set start to 1 and end to 5 to create a predictable small number of elements
    await app.setStart(1);
    await app.setEnd(5);

    // Trigger the input event on the #window element to run the interval logic
    await app.triggerWindowInput();

    // Wait a short time to allow the interval callback to run and update DOM
    await page.waitForTimeout(150);

    // The script calculates windowStart from startValueArray[0] => 1
    // windowEnd from endValueArray[endValue - 1] => 5
    // Expected number of produced elements = 5 - 1 + 1 = 5
    const count = await app.countWindowElements();
    expect(count).toBe(5);

    // Validate left positions are "0px", "10px", "20px", "30px", "40px"
    const expectedLefts = ['0px', '10px', '20px', '30px', '40px'];
    for (let i = 0; i < count; i++) {
      const styles1 = await app.getWindowElementStylesAt(i);
      expect(styles.left).toBe(expectedLefts[i]);
      // The script computes top using (current - windowStart) which, since current is derived from window.value (a div, undefined), produces "NaNpx"
      // Verify that top contains 'NaN' as a string (the code sets element.style.top to `${...}px` which will be "NaNpx")
      expect(styles.top).toMatch(/NaNpx/);
    }

    // Make sure no page errors were thrown during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: start greater than end still produces elements based on internal arrays (start=10, end=5)', async ({ page }) => {
    // Purpose: Validate how the app behaves when start > end: ensures it doesn't crash and still updates DOM deterministically.
    const app3 = new SlidingWindowPage(page);
    await app.goto();

    // Set start greater than end
    await app.setStart(10);
    await app.setEnd(5);

    // Trigger input to run the application's logic
    await app.triggerWindowInput();

    // Allow time for DOM updates
    await page.waitForTimeout(150);

    // The script internally computes windowStart from startValueArray[0] -> 1 (since startValueArray is built from length=startValue)
    // windowEnd from endValueArray[endValue - 1] -> 5
    // Therefore expected number of elements is 5 - 1 + 1 = 5
    const count1 = await app.countWindowElements();
    expect(count).toBe(5);

    // Validate left positions are still sequential multiples of 10
    const expectedLefts1 = ['0px', '10px', '20px', '30px', '40px'];
    for (let i = 0; i < count; i++) {
      const styles2 = await app.getWindowElementStylesAt(i);
      expect(styles.left).toBe(expectedLefts[i]);
    }

    // There should be no uncaught page errors for this edge-case interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Confirm event listener is attached to #window by verifying input event produces DOM changes', async ({ page }) => {
    // Purpose: Explicitly ensure that the input event on #window is listened to by the page script.
    const app4 = new SlidingWindowPage(page);
    await app.goto();

    // Set up a baseline (no elements)
    expect(await app.countWindowElements()).toBe(0);

    // Set a simple start/end to produce some elements
    await app.setStart(2);
    await app.setEnd(4);

    // Trigger the listener
    await app.triggerWindowInput();

    // Allow a bit of time for the interval to execute
    await page.waitForTimeout(150);

    // After the event, DOM should have been updated (non-zero number of .window-element)
    const countAfter = await app.countWindowElements();
    expect(countAfter).toBeGreaterThan(0);

    // Validate at least that the first element has a left style
    const firstStyles = await app.getWindowElementStylesAt(0);
    expect(firstStyles.left).toMatch(/\d+px/);

    // Verify there were no pageerrors emitted when the listener executed
    expect(pageErrors.length).toBe(0);
  });
});