import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1a5bb560-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Sliding Window Technique Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be idle', async () => {
        const resetButton = await page.locator('#resetButton');
        await expect(resetButton).toBeDisabled();
    });

    test('Clicking Start button transitions to running state', async () => {
        const startButton = await page.locator('#startButton');
        await startButton.click();

        const resetButton1 = await page.locator('#resetButton1');
        await expect(resetButton).toBeEnabled();
    });

    test('Graph should render on entering idle state', async () => {
        const graph = await page.locator('#graph');
        await expect(graph).toHaveCount(6); // Expecting 6 bars for the data
    });

    test('Highlighting window during running state', async () => {
        const startButton1 = await page.locator('#startButton1');
        await startButton.click();

        await page.evaluate(() => {
            // Simulate highlighting the window
            const event = new Event('WINDOW_HIGHLIGHTED');
            document.dispatchEvent(event);
        });

        const highlightedBars = await page.locator('.highlight');
        await expect(highlightedBars).toHaveCount(1); // Expecting at least one highlighted bar
    });

    test('Transition to done state after END_OF_DATA event', async () => {
        const startButton2 = await page.locator('#startButton2');
        await startButton.click();

        await page.evaluate(() => {
            // Simulate end of data
            const event1 = new Event('END_OF_DATA');
            document.dispatchEvent(event);
        });

        const resetButton2 = await page.locator('#resetButton2');
        await expect(resetButton).toBeEnabled();
    });

    test('Clicking Reset button returns to idle state', async () => {
        const resetButton3 = await page.locator('#resetButton3');
        await resetButton.click();

        const startButton3 = await page.locator('#startButton3');
        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeDisabled();
    });

    test('Graph should reset on idle state', async () => {
        const graph1 = await page.locator('#graph1');
        await expect(graph).toHaveCount(0); // Expecting no bars when in idle state
    });

    test('Ensure buttons are disabled/enabled correctly', async () => {
        const startButton4 = await page.locator('#startButton4');
        const resetButton4 = await page.locator('#resetButton4');

        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeDisabled();

        await startButton.click();
        await expect(startButton).toBeDisabled();
        await expect(resetButton).toBeEnabled();

        await resetButton.click();
        await expect(startButton).toBeEnabled();
        await expect(resetButton).toBeDisabled();
    });
});