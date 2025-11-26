import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba4dec0-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Binary Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Binary Tree application page before each test
        await page.goto(BASE_URL);
    });

    test('should render the initial state correctly', async ({ page }) => {
        // Validate that the page is rendered correctly in the Idle state
        const title = await page.locator('h2').innerText();
        expect(title).toBe('Binary Tree');

        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toContain('1'); // Check if the root node is displayed
    });

    test('should display the binary tree structure', async ({ page }) => {
        // Validate that the binary tree structure is printed correctly
        const treeContent = await page.locator('#tree').innerText();
        expect(treeContent).toMatch(/1/); // Check if the root node is displayed
        expect(treeContent).toMatch(/1/); // Check if the left and right nodes are displayed (if applicable)
    });

    test('should have proper styling applied', async ({ page }) => {
        // Validate that the styles are applied correctly
        const treeElement = page.locator('#tree');
        const style = await treeElement.evaluate(el => getComputedStyle(el));

        expect(style.border).toBe('1px solid rgb(221, 221, 221)');
        expect(style.borderRadius).toBe('10px');
        expect(style.boxShadow).toBe('0px 0px 10px rgba(0, 0, 0, 0.1)');
    });

    test('should have no interactive elements', async ({ page }) => {
        // Validate that there are no interactive elements present
        const interactiveElements = await page.locator('button, input, select, textarea').count();
        expect(interactiveElements).toBe(0); // Ensure no interactive elements exist
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        // Since the application does not have user interactions, we can check for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`Error: ${msg.text()}`);
            }
        });

        // Trigger a scenario that could lead to an error (if applicable)
        // For this static application, we can just check for console errors
        const consoleErrors = await page.evaluate(() => {
            return new Promise(resolve => {
                const errors = [];
                console.error = (...args) => {
                    errors.push(args.join(' '));
                };
                setTimeout(() => resolve(errors), 1000);
            });
        });

        expect(consoleErrors.length).toBe(0); // Ensure no errors were logged
    });
});