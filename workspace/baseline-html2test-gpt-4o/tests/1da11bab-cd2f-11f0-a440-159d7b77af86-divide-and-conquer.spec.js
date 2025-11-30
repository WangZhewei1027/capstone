import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11bab-cd2f-11f0-a440-159d7b77af86.html';

// Page Object Model for the Divide and Conquer page
class DivideAndConquerPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.sortButton = page.locator('button', { hasText: 'Sort' });
    this.sortedList = page.locator('#sortedList');
    this.listItems = this.sortedList.locator('li');
    this.heading = page.locator('h1');
    this.subHeading = page.locator('h3', { hasText: 'Merge Sort Definition' });
  }

  async goto() {
    await this.page.goto(URL);
  }

  async sort(inputValue) {
    // Fill input and click the Sort button to trigger performMergeSort()
    await this.input.fill(inputValue);
    await this.sortButton.click();
  }

  async getSortedValues() {
    // Return array of text contents of list items
    return await this.listItems.allTextContents();
  }

  async countSortedItems() {
    return await this.listItems.count();
  }
}

test.describe('Divide and Conquer - Merge Sort Demo', () => {
  // Arrays to collect console errors and page runtime errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect unhandled exceptions from the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test assert that there were no console errors or page errors
    // This validates the runtime did not throw unexpected errors while interacting with the page
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page runtime errors occurred: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Initial page load shows expected UI elements and default state', async ({ page }) => {
    // Purpose: Verify that the page loads and the primary elements exist and are in their default state.
    const app = new DivideAndConquerPage(page);
    await app.goto();

    // Basic UI assertions
    await expect(app.heading).toHaveText('Divide and Conquer');
    await expect(app.subHeading).toBeVisible();
    await expect(app.input).toHaveAttribute('placeholder', 'Enter comma-separated numbers');
    await expect(app.sortButton).toBeVisible();

    // Sorted list should be present and empty by default
    await expect(app.sortedList).toBeVisible();
    await expect(app.listItems).toHaveCount(0);
  });

  test('Sorts comma-separated integers correctly', async ({ page }) => {
    // Purpose: Validate that entering "3,1,2" sorts to "1,2,3"
    const app = new DivideAndConquerPage(page);
    await app.goto();

    await app.sort('3,1,2');

    // Expect exactly three list items
    await expect(app.listItems).toHaveCount(3);

    // Validate order and content
    const values = await app.getSortedValues();
    expect(values).toEqual(['1', '2', '3']);
  });

  test('Handles whitespace and repeated sorts (previous result cleared)', async ({ page }) => {
    // Purpose: Ensure whitespace is tolerated and subsequent sorts replace prior results
    const app = new DivideAndConquerPage(page);
    await app.goto();

    // First sort with whitespace
    await app.sort(' 10 , 2 ');
    await expect(app.listItems).toHaveCount(2);
    let values = await app.getSortedValues();
    expect(values).toEqual(['2', '10']);

    // Now perform a different sort and ensure previous results are cleared
    await app.sort('5');
    await expect(app.listItems).toHaveCount(1);
    values = await app.getSortedValues();
    expect(values).toEqual(['5']);
  });

  test('Empty input results in a single 0 (Number(\'\') === 0) and displays correctly', async ({ page }) => {
    // Purpose: Test edge case where input is empty; the implementation maps '' to Number('') === 0
    const app = new DivideAndConquerPage(page);
    await app.goto();

    // Clear input explicitly (input starts empty, but ensure consistent behavior)
    await app.input.fill('');
    await app.sort(''); // click sort with empty string

    await expect(app.listItems).toHaveCount(1);
    const values = await app.getSortedValues();
    expect(values).toEqual(['0']);
  });

  test('Invalid numeric entries produce NaN in the sorted output and order is as produced by mergeSort', async ({ page }) => {
    // Purpose: Validate behavior when non-numeric tokens are provided (map(Number) yields NaN)
    // The merge implementation will place numeric values before NaN in this particular comparison logic.
    const app = new DivideAndConquerPage(page);
    await app.goto();

    // Enter an invalid token and a valid number
    await app.sort('a,1');

    // Expect two list items: '1' then 'NaN' based on how merge() uses < comparisons with NaN
    await expect(app.listItems).toHaveCount(2);
    const values = await app.getSortedValues();
    // Verify both expected string representations are present and order is numeric-first then NaN
    expect(values).toEqual(['1', 'NaN']);
  });

  test('Multiple sequential interactions produce expected DOM updates without accumulating stale nodes', async ({ page }) => {
    // Purpose: Ensure that calling Sort multiple times replaces the list rather than appending repeatedly
    const app = new DivideAndConquerPage(page);
    await app.goto();

    // First sort
    await app.sort('4,3,2,1');
    await expect(app.listItems).toHaveCount(4);
    let values = await app.getSortedValues();
    expect(values).toEqual(['1', '2', '3', '4']);

    // Second sort with fewer numbers
    await app.sort('7,6');
    await expect(app.listItems).toHaveCount(2);
    values = await app.getSortedValues();
    expect(values).toEqual(['6', '7']);

    // Third sort with different values
    await app.sort('0');
    await expect(app.listItems).toHaveCount(1);
    values = await app.getSortedValues();
    expect(values).toEqual(['0']);
  });

  test('Accessibility basics: input and button are focusable and have visible labels/placeholder', async ({ page }) => {
    // Purpose: Check minimal accessibility attributes and interactive focus behavior
    const app = new DivideAndConquerPage(page);
    await app.goto();

    // Input should be focusable
    await app.input.focus();
    await expect(app.input).toBeFocused();

    // Button should be focusable and actionable via keyboard (press Enter when focused on input)
    // Focus input, type value and press Enter to simulate keyboard-driven form submission behavior
    await app.input.fill('2,1');
    await app.input.press('Enter'); // Note: There is no form so this may not trigger sorting, but we assert the elements accept keyboard interaction
    // After pressing Enter we still expect no runtime errors
    // Then explicitly click the Sort button to perform sorting
    await app.sortButton.click();
    await expect(app.listItems).toHaveCount(2);
    const values = await app.getSortedValues();
    expect(values).toEqual(['1', '2']);
  });
});