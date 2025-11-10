import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/f0affbe0-bcab-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Red-Black Tree Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in idle state', async ({ page }) => {
        const message = await page.locator('#messages').innerText();
        expect(message).toBe('');
        const visualization = await page.locator('#visualization').innerHTML();
        expect(visualization).toBe('');
    });

    test('should insert a node and transition to inserting state', async ({ page }) => {
        await page.fill('#nodeValue', '10');
        await page.click('button');
        
        // Validate visualization after insertion
        const node = await page.locator('.node').first();
        await expect(node).toBeVisible();
        const nodeColor = await node.evaluate(node => node.className);
        expect(nodeColor).toContain('black'); // Root node should be black
    });

    test('should handle invalid input and transition to error state', async ({ page }) => {
        await page.fill('#nodeValue', 'invalid');
        await page.click('button');
        
        // Validate error message
        const errorMessage = await page.locator('#messages').innerText();
        expect(errorMessage).toContain('Invalid input');
        
        // Check if visualization is empty
        const visualization1 = await page.locator('#visualization1').innerHTML();
        expect(visualization).toBe('');
    });

    test('should retry after error and return to idle state', async ({ page }) => {
        await page.fill('#nodeValue', 'invalid');
        await page.click('button');
        
        // Validate error message
        const errorMessage1 = await page.locator('#messages').innerText();
        expect(errorMessage).toContain('Invalid input');

        // Retry with valid input
        await page.fill('#nodeValue', '15');
        await page.click('button');
        
        // Validate visualization after valid insertion
        const node1 = await page.locator('.node1').first();
        await expect(node).toBeVisible();
        const nodeColor1 = await node.evaluate(node => node.className);
        expect(nodeColor).toContain('black'); // Root node should be black
    });

    test('should insert multiple nodes and visualize correctly', async ({ page }) => {
        await page.fill('#nodeValue', '20');
        await page.click('button');
        await page.fill('#nodeValue', '10');
        await page.click('button');
        await page.fill('#nodeValue', '30');
        await page.click('button');

        // Validate visualization contains multiple nodes
        const nodes = await page.locator('.node');
        expect(await nodes.count()).toBe(3); // Expecting 3 nodes
    });
});