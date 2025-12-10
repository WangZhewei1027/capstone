import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9401a0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Binary Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the binary search application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the initial state of the application is correct
        const title = await page.title();
        expect(title).toBe('Binary Search Demonstration');
        
        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('');
    });

    test('should perform binary search and find a target', async ({ page }) => {
        // Test a successful binary search
        await page.fill('#arrInput', '1, 2, 3, 4, 5');
        await page.fill('#targetInput', '3');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target 3 found at index 2.');
    });

    test('should perform binary search and not find a target', async ({ page }) => {
        // Test a binary search where the target is not found
        await page.fill('#arrInput', '1, 2, 3, 4, 5');
        await page.fill('#targetInput', '6');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target 6 not found in the array.');
    });

    test('should handle empty array input', async ({ page }) => {
        // Test behavior when the array input is empty
        await page.fill('#arrInput', '');
        await page.fill('#targetInput', '3');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target 3 not found in the array.');
    });

    test('should handle non-numeric target input', async ({ page }) => {
        // Test behavior when the target input is non-numeric
        await page.fill('#arrInput', '1, 2, 3, 4, 5');
        await page.fill('#targetInput', 'abc');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target NaN not found in the array.');
    });

    test('should handle unsorted array input', async ({ page }) => {
        // Test behavior when the array is unsorted
        await page.fill('#arrInput', '5, 3, 1, 4, 2');
        await page.fill('#targetInput', '4');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target 4 found at index 3.');
    });

    test('should handle single element array', async ({ page }) => {
        // Test behavior with a single element array
        await page.fill('#arrInput', '5');
        await page.fill('#targetInput', '5');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target 5 found at index 0.');
    });

    test('should handle negative numbers in the array', async ({ page }) => {
        // Test behavior with negative numbers
        await page.fill('#arrInput', '-5, -3, -1, 0, 1, 3, 5');
        await page.fill('#targetInput', '-3');
        await page.click('button');

        const resultDiv = await page.locator('#result').innerText();
        expect(resultDiv).toBe('Target -3 found at index 1.');
    });
});