import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0c3ac3e0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Kruskal\'s Algorithm Interactive Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and draw the graph', async ({ page }) => {
        // Verify that the graph is drawn when the page loads
        const graph = await page.locator('#graph');
        await expect(graph).toBeVisible();
        
        // Check the initial output message
        const output = await page.locator('#output');
        await expect(output).toHaveText('Click "Next Step" to see Kruskal\'s Algorithm in action.');
    });

    test('should transition to selecting_edge state on NEXT_STEP', async ({ page }) => {
        // Click the Next Step button
        await page.click('#nextStepButton');
        
        // Verify that an edge is marked as selected
        const selectedEdge = await page.locator('.selected');
        await expect(selectedEdge).toBeVisible();
        
        // Check the output message after selecting an edge
        const output1 = await page.locator('#output1');
        await expect(output).toHaveText(/Edge selected/); // Assuming the output changes to indicate an edge is selected
    });

    test('should remain in selecting_edge state on multiple NEXT_STEP clicks', async ({ page }) => {
        // Click the Next Step button multiple times
        await page.click('#nextStepButton');
        await page.click('#nextStepButton');
        
        // Verify that multiple edges are selected
        const selectedEdges = await page.locator('.selected');
        await expect(selectedEdges).toHaveCount(2); // Assuming two edges are selected
    });

    test('should transition to done state on COMPLETED event', async ({ page }) => {
        // Simulate the completion of selecting edges
        await page.click('#nextStepButton'); // First edge
        await page.click('#nextStepButton'); // Second edge
        await page.click('#nextStepButton'); // Third edge
        await page.click('#nextStepButton'); // Fourth edge
        await page.click('#nextStepButton'); // Fifth edge
        
        // Assuming that after selecting all edges, we trigger the completed event
        await page.evaluate(() => {
            // Simulating the completion event
            const event = new Event('COMPLETED');
            document.dispatchEvent(event);
        });

        // Verify that the output indicates completion
        const output2 = await page.locator('#output2');
        await expect(output).toHaveText('All edges selected, algorithm completed.'); // Assuming this is the completion message
    });

    test('should transition back to idle state on RESET', async ({ page }) => {
        // Simulate the completion of selecting edges
        await page.click('#nextStepButton'); // First edge
        await page.click('#nextStepButton'); // Second edge
        
        // Trigger the reset event
        await page.evaluate(() => {
            const event1 = new Event('RESET');
            document.dispatchEvent(event);
        });

        // Verify that the graph is redrawn and back to idle state
        const graph1 = await page.locator('#graph1');
        await expect(graph).toBeVisible();
        
        // Check the initial output message again
        const output3 = await page.locator('#output3');
        await expect(output).toHaveText('Click "Next Step" to see Kruskal\'s Algorithm in action.');
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Click Next Step without selecting any edges
        await page.click('#nextStepButton');
        
        // Verify that the output indicates no edges were selected
        const output4 = await page.locator('#output4');
        await expect(output).toHaveText('No edges selected.'); // Assuming this is the message for no edges
    });
});