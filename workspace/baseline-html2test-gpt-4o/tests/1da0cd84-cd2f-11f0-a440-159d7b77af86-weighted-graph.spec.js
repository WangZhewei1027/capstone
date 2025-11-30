import { test, expect } from '@playwright/test';

// Test file: 1da0cd84-cd2f-11f0-a440-159d7b77af86-weighted-graph.spec.js
// Purpose: Validate the Weighted Graph HTML application renders correctly, has no interactive controls,
// and does not throw runtime errors. The tests inspect the canvas pixel data to ensure drawing occurred.

// Page Object for the Weighted Graph page
class WeightedGraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/1da0cd84-cd2f-11f0-a440-159d7b77af86.html', { waitUntil: 'load' });
  }

  // Get the canvas element handle
  async getCanvasHandle() {
    return await this.page.$('canvas#canvas');
  }

  // Retrieve canvas width/height attributes
  async getCanvasSize() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('canvas');
      return { width: c ? c.width : null, height: c ? c.height : null };
    });
  }

  // Read RGBA value of a single pixel at (x, y) from the canvas
  async getCanvasPixelRGBA(x, y) {
    return await this.page.evaluate(({ x, y }) => {
      const c = document.getElementById('canvas');
      if (!c) return null;
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      return [d[0], d[1], d[2], d[3]]; // [R,G,B,A]
    }, { x, y });
  }

  // Get data URL of the entire canvas (used to compare before/after states)
  async getCanvasDataURL() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('canvas');
      return c ? c.toDataURL() : null;
    });
  }

  // Count interactive controls on the page
  async countInteractiveControls() {
    return await this.page.evaluate(() => {
      return document.querySelectorAll('button, input, select, form, textarea').length;
    });
  }
}

