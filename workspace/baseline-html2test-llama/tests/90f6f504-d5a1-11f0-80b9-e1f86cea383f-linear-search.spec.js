import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6f504-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object model for the Linear Search page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(URL, { waitUntil: 'load' });
  }

  // Get the search input element handle
  async input() {
    return this.page.locator('#search-input');
  }

  // Get the search button element handle
  async button() {
    return this.page.locator('#search-button');
  }

  // Get the search result element handle
  async result() {
    return this.page.locator('#search-result');
  }

  // Enter value into the input
  async enterValue(value) {
    const input = await this.input();
    await input.fill(''); // clear
    await input.type(String(value));
  }

  // Click the search button
  async clickSearch() {
    await (await this.button()).click();
  }

  // Read the result text
  async getResultText() {
    return (await this.result()).innerText();
  }

  // Invoke the page's linearSearch function directly (calls the already-defined function in the page)
  // This is not adding/patching any function, it's calling the existing function defined by the app.
  async invokeLinearSearch(target) {
    // We call linearSearch with the global numbers array that the page defined.
    // This executes existing page JS without redefining or injecting new globals.
    await this.page.evaluate((t) => {
      // linearSearch and numbers should be present on the page as per the app implementation
      // eslint-disable-next-line no-undef
      if (typeof linearSearch === 'function' && typeof numbers !== 'undefined') {
        // Call the existing function
        // eslint-disable-next-line no-undef
        linearSearch(numbers, t);
      } else {
        // If the functions/variables are missing, we throw so the test can observe the natural error
        // (we don't patch or define them here)
        // eslint-disable-next-line no-undef
        throw new Error('linearSearch or numbers not available on page');
      }
    }, target);
  }
}

test.describe('Linear Search - UI and Behavior', () => {
  // Collect console messages and page errors for each test to inspect and assert on them.
  test.beforeEach(async ({ page }) => {
    // Attach listeners to capture console messages and page errors.
    page.context()._consoleMessages = [];
    page.context()._pageErrors = [];

    page.on('console', (msg) => {
      // Store console messages with type and text for assertions
      page.context()._consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // Store uncaught exceptions from the page
      page.context()._pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // After each test ensure arrays exist and optionally clear them (they are per-context)
    // No teardown modification of the page is performed.
  });

  // Test initial page load and default state
  test('Initial load shows initial search result (derived from empty input) and has no uncaught page errors', async ({ page }) => {
    const app = new LinearSearchPage(page);

    // Navigate to the page
    await app.goto();

    // Verify heading and basic elements exist
    await expect(page.locator('h1')).toHaveText('Linear Search');
    await expect(await app.input()).toBeVisible();
    await expect(await app.button()).toBeVisible();

    // On initial load the script computes target = parseInt(input.value)
    // Since the input is empty, parseInt('') === NaN and we expect the result message to indicate Number NaN not found
    const resultText = await app.getResultText();
    expect(resultText).toBe('Number NaN not found');

    // Assert there were no uncaught page errors during load
    const pageErrors = page.context()._pageErrors;
    expect(Array.isArray(pageErrors)).toBeTruthy();
    expect(pageErrors.length).toBe(0);

    // Assert there were no console.error messages emitted during load
    const consoleErrors = page.context()._consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test presence and accessibility-like attributes of controls
  test('Search input and button are visible, enabled, and have expected attributes', async ({ page }) => {
    const app1 = new LinearSearchPage(page);
    await app.goto();

    const input1 = await app.input1();
    const button = await app.button();

    // Input should be visible and have the placeholder text
    await expect(input).toBeVisible();
    expect(await input.getAttribute('placeholder')).toBe('Enter a number to search');

    // Button should be visible and enabled with the label 'Search'
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Search');
    await expect(button).toBeEnabled();
  });

  // Test user interaction: typing into input and clicking the Search button
  test('Typing a number and clicking Search does not trigger a new search because the button has no handler', async ({ page }) => {
    const app2 = new LinearSearchPage(page);
    await app.goto();

    // Confirm initial state
    const initialResult = await app.getResultText();
    expect(initialResult).toBe('Number NaN not found');

    // Type '5' and click the Search button as a user would
    await app.enterValue('5');
    await app.clickSearch();

    // Because the HTML/JS does not attach an event listener to the button,
    // clicking it should NOT change the result. We assert the result remains the same.
    const afterClickResult = await app.getResultText();
    expect(afterClickResult).toBe(initialResult);

    // Confirm no uncaught errors were produced by the user interaction
    expect(page.context()._pageErrors.length).toBe(0);

    // Also ensure we didn't emit console.error messages due to clicking
    const consoleErrors1 = page.context()._consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test programmatic invocation of the existing linearSearch function to validate algorithm correctness
  test('Invoking the page\'s linearSearch function programmatically finds existing numbers and updates the DOM', async ({ page }) => {
    const app3 = new LinearSearchPage(page);
    await app.goto();

    // Call the existing linearSearch(numbers, 5) defined by the page script
    await app.invokeLinearSearch(5);

    // Expect the DOM to reflect that number 5 was found at index 4
    const resultAfterFind = await app.getResultText();
    expect(resultAfterFind).toBe('Number 5 found at index 4');

    // Now invoke with a number not in the array
    await app.invokeLinearSearch(11);
    const resultAfterNotFound = await app.getResultText();
    expect(resultAfterNotFound).toBe('Number 11 not found');

    // Invoke with a non-numeric parse (NaN) to observe fallback behavior
    // We call with NaN explicitly by passing a value that becomes NaN in the page (e.g., parseInt('abc') yields NaN),
    // but here we can pass NaN via evaluate
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      linearSearch(numbers, NaN);
    });
    const resultAfterNaN = await app.getResultText();
    expect(resultAfterNaN).toBe('Number NaN not found');

    // Ensure no uncaught page errors resulted from programmatic invocation
    expect(page.context()._pageErrors.length).toBe(0);

    // Ensure no console.error messages occurred while invoking the function
    const consoleErrors2 = page.context()._consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Edge-case tests: non-numeric input and empty input behavior from the user's perspective
  test('Edge cases: non-numeric input and empty input produce "not found" results (observed at load or via function invocation)', async ({ page }) => {
    const app4 = new LinearSearchPage(page);
    await app.goto();

    // Non-numeric input typed and clicking the button does not change result (no handler)
    await app.enterValue('abc');
    await app.clickSearch();
    const resultAfterTypingABC = await app.getResultText();
    // Remains the initial result since button is not wired
    expect(resultAfterTypingABC).toBe('Number NaN not found');

    // Programmatically invoke with parseInt('abc') -> NaN to observe expected DOM update when the search is run
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      linearSearch(numbers, parseInt('abc'));
    });
    const resultAfterProgrammaticNaN = await app.getResultText();
    expect(resultAfterProgrammaticNaN).toBe('Number NaN not found');

    // Programmatically invoke with empty string parsed value (parseInt('') -> NaN)
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      linearSearch(numbers, parseInt(''));
    });
    const resultAfterEmptyParse = await app.getResultText();
    expect(resultAfterEmptyParse).toBe('Number NaN not found');

    // Ensure no uncaught page errors occurred from these edge-case invocations
    expect(page.context()._pageErrors.length).toBe(0);
  });
});