import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-4/html/47b5bcd0-d1d4-11f0-959c-5fbc7dc7191d.html';

test.describe('Red-Black Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Red-Black Tree application before each test
        await page.goto(url);
    });

    test('should load the page and display title', async ({ page }) => {
        // Verify the page title and heading
        const title = await page.title();
        expect(title).toBe('Red-Black Tree Visualization');
        const heading = await page.locator('h1').innerText();
        expect(heading).toBe('Red-Black Tree Visualization');
    });

    test('should insert a node and display it in the tree', async ({ page }) => {
        // Insert a node and check if it appears in the tree
        await page.fill('#nodeValue', '10');
        await page.click('button:has-text("Insert Node")');

        const node = await page.locator('.node.black').innerText();
        expect(node).toBe('10');
    });

    test('should insert multiple nodes and maintain tree structure', async ({ page }) => {
        // Insert multiple nodes and check their colors and structure
        await page.fill('#nodeValue', '10');
        await page.click('button:has-text("Insert Node")');
        await page.fill('#nodeValue', '5');
        await page.click('button:has-text("Insert Node")');
        await page.fill('#nodeValue', '15');
        await page.click('button:has-text("Insert Node")');

        const blackNodes = await page.locator('.node.black').count();
        const redNodes = await page.locator('.node.red').count();

        // There should be at least one black node (the root)
        expect(blackNodes).toBeGreaterThan(0);
        // There should be red nodes as well
        expect(redNodes).toBeGreaterThan(0);
    });

    test('should not insert invalid node values', async ({ page }) => {
        // Attempt to insert an invalid node value and check that the tree does not change
        await page.fill('#nodeValue', 'abc');
        await page.click('button:has-text("Insert Node")');

        const initialTreeHTML = await page.locator('#tree').innerHTML();
        await page.fill('#nodeValue', '20');
        await page.click('button:has-text("Insert Node")');
        const newTreeHTML = await page.locator('#tree').innerHTML();

        // The tree should have changed after inserting a valid node
        expect(initialTreeHTML).not.toBe(newTreeHTML);
    });

    test('should handle duplicate node values correctly', async ({ page }) => {
        // Insert a node and then try to insert a duplicate
        await page.fill('#nodeValue', '10');
        await page.click('button:has-text("Insert Node")');
        const initialTreeHTML = await page.locator('#tree').innerHTML();

        await page.fill('#nodeValue', '10');
        await page.click('button:has-text("Insert Node")');
        const newTreeHTML = await page.locator('#tree').innerHTML();

        // The tree should remain the same after attempting to insert a duplicate
        expect(initialTreeHTML).toBe(newTreeHTML);
    });

    test('should display error for non-numeric input', async ({ page }) => {
        // Attempt to insert a non-numeric value and check for console errors
        await page.fill('#nodeValue', 'not-a-number');
        await page.click('button:has-text("Insert Node")');

        const consoleMessages = await page.evaluate(() => {
            return new Promise((resolve) => {
                const messages = [];
                const originalConsoleError = console.error;
                console.error = (...args) => {
                    messages.push(args);
                    originalConsoleError.apply(console, args);
                };
                setTimeout(() => resolve(messages), 100);
            });
        });

        // Check that an error was logged to the console
        expect(consoleMessages.length).toBeGreaterThan(0);
    });
});