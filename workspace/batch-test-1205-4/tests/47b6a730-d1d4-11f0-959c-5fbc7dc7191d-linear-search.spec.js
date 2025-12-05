import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6a730-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Linear Search Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial array', async ({ page }) => {
        // Verify the initial array is displayed correctly
        const elements = await page.locator('#arrayContainer .element');
        const count = await elements.count();
        expect(count).toBe(10); // There should be 10 elements in the array

        const expectedValues = ['4', '2', '7', '1', '3', '10', '5', '8', '6', '9'];
        for (let i = 0; i < count; i++) {
            const text = await elements.nth(i).innerText();
            expect(text).toBe(expectedValues[i]);
        }
    });

    test('should highlight elements during search', async ({ page }) => {
        // Perform a search for a value that exists
        await page.fill('#searchValue', '7');
        await page.click('button');

        // Wait for the search to complete and check highlights
        await page.waitForTimeout(6000); // Wait for the search animation to complete

        const highlightedElements = await page.locator('.highlight').count();
        expect(highlightedElements).toBeGreaterThan(0); // At least one element should be highlighted
    });

    test('should display found message when value is found', async ({ page }) => {
        // Search for a value that exists
        await page.fill('#searchValue', '3');
        await page.click('button');

        // Wait for the result message to appear
        await page.waitForTimeout(6000); // Wait for the search animation to complete

        const resultMessage = await page.locator('#resultMessage').innerText();
        expect(resultMessage).toBe('Value 3 found at index 4.'); // Check if the correct message is displayed
    });

    test('should display not found message when value is not found', async ({ page }) => {
        // Search for a value that does not exist
        await page.fill('#searchValue', '11');
        await page.click('button');

        // Wait for the result message to appear
        await page.waitForTimeout(6000); // Wait for the search animation to complete

        const resultMessage = await page.locator('#resultMessage').innerText();
        expect(resultMessage).toBe('Value 11 not found in the array.'); // Check if the correct message is displayed
    });

    test('should highlight the found element', async ({ page }) => {
        // Search for a value that exists
        await page.fill('#searchValue', '10');
        await page.click('button');

        // Wait for the search to complete
        await page.waitForTimeout(6000); // Wait for the search animation to complete

        const foundElement = await page.locator('.found').count();
        expect(foundElement).toBe(1); // There should be exactly one found element
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Search with an empty input
        await page.fill('#searchValue', '');
        await page.click('button');

        // Wait for the result message to appear
        await page.waitForTimeout(6000); // Wait for the search animation to complete

        const resultMessage = await page.locator('#resultMessage').innerText();
        expect(resultMessage).toBe('Value NaN not found in the array.'); // Check if the correct message is displayed
    });

    test('should not crash on invalid input', async ({ page }) => {
        // Search with a non-numeric input
        await page.fill('#searchValue', 'abc');
        await page.click('button');

        // Wait for the result message to appear
        await page.waitForTimeout(6000); // Wait for the search animation to complete

        const resultMessage = await page.locator('#resultMessage').innerText();
        expect(resultMessage).toBe('Value NaN not found in the array.'); // Check if the correct message is displayed
    });
});