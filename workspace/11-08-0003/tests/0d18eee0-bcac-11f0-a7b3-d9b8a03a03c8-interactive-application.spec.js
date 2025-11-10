import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0d18eee0-bcac-11f0-a7b3-d9b8a03a03c8.html';

class BellmanFordPage {
    constructor(page) {
        this.page = page;
        this.addNodeButton = page.locator('#addNode');
        this.addEdgeButton = page.locator('#addEdge');
        this.runAlgorithmButton = page.locator('#runAlgorithm');
        this.canvas = page.locator('#canvas');
        this.message = page.locator('#message');
        this.startNodeSelect = page.locator('#startNodeSelect');
    }

    async navigate() {
        await this.page.goto(BASE_URL);
    }

    async clickAddNode(x, y) {
        await this.canvas.click({ position: { x, y } });
        await this.addNodeButton.click();
    }

    async clickAddEdge(fromNode, toNode) {
        // Assuming nodes are clicked based on their positions
        await this.canvas.click({ position: fromNode });
        await this.canvas.click({ position: toNode });
        await this.addEdgeButton.click();
    }

    async clickRunAlgorithm() {
        await this.runAlgorithmButton.click();
    }

    async getMessage() {
        return await this.message.innerText();
    }

    async getStartNodeOptions() {
        return await this.startNodeSelect.evaluate(select => Array.from(select.options).map(option => option.value));
    }
}

test.describe('Bellman-Ford Algorithm Interactive Module', () => {
    let page;
    let bellmanFordPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        bellmanFordPage = new BellmanFordPage(page);
        await bellmanFordPage.navigate();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should start in idle state', async () => {
        const message = await bellmanFordPage.getMessage();
        expect(message).toBe('');
    });

    test('should add a node and transition to addingNode state', async () => {
        await bellmanFordPage.clickAddNode(100, 100);
        const message1 = await bellmanFordPage.getMessage();
        expect(message).toContain('Node added');
        
        const options = await bellmanFordPage.getStartNodeOptions();
        expect(options.length).toBe(1);
    });

    test('should add an edge and transition to addingEdge state', async () => {
        await bellmanFordPage.clickAddNode(200, 200);
        await bellmanFordPage.clickAddEdge({ x: 100, y: 100 }, { x: 200, y: 200 });
        
        const message2 = await bellmanFordPage.getMessage();
        expect(message).toContain('Edge added');
    });

    test('should run the algorithm and transition to runningAlgorithm state', async () => {
        await bellmanFordPage.clickRunAlgorithm();
        const message3 = await bellmanFordPage.getMessage();
        expect(message).toContain('Algorithm completed');
    });

    test('should reset state after algorithm completion', async () => {
        const message4 = await bellmanFordPage.getMessage();
        expect(message).toBe('');
        
        const options1 = await bellmanFordPage.getStartNodeOptions();
        expect(options.length).toBe(2); // Two nodes should still be present
    });

    test('should handle adding a node when no nodes exist', async () => {
        await bellmanFordPage.clickAddNode(300, 300);
        const message5 = await bellmanFordPage.getMessage();
        expect(message).toContain('Node added');
        
        const options2 = await bellmanFordPage.getStartNodeOptions();
        expect(options.length).toBe(3); // Three nodes now
    });

    test('should handle adding an edge with no nodes', async () => {
        await bellmanFordPage.clickAddEdge({ x: 400, y: 400 }, { x: 500, y: 500 });
        const message6 = await bellmanFordPage.getMessage();
        expect(message).toContain('Edge cannot be added'); // Assuming this is the expected behavior
    });
});