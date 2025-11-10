import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f46eb190-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Red-Black Tree Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in idle state on initial load', async ({ page }) => {
        const treeContainer = await page.locator('#tree-container');
        await expect(treeContainer).toBeVisible();
    });

    test('should insert a valid number and transition to inserting state', async ({ page }) => {
        await page.fill('#valueInput', '10');
        await page.click('#insertButton');

        // Assuming insertion triggers a redraw of the tree
        const treeContainer1 = await page.locator('#tree-container');
        await expect(treeContainer).toHaveText('10'); // Check if the tree contains the inserted value
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#valueInput', 'invalid');
        await page.click('#insertButton');

        // Check that the tree remains unchanged
        const treeContainer2 = await page.locator('#tree-container');
        await expect(treeContainer).not.toHaveText('invalid'); // Invalid input should not be inserted
    });

    test('should insert multiple valid numbers and maintain tree properties', async ({ page }) => {
        const valuesToInsert = [20, 15, 25, 10, 5];
        for (const value of valuesToInsert) {
            await page.fill('#valueInput', value.toString());
            await page.click('#insertButton');
        }

        // Check if all values are present in the tree
        const treeContainer3 = await page.locator('#tree-container');
        for (const value of valuesToInsert) {
            await expect(treeContainer).toHaveText(value.toString());
        }
    });

    test('should not allow insertion of duplicate values', async ({ page }) => {
        await page.fill('#valueInput', '30');
        await page.click('#insertButton');
        await page.fill('#valueInput', '30');
        await page.click('#insertButton');

        const treeContainer4 = await page.locator('#tree-container');
        const count = await treeContainer.evaluate(node => {
            return Array.from(node.childNodes).filter(child => child.textContent === '30').length;
        });

        expect(count).toBe(1); // Ensure '30' is only inserted once
    });

    test('should visualize the tree structure correctly after multiple insertions', async ({ page }) => {
        const valuesToInsert1 = [40, 35, 45, 30];
        for (const value of valuesToInsert) {
            await page.fill('#valueInput', value.toString());
            await page.click('#insertButton');
        }

        // Validate the visual representation of the tree
        const treeNodes = await page.locator('.node');
        expect(await treeNodes.count()).toBeGreaterThan(0); // Ensure there are nodes in the tree
    });

    test.afterEach(async ({ page }) => {
        // Optionally, reset the application state if needed
        await page.evaluate(() => {
            document.getElementById('tree-container').innerHTML = ''; // Clear the tree for the next test
        });
    });
});