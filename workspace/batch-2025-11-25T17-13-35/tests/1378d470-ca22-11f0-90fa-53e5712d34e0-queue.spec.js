import { test, expect } from '@playwright/test';

const QUEUE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/1378d470-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('Queue FSM Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(QUEUE_URL);
    });

    test.describe('Initial State - Idle', () => {
        test('should be in idle state initially', async ({ page }) => {
            const queueContent = await page.locator('.queue').textContent();
            expect(queueContent).toBe('');
        });
    });

    test.describe('Enqueue Item', () => {
        test('should transition from idle to item_enqueued state', async ({ page }) => {
            await page.click('.queue'); // Trigger ENQUEUE_ITEM
            await page.click('.queue'); // Trigger ENQUEUE_ITEM again
            
            const queueItems = await page.locator('.queue').count();
            expect(queueItems).toBe(2); // Two items should be enqueued
        });

        test('should allow multiple enqueue actions', async ({ page }) => {
            await page.click('.queue'); // Trigger ENQUEUE_ITEM
            await page.click('.queue'); // Trigger ENQUEUE_ITEM
            await page.click('.queue'); // Trigger ENQUEUE_ITEM
            
            const queueItems = await page.locator('.queue').count();
            expect(queueItems).toBe(3); // Three items should be enqueued
        });
    });

    test.describe('Dequeue Item', () => {
        test.beforeEach(async ({ page }) => {
            await page.click('.queue'); // Enqueue first item
            await page.click('.queue'); // Enqueue second item
        });

        test('should transition from item_enqueued to item_dequeued state', async ({ page }) => {
            await page.click('.queue'); // Trigger DEQUEUE_ITEM
            
            const queueItems = await page.locator('.queue').count();
            expect(queueItems).toBe(1); // One item should be dequeued
        });

        test('should handle dequeue when queue is not empty', async ({ page }) => {
            await page.click('.queue'); // Trigger DEQUEUE_ITEM
            await page.click('.queue'); // Trigger DEQUEUE_ITEM
            
            const queueItems = await page.locator('.queue').count();
            expect(queueItems).toBe(0); // All items should be dequeued
        });

        test('should not dequeue if queue is empty', async ({ page }) => {
            await page.click('.queue'); // Trigger DEQUEUE_ITEM
            await page.click('.queue'); // Trigger DEQUEUE_ITEM
            await page.click('.queue'); // Trigger DEQUEUE_ITEM
            
            const queueItems = await page.locator('.queue').count();
            expect(queueItems).toBe(0); // Should remain empty
        });
    });

    test.describe('Reset Queue', () => {
        test.beforeEach(async ({ page }) => {
            await page.click('.queue'); // Enqueue first item
            await page.click('.queue'); // Enqueue second item
        });

        test('should reset queue to idle state', async ({ page }) => {
            await page.click('.queue'); // Trigger RESET_QUEUE
            
            const queueItems = await page.locator('.queue').count();
            expect(queueItems).toBe(0); // Queue should be reset to empty
        });
    });
});