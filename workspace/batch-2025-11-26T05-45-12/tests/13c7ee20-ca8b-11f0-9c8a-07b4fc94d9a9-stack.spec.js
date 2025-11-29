import { test, expect } from '@playwright/test';

//
// Test suite for Application ID: 13c7ee20-ca8b-11f0-9c8a-07b4fc94d9a9
// File: 13c7ee20-ca8b-11f0-9c8a-07b4fc94d9a9-stack.spec.js
//
// Notes:
// - The provided HTML references "script.js". This test intentionally loads the page "as-is",
//   observes console logs and runtime errors, and asserts that errors occur naturally.
// - Do NOT attempt to patch or modify the page environment or scripts.
// - The FSM only contains a single 'idle' state with no transitions. Tests validate that state
//   and that no interactive controls are present.
// - Tests use ES module syntax and Playwright's built-in fixtures.
//

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-45-12/html/13c7ee20-ca8b-11f0-9c8a-07b4fc94d9a9.html';

// Page object for the Stack page to encapsulate common interactions and listeners.
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    this._consoleListener = (msg) => {
      // store console messages for assertions
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location ? msg.location() : undefined,
      });
    };
    this._pageErrorListener = (err) => {
      // store unhandled errors that bubble to the page
      this.pageErrors.push(err);
    };
  }

  // Attach listeners to capture console messages and page errors.
  attachListeners() {
    this.page.on('console', this._consoleListener);
    this.page.on('pageerror', this._pageErrorListener);
  }

  // Detach listeners to avoid leak between tests.
  detachListeners() {
    this.page.off('console', this._consoleListener);
    this.page.off('pageerror', this._pageErrorListener);
  }

  // Navigate to the app URL and wait for load event.
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Convenience helper to wait a short time to allow errors/console messages to appear.
  async settle(ms = 1000) {
    await this.page.waitForTimeout(ms);
  }

  // Return the #stack element handle and its textContent/innerHTML.
  async getStackElementInfo() {
    const stackHandle = await this.page.$('#stack');
    if (!stackHandle) return null;
    const text = await this.page.evaluate((el) => el.textContent, stackHandle);
    const html = await this.page.evaluate((el) => el.innerHTML, stackHandle);
    return { handle: stackHandle, text, html };
  }

  // Utility to collect and return error-like console messages (console.type === 'error')
  getConsoleErrors() {
    return this.consoleMessages.filter((m) => m.type === 'error');
  }

  // Dispose and clear listeners
  async dispose() {
    this.detachListeners();
  }
}

test.describe('Stack application (FSM: idle state only)', () => {
  // Each test will create its own StackPage instance and load the page fresh.
  // This grouping verifies the "idle" behavior and the lack of interactive transitions.
  test('page shows expected static elements for idle state', async ({ page }) => {
    // This test validates basic DOM presence and content reflecting the idle FSM state.
    const stackPage = new StackPage(page);
    stackPage.attachListeners();

    await stackPage.goto();
    // Allow small time for any scripts to run (and errors to surface naturally).
    await stackPage.settle(500);

    // Validate the page's heading exists and reads "Stack"
    const heading = await page.$('h1');
    expect(heading).not.toBeNull();
    const headingText = await heading.textContent();
    expect(headingText).toBe('Stack');

    // Validate the stack container exists and is initially empty (idle state => no items)
    const stackInfo = await stackPage.getStackElementInfo();
    expect(stackInfo).not.toBeNull();
    // innerHTML should be empty string in a static page with only a div#stack
    expect(stackInfo.html).toBe('');

    // Validate there are no interactive elements (buttons/inputs) as FSM describes no transitions
    const buttons = await page.$$('button');
    expect(buttons.length).toBe(0);
    const inputs = await page.$$('input, textarea, select');
    expect(inputs.length).toBe(0);

    await stackPage.dispose();
  });

  test('no transitions present: verify absence of controls and event hooks', async ({ page }) => {
    // This test asserts that there are no visible controls that would trigger FSM transitions.
    const stackPage = new StackPage(page);
    stackPage.attachListeners();

    await stackPage.goto();
    await stackPage.settle(500);

    // No elements with data-action or data-event attributes should exist (common patterns for interactive apps)
    const actionable = await page.$$('[data-action], [data-event]');
    expect(actionable.length).toBe(0);

    // Also confirm there are no elements with role="button" invisible to visuals (ARIA-only)
    const ariaButtons = await page.$$('[role="button"]');
    expect(ariaButtons.length).toBe(0);

    await stackPage.dispose();
  });
});

