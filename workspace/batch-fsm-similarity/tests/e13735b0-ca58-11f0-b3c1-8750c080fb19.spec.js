import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e13735b0-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Adjacency Matrix Demonstration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        // Verify that the initial state is Idle
        const createButton = await page.locator('#createMatrix');
        await expect(createButton).toBeVisible();
        await expect(page.locator('#matrixContainer')).toHaveClass(/hidden/);
        await expect(page.locator('#resultContainer')).toHaveClass(/hidden/);
    });

    test('should transition to CreatingMatrix state on Create Matrix button click', async ({ page }) => {
        // Simulate user clicking the Create Matrix button
        await page.fill('#numVertices', '3');
        await page.click('#createMatrix');

        // Verify that the matrix container is displayed
        await expect(page.locator('#matrixContainer')).not.toHaveClass(/hidden/);
        await expect(page.locator('#adjMatrix')).toBeVisible();
    });

    test('should display the adjacency matrix after creation', async ({ page }) => {
        // Create the matrix
        await page.fill('#numVertices', '3');
        await page.click('#createMatrix');

        // Verify the matrix is displayed
        const matrixCells = await page.locator('#adjMatrix input[type="number"]');
        await expect(matrixCells).toHaveCount(9); // 3x3 matrix
    });

    test('should transition to SubmittingMatrix state on Submit Matrix button click', async ({ page }) => {
        // Create the matrix first
        await page.fill('#numVertices', '3');
        await page.click('#createMatrix');

        // Submit the matrix
        await page.fill('#adjMatrix input[type="number"]', '1');
        await page.click('#submitMatrix');

        // Verify that the result container is displayed
        await expect(page.locator('#resultContainer')).not.toHaveClass(/hidden/);
    });

    test('should display the result of the submitted matrix', async ({ page }) => {
        // Create and submit the matrix
        await page.fill('#numVertices', '2');
        await page.click('#createMatrix');
        await page.fill('#adjMatrix input[type="number"]', '1');
        await page.click('#submitMatrix');

        // Verify the result is displayed
        const resultText = await page.locator('#matrixResult').textContent();
        await expect(resultText).toEqual('[[1,1],[1,1]]'); // Expecting the result based on input
    });

    test('should handle edge case of zero vertices', async ({ page }) => {
        // Attempt to create a matrix with zero vertices
        await page.fill('#numVertices', '0');
        await page.click('#createMatrix');

        // Verify that no matrix is displayed
        await expect(page.locator('#matrixContainer')).toHaveClass(/hidden/);
    });

    test('should handle edge case of negative vertices', async ({ page }) => {
        // Attempt to create a matrix with negative vertices
        await page.fill('#numVertices', '-1');
        await page.click('#createMatrix');

        // Verify that no matrix is displayed
        await expect(page.locator('#matrixContainer')).toHaveClass(/hidden/);
    });

    test('should not allow submission without creating a matrix', async ({ page }) => {
        // Attempt to submit without creating a matrix
        await expect(page.locator('#submitMatrix')).toBeDisabled();
    });

    test('should not allow submission if matrix is empty', async ({ page }) => {
        // Create the matrix
        await page.fill('#numVertices', '3');
        await page.click('#createMatrix');

        // Clear the matrix inputs
        const matrixCells = await page.locator('#adjMatrix input[type="number"]');
        await matrixCells.fill('');

        // Attempt to submit the empty matrix
        await page.click('#submitMatrix');

        // Verify that the result container is still hidden
        await expect(page.locator('#resultContainer')).toHaveClass(/hidden/);
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
        await page.close();
    });
});