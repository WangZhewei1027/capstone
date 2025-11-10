import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1850a320-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Huffman Coding Explorer Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in the idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should transition to encoding state on text input and button click', async ({ page }) => {
        await page.fill('#textInput', 'hello');
        await page.click('button');

        const output1 = await page.locator('#output1').innerText();
        expect(output).not.toBe('');
        expect(output).toMatch(/^[01\s]+$/); // Check if output is binary representation
    });

    test('should display encoded output correctly after encoding', async ({ page }) => {
        await page.fill('#textInput', 'hello');
        await page.click('button');

        const output2 = await page.locator('#output2').innerText();
        expect(output).toMatch(/^[01\s]+$/); // Check if output is binary representation
        expect(output).toContain('h'); // Ensure that encoded output contains characters from input
    });

    test('should reset to idle state after reset', async ({ page }) => {
        await page.fill('#textInput', 'hello');
        await page.click('button');

        await page.fill('#textInput', ''); // Simulate reset
        const output3 = await page.locator('#output3').innerText();
        expect(output).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.fill('#textInput', '');
        await page.click('button');

        const output4 = await page.locator('#output4').innerText();
        expect(output).toBe(''); // No output for empty input
    });

    test('should handle single character input', async ({ page }) => {
        await page.fill('#textInput', 'a');
        await page.click('button');

        const output5 = await page.locator('#output5').innerText();
        expect(output).not.toBe('');
        expect(output).toMatch(/^[01\s]+$/); // Check if output is binary representation
    });

    test('should handle special characters', async ({ page }) => {
        await page.fill('#textInput', 'hello!@#');
        await page.click('button');

        const output6 = await page.locator('#output6').innerText();
        expect(output).not.toBe('');
        expect(output).toMatch(/^[01\s]+$/); // Check if output is binary representation
    });

    test('should not crash on large input', async ({ page }) => {
        const largeInput = 'a'.repeat(1000); // Large input of 1000 characters
        await page.fill('#textInput', largeInput);
        await page.click('button');

        const output7 = await page.locator('#output7').innerText();
        expect(output).not.toBe('');
        expect(output).toMatch(/^[01\s]+$/); // Check if output is binary representation
    });
});