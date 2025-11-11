import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-10-0003-4o-mini/html/93dd23c0-bde1-11f0-a01f-e98a4888d298.html';

test.describe('Binary Search Tree Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be idle', async ({ page }) => {
        const infoText = await page.locator('#infoText').innerText();
        expect(infoText).toBe('Insert numbers to see how a BST is formed!');
    });

    test('Clicking insert button with valid input transitions to building_bst', async ({ page }) => {
        await page.fill('#numberInput', '10');
        await page.click('#insertBtn');
        
        // Simulate the VALID_INPUT event
        await page.evaluate(() => {
            const event = new Event('VALID_INPUT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        // Check if the BST is being built
        const bstVisual = await page.locator('#bst-visual').innerHTML();
        expect(bstVisual).toContain('10'); // Assuming the node is represented in the visual
    });

    test('Clicking insert button with invalid input returns to idle', async ({ page }) => {
        await page.fill('#numberInput', 'invalid');
        await page.click('#insertBtn');

        // Simulate the INVALID_INPUT event
        await page.evaluate(() => {
            const event = new Event('INVALID_INPUT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        const infoText = await page.locator('#infoText').innerText();
        expect(infoText).toBe('Insert numbers to see how a BST is formed!');
    });

    test('Building BST transitions back to idle after completion', async ({ page }) => {
        await page.fill('#numberInput', '20');
        await page.click('#insertBtn');
        
        // Simulate the VALID_INPUT event
        await page.evaluate(() => {
            const event = new Event('VALID_INPUT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        // Simulate the BST_BUILT event
        await page.evaluate(() => {
            const event = new Event('BST_BUILT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        const infoText = await page.locator('#infoText').innerText();
        expect(infoText).toBe('Insert numbers to see how a BST is formed!');
    });

    test('Clicking a node transitions to node_clicked state', async ({ page }) => {
        await page.fill('#numberInput', '30');
        await page.click('#insertBtn');

        // Simulate the VALID_INPUT event
        await page.evaluate(() => {
            const event = new Event('VALID_INPUT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        // Simulate the BST_BUILT event
        await page.evaluate(() => {
            const event = new Event('BST_BUILT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        // Click the node
        await page.click('.node'); // Assuming a node is created and clickable
        
        // Simulate the NODE_CLICKED event
        await page.evaluate(() => {
            const event = new Event('NODE_CLICKED');
            document.querySelector('.node').dispatchEvent(event);
        });

        const infoText = await page.locator('#infoText').innerText();
        expect(infoText).toBe('Insert numbers to see how a BST is formed!');
    });

    test('Edge case: inserting duplicate values', async ({ page }) => {
        await page.fill('#numberInput', '40');
        await page.click('#insertBtn');

        // Simulate the VALID_INPUT event
        await page.evaluate(() => {
            const event = new Event('VALID_INPUT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        await page.fill('#numberInput', '40'); // Duplicate
        await page.click('#insertBtn');

        // Simulate the INVALID_INPUT event
        await page.evaluate(() => {
            const event = new Event('INVALID_INPUT');
            document.getElementById('insertBtn').dispatchEvent(event);
        });

        const infoText = await page.locator('#infoText').innerText();
        expect(infoText).toBe('Insert numbers to see how a BST is formed!');
    });
});