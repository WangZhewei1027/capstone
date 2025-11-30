import { test, expect } from '@playwright/test';

// Page Object for the Radix Sort demo page
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#arrayInput');
    this.sortButton = page.locator('button', { hasText: 'Sort using Radix Sort' });
    this.sortedParagraph = page.locator('#sortedArray');
  }

  // Navigate to the demo page
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/1da0f49a-cd2f-11f0-a440-159d7b77af86.html');
    // Wait for main elements to be present
    await expect(this.input).toBeVisible();
    await expect(this.sortButton).toBeVisible();
    await expect(this.sortedParagraph).toBeVisible();
  }

  // Enter comma-separated values into the input
  async enterArray(value) {
    await this.input.fill('');
    await this.input.type(value);
  }

  // Click the sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Get the displayed sorted text
  async getSortedText() {
    return (await this.sortedParagraph.textContent())?.trim() ?? '';
  }
}

test.describe('Radix Sort Demonstration - End-to-end tests', () => {
  // Store console errors and page errors observed during each test
  test.beforeEach(async ({ page }) => {
    // No-op here; listeners are set in each test to capture per-test errors
  });

  // Test initial page load and default state
  test('Initial page load shows input, button and empty result area', async ({ page }) => {
    // Capture console and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    const radix = new RadixSortPage(page);
    await radix.goto();

    // Verify the input placeholder and that the sort button is present
    await expect(radix.input).toHaveAttribute('placeholder', /e\.g\./i);
    await expect(radix.sortButton).toHaveText('Sort using Radix Sort');

    // The sorted array paragraph should be empty on initial load
    const initialText = await radix.getSortedText();
    expect(initialText).toBe('', 'Expected sorted array paragraph to be empty on initial load');

    // Assert no unexpected console or page errors occurred during load
    expect(pageErrors).toEqual([], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    expect(consoleErrors).toEqual([], `Unexpected console.error messages: ${consoleErrors.join(' | ')}`);
  });

  // Test sorting a well-known example
  test('Sorts a typical numeric array correctly', async ({ page }) => {
    // Capture console and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    const radix = new RadixSortPage(page);
    await radix.goto();

    // Enter the example array and click sort
    const inputValue = '170, 45, 75, 90, 802, 24, 2, 66';
    await radix.enterArray(inputValue);
    await radix.clickSort();

    // Verify the displayed sorted array matches expected radix sort result
    const sorted = await radix.getSortedText();
    expect(sorted).toBe('2, 24, 45, 66, 75, 90, 170, 802', 'Sorted result should match expected order');

    // Ensure no page or console errors were produced during processing
    expect(pageErrors).toEqual([], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    expect(consoleErrors).toEqual([], `Unexpected console.error messages: ${consoleErrors.join(' | ')}`);
  });

  // Test empty input scenario
  test('Handles empty input gracefully (interprets empty token as 0)', async ({ page }) => {
    // Capture console and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    const radix = new RadixSortPage(page);
    await radix.goto();

    // Enter an empty string and sort
    await radix.enterArray('');
    await radix.clickSort();

    // The implementation turns '' into Number('') === 0, so result should be '0'
    const sorted = await radix.getSortedText();
    expect(sorted).toBe('0', 'Empty input should result in an array containing 0');

    expect(pageErrors).toEqual([], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    expect(consoleErrors).toEqual([], `Unexpected console.error messages: ${consoleErrors.join(' | ')}`);
  });

  // Test non-numeric values behavior
  test('Non-numeric inputs produce NaN entries without throwing exceptions', async ({ page }) => {
    // Capture console and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    const radix = new RadixSortPage(page);
    await radix.goto();

    // Provide non-numeric tokens alongside numeric ones
    await radix.enterArray('foo, bar, 3');
    await radix.clickSort();

    // The implementation maps Number('foo') -> NaN and does not throw; expect NaN tokens in output
    const sorted = await radix.getSortedText();

    // We expect the array to include 'NaN' entries and the numeric '3'
    expect(sorted.includes('NaN')).toBeTruthy();
    expect(sorted.includes('3')).toBeTruthy();

    // Also assert that no uncaught page errors occurred (the app should handle this path without throwing)
    expect(pageErrors).toEqual([], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    expect(consoleErrors).toEqual([], `Unexpected console.error messages: ${consoleErrors.join(' | ')}`);
  });

  // Test negative numbers (edge case) - verify DOM updates and no exceptions
  test('Negative numbers produce an updated DOM and do not throw runtime errors', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    const radix = new RadixSortPage(page);
    await radix.goto();

    // Negative numbers aren't explicitly handled by the algorithm; ensure it doesn't crash
    await radix.enterArray('-5, 15, 0');
    await radix.clickSort();

    const sorted = await radix.getSortedText();
    // The exact order may be unpredictable due to algorithm not supporting negatives,
    // but the DOM should contain all submitted values as substrings.
    expect(sorted).toContain('-5');
    expect(sorted).toContain('15');
    expect(sorted).toContain('0');

    // Confirm no runtime errors or console.error happened
    expect(pageErrors).toEqual([], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    expect(consoleErrors).toEqual([], `Unexpected console.error messages: ${consoleErrors.join(' | ')}`);
  });

  // Test multiple sequential sorts update the output correctly
  test('Multiple sequential sorts update the output each time', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    const radix = new RadixSortPage(page);
    await radix.goto();

    // First sort
    await radix.enterArray('3,1,2');
    await radix.clickSort();
    const first = await radix.getSortedText();
    expect(first).toBe('1, 2, 3');

    // Second sort with different data
    await radix.enterArray('10,9,8,7');
    await radix.clickSort();
    const second = await radix.getSortedText();
    expect(second).toBe('7, 8, 9, 10');

    // Third sort with a single element
    await radix.enterArray('42');
    await radix.clickSort();
    const third = await radix.getSortedText();
    expect(third).toBe('42');

    expect(pageErrors).toEqual([], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    expect(consoleErrors).toEqual([], `Unexpected console.error messages: ${consoleErrors.join(' | ')}`);
  });
});