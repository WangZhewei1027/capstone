import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/13726bd0-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('Bubble Sort Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    // Verify that the sorted array div is empty
    const sortedArray = await page.locator('#sortedArray').innerText();
    expect(sortedArray).toBe('');
  });

  test('should transition to sorting state on sort button click', async ({ page }) => {
    // Input a sample array and click sort
    await page.fill('#bubbleSortInput', '3,1,2');
    await page.click('button');

    // Verify that the sorting process has started (this might involve checking for a loading indicator or similar)
    // Assuming we have a way to check if sorting is in progress
    // This could be a visual change or a temporary message
    const sortingInProgress = await page.locator('#sortedArray').innerText();
    expect(sortingInProgress).not.toBe('');
  });

  test('should transition to done state after sorting is complete', async ({ page }) => {
    // Input a sample array and click sort
    await page.fill('#bubbleSortInput', '3,1,2');
    await page.click('button');

    // Wait for sorting to complete (this could be a timeout or a specific element appearing)
    await page.waitForTimeout(1000); // Adjust based on expected sort duration

    // Verify that the sorted array is displayed
    const sortedArray = await page.locator('#sortedArray').innerText();
    expect(sortedArray).toBe('1,2,3'); // Assuming the output is a sorted string
  });

  test('should reset to idle state on reset', async ({ page }) => {
    // Input a sample array and click sort
    await page.fill('#bubbleSortInput', '3,1,2');
    await page.click('button');

    // Wait for sorting to complete
    await page.waitForTimeout(1000);

    // Click the reset button (assuming clicking input resets the state)
    await page.fill('#bubbleSortInput', '');

    // Verify that the sorted array div is empty again
    const sortedArray = await page.locator('#sortedArray').innerText();
    expect(sortedArray).toBe('');
  });

  test('should handle empty input gracefully', async ({ page }) => {
    // Click sort without any input
    await page.click('button');

    // Verify that the sorted array div is still empty
    const sortedArray = await page.locator('#sortedArray').innerText();
    expect(sortedArray).toBe('');
  });

  test('should handle invalid input gracefully', async ({ page }) => {
    // Input invalid data and click sort
    await page.fill('#bubbleSortInput', 'invalid,data');
    await page.click('button');

    // Verify that the sorted array div is still empty or shows an error message
    const sortedArray = await page.locator('#sortedArray').innerText();
    expect(sortedArray).toBe(''); // Assuming it doesn't sort invalid input
  });
});