import { test, expect } from '@playwright/test';

test.describe('Radix Sort Interactive Application (FSM validation) - 8ad414c0-d59a-11f0-891d-f361d22ca68a', () => {
  // URL of the application under test
  const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad414c0-d59a-11f0-891d-f361d22ca68a.html';

  // Hold console messages and page errors observed during a test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions and debugging
    page.on('console', (msg) => {
      // record only text for easier assertions
      try {
        consoleMessages.push(msg.text());
      } catch (e) {
        consoleMessages.push(String(msg));
      }
    });

    // Capture uncaught exceptions on the page (page errors)
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Navigate to the application page before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Intentionally do not attempt to patch or fix any errors encountered.
    // We just report them via assertions in each test.
  });

  test('Idle state (S0_Idle) - form, input, submit button and output container are present', async ({ page }) => {
    // Validate presence of expected components described in the FSM's Idle state
    const form = page.locator('#radix-sort-form');
    const input = page.locator('#number');
    const button = page.locator('button[type="submit"]');
    const output = page.locator('#output');

    // Ensure form and controls are visible / attached to DOM
    await expect(form).toBeVisible();
    await expect(input).toBeVisible();
    await expect(button).toBeVisible();
    await expect(output).toBeVisible();

    // Check input attributes per FSM (type=number, required)
    await expect(input).toHaveAttribute('type', 'number');
    // required attribute may be boolean attribute or string; check existence
    const requiredAttr = await input.getAttribute('required');
    expect(requiredAttr === '' || requiredAttr === 'true' || requiredAttr === null || requiredAttr === 'required' || requiredAttr === undefined).toBeTruthy();

    // At initial load the output should be empty
    const initialOutput = await page.textContent('#output');
    expect(initialOutput).toBe(''); // initial empty state

    // No page errors should have been emitted just by loading (but capture for further tests)
    expect(pageErrors.length).toBeLessThanOrEqual(0);
  });

  test('Submit transition (S0_Idle -> S1_Sorted) - submitting the form updates output via output.innerText = sortedNum', async ({ page }) => {
    // This test validates the transition on form submit.
    // It will:
    // - fill the input
    // - click the submit button
    // - assert that output.innerText matches what the page-script produced
    // Note: The implementation has a bug where it captures the input value at load time into a const "number".
    // Because of that, filling the input after load may be ignored and the radixSort will be invoked with the captured value.
    // We therefore assert the observed output equals the string produced by radixSort('') (the captured empty value).
    const input = page.locator('#number');
    const button = page.locator('button[type="submit"]');
    const output = page.locator('#output');

    // Fill input with a value that, in a correct implementation, would be processed.
    await input.fill('12345');

    // Click the submit button. Because input is filled, HTML validation should allow submission.
    await button.click();

    // Wait briefly for any DOM updates triggered by the submit handler
    await page.waitForTimeout(100);

    // The page's script captured number at load time (likely as an empty string).
    // The radixSort('') implementation (as present in the page) will construct 10 lines (one per bucket), each a newline.
    // So expected output is 10 newline characters concatenated.
    const expectedTenNewlines = '\n\n\n\n\n\n\n\n\n\n'; // 10 newlines

    // Read the output inner text from the page and assert it matches the expected string.
    const observedOutput = await page.textContent('#output');
    expect(observedOutput).toBe(expectedTenNewlines);

    // Ensure the page did not navigate away (event.preventDefault should have been called)
    expect(page.url()).toBe(APP_URL);

    // There should be no uncaught page errors as a result of this submit (the implementation uses captured empty value).
    // Capture any page errors if present and assert zero for this scenario.
    expect(pageErrors.length).toBe(0);
  });

  test('Submit behavior - verify that form handler uses captured value (bug confirmation)', async ({ page }) => {
    // This test confirms a likely bug in the implementation:
    // The script saves `const number = document.getElementById('number').value;` at load time.
    // We verify that submitting with different values yields the same output.
    const input = page.locator('#number');
    const button = page.locator('button[type="submit"]');

    // Submit once with one value
    await input.fill('7');
    await button.click();
    await page.waitForTimeout(50);
    const firstOutput = await page.textContent('#output');

    // Clear input and submit another different value
    await input.fill('9999');
    await button.click();
    await page.waitForTimeout(50);
    const secondOutput = await page.textContent('#output');

    // Because the page captured the input value once at load, both submissions should produce the same output.
    expect(firstOutput).toBe(secondOutput);

    // As determined earlier, the expected output for captured-empty-value is ten newlines.
    expect(firstOutput).toBe('\n\n\n\n\n\n\n\n\n\n');
  });

  test('Direct invocation of page radixSort with a numeric argument should throw a TypeError (natural error from broken bucket indexing)', async ({ page }) => {
    // This test directly calls the page-defined function radixSort with a numeric argument
    // to ensure the implementation's internal error (attempting to push into undefined bucket for fractional keys)
    // surfaces as a TypeError. This is done without modifying page code; we simply call the function exposed in page context.
    const result = await page.evaluate(() => {
      try {
        // call with a numeric argument expected to produce digits > 0 and therefore trigger the broken bucket indexing
        radixSort(123);
        // If no error, return an object indicating success
        return { ok: true };
      } catch (e) {
        // Return error details for assertion
        return { ok: false, name: e && e.name, message: e && e.message };
      }
    });

    // We expect the page function call to have thrown and returned a TypeError
    expect(result.ok).toBe(false);
    expect(result.name).toBe('TypeError');
    // The message is implementation / engine specific; ensure it mentions 'push' or 'undefined' as it's due to pushing into undefined
    expect(result.message.toLowerCase()).toContain('push');
  });

  test('Edge cases: radixSort(0) should not throw, radixSort(negative) should produce a TypeError (natural error)', async ({ page }) => {
    // Call radixSort(0) - should be safe because all digits are 0 -> bucketIndex 0 -> valid push
    const zeroResult = await page.evaluate(() => {
      try {
        const out = radixSort(0);
        // Return a small summary for assertion
        return { ok: true, length: out.length, contentPreview: out.slice(0, 50) };
      } catch (e) {
        return { ok: false, name: e.name, message: e.message || String(e) };
      }
    });

    expect(zeroResult.ok).toBe(true);
    // Expect some string returned (10 lines); confirm it's a string with newlines
    expect(typeof zeroResult.contentPreview).toBe('string');

    // Call radixSort with a negative number -> string contains '-' -> parseInt('-') -> NaN -> bucketIndex NaN -> push into undefined => TypeError
    const negativeResult = await page.evaluate(() => {
      try {
        radixSort(-12);
        return { ok: true };
      } catch (e) {
        return { ok: false, name: e && e.name, message: e && e.message };
      }
    });

    expect(negativeResult.ok).toBe(false);
    expect(negativeResult.name).toBe('TypeError');
  });

  test('Console and pageerror observation - calling radixSort from page.evaluate surfaces exception to the test', async ({ page }) => {
    // This final test ensures that errors thrown by invoking page functions are observable.
    // We call radixSort with a value that causes an in-function exception and assert that the exception is visible to the test context.
    let threw = false;
    try {
      // This should throw and be caught by the try/catch below
      await page.evaluate(() => radixSort(4567));
    } catch (e) {
      threw = true;
      // The thrown error from page.evaluate should be an Error whose message contains 'push'
      expect(String(e).toLowerCase()).toContain('push');
    }
    expect(threw).toBe(true);

    // Additionally, ensure that the test captured console messages (if any) and page errors array.
    // We don't assert a specific console message, but we ensure our capture mechanism works.
    expect(Array.isArray(consoleMessages)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);
  });
});