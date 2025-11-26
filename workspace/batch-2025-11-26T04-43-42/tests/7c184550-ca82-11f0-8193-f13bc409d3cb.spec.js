import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c184550-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Priority Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const queueDisplay = await page.locator('#queue');
        await expect(queueDisplay).toHaveText('');
    });

    test('Enqueueing an item should transition to Enqueueing state', async ({ page }) => {
        await page.fill('input[type="text"]', 'Test Item');
        await page.click('button#enqueue');
        await expect(page.locator('#queue')).toContainText('Test Item');
    });

    test('Enqueueing an item should return to Idle state', async ({ page }) => {
        await page.fill('input[type="text"]', 'Test Item');
        await page.click('button#enqueue');
        await page.click('button#enqueue'); // Click again to check state
        await expect(page.locator('#queue')).toContainText('Test Item');
    });

    test('Dequeueing an item should transition to Dequeueing state', async ({ page }) => {
        await page.fill('input[type="text"]', 'Test Item');
        await page.click('button#enqueue');
        await page.click('button#dequeue');
        await expect(page.locator('#queue')).not.toContainText('Test Item');
    });

    test('Peeking should show the highest priority item', async ({ page }) => {
        await page.fill('input[type="text"]', 'High Priority Item');
        await page.click('button#enqueue');
        await page.fill('input[type="text"]', 'Low Priority Item');
        await page.click('button#enqueue');
        await page.click('button#peek');
        const peekValue = await page.locator('#peek-value'); // Assuming there's an element to show peek value
        await expect(peekValue).toHaveText('High Priority Item');
    });

    test('Checking if the queue is empty', async ({ page }) => {
        await page.click('button#check-empty');
        const emptyStatus = await page.locator('#empty-status'); // Assuming there's an element to show empty status
        await expect(emptyStatus).toHaveText('Queue is empty');
    });

    test('Dequeueing from an empty queue should not change state', async ({ page }) => {
        await page.click('button#dequeue'); // Attempt to dequeue without any items
        const queueDisplay = await page.locator('#queue');
        await expect(queueDisplay).toHaveText('');
    });

    test('Enqueueing with empty input should not change state', async ({ page }) => {
        await page.click('button#enqueue'); // Attempt to enqueue without any input
        const queueDisplay = await page.locator('#queue');
        await expect(queueDisplay).toHaveText('');
    });

    test('Check empty status when queue has items', async ({ page }) => {
        await page.fill('input[type="text"]', 'Test Item');
        await page.click('button#enqueue');
        await page.click('button#check-empty');
        const emptyStatus = await page.locator('#empty-status');
        await expect(emptyStatus).toHaveText('Queue is not empty');
    });
});