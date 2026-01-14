import { test, expect } from '@playwright/test';

// Page object model for the Stack application
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.stack = page.locator('#stack');
    this.stackMessage = page.locator('#stackMessage');
    this.createButton = page.locator('button', { hasText: 'Create Stack' });
    this.h1 = page.locator('h1');
    // Collectors for runtime diagnostics
    this.pageErrors = [];
    this.consoleMessages = [];

    this._handlePageError = (error) => {
      // pageerror gives an Error object
      this.pageErrors.push(error);
    };
    this._handleConsole = (msg) => {
      this.consoleMessages.push(msg);
    };
  }

  // Navigate to the app and wire up listeners for console/page errors
  async goto(url) {
    this.page.on('pageerror', this._handlePageError);
    this.page.on('console', this._handleConsole);
    await this.page.goto(url, { waitUntil: 'load' });
    // Give the page a short moment to emit any parsing/runtime errors on load
    await this.page.waitForTimeout(200);
  }

  // Remove listeners - to be used in teardown to avoid cross-test leakage
  detachListeners() {
    this.page.off('pageerror', this._handlePageError);
    this.page.off('console', this._handleConsole);
  }

  async clickCreate() {
    await this.createButton.click();
    // allow errors that might be thrown by the onclick handler to surface
    await this.page.waitForTimeout(100);
  }

  async getStackText() {
    const txt = await this.stack.textContent();
    return txt === null ? '' : txt.trim();
  }

  async getMessageText() {
    const txt = await this.stackMessage.textContent();
    return txt === null ? '' : txt.trim();
  }

  // helper to fetch the global typeof a function name from the page
  async typeofGlobal(name) {
    return this.page.evaluate((n) => typeof window[n], name);
  }
}

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/8655f2c0-d5b2-11f0-b9b7-9552cfcdbf41.html';

test.describe('Stack App - interactive behavior and runtime diagnostics', () => {
  let stackPage;

  test.beforeEach(async ({ page }) => {
    stackPage = new StackPage(page);
    await stackPage.goto(APP_URL);
  });

  test.afterEach(async () => {
    // detach listeners to prevent interference between tests
    stackPage.detachListeners();
  });

  test('Initial load: basic DOM structure and default state', async () => {
    // Purpose: verify the initial DOM elements are present and in expected default state
    await expect(stackPage.h1).toHaveText('Stack');
    await expect(stackPage.createButton).toHaveCount(1);

    const stackText = await stackPage.getStackText();
    const messageText = await stackPage.getMessageText();

    // The implementation as provided has an empty stack and empty message by default
    expect(stackText).toBe('', 'Expected #stack to be empty string by default');
    expect(messageText).toBe('', 'Expected #stackMessage to be empty string by default');

    // Check accessibility: the create button should be visible and enabled
    await expect(stackPage.createButton).toBeVisible();
    await expect(stackPage.createButton).toBeEnabled();

    // The provided HTML contains broken/invalid inline script code.
    // We expect at least one page error to have been emitted during load (e.g., a SyntaxError).
    // Confirm that the pageErrors array captured at least one error.
    expect(stackPage.pageErrors.length).toBeGreaterThanOrEqual(
      1,
      'Expected at least one pageerror (e.g., SyntaxError) to occur during initial parsing of the inline script'
    );

    // Among the captured page errors, there should be a SyntaxError (parsing the broken inline script).
    const hasSyntaxError = stackPage.pageErrors.some(
      (e) =>
        // Error.name is the most robust check
        (e && e.name && e.name.toLowerCase().includes('syntaxerror')) ||
        // fallback: message contains "Unexpected" or "Unexpected token"
        (e && e.message && /Unexpected|Unexpected token/i.test(e.message))
    );
    expect(hasSyntaxError).toBe(true);
  });

  test('Clicking "Create Stack" triggers a runtime error and does not modify DOM', async () => {
    // Purpose: ensure that clicking the Create Stack button (onclick="createStack()")
    // results in an error when the createStack function is not defined due to earlier syntax errors,
    // and that the DOM remains unchanged.

    // Clear any previously collected errors/messages for a clean snapshot
    stackPage.pageErrors.length = 0;
    stackPage.consoleMessages.length = 0;

    // Perform click which calls the inline onclick handler.
    // Because the inline script likely failed to parse, createStack will be undefined and
    // the click should cause a ReferenceError to be emitted as a pageerror.
    await stackPage.clickCreate();

    // After clicking, allow a short time for the error event to be delivered
    await stackPage.page.waitForTimeout(100);

    // Validate that at least one page error was captured as a result of the click
    expect(stackPage.pageErrors.length).toBeGreaterThanOrEqual(
      1,
      'Expected a pageerror (e.g., ReferenceError) to be emitted when clicking the button'
    );

    // Check that one of the errors is a ReferenceError or mentions createStack/not defined
    const hasReferenceErrorForCreate = stackPage.pageErrors.some((e) => {
      if (!e) return false;
      const name = e.name || '';
      const msg = e.message || '';
      return (
        name.toLowerCase().includes('referenceerror') ||
        /createStack/i.test(msg) ||
        /not defined|is not defined|is not a function/i.test(msg)
      );
    });
    expect(hasReferenceErrorForCreate).toBe(
      true,
      'Expected a ReferenceError about createStack being undefined (or similar) when clicking Create Stack'
    );

    // Ensure the DOM did not change as a result of the failed handler
    const stackTextAfter = await stackPage.getStackText();
    const messageTextAfter = await stackPage.getMessageText();
    expect(stackTextAfter).toBe('', 'The #stack element should remain empty after the failed click');
    expect(messageTextAfter).toBe('', 'The #stackMessage should remain empty after the failed click');
  });

  test('Global functions from inline script are unavailable due to parsing errors', async () => {
    // Purpose: Assert that functions expected to be defined by the inline script are not available.

    // The inline script attempted to define createStack and createStackMessage but contains parse errors.
    const typeCreate = await stackPage.typeofGlobal('createStack');
    const typeCreateMessage = await stackPage.typeofGlobal('createStackMessage');

    // Both should be 'undefined' because the inline script did not execute/define them due to syntax errors.
    expect(typeCreate).toBe(
      'undefined',
      'createStack should be undefined on window because the inline script failed to parse/execute'
    );
    expect(typeCreateMessage).toBe(
      'undefined',
      'createStackMessage should be undefined on window because the inline script failed to parse/execute'
    );
  });

  test('Console messages and errors are surfaced to the test runner', async () => {
    // Purpose: Verify that console messages and runtime errors from the page are being captured by the test harness.

    // We already observed errors on load; ensure the captured arrays contain entries and inspect them.
    expect(Array.isArray(stackPage.consoleMessages)).toBe(true);
    expect(Array.isArray(stackPage.pageErrors)).toBe(true);

    // There must be at least one page error (syntax/runtime) from earlier tests - assert again for clarity.
    expect(stackPage.pageErrors.length).toBeGreaterThanOrEqual(1);

    // Optionally, ensure console messages were captured (network/script load failures often log to console).
    // We do not assert a minimum because console output can vary by environment, but we record and log counts.
    // This assertion documents expected behavior: there may be zero or more console entries but no crash.
    expect(stackPage.consoleMessages.length).toBeGreaterThanOrEqual(
      0,
      'Console messages array should exist (it may be empty depending on the environment)'
    );
  });
});