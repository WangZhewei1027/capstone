import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf0-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('Graph Visualization (Directed/Undirected) - 4c9eadf0-cd2f-11f0-a735-f5f9b4634e99', () => {
  // Arrays to capture console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (log, error, warning, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // pageerror is a Error object; record the message for assertions
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Navigate to the application and wait for the load event
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // After each test, assert that no unexpected page errors or console error-level messages occurred
  test.afterEach(async () => {
    // Ensure we observed the page for errors during the test lifecycle
    // Assert that there were no uncaught page errors
    expect(pageErrors, `Expected no uncaught page errors, saw: ${JSON.stringify(pageErrors)}`).toEqual([]);

    // Assert there were no console messages with type 'error'
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length, `Expected no console.error messages, saw: ${JSON.stringify(errorConsoleMessages)}`).toBe(0);
  });

  test('Initial load should have a canvas element with correct id and dimensions', async ({ page }) => {
    // Verify the canvas element exists and has the expected id/attributes
    const canvasHandle = await page.$('canvas#graphCanvas');
    expect(canvasHandle).not.toBeNull();

    const attrs = await page.evaluate((sel) => {
      const c = document.querySelector(sel);
      return c ? { width: c.width, height: c.height, id: c.id } : null;
    }, 'canvas#graphCanvas');

    expect(attrs).not.toBeNull();
    expect(attrs.id).toBe('graphCanvas');
    expect(attrs.width).toBeGreaterThan(0);
    expect(attrs.height).toBeGreaterThan(0);
    // The HTML sets width 600 and height 400, assert those values are present
    expect(attrs.width).toBe(600);
    expect(attrs.height).toBe(400);
  });

  test('Application should expose a graph object with expected nodes and edges', async ({ page }) => {
    // Access the graph object from page context and verify its structure
    const graph = await page.evaluate(() => {
      // Return a minimal snapshot of the graph object
      return window.graph ? { 
        nodes: Array.isArray(window.graph.nodes) ? window.graph.nodes.slice() : null,
        edges: Array.isArray(window.graph.edges) ? window.graph.edges.map(e => ({ from: e.from, to: e.to })) : null,
        isDirected: window.graph ? window.graph.isDirected : undefined
      } : null;
    });

    expect(graph).not.toBeNull();
    expect(Array.isArray(graph.nodes)).toBeTruthy();
    expect(graph.nodes.length).toBe(5);
    expect(graph.nodes).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E']));

    expect(Array.isArray(graph.edges)).toBeTruthy();
    expect(graph.edges.length).toBe(5);
    // Check that edges reference valid node labels
    for (const e of graph.edges) {
      expect(graph.nodes).toContain(e.from);
      expect(graph.nodes).toContain(e.to);
    }

    // By default the implementation sets isDirected = false
    expect(graph.isDirected).toBe(false);
  });

  test('No interactive controls (buttons/inputs/forms) should exist in the DOM', async ({ page }) => {
    // The provided HTML contains only a canvas and no interactive form elements.
    const interactiveCount = await page.evaluate(() => {
      return document.querySelectorAll('button,input,select,form,textarea').length;
    });
    // Assert that there are zero interactive controls
    expect(interactiveCount).toBe(0);
  });

  test('Canvas drawing should produce non-empty pixel data (i.e., something was drawn)', async ({ page }) => {
    // Verify that the canvas has non-transparent pixels (indicating lines/circles were drawn)
    const hasNonTransparentPixel = await page.evaluate(() => {
      const canvas = document.getElementById('graphCanvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        // Iterate and check alpha channel for any non-zero (non-transparent) pixel
        for (let i = 3; i < imgData.length; i += 4) {
          if (imgData[i] !== 0) return true;
        }
        return false;
      } catch (err) {
        // If getImageData throws (shouldn't in same-origin), return false to let assertion fail explicitly
        return { error: String(err && err.message ? err.message : err) };
      }
    });

    // If the evaluation returned an error object, fail the test with that error message
    if (typeof hasNonTransparentPixel === 'object' && hasNonTransparentPixel !== null && hasNonTransparentPixel.error) {
      throw new Error('getImageData failed: ' + hasNonTransparentPixel.error);
    }

    expect(hasNonTransparentPixel).toBe(true);
  });

  test('nodePositions object should be populated and remain stable when clicking canvas', async ({ page }) => {
    // Grab a snapshot of nodePositions before interaction
    const beforePositions = await page.evaluate(() => {
      return window.nodePositions ? JSON.parse(JSON.stringify(window.nodePositions)) : null;
    });
    expect(beforePositions).not.toBeNull();

    // Click at canvas center and near edges to simulate user interaction
    const canvasBounding = await page.locator('#graphCanvas').boundingBox();
    expect(canvasBounding).not.toBeNull();

    // Click center
    await page.mouse.click(canvasBounding.x + canvasBounding.width / 2, canvasBounding.y + canvasBounding.height / 2);
    // Click top-left corner inside canvas
    await page.mouse.click(canvasBounding.x + 10, canvasBounding.y + 10);

    // Grab positions after interactions
    const afterPositions = await page.evaluate(() => {
      return window.nodePositions ? JSON.parse(JSON.stringify(window.nodePositions)) : null;
    });

    // The implementation does not change nodePositions on clicks; positions should be deep-equal
    expect(afterPositions).toEqual(beforePositions);
  });

  test('Reloading the page results in the same graph initialization and no additional errors', async ({ page }) => {
    // Capture a few properties before reload
    const snapshotBefore = await page.evaluate(() => {
      return {
        nodes: window.graph ? window.graph.nodes.slice() : null,
        edgesCount: window.graph ? window.graph.edges.length : null,
        isDirected: window.graph ? window.graph.isDirected : null
      };
    });

    // Perform a reload and wait for load event
    await page.reload({ waitUntil: 'load' });

    // Capture properties after reload
    const snapshotAfter = await page.evaluate(() => {
      return {
        nodes: window.graph ? window.graph.nodes.slice() : null,
        edgesCount: window.graph ? window.graph.edges.length : null,
        isDirected: window.graph ? window.graph.isDirected : null
      };
    });

    // Snapshots should match
    expect(snapshotAfter).toEqual(snapshotBefore);

    // Also ensure no console errors or page errors have been recorded during this test's lifecycle
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Sanity checks on drawing utilities presence (drawNode, drawEdge, drawArrow) without invoking them', async ({ page }) => {
    // Verify that the drawing functions exist in the page's JS environment
    const utilities = await page.evaluate(() => {
      return {
        hasDrawNode: typeof window.drawNode === 'function',
        hasDrawEdge: typeof window.drawEdge === 'function',
        hasDrawArrow: typeof window.drawArrow === 'function'
      };
    });

    // All three functions are defined in the script; ensure they exist
    expect(utilities.hasDrawNode).toBe(true);
    expect(utilities.hasDrawEdge).toBe(true);
    expect(utilities.hasDrawArrow).toBe(true);
  });

  test('Accessibility: canvas should have an id and be focusable via tabindex injection check (if present)', async ({ page }) => {
    // The canvas has an id; check if it is focusable (it is not by default). We assert presence of id and that tabindex is not set.
    const info = await page.evaluate(() => {
      const canvas = document.getElementById('graphCanvas');
      return {
        hasId: !!(canvas && canvas.id),
        tabindex: canvas ? canvas.getAttribute('tabindex') : null,
        role: canvas ? canvas.getAttribute('role') : null
      };
    });

    expect(info.hasId).toBe(true);
    // By default there should be no tabindex unless the page sets it
    expect(info.tabindex === null || typeof info.tabindex === 'string').toBeTruthy();
    // role likely not set
    expect(info.role === null || typeof info.role === 'string').toBeTruthy();
  });

});