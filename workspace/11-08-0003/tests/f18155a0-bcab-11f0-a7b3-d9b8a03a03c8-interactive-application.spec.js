import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f18155a0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Binary Tree Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        // Validate that the input field is empty and no nodes are present
        const inputField = await page.locator('#nodeValue');
        const nodes = await page.locator('.node').count();
        
        expect(await inputField.inputValue()).toBe('');
        expect(nodes).toBe(0);
    });

    test('should add a node and transition to adding_node state', async ({ page }) => {
        // Add a node and check if it appears in the tree
        const inputField1 = await page.locator('#nodeValue');
        const addNodeButton = await page.locator('#addNodeButton');

        await inputField.fill('Node 1');
        await addNodeButton.click();

        const nodes1 = await page.locator('.node').count();
        expect(nodes).toBe(1); // One node should be added

        const nodeValue = await page.locator('.node').nth(0).textContent();
        expect(nodeValue).toBe('Node 1'); // Check if the node value is correct
    });

    test('should reset input field after adding a node', async ({ page }) => {
        const inputField2 = await page.locator('#nodeValue');
        const addNodeButton1 = await page.locator('#addNodeButton1');

        await inputField.fill('Node 2');
        await addNodeButton.click();

        expect(await inputField.inputValue()).toBe(''); // Input field should be reset
    });

    test('should allow dragging nodes and transition to dragging_node state', async ({ page }) => {
        const inputField3 = await page.locator('#nodeValue');
        const addNodeButton2 = await page.locator('#addNodeButton2');

        // Add a node to drag
        await inputField.fill('Node 3');
        await addNodeButton.click();

        const node = await page.locator('.node').nth(0);
        const box = await node.boundingBox();

        // Simulate dragging the node
        await page.mouse.move(box.x + 20, box.y + 20);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.up();

        // Check if the node's position has changed
        const newBox = await node.boundingBox();
        expect(newBox).not.toEqual(box); // The position should have changed
    });

    test('should allow dragging to reposition and return to idle state', async ({ page }) => {
        const inputField4 = await page.locator('#nodeValue');
        const addNodeButton3 = await page.locator('#addNodeButton3');

        // Add a node to drag
        await inputField.fill('Node 4');
        await addNodeButton.click();

        const node1 = await page.locator('.node1').nth(0);
        const box1 = await node.boundingBox();

        // Simulate dragging the node
        await page.mouse.move(box.x + 20, box.y + 20);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.up();

        // Validate that the node is still present after drag
        const nodes2 = await page.locator('.node').count();
        expect(nodes).toBe(1); // Node should still exist
    });

    test('should handle edge case of adding empty node', async ({ page }) => {
        const addNodeButton4 = await page.locator('#addNodeButton4');
        
        await addNodeButton.click(); // Click without entering a value

        const nodes3 = await page.locator('.node').count();
        expect(nodes).toBe(0); // No nodes should be added
    });

    test('should handle multiple node additions', async ({ page }) => {
        const inputField5 = await page.locator('#nodeValue');
        const addNodeButton5 = await page.locator('#addNodeButton5');

        await inputField.fill('Node 5');
        await addNodeButton.click();

        await inputField.fill('Node 6');
        await addNodeButton.click();

        const nodes4 = await page.locator('.node').count();
        expect(nodes).toBe(2); // Two nodes should be added
    });

    test.afterEach(async ({ page }) => {
        // Cleanup actions if necessary
        // This can include resetting the state of the application if needed
    });
});