import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b4f980-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Queue Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the queue demonstration application
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Queue Demonstration');
        
        // Check that the queue display is empty initially
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('');
    });

    test('should enqueue an element and update the display', async ({ page }) => {
        // Input an element and click the enqueue button
        await page.fill('#elementInput', 'Element 1');
        await page.click('button:has-text("Enqueue")');

        // Check that the queue display updates correctly
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Element 1');
    });

    test('should enqueue multiple elements and update the display', async ({ page }) => {
        // Enqueue multiple elements
        await page.fill('#elementInput', 'Element 1');
        await page.click('button:has-text("Enqueue")');
        await page.fill('#elementInput', 'Element 2');
        await page.click('button:has-text("Enqueue")');

        // Verify that both elements are displayed in the queue
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('Element 1');
        await expect(queueDisplay).toHaveText('Element 2');
    });

    test('should alert when dequeuing from an empty queue', async ({ page }) => {
        // Click the dequeue button when the queue is empty
        await page.click('button:has-text("Dequeue")');

        // Verify that the alert shows "Queue is empty"
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Queue is empty');
            await dialog.dismiss();
        });
    });

    test('should dequeue an element and update the display', async ({ page }) => {
        // Enqueue an element first
        await page.fill('#elementInput', 'Element 1');
        await page.click('button:has-text("Enqueue")');

        // Dequeue the element
        await page.click('button:has-text("Dequeue")');

        // Verify that the queue display is now empty
        const queueDisplay = await page.locator('#queueDisplay');
        await expect(queueDisplay).toHaveText('');
    });

    test('should alert the dequeued element', async ({ page }) => {
        // Enqueue an element first
        await page.fill('#elementInput', 'Element 1');
        await page.click('button:has-text("Enqueue")');

        // Dequeue the element and verify the alert
        await page.click('button:has-text("Dequeue")');

        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Dequeued: Element 1');
            await dialog.dismiss();
        });
    });

    test('should alert when trying to enqueue an empty input', async ({ page }) => {
        // Click the enqueue button without entering any element
        await page.click('button:has-text("Enqueue")');

        // Verify that the alert shows "Please enter an element to enqueue."
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter an element to enqueue.');
            await dialog.dismiss();
        });
    });
});