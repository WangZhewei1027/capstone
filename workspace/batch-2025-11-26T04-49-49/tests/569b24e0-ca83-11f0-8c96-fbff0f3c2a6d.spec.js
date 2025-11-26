import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569b24e0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
});

test.describe('Red-Black Tree Visualization Tests', () => {
    
    test('should start in Idle state and render tree', async ({ page }) => {
        const treeVisualization = await page.locator('#tree_visualization');
        await expect(treeVisualization).toBeVisible();
    });

    test('should transition to InsertStart state on Insert button click', async ({ page }) => {
        await page.fill('#input', '10');
        await page.click('#insert');
        
        const inputHighlighted = await page.locator('#input').evaluate(el => el.classList.contains('highlight'));
        expect(inputHighlighted).toBe(true);
    });

    test('should show error alert for empty input', async ({ page }) => {
        await page.click('#insert');
        
        const errorDialog = await page.locator('#error_dialog');
        await expect(errorDialog).toBeVisible();
    });

    test('should dismiss error alert and return to Idle state', async ({ page }) => {
        await page.click('#insert');
        await page.click('#dismiss_error');

        const errorDialog = await page.locator('#error_dialog');
        await expect(errorDialog).toBeHidden();
        
        const inputValue = await page.inputValue('#input');
        expect(inputValue).toBe('');
    });

    test('should validate input and transition to InsertingNode state', async ({ page }) => {
        await page.fill('#input', '15');
        await page.click('#insert');
        
        await page.waitForTimeout(1000); // wait for validation
        const nodeCreationStarted = await page.locator('#node_creation').isVisible();
        expect(nodeCreationStarted).toBe(true);
    });

    test('should visualize the tree after node insertion', async ({ page }) => {
        await page.fill('#input', '20');
        await page.click('#insert');
        
        await page.waitForTimeout(3000); // wait for visualization
        const newNodeVisible = await page.locator('#node_20').isVisible();
        expect(newNodeVisible).toBe(true);
    });

    test('should reset the tree and return to Idle state', async ({ page }) => {
        await page.click('#reset');
        
        const resetConfirmation = await page.locator('#reset_confirmation');
        await expect(resetConfirmation).toBeVisible();
        await page.click('#confirm_reset');

        const treeVisualization = await page.locator('#tree_visualization');
        await expect(treeVisualization).toBeEmpty();
    });

    test('should handle multiple insertions correctly', async ({ page }) => {
        await page.fill('#input', '5');
        await page.click('#insert');
        await page.fill('#input', '15');
        await page.click('#insert');
        await page.fill('#input', '10');
        await page.click('#insert');

        await page.waitForTimeout(3000); // wait for all insertions
        const node5Visible = await page.locator('#node_5').isVisible();
        const node15Visible = await page.locator('#node_15').isVisible();
        const node10Visible = await page.locator('#node_10').isVisible();

        expect(node5Visible).toBe(true);
        expect(node15Visible).toBe(true);
        expect(node10Visible).toBe(true);
    });
});