import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f6448300-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Graph Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Verify that the application is in idle state
        const infoText = await page.locator('#info').innerText();
        expect(infoText).toBe('');
    });

    test('should add a node and return to idle state', async ({ page }) => {
        // Add a node and check the state transition
        await page.fill('#nodeInput', 'A');
        await page.click('#addNodeBtn');

        // Verify that the node is added visually
        const node = await page.locator('.node').first();
        await expect(node).toBeVisible();

        // Verify that the info area is empty (idle state)
        const infoText1 = await page.locator('#info').innerText();
        expect(infoText).toBe('');
    });

    test('should not add a duplicate node', async ({ page }) => {
        // Add a node
        await page.fill('#nodeInput', 'A');
        await page.click('#addNodeBtn');

        // Try to add the same node again
        await page.fill('#nodeInput', 'A');
        await page.click('#addNodeBtn');

        // Verify that the node is still there (no duplicates)
        const nodesCount = await page.locator('.node').count();
        expect(nodesCount).toBe(1);

        // Verify that the info area indicates that the node exists
        const infoText2 = await page.locator('#info').innerText();
        expect(infoText).toContain('Node already exists');
    });

    test('should handle invalid node name', async ({ page }) => {
        // Attempt to add an invalid node name
        await page.fill('#nodeInput', '');
        await page.click('#addNodeBtn');

        // Verify that no nodes are added
        const nodesCount1 = await page.locator('.node').count();
        expect(nodesCount).toBe(0);

        // Verify that the info area indicates an invalid input
        const infoText3 = await page.locator('#info').innerText();
        expect(infoText).toContain('Invalid node name');
    });

    test('should add an edge and return to idle state', async ({ page }) => {
        // Add two nodes first
        await page.fill('#nodeInput', 'A');
        await page.click('#addNodeBtn');
        await page.fill('#nodeInput', 'B');
        await page.click('#addNodeBtn');

        // Now add an edge
        await page.fill('#edgeInput', 'A->B');
        await page.click('#addEdgeBtn');

        // Verify that the edge is added visually
        const edgesCount = await page.locator('.edge').count();
        expect(edgesCount).toBe(1);

        // Verify that the info area is empty (idle state)
        const infoText4 = await page.locator('#info').innerText();
        expect(infoText).toBe('');
    });

    test('should handle invalid edge input', async ({ page }) => {
        // Add a node first
        await page.fill('#nodeInput', 'A');
        await page.click('#addNodeBtn');

        // Attempt to add an invalid edge
        await page.fill('#edgeInput', 'A->');
        await page.click('#addEdgeBtn');

        // Verify that no edges are added
        const edgesCount1 = await page.locator('.edge').count();
        expect(edgesCount).toBe(0);

        // Verify that the info area indicates an invalid input
        const infoText5 = await page.locator('#info').innerText();
        expect(infoText).toContain('Invalid edge input');
    });

    test('should clear input fields on state transitions', async ({ page }) => {
        // Add a node
        await page.fill('#nodeInput', 'A');
        await page.click('#addNodeBtn');

        // Verify input field is cleared
        const nodeInputValue = await page.locator('#nodeInput').inputValue();
        expect(nodeInputValue).toBe('');

        // Add an edge
        await page.fill('#edgeInput', 'A->B');
        await page.click('#addEdgeBtn');

        // Verify edge input field is cleared
        const edgeInputValue = await page.locator('#edgeInput').inputValue();
        expect(edgeInputValue).toBe('');
    });
});