import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9476d3-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Huffman Coding Visualizer Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Huffman Coding Visualizer page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the page loads correctly and elements are present
        await expect(page.locator('h1')).toHaveText('Huffman Coding Visualizer');
        await expect(page.locator('input#inputString')).toBeVisible();
        await expect(page.locator('button#encode')).toBeVisible();
        await expect(page.locator('#output')).toBeEmpty();
    });

    test('should display an error message when input is empty', async ({ page }) => {
        // Click the encode button without entering any text
        await page.click('button#encode');
        
        // Verify that the error message is displayed
        await expect(page.locator('#output')).toHaveText('Please enter a string.');
    });

    test('should encode a simple string correctly', async ({ page }) => {
        // Enter a simple string and click the encode button
        await page.fill('input#inputString', 'aabbcc');
        await page.click('button#encode');

        // Verify that the output contains the original string and encoded string
        await expect(page.locator('#output')).toContainText('Original String:');
        await expect(page.locator('#output')).toContainText('Encoded String:');
    });

    test('should display character codes for input string', async ({ page }) => {
        // Enter a string and click the encode button
        await page.fill('input#inputString', 'abc');
        await page.click('button#encode');

        // Verify that character codes are displayed in the output
        await expect(page.locator('#output')).toContainText('Character Codes:');
        await expect(page.locator('#output')).toContainText('"a":');
        await expect(page.locator('#output')).toContainText('"b":');
        await expect(page.locator('#output')).toContainText('"c":');
    });

    test('should handle edge case of single character input', async ({ page }) => {
        // Enter a single character and click the encode button
        await page.fill('input#inputString', 'a');
        await page.click('button#encode');

        // Verify that the output is correct for a single character
        await expect(page.locator('#output')).toContainText('Original String:');
        await expect(page.locator('#output')).toContainText('Encoded String:');
        await expect(page.locator('#output')).toContainText('"a":');
    });

    test('should handle edge case of empty string input', async ({ page }) => {
        // Enter an empty string and click the encode button
        await page.fill('input#inputString', '');
        await page.click('button#encode');

        // Verify that the error message is displayed
        await expect(page.locator('#output')).toHaveText('Please enter a string.');
    });

    test('should handle special characters in input', async ({ page }) => {
        // Enter a string with special characters and click the encode button
        await page.fill('input#inputString', 'abc!@#');
        await page.click('button#encode');

        // Verify that the output contains the original string and encoded string
        await expect(page.locator('#output')).toContainText('Original String:');
        await expect(page.locator('#output')).toContainText('Encoded String:');
    });
});