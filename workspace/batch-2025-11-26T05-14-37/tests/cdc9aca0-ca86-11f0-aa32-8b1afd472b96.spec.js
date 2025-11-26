import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc9aca0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Heap Sort Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Heap Sort application page before each test
    await page.goto(BASE_URL);
  });

  test('should display the correct title and description', async ({ page }) => {
    // Validate that the title of the page is correct
    const title = await page.locator('h1').innerText();
    expect(title).toBe('Heap Sort');

    // Validate that the description of the algorithm is displayed correctly
    const description = await page.locator('p').innerText();
    expect(description).toContain('The Heap Sort algorithm is an efficient comparison-based sorting algorithm');
  });

  test('should render the heapSort function in code block', async ({ page }) => {
    // Validate that the code block for the heapSort function is present
    const codeBlock = await page.locator('pre code').innerText();
    expect(codeBlock).toContain('function heapSort(arr)');
  });

  test('should handle an empty array', async ({ page }) => {
    // Test the heapSort function with an empty array
    const result = await page.evaluate(() => heapSort([]));
    expect(result).toEqual([]);
  });

  test('should handle an array with one element', async ({ page }) => {
    // Test the heapSort function with an array containing one element
    const result = await page.evaluate(() => heapSort([5]));
    expect(result).toEqual([5]);
  });

  test('should sort an array with multiple elements', async ({ page }) => {
    // Test the heapSort function with an unsorted array
    const result = await page.evaluate(() => heapSort([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]));
    expect(result).toEqual([1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
  });

  test('should handle an already sorted array', async ({ page }) => {
    // Test the heapSort function with an already sorted array
    const result = await page.evaluate(() => heapSort([1, 2, 3, 4, 5]));
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test('should handle an array with duplicate elements', async ({ page }) => {
    // Test the heapSort function with an array containing duplicate elements
    const result = await page.evaluate(() => heapSort([5, 3, 5, 2, 5, 1, 4]));
    expect(result).toEqual([1, 2, 3, 4, 5, 5, 5]);
  });

  test('should handle negative numbers', async ({ page }) => {
    // Test the heapSort function with an array containing negative numbers
    const result = await page.evaluate(() => heapSort([-1, -3, -2, 0, 2, 1]));
    expect(result).toEqual([-3, -2, -1, 0, 1, 2]);
  });

  test('should handle large numbers', async ({ page }) => {
    // Test the heapSort function with an array containing large numbers
    const result = await page.evaluate(() => heapSort([1000000, 500000, 10000000, 0]));
    expect(result).toEqual([0, 500000, 1000000, 10000000]);
  });
});