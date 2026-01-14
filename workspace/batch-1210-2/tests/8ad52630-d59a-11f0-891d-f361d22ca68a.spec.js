import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad52630-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Recursion Example (FSM) - 8ad52630-d59a-11f0-891d-f361d22ca68a', () => {
  // Arrays to collect console messages and uncaught page errors for each test run
  let consoleMessages;
  let pageErrors;

  // Set up a fresh page state before each test and attach listeners to observe console & errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection (info, log, warn, error, etc.)
    page.on('console', (msg) => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // In case msg.type() or msg.text() throws unexpectedly, still push fallback info.
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture any uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the application page and wait for it to load fully
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Test 1: Verify Idle state UI presence and initial internal variables are zero.
  test('Initial Idle state: UI elements exist and internal counters start at 0', async ({ page }) => {
    // Assert that the input and buttons and result container are present in the DOM
    await expect(page.locator('#input')).toBeVisible();
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#reset-btn')).toBeVisible();
    await expect(page.locator('#result')).toBeVisible();

    // Verify the internal variables defined by the script are present and initialized to 0
    const { inputNumber, recursionCount, resultInner } = await page.evaluate(() => {
      return {
        inputNumber: window.inputNumber,
        recursionCount: window.recursionCount,
        resultInner: document.getElementById('result').innerHTML
      };
    });

    // The implementation initializes inputNumber and recursionCount to 0
    expect(inputNumber).toBe(0);
    expect(recursionCount).toBe(0);

    // The result <p> should be empty initially
    expect(resultInner).toBe('');

    // Ensure no uncaught errors were emitted during initial load
    expect(pageErrors.length).toBe(0);

    // No recursion-related console logs should be present on load
    const recursionLogs = consoleMessages.filter(m => m.text.includes('Recursive call') || m.text.includes('Result:'));
    expect(recursionLogs.length).toBe(0);
  });

  // Test 2: Clicking Start Recursion with default internal inputNumber (0) should not produce recursion logs.
  test('Start Recursion from Idle with default inputNumber = 0 produces no recursion logs', async ({ page }) => {
    // Click the Start Recursion button
    await page.click('#start-btn');

    // Wait briefly to allow any synchronous/asynchronous console logs to appear
    await page.waitForTimeout(300);

    // Verify that no recursion-related console logs were emitted
    const recursionLogs = consoleMessages.filter(m => m.text.includes('Recursive call') || m.text.includes('Result:'));
    expect(recursionLogs.length).toBe(0);

    // Confirm that internal counters remain unchanged after the click (since inputNumber was 0)
    const { inputNumber, recursionCount } = await page.evaluate(() => {
      return { inputNumber: window.inputNumber, recursionCount: window.recursionCount };
    });
    expect(inputNumber).toBe(0);
    expect(recursionCount).toBe(0);

    // Ensure no uncaught page errors occurred
    expect(pageErrors.length).toBe(0);
  });

  // Test 3: Entering a number into the visible input field does NOT change the internal inputNumber (edge case).
  // This validates a mismatch between the UI input and the script's internal variable (implementation bug).
  test('UI input is not wired to internal inputNumber: filling the input and starting does not trigger recursion', async ({ page }) => {
    // Fill the visible input with "3" (user action)
    await page.fill('#input', '3');

    // Verify the visible input value is set
    const visibleValue = await page.$eval('#input', el => el.value);
    expect(visibleValue).toBe('3');

    // Click Start Recursion (the implementation uses window.inputNumber, not the DOM input)
    await page.click('#start-btn');

    // Allow time for any console outputs
    await page.waitForTimeout(300);

    // Confirm that internal inputNumber remains unchanged (still 0) demonstrating the edge case
    const internalValue = await page.evaluate(() => window.inputNumber);
    expect(internalValue).toBe(0);

    // No recursion logs should have been emitted because start uses the internal variable which is 0
    const recursionLogs = consoleMessages.filter(m => m.text.includes('Recursive call') || m.text.includes('Result:'));
    expect(recursionLogs.length).toBe(0);

    // No uncaught errors should have occurred
    expect(pageErrors.length).toBe(0);
  });

  // Test 4: Reset Recursion should clear the result area and ensure counters are zero.
  // We simulate the presence of content in the result element (e.g., from a previous run) and then reset.
  test('Reset Recursion clears UI result and keeps internal counters at zero', async ({ page }) => {
    // Put some content into the #result element to simulate previous output
    await page.evaluate(() => {
      document.getElementById('result').innerHTML = 'simulated output';
    });

    // Ensure the result area contains the simulated content
    const beforeReset = await page.$eval('#result', el => el.innerHTML);
    expect(beforeReset).toBe('simulated output');

    // Click the Reset button which should run resetRecursion()
    await page.click('#reset-btn');

    // Allow a short delay for the handler to run
    await page.waitForTimeout(200);

    // Verify that the result area is cleared
    const afterReset = await page.$eval('#result', el => el.innerHTML);
    expect(afterReset).toBe('');

    // Verify that the internal variables are set to 0 by resetRecursion (they were already 0, but test confirms)
    const { inputNumber, recursionCount } = await page.evaluate(() => {
      return { inputNumber: window.inputNumber, recursionCount: window.recursionCount };
    });
    expect(inputNumber).toBe(0);
    expect(recursionCount).toBe(0);

    // Ensure no uncaught errors occurred during reset
    expect(pageErrors.length).toBe(0);
  });

  // Test 5: Validate presence of expected functions and that clicking buttons does not throw.
  // This asserts that the onEnter/onExit action functions exist (startRecursion, resetRecursion).
  test('Implementation exposes startRecursion and resetRecursion functions and button clicks do not throw', async ({ page }) => {
    // Check that the functions are defined on the window (evidence from the FSM)
    const funcs = await page.evaluate(() => {
      return {
        hasStart: typeof window.startRecursion === 'function',
        hasReset: typeof window.resetRecursion === 'function'
      };
    });
    expect(funcs.hasStart).toBe(true);
    expect(funcs.hasReset).toBe(true);

    // Clicking Start and Reset must not produce uncaught exceptions
    await page.click('#start-btn');
    await page.click('#reset-btn');

    // Allow a little time for any errors to surface
    await page.waitForTimeout(200);

    // Confirm no page errors were captured
    expect(pageErrors.length).toBe(0);

    // Also confirm no unexpected console errors appeared
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  // Test 6: Edge case - ensure that even with non-numeric visible input, internal behavior remains unchanged and no exceptions thrown.
  test('Entering non-numeric text in the visible input does not throw and does not affect internal inputNumber', async ({ page }) => {
    // Attempt to type text into the number input (browser may coerce, but we test resilience)
    await page.fill('#input', 'not-a-number');

    // Click start to trigger any potential logic that might assume numeric input from DOM (it doesn't read the DOM)
    await page.click('#start-btn');

    // Wait briefly
    await page.waitForTimeout(200);

    // Internal inputNumber should remain numeric 0 (implementation uses window.inputNumber)
    const internalValue = await page.evaluate(() => window.inputNumber);
    expect(internalValue).toBe(0);

    // No uncaught errors should be present
    expect(pageErrors.length).toBe(0);
  });
});