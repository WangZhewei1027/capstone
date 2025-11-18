import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-18-0002/html/66f8b910-c466-11f0-be4b-41561101a3d0.html';

test.describe('Interactive Binary Search Tree Exploration', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application before each test
        await page.goto(BASE_URL);
    });

    test('should add a node to the BST and display it', async ({ page }) => {
        // Test adding a node
        await page.fill('#valueInput', '10');
        await page.click('#addButton');

        // Verify output message
        const output = await page.textContent('#output');
        expect(output).toBe('Added: 10');

        // Verify that the node is drawn in the BST
        const node = await page.locator('.node').first();
        expect(await node.innerText()).toBe('10');
    });

    test('should add multiple nodes and display them correctly', async ({ page }) => {
        // Add multiple nodes
        await page.fill('#valueInput', '10');
        await page.click('#addButton');
        await page.fill('#valueInput', '5');
        await page.click('#addButton');
        await page.fill('#valueInput', '15');
        await page.click('#addButton');

        // Verify output message for last added node
        const output = await page.textContent('#output');
        expect(output).toBe('Added: 15');

        // Verify that all nodes are drawn in the BST
        const nodes = await page.locator('.node');
        expect(await nodes.count()).toBe(3);
        expect(await nodes.nth(0).innerText()).toBe('10');
        expect(await nodes.nth(1).innerText()).toBe('5');
        expect(await nodes.nth(2).innerText()).toBe('15');
    });

    test('should search for an existing node and display found message', async ({ page }) => {
        // Add a node first
        await page.fill('#valueInput', '10');
        await page.click('#addButton');

        // Now search for the added node
        await page.fill('#valueInput', '10');
        await page.click('#searchButton');

        // Verify output message
        const output = await page.textContent('#output');
        expect(output).toBe('Found: 10');
    });

    test('should search for a non-existing node and display not found message', async ({ page }) => {
        // Add a node first
        await page.fill('#valueInput', '10');
        await page.click('#addButton');

        // Now search for a non-existing node
        await page.fill('#valueInput', '20');
        await page.click('#searchButton');

        // Verify output message
        const output = await page.textContent('#output');
        expect(output).toBe('Not Found: 20');
    });

    test('should handle edge case of adding a duplicate node', async ({ page }) => {
        // Add a node
        await page.fill('#valueInput', '10');
        await page.click('#addButton');

        // Attempt to add the same node again
        await page.fill('#valueInput', '10');
        await page.click('#addButton');

        // Verify output message for the last added node
        const output = await page.textContent('#output');
        expect(output).toBe('Added: 10'); // Assuming the application allows duplicates
    });

    test('should handle empty input for adding a node', async ({ page }) => {
        // Attempt to add an empty node
        await page.click('#addButton');

        // Verify output message (assuming the application handles this gracefully)
        const output = await page.textContent('#output');
        expect(output).toBe('Added: NaN'); // Assuming NaN is returned for empty input
    });

    test('should handle empty input for searching a node', async ({ page }) => {
        // Attempt to search with empty input
        await page.click('#searchButton');

        // Verify output message (assuming the application handles this gracefully)
        const output = await page.textContent('#output');
        expect(output).toBe('Not Found: NaN'); // Assuming NaN is returned for empty input
    });
});