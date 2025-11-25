import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d24670-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('Queue Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify the initial state of the queue is empty
        const queueDiv = await page.locator('#queue');
        await expect(queueDiv).toHaveText('Current Queue:');
    });

    test('should enqueue an item and transition to idle state', async ({ page }) => {
        // Enqueue an item and check the state transition
        await page.fill('#inputValue', '5');
        await page.click('button:has-text("Enqueue")');

        const queueDiv = await page.locator('#queue');
        await expect(queueDiv).toHaveText(/Position 1: 5/);
    });

    test('should alert when trying to dequeue from an empty queue', async ({ page }) => {
        // Attempt to dequeue from an empty queue
        await page.click('button:has-text("Dequeue")');

        // Check for alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty!');
            await dialog.dismiss();
        });
    });

    test('should enqueue multiple items and display them correctly', async ({ page }) => {
        // Enqueue multiple items
        await page.fill('#inputValue', '1');
        await page.click('button:has-text("Enqueue")');
        await page.fill('#inputValue', '2');
        await page.click('button:has-text("Enqueue")');
        await page.fill('#inputValue', '3');
        await page.click('button:has-text("Enqueue")');

        const queueDiv = await page.locator('#queue');
        await expect(queueDiv).toHaveText(/Position 1: 1/);
        await expect(queueDiv).toHaveText(/Position 2: 2/);
        await expect(queueDiv).toHaveText(/Position 3: 3/);
    });

    test('should dequeue an item and update the queue correctly', async ({ page }) => {
        // Enqueue an item and then dequeue it
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Enqueue")');
        await page.click('button:has-text("Dequeue")');

        const queueDiv = await page.locator('#queue');
        await expect(queueDiv).toHaveText('Current Queue:'); // Should be empty after dequeue
    });

    test('should alert when trying to enqueue without a number', async ({ page }) => {
        // Attempt to enqueue without entering a number
        await page.click('button:has-text("Enqueue")');

        // Check for alert message
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a number.');
            await dialog.dismiss();
        });
    });

    test('should handle queue empty state correctly after dequeue', async ({ page }) => {
        // Enqueue an item, then dequeue it to empty the queue
        await page.fill('#inputValue', '20');
        await page.click('button:has-text("Enqueue")');
        await page.click('button:has-text("Dequeue")');

        // Attempt to dequeue again and expect alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty!');
            await dialog.dismiss();
        });
        await page.click('button:has-text("Dequeue")');
    });
});