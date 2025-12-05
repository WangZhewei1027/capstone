import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6a731-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Binary Search Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Check if the title is correct
        await expect(page).toHaveTitle('Binary Search Visualization');
        
        // Check if input fields and button are visible
        await expect(page.locator('#arrayInput')).toBeVisible();
        await expect(page.locator('#targetInput')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Search');
    });

    test('should display numbers in the array container after input', async ({ page }) => {
        // Input a sorted array and a target number
        await page.fill('#arrayInput', '1, 3, 5, 7, 9');
        await page.fill('#targetInput', '5');
        
        // Click the search button
        await page.click('button');

        // Check if the numbers are displayed in the array container
        const numbers = await page.locator('#arrayContainer .number').count();
        expect(numbers).toBe(5); // There should be 5 numbers displayed
    });

    test('should highlight the correct number during the search', async ({ page }) => {
        // Input a sorted array and a target number
        await page.fill('#arrayInput', '1, 3, 5, 7, 9');
        await page.fill('#targetInput', '7');
        
        // Click the search button
        await page.click('button');

        // Wait for the highlighting process to complete
        await page.waitForTimeout(6000); // Wait for enough time to see the highlights

        // Check if the correct number is highlighted
        const highlighted = await page.locator('.highlight').count();
        expect(highlighted).toBe(1); // Only one number should be highlighted
        const found = await page.locator('.found').count();
        expect(found).toBe(1); // The found number should also be highlighted
    });

    test('should alert when the number is not found', async ({ page }) => {
        // Input a sorted array and a target number that does not exist
        await page.fill('#arrayInput', '1, 3, 5, 7, 9');
        await page.fill('#targetInput', '4');
        
        // Click the search button
        await page.click('button');

        // Wait for the alert to be triggered
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Number not found in the array.');
            await dialog.dismiss();
        });

        // Wait for the search to complete
        await page.waitForTimeout(6000); // Wait for enough time to see the alert
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Leave inputs empty
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '');
        
        // Click the search button
        await page.click('button');

        // Check if no numbers are displayed
        const numbers = await page.locator('#arrayContainer .number').count();
        expect(numbers).toBe(0); // No numbers should be displayed
    });

    test('should handle invalid number input', async ({ page }) => {
        // Input a sorted array and an invalid target number
        await page.fill('#arrayInput', '1, 3, 5, 7, 9');
        await page.fill('#targetInput', 'abc'); // Invalid input
        
        // Click the search button
        await page.click('button');

        // Check if the alert is triggered for invalid input
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Invalid input');
            await dialog.dismiss();
        });

        // Wait for the search to complete
        await page.waitForTimeout(1000); // Wait for enough time to see the alert
    });
});