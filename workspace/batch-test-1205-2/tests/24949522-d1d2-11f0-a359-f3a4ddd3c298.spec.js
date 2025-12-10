import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24949522-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Dijkstra\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Validate that the initial state is Idle
        const canvas = await page.locator('#canvas');
        const startButton = await page.locator('#start');

        // Check if the canvas is drawn correctly
        const canvasVisible = await canvas.isVisible();
        expect(canvasVisible).toBe(true);

        // Check if the start button is visible and enabled
        const buttonVisible = await startButton.isVisible();
        const buttonEnabled = await startButton.isEnabled();
        expect(buttonVisible).toBe(true);
        expect(buttonEnabled).toBe(true);
    });

    test('Start Dijkstra\'s Algorithm', async ({ page }) => {
        // Click the start button to initiate Dijkstra's algorithm
        await page.click('#start');

        // Validate that the state transitions to Visualizing
        const canvas1 = await page.locator('#canvas1');
        const canvasContent = await canvas.evaluate(canvas => canvas.toDataURL());

        // Check if the canvas has been updated after the algorithm starts
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty
    });

    test('Visualize Dijkstra\'s Algorithm', async ({ page }) => {
        // Start the algorithm
        await page.click('#start');

        // Validate that the path is visualized correctly
        const canvas2 = await page.locator('#canvas2');
        const canvasContent1 = await canvas.evaluate(canvas => canvas.toDataURL());

        // Ensure the canvas has drawn the path
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty

        // Check that the nodes are colored correctly
        // This part may require additional checks based on the implementation
    });

    test('Check for console errors', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Start the algorithm
        await page.click('#start');

        // Wait for a moment to allow any potential errors to be logged
        await page.waitForTimeout(1000);

        // Assert that there are no console errors
        expect(consoleErrors.length).toBe(0);
    });

    test('Edge case - Click start multiple times', async ({ page }) => {
        // Click the start button multiple times
        await page.click('#start');
        await page.click('#start'); // Click again to test multiple clicks

        // Validate that the state remains in Visualizing
        const canvas3 = await page.locator('#canvas3');
        const canvasContent2 = await canvas.evaluate(canvas => canvas.toDataURL());

        // Ensure the canvas is still updated after multiple clicks
        expect(canvasContent).not.toBe('data:,'); // Ensure canvas is not empty
    });

    test('Error scenario - Check for unhandled exceptions', async ({ page }) => {
        // Listen for unhandled exceptions
        const unhandledErrors = [];
        page.on('pageerror', error => {
            unhandledErrors.push(error.message);
        });

        // Start the algorithm
        await page.click('#start');

        // Wait for a moment to allow any potential errors to be logged
        await page.waitForTimeout(1000);

        // Assert that there are no unhandled exceptions
        expect(unhandledErrors.length).toBe(0);
    });
});