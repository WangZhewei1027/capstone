import { test, expect } from '@playwright/test';

// Page Object for the Fibonacci page
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a074d-d5a0-11f0-8040-510e90b1f3a7.html';
    this.inputSelector = '#fibCount';
    this.buttonSelector = 'button:has-text("Generate Sequence")';
    this.resultSelector = '#result';
    this.resultBoxSelector = '#result .result';
    this.sequenceSelector = '#result .fib-sequence';
    this.errorSelector = '#result .error';
    this.goldenRatioSelector = '#result .golden-ratio';
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'load' });
  }

  async setCount(count) {
    // Focus and fill numeric input as string (Playwright fills as typing)
    await this.page.fill(this.inputSelector, String(count));
  }

  async clickGenerate() {
    await Promise.all([
      // The click may trigger synchronous JS that updates DOM immediately.
      this.page.click(this.buttonSelector),
      // ensure DOM mutations settle - wait for either result or error container to appear
      this.page.waitForSelector(this.resultSelector),
    ]);
  }

  async generate(count) {
    await this.setCount(count);
    await this.clickGenerate();
  }

  async getResultText() {
    const el = await this.page.$(this.resultSelector);
    return el ? (await el.innerText()) : '';
  }

  async getSequenceText() {
    const el = await this.page.$(this.sequenceSelector);
    return el ? (await el.innerText()) : null;
  }

  async getHeaderTextFromResultBox() {
    const box = await this.page.$(this.resultBoxSelector + ' h3');
    return box ? (await box.innerText()) : null;
  }

  async hasRatio() {
    const el = await this.page.$(this.goldenRatioSelector);
    return !!el;
  }

  async getRatioText() {
    const el = await this.page.$(this.goldenRatioSelector);
    return el ? (await el.innerText()) : null;
  }

  async getErrorText() {
    const el = await this.page.$(this.errorSelector);
    return el ? (await el.innerText()) : null;
  }

  async inputAttributes() {
    const el = await this.page.$(this.inputSelector);
    if (!el) return {};
    return {
      min: await el.getAttribute('min'),
      max: await el.getAttribute('max'),
      type: await el.getAttribute('type'),
      value: await el.getAttribute('value'),
      placeholder: await el.getAttribute('placeholder'),
    };
  }
}

// Helper to compute Fibonacci sequence for assertions
function expectedFibonacci(n) {
  if (n === 1) return [0];
  if (n === 2) return [0, 1];
  const seq = [0, 1];
  for (let i = 2; i < n; i++) seq.push(seq[i - 1] + seq[i - 2]);
  return seq;
}

