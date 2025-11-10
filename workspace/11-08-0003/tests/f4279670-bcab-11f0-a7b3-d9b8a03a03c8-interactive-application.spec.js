import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f4279670-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Interactive Adjacency Matrix Application', () => {
    test('should start in the idle state', async ({ page }) => {
        const resultDisplay = await page.locator('.result');
        await expect(resultDisplay).toHaveText('');
    });

    test('should toggle cell state on CELL_CLICK', async ({ page }) => {
        const cell = page.locator('.cell').nth(0);
        await cell.click();
        await expect(cell).toHaveClass(/active/);
        
        await cell.click();
        await expect(cell).not.toHaveClass(/active/);
    });

    test('should remain in toggling state on multiple CELL_CLICK', async ({ page }) => {
        const cell1 = page.locator('.cell1').nth(1);
        await cell.click();
        await expect(cell).toHaveClass(/active/);
        
        await cell.click();
        await expect(cell).toHaveClass(/active/);
        
        await cell.click();
        await expect(cell).not.toHaveClass(/active/);
    });

    test('should validate input and transition to idle on APPLY_BUTTON_CLICK with valid input', async ({ page }) => {
        const cell2 = page.locator('.cell2').nth(0);
        await cell.click();
        
        const input = page.locator('input[type="number"]');
        await input.fill('5');
        
        const applyButton = page.locator('button').nth(0);
        await applyButton.click();
        
        const resultDisplay1 = await page.locator('.result');
        await expect(resultDisplay).toHaveText('Applied value: 5');
    });

    test('should clear input and transition to idle on APPLY_BUTTON_CLICK with invalid input', async ({ page }) => {
        const input1 = page.locator('input1[type="number"]');
        await input.fill('invalid');
        
        const applyButton1 = page.locator('button').nth(0);
        await applyButton.click();
        
        const resultDisplay2 = await page.locator('.result');
        await expect(resultDisplay).toHaveText('');
        
        await expect(input).toHaveValue('');
    });

    test('should validate input and transition to idle on APPLY_BUTTON_CLICK with empty input', async ({ page }) => {
        const applyButton2 = page.locator('button').nth(0);
        await applyButton.click();
        
        const resultDisplay3 = await page.locator('.result');
        await expect(resultDisplay).toHaveText('');
    });

    test('should highlight cell on entering toggling state', async ({ page }) => {
        const cell3 = page.locator('.cell3').nth(2);
        await cell.click();
        await expect(cell).toHaveClass(/active/);
    });

    test('should update result display on exiting toggling state', async ({ page }) => {
        const cell4 = page.locator('.cell4').nth(1);
        await cell.click();
        await expect(cell).toHaveClass(/active/);
        
        const applyButton3 = page.locator('button').nth(0);
        await applyButton.click();
        
        const resultDisplay4 = await page.locator('.result');
        await expect(resultDisplay).toHaveText('Applied value: 1');
    });
});