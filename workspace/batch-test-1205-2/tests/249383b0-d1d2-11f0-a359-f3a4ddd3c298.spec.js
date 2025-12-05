import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/249383b0-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Binary Search Tree Visualization Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state is Idle', async ({ page }) => {
        // Verify that the input and button are present in the Idle state
        const input = await page.locator('#valueInput');
        const button = await page.locator('button[onclick="insertNode()"]');
        await expect(input).toBeVisible();
        await expect(button).toBeVisible();
    });

    test('Insert a valid node into the BST', async ({ page }) => {
        // Test inserting a valid number into the BST
        await page.fill('#valueInput', '10');
        await page.click('button[onclick="insertNode()"]');

        // Check that the node is displayed in the BST container
        const bstContainer = await page.locator('#bst-container');
        await expect(bstContainer).toContainText('10');
    });

    test('Insert multiple nodes and verify structure', async ({ page }) => {
        // Insert multiple nodes and verify the structure
        await page.fill('#valueInput', '10');
        await page.click('button[onclick="insertNode()"]');
        await page.fill('#valueInput', '5');
        await page.click('button[onclick="insertNode()"]');
        await page.fill('#valueInput', '15');
        await page.click('button[onclick="insertNode()"]');

        // Verify the nodes are displayed correctly
        const bstContainer1 = await page.locator('#bst-container');
        await expect(bstContainer).toContainText('10');
        await expect(bstContainer).toContainText('5');
        await expect(bstContainer).toContainText('15');
    });

    test('Handle invalid input gracefully', async ({ page }) => {
        // Test inserting an invalid value (non-numeric)
        await page.fill('#valueInput', 'abc');
        await page.click('button[onclick="insertNode()"]');

        // Verify that no nodes are added to the BST
        const bstContainer2 = await page.locator('#bst-container');
        await expect(bstContainer).toHaveText('');
    });

    test('Handle empty input gracefully', async ({ page }) => {
        // Test inserting an empty value
        await page.fill('#valueInput', '');
        await page.click('button[onclick="insertNode()"]');

        // Verify that no nodes are added to the BST
        const bstContainer3 = await page.locator('#bst-container');
        await expect(bstContainer).toHaveText('');
    });

    test('Verify console errors on invalid operations', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Attempt to insert an invalid node (non-numeric)
        await page.fill('#valueInput', 'invalid');
        await page.click('button[onclick="insertNode()"]');

        // Assert that there are console errors
        await expect(consoleErrors.length).toBeGreaterThan(0);
    });
});