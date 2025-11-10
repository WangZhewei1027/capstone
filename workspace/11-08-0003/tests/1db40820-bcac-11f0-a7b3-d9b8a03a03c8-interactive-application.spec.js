import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1db40820-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Huffman Coding Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify that the application starts in the idle state
        const outputArea = await page.locator('#outputArea');
        await expect(outputArea).toHaveText('Huffman Codes:');
        const huffmanCodes = await page.locator('#huffmanCodes');
        await expect(huffmanCodes).toHaveText('');
    });

    test('should transition to processing state on encode button click', async ({ page }) => {
        // Simulate user input and click the encode button
        await page.fill('#inputString', 'hello');
        await page.click('#encodeButton');

        // Verify that the application is processing
        const outputArea1 = await page.locator('#outputArea1');
        await expect(outputArea).toHaveText('Huffman Codes:');
        const huffmanCodes1 = await page.locator('#huffmanCodes1');
        await expect(huffmanCodes).toHaveText(/.+/); // Expecting some output after processing
    });

    test('should transition to displaying state after processing is complete', async ({ page }) => {
        // Simulate user input and click the encode button
        await page.fill('#inputString', 'hello');
        await page.click('#encodeButton');

        // Wait for processing to complete (simulate processing time)
        await page.waitForTimeout(1000); // Adjust based on actual processing time

        // Verify that the output is displayed
        const huffmanCodes2 = await page.locator('#huffmanCodes2');
        await expect(huffmanCodes).toHaveText(/.+/); // Expecting some output after processing
    });

    test('should return to idle state after displaying output', async ({ page }) => {
        // Simulate user input and click the encode button
        await page.fill('#inputString', 'hello');
        await page.click('#encodeButton');

        // Wait for processing to complete
        await page.waitForTimeout(1000); // Adjust based on actual processing time

        // Verify output is displayed
        const huffmanCodes3 = await page.locator('#huffmanCodes3');
        await expect(huffmanCodes).toHaveText(/.+/); // Expecting some output after processing

        // Simulate the transition back to idle state
        await page.click('#encodeButton'); // Assuming clicking again resets the state

        // Verify that the application returns to the idle state
        const outputArea2 = await page.locator('#outputArea2');
        await expect(outputArea).toHaveText('Huffman Codes:');
        await expect(huffmanCodes).toHaveText('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the encode button without any input
        await page.click('#encodeButton');

        // Verify that the output remains empty
        const huffmanCodes4 = await page.locator('#huffmanCodes4');
        await expect(huffmanCodes).toHaveText('');
    });

    test('should handle invalid characters in input', async ({ page }) => {
        // Fill input with invalid characters
        await page.fill('#inputString', '12345!@#$%');
        await page.click('#encodeButton');

        // Wait for processing to complete
        await page.waitForTimeout(1000); // Adjust based on actual processing time

        // Verify that the output is displayed (it should handle invalid characters)
        const huffmanCodes5 = await page.locator('#huffmanCodes5');
        await expect(huffmanCodes).toHaveText(/.+/); // Expecting some output after processing
    });
});