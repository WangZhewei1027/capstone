import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767d041-d5b8-11f0-9ee1-ef07bdc6053d.html';

/**
 * Page object for the Linear Search demo page.
 * Encapsulates common operations so tests read clearly.
 */
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.numbersSelector = '#numbers';
    this.targetSelector = '#target';
    this.buttonSelector = 'button[onclick="performLinearSearch()"]';
    this.resultSelector = '#result';

    // Captured diagnostics
    this.consoleMessages = [];
    this.pageErrors = [];

    // Attach listeners to capture console and page errors for assertions
    page.on('console', msg => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    page.on('pageerror', err => {
      this.pageErrors.push(err);
    });
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setNumbers(value) {
    await this.page.fill(this.numbersSelector, value);
  }

  async setTarget(value) {
    await this.page.fill(this.targetSelector, value);
  }

  async clickSearch() {
    await Promise.all([
      // click may synchronously update DOM; ensure navigation not expected
      this.page.click(this.buttonSelector)
    ]);
  }

  async getResultText() {
    return (await this.page.textContent(this.resultSelector)) || '';
  }

  // Diagnostic helpers
  getConsoleErrors() {
    return this.consoleMessages.filter(m => m.type === 'error' || m.type === 'fatal');
  }

  findConsoleMessagesContaining(sub) {
    return this.consoleMessages.filter(m => m.text.includes(sub));
  }
}

