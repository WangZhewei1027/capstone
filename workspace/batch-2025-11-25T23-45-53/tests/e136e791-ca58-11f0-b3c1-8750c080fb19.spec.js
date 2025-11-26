import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e136e791-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Red-Black Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const valueInput = await page.locator('#valueInput');
        const insertButton = await page.locator('button');
        
        // Verify the insert button is enabled
        await expect(insertButton).toBeEnabled();
        // Verify the input field is empty
        await expect(valueInput).toHaveValue('');
    });

    test('Transition from Idle to InsertingNode on valid input', async ({ page }) => {
        const valueInput = await page.locator('#valueInput');
        const insertButton = await page.locator('button');

        // Input a valid number
        await valueInput.fill('10');
        await insertButton.click();

        // Verify the input is captured and button is disabled
        await expect(valueInput).toHaveValue('10');
        await expect(insertButton).toBeDisabled();
    });

    test('Transition from InsertingNode to TreeUpdating on valid input', async ({ page }) => {
        const valueInput = await page.locator('#valueInput');
        const insertButton = await page.locator('button');

        // Input a valid number
        await valueInput.fill('20');
        await insertButton.click(); // Transition to InsertingNode

        // Click again to trigger the insertion
        await insertButton.click();

        // Verify that the tree is being updated
        const treeContainer = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText('20'); // Check if the node is inserted
    });

    test('Transition from TreeUpdating back to Idle', async ({ page }) => {
        const valueInput = await page.locator('#valueInput');
        const insertButton = await page.locator('button');

        // Input a valid number and insert
        await valueInput.fill('30');
        await insertButton.click(); // Transition to InsertingNode
        await insertButton.click(); // Transition to TreeUpdating

        // Simulate the completion of node insertion
        await page.evaluate(() => {
            const event = new Event('NODE_INSERTION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify the tree is updated and the button is enabled again
        await expect(insertButton).toBeEnabled();
        await expect(valueInput).toHaveValue('');
    });

    test('Should not insert when input is empty', async ({ page }) => {
        const insertButton = await page.locator('button');

        // Click the insert button without any input
        await insertButton.click();

        // Verify that no tree updates occur
        const treeContainer = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText(''); // No nodes should be present
    });

    test('Should handle invalid input gracefully', async ({ page }) => {
        const valueInput = await page.locator('#valueInput');
        const insertButton = await page.locator('button');

        // Input an invalid number
        await valueInput.fill('abc');
        await insertButton.click();

        // Verify that no tree updates occur
        const treeContainer = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText(''); // No nodes should be present
    });

    test('Tree should display correctly after multiple insertions', async ({ page }) => {
        const valueInput = await page.locator('#valueInput');
        const insertButton = await page.locator('button');

        // Insert multiple valid numbers
        for (const value of [10, 20, 30, 15]) {
            await valueInput.fill(value.toString());
            await insertButton.click(); // Transition to InsertingNode
            await insertButton.click(); // Transition to TreeUpdating
        }

        // Simulate the completion of node insertion
        await page.evaluate(() => {
            const event = new Event('NODE_INSERTION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Verify that the tree has been updated with all nodes
        const treeContainer = await page.locator('#tree-container');
        await expect(treeContainer).toContainText('10');
        await expect(treeContainer).toContainText('20');
        await expect(treeContainer).toContainText('30');
        await expect(treeContainer).toContainText('15');
    });
});