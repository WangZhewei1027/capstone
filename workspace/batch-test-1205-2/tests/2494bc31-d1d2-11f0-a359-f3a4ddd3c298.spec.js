import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494bc31-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the input matrix is created on page load
        const inputMatrix = await page.locator('#inputMatrix');
        await expect(inputMatrix).toBeVisible();
        const inputs = await inputMatrix.locator('input[type="number"]');
        await expect(inputs).toHaveCount(16); // 4x4 matrix
    });

    test('Calculate shortest paths - Transition from Idle to Calculating', async ({ page }) => {
        // Input values into the matrix
        await page.fill('#cell-0-1', '3');
        await page.fill('#cell-0-2', '8');
        await page.fill('#cell-1-0', '3');
        await page.fill('#cell-1-2', '2');
        await page.fill('#cell-2-0', '5');
        await page.fill('#cell-2-1', '1');
        await page.fill('#cell-3-3', '0');

        // Click the button to calculate shortest paths
        await page.click('button[onclick="runFloydWarshall()"]');

        // Verify that the result table is displayed after calculation
        const resultTable = await page.locator('#resultTable');
        await expect(resultTable).toBeVisible();
    });

    test('Display result - Transition from Calculating to Result Displayed', async ({ page }) => {
        // Input values into the matrix
        await page.fill('#cell-0-1', '3');
        await page.fill('#cell-0-2', '8');
        await page.fill('#cell-1-0', '3');
        await page.fill('#cell-1-2', '2');
        await page.fill('#cell-2-0', '5');
        await page.fill('#cell-2-1', '1');
        await page.fill('#cell-3-3', '0');

        // Click the button to calculate shortest paths
        await page.click('button[onclick="runFloydWarshall()"]');

        // Verify that the result is displayed correctly
        const resultCells = await page.locator('#resultTable td');
        await expect(resultCells).toHaveCount(16); // 4x4 result matrix
        await expect(resultCells.nth(0)).toHaveText('0'); // Check specific values
        await expect(resultCells.nth(1)).toHaveText('3');
        await expect(resultCells.nth(2)).toHaveText('5');
        await expect(resultCells.nth(3)).toHaveText('∞');
    });

    test('Edge case - Input invalid values', async ({ page }) => {
        // Input invalid values into the matrix
        await page.fill('#cell-0-1', 'invalid');
        await page.fill('#cell-1-2', 'NaN');

        // Click the button to calculate shortest paths
        await page.click('button[onclick="runFloydWarshall()"]');

        // Verify that the result table is displayed but contains '∞' for invalid inputs
        const resultCells1 = await page.locator('#resultTable td');
        await expect(resultCells).toHaveCount(16); // 4x4 result matrix
        await expect(resultCells.nth(1)).toHaveText('∞'); // Check for invalid input handling
        await expect(resultCells.nth(2)).toHaveText('∞');
    });

    test('Check for console errors', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Click the button to calculate shortest paths
        await page.click('button[onclick="runFloydWarshall()"]');

        // Assert that there are no console errors
        await expect(consoleErrors).toHaveLength(0);
    });
});