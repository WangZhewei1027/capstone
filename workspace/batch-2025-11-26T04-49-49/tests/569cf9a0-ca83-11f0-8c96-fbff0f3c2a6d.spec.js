import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569cf9a0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Merge Sort Visualization Tests', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is Idle', async () => {
        // Validate that the application starts in the Idle state
        const startButton = await page.$('#startButton');
        const resetButton = await page.$('#resetButton');
        expect(await startButton.isEnabled()).toBe(true);
        expect(await resetButton.isEnabled()).toBe(false);
    });

    test('Clicking Start transitions to Sorting', async () => {
        // Simulate clicking the Start button
        await page.click('#startButton');

        // Validate that the application is now in the Sorting state
        const arrayVisualization = await page.$('.arrayVisualization');
        expect(await arrayVisualization.evaluate(el => el.innerText)).toContain('Sorting');
    });

    test('Sorting completes and transitions to Merging', async () => {
        // Wait for the sorting process to complete
        await page.waitForTimeout(2000); // Adjust timeout based on expected duration

        // Validate that the application is now in the Merging state
        const arrayVisualization = await page.$('.arrayVisualization');
        expect(await arrayVisualization.evaluate(el => el.innerText)).toContain('Merging');
    });

    test('Merging completes and transitions to Completed', async () => {
        // Wait for the merging process to complete
        await page.waitForTimeout(1500); // Adjust timeout based on expected duration

        // Validate that the application is now in the Completed state
        const arrayVisualization = await page.$('.arrayVisualization');
        expect(await arrayVisualization.evaluate(el => el.innerText)).toContain('Completed');
    });

    test('Clicking Reset transitions back to Idle', async () => {
        // Simulate clicking the Reset button
        await page.click('#resetButton');

        // Validate that the application is now in the Idle state
        const startButton = await page.$('#startButton');
        const resetButton = await page.$('#resetButton');
        expect(await startButton.isEnabled()).toBe(true);
        expect(await resetButton.isEnabled()).toBe(false);
    });

    test('Clicking Reset while in Completed state transitions to Resetting', async () => {
        // Simulate clicking the Start button and wait for completion
        await page.click('#startButton');
        await page.waitForTimeout(2000); // Wait for sorting
        await page.waitForTimeout(1500); // Wait for merging

        // Click Reset
        await page.click('#resetButton');

        // Validate that the application is now in the Resetting state
        const arrayVisualization = await page.$('.arrayVisualization');
        expect(await arrayVisualization.evaluate(el => el.innerText)).toContain('Resetting');
    });

    test('Resetting completes and transitions back to Idle', async () => {
        // Wait for the resetting process to complete
        await page.waitForTimeout(500); // Adjust timeout based on expected duration

        // Validate that the application is now in the Idle state
        const startButton = await page.$('#startButton');
        const resetButton = await page.$('#resetButton');
        expect(await startButton.isEnabled()).toBe(true);
        expect(await resetButton.isEnabled()).toBe(false);
    });
});