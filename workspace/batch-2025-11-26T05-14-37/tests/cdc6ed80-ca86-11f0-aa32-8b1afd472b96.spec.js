import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc6ed80-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Binary Tree Interactive Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('Initial state should be Idle', async ({ page }) => {
    // Verify the initial state is Idle
    const title = await page.locator('h1').innerText();
    expect(title).toBe('Binary Tree');
    
    const treeDiv = await page.locator('.tree').count();
    expect(treeDiv).toBe(1); // Ensure the tree div is rendered
  });

  test('DisplayTree event should transition to Tree Displayed state', async ({ page }) => {
    // Trigger the displayTree function
    await page.evaluate(() => displayTree());
    
    // Verify that the tree is displayed
    const consoleLogs = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args);
      };
      displayTree();
      console.log = originalLog;
      return logs;
    });

    expect(consoleLogs.length).toBeGreaterThan(0); // Ensure some nodes are logged
  });

  test('InsertNode event should add nodes to the tree', async ({ page }) => {
    // Insert nodes into the tree
    await page.evaluate(() => {
      insertData({ left: 10, top: 10 });
      insertData({ left: 50, top: 50 });
    });

    // Verify that nodes are added to the DOM
    const nodes = await page.locator('.node').count();
    expect(nodes).toBeGreaterThan(0); // Ensure nodes are present
  });

  test('RemoveNode event should remove a node from the tree', async ({ page }) => {
    // Insert a node and then remove it
    await page.evaluate(() => {
      insertData({ left: 10, top: 10 });
      const nodeToRemove = document.querySelector('.node');
      removeNode({ target: nodeToRemove });
    });

    // Verify that the node has been removed
    const nodesAfterRemoval = await page.locator('.node').count();
    expect(nodesAfterRemoval).toBe(0); // Ensure no nodes are present
  });

  test('DisplayTree should log the current structure of the tree', async ({ page }) => {
    // Insert nodes and then display the tree
    await page.evaluate(() => {
      insertData({ left: 10, top: 10 });
      insertData({ left: 50, top: 50 });
      displayTree();
    });

    // Check console logs for the displayed tree structure
    const consoleLogs = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args);
      };
      displayTree();
      console.log = originalLog;
      return logs;
    });

    expect(consoleLogs.length).toBeGreaterThan(0); // Ensure some structure is logged
  });

  test('Edge case: Remove a non-existing node', async ({ page }) => {
    // Attempt to remove a node that doesn't exist
    await page.evaluate(() => {
      removeNode({ target: '.non-existing-node' });
    });

    // Verify that no errors occur and the tree remains unchanged
    const nodesCount = await page.locator('.node').count();
    expect(nodesCount).toBe(0); // Ensure no nodes are present
  });
});