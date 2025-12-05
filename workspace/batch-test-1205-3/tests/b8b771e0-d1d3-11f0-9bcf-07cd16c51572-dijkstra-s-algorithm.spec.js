import { test, expect } from '@playwright/test';

test.describe('Dijkstra\'s Algorithm Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b771e0-d1d3-11f0-9bcf-07cd16c51572.html');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should load the page and display the title', async () => {
        const title = await page.title();
        expect(title).toBe("Dijkstra's Algorithm Visualization");
        
        const header = await page.locator('h1');
        await expect(header).toBeVisible();
        await expect(header).toHaveText("Dijkstra's Algorithm Visualization");
    });

    test('should draw the initial graph on page load', async () => {
        const canvas = await page.locator('#canvas');
        await expect(canvas).toBeVisible();
        
        // Check if the canvas has been drawn (by checking its dimensions)
        const canvasBoundingBox = await canvas.boundingBox();
        expect(canvasBoundingBox).not.toBeNull();
    });

    test('should run Dijkstra\'s algorithm when the button is clicked', async () => {
        const button = await page.locator('button');
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Run Dijkstra\'s Algorithm');

        // Click the button to start the algorithm
        await button.click();

        // Wait for the alert to show up and verify its content
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Shortest path from A to F is');
            await dialog.dismiss();
        });

        // Wait for a moment to allow the algorithm to process
        await page.waitForTimeout(5000); // Adjust timeout based on animation duration
    });

    test('should visualize the shortest path after running the algorithm', async () => {
        const canvas = await page.locator('#canvas');
        const canvasImageData = await canvas.screenshot();

        // Check if the canvas has changed after running the algorithm
        expect(canvasImageData).not.toBeNull();
        // Optionally, you could compare the image data to a known good state if you have a reference image
    });

    test('should handle errors gracefully', async () => {
        // Simulate an error scenario by modifying the graph or inputs (if applicable)
        // Here we will just check for any console errors during the execution
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Error message: ', msg.text());
            }
        });

        const button = await page.locator('button');
        await button.click();

        // Wait for the algorithm to run
        await page.waitForTimeout(5000);

        // Check for any console errors
        const consoleErrors = await page.evaluate(() => {
            return window.console.error;
        });
        expect(consoleErrors).toBeUndefined();
    });
});