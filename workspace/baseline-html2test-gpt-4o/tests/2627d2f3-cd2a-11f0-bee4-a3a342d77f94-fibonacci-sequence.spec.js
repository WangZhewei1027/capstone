import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f3-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Fibonacci Sequence Generator (App ID: 2627d2f3-cd2a-11f0-bee4-a3a342d77f94)', () => {
  // Arrays to capture runtime console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];

  // Helper: compute Fibonacci sequence for assertions
  const computeFibonacci = (n) => {
    const sequence = [];
    let a = 0, b = 1, c;
    for (let i = 1; i <= n; i++) {
      sequence.push(a);
      c = a + b;
      a = b;
      b = c;
    }
    return sequence;
  };

  test.beforeEach(async ({ page }) => {
    // Reset message collectors before each test
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors emitted by the page
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      // err is an Error object; capture its message for assertions
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page exactly as provided
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Initial load: UI elements present and default input value is 10', async ({ page }) => {
    // Verify page title matches the document title
    await expect(page).toHaveTitle(/Fibonacci Sequence/);

    // The label for the input should exist and be associated with the input via for/id
    const label = page.locator('label[for="number"]');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('Enter the number of terms:');

    // The numeric input should exist, be visible, and have default value "10"
    const input = page.locator('#number');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('10');

    // The generate button should exist and be enabled
    const button = page.locator('button');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toHaveText(/Generate Sequence/);

    // The output div should exist and be empty initially
    const output = page.locator('#output');
    await expect(output).toBeVisible();
    await expect(output).toHaveText('', { timeout: 1000 });

    // Assert that no runtime page errors occurred during initial load
    expect(pageErrors.length, `Expected no page errors on initial load, but got: ${pageErrors.join(' | ')}`).toBe(0);

    // Assert console has no error-level messages
    const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleEntries.length, `Expected no console.error messages on initial load`).toBe(0);
  });

  // Test generating the default 10-term Fibonacci sequence
  test('Generate default 10-term Fibonacci sequence and verify output content', async ({ page }) => {
    const output = page.locator('#output');
    const button = page.locator('button');

    // Click the generate button (uses inline onclick handler in the page)
    await button.click();

    // Compute expected sequence for 10 terms
    const expected = computeFibonacci(10).join(', ');

    // The output contains a <strong> label followed by the sequence text
    await expect(output).toContainText('Fibonacci Sequence:');
    await expect(output).toHaveText(new RegExp(`Fibonacci Sequence:\\s*${expected}`));

    // Validate the exact textContent (strip extra whitespace around)
    const text = (await output.innerText()).trim();
    expect(text).toBe(`Fibonacci Sequence: ${expected}`);

    // Ensure no page errors or console.error occurred during the generation
    expect(pageErrors.length, `Expected no page errors after generating default sequence`).toBe(0);
    const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleEntries.length, 'Expected no console.error messages after generating default sequence').toBe(0);
  });

  // Test various input edge cases and transitions
  test.describe('Edge cases and input variations', () => {
    test('Generate sequence for single term (n = 1)', async ({ page }) => {
      const input = page.locator('#number');
      const button = page.locator('button');
      const output = page.locator('#output');

      // Set input to 1 and generate
      await input.fill('1');
      await button.click();

      await expect(output).toHaveText('Fibonacci Sequence: 0');

      // No runtime errors expected
      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Generate sequence for two terms (n = 2)', async ({ page }) => {
      const input = page.locator('#number');
      const button = page.locator('button');
      const output = page.locator('#output');

      await input.fill('2');
      await button.click();

      await expect(output).toHaveText('Fibonacci Sequence: 0, 1');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Generate empty sequence for zero terms (n = 0)', async ({ page }) => {
      const input = page.locator('#number');
      const button = page.locator('button');
      const output = page.locator('#output');

      // Set to 0 and generate: code will produce an empty sequence (no numbers after label)
      await input.fill('0');
      await button.click();

      // Output should still display the label but no numbers after it
      const html = await output.innerHTML();
      // Ensure the strong label is present
      expect(html).toContain('<strong>Fibonacci Sequence:</strong>');
      // Ensure there is nothing (or only whitespace) after the label
      const afterLabel = html.replace(/<\/?strong>|\s/g, '').replace('FibonacciSequence:', '');
      expect(afterLabel).toBe('');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Non-integer input uses parseInt behavior (e.g., 5.7 -> treated as 5)', async ({ page }) => {
      const input = page.locator('#number');
      const button = page.locator('button');
      const output = page.locator('#output');

      await input.fill('5.7');
      await button.click();

      // parseInt('5.7') === 5, so sequence length should be 5
      const expected = computeFibonacci(5).join(', ');
      await expect(output).toHaveText(`Fibonacci Sequence: ${expected}`);

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });

    test('Empty input results in empty sequence (parseInt("") => NaN)', async ({ page }) => {
      const input = page.locator('#number');
      const button = page.locator('button');
      const output = page.locator('#output');

      // Clear input to empty and generate
      await input.fill('');
      await button.click();

      // Since parseInt('') is NaN, the code's loop will not run and output will have no numbers
      const html = await output.innerHTML();
      expect(html).toContain('<strong>Fibonacci Sequence:</strong>');
      const afterLabel = html.replace(/<\/?strong>|\s/g, '').replace('FibonacciSequence:', '');
      expect(afterLabel).toBe('');

      expect(pageErrors.length).toBe(0);
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });
  });

  // Test larger input for performance and correctness of number of terms
  test('Generate a larger sequence (n = 50) and validate length and boundary values', async ({ page }) => {
    const input = page.locator('#number');
    const button = page.locator('button');
    const output = page.locator('#output');

    await input.fill('50');
    await button.click();

    // Compute expected sequence and validate
    const expectedSequence = computeFibonacci(50);
    // Validate first, some middles, and last elements to ensure sequence correctness
    await expect(output).toContainText('Fibonacci Sequence:');
    const text = (await output.innerText()).trim();
    // Extract numbers after the label
    const numbersText = text.replace(/^Fibonacci Sequence:\s*/, '');
    const numbers = numbersText.split(',').map(s => s.trim()).filter(s => s !== '');
    expect(numbers.length).toBe(50);
    expect(Number(numbers[0])).toBe(expectedSequence[0]); // 0
    expect(Number(numbers[1])).toBe(expectedSequence[1]); // 1
    expect(Number(numbers[9])).toBe(expectedSequence[9]); // 34 (10th term)
    expect(Number(numbers[49])).toBe(expectedSequence[49]); // last term of 50-term sequence

    // Ensure there were no page errors or console error messages during the operation
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  // Accessibility and basic ARIA checks where relevant
  test('Accessibility: label is associated with input and button is reachable', async ({ page }) => {
    // Ensure the label's for attribute matches the input id
    const labelFor = await page.locator('label[for="number"]').getAttribute('for');
    expect(labelFor).toBe('number');

    // Ensure input's accessible name can be queried via label text
    // Playwright's getByLabel is available; use it to ensure the input is discoverable by its label
    const inputByLabel = page.getByLabel('Enter the number of terms:');
    await expect(inputByLabel).toBeVisible();
    await expect(inputByLabel).toHaveAttribute('id', 'number');

    // Ensure the generate button is focusable (tabindex default) by focusing and asserting focus
    const button = page.locator('button');
    await button.focus();
    await expect(button).toBeFocused();

    // No errors expected
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    // Final safety checks after each test: assert no uncaught page errors were emitted
    // If any page error exists, fail the test and include messages for debugging
    if (pageErrors.length > 0) {
      // Make the failure explicit with a helpful message (the expect will fail)
      expect(pageErrors, `Unexpected page errors emitted: ${pageErrors.join(' | ')}`).toHaveLength(0);
    }

    // Also assert no console error-level messages
    const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
    if (errorConsoleEntries.length > 0) {
      const texts = errorConsoleEntries.map(e => e.text).join(' | ');
      expect(errorConsoleEntries, `Unexpected console.error messages: ${texts}`).toHaveLength(0);
    }

    // Close page to ensure a clean slate for subsequent tests (Playwright's fixtures handle this,
    // but explicit close is harmless and ensures we don't keep listeners active if reusing contexts)
    try {
      await page.close();
    } catch (e) {
      // ignore errors closing page as Playwright's test runner will manage cleanup
    }
  });
});