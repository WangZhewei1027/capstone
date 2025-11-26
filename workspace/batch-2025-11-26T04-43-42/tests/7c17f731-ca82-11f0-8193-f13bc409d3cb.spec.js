import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c17f731-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Weighted Graph Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('Initial state should be Idle', async ({ page }) => {
        // Verify that the form is enabled and ready for input
        const form = await page.locator('#graph-form');
        await expect(form).toBeVisible();
    });

    test('Adding edge with valid inputs transitions to AddingEdge', async ({ page }) => {
        // Fill in valid inputs
        await page.fill('#source', 'A');
        await page.fill('#weight', '5');
        await page.fill('#target', 'B');

        // Click the Add Edge button
        await page.click('input[type="submit"]');

        // Verify that the state transitions to AddingEdge
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('5'); // Expecting weight to be displayed
    });

    test('Adding edge with empty inputs shows error', async ({ page }) => {
        // Click the Add Edge button without filling inputs
        await page.click('input[type="submit"]');

        // Verify that an error dialog is shown
        const errorDialog = await page.locator('text=Error');
        await expect(errorDialog).toBeVisible();
    });

    test('Error dialog can be closed and returns to Idle state', async ({ page }) => {
        // Fill in valid inputs
        await page.fill('#source', 'A');
        await page.fill('#weight', '5');
        await page.fill('#target', 'B');

        // Click the Add Edge button
        await page.click('input[type="submit"]');

        // Click the Add Edge button again to trigger error
        await page.click('input[type="submit"]');

        // Verify that an error dialog is shown
        const errorDialog = await page.locator('text=Error');
        await expect(errorDialog).toBeVisible();

        // Close the error dialog by clicking Add Edge again
        await page.click('input[type="submit"]');

        // Verify that the error dialog is closed and we are back in Idle state
        await expect(errorDialog).not.toBeVisible();
    });

    test('Adding multiple edges updates the graph correctly', async ({ page }) => {
        // Add first edge
        await page.fill('#source', 'A');
        await page.fill('#weight', '5');
        await page.fill('#target', 'B');
        await page.click('input[type="submit"]');

        // Add second edge
        await page.fill('#source1', 'B');
        await page.fill('#weight1', '10');
        await page.fill('#target1', 'C');
        await page.click('input[type="submit"]');

        // Verify that both weights are displayed in the graph
        const graph = await page.locator('#graph');
        await expect(graph).toContainText('5');
        await expect(graph).toContainText('10');
    });

    test('Adding edge with invalid weight shows error', async ({ page }) => {
        // Fill in valid inputs but with invalid weight
        await page.fill('#source', 'A');
        await page.fill('#weight', '-5'); // Invalid weight
        await page.fill('#target', 'B');

        // Click the Add Edge button
        await page.click('input[type="submit"]');

        // Verify that an error dialog is shown
        const errorDialog = await page.locator('text=Error');
        await expect(errorDialog).toBeVisible();
    });

    test('Form resets after adding edge', async ({ page }) => {
        // Fill in valid inputs
        await page.fill('#source', 'A');
        await page.fill('#weight', '5');
        await page.fill('#target', 'B');

        // Click the Add Edge button
        await page.click('input[type="submit"]');

        // Verify that the form inputs are cleared
        await expect(page.locator('#source')).toHaveValue('');
        await expect(page.locator('#weight')).toHaveValue('');
        await expect(page.locator('#target')).toHaveValue('');
    });
});