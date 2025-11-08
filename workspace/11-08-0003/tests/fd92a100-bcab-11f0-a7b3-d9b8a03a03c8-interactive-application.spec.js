import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/fd92a100-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Priority Queue Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const queueItems = await page.locator('#queue .item').count();
        expect(queueItems).toBe(0); // Queue should be empty
    });

    test.describe('Adding Items', () => {
        test('should add an item with valid priority', async ({ page }) => {
            await page.fill('#priorityInput', '5');
            await page.click('#addButton');

            const queueItems1 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(1); // One item should be added

            const firstItemText = await page.locator('#queue .item').nth(0).textContent();
            expect(firstItemText).toContain('Priority: 5'); // Check if the item has correct priority
        });

        test('should not add an item with invalid priority', async ({ page }) => {
            await page.fill('#priorityInput', '0'); // Invalid priority
            await page.click('#addButton');

            const queueItems2 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(0); // No item should be added
        });

        test('should handle multiple items correctly', async ({ page }) => {
            await page.fill('#priorityInput', '10');
            await page.click('#addButton');

            await page.fill('#priorityInput', '20');
            await page.click('#addButton');

            const queueItems3 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(2); // Two items should be added

            const firstItemText1 = await page.locator('#queue .item').nth(1).textContent();
            expect(firstItemText).toContain('Priority: 10'); // Check if the first item has correct priority
        });
    });

    test.describe('Removing Items', () => {
        test.beforeEach(async ({ page }) => {
            await page.fill('#priorityInput', '5');
            await page.click('#addButton'); // Add an item to remove
        });

        test('should remove the highest priority item', async ({ page }) => {
            await page.fill('#priorityInput', '10');
            await page.click('#addButton'); // Add another item

            await page.click('#removeButton'); // Remove the highest priority item

            const queueItems4 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(1); // One item should remain

            const remainingItemText = await page.locator('#queue .item').nth(0).textContent();
            expect(remainingItemText).toContain('Priority: 5'); // Check if the remaining item has correct priority
        });

        test('should handle removal when queue is empty', async ({ page }) => {
            await page.click('#removeButton'); // Attempt to remove from empty queue

            const queueItems5 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(1); // Queue should still have the item
        });
    });

    test.describe('Edge Cases', () => {
        test('should not add item if priority input is empty', async ({ page }) => {
            await page.fill('#priorityInput', ''); // Empty input
            await page.click('#addButton');

            const queueItems6 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(0); // No item should be added
        });

        test('should handle invalid input gracefully', async ({ page }) => {
            await page.fill('#priorityInput', 'abc'); // Invalid input
            await page.click('#addButton');

            const queueItems7 = await page.locator('#queue .item').count();
            expect(queueItems).toBe(0); // No item should be added
        });
    });
});