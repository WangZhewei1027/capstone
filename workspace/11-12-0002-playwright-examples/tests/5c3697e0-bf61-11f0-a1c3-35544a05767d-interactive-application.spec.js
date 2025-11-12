import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/5c3697e0-bf61-11f0-a1c3-35544a05767d.html';

test.describe('Interactive Binary Search Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('State: Idle', () => {
        test('should allow inserting a node', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('#insertBtn');
            await expect(page.locator('#bstResult')).toHaveText('Node inserted');
            await expect(page.locator('.bst-container')).toContainText('10');
        });

        test('should allow searching for a node', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('#insertBtn');
            await page.fill('#value', '10');
            await page.click('#searchBtn');
            await expect(page.locator('#bstResult')).toHaveText('Node found');
        });

        test('should allow deleting a node', async ({ page }) => {
            await page.fill('#value', '10');
            await page.click('#insertBtn');
            await page.fill('#value', '10');
            await page.click('#deleteBtn');
            await expect(page.locator('#bstResult')).toHaveText('Node deleted');
            await expect(page.locator('.bst-container')).not.toContainText('10');
        });
    });

    test.describe('State: Inserting', () => {
        test('should transition back to idle after successful insert', async ({ page }) => {
            await page.fill('#value', '20');
            await page.click('#insertBtn');
            await expect(page.locator('#bstResult')).toHaveText('Node inserted');
            await expect(page.locator('.bst-container')).toContainText('20');
        });

        test('should handle invalid input during insert', async ({ page }) => {
            await page.fill('#value', 'invalid');
            await page.click('#insertBtn');
            await expect(page.locator('#bstResult')).toHaveText('Invalid input');
        });
    });

    test.describe('State: Searching', () => {
        test('should transition back to idle after successful search', async ({ page }) => {
            await page.fill('#value', '30');
            await page.click('#insertBtn');
            await page.fill('#value', '30');
            await page.click('#searchBtn');
            await expect(page.locator('#bstResult')).toHaveText('Node found');
        });

        test('should handle invalid input during search', async ({ page }) => {
            await page.fill('#value', 'invalid');
            await page.click('#searchBtn');
            await expect(page.locator('#bstResult')).toHaveText('Invalid input');
        });
    });

    test.describe('State: Deleting', () => {
        test('should transition back to idle after successful delete', async ({ page }) => {
            await page.fill('#value', '40');
            await page.click('#insertBtn');
            await page.fill('#value', '40');
            await page.click('#deleteBtn');
            await expect(page.locator('#bstResult')).toHaveText('Node deleted');
            await expect(page.locator('.bst-container')).not.toContainText('40');
        });

        test('should handle invalid input during delete', async ({ page }) => {
            await page.fill('#value', 'invalid');
            await page.click('#deleteBtn');
            await expect(page.locator('#bstResult')).toHaveText('Invalid input');
        });
    });

    test.afterEach(async ({ page }) => {
        // Reset the state after each test if necessary
        await page.locator('#value').fill('');
        await page.locator('#bstResult').fill('');
        await page.locator('.bst-container').innerHTML = '';
    });
});