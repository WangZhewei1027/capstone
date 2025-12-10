import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b74371-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Huffman Coding Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Huffman Coding application
        await page.goto(url);
    });

    test('should load the page with default elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Huffman Coding Demo');

        // Check if the input area and button are present
        const textInput = await page.locator('#textInput');
        const encodeButton = await page.locator('#encodeButton');
        const outputDiv = await page.locator('#output');

        await expect(textInput).toBeVisible();
        await expect(encodeButton).toBeVisible();
        await expect(outputDiv).toBeVisible();
    });

    test('should encode input text and display Huffman codes', async ({ page }) => {
        // Input text to encode
        const inputText = 'hello world';
        await page.fill('#textInput', inputText);

        // Click the encode button
        await page.click('#encodeButton');

        // Verify that the output contains Huffman codes
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Huffman Codes:');
        await expect(outputDiv).toContainText('h:');
        await expect(outputDiv).toContainText('e:');
        await expect(outputDiv).toContainText('l:');
        await expect(outputDiv).toContainText('o:');
        await expect(outputDiv).toContainText(' :');
        await expect(outputDiv).toContainText('w:');
        await expect(outputDiv).toContainText('r:');
        await expect(outputDiv).toContainText('d:');
        await expect(outputDiv).toContainText('Encoded Output:');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Clear the input
        await page.fill('#textInput', '');

        // Click the encode button
        await page.click('#encodeButton');

        // Verify that the output does not contain any codes or encoded output
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).not.toContainText('Huffman Codes:');
        await expect(outputDiv).not.toContainText('Encoded Output:');
    });

    test('should handle single character input', async ({ page }) => {
        // Input a single character
        const inputText = 'a';
        await page.fill('#textInput', inputText);

        // Click the encode button
        await page.click('#encodeButton');

        // Verify that the output contains the correct Huffman code
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Huffman Codes:');
        await expect(outputDiv).toContainText('a: 0'); // Assuming 'a' gets code '0'
        await expect(outputDiv).toContainText('Encoded Output: 0');
    });

    test('should handle input with all unique characters', async ({ page }) => {
        // Input unique characters
        const inputText = 'abcdefg';
        await page.fill('#textInput', inputText);

        // Click the encode button
        await page.click('#encodeButton');

        // Verify that the output contains Huffman codes for each character
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Huffman Codes:');
        for (const char of inputText) {
            await expect(outputDiv).toContainText(`${char}:`);
        }
    });

    test('should display console errors for invalid operations', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Intentionally cause an error by encoding invalid input
        await page.fill('#textInput', 'invalid input');
        await page.click('#encodeButton');

        // Check for console errors
        await expect(consoleErrors.length).toBeGreaterThan(0);
    });
});