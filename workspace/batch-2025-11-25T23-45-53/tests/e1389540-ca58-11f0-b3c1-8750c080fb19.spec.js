import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1389540-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Huffman Coding Demo', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify that the input field is enabled and output is empty
        const inputField = await page.locator('#inputString');
        const outputDiv = await page.locator('#output');

        await expect(inputField).toBeEnabled();
        await expect(outputDiv).toHaveText('');
    });

    test('should transition to GeneratingCode state on valid input', async ({ page }) => {
        // Input valid string and click generate
        await page.fill('#inputString', 'hello');
        await page.click('button');

        // Verify that the input field is disabled during generation
        const inputField = await page.locator('#inputString');
        await expect(inputField).toBeDisabled();

        // Wait for the output to be displayed
        await page.waitForTimeout(2000); // Wait for the generation to complete
    });

    test('should transition to DisplayOutput state and show results', async ({ page }) => {
        // Input valid string and click generate
        await page.fill('#inputString', 'hello');
        await page.click('button');

        // Wait for the output to be displayed
        await page.waitForTimeout(2000);

        // Verify that the output is displayed correctly
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Character Frequencies:');
        await expect(outputDiv).toContainText('Huffman Codes:');
    });

    test('should return to Idle state after displaying output', async ({ page }) => {
        // Input valid string and click generate
        await page.fill('#inputString', 'hello');
        await page.click('button');

        // Wait for the output to be displayed
        await page.waitForTimeout(2000);

        // Verify that the input field is enabled again
        const inputField = await page.locator('#inputString');
        await expect(inputField).toBeEnabled();

        // Verify that the output is still present
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('Character Frequencies:');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click generate without input
        await page.click('button');

        // Verify that the output remains empty
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('should handle single character input', async ({ page }) => {
        // Input a single character and click generate
        await page.fill('#inputString', 'a');
        await page.click('button');

        // Wait for the output to be displayed
        await page.waitForTimeout(2000);

        // Verify that the output is displayed correctly
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Character Frequencies:');
        await expect(outputDiv).toContainText('"a": 1');
        await expect(outputDiv).toContainText('Huffman Codes:');
        await expect(outputDiv).toContainText('"a": "0"');
    });

    test('should handle multiple characters with same frequency', async ({ page }) => {
        // Input characters with same frequency and click generate
        await page.fill('#inputString', 'abcabc');
        await page.click('button');

        // Wait for the output to be displayed
        await page.waitForTimeout(2000);

        // Verify that the output is displayed correctly
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Character Frequencies:');
        await expect(outputDiv).toContainText('"a": 2');
        await expect(outputDiv).toContainText('"b": 2');
        await expect(outputDiv).toContainText('"c": 2');
        await expect(outputDiv).toContainText('Huffman Codes:');
    });
});