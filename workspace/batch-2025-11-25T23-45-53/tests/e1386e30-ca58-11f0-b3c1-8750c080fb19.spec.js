import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e1386e30-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Topological Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should visualize the initial state', async ({ page }) => {
        // Validate that the initial visualization is displayed correctly
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
        const canvasVisible = await page.isVisible('#canvas');
        expect(canvasVisible).toBe(true);
    });

    test('should transition to RunningSort state on button click', async ({ page }) => {
        // Click the Perform Topological Sort button
        await page.click('#runSort');

        // Validate that the result is cleared and the button is disabled
        const resultText = await page.textContent('#result');
        expect(resultText).toBe('');
        const buttonDisabled = await page.evaluate(() => {
            return document.getElementById('runSort').disabled;
        });
        expect(buttonDisabled).toBe(true);
    });

    test('should complete sorting successfully and display result', async ({ page }) => {
        // Click the Perform Topological Sort button
        await page.click('#runSort');

        // Wait for the sort to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Validate that the result is displayed correctly
        const resultText = await page.textContent('#result');
        expect(resultText).toMatch(/Topological Sort Order:/);
    });

    test('should handle sort failure due to a cycle', async ({ page }) => {
        // Modify the graph to create a cycle for this test
        await page.evaluate(() => {
            window.graph[4] = [0]; // Introduce a cycle
        });

        // Click the Perform Topological Sort button
        await page.click('#runSort');

        // Wait for the sort to fail
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Validate that the error message is displayed
        const resultText = await page.textContent('#result');
        expect(resultText).toContain('Graph is not a Directed Acyclic Graph (DAG)');
    });

    test('should re-enable the sort button after completion', async ({ page }) => {
        // Click the Perform Topological Sort button
        await page.click('#runSort');

        // Wait for the sort to complete
        await page.waitForTimeout(1000); // Adjust timeout as necessary

        // Validate that the button is re-enabled
        const buttonDisabled = await page.evaluate(() => {
            return document.getElementById('runSort').disabled;
        });
        expect(buttonDisabled).toBe(false);
    });

    test('should visualize the graph correctly', async ({ page }) => {
        // Validate that the canvas is drawn correctly
        const canvasVisible = await page.isVisible('#canvas');
        expect(canvasVisible).toBe(true);
        
        // Optionally, check for specific visual elements if needed
        // This part can be more complex depending on the visualization requirements
    });
});