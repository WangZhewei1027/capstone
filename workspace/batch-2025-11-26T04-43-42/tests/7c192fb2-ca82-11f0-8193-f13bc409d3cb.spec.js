import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c192fb2-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Topological Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should be in Idle state initially', async ({ page }) => {
        const graphValue = await page.locator('#graph').inputValue();
        const verticesValue = await page.locator('#vertices').inputValue();
        const edgesValue = await page.locator('#edges').inputValue();
        
        expect(graphValue).toBe('');
        expect(verticesValue).toBe('5');
        expect(edgesValue).toBe('10');
    });

    test('should transition to InputGraph state when graph is input', async ({ page }) => {
        await page.locator('#graph').fill('A->B,C\nB->C');
        await page.locator('#graph').dispatchEvent('change');

        const graphContainerContent = await page.locator('#graph-container').innerText();
        expect(graphContainerContent).toContain('A->B,C');
    });

    test('should transition to InputVertices state when vertices are input', async ({ page }) => {
        await page.locator('#vertices').fill('3');
        
        const verticesValue = await page.locator('#vertices').inputValue();
        expect(verticesValue).toBe('3');
    });

    test('should transition to InputEdges state when edges are input', async ({ page }) => {
        await page.locator('#edges').fill('5');
        
        const edgesValue = await page.locator('#edges').inputValue();
        expect(edgesValue).toBe('5');
    });

    test('should sort the graph when Sort button is clicked', async ({ page }) => {
        await page.locator('#graph').fill('A->B,C\nB->C');
        await page.locator('#sort-btn').click();

        const resultContent = await page.locator('#result').innerText();
        expect(resultContent).toContain('Sorted Vertices: A, B, C');
    });

    test('should display sorted edges when Sort button is clicked', async ({ page }) => {
        await page.locator('#graph').fill('A->B,C\nB->C');
        await page.locator('#sort-btn').click();

        const resultContent = await page.locator('#result').innerText();
        expect(resultContent).toContain('Sorted Edges: A, B\nB, C');
    });

    test('should reset inputs and return to Idle state after sorting', async ({ page }) => {
        await page.locator('#graph').fill('A->B,C\nB->C');
        await page.locator('#sort-btn').click();

        await page.locator('#sort-btn').click(); // Click again to reset

        const graphValue = await page.locator('#graph').inputValue();
        const verticesValue = await page.locator('#vertices').inputValue();
        const edgesValue = await page.locator('#edges').inputValue();
        
        expect(graphValue).toBe('');
        expect(verticesValue).toBe('5');
        expect(edgesValue).toBe('10');
    });

    test('should handle invalid graph input gracefully', async ({ page }) => {
        await page.locator('#graph').fill('Invalid Input');
        await page.locator('#sort-btn').click();

        const resultContent = await page.locator('#result').innerText();
        expect(resultContent).not.toContain('Sorted Vertices:');
        expect(resultContent).toContain('Error: Invalid graph input');
    });
});