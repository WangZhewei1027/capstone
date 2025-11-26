import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba553f2-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Adjacency Matrix Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial UI elements', async ({ page }) => {
        // Validate that the initial UI elements are present
        const matrixTextarea = await page.locator('#matrix');
        const generateButton = await page.locator('#generate');
        const printButton = await page.locator('#print');

        await expect(matrixTextarea).toBeVisible();
        await expect(generateButton).toBeVisible();
        await expect(printButton).toBeVisible();
    });

    test('should generate adjacency matrix on input', async ({ page }) => {
        // Input a matrix and check if it generates correctly
        await page.fill('#matrix', '1 0 0\n0 1 0\n0 0 1');
        await page.click('#generate');

        // Verify that the matrix is generated (this part assumes the implementation updates the DOM)
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('1 0 0');
        await expect(resultDiv).toContainText('0 1 0');
        await expect(resultDiv).toContainText('0 0 1');
    });

    test('should print the adjacency matrix', async ({ page }) => {
        // Input a matrix, generate it, and then print it
        await page.fill('#matrix', '1 0 0\n0 1 0\n0 0 1');
        await page.click('#generate');
        await page.click('#print');

        // Verify that the printed matrix is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toContainText('1 0 0');
        await expect(resultDiv).toContainText('0 1 0');
        await expect(resultDiv).toContainText('0 0 1');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Test the behavior when the input is empty
        await page.fill('#matrix', '');
        await page.click('#generate');

        // Check that no matrix is displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should handle invalid matrix input', async ({ page }) => {
        // Test the behavior when the input is invalid
        await page.fill('#matrix', 'invalid input');
        await page.click('#generate');

        // Check that no matrix is displayed
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should not print if no matrix has been generated', async ({ page }) => {
        // Click print without generating a matrix
        await page.click('#print');

        // Verify that the result area is still empty
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });
});