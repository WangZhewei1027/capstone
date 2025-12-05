import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b771e2-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Floyd-Warshall Algorithm Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(URL);
    });

    test('should load the page with the correct title and description', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Floyd-Warshall Algorithm');
        
        // Verify the presence of the main heading
        const heading = await page.locator('h1');
        await expect(heading).toHaveText('Floyd-Warshall Algorithm');
        
        // Verify the description text
        const description = await page.locator('p');
        await expect(description).toHaveText('This application demonstrates the Floyd-Warshall algorithm to find shortest paths between all pairs of vertices.');
    });

    test('should display an alert when the input is empty', async ({ page }) => {
        // Click the Calculate Shortest Paths button without entering any input
        await page.click('button');
        
        // Expect an alert to be shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter an adjacency matrix.');
            await dialog.dismiss();
        });
    });

    test('should calculate shortest paths and display the result matrix', async ({ page }) => {
        // Input a valid adjacency matrix
        const adjacencyMatrix = '0 3 Infinity 7\n' +
                                'Infinity 0 1 2\n' +
                                'Infinity Infinity 0 3\n' +
                                '4 Infinity Infinity 0';
        await page.fill('#matrixInput', adjacencyMatrix);
        
        // Click the Calculate Shortest Paths button
        await page.click('button');
        
        // Verify the resulting shortest path matrix
        const resultTable = await page.locator('#resultTable');
        await expect(resultTable).toHaveCount(4); // Expecting 4 rows
        
        const expectedResults = [
            ['0', '3', '4', '5'],
            ['Infinity', '0', '1', '2'],
            ['Infinity', 'Infinity', '0', '3'],
            ['4', '7', '8', '0']
        ];
        
        for (let i = 0; i < expectedResults.length; i++) {
            for (let j = 0; j < expectedResults[i].length; j++) {
                const cell = await resultTable.locator('tr').nth(i).locator('td').nth(j);
                await expect(cell).toHaveText(expectedResults[i][j]);
            }
        }
    });

    test('should display infinity correctly in the result matrix', async ({ page }) => {
        // Input a matrix with infinite paths
        const adjacencyMatrix = '0 Infinity\n' +
                                'Infinity 0';
        await page.fill('#matrixInput', adjacencyMatrix);
        
        // Click the Calculate Shortest Paths button
        await page.click('button');
        
        // Verify the resulting shortest path matrix
        const resultTable = await page.locator('#resultTable');
        await expect(resultTable).toHaveCount(2); // Expecting 2 rows
        
        const expectedResults = [
            ['0', '∞'],
            ['∞', '0']
        ];
        
        for (let i = 0; i < expectedResults.length; i++) {
            for (let j = 0; j < expectedResults[i].length; j++) {
                const cell = await resultTable.locator('tr').nth(i).locator('td').nth(j);
                await expect(cell).toHaveText(expectedResults[i][j]);
            }
        }
    });

    test('should handle non-numeric input gracefully', async ({ page }) => {
        // Input a matrix with non-numeric values
        const adjacencyMatrix = '0 a\n' +
                                'Infinity 0';
        await page.fill('#matrixInput', adjacencyMatrix);
        
        // Click the Calculate Shortest Paths button
        await page.click('button');
        
        // Expect an alert to be shown for invalid input
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Invalid input');
            await dialog.dismiss();
        });
    });
});