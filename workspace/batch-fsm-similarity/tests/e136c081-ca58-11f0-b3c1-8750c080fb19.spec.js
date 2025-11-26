import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e136c081-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Binary Tree Visualization Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const button = await page.locator('button');
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Create Binary Tree');
    });

    test('Clicking Create Binary Tree button transitions to CreatingTree', async ({ page }) => {
        const button = await page.locator('button');
        await button.click();
        
        // Verify that the button is disabled after click
        await expect(button).toBeDisabled();
        
        // Check if the tree is being initialized
        const treeContainer = await page.locator('#tree');
        await expect(treeContainer).toBeEmpty();
    });

    test('Creating tree should transition to DrawingTree', async ({ page }) => {
        const button = await page.locator('button');
        await button.click(); // Transition to CreatingTree
        await button.click(); // Transition to DrawingTree
        
        // Verify that the tree visualization is drawn
        const treeContainer = await page.locator('#tree');
        await expect(treeContainer).not.toBeEmpty();
        
        // Check for nodes in the tree
        const nodes = await treeContainer.locator('.node');
        await expect(nodes).toHaveCount(7); // Expecting 7 nodes based on the values inserted
    });

    test('Clicking Create Binary Tree again resets to Idle', async ({ page }) => {
        const button = await page.locator('button');
        await button.click(); // Transition to CreatingTree
        await button.click(); // Transition to DrawingTree
        await button.click(); // Reset to Idle
        
        // Verify that the tree is cleared
        const treeContainer = await page.locator('#tree');
        await expect(treeContainer).toBeEmpty();
        
        // Check if the button is enabled again
        await expect(button).toBeEnabled();
    });

    test('Edge case: Click Create Binary Tree multiple times', async ({ page }) => {
        const button = await page.locator('button');
        await button.click(); // Transition to CreatingTree
        await button.click(); // Transition to DrawingTree
        
        // Click again to reset
        await button.click(); // Reset to Idle
        await expect(button).toBeEnabled();
        
        // Click again to create a new tree
        await button.click(); // Transition to CreatingTree
        await button.click(); // Transition to DrawingTree
        
        // Verify that the tree visualization is drawn again
        const treeContainer = await page.locator('#tree');
        await expect(treeContainer).not.toBeEmpty();
        
        const nodes = await treeContainer.locator('.node');
        await expect(nodes).toHaveCount(7); // Expecting 7 nodes again
    });

    test('Visual feedback on tree creation', async ({ page }) => {
        const button = await page.locator('button');
        await button.click(); // Transition to CreatingTree
        await button.click(); // Transition to DrawingTree
        
        // Verify that nodes are visually represented
        const nodes = await page.locator('.node');
        for (let i = 0; i < await nodes.count(); i++) {
            const node = nodes.nth(i);
            await expect(node).toBeVisible();
        }
    });
});