import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b68780-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Adjacency Matrix Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the adjacency matrix visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Adjacency Matrix Visualization');
        
        // Check that the input for vertex count is present and has default value
        const vertexInput = await page.locator('#vertexCount');
        await expect(vertexInput).toBeVisible();
        await expect(vertexInput).toHaveValue('3');

        // Check that the matrix table is initially empty
        const matrixTable = await page.locator('#matrixTable');
        await expect(matrixTable).toBeEmpty();
    });

    test('should generate an adjacency matrix when the button is clicked', async ({ page }) => {
        // Input a vertex count and click the generate button
        await page.fill('#vertexCount', '4');
        await page.click('button');

        // Verify that the matrix table is populated with the correct number of rows and columns
        const matrixTable = await page.locator('#matrixTable');
        await expect(matrixTable).toHaveCount(5); // 1 header + 4 rows

        // Check that the header row contains the correct vertex indices
        const headerCells = await matrixTable.locator('tr:first-child th');
        await expect(headerCells).toHaveCount(5); // 4 vertices + 1 header
        for (let i = 0; i < 4; i++) {
            await expect(headerCells.nth(i + 1)).toHaveText(`${i}`);
        }

        // Check that each row has the correct number of input fields
        for (let i = 0; i < 4; i++) {
            const rowCells = await matrixTable.locator(`tr:nth-child(${i + 2}) td`);
            await expect(rowCells).toHaveCount(4); // 4 inputs per row
        }
    });

    test('should update the matrix value and log to console', async ({ page }) => {
        // Generate a matrix first
        await page.fill('#vertexCount', '3');
        await page.click('button');

        // Change a matrix value and check console log
        const inputField = await page.locator('tr:nth-child(2) td:nth-child(2) input');
        await inputField.fill('1');

        // Verify that the input value is updated correctly
        await expect(inputField).toHaveValue('1');

        // Check console log for the correct update message
        const consoleMessages = [];
        page.on('console', msg => {
            if (msg.type() === 'log') {
                consoleMessages.push(msg.text());
            }
        });

        await inputField.dispatchEvent('change'); // Trigger the onchange event
        await expect(consoleMessages).toContain('Matrix[0][0] updated to 1');
    });

    test('should handle edge case for minimum vertex count', async ({ page }) => {
        // Input the minimum vertex count and generate the matrix
        await page.fill('#vertexCount', '2');
        await page.click('button');

        // Verify that the matrix is generated with 2 vertices
        const matrixTable = await page.locator('#matrixTable');
        await expect(matrixTable).toHaveCount(3); // 1 header + 2 rows

        // Check that each row has the correct number of input fields
        for (let i = 0; i < 2; i++) {
            const rowCells = await matrixTable.locator(`tr:nth-child(${i + 2}) td`);
            await expect(rowCells).toHaveCount(2); // 2 inputs per row
        }
    });

    test('should not allow vertex count less than 2', async ({ page }) => {
        // Input an invalid vertex count and attempt to generate the matrix
        await page.fill('#vertexCount', '1');
        await page.click('button');

        // Verify that the matrix table remains empty
        const matrixTable = await page.locator('#matrixTable');
        await expect(matrixTable).toBeEmpty();
    });
});