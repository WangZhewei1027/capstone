import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c933e50-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Adjacency Matrix Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the initial number of nodes input value
        const numNodesInput = await page.locator('#numNodes');
        await expect(numNodesInput).toHaveValue('3');

        // Verify the output is empty initially
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('should create a matrix when number of nodes is changed', async ({ page }) => {
        // Change the number of nodes to 4
        await page.fill('#numNodes', '4');
        await page.dispatchEvent('#numNodes', 'change');

        // Verify that the matrix is created with 4 nodes
        const matrixContainer = await page.locator('#matrixContainer table');
        await expect(matrixContainer).toBeVisible();
        const rows = await matrixContainer.locator('tr').count();
        await expect(rows).toBe(5); // 1 header + 4 rows
        const cells = await matrixContainer.locator('td').count();
        await expect(cells).toBe(16); // 4 rows * 4 columns
    });

    test('should generate adjacency matrix on button click', async ({ page }) => {
        // Change the number of nodes to 3 and generate the matrix
        await page.fill('#numNodes', '3');
        await page.dispatchEvent('#numNodes', 'change');

        // Click the button to generate the matrix
        await page.click('button:has-text("Generate Adjacency Matrix")');

        // Verify the output is displayed correctly
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText(JSON.stringify([[0, 0, 0], [0, 0, 0], [0, 0, 0]]));
    });

    test('should update the output when matrix inputs are changed', async ({ page }) => {
        // Change the number of nodes to 3 and generate the matrix
        await page.fill('#numNodes', '3');
        await page.dispatchEvent('#numNodes', 'change');
        await page.click('button:has-text("Generate Adjacency Matrix")');

        // Change the value of the first input in the matrix
        await page.fill('#matrixContainer input[type="number"]', '1');

        // Click the button to generate the matrix again
        await page.click('button:has-text("Generate Adjacency Matrix")');

        // Verify the output reflects the updated matrix
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText(JSON.stringify([[1, 0, 0], [0, 0, 0], [0, 0, 0]]));
    });

    test('should handle edge case of zero nodes', async ({ page }) => {
        // Set number of nodes to 0
        await page.fill('#numNodes', '0');
        await page.dispatchEvent('#numNodes', 'change');

        // Verify that no matrix is created
        const matrixContainer = await page.locator('#matrixContainer');
        await expect(matrixContainer).toBeEmpty();
    });

    test('should handle invalid input in number of nodes', async ({ page }) => {
        // Set number of nodes to a negative value
        await page.fill('#numNodes', '-1');
        await page.dispatchEvent('#numNodes', 'change');

        // Verify that no matrix is created
        const matrixContainer = await page.locator('#matrixContainer');
        await expect(matrixContainer).toBeEmpty();
    });

    test('should not crash when generating matrix with non-numeric input', async ({ page }) => {
        // Set number of nodes to a non-numeric value
        await page.fill('#numNodes', 'abc');
        await page.dispatchEvent('#numNodes', 'change');

        // Verify that no matrix is created
        const matrixContainer = await page.locator('#matrixContainer');
        await expect(matrixContainer).toBeEmpty();
    });
});