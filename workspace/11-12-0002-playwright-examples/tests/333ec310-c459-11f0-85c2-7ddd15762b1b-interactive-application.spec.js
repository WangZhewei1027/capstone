import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-12-0002-playwright-examples/html/333ec310-c459-11f0-85c2-7ddd15762b1b.html';

test.describe('Interactive Binary Search Tree Exploration', () => {
    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(BASE_URL);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should be in idle state initially', async () => {
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toBe('');
    });

    test('should transition to inserting state when insert button is clicked', async () => {
        await page.fill('#node-value', '10');
        await page.click('#insert-btn');
        
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toContain('10'); // Verify node is inserted
    });

    test('should remain in idle state after node is inserted', async () => {
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toContain('10'); // Verify node is still present
    });

    test('should transition to removing state when remove button is clicked', async () => {
        await page.fill('#node-value', '10');
        await page.click('#remove-btn');
        
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).not.toContain('10'); // Verify node is removed
    });

    test('should remain in idle state after node is removed', async () => {
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).not.toContain('10'); // Verify node is still absent
    });

    test('should handle inserting multiple nodes', async () => {
        await page.fill('#node-value', '20');
        await page.click('#insert-btn');
        await page.fill('#node-value', '5');
        await page.click('#insert-btn');
        
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toContain('20');
        expect(content).toContain('5');
    });

    test('should handle removing a non-existent node gracefully', async () => {
        await page.fill('#node-value', '100'); // Non-existent node
        await page.click('#remove-btn');
        
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toContain('20'); // Verify existing node is still present
        expect(content).toContain('5');  // Verify existing node is still present
    });

    test('should handle inserting duplicate nodes', async () => {
        await page.fill('#node-value', '20'); // Duplicate node
        await page.click('#insert-btn');
        
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toContain('20'); // Verify node is still present
    });

    test('should handle removing all nodes', async () => {
        await page.fill('#node-value', '20');
        await page.click('#remove-btn');
        await page.fill('#node-value', '5');
        await page.click('#remove-btn');
        
        const bstContainer = await page.$('#bst');
        const content = await bstContainer.innerHTML();
        expect(content).toBe(''); // Verify tree is empty
    });
});