test.describe('Weighted Graph Visualization (Application ID: 1da0cd84-cd2f-11f0-a440-159d7b77af86)', () => {
  let consoleMessages;
  let pageErrors;

  // Attach listeners to capture console messages and unhandled page errors for each test.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      // Capture the error message / stack for assertion later
      pageErrors.push(String(err && err.message ? err.message : err));
    });
  });

  // Test: initial page load and default state
  test('loads the page and initializes canvas with expected attributes', async ({ page }) => {
    // Arrange
    const graph = new WeightedGraphPage(page);

    // Act
    await graph.goto();

    // Assert: Page title contains expected text
    await expect(page).toHaveTitle(/Weighted Graph/i);

    // Assert: Canvas exists and has expected width/height attributes
    const canvasHandle = await graph.getCanvasHandle();
    expect(canvasHandle).not.toBeNull();

    const size = await graph.getCanvasSize();
    expect(size.width).toBe(600);
    expect(size.height).toBe(400);

    // Assert: No unhandled page errors were emitted during load
    expect(pageErrors.length).toBe(0);

    // Also assert there are no console 'error' messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Test: The canvas drawing contains non-white pixels at known coordinates (nodes & edges)
  test('renders nodes and edges on the canvas (pixel inspection)', async ({ page }) => {
    // This test samples specific coordinates where the graph nodes and edge labels should be rendered.
    const graph = new WeightedGraphPage(page);
    await graph.goto();

    // Coordinates from the HTML implementation: nodes at (100,100), (200,200), (300,100), (400,200), (500,100)
    // Sample the center of node 1 (100,100) — should be blue filled circle (not white)
    const node1Pixel = await graph.getCanvasPixelRGBA(100, 100);
    expect(node1Pixel).not.toBeNull();
    // The pixel should not be pure white (255,255,255) and should have some alpha
    expect(node1Pixel[3]).toBeGreaterThan(0);
    expect(!(node1Pixel[0] === 255 && node1Pixel[1] === 255 && node1Pixel[2] === 255)).toBeTruthy();

    // Sample the midpoint between node 1 and 2: nodes at (100,100) and (200,200) => midpoint (150,150)
    // The edge line and/or label "W:4" is drawn near the midpoint; pick a few y offsets to catch either the line or label.
    const midPointsToTest = [
      { x: 150, y: 150 },     // along the line
      { x: 150, y: 144 },     // near the label (midY - 6 as per implementation)
    ];

    let foundNonWhite = false;
    for (const p of midPointsToTest) {
      const px = await graph.getCanvasPixelRGBA(p.x, p.y);
      expect(px).not.toBeNull();
      if (!(px[0] === 255 && px[1] === 255 && px[2] === 255)) {
        foundNonWhite = true;
        break;
      }
    }
    // At least one of the sampled midpoints should be non-white (either the line or the label)
    expect(foundNonWhite).toBeTruthy();

    // Sample a second node to increase confidence that nodes are rendered: node at (300,100)
    const node3Pixel = await graph.getCanvasPixelRGBA(300, 100);
    expect(node3Pixel).not.toBeNull();
    expect(node3Pixel[3]).toBeGreaterThan(0);
    expect(!(node3Pixel[0] === 255 && node3Pixel[1] === 255 && node3Pixel[2] === 255)).toBeTruthy();

    // Ensure no runtime page errors occurred while reading pixel data
    expect(pageErrors.length).toBe(0);
  });

  // Test: There are no interactive controls (buttons, inputs, selects, forms) in the provided HTML
  test('does not expose interactive form controls in the DOM', async ({ page }) => {
    const graph = new WeightedGraphPage(page);
    await graph.goto();

    // Count interactive elements like buttons, inputs, selects, forms, textareas
    const count = await graph.countInteractiveControls();
    // The HTML has none of these elements; assert 0
    expect(count).toBe(0);

    // Confirm canvas remains focusable or at least present
    const canvasHandle = await graph.getCanvasHandle();
    expect(canvasHandle).not.toBeNull();
  });

  // Test: Clicking the canvas does not alter the drawing or produce errors
  test('clicking the canvas does not change the rendered graph and does not produce runtime errors', async ({ page }) => {
    const graph = new WeightedGraphPage(page);
    await graph.goto();

    // Capture a snapshot of the canvas before interaction
    const beforeDataURL = await graph.getCanvasDataURL();
    expect(beforeDataURL).not.toBeNull();

    // Click at several positions (on a node and on an edge)
    await page.mouse.click(100, 100); // node 1 center
    await page.mouse.click(150, 150); // edge between node 1 and 2
    await page.mouse.click(500, 100); // node 5 center

    // Give the page a tiny moment to process any potential handlers (there are none)
    await page.waitForTimeout(100);

    // Capture canvas snapshot after interactions
    const afterDataURL = await graph.getCanvasDataURL();
    expect(afterDataURL).not.toBeNull();

    // Since the application doesn't implement interactivity, the canvas should remain unchanged.
    expect(afterDataURL).toBe(beforeDataURL);

    // No new page errors should have been emitted as a result of clicks
    expect(pageErrors.length).toBe(0);

    // No console error messages should be present
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  // Accessibility & semantics checks for the canvas
  test('canvas has semantic presence and is discoverable in the accessibility tree to some degree', async ({ page }) => {
    const graph = new WeightedGraphPage(page);
    await graph.goto();

    // The page contains a single <canvas id="canvas"> element. Ensure it is present in the DOM.
    const canvasHandle = await graph.getCanvasHandle();
    expect(canvasHandle).not.toBeNull();

    // The HTML does not provide ARIA labels; assert that aria-label is absent (explicitly checking expectations)
    const ariaLabel = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      return c ? c.getAttribute('aria-label') : null;
    });
    expect(ariaLabel).toBeNull();

    // Ensure the element has no keyboard interactive role by default; try focusing it and ensure no error occurs.
    // Attempt to focus the canvas; some browsers allow focus, others may not. We simply ensure no exception is thrown.
    await page.evaluate(() => {
      const c = document.getElementById('canvas');
      if (c && typeof c.focus === 'function') {
        try { c.focus(); } catch (e) { /* swallow synchronous focus exceptions for the check */ }
      }
      return true;
    });

    // No page errors should have resulted from accessibility checks
    expect(pageErrors.length).toBe(0);
  });

  // Final sanity check: ensure there were no unexpected runtime exceptions across tests
  test('sanity: application did not emit unhandled JS errors during use', async ({ page }) => {
    const graph = new WeightedGraphPage(page);
    await graph.goto();

    // If any page errors were captured earlier in this test run, fail with diagnostic information.
    expect(pageErrors.length).toBe(0, `Unexpected page errors: ${JSON.stringify(pageErrors)}`);

    // Also ensure there are no console error type messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0, `Console errors were emitted: ${JSON.stringify(consoleErrors)}`);
  });
});