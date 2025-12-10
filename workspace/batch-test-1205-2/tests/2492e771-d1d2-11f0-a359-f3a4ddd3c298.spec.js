import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2492e771-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Queue Demonstration Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Queue: ');
    });

    test('Enqueue an item', async ({ page }) => {
        await page.fill('#queueInput', 'item1');
        await page.click("button[onclick='enqueue()']");
        
        const queueDisplay1 = await page.locator('#queueDisplay1');
        await expect(queueDisplay).toHaveText('Queue: item1');
    });

    test('Enqueue multiple items', async ({ page }) => {
        await page.fill('#queueInput', 'item1');
        await page.click("button[onclick='enqueue()']");
        await page.fill('#queueInput', 'item2');
        await page.click("button[onclick='enqueue()']");
        
        const queueDisplay2 = await page.locator('#queueDisplay2');
        await expect(queueDisplay).toHaveText('Queue: item1, item2');
    });

    test('Dequeue an item', async ({ page }) => {
        await page.fill('#queueInput', 'item1');
        await page.click("button[onclick='enqueue()']");
        await page.click("button[onclick='dequeue()']");
        
        const queueDisplay3 = await page.locator('#queueDisplay3');
        await expect(queueDisplay).toHaveText('Queue: ');
    });

    test('Dequeue from an empty queue', async ({ page }) => {
        await page.click("button[onclick='dequeue()']");
        
        const alertMessage = await page.waitForEvent('dialog');
        await expect(alertMessage.message()).toBe('Queue is empty');
        await alertMessage.dismiss();
    });

    test('Clear the queue', async ({ page }) => {
        await page.fill('#queueInput', 'item1');
        await page.click("button[onclick='enqueue()']");
        await page.click("button[onclick='clearQueue()']");
        
        const queueDisplay4 = await page.locator('#queueDisplay4');
        await expect(queueDisplay).toHaveText('Queue: ');
    });

    test('Clear an already empty queue', async ({ page }) => {
        await page.click("button[onclick='clearQueue()']");
        
        const queueDisplay5 = await page.locator('#queueDisplay5');
        await expect(queueDisplay).toHaveText('Queue: ');
    });

    test('Enqueue without input', async ({ page }) => {
        await page.click("button[onclick='enqueue()']");
        
        const alertMessage1 = await page.waitForEvent('dialog');
        await expect(alertMessage.message()).toBe('Please enter a value to enqueue.');
        await alertMessage.dismiss();
    });
});