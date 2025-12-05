import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b5c430-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Queue Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Queue Visualization application
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify that the page loads correctly and the initial state is as expected
        const queueDisplay = await page.locator('#queueDisplay');
        const inputValue = await page.locator('#inputValue');
        
        await expect(queueDisplay).toHaveText('');
        await expect(inputValue).toBeVisible();
    });

    test('should enqueue an item and update the display', async ({ page }) => {
        // Test enqueuing an item and verify the display updates
        const inputValue = await page.locator('#inputValue');
        const enqueueButton = await page.locator('#enqueueButton');
        const queueDisplay = await page.locator('#queueDisplay');

        await inputValue.fill('Item 1');
        await enqueueButton.click();

        await expect(queueDisplay).toContainText('Item 1');
    });

    test('should show alert when trying to enqueue an empty value', async ({ page }) => {
        // Test that an alert is shown when trying to enqueue an empty value
        const enqueueButton = await page.locator('#enqueueButton');

        await page.locator('#inputValue').fill('');
        await enqueueButton.click();

        // Verify that the alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a value');
            await dialog.dismiss();
        });
    });

    test('should dequeue an item and update the display', async ({ page }) => {
        // Test dequeuing an item and verify the display updates
        const inputValue = await page.locator('#inputValue');
        const enqueueButton = await page.locator('#enqueueButton');
        const dequeueButton = await page.locator('#dequeueButton');
        const queueDisplay = await page.locator('#queueDisplay');

        await inputValue.fill('Item 1');
        await enqueueButton.click();
        await inputValue.fill('Item 2');
        await enqueueButton.click();

        await dequeueButton.click();

        await expect(queueDisplay).not.toContainText('Item 1');
        await expect(queueDisplay).toContainText('Item 2');
    });

    test('should show alert when trying to dequeue from an empty queue', async ({ page }) => {
        // Test that an alert is shown when trying to dequeue from an empty queue
        const dequeueButton = await page.locator('#dequeueButton');

        await dequeueButton.click();

        // Verify that the alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty');
            await dialog.dismiss();
        });
    });

    test('should maintain correct queue state after multiple operations', async ({ page }) => {
        // Test the queue state after multiple enqueue and dequeue operations
        const inputValue = await page.locator('#inputValue');
        const enqueueButton = await page.locator('#enqueueButton');
        const dequeueButton = await page.locator('#dequeueButton');
        const queueDisplay = await page.locator('#queueDisplay');

        await inputValue.fill('Item 1');
        await enqueueButton.click();
        await inputValue.fill('Item 2');
        await enqueueButton.click();
        await inputValue.fill('Item 3');
        await enqueueButton.click();

        await expect(queueDisplay).toContainText('Item 1');
        await expect(queueDisplay).toContainText('Item 2');
        await expect(queueDisplay).toContainText('Item 3');

        await dequeueButton.click();
        await expect(queueDisplay).not.toContainText('Item 1');
        await expect(queueDisplay).toContainText('Item 2');
        await expect(queueDisplay).toContainText('Item 3');

        await dequeueButton.click();
        await expect(queueDisplay).not.toContainText('Item 2');
        await expect(queueDisplay).toContainText('Item 3');
    });
});