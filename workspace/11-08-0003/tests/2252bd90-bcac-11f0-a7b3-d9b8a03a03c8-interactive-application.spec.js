import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/2252bd90-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Knapsack Problem Solver', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should initialize application in idle state', async ({ page }) => {
        const totalWeight = await page.locator('#totalWeight').innerText();
        const totalValue = await page.locator('#totalValue').innerText();
        expect(totalWeight).toBe('0');
        expect(totalValue).toBe('0');
    });

    test('should select an item and transition to item_selected state', async ({ page }) => {
        const item = page.locator('.item').nth(0);
        await item.click();

        const selectedItem = await page.locator('#selectedItems .knapsack-item').innerText();
        expect(selectedItem).toContain('Item 1 (Weight: 10, Value: 60)');

        const totalWeight1 = await page.locator('#totalWeight1').innerText();
        const totalValue1 = await page.locator('#totalValue1').innerText();
        expect(totalWeight).toBe('10');
        expect(totalValue).toBe('60');
        await expect(item).toHaveClass(/selected/);
    });

    test('should deselect an item and transition to item_deselected state', async ({ page }) => {
        const item1 = page.locator('.item1').nth(0);
        await item.click(); // Select the item first
        await item.click(); // Deselect the item

        const selectedItems = await page.locator('#selectedItems').innerText();
        expect(selectedItems).not.toContain('Item 1 (Weight: 10, Value: 60)');

        const totalWeight2 = await page.locator('#totalWeight2').innerText();
        const totalValue2 = await page.locator('#totalValue2').innerText();
        expect(totalWeight).toBe('0');
        expect(totalValue).toBe('0');
        await expect(item).not.toHaveClass(/selected/);
    });

    test('should change the weight slider and transition to weight_slider_changed state', async ({ page }) => {
        const slider = page.locator('#weightSlider');
        await slider.fill('30');

        const maxWeight = await page.locator('#maxWeight').innerText();
        expect(maxWeight).toBe('30');
    });

    test('should reset selections and transition to resetting state', async ({ page }) => {
        const item2 = page.locator('.item2').nth(0);
        await item.click(); // Select the item
        await page.locator('button').click(); // Reset the selections

        const selectedItems1 = await page.locator('#selectedItems1').innerText();
        expect(selectedItems).toBe('');

        const totalWeight3 = await page.locator('#totalWeight3').innerText();
        const totalValue3 = await page.locator('#totalValue3').innerText();
        expect(totalWeight).toBe('0');
        expect(totalValue).toBe('0');
    });

    test('should handle edge case of exceeding max weight', async ({ page }) => {
        const item11 = page.locator('.item').nth(0);
        const item21 = page.locator('.item').nth(1);
        const item3 = page.locator('.item').nth(2);

        await item1.click(); // Select Item 1
        await item2.click(); // Select Item 2
        await item3.click(); // Select Item 3

        const totalWeight4 = await page.locator('#totalWeight4').innerText();
        expect(totalWeight).toBe('60'); // Should exceed max weight of 50
    });

    test('should allow re-selection of items after reset', async ({ page }) => {
        const item31 = page.locator('.item31').nth(0);
        await item.click(); // Select the item
        await page.locator('button').click(); // Reset the selections

        await item.click(); // Select the item again after reset
        const selectedItem1 = await page.locator('#selectedItems .knapsack-item').innerText();
        expect(selectedItem).toContain('Item 1 (Weight: 10, Value: 60)');
    });
});