import { test, expect } from '@playwright/test';

test.describe('Array Sorting Visualization FSM Tests', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-23T16-28-58/html/8335a0d0-c889-11f0-b3ac-b154feda1ba6.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('Initial state should be idle with rendered array', async ({ page }) => {
    // Verify the initial state is 'idle' and array is rendered
    const elements = await page.$$('.array-element');
    expect(elements.length).toBe(6);
    expect(await elements[0].textContent()).toBe('5');
    expect(await elements[1].textContent()).toBe('3');
  });

  test('Transition from idle to sorting on START_SORT_CLICKED', async ({ page }) => {
    // Click the start sort button to transition to sorting state
    await page.click('button[onclick="startSort()"]');
    
    // Verify sorting is in progress by checking for highlighted elements
    await page.waitForTimeout(500); // Wait for the first highlight
    const highlightedElements = await page.$$('.highlight');
    expect(highlightedElements.length).toBe(2);
  });

  test('Sorting completes and transitions back to idle', async ({ page }) => {
    // Start sorting
    await page.click('button[onclick="startSort()"]');
    
    // Wait for sorting to complete
    await page.waitForFunction(() => !document.querySelector('.highlight'));
    
    // Verify the array is sorted
    const elements = await page.$$('.array-element');
    const sortedArray = [2, 3, 4, 5, 7, 8];
    for (let i = 0; i < elements.length; i++) {
      expect(await elements[i].textContent()).toBe(sortedArray[i].toString());
    }
  });

  test('Reset array transitions back to idle state', async ({ page }) => {
    // Start sorting
    await page.click('button[onclick="startSort()"]');
    
    // Wait for sorting to start
    await page.waitForTimeout(500);
    
    // Click reset button
    await page.click('button[onclick="resetArray()"]');
    
    // Verify the array is reset to initial state
    const elements = await page.$$('.array-element');
    const initialArray = [5, 3, 8, 4, 2, 7];
    for (let i = 0; i < elements.length; i++) {
      expect(await elements[i].textContent()).toBe(initialArray[i].toString());
    }
  });

  test('Ensure no action when reset is clicked during sorting', async ({ page }) => {
    // Start sorting
    await page.click('button[onclick="startSort()"]');
    
    // Wait for sorting to start
    await page.waitForTimeout(500);
    
    // Attempt to reset during sorting
    await page.click('button[onclick="resetArray()"]');
    
    // Verify sorting continues (highlighted elements still present)
    const highlightedElements = await page.$$('.highlight');
    expect(highlightedElements.length).toBe(2);
  });

  test('No action on sort button click during sorting', async ({ page }) => {
    // Start sorting
    await page.click('button[onclick="startSort()"]');
    
    // Wait for sorting to start
    await page.waitForTimeout(500);
    
    // Attempt to start sort again during sorting
    await page.click('button[onclick="startSort()"]');
    
    // Verify sorting is still in progress and not restarted
    const highlightedElements = await page.$$('.highlight');
    expect(highlightedElements.length).toBe(2);
  });
});