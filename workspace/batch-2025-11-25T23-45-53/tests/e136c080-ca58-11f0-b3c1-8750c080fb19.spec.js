import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e136c080-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Set Demonstration Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify that the output is empty and the input field is ready
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('');
    });

    test('should transition to InputProcessing state on valid input', async ({ page }) => {
        // Input valid numbers and click submit
        await page.fill('#inputNumbers', '1, 2, 2, 3, 4, 4, 5');
        await page.click('#submitBtn');

        // Verify that the output is still empty during processing
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('');
    });

    test('should display output after processing input', async ({ page }) => {
        // Input valid numbers and click submit
        await page.fill('#inputNumbers', '1, 2, 2, 3, 4, 4, 5');
        await page.click('#submitBtn');

        // Wait for the output to be displayed
        await page.waitForTimeout(500); // Simulate processing time

        // Verify that the output displays unique values
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('1, 2, 3, 4, 5');
    });

    test('should reset input field and output on subsequent submit', async ({ page }) => {
        // Input valid numbers and click submit
        await page.fill('#inputNumbers', '1, 2, 2, 3, 4, 4, 5');
        await page.click('#submitBtn');

        // Wait for the output to be displayed
        await page.waitForTimeout(500);

        // Click submit again to reset
        await page.fill('#inputNumbers', ''); // Clear input
        await page.click('#submitBtn');

        // Verify that the output is reset
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click submit without any input
        await page.click('#submitBtn');

        // Verify that the output remains empty
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('');
    });

    test('should handle input with only duplicates', async ({ page }) => {
        // Input only duplicates and click submit
        await page.fill('#inputNumbers', '2, 2, 2, 2');
        await page.click('#submitBtn');

        // Wait for the output to be displayed
        await page.waitForTimeout(500);

        // Verify that the output displays only one unique value
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('2');
    });

    test('should handle mixed input with duplicates', async ({ page }) => {
        // Input mixed numbers with duplicates and click submit
        await page.fill('#inputNumbers', '1, 2, 2, 3, 4, 4, 5');
        await page.click('#submitBtn');

        // Wait for the output to be displayed
        await page.waitForTimeout(500);

        // Verify that the output displays unique values
        const output = await page.locator('#setOutput').textContent();
        expect(output).toBe('1, 2, 3, 4, 5');
    });
});