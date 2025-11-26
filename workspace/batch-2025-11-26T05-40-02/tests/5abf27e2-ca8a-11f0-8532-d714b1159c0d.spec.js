import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf27e2-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Huffman Coding Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Huffman Coding application
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Validate that the application starts in the Idle state
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('Input symbols and frequencies updates output', async ({ page }) => {
        // Simulate user input for symbol and frequency
        await page.fill('#symbol', 'A');
        await page.fill('#frequency', '5');
        
        // Validate that the output updates correctly
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Symbol: A, Frequency: 1, Code: A');
    });

    test('Multiple inputs should aggregate frequencies', async ({ page }) => {
        // Input multiple symbols and frequencies
        await page.fill('#symbol', 'A');
        await page.fill('#frequency', '5');
        await page.fill('#symbol', 'B');
        await page.fill('#frequency', '3');
        
        // Validate that the output reflects both symbols
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Symbol: A, Frequency: 1, Code: A');
        await expect(outputDiv).toContainText('Symbol: B, Frequency: 1, Code: B');
    });

    test('Clicking Generate Huffman Code button generates codes', async ({ page }) => {
        // Input symbols and frequencies
        await page.fill('#symbol', 'A');
        await page.fill('#frequency', '5');
        await page.fill('#symbol', 'B');
        await page.fill('#frequency', '3');
        
        // Click the generate button
        await page.click('button[type="submit"]');
        
        // Validate that the output includes generated Huffman codes
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Code: A');
        await expect(outputDiv).toContainText('Code: B');
    });

    test('Edge case: Empty symbol input should not update output', async ({ page }) => {
        // Input empty symbol and a frequency
        await page.fill('#frequency', '5');
        
        // Validate that the output remains unchanged
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('Edge case: Invalid frequency input should not update output', async ({ page }) => {
        // Input a symbol and an invalid frequency
        await page.fill('#symbol', 'C');
        await page.fill('#frequency', '-1'); // Invalid frequency
        
        // Validate that the output remains unchanged
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('Final state should display generated Huffman codes', async ({ page }) => {
        // Input symbols and frequencies
        await page.fill('#symbol', 'A');
        await page.fill('#frequency', '5');
        await page.fill('#symbol', 'B');
        await page.fill('#frequency', '3');
        
        // Click the generate button
        await page.click('button[type="submit"]');
        
        // Validate that the final state shows the generated codes
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toContainText('Code: A');
        await expect(outputDiv).toContainText('Code: B');
    });
});