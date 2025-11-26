import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e137d1f0-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Radix Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const startButton = await page.locator('#startSort');
        await expect(startButton).toBeVisible();
        await expect(startButton).toBeEnabled();
    });

    test('should transition to InputtingArray state on start button click', async ({ page }) => {
        const startButton = await page.locator('#startSort');
        await startButton.click();

        const inputField = await page.locator('#inputArray');
        await expect(inputField).toHaveCSS('border', '2px solid blue'); // Assuming highlightInputField adds a blue border
    });

    test('should validate input and transition to Sorting state', async ({ page }) => {
        await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
        const startButton = await page.locator('#startSort');
        await startButton.click();

        await expect(page.locator('#steps')).toContainText('Sorting with exponent: 1'); // Check if sorting starts
    });

    test('should show error alert for invalid input', async ({ page }) => {
        await page.fill('#inputArray', 'invalid,input');
        const startButton = await page.locator('#startSort');
        await startButton.click();

        await expect(page).toHaveAlert('Please enter a valid array of non-negative integers.');
    });

    test('should complete sorting and return to Idle state', async ({ page }) => {
        await page.fill('#inputArray', '170, 45, 75, 90, 802, 24, 2, 66');
        const startButton = await page.locator('#startSort');
        await startButton.click();

        // Wait for sorting to complete
        await page.waitForTimeout(2000); // Adjust timeout based on sorting duration
        await expect(page.locator('#arrayDisplay')).toContainText('Current array: 2, 24, 45, 66, 75, 90, 170, 802');
        
        // Check if the start button is enabled again
        const startButtonAfterSort = await page.locator('#startSort');
        await expect(startButtonAfterSort).toBeEnabled();
    });

    test('should handle empty input gracefully', async ({ page }) => {
        await page.fill('#inputArray', '');
        const startButton = await page.locator('#startSort');
        await startButton.click();

        await expect(page).toHaveAlert('Please enter a valid array of non-negative integers.');
    });

    test('should handle non-integer input gracefully', async ({ page }) => {
        await page.fill('#inputArray', '1, 2, three, 4');
        const startButton = await page.locator('#startSort');
        await startButton.click();

        await expect(page).toHaveAlert('Please enter a valid array of non-negative integers.');
    });
});