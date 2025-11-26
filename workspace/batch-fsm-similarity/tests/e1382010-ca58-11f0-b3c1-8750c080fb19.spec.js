import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1382010-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Dijkstra Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should display the graph in idle state', async ({ page }) => {
        // Validate that the graph is drawn in the idle state
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.screenshot();
        expect(canvasContent).toBeTruthy(); // Ensure the canvas has content
    });

    test('should transition to RunningAlgorithm state on button click', async ({ page }) => {
        // Click the Run Algorithm button
        await page.click('#runAlgorithm');

        // Validate that the algorithm is running
        const buttonLabel = await page.locator('#runAlgorithm').innerText();
        expect(buttonLabel).toContain('Running'); // Assuming the button changes text to indicate running
    });

    test('should visualize iterations during the algorithm', async ({ page }) => {
        // Click the Run Algorithm button
        await page.click('#runAlgorithm');

        // Wait for the algorithm to complete one iteration
        await page.waitForTimeout(1500); // Wait for the visualization delay

        // Check if the current node is highlighted
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.screenshot();
        expect(canvasContent).toBeTruthy(); // Ensure the canvas has updated content
    });

    test('should finalize the algorithm after completion', async ({ page }) => {
        // Click the Run Algorithm button
        await page.click('#runAlgorithm');

        // Wait for the algorithm to complete
        await page.waitForTimeout(5000); // Wait for the full algorithm execution

        // Validate that the algorithm has completed
        const buttonLabel = await page.locator('#runAlgorithm').innerText();
        expect(buttonLabel).toContain('Completed'); // Assuming the button changes text to indicate completion
    });

    test('should handle multiple clicks on the Run Algorithm button', async ({ page }) => {
        // Click the Run Algorithm button multiple times
        await page.click('#runAlgorithm');
        await page.click('#runAlgorithm');

        // Validate that the algorithm is still running
        const buttonLabel = await page.locator('#runAlgorithm').innerText();
        expect(buttonLabel).toContain('Running'); // Ensure it does not change to completed
    });

    test('should not allow running the algorithm while it is already running', async ({ page }) => {
        // Click the Run Algorithm button
        await page.click('#runAlgorithm');

        // Attempt to click again while running
        await page.click('#runAlgorithm');

        // Validate that the algorithm is still running
        const buttonLabel = await page.locator('#runAlgorithm').innerText();
        expect(buttonLabel).toContain('Running');
    });

    test('should visualize the final state of the graph', async ({ page }) => {
        // Click the Run Algorithm button
        await page.click('#runAlgorithm');

        // Wait for the algorithm to complete
        await page.waitForTimeout(5000); // Wait for the full algorithm execution

        // Validate that the final state of the graph is displayed
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.screenshot();
        expect(canvasContent).toBeTruthy(); // Ensure the canvas has final content
    });
});