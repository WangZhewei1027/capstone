import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-40-02/html/5abf00d1-ca8a-11f0-8532-d714b1159c0d.html';

test.describe('Topological Sort Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should render correctly', async ({ page }) => {
        // Validate that the initial state (Idle) is rendered correctly
        const input = await page.locator('#graph');
        const button = await page.locator('#sort-btn');
        const result = await page.locator('#result');

        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter graph data (nodes and edges separated by comma)');
        await expect(button).toBeVisible();
        await expect(button).toHaveText('Sort');
        await expect(result).toHaveText('');
    });

    test('Sort button should process valid graph data', async ({ page }) => {
        // Input valid graph data and click the sort button
        await page.fill('#graph', 'A,B,C,D,E,F');
        await page.click('#sort-btn');

        // Validate the result after sorting
        const result = await page.locator('#result');
        await expect(result).toHaveText(/Topological Sort: A -> B -> C -> D -> E -> F/);
    });

    test('Sort button should handle empty input gracefully', async ({ page }) => {
        // Click the sort button without entering any graph data
        await page.click('#sort-btn');

        // Validate that the result is empty or shows an appropriate message
        const result = await page.locator('#result');
        await expect(result).toHaveText('');
    });

    test('Sort button should handle invalid graph data', async ({ page }) => {
        // Input invalid graph data
        await page.fill('#graph', 'InvalidData');
        await page.click('#sort-btn');

        // Validate that the result is empty or shows an appropriate message
        const result = await page.locator('#result');
        await expect(result).toHaveText('');
    });

    test('Sort button should process complex graph data', async ({ page }) => {
        // Input a more complex graph data
        await page.fill('#graph', 'A,B,C;B,D,E;C,F;E,F');
        await page.click('#sort-btn');

        // Validate the result after sorting
        const result = await page.locator('#result');
        await expect(result).toHaveText(/Topological Sort: A -> B -> C -> D -> E -> F/);
    });
});