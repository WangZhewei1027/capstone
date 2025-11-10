import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/fe240b90-bcab-11f0-a7b3-d9b8a03a03c8.html';

class GraphPage {
    constructor(page) {
        this.page = page;
        this.addNodeButton = page.locator('#addNode');
        this.toggleDirectedButton = page.locator('#toggleDirected');
        this.graphArea = page.locator('#graphArea');
        this.statusMessage = page.locator('#statusMessage');
    }

    async navigate() {
        await this.page.goto(BASE_URL);
    }

    async addNode() {
        await this.addNodeButton.click();
    }

    async toggleDirected() {
        await this.toggleDirectedButton.click();
    }

    async getStatusMessage() {
        return await this.statusMessage.textContent();
    }

    async getNodeCount() {
        return await this.graphArea.locator('.node').count();
    }

    async getEdgeCount() {
        return await this.graphArea.locator('.edge').count();
    }

    async clickNode(index) {
        const nodes = this.graphArea.locator('.node');
        await nodes.nth(index).click();
    }
}

test.describe('Interactive Graph Application Tests', () => {
    let page;
    let graphPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        graphPage = new GraphPage(page);
        await graphPage.navigate();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Initial state is idle', async () => {
        const status = await graphPage.getStatusMessage();
        expect(status).toContain('Click "Add Node" to create new nodes.');
    });

    test('Add Node transitions to node_added state', async () => {
        await graphPage.addNode();
        const nodeCount = await graphPage.getNodeCount();
        expect(nodeCount).toBe(1);
        const status1 = await graphPage.getStatusMessage();
        expect(status).toContain('Node added');
    });

    test('Add Node multiple times', async () => {
        await graphPage.addNode();
        await graphPage.addNode();
        const nodeCount1 = await graphPage.getNodeCount();
        expect(nodeCount).toBe(3);
    });

    test('Select Node after adding two nodes transitions to waiting_for_second_node', async () => {
        await graphPage.addNode();
        await graphPage.addNode();
        await graphPage.clickNode(0);
        await graphPage.clickNode(1);
        const edgeCount = await graphPage.getEdgeCount();
        expect(edgeCount).toBe(1);
        const status2 = await graphPage.getStatusMessage();
        expect(status).toContain('Edge created');
    });

    test('Toggle Directed transitions to directed_toggled state', async () => {
        await graphPage.toggleDirected();
        const status3 = await graphPage.getStatusMessage();
        expect(status).toContain('Graph type toggled');
    });

    test('Add Node after toggling directed', async () => {
        await graphPage.toggleDirected();
        await graphPage.addNode();
        const nodeCount2 = await graphPage.getNodeCount();
        expect(nodeCount).toBe(4);
    });

    test('Select Node after toggling directed transitions to waiting_for_second_node', async () => {
        await graphPage.clickNode(2);
        await graphPage.clickNode(3);
        const edgeCount1 = await graphPage.getEdgeCount();
        expect(edgeCount).toBe(2);
    });

    test('Edge creation without selecting second node', async () => {
        await graphPage.addNode();
        await graphPage.clickNode(0);
        const status4 = await graphPage.getStatusMessage();
        expect(status).toContain('Please select a second node.');
    });
});