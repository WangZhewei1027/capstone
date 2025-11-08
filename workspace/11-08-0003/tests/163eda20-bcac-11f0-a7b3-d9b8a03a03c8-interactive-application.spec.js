import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/163eda20-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application - Finite State Machine Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in the idle state', async ({ page }) => {
        // Validate that the visualization area is empty when in idle state
        const visualization = await page.locator('#visualization');
        const nodes = await visualization.locator('.node').count();
        expect(nodes).toBe(0);
    });

    test('should transition to visualizing state on button click', async ({ page }) => {
        // Simulate user input and button click to transition to visualizing state
        await page.fill('#depthInput', '3');
        await page.click('#visualizeBtn');

        // Validate that nodes are being created in the visualization area
        const visualization1 = await page.locator('#visualization1');
        await page.waitForTimeout(500); // Wait for visualization to start
        const nodes1 = await visualization.locator('.node').count();
        expect(nodes).toBeGreaterThan(0); // Expect at least one node to be created
    });

    test('should complete visualization and transition to done state', async ({ page }) => {
        // Simulate user input and button click
        await page.fill('#depthInput', '2');
        await page.click('#visualizeBtn');

        // Wait for the visualization to complete
        await page.waitForTimeout(2000); // Adjust timeout based on expected duration

        // Validate that nodes are created and visualization is complete
        const visualization2 = await page.locator('#visualization2');
        const nodes2 = await visualization.locator('.node').count();
        expect(nodes).toBeGreaterThan(0); // Expect nodes to be created

        // Check for visual feedback (color change)
        const firstNodeColor = await visualization.locator('.node').first().evaluate(node => node.style.backgroundColor);
        expect(firstNodeColor).toBe('rgb(248, 136, 136)'); // Expect color change to indicate completion
    });

    test('should reset to idle state on reset', async ({ page }) => {
        // Simulate user input and button click
        await page.fill('#depthInput', '1');
        await page.click('#visualizeBtn');

        // Wait for visualization to complete
        await page.waitForTimeout(1000); // Adjust timeout based on expected duration

        // Reset the visualization
        await page.fill('#depthInput', ''); // Clear input
        await page.click('#visualizeBtn'); // Click again to reset

        // Validate that the visualization area is empty
        const visualization3 = await page.locator('#visualization3');
        const nodes3 = await visualization.locator('.node').count();
        expect(nodes).toBe(0); // Expect no nodes to be present
    });

    test('should handle edge case of zero depth input', async ({ page }) => {
        // Simulate user input of zero depth
        await page.fill('#depthInput', '0');
        await page.click('#visualizeBtn');

        // Validate that no nodes are created
        const visualization4 = await page.locator('#visualization4');
        const nodes4 = await visualization.locator('.node').count();
        expect(nodes).toBe(0); // Expect no nodes to be created
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Simulate user input of invalid depth
        await page.fill('#depthInput', '-1');
        await page.click('#visualizeBtn');

        // Validate that no nodes are created
        const visualization5 = await page.locator('#visualization5');
        const nodes5 = await visualization.locator('.node').count();
        expect(nodes).toBe(0); // Expect no nodes to be created
    });
});