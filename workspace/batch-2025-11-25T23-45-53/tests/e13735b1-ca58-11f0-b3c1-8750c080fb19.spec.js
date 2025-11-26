import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T23-45-53/html/e13735b1-ca58-11f0-b3c1-8750c080fb19.html';

test.describe('Adjacency List Demo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test.describe('State: Idle', () => {
        test('should enable input fields on idle state', async ({ page }) => {
            const nodeInput = await page.locator('#nodeInput');
            const adjacentInput = await page.locator('#adjacentInput');
            await expect(nodeInput).toBeVisible();
            await expect(adjacentInput).toBeVisible();
        });

        test('should transition to AddingEdge state when Add Edge is clicked with valid input', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B,C');
            await page.click('button[onclick="addEdge()"]');

            // Verify input fields are cleared
            await expect(page.locator('#nodeInput')).toHaveValue('');
            await expect(page.locator('#adjacentInput')).toHaveValue('');
        });

        test('should not transition if input fields are empty', async ({ page }) => {
            await page.click('button[onclick="addEdge()"]');

            // Verify input fields remain empty
            await expect(page.locator('#nodeInput')).toHaveValue('');
            await expect(page.locator('#adjacentInput')).toHaveValue('');
        });
    });

    test.describe('State: AddingEdge', () => {
        test('should add edge and clear input fields', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B,C');
            await page.click('button[onclick="addEdge()"]');

            // Verify the graph display
            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toContainText('A: B, C');
        });

        test('should remain in AddingEdge state if input is valid and Add Edge is clicked again', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B,C');
            await page.click('button[onclick="addEdge()"]');

            // Click Add Edge again with the same input
            await page.click('button[onclick="addEdge()"]');

            // Verify the graph display remains unchanged
            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toContainText('A: B, C');
        });
    });

    test.describe('State: DisplayingGraph', () => {
        test('should display graph when Display Graph is clicked', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B,C');
            await page.click('button[onclick="addEdge()"]');
            await page.click('button[onclick="displayGraph()"]');

            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toContainText('A: B, C');
        });

        test('should clear graph display when Display Graph is clicked again', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B,C');
            await page.click('button[onclick="addEdge()"]');
            await page.click('button[onclick="displayGraph()"]');
            await page.click('button[onclick="displayGraph()"]');

            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toHaveText('');
        });
    });

    test.describe('Edge Cases', () => {
        test('should not add edge if node input is empty', async ({ page }) => {
            await page.fill('#adjacentInput', 'B,C');
            await page.click('button[onclick="addEdge()"]');

            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toHaveText('');
        });

        test('should not add edge if adjacent input is empty', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.click('button[onclick="addEdge()"]');

            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toHaveText('');
        });

        test('should handle duplicate edges gracefully', async ({ page }) => {
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B');
            await page.click('button[onclick="addEdge()"]');
            await page.fill('#nodeInput', 'A');
            await page.fill('#adjacentInput', 'B');
            await page.click('button[onclick="addEdge()"]');

            const graphDiv = await page.locator('#graph');
            await expect(graphDiv).toContainText('A: B');
        });
    });
});