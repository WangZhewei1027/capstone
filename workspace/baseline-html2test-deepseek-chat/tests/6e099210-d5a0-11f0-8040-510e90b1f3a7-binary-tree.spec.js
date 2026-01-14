import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e099210-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for the Binary Tree app
class BinaryTreePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.nodeValue = page.locator('#nodeValue');
        this.traversalType = page.locator('#traversalType');
        this.addNodeBtn = page.locator('#addNodeBtn');
        this.traverseBtn = page.locator('#traverseBtn');
        this.resetBtn = page.locator('#resetBtn');
        this.treeContainer = page.locator('#tree-container');
        this.traversalOutput = page.locator('#traversal-output');
    }

    // Navigate to the application
    async goto() {
        await this.page.goto(APP_URL);
    }

    // Add a node via the UI. Accepts a number or string convertible to number.
    async addNode(value) {
        await this.nodeValue.fill(String(value));
        await this.addNodeBtn.click();
    }

    // Trigger traversal via UI
    async traverse(type) {
        await this.traversalType.selectOption(type);
        await this.traverseBtn.click();
    }

    // Reset the tree via UI
    async reset() {
        await this.resetBtn.click();
    }

    // Returns the count of node elements rendered in the tree container
    async nodeCount() {
        return await this.page.locator('#tree-container .node').count();
    }

    // Returns an array of node text contents in DOM order
    async nodeValues() {
        const nodes = this.page.locator('#tree-container .node');
        const count = await nodes.count();
        const values = [];
        for (let i = 0; i < count; i++) {
            values.push((await nodes.nth(i).textContent()).trim());
        }
        return values;
    }

    // Returns the count of connection lines rendered
    async lineCount() {
        return await this.page.locator('#tree-container .line').count();
    }

    // Get traversal output text
    async getTraversalOutput() {
        return (await this.traversalOutput.textContent()).trim();
    }

    // Press Enter in the nodeValue input
    async pressEnterOnValue() {
        await this.nodeValue.focus();
        await this.page.keyboard.press('Enter');
    }

    // Wait until traversal output contains expected substring or timeout
    async waitForTraversalOutputContains(expected, timeout = 10000) {
        await this.page.waitForFunction(
            (selector, expectedText) => {
                const el = document.querySelector(selector);
                if (!el) return false;
                return el.textContent.includes(expectedText);
            },
            '#traversal-output',
            expected,
            { timeout }
        );
    }
}

