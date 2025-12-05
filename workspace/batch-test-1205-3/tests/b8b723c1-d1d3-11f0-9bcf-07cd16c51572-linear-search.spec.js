import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b723c1-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Linear Search Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Linear Search Demo page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Linear Search Demo');

        // Check if input fields and button are visible
        await expect(page.locator('input#numbers')).toBeVisible();
        await expect(page.locator('input#target')).toBeVisible();
        await expect(page.locator('button')).toBeVisible();
        await expect(page.locator('#result')).toBeVisible();
    });

    test('should return the correct index when the target is found', async ({ page }) => {
        // Input a list of numbers and a target number
        await page.fill('input#numbers', '3, 5, 2, 8, 1');
        await page.fill('input#target', '5');

        // Click the search button
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Found 5 at index 1.');
    });

    test('should indicate when the target is not found', async ({ page }) => {
        // Input a list of numbers and a target number that is not in the list
        await page.fill('input#numbers', '3, 5, 2, 8, 1');
        await page.fill('input#target', '10');

        // Click the search button
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('10 is not in the array.');
    });

    test('should handle empty input for numbers', async ({ page }) => {
        // Leave numbers input empty and provide a target
        await page.fill('input#numbers', '');
        await page.fill('input#target', '5');

        // Click the search button
        await page.click('button');

        // Verify the result (should not crash, but behavior is not defined for this case)
        await expect(page.locator('#result')).toHaveText('');
    });

    test('should handle invalid target input', async ({ page }) => {
        // Input a list of numbers and an invalid target
        await page.fill('input#numbers', '3, 5, 2, 8, 1');
        await page.fill('input#target', 'abc');

        // Click the search button
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Please enter a valid number to search for.');
    });

    test('should handle whitespace in numbers input', async ({ page }) => {
        // Input numbers with extra whitespace
        await page.fill('input#numbers', '  3 ,  5 ,  2 ,  8 ,  1  ');
        await page.fill('input#target', '2');

        // Click the search button
        await page.click('button');

        // Verify the result
        await expect(page.locator('#result')).toHaveText('Found 2 at index 2.');
    });
});