import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b74ad1-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Depth-First Search (DFS) Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        const title = await page.title();
        expect(title).toBe('Depth-First Search (DFS) Visualization');
        const header = await page.locator('h1').innerText();
        expect(header).toBe('Depth-First Search (DFS) Visualization');
    });

    test('should display nodes in the graph', async ({ page }) => {
        const nodes = await page.locator('.node');
        expect(await nodes.count()).toBe(6); // A, B, C, D, E, F, H
    });

    test('should start DFS traversal when a node is clicked', async ({ page }) => {
        await page.click('.node:has-text("A")');
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('DFS Order: A');
    });

    test('should show the "Explore Next Node" button after starting DFS', async ({ page }) => {
        await page.click('.node:has-text("A")');
        const exploreButton = page.locator('#explore');
        await expect(exploreButton).toBeVisible();
    });

    test('should display the next node in DFS order when "Explore Next Node" is clicked', async ({ page }) => {
        await page.click('.node:has-text("A")');
        await page.click('#explore');
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('DFS Order: A, B');
        
        await page.click('#explore');
        const updatedOutputText = await page.locator('#output').innerText();
        expect(updatedOutputText).toContain('DFS Order: A, B, D');
    });

    test('should not show "Explore Next Node" button if DFS is complete', async ({ page }) => {
        await page.click('.node:has-text("A")');
        for (let i = 0; i < 4; i++) {
            await page.click('#explore');
        }
        const exploreButton = page.locator('#explore');
        await expect(exploreButton).toBeHidden();
    });

    test('should handle clicking on different nodes', async ({ page }) => {
        await page.click('.node:has-text("B")');
        const outputTextB = await page.locator('#output').innerText();
        expect(outputTextB).toContain('DFS Order: B');

        await page.click('.node:has-text("C")');
        const outputTextC = await page.locator('#output').innerText();
        expect(outputTextC).toContain('DFS Order: C');
    });

    test('should reset DFS order when starting a new traversal', async ({ page }) => {
        await page.click('.node:has-text("A")');
        await page.click('#explore');
        const outputTextFirst = await page.locator('#output').innerText();
        expect(outputTextFirst).toContain('DFS Order: A, B');

        await page.click('.node:has-text("B")');
        const outputTextSecond = await page.locator('#output').innerText();
        expect(outputTextSecond).toContain('DFS Order: B');
    });

    test('should handle edge cases gracefully', async ({ page }) => {
        await page.click('.node:has-text("D")'); // D has no children
        const outputText = await page.locator('#output').innerText();
        expect(outputText).toContain('DFS Order: D');
        
        await page.click('#explore');
        const exploreButton = page.locator('#explore');
        await expect(exploreButton).toBeHidden(); // No more nodes to explore
    });
});