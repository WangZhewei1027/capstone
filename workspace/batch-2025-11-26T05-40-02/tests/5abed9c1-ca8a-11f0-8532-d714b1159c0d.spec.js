import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abed9c1-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Floyd-Warshall Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial idle state', async ({ page }) => {
        // Verify that the input form is visible on the initial load
        const form = await page.locator('#input-form');
        await expect(form).toBeVisible();
    });

    test('should submit the form and transition to submitted state', async ({ page }) => {
        // Fill in the form with valid data
        await page.fill('#graph', 'A->B; B->C');
        await page.fill('#rows', '3');
        await page.fill('#cols', '3');
        await page.fill('#time', 'O(n^3)');

        // Click the submit button
        await page.click('#submit-btn');

        // Verify that the result is displayed after submission
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('The shortest path from A to B is A->B with a total weight of O(n^3).');
    });

    test('should handle empty graph edges submission', async ({ page }) => {
        // Fill in the form with empty graph edges
        await page.fill('#graph', '');
        await page.fill('#rows', '3');
        await page.fill('#cols', '3');
        await page.fill('#time', 'O(n^3)');

        // Click the submit button
        await page.click('#submit-btn');

        // Verify that the result does not display any paths
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('The shortest path from  to  is  with a total weight of O(n^3).');
    });

    test('should handle invalid number of rows and columns', async ({ page }) => {
        // Fill in the form with invalid data
        await page.fill('#graph', 'A->B; B->C');
        await page.fill('#rows', '-1'); // Invalid row count
        await page.fill('#cols', '3');
        await page.fill('#time', 'O(n^3)');

        // Click the submit button
        await page.click('#submit-btn');

        // Verify that no valid result is displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeEmpty();
    });

    test('should handle missing time complexity', async ({ page }) => {
        // Fill in the form without time complexity
        await page.fill('#graph', 'A->B; B->C');
        await page.fill('#rows', '3');
        await page.fill('#cols', '3');
        await page.fill('#time', '');

        // Click the submit button
        await page.click('#submit-btn');

        // Verify that the result indicates missing time complexity
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('The shortest path from A to B is A->B with a total weight of .');
    });

    test('should not submit the form with invalid graph edges format', async ({ page }) => {
        // Fill in the form with invalid graph edges
        await page.fill('#graph', 'A-B; B-C'); // Invalid format
        await page.fill('#rows', '3');
        await page.fill('#cols', '3');
        await page.fill('#time', 'O(n^3)');

        // Click the submit button
        await page.click('#submit-btn');

        // Verify that no valid result is displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toBeEmpty();
    });
});