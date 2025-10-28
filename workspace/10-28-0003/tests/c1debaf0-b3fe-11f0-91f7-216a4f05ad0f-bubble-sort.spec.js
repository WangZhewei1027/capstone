import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/c1debaf0-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualization', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Initial State', () => {
        test('should be in idle state', async () => {
            const sortBtn = await page.locator('#sortBtn');
            await expect(sortBtn).toBeDisabled(); // Sort button should be disabled
        });
    });

    test.describe('Array Generation', () => {
        test('should generate an array and enable sort button', async () => {
            const generateBtn = await page.locator('#generateBtn');
            await generateBtn.click();

            const sortBtn = await page.locator('#sortBtn');
            await expect(sortBtn).toBeEnabled(); // Sort button should be enabled

            const bars = await page.locator('.bar');
            await expect(bars).toHaveCount(20); // Should generate 20 bars
        });

        test('should render the array correctly', async () => {
            const bars = await page.locator('.bar');
            for (let i = 0; i < 20; i++) {
                const barHeight = await bars.nth(i).evaluate(el => el.style.height);
                expect(barHeight).toMatch(/px$/); // Each bar should have a height in pixels
            }
        });
    });

    test.describe('Sorting', () => {
        test('should start sorting when sort button is clicked', async () => {
            const sortBtn = await page.locator('#sortBtn');
            await sortBtn.click();

            const bars = await page.locator('.bar');
            await expect(bars).toHaveCount(20); // Ensure we still have 20 bars during sorting
            // Additional checks can be added here for sorting animation
        });

        test('should complete sorting and highlight sorted array', async () => {
            // Wait for sorting to complete (this may need adjustment based on actual implementation)
            await page.waitForTimeout(5000); // Adjust timeout based on expected sort duration

            const bars = await page.locator('.bar');
            for (let i = 0; i < 20; i++) {
                const barColor = await bars.nth(i).evaluate(el => el.style.backgroundColor);
                expect(barColor).toBe('rgb(52, 152, 219)'); // Check if bars are highlighted
            }
        });
    });

    test.describe('Reset Functionality', () => {
        test('should reset to idle state', async () => {
            const resetBtn = await page.locator('#resetBtn');
            await resetBtn.click();

            const sortBtn = await page.locator('#sortBtn');
            await expect(sortBtn).toBeDisabled(); // Sort button should be disabled again

            const bars = await page.locator('.bar');
            await expect(bars).toHaveCount(0); // No bars should be present
        });
    });

    test.describe('Edge Cases', () => {
        test('should handle multiple generates correctly', async () => {
            const generateBtn = await page.locator('#generateBtn');
            await generateBtn.click();
            await generateBtn.click(); // Generate again

            const bars = await page.locator('.bar');
            await expect(bars).toHaveCount(20); // Should still have 20 bars
        });

        test('should handle reset after sorting', async () => {
            const generateBtn = await page.locator('#generateBtn');
            await generateBtn.click();
            const sortBtn = await page.locator('#sortBtn');
            await sortBtn.click();
            await page.waitForTimeout(5000); // Wait for sorting to complete

            const resetBtn = await page.locator('#resetBtn');
            await resetBtn.click();

            const bars = await page.locator('.bar');
            await expect(bars).toHaveCount(0); // No bars should be present after reset
        });
    });
});