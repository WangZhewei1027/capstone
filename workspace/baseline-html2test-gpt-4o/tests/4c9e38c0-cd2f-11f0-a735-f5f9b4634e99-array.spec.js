import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e38c0-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object Model for the Array Demo page
class ArrayDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#arrayContent');
    this.button = page.locator('button', { hasText: 'Show Array Manipulation' });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickShow() {
    await this.button.click();
  }

  async getContentText() {
    const text = await this.container.textContent();
    // Normalize whitespace for stable assertions
    return text ? text.replace(/\s+/g, ' ').trim() : '';
  }

  async getContentHTML() {
    return await this.container.evaluate((el) => el.innerHTML);
  }

  async isContainerVisible() {
    return await this.container.isVisible();
  }

  async getButtonText() {
    return await this.button.textContent();
  }

  async getContainerBackgroundColor() {
    // Return computed background-color as rgb(...) or equivalent
    return await this.container.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
  }
}

test.describe('JavaScript Arrays Demo - UI and Behavior', () => {
  // Arrays to collect console messages and page errors for inspection
  let consoleMessages = [];
  let pageErrors = [];

  // Setup: navigate to the page and attach listeners to capture console and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', (msg) => {
      // Save all console messages for later assertions
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture unhandled exceptions (pageerror)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application exactly as-is
    await page.goto(APP_URL);
  });

  // Basic sanity: initial load and default state
  test('Initial page load shows expected default state', async ({ page }) => {
    const app = new ArrayDemoPage(page);

    // Ensure we are on the expected URL
    await expect(page).toHaveURL(APP_URL);

    // The container should exist and be empty on initial load
    await expect(app.container).toBeVisible();
    const initialText = await app.getContentText();
    // The demo leaves the container empty until the button is clicked
    expect(initialText).toBe('', 'Expected #arrayContent to be empty on initial load');

    // The button should be visible and have the expected label
    await expect(app.button).toBeVisible();
    const btnText = await app.getButtonText();
    expect(btnText).toContain('Show Array Manipulation');

    // Check that the container has the expected background color style (from inline CSS)
    const bgColor = await app.getContainerBackgroundColor();
    // #f0f0f0 corresponds to rgb(240, 240, 240); allow either hex or rgb depending on browser normalization
    expect(
      bgColor === 'rgb(240, 240, 240)' || bgColor === 'rgba(240, 240, 240, 1)' || bgColor === '#f0f0f0'
    ).toBeTruthy();
  });

  // Test the main interactive flow: click and verify DOM updates and content details
  test('Clicking "Show Array Manipulation" updates DOM with expected array steps', async ({ page }) => {
    const app = new ArrayDemoPage(page);

    // Click the button to run manipulateArray()
    await app.clickShow();

    // After clicking, the container should show the assembled HTML content
    await expect(app.container).toBeVisible();

    const contentText = await app.getContentText();

    // Verify that each stage of the array manipulation is present and in the expected order
    // We assert on key substrings rather than exact HTML to be resilient to formatting differences
    expect(contentText).toContain('Initial Array: Apple, Banana, Mango, Orange');
    expect(contentText).toContain("After Adding 'Grapes': Apple, Banana, Mango, Orange, Grapes");
    expect(contentText).toContain('After Removing First Element: Banana, Mango, Orange, Grapes');
    expect(contentText).toContain('After Sorting: Banana, Grapes, Mango, Orange');
    expect(contentText).toContain('After Reversing: Orange, Mango, Grapes, Banana');

    // Ensure the final order is exactly as expected when read as a contiguous substring
    expect(contentText.endsWith('After Reversing: Orange, Mango, Grapes, Banana')).toBeTruthy();
  });

  // Test idempotency: clicking multiple times should produce consistent output each time
  test('Multiple clicks produce consistent results and update content deterministically', async ({ page }) => {
    const app = new ArrayDemoPage(page);

    // First click
    await app.clickShow();
    const firstHTML = await app.getContentHTML();
    const firstText = await app.getContentText();

    // Second click - should recompute and set the same output
    await app.clickShow();
    const secondHTML = await app.getContentHTML();
    const secondText = await app.getContentText();

    // The HTML and text should match across clicks
    expect(secondText).toBe(firstText);
    expect(secondHTML).toBe(firstHTML);
  });

  // Edge case and accessibility checks
  test('Button is focusable and keyboard-activatable; content remains accessible', async ({ page }) => {
    const app = new ArrayDemoPage(page);

    // Focus the button via keyboard and press Enter
    await app.button.focus();
    await page.keyboard.press('Enter');

    // Content should update after keyboard activation
    await expect(app.container).toContainText('Initial Array: Apple, Banana, Mango, Orange');

    // Tab to the button and press Space as another activation method
    await page.keyboard.press('Tab');
    // The previously focused element may change; ensure we can still find the button and activate via Space
    await app.button.focus();
    await page.keyboard.press('Space');

    // Verify content still contains expected markers
    await expect(app.container).toContainText('After Reversing: Orange, Mango, Grapes, Banana');
  });

  // Observe console and page errors: assert that no errors occurred during load and interactions
  test('No unexpected console errors or uncaught exceptions occurred during use', async ({ page }) => {
    const app = new ArrayDemoPage(page);

    // Interact with the page to potentially surface runtime errors
    await app.button.click();

    // Small wait to let any async errors surface (though this app is synchronous)
    await page.waitForTimeout(100);

    // Assert that we did not capture any page errors (unhandled exceptions)
    expect(pageErrors.length).toBe(0);

    // Filter console messages for error-level messages
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    // Expect zero console.error calls during load and interaction
    expect(errorConsoleMessages.length).toBe(
      0,
      `Expected no console.error messages, but found: ${JSON.stringify(errorConsoleMessages)}`
    );

    // Optionally assert no console messages of type 'warning' either (not strictly required)
    const warningConsoleMessages = consoleMessages.filter((m) => m.type === 'warning');
    expect(warningConsoleMessages.length).toBeLessThan(5); // allow warnings but not excessive; adjust as needed
  });

  // Clean up: afterEach hook can be used for additional checks or logging if desired
  test.afterEach(async ({ page }) => {
    // If any pageErrors occurred, attach them to the test output for debugging (Playwright will surface thrown errors)
    if (pageErrors.length > 0) {
      // Throw to make the test fail and surface the errors
      throw new Error(`Page errors were detected: ${pageErrors.map(e => e.message).join('; ')}`);
    }
  });
});