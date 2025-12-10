import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c944fc0-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Kruskal\'s Algorithm Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe("Kruskal's Algorithm Visualization");
        
        // Check if the main heading is visible
        const heading = await page.locator('h1');
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText("Kruskal's Algorithm Visualization");
    });

    test('should display initial instructions', async ({ page }) => {
        // Check for initial instructions in the paragraph
        const instructions = await page.locator('p');
        await expect(instructions).toBeVisible();
        await expect(instructions).toHaveText("This visualization shows the steps of Kruskal's Algorithm to find the Minimum Spanning Tree (MST) of a graph.");
    });

    test('should run the algorithm and display the output', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('#runAlgorithm');

        // Verify that the output is displayed after running the algorithm
        const output = await page.locator('#output');
        await expect(output).toBeVisible();

        // Check that the output contains the expected MST edges and total cost
        await expect(output).toContainText('Minimum Spanning Tree:');
        await expect(output).toContainText('Edge: (0, 3) - Weight: 5');
        await expect(output).toContainText('Edge: (2, 3) - Weight: 4');
        await expect(output).toContainText('Edge: (0, 1) - Weight: 10');
        await expect(output).toContainText('Total Cost of MST: 19');
    });

    test('should handle multiple runs of the algorithm', async ({ page }) => {
        // Run the algorithm multiple times and check the output each time
        await page.click('#runAlgorithm');
        await expect(page.locator('#output')).toContainText('Total Cost of MST: 19');

        // Clear the output and run again
        await page.click('#runAlgorithm');
        await expect(page.locator('#output')).toContainText('Total Cost of MST: 19');
    });

    test('should not throw errors on console during execution', async ({ page }) => {
        // Listen for console messages and check for errors
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Run the algorithm
        await page.click('#runAlgorithm');

        // Check that no errors were logged to the console
        expect(consoleMessages).not.toContain(expect.stringContaining('Error'));
    });

    test('should check for any JavaScript errors on page load', async ({ page }) => {
        // Listen for page errors
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));

        // Navigate to the page
        await page.goto(BASE_URL);

        // Check that no errors were logged
        expect(pageErrors.length).toBe(0;
    });
});