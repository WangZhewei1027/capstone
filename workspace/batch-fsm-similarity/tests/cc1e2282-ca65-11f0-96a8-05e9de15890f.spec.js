import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e2282-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Depth-First Search Visualizer Tests', () => {
    test('should initialize with an empty graph', async ({ page }) => {
        const timesList = await page.locator('#timesList').innerText();
        const adjList = await page.locator('#adjList').innerText();
        expect(timesList).toBe('-');
        expect(adjList).toBe('-');
    });

    test('should randomize graph and update nodes and edges', async ({ page }) => {
        await page.click('#randomize');
        const nodes = await page.locator('svg g[data-node]').count();
        const edges = await page.locator('svg g[data-edge-idx]').count();
        expect(nodes).toBeGreaterThan(0);
        expect(edges).toBeGreaterThan(0);
    });

    test('should alert when trying to run DFS on an empty graph', async ({ page }) => {
        await page.click('#run');
        const alert = await page.waitForEvent('dialog');
        expect(alert.message()).toBe('No nodes to run DFS on.');
        await alert.dismiss();
    });

    test('should run DFS on a populated graph', async ({ page }) => {
        await page.click('#randomize');
        await page.selectOption('#startNode', '0');
        await page.click('#run');
        await page.waitForTimeout(1000); // wait for DFS to run
        const timesList = await page.locator('#timesList').innerText();
        expect(timesList).not.toBe('-');
    });

    test('should step through the DFS process', async ({ page }) => {
        await page.click('#randomize');
        await page.selectOption('#startNode', '0');
        await page.click('#run');
        await page.click('#stepBtn');
        await page.waitForTimeout(500); // wait for a step to process
        const stackView = await page.locator('#stackView').innerText();
        expect(stackView).toContain('Stack:');
    });

    test('should play and pause the DFS animation', async ({ page }) => {
        await page.click('#randomize');
        await page.selectOption('#startNode', '0');
        await page.click('#playBtn');
        await page.waitForTimeout(2000); // let it play for a while
        await page.click('#pauseBtn');
        const automator = await page.evaluate(() => window.automator);
        expect(automator).toBeNull(); // ensure automator is cleared
    });

    test('should reset the graph', async ({ page }) => {
        await page.click('#randomize');
        await page.click('#resetBtn');
        const nodes = await page.locator('svg g[data-node]').count();
        expect(nodes).toBe(0);
    });

    test('should toggle directed edges', async ({ page }) => {
        await page.click('#randomize');
        await page.selectOption('#directed', 'false');
        const directedValue = await page.locator('#directed').inputValue();
        expect(directedValue).toBe('false');
    });

    test('should clear edges and nodes', async ({ page }) => {
        await page.click('#randomize');
        await page.click('#clearEdges');
        const edges = await page.locator('svg g[data-edge-idx]').count();
        expect(edges).toBe(0);
        await page.click('#clearNodes');
        const nodes = await page.locator('svg g[data-node]').count();
        expect(nodes).toBe(0);
    });

    test('should show and hide explanation', async ({ page }) => {
        await page.click('#explainBtn');
        const explainTextVisible = await page.locator('#explainText').isVisible();
        expect(explainTextVisible).toBe(true);
        await page.click('#explainBtn');
        const explainTextHidden = await page.locator('#explainText').isVisible();
        expect(explainTextHidden).toBe(false);
    });

    test('should drag nodes and update positions', async ({ page }) => {
        await page.click('#randomize');
        const initialPosition = await page.locator('svg g[data-node]').first().boundingBox();
        await page.mouse.move(initialPosition.x + 10, initialPosition.y + 10);
        await page.mouse.down();
        await page.mouse.move(initialPosition.x + 100, initialPosition.y + 100);
        await page.mouse.up();
        const newPosition = await page.locator('svg g[data-node]').first().boundingBox();
        expect(newPosition.x).not.toEqual(initialPosition.x);
        expect(newPosition.y).not.toEqual(initialPosition.y);
    });

    test('should toggle edges between nodes', async ({ page }) => {
        await page.click('#randomize');
        await page.selectOption('#startNode', '0');
        await page.mouse.click(100, 100); // click on a node
        await page.mouse.click(200, 200); // click on another node to toggle edge
        const edges = await page.locator('svg g[data-edge-idx]').count();
        expect(edges).toBeGreaterThan(0);
    });

    test('should handle keyboard step event', async ({ page }) => {
        await page.click('#randomize');
        await page.selectOption('#startNode', '0');
        await page.click('#run');
        await page.keyboard.press('Space');
        await page.waitForTimeout(500); // wait for a step to process
        const stackView = await page.locator('#stackView').innerText();
        expect(stackView).toContain('Stack:');
    });
});