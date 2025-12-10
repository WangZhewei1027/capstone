import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9253f0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Queue Demonstration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the initial state of the queue display
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Queue is empty');
    });

    test('should enqueue a value and update the display', async ({ page }) => {
        // Input a value and click the enqueue button
        await page.fill('#inputValue', 'Test Value');
        await page.click('button:has-text("Enqueue")');

        // Verify that the queue display updates correctly
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Test Value');
    });

    test('should not enqueue an empty value and show alert', async ({ page }) => {
        // Click the enqueue button without entering a value
        await page.click('button:has-text("Enqueue")');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a value to enqueue.');
            await dialog.dismiss();
        });
    });

    test('should dequeue a value and update the display', async ({ page }) => {
        // Enqueue a value first
        await page.fill('#inputValue', 'First Value');
        await page.click('button:has-text("Enqueue")');

        // Now dequeue the value
        await page.click('button:has-text("Dequeue")');

        // Verify that the queue display updates correctly
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Queue is empty');
    });

    test('should show alert when trying to dequeue from an empty queue', async ({ page }) => {
        // Click the dequeue button without any values in the queue
        await page.click('button:has-text("Dequeue")');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty. Nothing to dequeue.');
            await dialog.dismiss();
        });
    });

    test('should clear the queue and update the display', async ({ page }) => {
        // Enqueue a value first
        await page.fill('#inputValue', 'Value to Clear');
        await page.click('button:has-text("Enqueue")');

        // Now clear the queue
        await page.click('button:has-text("Clear Queue")');

        // Verify that the queue display updates correctly
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Queue is empty');
    });

    test('should handle multiple enqueue and dequeue operations correctly', async ({ page }) => {
        // Enqueue multiple values
        await page.fill('#inputValue', 'Value 1');
        await page.click('button:has-text("Enqueue")');
        await page.fill('#inputValue', 'Value 2');
        await page.click('button:has-text("Enqueue")');

        // Verify the queue display
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Value 1, Value 2');

        // Dequeue one value
        await page.click('button:has-text("Dequeue")');

        // Verify the queue display again
        await expect(queueDisplay).toHaveText('Value 2');
    });
});