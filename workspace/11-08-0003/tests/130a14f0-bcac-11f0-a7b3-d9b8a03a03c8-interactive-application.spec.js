import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/130a14f0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Fibonacci Sequence Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state initially', async ({ page }) => {
        const grid = await page.locator('#fibonacciGrid');
        const input = await page.locator('#numFibonacci');
        const generateBtn = await page.locator('#generateBtn');
        const resetBtn = await page.locator('#resetBtn');

        // Verify the grid is empty and input is clear
        await expect(grid).toHaveText('');
        await expect(input).toHaveValue('');
    });

    test('should generate Fibonacci squares on valid input', async ({ page }) => {
        const input1 = await page.locator('#numFibonacci');
        const generateBtn1 = await page.locator('#generateBtn1');
        const grid1 = await page.locator('#fibonacciGrid');

        // Input a valid number and click generate
        await input.fill('5');
        await generateBtn.click();

        // Verify the Fibonacci squares are displayed
        await expect(grid).toHaveCount(5);
        const squares = await grid.locator('.fibonacci-square');
        await expect(squares.nth(0)).toHaveCSS('width', '0px');
        await expect(squares.nth(1)).toHaveCSS('width', '5px');
        await expect(squares.nth(2)).toHaveCSS('width', '5px');
        await expect(squares.nth(3)).toHaveCSS('width', '10px');
        await expect(squares.nth(4)).toHaveCSS('width', '15px');
    });

    test('should alert on invalid input', async ({ page }) => {
        const input2 = await page.locator('#numFibonacci');
        const generateBtn2 = await page.locator('#generateBtn2');

        // Input an invalid number and click generate
        await input.fill('25');
        await generateBtn.click();

        // Verify alert is shown
        await page.waitForTimeout(500); // Wait for alert to show
        const alertText = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a valid number between 1 and 20.');
    });

    test('should reset the grid on reset button click', async ({ page }) => {
        const input3 = await page.locator('#numFibonacci');
        const generateBtn3 = await page.locator('#generateBtn3');
        const resetBtn1 = await page.locator('#resetBtn1');
        const grid2 = await page.locator('#fibonacciGrid');

        // Generate Fibonacci squares
        await input.fill('5');
        await generateBtn.click();
        await expect(grid).toHaveCount(5);

        // Click reset button
        await resetBtn.click();

        // Verify the grid is empty
        await expect(grid).toHaveText('');
        await expect(input).toHaveValue('');
    });

    test('should handle edge case of zero input', async ({ page }) => {
        const input4 = await page.locator('#numFibonacci');
        const generateBtn4 = await page.locator('#generateBtn4');
        const grid3 = await page.locator('#fibonacciGrid');

        // Input zero and click generate
        await input.fill('0');
        await generateBtn.click();

        // Verify alert is shown
        await page.waitForTimeout(500); // Wait for alert to show
        const alertText1 = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a valid number between 1 and 20.');
    });

    test('should handle non-numeric input', async ({ page }) => {
        const input5 = await page.locator('#numFibonacci');
        const generateBtn5 = await page.locator('#generateBtn5');

        // Input non-numeric value and click generate
        await input.fill('abc');
        await generateBtn.click();

        // Verify alert is shown
        await page.waitForTimeout(500); // Wait for alert to show
        const alertText2 = await page.evaluate(() => window.alert);
        expect(alertText).toBe('Please enter a valid number between 1 and 20.');
    });
});