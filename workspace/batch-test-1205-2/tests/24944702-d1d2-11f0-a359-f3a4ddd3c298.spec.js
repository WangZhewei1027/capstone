import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/24944702-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Counting Sort Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Counting Sort Visualization page before each test
        await page.goto(BASE_URL);
    });

    test('should display input field and sort button on idle state', async ({ page }) => {
        // Validate that the input field and sort button are present in the idle state
        const inputField = await page.locator('#array-input');
        const sortButton = await page.locator('button[onclick="countingSort()"]');

        await expect(inputField).toBeVisible();
        await expect(sortButton).toBeVisible();
    });

    test('should sort numbers correctly when valid input is provided', async ({ page }) => {
        // Test sorting functionality with valid input
        const inputField1 = await page.locator('#array-input');
        const sortButton1 = await page.locator('button[onclick="countingSort()"]');

        await inputField.fill('3,1,2');
        await sortButton.click();

        // Validate that the sorted output is displayed
        const bars = await page.locator('#array-container .bar');
        await expect(bars).toHaveCount(3);
        await expect(bars.nth(0)).toHaveCSS('height', '10px'); // 1
        await expect(bars.nth(1)).toHaveCSS('height', '20px'); // 2
        await expect(bars.nth(2)).toHaveCSS('height', '30px'); // 3
    });

    test('should alert user when input is invalid', async ({ page }) => {
        // Test alert functionality when invalid input is provided
        const inputField2 = await page.locator('#array-input');
        const sortButton2 = await page.locator('button[onclick="countingSort()"]');

        await inputField.fill('invalid,input');
        await sortButton.click();

        // Validate that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid list of numbers.');
            await dialog.dismiss();
        });
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Test behavior when the input is empty
        const inputField3 = await page.locator('#array-input');
        const sortButton3 = await page.locator('button[onclick="countingSort()"]');

        await inputField.fill('');
        await sortButton.click();

        // Validate that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid list of numbers.');
            await dialog.dismiss();
        });
    });

    test('should not display bars when input is empty', async ({ page }) => {
        // Validate that no bars are displayed when input is empty
        const inputField4 = await page.locator('#array-input');
        const sortButton4 = await page.locator('button[onclick="countingSort()"]');

        await inputField.fill('');
        await sortButton.click();

        const bars1 = await page.locator('#array-container .bar');
        await expect(bars).toHaveCount(0);
    });

    test('should display sorted bars for larger input', async ({ page }) => {
        // Test sorting functionality with larger input
        const inputField5 = await page.locator('#array-input');
        const sortButton5 = await page.locator('button[onclick="countingSort()"]');

        await inputField.fill('5,3,8,6,2');
        await sortButton.click();

        // Validate that the sorted output is displayed
        const bars2 = await page.locator('#array-container .bar');
        await expect(bars).toHaveCount(5);
        await expect(bars.nth(0)).toHaveCSS('height', '20px'); // 2
        await expect(bars.nth(1)).toHaveCSS('height', '30px'); // 3
        await expect(bars.nth(2)).toHaveCSS('height', '50px'); // 5
        await expect(bars.nth(3)).toHaveCSS('height', '60px'); // 6
        await expect(bars.nth(4)).toHaveCSS('height', '80px'); // 8
    });
});