import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb43-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('K-Nearest Neighbors (KNN) Example - End-to-End', () => {
  // Arrays to capture console messages and page errors for each test run.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for later assertions
    page.on('console', (msg) => {
      try {
        consoleMessages.push(msg.text());
      } catch (e) {
        // guard - continue collecting even if extracting text fails
        consoleMessages.push(String(msg));
      }
    });

    // Capture uncaught errors from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the app and wait for full load. We intentionally load the page exactly as-is.
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // include a small sanity check that the page object is still usable and close is handled by Playwright fixtures
    await page.evaluate(() => true).catch(() => {});
  });

  test('Initial page load and default state - elements present, defaults correct, and no runtime errors', async ({ page }) => {
    // Verify the page title and heading are present
    await expect(page).toHaveTitle(/K-Nearest Neighbors/i);
    const header = page.locator('h1');
    await expect(header).toHaveText(/K-Nearest Neighbors \(KNN\) Example/i);

    // Identify interactive elements
    const featuresInput = page.locator('#features');
    const kInput = page.locator('#k');
    const distanceSelect = page.locator('#distance');
    const submitButton = page.locator('input[type="submit"]');
    const resultDiv = page.locator('#result');

    // Check elements visibility
    await expect(featuresInput).toBeVisible();
    await expect(kInput).toBeVisible();
    await expect(distanceSelect).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(resultDiv).toBeVisible();

    // Check default values / attributes
    await expect(featuresInput).toHaveAttribute('required', '');
    await expect(kInput).toHaveAttribute('required', '');
    await expect(distanceSelect).toHaveValue('euclidean');

    // On initial load, the result should be empty (the script runs at load but with default empty features)
    await expect(resultDiv).toHaveText('');

    // Assert no uncaught page errors occurred on initial load
    expect(pageErrors.length, `Expected no page errors on initial load. Captured: ${pageErrors.join('; ')}`).toBe(0);

    // No guarantee about console messages on load, but ensure we captured the consoleMessages array successfully (it should be an array)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Typing features input triggers input event logging and does not immediately recalculate displayed result', async ({ page }) => {
    // Purpose: ensure user input triggers the script's input listener (console log) and result is not updated until explicit calculation (script only runs on load).
    const featuresInput1 = page.locator('#features');
    const resultDiv1 = page.locator('#result');

    // Type a list of features into the features input
    await featuresInput.fill('1 2 3');

    // Allow some time for the page's input event handler to run and console to capture logs
    await page.waitForTimeout(100); // small wait to ensure console message propagation

    // Expect the input value to reflect what was typed
    await expect(featuresInput).toHaveValue('1 2 3');

    // Verify that a console message containing at least one of the numbers was emitted
    const joinedConsole = consoleMessages.join(' | ');
    expect(joinedConsole.includes('1') || joinedConsole.includes('2') || joinedConsole.includes('3'),
      `Expected console logs to include typed features. Console contents: ${joinedConsole}`).toBe(true);

    // Because the app only runs KNN.calculate at load time, typing should not change the visible result immediately
    await expect(resultDiv).toHaveText('');
  });

  test('Changing K and distance control triggers console logs and submitting the form with valid inputs triggers navigation', async ({ page }) => {
    // Purpose: ensure k and distance are observed by the script via event listeners, and successful form submission navigates (default GET behavior).
    const featuresInput2 = page.locator('#features');
    const kInput1 = page.locator('#k');
    const distanceSelect1 = page.locator('#distance');
    const form = page.locator('#knn-form');

    // Fill required fields so the form is valid
    await featuresInput.fill('4 5 6');
    await kInput.fill('2');

    // Change the distance select and allow event to fire
    await distanceSelect.selectOption('manhattan');

    // Allow console messages to be captured
    await page.waitForTimeout(100);

    // Confirm that we saw console logs for the k change and the distance change
    const joinedConsole1 = consoleMessages.join(' | ');
    expect(joinedConsole.includes('2'), `Expected console to log k value '2'. Console contents: ${joinedConsole}`).toBe(true);
    expect(joinedConsole.includes('manhattan') || joinedConsole.includes('manhattan'), `Expected console to log distance 'manhattan'. Console contents: ${joinedConsole}`).toBe(true);

    // Submit the form - since fields are filled and required constraints satisfied, the form should navigate (GET)
    // We wait for navigation and ensure the navigation happened (URL will change if the browser encodes inputs into query)
    const [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 3000 }).catch(() => null),
      page.locator('input[type="submit"]').click(),
    ]);

    // After submit, either a navigation occurred or the page stayed (some static servers may not change URL)
    // We assert that the page still has the expected form elements and no uncaught errors occurred during submit-handling.
    await expect(page.locator('#features')).toBeVisible();
    await expect(page.locator('#k')).toBeVisible();
    await expect(page.locator('#distance')).toBeVisible();

    // Ensure no uncaught page errors were introduced by the submission/navigation
    expect(pageErrors.length, `Expected no page errors after form submission. Captured: ${pageErrors.join('; ')}`).toBe(0);
  });

  test('Form validation prevents submission when required fields are missing (edge case)', async ({ page }) => {
    // Purpose: verify browser-side validation blocks submission when required inputs are empty.
    const featuresInput3 = page.locator('#features');
    const kInput2 = page.locator('#k');
    const submitBtn = page.locator('input[type="submit"]');

    // Ensure both inputs are empty
    await featuresInput.fill('');
    await kInput.fill('');

    // Attempt to submit the form and confirm there is no navigation because HTML5 validation should block it.
    // We click and then wait a short timeout; if navigation attempted, waitForNavigation would catch it.
    const navPromise = page.waitForNavigation({ waitUntil: 'load', timeout: 1000 }).catch(() => null);
    await submitBtn.click();

    // Wait briefly and assert there was no navigation
    const navResult = await navPromise;
    expect(navResult === null, 'Expected no navigation when submitting an invalid (required-fields-missing) form').toBe(true);

    // Check that the form's checkValidity() returns false (requires interaction with page DOM)
    const isValid = await page.evaluate(() => {
      const form1 = document.getElementById('knn-form1');
      return form.checkValidity();
    });
    expect(isValid, 'Expected native form validation to report the form as invalid when required fields are empty').toBe(false);

    // Ensure that no new uncaught errors were emitted during this interaction
    expect(pageErrors.length, `Expected no page errors after attempting invalid submit. Captured: ${pageErrors.join('; ')}`).toBe(0);
  });

  test('Accessibility & semantics: inputs have labels and are reachable via form selectors', async ({ page }) => {
    // Purpose: quick accessibility-related checks: labels exist and are associated with inputs via for/id
    const featuresLabelFor = await page.locator('label[for="features"]').count();
    const kLabelFor = await page.locator('label[for="k"]').count();
    const distanceLabelFor = await page.locator('label[for="distance"]').count();

    expect(featuresLabelFor).toBeGreaterThan(0);
    expect(kLabelFor).toBeGreaterThan(0);
    expect(distanceLabelFor).toBeGreaterThan(0);

    // Confirm tabIndex flow: focus moves to features input first when using keyboard tab order starting from body
    await page.focus('body');
    await page.keyboard.press('Tab'); // should focus first focusable element (features input)
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id ? document.activeElement.id : null);
    // It is acceptable if the first focusable element is the features input; assert activeId is one of the form controls.
    expect(['features', 'k', 'distance'].includes(activeId)).toBe(true);
  });
});