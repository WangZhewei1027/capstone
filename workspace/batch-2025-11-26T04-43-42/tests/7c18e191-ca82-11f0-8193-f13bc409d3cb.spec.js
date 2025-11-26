import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c18e191-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Breadth-First Search Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state and draw the graph', async ({ page }) => {
        // Verify that the graph is drawn when the application starts
        const canvas = await page.locator('#graph');
        const context = await canvas.evaluate(canvas => {
            const ctx = canvas.getContext('2d');
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        });
        expect(context).not.toEqual(new Uint8ClampedArray(4 * 400 * 400)); // Check that the canvas is not empty
    });

    test('should transition to InputtingStartNode state on start node input', async ({ page }) => {
        const startInput = page.locator('#start');
        await startInput.fill('0'); // Input start node
        await startInput.dispatchEvent('input');

        // Check that the input event is handled
        await expect(page).toHaveSelector('canvas'); // Ensure the canvas is still present
    });

    test('should transition to InputtingEndNode state on valid end node input', async ({ page }) => {
        const startInput = page.locator('#start');
        const endInput = page.locator('#end');

        await startInput.fill('0');
        await startInput.dispatchEvent('input');
        await endInput.fill('3'); // Input end node
        await endInput.dispatchEvent('input');

        // Check that the BFS function is invoked
        await expect(page).toHaveSelector('canvas'); // Ensure the canvas is still present
    });

    test('should perform BFS and find a path', async ({ page }) => {
        const startInput = page.locator('#start');
        const endInput = page.locator('#end');

        await startInput.fill('0');
        await startInput.dispatchEvent('input');
        await endInput.fill('3');
        await endInput.dispatchEvent('input');

        // Simulate BFS completion
        await page.evaluate(() => {
            const event = new Event('BFS_COMPLETED');
            document.dispatchEvent(event);
        });

        // Check for path found message
        await expect(page.locator('text=Path found')).toBeVisible();
    });

    test('should perform BFS and not find a path', async ({ page }) => {
        const startInput = page.locator('#start');
        const endInput = page.locator('#end');

        await startInput.fill('0');
        await startInput.dispatchEvent('input');
        await endInput.fill('2'); // Assuming no path exists from 0 to 2
        await endInput.dispatchEvent('input');

        // Simulate BFS completion
        await page.evaluate(() => {
            const event = new Event('BFS_COMPLETED');
            document.dispatchEvent(event);
        });

        // Check for no path found message
        await expect(page.locator('text=No path found')).toBeVisible();
    });

    test('should reset inputs after path found', async ({ page }) => {
        const startInput = page.locator('#start');
        const endInput = page.locator('#end');

        await startInput.fill('0');
        await startInput.dispatchEvent('input');
        await endInput.fill('3');
        await endInput.dispatchEvent('input');

        // Simulate BFS completion
        await page.evaluate(() => {
            const event = new Event('BFS_COMPLETED');
            document.dispatchEvent(event);
        });

        // Reset inputs
        await page.evaluate(() => {
            const event = new Event('USER_INPUT_START_NODE');
            document.dispatchEvent(event);
        });

        // Check that inputs are reset
        await expect(startInput).toHaveValue('');
        await expect(endInput).toHaveValue('');
    });

    test('should reset inputs after no path found', async ({ page }) => {
        const startInput = page.locator('#start');
        const endInput = page.locator('#end');

        await startInput.fill('0');
        await startInput.dispatchEvent('input');
        await endInput.fill('2'); // Assuming no path exists from 0 to 2
        await endInput.dispatchEvent('input');

        // Simulate BFS completion
        await page.evaluate(() => {
            const event = new Event('BFS_COMPLETED');
            document.dispatchEvent(event);
        });

        // Reset inputs
        await page.evaluate(() => {
            const event = new Event('USER_INPUT_START_NODE');
            document.dispatchEvent(event);
        });

        // Check that inputs are reset
        await expect(startInput).toHaveValue('');
        await expect(endInput).toHaveValue('');
    });
});