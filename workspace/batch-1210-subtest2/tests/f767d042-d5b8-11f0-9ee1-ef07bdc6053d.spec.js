import { test, expect } from '@playwright/test';

// URL of the application under test
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f767d042-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Binary Search page to encapsulate interactions
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#array');
    this.targetInput = page.locator('#target');
    this.searchButton = page.locator('#search-button');
    this.resultDiv = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillArray(value) {
    await this.arrayInput.fill(value);
  }

  async fillTarget(value) {
    await this.targetInput.fill(String(value));
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async getResultText() {
    return (await this.resultDiv.textContent()) ?? '';
  }
}

test.describe('Binary Search Visualization - FSM tests', () => {
  // Collect console messages and page errors for each test to inspect runtime issues
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture all console messages for later assertions
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // No explicit teardown required; Playwright will handle page lifecycle.
    // But we keep this hook available for clarity and future extension.
  });

  test('S0 Idle state - page renders initial components correctly', async ({ page }) => {
    // This test validates the Idle (initial) state:
    // - The page loads
    // - The main components are present: array input, target input, search button, result div
    // - There are no uncaught runtime errors on load
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Verify inputs and button exist and are visible
    await expect(bs.arrayInput).toBeVisible();
    await expect(bs.targetInput).toBeVisible();
    await expect(bs.searchButton).toBeVisible();
    await expect(bs.resultDiv).toBeVisible();

    // Verify placeholders / attributes per FSM evidence
    await expect(bs.arrayInput).toHaveAttribute('placeholder', 'e.g. 1,2,3,4,5');
    await expect(bs.targetInput).toHaveAttribute('placeholder', 'e.g. 3');

    // Verify no page errors occurred during initial render
    expect(pageErrors.length).toBe(0);

    // Ensure console does not contain error-level messages on load
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test.describe('Transitions and results', () => {
    test('S0 -> S1 -> S2: Clicking search with target present shows "Element found" (Result Found)', async ({ page }) => {
      // This test validates:
      // - Transition from Idle to Searching by clicking the search button
      // - Transition from Searching to ResultFound when the target exists in the array
      // - That the result text contains the expected index
      const bs = new BinarySearchPage(page);
      await bs.goto();

      // Provide a sorted array and a target that exists
      await bs.fillArray('1,2,3,4,5');
      await bs.fillTarget(3);

      // Click search (SearchButtonClick event triggers the search logic)
      await bs.clickSearch();

      // The expected index for value 3 in [1,2,3,4,5] is 2
      const resultText = await bs.getResultText();
      expect(resultText).toContain('Element found at index: 2');

      // Confirm no uncaught exceptions occurred during the interaction
      expect(pageErrors.length).toBe(0);

      // Confirm binarySearch helper exists and is a function on the page
      const typeOfBinarySearch = await page.evaluate(() => typeof binarySearch);
      expect(typeOfBinarySearch).toBe('function');
    });

    test('S0 -> S1 -> S3: Clicking search with target absent shows "Element not found" (Result Not Found)', async ({ page }) => {
      // This test validates:
      // - Transition from Idle to Searching and to ResultNotFound when the target is not present
      const bs = new BinarySearchPage(page);
      await bs.goto();

      // Provide a sorted array and a target that does NOT exist
      await bs.fillArray('10,20,30,40,50');
      await bs.fillTarget(25);

      // Click search
      await bs.clickSearch();

      const resultText = await bs.getResultText();
      expect(resultText.trim()).toBe('Element not found');

      // Confirm no uncaught exceptions occurred during the interaction
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Empty inputs: blank array and blank target - verify behavior and result text', async ({ page }) => {
      // This test explores edge case behavior when inputs are blank.
      // Note: The page's implementation turns empty string to Number('') === 0 for target,
      // and arrayInput.split(',').map(Number) for array -> [''] -> [0].
      const bs = new BinarySearchPage(page);
      await bs.goto();

      // Ensure both inputs are blank
      await bs.fillArray('');
      await bs.fillTarget('');

      // Click search: based on implementation, this may find 0 at index 0
      await bs.clickSearch();

      const resultText = await bs.getResultText();

      // Accept both possible expected outcomes documented by implementation:
      // either it finds 'Element found at index: 0' or 'Element not found' depending on how empty parsing behaves.
      const acceptable = [
        'Element found at index: 0',
        'Element not found'
      ];
      const matches = acceptable.some((s) => resultText.includes(s));
      expect(matches).toBe(true);

      // No uncaught errors expected
      expect(pageErrors.length).toBe(0);
    });

    test('Malformed array input with non-numeric values yields no crash and returns "Element not found"', async ({ page }) => {
      // This test inputs non-numeric array values to verify robust handling without runtime errors.
      const bs = new BinarySearchPage(page);
      await bs.goto();

      // Provide invalid numbers; map(Number) will produce NaN values
      await bs.fillArray('a,b,c');
      await bs.fillTarget(2);

      // Click search
      await bs.clickSearch();

      // Since arr contains NaN, comparisons will not match the numeric target -> expect not found
      const resultText = await bs.getResultText();
      expect(resultText.trim()).toBe('Element not found');

      // Confirm no uncaught exceptions occurred
      expect(pageErrors.length).toBe(0);
    });

    test('Duplicate values: ensure one valid index is returned (first/any match accepted)', async ({ page }) => {
      // Verifies that when duplicates exist, binary search returns some valid index and the UI displays it.
      const bs = new BinarySearchPage(page);
      await bs.goto();

      // Sorted array with duplicates: [1,2,2,2,3]
      await bs.fillArray('1,2,2,2,3');
      await bs.fillTarget(2);

      await bs.clickSearch();

      const resultText = await bs.getResultText();

      // Accept any index where value 2 exists: indices 1,2,3
      const pattern = /Element found at index: (\d+)/;
      const match = resultText.match(pattern);
      expect(match).not.toBeNull();
      const index = Number(match ? match[1] : -1);
      expect([1, 2, 3]).toContain(index);

      // No uncaught errors expected
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('FSM entry/exit actions verification and environment inspection', () => {
    test('Verify presence/absence of declared FSM entry actions (renderPage, processInput) and allow natural errors', async ({ page }) => {
      // This test checks for the FSM-declared onEnter actions:
      // - S0 entry action: renderPage() (not implemented in the HTML)
      // - S1 entry action: processInput() (not implemented)
      //
      // We do NOT modify the page. We only inspect whether these functions exist.
      // The expectation: these functions are not defined on window, so typeof === "undefined".
      const bs = new BinarySearchPage(page);
      await bs.goto();

      // Check that renderPage is not defined (as per given HTML)
      const renderPageType = await page.evaluate(() => typeof window.renderPage);
      expect(renderPageType).toBe('undefined');

      // Check that processInput is not defined
      const processInputType = await page.evaluate(() => typeof window.processInput);
      expect(processInputType).toBe('undefined');

      // Confirm that the page does define a binarySearch function (implementation evidence)
      const binarySearchType = await page.evaluate(() => typeof window.binarySearch);
      expect(binarySearchType).toBe('function');

      // Assert that no uncaught runtime errors occurred just by loading and inspecting these globals
      expect(pageErrors.length).toBe(0);
    });

    test('Observe console and pageerror streams remain free of unexpected runtime exceptions during multiple searches', async ({ page }) => {
      // This test runs multiple searches in rapid succession to ensure no intermittent errors occur
      const bs = new BinarySearchPage(page);
      await bs.goto();

      await bs.fillArray('0,1,2,3,4,5,6,7,8,9');
      for (let t = 0; t < 5; t++) {
        await bs.fillTarget(t);
        await bs.clickSearch();

        // result should reflect found index equals t
        const txt = await bs.getResultText();
        expect(txt).toContain(`Element found at index: ${t}`);
      }

      // No uncaught exceptions
      expect(pageErrors.length).toBe(0);

      // No console.error messages
      const errors = consoleMessages.filter((m) => m.type === 'error');
      expect(errors.length).toBe(0);
    });
  });
});