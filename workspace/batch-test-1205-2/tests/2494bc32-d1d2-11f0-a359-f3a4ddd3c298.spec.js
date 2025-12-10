import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494bc32-d1d2-11f0-a359-f3a4ddd3c298.html';

test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
});

test.describe('Kruskal\'s Algorithm Visualization Tests', () => {
    test('Initial state is Idle', async ({ page }) => {
        // Verify that the page loads in the Idle state
        const edgeTableBody = await page.locator('#edgeTable tbody').innerHTML();
        expect(edgeTableBody).toBe(''); // Edge list should be empty
    });

    test('Run Kruskal\'s Algorithm transitions to Running state', async ({ page }) => {
        // Click the button to run the algorithm
        await page.click('button[onclick="runKruskal()"]');

        // Verify that the edge list is populated
        const edgeTableBody1 = await page.locator('#edgeTable tbody').innerHTML();
        expect(edgeTableBody).not.toBe(''); // Edge list should not be empty

        // Verify that the graph is drawn by checking the canvas
        const canvas = await page.locator('#canvas');
        const canvasData = await canvas.screenshot();
        expect(canvasData).toBeTruthy(); // Ensure the canvas has visual output
    });

    test('Edge list is populated correctly after running the algorithm', async ({ page }) => {
        // Run the algorithm
        await page.click('button[onclick="runKruskal()"]');

        // Verify the content of the edge list
        const edgeRows = await page.locator('#edgeTable tbody tr').count();
        expect(edgeRows).toBeGreaterThan(0); // There should be at least one edge

        // Validate the first edge in the list
        const firstEdge = await page.locator('#edgeTable tbody tr').nth(0).innerText();
        expect(firstEdge).toMatch(/0-3/); // Check for expected edge format
    });

    test('Graph is drawn correctly after running the algorithm', async ({ page }) => {
        // Run the algorithm
        await page.click('button[onclick="runKruskal()"]');

        // Verify that the canvas has been updated
        const canvas1 = await page.locator('#canvas1');
        const canvasData1 = await canvas.screenshot();
        expect(canvasData).toBeTruthy(); // Ensure the canvas has visual output
    });

    test('Check for console errors during execution', async ({ page }) => {
        // Listen for console messages
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(msg.text());
        });

        // Run the algorithm
        await page.click('button[onclick="runKruskal()"]');

        // Check for any ReferenceError, SyntaxError, or TypeError in console messages
        const errorMessages = consoleMessages.filter(msg => 
            msg.includes('ReferenceError') || 
            msg.includes('SyntaxError') || 
            msg.includes('TypeError')
        );
        expect(errorMessages.length).toBe(0); // There should be no errors
    });
});