test.describe('Binary Tree Visualization - Comprehensive E2E', () => {
    // Arrays to capture console errors and page errors for each test
    let consoleErrors;
    let pageErrors;

    // Create a fresh BinaryTreePage in each test
    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        pageErrors = [];

        // Capture console error messages
        page.on('console', (msg) => {
            try {
                if (msg.type() === 'error') {
                    consoleErrors.push({
                        type: msg.type(),
                        text: msg.text()
                    });
                }
            } catch (e) {
                // Continue - we don't modify console behavior
            }
        });

        // Capture uncaught page errors (ReferenceError, TypeError, etc.)
        page.on('pageerror', (err) => {
            pageErrors.push(err);
        });

        // Navigate to the app
        const binaryTreePage = new BinaryTreePage(page);
        await binaryTreePage.goto();
    });

    test.afterEach(async () => {
        // After each test we assert there were no unexpected runtime errors
        // The application should operate without uncaught page errors or console errors.
        // If any do occur they will be surfaced here and fail the test.
        expect(pageErrors.length, `Expected no uncaught page errors, but found: ${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);
        expect(consoleErrors.length, `Expected no console errors, but found: ${consoleErrors.map(e => e.text).join('\n')}`).toBe(0);
    });

    test('Initial load: UI elements are present and default state is correct', async ({ page }) => {
        // Purpose: Verify the page loads and default UI state is as expected
        const p = new BinaryTreePage(page);

        // Page title and heading check
        await expect(page).toHaveTitle(/Binary Tree Visualization/);
        await expect(page.locator('h1')).toHaveText('Binary Tree Visualization');
        await expect(page.locator('.subtitle')).toHaveText('Visualize and understand binary tree operations');

        // Default input and traversal output
        await expect(p.nodeValue).toHaveValue('10');
        await expect(p.traversalType).toHaveValue('inorder');

        const traversalText = await p.getTraversalOutput();
        expect(traversalText).toContain('Tree is empty. Add nodes to see traversal.');

        // Tree container should be present and empty (no nodes/lines)
        expect(await p.nodeCount()).toBe(0);
        expect(await p.lineCount()).toBe(0);
    });

    test('Add nodes: clicking Add Node renders nodes and connection lines', async ({ page }) => {
        // Purpose: Test adding nodes via the Add Node button and verify DOM updates
        const p = new BinaryTreePage(page);

        // Add a root node 10, then left child 5, then right child 15 to create a simple balanced structure
        await p.addNode(10); // root
        // After adding root, nodeValue input is automatically incremented by the app; but we explicitly set values to ensure left/right placement
        await p.nodeValue.fill('5');
        await p.addNode(5);
        await p.nodeValue.fill('15');
        await p.addNode(15);

        // Wait for DOM updates
        await page.waitForSelector('#tree-container .node');

        // Expect 3 nodes in the container
        expect(await p.nodeCount()).toBe(3);

        // Node text content should include the values added
        const values = await p.nodeValues();
        // order in DOM is not guaranteed for logical tree order, so check set membership
        expect(values).toEqual(expect.arrayContaining(['10', '5', '15']));

        // For three nodes we expect two connection lines (edges)
        expect(await p.lineCount()).toBe(2);

        // Ensure nodes have inline positioning styles (left/top) so they are visible
        const nodeLocator = page.locator('#tree-container .node').first();
        const leftStyle = await nodeLocator.evaluate((el) => el.style.left);
        const topStyle = await nodeLocator.evaluate((el) => el.style.top);
        expect(leftStyle).toBeTruthy();
        expect(topStyle).toBeTruthy();
    });

    test('Traversal: In-order traversal updates traversal output and highlights nodes in sequence', async ({ page }) => {
        // Purpose: Verify traversal behavior (in-order) - traversal output and transient highlight behavior
        const p = new BinaryTreePage(page);

        // Build tree: 10 root, 5 left, 15 right
        await p.addNode(10);
        await p.nodeValue.fill('5');
        await p.addNode(5);
        await p.nodeValue.fill('15');
        await p.addNode(15);

        // Trigger in-order traversal
        await p.traverse('inorder');

        // The expected in-order sequence is: 5 → 10 → 15
        // waitForTraversalOutputContains will poll until the traversal-output includes the expected sequence
        await p.waitForTraversalOutputContains('5 → 10 → 15', 10000);

        const output = await p.getTraversalOutput();
        expect(output).toContain('5 → 10 → 15');

        // During traversal nodes are highlighted temporarily; assert at least one highlight occurred at some time
        // We poll for presence of .node.highlight for a short window (they are transient)
        const hadHighlight = await page.waitForSelector('#tree-container .node.highlight', { timeout: 3000 }).then(() => true).catch(() => false);
        expect(hadHighlight).toBe(true);
    });

    test('Traversal: Pre-order, Post-order and Level-order produce correct sequences', async ({ page }) => {
        // Purpose: Validate other traversal types generate correct outputs
        const p = new BinaryTreePage(page);

        // Build tree intentionally to produce clear traversal sequences:
        // Insert in order: 8 (root), 3 (left), 10 (right), 1 (left-left), 6 (left-right)
        await p.addNode(8);
        await p.nodeValue.fill('3');
        await p.addNode(3);
        await p.nodeValue.fill('10');
        await p.addNode(10);
        await p.nodeValue.fill('1');
        await p.addNode(1);
        await p.nodeValue.fill('6');
        await p.addNode(6);

        // Pre-order: root, left, left-left, left-right, right => 8 → 3 → 1 → 6 → 10
        await p.traverse('preorder');
        await p.waitForTraversalOutputContains('8 → 3 → 1 → 6 → 10', 15000);
        expect(await p.getTraversalOutput()).toContain('8 → 3 → 1 → 6 → 10');

        // Clear traversalOutput by resetting the tree's UI (we'll avoid resetting the tree structure in the app
        // since we want to test subsequent traversals; instead, trigger traverse again and wait for expected)
        // Post-order: left-left, left-right, left, right, root => 1 → 6 → 3 → 10 → 8
        await p.traverse('postorder');
        await p.waitForTraversalOutputContains('1 → 6 → 3 → 10 → 8', 15000);
        expect(await p.getTraversalOutput()).toContain('1 → 6 → 3 → 10 → 8');

        // Level-order: breadth-first => 8 → 3 → 10 → 1 → 6
        await p.traverse('levelorder');
        await p.waitForTraversalOutputContains('8 → 3 → 10 → 1 → 6', 15000);
        expect(await p.getTraversalOutput()).toContain('8 → 3 → 10 → 1 → 6');
    }, { timeout: 60000 });

    test('Reset button clears visualization and restores default traversal text', async ({ page }) => {
        // Purpose: Ensure Reset Tree removes nodes and restores default traversal output
        const p = new BinaryTreePage(page);

        await p.addNode(20);
        await p.nodeValue.fill('10');
        await p.addNode(10);

        // Ensure nodes exist first
        expect(await p.nodeCount()).toBeGreaterThan(0);

        // Click reset and assert container is cleared and traversal output reset
        await p.reset();

        // After reset, no nodes or lines
        expect(await p.nodeCount()).toBe(0);
        expect(await p.lineCount()).toBe(0);

        // Traversal output restored to default message
        const output = await p.getTraversalOutput();
        expect(output).toContain('Tree is empty. Add nodes to see traversal.');
    });

    test('Edge case: Adding non-numeric value does not alter tree', async ({ page }) => {
        // Purpose: Validate the application ignores NaN input when adding nodes
        const p = new BinaryTreePage(page);

        // Ensure starting empty
        expect(await p.nodeCount()).toBe(0);

        // Fill with empty string (will produce NaN when parsed) and click Add Node
        await p.nodeValue.fill('');
        await p.addNodeBtn.click();

        // No nodes should have been added
        expect(await p.nodeCount()).toBe(0);

        // The traversal output should remain the default message
        const output = await p.getTraversalOutput();
        expect(output).toContain('Tree is empty. Add nodes to see traversal.');
    });

    test('Keyboard: Pressing Enter on node value input triggers Add Node', async ({ page }) => {
        // Purpose: Test that Enter key on the node value input triggers the Add Node action
        const p = new BinaryTreePage(page);

        // Focus and set a value, then press Enter
        await p.nodeValue.fill('42');
        await p.pressEnterOnValue();

        // Wait for node to be added
        await page.waitForSelector('#tree-container .node');

        // Check that the node was created
        const values = await p.nodeValues();
        expect(values).toContain('42');
    });
});