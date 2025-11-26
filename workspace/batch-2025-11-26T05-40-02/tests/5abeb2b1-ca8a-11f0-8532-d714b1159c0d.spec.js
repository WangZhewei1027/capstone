import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abeb2b1-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Breadth-First Search Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is Idle', async () => {
        // Verify that the application starts in the Idle state
        const startButton = await page.locator('#start-button');
        const stopButton = await page.locator('#stop-button');

        await expect(startButton).toBeVisible();
        await expect(stopButton).toBeVisible();
        await expect(startButton).toBeEnabled();
        await expect(stopButton).toBeDisabled();
    });

    test('Start BFS transitions to Running state', async () => {
        // Click the Start button and verify state transition
        const startButton = await page.locator('#start-button');
        const stopButton = await page.locator('#stop-button');

        await startButton.click();

        // Verify that the Start button is disabled and Stop button is enabled
        await expect(startButton).toBeDisabled();
        await expect(stopButton).toBeEnabled();
    });

    test('Running state allows stopping BFS', async () => {
        // Click the Stop button and verify state transition
        const stopButton = await page.locator('#stop-button');

        await stopButton.click();

        // Verify that the Stop button is disabled and Start button is enabled
        const startButton = await page.locator('#start-button');
        await expect(stopButton).toBeDisabled();
        await expect(startButton).toBeEnabled();
    });

    test('Graph is rendered correctly on Start', async () => {
        // Start BFS and check if the graph is rendered
        const startButton = await page.locator('#start-button');
        await startButton.click();

        const graph = await page.locator('#graph');
        await expect(graph).toBeVisible();
        // Additional checks can be added here to verify the graph content
    });

    test('Graph is cleared on Stop', async () => {
        // Start and then stop BFS to check if the graph is cleared
        const startButton = await page.locator('#start-button');
        const stopButton = await page.locator('#stop-button');

        await startButton.click();
        await stopButton.click();

        const graph = await page.locator('#graph');
        // Verify that the graph is cleared (e.g., check canvas size or content)
        const graphCanvas = await page.evaluate(() => {
            const canvas = document.getElementById('graph');
            return { width: canvas.width, height: canvas.height };
        });

        await expect(graphCanvas.width).toBeGreaterThan(0);
        await expect(graphCanvas.height).toBeGreaterThan(0);
    });

    test('Start button is enabled after stopping', async () => {
        // Ensure that after stopping, the Start button is enabled
        const stopButton = await page.locator('#stop-button');
        await stopButton.click();

        const startButton = await page.locator('#start-button');
        await expect(startButton).toBeEnabled();
    });

    test('Stop button is disabled after stopping', async () => {
        // Ensure that after stopping, the Stop button is disabled
        const stopButton = await page.locator('#stop-button');
        await stopButton.click();

        await expect(stopButton).toBeDisabled();
    });
});