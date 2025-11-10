import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/09bec760-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Linear Search Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display initial state', async ({ page }) => {
        const input = await page.locator('#numberInput');
        const button = await page.locator('#searchButton');
        const items = await page.locator('.array-item');

        // Verify that input is empty and button is enabled
        await expect(input).toHaveValue('');
        await expect(button).toBeEnabled();

        // Verify that all array items are displayed
        await expect(items).toHaveCount(8);
    });

    test('should transition to searching state on search button click', async ({ page }) => {
        const input1 = await page.locator('#numberInput');
        const button1 = await page.locator('#searchButton');

        // Enter a number and click search
        await input.fill('5');
        await button.click();

        // Verify that the first item is highlighted as searching
        const firstItem = await page.locator('.array-item').nth(0);
        await expect(firstItem).toHaveClass(/searching/);
    });

    test('should highlight found item and transition to done state', async ({ page }) => {
        const input2 = await page.locator('#numberInput');
        const button2 = await page.locator('#searchButton');

        // Enter a number that exists in the array and click search
        await input.fill('9');
        await button.click();

        // Wait for the search to complete and check the found item
        const foundItem = await page.locator('.array-item').nth(3);
        await expect(foundItem).toHaveClass(/found/);
    });

    test('should remain in searching state if item not found', async ({ page }) => {
        const input3 = await page.locator('#numberInput');
        const button3 = await page.locator('#searchButton');

        // Enter a number that does not exist in the array and click search
        await input.fill('100');
        await button.click();

        // Check that the last item is still highlighted as searching
        const lastItem = await page.locator('.array-item').nth(7);
        await expect(lastItem).toHaveClass(/searching/);
    });

    test('should reset state to idle after done state', async ({ page }) => {
        const input4 = await page.locator('#numberInput');
        const button4 = await page.locator('#searchButton');

        // Enter a number that exists and complete the search
        await input.fill('3');
        await button.click();

        // Wait for the search to complete
        await expect(page.locator('.array-item').nth(0)).toHaveClass(/found/);

        // Click search button again to reset
        await button.click();

        // Verify that input is empty and no items are highlighted
        await expect(input).toHaveValue('');
        const items1 = await page.locator('.array-item');
        await expect(items).toHaveCount(8);
        await expect(items).not.toHaveClass(/found|searching/);
    });

    test('should handle edge case of empty input', async ({ page }) => {
        const button5 = await page.locator('#searchButton');

        // Click search without entering a number
        await button.click();

        // Verify that no items are highlighted
        const items2 = await page.locator('.array-item');
        await expect(items).not.toHaveClass(/found|searching/);
    });
});