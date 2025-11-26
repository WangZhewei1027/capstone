import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c17d020-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Red-Black Tree Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        const tree = await page.locator('#tree');
        const content = await tree.innerHTML();
        expect(content).toContain('Root Node:');
    });

    test('Insert button should transition to InsertStart state', async ({ page }) => {
        await page.fill('input[type="text"]', '10');
        await page.click('#insertButton');

        // Verify that the input is highlighted
        const input = await page.locator('input[type="text"]');
        expect(await input.evaluate(el => el.classList.contains('highlight'))).toBe(true);
    });

    test('Inserting node should transition to DrawingTree state', async ({ page }) => {
        await page.fill('input[type="text"]', '10');
        await page.click('#insertButton');
        
        // Simulate node insertion completion
        await page.evaluate(() => {
            // Trigger the event that simulates node insertion completion
            const event = new Event('NODE_INSERTION_COMPLETE');
            document.dispatchEvent(event);
        });

        // Check if the tree has been updated
        const tree = await page.locator('#tree');
        expect(await tree.innerHTML()).toContain('10');
    });

    test('Reset button should transition to TreeResetting state', async ({ page }) => {
        await page.fill('input[type="text"]', '10');
        await page.click('#insertButton');

        // Simulate node insertion completion
        await page.evaluate(() => {
            const event = new Event('NODE_INSERTION_COMPLETE');
            document.dispatchEvent(event);
        });

        await page.click('#resetButton');

        // Verify that the tree is cleared
        const tree = await page.locator('#tree');
        expect(await tree.innerHTML()).not.toContain('10');
    });

    test('Tree should return to Idle state after reset', async ({ page }) => {
        await page.fill('input[type="text"]', '10');
        await page.click('#insertButton');

        // Simulate node insertion completion
        await page.evaluate(() => {
            const event = new Event('NODE_INSERTION_COMPLETE');
            document.dispatchEvent(event);
        });

        await page.click('#resetButton');

        // Simulate reset completion
        await page.evaluate(() => {
            const event = new Event('TREE_RESET_COMPLETE');
            document.dispatchEvent(event);
        });

        const tree = await page.locator('#tree');
        expect(await tree.innerHTML()).toContain('Root Node:');
    });

    test('Inserting invalid input should not change the state', async ({ page }) => {
        await page.fill('input[type="text"]', 'invalid');
        await page.click('#insertButton');

        // Simulate node insertion completion
        await page.evaluate(() => {
            const event = new Event('NODE_INSERTION_COMPLETE');
            document.dispatchEvent(event);
        });

        const tree = await page.locator('#tree');
        expect(await tree.innerHTML()).not.toContain('invalid');
    });

    test('Reset button should be disabled if tree is empty', async ({ page }) => {
        const resetButton = await page.locator('#resetButton');
        expect(await resetButton.isEnabled()).toBe(false);
    });
});