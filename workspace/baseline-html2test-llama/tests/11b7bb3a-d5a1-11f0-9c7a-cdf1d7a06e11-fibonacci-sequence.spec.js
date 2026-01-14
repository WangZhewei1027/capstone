import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3a-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Helper to compute expected Fibonacci sequence (1-indexed as the app displays)
function expectedFibonacci(terms) {
  const result = [];
  let previous = 1;
  let current = 0;
  for (let i = 0; i < terms; i++) {
    result.push(previous);
    [current, previous] = [previous, current + previous];
  }
  return result;
}

test.describe('Fibonacci Sequence App (11b7bb3a-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Set up page listeners and navigate to the app before each test
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect runtime page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // After each test ensure there are no unexpected runtime errors or console errors
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);
    // Assert no console error-level messages occurred
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.join('\n')}`).toBe(0);
  });

  // Test initial page load and default state
  test('loads the page and shows the default input and empty result', async ({ page }) => {
    // Verify page title and heading
    await expect(page.locator('h2')).toHaveText('Fibonacci Sequence');

    // Verify the input for number of terms exists and has default value 10
    const nInput = page.locator('#n');
    await expect(nInput).toBeVisible();
    await expect(nInput).toHaveValue('10');

    // The result container should be present and initially empty
    const result1 = page.locator('#fibonacci-result1');
    await expect(result).toBeVisible();
    await expect(result).toHaveText(''); // no paragraphs initially

    // The form and submit button should exist
    await expect(page.locator('#fibonacci-form')).toBeVisible();
    await expect(page.locator('text=Calculate Fibonacci')).toBeVisible();

    // Accessibility: input is associated with a label
    const label = page.locator('label[for="n"]');
    await expect(label).toHaveText('Enter the number of terms:');
  });

  // Test calculating the default 10-term Fibonacci sequence
  test('calculates and displays 10 Fibonacci terms by default', async ({ page }) => {
    // Submit the form by clicking the submit button
    await page.click('text=Calculate Fibonacci');

    // Build expected sequence and assert DOM updates
    const expected = expectedFibonacci(10);
    const paragraphs = page.locator('#fibonacci-result p');
    await expect(paragraphs).toHaveCount(10);

    for (let i = 0; i < expected.length; i++) {
      await expect(paragraphs.nth(i)).toHaveText(`Fibonacci(${i + 1}) = ${expected[i]}`);
    }
  });

  // Test calculating for small values (1 and 2)
  test('handles small n values correctly (n=1 and n=2)', async ({ page }) => {
    const nInput1 = page.locator('#n');
    const result2 = page.locator('#fibonacci-result2');

    // n = 1
    await nInput.fill('1');
    await page.click('text=Calculate Fibonacci');
    await expect(result.locator('p')).toHaveCount(1);
    await expect(result.locator('p').first()).toHaveText('Fibonacci(1) = 1');

    // n = 2 (ensure previous results are cleared)
    await nInput.fill('2');
    await page.click('text=Calculate Fibonacci');
    const paragraphs1 = result.locator('p');
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.nth(0)).toHaveText('Fibonacci(1) = 1');
    await expect(paragraphs.nth(1)).toHaveText('Fibonacci(2) = 1');
  });

  // Test that running multiple calculations clears previous results
  test('clears previous results when performing a new calculation', async ({ page }) => {
    const nInput2 = page.locator('#n');
    const result3 = page.locator('#fibonacci-result3');

    // First calculation with 5 terms
    await nInput.fill('5');
    await page.click('text=Calculate Fibonacci');
    await expect(result.locator('p')).toHaveCount(5);

    // Second calculation with 3 terms - ensures previous entries are removed
    await nInput.fill('3');
    await page.click('text=Calculate Fibonacci');
    const paragraphs2 = result.locator('p');
    await expect(paragraphs).toHaveCount(3);
    const expected1 = expectedFibonacci(3);
    for (let i = 0; i < expected.length; i++) {
      await expect(paragraphs.nth(i)).toHaveText(`Fibonacci(${i + 1}) = ${expected[i]}`);
    }
  });

  // Test edge case: n <= 0 should trigger an alert and not update results
  test('shows an alert for non-positive n values and does not update results', async ({ page }) => {
    const nInput3 = page.locator('#n');
    const result4 = page.locator('#fibonacci-result4');

    // Ensure result is empty to start
    await expect(result).toHaveText('');

    // Listen for the dialog (alert) and assert its message
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter a positive integer.');
      await dialog.dismiss();
    });

    // Fill 0 and submit
    await nInput.fill('0');
    await page.click('text=Calculate Fibonacci');

    // The result should remain empty after the alert
    await expect(result).toHaveText('');
  });

  // Test edge case: n > 10 should trigger an alert and not update results
  test('shows an alert when n is greater than 10 and does not update results', async ({ page }) => {
    const nInput4 = page.locator('#n');
    const result5 = page.locator('#fibonacci-result5');

    // Ensure result is empty to start
    await expect(result).toHaveText('');

    // Listen for the dialog (alert) and assert its message
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('The Fibonacci sequence is not defined for more than 10 terms.');
      await dialog.dismiss();
    });

    // Fill 11 and submit
    await nInput.fill('11');
    await page.click('text=Calculate Fibonacci');

    // The result should remain empty after the alert
    await expect(result).toHaveText('');
  });

  // Accessibility and interaction checks: focusing and submitting via Enter key
  test('allows focusing the input and submitting the form via Enter key', async ({ page }) => {
    const nInput5 = page.locator('#n');
    const result6 = page.locator('#fibonacci-result6');

    // Focus the input, change value to 4, and press Enter to submit the form
    await nInput.focus();
    await nInput.fill('4');
    await nInput.press('Enter');

    // The result should show 4 Fibonacci terms
    const paragraphs3 = result.locator('p');
    await expect(paragraphs).toHaveCount(4);
    const expected2 = expectedFibonacci(4);
    for (let i = 0; i < expected.length; i++) {
      await expect(paragraphs.nth(i)).toHaveText(`Fibonacci(${i + 1}) = ${expected[i]}`);
    }
  });
});