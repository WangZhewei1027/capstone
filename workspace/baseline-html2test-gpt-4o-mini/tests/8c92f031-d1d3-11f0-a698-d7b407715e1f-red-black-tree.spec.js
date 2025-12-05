import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c92f031-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Red-Black Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        // Load the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Red-Black Tree Visualization');
    });

    test('should insert a valid number into the tree', async ({ page }) => {
        // Test inserting a valid number into the tree
        await page.fill('#insertValue', '10');
        await page.click('button');
        
        // Verify that the node is added to the DOM
        const node = await page.locator('.node').first();
        await expect(node).toHaveText('10');
        await expect(node).toHaveClass(/red/);
    });

    test('should insert multiple numbers and verify the tree structure', async ({ page }) => {
        // Test inserting multiple numbers into the tree
        await page.fill('#insertValue', '10');
        await page.click('button');
        
        await page.fill('#insertValue', '20');
        await page.click('button');
        
        await page.fill('#insertValue', '5');
        await page.click('button');
        
        // Verify the nodes are added to the DOM
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(3);
        
        // Verify the specific nodes
        await expect(nodes.nth(0)).toHaveText('10');
        await expect(nodes.nth(1)).toHaveText('20');
        await expect(nodes.nth(2)).toHaveText('5');
    });

    test('should show an alert when inserting an invalid number', async ({ page }) => {
        // Test inserting an invalid number
        await page.fill('#insertValue', 'abc');
        await page.click('button');
        
        // Verify that the alert is shown
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter a valid number');
            await dialog.dismiss();
        });
    });

    test('should maintain the correct colors for nodes after insertions', async ({ page }) => {
        // Insert numbers to check the color of nodes
        await page.fill('#insertValue', '10');
        await page.click('button');
        
        await page.fill('#insertValue', '20');
        await page.click('button');
        
        await page.fill('#insertValue', '5');
        await page.click('button');
        
        // Verify the colors of the nodes
        const firstNode = await page.locator('.node').first();
        const secondNode = await page.locator('.node').nth(1);
        const thirdNode = await page.locator('.node').nth(2);
        
        await expect(firstNode).toHaveClass(/black/); // Root should be black
        await expect(secondNode).toHaveClass(/red/); // Right child should be red
        await expect(thirdNode).toHaveClass(/red/); // Left child should be red
    });

    test('should not insert duplicate values', async ({ page }) => {
        // Test inserting a duplicate value
        await page.fill('#insertValue', '10');
        await page.click('button');
        
        await page.fill('#insertValue', '10');
        await page.click('button');
        
        // Verify that the node count remains the same
        const nodes = await page.locator('.node');
        await expect(nodes).toHaveCount(1); // Should still have only one node
    });
});