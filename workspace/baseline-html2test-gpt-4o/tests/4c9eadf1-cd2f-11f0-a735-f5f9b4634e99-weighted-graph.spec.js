import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf1-cd2f-11f0-a735-f5f9b4634e99.html';

// Page object encapsulating interactions and queries for the weighted graph page
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  // Navigate to the page and wait for load event
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Return handle to the canvas element
  async getCanvasHandle() {
    return await this.page.$('#graphCanvas');
  }

  // Get canvas width and height attributes (numbers)
  async getCanvasSize() {
    return await this.page.$eval('#graphCanvas', (c) => {
      return { width: c.width, height: c.height, cssWidth: c.style.width || null, cssHeight: c.style.height || null };
    });
  }

  // Get a single pixel RGBA array at given canvas coordinates (x,y)
  async getPixelRGBA(x, y) {
    return await this.page.evaluate(({ x, y }) => {
      const canvas = document.getElementById('graphCanvas');
      const ctx = canvas.getContext('2d');
      // Guard: if getImageData fails it will throw; let that propagate naturally as required.
      const data = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return Array.from(data); // [r,g,b,a]
    }, { x, y });
  }

  // Get dataURL for the whole canvas (useful for equality checks)
  async getCanvasDataURL() {
    return await this.page.$eval('#graphCanvas', (c) => c.toDataURL());
  }

  // Click on canvas at position
  async clickCanvasAt(x, y) {
    const canvas = await this.getCanvasHandle();
    await canvas.click({ position: { x, y } });
  }

  // Query existence / counts of interactive elements
  async countInteractiveElements() {
    return await this.page.evaluate(() => {
      return {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        forms: document.querySelectorAll('form').length,
        selects: document.querySelectorAll('select').length,
        textareas: document.querySelectorAll('textarea').length,
      };
    });
  }
}

// Utility: determine if RGBA corresponds to near-white
function isNearlyWhite([r, g, b, a], threshold = 250) {
  return a > 0 && r >= threshold && g >= threshold && b >= threshold;
}

// Utility: determine if RGBA corresponds to near-green used for nodes (#4CAF50)
function isNearlyNodeGreen([r, g, b, a]) {
  // #4CAF50 in RGB is (76, 175, 80)
  if (a === 0) return false;
  const target = [76, 175, 80];
  const tolerance = 40; // allow anti-aliasing
  return Math.abs(r - target[0]) <= tolerance &&
         Math.abs(g - target[1]) <= tolerance &&
         Math.abs(b - target[2]) <= tolerance;
}

