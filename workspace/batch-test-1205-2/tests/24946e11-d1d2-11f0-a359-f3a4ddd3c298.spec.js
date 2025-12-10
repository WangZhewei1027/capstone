import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24946e11-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Linear Search Demo Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Linear Search Demo page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the page is in the Idle state
        const numberListInput = await page.locator('#numberList');
        const searchNumberInput = await page.locator('#searchNumber');
        const resultDiv = await page.locator('#result');

        await expect(numberListInput).toBeVisible();
        await expect(searchNumberInput).toBeVisible();
        await expect(resultDiv).toHaveText('');
    });

    test('Search with valid input - Result Found', async ({ page }) => {
        // Input a valid list and search for a number that exists
        await page.fill('#numberList', '10, 20, 30, 40');
        await page.fill('#searchNumber', '20');
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows the number was found
        const resultDiv1 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Number 20 found at index 1.');
    });

    test('Search with valid input - Result Not Found', async ({ page }) => {
        // Input a valid list and search for a number that does not exist
        await page.fill('#numberList', '10, 20, 30, 40');
        await page.fill('#searchNumber', '50');
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows the number was not found
        const resultDiv2 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Number 50 not found in the list.');
    });

    test('Search with invalid input - Empty List', async ({ page }) => {
        // Input an empty list and a valid search number
        await page.fill('#numberList', '');
        await page.fill('#searchNumber', '20');
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows an error message
        const resultDiv3 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid list of numbers and a search number.');
    });

    test('Search with invalid input - Invalid Search Number', async ({ page }) => {
        // Input a valid list and an invalid search number
        await page.fill('#numberList', '10, 20, 30, 40');
        await page.fill('#searchNumber', 'abc'); // Invalid input
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows an error message
        const resultDiv4 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid list of numbers and a search number.');
    });

    test('Search with only spaces in list', async ({ page }) => {
        // Input a list with only spaces and a valid search number
        await page.fill('#numberList', '     ');
        await page.fill('#searchNumber', '20');
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows an error message
        const resultDiv5 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Please enter a valid list of numbers and a search number.');
    });

    test('Search with valid input - Edge Case (First Element)', async ({ page }) => {
        // Input a valid list and search for the first number
        await page.fill('#numberList', '10, 20, 30, 40');
        await page.fill('#searchNumber', '10');
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows the number was found at index 0
        const resultDiv6 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Number 10 found at index 0.');
    });

    test('Search with valid input - Edge Case (Last Element)', async ({ page }) => {
        // Input a valid list and search for the last number
        await page.fill('#numberList', '10, 20, 30, 40');
        await page.fill('#searchNumber', '40');
        await page.click('button[onclick="performLinearSearch()"]');

        // Verify that the result shows the number was found at the last index
        const resultDiv7 = await page.locator('#result');
        await expect(resultDiv).toHaveText('Number 40 found at index 3.');
    });
});