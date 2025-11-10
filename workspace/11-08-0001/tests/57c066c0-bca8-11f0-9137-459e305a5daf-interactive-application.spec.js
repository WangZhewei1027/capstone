import { test, expect } from '@playwright/test';

class LinkedListPage {
    constructor(page) {
        this.page = page;
        this.nodeInput = page.locator('#nodeInput');
        this.addNodeButton = page.locator('.add-node');
        this.listContainer = page.locator('#listContainer');
        this.output = page.locator('#output');
    }

    async addNode(value) {
        await this.nodeInput.fill(value);
        await this.addNodeButton.click();
    }

    async getNodes() {
        return await this.listContainer.locator('.node').allTextContents();
    }

    async getOutputText() {
        return await this.output.textContent();
    }

    async highlightNode(index) {
        const nodes = this.listContainer.locator('.node');
        await nodes.nth(index).click();
    }
}

test.describe('Interactive Linked List Explorer', () => {
    let page;
    let linkedListPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('http://127.0.0.1:5500/workspace/11-08-0001/html/57c066c0-bca8-11f0-9137-459e305a5daf.html');
        linkedListPage = new LinkedListPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should be in idle state initially', async () => {
        const nodes = await linkedListPage.getNodes();
        expect(nodes).toHaveLength(0);
        const outputText = await linkedListPage.getOutputText();
        expect(outputText).toBe('');
    });

    test('should add a node and transition to idle state', async () => {
        await linkedListPage.addNode('Node 1');
        const nodes = await linkedListPage.getNodes();
        expect(nodes).toEqual(['Node 1']);
        const outputText = await linkedListPage.getOutputText();
        expect(outputText).toContain('Node 1 added');
    });

    test('should add multiple nodes', async () => {
        await linkedListPage.addNode('Node 2');
        await linkedListPage.addNode('Node 3');
        const nodes = await linkedListPage.getNodes();
        expect(nodes).toEqual(['Node 1', 'Node 2', 'Node 3']);
    });

    test('should highlight a node when clicked', async () => {
        await linkedListPage.highlightNode(1); // Click on 'Node 2'
        const highlightedNode = await linkedListPage.listContainer.locator('.node.active').count();
        expect(highlightedNode).toBe(1);
    });

    test('should not add an empty node', async () => {
        await linkedListPage.addNode('');
        const nodes = await linkedListPage.getNodes();
        expect(nodes).toEqual(['Node 1', 'Node 2', 'Node 3']);
        const outputText = await linkedListPage.getOutputText();
        expect(outputText).not.toContain('added');
    });

    test('should keep the highlighted node on subsequent clicks', async () => {
        await linkedListPage.highlightNode(1); // Click on 'Node 2' again
        const highlightedNode = await linkedListPage.listContainer.locator('.node.active').count();
        expect(highlightedNode).toBe(1);
    });
});