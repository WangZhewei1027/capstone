import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b00-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for interacting with the Linked List page
class LinkedListPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.consoleMessages = [];
        this.pageErrors = [];
        this.dialogs = [];

        // Capture console messages
        this.page.on('console', (msg) => {
            try {
                this.consoleMessages.push({ type: msg.type(), text: msg.text() });
            } catch (e) {
                // ignore any console processing errors
            }
        });

        // Capture runtime page errors (unhandled exceptions)
        this.page.on('pageerror', (err) => {
            try {
                this.pageErrors.push(err.message || String(err));
            } catch (e) {
                // ignore
            }
        });

        // Capture dialogs (alerts) and accept them so tests continue
        this.page.on('dialog', async (dialog) => {
            try {
                this.dialogs.push(dialog.message());
                await dialog.accept();
            } catch (e) {
                // ignore
            }
        });
    }

    async goto() {
        await this.page.goto(BASE_URL);
    }

    // Input element and buttons
    nodeValueSelector() { return '#nodeValue'; }
    addButton() { return this.page.locator('button', { hasText: 'Add Node' }); }
    removeButton() { return this.page.locator('button', { hasText: 'Remove Node' }); }
    findButton() { return this.page.locator('button', { hasText: 'Find Node' }); }
    clearButton() { return this.page.locator('button', { hasText: 'Clear List' }); }
    executeButton() { return this.page.locator('button', { hasText: 'Execute Algorithm' }); }
    algorithmSelect() { return this.page.locator('#algorithm'); }
    linkedListContainer() { return this.page.locator('#linkedListContainer'); }

    // Helpers to interact with controls
    async fillValue(value) {
        await this.page.fill(this.nodeValueSelector(), String(value));
    }

    async addNode(value) {
        await this.fillValue(value);
        await this.addButton().click();
    }

    async removeNode(value) {
        await this.fillValue(value);
        await this.removeButton().click();
    }

    async findNode(value) {
        await this.fillValue(value);
        await this.findButton().click();
    }

    async clearList() {
        await this.clearButton().click();
    }

    async executeAlgorithm(name) {
        await this.algorithmSelect().selectOption({ value: name });
        await this.executeButton().click();
    }

    // DOM queries
    nodeSelectorByValue(value) {
        return this.page.locator(`#node-${value}`);
    }

    async getNodeTexts() {
        // returns array of data text content in order as rendered (ignores arrows/null)
        const container = await this.linkedListContainer();
        const nodes = await container.locator('.node .data').allTextContents();
        return nodes.map(t => t.trim());
    }

    async isEmptyMessageVisible() {
        return this.page.isVisible('#emptyMessage');
    }
}

