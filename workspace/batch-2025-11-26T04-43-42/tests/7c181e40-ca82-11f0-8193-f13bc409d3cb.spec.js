import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-43-42/html/7c181e40-ca82-11f0-8193-f13bc409d3cb.html';

test.describe('Adjacency List Visualization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should start in Idle state and enable the form', async ({ page }) => {
        const addButton = await page.locator('#add-btn');
        await expect(addButton).toBeEnabled();
    });

    test('should validate input and transition to BuildingAdjacencyList state', async ({ page }) => {
        await page.fill('#source', '1:1');
        await page.fill('#target', '2:2');
        await page.fill('#adjacency-list', '1:2\n2:3');
        
        await page.click('#add-btn');

        // Check if the result is displayed correctly
        const result = await page.locator('#result');
        await expect(result).toContainText('1 -> 2');
        await expect(result).toContainText('2 -> 3');
    });

    test('should show error message when inputs are invalid', async ({ page }) => {
        await page.fill('#source', '');
        await page.fill('#target', '');
        await page.fill('#adjacency-list', '');

        await page.click('#add-btn');

        const result = await page.locator('#result');
        await expect(result).toContainText('Please fill in all fields.');
    });

    test('should clear inputs and return to Idle state after displaying results', async ({ page }) => {
        await page.fill('#source', '1:1');
        await page.fill('#target', '2:2');
        await page.fill('#adjacency-list', '1:2\n2:3');
        
        await page.click('#add-btn');

        // Check if the result is displayed correctly
        const result = await page.locator('#result');
        await expect(result).toContainText('1 -> 2');
        await expect(result).toContainText('2 -> 3');

        // Click add button again to clear inputs
        await page.click('#add-btn');

        // Check if the inputs are cleared
        await expect(page.locator('#source')).toHaveValue('');
        await expect(page.locator('#target')).toHaveValue('');
        await expect(page.locator('#adjacency-list')).toHaveValue('');
    });

    test('should handle multiple valid inputs correctly', async ({ page }) => {
        await page.fill('#source', '1:1,2:2');
        await page.fill('#target', '2:2,3:3');
        await page.fill('#adjacency-list', '1:2\n2:3');

        await page.click('#add-btn');

        const result = await page.locator('#result');
        await expect(result).toContainText('1 -> 2');
        await expect(result).toContainText('2 -> 3');
    });

    test('should show error message for incomplete inputs', async ({ page }) => {
        await page.fill('#source', '1:1');
        await page.fill('#target', '');
        await page.fill('#adjacency-list', '1:2');

        await page.click('#add-btn');

        const result = await page.locator('#result');
        await expect(result).toContainText('Please fill in all fields.');
    });
});