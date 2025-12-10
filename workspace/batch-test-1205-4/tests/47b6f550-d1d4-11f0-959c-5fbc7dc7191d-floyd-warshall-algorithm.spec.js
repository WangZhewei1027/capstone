import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b6f550-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Floyd-Warshall Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should load the page and display the title', async ({ page }) => {
        const title = await page.title();
        expect(title).toBe('Floyd-Warshall Algorithm Visualization');
    });

    test('should display the input textarea and button', async ({ page }) => {
        const inputMatrix = await page.locator('#inputMatrix');
        const runButton = await page.locator('button');

        await expect(inputMatrix).toBeVisible();
        await expect(runButton).toBeVisible();
    });

    test('should run the Floyd-Warshall algorithm and display results', async ({ page }) => {
        const inputData = '0 3 -1 7\n-1 0 2 -1\n-1 -1 0 1\n-1 -1 -1 0';
        await page.fill('#inputMatrix', inputData);
        await page.click('button');

        const resultMatrix = await page.locator('#resultMatrix');
        await expect(resultMatrix).toBeVisible();
        await expect(resultMatrix.locator('tr')).toHaveCount(4);

        const firstRowCells = await resultMatrix.locator('tr:nth-child(1) td');
        const firstRowValues = await firstRowCells.allTextContents();
        expect(firstRowValues).toEqual(['0', '3', '5', '4']);
    });

    test('should handle no connections correctly', async ({ page }) => {
        const inputData = '0 -1\n-1 0';
        await page.fill('#inputMatrix', inputData);
        await page.click('button');

        const resultMatrix = await page.locator('#resultMatrix');
        await expect(resultMatrix).toBeVisible();

        const firstRowCells = await resultMatrix.locator('tr:nth-child(1) td');
        const firstRowValues = await firstRowCells.allTextContents();
        expect(firstRowValues).toEqual(['0', '∞']);
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.fill('#inputMatrix', '');
        await page.click('button');

        const resultMatrix = await page.locator('#resultMatrix');
        await expect(resultMatrix).toBeHidden();
    });

    test('should display infinity for unreachable nodes', async ({ page }) => {
        const inputData = '0 -1 5\n-1 0 -1\n-1 -1 0';
        await page.fill('#inputMatrix', inputData);
        await page.click('button');

        const resultMatrix = await page.locator('#resultMatrix');
        await expect(resultMatrix).toBeVisible();

        const secondRowCells = await resultMatrix.locator('tr:nth-child(2) td');
        const secondRowValues = await secondRowCells.allTextContents();
        expect(secondRowValues).toEqual(['∞', '0', '∞']);
    });

    test('should show the result matrix after running the algorithm', async ({ page }) => {
        const inputData = '0 1\n1 0';
        await page.fill('#inputMatrix', inputData);
        await page.click('button');

        const resultMatrix = await page.locator('#resultMatrix');
        await expect(resultMatrix).toBeVisible();
        const resultContent = await resultMatrix.locator('td').allTextContents();
        expect(resultContent).toEqual(['0', '1', '1', '0']);
    });

    test('should log errors for invalid input', async ({ page }) => {
        const inputData = '0 a\nb 0';
        await page.fill('#inputMatrix', inputData);
        await page.click('button');

        const resultMatrix = await page.locator('#resultMatrix');
        await expect(resultMatrix).toBeHidden();
    });
});