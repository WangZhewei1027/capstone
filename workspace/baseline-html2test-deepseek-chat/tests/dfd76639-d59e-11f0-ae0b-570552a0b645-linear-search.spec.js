import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76639-d59e-11f0-ae0b-570552a0b645.html';

// Page object pattern for the Linear Search page
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.searchValue = page.locator('#searchValue');
    this.searchBtn = page.locator('#searchBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.arrayDisplay = page.locator('#arrayDisplay');
    this.output = page.locator('#output');
    this.comparisonCount = page.locator('#output .comparison-count');
  }

  // Navigate to the app and wait for load
  async load() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Return the array element locators
  arrayElement(index) {
    return this.page.locator(`#element-${index}`);
  }

  // Get all array elements
  async getArrayElements() {
    return this.page.locator('.array-element');
  }

  // Fill the array input and trigger change (the app listens to change event)
  async changeArrayInput(value) {
    await this.arrayInput.fill(value);
    // Dispatch change event so the page's event listener runs
    await this.arrayInput.evaluate((el) => el.dispatchEvent(new Event('change')));
  }

  // Set the search value input
  async setSearchValue(value) {
    await this.searchValue.fill(String(value));
  }

  // Click the search button and wait for the search to finish by waiting for the comparison-count to appear
  async clickSearchAndWaitForCompletion(timeout = 30000) {
    // Click search and wait for either a comparison-count to be rendered indicating completion,
    // or for the search button to become enabled again (isSearching toggled off). We'll wait for comparison-count.
    await Promise.all([
      this.searchBtn.click(),
      this.page.waitForSelector('#output .comparison-count', { timeout })
    ]);
  }

  // Click reset
  async clickReset() {
    await this.resetBtn.click();
  }

  // Read output text content
  async getOutputText() {
    return (await this.output.innerText()).trim();
  }

  // Read comparison count as number (if present)
  async getComparisonCount() {
    if (await this.comparisonCount.count() === 0) return null;
    const text = await this.comparisonCount.textContent();
    return parseInt(text || '0', 10);
  }
}

