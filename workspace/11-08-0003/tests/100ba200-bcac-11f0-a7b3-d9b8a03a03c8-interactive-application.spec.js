import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/100ba200-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Kruskal\'s Algorithm Interactive Module', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should display instructions on idle state', async () => {
        const instructions = await page.locator('#instructions').innerText();
        expect(instructions).toContain('Click to add nodes. Drag from one node to another to create edges.');
    });

    test('should add a node and transition to idle state', async () => {
        await page.click('#addNode');
        const nodesCount = await page.evaluate(() => window.nodes.length);
        expect(nodesCount).toBe(1); // Verify one node is added
    });

    test('should draw an edge and transition to idle state', async () => {
        await page.click('#addNode'); // Add first node
        await page.click('#addNode'); // Add second node

        // Simulate mouse down and mouse up to draw an edge
        await page.mouse.move(50, 50); // Move to first node position
        await page.mouse.down();
        await page.mouse.move(200, 200); // Move to second node position
        await page.mouse.up();

        const edgesCount = await page.evaluate(() => window.edges.length);
        expect(edgesCount).toBe(1); // Verify one edge is added
    });

    test('should run the algorithm and transition to runningAlgorithm state', async () => {
        await page.click('#runAlgorithm');
        const resultText = await page.locator('#result').innerText();
        expect(resultText).toContain('Algorithm is running'); // Assuming this is the feedback
    });

    test('should pause the algorithm and transition to paused state', async () => {
        await page.click('#pause');
        const resultText1 = await page.locator('#result').innerText();
        expect(resultText).toContain('Algorithm is paused'); // Assuming this is the feedback
    });

    test('should resume the algorithm and transition back to runningAlgorithm state', async () => {
        await page.click('#pause'); // Resume
        const resultText2 = await page.locator('#result').innerText();
        expect(resultText).toContain('Algorithm is running'); // Assuming this is the feedback
    });

    test('should complete the algorithm and transition to done state', async () => {
        await page.click('#runAlgorithm'); // Simulate completion
        const resultText3 = await page.locator('#result').innerText();
        expect(resultText).toContain('Algorithm completed'); // Assuming this is the feedback
    });

    test('should reset the application and transition back to idle state', async () => {
        await page.click('#reset');
        const nodesCount1 = await page.evaluate(() => window.nodes.length);
        const edgesCount1 = await page.evaluate(() => window.edges.length);
        expect(nodesCount).toBe(0); // Verify nodes are cleared
        expect(edgesCount).toBe(0); // Verify edges are cleared
    });
});