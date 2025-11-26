import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abdef60-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Adjacency Matrix Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the initial state is Idle
        const input = await page.locator('#num-adj');
        const generateButton = await page.locator('#generate-btn');
        const clearButton = await page.locator('#clear-btn');
        const matrixTable = await page.locator('#adj-matrix');

        await expect(input).toBeVisible();
        await expect(generateButton).toBeVisible();
        await expect(clearButton).toBeVisible();
        await expect(matrixTable).toBeEmpty();
    });

    test('Generate adjacency matrix with valid input', async ({ page }) => {
        // Test generating the adjacency matrix with a valid number of vertices
        await page.fill('#num-adj', '3'); // Enter 3 vertices
        await page.click('#generate-btn'); // Click generate button

        // Verify that the matrix is generated correctly
        const matrixRows = await page.locator('#adj-matrix tr').count();
        expect(matrixRows).toBe(3); // Expect 3 rows for 3 vertices

        const matrixCells = await page.locator('#adj-matrix td').allTextContents();
        const expectedMatrix = ['1', '0', '0', '0', '1', '0', '0', '0', '1'];
        expect(matrixCells).toEqual(expectedMatrix);
    });

    test('Clear adjacency matrix', async ({ page }) => {
        // Test clearing the adjacency matrix
        await page.fill('#num-adj', '2'); // Enter 2 vertices
        await page.click('#generate-btn'); // Generate the matrix
        await page.click('#clear-btn'); // Click clear button

        // Verify that the matrix is cleared
        const matrixTable = await page.locator('#adj-matrix');
        await expect(matrixTable).toBeEmpty();
    });

    test('Handle invalid input gracefully', async ({ page }) => {
        // Test generating the matrix with invalid input
        await page.fill('#num-adj', '-1'); // Enter an invalid number of vertices
        await page.click('#generate-btn'); // Click generate button

        // Verify that no matrix is generated
        const matrixTable = await page.locator('#adj-matrix');
        await expect(matrixTable).toBeEmpty();
    });

    test('Handle non-numeric input gracefully', async ({ page }) => {
        // Test generating the matrix with non-numeric input
        await page.fill('#num-adj', 'abc'); // Enter non-numeric input
        await page.click('#generate-btn'); // Click generate button

        // Verify that no matrix is generated
        const matrixTable = await page.locator('#adj-matrix');
        await expect(matrixTable).toBeEmpty();
    });
});