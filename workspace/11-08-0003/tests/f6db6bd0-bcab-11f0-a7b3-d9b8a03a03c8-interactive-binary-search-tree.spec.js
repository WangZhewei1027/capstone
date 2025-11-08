import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f6db6bd0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Binary Search Tree', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.afterEach(async ({ page }) => {
        // Optionally, reset the tree after each test
        await page.click('button:has-text("Reset Tree")');
    });

    test('should start in idle state', async ({ page }) => {
        const inputValue = await page.locator('#inputValue').inputValue();
        expect(inputValue).toBe('');
        const visualization = await page.locator('#bst-visualization').innerHTML();
        expect(visualization).toBe('');
    });

    test('should insert a node and transition to inserting state', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert Node")');

        // Verify that the tree is drawn correctly
        const visualization1 = await page.locator('#bst-visualization1').innerHTML();
        expect(visualization).toContain('10'); // Assuming the node is represented in the visualization
    });

    test('should insert multiple nodes and maintain correct structure', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert Node")');
        await page.fill('#inputValue', '5');
        await page.click('button:has-text("Insert Node")');
        await page.fill('#inputValue', '15');
        await page.click('button:has-text("Insert Node")');

        const visualization2 = await page.locator('#bst-visualization2').innerHTML();
        expect(visualization).toContain('10');
        expect(visualization).toContain('5');
        expect(visualization).toContain('15');
    });

    test('should reset the tree and return to idle state', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert Node")');
        await page.click('button:has-text("Reset Tree")');

        const inputValue1 = await page.locator('#inputValue1').inputValue1();
        expect(inputValue).toBe('');
        const visualization3 = await page.locator('#bst-visualization3').innerHTML();
        expect(visualization).toBe('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        await page.fill('#inputValue', 'invalid');
        await page.click('button:has-text("Insert Node")');

        // Check for error message or validation feedback
        const errorMessage = await page.locator('#error-message').innerText();
        expect(errorMessage).toContain('Invalid input'); // Assuming there's an error message element
    });

    test('should not allow duplicate nodes', async ({ page }) => {
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert Node")');
        await page.fill('#inputValue', '10');
        await page.click('button:has-text("Insert Node")');

        const visualization4 = await page.locator('#bst-visualization4').innerHTML();
        const nodesCount = (visualization.match(/10/g) || []).length;
        expect(nodesCount).toBe(1); // Ensure '10' is only inserted once
    });
});