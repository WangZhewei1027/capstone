import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c167090-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Array Demo Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify the initial state of the application is Idle
        const output = await page.locator('#output').innerHTML();
        expect(output).toBe('');
    });

    test('should add elements to the array', async ({ page }) => {
        // Test adding elements to the array
        await page.fill('#array-input', 'apple,banana,orange');
        await page.click('#add-btn');

        const output = await page.locator('#output').innerHTML();
        expect(output).toContain('apple');
        expect(output).toContain('banana');
        expect(output).toContain('orange');
    });

    test('should clear elements from the array', async ({ page }) => {
        // Test clearing elements from the array
        await page.fill('#array-input', 'apple,banana,orange');
        await page.click('#add-btn');
        await page.click('#clear-btn');

        const output = await page.locator('#output').innerHTML();
        expect(output).toBe('');
    });

    test('should print the array', async ({ page }) => {
        // Test printing the array
        await page.fill('#array-input', 'apple,banana,orange');
        await page.click('#add-btn');
        await page.click('#print-btn');

        const output = await page.locator('#output').innerHTML();
        expect(output).toContain('Array: apple, banana, orange');
    });

    test('should handle adding elements with empty input', async ({ page }) => {
        // Test adding elements with empty input
        await page.click('#add-btn');

        const output = await page.locator('#output').innerHTML();
        expect(output).toBe('');
    });

    test('should handle clearing elements when none exist', async ({ page }) => {
        // Test clearing elements when there are none
        await page.click('#clear-btn');

        const output = await page.locator('#output').innerHTML();
        expect(output).toBe('');
    });

    test('should handle printing an empty array', async ({ page }) => {
        // Test printing when the array is empty
        await page.click('#print-btn');

        const output = await page.locator('#output').innerHTML();
        expect(output).toContain('Array: ');
    });
});