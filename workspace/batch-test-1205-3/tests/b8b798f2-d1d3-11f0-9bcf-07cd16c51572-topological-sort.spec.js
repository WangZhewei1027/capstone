import { test, expect } from '@playwright/test';

const url = 'http://127.0.0.1:5500/workspace/batch-test-1205-3/html/b8b798f2-d1d3-11f0-9bcf-07cd16c51572.html';

test.describe('Topological Sort Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(url);
    });

    test('should load the page with the correct title and initial state', async ({ page }) => {
        // Verify the page title
        await expect(page).toHaveTitle('Topological Sort Demonstration');
        
        // Check that the input area and button are visible
        const edgesInput = await page.locator('#edgesInput');
        const sortButton = await page.locator('.button');
        await expect(edgesInput).toBeVisible();
        await expect(sortButton).toBeVisible();
        
        // Check that the result area is empty initially
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should perform topological sort with valid input', async ({ page }) => {
        // Input valid edges and perform the sort
        await page.fill('#edgesInput', 'A B, B C, A C');
        await page.click('.button');

        // Verify the result is displayed correctly
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText(/A -> B -> C/);
    });

    test('should handle cyclic graphs and display an error message', async ({ page }) => {
        // Input edges that create a cycle
        await page.fill('#edgesInput', 'A B, B C, C A');
        await page.click('.button');

        // Verify the result indicates a cycle
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Graph has at least one cycle!');
    });

    test('should handle empty input gracefully', async ({ page }) => {
        // Input empty edges and perform the sort
        await page.fill('#edgesInput', '');
        await page.click('.button');

        // Verify the result is empty or indicates no edges
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });

    test('should handle input with single edge', async ({ page }) => {
        // Input a single edge and perform the sort
        await page.fill('#edgesInput', 'A B');
        await page.click('.button');

        // Verify the result shows the correct order
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('A -> B');
    });

    test('should handle input with multiple edges and duplicate vertices', async ({ page }) => {
        // Input edges with duplicate vertices
        await page.fill('#edgesInput', 'A B, B C, A C, C A');
        await page.click('.button');

        // Verify the result indicates a cycle
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('Graph has at least one cycle!');
    });

    test('should show an error for invalid input format', async ({ page }) => {
        // Input an invalid format
        await page.fill('#edgesInput', 'A-B-C');
        await page.click('.button');

        // Verify the result is not as expected (error handling)
        const resultDiv = await page.locator('#result');
        await expect(resultDiv).toHaveText('');
    });
});