test.describe('Linked List Visualization - End-to-End', () => {
    let page;
    let llPage;

    test.beforeEach(async ({ browser }) => {
        // Use a new context/page per test to isolate listeners
        const context = await browser.newContext();
        page = await context.newPage();
        llPage = new LinkedListPage(page);
        await llPage.goto();
    });

    test.afterEach(async () => {
        // Close the page's context to clean up listeners
        try {
            await page.context().close();
        } catch (e) {
            // ignore errors on teardown
        }
    });

    test('Initial load shows title, controls, and empty list message', async () => {
        // Verify the page title and presence of main elements
        await expect(page).toHaveTitle(/Linked List Visualization/);

        // Check controls are visible
        await expect(page.locator('#nodeValue')).toBeVisible();
        await expect(page.locator('button', { hasText: 'Add Node' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Remove Node' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Find Node' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Clear List' })).toBeVisible();
        await expect(page.locator('#algorithm')).toBeVisible();

        // The linked list container should show the empty message
        expect(await llPage.isEmptyMessageVisible()).toBe(true);

        // No nodes should exist initially
        const texts = await llPage.getNodeTexts();
        expect(texts.length).toBe(0);

        // No unhandled page errors should have occurred on initial load
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Add single node updates DOM, highlights new node briefly, and clears input', async () => {
        // Add a node with value 42
        await llPage.addNode(42);

        // Node element should exist
        const node = llPage.nodeSelectorByValue(42);
        await expect(node).toBeVisible();

        // The node should contain the data text
        await expect(node.locator('.data')).toHaveText('42');

        // Immediately after add, the node should have "new-node" class (highlight)
        await expect(node).toHaveClass(/new-node/);

        // Input should be cleared
        await expect(page.locator('#nodeValue')).toHaveValue('');

        // After 1500ms the highlight should be removed (removal occurs at 1000ms)
        await page.waitForTimeout(1500);
        await expect(node).not.toHaveClass(/new-node/);

        // Null pointer should be present after the node
        const nullPointer = page.locator('.null-pointer', { hasText: 'NULL' });
        await expect(nullPointer).toBeVisible();

        // Ensure no runtime errors happened during add
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Add multiple nodes and verify arrows and ordering', async () => {
        // Add three nodes 1, 2, 3
        await llPage.addNode(1);
        await page.waitForTimeout(50); // small delay to allow render
        await llPage.addNode(2);
        await page.waitForTimeout(50);
        await llPage.addNode(3);

        // Verify order displayed is 1, 2, 3
        const texts = await llPage.getNodeTexts();
        expect(texts).toEqual(['1', '2', '3']);

        // There should be arrow elements between nodes (count = nodes - 1)
        const arrows = await page.locator('.arrow').all();
        expect(arrows.length).toBeGreaterThanOrEqual(2);

        // The last node should be followed by NULL indicator
        const nullPointer = page.locator('.linked-list .null-pointer', { hasText: 'NULL' });
        await expect(nullPointer).toBeVisible();

        // No runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Remove existing node updates DOM; removing non-existent node shows alert', async () => {
        // Add nodes 10 and 20
        await llPage.addNode(10);
        await page.waitForTimeout(50);
        await llPage.addNode(20);

        // Remove node 10
        await llPage.removeNode(10);

        // Node 10 should no longer exist; node 20 should remain
        await expect(llPage.nodeSelectorByValue(10)).toHaveCount(0);
        await expect(llPage.nodeSelectorByValue(20)).toHaveCount(1);

        // Attempt to remove a non-existent value 999 should trigger an alert dialog
        await llPage.removeNode(999);

        // Because we accepted dialogs in the page object, the message should be captured
        // Wait a tick for dialog handling
        await page.waitForTimeout(50);
        expect(llPage.dialogs.some(msg => msg.includes('not found'))).toBeTruthy();

        // No uncaught runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Find node highlights it briefly; missing node triggers alert', async () => {
        // Add nodes 5 and 6
        await llPage.addNode(5);
        await page.waitForTimeout(50);
        await llPage.addNode(6);

        // Find node 6 -> should add 'current-node' class then remove after 2000ms
        await llPage.findNode(6);

        const node6 = llPage.nodeSelectorByValue(6);
        await expect(node6).toBeVisible();

        // Immediately highlighted
        await expect(node6).toHaveClass(/current-node/);

        // After 2200ms, highlight should be removed
        await page.waitForTimeout(2200);
        await expect(node6).not.toHaveClass(/current-node/);

        // Finding a missing node triggers an alert
        await llPage.findNode(9999);
        // wait for dialog capture
        await page.waitForTimeout(50);
        expect(llPage.dialogs.some(msg => msg.includes('not found'))).toBeTruthy();

        // No uncaught runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Traverse algorithm highlights nodes sequentially', async () => {
        // Add nodes 7 and 8
        await llPage.addNode(7);
        await page.waitForTimeout(50);
        await llPage.addNode(8);

        // Execute traverse algorithm
        await llPage.executeAlgorithm('traverse');

        // First node (7) should be highlighted shortly
        const node7 = llPage.nodeSelectorByValue(7);
        const node8 = llPage.nodeSelectorByValue(8);

        await expect(node7).toBeVisible();
        await expect(node8).toBeVisible();

        // Wait up to 1200ms for first highlight
        await page.waitForTimeout(500);
        await expect(node7).toHaveClass(/current-node/);

        // After ~1100ms the traversal should move to node 8
        await page.waitForTimeout(1100);
        await expect(node8).toHaveClass(/current-node/);

        // After traversal finishes, highlights should be removed (~1000ms after last)
        await page.waitForTimeout(1200);
        // There should be no element with current-node class
        const anyCurrent = await page.locator('.current-node').count();
        expect(anyCurrent).toBe(0);

        // No uncaught runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Reverse algorithm flips the order of nodes', async () => {
        // Ensure list is clear then add 1,2,3
        await llPage.clearList();
        await page.waitForTimeout(50);
        await llPage.addNode(1);
        await page.waitForTimeout(50);
        await llPage.addNode(2);
        await page.waitForTimeout(50);
        await llPage.addNode(3);

        // Confirm initial order
        let texts = await llPage.getNodeTexts();
        expect(texts).toEqual(['1', '2', '3']);

        // Execute reverse algorithm
        await llPage.executeAlgorithm('reverse');

        // After reverse, the order should be 3,2,1
        texts = await llPage.getNodeTexts();
        expect(texts).toEqual(['3', '2', '1']);

        // No runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Clear list removes all nodes and shows empty message', async () => {
        // Add a node then clear
        await llPage.addNode(55);
        await page.waitForTimeout(50);

        // Ensure node added
        await expect(llPage.nodeSelectorByValue(55)).toBeVisible();

        // Clear list
        await llPage.clearList();

        // Empty message visible and node removed
        expect(await llPage.isEmptyMessageVisible()).toBe(true);
        await expect(llPage.nodeSelectorByValue(55)).toHaveCount(0);

        // No runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Pressing Enter in input triggers addNode', async () => {
        // Focus input, type a value and press Enter
        const input = page.locator('#nodeValue');
        await input.fill('77');
        await input.press('Enter');

        // Node with value 77 should be added
        await expect(llPage.nodeSelectorByValue(77)).toBeVisible();

        // No runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Edge cases: adding invalid value triggers alert and does not create node', async () => {
        // Leave input blank and click Add Node -> alert for invalid number
        await page.fill('#nodeValue', '');
        await llPage.addButton().click();

        // Wait small time for dialog capture
        await page.waitForTimeout(50);
        expect(llPage.dialogs.some(msg => msg.includes('Please enter a valid number'))).toBeTruthy();

        // Ensure no node with empty id is created
        const nodes = await page.locator('.node').count();
        // nodes may be 0 or existing from prior tests in same context, but ensure no node with id node-NaN exists
        const nanNodes = await page.locator('#node-NaN').count();
        expect(nanNodes).toBe(0);

        // No uncaught runtime errors
        expect(llPage.pageErrors).toEqual([]);
    });

    test('Observe console messages and page errors across interactions', async () => {
        // Interact with the page: add and remove nodes to generate console activity if any
        await llPage.addNode(101);
        await page.waitForTimeout(50);
        await llPage.removeNode(101);
        await page.waitForTimeout(50);

        // The consoleMessages are captured; assert we have an array
        expect(Array.isArray(llPage.consoleMessages)).toBe(true);

        // Assert that there were no uncaught page errors during typical usage
        // If there are errors, this assertion will fail and surface them
        expect(llPage.pageErrors).toEqual([]);
    });
});