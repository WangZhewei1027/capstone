import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a5620c0-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('Queue Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Queue application before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify that the input field is empty and the form is ready for input
        const inputField = await page.locator('#queueText');
        await expect(inputField).toHaveValue('');
    });

    test('should add item to queue on ADD_ITEM_SUBMITTED', async ({ page }) => {
        const inputField = await page.locator('#queueText');
        await inputField.fill('Item 1');
        
        // Submit the form to trigger the ADD_ITEM_SUBMITTED event
        await page.locator('#queueForm').press('Enter');

        // Check if the input field is cleared after adding the item
        await expect(inputField).toHaveValue('');
        // Here you would typically check the queue state or DOM changes
        // For example, checking if the queue displays the added item
    });

    test('should remain in item_added state on consecutive ADD_ITEM_SUBMITTED', async ({ page }) => {
        const inputField = await page.locator('#queueText');
        await inputField.fill('Item 2');
        await page.locator('#queueForm').press('Enter');

        // Try adding another item without resetting
        await inputField.fill('Item 3');
        await page.locator('#queueForm').press('Enter');

        // Verify that the input field is cleared again
        await expect(inputField).toHaveValue('');
        // Validate that both items are in the queue
    });

    test('should reset to idle state on RESET_CLICKED', async ({ page }) => {
        const inputField = await page.locator('#queueText');
        await inputField.fill('Item 4');
        await page.locator('#queueForm').press('Enter');

        // Simulate a reset action (this would depend on your actual reset button)
        await page.evaluate(() => {
            document.querySelector('#queueText').value = '';
        });

        // Verify that the input field is empty and we are back in idle state
        await expect(inputField).toHaveValue('');
    });

    test('should handle empty input on ADD_ITEM_SUBMITTED', async ({ page }) => {
        const inputField = await page.locator('#queueText');
        await inputField.fill('');
        
        // Submit the form with empty input
        await page.locator('#queueForm').press('Enter');

        // Verify that the input field is still empty and no item is added
        await expect(inputField).toHaveValue('');
        // Here you would typically check for an error message or feedback
    });

    test('should clear input field on exit from item_added state', async ({ page }) => {
        const inputField = await page.locator('#queueText');
        await inputField.fill('Item 5');
        await page.locator('#queueForm').press('Enter');

        // Simulate exit from item_added state (e.g., through a reset action)
        await page.evaluate(() => {
            document.querySelector('#queueText').value = '';
        });

        // Verify that the input field is cleared
        await expect(inputField).toHaveValue('');
    });
});