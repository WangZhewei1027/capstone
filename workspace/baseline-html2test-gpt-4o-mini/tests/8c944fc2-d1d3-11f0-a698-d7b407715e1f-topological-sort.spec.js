import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c944fc2-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Topological Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify the title of the page
        await expect(page).toHaveTitle('Topological Sort Visualization');

        // Check if input field and button are visible
        const inputField = await page.locator('#inputGraph');
        const sortButton = await page.locator('#sortButton');
        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();

        // Check if the output area is empty initially
        const outputArea = await page.locator('#output');
        await expect(outputArea).toHaveText('');
    });

    test('should perform topological sort with valid input', async ({ page }) => {
        // Input valid graph edges
        const inputEdges = 'A->B, B->C, A->C';
        await page.fill('#inputGraph', inputEdges);
        await page.click('#sortButton');

        // Verify the output is as expected
        const expectedOutput = 'A -> B -> C';
        const outputArea = await page.locator('#output');
        await expect(outputArea).toHaveText(expectedOutput);
    });

    test('should draw the graph on canvas after sorting', async ({ page }) => {
        // Input valid graph edges
        const inputEdges = 'A->B, B->C, A->C';
        await page.fill('#inputGraph', inputEdges);
        await page.click('#sortButton');

        // Verify that the canvas is drawn (a simple check for visibility)
        const canvas = await page.locator('#graphCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the sort button without any input
        await page.click('#sortButton');

        // Verify that the output remains empty
        const outputArea = await page.locator('#output');
        await expect(outputArea).toHaveText('');
    });

    test('should handle invalid input format', async ({ page }) => {
        // Input invalid graph edges
        const inputEdges = 'A-B-C';
        await page.fill('#inputGraph', inputEdges);
        await page.click('#sortButton');

        // Verify that the output remains empty
        const outputArea = await page.locator('#output');
        await expect(outputArea).toHaveText('');
    });

    test('should handle cyclic graphs', async ({ page }) => {
        // Input a cyclic graph
        const inputEdges = 'A->B, B->C, C->A';
        await page.fill('#inputGraph', inputEdges);
        await page.click('#sortButton');

        // Verify that the output remains empty
        const outputArea = await page.locator('#output');
        await expect(outputArea).toHaveText('');
    });

    test('should display error in console for invalid input', async ({ page }) => {
        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        // Input invalid graph edges
        const inputEdges = 'A-B-C';
        await page.fill('#inputGraph', inputEdges);
        await page.click('#sortButton');

        // Check for console error message
        await expect(consoleMessages).toContain('Invalid input format');
    });
});