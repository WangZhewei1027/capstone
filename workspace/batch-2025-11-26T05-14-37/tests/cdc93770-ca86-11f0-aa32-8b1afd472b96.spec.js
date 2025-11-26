import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc93770-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Insertion Sort Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('should display the correct title', async ({ page }) => {
    // Validate that the page title is correct
    const title = await page.title();
    expect(title).toBe(' insertion sort');
  });

  test('should display the main heading', async ({ page }) => {
    // Validate that the main heading is present
    const heading = await page.locator('h1').innerText();
    expect(heading).toBe('Insertion sort');
  });

  test('should display the correct description', async ({ page }) => {
    // Validate that the description of the algorithm is present
    const description = await page.locator('p').innerText();
    expect(description).toContain('The insertion sort algorithm is an efficient sorting algorithm');
  });

  test('should correctly sort an array using insertion sort', async ({ page }) => {
    // Check the console output for the sorting function
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Trigger the insertion sort function
    await page.evaluate(() => {
      return insertionSort([3, 6, 8, 2, 9]);
    });

    // Validate the console output
    expect(consoleMessages).toContain('[2, 3, 6, 8, 9]');
  });

  test('should handle an empty array', async ({ page }) => {
    // Check the console output for sorting an empty array
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Trigger the insertion sort function with an empty array
    await page.evaluate(() => {
      return insertionSort([]);
    });

    // Validate the console output
    expect(consoleMessages).toContain('[]');
  });

  test('should handle an array with one element', async ({ page }) => {
    // Check the console output for sorting an array with one element
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Trigger the insertion sort function with a single element
    await page.evaluate(() => {
      return insertionSort([5]);
    });

    // Validate the console output
    expect(consoleMessages).toContain('[5]');
  });

  test('should handle an already sorted array', async ({ page }) => {
    // Check the console output for sorting an already sorted array
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Trigger the insertion sort function with a sorted array
    await page.evaluate(() => {
      return insertionSort([1, 2, 3, 4, 5]);
    });

    // Validate the console output
    expect(consoleMessages).toContain('[1, 2, 3, 4, 5]');
  });

  test('should handle an array with duplicate elements', async ({ page }) => {
    // Check the console output for sorting an array with duplicates
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Trigger the insertion sort function with duplicates
    await page.evaluate(() => {
      return insertionSort([3, 1, 2, 3, 2]);
    });

    // Validate the console output
    expect(consoleMessages).toContain('[1, 2, 2, 3, 3]');
  });
});