import { test, expect } from '@playwright/test';

// Page Object Model for the Fibonacci app
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c9-cd33-11f0-bdf9-b3d97e91273d.html';
    this.input = page.locator('#numTerms');
    this.generateBtn = page.locator('#generateBtn');
    this.result = page.locator('#result');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async setInput(value) {
    // Use fill to replace any existing value
    await this.input.fill(String(value));
    // blur to simulate user leaving the input
    await this.input.evaluate((el) => el.blur());
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async clickGenerate() {
    await this.generateBtn.click();
  }

  async getResultText() {
    return await this.result.textContent();
  }

  async getResultHTML() {
    return await this.result.innerHTML();
  }

  async isResultVisible() {
    return await this.result.isVisible();
  }
}

test.describe('Fibonacci Sequence Generator - UI and behavior', () => {
  // Collect console messages and page errors for each test to assert no runtime errors occur.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Utility to assert no console errors or page errors occurred during test run
  async function assertNoRuntimeErrors() {
    // Filter console messages with severity 'error'
    const consoleErrors = consoleMessages.filter((m) => {
      try {
        return typeof m.type === 'function' ? m.type() === 'error' : m.text && m.text().toLowerCase().includes('error');
      } catch {
        return false;
      }
    });

    // Compose helpful debug output if assertion fails
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Produce readable logs for debugging
      const consoles = consoleErrors.map((c) => {
        try {
          return `${c.type()}: ${c.text()}`;
        } catch {
          try {
            return String(c);
          } catch {
            return '<unserializable console message>';
          }
        }
      });
      const pageErrs = pageErrors.map((e) => (e && e.stack ? e.stack : String(e)));
      throw new Error(
        'Runtime errors detected.\nConsole errors:\n' +
          consoles.join('\n') +
          '\n\nPage errors:\n' +
          pageErrs.join('\n')
      );
    }

    // If none, assert arrays are empty
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  }

  test('Initial page load shows correct static UI elements and default state', async ({ page }) => {
    // Purpose: Verify the document loads, static elements exist, and default values are set.
    const app = new FibonacciPage(page);
    await app.goto();

    // Basic static element checks
    await expect(app.heading).toBeVisible();
    await expect(app.heading).toHaveText('Fibonacci Sequence Generator');

    // Input: default value 10, min and max attributes present
    await expect(app.input).toBeVisible();
    const val = await app.getInputValue();
    expect(val).toBe('10');

    // Check attributes min and max
    const min = await app.input.getAttribute('min');
    const max = await app.input.getAttribute('max');
    expect(min).toBe('1');
    expect(max).toBe('100');

    // Button visible and enabled
    await expect(app.generateBtn).toBeVisible();
    await expect(app.generateBtn).toBeEnabled();

    // Result container exists and is initially empty
    await expect(app.result).toBeVisible();
    const resultText = (await app.getResultText()) || '';
    // Allow whitespace, but expect no Fibonacci output yet
    expect(resultText.trim()).toBe('');

    // Check accessibility attribute on result container
    const ariaLive = await app.result.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');

    // Assert no runtime JS errors or console error messages occurred during load
    await assertNoRuntimeErrors();
  });

  test('Generating default Fibonacci (10 terms) produces correct sequence and formatting', async ({ page }) => {
    // Purpose: Validate main happy path for default input
    const app1 = new FibonacciPage(page);
    await app.goto();

    await app.clickGenerate();

    // Expected sequence for 10 terms
    const expected = 'Fibonacci sequence (10 terms):\n0, 1, 1, 2, 3, 5, 8, 13, 21, 34';
    const resultText1 = await app.getResultText();
    expect(resultText.replace(/\r/g, '')).toBe(expected);

    // Ensure no error styling/class is present in HTML
    const resultHTML = await app.getResultHTML();
    expect(resultHTML).not.toContain('class="error"');

    // Assert no runtime errors logged
    await assertNoRuntimeErrors();
  });

  test('Generating 1 term returns single "0" and correct header', async ({ page }) => {
    // Purpose: Edge case where n = 1
    const app2 = new FibonacciPage(page);
    await app.goto();

    await app.setInput(1);
    await app.clickGenerate();

    const expected1 = 'Fibonacci sequence (1 terms):\n0';
    const resultText2 = await app.getResultText();
    expect(resultText.replace(/\r/g, '')).toBe(expected);

    // Assert no runtime errors logged
    await assertNoRuntimeErrors();
  });

  test('Generating 2 terms returns "0, 1"', async ({ page }) => {
    // Purpose: Edge case n = 2
    const app3 = new FibonacciPage(page);
    await app.goto();

    await app.setInput(2);
    await app.clickGenerate();

    const expected2 = 'Fibonacci sequence (2 terms):\n0, 1';
    const resultText3 = await app.getResultText();
    expect(resultText.replace(/\r/g, '')).toBe(expected);

    await assertNoRuntimeErrors();
  });

  test('Decimal input "3.9" is parsed as integer 3 (parseInt behavior) and produces 3 terms', async ({ page }) => {
    // Purpose: Verify that non-integer numeric strings are handled via parseInt
    const app4 = new FibonacciPage(page);
    await app.goto();

    await app.setInput('3.9');
    await app.clickGenerate();

    // parseInt('3.9', 10) === 3
    const expected3 = 'Fibonacci sequence (3 terms):\n0, 1, 1';
    const resultText4 = await app.getResultText();
    expect(resultText.replace(/\r/g, '')).toBe(expected);

    await assertNoRuntimeErrors();
  });

  test('Invalid inputs (0, 101, empty, negative, non-numeric) show error message and error styling', async ({ page }) => {
    // Purpose: Test validation error handling for multiple invalid inputs.
    const app5 = new FibonacciPage(page);
    await app.goto();

    // Helper to test a single invalid input
    const testInvalid = async (inputValue) => {
      await app.setInput(inputValue);
      await app.clickGenerate();

      // The implementation uses innerHTML with a span.error when invalid
      const html = await app.getResultHTML();
      expect(html).toContain('class="error"');
      expect(html).toContain('Please enter a valid number between 1 and 100.');

      // Clear input for next iteration
      await app.setInput('');
    };

    // Test 0 (too small)
    await testInvalid('0');

    // Test 101 (too large)
    await testInvalid('101');

    // Test empty (non-numeric)
    await testInvalid('');

    // Test negative
    await testInvalid('-5');

    // Test text
    await testInvalid('banana');

    await assertNoRuntimeErrors();
  });

  test('Large but valid input (20) returns correct length and first/last terms', async ({ page }) => {
    // Purpose: Validate behavior for larger, valid counts and ensure performance for moderate sizes.
    const app6 = new FibonacciPage(page);
    await app.goto();

    await app.setInput(20);
    await app.clickGenerate();

    const resultText5 = (await app.getResultText()) || '';
    // Ensure it begins with header mentioning 20 terms
    expect(resultText).toContain('Fibonacci sequence (20 terms):');

    // Extract the sequence portion and split into numbers
    const sequencePart = resultText.split(':\n')[1];
    expect(sequencePart).toBeTruthy();

    const numbers = sequencePart.split(',').map((s) => Number(s.trim()));
    expect(numbers.length).toBe(20);

    // Check first and last values for correctness
    expect(numbers[0]).toBe(0);
    expect(numbers[1]).toBe(1);
    // Last few terms (verify last equals sum of previous two)
    const last = numbers[numbers.length - 1];
    const secondLast = numbers[numbers.length - 2];
    const thirdLast = numbers[numbers.length - 3];
    expect(last).toBe(secondLast + thirdLast);

    await assertNoRuntimeErrors();
  });

  test('Generate button is keyboard accessible and can be focused and activated', async ({ page }) => {
    // Purpose: Accessibility test - ensure the button is focusable and operable via keyboard
    const app7 = new FibonacciPage(page);
    await app.goto();

    // Focus the input, tab to the button, and press Enter to activate
    await app.input.focus();
    await page.keyboard.press('Tab');
    // Now the generate button should be focused
    await expect(app.generateBtn).toBeFocused();

    // Press Enter to trigger click
    await page.keyboard.press('Enter');

    // Expect default generation to have happened (default value is 10)
    const resultText6 = await app.getResultText();
    expect(resultText).toContain('Fibonacci sequence (10 terms):');

    await assertNoRuntimeErrors();
  });
});