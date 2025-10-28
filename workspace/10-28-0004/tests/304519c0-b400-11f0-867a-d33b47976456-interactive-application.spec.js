import { test, expect } from '@playwright/test';

test.describe('Bubble Sort Visualization Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/10-28-0004/html/304519c0-b400-11f0-867a-d33b47976456.html');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle and generates numbers', async () => {
        // Verify that the initial state is idle and numbers are generated
        const barsBefore = await page.locator('.bar').count();
        expect(barsBefore).toBe(0);

        await page.click('#startButton');

        // Check that numbers are generated
        const barsAfter = await page.locator('.bar').count();
        expect(barsAfter).toBeGreaterThan(0);
    });

    test('Transition from idle to sorting state', async () => {
        // Start sorting and check if the sorting process starts
        await page.click('#startButton');

        // Check if the start button is disabled
        const startButtonDisabled = await page.locator('#startButton').isDisabled();
        expect(startButtonDisabled).toBe(true);
    });

    test('Pause and resume sorting', async () => {
        await page.click('#startButton'); // Start sorting
        await page.click('#pauseButton'); // Pause sorting

        // Check if the pause button text changes to "Resume"
        const pauseButtonText = await page.locator('#pauseButton').innerText();
        expect(pauseButtonText).toBe('Resume');

        await page.click('#pauseButton'); // Resume sorting

        // Check if the pause button text changes back to "Pause"
        const resumeButtonText = await page.locator('#pauseButton').innerText();
        expect(resumeButtonText).toBe('Pause');
    });

    test('Reset sorting', async () => {
        await page.click('#startButton'); // Start sorting
        await page.click('#resetButton'); // Reset sorting

        // Check if the bars are cleared
        const barsAfterReset = await page.locator('.bar').count();
        expect(barsAfterReset).toBe(0);

        // Check if the start button is enabled again
        const startButtonEnabled = await page.locator('#startButton').isDisabled();
        expect(startButtonEnabled).toBe(false);
    });

    test('Pause and check visual feedback', async () => {
        await page.click('#startButton'); // Start sorting
        await page.click('#pauseButton'); // Pause sorting

        // Check if the bars are still in their current state
        const bars = await page.locator('.bar');
        const firstBarHeight = await bars.nth(0).evaluate(bar => bar.style.height);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for a second
        const firstBarHeightAfterPause = await bars.nth(0).evaluate(bar => bar.style.height);
        expect(firstBarHeight).toBe(firstBarHeightAfterPause); // Height should not change
    });

    test('Check sorting completion', async () => {
        await page.click('#startButton'); // Start sorting
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for sorting to complete

        // Check if the bars are sorted
        const heights = await page.locator('.bar').evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        const sortedHeights = [...heights].sort((a, b) => a - b);
        expect(heights).toEqual(sortedHeights); // Heights should be sorted
    });
});