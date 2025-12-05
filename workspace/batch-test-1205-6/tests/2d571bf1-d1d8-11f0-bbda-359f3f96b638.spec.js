import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d571bf1-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Binary Search demo page
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.searchButton = page.locator('#searchButton');
    this.resultDisplay = page.locator('#resultDisplay');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillArray(value) {
    await this.arrayInput.fill(value);
  }

  async fillTarget(value) {
    // value can be string or number
    await this.targetInput.fill(String(value));
  }

  async clickSearch() {
    await Promise.all([
      this.page.waitForTimeout(50), // small pause to allow event propagation; tests will wait for result text explicitly
      this.searchButton.click()
    ]);
  }

  async getResultText() {
    return (await this.resultDisplay.textContent()) ?? '';
  }

  async isBinarySearchDefined() {
    return await this.page.evaluate(() => typeof binarySearch === 'function');
  }

  async callBinarySearchOnPage(array, target) {
    return await this.page.evaluate(
      ({ array, target }) => {
        // run the page's binarySearch function directly
        return binarySearch(array, target);
      },
      { array, target }
    );
  }
}

test.describe('Binary Search Demonstration - FSM and UI tests', () => {
  // We'll capture console messages and page errors for assertions where needed.
  test.beforeEach(async ({ page }) => {
    // Ensure a clean state for each test by navigating anew
    await page.goto(APP_URL);
  });

  test('S0 Idle state: initial render has inputs, button, and empty result', async ({ page }) => {
    // Validate initial DOM corresponds to Idle state
    const bsPage = new BinarySearchPage(page);

    // Elements exist and have expected placeholders / attributes
    await expect(bsPage.arrayInput).toBeVisible();
    await expect(bsPage.arrayInput).toHaveAttribute('placeholder', 'e.g. 1,2,3,4,5');

    await expect(bsPage.targetInput).toBeVisible();
    await expect(bsPage.targetInput).toHaveAttribute('placeholder', 'Enter target number');

    await expect(bsPage.searchButton).toBeVisible();
    await expect(bsPage.searchButton).toHaveText('Search');

    // Result div should be present and empty at start
    await expect(bsPage.resultDisplay).toBeVisible();
    expect(await bsPage.getResultText()).toBe('');

    // The page should expose the binarySearch function per implementation
    expect(await bsPage.isBinarySearchDefined()).toBe(true);

    // No uncaught page errors should have been emitted during initial load
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err));
    // give a tiny moment for any async errors (there should be none)
    await page.waitForTimeout(50);
    expect(pageErrors.length).toBe(0);
  });

  test('Transition S0 -> S1 -> S2: finds existing target and displays correct index', async ({ page }) => {
    // This test validates the transition triggered by SearchButtonClick producing the Result Displayed state
    const bsPage1 = new BinarySearchPage(page);

    await bsPage.fillArray('1,2,3,4,5');
    await bsPage.fillTarget('4');

    // Click the search button (FSM event)
    await bsPage.clickSearch();

    // The expected behavior: resultDisplay updated to indicate found index (zero-based)
    await expect(bsPage.resultDisplay).toHaveText('Target found at index: 3');

    // Ensure no page errors occurred during the operation
    const pageErrors1 = [];
    page.on('pageerror', err => pageErrors.push(err));
    await page.waitForTimeout(50);
    expect(pageErrors.length).toBe(0);
  });

  test('Transition: target not found displays not found message', async ({ page }) => {
    // Validate "not found" branch for S1 -> S2
    const bsPage2 = new BinarySearchPage(page);

    await bsPage.fillArray('1,3,5,7');
    await bsPage.fillTarget('2');

    await bsPage.clickSearch();

    await expect(bsPage.resultDisplay).toHaveText('Target not found.');

    // Double-check binarySearch invoked implicitly by ensuring result text changed
    const text = await bsPage.getResultText();
    expect(text).toBe('Target not found.');
  });

  test('Handles unsorted input by sorting internally and returns correct index for duplicates', async ({ page }) => {
    // The implementation sorts the array before searching; ensure that behavior and duplicate handling
    const bsPage3 = new BinarySearchPage(page);

    // Unsorted with duplicates; sorted -> [1,2,3,3,5], target 3 -> returned index should be 2 (first middle match)
    await bsPage.fillArray('5,1,3,3,2');
    await bsPage.fillTarget('3');

    await bsPage.clickSearch();

    // Implementation's binary search will find one of the indices where value === 3; with this array it should be 2
    await expect(bsPage.resultDisplay).toHaveText('Target found at index: 2');
  });

  test('Edge case: non-numeric array entries map to NaN and result is not found', async ({ page }) => {
    // Non-numeric entries become NaN, comparisons with target should fail resulting in "not found"
    const bsPage4 = new BinarySearchPage(page);

    await bsPage.fillArray('a,b,c');
    await bsPage.fillTarget('1');

    await bsPage.clickSearch();

    await expect(bsPage.resultDisplay).toHaveText('Target not found.');
  });

  test('Edge case: empty inputs - behavior of Number conversion and search on empty string', async ({ page }) => {
    // If array input is empty string and target is empty, Number('') -> 0 and array becomes [''] -> [0] after map(Number)
    const bsPage5 = new BinarySearchPage(page);

    await bsPage.fillArray(''); // user left array blank
    await bsPage.fillTarget(''); // empty target -> Number('') === 0

    await bsPage.clickSearch();

    // With current implementation, ['',].map(Number) => [0] and searching 0 returns index 0
    await expect(bsPage.resultDisplay).toHaveText('Target found at index: 0');
  });

  test('binarySearch function is accessible and behaves correctly when invoked directly', async ({ page }) => {
    // Directly call the page's binarySearch function in page context to validate the onEnter action "binarySearch(array, target)"
    const bsPage6 = new BinarySearchPage(page);

    // simple sanity checks
    const idx1 = await bsPage.callBinarySearchOnPage([1, 2, 3, 4, 5], 3);
    expect(idx1).toBe(2);

    const idx2 = await bsPage.callBinarySearchOnPage([10, 20, 30], 25);
    expect(idx2).toBe(-1);
  });

  test('Absence of renderPage (onEnter action in FSM) triggers a natural ReferenceError when invoked', async ({ page }) => {
    // FSM mentions renderPage() as an entry_action for Idle state. The HTML does NOT define renderPage.
    // Per requirements we should let ReferenceError happen naturally and assert that such an error occurs.
    const pageErrors2 = [];
    page.on('pageerror', err => {
      // Collect the error messages emitted by the page
      if (err && err.message) pageErrors.push(err.message);
      else pageErrors.push(String(err));
    });

    // Attempt to call renderPage() in the page context; because it's not defined this should throw a ReferenceError.
    let caughtError = null;
    try {
      await page.evaluate(() => {
        // Intentionally call the identifier that does not exist to provoke a ReferenceError in page context
        renderPage();
      });
    } catch (err) {
      // page.evaluate will reject; capture the thrown error object for assertions
      caughtError = err;
    }

    // Assert that an error was thrown by page.evaluate
    expect(caughtError).not.toBeNull();
    // The error message should mention renderPage; accept ReferenceError or similar phrasing across engines
    expect(String(caughtError)).toContain('renderPage');

    // Also assert that the page emitted a pageerror related to renderPage
    // Wait briefly to ensure pageerror event is received
    await page.waitForTimeout(50);
    const found = pageErrors.some(msg => msg.includes('renderPage'));
    expect(found).toBe(true);
  });

  test('No unexpected console.error messages during normal operations', async ({ page }) => {
    // Validate that normal search operations do not emit console.error logs
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const bsPage7 = new BinarySearchPage(page);

    // Perform some searches
    await bsPage.fillArray('2,4,6,8');
    await bsPage.fillTarget('6');
    await bsPage.clickSearch();
    await expect(bsPage.resultDisplay).toHaveText('Target found at index: 2');

    await bsPage.fillArray('9,7,5');
    await bsPage.fillTarget('1');
    await bsPage.clickSearch();
    await expect(bsPage.resultDisplay).toHaveText('Target not found.');

    // Allow console events to propagate
    await page.waitForTimeout(50);

    // There should be no console.error messages during these normal interactions
    expect(consoleErrors.length).toBe(0);
  });
});