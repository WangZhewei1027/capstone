import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fdbc71-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Graph Visualization Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test.describe('Initial State - Idle', () => {
    test('should display the initial controls and canvas', async ({ page }) => {
      const addNodeBtn = await page.locator('#addNodeBtn');
      const clearBtn = await page.locator('#clearBtn');
      const canvas = await page.locator('#graphCanvas');

      await expect(addNodeBtn).toBeVisible();
      await expect(clearBtn).toBeVisible();
      await expect(canvas).toBeVisible();
    });

    test('should enable controls when in Idle state', async ({ page }) => {
      const addNodeBtn = await page.locator('#addNodeBtn');
      const clearBtn = await page.locator('#clearBtn');

      await expect(addNodeBtn).toBeEnabled();
      await expect(clearBtn).toBeEnabled();
    });
  });

  test.describe('Adding Node', () => {
    test('should transition to AddingNode state when Add Node button is clicked', async ({ page }) => {
      const addNodeBtn = await page.locator('#addNodeBtn');
      await addNodeBtn.click();

      const canvas = await page.locator('#graphCanvas');
      await expect(canvas).toHaveCSS('cursor', 'crosshair');
    });

    test('should place a node on the canvas when clicked', async ({ page }) => {
      const addNodeBtn = await page.locator('#addNodeBtn');
      await addNodeBtn.click();

      const canvas = await page.locator('#graphCanvas');
      await canvas.click({ position: { x: 100, y: 100 } });

      const node = await page.evaluate(() => {
        const canvas = document.getElementById('graphCanvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(100, 100, 1, 1);
        return imageData.data[3] > 0; // Check if pixel is not transparent
      });

      expect(node).toBe(true; // Node should be visible
    });

    test('should return to Idle state after placing a node', async ({ page }) => {
      const addNodeBtn = await page.locator('#addNodeBtn');
      await addNodeBtn.click();
      await page.locator('#graphCanvas').click({ position: { x: 100, y: 100 } });

      const canvas = await page.locator('#graphCanvas');
      await expect(canvas).toHaveCSS('cursor', 'default');
    });
  });

  test.describe('Clearing Graph', () => {
    test('should transition to ClearingGraph state when Clear Graph button is clicked', async ({ page }) => {
      const clearBtn = await page.locator('#clearBtn');
      await clearBtn.click();

      const canvas = await page.locator('#graphCanvas');
      const nodesCount = await page.evaluate(() => {
        return window.nodes.length; // Assuming nodes is accessible globally
      });

      expect(nodesCount).toBe(0); // Graph should be cleared
    });
  });

  test.describe('Dragging Edge', () => {
    test.beforeEach(async ({ page }) => {
      const addNodeBtn = await page.locator('#addNodeBtn');
      await addNodeBtn.click();
      await page.locator('#graphCanvas').click({ position: { x: 100, y: 100 } });
      await page.locator('#graphCanvas').click({ position: { x: 200, y: 200 } });
    });

    test('should transition to DraggingEdge state when dragging from a node', async ({ page }) => {
      const canvas = await page.locator('#graphCanvas');
      await canvas.dispatchEvent('mousedown', { clientX: 100, clientY: 100 });
      await canvas.dispatchEvent('mousemove', { clientX: 150, clientY: 150 });

      const cursorStyle = await canvas.evaluate(node => getComputedStyle(node).cursor);
      expect(cursorStyle).toBe('crosshair');
    });

    test('should create an edge when mouse is released over another node', async ({ page }) => {
      const canvas = await page.locator('#graphCanvas');
      await canvas.dispatchEvent('mousedown', { clientX: 100, clientY: 100 });
      await canvas.dispatchEvent('mousemove', { clientX: 200, clientY: 200 });
      await canvas.dispatchEvent('mouseup', { clientX: 200, clientY: 200 });

      const edgesCount = await page.evaluate(() => {
        return window.edges.length; // Assuming edges is accessible globally
      });

      expect(edgesCount).toBe(1); // One edge should be created
    });
  });

  test.describe('Changing Graph Type', () => {
    test('should change graph type when radio button is selected', async ({ page }) => {
      const directedRadio = await page.locator('input[name="graphType"][value="directed"]');
      await directedRadio.check();

      const graphType = await page.evaluate(() => {
        return window.graphType; // Assuming graphType is accessible globally
      });

      expect(graphType).toBe('directed'); // Graph type should be updated
    });
  });

  test.describe('Edge Cases', () => {
    test('should not create an edge if dragging back to the same node', async ({ page }) => {
      const canvas = await page.locator('#graphCanvas');
      await canvas.dispatchEvent('mousedown', { clientX: 100, clientY: 100 });
      await canvas.dispatchEvent('mousemove', { clientX: 100, clientY: 100 });
      await canvas.dispatchEvent('mouseup', { clientX: 100, clientY: 100 });

      const edgesCount = await page.evaluate(() => {
        return window.edges.length; // Assuming edges is accessible globally
      });

      expect(edgesCount).toBe(0); // No edge should be created
    });

    test('should not allow adding a node while dragging an edge', async ({ page }) => {
      const canvas = await page.locator('#graphCanvas');
      await canvas.dispatchEvent('mousedown', { clientX: 100, clientY: 100 });
      await canvas.dispatchEvent('mousemove', { clientX: 150, clientY: 150 });

      const addNodeBtn = await page.locator('#addNodeBtn');
      await addNodeBtn.click();

      const isAddingNode = await page.evaluate(() => {
        return window.addingNode; // Assuming addingNode is accessible globally
      });

      expect(isAddingNode).toBe(false); // Should not allow adding node
    });
  });
});