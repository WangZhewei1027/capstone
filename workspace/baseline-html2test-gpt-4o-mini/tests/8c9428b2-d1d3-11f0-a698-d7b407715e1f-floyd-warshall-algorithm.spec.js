import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c9428b2-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(URL);
    });

    test('should load the page and display initial content', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Floyd-Warshall Algorithm Visualization');

        // Check if the button is visible
        const button = await page.locator('button.button');
        await expect(button).toBeVisible();

        // Check if the result table is empty initially
        const resultTable = await page.locator('#resultTable');
        const tableContent = await resultTable.innerHTML();
        expect(tableContent).toBe('');
    });

    test('should compute shortest paths and update the result table on button click', async ({ page }) => {
        // Click the button to run the Floyd-Warshall algorithm
        const button = await page.locator('button.button');
        await button.click();

        // Wait for the result table to be populated
        const resultTable = await page.locator('#resultTable');
        await expect(resultTable).toHaveText(/0|1|2|3|INF/); // Check for expected values in the table
    });

    test('should display INF for unreachable paths', async ({ page }) => {
        // Click the button to run the Floyd-Warshall algorithm
        const button = await page.locator('button.button');
        await button.click();

        // Check that the result table contains 'INF' for unreachable paths
        const resultTable = await page.locator('#resultTable');
        const infCells = await resultTable.locator('td:has-text("INF")');
        expect(await infCells.count()).toBeGreaterThan(0); // Ensure there are unreachable paths
    });

    test('should update the result table correctly after multiple clicks', async ({ page }) => {
        // Click the button multiple times
        const button = await page.locator('button.button');
        await button.click();
        await button.click(); // Click again to check if the result remains consistent

        // Verify the result table is still populated correctly
        const resultTable = await page.locator('#resultTable');
        await expect(resultTable).toHaveText(/0|1|2|3|INF/);
    });

    test('should handle errors gracefully', async ({ page }) => {
        // Simulate an error by modifying the script (not possible in this context)
        // Instead, we will just check for any console errors that may arise during execution
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Error message:', msg.text());
            }
        });

        // Click the button to run the Floyd-Warshall algorithm
        const button = await page.locator('button.button');
        await button.click();

        // Check for any console errors
        await expect(page).toHaveConsole('Error message:'); // This is a placeholder; actual error checking would depend on the implementation
    });
});