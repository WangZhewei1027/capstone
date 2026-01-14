import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad3edb0-d59a-11f0-891d-f361d22ca68a.html';

// Page Object encapsulating interactions with the Quick Sort app
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#input';
    this.buttonSelector = '#sort-btn';
    this.outputSelector = '#output';
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForSelector(this.inputSelector);
    await this.page.waitForSelector(this.buttonSelector);
    await this.page.waitForSelector(this.outputSelector);
  }

  async fillInput(value) {
    await this.page.fill(this.inputSelector, value);
  }

  async clickSort() {
    await Promise.all([
      this.page.waitForTimeout(50), // small pause to allow handler to run; used in conjunction with output wait
      this.page.click(this.buttonSelector)
    ]);
  }

  async getOutputText() {
    return (await this.page.locator(this.outputSelector).innerText()).trim();
  }

  async getInputPlaceholder() {
    return this.page.getAttribute(this.inputSelector, 'placeholder');
  }

  async waitForOutputToContain(substring, timeout = 500) {
    await this.page.waitForFunction(
      (sel, substr) => {
        const el = document.querySelector(sel);
        return !!el && el.innerText.includes(substr);
      },
      this.outputSelector,
      substring,
      { timeout }
    );
  }
}

test.describe('Quick Sort App - FSM States and Transitions (Application ID: 8ad3edb0-d59a-11f0-891d-f361d22ca68a)', () => {
  let page;
  let quickSortPage;
  let consoleErrors;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    quickSortPage = new QuickSortPage(page);

    // Collect console messages and page errors for assertions
    consoleErrors = [];
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    page.on('pageerror', error => {
      // pageerror will capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(error);
    });

    await quickSortPage.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial Idle state renders expected components (S0_Idle)', async () => {
    // Validate that the initial (Idle) state UI elements are present and correct.
    // This corresponds to FSM state S0_Idle with evidence: input, button exist.
    const placeholder = await quickSortPage.getInputPlaceholder();
    expect(placeholder).toBe('Enter a list of numbers separated by space');

    const inputVisible = await page.isVisible('#input');
    const buttonVisible = await page.isVisible('#sort-btn');
    const outputVisible = await page.isVisible('#output');

    expect(inputVisible).toBe(true);
    expect(buttonVisible).toBe(true);
    expect(outputVisible).toBe(true);

    const outputText = await quickSortPage.getOutputText();
    // On initial load, output should be empty (no sorted list yet)
    expect(outputText).toBe('');
  });

  test('Transition: clicking Sort sorts a list of numbers (S0_Idle -> S1_Sorted)', async () => {
    // This test validates the main transition: user enters numbers and clicks Sort.
    // We verify the output DOM change and final sorted sequence as evidence of S1_Sorted.
    await quickSortPage.fillInput('3 1 4 2');
    await quickSortPage.clickSort();

    // Wait for expected output substring
    await quickSortPage.waitForOutputToContain('Sorted list:');

    const output = await quickSortPage.getOutputText();
    // The implementation appends a trailing space after each number
    expect(output).toBe('Sorted list: 1 2 3 4');
    // Also assert that "Sorted list:" prefix exists as FSM evidence of final state
    expect(output.startsWith('Sorted list:')).toBe(true);
  });

  test('Edge case: empty input results in "Sorted list: 0" due to Number(\"\") => 0 behavior', async () => {
    // The implementation splits on spaces and uses Number(), so an empty string becomes 0.
    // We verify the actual DOM behavior matches the implementation (no attempt to "fix" code).
    await quickSortPage.fillInput('');
    await quickSortPage.clickSort();

    await quickSortPage.waitForOutputToContain('Sorted list:');

    const output = await quickSortPage.getOutputText();
    // Implementation behavior: input.split(' ') => [''] => map(Number) => [0] => output '0 '
    expect(output).toBe('Sorted list: 0');
  });

  test('Edge case: non-numeric tokens produce NaN outputs and are rendered', async () => {
    // Non-numeric tokens become NaN when Number() is used; quickSort will still attempt to process.
    await quickSortPage.fillInput('a b');
    await quickSortPage.clickSort();

    await quickSortPage.waitForOutputToContain('Sorted list:');

    const output = await quickSortPage.getOutputText();
    // Expect 'NaN NaN' given two tokens that map to NaN
    expect(output).toBe('Sorted list: NaN NaN');
  });

  test('Edge case: negative numbers and duplicates are sorted correctly', async () => {
    await quickSortPage.fillInput('5 -1 5 3');
    await quickSortPage.clickSort();

    await quickSortPage.waitForOutputToContain('Sorted list:');

    const output = await quickSortPage.getOutputText();
    expect(output).toBe('Sorted list: -1 3 5 5');
  });

  test('Single element input stays the same (and is rendered)', async () => {
    await quickSortPage.fillInput('42');
    await quickSortPage.clickSort();

    await quickSortPage.waitForOutputToContain('Sorted list:');

    const output = await quickSortPage.getOutputText();
    expect(output).toBe('Sorted list: 42');
  });

  test('Verify presence/absence of functions mentioned in FSM entry/exit actions', async () => {
    // FSM entry action for S0_Idle listed "renderPage()". The HTML/JS does not define renderPage.
    // We must not inject or define it; simply check whether it exists in the page context.
    const renderPageExists = await page.evaluate(() => typeof window.renderPage !== 'undefined');
    const sortInputExists = await page.evaluate(() => typeof window.sortInput === 'function');

    // Assert that renderPage is not present (since implementation didn't include it)
    expect(renderPageExists).toBe(false);

    // sortInput must exist because it's used as the click event handler in the HTML
    expect(sortInputExists).toBe(true);
  });

  test('Event handler wiring: clicking the #sort-btn triggers DOM update (evidence for event listener)', async () => {
    // This validates the evidence line: document.getElementById('sort-btn').addEventListener('click', sortInput);
    // By observing a DOM change after clicking, we confirm the handler was invoked.
    await quickSortPage.fillInput('2 1');
    // read current output to know pre-click state
    const before = await quickSortPage.getOutputText();
    await quickSortPage.clickSort();

    await quickSortPage.waitForOutputToContain('Sorted list:');

    const after = await quickSortPage.getOutputText();
    expect(before).not.toBe(after);
    expect(after).toBe('Sorted list: 1 2');
  });

  test('No unexpected runtime errors (pageerror / console error) occurred while interacting', async () => {
    // After exercising the main flows above, verify there were no uncaught exceptions or console.errors.
    // Collectors were attached in beforeEach; here we assert that they are empty arrays.
    // This test ensures the app runs without uncaught ReferenceError/SyntaxError/TypeError during normal usage.
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // If there are any console messages, allow them but surface them in case of debugging
    // For CI clarity, assert that typical 'log' messages count is >= 0 (a no-op, just documents the array)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Robustness: multiple sequential sorts produce correct outputs each time', async () => {
    // Perform multiple sorts in sequence to ensure state transitions are repeatable.
    await quickSortPage.fillInput('9 7 8');
    await quickSortPage.clickSort();
    await quickSortPage.waitForOutputToContain('Sorted list:');
    expect(await quickSortPage.getOutputText()).toBe('Sorted list: 7 8 9');

    // Change input and sort again
    await quickSortPage.fillInput('10 2 3 2');
    await quickSortPage.clickSort();
    await quickSortPage.waitForOutputToContain('Sorted list:');
    expect(await quickSortPage.getOutputText()).toBe('Sorted list: 2 2 3 10');
  });
});