import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1ebec2-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Knapsack Problem Interactive Application', () => {
  
  test('should initialize in Idle state', async ({ page }) => {
    const resultTitle = await page.locator('#resultTitle').innerText();
    expect(resultTitle).toBe('No run yet');
  });

  test('should add an item and transition to EditingItems state', async ({ page }) => {
    await page.click('#addItem');
    const itemRows = await page.locator('#itemsBody tr.item-row').count();
    expect(itemRows).toBe(1); // Expect one item to be added
  });

  test('should randomize items and transition to EditingItems state', async ({ page }) => {
    await page.click('#randomItems');
    await page.waitForTimeout(1000); // Wait for prompt and randomization
    const itemRows = await page.locator('#itemsBody tr.item-row').count();
    expect(itemRows).toBeGreaterThan(0); // Expect some items to be randomized
  });

  test('should clear items with confirmation', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.click('#clearItems');
    await page.waitForTimeout(1000); // Wait for confirmation dialog
    await page.click('text=OK'); // Confirm clearing items
    const itemRows = await page.locator('#itemsBody tr.item-row').count();
    expect(itemRows).toBe(0); // Expect no items after clearing
  });

  test('should edit an item and reflect changes', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.fill('#itemsBody input[data-field="w"]', '20'); // Edit weight
    await page.fill('#itemsBody input[data-field="v"]', '30'); // Edit value
    const weight = await page.locator('#itemsBody input[data-field="w"]').inputValue();
    const value = await page.locator('#itemsBody input[data-field="v"]').inputValue();
    expect(weight).toBe('20');
    expect(value).toBe('30');
  });

  test('should remove an item', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.click('#itemsBody button[data-action="remove"]'); // Remove the item
    const itemRows = await page.locator('#itemsBody tr.item-row').count();
    expect(itemRows).toBe(0); // Expect no items after removal
  });

  test('should change capacity and reflect changes', async ({ page }) => {
    await page.fill('#capacity', '100'); // Change capacity
    const capacityValue = await page.locator('#capacity').inputValue();
    expect(capacityValue).toBe('100');
  });

  test('should change algorithm and clear results', async ({ page }) => {
    await page.selectOption('#algo', 'bruteforce'); // Change algorithm
    const selectedAlgorithm = await page.locator('#algo').inputValue();
    expect(selectedAlgorithm).toBe('bruteforce');
  });

  test('should compute and show results', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.click('#compute'); // Compute the result
    await page.waitForTimeout(1000); // Wait for computation
    const resultTitle = await page.locator('#resultTitle').innerText();
    expect(resultTitle).not.toBe('No run yet'); // Expect result to be shown
  });

  test('should visualize DP table if available', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.click('#compute'); // Compute the result
    await page.waitForTimeout(1000); // Wait for computation
    await page.click('#animateDP'); // Visualize DP
    const dpAreaContent = await page.locator('#dpArea').innerText();
    expect(dpAreaContent).toContain('DP table available'); // Expect DP table message
  });

  test('should show alert if trying to compute with no items', async ({ page }) => {
    await page.click('#compute'); // Attempt to compute with no items
    const alertMessage = await page.waitForEvent('dialog'); // Wait for alert
    expect(alertMessage.message()).toBe('Add some items first.');
    await alertMessage.dismiss(); // Dismiss the alert
  });

  test('should handle error during computation gracefully', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.selectOption('#algo', 'bruteforce'); // Set to brute-force
    for (let i = 0; i < 30; i++) { // Add many items to trigger error
      await page.click('#addItem');
    }
    await page.click('#compute'); // Compute the result
    const alertMessage = await page.waitForEvent('dialog'); // Wait for alert
    expect(alertMessage.message()).toContain('Error: Too many items for brute-force');
    await alertMessage.dismiss(); // Dismiss the alert
  });

  test('should inspect DP cell and show explanation', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.click('#compute'); // Compute the result
    await page.waitForTimeout(1000); // Wait for computation
    await page.click('td[data-i="1"][data-w="10"]'); // Click on a DP cell
    const alertMessage = await page.waitForEvent('dialog'); // Wait for alert
    expect(alertMessage.message()).toContain('dp[1][10]'); // Expect DP explanation
    await alertMessage.dismiss(); // Dismiss the alert
  });

  test('should visualize DP with large capacity and confirm', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.fill('#capacity', '300'); // Set large capacity
    await page.click('#compute'); // Compute the result
    await page.waitForTimeout(1000); // Wait for computation
    await page.click('#animateDP'); // Attempt to visualize DP
    const alertMessage = await page.waitForEvent('dialog'); // Wait for confirmation alert
    expect(alertMessage.message()).toContain('Capacity is large. Visualizing may be slow. Continue?');
    await alertMessage.dismiss(); // Dismiss the alert
  });

  test('should dismiss alert when closed', async ({ page }) => {
    await page.click('#addItem'); // Add an item first
    await page.click('#compute'); // Compute the result
    await page.waitForTimeout(1000); // Wait for computation
    await page.click('#animateDP'); // Visualize DP
    const alertMessage = await page.waitForEvent('dialog'); // Wait for alert
    await alertMessage.dismiss(); // Dismiss the alert
    expect(await page.locator('#dpArea').innerText()).toContain('DP table available'); // Check DP area still has content
  });

});