import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137aae2-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Counting Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display input field and sort button in idle state', async ({ page }) => {
        const inputField = await page.locator('#arrayInput');
        const sortButton = await page.locator('button');

        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should transition to InputReceived state on valid input', async ({ page }) => {
        await page.fill('#arrayInput', '3,1,2');
        await page.click('button');

        // Check if input is captured and input field is disabled
        const inputValue = await page.inputValue('#arrayInput');
        expect(inputValue).toBe('3,1,2');
        await expect(page.locator('#arrayInput')).toBeDisabled();
    });

    test('should show error message on invalid input', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('button');

        // Check for error message
        const errorMessage = await page.locator('#errorMessage'); // Assuming there's an error message element
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText('Input is invalid'); // Assuming this is the error message
    });

    test('should sort the array and display sorted bars', async ({ page }) => {
        await page.fill('#arrayInput', '4,2,3,1');
        await page.click('button');

        // Wait for sorting to complete and check the output
        await page.waitForTimeout(2000); // Wait for sorting to complete
        const bars = await page.locator('#arrayContainer .bar');

        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([10, 20, 30, 40]); // Heights should correspond to sorted values
    });

    test('should reset input field and state on new sort after error', async ({ page }) => {
        await page.fill('#arrayInput', 'invalid,input');
        await page.click('button');

        // Check for error message
        const errorMessage = await page.locator('#errorMessage');
        await expect(errorMessage).toBeVisible();

        // Now try to sort again with valid input
        await page.fill('#arrayInput', '5,3,4,2,1');
        await page.click('button');

        // Wait for sorting to complete
        await page.waitForTimeout(2000);
        const bars = await page.locator('#arrayContainer .bar');

        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([10, 20, 30, 40, 50]); // Heights should correspond to sorted values
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.fill('#arrayInput', '');
        await page.click('button');

        // Check for error message
        const errorMessage = await page.locator('#errorMessage');
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveText('Input cannot be empty'); // Assuming this is the error message
    });

    test('should clear error state and input field after sorting', async ({ page }) => {
        await page.fill('#arrayInput', '3,2,1');
        await page.click('button');

        // Wait for sorting to complete
        await page.waitForTimeout(2000);
        const bars = await page.locator('#arrayContainer .bar');

        const heights = await bars.evaluateAll(bars => bars.map(bar => parseInt(bar.style.height)));
        expect(heights).toEqual([10, 20, 30]); // Heights should correspond to sorted values

        // Check if input field is reset
        const inputValue = await page.inputValue('#arrayInput');
        expect(inputValue).toBe('');
    });
});