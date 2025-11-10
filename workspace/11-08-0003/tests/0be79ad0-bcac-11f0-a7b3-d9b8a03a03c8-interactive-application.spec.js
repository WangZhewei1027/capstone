import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/0be79ad0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Dijkstra\'s Algorithm Visualizer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state is idle', async ({ page }) => {
        const consoleText = await page.locator('#console').innerText();
        expect(consoleText).toBe('');
        const nodeStyles = await page.locator('.node').evaluateAll(nodes => nodes.map(node => node.className));
        expect(nodeStyles).toEqual(expect.arrayContaining(['node']));
    });

    test('Run algorithm transitions to calculating state', async ({ page }) => {
        await page.fill('#startNode', '0');
        await page.fill('#endNode', '9');
        await page.click('#runAlgorithmButton');

        const consoleText1 = await page.locator('#console').innerText();
        expect(consoleText).toContain('Running algorithm...');
        const highlightedNode = await page.locator('.start').count();
        expect(highlightedNode).toBe(1);
    });

    test('Algorithm completes and transitions to done state', async ({ page }) => {
        await page.fill('#startNode', '0');
        await page.fill('#endNode', '9');
        await page.click('#runAlgorithmButton');
        await page.waitForTimeout(2000); // Wait for the algorithm to complete

        const consoleText2 = await page.locator('#console').innerText();
        expect(consoleText).toContain('Algorithm completed');
        const visitedNodes = await page.locator('.visited').count();
        expect(visitedNodes).toBeGreaterThan(0);
    });

    test('Reset transitions back to idle state', async ({ page }) => {
        await page.fill('#startNode', '0');
        await page.fill('#endNode', '9');
        await page.click('#runAlgorithmButton');
        await page.waitForTimeout(2000); // Wait for the algorithm to complete
        await page.click('#resetButton');

        const consoleText3 = await page.locator('#console').innerText();
        expect(consoleText).toBe('');
        const nodeStyles1 = await page.locator('.node').evaluateAll(nodes => nodes.map(node => node.className));
        expect(nodeStyles).toEqual(expect.arrayContaining(['node']));
    });

    test('Run algorithm without start node shows error', async ({ page }) => {
        await page.fill('#endNode', '9');
        await page.click('#runAlgorithmButton');

        const consoleText4 = await page.locator('#console').innerText();
        expect(consoleText).toContain('Please select a start node');
    });

    test('Run algorithm without end node shows error', async ({ page }) => {
        await page.fill('#startNode', '0');
        await page.click('#runAlgorithmButton');

        const consoleText5 = await page.locator('#console').innerText();
        expect(consoleText).toContain('Please select an end node');
    });

    test('Run algorithm with invalid node input shows error', async ({ page }) => {
        await page.fill('#startNode', 'invalid');
        await page.fill('#endNode', '9');
        await page.click('#runAlgorithmButton');

        const consoleText6 = await page.locator('#console').innerText();
        expect(consoleText).toContain('Invalid node input');
    });
});