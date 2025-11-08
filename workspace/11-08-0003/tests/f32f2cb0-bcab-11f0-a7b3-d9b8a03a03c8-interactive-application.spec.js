import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f32f2cb0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Queue Management Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const queueDisplay = await page.locator('#queueDisplay');
        const queueItems = await queueDisplay.locator('.queue-item');

        // Verify that the queue display is empty on initial load
        await expect(queueItems).toHaveCount(0);
    });

    test('should add an item to the queue', async ({ page }) => {
        const inputField = await page.locator('#queueInput');
        const addButton = await page.locator('button', { hasText: 'Add to Queue' });

        // Add an item to the queue
        await inputField.fill('Item 1');
        await addButton.click();

        const queueItems1 = await page.locator('.queue-item');
        // Verify that the item has been added
        await expect(queueItems).toHaveCount(1);
        await expect(queueItems.first()).toHaveText('Item 1');
    });

    test('should update the queue display after adding multiple items', async ({ page }) => {
        const inputField1 = await page.locator('#queueInput');
        const addButton1 = await page.locator('button', { hasText: 'Add to Queue' });

        // Add multiple items to the queue
        await inputField.fill('Item 1');
        await addButton.click();
        await inputField.fill('Item 2');
        await addButton.click();

        const queueItems2 = await page.locator('.queue-item');
        // Verify that both items are in the queue
        await expect(queueItems).toHaveCount(2);
        await expect(queueItems.nth(0)).toHaveText('Item 1');
        await expect(queueItems.nth(1)).toHaveText('Item 2');
    });

    test('should remove an item from the queue', async ({ page }) => {
        const inputField2 = await page.locator('#queueInput');
        const addButton2 = await page.locator('button', { hasText: 'Add to Queue' });
        const removeButton = await page.locator('button', { hasText: 'Remove from Queue' });

        // Add an item and then remove it
        await inputField.fill('Item 1');
        await addButton.click();
        await removeButton.click();

        const queueItems3 = await page.locator('.queue-item');
        // Verify that the queue is empty after removal
        await expect(queueItems).toHaveCount(0);
    });

    test('should not add empty items to the queue', async ({ page }) => {
        const inputField3 = await page.locator('#queueInput');
        const addButton3 = await page.locator('button', { hasText: 'Add to Queue' });

        // Attempt to add an empty item
        await inputField.fill('');
        await addButton.click();

        const queueItems4 = await page.locator('.queue-item');
        // Verify that the queue remains empty
        await expect(queueItems).toHaveCount(0);
    });

    test('should not remove an item from an empty queue', async ({ page }) => {
        const removeButton1 = await page.locator('button', { hasText: 'Remove from Queue' });

        // Attempt to remove an item from an empty queue
        await removeButton.click();

        const queueItems5 = await page.locator('.queue-item');
        // Verify that the queue is still empty
        await expect(queueItems).toHaveCount(0);
    });

    test('should provide visual feedback on item addition', async ({ page }) => {
        const inputField4 = await page.locator('#queueInput');
        const addButton4 = await page.locator('button', { hasText: 'Add to Queue' });

        // Add an item to the queue
        await inputField.fill('Item 1');
        await addButton.click();

        const queueDisplay1 = await page.locator('#queueDisplay1');
        // Verify that the background color changes after adding an item
        await expect(queueDisplay).toHaveCSS('background-color', 'rgb(204, 229, 255)');
    });

    test('should provide visual feedback on item removal', async ({ page }) => {
        const inputField5 = await page.locator('#queueInput');
        const addButton5 = await page.locator('button', { hasText: 'Add to Queue' });
        const removeButton2 = await page.locator('button', { hasText: 'Remove from Queue' });

        // Add an item and then remove it
        await inputField.fill('Item 1');
        await addButton.click();
        await removeButton.click();

        const queueDisplay2 = await page.locator('#queueDisplay2');
        // Verify that the background color changes after removing an item
        await expect(queueDisplay).toHaveCSS('background-color', 'rgb(204, 229, 255)');
    });
});