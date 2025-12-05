import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b79190-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Two Pointers Algorithm Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(baseUrl);
    });

    test('should load the page with default state', async ({ page }) => {
        // Verify that the title is correct
        const title = await page.title();
        expect(title).toBe('Two Pointers Algorithm');

        // Check that the output div is empty on initial load
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('');
    });

    test('should display an error message for empty input', async ({ page }) => {
        // Click the button without entering any values
        await page.click('button');

        // Verify the error message
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('Please enter valid input!');
    });

    test('should display an error message for invalid target sum', async ({ page }) => {
        // Enter valid input but invalid target sum
        await page.fill('#inputArray', '1,2,3');
        await page.fill('#targetSum', 'invalid');
        await page.click('button');

        // Verify the error message
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('Please enter valid input!');
    });

    test('should find pairs that sum to the target', async ({ page }) => {
        // Enter valid input and target sum
        await page.fill('#inputArray', '1,2,3,4,5');
        await page.fill('#targetSum', '6');
        await page.click('button');

        // Verify the output shows the correct pairs
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('Pairs with the target sum: (1, 5), (2, 4)');
    });

    test('should indicate no pairs found when applicable', async ({ page }) => {
        // Enter valid input with no pairs summing to the target
        await page.fill('#inputArray', '1,2,3');
        await page.fill('#targetSum', '7');
        await page.click('button');

        // Verify the output indicates no pairs found
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('No pairs found with the target sum.');
    });

    test('should handle edge case of duplicate numbers', async ({ page }) => {
        // Enter input with duplicate numbers
        await page.fill('#inputArray', '1,1,2,2,3');
        await page.fill('#targetSum', '4');
        await page.click('button');

        // Verify the output shows the correct pairs
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('Pairs with the target sum: (1, 3), (2, 2)');
    });

    test('should handle edge case of negative numbers', async ({ page }) => {
        // Enter input with negative numbers
        await page.fill('#inputArray', '-3,-2,-1,0,1,2,3');
        await page.fill('#targetSum', '0');
        await page.click('button');

        // Verify the output shows the correct pairs
        const outputDiv = await page.locator('#output');
        await expect(outputDiv).toHaveText('Pairs with the target sum: (-3, 3), (-2, 2), (-1, 1)');
    });
});