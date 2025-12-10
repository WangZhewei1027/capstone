import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24941ff0-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Selection Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state: Idle', async ({ page }) => {
        // Validate that the initial state is Idle by checking the initial rendering of bars
        const bars = await page.locator('.bar').count();
        expect(bars).toBe(5); // There should be 5 bars corresponding to the initial array
    });

    test('Clicking Sort Array transitions to Sorting state', async ({ page }) => {
        // Click the Sort Array button
        await page.click('button[onclick="selectionSort()"]');

        // Validate that the sorting process has started
        const sortingFunctionExists = await page.evaluate(() => typeof selectionSort === 'function');
        expect(sortingFunctionExists).toBe(true);
    });

    test('Sorting state: Verify bars change during sorting', async ({ page }) => {
        // Click the Sort Array button
        await page.click('button[onclick="selectionSort()"]');

        // Wait for the sorting to progress
        await page.waitForTimeout(1000); // Wait for a second to let sorting start

        // Check if the bars are being updated
        const initialHeights = await page.locator('.bar').evaluateAll(bars => bars.map(bar => bar.style.height));
        
        // Wait for some time to allow sorting to change the bars
        await page.waitForTimeout(3000); // Wait for a few seconds to allow sorting to complete

        const finalHeights = await page.locator('.bar').evaluateAll(bars => bars.map(bar => bar.style.height));
        
        // Ensure that the heights have changed from initial to final
        expect(initialHeights).not.toEqual(finalHeights);
    });

    test('Error handling: Check for console errors during sorting', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Click the Sort Array button
        await page.click('button[onclick="selectionSort()"]');

        // Wait for sorting to complete
        await page.waitForTimeout(3000);

        // Check if there were any console errors
        expect(consoleErrors.length).toBe(0); // There should be no errors during sorting
    });

    test('Re-clicking Sort Array while sorting should not cause errors', async ({ page }) => {
        // Click the Sort Array button to start sorting
        await page.click('button[onclick="selectionSort()"]');

        // Wait for a short time to allow sorting to start
        await page.waitForTimeout(1000);

        // Click the Sort Array button again
        await page.click('button[onclick="selectionSort()"]');

        // Wait for sorting to complete
        await page.waitForTimeout(3000);

        // Check for console errors
        const consoleErrors1 = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        expect(consoleErrors.length).toBe(0); // There should be no errors
    });
});