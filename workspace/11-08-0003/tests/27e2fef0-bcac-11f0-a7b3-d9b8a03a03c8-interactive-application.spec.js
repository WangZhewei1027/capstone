import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/27e2fef0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application - Prim\'s Algorithm', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const output = await page.locator('#output').innerText();
        expect(output).toBe('');
    });

    test('should transition to adding_node state on viewport click', async ({ page }) => {
        await page.click('#viewport');
        const output1 = await page.locator('#output1').innerText();
        expect(output).toContain('Node added');
    });

    test('should transition to adding_edges state on node click', async ({ page }) => {
        await page.click('#viewport'); // Add a node first
        await page.click('.node'); // Click on the node to add edges
        const output2 = await page.locator('#output2').innerText();
        expect(output).toContain('Edge added');
    });

    test('should transition to running_algorithm state on start button click', async ({ page }) => {
        await page.click('#viewport'); // Add a node
        await page.click('#startButton');
        const output3 = await page.locator('#output3').innerText();
        expect(output).toContain('Algorithm started');
    });

    test('should return to idle state after algorithm completes', async ({ page }) => {
        await page.click('#viewport'); // Add a node
        await page.click('#startButton'); // Start the algorithm
        // Simulate algorithm completion
        await page.evaluate(() => {
            document.dispatchEvent(new Event('ALGORITHM_COMPLETE'));
        });
        const output4 = await page.locator('#output4').innerText();
        expect(output).toBe('');
    });

    test('should transition to resetting state on reset button click', async ({ page }) => {
        await page.click('#viewport'); // Add a node
        await page.click('#resetButton');
        const output5 = await page.locator('#output5').innerText();
        expect(output).toBe('');
    });

    test('should return to idle state after reset completes', async ({ page }) => {
        await page.click('#viewport'); // Add a node
        await page.click('#resetButton'); // Reset the application
        // Simulate reset completion
        await page.evaluate(() => {
            document.dispatchEvent(new Event('RESET_COMPLETE'));
        });
        const output6 = await page.locator('#output6').innerText();
        expect(output).toBe('');
    });

    test('should handle multiple node additions', async ({ page }) => {
        await page.click('#viewport'); // Add first node
        await page.click('#viewport'); // Add second node
        const nodes = await page.locator('.node').count();
        expect(nodes).toBeGreaterThan(1);
    });

    test('should handle multiple edges additions', async ({ page }) => {
        await page.click('#viewport'); // Add a node
        await page.click('.node'); // Click on the node to add edges
        await page.click('#viewport'); // Add another node
        await page.click('.node'); // Click on the first node again to add edges
        const edges = await page.locator('.edge').count();
        expect(edges).toBeGreaterThan(0);
    });

    test('should not allow adding edges without nodes', async ({ page }) => {
        await page.click('#viewport'); // Click on viewport without adding nodes
        const edges1 = await page.locator('.edge').count();
        expect(edges).toBe(0);
    });
});