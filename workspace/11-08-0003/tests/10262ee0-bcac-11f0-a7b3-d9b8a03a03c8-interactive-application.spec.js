import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/10262ee0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Topological Sort Interactive Module', () => {
    test('should display instructions on idle state', async ({ page }) => {
        const infoText = await page.locator('#info p').innerText();
        expect(infoText).toContain('Click "Add Node" to create nodes in the graph.');
    });

    test('should transition to addingNode state when Add Node is clicked', async ({ page }) => {
        await page.click('#addNode');
        const nodeCount = await page.locator('.node').count();
        expect(nodeCount).toBe(1); // One node should be added
    });

    test('should return to idle state after node is added', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#addNode'); // Add another node
        const nodeCount1 = await page.locator('.node').count();
        expect(nodeCount).toBe(2); // Two nodes should be added
    });

    test('should transition to sorting state when Sort is clicked', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#addNode'); // Add nodes first
        await page.click('#sort');
        // Assuming there is a visual indication for sorting
        const sortingIndicator = await page.locator('#graph').evaluate(node => node.style.backgroundColor);
        expect(sortingIndicator).toBe('rgb(255, 255, 0)'); // Assuming yellow indicates sorting
    });

    test('should return to idle state after sorting is completed', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#addNode');
        await page.click('#sort');
        // Wait for sorting to complete
        await page.waitForTimeout(1000); // Adjust timeout based on actual sorting duration
        const sortingIndicator1 = await page.locator('#graph').evaluate(node => node.style.backgroundColor);
        expect(sortingIndicator).toBe('rgb(255, 255, 255)'); // Assuming white indicates idle
    });

    test('should transition to resetting state when Reset is clicked', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#reset');
        const nodeCount2 = await page.locator('.node').count();
        expect(nodeCount).toBe(0); // All nodes should be removed
    });

    test('should return to idle state after reset is completed', async ({ page }) => {
        await page.click('#addNode');
        await page.click('#reset');
        const infoText1 = await page.locator('#info p').innerText();
        expect(infoText).toContain('Click "Add Node" to create nodes in the graph.'); // Check for idle state
    });

    test('should handle multiple node additions and sorting', async ({ page }) => {
        for (let i = 0; i < 5; i++) {
            await page.click('#addNode');
        }
        const nodeCount3 = await page.locator('.node').count();
        expect(nodeCount).toBe(5); // Five nodes should be added

        await page.click('#sort');
        await page.waitForTimeout(1000); // Wait for sorting to complete
        const sortingIndicator2 = await page.locator('#graph').evaluate(node => node.style.backgroundColor);
        expect(sortingIndicator).toBe('rgb(255, 255, 255)'); // Check if back to idle
    });

    test('should not allow sorting without nodes', async ({ page }) => {
        await page.click('#sort');
        const infoText2 = await page.locator('#info p').innerText();
        expect(infoText).toContain('Click "Add Node" to create nodes in the graph.'); // Should still be idle
    });
});