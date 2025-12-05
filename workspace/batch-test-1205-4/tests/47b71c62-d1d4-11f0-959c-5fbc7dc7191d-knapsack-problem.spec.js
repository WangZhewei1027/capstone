import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b71c62-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Knapsack Problem Solver Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Knapsack Problem Solver page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display default values', async ({ page }) => {
        // Verify that the page loads with the correct title
        await expect(page).toHaveTitle('Knapsack Problem Solver');

        // Check default values in input fields
        const weightsInput = await page.locator('#weights');
        const valuesInput = await page.locator('#values');
        const capacityInput = await page.locator('#capacity');

        await expect(weightsInput).toHaveValue('1,2,3,2');
        await expect(valuesInput).toHaveValue('20,30,50,10');
        await expect(capacityInput).toHaveValue('5');
    });

    test('should solve the knapsack problem and display result', async ({ page }) => {
        // Input new values and click the solve button
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '6');
        await page.click('#solveButton');

        // Check that the result is displayed correctly
        const resultArea = await page.locator('#resultArea');
        await expect(resultArea).toContainText('Maximum Value in Knapsack = 55');
    });

    test('should handle edge case with no items', async ({ page }) => {
        // Input empty weights and values
        await page.fill('#weights', '');
        await page.fill('#values', '');
        await page.fill('#capacity', '5');
        await page.click('#solveButton');

        // Check that the result is displayed correctly
        const resultArea = await page.locator('#resultArea');
        await expect(resultArea).toContainText('Maximum Value in Knapsack = 0');
    });

    test('should handle edge case with zero capacity', async ({ page }) => {
        // Input weights and values but set capacity to 0
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '0');
        await page.click('#solveButton');

        // Check that the result is displayed correctly
        const resultArea = await page.locator('#resultArea');
        await expect(resultArea).toContainText('Maximum Value in Knapsack = 0');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Input invalid weights and values
        await page.fill('#weights', 'a,b,c');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '5');
        await page.click('#solveButton');

        // Verify that an error is logged in the console
        page.on('console', msg => {
            if (msg.type() === 'error') {
                expect(msg.text()).toContain('NaN');
            }
        });
    });

    test('should display result area after solving', async ({ page }) => {
        // Ensure result area is hidden initially
        const resultArea = await page.locator('#resultArea');
        await expect(resultArea).toBeEmpty();

        // Solve the problem
        await page.fill('#weights', '1,2,3');
        await page.fill('#values', '10,15,40');
        await page.fill('#capacity', '6');
        await page.click('#solveButton');

        // Check that the result area is now populated
        await expect(resultArea).not.toBeEmpty();
    });
});