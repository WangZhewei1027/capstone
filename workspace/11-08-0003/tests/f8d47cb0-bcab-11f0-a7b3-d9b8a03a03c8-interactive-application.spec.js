import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f8d47cb0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const yourSetDisplay = await page.locator('#your-set');
        const unionResult = await page.locator('#union-result');
        const intersectionResult = await page.locator('#intersection-result');

        // Verify that the set display is empty
        await expect(yourSetDisplay).toHaveText('');
        // Verify that results are hidden
        await expect(unionResult).toBeHidden();
        await expect(intersectionResult).toBeHidden();
    });

    test('Clicking a number updates the set', async ({ page }) => {
        const numberButton = page.locator('.number[data-value="3"]');
        await numberButton.click();

        const yourSetDisplay1 = await page.locator('#your-set');
        // Verify that the clicked number is added to the set display
        await expect(yourSetDisplay).toHaveText('3');
        await expect(numberButton).toHaveClass(/selected/);
    });

    test('Clicking multiple numbers updates the set', async ({ page }) => {
        const numberButtons = [
            page.locator('.number[data-value="2"]'),
            page.locator('.number[data-value="4"]'),
            page.locator('.number[data-value="6"]')
        ];

        for (const button of numberButtons) {
            await button.click();
        }

        const yourSetDisplay2 = await page.locator('#your-set');
        // Verify that all clicked numbers are displayed
        await expect(yourSetDisplay).toHaveText('2, 4, 6');
        for (const button of numberButtons) {
            await expect(button).toHaveClass(/selected/);
        }
    });

    test('Union operation displays correct result', async ({ page }) => {
        const numberButton1 = page.locator('.number[data-value="1"]');
        await numberButton.click();

        const unionButton = page.locator('#union-button');
        await unionButton.click();

        const unionResult1 = await page.locator('#union-result');
        // Verify that the union result is displayed
        await expect(unionResult).toBeVisible();
        await expect(unionResult).toHaveText('Union Result: {1, 3, 4, 5, 6}');
    });

    test('Intersection operation displays correct result', async ({ page }) => {
        const numberButton2 = page.locator('.number[data-value="2"]');
        await numberButton.click();

        const intersectionButton = page.locator('#intersection-button');
        await intersectionButton.click();

        const intersectionResult1 = await page.locator('#intersection-result');
        // Verify that the intersection result is displayed
        await expect(intersectionResult).toBeVisible();
        await expect(intersectionResult).toHaveText('Intersection Result: {2}');
    });

    test('Clicking a number again removes it from the set', async ({ page }) => {
        const numberButton3 = page.locator('.number[data-value="5"]');
        await numberButton.click(); // Add 5
        await numberButton.click(); // Remove 5

        const yourSetDisplay3 = await page.locator('#your-set');
        // Verify that the set display does not include 5
        await expect(yourSetDisplay).toHaveText('');
        await expect(numberButton).not.toHaveClass(/selected/);
    });

    test('Union and intersection operations after updates', async ({ page }) => {
        const numberButtons1 = [
            page.locator('.number[data-value="1"]'),
            page.locator('.number[data-value="2"]'),
            page.locator('.number[data-value="3"]')
        ];

        for (const button of numberButtons) {
            await button.click();
        }

        const unionButton1 = page.locator('#union-button');
        await unionButton.click();

        const unionResult2 = await page.locator('#union-result');
        // Verify union result after updates
        await expect(unionResult).toBeVisible();
        await expect(unionResult).toHaveText('Union Result: {1, 2, 3, 4, 5, 6}');

        const intersectionButton1 = page.locator('#intersection-button');
        await intersectionButton.click();

        const intersectionResult2 = await page.locator('#intersection-result');
        // Verify intersection result after updates
        await expect(intersectionResult).toBeVisible();
        await expect(intersectionResult).toHaveText('Intersection Result: {1, 2, 3}');
    });

    test.afterEach(async ({ page }) => {
        // Optionally, reset the application state if needed
        // This can be done by refreshing the page or resetting the inputs
    });
});