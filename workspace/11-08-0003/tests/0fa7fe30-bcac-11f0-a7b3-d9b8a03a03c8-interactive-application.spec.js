import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0fa7fe30-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Prim\'s Algorithm Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and clear canvas', async ({ page }) => {
        const canvas = await page.locator('#canvas');
        const initialCanvasContent = await canvas.evaluate(canvas => canvas.toDataURL());
        
        // Verify that the canvas is empty
        expect(initialCanvasContent).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...'); // Placeholder for empty canvas
    });

    test('should transition to node_created state on canvas click', async ({ page }) => {
        const canvas1 = await page.locator('#canvas1');
        await canvas.click({ position: { x: 50, y: 50 } });

        const nodes = await page.evaluate(() => window.nodes);
        expect(nodes.length).toBe(1); // One node should be created
    });

    test('should remain in node_created state on multiple canvas clicks', async ({ page }) => {
        const canvas2 = await page.locator('#canvas2');
        await canvas.click({ position: { x: 50, y: 50 } });
        await canvas.click({ position: { x: 100, y: 100 } });

        const nodes1 = await page.evaluate(() => window.nodes1);
        expect(nodes.length).toBe(2); // Two nodes should be created
    });

    test('should transition to running_algorithm state on run button click', async ({ page }) => {
        const canvas3 = await page.locator('#canvas3');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.click('#run');

        // Check if the algorithm is running (you may need to adjust this based on actual implementation)
        const isRunning = await page.evaluate(() => window.isAlgorithmRunning);
        expect(isRunning).toBe(true);
    });

    test('should transition to done state after algorithm completion', async ({ page }) => {
        const canvas4 = await page.locator('#canvas4');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.click('#run');

        // Simulate algorithm completion
        await page.evaluate(() => {
            setTimeout(() => {
                window.dispatchEvent(new Event('ALGORITHM_COMPLETE'));
            }, 1000); // Simulate delay for algorithm completion
        });

        await page.waitForTimeout(1100); // Wait for the completion event to be processed

        const resultDisplayed = await page.evaluate(() => window.resultDisplayed);
        expect(resultDisplayed).toBe(true); // Check if result is displayed
    });

    test('should reset to idle state on reset button click', async ({ page }) => {
        const canvas5 = await page.locator('#canvas5');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.click('#reset');

        const nodes2 = await page.evaluate(() => window.nodes2);
        expect(nodes.length).toBe(0); // No nodes should be present after reset
    });

    test('should handle edge case of running algorithm without nodes', async ({ page }) => {
        await page.click('#run');

        const isRunning1 = await page.evaluate(() => window.isAlgorithmRunning);
        expect(isRunning).toBe(false); // Algorithm should not run without nodes
    });

    test('should handle multiple resets correctly', async ({ page }) => {
        const canvas6 = await page.locator('#canvas6');
        await canvas.click({ position: { x: 50, y: 50 } });
        await page.click('#reset');
        await page.click('#reset'); // Click reset again

        const nodes3 = await page.evaluate(() => window.nodes3);
        expect(nodes.length).toBe(0); // Should still be zero nodes
    });

    test('should not allow running algorithm without a starting node', async ({ page }) => {
        await page.click('#run');

        const isRunning2 = await page.evaluate(() => window.isAlgorithmRunning);
        expect(isRunning).toBe(false); // Algorithm should not run
    });
});