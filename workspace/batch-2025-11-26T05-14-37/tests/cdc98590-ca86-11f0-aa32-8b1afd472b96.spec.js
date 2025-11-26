import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc98590-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Quick Sort Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Quick Sort application page before each test
    await page.goto(BASE_URL);
  });

  test('should display the correct title', async ({ page }) => {
    // Validate that the title of the page is displayed correctly
    const title = await page.locator('h1').innerText();
    expect(title).toBe('Quick Sort');
  });

  test('should display the Quick Sort description', async ({ page }) => {
    // Validate that the description of Quick Sort is present
    const description = await page.locator('p').nth(0).innerText();
    expect(description).toContain('Quick Sort is an efficient sorting algorithm');
  });

  test('should display the example implementation of Quick Sort', async ({ page }) => {
    // Validate that the example implementation is present
    const exampleText = await page.locator('p').nth(1).innerText();
    expect(exampleText).toContain('Here\'s an example implementation of Quick Sort in JavaScript:');
  });

  test('should sort an array correctly using quickSort function', async ({ page }) => {
    // Validate that the quickSort function sorts the array correctly
    await page.evaluate(() => {
      window.arr = [9, 5, 3, 8, 2, 7, 6, 4, 1];
      window.sortedArr = quickSort(window.arr);
    });
    
    const sortedArr = await page.evaluate(() => window.sortedArr);
    expect(sortedArr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('should handle an empty array', async ({ page }) => {
    // Validate that the quickSort function handles an empty array correctly
    await page.evaluate(() => {
      window.arr = [];
      window.sortedArr = quickSort(window.arr);
    });

    const sortedArr = await page.evaluate(() => window.sortedArr);
    expect(sortedArr).toEqual([]);
  });

  test('should handle an array with one element', async ({ page }) => {
    // Validate that the quickSort function handles an array with one element correctly
    await page.evaluate(() => {
      window.arr = [42];
      window.sortedArr = quickSort(window.arr);
    });

    const sortedArr = await page.evaluate(() => window.sortedArr);
    expect(sortedArr).toEqual([42]);
  });

  test('should handle an array with duplicate elements', async ({ page }) => {
    // Validate that the quickSort function handles an array with duplicate elements correctly
    await page.evaluate(() => {
      window.arr = [5, 3, 5, 2, 5, 1];
      window.sortedArr = quickSort(window.arr);
    });

    const sortedArr = await page.evaluate(() => window.sortedArr);
    expect(sortedArr).toEqual([1, 2, 3, 5, 5, 5]);
  });
});