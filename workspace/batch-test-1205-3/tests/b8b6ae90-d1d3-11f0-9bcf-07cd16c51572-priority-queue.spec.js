import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b6ae90-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Priority Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads correctly with the expected title
        await expect(page).toHaveTitle('Priority Queue Demo');
        
        // Check that the queue is initially empty
        const queueList = await page.locator('#queueList');
        await expect(queueList).toHaveText('');
    });

    test('should enqueue an item and update the queue display', async ({ page }) => {
        // Input a priority and click the enqueue button
        await page.fill('#priorityInput', '2');
        await page.click('button:has-text("Enqueue")');

        // Verify that the queue displays the enqueued item
        const queueList = await page.locator('#queueList');
        await expect(queueList).toHaveText(/Task \d+ \(Priority: 2\)/);
    });

    test('should enqueue multiple items with different priorities', async ({ page }) => {
        // Enqueue first item with priority 3
        await page.fill('#priorityInput', '3');
        await page.click('button:has-text("Enqueue")');

        // Enqueue second item with higher priority (lower number)
        await page.fill('#priorityInput', '1');
        await page.click('button:has-text("Enqueue")');

        // Verify that the queue displays items in correct order
        const queueList = await page.locator('#queueList');
        await expect(queueList).toHaveText(/Task \d+ \(Priority: 1\)/);
        await expect(queueList).toHaveText(/Task \d+ \(Priority: 3\)/);
    });

    test('should dequeue an item and update the queue display', async ({ page }) => {
        // Enqueue an item first
        await page.fill('#priorityInput', '1');
        await page.click('button:has-text("Enqueue")');

        // Dequeue the item
        await page.click('button:has-text("Dequeue")');

        // Verify that the queue is now empty
        const queueList = await page.locator('#queueList');
        await expect(queueList).toHaveText('');
    });

    test('should alert when trying to dequeue from an empty queue', async ({ page }) => {
        // Attempt to dequeue from an empty queue
        const [alert] = await Promise.all([
            page.waitForEvent('dialog'), // Wait for the alert to be triggered
            page.click('button:has-text("Dequeue")'),
        ]);

        // Verify the alert message
        await expect(alert.message()).toBe('Priority Queue is empty!');
        await alert.dismiss(); // Dismiss the alert
    });

    test('should not enqueue an invalid priority', async ({ page }) => {
        // Attempt to enqueue with an invalid priority (non-numeric)
        await page.fill('#priorityInput', 'abc');
        await page.click('button:has-text("Enqueue")');

        // Verify that the queue remains empty
        const queueList = await page.locator('#queueList');
        await expect(queueList).toHaveText('');
    });

    test('should handle multiple enqueues and dequeues correctly', async ({ page }) => {
        // Enqueue multiple items
        await page.fill('#priorityInput', '2');
        await page.click('button:has-text("Enqueue")');
        await page.fill('#priorityInput', '1');
        await page.click('button:has-text("Enqueue")');
        await page.fill('#priorityInput', '3');
        await page.click('button:has-text("Enqueue")');

        // Dequeue two items
        await page.click('button:has-text("Dequeue")');
        await page.click('button:has-text("Dequeue")');

        // Verify the remaining item in the queue
        const queueList = await page.locator('#queueList');
        await expect(queueList).toHaveText(/Task \d+ \(Priority: 3\)/);
    });
});