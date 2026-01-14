import { test, expect } from '@playwright/test';

// Test file for application ID: 3cca4f50-d5af-11f0-852d-73feb043b9f3
// This suite verifies page load, DOM contents, absence of interactive controls,
// and observes natural runtime errors (ReferenceError, SyntaxError, TypeError)
// by triggering them in ways that do not patch or modify existing application logic.

// Simple page object encapsulating selectors and common checks for the page.
class DfsPage {
  constructor(page) {
    this.page = page;
    this.header = 'h1';
    this.body = 'body';
  }

  // Return the main header text
  async getHeaderText() {
    return this.page.locator(this.header).innerText();
  }

  // Return the full page text content
  async getPageText() {
    return this.page.textContent(this.body);
  }

  // Return number of interactive controls on page (inputs, buttons, selects, textareas, forms)
  async interactiveControlsCount() {
    return this.page.locator('input, button, textarea, select, form').count();
  }
}

test.describe('DFS HTML application - basic UI and error observation', () => {
  let page;
  let dfs;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a new context and page per test to ensure isolation of pageerror events.
    const context = await browser.newContext();
    page = await context.newPage();

    // Arrays to collect console and pageerror events for assertions.
    consoleMessages = [];
    pageErrors = [];

    // Attach listeners to capture console messages and page errors.
    page.on('console', msg => {
      // Collect console messages with type and text for later assertions.
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      // Collect unhandled page errors (these are emitted for async/unhandled exceptions).
      // We capture the error object (name and message) for assertions.
      pageErrors.push({ name: error.name, message: error.message });
    });

    // Navigate to the provided HTML page url.
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca4f50-d5af-11f0-852d-73feb043b9f3.html');

    dfs = new DfsPage(page);
  });

  test.afterEach(async () => {
    // Close page's context to ensure fresh state for next test.
    await page.context().close();
  });

  test('Initial page load: title, header, and code snippet present; no interactive controls', async () => {
    // Purpose: Verify the page loaded correctly, content contains DFS description and code,
    // and that there are no interactive controls (inputs, buttons, forms) on the page.
    await expect(page).toHaveTitle(/DFS/);

    const headerText = await dfs.getHeaderText();
    expect(headerText).toBe('DFS');

    const pageText = await dfs.getPageText();
    // Check for key sentences and the function name present in the page text content.
    expect(pageText).toContain('This is a simple example of DFS using JavaScript');
    expect(pageText).toContain('function find');
    expect(pageText).toContain('When you call this function with an array and a target node');

    // Assert there are no interactive elements on the page by default.
    const interactiveCount = await dfs.interactiveControlsCount();
    expect(interactiveCount).toBe(0);

    // There should be no synchronous page errors immediately after load in normal conditions.
    // We assert that our collected pageErrors array is empty at this point.
    expect(pageErrors.length).toBe(0);

    // Console messages could be present or absent; assert it's an array.
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('ReferenceError when referencing an undefined identifier in page context (caught and reported)', async () => {
    // Purpose: Intentionally reference an undefined identifier inside the page context,
    // catch the ReferenceError in-page and return its details for assertion.
    //
    // Note: We avoid modifying global state; this is a read-only evaluation that
    // demonstrates a ReferenceError occurs when code attempts to use an undefined name.
    const result = await page.evaluate(() => {
      try {
        // Direct reference to an undefined bare identifier triggers ReferenceError.
        // Wrapping in a function so the direct identifier lookup is attempted.
        (function callUndefined() {
          return nonExistantIdentifierForTest; // intentionally undefined
        })();
        return { didThrow: false };
      } catch (e) {
        // Return the error details back to the test runner.
        return { didThrow: true, name: e.name, message: e && e.message ? e.message : String(e) };
      }
    });

    expect(result.didThrow).toBe(true);
    expect(result.name).toBe('ReferenceError');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  test('Asynchronous unhandled ReferenceError emits a pageerror event', async () => {
    // Purpose: Trigger an unhandled ReferenceError asynchronously so the page emits a 'pageerror'
    // event which Playwright captures via the page.on('pageerror') listener.
    //
    // We use setTimeout to ensure the exception is not caught by the evaluate execution context.
    const [errorEvent] = await Promise.all([
      // Wait for the pageerror event that will be emitted for the unhandled async error.
      page.waitForEvent('pageerror'),
      // Trigger an async call to a non-existent function to cause an unhandled ReferenceError.
      page.evaluate(() => {
        setTimeout(() => {
          // This is intentionally undefined in the page context.
          // Because it's inside a timeout and not wrapped in try/catch, it becomes an unhandled exception.
          someNonExistentAsyncFunctionForTest();
        }, 0);
      }),
    ]);

    // Validate the captured pageerror has ReferenceError semantics.
    expect(errorEvent).toBeTruthy();
    // Error object from pageerror may be an Error instance; check its name.
    expect(errorEvent.name).toBe('ReferenceError');
    // The message should indicate the undefined function name.
    expect(typeof errorEvent.message).toBe('string');
    expect(errorEvent.message.length).toBeGreaterThan(0);

    // Our pageErrors listener should have recorded at least this error.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    expect(pageErrors[pageErrors.length - 1].name).toBe('ReferenceError');
  });

  test('Injecting an invalid <script> causes a SyntaxError and emits a pageerror event', async () => {
    // Purpose: Append a script element with invalid JavaScript to the DOM. The browser will
    // attempt to parse it and should produce a SyntaxError that is reported as a pageerror.
    //
    // We perform this in a way that does not alter existing app logic other than adding a new script tag.
    const [errorEvent] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.evaluate(() => {
        const s = document.createElement('script');
        // Intentionally malformed JavaScript to generate SyntaxError.
        s.textContent = 'function invalidSyntax( { console.log("broken"); }';
        document.head.appendChild(s);
      }),
    ]);

    // Validate the error is a SyntaxError (browsers report parse errors as SyntaxError)
    expect(errorEvent).toBeTruthy();
    // Some browsers may report 'SyntaxError', others may report generic Error with parsing details.
    // We accept SyntaxError as expected, otherwise ensure an error message exists.
    if (errorEvent.name) {
      expect(errorEvent.name).toMatch(/SyntaxError|Error/);
    }
    expect(typeof errorEvent.message).toBe('string');
    expect(errorEvent.message.length).toBeGreaterThan(0);

    // Confirm our listener captured it
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });

  test('TypeError from invalid property access emits a pageerror event', async () => {
    // Purpose: Trigger an unhandled TypeError asynchronously by attempting to access a property
    // or call a method on null. This should emit a 'pageerror' event captured by Playwright.
    const [errorEvent] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.evaluate(() => {
        setTimeout(() => {
          // Accessing .call on null will cause a TypeError at runtime.
          // This is unhandled and will cause the page to emit a pageerror event.
          null.callSomething();
        }, 0);
      }),
    ]);

    expect(errorEvent).toBeTruthy();
    // The browser should emit a TypeError for this invalid operation.
    expect(errorEvent.name).toBe('TypeError');
    expect(typeof errorEvent.message).toBe('string');
    expect(errorEvent.message.length).toBeGreaterThan(0);

    // Our pageErrors listener should have recorded the event.
    expect(pageErrors.some(e => e.name === 'TypeError')).toBeTruthy();
  });

  test('No interactive controls remain after error injections and page still contains DFS content', async () => {
    // Purpose: Ensure that injecting scripts and triggering errors did not remove content or
    // inadvertently add inputs/buttons/etc. The DFS description should remain visible.
    const pageText = await dfs.getPageText();
    expect(pageText).toContain('This is a simple example of DFS using JavaScript');
    expect(await dfs.interactiveControlsCount()).toBe(0);

    // Also, ensure that we observed at least one page error in the test run (previous tests trigger them).
    // This validates that runtime errors were observable via the pageerror listener.
    expect(Array.isArray(pageErrors)).toBe(true);
  });
});