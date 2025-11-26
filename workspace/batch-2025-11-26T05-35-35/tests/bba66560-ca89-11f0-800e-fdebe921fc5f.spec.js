import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba66560-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Dijkstra\'s Algorithm Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the graph canvas in the Idle state', async ({ page }) => {
        // Validate that the graph canvas is rendered correctly
        const canvas = await page.locator('#graph');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveCSS('border', '1px solid black');
        await expect(canvas).toHaveCSS('width', '800px');
        await expect(canvas).toHaveCSS('height', '600px');
    });

    test('should display the correct shortest distances in the console', async ({ page }) => {
        // Validate that the console logs the correct shortest distances from the start vertex
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Wait for the script to run and log the distances
        await page.waitForTimeout(1000); // Adjust timeout if necessary

        // Validate that the expected distances are logged
        expect(consoleMessages).toContain('Shortest distances from A :');
        expect(consoleMessages).toContain('A : 0');
        expect(consoleMessages).toContain('B : 1');
        expect(consoleMessages).toContain('C : 3');
        expect(consoleMessages).toContain('D : 4');
        expect(consoleMessages).toContain('E : Infinity');
    });

    test('should have the correct initial state', async ({ page }) => {
        // Validate that the application is in the initial Idle state
        const canvas = await page.locator('#graph');
        await expect(canvas).toBeVisible();
    });

    test('should not have any interactive elements', async ({ page }) => {
        // Validate that there are no interactive elements in the application
        const buttons = await page.locator('button');
        const inputs = await page.locator('input');
        await expect(buttons).toHaveCount(0);
        await expect(inputs).toHaveCount(0);
    });

    test('should maintain the Idle state without user interactions', async ({ page }) => {
        // Validate that the application remains in the Idle state
        const canvas = await page.locator('#graph');
        await expect(canvas).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
        // Optionally, you can add any cleanup logic here if needed
        // Currently, no specific teardown is required for this application
    });
});