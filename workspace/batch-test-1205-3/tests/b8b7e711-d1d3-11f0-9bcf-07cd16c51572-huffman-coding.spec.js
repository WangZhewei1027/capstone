import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b7e711-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Huffman Coding Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Huffman Coding application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify that the title of the page is correct
        await expect(page).toHaveTitle('Huffman Coding Demonstration');
    });

    test('should display a prompt to enter a string', async ({ page }) => {
        // Check for the presence of the input field and button
        const inputField = await page.locator('#inputString');
        const button = await page.locator('button');

        await expect(inputField).toBeVisible();
        await expect(button).toBeVisible();
    });

    test('should show an error message when input is empty', async ({ page }) => {
        // Click the button without entering any text
        await page.click('button');

        // Verify that the error message is displayed
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toHaveText('Please enter a valid string.');
    });

    test('should generate Huffman codes for a valid input', async ({ page }) => {
        // Enter a valid string and click the button
        await page.fill('#inputString', 'hello');
        await page.click('button');

        // Verify that the result contains character frequencies and Huffman codes
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toContainText('Character Frequencies:');
        await expect(resultContainer).toContainText('Huffman Codes:');
    });

    test('should handle special characters in input', async ({ page }) => {
        // Enter a string with special characters
        await page.fill('#inputString', 'hello, world!');
        await page.click('button');

        // Verify that the result contains character frequencies and Huffman codes
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toContainText('Character Frequencies:');
        await expect(resultContainer).toContainText('Huffman Codes:');
    });

    test('should handle numeric input', async ({ page }) => {
        // Enter a string with numeric characters
        await page.fill('#inputString', '12345');
        await page.click('button');

        // Verify that the result contains character frequencies and Huffman codes
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toContainText('Character Frequencies:');
        await expect(resultContainer).toContainText('Huffman Codes:');
    });

    test('should generate Huffman codes for a longer input', async ({ page }) => {
        // Enter a longer string
        await page.fill('#inputString', 'this is a test for Huffman coding');
        await page.click('button');

        // Verify that the result contains character frequencies and Huffman codes
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toContainText('Character Frequencies:');
        await expect(resultContainer).toContainText('Huffman Codes:');
    });

    test('should not crash on large input', async ({ page }) => {
        // Enter a large string
        const largeInput = 'a'.repeat(1000);
        await page.fill('#inputString', largeInput);
        await page.click('button');

        // Verify that the result contains character frequencies and Huffman codes
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toContainText('Character Frequencies:');
        await expect(resultContainer).toContainText('Huffman Codes:');
    });

    test('should show an error message for non-string input', async ({ page }) => {
        // Enter a non-string input (e.g., an object)
        await page.fill('#inputString', '[object Object]');
        await page.click('button');

        // Verify that the result contains an error message
        const resultContainer = await page.locator('#result');
        await expect(resultContainer).toHaveText('Please enter a valid string.');
    });
});