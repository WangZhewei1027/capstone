import { test, expect } from '@playwright/test';

// Test file: f7689392-d5b8-11f0-9ee1-ef07bdc6053d.spec.js
// This suite validates the Recursion Demo interactive application against the FSM:
// - S0_Idle (initial): input + button + result container
// - S1_ResultDisplayed: valid numeric input -> factorial displayed
// - S2_InvalidInput: invalid/non-numeric/empty input -> invalid message
// - S3_NegativeInput: negative number -> negative-number message
//
// The tests also observe console messages and page errors (without modifying the page),
// and assert that no unexpected runtime errors occurred during interactions.

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7689392-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Simple page object to encapsulate interactions with the factorial app
class FactorialPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputNumber');
    this.button = page.locator('button[onclick="calculateFactorial()"]');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setNumber(value) {
    // Use evaluate to set .value directly to support non-numeric strings as edge cases
    await this.page.evaluate(
      ({ selector, value }) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Input element not found');
        el.value = value;
      },
      { selector: '#inputNumber', value: String(value) }
    );
  }

  async clickCalculate() {
    await this.button.click();
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  async isRenderPageDefined() {
    // Use typeof to avoid ReferenceError if renderPage is not defined
    return await this.page.evaluate(() => typeof renderPage !== 'undefined');
  }

  async clearInput() {
    await this.setNumber('');
  }
}

test.describe('Recursion Demo - FSM validation tests', () => {
  let consoleErrors;
  let pageErrors;

  // Per-test setup: create fresh arrays and attach listeners before navigation
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages only
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      try {
        pageErrors.push(err.message || String(err));
      } catch (e) {
        // ignore listener errors
      }
    });
  });

  // After each test, assert that no unexpected runtime errors were reported.
  // This ensures the page ran without uncaught exceptions or console.error messages.
  test.afterEach(async () => {
    // If there were runtime page errors, fail the test with context
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
    // If there were console.error messages, fail the test with context
    expect(consoleErrors, 'No console.error messages should be emitted').toEqual([]);
  });

  test.describe('Initial state (S0_Idle)', () => {
    test('renders input, button and empty result container on load; renderPage not required', async ({ page }) => {
      // Arrange
      const app = new FactorialPage(page);
      await app.goto();

      // Assert: input exists and is of type number
      await expect(app.input).toBeVisible();
      const type = await app.page.getAttribute('#inputNumber', 'type');
      expect(type).toBe('number');

      // Assert: button exists with correct onclick attribute
      await expect(app.button).toBeVisible();
      const onclick = await app.page.getAttribute('button[onclick="calculateFactorial()"]', 'onclick');
      // The onclick attribute should reference calculateFactorial()
      expect(onclick).toBeTruthy();

      // Assert: result container exists and is initially empty
      await expect(app.result).toBeVisible();
      const initialText = await app.getResultText();
      expect(initialText.trim()).toBe('', 'Result container should be empty on initial render');

      // Verify FSM's stated onEnter: renderPage() is not required to be present in the actual implementation.
      // We check whether a global renderPage function exists (should be undefined in this implementation).
      const hasRenderPage = await app.isRenderPageDefined();
      expect(hasRenderPage).toBe(false);
    });
  });

  test.describe('Valid inputs -> Result Displayed (S1_ResultDisplayed)', () => {
    // Valid case: 5 -> 120
    test('calculates factorial for positive integer (5 -> 120)', async ({ page }) => {
      // Arrange
      const app = new FactorialPage(page);
      await app.goto();

      // Act
      await app.setNumber('5');
      await app.clickCalculate();

      // Assert
      const text = await app.getResultText();
      expect(text.trim()).toBe('The factorial of 5 is 120.');
    });

    // Edge/base cases: 0 and 1
    test('calculates factorial for base cases (0 -> 1, 1 -> 1)', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      // 0
      await app.setNumber('0');
      await app.clickCalculate();
      let text = await app.getResultText();
      expect(text.trim()).toBe('The factorial of 0 is 1.');

      // 1
      await app.setNumber('1');
      await app.clickCalculate();
      text = await app.getResultText();
      expect(text.trim()).toBe('The factorial of 1 is 1.');
    });

    // Larger number test to ensure recursion handles multiple frames
    test('calculates factorial for a larger number (7 -> 5040)', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      await app.setNumber('7');
      await app.clickCalculate();
      const text = await app.getResultText();
      expect(text.trim()).toBe('The factorial of 7 is 5040.');
    });
  });

  test.describe('Invalid inputs -> Invalid Input state (S2_InvalidInput)', () => {
    // Empty input should be considered invalid
    test('empty input produces "Please enter a valid number."', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      // Ensure input is empty
      await app.clearInput();
      await app.clickCalculate();

      const text = await app.getResultText();
      expect(text.trim()).toBe('Please enter a valid number.');
    });

    // Non-numeric strings
    test('non-numeric input produces "Please enter a valid number."', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      // Set a non-numeric value via evaluate to bypass native number input restrictions
      await app.setNumber('abc');
      await app.clickCalculate();

      const text = await app.getResultText();
      expect(text.trim()).toBe('Please enter a valid number.');
    });

    // Decimal input behavior: parseInt should accept integer portion
    test('decimal input is parsed using parseInt (e.g., 4.9 -> 4)', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      // The implementation uses parseInt(..., 10). For 4.9 it should parse to 4 -> 24
      await app.setNumber('4.9');
      await app.clickCalculate();

      const text = await app.getResultText();
      expect(text.trim()).toBe('The factorial of 4 is 24.');
    });
  });

  test.describe('Negative inputs -> Negative Input state (S3_NegativeInput)', () => {
    test('negative number produces "Factorial does not exist for negative numbers."', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      // Although input has min=0, set value to a negative number via evaluate
      await app.setNumber('-5');
      await app.clickCalculate();

      const text = await app.getResultText();
      expect(text.trim()).toBe('Factorial does not exist for negative numbers.');
    });
  });

  test.describe('Event handling and DOM change observations', () => {
    test('clicking the button triggers update to #result (visibility and content change)', async ({ page }) => {
      const app = new FactorialPage(page);
      await app.goto();

      // Initially empty
      expect((await app.getResultText()).trim()).toBe('');

      // Perform action
      await app.setNumber('3');
      // Wait for click to mutate DOM and then assert changed content
      await Promise.all([
        page.waitForFunction(() => {
          const el = document.getElementById('result');
          return el && el.textContent && el.textContent.trim().length > 0;
        }),
        app.clickCalculate()
      ]);

      const text = await app.getResultText();
      expect(text.trim()).toBe('The factorial of 3 is 6.');
    });
  });

});