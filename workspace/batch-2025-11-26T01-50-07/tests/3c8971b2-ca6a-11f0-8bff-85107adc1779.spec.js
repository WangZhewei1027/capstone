import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8971b2-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Depth-First Search (DFS) Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial State', () => {
    test('should be in Idle state', async () => {
      const startButton = await page.locator('#startDFS');
      const resetButton = await page.locator('#reset');
      
      // Verify controls are enabled in Idle state
      await expect(startButton).toBeEnabled();
      await expect(resetButton).toBeEnabled();
    });

    test('should populate start nodes', async () => {
      const startNodeSelect = await page.locator('#startNode');
      const optionsCount = await startNodeSelect.locator('option').count();
      
      // Verify that start nodes are populated
      expect(optionsCount).toBeGreaterThan(0);
    });
  });

  test.describe('Start DFS', () => {
    test('should transition to DFSRunning state on Start button click', async () => {
      const startButton = await page.locator('#startDFS');
      await startButton.click();

      // Verify that controls are disabled during DFS
      await expect(startButton).toBeDisabled();
      await expect(page.locator('#reset')).toBeDisabled();
      await expect(page.locator('#startNode')).toBeDisabled();
      
      // Verify log contains start message
      const logContent = await page.locator('#log').textContent();
      expect(logContent).toContain('Starting DFS from node');
    });

    test('should visit nodes and edges correctly', async () => {
      // Wait for some time to allow DFS to complete
      await page.waitForTimeout(5000); // Adjust based on expected DFS duration

      // Verify that nodes are marked as visited
      const visitedNodes = await page.locator('circle.node.visited').count();
      expect(visitedNodes).toBeGreaterThan(0);

      // Verify that edges are marked as visited
      const visitedEdges = await page.locator('line.edge.visited').count();
      expect(visitedEdges).toBeGreaterThan(0);

      // Verify that controls are re-enabled after DFS completion
      await expect(page.locator('#startDFS')).toBeEnabled();
      await expect(page.locator('#reset')).toBeEnabled();
      await expect(page.locator('#startNode')).toBeEnabled();
    });
  });

  test.describe('Reset Functionality', () => {
    test('should transition to Resetting state on Reset button click', async () => {
      const resetButton = await page.locator('#reset');
      await resetButton.click();

      // Verify that the graph is reset
      const visitedNodes = await page.locator('circle.node.visited').count();
      expect(visitedNodes).toBe(0);

      const visitedEdges = await page.locator('line.edge.visited').count();
      expect(visitedEdges).toBe(0);

      // Verify log is cleared
      const logContent = await page.locator('#log').textContent();
      expect(logContent).toBe('');
    });
  });

  test.describe('Edge Cases', () => {
    test('should not start DFS if already running', async () => {
      const startButton = await page.locator('#startDFS');
      await startButton.click(); // Start DFS

      // Attempt to start DFS again
      await startButton.click();

      // Verify that the button is still disabled
      await expect(startButton).toBeDisabled();
    });

    test('should handle reset during DFS', async () => {
      const startButton = await page.locator('#startDFS');
      await startButton.click(); // Start DFS

      const resetButton = await page.locator('#reset');
      await resetButton.click(); // Reset during DFS

      // Verify that the graph is reset
      const visitedNodes = await page.locator('circle.node.visited').count();
      expect(visitedNodes).toBe(0);

      const visitedEdges = await page.locator('line.edge.visited').count();
      expect(visitedEdges).toBe(0);
    });
  });
});