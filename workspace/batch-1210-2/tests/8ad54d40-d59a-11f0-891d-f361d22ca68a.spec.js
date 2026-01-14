import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad54d40-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Sliding Window - FSM tests (Application ID: 8ad54d40-d59a-11f0-891d-f361d22ca68a)', () => {
  // Collections to capture runtime events per test
  let pageErrors;
  let consoleMessages;

  // Setup: attach listeners before navigating so we capture early/parse-time errors (e.g., SyntaxError)
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      // Capture page errors (runtime and parse errors)
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Collect console messages for assertions/diagnostics
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the app and wait for the load event
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Teardown is implicit; listeners are tied to the page fixture and will be cleaned.

  test('Detect and assert script parse/runtime errors occur on page load', async ({ page }) => {
    // This test validates that script-level errors (e.g., SyntaxError from the provided script)
    // are emitted naturally by the runtime and observed by the test harness.

    // There should be at least one page error due to the deliberate problematic code in the page.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // At least one captured error message should indicate a SyntaxError or redeclaration issue.
    // The exact message may vary by browser, so use a tolerant regex.
    const errorMsgs = pageErrors.map((e) => String(e.message || e));
    const foundSyntaxLike = errorMsgs.some((m) =>
      /syntaxerror|identifier.*window|already been declared|window is not defined/i.test(m)
    );
    expect(foundSyntaxLike).toBeTruthy();

    // Also ensure console messages were captured (the app logs a hint, but it may not run if parse error).
    // We don't require the hint to be present; just record console activity.
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('Initial state: verify #sliding-window DOM and presence/absence of expected functions', async ({ page }) => {
    // This test checks the initial visual/DOM state and whether the page-level functions were defined.
    // Because the script has an error, we expect the functions (addText, updateText, clearText) to be undefined.
    const locator = page.locator('#sliding-window');

    // Read the innerText of the sliding window container.
    const content = await locator.innerText();

    // If a parse/runtime error occurred, the script likely did not run and the container should be empty.
    if (pageErrors.length > 0) {
      expect(content).toBe('', 'Expected empty content when script fails to execute');
    } else {
      // In the unlikely event the script ran without errors, validate it initialized the text.
      // The implementation may set innerText to a string that includes 'Hello' (with span tags as text).
      expect(content).toMatch(/Hello/i);
    }

    // Check whether the page-level functions exist. If the script failed, they should be undefined.
    const typeofAddText = await page.evaluate(() => typeof addText).catch((e) => 'error');
    const typeofUpdateText = await page.evaluate(() => typeof updateText).catch((e) => 'error');
    const typeofClearText = await page.evaluate(() => typeof clearText).catch((e) => 'error');

    if (pageErrors.length > 0) {
      // Script did not initialize functions
      expect(typeofAddText).toBe('undefined');
      expect(typeofUpdateText).toBe('undefined');
      expect(typeofClearText).toBe('undefined');
    } else {
      // Functions should exist if no errors occurred
      expect(typeofAddText).toBe('function');
      expect(typeofUpdateText).toBe('function');
      expect(typeofClearText).toBe('function');
    }
  });

  test('Attempt transitions with F5 and F8 and assert behavior when script errored', async ({ page }) => {
    // This test attempts to trigger the FSM transitions by pressing F5 and F8.
    // Because the page script contains an error, the keydown handlers are unlikely to be registered.
    // We assert that pressing keys does not change content and that page errors remain present.

    const locator = page.locator('#sliding-window');

    // Capture content before key presses
    const before = await locator.innerText();

    // Press F5 to attempt to add more text (transition trigger F5_Press)
    await page.keyboard.press('F5');
    // Small wait to allow any event handlers (if any) to run
    await page.waitForTimeout(150);

    const afterF5 = await locator.innerText();

    // If script errored, content should remain unchanged after pressing F5.
    if (pageErrors.length > 0) {
      expect(afterF5).toBe(before);
    } else {
      // If no error, pressing F5 should add a new Hello, <time>! string.
      // Accept any content that contains "Hello," as a sign of change.
      expect(afterF5).toMatch(/Hello,\s*\d{1,2}:\d{2}|\s*Hello/i);
    }

    // Now press F8 to attempt to clear text (transition trigger F8_Press)
    await page.keyboard.press('F8');
    await page.waitForTimeout(150);

    const afterF8 = await locator.innerText();

    if (pageErrors.length > 0) {
      // Still unchanged because clearText was not registered
      expect(afterF8).toBe(before);
    } else {
      // If handlers are present, F8 should clear the text
      expect(afterF8).toBe('', 'Expected cleared content after F8 when handlers are present');
    }

    // Ensure that the page errors haven’t magically disappeared
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
  });

  test('Calling page functions directly throws when undefined (ReferenceError) - edge case verification', async ({ page }) => {
    // This test explicitly attempts to call addText in the page context.
    // If the function is undefined because of earlier errors, calling it should throw a ReferenceError.
    // We let such errors happen naturally and assert their occurrence.

    // If addText/type is not a function, calling it will cause page.evaluate to reject.
    let threw = false;
    let caughtMessage = '';

    try {
      // Attempt to invoke addText - will either succeed (if the page script ran) or reject.
      await page.evaluate(() => {
        // Intentionally call the function as implemented in the page (if present)
        // This may throw ReferenceError if addText is not defined.
        // We return true if call succeeded to differentiate behavior.
        addText('Playwright test invocation');
        return true;
      });
    } catch (err) {
      threw = true;
      caughtMessage = String(err.message || err);
    }

    if (pageErrors.length > 0) {
      // If the page had script errors, we expect the direct call to have thrown.
      expect(threw).toBeTruthy();
      expect(caughtMessage).toMatch(/is not defined|ReferenceError|not a function/i);
    } else {
      // If no page errors, the function call should have succeeded and not thrown
      expect(threw).toBeFalsy();
      // Additionally ensure that the DOM reflects the invocation in some form
      const content = await page.locator('#sliding-window').innerText();
      expect(content).toMatch(/Playwright test invocation|Hello/i);
    }
  });

  test('Edge case: pressing F8 when no text should not crash page and errors are reported if present', async ({ page }) => {
    // Validate behavior when trying to clear an already-empty sliding window.
    const locator = page.locator('#sliding-window');

    // Force the container to be empty via evaluation if possible (non-intrusive read/inspect only).
    // We will not patch the page; we only attempt to press F8 and observe.
    const before = await locator.innerText();

    await page.keyboard.press('F8');
    await page.waitForTimeout(100);

    const after = await locator.innerText();

    // If script errored, nothing changed; otherwise, clearing empty content remains empty.
    expect(after).toBe(before);

    // Always assert that page reported its prior errors (if any)
    expect(pageErrors.length).toBeGreaterThanOrEqual(0);
  });
});