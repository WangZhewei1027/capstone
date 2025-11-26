import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c16e5c0-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Linked List Operations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render initial state and enable controls', async ({ page }) => {
        // Validate that the initial state is Idle and controls are enabled
        const elements = await page.locator('.linked-list ul').allTextContents();
        expect(elements).toContain('Node 1');
        expect(elements).toContain('Node 2');
        expect(elements).toContain('Node 3');
    });

    test('should insert a node successfully', async ({ page }) => {
        // Simulate user clicking the Insert button with valid input
        await page.fill('input[name="nodeValue"]', 'Node 4');
        await page.click('button#insertButton');

        // Validate that the node was inserted
        const elements = await page.locator('.linked-list ul').allTextContents();
        expect(elements).toContain('Node 4');
    });

    test('should show error alert for empty input on insert', async ({ page }) => {
        // Simulate user clicking the Insert button with empty input
        await page.fill('input[name="nodeValue"]', '');
        await page.click('button#insertButton');

        // Validate that an error alert is shown
        const errorDialog = await page.locator('.error-dialog');
        await expect(errorDialog).toBeVisible();

        // Dismiss the error alert
        await page.click('button#dismissError');
        await expect(errorDialog).toBeHidden();
    });

    test('should delete a node successfully', async ({ page }) => {
        // Ensure there's a node to delete
        await page.fill('input[name="nodeValue"]', 'Node 1');
        await page.click('button#deleteButton');

        // Validate that the node was deleted
        const elements = await page.locator('.linked-list ul').allTextContents();
        expect(elements).not.toContain('Node 1');
    });

    test('should traverse the list and highlight nodes', async ({ page }) => {
        // Simulate user clicking the Traverse button
        await page.click('button#traverseButton');

        // Validate that traversal is complete and nodes are highlighted
        const traversalComplete = await page.locator('.traversal-highlight');
        await expect(traversalComplete).toBeVisible();

        // Clear traversal highlight
        await page.click('button#clearTraversal');
        await expect(traversalComplete).toBeHidden();
    });

    test('should handle deletion when no nodes exist', async ({ page }) => {
        // Simulate user clicking the Delete button with no nodes
        await page.fill('input[name="nodeValue"]', 'Node 10'); // Assuming Node 10 does not exist
        await page.click('button#deleteButton');

        // Validate that an error alert is shown
        const errorDialog = await page.locator('.error-dialog');
        await expect(errorDialog).toBeVisible();

        // Dismiss the error alert
        await page.click('button#dismissError');
        await expect(errorDialog).toBeHidden();
    });

    test.afterEach(async ({ page }) => {
        // Reset the state after each test if necessary
        await page.reload();
    });
});