import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a55ab90-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the linked list application
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify the initial state of the application
        const listItems = await page.locator('ul li').count();
        expect(listItems).toBe(3); // Initial items in the list
    });

    test('should transition to adding_item state when ADD_ITEM_CLICKED', async ({ page }) => {
        // Click the add item button
        await page.click('#add-item-button');
        
        // Verify that the state has transitioned to adding_item
        await expect(page.locator('#item-added-notification')).toBeVisible();
        
        // Simulate item added event
        await page.click('#item-added-notification');
        
        // Verify that we are back in idle state
        const listItems = await page.locator('ul li').count();
        expect(listItems).toBe(4); // One item should have been added
    });

    test('should transition to printing_list state when PRINT_LIST_CLICKED', async ({ page }) => {
        // Click the print list button
        await page.click('#print-list-button');
        
        // Verify that the state has transitioned to printing_list
        await expect(page.locator('#list-printed-notification')).toBeVisible();
        
        // Simulate list printed event
        await page.click('#list-printed-notification');
        
        // Verify that we are back in idle state
        const printedMessage = await page.locator('body').textContent();
        expect(printedMessage).toContain('Item 1'); // Check if the printed list contains an item
    });

    test('should handle edge case of adding duplicate items', async ({ page }) => {
        // Click the add item button
        await page.click('#add-item-button');
        
        // Simulate adding a duplicate item
        await page.click('#item-added-notification'); // Assume it adds "Item 4" again
        
        // Verify that the list does not contain duplicates
        const listItems = await page.locator('ul li').count();
        expect(listItems).toBe(4); // Should still be 4 items
    });

    test('should handle error when trying to print an empty list', async ({ page }) => {
        // Clear the list (assume we have a clear button)
        await page.click('#clear-list-button');
        
        // Click the print list button
        await page.click('#print-list-button');
        
        // Verify that an error message is shown
        const errorMessage = await page.locator('#error-message').textContent();
        expect(errorMessage).toBe('Cannot print an empty list'); // Check for specific error message
    });
});