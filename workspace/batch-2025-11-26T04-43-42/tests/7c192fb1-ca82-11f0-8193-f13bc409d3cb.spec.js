import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c192fb1-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Prim\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const generateButton = await page.locator('#generate-button');
        await expect(generateButton).toBeEnabled(); // Input should be enabled
    });

    test('should transition to GeneratingGraph state on valid input', async ({ page }) => {
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        const generateButton = await page.locator('#generate-button');
        
        await generateButton.click(); // User clicks generate button
        
        // Check if the graph generation process has started
        await expect(page.locator('#graph')).toBeEmpty(); // Graph should be empty initially
    });

    test('should transition to VisualizingGraph state after graph generation', async ({ page }) => {
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        const generateButton = await page.locator('#generate-button');
        
        await generateButton.click(); // User clicks generate button
        
        // Simulate graph generation completion
        await page.waitForTimeout(2000); // Wait for the generation process
        
        // Validate that the graph is displayed
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).not.toBeEmpty(); // Graph should now contain nodes
    });

    test('should return to Idle state after visualization is complete', async ({ page }) => {
        await page.fill('#vertices', '5');
        await page.fill('#edges', '4');
        const generateButton = await page.locator('#generate-button');
        
        await generateButton.click(); // User clicks generate button
        
        // Simulate graph generation completion
        await page.waitForTimeout(2000); // Wait for the generation process
        
        // Validate that the graph is displayed
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).not.toBeEmpty(); // Graph should now contain nodes
        
        // Simulate visualization completion
        await page.waitForTimeout(500); // Wait for visualization to complete
        
        const resetButton = await page.locator('#generate-button');
        await expect(resetButton).toBeEnabled(); // Input should be enabled again
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#vertices', 'invalid'); // Invalid input
        await page.fill('#edges', '4');
        const generateButton = await page.locator('#generate-button');
        
        await generateButton.click(); // User clicks generate button
        
        // Validate that the graph is not generated
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeEmpty(); // Graph should remain empty
    });

    test('should handle edge cases with zero vertices', async ({ page }) => {
        await page.fill('#vertices', '0'); // Zero vertices
        await page.fill('#edges', '0');
        const generateButton = await page.locator('#generate-button');
        
        await generateButton.click(); // User clicks generate button
        
        // Validate that the graph is not generated
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeEmpty(); // Graph should remain empty
    });

    test('should handle edge cases with negative vertices', async ({ page }) => {
        await page.fill('#vertices', '-5'); // Negative vertices
        await page.fill('#edges', '4');
        const generateButton = await page.locator('#generate-button');
        
        await generateButton.click(); // User clicks generate button
        
        // Validate that the graph is not generated
        const graphDiv = await page.locator('#graph');
        await expect(graphDiv).toBeEmpty(); // Graph should remain empty
    });
});