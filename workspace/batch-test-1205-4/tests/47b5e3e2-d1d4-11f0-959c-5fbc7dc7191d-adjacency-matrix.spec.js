import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b5e3e2-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Adjacency Matrix Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Adjacency Matrix Visualization');

        // Check the default number of nodes input value
        const nodesInput = await page.locator('#nodes');
        await expect(nodesInput).toHaveValue('3');

        // Check if the matrix container is empty initially
        const matrixContainer = await page.locator('#matrixContainer');
        await expect(matrixContainer).toBeEmpty();
    });

    test('should generate a 3x3 matrix on button click', async ({ page }) => {
        // Click the generate matrix button
        await page.click('button');

        // Verify that the matrix container has 3 rows
        const matrixContainer = await page.locator('#matrixContainer');
        const rows = await matrixContainer.locator('.row');
        await expect(rows).toHaveCount(3);

        // Verify that each row has 3 cells
        for (let i = 0; i < 3; i++) {
            const cells = await rows.nth(i).locator('.cell');
            await expect(cells).toHaveCount(3);
        }
    });

    test('should update the matrix when number of nodes is changed', async ({ page }) => {
        // Change the number of nodes to 4
        await page.fill('#nodes', '4');
        await page.click('button');

        // Verify that the matrix container has 4 rows
        const matrixContainer = await page.locator('#matrixContainer');
        const rows = await matrixContainer.locator('.row');
        await expect(rows).toHaveCount(4);

        // Verify that each row has 4 cells
        for (let i = 0; i < 4; i++) {
            const cells = await rows.nth(i).locator('.cell');
            await expect(cells).toHaveCount(4);
        }
    });

    test('should only allow 0 or 1 in matrix cells', async ({ page }) => {
        // Generate a 3x3 matrix
        await page.click('button');

        // Fill a cell with an invalid value
        const cellInput = await page.locator('#cell-0-0');
        await cellInput.fill('2');
        await cellInput.dispatchEvent('change');

        // Verify that the cell value is reset to 1
        await expect(cellInput).toHaveValue('1');

        // Fill a cell with a valid value
        await cellInput.fill('0');
        await cellInput.dispatchEvent('change');

        // Verify that the cell value remains 0
        await expect(cellInput).toHaveValue('0');
    });

    test('should handle edge case of minimum nodes', async ({ page }) => {
        // Change the number of nodes to 1
        await page.fill('#nodes', '1');
        await page.click('button');

        // Verify that the matrix container has 1 row
        const matrixContainer = await page.locator('#matrixContainer');
        const rows = await matrixContainer.locator('.row');
        await expect(rows).toHaveCount(1);

        // Verify that the row has 1 cell
        const cells = await rows.nth(0).locator('.cell');
        await expect(cells).toHaveCount(1);
    });

    test('should handle edge case of zero nodes', async ({ page }) => {
        // Change the number of nodes to 0
        await page.fill('#nodes', '0');
        await page.click('button');

        // Verify that the matrix container is empty
        const matrixContainer = await page.locator('#matrixContainer');
        await expect(matrixContainer).toBeEmpty();
    });

    test('should check for console errors', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Generate a matrix
        await page.click('button');

        // Check that no console errors occurred
        await expect(consoleErrors).toHaveLength(0);
    });
});