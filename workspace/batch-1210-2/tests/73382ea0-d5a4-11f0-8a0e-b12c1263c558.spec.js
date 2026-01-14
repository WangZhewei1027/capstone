import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/73382ea0-d5a4-11f0-8a0e-b12c1263c558.html';

test.describe('Binary Search Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with the title', async ({ page }) => {
        // Validate that the page renders correctly in the Idle state
        const title = await page.locator('h1').innerText();
        expect(title).toBe('Binary Search Tree');

        const treeDiv = await page.locator('#tree').innerText();
        expect(treeDiv).toBe('');
    });

    test('should add values to the binary search tree and transition to Tree Updated state', async ({ page }) => {
        // Input values into the form and submit
        await page.fill('#input-field', '5,3,7');
        await page.click('button[type="submit"]');

        // Validate that the tree updates correctly
        const treeDiv = await page.locator('#tree').innerText();
        expect(treeDiv).toContain('3');
        expect(treeDiv).toContain('5');
        expect(treeDiv).toContain('7');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Submit the form with empty input
        await page.fill('#input-field', '');
        await page.click('button[type="submit"]');

        // Validate that the tree does not update
        const treeDiv = await page.locator('#tree').innerText();
        expect(treeDiv).toBe('');
    });

    test('should handle invalid input gracefully', async ({ page }) => {
        // Submit the form with invalid input
        await page.fill('#input-field', 'invalid,values');
        await page.click('button[type="submit"]');

        // Validate that the tree does not update
        const treeDiv = await page.locator('#tree').innerText();
        expect(treeDiv).toBe('');
    });

    test('should log errors to the console', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Submit the form with invalid input
        await page.fill('#input-field', '5,3,invalid');
        await page.click('button[type="submit"]');

        // Validate that an error was logged
        expect(consoleErrors.length).toBeGreaterThan(0);
    });
});