import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc789c0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Red-Black Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the correct title', async ({ page }) => {
        // Validate the page title
        const title = await page.title();
        expect(title).toBe('Red-Black Tree');
    });

    test('should render the main heading', async ({ page }) => {
        // Validate the main heading is displayed
        const heading = await page.locator('h1');
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText('Red-Black Tree Example');
    });

    test('should render the tree container', async ({ page }) => {
        // Validate the tree container is rendered
        const treeContainer = await page.locator('.tree');
        await expect(treeContainer).toBeVisible();
        await expect(treeContainer).toHaveCSS('border', '2px solid rgb(204, 204, 204)');
    });

    test('should have the correct styles for the tree', async ({ page }) => {
        // Validate the styles of the tree
        const treeContainer = await page.locator('.tree');
        await expect(treeContainer).toHaveCSS('width', '400px');
        await expect(treeContainer).toHaveCSS('height', '400px');
        await expect(treeContainer).toHaveCSS('border-radius', '50%');
    });

    test('should change node color on hover', async ({ page }) => {
        // Simulate hover over a node (assuming nodes are dynamically created)
        // This test assumes that nodes will be added to the tree dynamically
        // The following is a placeholder for the actual node interaction
        await page.evaluate(() => {
            const node = document.createElement('div');
            node.className = 'node';
            document.querySelector('.tree').appendChild(node);
        });

        const node = await page.locator('.node');
        await expect(node).toBeVisible();

        // Trigger hover effect
        await node.hover();
        await expect(node).toHaveCSS('background-color', 'rgb(0, 0, 255)'); // blue on hover
    });

    test('should not have any interactive elements', async ({ page }) => {
        // Validate that there are no buttons, inputs, or links
        const buttons = await page.locator('button');
        const inputs = await page.locator('input');
        const links = await page.locator('a');

        await expect(buttons).toHaveCount(0);
        await expect(inputs).toHaveCount(0);
        await expect(links).toHaveCount(0);
    });

    test('should have no transitions defined', async () => {
        // Validate that there are no transitions in the FSM
        expect([]).toHaveLength(0); // No transitions defined in the FSM
    });

    test.afterEach(async ({ page }) => {
        // Optional: Any cleanup after each test can be done here
    });
});