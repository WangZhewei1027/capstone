import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0001/html/d88ef750-bca1-11f0-9c8f-15ad551aaf30.html';

test.describe('Queue Management Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the queue display is empty initially
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText('');
    });

    test('should enqueue an item and transition to updating_queue state', async ({ page }) => {
        // Input a value and click the enqueue button
        await page.fill('#input-value', 'Item 1');
        await page.click('#enqueue-btn');

        // Verify that the queue display updates correctly
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText('Item 1');
    });

    test('should dequeue an item and transition to updating_queue state', async ({ page }) => {
        // Enqueue an item first
        await page.fill('#input-value', 'Item 1');
        await page.click('#enqueue-btn');

        // Now dequeue the item
        await page.click('#dequeue-btn');

        // Verify that the queue display is empty after dequeue
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText('');
    });

    test('should not enqueue an empty value', async ({ page }) => {
        // Click the enqueue button without entering a value
        await page.click('#enqueue-btn');

        // Verify that the queue display remains empty
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText('');
    });

    test('should not dequeue when the queue is empty', async ({ page }) => {
        // Click the dequeue button without any items in the queue
        await page.click('#dequeue-btn');

        // Verify that the queue display remains empty
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText('');
    });

    test('should handle multiple enqueue operations', async ({ page }) => {
        // Enqueue multiple items
        await page.fill('#input-value', 'Item 1');
        await page.click('#enqueue-btn');
        await page.fill('#input-value', 'Item 2');
        await page.click('#enqueue-btn');

        // Verify that both items are displayed in the queue
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText(/Item 1.*Item 2/);
    });

    test('should handle multiple dequeue operations', async ({ page }) => {
        // Enqueue multiple items first
        await page.fill('#input-value', 'Item 1');
        await page.click('#enqueue-btn');
        await page.fill('#input-value', 'Item 2');
        await page.click('#enqueue-btn');

        // Now dequeue once
        await page.click('#dequeue-btn');

        // Verify that the first item is removed
        const queueDisplay = await page.locator('#queue-display');
        await expect(queueDisplay).toHaveText('Item 2');
    });

    test('should clear input field after enqueue', async ({ page }) => {
        // Enqueue an item
        await page.fill('#input-value', 'Item 1');
        await page.click('#enqueue-btn');

        // Verify that the input field is cleared
        const inputField = await page.locator('#input-value');
        await expect(inputField).toHaveValue('');
    });
});