import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0002/html/7c898400-bca8-11f0-a405-53d454efe32f.html';

test.describe('Queue Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.afterEach(async ({ page }) => {
        await page.reload(); // Reset the state after each test
    });

    test('should display initial state correctly', async ({ page }) => {
        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveText('');
        const queueContainer = await page.locator('#queue-container');
        await expect(queueContainer).toHaveText('');
    });

    test('should enqueue an item and show feedback', async ({ page }) => {
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-btn');

        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveText('Enqueued: Item 1');

        const queueContainer = await page.locator('#queue-container');
        await expect(queueContainer).toContainText('Item 1');
    });

    test('should enqueue multiple items', async ({ page }) => {
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-btn');
        await page.fill('#item-input', 'Item 2');
        await page.click('#enqueue-btn');

        const queueContainer = await page.locator('#queue-container');
        await expect(queueContainer).toContainText('Item 1');
        await expect(queueContainer).toContainText('Item 2');
    });

    test('should dequeue an item and show feedback', async ({ page }) => {
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-btn');
        await page.click('#dequeue-btn');

        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveText('Dequeued: Item 1');

        const queueContainer = await page.locator('#queue-container');
        await expect(queueContainer).toHaveText('');
    });

    test('should show feedback when dequeuing from an empty queue', async ({ page }) => {
        await page.click('#dequeue-btn');

        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveText('Queue is empty!');
    });

    test('should handle multiple enqueue and dequeue operations', async ({ page }) => {
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-btn');
        await page.fill('#item-input', 'Item 2');
        await page.click('#enqueue-btn');
        await page.click('#dequeue-btn');

        const feedback = await page.locator('#feedback');
        await expect(feedback).toHaveText('Dequeued: Item 1');

        const queueContainer = await page.locator('#queue-container');
        await expect(queueContainer).toContainText('Item 2');
        await expect(queueContainer).not.toContainText('Item 1');
    });

    test('should clear input after enqueue and dequeue', async ({ page }) => {
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-btn');
        await expect(page.locator('#item-input')).toHaveValue('');

        await page.fill('#item-input', 'Item 2');
        await page.click('#enqueue-btn');
        await page.click('#dequeue-btn');
        await expect(page.locator('#item-input')).toHaveValue('');
    });

    test('should show feedback messages correctly', async ({ page }) => {
        await page.fill('#item-input', 'Item 1');
        await page.click('#enqueue-btn');
        await expect(page.locator('#feedback')).toHaveText('Enqueued: Item 1');

        await page.click('#dequeue-btn');
        await expect(page.locator('#feedback')).toHaveText('Dequeued: Item 1');

        await page.click('#dequeue-btn');
        await expect(page.locator('#feedback')).toHaveText('Queue is empty!');
    });
});