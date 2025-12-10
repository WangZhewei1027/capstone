import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b45d40-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Array Demo Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with the correct title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Array Demo');
    });

    test('should display an input field and a button', async ({ page }) => {
        // Check if the input field and button are visible
        const inputField = await page.locator('#number-input');
        const createArrayButton = await page.locator('#create-array-button');
        await expect(inputField).toBeVisible();
        await expect(createArrayButton).toBeVisible();
    });

    test('should create an array and display its information when valid numbers are entered', async ({ page }) => {
        // Input valid numbers and click the button
        await page.fill('#number-input', '1, 2, 3, 4');
        await page.click('#create-array-button');

        // Verify the output information
        const outputDiv = await page.locator('#array-output');
        await expect(outputDiv).toContainText('Array: [1, 2, 3, 4]');
        await expect(outputDiv).toContainText('Sum: 10');
        await expect(outputDiv).toContainText('Average: 2.50');
        await expect(outputDiv).toContainText('Minimum: 1');
        await expect(outputDiv).toContainText('Maximum: 4');
    });

    test('should show an error message for invalid input', async ({ page }) => {
        // Input invalid numbers and click the button
        await page.fill('#number-input', '1, two, 3, four');
        await page.click('#create-array-button');

        // Verify the error message
        const outputDiv = await page.locator('#array-output');
        await expect(outputDiv).toContainText('Please enter valid numbers separated by commas.');
    });

    test('should show an error message for empty input', async ({ page }) => {
        // Click the button without entering any numbers
        await page.fill('#number-input', '');
        await page.click('#create-array-button');

        // Verify the error message
        const outputDiv = await page.locator('#array-output');
        await expect(outputDiv).toContainText('Please enter valid numbers separated by commas.');
    });

    test('should clear previous output when new input is submitted', async ({ page }) => {
        // Input valid numbers and click the button
        await page.fill('#number-input', '5, 6, 7');
        await page.click('#create-array-button');

        // Verify the output information
        const outputDiv = await page.locator('#array-output');
        await expect(outputDiv).toContainText('Array: [5, 6, 7]');

        // Input new numbers and click the button again
        await page.fill('#number-input', '8, 9');
        await page.click('#create-array-button');

        // Verify the output information is updated
        await expect(outputDiv).toContainText('Array: [8, 9]');
        await expect(outputDiv).not.toContainText('Array: [5, 6, 7]');
    });
});