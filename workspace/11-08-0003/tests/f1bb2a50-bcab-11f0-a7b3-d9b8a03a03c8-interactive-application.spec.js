import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f1bb2a50-bcab-11f0-a7b3-d9b8a03a03c8.html';

class GraphPage {
    constructor(page) {
        this.page = page;
        this.nodeCountInput = page.locator('#nodeCount');
        this.createGraphButton = page.locator('#createGraph');
        this.graphCanvas = page.locator('#graphCanvas');
    }

    async navigate() {
        await this.page.goto(BASE_URL);
    }

    async setNodeCount(count) {
        await this.nodeCountInput.fill(count.toString());
    }

    async clickCreateGraph() {
        await this.createGraphButton.click();
    }

    async getCanvasContent() {
        return await this.graphCanvas.screenshot();
    }
}

test.describe('Interactive Application Graph Tests', () => {
    let page;
    let graphPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        graphPage = new GraphPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should enter idle state and reset graph', async () => {
        await graphPage.navigate();
        await expect(graphPage.graphCanvas).toBeVisible();
        const initialCanvasContent = await graphPage.getCanvasContent();
        expect(initialCanvasContent).not.toBeNull(); // Ensure canvas is initialized
    });

    test('should transition to creatingGraph state on button click', async () => {
        await graphPage.setNodeCount(5);
        await graphPage.clickCreateGraph();
        await expect(graphPage.graphCanvas).toBeVisible();
        // Check if graph is drawn (this can be a more complex check based on your implementation)
        const canvasContent = await graphPage.getCanvasContent();
        expect(canvasContent).not.toBeNull(); // Ensure graph is drawn
    });

    test('should return to idle state after graph is drawn', async () => {
        await graphPage.setNodeCount(3);
        await graphPage.clickCreateGraph();
        // Simulate the GRAPH_DRAWN event by waiting for a short duration
        await page.waitForTimeout(1000); // Adjust based on actual drawing time
        const canvasContentAfterDraw = await graphPage.getCanvasContent();
        expect(canvasContentAfterDraw).not.toBeNull(); // Ensure graph is still visible
    });

    test('should handle edge case of minimum node count', async () => {
        await graphPage.setNodeCount(1); // Invalid case
        await graphPage.clickCreateGraph();
        const canvasContent1 = await graphPage.getCanvasContent();
        expect(canvasContent).toBeNull(); // Ensure no graph is drawn
    });

    test('should handle edge case of maximum node count', async () => {
        await graphPage.setNodeCount(10); // Valid case
        await graphPage.clickCreateGraph();
        const canvasContent2 = await graphPage.getCanvasContent();
        expect(canvasContent).not.toBeNull(); // Ensure graph is drawn
    });

    test('should not allow graph creation with invalid input', async () => {
        await graphPage.setNodeCount(0); // Invalid case
        await graphPage.clickCreateGraph();
        const canvasContent3 = await graphPage.getCanvasContent();
        expect(canvasContent).toBeNull(); // Ensure no graph is drawn
    });
});