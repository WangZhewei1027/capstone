import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/default/html/8b9ad2d0-b3fe-11f0-91f7-216a4f05ad0f.html';

test.describe('Bubble Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state and reset input field', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await expect(inputField).toHaveValue('');
    });

    test('should generate an array and transition to array_generated state', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await inputField.fill('3,1,2');
        await page.click('button:has-text("Generate Array")');

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(3);
        await expect(bars.nth(0)).toHaveCSS('height', '15px'); // 3 * 5
        await expect(bars.nth(1)).toHaveCSS('height', '5px');  // 1 * 5
        await expect(bars.nth(2)).toHaveCSS('height', '10px'); // 2 * 5
    });

    test('should sort the array and transition to sorting state', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await inputField.fill('3,1,2');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');

        const bars = await page.locator('.bar');
        await expect(bars.nth(0)).toHaveCSS('background-color', 'rgb(76, 175, 80)'); // Initial color
        await page.waitForTimeout(2000); // Wait for sort to complete

        await expect(bars.nth(0)).toHaveCSS('height', '5px');  // 1 * 5
        await expect(bars.nth(1)).toHaveCSS('height', '10px'); // 2 * 5
        await expect(bars.nth(2)).toHaveCSS('height', '15px'); // 3 * 5
    });

    test('should transition to sorted state after sorting is complete', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await inputField.fill('3,1,2');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');

        await page.waitForTimeout(2000); // Wait for sort to complete
        const bars = await page.locator('.bar');

        await expect(bars.nth(0)).toHaveCSS('height', '5px');  // 1 * 5
        await expect(bars.nth(1)).toHaveCSS('height', '10px'); // 2 * 5
        await expect(bars.nth(2)).toHaveCSS('height', '15px'); // 3 * 5
    });

    test('should reset to idle state when reset button is clicked', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await inputField.fill('3,1,2');
        await page.click('button:has-text("Generate Array")');
        await page.click('button:has-text("Sort")');

        await page.waitForTimeout(2000); // Wait for sort to complete
        await page.click('button:has-text("Reset")');

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // No bars should be present
        await expect(inputField).toHaveValue(''); // Input field should be reset
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await inputField.fill('invalid,input');
        await page.click('button:has-text("Generate Array")');

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // No bars should be present
    });

    test('should handle empty input without crashing', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        await inputField.fill('');
        await page.click('button:has-text("Generate Array")');

        const bars = await page.locator('.bar');
        await expect(bars).toHaveCount(0); // No bars should be present
    });
});