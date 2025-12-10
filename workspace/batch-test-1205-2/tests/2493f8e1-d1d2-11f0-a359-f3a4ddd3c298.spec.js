import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493f8e1-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Priority Queue Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display initial state with input fields', async ({ page }) => {
        // Validate that the input fields and buttons are present in the initial state
        const elementInput = await page.locator('#element');
        const priorityInput = await page.locator('#priority');
        const addButton = await page.locator('button[onclick="enqueue()"]');
        const removeButton = await page.locator('button[onclick="dequeue()"]');
        
        await expect(elementInput).toBeVisible();
        await expect(priorityInput).toBeVisible();
        await expect(addButton).toBeVisible();
        await expect(removeButton).toBeVisible();
    });

    test('should add an element to the queue and update display', async ({ page }) => {
        // Input valid element and priority, then click the Add to Queue button
        await page.fill('#element', 'Task 1');
        await page.fill('#priority', '2');
        await page.click('button[onclick="enqueue()"]');

        // Validate that the queue display is updated
        const queueItems = await page.locator('#queueItems');
        await expect(queueItems).toContainText('Task 1 (Priority)');
    });

    test('should show alert for invalid input when adding to the queue', async ({ page }) => {
        // Input invalid element and priority, then click the Add to Queue button
        await page.fill('#element', '');
        await page.fill('#priority', '');
        await page.click('button[onclick="enqueue()"]');

        // Validate that an alert is shown for invalid input
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid element and priority.');
            await dialog.dismiss();
        });
    });

    test('should dequeue an element and update display', async ({ page }) => {
        // Add an element to the queue first
        await page.fill('#element', 'Task 1');
        await page.fill('#priority', '1');
        await page.click('button[onclick="enqueue()"]');

        // Now dequeue the element
        await page.click('button[onclick="dequeue()"]');

        // Validate that the queue display is empty
        const queueItems1 = await page.locator('#queueItems1');
        await expect(queueItems).toHaveText('');
    });

    test('should show alert when trying to dequeue from an empty queue', async ({ page }) => {
        // Attempt to dequeue without adding any elements
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty!');
            await dialog.dismiss();
        });
        await page.click('button[onclick="dequeue()"]');
    });

    test('should handle multiple enqueue operations', async ({ page }) => {
        // Add multiple elements to the queue
        await page.fill('#element', 'Task 1');
        await page.fill('#priority', '2');
        await page.click('button[onclick="enqueue()"]');

        await page.fill('#element', 'Task 2');
        await page.fill('#priority', '1');
        await page.click('button[onclick="enqueue()"]');

        // Validate that the queue displays both elements in the correct order
        const queueItems2 = await page.locator('#queueItems2');
        await expect(queueItems).toContainText('Task 2 (Priority)');
        await expect(queueItems).toContainText('Task 1 (Priority)');
    });

    test('should maintain queue order based on priority', async ({ page }) => {
        // Add elements with different priorities
        await page.fill('#element', 'Task 1');
        await page.fill('#priority', '3');
        await page.click('button[onclick="enqueue()"]');

        await page.fill('#element', 'Task 2');
        await page.fill('#priority', '1');
        await page.click('button[onclick="enqueue()"]');

        await page.fill('#element', 'Task 3');
        await page.fill('#priority', '2');
        await page.click('button[onclick="enqueue()"]');

        // Validate that the queue displays elements in order of priority
        const queueItems3 = await page.locator('#queueItems3');
        await expect(queueItems).toContainText('Task 2 (Priority)');
        await expect(queueItems).toContainText('Task 3 (Priority)');
        await expect(queueItems).toContainText('Task 1 (Priority)');
    });
});