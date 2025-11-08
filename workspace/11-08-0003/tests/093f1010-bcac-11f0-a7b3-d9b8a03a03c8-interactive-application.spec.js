import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/093f1010-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Linear Search Module', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the array in idle state', async ({ page }) => {
        // Validate that the array is displayed correctly in the idle state
        const arrayContainer = await page.locator('#array-container');
        await expect(arrayContainer).toHaveText('5 3 8 6 2 7 4 1');
    });

    test('should transition to searching state on search button click', async ({ page }) => {
        // Click the search button to transition to searching state
        await page.fill('#search-input', '5');
        await page.click('#search-button');

        // Validate that the searching class is applied to the found element
        const arrayElement = await page.locator('.array-element').first();
        await expect(arrayElement).toHaveClass(/searching/);
    });

    test('should transition to done state on search complete', async ({ page }) => {
        // Perform a search that will complete successfully
        await page.fill('#search-input', '5');
        await page.click('#search-button');

        // Wait for the search to complete and validate the result
        await page.waitForTimeout(1000); // Adjust timeout as necessary
        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Found: 5');
        
        // Validate that the found element has the found class
        const foundElement = await page.locator('.array-element.found').first();
        await expect(foundElement).toHaveText('5');
    });

    test('should transition to done state on search not found', async ({ page }) => {
        // Perform a search that will not find the element
        await page.fill('#search-input', '10');
        await page.click('#search-button');

        // Wait for the search to complete and validate the result
        await page.waitForTimeout(1000); // Adjust timeout as necessary
        const resultText1 = await page.locator('#result');
        await expect(resultText).toHaveText('Not Found');
    });

    test('should reset and return to idle state on search button click in done state', async ({ page }) => {
        // Perform a search and then click the search button again to return to idle state
        await page.fill('#search-input', '5');
        await page.click('#search-button');
        await page.waitForTimeout(1000); // Wait for search to complete

        // Click the search button again to reset
        await page.click('#search-button');

        // Validate that the result is cleared and the state is idle again
        const resultText2 = await page.locator('#result');
        await expect(resultText).toHaveText('');
        const arrayContainer1 = await page.locator('#array-container');
        await expect(arrayContainer).toHaveText('5 3 8 6 2 7 4 1');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the search button without entering any input
        await page.click('#search-button');

        // Validate that no results are displayed
        const resultText3 = await page.locator('#result');
        await expect(resultText).toHaveText('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Enter invalid input and click search
        await page.fill('#search-input', 'abc');
        await page.click('#search-button');

        // Validate that no results are displayed
        const resultText4 = await page.locator('#result');
        await expect(resultText).toHaveText('');
    });
});