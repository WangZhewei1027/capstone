import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/8c933e51-d1d3-11f0-a698-d7b407715e1f.html';

test.describe('Adjacency List Demonstration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should load the page and display the title', async ({ page }) => {
        // Verify the title of the page
        const title = await page.title();
        expect(title).toBe('Adjacency List Demonstration');
    });

    test('should display initial input field and button', async ({ page }) => {
        // Check if the input field and button are visible
        const inputField = await page.locator('#graphInput');
        const button = await page.locator('button');

        await expect(inputField).toBeVisible();
        await expect(button).toBeVisible();
    });

    test('should generate adjacency list from valid input', async ({ page }) => {
        // Input valid graph edges and click the button
        await page.fill('#graphInput', 'A-B, A-C, B-C, C-D');
        await page.click('button');

        // Verify the output is as expected
        const output = await page.locator('#output');
        await expect(output).toHaveText(JSON.stringify({
            A: ['B', 'C'],
            B: ['A', 'C'],
            C: ['A', 'B', 'D'],
            D: ['C']
        }, null, 2));
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Click the button with empty input
        await page.fill('#graphInput', '');
        await page.click('button');

        // Verify that the output is empty
        const output = await page.locator('#output');
        await expect(output).toHaveText('');
    });

    test('should handle invalid input format', async ({ page }) => {
        // Input invalid graph edges and click the button
        await page.fill('#graphInput', 'A-B-C');
        await page.click('button');

        // Verify the output is as expected (should still process but may not be valid)
        const output = await page.locator('#output');
        await expect(output).toHaveText(JSON.stringify({
            A: ['B'],
            B: ['A'],
            C: []
        }, null, 2));
    });

    test('should display adjacency list correctly for multiple edges', async ({ page }) => {
        // Input multiple edges with spaces and click the button
        await page.fill('#graphInput', 'A-B, A-C, B-C, C-D, D-A');
        await page.click('button');

        // Verify the output is as expected
        const output = await page.locator('#output');
        await expect(output).toHaveText(JSON.stringify({
            A: ['B', 'C', 'D'],
            B: ['A', 'C'],
            C: ['A', 'B', 'D'],
            D: ['C', 'A']
        }, null, 2));
    });

    test('should handle duplicate edges correctly', async ({ page }) => {
        // Input duplicate edges and click the button
        await page.fill('#graphInput', 'A-B, A-B, B-C');
        await page.click('button');

        // Verify the output is as expected
        const output = await page.locator('#output');
        await expect(output).toHaveText(JSON.stringify({
            A: ['B', 'B'],
            B: ['A', 'A', 'C'],
            C: ['B']
        }, null, 2));
    });

    test('should handle single node input', async ({ page }) => {
        // Input a single node and click the button
        await page.fill('#graphInput', 'A');
        await page.click('button');

        // Verify the output is as expected
        const output = await page.locator('#output');
        await expect(output).toHaveText(JSON.stringify({
            A: []
        }, null, 2));
    });
});