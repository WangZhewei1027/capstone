import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba68c71-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Prim\'s Algorithm Interactive Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application page before each test
        await page.goto(BASE_URL);
    });

    test('should display the initial state with the form', async ({ page }) => {
        // Validate that the initial state is displayed correctly
        await expect(page.locator('h1')).toHaveText("Prim's Algorithm");
        await expect(page.locator('#graph-form')).toBeVisible();
        await expect(page.locator('#vertices')).toBeVisible();
        await expect(page.locator('#edges')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toHaveText("Apply Prim's Algorithm");
    });

    test('should create a graph when valid inputs are provided', async ({ page }) => {
        // Input valid values for vertices and edges
        await page.fill('#vertices', '3');
        await page.fill('#edges', '3');

        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that the graph is created
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toHaveCount(3); // Assuming 3 edges will create 3 divs
    });

    test('should apply Prim\'s Algorithm and display results', async ({ page }) => {
        // Input valid values for vertices and edges
        await page.fill('#vertices', '3');
        await page.fill('#edges', '3');

        // Submit the form to create the graph
        await page.click('button[type="submit"]');

        // Submit again to apply Prim's Algorithm
        await page.click('button[type="submit"]');

        // Validate that the algorithm has been applied
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toHaveCount(3); // Validate the expected output after applying the algorithm
    });

    test('should show validation errors for empty inputs', async ({ page }) => {
        // Attempt to submit the form without filling inputs
        await page.click('button[type="submit"]');

        // Validate that the inputs are still required
        await expect(page.locator('#vertices')).toHaveAttribute('required', '');
        await expect(page.locator('#edges')).toHaveAttribute('required', '');
    });

    test('should handle edge cases with zero vertices and edges', async ({ page }) => {
        // Input zero vertices and edges
        await page.fill('#vertices', '0');
        await page.fill('#edges', '0');

        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that no graph is created
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toHaveCount(0); // Expect no edges or vertices to be created
    });

    test('should handle invalid input types', async ({ page }) => {
        // Input invalid values for vertices and edges
        await page.fill('#vertices', 'invalid');
        await page.fill('#edges', 'invalid');

        // Submit the form
        await page.click('button[type="submit"]');

        // Validate that the graph is not created
        const graphDiv = page.locator('#graph');
        await expect(graphDiv).toHaveCount(0); // Expect no edges or vertices to be created
    });
});