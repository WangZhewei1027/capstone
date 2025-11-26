import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c18e192-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Dijkstra Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const generateButton = await page.locator('#generate-btn');
        await expect(generateButton).toBeVisible();
        await expect(generateButton).toBeEnabled();
    });

    test('Generate Graph button click transitions to GeneratingGraph state', async ({ page }) => {
        const generateButton = await page.locator('#generate-btn');
        await generateButton.click();

        // Verify that the button is disabled
        await expect(generateButton).toBeDisabled();

        // Verify that the graph is being cleared and drawn
        // We would need to check for visual feedback or DOM changes here
        // For simplicity, we can check if the canvas is cleared (assuming it starts with a white background)
        const graphCanvas = await page.locator('#graph');
        const context = await graphCanvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        });
        const isCanvasCleared = Array.from(context).every(value => value === 255); // Check if all pixels are white
        expect(isCanvasCleared).toBe(true);
    });

    test('Graph generation should complete and transition to ProcessingGraph state', async ({ page }) => {
        const generateButton = await page.locator('#generate-btn');
        await generateButton.click();

        // Wait for the graph to be drawn (simulate the GraphGenerated event)
        await page.waitForTimeout(2000); // Adjust timeout as necessary

        // Verify that the graph is drawn (check for some visual feedback)
        const graphCanvas = await page.locator('#graph');
        const context = await graphCanvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        });
        const isGraphDrawn = Array.from(context).some(value => value !== 255); // Check if some pixels are not white
        expect(isGraphDrawn).toBe(true);
    });

    test('Processing the graph should complete and return to Idle state', async ({ page }) => {
        const generateButton = await page.locator('#generate-btn');
        await generateButton.click();

        // Wait for the graph to be drawn
        await page.waitForTimeout(2000);

        // Simulate processing completion (this would normally be triggered by the application)
        await page.waitForTimeout(1000); // Simulate wait for processing

        // Verify that the button is enabled again
        await expect(generateButton).toBeEnabled();

        // Check for expected output in the console (if applicable)
        // This would require a more complex setup to capture console logs
        // For now, we will just check if the button is enabled
    });

    test('Edge case: Click Generate Graph multiple times', async ({ page }) => {
        const generateButton = await page.locator('#generate-btn');
        await generateButton.click();

        // Attempt to click again while processing
        await expect(generateButton).toBeDisabled();

        // Wait for processing to complete
        await page.waitForTimeout(2000);
        await page.waitForTimeout(1000); // Simulate wait for processing

        // Now the button should be enabled again
        await expect(generateButton).toBeEnabled();

        // Click again to generate a new graph
        await generateButton.click();
        await expect(generateButton).toBeDisabled();
    });

    test('Error scenario: Ensure no graph is generated if button is not clicked', async ({ page }) => {
        const graphCanvas = await page.locator('#graph');

        // Check if the graph is still empty (no drawing)
        const context = await graphCanvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        });
        const isGraphEmpty = Array.from(context).every(value => value === 255); // Check if all pixels are white
        expect(isGraphEmpty).toBe(true);
    });
});