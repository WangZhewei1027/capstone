import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b527f0-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Array Demonstration Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial array on page load', async ({ page }) => {
        // Verify that the initial array is displayed correctly
        const initialArrayText = await page.textContent('#initial-array');
        expect(initialArrayText).toBe('Apple, Banana, Cherry, Date');
    });

    test('should add an item to the array and update the display', async ({ page }) => {
        // Input a new item and click the add button
        await page.fill('#new-item', 'Elderberry');
        await page.click('button:has-text("Add Item")');

        // Verify that the updated array displays the new item
        const updatedArrayText = await page.textContent('#updated-array');
        expect(updatedArrayText).toBe('Apple, Banana, Cherry, Date, Elderberry');
    });

    test('should remove the last item from the array and update the display', async ({ page }) => {
        // Remove the last item from the array
        await page.click('button:has-text("Remove Last Item")');

        // Verify that the updated array reflects the removal
        const updatedArrayText = await page.textContent('#updated-array');
        expect(updatedArrayText).toBe('Apple, Banana, Cherry');
    });

    test('should show an alert when trying to remove an item from an empty array', async ({ page }) => {
        // Remove items until the array is empty
        await page.click('button:has-text("Remove Last Item")');
        await page.click('button:has-text("Remove Last Item")');
        await page.click('button:has-text("Remove Last Item")');
        await page.click('button:has-text("Remove Last Item")');

        // Click to remove from an empty array and expect an alert
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('No items to remove.');
            await dialog.dismiss();
        });
        await page.click('button:has-text("Remove Last Item")');
    });

    test('should show an alert when trying to add an empty item', async ({ page }) => {
        // Click to add an empty item
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid item.');
            await dialog.dismiss();
        });
        await page.click('button:has-text("Add Item")');
    });

    test('should display updated array after multiple additions', async ({ page }) => {
        // Add multiple items to the array
        await page.fill('#new-item', 'Fig');
        await page.click('button:has-text("Add Item")');
        await page.fill('#new-item', 'Grape');
        await page.click('button:has-text("Add Item")');

        // Verify the updated array
        const updatedArrayText = await page.textContent('#updated-array');
        expect(updatedArrayText).toBe('Apple, Banana, Cherry, Date, Fig, Grape');
    });
});