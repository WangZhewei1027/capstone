import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2494e343-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Knapsack Problem Solver', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display the initial page with title', async ({ page }) => {
        // Validate that the initial state is displayed correctly
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Knapsack Problem Solver');
    });

    test('should process input and display result for valid inputs', async ({ page }) => {
        // Input valid weights, values, and capacity
        await page.fill('#weights', '2,3,4,5');
        await page.fill('#values', '3,4,5,6');
        await page.fill('#capacity', '5');
        
        // Click the Solve button
        await page.click('button[onclick="solveKnapsack()"]');
        
        // Validate that the result is displayed correctly
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Maximum Value:');
        expect(resultText).toContain('Selected Items');
    });

    test('should display error message for mismatched weights and values', async ({ page }) => {
        // Input mismatched weights and values
        await page.fill('#weights', '2,3');
        await page.fill('#values', '3,4,5');
        await page.fill('#capacity', '5');
        
        // Click the Solve button
        await page.click('button[onclick="solveKnapsack()"]');
        
        // Validate that the error message is displayed
        const resultText1 = await page.locator('#result').innerText();
        expect(resultText).toBe('Please make sure weights and values are of the same length and capacity is a number.');
    });

    test('should display error message for invalid capacity', async ({ page }) => {
        // Input valid weights and values but invalid capacity
        await page.fill('#weights', '2,3,4,5');
        await page.fill('#values', '3,4,5,6');
        await page.fill('#capacity', 'invalid'); // Invalid capacity
        
        // Click the Solve button
        await page.click('button[onclick="solveKnapsack()"]');
        
        // Validate that the error message is displayed
        const resultText2 = await page.locator('#result').innerText();
        expect(resultText).toBe('Please make sure weights and values are of the same length and capacity is a number.');
    });

    test('should display error message for empty inputs', async ({ page }) => {
        // Leave all inputs empty
        await page.fill('#weights', '');
        await page.fill('#values', '');
        await page.fill('#capacity', '');
        
        // Click the Solve button
        await page.click('button[onclick="solveKnapsack()"]');
        
        // Validate that the error message is displayed
        const resultText3 = await page.locator('#result').innerText();
        expect(resultText).toBe('Please make sure weights and values are of the same length and capacity is a number.');
    });

    test('should handle edge case with zero capacity', async ({ page }) => {
        // Input valid weights, values, and zero capacity
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,20,30');
        await page.fill('#capacity', '0');
        
        // Click the Solve button
        await page.click('button[onclick="solveKnapsack()"]');
        
        // Validate that the result indicates zero value
        const resultText4 = await page.locator('#result').innerText();
        expect(resultText).toContain('Maximum Value: 0');
        expect(resultText).toContain('Selected Items:');
    });
});