test.describe('Linear Search Algorithm - Interactive App', () => {
  // Collect console errors and page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages that are errors
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // swallow any unexpected inspection error of console message
      }
    });

    // Collect page runtime errors
    page.on('pageerror', (err) => {
      try {
        pageErrors.push(err.message);
      } catch (e) { /* ignore */ }
    });
  });

  test('Initial page load shows expected default UI and array', async ({ page }) => {
    // Purpose: Verify that on load the page initializes the array display and shows the instructional output
    const app = new LinearSearchPage(page);
    await app.load();

    // Check basic UI elements are visible
    await expect(app.arrayInput).toBeVisible();
    await expect(app.searchValue).toBeVisible();
    await expect(app.searchBtn).toBeVisible();
    await expect(app.resetBtn).toBeVisible();

    // Verify the array display has been rendered with default 9 elements
    const elements = await app.getArrayElements();
    await expect(elements).toHaveCount(9);

    // Verify the content of the first and last elements match the default input
    await expect(app.arrayElement(0)).toHaveText('5');
    await expect(app.arrayElement(8)).toHaveText('6');

    // Output should show the reset instruction message that resetSearch sets on load
    const outputText = await app.getOutputText();
    expect(outputText).toContain('Enter a value and click "Perform Linear Search" to begin.');

    // Ensure no page runtime errors or console errors occurred during load
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Perform linear search finds the first element quickly and shows comparison count 1', async ({ page }) => {
    // Purpose: Validate that searching for the first element results in detection at index 0,
    // updates element classes to "found" and reports comparisons = 1.
    const app = new LinearSearchPage(page);
    await app.load();

    // Set search value to the first element (5) to exercise the best-case path
    await app.setSearchValue(5);

    // Start the search and wait for completion signaled by comparison-count
    await app.clickSearchAndWaitForCompletion();

    // The first element should be marked as found
    const classAttr = await app.arrayElement(0).getAttribute('class');
    expect(classAttr).toBeTruthy();
    expect(classAttr).toContain('found');

    // Output should indicate the value found at index 0
    const outputText = await app.getOutputText();
    expect(outputText).toContain('Value 5 found at index 0');

    // Comparison count should be 1
    const comparisons = await app.getComparisonCount();
    expect(comparisons).toBe(1);

    // No page errors or console errors should have occurred during the search
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Perform linear search for a value not present marks all elements as searched and reports comparisons equal to length', async ({ page }) => {
    // Purpose: Test worst-case / not-found scenario: verifies all elements become "searched"
    // and the comparisons count equals the number of array elements.
    const app = new LinearSearchPage(page);
    await app.load();

    // Choose a value not in the default array
    await app.setSearchValue(42);

    // Start the search and wait for completion
    await app.clickSearchAndWaitForCompletion(20000); // allow extra time for full traversal

    // Output should indicate not found
    const outputText = await app.getOutputText();
    expect(outputText).toContain('Value 42 not found in the array.');

    // Comparison count should equal number of elements (9)
    const comparisons = await app.getComparisonCount();
    expect(comparisons).toBe(9);

    // All elements should have the 'searched' class
    const elements = await app.getArrayElements();
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      const cls = await elements.nth(i).getAttribute('class');
      expect(cls).toBeTruthy();
      expect(cls).toContain('searched');
      expect(cls).not.toContain('found');
    }

    // No page errors or console errors should have occurred during the search
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Reset button restores the original display and clears found/searched states', async ({ page }) => {
    // Purpose: Ensure reset returns UI to initial state after a search has altered classes.
    const app = new LinearSearchPage(page);
    await app.load();

    // Perform a search that will mark at least one element (search for 7 at index 6)
    await app.setSearchValue(7);
    await app.clickSearchAndWaitForCompletion();

    // Confirm at least one element has a 'found' or 'searched' class
    const elementsBeforeReset = await app.getArrayElements();
    let altered = false;
    for (let i = 0; i < await elementsBeforeReset.count(); i++) {
      const cls = await elementsBeforeReset.nth(i).getAttribute('class');
      if (cls && (cls.includes('found') || cls.includes('searched') || cls.includes('current'))) {
        altered = true;
        break;
      }
    }
    expect(altered).toBe(true);

    // Click reset
    await app.clickReset();

    // After reset, none of the elements should have found/searched/current classes
    const elementsAfterReset = await app.getArrayElements();
    for (let i = 0; i < await elementsAfterReset.count(); i++) {
      const cls = await elementsAfterReset.nth(i).getAttribute('class');
      expect(cls).toBeTruthy();
      // Only base class should remain (the implementation uses 'array-element' as base)
      expect(cls).not.toContain('found');
      expect(cls).not.toContain('searched');
      expect(cls).not.toContain('current');
    }

    // Output should be the instructional message again
    const outputText = await app.getOutputText();
    expect(outputText).toContain('Enter a value and click "Perform Linear Search" to begin.');

    // No page errors or console errors should have occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Changing the array input updates the displayed array and triggers reset behavior', async ({ page }) => {
    // Purpose: Verify that modifying the array input triggers the change listener which resets and re-renders the array.
    const app = new LinearSearchPage(page);
    await app.load();

    // New array content
    const newArray = '10,20,30';
    await app.changeArrayInput(newArray);

    // The displayed array should now have three elements
    const elements = await app.getArrayElements();
    await expect(elements).toHaveCount(3);
    await expect(app.arrayElement(0)).toHaveText('10');
    await expect(app.arrayElement(1)).toHaveText('20');
    await expect(app.arrayElement(2)).toHaveText('30');

    // Output should show the instructional reset message after change
    const outputText = await app.getOutputText();
    expect(outputText).toContain('Enter a value and click "Perform Linear Search" to begin.');

    // No page errors or console errors should have occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('UI elements have accessible labels and buttons have meaningful text', async ({ page }) => {
    // Purpose: Basic accessibility checks: inputs should have associated labels and buttons must have visible text.
    const app = new LinearSearchPage(page);
    await app.load();

    // Verify that labels exist for the inputs by querying the document for label[for] matching IDs
    const arrayInputLabel = await page.locator('label[for="arrayInput"]').count();
    const searchValueLabel = await page.locator('label[for="searchValue"]').count();
    expect(arrayInputLabel).toBeGreaterThan(0);
    expect(searchValueLabel).toBeGreaterThan(0);

    // Buttons have readable text content
    await expect(app.searchBtn).toHaveText('Perform Linear Search');
    await expect(app.resetBtn).toHaveText('Reset');

    // No page errors or console errors should have occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Attempting to start a search while one is running does not cause additional concurrent runs', async ({ page }) => {
    // Purpose: Validate that isSearching flag prevents starting another concurrent search.
    const app = new LinearSearchPage(page);
    await app.load();

    // Use a value that will take a few steps but not the entire array to keep test time reasonable
    // For example, search for 8 (which is at index 2 in default array)
    await app.setSearchValue(8);

    // Start the search but do not wait for completion yet
    await app.searchBtn.click();

    // Immediately attempt to click the search button again - the script's guard should ignore this second click
    await app.searchBtn.click();

    // Now wait for completion by waiting for comparison-count to appear
    await page.waitForSelector('#output .comparison-count', { timeout: 15000 });

    // Ensure output indicates it found value 8 at index 2
    const outputText = await app.getOutputText();
    expect(outputText).toContain('Value 8 found at index 2');

    // The comparison count should be 3 (indices 0,1,2) and not doubled or otherwise unexpected
    const comparisons = await app.getComparisonCount();
    expect(comparisons).toBe(3);

    // No page errors or console errors should have occurred
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});