import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569b7300-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Graph Application Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
    });

    test('should render the graph in idle state', async ({ page }) => {
        const canvas = await page.locator('canvas#myCanvas');
        await expect(canvas).toBeVisible();
        // Check if controls are enabled
        const addNodeButton = await page.locator('button#addNode');
        await expect(addNodeButton).toBeEnabled();
    });

    test('should transition to AddingNode state when Add Node button is clicked', async ({ page }) => {
        await page.click('button#addNode');
        // Verify the transition to AddingNode state
        await expect(page.locator('input#nodeInput')).toBeVisible();
        await expect(page.locator('canvas#myCanvas')).toHaveCSS('border', '2px solid blue'); // Assuming highlightCanvas changes border
    });

    test('should return to Idle state after adding a node', async ({ page }) => {
        await page.click('button#addNode');
        await page.fill('input#nodeInput', 'Node1');
        await page.click('button#confirmAddNode'); // Assuming there's a confirm button
        // Verify transition back to Idle state
        await expect(page.locator('input#nodeInput')).toBeHidden();
        await expect(page.locator('canvas#myCanvas')).toHaveCSS('border', '1px solid black'); // Assuming it returns to normal
    });

    test('should transition to AddingEdge state when Add Edge button is clicked', async ({ page }) => {
        await page.click('button#addEdge');
        // Verify the transition to AddingEdge state
        await expect(page.locator('input#edgeInput')).toBeVisible();
        await expect(page.locator('.node')).toHaveClass(/highlighted/); // Assuming nodes are highlighted
    });

    test('should return to Idle state after adding an edge', async ({ page }) => {
        await page.click('button#addEdge');
        await page.fill('input#edgeInput', 'Node1-Node2');
        await page.click('button#confirmAddEdge'); // Assuming there's a confirm button
        // Verify transition back to Idle state
        await expect(page.locator('input#edgeInput')).toBeHidden();
    });

    test('should transition to RemovingNode state when Remove Node button is clicked', async ({ page }) => {
        await page.click('button#removeNode');
        // Verify the transition to RemovingNode state
        await expect(page.locator('input#removeNodeInput')).toBeVisible();
        await expect(page.locator('.node')).toHaveClass(/removal-feedback/); // Assuming feedback is shown
    });

    test('should return to Idle state after removing a node', async ({ page }) => {
        await page.click('button#removeNode');
        await page.fill('input#removeNodeInput', 'Node1');
        await page.click('button#confirmRemoveNode'); // Assuming there's a confirm button
        // Verify transition back to Idle state
        await expect(page.locator('input#removeNodeInput')).toBeHidden();
    });

    test('should transition to RemovingEdge state when Remove Edge button is clicked', async ({ page }) => {
        await page.click('button#removeEdge');
        // Verify the transition to RemovingEdge state
        await expect(page.locator('input#removeEdgeInput')).toBeVisible();
        await expect(page.locator('.edge')).toHaveClass(/removal-feedback/); // Assuming feedback is shown
    });

    test('should return to Idle state after removing an edge', async ({ page }) => {
        await page.click('button#removeEdge');
        await page.fill('input#removeEdgeInput', 'Node1-Node2');
        await page.click('button#confirmRemoveEdge'); // Assuming there's a confirm button
        // Verify transition back to Idle state
        await expect(page.locator('input#removeEdgeInput')).toBeHidden();
    });

    test('should transition to ResettingGraph state when Reset button is clicked', async ({ page }) => {
        await page.click('button#resetGraph');
        // Verify the transition to ResettingGraph state
        await expect(page.locator('.confirmation-message')).toBeVisible(); // Assuming a confirmation message appears
    });

    test('should return to Idle state after resetting the graph', async ({ page }) => {
        await page.click('button#resetGraph');
        await page.click('button#confirmReset'); // Assuming there's a confirm button
        // Verify transition back to Idle state
        await expect(page.locator('.confirmation-message')).toBeHidden();
    });
});