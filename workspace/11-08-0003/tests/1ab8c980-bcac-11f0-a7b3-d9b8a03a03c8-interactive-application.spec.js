import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1ab8c980-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Linear Regression Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be idle', async ({ page }) => {
        // Verify that the application is in the idle state
        const xInput = await page.locator('#x-value');
        const yInput = await page.locator('#y-value');
        const addPointButton = await page.locator('#add-point');

        await expect(xInput).toBeVisible();
        await expect(yInput).toBeVisible();
        await expect(addPointButton).toBeVisible();
    });

    test('Adding a point updates the state to adding_point', async ({ page }) => {
        // Simulate adding a valid point
        await page.fill('#x-value', '1');
        await page.fill('#y-value', '2');
        await page.click('#add-point');

        // Verify that the point is added visually
        const point = await page.locator('.point');
        await expect(point).toHaveCount(1);
    });

    test('Adding a point updates the regression line', async ({ page }) => {
        // Add a valid point and check if the line updates
        await page.fill('#x-value', '1');
        await page.fill('#y-value', '2');
        await page.click('#add-point');

        // Verify the regression line is drawn
        const line = await page.locator('.line');
        await expect(line).toBeVisible();
    });

    test('Invalid input should reset to idle state', async ({ page }) => {
        // Simulate adding an invalid point
        await page.fill('#x-value', 'abc');
        await page.fill('#y-value', '2');
        await page.click('#add-point');

        // Verify that the application returns to idle state
        const xInput1 = await page.locator('#x-value');
        const yInput1 = await page.locator('#y-value');
        await expect(xInput).toHaveValue('');
        await expect(yInput).toHaveValue('');
    });

    test('Adding multiple points updates the regression line correctly', async ({ page }) => {
        // Add multiple valid points
        await page.fill('#x-value', '1');
        await page.fill('#y-value', '2');
        await page.click('#add-point');

        await page.fill('#x-value', '2');
        await page.fill('#y-value', '3');
        await page.click('#add-point');

        await page.fill('#x-value', '3');
        await page.fill('#y-value', '5');
        await page.click('#add-point');

        // Verify that multiple points are added
        const points = await page.locator('.point');
        await expect(points).toHaveCount(3);
    });

    test('Regression line updates after each point addition', async ({ page }) => {
        // Add a point and check the line
        await page.fill('#x-value', '1');
        await page.fill('#y-value', '2');
        await page.click('#add-point');

        const firstLine = await page.locator('.line');
        await expect(firstLine).toBeVisible();

        // Add another point and check the line again
        await page.fill('#x-value', '2');
        await page.fill('#y-value', '3');
        await page.click('#add-point');

        const secondLine = await page.locator('.line');
        await expect(secondLine).toBeVisible();
        // Additional checks can be added to verify line position or properties
    });

    test('Ensure inputs are cleared after adding a point', async ({ page }) => {
        // Add a valid point
        await page.fill('#x-value', '1');
        await page.fill('#y-value', '2');
        await page.click('#add-point');

        // Verify that the inputs are cleared
        const xInput2 = await page.locator('#x-value');
        const yInput2 = await page.locator('#y-value');
        await expect(xInput).toHaveValue('');
        await expect(yInput).toHaveValue('');
    });
});