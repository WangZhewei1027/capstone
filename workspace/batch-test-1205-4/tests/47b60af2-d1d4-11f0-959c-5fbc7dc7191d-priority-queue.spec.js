import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b60af2-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Priority Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify that the page loads correctly and the title is displayed
        const title = await page.title();
        expect(title).toBe('Priority Queue Demo');
        const header = await page.locator('h1').innerText();
        expect(header).toBe('Priority Queue Demo');
    });

    test('should enqueue items with valid input', async ({ page }) => {
        // Test enqueuing an item with valid value and priority
        await page.fill('#inputValue', 'Task 1');
        await page.fill('#inputPriority', '2');
        await page.click('button:has-text("Enqueue")');

        // Verify that the item is added to the queue
        const queueItems = await page.locator('#queue .item').count();
        expect(queueItems).toBe(1);
        const firstItem = await page.locator('#queue .item').nth(0).innerText();
        expect(firstItem).toContain('Value: Task 1');
        expect(firstItem).toContain('Priority: 2');
    });

    test('should enqueue multiple items in priority order', async ({ page }) => {
        // Enqueue multiple items with different priorities
        await page.fill('#inputValue', 'Task 2');
        await page.fill('#inputPriority', '1');
        await page.click('button:has-text("Enqueue")');

        await page.fill('#inputValue', 'Task 3');
        await page.fill('#inputPriority', '3');
        await page.click('button:has-text("Enqueue")');

        // Verify that items are ordered by priority
        const queueItems = await page.locator('#queue .item').allInnerTexts();
        expect(queueItems[0]).toContain('Value: Task 2');
        expect(queueItems[1]).toContain('Value: Task 1');
        expect(queueItems[2]).toContain('Value: Task 3');
    });

    test('should show alert and not enqueue with invalid input', async ({ page }) => {
        // Test enqueuing with invalid input
        await page.fill('#inputValue', '');
        await page.fill('#inputPriority', '2');
        await page.click('button:has-text("Enqueue")');

        // Verify that the alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter valid value and priority.');
            await dialog.dismiss();
        });
    });

    test('should dequeue items correctly', async ({ page }) => {
        // Enqueue an item and then dequeue it
        await page.fill('#inputValue', 'Task 4');
        await page.fill('#inputPriority', '1');
        await page.click('button:has-text("Enqueue")');

        await page.click('button:has-text("Dequeue")');

        // Verify that the item is removed from the queue
        const queueItems = await page.locator('#queue .item').count();
        expect(queueItems).toBe(0);
    });

    test('should show alert when dequeuing from an empty queue', async ({ page }) => {
        // Attempt to dequeue from an empty queue
        await page.click('button:has-text("Dequeue")');

        // Verify that the alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty!');
            await dialog.dismiss();
        });
    });

    test('should handle multiple enqueues and dequeues correctly', async ({ page }) => {
        // Enqueue multiple items
        await page.fill('#inputValue', 'Task 5');
        await page.fill('#inputPriority', '2');
        await page.click('button:has-text("Enqueue")');

        await page.fill('#inputValue', 'Task 6');
        await page.fill('#inputPriority', '1');
        await page.click('button:has-text("Enqueue")');

        // Dequeue one item
        await page.click('button:has-text("Dequeue")');

        // Verify the remaining item
        const queueItems = await page.locator('#queue .item').allInnerTexts();
        expect(queueItems.length).toBe(1);
        expect(queueItems[0]).toContain('Value: Task 5');
    });
});