test.describe('Console and runtime error observations (page loaded as-is)', () => {
  // These tests intentionally assert that runtime/console errors occur when loading the page "as-is".
  // Per the instructions, we must observe and assert these errors happen naturally (do not patch/repair the page).

  test('should capture at least one console error or pageerror when loading the page', async ({ page }) => {
    // This test collects console messages and page errors and asserts at least one error-like event occurred.
    const stackPage = new StackPage(page);
    stackPage.attachListeners();

    await stackPage.goto();

    // Give the page a moment to emit console messages and runtime errors (if any)
    await stackPage.settle(1200);

    // Combine console errors and pageErrors into a single collection for assertion
    const consoleErrors = stackPage.getConsoleErrors();
    const pageErrors = stackPage.pageErrors || [];

    // For diagnostic output in test failure, include the collected messages
    // Assert: at least one error-like event occurred.
    // NOTE: This test intentionally expects errors to occur based on the provided environment (script.js may be missing or buggy).
    expect(consoleErrors.length + pageErrors.length).toBeGreaterThan(0);

    // Basic checks on the collected errors to ensure they have useful diagnostic info
    if (consoleErrors.length > 0) {
      // Ensure console error items have text content
      for (const ce of consoleErrors) {
        expect(typeof ce.text).toBe('string');
        expect(ce.text.length).toBeGreaterThan(0);
      }
    }

    if (pageErrors.length > 0) {
      // Ensure page errors are Error instances with a non-empty message
      for (const pe of pageErrors) {
        expect(pe).toBeTruthy();
        expect(typeof pe.message).toBe('string');
        expect(pe.message.length).toBeGreaterThan(0);
      }
    }

    await stackPage.dispose();
  });

  test('captures error types and messages (ReferenceError / SyntaxError / TypeError or resource load issues)', async ({ page }) => {
    // This test inspects the collected errors for common keywords. It will fail if no such keywords are found,
    // which aligns with the requirement to observe errors naturally.
    const stackPage = new StackPage(page);
    stackPage.attachListeners();

    await stackPage.goto();
    await stackPage.settle(1200);

    const consoleErrors = stackPage.getConsoleErrors().map((c) => c.text);
    const pageErrorMessages = stackPage.pageErrors.map((e) => (e && e.message) || String(e));

    const allMessages = [...consoleErrors, ...pageErrorMessages].join('\n---\n');

    // Check for known error keywords. At least one should appear in the combined messages.
    const keywords = ['ReferenceError', 'TypeError', 'SyntaxError', 'Failed to load resource', 'GET', '404', 'Uncaught'];
    const found = keywords.some((kw) => allMessages.includes(kw));

    // For strong diagnostics, if no keywords found, fail with collected output so the developer can inspect.
    expect(found).toBeTruthy();

    await stackPage.dispose();
  });

  test('page remains structurally intact despite runtime/console errors (edge case)', async ({ page }) => {
    // This test verifies that even when errors occur, the static #stack container remains present and unchanged,
    // reflecting the FSM idle state's onEnter/onExit being noop (no visible side effects expected).
    const stackPage = new StackPage(page);
    stackPage.attachListeners();

    await stackPage.goto();
    await stackPage.settle(800);

    // Capture initial snapshot of the stack container
    const before = await stackPage.getStackElementInfo();
    expect(before).not.toBeNull();
    expect(before.html).toBe('');

    // Attempt a second short wait to allow any late errors to surface
    await stackPage.settle(400);

    // Capture again and ensure it hasn't been modified
    const after = await stackPage.getStackElementInfo();
    expect(after).not.toBeNull();
    expect(after.html).toBe(before.html);
    expect(after.text).toBe(before.text);

    // Ensure that if errors occurred, they didn't create unexpected DOM nodes in the body
    const unexpectedChildren = await page.evaluate(() => {
      // Find direct children of body that are not the expected h1 and div#stack
      const allowedSelectors = ['h1', '#stack'];
      const extras = [];
      for (const child of Array.from(document.body.children)) {
        if (!allowedSelectors.some((sel) => child.matches(sel))) {
          extras.push(child.outerHTML);
        }
      }
      return extras;
    });

    // It's acceptable to have no extras; if there are extras that's unexpected for this static page.
    expect(unexpectedChildren.length).toBe(0);

    await stackPage.dispose();
  });
});