test.describe('Fibonacci Sequence Generator - Integration Tests', () => {
  // Arrays to collect runtime errors and console error messages observed during each test
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    pageErrors = [];
    consoleErrors = [];

    // Listen for uncaught exceptions (pageerror) and console errors
    page.on('pageerror', (err) => {
      // Capture the Error object so tests can assert on message/stack
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Collect console messages of type 'error' for assertions
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid cross-test interference
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
  });

  test('Initial load displays first 10 Fibonacci numbers and ratio with no runtime errors', async ({ page }) => {
    // Purpose: Verify default state on load (value=10) displays the correct sequence and ratio,
    // and that no uncaught runtime errors were produced during load.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Wait for result box to appear (page's window.onload calls generateFibonacci)
    await page.waitForSelector(fib.resultBoxSelector);

    // Verify the result box header shows "First 10 Fibonacci Numbers:"
    const header = await fib.getHeaderTextFromResultBox();
    expect(header).toBe('First 10 Fibonacci Numbers:');

    // Verify the sequence text is correct (10 terms)
    const seqText = await fib.getSequenceText();
    const expectedSeq = expectedFibonacci(10).join(', ');
    expect(seqText).toBe(expectedSeq);

    // Verify ratio exists and matches the calculation to six decimals
    const hasRatio = await fib.hasRatio();
    expect(hasRatio).toBe(true);

    const ratioText = await fib.getRatioText();
    // Extract the numeric part after colon if needed
    expect(ratioText).toMatch(/Ratio of last two terms:/);
    // Calculate reference ratio
    const seq = expectedFibonacci(10);
    const refRatio = (seq[seq.length - 1] / seq[seq.length - 2]).toFixed(6);
    expect(ratioText).toContain(refRatio);

    // Ensure no uncaught exceptions happened during load
    expect(pageErrors.length).toBe(0);
    // Ensure no console.error messages were emitted
    expect(consoleErrors.length).toBe(0);

    // Accessibility / attribute checks for input
    const attrs = await fib.inputAttributes();
    expect(attrs.type).toBe('number');
    expect(attrs.min).toBe('1');
    expect(attrs.max).toBe('100');
    expect(attrs.placeholder).toContain('Enter number of terms');
  });

  test('Generating 1 term shows only 0 and hides ratio (no runtime errors)', async ({ page }) => {
    // Purpose: Test the edge case n=1. There should be exactly one term and no golden ratio displayed.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Generate sequence for n=1
    await fib.generate(1);

    // Verify header and sequence
    const header = await fib.getHeaderTextFromResultBox();
    expect(header).toBe('First 1 Fibonacci Numbers:');

    const seqText = await fib.getSequenceText();
    expect(seqText).toBe('0');

    // There should be no ratio displayed for a single term
    const hasRatio = await fib.hasRatio();
    expect(hasRatio).toBe(false);

    // Ensure no uncaught exceptions and no console errors occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Generating 2 terms triggers a runtime error when computing ratio (expected failure observed)', async ({ page }) => {
    // Purpose: The implementation divides by zero for n=2 (last / previous = 1/0 -> Infinity)
    // then calls toFixed on the result which in browsers can produce a RangeError.
    // We assert that a pageerror occurs and it relates to the toFixed/Infinity/RangeError issue.
    const fib = new FibonacciPage(page);
    await fib.goto();

    // Clear any previous page errors recorded during initial load
    page.removeAllListeners('pageerror');
    pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // Generate sequence for n=2 which is known to cause problematic toFixed on Infinity
    await fib.generate(2);

    // Give some time for any uncaught exception to be emitted
    // Wait briefly because the error is synchronous; this ensures the pageerror handler ran
    await page.waitForTimeout(100);

    // We expect at least one page error to have occurred
    expect(pageErrors.length).toBeGreaterThan(0);

    // At least one of the error messages should mention toFixed, Infinity, or RangeError
    const combinedMessages = pageErrors.map(e => e.message).join(' | ');
    expect(/toFixed|Infinity|RangeError/i.test(combinedMessages)).toBe(true);

    // Verify the sequence content still rendered (browser may have partially updated DOM before error)
    const seqText = await fib.getSequenceText();
    // For n=2 the sequence should be "0, 1" if it rendered
    if (seqText !== null) {
      expect(seqText).toBe('0, 1');
    }

    // console.error messages may also appear; capture them but don't require zero here
  });

  test.describe('Input validation and error messages', () => {
    test('Entering 0 displays validation error (below min)', async ({ page }) => {
      // Purpose: Validate that out-of-range small values produce the user-facing error element.
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.generate(0);

      // Error element should be present with the expected text
      const errorText = await fib.getErrorText();
      expect(errorText).toBe('Please enter a valid number between 1 and 100.');

      // No uncaught runtime errors expected for this validation branch
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Entering 101 displays validation error (above max)', async ({ page }) => {
      // Purpose: Validate that values greater than 100 are rejected gracefully.
      const fib = new FibonacciPage(page);
      await fib.goto();

      await fib.generate(101);

      const errorText = await fib.getErrorText();
      expect(errorText).toBe('Please enter a valid number between 1 and 100.');

      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });

    test('Entering a non-number (empty input) displays validation error', async ({ page }) => {
      // Purpose: Test non-numeric input / blank field handling.
      const fib = new FibonacciPage(page);
      await fib.goto();

      // Clear the input value to simulate empty input
      await page.fill(fib.inputSelector, '');

      // Click generate
      await page.click(fib.buttonSelector);

      // Expect the validation error message
      await page.waitForSelector(fib.errorSelector);
      const errorText = await fib.getErrorText();
      expect(errorText).toBe('Please enter a valid number between 1 and 100.');

      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test('Sequence generation for multiple values updates DOM correctly', async ({ page }) => {
    // Purpose: Verify that generating various valid counts updates the DOM with correct sequences and ratios.
    const fib = new FibonacciPage(page);
    await fib.goto();

    const testCounts = [3, 5, 8]; // small set to verify dynamic updates

    for (const n of testCounts) {
      await fib.generate(n);

      // Wait for the result box to appear
      await page.waitForSelector(fib.resultBoxSelector);

      const header = await fib.getHeaderTextFromResultBox();
      expect(header).toBe(`First ${n} Fibonacci Numbers:`);

      const seqText = await fib.getSequenceText();
      expect(seqText).toBe(expectedFibonacci(n).join(', '));

      // Ratio should appear only when n >= 2
      const hasRatio = await fib.hasRatio();
      if (n >= 2) {
        expect(hasRatio).toBe(true);
        const ratioText = await fib.getRatioText();
        const seq = expectedFibonacci(n);
        const refRatio = (seq[seq.length - 1] / seq[seq.length - 2]).toFixed(6);
        expect(ratioText).toContain(refRatio);
      } else {
        expect(hasRatio).toBe(false);
      }

      // No unexpected runtime exceptions for these valid inputs (except the previously tested n=2 case)
      expect(pageErrors.length).toBe(0);
    }
  });
});