import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569e8041-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Kruskal\'s Algorithm Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be Idle', async () => {
        const startButton = await page.locator('#startButton');
        await expect(startButton).toBeEnabled();
    });

    test('Start button should transition to Sorting state', async () => {
        await page.fill('#inputArray', '[3, 6, 8, 9, 10, 4, 5]');
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Verify that sorting visualization is rendered
        await expect(page.locator('#resultDisplay')).toContainText('Sorting...');
    });

    test('Sorting should complete and transition to SortingComplete state', async () => {
        await page.fill('#inputArray', '[3, 6, 8, 9, 10, 4, 5]');
        await page.locator('#startButton').click();

        // Simulate sorting completion
        await page.waitForTimeout(3000); // wait for sorting to complete

        // Verify that the result is displayed
        await expect(page.locator('#resultDisplay')).toContainText('k-th smallest element: 3');
    });

    test('Reset button should transition back to Idle state from SortingComplete', async () => {
        await page.locator('#resetButton').click();

        // Verify that we are back to Idle state
        const startButton = await page.locator('#startButton');
        await expect(startButton).toBeEnabled();
        await expect(page.locator('#resultDisplay')).toHaveText('');
    });

    test('Error state should be triggered on sorting error', async () => {
        // Simulate an error scenario (this would depend on how errors are triggered in the actual app)
        await page.fill('#inputArray', 'invalid input');
        const startButton = await page.locator('#startButton');
        await startButton.click();

        // Simulate error occurrence
        await page.waitForTimeout(1000); // wait for error to be processed

        // Verify error message is displayed
        await expect(page.locator('#resultDisplay')).toContainText('Error occurred during sorting');
    });

    test('Reset button should transition back to Idle state from Error state', async () => {
        await page.locator('#resetButton').click();

        // Verify that we are back to Idle state
        const startButton = await page.locator('#startButton');
        await expect(startButton).toBeEnabled();
        await expect(page.locator('#resultDisplay')).toHaveText('');
    });
});