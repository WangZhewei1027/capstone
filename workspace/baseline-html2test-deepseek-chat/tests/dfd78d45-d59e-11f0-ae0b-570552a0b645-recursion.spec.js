import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d45-d59e-11f0-ae0b-570552a0b645.html';

// Page Object encapsulating selectors and common actions
class RecursionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.factorialInput = page.locator('#factorialInput');
    this.factorialButton = page.locator('button', { hasText: 'Calculate Factorial' });
    this.factorialResult = page.locator('#factorialResult');

    this.fibonacciInput = page.locator('#fibonacciInput');
    this.fibonacciButton = page.locator('button', { hasText: 'Generate Fibonacci' });
    this.fibonacciResult = page.locator('#fibonacciResult');

    this.directoryButton = page.locator('button', { hasText: 'Show Directory Structure' });
    this.directoryResult = page.locator('#directoryResult');

    this.visualButton = page.locator('button', { hasText: 'Create Nested Squares' });
    this.visualContainer = page.locator('#visualContainer');
  }

  async navigate() {
    await this.page.goto(APP_URL);
    // Wait for the main container to be visible to ensure scripts run during onload
    await this.page.locator('.container').waitFor({ state: 'visible' });
  }

  // Factorial actions
  async setFactorialInput(value) {
    await this.factorialInput.fill(String(value));
  }
  async clickCalculateFactorial() {
    await this.factorialButton.click();
  }
  async getFactorialText() {
    return (await this.factorialResult.textContent()) || '';
  }

  // Fibonacci actions
  async setFibonacciInput(value) {
    await this.fibonacciInput.fill(String(value));
  }
  async clickGenerateFibonacci() {
    await this.fibonacciButton.click();
  }
  async getFibonacciText() {
    return (await this.fibonacciResult.textContent()) || '';
  }

  // Directory actions
  async clickShowDirectory() {
    await this.directoryButton.click();
  }
  async getDirectoryText() {
    return (await this.directoryResult.textContent()) || '';
  }

  // Visual actions
  async clickCreateVisual() {
    await this.visualButton.click();
  }
  async hasCanvas() {
    return await this.visualContainer.locator('canvas#recursionCanvas').count() > 0;
  }
}

