import { test, expect } from '@playwright/test';

// Test file: e03a4769-cd32-11f0-a949-f901cf5609c9-fibonacci-sequence.spec.js
// Purpose: End-to-end tests for the Fibonacci Sequence Demo HTML application.
// Notes: Tests load the page as-is, observe console and page errors, and assert application behavior.
// The page under test is served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4769-cd32-11f0-a949-f901cf5609c9.html

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a4769-cd32-11f0-a949-f901cf5609c9.html';

test.describe('Fibonacci Sequence Generator - e03a4769-cd32-11f0-a949-f901cf5609c9', () => {
  // Arrays to collect console errors and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Page object representing the Fibonacci app page
  class FibonacciPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
      this.page = page;
      this.input = page.locator('#num');
      this.generateBtn = page.locator('#generateBtn');
      this.output = page.locator('#output');
    }

    // Navigate to the page and wait for initial rendering to complete
    async goto() {
      await this.page.goto(APP_URL);
      // Wait for the output container to be present and contain some text
      await expect(this.output).toBeVisible();
      // The page triggers a default generation on load; wait for the output to include "First"
      await this.page.waitForFunction(el => el.textContent && el.textContent.trim().length > 0, this.output);
    }

    // Fill the input and click generate; wait for output to update
    async generate(value) {
      // Fill the input - for number inputs, fill works with strings
      await this.input.fill(String(value));
      await this.generateBtn.click();
      // Wait until output text updates to reflect the requested number (or error message)
      await this.page.waitForTimeout(50); // small delay to allow DOM update
      // Ensure the output element has some content after clicking generate
      await expect(this.output).toBeVisible();
    }

    // Helper to get output text content
    async getOutputText() {
      return (await this.output.textContent()) || '';
    }

    // Helper to get current input value
    async getInputValue() {
      return (await this.input.inputValue());
    }
  }

  // Setup: run before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Teardown: run after each test - assert there were no console or page errors
  test.afterEach(async () => {
    // Assert there were no console error messages emitted during the test
    expect(consoleErrors, `No console.error messages should be emitted`).toEqual([]);
    // Assert there were no uncaught page errors
    expect(pageErrors, `No uncaught page errors should occur`).toEqual([]);
  });

  test.describe('Initial load and default behavior', () => {
    test('should load the page and generate the default 10-term Fibonacci sequence', async ({ page }) => {
      // Purpose: Verify default generation on load produces 10 terms and expected content
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Input default value should be "10"
      const inputVal = await fib.getInputValue();
      expect(inputVal).toBe('10');

      // Output should include a heading line referencing 10 terms (plural)
      const outputText = await fib.getOutputText();
      expect(outputText).toContain('First 10 terms of the Fibonacci sequence:');

      // Verify presence of first and last expected terms for n=10
      expect(outputText).toContain('Term 1: 0');
      expect(outputText).toContain('Term 10: 34');

      // Accessibility: output uses aria-live polite
      const ariaLive = await page.locator('#output').getAttribute('aria-live');
      expect(ariaLive).toBe('polite');
    });
  });

  test.describe('Valid input interactions', () => {
    test('generating 1 term displays singular wording and only term 1', async ({ page }) => {
      // Purpose: Validate singular/plural grammar and that only one term is shown
      const fib1 = new FibonacciPage(page);
      await fib.goto();

      await fib.generate(1);
      const out = await fib.getOutputText();

      // Should use singular "term"
      expect(out).toContain('First 1 term of the Fibonacci sequence:');

      // Should show only Term 1 and not Term 2
      expect(out).toContain('Term 1: 0');
      expect(out).not.toContain('Term 2:');
    });

    test('non-integer input like 5.7 is parsed as 5 and displays 5 terms', async ({ page }) => {
      // Purpose: Ensure parseInt behavior is used and decimals are truncated
      const fib2 = new FibonacciPage(page);
      await fib.goto();

      await fib.generate('5.7');
      const out1 = await fib.getOutputText();

      expect(out).toContain('First 5 terms of the Fibonacci sequence:');
      // Verify Term 5 which is 3 in sequence 0,1,1,2,3
      expect(out).toContain('Term 5: 3');
      // Ensure Term 6 is not present
      expect(out).not.toContain('Term 6:');
    });

    test('generating 100 terms succeeds and output includes Term 100', async ({ page }) => {
      // Purpose: Check upper boundary accepted (100) and that the output includes a Term 100 line
      const fib3 = new FibonacciPage(page);
      await fib.goto();

      await fib.generate(100);
      const out2 = await fib.getOutputText();

      // It should declare 100 terms
      expect(out).toContain('First 100 terms of the Fibonacci sequence:');

      // Should include a line for Term 100 (value may be large; do not assert exact numeric value)
      expect(out).toContain('Term 100:');
    });
  });

  test.describe('Invalid input handling and edge cases', () => {
    test('input of 0 shows validation error message', async ({ page }) => {
      // Purpose: Validate that n=0 is rejected with a clear message
      const fib4 = new FibonacciPage(page);
      await fib.goto();

      await fib.generate(0);
      const out3 = await fib.getOutputText();

      expect(out).toBe('Please enter a valid number between 1 and 100.');
    });

    test('input greater than 100 shows validation error message', async ({ page }) => {
      // Purpose: Validate that values above max are rejected
      const fib5 = new FibonacciPage(page);
      await fib.goto();

      await fib.generate(101);
      const out4 = await fib.getOutputText();

      expect(out).toBe('Please enter a valid number between 1 and 100.');
    });

    test('non-numeric input shows validation error message', async ({ page }) => {
      // Purpose: Ensure non-numeric entries lead to validation error
      const fib6 = new FibonacciPage(page);
      await fib.goto();

      // Fill with a string that parseInt will produce NaN
      await fib.generate('not-a-number');
      const out5 = await fib.getOutputText();

      expect(out).toBe('Please enter a valid number between 1 and 100.');
    });
  });

  test.describe('DOM updates and visual feedback', () => {
    test('output element updates textContent when generating new sequence', async ({ page }) => {
      // Purpose: Validate that subsequent clicks update the output DOM node
      const fib7 = new FibonacciPage(page);
      await fib.goto();

      // Generate 4 terms
      await fib.generate(4);
      const out1 = await fib.getOutputText();
      expect(out1).toContain('First 4 terms of the Fibonacci sequence:');
      expect(out1).toContain('Term 4: 2');

      // Generate 7 terms
      await fib.generate(7);
      const out2 = await fib.getOutputText();
      expect(out2).toContain('First 7 terms of the Fibonacci sequence:');
      expect(out2).toContain('Term 7: 8');

      // Confirm that the output actually changed between the two generations
      expect(out2).not.toBe(out1);
    });

    test('generate button is visible and clickable', async ({ page }) => {
      // Purpose: Basic visibility and interactivity check for the button
      const fib8 = new FibonacciPage(page);
      await fib.goto();

      await expect(fib.generateBtn).toBeVisible();
      await expect(fib.generateBtn).toBeEnabled();

      // Clicking the button without changing the input should not throw and should update output
      const before = await fib.getOutputText();
      await fib.generateBtn.click();
      // Small wait for DOM update
      await page.waitForTimeout(50);
      const after = await fib.getOutputText();
      expect(after).toBeTruthy();
      // After clicking the button, output should still be present
      expect(after.length).toBeGreaterThan(0);
    });
  });
});