test.describe('Linear Search Demo - FSM states and transitions', () => {
  // Each test gets a fresh page fixture from Playwright
  test.describe.configure({ mode: 'serial' });

  // Test S0 Idle: page loads with expected inputs and button, initial result empty
  test('S0_Idle: initial render shows inputs, button and empty result (no runtime errors on load)', async ({ page }) => {
    const lp = new LinearSearchPage(page);

    // Load the page exactly as-is.
    await lp.goto();

    // Validate DOM elements present with expected placeholders/text.
    const numbersPlaceholder = await page.getAttribute(lp.numbersSelector, 'placeholder');
    const targetPlaceholder = await page.getAttribute(lp.targetSelector, 'placeholder');
    const buttonText = await page.textContent(lp.buttonSelector);
    const resultText = await lp.getResultText();

    // Assertions verifying the Idle state evidence from the FSM
    expect(numbersPlaceholder).toBe('e.g. 34, 78, 12, 4, 56');
    expect(targetPlaceholder).toBe('Target number');
    expect(buttonText).toContain('Search');
    expect(resultText).toBe(''); // result div should be empty on initial render

    // Observe console and page errors - assert no fatal errors occurred during load
    const pageErrors = lp.pageErrors;
    const consoleErrors = lp.getConsoleErrors();

    // There should be no page errors and no console error-level messages on a correct load.
    expect(pageErrors.length, 'no runtime page errors on load').toBe(0);
    expect(consoleErrors.length, 'no console errors on load').toBe(0);

    // Also assert that no common JS exceptions were logged
    const refErrs = lp.findConsoleMessagesContaining('ReferenceError');
    const typeErrs = lp.findConsoleMessagesContaining('TypeError');
    const syntaxErrs = lp.findConsoleMessagesContaining('SyntaxError');

    expect(refErrs.length, 'no ReferenceError in console').toBe(0);
    expect(typeErrs.length, 'no TypeError in console').toBe(0);
    expect(syntaxErrs.length, 'no SyntaxError in console').toBe(0);
  });

  // Test transition S0 -> S1 -> S2: successful search finds the target
  test('S1_Searching -> S2_ResultFound: searching finds target and displays correct index', async ({ page }) => {
    const lp = new LinearSearchPage(page);
    await lp.goto();

    // Provide a list and a target known to be in the list.
    // This validates the "Found" final state (S2_ResultFound) evidence.
    await lp.setNumbers('34, 78, 12, 4, 56');
    await lp.setTarget('78');

    // Click Search (triggering the SearchButtonClick event and S1 entry action performLinearSearch)
    await lp.clickSearch();

    // Validate the displayed result matches expectation exactly
    const result = (await lp.getResultText()).trim();
    expect(result).toBe('Target 78 found at index 1.');

    // Verify no runtime errors occurred while performing the search
    expect(lp.pageErrors.length, 'no runtime page errors during successful search').toBe(0);
    expect(lp.getConsoleErrors().length, 'no console errors during successful search').toBe(0);
  });

  // Test transition S1 -> S3: searching with a target not in the list displays "not found"
  test('S1_Searching -> S3_ResultNotFound: searching for absent target displays not found message', async ({ page }) => {
    const lp = new LinearSearchPage(page);
    await lp.goto();

    // Provide list where target is absent.
    await lp.setNumbers('1,2,3,4,5');
    await lp.setTarget('99');

    // Trigger search
    await lp.clickSearch();

    // Assert expected not-found message (S3 evidence)
    const result = (await lp.getResultText()).trim();
    expect(result).toBe('Target 99 not found.');

    // Ensure no unexpected errors occurred
    expect(lp.pageErrors.length).toBe(0);
    expect(lp.getConsoleErrors().length).toBe(0);
  });

  // Edge case: missing inputs -> application displays validation message.
  test('Edge case: clicking search with empty inputs shows validation message', async ({ page }) => {
    const lp = new LinearSearchPage(page);
    await lp.goto();

    // Ensure inputs are empty
    await lp.setNumbers('');
    await lp.setTarget('');

    // Click search to trigger validation branch in performLinearSearch
    await lp.clickSearch();

    // Validate the explicit validation message visible to the user
    const result = (await lp.getResultText()).trim();
    expect(result).toBe('Please provide both a list of numbers and a target.');

    // Validate no runtime errors (this is expected to be a handled branch, not an exception)
    expect(lp.pageErrors.length).toBe(0);
    expect(lp.getConsoleErrors().length).toBe(0);
  });

  // Edge case: non-numeric inputs - the implementation uses parseInt, so NaN scenarios are possible.
  test('Edge case: non-numeric inputs produce NaN in target and result indicates not found', async ({ page }) => {
    const lp = new LinearSearchPage(page);
    await lp.goto();

    // Non-numeric inputs and non-numeric target; parseInt will yield NaN
    await lp.setNumbers('a, b, c');
    await lp.setTarget('b');

    // Trigger search
    await lp.clickSearch();

    // The implementation will parse target as NaN; string coercion produces 'NaN'
    // The result should therefore be: "Target NaN not found."
    const result = (await lp.getResultText()).trim();
    expect(result).toBe('Target NaN not found.');

    // Confirm the run did not throw an unhandled exception
    expect(lp.pageErrors.length).toBe(0);

    // There should not be console.error messages resulting from this handled logic
    expect(lp.getConsoleErrors().length).toBe(0);
  });

  // Additional behavioral test: whitespace handling and trimming of numbers works as intended.
  test('Whitespace handling: numbers with spaces and newline are parsed correctly', async ({ page }) => {
    const lp = new LinearSearchPage(page);
    await lp.goto();

    // Provide numbers with various whitespace; target is present
    await lp.setNumbers(' 10 ,\n20,   30 ,40 ');
    await lp.setTarget('30');

    // Trigger search
    await lp.clickSearch();

    // Expect index 2 (0-based)
    const result = (await lp.getResultText()).trim();
    expect(result).toBe('Target 30 found at index 2.');

    // Confirm no runtime errors
    expect(lp.pageErrors.length).toBe(0);
    expect(lp.getConsoleErrors().length).toBe(0);
  });

  // Validate that clicking the button is the single event transitioning from Idle to Searching (FSM event)
  test('Event coverage: SearchButtonClick triggers search behavior (DOM change observed)', async ({ page }) => {
    const lp = new LinearSearchPage(page);
    await lp.goto();

    // Start with empty result
    let result = await lp.getResultText();
    expect(result).toBe('');

    // Provide inputs and click button
    await lp.setNumbers('5,6,7');
    await lp.setTarget('6');

    // Capture current console and page errors just before click
    const errorsBefore = lp.pageErrors.length;
    const consoleErrorsBefore = lp.getConsoleErrors().length;

    await lp.clickSearch();

    // After clicking, result should update -> demonstrates transition S0->S1 and subsequently S2
    result = (await lp.getResultText()).trim();
    expect(result).toBe('Target 6 found at index 1.');

    // No new page errors introduced by the event
    expect(lp.pageErrors.length).toBe(errorsBefore);
    expect(lp.getConsoleErrors().length).toBe(consoleErrorsBefore);
  });
});