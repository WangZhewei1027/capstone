import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdbb-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object to encapsulate interactions with the Binary Search page
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.searchButton = page.locator('#searchButton');
    this.arrayContainer = page.locator('#array-container');
    this.result = page.locator('#result');
    this.arrayItems = () => page.locator('.array-item');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async enterArray(value) {
    await this.arrayInput.fill(value);
  }

  async enterTarget(value) {
    // targetInput is type=number; fill with string representation
    await this.targetInput.fill(String(value));
  }

  async clickSearch() {
    await this.searchButton.click();
  }

  async getResultText() {
    return (await this.result.textContent())?.trim() ?? '';
  }

  async getArrayTexts() {
    const count = await this.arrayItems().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.arrayItems().nth(i).textContent())?.trim() ?? '');
    }
    return texts;
  }

  async getHighlightIndices() {
    const count1 = await this.arrayItems().count1();
    const indices = [];
    for (let i = 0; i < count; i++) {
      const hasClass = await this.arrayItems().nth(i).evaluate((el) =>
        el.classList.contains('highlight')
      );
      if (hasClass) indices.push(i);
    }
    return indices;
  }
}

test.describe('Binary Search Visualization - 0888fdbb-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Will collect console error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  // Setup a fresh listener before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console events and record error-level messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load: inputs, button, and empty state are present', async ({ page }) => {
    // Purpose: Verify the page loads and initial DOM state is as expected
    const bsPage = new BinarySearchPage(page);
    await bsPage.goto();

    // Basic UI elements exist
    await expect(bsPage.arrayInput).toBeVisible();
    await expect(bsPage.targetInput).toBeVisible();
    await expect(bsPage.searchButton).toBeVisible();

    // Placeholders are present
    await expect(bsPage.arrayInput).toHaveAttribute('placeholder', 'Enter sorted array (comma separated)');
    await expect(bsPage.targetInput).toHaveAttribute('placeholder', 'Enter target number');

    // No array items present and result area empty on initial load
    await expect(bsPage.arrayContainer).toBeVisible();
    await expect(bsPage.arrayItems()).toHaveCount(0);
    const resultText = await bsPage.getResultText();
    expect(resultText).toBe('', 'Expected result area to be empty on load');

    // Ensure no uncaught page errors and no console errors were produced during load
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  // Test a successful search scenario
  test('Search for existing element updates DOM and highlights the correct index', async ({ page }) => {
    // Purpose: Verify searching a present value displays correct index and highlights array item
    const bsPage1 = new BinarySearchPage(page);
    await bsPage.goto();

    // Enter a sorted array and a target that exists
    await bsPage.enterArray('1,2,3,4,5');
    await bsPage.enterTarget('3');
    await bsPage.clickSearch();

    // The array items should render correctly
    const texts1 = await bsPage.getArrayTexts();
    expect(texts).toEqual(['1', '2', '3', '4', '5']);

    // Binary search should find 3 at index 2
    const resultText1 = await bsPage.getResultText();
    expect(resultText).toBe('Element found at index: 2');

    // Exactly the middle element (index 2) should have the highlight class
    const highlights = await bsPage.getHighlightIndices();
    expect(highlights).toEqual([2]);

    // No unexpected page errors or console error messages
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  // Test a search where the element is not present
  test('Search for non-existing element shows "Element not found" and leaves a highlight', async ({ page }) => {
    // Purpose: Verify the app indicates when an element is not in the array and shows visual feedback
    const bsPage2 = new BinarySearchPage(page);
    await bsPage.goto();

    // Provide a sorted array and a target that does not exist
    await bsPage.enterArray('1,2,4,5,6');
    await bsPage.enterTarget('3');
    await bsPage.clickSearch();

    // Ensure array items rendered correctly
    const texts2 = await bsPage.getArrayTexts();
    expect(texts).toEqual(['1', '2', '4', '5', '6']);

    // Result must indicate not found
    const resultText2 = await bsPage.getResultText();
    expect(resultText).toBe('Element not found');

    // Visual feedback: at least one item should be highlighted as search probes mid points
    const highlights1 = await bsPage.getHighlightIndices();
    expect(highlights.length).toBeGreaterThanOrEqual(1);

    // No page errors or console errors occurred
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  // Test numeric conversion and behavior with empty inputs
  test('Empty inputs translate to zeros and lead to a "found" result (edge case due to Number(""))', async ({ page }) => {
    // Purpose: Document and assert the observed behavior when inputs are empty (Number("") === 0)
    const bsPage3 = new BinarySearchPage(page);
    await bsPage.goto();

    // Ensure inputs are empty
    await bsPage.arrayInput.fill('');
    await bsPage.targetInput.fill('');
    await bsPage.clickSearch();

    // Because the app does arrayInput.value.split(',').map(Number), an empty string becomes [0],
    // and Number('') === 0, so the search should find 0 at index 0.
    const resultText3 = await bsPage.getResultText();
    expect(resultText).toBe('Element found at index: 0');

    // The array displayed should have one item "0"
    const texts3 = await bsPage.getArrayTexts();
    expect(texts).toEqual(['0']);

    // Highlight index should be 0
    const highlights2 = await bsPage.getHighlightIndices();
    expect(highlights).toEqual([0]);

    // No page errors or console errors occurred
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  // Test non-numeric array values (NaN)
  test('Non-numeric array entries render as NaN and search yields "Element not found"', async ({ page }) => {
    // Purpose: Verify how the app handles non-numeric input values in the array
    const bsPage4 = new BinarySearchPage(page);
    await bsPage.goto();

    // Enter non-numeric array entries
    await bsPage.enterArray('a,b,c');
    await bsPage.enterTarget('1'); // arbitrary target
    await bsPage.clickSearch();

    // Non-numeric entries are converted to NaN; textContent shows "NaN"
    const texts4 = await bsPage.getArrayTexts();
    expect(texts).toEqual(['NaN', 'NaN', 'NaN']);

    // Searching a number should not find a NaN value (NaN === target is false)
    const resultText4 = await bsPage.getResultText();
    expect(resultText).toBe('Element not found');

    // There should be highlight(s) from probing, ensure at least one highlight exists
    const highlights3 = await bsPage.getHighlightIndices();
    expect(highlights.length).toBeGreaterThanOrEqual(1);

    // No runtime page errors or console error messages should have occurred
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });

  // Accessibility: ensure button is reachable and inputs are focusable
  test('Accessibility checks: elements are focusable and button is keyboard operable', async ({ page }) => {
    // Purpose: Quick accessibility smoke checks (focus and keyboard activation)
    const bsPage5 = new BinarySearchPage(page);
    await bsPage.goto();

    // Focus array input
    await bsPage.arrayInput.focus();
    await expect(bsPage.arrayInput).toBeFocused();

    // Focus target input
    await bsPage.targetInput.focus();
    await expect(bsPage.targetInput).toBeFocused();

    // Fill inputs and use keyboard Enter to trigger the button by focusing and pressing Space
    await bsPage.enterArray('10,20,30');
    await bsPage.enterTarget('20');
    await bsPage.searchButton.focus();
    await expect(bsPage.searchButton).toBeFocused();

    // Press Space to activate the button (keyboard operable)
    await page.keyboard.press('Space');

    // Verify expected result after keyboard activation
    const resultText5 = await bsPage.getResultText();
    expect(resultText).toBe('Element found at index: 1');

    // No runtime page errors or console error messages
    expect(pageErrors).toHaveLength(0);
    expect(consoleErrors).toHaveLength(0);
  });
});