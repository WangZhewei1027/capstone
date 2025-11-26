import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d5f31-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Interactive Graph Application Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Add Node Mode', () => {
    test('should activate Add Node mode and add a node', async () => {
      await page.click('#btnAddNode');
      const activeClass = await page.evaluate(() => {
        return document.querySelector('#btnAddNode').classList.contains('active');
      });
      expect(activeClass).toBe(true);

      await page.click('#graphCanvas', { position: { x: 100, y: 100 } });
      const nodesCount = await page.textContent('#infoNodes');
      expect(nodesCount).toContain('Nodes: 1');
    });
  });

  test.describe('Add Edge Mode', () => {
    test('should activate Add Edge mode and add an edge', async () => {
      await page.click('#btnAddEdge');
      const activeClass = await page.evaluate(() => {
        return document.querySelector('#btnAddEdge').classList.contains('active');
      });
      expect(activeClass).toBe(true);

      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Select source node
      await page.click('#graphCanvas', { position: { x: 200, y: 200 } }); // Select target node
      const edgesCount = await page.textContent('#infoEdges');
      expect(edgesCount).toContain('Edges: 1');
    });

    test('should allow self-loop edge creation', async () => {
      await page.click('#btnAddEdge');
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Select the same node
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Confirm self-loop
      const edgesCount = await page.textContent('#infoEdges');
      expect(edgesCount).toContain('Edges: 2');
    });

    test('should cancel edge selection on double click', async () => {
      await page.click('#btnAddEdge');
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } });
      await page.dblclick('#graphCanvas');
      const edgesCount = await page.textContent('#infoEdges');
      expect(edgesCount).toContain('Edges: 2'); // No new edge should be created
    });
  });

  test.describe('Move Mode', () => {
    test('should activate Move mode and drag a node', async () => {
      await page.click('#btnMove');
      const activeClass = await page.evaluate(() => {
        return document.querySelector('#btnMove').classList.contains('active');
      });
      expect(activeClass).toBe(true);

      await page.mouse.move(100, 100);
      await page.mouse.down();
      await page.mouse.move(150, 150); // Dragging the node
      await page.mouse.up();

      // Verify node position (not directly verifiable, but can check if the node still exists)
      const nodesCount = await page.textContent('#infoNodes');
      expect(nodesCount).toContain('Nodes: 1');
    });
  });

  test.describe('Delete Mode', () => {
    test('should activate Delete mode and delete a node', async () => {
      await page.click('#btnDelete');
      const activeClass = await page.evaluate(() => {
        return document.querySelector('#btnDelete').classList.contains('active');
      });
      expect(activeClass).toBe(true);

      await page.click('#graphCanvas', { position: { x: 100, y: 100 } }); // Click on the node to delete
      const nodesCount = await page.textContent('#infoNodes');
      expect(nodesCount).toContain('Nodes: 0');
    });

    test('should delete an edge if present', async () => {
      await page.click('#btnAddNode');
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } });
      await page.click('#btnAddEdge');
      await page.click('#graphCanvas', { position: { x: 100, y: 100 } });
      await page.click('#graphCanvas', { position: { x: 200, y: 200 } });

      await page.click('#btnDelete');
      await page.click('#graphCanvas', { position: { x: 150, y: 150 } }); // Click near the edge to delete
      const edgesCount = await page.textContent('#infoEdges');
      expect(edgesCount).toContain('Edges: 0');
    });
  });

  test.describe('Directed Graph Toggle', () => {
    test('should toggle directed graph mode', async () => {
      await page.click('#directedCheck');
      const isChecked = await page.evaluate(() => {
        return document.querySelector('#directedCheck').checked;
      });
      expect(isChecked).toBe(false);
    });
  });

  test.describe('Clear and Random Graph', () => {
    test('should clear the graph', async () => {
      await page.click('#randomBtn');
      const nodesCountBefore = await page.textContent('#infoNodes');
      await page.click('#clearBtn');
      const nodesCountAfter = await page.textContent('#infoNodes');
      expect(nodesCountBefore).not.toContain('Nodes: 0');
      expect(nodesCountAfter).toContain('Nodes: 0');
    });

    test('should generate a random graph', async () => {
      await page.click('#randomBtn');
      const nodesCount = await page.textContent('#infoNodes');
      expect(parseInt(nodesCount.split(': ')[1]) > 0).toBe(true); // Ensure nodes are generated
    });
  });

  test.describe('Edge Weight Input', () => {
    test('should change edge weight', async () => {
      await page.fill('#edgeWeight', '5');
      const edgeWeightValue = await page.inputValue('#edgeWeight');
      expect(edgeWeightValue).toBe('5');
    });
  });

  test.describe('Window Resize', () => {
    test('should handle window resize', async () => {
      await page.setViewportSize({ width: 800, height: 600 });
      const canvasSize = await page.evaluate(() => {
        const canvas = document.getElementById('graphCanvas');
        return { width: canvas.width, height: canvas.height };
      });
      expect(canvasSize.width).toBeGreaterThan(0);
      expect(canvasSize.height).toBeGreaterThan(0);
    });
  });
});