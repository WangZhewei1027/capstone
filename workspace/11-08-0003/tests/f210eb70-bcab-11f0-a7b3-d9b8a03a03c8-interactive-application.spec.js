import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f210eb70-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Queue Exploration Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.afterEach(async ({ page }) => {
        await page.reload(); // Reset the state after each test
    });

    test('should start in idle state', async ({ page }) => {
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
        const queueItems = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0);
    });

    test('should enqueue an item', async ({ page }) => {
        await page.click('#enqueue-button');
        const feedback1 = await page.locator('#feedback1').innerText();
        expect(feedback).toMatch(/Enqueued: \d+/);
        const queueItems1 = await page.locator('.queue-item').count();
        expect(queueItems).toBe(1);
    });

    test('should enqueue multiple items', async ({ page }) => {
        for (let i = 0; i < 3; i++) {
            await page.click('#enqueue-button');
        }
        const feedback2 = await page.locator('#feedback2').innerText();
        expect(feedback).toMatch(/Enqueued: \d+/);
        const queueItems2 = await page.locator('.queue-item').count();
        expect(queueItems).toBe(3);
    });

    test('should not enqueue more than 5 items', async ({ page }) => {
        for (let i = 0; i < 5; i++) {
            await page.click('#enqueue-button');
        }
        await page.click('#enqueue-button'); // Attempt to enqueue the 6th item
        const feedback3 = await page.locator('#feedback3').innerText();
        expect(feedback).toMatch(/Enqueued: \d+/);
        const queueItems3 = await page.locator('.queue-item').count();
        expect(queueItems).toBe(5); // Should still be 5
    });

    test('should dequeue an item', async ({ page }) => {
        await page.click('#enqueue-button'); // Enqueue first
        await page.click('#dequeue-button'); // Dequeue
        const feedback4 = await page.locator('#feedback4').innerText();
        expect(feedback).toMatch(/Dequeued: \d+/);
        const queueItems4 = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0);
    });

    test('should not dequeue from an empty queue', async ({ page }) => {
        await page.click('#dequeue-button'); // Attempt to dequeue from empty queue
        const feedback5 = await page.locator('#feedback5').innerText();
        expect(feedback).toBe(''); // No feedback should be shown
        const queueItems5 = await page.locator('.queue-item').count();
        expect(queueItems).toBe(0); // Still should be empty
    });

    test('should handle multiple enqueue and dequeue operations', async ({ page }) => {
        for (let i = 0; i < 3; i++) {
            await page.click('#enqueue-button');
        }
        await page.click('#dequeue-button'); // Dequeue one
        const feedback6 = await page.locator('#feedback6').innerText();
        expect(feedback).toMatch(/Dequeued: \d+/);
        const queueItems6 = await page.locator('.queue-item').count();
        expect(queueItems).toBe(2); // Should have 2 left
    });

    test('should clear feedback after each operation', async ({ page }) => {
        await page.click('#enqueue-button');
        await page.waitForTimeout(100); // Wait for feedback to appear
        const feedbackAfterEnqueue = await page.locator('#feedback').innerText();
        expect(feedbackAfterEnqueue).toMatch(/Enqueued: \d+/);
        
        await page.click('#dequeue-button');
        await page.waitForTimeout(100); // Wait for feedback to appear
        const feedbackAfterDequeue = await page.locator('#feedback').innerText();
        expect(feedbackAfterDequeue).toMatch(/Dequeued: \d+/);
        
        await page.reload(); // Reload to clear feedback
        const feedbackAfterReload = await page.locator('#feedback').innerText();
        expect(feedbackAfterReload).toBe('');
    });
});