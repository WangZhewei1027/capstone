import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74324-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the Fibonacci page to encapsulate common interactions and queries
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.fibSelector = '#fibonacci';
  }

  // Returns the textContent of the fibonacci container (trimmed)
  async getFibonacciText() {
    return (await this.page.textContent(this.fibSelector))?.trim() ?? '';
  }

  // Returns the innerHTML of the fibonacci container
  async getFibonacciInnerHTML() {
    return await this.page.innerHTML(this.fibSelector);
  }

  // Returns an array of paragraph text values inside the fibonacci container
  async getFibonacciParagraphs() {
    return await this.page.$$eval(`${this.fibSelector} p`, nodes => nodes.map(n => n.textContent.trim()));
  }

  // Calls the fibonacci function in the page context with given n and returns the result
  async callFibonacci(n) {
    return await this.page.evaluate((n) => {
      // Call global fibonacci if it exists; if not, return a sentinel
      if (typeof window.fibonacci === 'function') {
        return window.fibonacci(n);
      }
      return '__NO_FUNCTION__';
    }, n);
  }

  // Returns count of interactive form controls on the page
  async countInteractiveControls() {
    return await this.page.$$eval('input, button, select, form, textarea', nodes => nodes.length);
  }
}

test.describe('Fibonacci Sequence - page load and behavior', () => {
  // Each test gets a fresh page
  test.beforeEach(async ({ page }) => {
    // Nothing else to set up here; navigation is done inside each test so we can capture errors precisely
  });

  // Test that the page script produces a runtime error due to the missing #n element.
  test('should emit a runtime TypeError on load because #n element is missing', async ({ page }) => {
    const fibPage = new FibonacciPage(page);

    // Listen for a pageerror event that is expected to occur due to script trying to access document.getElementById('n').value
    const [pageError] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.goto(APP_URL),
    ]);

    // The runtime error should be a TypeError caused by attempting to read `.value` of null.
    // Assert that an error was thrown and that the name is TypeError.
    expect(pageError).toBeTruthy();
    expect(pageError.name).toBe('TypeError');

    // The exact message may vary by browser, but it should indicate an attempt to read a property of null/undefined.
    const msg = pageError.message || '';
    expect(msg.length).toBeGreaterThan(0);
    // Check that message mentions either 'null' or 'reading' or 'value' to give confidence that it's the expected problem
    expect(
      msg.includes('null') ||
      msg.toLowerCase().includes('reading') ||
      msg.toLowerCase().includes('value') ||
      msg.toLowerCase().includes('cannot')
    ).toBeTruthy();

    // Verify that the fibonacci container exists in the DOM
    const exists = await page.$('#fibonacci');
    expect(exists).not.toBeNull();

    // Because the script errored before writing into the container, it should remain empty
    const text = await fibPage.getFibonacciText();
    expect(text).toBe('');
  });

  // Test that the console contains an error-level message related to the runtime exception
  test('should log an error message to the console on load', async ({ page }) => {
    const fibPage1 = new FibonacciPage(page);

    const consoleMessages = [];
    page.on('console', msg => {
      // capture console messages for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate and wait for pageerror as well to ensure error propagation
    await Promise.all([page.waitForEvent('pageerror'), page.goto(APP_URL)]);

    // There should be at least one console message; look for at least one error-type message
    const hasErrorConsole = consoleMessages.some(m => m.type === 'error' || m.type === 'warning');
    expect(hasErrorConsole).toBeTruthy();

    // Check that one of the console messages contains text that likely corresponds to the TypeError
    const errorLike = consoleMessages.find(m => m.type === 'error' && /TypeError|Cannot read|reading|null/i.test(m.text));
    // It's possible console formatting differs; allow the test to pass if any error-type console exists
    expect(errorLike || consoleMessages.some(m => m.type === 'error')).toBeTruthy();

    // Ensure the fib container is present and still empty due to the script error
    const innerHTML = await fibPage.getFibonacciInnerHTML();
    expect(innerHTML).toBe('');
  });

  // Test that the global fibonacci function is defined (it is declared before the line that throws),
  // and that it produces a deterministic sequence for typical inputs.
  test('fibonacci function should be defined and return expected sequence when invoked directly', async ({ page }) => {
    await page.goto(APP_URL);

    const fibPage2 = new FibonacciPage(page);

    // The function was declared before the runtime error, so it should exist on the window object.
    const isFunction = await page.evaluate(() => typeof window.fibonacci === 'function');
    expect(isFunction).toBeTruthy();

    // Call fibonacci(5) and verify the returned sequence matches the implementation's behavior
    const result5 = await fibPage.callFibonacci(5);
    // Implementation builds [0,1] then pushes until length === n, so fibonacci(5) => [0,1,1,2,3]
    expect(Array.isArray(result5)).toBeTruthy();
    expect(result5.length).toBe(5);
    expect(result5).toEqual([0, 1, 1, 2, 3]);

    // Edge-case: call fibonacci(1) — implementation returns the base array [0,1] (length 2) because it never trims.
    const result1 = await fibPage.callFibonacci(1);
    expect(Array.isArray(result1)).toBeTruthy();
    // The implementation returns the initial [0,1] as-is for n=1, so length is 2 and elements are [0,1]
    expect(result1).toEqual([0, 1]);

    // Edge-case: call fibonacci(0) — implementation will also return [0,1]
    const result0 = await fibPage.callFibonacci(0);
    expect(Array.isArray(result0)).toBeTruthy();
    expect(result0).toEqual([0, 1]);
  });

  // Validate that there are no interactive inputs or controls on the page (the app expects an #n but it's missing)
  test('page should not contain input/button/form elements (interactive controls are missing)', async ({ page }) => {
    await page.goto(APP_URL);
    const fibPage3 = new FibonacciPage(page);

    const controlCount = await fibPage.countInteractiveControls();
    // The provided HTML only contains a div#fibonacci and no form controls; assert that count is 0
    expect(controlCount).toBe(0);
  });

  // Verify that, given the script error, no paragraphs were rendered inside #fibonacci
  test('no Fibonacci paragraphs should be rendered when the script errors at load', async ({ page }) => {
    // Capture the pageerror to ensure script attempted to execute and failed
    await Promise.all([page.waitForEvent('pageerror'), page.goto(APP_URL)]);
    const fibPage4 = new FibonacciPage(page);

    const paragraphs = await fibPage.getFibonacciParagraphs();
    // Because script aborted before creating the paragraphs, there should be none
    expect(Array.isArray(paragraphs)).toBeTruthy();
    expect(paragraphs.length).toBe(0);
  });
});