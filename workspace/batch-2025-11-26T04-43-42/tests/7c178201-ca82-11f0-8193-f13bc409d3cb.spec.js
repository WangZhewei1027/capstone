import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c178201-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Binary Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state and enable buttons', async ({ page }) => {
        // Verify that the application starts in the Idle state
        const addLeafButton = await page.locator('#add-leaf');
        const addBranchButton = await page.locator('#add-branch');
        const deleteLeafButton = await page.locator('#delete-leaf');
        const deleteBranchButton = await page.locator('#delete-branch');

        await expect(addLeafButton).toBeEnabled();
        await expect(addBranchButton).toBeEnabled();
        await expect(deleteLeafButton).toBeEnabled();
        await expect(deleteBranchButton).toBeEnabled();
    });

    test('should transition to AddingLeaf state when Add Leaf is clicked', async ({ page }) => {
        // Click the Add Leaf button and verify the transition
        await page.click('#add-leaf');

        // Check if a new leaf is added to the tree
        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toContain('Leaf');
    });

    test('should transition to AddingBranch state when Add Branch is clicked', async ({ page }) => {
        // Click the Add Branch button and verify the transition
        await page.click('#add-branch');

        // Check if a new branch is added to the tree
        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toContain('Branch');
    });

    test('should transition to DeletingLeaf state when Delete Leaf is clicked', async ({ page }) => {
        // Add a leaf first to delete it
        await page.click('#add-leaf');
        await page.click('#delete-leaf');

        // Check if the leaf is removed from the tree
        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).not.toContain('Leaf');
    });

    test('should transition to DeletingBranch state when Delete Branch is clicked', async ({ page }) => {
        // Add a branch first to delete it
        await page.click('#add-branch');
        await page.click('#delete-branch');

        // Check if the branch is removed from the tree
        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).not.toContain('Branch');
    });

    test('should handle multiple additions and deletions correctly', async ({ page }) => {
        // Add multiple leaves and branches
        await page.click('#add-leaf');
        await page.click('#add-leaf');
        await page.click('#add-branch');
        
        // Verify the tree content
        let treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toContain('Leaf');
        expect(treeContent).toContain('Branch');

        // Delete one leaf and one branch
        await page.click('#delete-leaf');
        await page.click('#delete-branch');

        // Verify the remaining content
        treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toContain('Leaf');
        expect(treeContent).not.toContain('Branch');
    });

    test('should not allow deletion when no leaf or branch is selected', async ({ page }) => {
        // Attempt to delete without adding anything
        await page.click('#delete-leaf');
        await page.click('#delete-branch');

        // Verify that no changes were made
        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toBe('');
    });
});