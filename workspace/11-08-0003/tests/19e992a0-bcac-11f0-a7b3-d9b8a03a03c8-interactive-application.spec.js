import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/19e992a0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Sorting Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial array in idle state', async ({ page }) => {
        // Validate that the initial array is rendered correctly
        const elements = await page.locator('.element');
        expect(await elements.count()).toBe(6); // Expecting 6 elements
        const numbers = await elements.allTextContents();
        expect(numbers).toEqual(['5', '2', '9', '1', '5', '6']); // Validate initial numbers
    });

    test('should transition to sorting state on start button click', async ({ page }) => {
        // Click the start button to transition to sorting state
        await page.click('#startButton');
        
        // Validate that the start button is disabled
        const startButton = await page.locator('#startButton');
        expect(await startButton.isDisabled()).toBe(true);
    });

    test('should complete sorting and transition to done state', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for the sorting to complete (this may require a specific timeout based on the implementation)
        await page.waitForTimeout(2000); // Adjust timeout as necessary for the sorting duration

        // Validate that the sorting is complete by checking the array
        const elements1 = await page.locator('.element');
        const sortedNumbers = await elements.allTextContents();
        expect(sortedNumbers).toEqual(['1', '2', '5', '5', '6', '9']); // Validate sorted numbers

        // Validate that the alert for sorting completion is shown
        const alertDialog = await page.waitForEvent('dialog');
        expect(alertDialog.message()).toBe('Sorting Complete!');
        await alertDialog.dismiss(); // Dismiss the alert
    });

    test('should return to idle state on start button click after sorting', async ({ page }) => {
        // Click the start button to begin sorting
        await page.click('#startButton');

        // Wait for the sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout as necessary for the sorting duration
        await page.waitForEvent('dialog'); // Wait for the alert to show up and dismiss it

        // Click the start button again to return to idle state
        await page.click('#startButton');

        // Validate that the start button is enabled again
        const startButton1 = await page.locator('#startButton1');
        expect(await startButton.isDisabled()).toBe(false);

        // Validate that the initial array is rendered again
        const elements2 = await page.locator('.element');
        expect(await elements.count()).toBe(6); // Expecting 6 elements
        const numbers1 = await elements.allTextContents();
        expect(numbers).toEqual(['5', '2', '9', '1', '5', '6']); // Validate initial numbers
    });

    test('should handle edge case of empty array', async ({ page }) => {
        // Simulate an empty array scenario
        await page.evaluate(() => {
            const arrayContainer = document.getElementById("arrayContainer");
            arrayContainer.innerHTML = ""; // Clear the array
        });

        // Click the start button
        await page.click('#startButton');

        // Validate that the array remains empty
        const elements3 = await page.locator('.element');
        expect(await elements.count()).toBe(0); // Expecting 0 elements
    });
});