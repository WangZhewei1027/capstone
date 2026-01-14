import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/86575254-d5b2-11f0-b9b7-9552cfcdbf41.html';

test.describe('Binary Search App (86575254-d5b2-11f0-b9b7-9552cfcdbf41)', () => {
  // Per-test containers for observed console messages and page errors.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for assertions
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // detach listeners by closing the page (Playwright handles cleanup)
    await page.close();
  });

  test('Initial page load shows expected UI elements and default state', async ({ page }) => {
    // Verify page title reflects the application
    await expect(page).toHaveTitle(/Binary Search/i);

    // Verify the main input exists, is visible and has the correct placeholder
    const input = page.locator('#searchInput');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Search...');

    // Verify the Search button is visible and its text content is "Search"
    const button = page.locator('button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText(/Search/i);

    // Verify the container .box is present and contains the input & button
    const box = page.locator('.box');
    await expect(box).toBeVisible();
    await expect(box.locator('#searchInput')).toHaveCount(1);
    await expect(box.locator('button')).toHaveCount(1);
  });

  test('Typing into the input updates its value (user can enter search terms)', async ({ page }) => {
    // This test ensures the input accepts text entry and value updates accordingly
    const input = page.locator('#searchInput');

    // Type a simple value and assert the input's value matches
    await input.fill('42');
    await expect(input).toHaveValue('42');

    // Replace with special characters and assert again (edge characters)
    const special = '!@#€漢字';
    await input.fill(special);
    await expect(input).toHaveValue(special);
  });

  test('Clicking Search triggers a runtime page error when search() is not implemented', async ({ page }) => {
    // Purpose: the HTML uses onclick="search()", and if the function is not defined
    // we expect a ReferenceError (or similar) to be raised as a page error.
    // We attempt the user action (click) and wait for an uncaught pageerror event.

    // Ensure input has some value to simulate a real user flow
    await page.fill('#searchInput', '15');

    // Trigger the click and wait for a pageerror event to be emitted
    let pageError;
    try {
      // Wait for pageerror with a short timeout so test fails quickly if none occur.
      const waitForError = page.waitForEvent('pageerror', { timeout: 2000 });
      await page.click('button');
      pageError = await waitForError;
    } catch (err) {
      // If no pageerror occurred, fail the test with a helpful message.
      throw new Error('Expected a runtime error (e.g., ReferenceError for missing search function) when clicking Search, but no pageerror was observed.');
    }

    // Assert that the captured error object contains expected error characteristics.
    // The message typically contains "search is not defined" when onclick calls a missing function.
    expect(pageError).toBeTruthy();
    const msg = pageError.message || '';
    const name = pageError.name || '';

    // Accept any of ReferenceError, TypeError, SyntaxError as valid runtime errors for this case,
    // and require evidence in the message that the missing symbol "search" was referenced.
    const allowedErrorNames = ['ReferenceError', 'TypeError', 'SyntaxError'];
    const nameMatches = allowedErrorNames.includes(name);
    const messageHintsMissingSearch = /search\b/i.test(msg) || /is not defined/i.test(msg);

    expect(nameMatches || messageHintsMissingSearch).toBeTruthy();
  });

  test('Clicking Search produces a console error entry (developer console receives an error)', async ({ page }) => {
    // Purpose: ensure an error is emitted to the console when the runtime error occurs.
    // We'll wait for a console message of type "error" while clicking the button.

    // Prepare to wait for a console.error message that references the missing "search" symbol.
    const consoleErrorPromise = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'error',
      timeout: 2000,
    });

    // Perform user action that is expected to cause an error
    await page.click('button');

    // If a console error appears capture it and make assertions about it
    let consoleMessage;
    try {
      consoleMessage = await consoleErrorPromise;
    } catch (err) {
      // If no console error occurred, fail the test with details from any pageErrors captured
      const recordedPageErrors = pageErrors.map(e => `${e.name}: ${e.message}`).join('; ') || '(none)';
      throw new Error(`Expected a console.error when clicking Search, but none was observed. Page errors collected: ${recordedPageErrors}`);
    }

    // Validate the console error text includes helpful clues (missing function name or 'is not defined')
    const text = consoleMessage.text();
    expect(typeof text).toBe('string');
    const containsSearchHint = /search\b/i.test(text) || /is not defined/i.test(text) || /ReferenceError|TypeError|SyntaxError/i.test(text);
    expect(containsSearchHint).toBeTruthy();
  });

  test('Edge case: long input does not modify DOM when runtime error occurs (input preserved)', async ({ page }) => {
    // Purpose: verify that even when a runtime error occurs on click, the DOM structure remains intact
    // and the input value is preserved (no unexpected removals or replacements).

    const input = page.locator('#searchInput');
    const box = page.locator('.box');

    // Fill a very long input value to test edge conditions
    const longValue = '1'.repeat(5000);
    await input.fill(longValue);

    // Snapshot innerHTML before the click
    const beforeInnerHTML = await box.evaluate((el) => el.innerHTML);

    // Click and expect a pageerror to occur (as the app's search function is not defined)
    try {
      const waitForError = page.waitForEvent('pageerror', { timeout: 2000 });
      await page.click('button');
      await waitForError;
    } catch (err) {
      // If no error occurs, we still want to assert DOM stability — but as per test intent,
      // we expect an error. Report missing error as failure.
      throw new Error('Expected a runtime error when invoking search with a long input, but none occurred.');
    }

    // After the error, verify the DOM inside .box is unchanged (input/button still present)
    const afterInnerHTML = await box.evaluate((el) => el.innerHTML);
    expect(afterInnerHTML).toBe(beforeInnerHTML);

    // Verify the input still has the long value (no automatic clearing)
    await expect(input).toHaveValue(longValue);
  });
});