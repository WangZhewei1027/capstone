import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abe8ba2-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Binary Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the application starts in the Idle state
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
    });

    test('Search for a value found in the array', async ({ page }) => {
        // Test searching for a value that exists in the array
        await page.fill('#value', '16');
        await page.click('#search');

        // Validate that the result shows the correct index
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Value 16 found at index 4.');
    });

    test('Search for a value not found in the array', async ({ page }) => {
        // Test searching for a value that does not exist in the array
        await page.fill('#value', '100');
        await page.click('#search');

        // Validate that the result indicates the value was not found
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Value not found in the array.');
    });

    test('Search for a value less than the minimum in the array', async ({ page }) => {
        // Test searching for a value less than the smallest element
        await page.fill('#value', '1');
        await page.click('#search');

        // Validate that the result indicates the value was not found
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Value not found in the array.');
    });

    test('Search for a value greater than the maximum in the array', async ({ page }) => {
        // Test searching for a value greater than the largest element
        await page.fill('#value', '99');
        await page.click('#search');

        // Validate that the result indicates the value was not found
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Value not found in the array.');
    });

    test('Search with empty input', async ({ page }) => {
        // Test searching with an empty input
        await page.fill('#value', '');
        await page.click('#search');

        // Validate that the result indicates the value was not found
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('Value not found in the array.');
    });
});