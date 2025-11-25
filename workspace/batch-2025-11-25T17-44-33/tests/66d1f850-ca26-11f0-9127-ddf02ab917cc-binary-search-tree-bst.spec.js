import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-44-33/html/66d1f850-ca26-11f0-9127-ddf02ab917cc.html';

test.describe('Binary Search Tree (BST) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State', () => {
        test('should be in idle state initially', async ({ page }) => {
            const treeDisplay = await page.locator('#treeDisplay').innerHTML();
            expect(treeDisplay).toBe('');
        });
    });

    test.describe('Inserting Values', () => {
        test('should insert a valid number and update the display', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('button[onclick="insertValue()"]');

            const treeDisplay = await page.locator('#treeDisplay').innerHTML();
            expect(treeDisplay).toContain('<div class="node">10</div>');
        });

        test('should insert multiple numbers and display correctly', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('button[onclick="insertValue()"]');
            await page.fill('#value', '5');
            await page.click('button[onclick="insertValue()"]');
            await page.fill('#value', '15');
            await page.click('button[onclick="insertValue()"]');

            const treeDisplay = await page.locator('#treeDisplay').innerHTML();
            expect(treeDisplay).toContain('<div class="node">10</div>');
            expect(treeDisplay).toContain('<div class="node">5</div>');
            expect(treeDisplay).toContain('<div class="node">15</div>');
        });

        test('should alert on invalid number input', async ({ page }) => {
            await page.fill('#value', 'invalid');
            await page.click('button[onclick="insertValue()"]');

            const alertDialog = await page.waitForEvent('dialog');
            expect(alertDialog.message()).toBe('Please enter a valid number');
            await alertDialog.dismiss();
        });
    });

    test.describe('Clearing the Tree', () => {
        test('should clear the tree and reset the display', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('button[onclick="insertValue()"]');
            await page.click('button[onclick="clearTree()"]');

            const treeDisplay = await page.locator('#treeDisplay').innerHTML();
            expect(treeDisplay).toBe('');
        });

        test('should clear the input field after clearing the tree', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('button[onclick="insertValue()"]');
            await page.click('button[onclick="clearTree()"]');

            const inputValue = await page.locator('#value').inputValue();
            expect(inputValue).toBe('');
        });
    });
});