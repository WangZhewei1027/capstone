import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-35-35/html/bba57b00-ca89-11f0-800e-fdebe921fc5f.html';

test.describe('Adjacency List Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('Initial state should render the input form', async ({ page }) => {
        // Validate that the application starts in the Idle state
        const form = await page.locator('#input-form');
        await expect(form).toBeVisible();
    });

    test('Adding a valid vertex updates the adjacency list', async ({ page }) => {
        // Test adding a valid vertex
        await page.fill('#vertices', '5');
        await page.click('#add-button');

        // Validate the result after adding a vertex
        const result = await page.locator('#result').innerText();
        await expect(result).toContain('Vertex 1: 0 edges');
    });

    test('Adding an invalid vertex shows an alert', async ({ page }) => {
        // Test adding an invalid vertex
        await page.fill('#vertices', '1001');
        await page.click('#add-button');

        // Validate that an alert appears
        await page.waitForTimeout(100); // Wait for alert to appear
        const alertText = await page.evaluate(() => window.alert);
        await expect(alertText).toContain('Invalid vertex value. Please enter a value between 1 and 1000.');
    });

    test('Adding a valid edge updates the adjacency list', async ({ page }) => {
        // Add vertices first
        await page.fill('#vertices', '1');
        await page.click('#add-button');
        await page.fill('#vertices', '2');
        await page.click('#add-button');

        // Now add an edge
        await page.fill('#vertices', '1');
        await page.fill('#edges', '2');
        await page.click('#add-button');

        // Validate the result after adding an edge
        const result = await page.locator('#result').innerText();
        await expect(result).toContain('Vertex 1: 1 edges');
        await expect(result).toContain('Vertex 2: 1 edges');
    });

    test('Adding an edge with invalid vertices shows an alert', async ({ page }) => {
        // Test adding an edge with invalid vertices
        await page.fill('#vertices', '1');
        await page.fill('#edges', '1001');
        await page.click('#add-button');

        // Validate that an alert appears
        await page.waitForTimeout(100); // Wait for alert to appear
        const alertText = await page.evaluate(() => window.alert);
        await expect(alertText).toContain('Invalid vertex value. Please enter a value between 1 and 1000.');
    });

    test('Clearing the adjacency list resets the state', async ({ page }) => {
        // Add a vertex and an edge
        await page.fill('#vertices', '1');
        await page.click('#add-button');
        await page.fill('#vertices', '2');
        await page.click('#add-button');
        await page.fill('#vertices', '1');
        await page.fill('#edges', '2');
        await page.click('#add-button');

        // Clear the adjacency list
        await page.click('#clear-button');

        // Validate that the result shows the adjacency list is cleared
        const result = await page.locator('#result').innerText();
        await expect(result).toContain('Adjacency List:');
    });

    test('Adding an edge with incorrect direction shows an alert', async ({ page }) => {
        // Add vertices first
        await page.fill('#vertices', '2');
        await page.click('#add-button');
        await page.fill('#vertices', '1');
        await page.fill('#edges', '2');
        await page.click('#add-button');

        // Validate that an alert appears
        await page.waitForTimeout(100); // Wait for alert to appear
        const alertText = await page.evaluate(() => window.alert);
        await expect(alertText).toContain('Edge cannot be directed. Please enter the correct direction.');
    });
});