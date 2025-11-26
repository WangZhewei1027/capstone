import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c886040-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Graph Visualization Application', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial State', () => {
    test('should display the canvas and controls', async () => {
      const canvas = await page.locator('#graphCanvas');
      const clearBtn = await page.locator('#clearBtn');
      const directedCheckbox = await page.locator('#directedCheckbox');
      
      await expect(canvas).toBeVisible();
      await expect(clearBtn).toBeVisible();
      await expect(directedCheckbox).toBeVisible();
    });
  });

  test.describe('Add Node Functionality', () => {
    test('should add a node when clicking on the canvas in Add Node mode', async () => {
      await page.locator('input[name="mode"][value="addNode"]').check();
      const initialNodesCount = await page.evaluate(() => {
        return document.querySelectorAll('canvas').length; // Assuming nodes are drawn on the canvas
      });
      
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } });
      await page.waitForTimeout(500); // Wait for the drawing to complete

      const newNodesCount = await page.evaluate(() => {
        // Logic to count nodes, assuming nodes are drawn with a specific color or pattern
        return document.querySelectorAll('canvas').length; // Adjust this logic based on actual implementation
      });

      expect(newNodesCount).toBeGreaterThan(initialNodesCount);
    });
  });

  test.describe('Add Edge Functionality', () => {
    test('should switch to Add Edge mode and select nodes', async () => {
      await page.locator('input[name="mode"][value="addEdge"]').check();
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Select first node
      await page.click('#graphCanvas', { position: { x: 200, y: 200 } }); // Select second node
      await page.waitForTimeout(500); // Wait for the drawing to complete

      // Check if the edge was drawn correctly
      const edgesCount = await page.evaluate(() => {
        // Logic to count edges, adjust based on actual implementation
        return document.querySelectorAll('canvas').length; // Adjust this logic based on actual implementation
      });

      expect(edgesCount).toBeGreaterThan(0); // Expect at least one edge to be drawn
    });
  });

  test.describe('Clear Graph Functionality', () => {
    test('should clear the graph when Clear Graph button is clicked', async () => {
      await page.click('#clearBtn');
      await page.waitForTimeout(500); // Wait for the clearing to complete

      const nodesCountAfterClear = await page.evaluate(() => {
        // Logic to count nodes after clearing
        return document.querySelectorAll('canvas').length; // Adjust this logic based on actual implementation
      });

      expect(nodesCountAfterClear).toBe(0); // Expect no nodes to be present
    });
  });

  test.describe('Directed Graph Toggle', () => {
    test('should toggle directed graph mode', async () => {
      await page.locator('#directedCheckbox').check();
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } });
      await page.click('#graphCanvas', { position: { x: 200, y: 200 } });
      await page.waitForTimeout(500); // Wait for the drawing to complete

      // Check if the edges are drawn as directed
      const isDirected = await page.evaluate(() => {
        // Logic to check if the edges are directed, adjust based on actual implementation
        return document.querySelectorAll('canvas').length; // Adjust this logic based on actual implementation
      });

      expect(isDirected).toBe(true); // Expect edges to be drawn as directed
    });
  });

  test.describe('Edge Cases', () => {
    test('should not add an edge if the same node is selected', async () => {
      await page.locator('input[name="mode"][value="addEdge"]').check();
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Select first node
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Select the same node
      await page.waitForTimeout(500); // Wait for the drawing to complete

      const edgesCount = await page.evaluate(() => {
        // Logic to count edges, adjust based on actual implementation
        return document.querySelectorAll('canvas').length; // Adjust this logic based on actual implementation
      });

      expect(edgesCount).toBe(0); // Expect no edges to be drawn
    });
  });
});