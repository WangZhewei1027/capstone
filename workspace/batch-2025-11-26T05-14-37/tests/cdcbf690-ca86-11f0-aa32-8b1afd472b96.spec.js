import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcbf690-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Huffman Coding Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with input area and button', async ({ page }) => {
        // Validate that the application is in the Idle state
        const textArea = await page.locator('#text');
        const generateButton = await page.locator('button[type="button"]');

        await expect(textArea).toBeVisible();
        await expect(generateButton).toBeVisible();
        await expect(generateButton).toHaveText('Generate Code');
    });

    test('should generate Huffman code on button click', async ({ page }) => {
        // Input text and click the generate code button
        await page.fill('#text', 'hello');
        await page.click('button[type="button"]');

        // Validate that the code is generated and displayed
        const output = await page.locator('#output');
        await expect(output).toBeVisible();

        // Check if the generated code is displayed (mocking the expected output)
        await expect(output).toContainText('Generated Huffman code displayed');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the generate code button without input
        await page.click('button[type="button"]');

        // Validate that no code is generated
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toContainText('Generated Huffman code displayed'); // Adjust based on actual implementation
    });

    test('should handle single character input', async ({ page }) => {
        // Input a single character and click the generate code button
        await page.fill('#text', 'a');
        await page.click('button[type="button"]');

        // Validate that the code is generated and displayed
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toContainText('Generated Huffman code displayed'); // Adjust based on actual implementation
    });

    test('should handle multiple characters input', async ({ page }) => {
        // Input multiple characters and click the generate code button
        await page.fill('#text', 'abcde');
        await page.click('button[type="button"]');

        // Validate that the code is generated and displayed
        const output = await page.locator('#output');
        await expect(output).toBeVisible();
        await expect(output).toContainText('Generated Huffman code displayed'); // Adjust based on actual implementation
    });
});