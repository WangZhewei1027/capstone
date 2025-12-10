import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24924b30-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Array Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial State: Verify initial output area is empty', async ({ page }) => {
        // Validate that the output area is initially empty
        const outputArea = await page.locator('#outputArea');
        await expect(outputArea).toHaveText('');
    });

    test('Add Random Number: Verify adding a number updates output', async ({ page }) => {
        // Click the button to add a random number
        await page.click('button[onclick="addToArray()"]');
        
        // Verify that the output area contains the added number message
        const outputArea1 = await page.locator('#outputArea1');
        await expect(outputArea).toMatch(/Added: \d+/);
    });

    test('Remove Last Number: Verify removing a number updates output', async ({ page }) => {
        // Add a number first
        await page.click('button[onclick="addToArray()"]');
        
        // Now remove the last number
        await page.click('button[onclick="removeFromArray()"]');
        
        // Verify that the output area contains the removed number message
        const outputArea2 = await page.locator('#outputArea2');
        await expect(outputArea).toMatch(/Removed: \d+/);
    });

    test('Remove Last Number: Verify removing from empty array', async ({ page }) => {
        // Attempt to remove a number when the array is empty
        await page.click('button[onclick="removeFromArray()"]');
        
        // Verify that the output area shows the empty message
        const outputArea3 = await page.locator('#outputArea3');
        await expect(outputArea).toHaveText('Array is already empty!');
    });

    test('Display Array: Verify displaying the current array', async ({ page }) => {
        // Add a couple of numbers
        await page.click('button[onclick="addToArray()"]');
        await page.click('button[onclick="addToArray()"]');
        
        // Display the current array
        await page.click('button[onclick="displayArray()"]');
        
        // Verify that the output area shows the current array
        const outputArea4 = await page.locator('#outputArea4');
        await expect(outputArea).toMatch(/Current Array: \[\d+, \d+\]/);
    });

    test('Display Array: Verify displaying when array is empty', async ({ page }) => {
        // Display the current array when it is empty
        await page.click('button[onclick="displayArray()"]');
        
        // Verify that the output area shows the current array as empty
        const outputArea5 = await page.locator('#outputArea5');
        await expect(outputArea).toHaveText('Current Array: []');
    });

    test('Console Errors: Check for any JavaScript errors', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Perform actions that could potentially cause errors
        await page.click('button[onclick="removeFromArray()"]'); // Attempt to remove from empty array
        await page.click('button[onclick="displayArray()"]'); // Display when empty

        // Assert that there are no console errors
        expect(consoleErrors).toHaveLength(0);
    });
});