test.describe('Recursion Demonstration - End to End', () => {
  // Collect console messages and page errors per test for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', msg => {
      try {
        // Capture text for easier assertions
        consoleMessages.push(msg.text());
      } catch (e) {
        // ignore any console extraction issues
      }
    });

    // Collect any uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.describe('Initial page load and automatic initialization', () => {
    test('should load page and run onload initial demos without runtime errors', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      // The page's window.onload triggers calculateFactorial(), generateFibonacci(), displayDirectoryTree()
      // Wait for results to be populated
      await expect(app.factorialResult).toHaveText(/Calculation time:/, { timeout: 2000 });
      await expect(app.fibonacciResult).toHaveText(/Calculation time:/, { timeout: 2000 });
      await expect(app.directoryResult).toHaveText(/Directory Structure:/, { timeout: 2000 });

      // Verify factorial default (input value default is 5 from HTML) produced expected content
      const factorialText = await app.getFactorialText();
      expect(factorialText).toMatch(/5! = 120/);

      // Verify fibonacci default (input default 10) produced a sequence and mentions the count
      const fibonacciText = await app.getFibonacciText();
      expect(fibonacciText).toMatch(/Fibonacci sequence \(10 numbers\):/);
      expect(fibonacciText).toContain('0, 1'); // basic sanity

      // Directory result should include top-level folder and some nested file names
      const directoryText = await app.getDirectoryText();
      expect(directoryText).toContain('Directory Structure:');
      expect(directoryText).toContain('📁 Root');
      expect(directoryText).toContain('resume.pdf');
      expect(directoryText).toContain('main.js');

      // Assert that no uncaught page errors were emitted during load
      expect(pageErrors.length).toBe(0);

      // Assert console contains expected initialization logs
      // The script logs lines like "=== Calculating factorial of 5 ===" and "=== Generating 10 Fibonacci numbers ==="
      const joinedConsole = consoleMessages.join('\n');
      expect(joinedConsole).toContain('=== Calculating factorial of 5 ===');
      expect(joinedConsole).toContain('=== Generating 10 Fibonacci numbers ===');
    });
  });

  test.describe('Factorial Calculator interactions and edge cases', () => {
    test('calculates factorial correctly for normal input', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      // Change input to 6 and calculate
      await app.setFactorialInput(6);
      await app.clickCalculateFactorial();

      // The result should show 6! = 720
      await expect(app.factorialResult).toHaveText(/6! = 720/);
      expect(await app.getFactorialText()).toMatch(/Calculation time:/);

      // Confirm no uncaught page errors occurred
      expect(pageErrors.length).toBe(0);
    });

    test('shows validation message for negative input', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      // Provide an invalid negative number
      await app.setFactorialInput(-1);
      await app.clickCalculateFactorial();

      // Expect validation message
      await expect(app.factorialResult).toHaveText('Please enter a number between 0 and 100');
      expect(pageErrors.length).toBe(0);
    });

    test('shows validation message for input > 100', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      await app.setFactorialInput(101);
      await app.clickCalculateFactorial();

      await expect(app.factorialResult).toHaveText('Please enter a number between 0 and 100');
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Fibonacci generator interactions and edge cases', () => {
    test('generates correct sequence for n = 0 (edge case)', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      await app.setFibonacciInput(0);
      await app.clickGenerateFibonacci();

      // For 0, the implementation sets sequence = []
      await expect(app.fibonacciResult).toHaveText(/Fibonacci sequence \(0 numbers\):/);
      const text = await app.getFibonacciText();
      // It should not contain numbers after the colon
      expect(text).toMatch(/^Fibonacci sequence \(0 numbers\):\s*$/m);
      expect(pageErrors.length).toBe(0);
    });

    test('generates expected first five fibonacci numbers', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      await app.setFibonacciInput(5);
      await app.clickGenerateFibonacci();

      const fibText = await app.getFibonacciText();
      expect(fibText).toMatch(/Fibonacci sequence \(5 numbers\):/);
      // Expect the known sequence for first five numbers
      expect(fibText).toContain('0, 1, 1, 2, 3');
      expect(pageErrors.length).toBe(0);
    });

    test('shows validation for input > 40', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      await app.setFibonacciInput(41);
      await app.clickGenerateFibonacci();

      await expect(app.fibonacciResult).toHaveText('Please enter a number between 0 and 40');
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Directory traversal display', () => {
    test('displays full directory tree with nested items when button clicked', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      // Clear the directory div then trigger display to ensure button works
      // (The page's onload already called it, but clicking should re-render)
      await app.clickShowDirectory();

      const dirText = await app.getDirectoryText();
      expect(dirText).toContain('Directory Structure:');
      // Expect nested indentation and icons from traverseDirectory implementation
      expect(dirText).toContain('📁 Root');
      expect(dirText).toContain('📁 Documents');
      expect(dirText).toContain('📄 resume.pdf');
      expect(dirText).toContain('📁 Photos');
      expect(dirText).toContain('vacation.jpg');
      expect(dirText).toContain('readme.txt');

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Visual recursion (canvas) behavior', () => {
    test('creates a canvas and draws nested squares when button is clicked', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      // Ensure no canvas present initially
      const initialCanvasCount = await page.locator('#recursionCanvas').count();
      // It might or might not be present (onload doesn't create it), but we proceed to click
      await app.clickCreateVisual();

      // Verify canvas element exists with expected dimensions
      await expect(page.locator('#recursionCanvas')).toBeVisible();
      const canvas = page.locator('#recursionCanvas');
      expect(await canvas.getAttribute('width')).toBe('400');
      expect(await canvas.getAttribute('height')).toBe('400');

      // Evaluate pixel data to ensure something was drawn (non-empty image)
      const hasDrawnPixels = await page.evaluate(() => {
        const canvasEl = document.getElementById('recursionCanvas');
        if (!canvasEl) return false;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return false;
        try {
          const data = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
          // If all pixels are transparent black, every value would be 0.
          // Check if any alpha channel (4th byte) is non-zero or any of RGB non-zero.
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
              return true;
            }
          }
          return false;
        } catch (e) {
          // If reading image data fails, return false to indicate inability to verify drawing
          return false;
        }
      });

      // We expect that the recursive drawing function drew some lines on the canvas
      expect(hasDrawnPixels).toBe(true);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Console and error observation', () => {
    test('captures console logs for recursive calls and ensures no uncaught exceptions', async ({ page }) => {
      const app = new RecursionPage(page);
      await app.navigate();

      // Trigger actions to produce additional console output
      await app.setFactorialInput(4);
      await app.clickCalculateFactorial();

      await app.setFibonacciInput(6);
      await app.clickGenerateFibonacci();

      // Wait a brief moment to allow console messages to be emitted
      await page.waitForTimeout(200);

      // There should be console messages that reflect the computations
      const joined = consoleMessages.join('\n');
      expect(joined).toContain('Calculating factorial(4)'); // recursive log from factorial
      expect(joined).toContain('fibonacci(6)'); // some fibonacci recursion logs

      // Assert no uncaught page-level errors were emitted
      expect(pageErrors.length).toBe(0);
    });
  });
});