import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f7432d-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('K-Nearest Neighbors (KNN) Application - 90f7432d-d5a1-11f0-80b9-e1f86cea383f', () => {
  // Shared variables to capture runtime errors and console messages for each test
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // Initialize containers to capture page errors and console messages
    pageErrors = [];
    consoleMessages = [];

    // Listen for uncaught exceptions on the page (these should be asserted in tests)
    page.on('pageerror', (err) => {
      // Push the Error object for assertions
      pageErrors.push(err);
    });

    // Capture console output for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application page before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Nothing to teardown here beyond Playwright's automatic cleanup.
    // We keep afterEach to show clear lifecycle management.
  });

  test.describe('Initial load and structure', () => {
    test('should load the page and display main interactive elements with expected defaults', async ({ page }) => {
      // Verify the title is present
      await expect(page.locator('h2')).toHaveText('K-Nearest Neighbors (KNN) Example');

      // Verify distance input exists and has default value "5"
      const distance = page.locator('#distance');
      await expect(distance).toBeVisible();
      await expect(distance).toHaveValue('5');

      // Verify the text input exists and starts empty
      const inputField = page.locator('#input-field');
      await expect(inputField).toBeVisible();
      await expect(inputField).toHaveValue('');

      // Verify the KNN button is visible and has expected label
      const knnButton = page.locator('button.button');
      await expect(knnButton).toBeVisible();
      // The button's text content should contain 'KNN' (exact match might differ in whitespace)
      await expect(knnButton).toContainText('KNN');

      // Verify the result container exists and is initially empty
      const result = page.locator('#result');
      await expect(result).toBeVisible();
      await expect(result).toHaveText('');

      // Check for the presence (or absence) of elements with the CSS class `.input-field`.
      // Note: The implementation defines a CSS rule for `.input-field` but the input uses id="input-field",
      // so we expect zero elements with class "input-field". This asserts a likely implementation mismatch.
      const classInputFieldCount = await page.evaluate(() => document.querySelectorAll('.input-field').length);
      expect(classInputFieldCount).toBe(0);
    });
  });

  test.describe('User interactions and runtime behavior', () => {
    test('clicking the KNN button triggers the knn() function and leads to a runtime error (TypeError)', async ({ page }) => {
      // Purpose: Validate that invoking the KNN action via the button leads to uncaught JS errors given current implementation.
      // We will click the button and assert that a pageerror was emitted and it is a TypeError (assignment to constant).
      const knnButton1 = page.locator('button.button');

      // Click the KNN button and handle possible navigation (form submit). We wait briefly for navigation if it occurs.
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 2000 }).catch(() => null),
        knnButton.click()
      ]);

      // At least one uncaught page error should have been captured by the pageerror handler
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // The first error should be a TypeError due to reassigning a const in the knn() implementation.
      const firstError = pageErrors[0];
      expect(firstError).toBeInstanceOf(Error);
      // Assert the error is a TypeError (engine message may vary but .name should indicate TypeError)
      expect(firstError.name).toBe('TypeError');

      // Also assert that the message mentions reassigning a constant / assignment to constant variable
      // (We perform a case-insensitive substring match to be robust across engines.)
      const msg = firstError.message || '';
      expect(msg.toLowerCase()).toMatch(/assignment to (constant|const)|cannot assign to|assignment to constant/i);

      // Verify that the result area remains empty (the function likely threw before updating the DOM)
      await expect(page.locator('#result')).toHaveText('');
    });

    test('filling the text input and clicking KNN still results in a TypeError (runtime error preserved)', async ({ page }) => {
      // Purpose: Ensure that user-provided input values do not prevent the existing runtime error from happening.
      const input = page.locator('#input-field');
      const distance1 = page.locator('#distance1');
      const knnButton2 = page.locator('button.button');

      // Set input values
      await input.fill('10');
      await distance.fill('7');

      // Trigger the action: click the KNN button (may navigate because it's a form submit)
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 2000 }).catch(() => null),
        knnButton.click()
      ]);

      // An uncaught page error should have been captured again
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // Confirm at least one of the captured errors is a TypeError
      const hasTypeError = pageErrors.some(e => e && e.name === 'TypeError');
      expect(hasTypeError).toBeTruthy();

      // Ensure console messages were captured (even if none are errors; we at least capture zero or more)
      expect(Array.isArray(consoleMessages)).toBe(true);

      // Confirm the #result is still unchanged (no successful update due to thrown error)
      await expect(page.locator('#result')).toHaveText('');
    });

    test('changing the distance input updates its value and does not prevent the knn error when clicked', async ({ page }) => {
      // Purpose: Verify input controls respond to user input and that the runtime error is independent of the distance field.
      const distance2 = page.locator('#distance2');
      const knnButton3 = page.locator('button.button');

      // Change the distance value to a different number
      await distance.fill('12');
      await expect(distance).toHaveValue('12');

      // Click the KNN button, wait for any navigation, and assert the runtime error occurs
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load', timeout: 2000 }).catch(() => null),
        knnButton.click()
      ]);

      // Confirm that a TypeError occurred
      const hasTypeError1 = pageErrors.some(e => e && e.name === 'TypeError');
      expect(hasTypeError).toBeTruthy();
    });

    test('accessibility and focus behavior: elements are focusable in logical order', async ({ page }) => {
      // Purpose: Basic accessibility check - elements are focusable and in a usable order.
      // Focus distance input
      await page.focus('#distance');
      await expect(page.locator('#distance')).toBeFocused();

      // Tab to next control and ensure it becomes focused (input-field)
      await page.keyboard.press('Tab');
      await expect(page.locator('#input-field')).toBeFocused();

      // Tab to button
      await page.keyboard.press('Tab');
      await expect(page.locator('button.button')).toBeFocused();
    });
  });

  test.describe('Edge cases and implementation observations', () => {
    test('no elements with class ".input-field" exist which the knn() function expects to iterate over', async ({ page }) => {
      // Purpose: Detect mismatch between CSS class and actual DOM usage (implementation bug).
      const count = await page.evaluate(() => document.querySelectorAll('.input-field').length);
      // Assert zero elements exist with the class `.input-field` which the script uses via querySelectorAll('.input-field').
      expect(count).toBe(0);
    });

    test('result text color should default to the document stylesheet / not be set before knn() runs', async ({ page }) => {
      // Purpose: Ensure no inline color style is applied to the result element before interaction.
      const color = await page.evaluate(() => {
        const r = document.getElementById('result');
        return r && r.style && r.style.color ? r.style.color : '';
      });
      expect(color).toBe('');
    });
  });
});