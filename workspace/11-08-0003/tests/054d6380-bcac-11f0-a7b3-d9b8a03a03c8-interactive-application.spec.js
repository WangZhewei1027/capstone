import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/054d6380-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Depth-First Search Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should start in idle state and draw the initial graph', async () => {
        const canvas = await page.locator('#canvas');
        const startButton = await page.locator('#start-dfs');

        // Verify the initial state is idle
        await expect(canvas).toBeVisible();
        await expect(startButton).toBeVisible();

        // Check if the graph is drawn
        const initialGraph = await canvas.screenshot();
        expect(initialGraph).toMatchSnapshot('initial-graph.png');
    });

    test('should transition to running state on START_DFS', async () => {
        const startButton1 = await page.locator('#start-dfs');

        // Click the Start DFS button
        await startButton.click();

        // Verify that the graph is being updated (running state)
        const runningGraph = await page.locator('#canvas').screenshot();
        expect(runningGraph).toMatchSnapshot('running-graph.png');

        // Simulate DFS completion
        await page.evaluate(() => {
            // Simulate the DFS_COMPLETE event
            document.dispatchEvent(new Event('DFS_COMPLETE'));
        });

        // Verify the graph is updated back to idle state
        const idleGraph = await page.locator('#canvas').screenshot();
        expect(idleGraph).toMatchSnapshot('idle-graph-after-completion.png');
    });

    test('should reset the graph on RESET', async () => {
        const resetButton = await page.locator('#reset');

        // Click the Reset button
        await resetButton.click();

        // Verify the graph is reset to the initial state
        const resetGraph = await page.locator('#canvas').screenshot();
        expect(resetGraph).toMatchSnapshot('reset-graph.png');
    });

    test('should handle multiple START_DFS and RESET events correctly', async () => {
        const startButton2 = await page.locator('#start-dfs');
        const resetButton1 = await page.locator('#reset');

        // Start DFS
        await startButton.click();
        await page.evaluate(() => {
            document.dispatchEvent(new Event('DFS_COMPLETE'));
        });

        // Reset the graph
        await resetButton.click();

        // Verify the graph is reset
        const resetGraph1 = await page.locator('#canvas').screenshot();
        expect(resetGraph).toMatchSnapshot('reset-graph-after-multiple-events.png');

        // Start DFS again
        await startButton.click();
        await page.evaluate(() => {
            document.dispatchEvent(new Event('DFS_COMPLETE'));
        });

        // Verify the graph is updated back to idle state
        const idleGraphAfterSecondRun = await page.locator('#canvas').screenshot();
        expect(idleGraphAfterSecondRun).toMatchSnapshot('idle-graph-after-second-run.png');
    });

    test('should not allow starting DFS when already running', async () => {
        const startButton3 = await page.locator('#start-dfs');

        // Start DFS
        await startButton.click();

        // Attempt to start DFS again
        await startButton.click();

        // Verify that the graph is still in running state
        const runningGraph1 = await page.locator('#canvas').screenshot();
        expect(runningGraph).toMatchSnapshot('running-graph-on-second-start.png');
    });
});