// Group related tests for the Weighted Graph visualization
test.describe('Weighted Graph Visualization - 4c9eadf1-cd2f-11f0-a735-f5f9b4634e99', () => {

  // Standard test-level setup/teardown: each test gets a fresh navigation
  test.beforeEach(async ({ page }) => {
    // Nothing to patch or inject - load the page as-is
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Test: initial page load and presence of expected static elements
  test('Initial load: page title and canvas present with expected dimensions', async ({ page }) => {
    // Purpose: Verify the page loads, header exists, and canvas is present with declared size.
    const graph = new GraphPage(page);

    // Basic DOM checks
    const titleText = await page.textContent('h1');
    expect(titleText).toContain('Weighted Graph Visualization');

    const canvasHandle = await graph.getCanvasHandle();
    expect(canvasHandle).not.toBeNull();

    const size = await graph.getCanvasSize();
    // The implementation sets width=600 and height=400 as attributes
    expect(size.width).toBe(600);
    expect(size.height).toBe(400);
  });

  // Test: there are no interactive form controls on the page (as implemented)
  test('No interactive HTML controls present by default (buttons/inputs/forms/selects/textarea)', async ({ page }) => {
    // Purpose: Ensure there are no user controls to interact with (per provided HTML)
    const graph = new GraphPage(page);
    const counts = await graph.countInteractiveElements();
    expect(counts.buttons).toBe(0);
    expect(counts.inputs).toBe(0);
    expect(counts.forms).toBe(0);
    expect(counts.selects).toBe(0);
    expect(counts.textareas).toBe(0);
  });

  // Test: verify that the canvas has rendered graph content by sampling pixels at node coordinates
  test('Canvas drawing: nodes and edge weight boxes are drawn at expected coordinates', async ({ page }) => {
    // Purpose: Assert that drawing operations occurred by inspecting pixel data at the coordinates used in the script.
    const graph = new GraphPage(page);

    // Coordinates defined in the page script
    const nodes = {
      A: { x: 100, y: 100 },
      B: { x: 200, y: 250 },
      C: { x: 400, y: 150 },
      D: { x: 500, y: 300 },
    };

    // Sample center pixel at each node location and assert it's painted (alpha > 0)
    for (const [id, pos] of Object.entries(nodes)) {
      const rgba = await graph.getPixelRGBA(pos.x, pos.y);
      // Node centers should show the green node fill; allow a tolerant check
      expect(rgba[3]).toBeGreaterThan(0); // alpha > 0
      const isGreen = isNearlyNodeGreen(rgba);
      // At least expect that the pixel is not blank/transparent; prefer green but tolerate overlaps.
      expect(isGreen || rgba[0] !== 255 || rgba[1] !== 255 || rgba[2] !== 255).toBeTruthy();
    }

    // Check midpoint of edge A-B for the white weight rectangle.
    const midAB = { x: Math.round((nodes.A.x + nodes.B.x) / 2), y: Math.round((nodes.A.y + nodes.B.y) / 2) };
    const rgbaMidAB = await graph.getPixelRGBA(midAB.x, midAB.y);
    expect(rgbaMidAB[3]).toBeGreaterThan(0);
    // The implementation draws a white fillRect for the weight label, so we expect near-white pixels at the midpoint.
    expect(isNearlyWhite(rgbaMidAB)).toBeTruthy();

    // Check midpoint of edge C-D for its weight box as well
    const midCD = { x: Math.round((nodes.C.x + nodes.D.x) / 2), y: Math.round((nodes.C.y + nodes.D.y) / 2) };
    const rgbaMidCD = await graph.getPixelRGBA(midCD.x, midCD.y);
    expect(rgbaMidCD[3]).toBeGreaterThan(0);
    expect(isNearlyWhite(rgbaMidCD)).toBeTruthy();
  });

  // Test: clicking the canvas does not crash the page and does not change drawing (idempotent for this app)
  test('User interaction: clicking the canvas does not produce runtime errors and does not alter the drawing', async ({ page }) => {
    // Purpose: Simulate a user click on the canvas and assert no page errors occur and canvas remains unchanged.
    const graph = new GraphPage(page);

    // Listen for uncaught exceptions and console.error messages during the click action
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => {
      // capture any uncaught exceptions thrown in page context
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // capture console messages of severity 'error' for later assertions
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture image data before click
    const beforeDataURL = await graph.getCanvasDataURL();

    // Click near the center of node C (should not be interactive)
    await graph.clickCanvasAt(400, 150);

    // Wait a moment for any potential runtime errors to surface
    await page.waitForTimeout(200);

    // Capture image data after click
    const afterDataURL = await graph.getCanvasDataURL();

    // Expect no uncaught page errors and no console.error messages have been produced during the interaction
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // For this static visualization, the canvas drawing should remain unchanged by clicking
    expect(afterDataURL).toBe(beforeDataURL);
  });

  // Test: verify that reading pixel data from the canvas behaves as expected (also surfaces any security/permission errors)
  test('Canvas API access: getImageData and toDataURL are available and return reasonable values', async ({ page }) => {
    // Purpose: Ensure common Canvas APIs used by tests are available and functional in the environment.
    const graph = new GraphPage(page);

    // Attempt to call getImageData at a location and toDataURL; if these throw, the test should surface that naturally.
    const rgba = await graph.getPixelRGBA(100, 100); // should not throw
    expect(Array.isArray(rgba)).toBeTruthy();
    expect(rgba.length).toBe(4);

    const dataURL = await graph.getCanvasDataURL();
    expect(typeof dataURL).toBe('string');
    expect(dataURL.startsWith('data:image/png')).toBeTruthy();
  });

  // Test: observe console and page errors on initial load and assert none occurred
  test('Observe console and page errors during initial load', async ({ page }) => {
    // Purpose: Collect console and uncaught errors that happen during the load of the page and assert expected behavior.
    const errors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => {
      errors.push(err);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Reload to capture events from navigation
    await page.reload({ waitUntil: 'load' });

    // Allow a small grace period for asynchronous errors to appear
    await page.waitForTimeout(200);

    // For this particular implementation there should be no runtime errors; assert that expectation.
    expect(errors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});