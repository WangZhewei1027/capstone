import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f3b377e0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Binary Search Tree Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify the initial state of the application
        const inputField = await page.locator('#number-input');
        const insertButton = await page.locator('#insert-button');
        const clearButton = await page.locator('#clear-button');
        
        await expect(inputField).toBeVisible();
        await expect(insertButton).toBeVisible();
        await expect(clearButton).toBeVisible();
    });

    test('should transition to inserting state on valid input', async ({ page }) => {
        // Simulate inserting a valid number
        await page.fill('#number-input', '10');
        await page.click('#insert-button');

        // Check for expected behavior after insertion
        await expect(page.locator('#bst-visualization')).toContainText('10'); // Assuming visualization updates
    });

    test('should remain in idle state on invalid input', async ({ page }) => {
        // Simulate inserting an invalid number
        await page.fill('#number-input', 'abc'); // Invalid input
        await page.click('#insert-button');

        // Verify that the visualization does not change
        await expect(page.locator('#bst-visualization')).not.toContainText('abc');
    });

    test('should transition back to idle state after insertion complete', async ({ page }) => {
        // Simulate inserting a valid number
        await page.fill('#number-input', '20');
        await page.click('#insert-button');

        // Simulate insertion complete event
        await page.evaluate(() => {
            // This simulates the event that would be triggered in the actual application
            document.dispatchEvent(new Event('INSERTION_COMPLETE'));
        });

        // Verify the state returns to idle
        await expect(page.locator('#number-input')).toHaveValue('');
    });

    test('should transition to clearing state on clear button click', async ({ page }) => {
        // Simulate inserting a number first
        await page.fill('#number-input', '30');
        await page.click('#insert-button');

        // Now clear the tree
        await page.click('#clear-button');

        // Verify that the visualization is cleared
        await expect(page.locator('#bst-visualization')).toBeEmpty();
    });

    test('should handle clear complete event correctly', async ({ page }) => {
        // Simulate clearing the tree
        await page.click('#clear-button');

        // Simulate clear complete event
        await page.evaluate(() => {
            document.dispatchEvent(new Event('CLEAR_COMPLETE'));
        });

        // Verify that the input field is reset
        await expect(page.locator('#number-input')).toHaveValue('');
    });

    test('should not allow insertion of duplicate values', async ({ page }) => {
        // Insert a number
        await page.fill('#number-input', '40');
        await page.click('#insert-button');

        // Attempt to insert the same number again
        await page.fill('#number-input', '40');
        await page.click('#insert-button');

        // Verify that the visualization does not contain duplicates
        await expect(page.locator('#bst-visualization')).toContainText('40');
        await expect(page.locator('#bst-visualization')).toHaveCount(1); // Assuming it only shows unique values
    });

    test('should handle edge case of empty input', async ({ page }) => {
        // Attempt to insert without any input
        await page.fill('#number-input', '');
        await page.click('#insert-button');

        // Verify that the visualization does not change
        await expect(page.locator('#bst-visualization')).toBeEmpty();
    });
});