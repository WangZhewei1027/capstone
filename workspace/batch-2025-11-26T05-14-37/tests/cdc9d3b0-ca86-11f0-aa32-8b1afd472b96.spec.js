import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc9d3b0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Counting Sort Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('Initial state should render the page correctly', async ({ page }) => {
    // Validate that the initial state is rendered correctly
    const title = await page.locator('h1').innerText();
    expect(title).toBe('Counting Sort');

    const countSortText = await page.locator('#countSort').innerText();
    expect(countSortText).toBe('');
  });

  test('Counting Sort should sort the array and display the result', async ({ page }) => {
    // Call the countingSort function directly to transition to the Sorted state
    await page.evaluate(() => countingSort([3, 6, 9, 1, 2, 5]));

    // Validate that the sorted result is displayed correctly
    const countSortText = await page.locator('#countSort').innerText();
    expect(countSortText).toBe('1, 2, 3, 5, 6, 9');
  });

  test('Edge case: Empty array should not throw an error and display nothing', async ({ page }) => {
    // Call the countingSort function with an empty array
    await page.evaluate(() => countingSort([]));

    // Validate that nothing is displayed for an empty array
    const countSortText = await page.locator('#countSort').innerText();
    expect(countSortText).toBe('');
  });

  test('Edge case: Single element array should display the same element', async ({ page }) => {
    // Call the countingSort function with a single element array
    await page.evaluate(() => countingSort([5]));

    // Validate that the single element is displayed correctly
    const countSortText = await page.locator('#countSort').innerText();
    expect(countSortText).toBe('5');
  });

  test('Edge case: Already sorted array should display the same array', async ({ page }) => {
    // Call the countingSort function with an already sorted array
    await page.evaluate(() => countingSort([1, 2, 3, 4, 5]));

    // Validate that the sorted result is displayed correctly
    const countSortText = await page.locator('#countSort').innerText();
    expect(countSortText).toBe('1, 2, 3, 4, 5');
  });

  test('Edge case: Array with duplicate elements should display sorted result correctly', async ({ page }) => {
    // Call the countingSort function with an array containing duplicates
    await page.evaluate(() => countingSort([3, 1, 2, 2, 3, 1]));

    // Validate that the sorted result is displayed correctly
    const countSortText = await page.locator('#countSort').innerText();
    expect(countSortText).toBe('1, 1, 2, 2, 3, 3');
  });
});