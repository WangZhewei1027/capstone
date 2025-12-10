import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d41-d59e-11f0-ae0b-570552a0b645.html';

// Page object to encapsulate interactions and queries for the Fibonacci app
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#fibCount');
    this.generateButton = page.getByRole('button', { name: /^Generate Sequence$/i });
    this.increaseButton = page.getByRole('button', { name: /^Show More Terms$/i });
    this.decreaseButton = page.getByRole('button', { name: /^Show Fewer Terms$/i });
    this.resetButton = page.getByRole('button', { name: /^Reset$/i });
    this.sequenceContainer = page.locator('#fibonacciSequence');
    this.fibNumberSpans = page.locator('#fibonacciSequence .fib-number');
  }

  // Navigate to the app and wait for initial generation
  async goto() {
    await this.page.goto(APP_URL);
    // Wait until the sequence container has at least one .fib-number (initial onload generation)
    await this.page.waitForSelector('#fibonacciSequence .fib-number');
  }

  // Read the numeric value from the input
  async getCountValue() {
    return (await this.input.inputValue()).toString();
  }

  // Set the input value
  async setCountValue(value) {
    await this.input.fill(String(value));
  }

  // Click the main generate button
  async clickGenerate() {
    await this.generateButton.click();
    // Wait for DOM to update: at least one fib-number
    await this.page.waitForSelector('#fibonacciSequence .fib-number');
  }

  // Click the increase control
  async clickIncrease() {
    await this.increaseButton.click();
    await this.page.waitForSelector('#fibonacciSequence .fib-number');
  }

  // Click the decrease control
  async clickDecrease() {
    await this.decreaseButton.click();
    await this.page.waitForSelector('#fibonacciSequence .fib-number');
  }

  // Click reset
  async clickReset() {
    await this.resetButton.click();
    await this.page.waitForSelector('#fibonacciSequence .fib-number');
  }

  // Get the count of displayed fibonacci number elements
  async getDisplayedCount() {
    return await this.fibNumberSpans.count();
  }

  // Get the text content of the nth fib-number (0-based index)
  async getFibNumberAt(index) {
    return await this.fibNumberSpans.nth(index).innerText();
  }

  // Get the ratio text (if present) from the container; returns null if not found
  async getRatioText() {
    const ratioLocator = this.sequenceContainer.locator('p >> text=Ratio of last two numbers');
    if (await ratioLocator.count()) {
      const text = await this.sequenceContainer.locator('p').last().innerText();
      return text;
    }
    return null;
  }

  // Get titles of all fib-number spans
  async getAllTitles() {
    const count = await this.getDisplayedCount();
    const titles = [];
    for (let i = 0; i < count; i++) {
      titles.push(await this.fibNumberSpans.nth(i).getAttribute('title'));
    }
    return titles;
  }

  // Get the innerText of the whole sequence container
  async getSequenceInnerText() {
    return await this.sequenceContainer.innerText();
  }
}

