import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c93b382-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Counting Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Counting Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display initial elements', async ({ page }) => {
        // Verify that the title and input elements are present
        await expect(page.locator('h1')).toHaveText('Counting Sort Visualization');
        await expect(page.locator('#inputArray')).toBeVisible();
        await expect(page.locator('button')).toHaveText('Sort');
        await expect(page.locator('#array-display')).toBeVisible();
    });

    test('should sort a valid array of numbers', async ({ page }) => {
        // Input a valid array and trigger the sort
        await page.fill('#inputArray', '4,2,3,1,0');
        await page.click('button');

        // Verify that the sorted array is displayed correctly
        const bars = page.locator('#array-display .bar');
        await expect(bars).toHaveCount(5);
        await expect(bars.nth(0)).toHaveText('0');
        await expect(bars.nth(1)).toHaveText('1');
        await expect(bars.nth(2)).toHaveText('2');
        await expect(bars.nth(3)).toHaveText('3');
        await expect(bars.nth(4)).toHaveText('4');
    });

    test('should display an alert for invalid input', async ({ page }) => {
        // Input an invalid array and trigger the sort
        await page.fill('#inputArray', '4,2,three,1,0');
        await page.click('button');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid array of numbers.');
            await dialog.dismiss();
        });
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Input an empty array and trigger the sort
        await page.fill('#inputArray', '');
        await page.click('button');

        // Verify that no bars are displayed
        const bars = page.locator('#array-display .bar');
        await expect(bars).toHaveCount(0);
    });

    test('should handle single element array', async ({ page }) => {
        // Input a single element and trigger the sort
        await page.fill('#inputArray', '5');
        await page.click('button');

        // Verify that the single element is displayed correctly
        const bars = page.locator('#array-display .bar');
        await expect(bars).toHaveCount(1);
        await expect(bars.nth(0)).toHaveText('5');
    });

    test('should sort an array with duplicate numbers', async ({ page }) => {
        // Input an array with duplicates and trigger the sort
        await page.fill('#inputArray', '3,3,2,1,1,0');
        await page.click('button');

        // Verify that the sorted array is displayed correctly
        const bars = page.locator('#array-display .bar');
        await expect(bars).toHaveCount(6);
        await expect(bars.nth(0)).toHaveText('0');
        await expect(bars.nth(1)).toHaveText('1');
        await expect(bars.nth(2)).toHaveText('1');
        await expect(bars.nth(3)).toHaveText('2');
        await expect(bars.nth(4)).toHaveText('3');
        await expect(bars.nth(5)).toHaveText('3');
    });

    test('should handle negative numbers gracefully', async ({ page }) => {
        // Input an array with negative numbers and trigger the sort
        await page.fill('#inputArray', '-1,0,1');
        await page.click('button');

        // Verify that the sorted array is displayed correctly
        const bars = page.locator('#array-display .bar');
        await expect(bars).toHaveCount(3);
        await expect(bars.nth(0)).toHaveText('-1');
        await expect(bars.nth(1)).toHaveText('0');
        await expect(bars.nth(2)).toHaveText('1');
    });
});