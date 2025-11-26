import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1384720-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Kruskal\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Graph")');
        const runAlgorithmButton = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        
        // Verify that the buttons are enabled in the Idle state
        await expect(generateButton).toBeEnabled();
        await expect(runAlgorithmButton).toBeEnabled();
    });

    test('Transition from Idle to GeneratingGraph on Generate Graph click', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Graph")');
        
        // Click the Generate Graph button
        await generateButton.click();
        
        // Verify that the graph is being generated
        await expect(page.locator('#graphCanvas')).toHaveCount(1);
        
        // Wait for the graph to be drawn
        await page.waitForTimeout(1000);
        
        // Verify that the buttons are disabled during graph generation
        await expect(generateButton).toBeDisabled();
    });

    test('Transition from GeneratingGraph back to Idle', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Graph")');
        
        // Click the Generate Graph button
        await generateButton.click();
        
        // Wait for the graph to be generated
        await page.waitForTimeout(1000);
        
        // Click the Generate Graph button again to transition back to Idle
        await generateButton.click();
        
        // Verify that the buttons are enabled again
        await expect(generateButton).toBeEnabled();
    });

    test('Transition from Idle to RunningAlgorithm on Run Algorithm click', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Graph")');
        const runAlgorithmButton = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        
        // Generate a graph first
        await generateButton.click();
        await page.waitForTimeout(1000);
        
        // Click the Run Algorithm button
        await runAlgorithmButton.click();
        
        // Verify that the algorithm is running
        await expect(page.locator('#graphCanvas')).toHaveCount(1);
        
        // Wait for the algorithm to complete
        await page.waitForTimeout(2000);
        
        // Verify that the buttons are disabled during algorithm execution
        await expect(runAlgorithmButton).toBeDisabled();
    });

    test('Transition from RunningAlgorithm to HighlightingMST', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Graph")');
        const runAlgorithmButton = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        
        // Generate a graph first
        await generateButton.click();
        await page.waitForTimeout(1000);
        
        // Click the Run Algorithm button
        await runAlgorithmButton.click();
        
        // Wait for the algorithm to complete and check for MST highlighting
        await page.waitForTimeout(2000);
        
        // Check if the edges are highlighted in red
        const canvas = await page.locator('#graphCanvas');
        const canvasStyle = await canvas.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(canvasStyle).not.toBe('rgba(255, 255, 255, 1)'); // Not white, indicating MST is highlighted
    });

    test('Transition from HighlightingMST back to Idle', async ({ page }) => {
        const generateButton = await page.locator('button:has-text("Generate Random Graph")');
        const runAlgorithmButton = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        
        // Generate a graph first
        await generateButton.click();
        await page.waitForTimeout(1000);
        
        // Click the Run Algorithm button
        await runAlgorithmButton.click();
        await page.waitForTimeout(2000); // Wait for MST highlighting
        
        // Click the Run Algorithm button again to transition back to Idle
        await runAlgorithmButton.click();
        
        // Verify that the buttons are enabled again
        await expect(generateButton).toBeEnabled();
        await expect(runAlgorithmButton).toBeEnabled();
    });

    test('Edge case: Run Algorithm without generating graph', async ({ page }) => {
        const runAlgorithmButton = await page.locator('button:has-text("Run Kruskal\'s Algorithm")');
        
        // Attempt to run the algorithm without generating a graph
        await runAlgorithmButton.click();
        
        // Verify that the algorithm does not run and remains in Idle state
        await expect(runAlgorithmButton).toBeEnabled();
    });
});