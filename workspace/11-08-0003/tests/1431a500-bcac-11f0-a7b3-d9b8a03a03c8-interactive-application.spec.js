import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1431a500-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Knapsack Problem Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that results are cleared and no items are highlighted
        const optimalItems = await page.locator('#optimal-items').innerText();
        const totalValue = await page.locator('#total-value').innerText();
        const totalWeight = await page.locator('#total-weight').innerText();

        expect(optimalItems).toBe('');
        expect(totalValue).toBe('');
        expect(totalWeight).toBe('');
    });

    test('should highlight selected item and remain in item_selected state', async ({ page }) => {
        // Select an item and verify the highlight
        await page.click('.item:nth-child(1) input[type="checkbox"]');
        const item1 = page.locator('.item:nth-child(1)');
        await expect(item1).toHaveClass(/selected/);

        // Verify that the state remains item_selected
        await page.click('.item:nth-child(1) input[type="checkbox"]'); // Click again to deselect
        await expect(item1).not.toHaveClass(/selected/);
    });

    test('should calculate optimal items and transition to calculating state', async ({ page }) => {
        // Select items and set weight limit
        await page.click('.item:nth-child(1) input[type="checkbox"]');
        await page.click('.item:nth-child(2) input[type="checkbox"]');
        await page.fill('#weight-limit', '6'); // Set weight limit

        // Click calculate button
        await page.click('#calculate-btn');

        // Verify that the results are displayed
        const optimalItems1 = await page.locator('#optimal-items').innerText();
        const totalValue1 = await page.locator('#total-value').innerText();
        const totalWeight1 = await page.locator('#total-weight').innerText();

        expect(optimalItems).not.toBe('');
        expect(totalValue).not.toBe('');
        expect(totalWeight).not.toBe('');
    });

    test('should handle edge case with no items selected', async ({ page }) => {
        // Set weight limit without selecting any items
        await page.fill('#weight-limit', '10'); // Set weight limit

        // Click calculate button
        await page.click('#calculate-btn');

        // Verify that results indicate no items selected
        const optimalItems2 = await page.locator('#optimal-items').innerText();
        expect(optimalItems).toBe(''); // No optimal items should be found
    });

    test('should reset selections and results when starting over', async ({ page }) => {
        // Select an item and set weight limit
        await page.click('.item:nth-child(1) input[type="checkbox"]');
        await page.fill('#weight-limit', '4');

        // Click calculate button
        await page.click('#calculate-btn');

        // Verify results are displayed
        const optimalItemsBeforeReset = await page.locator('#optimal-items').innerText();
        expect(optimalItemsBeforeReset).not.toBe('');

        // Reset selections
        await page.click('.item:nth-child(1) input[type="checkbox"]'); // Deselect the item

        // Verify that results are cleared
        const optimalItemsAfterReset = await page.locator('#optimal-items').innerText();
        expect(optimalItemsAfterReset).toBe('');
    });

    test('should not exceed weight limit', async ({ page }) => {
        // Select items that exceed weight limit
        await page.click('.item:nth-child(1) input[type="checkbox"]'); // Weight 4
        await page.click('.item:nth-child(3) input[type="checkbox"]'); // Weight 5
        await page.fill('#weight-limit', '6'); // Set weight limit

        // Click calculate button
        await page.click('#calculate-btn');

        // Verify that results do not include exceeding items
        const totalWeight2 = await page.locator('#total-weight').innerText();
        expect(parseInt(totalWeight)).toBeLessThanOrEqual(6);
    });
});