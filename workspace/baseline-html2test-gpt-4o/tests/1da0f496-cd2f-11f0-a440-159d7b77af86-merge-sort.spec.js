import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0f496-cd2f-11f0-a440-159d7b77af86.html';

// Page object model for the Merge Sort demo page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.sortButton = page.getByRole('button', { name: 'Sort' });
    this.result = page.locator('#result');
    this.heading = page.locator('h2');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillInput(value) {
    await this.input.fill(value);
  }

  async clickSort() {
    await this.sortButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  async getInputValue() {
    return (await this.input.inputValue()) ?? '';
  }
}

test.describe('Merge Sort Visualization - UI and Behavior', () => {
  // We'll collect any console error messages and uncaught page errors so tests can assert about them.
  test.beforeEach(async ({ page }) => {
    // Nothing here; individual tests will create MergeSortPage and attach listeners as needed.
  });

  // Test initial page load and default state
  test('Initial load: UI elements are present and default state is empty', async ({ page }) => {
    // Purpose: Verify the page loads, the input/button/result exist, and no error messages are emitted.
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    const mergePage = new MergeSortPage(page);
    await mergePage.goto();

    // Verify heading is visible and correct
    await expect(mergePage.heading).toBeVisible();
    await expect(mergePage.heading).toHaveText('Merge Sort Visualization');

    // Verify input and button are visible
    await expect(mergePage.input).toBeVisible();
    await expect(mergePage.sortButton).toBeVisible();

    // On initial load, the result container should be present but empty
    await expect(mergePage.result).toBeVisible();
    const initialResult = await mergePage.getResultText();
    expect(initialResult.trim()).toBe('', 'Expected no result text on initial load');

    // Ensure there are no runtime console errors or uncaught page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test.describe('Sorting behavior: normal inputs', () => {
    // Test sorting small arrays
    test('Sorts numbers correctly for "3,1,2"', async ({ page }) => {
      // Purpose: Enter a simple unsorted list and verify the sorted result is shown in the DOM.
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      await mergePage.fillInput('3,1,2');
      await mergePage.clickSort();

      const result = (await mergePage.getResultText()).trim();
      expect(result).toBe('Sorted Array: [1, 2, 3]');

      // Verify input value remains the same (UI doesn't clear it)
      expect(await mergePage.getInputValue()).toBe('3,1,2');

      // No runtime errors expected
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Trims whitespace and sorts " 4 , 2,  9 "', async ({ page }) => {
      // Purpose: Ensure whitespace around numbers is handled and sorting works.
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      await mergePage.fillInput(' 4 , 2,  9 ');
      await mergePage.clickSort();

      const result = (await mergePage.getResultText()).trim();
      expect(result).toBe('Sorted Array: [2, 4, 9]');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Handles negatives and duplicates "-1, 5, -1, 3"', async ({ page }) => {
      // Purpose: Verify sorting works with negative numbers and duplicates.
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      await mergePage.fillInput('-1, 5, -1, 3');
      await mergePage.clickSort();

      const result = (await mergePage.getResultText()).trim();
      expect(result).toBe('Sorted Array: [-1, -1, 3, 5]');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Empty input field results in [0] because Number("") === 0', async ({ page }) => {
      // Purpose: Confirm the application's specific behavior for an empty input string.
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      // Leave input empty and click sort
      await mergePage.fillInput('');
      await mergePage.clickSort();

      const result = (await mergePage.getResultText()).trim();
      // Behavior explanation: input.split(',') on '' gives [''], Number('') is 0 => sorted [0]
      expect(result).toBe('Sorted Array: [0]');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Invalid numeric tokens produce NaN in the output (example: "a,1" -> [1, NaN])', async ({ page }) => {
      // Purpose: Observe how the app treats non-numeric tokens and assert the resulting DOM output.
      // We will not patch or change the app; we assert the observed behavior.
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      await mergePage.fillInput('a,1');
      await mergePage.clickSort();

      const result = (await mergePage.getResultText()).trim();
      // Observed behavior reasoning:
      // Number('a') -> NaN, Number('1') -> 1, merge sorts to [1, NaN]
      expect(result).toBe('Sorted Array: [1, NaN]');

      // Even with NaN present, the page should not emit console errors or uncaught exceptions
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test('Large input array sorts correctly and updates the DOM', async ({ page }) => {
      // Purpose: Confirm sorting works for a larger input and the result is displayed.
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', err => pageErrors.push(err.message));

      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      const inputArray = '10,9,8,7,6,5,4,3,2,1,0';
      await mergePage.fillInput(inputArray);
      await mergePage.clickSort();

      const result = (await mergePage.getResultText()).trim();
      expect(result).toBe('Sorted Array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]');

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Accessibility and attributes', () => {
    test('Input has placeholder and is focusable', async ({ page }) => {
      // Purpose: Basic accessibility check - placeholder is present and input can be focused.
      const mergePage = new MergeSortPage(page);
      await mergePage.goto();

      await expect(mergePage.input).toHaveAttribute('placeholder', 'Enter numbers separated by commas');
      await mergePage.input.focus();
      // After focusing, the active element should be the input
      const activeId = await page.evaluate(() => document.activeElement?.id);
      expect(activeId).toBe('inputArray');
    });
  });
});