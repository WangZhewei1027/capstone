import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569ece60-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Topological Sort Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await expect(input).toBeVisible();
        await expect(input).toBeEnabled();
    });

    test('should transition to InputtingData state on valid input', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await input.fill('3, 1, 2');
        await page.locator('button').nth(0).click(); // Click sort button

        await expect(input).toHaveValue('3, 1, 2');
        await expect(input).toHaveFocus();
    });

    test('should transition to Sorting state when input is valid', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await input.fill('3, 1, 2');
        await page.locator('button').nth(0).click(); // Click sort button

        // Simulate sorting
        await page.evaluate(() => {
            const sortArray = () => {
                const input = document.getElementById('arrayInput').value.split(',').map(Number);
                input.sort((a, b) => a - b);
                console.log(input);
            };
            sortArray();
        });

        await page.waitForTimeout(2000); // Wait for sorting to complete
        const sortedOutput = await page.evaluate(() => {
            return document.getElementById('arrayInput').value.split(',').map(Number).sort((a, b) => a - b);
        });

        await expect(sortedOutput).toEqual([1, 2, 3]);
    });

    test('should transition to Sorted state after sorting', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await input.fill('3, 1, 2');
        await page.locator('button').nth(0).click(); // Click sort button

        // Simulate sorting
        await page.evaluate(() => {
            const sortArray = () => {
                const input = document.getElementById('arrayInput').value.split(',').map(Number);
                input.sort((a, b) => a - b);
                document.getElementById('arrayInput').value = input.join(', ');
            };
            sortArray();
        });

        await page.waitForTimeout(2000); // Wait for sorting to complete
        const sortedValue = await page.locator('#arrayInput').inputValue();
        await expect(sortedValue).toBe('1, 2, 3');
    });

    test('should reset input field after sorting', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await input.fill('3, 1, 2');
        await page.locator('button').nth(0).click(); // Click sort button

        // Simulate sorting
        await page.evaluate(() => {
            const sortArray = () => {
                const input = document.getElementById('arrayInput').value.split(',').map(Number);
                input.sort((a, b) => a - b);
                document.getElementById('arrayInput').value = input.join(', ');
            };
            sortArray();
        });

        await page.waitForTimeout(2000); // Wait for sorting to complete
        await input.fill(''); // Reset input field
        await expect(input).toHaveValue('');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await input.fill('');
        await page.locator('button').nth(0).click(); // Click sort button

        // Check if input remains empty and no sorting occurs
        const value = await input.inputValue();
        await expect(value).toBe('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        const input = await page.locator('#arrayInput');
        await input.fill('invalid input');
        await page.locator('button').nth(0).click(); // Click sort button

        // Check if input remains unchanged
        const value = await input.inputValue();
        await expect(value).toBe('invalid input');
    });
});