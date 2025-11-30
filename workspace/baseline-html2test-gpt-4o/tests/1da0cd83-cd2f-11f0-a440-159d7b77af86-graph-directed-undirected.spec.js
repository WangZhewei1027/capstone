import { test, expect } from '@playwright/test';

const PAGE_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0cd83-cd2f-11f0-a440-159d7b77af86.html';

test.describe('Graph Visualization (Directed/Undirected) - 1da0cd83-cd2f-11f0-a440-159d7b77af86', () => {
  // Helper to attach console and page error collectors to the page
  async function attachErrorCollectors(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    return { consoleErrors, pageErrors };
  }

  // Page object for interacting with the demo
  function graphPageObjects(page) {
    return {
      async goto() {
        await page.goto(PAGE_URL);
      },
      addNodeButton() {
        return page.getByRole('button', { name: 'Add Node' });
      },
      addDirectedEdgeButton() {
        return page.getByRole('button', { name: 'Add Directed Edge' });
      },
      addUndirectedEdgeButton() {
        return page.getByRole('button', { name: 'Add Undirected Edge' });
      },
      graphContainer() {
        return page.locator('#graph-container');
      },
      nodes() {
        return page.locator('#graph-container .node');
      },
      svgs() {
        return page.locator('#graph-container svg');
      },
      lines() {
        return page.locator('#graph-container svg line');
      },
      polygons() {
        return page.locator('#graph-container svg polygon');
      }
    };
  }

  // Test the initial page load and default state
  test('Initial load: container and controls are present, no nodes or edges', async ({ page }) => {
    const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
    const ui = graphPageObjects(page);

    // Navigate to the page
    await ui.goto();

    // The graph container should exist and be visible
    await expect(ui.graphContainer()).toBeVisible();

    // All control buttons should be visible and enabled
    await expect(ui.addNodeButton()).toBeVisible();
    await expect(ui.addDirectedEdgeButton()).toBeVisible();
    await expect(ui.addUndirectedEdgeButton()).toBeVisible();

    // Initially there should be no node elements and no SVG edges
    await expect(ui.nodes()).toHaveCount(0);
    await expect(ui.svgs()).toHaveCount(0);

    // Assert that no console errors or page errors occurred during load
    expect(consoleErrors.length, 'No console.error messages on initial load').toBe(0);
    expect(pageErrors.length, 'No page errors on initial load').toBe(0);
  });

  // Group tests about adding nodes
  test.describe('Node creation', () => {
    test('Clicking "Add Node" adds a node element with correct id text and position', async ({ page }) => {
      const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
      const ui = graphPageObjects(page);
      await ui.goto();

      // Add a single node
      await ui.addNodeButton().click();

      // There should be exactly one node element appended
      await expect(ui.nodes()).toHaveCount(1);

      // The node's inner text should be '0' (first node has id 0)
      const firstNode = ui.nodes().first();
      await expect(firstNode).toHaveText('0');

      // Verify the style top/left attributes exist and look like px values
      const top = await firstNode.evaluate((el) => el.style.top);
      const left = await firstNode.evaluate((el) => el.style.left);
      expect(top.endsWith('px'), 'node top style ends with px').toBe(true);
      expect(left.endsWith('px'), 'node left style ends with px').toBe(true);

      // Add two more nodes and verify incremental ids and count
      await ui.addNodeButton().click();
      await ui.addNodeButton().click();
      await expect(ui.nodes()).toHaveCount(3);

      const lastNode = ui.nodes().nth(2);
      await expect(lastNode).toHaveText('2');

      // Assert no console or page errors occurred while adding nodes
      expect(consoleErrors.length, 'No console.error while adding nodes').toBe(0);
      expect(pageErrors.length, 'No page errors while adding nodes').toBe(0);
    });
  });

  // Group tests for edge creation logic and edge-case alerts
  test.describe('Edge creation (directed and undirected)', () => {
    test('Attempting to add an edge with fewer than 2 nodes shows an alert', async ({ page }) => {
      const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
      const ui = graphPageObjects(page);
      await ui.goto();

      // Ensure there are no nodes
      await expect(ui.nodes()).toHaveCount(0);

      // Listen for dialog and capture message
      let dialogMessage = null;
      page.on('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Try directed and undirected buttons while nodes < 2
      await ui.addDirectedEdgeButton().click();
      expect(dialogMessage, 'Alert displayed for directed edge without nodes').toBe("Add more nodes to create an edge!");

      dialogMessage = null;
      await ui.addUndirectedEdgeButton().click();
      expect(dialogMessage, 'Alert displayed for undirected edge without nodes').toBe("Add more nodes to create an edge!");

      // Still zero nodes and zero svgs
      await expect(ui.nodes()).toHaveCount(0);
      await expect(ui.svgs()).toHaveCount(0);

      // Assert no console/page errors during alert flow
      expect(consoleErrors.length, 'No console.error while triggering alerts').toBe(0);
      expect(pageErrors.length, 'No page errors while triggering alerts').toBe(0);
    });

    test('Adding a directed edge creates an SVG with a line and a polygon (arrowhead)', async ({ page }) => {
      const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
      const ui = graphPageObjects(page);
      await ui.goto();

      // Add at least two nodes to allow edge creation
      await ui.addNodeButton().click();
      await ui.addNodeButton().click();

      // Capture current svg count and try to create a directed edge.
      const initialSvgCount = await ui.svgs().count();

      // Because addDirectedEdge picks random source/target and may pick same node (no-op),
      // retry clicking up to a limit until an SVG is appended.
      const maxAttempts = 10;
      let attempt = 0;
      let finalSvgCount = initialSvgCount;
      while (attempt < maxAttempts) {
        await ui.addDirectedEdgeButton().click();
        // small wait for DOM update
        await page.waitForTimeout(100);
        finalSvgCount = await ui.svgs().count();
        if (finalSvgCount > initialSvgCount) break;
        attempt++;
      }

      expect(finalSvgCount > initialSvgCount, 'A directed edge SVG was appended within attempts').toBe(true);

      // Verify the newly added SVG contains a line and a polygon (arrowhead)
      const newSvg = ui.svgs().nth(finalSvgCount - 1);
      const line = newSvg.locator('line');
      const polygon = newSvg.locator('polygon');

      await expect(line).toHaveCount(1);
      await expect(polygon).toHaveCount(1);

      // Read attributes of the line and ensure they are numeric strings
      const x1 = await line.getAttribute('x1');
      const y1 = await line.getAttribute('y1');
      const x2 = await line.getAttribute('x2');
      const y2 = await line.getAttribute('y2');
      expect(!isNaN(Number(x1)), 'line x1 is numeric').toBe(true);
      expect(!isNaN(Number(y1)), 'line y1 is numeric').toBe(true);
      expect(!isNaN(Number(x2)), 'line x2 is numeric').toBe(true);
      expect(!isNaN(Number(y2)), 'line y2 is numeric').toBe(true);

      // Confirm that a polygon 'points' attribute exists and is non-empty
      const points = await polygon.getAttribute('points');
      expect(typeof points === 'string' && points.trim().length > 0, 'polygon has non-empty points attribute').toBe(true);

      // Also assert that the internal edges array reported on the window increased
      const edgesLength = await page.evaluate(() => window.edges && window.edges.length ? window.edges.length : 0);
      expect(edgesLength > 0, 'window.edges contains at least one entry after adding directed edge').toBe(true);

      // Assert no console/page errors occurred during directed edge creation
      expect(consoleErrors.length, 'No console.error while creating directed edge').toBe(0);
      expect(pageErrors.length, 'No page errors while creating directed edge').toBe(0);
    });

    test('Adding an undirected edge creates an SVG with a line but no polygon', async ({ page }) => {
      const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
      const ui = graphPageObjects(page);
      await ui.goto();

      // Add at least two nodes
      await ui.addNodeButton().click();
      await ui.addNodeButton().click();

      // Ensure we start from known svg count
      const initialSvgCount = await ui.svgs().count();

      // Retry clicking to account for random source/target equality
      const maxAttempts = 10;
      let attempt = 0;
      let finalSvgCount = initialSvgCount;
      while (attempt < maxAttempts) {
        await ui.addUndirectedEdgeButton().click();
        await page.waitForTimeout(100);
        finalSvgCount = await ui.svgs().count();
        if (finalSvgCount > initialSvgCount) break;
        attempt++;
      }

      expect(finalSvgCount > initialSvgCount, 'An undirected edge SVG was appended within attempts').toBe(true);

      // Inspect the newly added SVG
      const newSvg = ui.svgs().nth(finalSvgCount - 1);
      const line = newSvg.locator('line');
      const polygon = newSvg.locator('polygon');

      await expect(line).toHaveCount(1);
      // For undirected edges, no polygon should be present
      await expect(polygon).toHaveCount(0);

      // Validate line attributes
      const x1 = await line.getAttribute('x1');
      const y1 = await line.getAttribute('y1');
      const x2 = await line.getAttribute('x2');
      const y2 = await line.getAttribute('y2');
      expect(!isNaN(Number(x1)), 'undirected line x1 is numeric').toBe(true);
      expect(!isNaN(Number(y1)), 'undirected line y1 is numeric').toBe(true);
      expect(!isNaN(Number(x2)), 'undirected line x2 is numeric').toBe(true);
      expect(!isNaN(Number(y2)), 'undirected line y2 is numeric').toBe(true);

      // Confirm window.edges contains at least one undirected entry (type check if possible)
      const hasUndirected = await page.evaluate(() => {
        if (!window.edges || !Array.isArray(window.edges)) return false;
        return window.edges.some(e => e && e.type === 'undirected');
      });
      expect(hasUndirected, 'window.edges contains an undirected edge entry').toBe(true);

      // Assert no console or page errors occurred while creating undirected edge
      expect(consoleErrors.length, 'No console.error while creating undirected edge').toBe(0);
      expect(pageErrors.length, 'No page errors while creating undirected edge').toBe(0);
    });
  });

  // Additional edge-case and DOM integrity tests
  test.describe('Edge-case and DOM integrity checks', () => {
    test('Nodes are positioned within the graph container bounds', async ({ page }) => {
      const { consoleErrors, pageErrors } = await attachErrorCollectors(page);
      const ui = graphPageObjects(page);
      await ui.goto();

      // Create multiple nodes
      const nodesToCreate = 10;
      for (let i = 0; i < nodesToCreate; i++) {
        await ui.addNodeButton().click();
      }
      await expect(ui.nodes()).toHaveCount(nodesToCreate);

      // Get container dimensions and ensure nodes are positioned within bounds
      const containerBox = await ui.graphContainer().boundingBox();
      expect(containerBox, 'graph container bounding box exists').toBeDefined();

      const outOfBounds = await ui.nodes().evaluateAll((els, containerBox) => {
        const cb = containerBox;
        return els.map(el => {
          const top = parseFloat(el.style.top || '0');
          const left = parseFloat(el.style.left || '0');
          const w = parseFloat(window.getComputedStyle(el).width || '0');
          const h = parseFloat(window.getComputedStyle(el).height || '0');
          // Convert node center coordinates (style top/left represent top-left of node)
          const centerX = left + w / 2;
          const centerY = top + h / 2;
          return !(centerX >= 0 && centerX <= cb.width && centerY >= 0 && centerY <= cb.height);
        }).some(b => b === true);
      }, containerBox);

      expect(outOfBounds, 'All nodes are positioned within the graph container').toBe(false);

      // Assert no console/page errors occurred while checking positions
      expect(consoleErrors.length, 'No console.error while validating node positions').toBe(0);
      expect(pageErrors.length, 'No page errors while validating node positions').toBe(0);
    });
  });
});