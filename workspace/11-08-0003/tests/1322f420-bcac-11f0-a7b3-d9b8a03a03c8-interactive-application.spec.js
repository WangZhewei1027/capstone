import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1322f420-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Breadth-First Search (BFS) Interactive Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the BFS interactive module
    await page.goto(BASE_URL);
  });

  test('should start in the idle state', async ({ page }) => {
    // Verify that the graph is empty and no nodes are visited
    const nodes = await page.locator('.node').count();
    expect(nodes).toBe(0);
  });

  test('should allow node selection', async ({ page }) => {
    // Click on a node and verify it is highlighted
    const node = page.locator('.node').nth(0);
    await node.click();
    await expect(node).toHaveClass(/visited/);
  });

  test('should remain in node_selected state when clicking on another node', async ({ page }) => {
    // Select a node and then select another
    const node1 = page.locator('.node').nth(0);
    const node2 = page.locator('.node').nth(1);
    await node1.click();
    await node2.click();

    // Verify that both nodes are highlighted
    await expect(node1).toHaveClass(/visited/);
    await expect(node2).toHaveClass(/visited/);
  });

  test('should transition to bfs_running state when Start BFS is clicked', async ({ page }) => {
    const node11 = page.locator('.node11').nth(0);
    await node.click();
    const startButton = page.locator('#startButton');
    await startButton.click();

    // Verify that the BFS process has started (e.g., nodes are being visited)
    await expect(page.locator('.visited')).toHaveCount(1); // At least one node should be visited
  });

  test('should transition back to idle state when BFS is complete', async ({ page }) => {
    const node21 = page.locator('.node21').nth(0);
    await node.click();
    const startButton1 = page.locator('#startButton1');
    await startButton.click();

    // Simulate BFS completion (this would be based on the actual implementation)
    // Assuming there's a mechanism to complete BFS in the UI
    await page.evaluate(() => {
      // Simulate BFS completion by clicking the clear button
      document.querySelector('#clearButton').click();
    });

    // Verify that the state has returned to idle
    await expect(page.locator('.visited')).toHaveCount(0);
  });

  test('should clear the graph and return to idle state when Clear Graph is clicked', async ({ page }) => {
    const node3 = page.locator('.node3').nth(0);
    await node.click();
    const clearButton = page.locator('#clearButton');
    await clearButton.click();

    // Verify that no nodes are visited
    await expect(page.locator('.visited')).toHaveCount(0);
  });

  test('should handle edge cases when no nodes are selected', async ({ page }) => {
    const startButton2 = page.locator('#startButton2');
    await startButton.click();

    // Verify that no action is taken when BFS is started without nodes
    await expect(page.locator('.visited')).toHaveCount(0);
  });

  test('should allow multiple BFS runs after clearing the graph', async ({ page }) => {
    const node11 = page.locator('.node').nth(0);
    const node21 = page.locator('.node').nth(1);
    await node1.click();
    const startButton3 = page.locator('#startButton3');
    await startButton.click();

    // Simulate BFS completion
    await page.evaluate(() => {
      document.querySelector('#clearButton').click();
    });

    // Select another node and start BFS again
    await node2.click();
    await startButton.click();

    // Verify that the second BFS run is successful
    await expect(page.locator('.visited')).toHaveCount(1);
  });
});