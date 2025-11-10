import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/19207640-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Divide and Conquer Interactive Application', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const mergeBtn = await page.locator('#mergeBtn');
        const startBtn = await page.locator('#startBtn');

        // Verify that the merge button is disabled initially
        await expect(mergeBtn).toBeDisabled();
        // Verify that the start button is enabled
        await expect(startBtn).toBeEnabled();
    });

    test('Clicking Start transitions to dividing state', async () => {
        const startBtn1 = await page.locator('#startBtn1');

        // Click the Start button
        await startBtn.click();

        // Verify that the merge button is still disabled
        const mergeBtn1 = await page.locator('#mergeBtn1');
        await expect(mergeBtn).toBeDisabled();

        // Verify that the array is drawn on the canvas
        const canvas = await page.locator('#canvas');
        await expect(canvas).toHaveCount(6); // Initial array has 6 elements
    });

    test('Division completes and transitions to waitingToMerge state', async () => {
        const startBtn2 = await page.locator('#startBtn2');

        // Click the Start button to trigger division
        await startBtn.click();

        // Simulate division completion
        await page.evaluate(() => {
            // Manually trigger the division complete event
            const event = new Event('DIVISION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that the merge button is enabled
        const mergeBtn2 = await page.locator('#mergeBtn2');
        await expect(mergeBtn).toBeEnabled();
    });

    test('Clicking Merge transitions to merging state', async () => {
        const mergeBtn3 = await page.locator('#mergeBtn3');

        // Click the Merge button
        await mergeBtn.click();

        // Verify that the merge button is disabled after clicking
        await expect(mergeBtn).toBeDisabled();

        // Verify that the array is merged on the canvas
        const canvas1 = await page.locator('#canvas1');
        await expect(canvas).toHaveCount(6); // Merged array should still show 6 elements
    });

    test('Merging completes and transitions to done state', async () => {
        const mergeBtn4 = await page.locator('#mergeBtn4');

        // Simulate merge completion
        await page.evaluate(() => {
            // Manually trigger the merge complete event
            const event1 = new Event('MERGE_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that the sorted array is displayed
        const canvas2 = await page.locator('#canvas2');
        await expect(canvas).toHaveCount(6); // Final sorted array should still show 6 elements

        // Check if the merge button is disabled
        await expect(mergeBtn).toBeDisabled();
    });

    test('Clicking Start again resets to idle state', async () => {
        const startBtn3 = await page.locator('#startBtn3');

        // Click the Start button to reset
        await startBtn.click();

        // Verify that the merge button is disabled again
        const mergeBtn5 = await page.locator('#mergeBtn5');
        await expect(mergeBtn).toBeDisabled();
    });
});