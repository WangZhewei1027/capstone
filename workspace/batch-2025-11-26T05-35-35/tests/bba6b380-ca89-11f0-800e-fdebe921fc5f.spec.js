import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba6b380-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Topological Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Validate that the application starts in the Idle state
        const startButton = await page.locator('#start-button');
        const doneButton = await page.locator('#done-button');
        await expect(startButton).toBeVisible();
        await expect(doneButton).toBeVisible();
    });

    test('User inputs a graph and clicks Start', async ({ page }) => {
        // Simulate user input for the graph
        const graphInput = await page.locator('#graph');
        await graphInput.fill(`{
            "1": [],
            "2": ["3"],
            "3": ["4"],
            "4": ["5"],
            "5": []
        }`);

        // Click the Start button
        const startButton = await page.locator('#start-button');
        await startButton.click();

        // Validate that the graph is displayed and sorted nodes are logged
        await expect(page).toHaveConsoleMessage(/Graph:/);
        await expect(page).toHaveConsoleMessage(/Sorted nodes:/);
    });

    test('User clicks Done after sorting', async ({ page }) => {
        // Simulate user input for the graph
        const graphInput = await page.locator('#graph');
        await graphInput.fill(`{
            "1": [],
            "2": ["3"],
            "3": ["4"],
            "4": ["5"],
            "5": []
        }`);

        // Click the Start button
        const startButton = await page.locator('#start-button');
        await startButton.click();

        // Click the Done button
        const doneButton = await page.locator('#done-button');
        await doneButton.click();

        // Validate that the graph is displayed and sorted nodes are logged again
        await expect(page).toHaveConsoleMessage(/Graph:/);
        await expect(page).toHaveConsoleMessage(/Sorted nodes:/);
    });

    test('Handles empty graph input gracefully', async ({ page }) => {
        // Simulate empty graph input
        const graphInput = await page.locator('#graph');
        await graphInput.fill('');

        // Click the Start button
        const startButton = await page.locator('#start-button');
        await startButton.click();

        // Validate that an appropriate message or error is displayed
        await expect(page).toHaveConsoleMessage(/Graph is empty/);
    });

    test('Handles invalid graph input gracefully', async ({ page }) => {
        // Simulate invalid graph input
        const graphInput = await page.locator('#graph');
        await graphInput.fill('invalid graph input');

        // Click the Start button
        const startButton = await page.locator('#start-button');
        await startButton.click();

        // Validate that an appropriate message or error is displayed
        await expect(page).toHaveConsoleMessage(/Invalid graph format/);
    });

    test('State remains Idle when clicking Done without starting', async ({ page }) => {
        // Click the Done button without starting
        const doneButton = await page.locator('#done-button');
        await doneButton.click();

        // Validate that the application remains in the Idle state
        const startButton = await page.locator('#start-button');
        await expect(startButton).toBeVisible();
        await expect(page).toHaveConsoleMessage(/No sorting performed/);
    });
});