test.describe('Fibonacci Sequence App - dfd78d41-d59e-11f0-ae0b-570552a0b645', () => {
  // Collect console and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load displays default 10 Fibonacci numbers and ratio', async ({ page }) => {
    // Purpose: Verify the default state on page load (window.onload triggers generation)
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Assert no runtime page errors occurred during load
    expect(pageErrors.length, `Expected no uncaught page errors, found: ${pageErrors.length}`).toBe(0);

    // Assert there are no console messages of type 'error'
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, `Expected no console errors, found: ${errorConsole.length}`).toBe(0);

    // The default input value should be clamped to "10"
    const value = await fib.getCountValue();
    expect(value).toBe('10');

    // There should be 10 .fib-number elements
    const displayed = await fib.getDisplayedCount();
    expect(displayed).toBe(10);

    // Verify first few Fibonacci numbers and some later one
    expect(await fib.getFibNumberAt(0)).toBe('0');
    expect(await fib.getFibNumberAt(1)).toBe('1');
    expect(await fib.getFibNumberAt(2)).toBe('1');
    expect(await fib.getFibNumberAt(3)).toBe('2');
    // 10th element (index 9) should be 34
    expect(await fib.getFibNumberAt(9)).toBe('34');

    // Ratio paragraph should be present and display ratio to 6 decimal places for last two numbers (34/21)
    const ratioText = await fib.getRatioText();
    expect(ratioText).not.toBeNull();
    expect(ratioText).toContain('Ratio of last two numbers');
    // The computed ratio for 34/21 toFixed(6) === "1.619048"
    expect(ratioText).toContain('1.619048');

    // Ensure accessibility: the generate button is visible and enabled
    await expect(fib.generateButton).toBeVisible();
    await expect(fib.generateButton).toBeEnabled();
  });

  // Test generating with custom input values, including edge cases and clamping
  test.describe('Input edge cases, clamping and generate button behavior', () => {
    test('Generating with count = 1 should show single number and no ratio', async ({ page }) => {
      // Purpose: verify the app handles minimum value properly
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.setCountValue(1);
      await fib.clickGenerate();

      // When count is 1, only one .fib-number should be shown and no ratio paragraph
      expect(await fib.getDisplayedCount()).toBe(1);
      expect(await fib.getFibNumberAt(0)).toBe('0');

      const ratioText = await fib.getRatioText();
      expect(ratioText).toBeNull();
    });

    test('Generating with large input > 100 clamps to 100', async ({ page }) => {
      // Purpose: ensure the safeCount upper bound is enforced
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.setCountValue(150);
      await fib.clickGenerate();

      // The input should be replaced with "100" by generateFibonacci
      expect(await fib.getCountValue()).toBe('100');

      // The page should display 100 fibonacci number elements
      expect(await fib.getDisplayedCount()).toBe(100);
    });

    test('Generating with input 0 clamps up to 1', async ({ page }) => {
      // Purpose: ensure the safeCount lower bound is enforced
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.setCountValue(0);
      await fib.clickGenerate();

      expect(await fib.getCountValue()).toBe('1');
      expect(await fib.getDisplayedCount()).toBe(1);
    });
  });

  // Test controls: Increase, Decrease, Reset and their effects on the DOM
  test.describe('Control buttons: Increase, Decrease, Reset', () => {
    test('Increase button adds 5 terms (bounded by 100)', async ({ page }) => {
      // Purpose: verify increaseCount adds 5 and regenerates
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Start at default 10
      expect(await fib.getCountValue()).toBe('10');

      // Click increase -> 15
      await fib.clickIncrease();
      expect(await fib.getCountValue()).toBe('15');
      expect(await fib.getDisplayedCount()).toBe(15);

      // Increase repeatedly up to the upper bound without throwing errors
      for (let i = 0; i < 10; i++) {
        await fib.clickIncrease();
      }
      // Should not exceed 100
      expect(Number(await fib.getCountValue())).toBeLessThanOrEqual(100);
      expect(await fib.getDisplayedCount()).toBe(Number(await fib.getCountValue()));
    });

    test('Decrease button subtracts 5 and respects minimum of 1', async ({ page }) => {
      // Purpose: verify decreaseCount subtracts 5 and lower bound enforced
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Set to 12 then decrease twice -> 7 then 2 then another decrease -> 1
      await fib.setCountValue(12);
      await fib.clickGenerate();
      expect(await fib.getCountValue()).toBe('12');
      expect(await fib.getDisplayedCount()).toBe(12);

      await fib.clickDecrease();
      expect(await fib.getCountValue()).toBe('7');
      expect(await fib.getDisplayedCount()).toBe(7);

      await fib.clickDecrease();
      expect(await fib.getCountValue()).toBe('2');
      expect(await fib.getDisplayedCount()).toBe(2);

      await fib.clickDecrease();
      // 2-5 => min 1
      expect(await fib.getCountValue()).toBe('1');
      expect(await fib.getDisplayedCount()).toBe(1);
    });

    test('Reset button restores default 10 terms', async ({ page }) => {
      // Purpose: verify resetSequence sets count to 10 and regenerates
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.setCountValue(33);
      await fib.clickGenerate();
      expect(await fib.getCountValue()).toBe('33');
      expect(await fib.getDisplayedCount()).toBe(33);

      await fib.clickReset();
      expect(await fib.getCountValue()).toBe('10');
      expect(await fib.getDisplayedCount()).toBe(10);
    });
  });

  // Test display formatting, titles, and presence of separators (commas)
  test.describe('Display formatting and accessibility attributes', () => {
    test('Each fib-number has correct title indicating its 1-based position', async ({ page }) => {
      // Purpose: Verify titles are present and correctly numbered
      const fib = new FibonacciPage(page);
      await fib.goto();

      const count = await fib.getDisplayedCount();
      const titles = await fib.getAllTitles();
      expect(titles.length).toBe(count);

      // Verify first and last title formats
      expect(titles[0]).toBe('Fibonacci number at position 1');
      expect(titles[count - 1]).toBe(`Fibonacci number at position ${count}`);
    });

    test('Container text contains comma separators between numbers', async ({ page }) => {
      // Purpose: verify the sequence is joined with visible commas in the container text
      const fib = new FibonacciPage(page);
      await fib.goto();

      const text = await fib.getSequenceInnerText();
      // Should contain commas (e.g., "0, 1, 1, 2")
      expect(text).toContain(',');
      // The sequence string should start with "0"
      expect(text.trim().startsWith('0')).toBeTruthy();
    });
  });

  // Test that no unexpected runtime errors were logged during interactions
  test('No uncaught page errors or console errors during a sequence of interactions', async ({ page }) => {
    // Purpose: Run a set of interactions and confirm the app does not throw runtime errors
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Perform a variety of interactions
    await fib.setCountValue(5);
    await fib.clickGenerate();

    await fib.clickIncrease(); // should go to 10
    await fib.clickDecrease(); // should go to 5
    await fib.setCountValue(100);
    await fib.clickGenerate();

    await fib.clickDecrease(); // 95
    await fib.clickReset();

    // Allow event loop to flush any potential asynchronous errors
    await page.waitForTimeout(100);

    // Assert no uncaught exceptions captured by 'pageerror'
    expect(pageErrors.length, `Expected no uncaught page errors during interactions, got ${pageErrors.length}`).toBe(0);

    // Assert no console entries of type 'error'
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, `Expected no console errors during interactions, got ${errorConsole.length}`).toBe(0);
  });
});