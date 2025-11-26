import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba505d0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Binary Search Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should display the initial state of the application', async ({ page }) => {
        // Verify that the initial state is Idle
        const title = await page.locator('h2').innerText();
        expect(title).toBe('Binary Search Tree');

        const treeDiv = await page.locator('#tree').innerHTML();
        expect(treeDiv).toBe('');
    });

    test('should insert a value into the BST and transition to Tree Created state', async ({ page }) => {
        // Insert a value into the BST
        await page.fill('#root', '10');
        await page.click('button[type="submit"]');

        // Verify that the tree is displayed
        const treeDiv = await page.locator('#tree').innerHTML();
        expect(treeDiv).toContain('<span id="value">10</span>');
    });

    test('should insert multiple values into the BST', async ({ page }) => {
        // Insert first value
        await page.fill('#root', '10');
        await page.click('button[type="submit"]');
        expect(await page.locator('#tree').innerHTML()).toContain('<span id="value">10</span>');

        // Insert second value
        await page.fill('#root', '5');
        await page.click('button[type="submit"]');
        expect(await page.locator('#tree').innerHTML()).toContain('<span id="value">5</span>');

        // Insert third value
        await page.fill('#root', '15');
        await page.click('button[type="submit"]');
        expect(await page.locator('#tree').innerHTML()).toContain('<span id="value">15</span>');
    });

    test('should clear the BST and transition to Tree Cleared state', async ({ page }) => {
        // Insert a value first
        await page.fill('#root', '10');
        await page.click('button[type="submit"]');

        // Clear the BST
        await page.evaluate(() => clearTree());

        // Verify that the tree is cleared
        const treeDiv = await page.locator('#tree').innerHTML();
        expect(treeDiv).toBe('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Attempt to insert an empty value
        await page.fill('#root', '');
        await page.click('button[type="submit"]');

        // Verify that the tree remains empty
        const treeDiv = await page.locator('#tree').innerHTML();
        expect(treeDiv).toBe('');
    });

    test('should not allow duplicate values in the BST', async ({ page }) => {
        // Insert a value
        await page.fill('#root', '10');
        await page.click('button[type="submit"]');

        // Try to insert the same value again
        await page.fill('#root', '10');
        await page.click('button[type="submit"]');

        // Verify that the tree still contains only one instance of the value
        const treeDiv = await page.locator('#tree').innerHTML();
        const occurrences = (await treeDiv.match(/<span id="value">10<\/span>/g) || []).length;
        expect(occurrences).toBe(1);
    });
});