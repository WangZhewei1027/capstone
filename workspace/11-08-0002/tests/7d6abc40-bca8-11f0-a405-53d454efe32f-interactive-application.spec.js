import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0002/html/7d6abc40-bca8-11f0-a405-53d454efe32f.html';

test.describe('Interactive Linked List Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(0); // No nodes should be present initially
    });

    test('should add a node and transition to node_added state', async ({ page }) => {
        await page.click('#add-node');
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(1); // One node should be present
        const nodeText = await page.locator('.node').innerText();
        expect(nodeText).toBe('1'); // The node should be labeled '1'
    });

    test('should allow dragging a node and transition to dragging state', async ({ page }) => {
        await page.click('#add-node');
        const node = page.locator('.node');
        await node.dragAndDrop({ target: page.locator('#interactive-area') });
        await page.mouse.move(100, 100);
        await page.mouse.down();
        await page.mouse.move(200, 200);
        await page.mouse.up();
        const nodeOpacity = await node.evaluate(node => getComputedStyle(node).opacity);
        expect(nodeOpacity).toBe('0.5'); // Node should be semi-transparent while dragging
    });

    test('should end dragging and transition back to node_added state', async ({ page }) => {
        await page.click('#add-node');
        const node = page.locator('.node');
        await node.dragAndDrop({ target: page.locator('#interactive-area') });
        await page.mouse.down();
        await page.mouse.move(200, 200);
        await page.mouse.up();
        const nodeOpacity = await node.evaluate(node => getComputedStyle(node).opacity);
        expect(nodeOpacity).toBe('1'); // Node should be fully opaque after dragging
    });

    test('should create a link when dropping a node', async ({ page }) => {
        await page.click('#add-node'); // Add first node
        await page.click('#add-node'); // Add second node
        const nodes = await page.locator('.node');
        const firstNode = nodes.nth(0);
        const secondNode = nodes.nth(1);
        
        await firstNode.dragAndDrop({ target: secondNode });
        await page.mouse.down();
        await page.mouse.move(200, 200);
        await page.mouse.up();
        
        const links = await page.locator('.link').count();
        expect(links).toBe(1); // One link should be created
    });

    test('should reset to idle state when reset button is clicked', async ({ page }) => {
        await page.click('#add-node'); // Add a node
        await page.click('#reset'); // Reset the list
        const nodes = await page.locator('.node').count();
        expect(nodes).toBe(0); // No nodes should be present after reset
    });

    test('should handle multiple nodes and links correctly', async ({ page }) => {
        await page.click('#add-node'); // Add first node
        await page.click('#add-node'); // Add second node
        await page.click('#add-node'); // Add third node
        
        const nodes = await page.locator('.node');
        const firstNode = nodes.nth(0);
        const secondNode = nodes.nth(1);
        
        await firstNode.dragAndDrop({ target: secondNode });
        await page.mouse.down();
        await page.mouse.move(200, 200);
        await page.mouse.up();
        
        const links = await page.locator('.link').count();
        expect(links).toBe(1); // One link should be created
        
        await page.click('#reset'); // Reset the list
        const resetNodes = await page.locator('.node').count();
        expect(resetNodes).toBe(0); // No nodes should be present after reset
    });

    test('should not create links if nodes are not dropped correctly', async ({ page }) => {
        await page.click('#add-node'); // Add first node
        await page.click('#add-node'); // Add second node
        
        const nodes = await page.locator('.node');
        const firstNode = nodes.nth(0);
        const secondNode = nodes.nth(1);
        
        await firstNode.dragAndDrop({ target: page.locator('#interactive-area') });
        await page.mouse.down();
        await page.mouse.move(100, 100);
        await page.mouse.up(); // Not dropping on another node
        
        const links = await page.locator('.link').count();
        expect(links).toBe(0); // No links should be created
    });
});