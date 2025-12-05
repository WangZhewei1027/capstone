import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b7c001-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Knapsack Problem Solver', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page with default values', async ({ page }) => {
        const capacityInput = await page.locator('#capacity');
        const resultText = await page.locator('#result');

        await expect(capacityInput).toHaveValue('10');
        await expect(resultText).toHaveText('');
    });

    test('should add a new item input when "Add Item" is clicked', async ({ page }) => {
        const initialItemCount = await page.locator('#items > div').count();
        await page.click('button:has-text("Add Item")');

        const newItemCount = await page.locator('#items > div').count();
        await expect(newItemCount).toBe(initialItemCount + 1);
    });

    test('should solve the knapsack problem and display the result', async ({ page }) => {
        await page.fill('#capacity', '10');
        await page.fill('.weight', '2');
        await page.fill('.value', '3');
        await page.click('button:has-text("Solve Knapsack")');

        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Maximum Value in Knapsack: 3');
    });

    test('should handle multiple items and calculate the correct maximum value', async ({ page }) => {
        await page.fill('#capacity', '5');
        await page.fill('.weight', '2');
        await page.fill('.value', '3');
        await page.click('button:has-text("Add Item")');
        await page.fill('.weight:last-of-type', '3');
        await page.fill('.value:last-of-type', '4');
        await page.click('button:has-text("Solve Knapsack")');

        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Maximum Value in Knapsack: 4');
    });

    test('should show correct result when all weights exceed capacity', async ({ page }) => {
        await page.fill('#capacity', '1');
        await page.fill('.weight', '2');
        await page.fill('.value', '3');
        await page.click('button:has-text("Solve Knapsack")');

        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Maximum Value in Knapsack: 0');
    });

    test('should not crash when no items are present', async ({ page }) => {
        await page.fill('#capacity', '10');
        await page.click('button:has-text("Solve Knapsack")');

        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Maximum Value in Knapsack: 0');
    });

    test('should handle invalid capacity input gracefully', async ({ page }) => {
        await page.fill('#capacity', '-5');
        await page.click('button:has-text("Solve Knapsack")');

        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Maximum Value in Knapsack: 0');
    });

    test('should display correct result with varying item values and weights', async ({ page }) => {
        await page.fill('#capacity', '7');
        await page.fill('.weight', '1');
        await page.fill('.value', '1');
        await page.click('button:has-text("Add Item")');
        await page.fill('.weight:last-of-type', '4');
        await page.fill('.value:last-of-type', '5');
        await page.click('button:has-text("Add Item")');
        await page.fill('.weight:last-of-type', '3');
        await page.fill('.value:last-of-type', '4');
        await page.click('button:has-text("Solve Knapsack")');

        const resultText = await page.locator('#result');
        await expect(resultText).toHaveText('Maximum Value in Knapsack: 6');
    });
});