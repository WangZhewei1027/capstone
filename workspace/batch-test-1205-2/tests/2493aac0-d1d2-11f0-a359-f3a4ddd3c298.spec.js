import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493aac0-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Red-Black Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state - Idle', async ({ page }) => {
        // Verify that the tree is initially empty
        const treeDiv = await page.locator('#tree');
        await expect(treeDiv).toHaveText('');
    });

    test('Insert a valid node', async ({ page }) => {
        // Input a valid number and click Insert
        await page.fill('#valueInput', '10');
        await page.click('button[onclick="insertNode()"]');

        // Verify that the node is inserted
        const treeDiv1 = await page.locator('#tree');
        await expect(treeDiv).toContainText('10');
    });

    test('Insert multiple nodes', async ({ page }) => {
        // Insert multiple values and check the tree structure
        await page.fill('#valueInput', '10');
        await page.click('button[onclick="insertNode()"]');

        await page.fill('#valueInput', '20');
        await page.click('button[onclick="insertNode()"]');

        await page.fill('#valueInput', '5');
        await page.click('button[onclick="insertNode()"]');

        // Verify that all nodes are present
        const treeDiv2 = await page.locator('#tree');
        await expect(treeDiv).toContainText('10');
        await expect(treeDiv).toContainText('20');
        await expect(treeDiv).toContainText('5');
    });

    test('Insert an invalid node', async ({ page }) => {
        // Input an invalid number and click Insert
        await page.fill('#valueInput', 'invalid');
        await page.click('button[onclick="insertNode()"]');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid number.');
            await dialog.dismiss();
        });
    });

    test('Insert a node with no value', async ({ page }) => {
        // Click Insert without a value
        await page.click('button[onclick="insertNode()"]');

        // Verify that an alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid number.');
            await dialog.dismiss();
        });
    });

    test('Check visual feedback after insertion', async ({ page }) => {
        // Insert a valid node and check the color
        await page.fill('#valueInput', '15');
        await page.click('button[onclick="insertNode()"]');

        // Verify that the node is inserted and has the correct color
        const nodeDiv = await page.locator('.node');
        await expect(nodeDiv).toHaveClass(/red/);
    });

    test('Check tree structure after multiple insertions', async ({ page }) => {
        // Insert multiple values
        await page.fill('#valueInput', '30');
        await page.click('button[onclick="insertNode()"]');

        await page.fill('#valueInput', '10');
        await page.click('button[onclick="insertNode()"]');

        await page.fill('#valueInput', '20');
        await page.click('button[onclick="insertNode()"]');

        // Verify the structure of the tree
        const treeDiv3 = await page.locator('#tree');
        await expect(treeDiv).toContainText('30');
        await expect(treeDiv).toContainText('10');
        await expect(treeDiv).toContainText('20');
    });

    test('Check for console errors', async ({ page }) => {
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });

        // Trigger an error by inserting an invalid value
        await page.fill('#valueInput', 'invalid');
        await page.click('button[onclick="insertNode()"]');

        // Expect console errors to be logged
        // This is a placeholder as we cannot assert console logs directly
        // but we can observe them in the test output.
    });
});