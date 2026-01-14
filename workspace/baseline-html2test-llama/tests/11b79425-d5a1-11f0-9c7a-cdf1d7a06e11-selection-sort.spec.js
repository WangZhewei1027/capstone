import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b79425-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Selection Sort Application - 11b79425-d5a1-11f0-9c7a-cdf1d7a06e11', () => {
  // Arrays to capture console messages and page errors for each test.
  let consoleMessages;
  let pageErrors;

  // Set up a fresh page for each test and attach listeners to observe console and errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (log, error, warning, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      // Save the message string for assertions
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Navigate to the application page and wait for load.
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure we captured arrays (helps debugging if a test leaves them undefined)
    expect(Array.isArray(consoleMessages)).toBeTruthy();
    expect(Array.isArray(pageErrors)).toBeTruthy();
  });

  test('Initial page load displays title, form, and expected elements', async ({ page }) => {
    // Purpose: Verify that the main static elements are present on initial load.
    // Check the page title and heading
    await expect(page).toHaveTitle(/Selection Sort/);
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Selection Sort');

    // There should be a form with id "sort-form" and an input and a submit button
    const form = page.locator('#sort-form');
    await expect(form).toBeVisible();

    const input = page.locator('input#numbers').first();
    await expect(input).toBeVisible();

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('Sort');

    // Detect duplicate IDs: the implementation uses id="numbers" on both an input and a div.
    // We expect at least two elements with id="numbers" due to the duplicated id bug in the HTML.
    const elementsWithIdNumbers = await page.$$('[id="numbers"]');
    expect(elementsWithIdNumbers.length).toBeGreaterThanOrEqual(2);

    // The result div should exist and initially be empty (no sorting output yet)
    const resultText = await page.locator('#result').textContent();
    expect(resultText).toBeTruthy();
    // trimmed should be empty string or only whitespace/newline because nothing has run
    expect(resultText.trim()).toBe('');
    
    // Confirm that there were no uncaught page errors during initial load
    expect(pageErrors.length, `Unexpected page errors during load: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('document.getElementById("numbers") returns the first matching element (input) when duplicate IDs exist', async ({ page }) => {
    // Purpose: Verify the DOM behavior when duplicate IDs exist and show what getElementById returns.
    const tagName = await page.evaluate(() => {
      const el = document.getElementById('numbers');
      return el ? el.tagName : null;
    });
    // The first element with id 'numbers' in the HTML is the input element, so the tag name should be INPUT.
    expect(tagName).toBe('INPUT');

    // Also ensure there really is a second element with the same id and that its tag differs (DIV).
    const tags = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[id="numbers"]')).map(e => e.tagName);
    });
    // Expect the array to include both INPUT and DIV
    expect(tags).toEqual(expect.arrayContaining(['INPUT', 'DIV']));

    // No unexpected runtime errors should have occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Submitting the form triggers a page reload and does not produce sorting output (implementation reads initial input only)', async ({ page }) => {
    // Purpose: Test user interaction: fill the input and submit. The implementation reads the input
    // only once at load time, so typing before submit should not change the internal numbers array.
    // Also, the form submit handler does not prevent default, so we expect a navigation/reload.

    // Fill input with values that would sort if the implementation re-read them
    const input1 = page.locator('input1#numbers').first();
    await input.fill('3 1 2');

    // Prepare to wait for navigation caused by form submission (reload)
    const [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }).catch(() => null),
      page.locator('#sort-form button[type="submit"]').click(),
    ]);

    // After the navigation/reload, the page should still be the same app (title check)
    await expect(page).toHaveTitle(/Selection Sort/);

    // Check the result output: according to the implementation, the internal "numbers" array
    // was set at initial load (likely to [0] from empty input), so submission should not produce sorted output.
    const resultTextAfter = await page.locator('#result').textContent();
    expect(resultTextAfter.trim()).toBe('');

    // Check console messages captured during the process: there should be no 'Swapped' logs,
    // because the code will only log swaps if the internal initial array had multiple elements to swap.
    const swappedLogs = consoleMessages.filter(m => /Swapped/.test(m.text));
    expect(swappedLogs.length).toBe(0);

    // Confirm that no uncaught page errors occurred during submit/navigation
    expect(pageErrors.length, `Unexpected page errors during submit/navigation: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Submitting without modifying input (empty input => internal numbers likely [0]) results in no swaps', async ({ page }) => {
    // Purpose: With the input initially empty, the script constructs numbers from the empty string.
    // Number('') === 0, so the internal array is likely [0]. Sorting that does nothing and should not produce output.
    // We submit the form without typing anything.
    const submit = page.locator('#sort-form button[type="submit"]');

    // Wait for navigation/reload on submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }).catch(() => null),
      submit.click(),
    ]);

    // After reload, verify result area is still empty
    const resultText1 = await page.locator('#result').textContent();
    expect(resultText.trim()).toBe('');

    // No console 'error' messages should have been emitted
    const errorLogs = consoleMessages.filter(m => m.type === 'error');
    expect(errorLogs.length).toBe(0);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Console and pageerror listener behavior: capture any runtime errors or logs during interactions', async ({ page }) => {
    // Purpose: This test intentionally observes console and page errors during a few user interactions.
    // We will perform a small interaction cycle and then assert what has (or has not) happened.

    // Click the input to focus and type some garbage text
    const input2 = page.locator('input2#numbers').first();
    await input.click();
    await input.fill('abc def');

    // Submit the form and wait for reload
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }).catch(() => null),
      page.locator('#sort-form button[type="submit"]').click(),
    ]);

    // After reload, inspect captured console messages and page errors.
    // The implementation uses Number(...) so Number('abc') returns NaN; mapping may produce NaN entries.
    // However, this should not necessarily produce runtime exceptions (TypeError/ReferenceError), so we assert there are no uncaught page errors.
    expect(pageErrors.length).toBe(0);

    // Verify that no console messages of type 'error' were emitted during these interactions.
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // If there were any general logs, they are captured — ensure they do not contain 'ReferenceError' or 'TypeError' strings
    const errorTextLogs = consoleMessages.filter(m => /ReferenceError|TypeError|SyntaxError/.test(m.text));
    expect(errorTextLogs.length).toBe(0);
  });
});