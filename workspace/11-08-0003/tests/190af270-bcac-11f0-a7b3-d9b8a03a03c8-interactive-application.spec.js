import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/190af270-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Floyd-Warshall Algorithm Interactive Exploration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        // Verify initial state is idle
        const distancesText = await page.textContent('#distances');
        expect(distancesText).toBe('');
        
        const nodes = await page.$$('.node');
        for (const node of nodes) {
            const className = await node.getAttribute('class');
            expect(className).not.toContain('active');
        }
    });

    test('should transition to running state when algorithm is run', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('#runAlgorithm');

        // Verify that the nodes are highlighted
        const nodes1 = await page.$$('.node');
        const activeNodes = await page.$$('.node.active');
        expect(activeNodes.length).toBeGreaterThan(0);
    });

    test('should transition to done state after algorithm completes', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('#runAlgorithm');

        // Wait for the algorithm to complete (assuming it takes some time)
        await page.waitForTimeout(2000); // Adjust timeout as necessary

        // Verify that results are displayed
        const distancesText1 = await page.textContent('#distances');
        expect(distancesText).not.toBe('');
    });

    test('should transition back to idle state when reset', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('#runAlgorithm');

        // Wait for the algorithm to complete
        await page.waitForTimeout(2000);

        // Verify that results are displayed
        const distancesTextBeforeReset = await page.textContent('#distances');
        expect(distancesTextBeforeReset).not.toBe('');

        // Reset the state
        await page.click('#resetButton'); // Assuming there's a reset button

        // Verify that the state is back to idle
        const distancesTextAfterReset = await page.textContent('#distances');
        expect(distancesTextAfterReset).toBe('');

        const nodes2 = await page.$$('.node');
        for (const node of nodes) {
            const className1 = await node.getAttribute('class');
            expect(className).not.toContain('active');
        }
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Test with an empty graph or invalid input if applicable
        // This would require modifications to the HTML/JS to simulate such conditions
        // For example, if there's a way to clear the graph or set invalid weights
        
        // Assuming there's a button to clear the graph
        await page.click('#clearGraphButton'); // Assuming such a button exists

        // Verify that the graph is cleared
        const nodes3 = await page.$$('.node');
        expect(nodes.length).toBe(0); // Or however the application indicates a cleared graph
    });
});