import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad2b530-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Set App (FSM) - 8ad2b530-d59a-11f0-891d-f361d22ca68a', () => {
  // Utility to attach listeners and collect console/page errors for each test
  async function attachErrorCollectors(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      // capture console message type and text
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        // ignore serialization issues
      }
    });

    page.on('pageerror', err => {
      // capture runtime uncaught exceptions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    return { consoleMessages, pageErrors };
  }

  test.beforeEach(async ({ page }) => {
    // Ensure we start each test from a fresh load
    await page.goto('about:blank');
  });

  test('Idle state: initial DOM structure and default values are rendered', async ({ page }) => {
    // This verifies the S0_Idle state as described in the FSM:
    // - h1 "Set" is present
    // - input#number exists and has default value "5"
    // - submit button exists
    // - there is no .text display element initially
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    // Validate heading
    const heading = await page.locator('h1');
    await expect(heading).toHaveText('Set');

    // Validate input exists, type=number, value=5
    const numberInput = page.locator('input#number');
    await expect(numberInput).toBeVisible();
    await expect(numberInput).toHaveAttribute('type', 'number');
    await expect(numberInput).toHaveValue('5');

    // Validate button exists and has text "Set"
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('Set');

    // Validate there's no element with class .text as per the provided HTML (it's missing)
    const displayTextExists = await page.locator('.set-container .text').count();
    expect(displayTextExists).toBe(0);

    // Validate global setNumber initial value is 0 (as declared in script)
    const setNumber = await page.evaluate(() => window.setNumber);
    expect(setNumber).toBe(0);

    // There should be no runtime page errors on initial load (renderPage() was in FSM but not invoked -> no ReferenceError)
    // We assert that no page errors reference missing renderPage
    expect(pageErrors.length).toBe(0);

    // Also expect no console.error messages on load
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Transition S0_Idle -> S1_Set: clicking Set updates setNumber but causes runtime error due to missing display element', async ({ page }) => {
    // This test validates the transition triggered by clicking the Set button.
    // According to implementation, click handler does:
    //   setNumber = parseInt(numberInput.value);
    //   displayText.textContent = `You have set ${setNumber} sets.`;
    // But displayText is null (no .text element), so a TypeError should be thrown.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    // Change the input value to 10 to test that parseInt works before the error occurs
    const numberInput = page.locator('#number');
    await numberInput.fill('10');

    // Click the submit button. Because the button is type="submit" inside a form and the handler
    // does not preventDefault, this may trigger a navigation (form submit). We guard with a short wait
    // so the JS handler and errors have time to run.
    const submitButton = page.locator('button[type="submit"]');

    // Perform click and wait briefly to allow the handler to execute and possibly emit errors.
    await Promise.all([
      // Click; do not wait for navigation to avoid failing when navigation does not occur
      submitButton.click(),
      page.waitForTimeout(300)
    ]);

    // After the click, an error should have been recorded because displayText is null.
    // pageErrors should contain a message referencing textContent or displayText or "Cannot set"
    const combinedPageErrors = pageErrors.join(' | ');
    // There should be at least one page error
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    // The error message should indicate inability to set textContent on null or similar.
    expect(combinedPageErrors).toMatch(/textContent|Cannot set|Cannot read property|reading 'textContent'|setting 'textContent'/i);

    // Also some browsers log the exception to console.error - assert that an error console message exists too
    const errorConsole = consoleMessages.find(m => m.type === 'error' || /textContent|Cannot set|Cannot read property/i.test(m.text));
    expect(errorConsole).toBeTruthy();

    // Despite the thrown error, parseInt should have executed and set the global setNumber to 10
    const setNumberAfter = await page.evaluate(() => window.setNumber);
    expect(setNumberAfter).toBe(10);

    // Confirm that no .text element exists in DOM (the expected UI update did not occur)
    const displayTextCount = await page.locator('.set-container .text').count();
    expect(displayTextCount).toBe(0);
  });

  test('Edge case: empty input results in NaN setNumber and still triggers runtime error', async ({ page }) => {
    // This tests an edge case where the number input is empty.
    // parseInt('') => NaN, so setNumber should become NaN before the error when trying to update displayText.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    const numberInput = page.locator('#number');
    // Clear the input entirely
    await numberInput.fill('');

    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
      submitButton.click(),
      page.waitForTimeout(300)
    ]);

    // There should be a runtime error due to displayText being null
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    expect(pageErrors.join(' | ')).toMatch(/textContent|Cannot set|Cannot read property/i);

    // setNumber should now be NaN
    const isSetNumberNaN = await page.evaluate(() => Number.isNaN(window.setNumber));
    expect(isSetNumberNaN).toBe(true);

    // Confirm UI still lacks .text
    expect(await page.locator('.set-container .text').count()).toBe(0);
  });

  test('Behavior observation: clicking without changing input (default 5) triggers same runtime error and sets setNumber to 5', async ({ page }) => {
    // This verifies the default FSM flow when the user clicks Set without modifying the input.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    await page.goto(APP_URL);

    // Click the Set button immediately; default input value is "5"
    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
      submitButton.click(),
      page.waitForTimeout(300)
    ]);

    // Expect runtime error (TypeError due to missing display element)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    expect(pageErrors.join(' | ')).toMatch(/textContent|Cannot set|Cannot read property/i);

    // setNumber should now be 5
    const setNumberAfter = await page.evaluate(() => window.setNumber);
    expect(setNumberAfter).toBe(5);

    // No .text element created
    expect(await page.locator('.set-container .text').count()).toBe(0);
  });
});