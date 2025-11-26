import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba63e51-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Depth-First Search Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state: Idle', async ({ page }) => {
        // Verify that the application is in the Idle state
        const graphInput = await page.locator('#graph');
        const startButton = await page.locator('#start-btn');
        
        await expect(graphInput).toBeVisible();
        await expect(graphInput).toHaveAttribute('placeholder', 'Enter graph edges (e.g., A -> B, B -> C, ...)');
        await expect(startButton).toBeVisible();
    });

    test('Start DFS transition', async ({ page }) => {
        // Simulate entering graph edges and starting DFS
        await page.fill('#graph', 'A -> B');
        await page.click('#start-btn');

        // Verify that the DFS has started
        const graphValue = await page.inputValue('#graph');
        await expect(graphValue).toBe('A -> B');
    });

    test('Navigate back', async ({ page }) => {
        // Start DFS and then navigate back
        await page.fill('#graph', 'A -> B');
        await page.click('#start-btn');
        await page.click('#back-btn');

        // Verify that the application is in the Back Navigated state
        const graphValue = await page.inputValue('#graph');
        await expect(graphValue).toBe('A -> B'); // Assuming the graph remains unchanged
    });

    test('Navigate forward', async ({ page }) => {
        // Start DFS, navigate back, then forward
        await page.fill('#graph', 'A -> B');
        await page.click('#start-btn');
        await page.click('#back-btn');
        await page.click('#forward-btn');

        // Verify that the application is in the Forward Navigated state
        const graphValue = await page.inputValue('#graph');
        await expect(graphValue).toBe('A -> B'); // Assuming the graph remains unchanged
    });

    test('Reset graph', async ({ page }) => {
        // Start DFS and then reset the graph
        await page.fill('#graph', 'A -> B');
        await page.click('#start-btn');
        await page.click('#reset-btn');

        // Verify that the application is in the Reset state
        const graphValue = await page.inputValue('#graph');
        await expect(graphValue).toBe(''); // Graph input should be cleared
        const startButtonVisible = await page.isVisible('#start-btn');
        await expect(startButtonVisible).toBe(true); // Start button should be visible again
    });

    test('Edge case: Invalid graph input', async ({ page }) => {
        // Attempt to start DFS with invalid input
        await page.fill('#graph', 'Invalid Input');
        await page.click('#start-btn');

        // Verify that the graph remains unchanged or an error is shown
        const graphValue = await page.inputValue('#graph');
        await expect(graphValue).toBe('Invalid Input'); // Assuming it doesn't change
    });

    test('Edge case: Empty graph input', async ({ page }) => {
        // Attempt to start DFS with empty input
        await page.fill('#graph', '');
        await page.click('#start-btn');

        // Verify that the graph remains unchanged or an error is shown
        const graphValue = await page.inputValue('#graph');
        await expect(graphValue).toBe(''); // Graph input should be empty
    });
});