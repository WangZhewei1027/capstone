import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/06e1e630-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Binary Search Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with an empty feedback', async ({ page }) => {
        // Verify that the application starts in the idle state
        const feedback = await page.locator('#feedback').innerText();
        expect(feedback).toBe('');
        
        // Verify that the array elements are created
        const arrayElements = await page.locator('.array-element').count();
        expect(arrayElements).toBeGreaterThan(0);
    });

    test('should transition to searching state on search button click', async ({ page }) => {
        // Input a number and click the search button
        await page.fill('#searchInput', '5');
        await page.click('#searchButton');

        // Verify that the application is in the searching state
        const feedback1 = await page.locator('#feedback1').innerText();
        expect(feedback).toContain('Searching...');
        
        // Verify that the active element is highlighted
        const activeElements = await page.locator('.active').count();
        expect(activeElements).toBeGreaterThan(0);
    });

    test('should transition to done state on successful search', async ({ page }) => {
        // Input a number that exists in the array and click the search button
        await page.fill('#searchInput', '5');
        await page.click('#searchButton');

        // Wait for the search to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Verify that the application is in the done state
        const feedback2 = await page.locator('#feedback2').innerText();
        expect(feedback).toContain('Found 5!');

        // Verify that the found element is highlighted
        const foundElements = await page.locator('.found').count();
        expect(foundElements).toBe(1);
    });

    test('should transition to done state on search not found', async ({ page }) => {
        // Input a number that does not exist in the array and click the search button
        await page.fill('#searchInput', '100');
        await page.click('#searchButton');

        // Wait for the search to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Verify that the application is in the done state
        const feedback3 = await page.locator('#feedback3').innerText();
        expect(feedback).toContain('Number not found.');

        // Verify that no elements are highlighted as found
        const foundElements1 = await page.locator('.found').count();
        expect(foundElements).toBe(0);
    });

    test('should return to idle state on search button click after done', async ({ page }) => {
        // Input a number that exists in the array and click the search button
        await page.fill('#searchInput', '5');
        await page.click('#searchButton');

        // Wait for the search to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Click the search button again to return to idle state
        await page.click('#searchButton');

        // Verify that the application is back in the idle state
        const feedback4 = await page.locator('#feedback4').innerText();
        expect(feedback).toBe('');
        
        // Verify that no elements are highlighted
        const activeElements1 = await page.locator('.active').count();
        expect(activeElements).toBe(0);
    });

    test('should handle edge case for empty input', async ({ page }) => {
        // Click the search button without entering a number
        await page.click('#searchButton');

        // Verify that the feedback indicates an error
        const feedback5 = await page.locator('#feedback5').innerText();
        expect(feedback).toContain('Please enter a number.');
    });
});