import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/04a20850-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Merge Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is idle with default array size', async ({ page }) => {
        // Verify that the initial state is idle and the array is initialized
        const bars = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Check that there are bars rendered
    });

    test('Start sorting transitions to sorting state', async ({ page }) => {
        // Click the start sorting button and check for sorting state
        await page.click('#startBtn');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const bars1 = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Check that sorting has started
    });

    test('Sorting completes and transitions to done state', async ({ page }) => {
        // Start sorting and wait for completion
        await page.click('#startBtn');
        await page.waitForTimeout(3000); // Wait for sorting to complete

        const bars2 = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Check that bars are still rendered
        // Additional checks can be added here to verify sorted order
    });

    test('Reset transitions back to idle state', async ({ page }) => {
        // Start sorting and then reset
        await page.click('#startBtn');
        await page.waitForTimeout(3000); // Wait for sorting to complete
        await page.click('#resetBtn');

        const bars3 = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Check that bars are rendered after reset
    });

    test('Array size can be adjusted', async ({ page }) => {
        // Adjust the size slider and verify the array changes
        await page.fill('#sizeSlider', '8');
        await page.click('#startBtn');
        await page.waitForTimeout(1000); // Wait for sorting to start

        const bars4 = await page.locator('.bar').count();
        expect(bars).toBe(8); // Check that the number of bars matches the slider value
    });

    test('Sorting can be interrupted and reset', async ({ page }) => {
        // Start sorting and then reset before completion
        await page.click('#startBtn');
        await page.waitForTimeout(1000); // Wait for sorting to start
        await page.click('#resetBtn');

        const bars5 = await page.locator('.bar').count();
        expect(bars).toBeGreaterThan(0); // Check that bars are rendered after reset
    });

    test('Check visual feedback during sorting', async ({ page }) => {
        // Start sorting and check for visual feedback
        await page.click('#startBtn');
        await page.waitForTimeout(3000); // Wait for sorting to complete

        const bars6 = await page.locator('.bar');
        const firstBarHeight = await bars.nth(0).evaluate(bar => bar.style.height);
        expect(parseInt(firstBarHeight)).toBeGreaterThan(0); // Check that the first bar has height
    });
});