import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f505-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the Binary Search page to encapsulate interactions
class SearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numInput = page.locator('#num');
    this.startButton = page.locator('#start');
    this.resetButton = page.locator('#reset');
    this.result = page.locator('#result');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Enter a number into the input
  async enterNumber(value) {
    await this.numInput.fill(String(value));
  }

  // Click the Start button
  async clickStart() {
    await this.startButton.click();
  }

  // Click the Reset button
  async clickReset() {
    await this.resetButton.click();
  }

  // Get the visible text content of the result element
  async getResultText() {
    return (await this.result.textContent())?.trim() ?? '';
  }

  // Get the inline color style of the result element
  async getResultColor() {
    return this.result.evaluate((el) => (el.style && el.style.color) ? el.style.color : window.getComputedStyle(el).color);
  }

  // Check if a control is visible (Playwright's visibility check)
  async isStartVisible() {
    return this.startButton.isVisible();
  }

  async isResetVisible() {
    return this.resetButton.isVisible();
  }
}

test.describe('Binary Search App (90f6f505-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];
  let consoleHandler;
  let pageErrorHandler;

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    consoleHandler = (msg) => {
      try {
        // Collect text for all console messages
        consoleMessages.push(msg.text());
      } catch (e) {
        // ignore any unusual console message parsing errors
      }
    };
    page.on('console', consoleHandler);

    // Capture uncaught page errors
    pageErrorHandler = (err) => {
      pageErrors.push(err);
    };
    page.on('pageerror', pageErrorHandler);

    // Navigate to the application page exactly as-is
    await page.goto(APP_URL);
  });

  // Remove listeners after each test to avoid cross-test pollution
  test.afterEach(async ({ page }) => {
    try {
      page.off('console', consoleHandler);
      page.off('pageerror', pageErrorHandler);
    } catch (e) {
      // silently ignore teardown errors
    }
  });

  test('Initial page load: controls are present and result is empty', async ({ page }) => {
    // Purpose: Verify the initial DOM structure and default visibility/state of controls
    const app = new SearchPage(page);

    // Ensure the input and buttons exist
    await expect(app.numInput).toBeVisible();
    await expect(app.startButton).toBeVisible();
    await expect(app.resetButton).toBeVisible();

    // The result div should be present but initially empty
    const initialResultText = await app.getResultText();
    expect(initialResultText).toBe('', 'Expected result area to be empty on initial load');

    // Verify there are no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0, `Expected no page errors on load but found: ${pageErrors.map(e => String(e)).join(', ')}`);

    // Also verify console did not log critical errors
    const hasCriticalConsoleError = consoleMessages.some(msg => /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(msg));
    expect(hasCriticalConsoleError).toBe(false);
  });

  test('Search a number that exists (e.g., 7) shows "Found at 7" and toggles buttons', async ({ page }) => {
    // Purpose: Validate correct binary search behavior for an existing number,
    // visual feedback, and button visibility toggling after Start is clicked.
    const app1 = new SearchPage(page);

    // Enter a value we know is in the range and will be found (7)
    await app.enterNumber(7);
    await app.clickStart();

    // Wait and assert the result text and color
    await expect(app.result).toHaveText(/Found at 7/);
    const color = await app.getResultColor();
    // Inline style is set to 'green' on success; accept both 'green' and computed rgb if needed
    expect(/green|rgb\(0,\s*128,\s*0\)/i.test(color)).toBeTruthy();

    // Assert start button is hidden and reset is shown after performing search
    await expect(app.startButton).toBeHidden();
    await expect(app.resetButton).toBeVisible();

    // Ensure no uncaught exceptions occurred during this interaction
    expect(pageErrors.length).toBe(0, `Page errors were thrown during 'exists' search: ${pageErrors.map(String).join(', ')}`);

    // Ensure console doesn't contain critical errors
    const criticalConsole = consoleMessages.filter(m => /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(m));
    expect(criticalConsole.length).toBe(0);
  });

  test('Search a number that does not exist (e.g., 11) shows "Not found" and toggles buttons', async ({ page }) => {
    // Purpose: Verify search behavior when the value is outside the searchable range (should not be found)
    const app2 = new SearchPage(page);

    await app.enterNumber(11);
    await app.clickStart();

    // Expect "Not found" with red color
    await expect(app.result).toHaveText(/Not found/);
    const color1 = await app.getResultColor();
    expect(/red|rgb\(255,\s*0,\s*0\)/i.test(color)).toBeTruthy();

    // Check button visibility toggles
    await expect(app.startButton).toBeHidden();
    await expect(app.resetButton).toBeVisible();

    // No uncaught page errors expected
    expect(pageErrors.length).toBe(0, `Unexpected page errors during 'not found' search: ${pageErrors.map(String).join(', ')}`);
  });

  test('Clicking Reset performs a search for 0, shows result, and toggles buttons back', async ({ page }) => {
    // Purpose: Validate reset behavior — it sets num = 0 and runs search, then shows Start and hides Reset
    const app3 = new SearchPage(page);

    // Start by clicking start with a number to get into the toggled state
    await app.enterNumber(5);
    await app.clickStart();

    // Now click reset and validate the search for 0 happens and button state toggles
    await app.clickReset();

    // The reset handler searches for 0 and should yield "Not found" (0 is outside 1-10)
    await expect(app.result).toHaveText(/Not found/);
    const color2 = await app.getResultColor();
    expect(/red|rgb\(255,\s*0,\s*0\)/i.test(color)).toBeTruthy();

    // Start should be visible again and Reset hidden
    await expect(app.startButton).toBeVisible();
    await expect(app.resetButton).toBeHidden();

    // No uncaught errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: empty input leads to parseInt("") => NaN and app behavior', async ({ page }) => {
    // Purpose: Test the application behavior when the input is empty and Start is clicked.
    // This verifies how the app handles invalid/empty numeric input (reveals real app behavior).
    const app4 = new SearchPage(page);

    // Ensure the input is empty
    await app.enterNumber(''); // clear input
    await app.clickStart();

    // The implementation uses parseInt on an empty string which results in NaN.
    // In this specific app's search implementation, NaN leads to both comparisons false and the code path returns mid immediately.
    // We assert the observed behavior: the app reports "Found at <some mid>" and uses green color.
    const observedText = await app.getResultText();
    expect(/Found at \d+/.test(observedText)).toBe(true);

    const color3 = await app.getResultColor();
    expect(/green|rgb\(0,\s*128,\s*0\)/i.test(color)).toBeTruthy();

    // Buttons toggle as with a normal search
    await expect(app.startButton).toBeHidden();
    await expect(app.resetButton).toBeVisible();

    // Capture console and page errors — we expect none for this scenario.
    expect(pageErrors.length).toBe(0, `Unexpected page errors for empty input: ${pageErrors.map(String).join(', ')}`);
  });

  test('Accessibility and semantics: form contains expected elements and buttons have type attribute', async ({ page }) => {
    // Purpose: Basic accessibility/semantics checks to ensure interactive elements are normal
    const app5 = new SearchPage(page);

    // Verify the input has type=number
    const inputType = await app.numInput.getAttribute('type');
    expect(inputType).toBe('number');

    // Verify buttons have type="button" (so they don't submit a form and reload page)
    const startType = await app.startButton.getAttribute('type');
    const resetType = await app.resetButton.getAttribute('type');
    expect(startType).toBe('button');
    expect(resetType).toBe('button');

    // No unexpected page errors
    expect(pageErrors.length).toBe(0);
  });
});