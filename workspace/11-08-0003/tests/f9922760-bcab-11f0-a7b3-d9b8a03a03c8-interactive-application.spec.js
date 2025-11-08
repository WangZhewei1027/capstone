import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f9922760-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Graph Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('Initial State', () => {
        test('should be in idle state on load', async ({ page }) => {
            const infoText = await page.locator('#info').innerText();
            expect(infoText).toContain('Add nodes to the graph and connect them by dragging between them.');
            const nodesDiv = await page.locator('#nodes').innerHTML();
            expect(nodesDiv).toBe('');
        });
    });

    test.describe('Adding Nodes', () => {
        test('should transition to adding_node state when Add Node button is clicked', async ({ page }) => {
            await page.click('#btn-add');
            const nodesDiv1 = await page.locator('#nodes').innerHTML();
            expect(nodesDiv).toContain('class="node"');
        });

        test('should return to idle state after node is added', async ({ page }) => {
            await page.click('#btn-add');
            await page.waitForTimeout(100); // Simulate waiting for node to be added
            const nodesDiv2 = await page.locator('#nodes').innerHTML();
            expect(nodesDiv).toContain('class="node"');
            const infoText1 = await page.locator('#info').innerText();
            expect(infoText).toContain('Add nodes to the graph and connect them by dragging between them.');
        });
    });

    test.describe('Changing Graph Type', () => {
        test('should transition to resetting_graph state when graph type is changed', async ({ page }) => {
            await page.selectOption('#graph-type', 'directed');
            const nodesDiv3 = await page.locator('#nodes').innerHTML();
            expect(nodesDiv).toBe('');
        });

        test('should return to idle state after graph is reset', async ({ page }) => {
            await page.selectOption('#graph-type', 'directed');
            await page.waitForTimeout(100); // Simulate waiting for graph to reset
            const infoText2 = await page.locator('#info').innerText();
            expect(infoText).toContain('Add nodes to the graph and connect them by dragging between them.');
        });
    });

    test.describe('Graph Reset', () => {
        test('should reset graph display when graph type is changed', async ({ page }) => {
            await page.click('#btn-add');
            await page.selectOption('#graph-type', 'directed');
            const nodesDiv4 = await page.locator('#nodes').innerHTML();
            expect(nodesDiv).toBe('');
        });
    });

    test.describe('Edge Cases', () => {
        test('should not allow adding nodes when graph type is not selected', async ({ page }) => {
            await page.selectOption('#graph-type', 'undirected');
            await page.click('#btn-add');
            const nodesDiv5 = await page.locator('#nodes').innerHTML();
            expect(nodesDiv).toContain('class="node"');
            await page.selectOption('#graph-type', ''); // Invalid option
            await page.click('#btn-add');
            const nodesAfterInvalidAdd = await page.locator('#nodes').innerHTML();
            expect(nodesAfterInvalidAdd).toContain('class="node"');
        });
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
    });
});