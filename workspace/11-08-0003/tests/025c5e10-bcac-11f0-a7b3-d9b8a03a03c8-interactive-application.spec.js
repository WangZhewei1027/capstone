import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/025c5e10-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Counting Sort Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the interactive application
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify that the input field is empty and the visualization is cleared
        const inputField = await page.locator('#inputArray');
        const visualization = await page.locator('#visualization');

        await expect(inputField).toHaveValue('');
        await expect(visualization).toBeEmpty();
    });

    test('should transition to sorting state on SORT_BUTTON_CLICKED', async ({ page }) => {
        // Enter input and click the sort button
        await page.fill('#inputArray', '5, 2, 9, 1, 5, 6');
        await page.click('#sortButton');

        // Verify that the visualization is being updated
        const visualization1 = await page.locator('#visualization1');
        await expect(visualization).not.toBeEmpty();
    });

    test('should transition to done state after sorting is complete', async ({ page }) => {
        // Enter input and click the sort button
        await page.fill('#inputArray', '5, 2, 9, 1, 5, 6');
        await page.click('#sortButton');

        // Wait for sorting to complete (assuming a timeout or a specific element appears)
        await page.waitForTimeout(2000); // Adjust according to the actual sorting duration

        // Verify that the sorted output is displayed
        const visualization2 = await page.locator('#visualization2');
        await expect(visualization).toContainText('1');
        await expect(visualization).toContainText('2');
        await expect(visualization).toContainText('5');
        await expect(visualization).toContainText('6');
        await expect(visualization).toContainText('9');
    });

    test('should return to idle state after clicking sort button again', async ({ page }) => {
        // Enter input and click the sort button
        await page.fill('#inputArray', '5, 2, 9, 1, 5, 6');
        await page.click('#sortButton');

        // Wait for sorting to complete
        await page.waitForTimeout(2000);

        // Click the sort button again to reset
        await page.click('#sortButton');

        // Verify that the input field is cleared and visualization is empty
        const inputField1 = await page.locator('#inputArray');
        const visualization3 = await page.locator('#visualization3');

        await expect(inputField).toHaveValue('');
        await expect(visualization).toBeEmpty();
    });

    test('should handle edge case of empty input', async ({ page }) => {
        // Click the sort button without entering any input
        await page.click('#sortButton');

        // Verify that the visualization is still empty
        const visualization4 = await page.locator('#visualization4');
        await expect(visualization).toBeEmpty();
    });

    test('should handle edge case of invalid input', async ({ page }) => {
        // Enter invalid input and click the sort button
        await page.fill('#inputArray', 'abc, def, ghi');
        await page.click('#sortButton');

        // Verify that the visualization is still empty
        const visualization5 = await page.locator('#visualization5');
        await expect(visualization).toBeEmpty();
    });
});