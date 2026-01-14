import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf5-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Merge Sort interactive app (90f6cdf5-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Collects page errors and console error messages for assertions
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught exceptions from the page
    page.on('pageerror', err => {
      // Save the Error object for inspection in tests
      pageErrors.push(err);
    });

    // Capture console messages of type 'error' so we can assert they occurred
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Navigate to the app; listeners are attached before load so errors during initial script execution are captured
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test('Initial page load - UI elements present and basic structure', async ({ page }) => {
    // Ensure main heading is visible and correct
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Merge Sort');

    // Ensure the form, input, button and result container exist
    const form = page.locator('#mergeSortForm');
    const input = page.locator('#array');
    const submitButton = page.locator('#mergeSortForm button[type="submit"]');
    const resultDiv = page.locator('#result');

    await expect(form).toBeVisible();
    await expect(input).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await expect(resultDiv).toBeVisible();

    // The input should initially be empty
    await expect(input).toHaveValue('');

    // Because the page's inline script is expected to throw runtime errors (per implementation),
    // assert that one or more page errors or console errors were captured during initial load.
    expect(pageErrors.length + consoleErrors.length).toBeGreaterThan(0);

    // At least one error message should indicate a runtime problem stemming from incorrect usage
    // of array operations in the inline script. We check for keywords commonly present in such errors.
    const errorTexts = pageErrors.map(e => (e && e.message) || '').concat(consoleErrors.map(c => c.text()));
    const combined = errorTexts.join(' | ');
    expect(combined).toMatch(/slice|is not a function|Assignment to constant|TypeError/);

    // Because the script likely failed before updating the result div, ensure it does not contain
    // a successful "Sorted array:" message (the app's success path).
    const resultText = await resultDiv.innerText();
    expect(resultText).not.toContain('Sorted array');
  });

  test('Label is associated with input and focuses it when clicked (accessibility check)', async ({ page }) => {
    // Clicking the label should focus the input (label has for="array")
    const label = page.locator('label[for="array"]');
    const input1 = page.locator('#array');

    await expect(label).toBeVisible();
    await label.click();

    // Evaluate activeElement id
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(activeId).toBe('array');

    // No modification of page state expected; still assert that runtime errors were captured on load
    expect(pageErrors.length + consoleErrors.length).toBeGreaterThan(0);
  });

  test('Submitting the form triggers a navigation (GET) and re-executes inline script producing runtime errors', async ({ page }) => {
    const input2 = page.locator('#array');
    const submitButton1 = page.locator('#mergeSortForm button[type="submit"]');

    // Fill the input with a comma-separated list. Note: the inline script uses parseInt on the input value,
    // so this will not produce a valid array for the script, and the script is expected to error again.
    await input.fill('3,1,2');

    // Prepare to capture errors occurring during the navigation triggered by the form submit.
    const errorsBefore = pageErrors.length + consoleErrors.length;

    // Submit the form - default behavior is GET to same URL which causes a navigation.
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      submitButton.click()
    ]);

    // After navigation, new runtime errors from the inline script should have been captured.
    const errorsAfter = pageErrors.length + consoleErrors.length;
    expect(errorsAfter).toBeGreaterThanOrEqual(errorsBefore + 1);

    // The URL should now include a query parameter 'array=' as a result of the GET form submission.
    const url = page.url();
    expect(url).toContain('?array=');

    // The result div should again not display a successful "Sorted array:" message because the script
    // still contains logic errors and will not reach the DOM update.
    const resultText1 = await page.locator('#result').innerText();
    expect(resultText).not.toContain('Sorted array');

    // Confirm that the new errors contain expected keywords indicating the nature of the runtime failure
    const newErrorTexts = pageErrors.map(e => (e && e.message) || '').concat(consoleErrors.map(c => c.text()));
    const combined1 = newErrorTexts.join(' | ');
    expect(combined).toMatch(/slice|is not a function|Assignment to constant|TypeError/);
  });

  test('Attempt to click Sort without providing input still results in runtime errors (edge case)', async ({ page }) => {
    // Ensure input is empty
    const input3 = page.locator('#array');
    await expect(input).toHaveValue('');

    // Track current number of errors
    const prevErrorCount = pageErrors.length + consoleErrors.length;

    // Clicking the submit button will trigger navigation (form GET) even if input empty
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }),
      page.locator('#mergeSortForm button[type="submit"]').click()
    ]);

    // New errors should be produced on reload
    const newErrorCount = pageErrors.length + consoleErrors.length;
    expect(newErrorCount).toBeGreaterThan(prevErrorCount);

    // Verify result area did not show a sorted result after this action
    const resultText2 = await page.locator('#result').innerText();
    expect(resultText).not.toContain('Sorted array');
  });

  test('Inspecting runtime error details via pageerror events - ensure meaningful diagnostics are available', async ({ page }) => {
    // There should be captured Error objects in pageErrors from initial load and possible reloads above.
    expect(pageErrors.length).toBeGreaterThan(0);

    // The first pageError should be an Error object with a message we can assert against
    const firstError = pageErrors[0];
    expect(firstError).toBeInstanceOf(Error);
    const msg = firstError.message || '';
    // The message should include typical substrings for the kinds of runtime faults in the page script.
    expect(msg).toMatch(/slice|is not a function|Assignment to constant|TypeError/);
  });
});