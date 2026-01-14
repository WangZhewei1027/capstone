import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad218f0-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Stack FSM - Interactive Application (Application ID: 8ad218f0-d59a-11f0-891d-f361d22ca68a)', () => {
  // Collect page errors and console messages for inspection in tests
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture runtime errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      // Store the Error object for assertions
      pageErrors.push(err);
    });

    // Capture console messages for assertions (e.g., printStack output)
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        // ignore console capture issues
      }
    });

    // Navigate to the page before each test
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Allow short time for inline script execution and potential errors
    await page.waitForTimeout(200);
  });

  test.afterEach(async ({ page }) => {
    // Ensure the page is closed after each test (Playwright does this automatically per test).
    // This placeholder is here to indicate teardown if needed.
    // No explicit action needed for teardown in this test suite.
  });

  test('Initial load: runtime error should occur due to invalid DOM appendChild and initial DOM remains unchanged', async ({ page }) => {
    // This test validates the application fails during initial script execution (as expected per buggy implementation)
    // and that initial static DOM (the HTML-provided items) remains present while dynamic UI components are not attached.

    // Assert that at least one page error occurred during page load (e.g., appending a button to an input throws)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const firstError = pageErrors[0];
    expect(firstError).toBeTruthy();
    // The exact error message can vary across engines; assert it contains indicative substrings
    const errMsg = String(firstError.message || firstError);
    expect(errMsg.length).toBeGreaterThan(0);

    // The original HTML contains 10 static .item elements. Because the script errored early,
    // the static items should still be present in the DOM.
    const staticItems = await page.$$('.stack .item');
    expect(staticItems.length).toBe(10);

    // The script defines a global items array (let items = []) before the error.
    // Confirm that the runtime items array exists and is empty.
    const runtimeItems = await page.evaluate(() => {
      // Access items in window context; if undefined, return null
      return typeof items !== 'undefined' ? items : null;
    });
    expect(runtimeItems).toEqual([]); // should be an empty array

    // Because the script errored before attaching the input to the DOM, the input should NOT be present.
    const inputElement = await page.$('input[type="text"]');
    expect(inputElement).toBeNull();

    // No buttons should have been successfully appended to the DOM by the script.
    const buttons = await page.$$('button');
    expect(buttons.length).toBe(0);

    // Confirm that the global variable popButton was not created/attached due to the early exception.
    const hasPopButtonGlobal = await page.evaluate(() => typeof popButton !== 'undefined');
    expect(hasPopButtonGlobal).toBe(false);
  });

  test('Push transition via direct push(item) call: moves from Empty to Non-Empty and updates DOM', async ({ page }) => {
    // Because the input control was not attached, we simulate the "Push" transition by calling push() directly.
    // Validate state transition: items array grows and the .stack DOM updates to reflect pushed items.

    // Ensure no residual items at runtime (items should start empty per script)
    let before = await page.evaluate(() => items.slice());
    expect(before).toEqual([]);

    // Call push('A')
    await page.evaluate(() => push('A'));

    // After push, the runtime items array should have length 1
    const itemsAfterPush = await page.evaluate(() => items.slice());
    expect(itemsAfterPush.length).toBe(1);
    expect(itemsAfterPush[0]).toBe('A');

    // The DOM .stack should now have exactly one .item element (script clears innerHTML then populates)
    let domItems = await page.$$('.stack .item');
    expect(domItems.length).toBe(1);

    // The text content of the DOM item should match the pushed value 'A'
    const firstText = await domItems[0].textContent();
    expect(firstText).toBe('A');
  });

  test('Multiple pushes: pushing additional items increases stack size and DOM is updated (but displays last-pushed bug)', async ({ page }) => {
    // Push several items to validate transition S1_NonEmpty -> S1_NonEmpty for successive Push events
    await page.evaluate(() => {
      // Clear any existing runtime items to ensure determinism
      items = [];
      stack.innerHTML = '';
    });

    // Push A, B, C sequentially
    await page.evaluate(() => push('A'));
    await page.evaluate(() => push('B'));
    await page.evaluate(() => push('C'));

    // The runtime items array should hold 3 entries: ['A','B','C']
    const runtime = await page.evaluate(() => items.slice());
    expect(runtime).toEqual(['A', 'B', 'C']);

    // The DOM .stack should have 3 .item elements
    const domItems = await page.$$('.stack .item');
    expect(domItems.length).toBe(3);

    // NOTE: The implementation has a bug: when rendering, it uses the parameter "item" for every created element,
    // resulting in all DOM elements showing the most recently pushed value. We assert that behavior explicitly.
    const texts = await Promise.all(domItems.map(async (el) => el.textContent()));
    // All DOM texts should equal the last pushed value 'C' due to the bug
    for (const t of texts) {
      expect(t).toBe('C');
    }
  });

  test('Pop transition: popping reduces stack size and last pop on empty triggers an alert dialog', async ({ page }) => {
    // Prepare stack with 2 items then pop twice and assert DOM and runtime state changes, finally pop on empty to trigger alert.

    // Reset runtime stack and DOM
    await page.evaluate(() => {
      items = [];
      stack.innerHTML = '';
    });

    // Push two items
    await page.evaluate(() => push('X'));
    await page.evaluate(() => push('Y'));

    // Ensure runtime length is 2
    let runtime = await page.evaluate(() => items.slice());
    expect(runtime.length).toBe(2);

    // Pop once: should reduce to 1
    await page.evaluate(() => pop());
    runtime = await page.evaluate(() => items.slice());
    expect(runtime.length).toBe(1);

    // Pop second time: should reduce to 0
    await page.evaluate(() => pop());
    runtime = await page.evaluate(() => items.slice());
    expect(runtime.length).toBe(0);

    // DOM should now have 0 .item elements
    let domItems = await page.$$('.stack .item');
    expect(domItems.length).toBe(0);

    // Now call pop() on the empty stack to produce an alert('Stack is empty')
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Trigger pop on empty stack
    await page.evaluate(() => pop());

    // Wait briefly for dialog handler to run
    await page.waitForTimeout(100);

    // Assert that we received an alert dialog with expected message
    expect(dialogMessage).toBe('Stack is empty');
  });

  test('Clear transition empties the stack (items array and DOM) when invoked', async ({ page }) => {
    // Push some items then call clear() and validate both runtime and DOM are emptied.

    // Reset to deterministic state
    await page.evaluate(() => {
      items = [];
      stack.innerHTML = '';
    });

    // Push three items
    await page.evaluate(() => push('1'));
    await page.evaluate(() => push('2'));
    await page.evaluate(() => push('3'));

    // Confirm runtime has 3 items
    let runtime = await page.evaluate(() => items.slice());
    expect(runtime.length).toBe(3);

    // Call clear()
    await page.evaluate(() => clear());

    // Confirm runtime items array is empty
    runtime = await page.evaluate(() => items.slice());
    expect(runtime).toEqual([]);

    // Confirm DOM has no .item elements
    const domItems = await page.$$('.stack .item');
    expect(domItems.length).toBe(0);
  });

  test('Edge case: input.onchange handler did not run automatically (no printStack logs) and UI components missing', async ({ page }) => {
    // The FSM expects an input onchange to push and printStack; because the input was never appended to DOM,
    // there should be no automatic "Stack:" console messages produced during load.

    // Search captured console messages for 'Stack:' logs that would come from printStack
    const stackConsoleMessages = consoleMessages.filter(m => m.text.includes('Stack:'));
    expect(stackConsoleMessages.length).toBe(0);

    // Verify input element is not in the DOM (cannot be used for "Push" by user)
    const inputPresent = await page.$('input[type="text"]');
    expect(inputPresent).toBeNull();

    // Buttons should not be present, so clicking UI buttons is impossible; verify that attempting to query them yields none
    const buttonCount = await page.evaluate(() => document.querySelectorAll('button').length);
    expect(buttonCount).toBe(0);

    // Assert that the page error we captured earlier references appendChild or similar (indicative of the appending-to-input bug)
    const combinedErrorText = pageErrors.map(e => String(e.message || e)).join(' | ');
    expect(combinedErrorText.length).toBeGreaterThan(0);
    // We don't assert the exact wording because engines vary, but ensure it references append or input
    const indicative = /append|input|child|node/i;
    expect(indicative.test(combinedErrorText)).toBeTruthy();
  });

  test('Manual invocation of printStack logs current items to console', async ({ page }) => {
    // Even though input.onchange couldn't trigger printStack, printStack is still defined and should log the current items when called manually.

    // Reset and push a known item
    await page.evaluate(() => {
      items = [];
      stack.innerHTML = '';
      push('manual');
    });

    // Prepare to capture the next console message
    let printed = null;
    const listener = (msg) => {
      if (msg.type() === 'log' && msg.text().startsWith('Stack:')) {
        printed = msg.text();
      }
    };
    page.on('console', listener);

    // Call printStack() manually
    await page.evaluate(() => printStack());

    // Allow time for console message to be received
    await page.waitForTimeout(100);

    // Remove listener to avoid leaks
    page.off('console', listener);

    // Assert that a console log with current items was produced
    expect(printed).toBeTruthy();
    expect(printed).toContain('Stack:');
    // It should reflect the 'manual' value in the array representation
    expect(printed).toMatch(/manual/);
  });
});