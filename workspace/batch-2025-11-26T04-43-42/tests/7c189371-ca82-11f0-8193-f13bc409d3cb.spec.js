import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c189371-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Heap Sort Visualization Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state should be Idle', async () => {
        // Verify that the application starts in the Idle state
        const startButton = await page.locator('button#startSort');
        const resetButton = await page.locator('button#reset');
        
        await expect(startButton).toBeVisible();
        await expect(resetButton).toBeHidden();
    });

    test('Clicking Start Sort transitions to Sorting state', async () => {
        // Simulate clicking the Start Sort button
        await page.click('button#startSort');

        // Verify that the application is now in the Sorting state
        await expect(page.locator('div#sortingStatus')).toHaveText('Sorting...');
        await expect(page.locator('button#reset')).toBeHidden();
    });

    test('Sorting process completes and transitions to Completed state', async () => {
        // Wait for the sorting process to complete
        await page.waitForTimeout(3000); // Adjust based on expected sorting duration

        // Verify that the application is now in the Completed state
        await expect(page.locator('div#sortingStatus')).toHaveText('Sorting Completed');
        await expect(page.locator('button#reset')).toBeVisible();
    });

    test('Clicking Reset transitions to Resetting state', async () => {
        // Simulate clicking the Reset button
        await page.click('button#reset');

        // Verify that the application is now in the Resetting state
        await expect(page.locator('div#resettingStatus')).toHaveText('Resetting...');
    });

    test('Resetting completes and transitions back to Idle state', async () => {
        // Wait for the resetting process to complete
        await page.waitForTimeout(1000); // Adjust based on expected resetting duration

        // Verify that the application is back in the Idle state
        const startButton = await page.locator('button#startSort');
        const resetButton = await page.locator('button#reset');

        await expect(startButton).toBeVisible();
        await expect(resetButton).toBeHidden();
    });

    test('Edge case: Clicking Reset while in Idle state does nothing', async () => {
        // Click Reset button while in Idle state
        await page.click('button#reset');

        // Verify that the application remains in Idle state
        const startButton = await page.locator('button#startSort');
        const resetButton = await page.locator('button#reset');

        await expect(startButton).toBeVisible();
        await expect(resetButton).toBeHidden();
    });

    test('Edge case: Clicking Start Sort multiple times', async () => {
        // Click Start Sort button multiple times
        await page.click('button#startSort');
        await page.waitForTimeout(500); // Short wait to simulate rapid clicks
        await page.click('button#startSort');

        // Verify that the application still transitions to Sorting state
        await expect(page.locator('div#sortingStatus')).toHaveText('Sorting...');
    });
});