import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/13cacce0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Knapsack Problem Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial state', async ({ page }) => {
        // Verify that the initial state is idle
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should update capacity and remain in idle state', async ({ page }) => {
        // Update capacity and check that it remains in idle state
        await page.fill('#capacity', '70');
        await page.click('#update');

        const capacityValue = await page.inputValue('#capacity');
        await expect(capacityValue).toBe('70');
    });

    test('should calculate result and transition to calculating state', async ({ page }) => {
        // Select an item and calculate
        await page.locator('.item-card:nth-child(1) input').check(); // Select Item A
        await page.fill('#capacity', '50');
        await page.click('#calculate');

        // Verify that the result is displayed
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Item A/);
    });

    test('should transition back to idle state after calculation is complete', async ({ page }) => {
        // Select items and calculate
        await page.locator('.item-card:nth-child(1) input').check(); // Select Item A
        await page.fill('#capacity', '50');
        await page.click('#calculate');

        // Wait for the calculation to complete and verify result
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Item A/);

        // Simulate the CALCULATE_COMPLETE event
        await page.evaluate(() => {
            const event = new Event('CALCULATE_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that we are back in idle state
        await expect(resultDiv).toHaveText(/Item A/);
    });

    test('should handle edge case when no items are selected', async ({ page }) => {
        // Calculate with no items selected
        await page.fill('#capacity', '50');
        await page.click('#calculate');

        // Verify that the result indicates no items selected
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toHaveText('No items selected');
    });

    test('should handle edge case when capacity is too low', async ({ page }) => {
        // Select an item and set a low capacity
        await page.locator('.item-card:nth-child(2) input').check(); // Select Item B
        await page.fill('#capacity', '10');
        await page.click('#calculate');

        // Verify that the result indicates the item cannot be added
        const resultDiv4 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Item B cannot be added due to weight');
    });

    test('should allow multiple items to be selected and calculate correctly', async ({ page }) => {
        // Select multiple items
        await page.locator('.item-card:nth-child(1) input').check(); // Select Item A
        await page.locator('.item-card:nth-child(2) input').check(); // Select Item B
        await page.fill('#capacity', '50');
        await page.click('#calculate');

        // Verify that the result reflects the selected items
        const resultDiv5 = await page.locator('#result');
        await expect(resultDiv).toHaveText(/Item A, Item B/);
    });
});