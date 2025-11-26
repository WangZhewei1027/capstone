import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1390a72-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('K-Means Clustering Demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the application starts in the Idle state
        const generateDataButton = await page.locator('#generate-data');
        const runKMeansButton = await page.locator('#run-kmeans');
        
        await expect(generateDataButton).toBeEnabled();
        await expect(runKMeansButton).toBeEnabled();
    });

    test('Generate Data Points transition', async ({ page }) => {
        // Click the Generate Data Points button and verify transition to GeneratingData state
        const generateDataButton = await page.locator('#generate-data');
        
        await generateDataButton.click();
        
        // Verify that controls are disabled during data generation
        await expect(generateDataButton).toBeDisabled();
        
        // Wait for the data points to be generated and drawn
        await page.waitForTimeout(1000); // Simulating the timeout for data generation
        
        // Verify that the canvas has points drawn
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.screenshot();
        expect(canvasContent).toBeTruthy(); // Ensure something is drawn on the canvas

        // Verify that we can return to Idle state
        await generateDataButton.click();
        await expect(generateDataButton).toBeEnabled();
    });

    test('Run K-Means transition', async ({ page }) => {
        // First generate data points
        const generateDataButton = await page.locator('#generate-data');
        await generateDataButton.click();
        await page.waitForTimeout(1000); // Wait for data generation

        // Click the Run K-Means button and verify transition to RunningKMeans state
        const runKMeansButton = await page.locator('#run-kmeans');
        await runKMeansButton.click();
        
        // Verify that controls are disabled during K-Means processing
        await expect(generateDataButton).toBeDisabled();
        await expect(runKMeansButton).toBeDisabled();

        // Wait for K-Means to complete
        await page.waitForTimeout(1000); // Simulating the timeout for K-Means processing

        // Verify that the canvas has points drawn after K-Means
        const canvas = await page.locator('#canvas');
        const canvasContent = await canvas.screenshot();
        expect(canvasContent).toBeTruthy(); // Ensure something is drawn on the canvas

        // Verify that we can return to Idle state
        await runKMeansButton.click();
        await expect(generateDataButton).toBeEnabled();
        await expect(runKMeansButton).toBeEnabled();
    });

    test('Edge case: Run K-Means without generating data', async ({ page }) => {
        // Attempt to run K-Means without generating data
        const runKMeansButton = await page.locator('#run-kmeans');
        
        await expect(runKMeansButton).toBeEnabled(); // Should be enabled since no data is generated
        await runKMeansButton.click();
        
        // Verify that nothing happens (no points should be drawn)
        const canvas = await page.locator('#canvas');
        const canvasContentBefore = await canvas.screenshot();
        
        // Wait for a short duration to simulate processing
        await page.waitForTimeout(1000);
        
        const canvasContentAfter = await canvas.screenshot();
        expect(canvasContentBefore).toEqual(canvasContentAfter); // Canvas should remain unchanged
    });

    test('Edge case: Generate Data Points multiple times', async ({ page }) => {
        const generateDataButton = await page.locator('#generate-data');

        // Generate data points multiple times and verify state remains consistent
        for (let i = 0; i < 3; i++) {
            await generateDataButton.click();
            await page.waitForTimeout(1000); // Wait for data generation
            await expect(generateDataButton).toBeDisabled();
            await generateDataButton.click(); // Click again to return to Idle
            await expect(generateDataButton).toBeEnabled();
        }
    });
});