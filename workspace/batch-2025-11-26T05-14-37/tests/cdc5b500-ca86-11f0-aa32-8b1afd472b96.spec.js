import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc5b500-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Queue Example Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Validate that the application is in the Idle state
        const button = await page.locator('button[onclick="addItem()"]');
        await expect(button).toBeVisible();
        await expect(page.locator('ul')).toHaveCount(7); // Initial items A to G
    });

    test('Add Item - Transition from Idle to Item Added', async ({ page }) => {
        // Click the Add Item button
        await page.click('button[onclick="addItem()"]');

        // Validate that the item was added
        const queue = await page.locator('ul');
        await expect(queue).toHaveCount(8); // One new item added

        // Validate the visual feedback
        const lastItem = await queue.locator('li').last();
        await expect(lastItem).toBeVisible();
        await expect(lastItem).toHaveText('Item added to queue.');
    });

    test('Multiple Add Items - Validate Queue Growth', async ({ page }) => {
        // Click the Add Item button multiple times
        for (let i = 0; i < 5; i++) {
            await page.click('button[onclick="addItem()"]');
        }

        // Validate that the queue has grown correctly
        const queue = await page.locator('ul');
        await expect(queue).toHaveCount(12); // Initial 7 + 5 added
    });

    test('Check Queue Content After Add Item', async ({ page }) => {
        // Add an item and check the content
        await page.click('button[onclick="addItem()"]');
        const queue = await page.locator('ul');
        const lastItem = await queue.locator('li').last();
        
        // Validate the last item added
        await expect(lastItem).toHaveText('Item added to queue.');
    });

    test('Edge Case - Add Item with No Queue', async ({ page }) => {
        // Simulate a scenario where the queue is empty
        await page.evaluate(() => {
            document.getElementById('queue').innerHTML = ''; // Clear the queue
        });

        // Add an item
        await page.click('button[onclick="addItem()"]');

        // Validate that the item was added even when the queue was empty
        const queue = await page.locator('ul');
        await expect(queue).toHaveCount(1); // One new item added
        const lastItem = await queue.locator('li').last();
        await expect(lastItem).toHaveText('Item added to queue.');
    });

    test('Visual Feedback After Multiple Adds', async ({ page }) => {
        // Add multiple items and check for visual feedback
        for (let i = 0; i < 3; i++) {
            await page.click('button[onclick="addItem()"]');
        }

        const queue = await page.locator('ul');
        await expect(queue).toHaveCount(10); // Initial 7 + 3 added

        // Validate the last item added
        const lastItem = await queue.locator('li').last();
        await expect(lastItem).toHaveText('Item added to queue.');
    });
});