import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24946e12-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Binary Search Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the initial elements are present
        await expect(page.locator('#arrayInput')).toBeVisible();
        await expect(page.locator('#targetInput')).toBeVisible();
        await expect(page.locator('#searchButton')).toBeVisible();
        await expect(page.locator('#result')).toHaveText('');
        await expect(page.locator('#array')).toHaveText('');
    });

    test('Input valid sorted array and target number', async ({ page }) => {
        // Input a valid sorted array and target number
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        
        // Click the search button
        await page.click('#searchButton');

        // Verify that the array is displayed
        const arrayDiv = await page.locator('#array');
        await expect(arrayDiv).toContainText('1');
        await expect(arrayDiv).toContainText('2');
        await expect(arrayDiv).toContainText('3');
        await expect(arrayDiv).toContainText('4');
        await expect(arrayDiv).toContainText('5');

        // Verify that the result is displayed correctly
        await expect(page.locator('#result')).toHaveText(/Target found at index: \d/);
    });

    test('Input target number not in array', async ({ page }) => {
        // Input a valid sorted array and a target number not in the array
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '6');
        
        // Click the search button
        await page.click('#searchButton');

        // Verify that the result indicates the target was not found
        await expect(page.locator('#result')).toHaveText('Target not found');
    });

    test('Input invalid array format', async ({ page }) => {
        // Input an invalid array format
        await page.fill('#arrayInput', 'invalid input');
        await page.fill('#targetInput', '3');
        
        // Click the search button
        await page.click('#searchButton');

        // Verify that an error message is displayed
        await expect(page.locator('#result')).toHaveText('Please enter a valid sorted array and a target number.');
    });

    test('Input empty array', async ({ page }) => {
        // Input an empty array
        await page.fill('#arrayInput', '');
        await page.fill('#targetInput', '3');
        
        // Click the search button
        await page.click('#searchButton');

        // Verify that an error message is displayed
        await expect(page.locator('#result')).toHaveText('Please enter a valid sorted array and a target number.');
    });

    test('Input target number as NaN', async ({ page }) => {
        // Input a valid sorted array and a NaN target number
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', 'notANumber');
        
        // Click the search button
        await page.click('#searchButton');

        // Verify that an error message is displayed
        await expect(page.locator('#result')).toHaveText('Please enter a valid sorted array and a target number.');
    });

    test('Check visual feedback during search', async ({ page }) => {
        // Input a valid sorted array and target number
        await page.fill('#arrayInput', '1,2,3,4,5');
        await page.fill('#targetInput', '3');
        
        // Click the search button
        await page.click('#searchButton');

        // Verify that the elements are highlighted during the search
        const elements = await page.locator('.element');
        await expect(elements.first()).toHaveClass(/highlight/);
        await expect(elements.nth(2)).toHaveClass(/highlight/); // The index of the target number
    });

    test('Check console errors', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to the page
        await page.goto(BASE_URL);

        // Check if there are any console errors
        await expect(consoleErrors).toEqual([]);
    });
});