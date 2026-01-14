import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad52631-d59a-11f0-891d-f361d22ca68a.html';

test.describe('FSM + Divide and Conquer interactive application (ID: 8ad52631-d59a-11f0-891d-f361d22ca68a)', () => {
  // Arrays to collect runtime diagnostic information from the page
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for later assertions
    page.on('console', msg => {
      try {
        // normalize message text
        consoleMessages.push(msg.text());
      } catch (e) {
        consoleMessages.push(String(msg));
      }
    });

    // Collect uncaught runtime errors from the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // nothing to teardown explicitly; listeners are bound to the page fixture and removed automatically
  });

  test('Initial Idle state: page loads and the Idle evidence <div id="div"> is present', async ({ page }) => {
    // This test validates the FSM initial state "S0_Idle" evidence:
    // the page should render a single div with id="div" as described in the FSM evidence.
    const div = page.locator('#div');
    await expect(div).toHaveCount(1);
    // The div is present and is visible on the page
    await expect(div).toBeVisible();
    // The content is expected to be empty per the provided HTML (empty div)
    await expect(div).toHaveText('');
    // Basic page meta expectations
    await expect(page).toHaveTitle(/Divide and Conquer/);
  });

  test('No interactive elements or transitions: there should be no user inputs, buttons or links', async ({ page }) => {
    // The FSM extraction indicated no interactive elements; verify common interactive elements are absent.
    const interactiveSelectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[role="button"]'
    ];
    for (const sel of interactiveSelectors) {
      const loc = page.locator(sel);
      await expect(loc).toHaveCount(0);
    }

    // Also assert no clickable script-driven elements are present (no inline elements with onclick attribute)
    const onclickCount = await page.evaluate(() => document.querySelectorAll('[onclick]').length);
    expect(onclickCount).toBe(0);
  });

  test('Console output: the divideAndConquer execution logs a result (expected to be NaN for this implementation)', async ({ page }) => {
    // Capture the console message produced by the page script which logs the result.
    // Wait for at least one console message that contains the expected prefix.
    const expectedPrefix = 'The element at index 5 is:';
    let found = null;

    // If the console message already captured during load contains the expected text, use it.
    for (const msg of consoleMessages) {
      if (msg.includes(expectedPrefix)) {
        found = msg;
        break;
      }
    }

    // Otherwise wait for a new console message (protect with timeout)
    if (!found) {
      const msg = await page.waitForEvent('console', { timeout: 2000 });
      const text = msg.text();
      if (text.includes(expectedPrefix)) found = text;
    }

    expect(found).not.toBeNull();
    // The provided implementation has a logic bug that causes the computed result to be NaN.
    // Assert that the console line includes the string 'NaN'.
    expect(found).toContain('NaN');
  });

  test('Function existence and behavior: divideAndConquer should be callable and returns NaN for full-array call (demonstrates buggy implementation)', async ({ page }) => {
    // This test verifies that the function declared in the page exists and produces the observed incorrect output.
    // The function is declared with a function declaration, so it should be available on the page global scope.
    const result = await page.evaluate(() => {
      // Call the existing divideAndConquer function with the same arguments used in the inline script.
      // Return the raw result so the test can assert it's NaN.
      try {
        return divideAndConquer([1,2,3,4,5,6,7,8,9], 5, 0, 8);
      } catch (e) {
        // If an error occurs inside the page while calling, surface it as a string to the test.
        return { __thrown: true, message: e && e.message ? e.message : String(e) };
      }
    });

    // If the page returned an object indicating an exception, fail with that message.
    if (result && typeof result === 'object' && result.__thrown) {
      throw new Error('Calling divideAndConquer threw an exception inside the page: ' + result.message);
    }

    // The buggy implementation is expected to produce NaN as observed in console logging.
    // Ensure the returned value is actually NaN.
    expect(Number.isNaN(result)).toBe(true);
  });

  test('Invoking non-existent FSM entry action (renderPage) causes a ReferenceError when called from page context', async ({ page }) => {
    // The FSM lists an entry action renderPage() but the page does not define such a function.
    // Attempting to call it should naturally produce a ReferenceError. This test calls it intentionally
    // to verify that missing referenced functions produce the expected runtime error.
    await expect(page.evaluate(() => {
      // This call should throw a ReferenceError in the page context because renderPage is not defined.
      // We do not define or patch anything on the page; we simply invoke the identifier as-is.
      return renderPage();
    })).rejects.toThrow(/renderPage|not defined|ReferenceError/);
  });

  test('No uncaught runtime errors were emitted during page load (pageerror event collection)', async ({ page }) => {
    // The page may or may not emit pageerror events. The inline script does not intentionally throw.
    // Validate and document whether there were page errors collected.
    // This is an explicit assertion that the page did not raise uncaught exceptions during load.
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case check: calling divideAndConquer on a small array to observe behavior (no thrown exceptions, returns NaN or number)', async ({ page }) => {
    // Call with a smaller array to assess behavior across boundary conditions.
    const smallResult = await page.evaluate(() => {
      try {
        return divideAndConquer([1, 2, 3], 1, 0, 2);
      } catch (e) {
        return { __thrown: true, message: e && e.message ? e.message : String(e) };
      }
    });

    if (smallResult && typeof smallResult === 'object' && smallResult.__thrown) {
      // If an exception was thrown, assert its type is a natural JS error (do not patch or change page)
      expect(typeof smallResult.message).toBe('string');
      // Fail the test if an unexpected exception occurred
      throw new Error('divideAndConquer threw during small-array test: ' + smallResult.message);
    } else {
      // If no exception, result should either be a number or NaN; ensure we received a numeric kind of value
      expect(typeof smallResult === 'number').toBe(true);
      // The broken divideAndConquer often yields NaN for many inputs; accept either a numeric value or NaN but validate it's a number type
    }
  });

  test('Sanity: ensure there is no global "result" property on window (top-level let is not a window property)', async ({ page }) => {
    // The inline script declares "let result = ..." at top-level; top-level let does not attach to window.
    // Verify that window.result is undefined (demonstrates difference between var/function and let).
    const hasGlobalResult = await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'result') ? window.result : undefined);
    // We expect window.result to be undefined because the script uses let at top-level (not var)
    expect(hasGlobalResult).toBeUndefined();
  });
});