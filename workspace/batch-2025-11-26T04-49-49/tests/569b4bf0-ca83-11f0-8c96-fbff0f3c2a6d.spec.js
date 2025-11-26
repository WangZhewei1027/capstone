import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569b4bf0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Heap Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should allow user to input a value and transition to InputReceived state', async ({ page }) => {
    // Input a value into the heap
    await page.fill('#myHeap', '10');
    
    // Verify that the heap updates correctly
    const heapDisplay = await page.locator('#myHeap').innerText();
    expect(heapDisplay).toContain('Heap:');

    // Check if the input was processed correctly
    await expect(page.locator('#myHeap')).toHaveValue('10');
  });

  test('should calculate average when Calculate Average button is clicked', async ({ page }) => {
    // Input values into the heap
    await page.fill('#myHeap', '10');
    await page.fill('#myHeap', '20');
    
    // Click the Calculate Average button
    await page.click('button:has-text("Calculate Average")');

    // Verify the average calculation
    const averageText = await page.locator('#average').innerText();
    expect(averageText).toContain('15'); // Assuming the average of 10 and 20 is 15
  });

  test('should search for a value in the heap', async ({ page }) => {
    // Input a value into the heap
    await page.fill('#myHeap', '10');
    await page.fill('#myHeap', '20');
    
    // Click the Search for 1 button
    await page.click('button:has-text("Search for 1")');

    // Verify the search result
    // Assuming the search function updates the DOM in some way
    // You would need to adjust this based on actual implementation
    const searchResult = await page.locator('#searchResult').innerText();
    expect(searchResult).toContain('not found'); // Adjust based on actual expected behavior
  });

  test('should find the minimum value in the heap', async ({ page }) => {
    // Input values into the heap
    await page.fill('#myHeap', '10');
    await page.fill('#myHeap', '5');
    
    // Click the Find Min Heap button
    await page.click('button:has-text("Find Min Heap")');

    // Verify the minimum value
    const minHeapText = await page.locator('#minHeapResult').innerText();
    expect(minHeapText).toContain('5'); // Assuming 5 is the minimum
  });

  test('should find the maximum value in the heap', async ({ page }) => {
    // Input values into the heap
    await page.fill('#myHeap', '10');
    await page.fill('#myHeap', '20');
    
    // Click the Find Max Heap button
    await page.click('button:has-text("Find Max Heap")');

    // Verify the maximum value
    const maxHeapText = await page.locator('#maxHeapResult').innerText();
    expect(maxHeapText).toContain('20'); // Assuming 20 is the maximum
  });

  test('should handle empty input for average calculation', async ({ page }) => {
    // Click the Calculate Average button without input
    await page.click('button:has-text("Calculate Average")');

    // Verify the result for empty input
    const averageText = await page.locator('#average').innerText();
    expect(averageText).toContain('0'); // Assuming the average of no numbers is 0
  });

  test('should handle invalid input gracefully', async ({ page }) => {
    // Input an invalid value
    await page.fill('#myHeap', 'invalid');

    // Verify that the input field does not accept invalid input
    const inputValue = await page.locator('#myHeap').inputValue();
    expect(inputValue).toBe(''); // Assuming invalid input clears the field
  });
});