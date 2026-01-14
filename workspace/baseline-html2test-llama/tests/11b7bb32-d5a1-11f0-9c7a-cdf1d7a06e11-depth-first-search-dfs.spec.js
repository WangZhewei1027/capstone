import { test, expect } from '@playwright/test';

// Test file for Application ID:
// 11b7bb32-d5a1-11f0-9c7a-cdf1d7a06e11
// Depth-First Search (DFS) interactive page
//
// This test suite:
// - Loads the page as-is without modifying any global variables or functions.
// - Observes console messages and page errors (lets any errors happen naturally).
// - Verifies DOM structure, interactive controls, and visible/state changes.
// - Asserts internal JS globals that the page exposes (without patching).
//
// NOTE: The page under test declares some globals (graphData, graphVertices).
// We only read them via page.evaluate; we do not inject or override anything.

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb32-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object Model for the DFS page
class DFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#graph');
    this.dfsButton = page.locator('#dfs-btn');
    this.canvas = page.locator('#graph-canvas');
  }

  // Navigate to the app and attach error/console watchers
  async gotoAndMonitor(consoleMessages, pageErrors) {
    // Attach monitors before navigation to capture any early errors
    this.page.on('console', (msg) => {
      consoleMessages.push(msg);
    });
    this.page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Enter vertices text into the input field (simulates user typing)
  async enterVertices(text) {
    await this.input.fill(text);
  }

  // Click the DFS button
  async clickDFS() {
    await this.dfsButton.click();
  }

  // Read the visible text content on the page (if any)
  async getButtonText() {
    return await this.dfsButton.innerText();
  }

  async getInputPlaceholder() {
    return await this.input.getAttribute('placeholder');
  }

  async getInputValue() {
    return await this.input.inputValue();
  }

  async isButtonEnabled() {
    return await this.dfsButton.isEnabled();
  }

  // Read canvas dimensions
  async getCanvasSize() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('graph-canvas');
      return { width: c.width, height: c.height };
    });
  }

  // Get the alpha value of the pixel at the center of the canvas.
  // Alpha == 0 indicates transparent (no fill), alpha > 0 indicates drawn content.
  async getCanvasCenterPixelAlpha() {
    return await this.page.evaluate(() => {
      const c1 = document.getElementById('graph-canvas');
      const ctx = c.getContext('2d');
      // If canvas has zero width/height, return null to indicate no drawing area.
      if (c.width === 0 || c.height === 0) return null;
      const x = Math.floor(c.width / 2);
      const y = Math.floor(c.height / 2);
      try {
        const data = ctx.getImageData(x, y, 1, 1).data;
        return data[3]; // alpha channel (0-255)
      } catch (e) {
        // getImageData may throw if cross-origin or other issues; propagate sentinel
        return `error:${e.message}`;
      }
    });
  }

  // Read the internal global variables that the page defines (read-only)
  async getInternalGraphData() {
    return await this.page.evaluate(() => {
      // The page declares `let graphData` in the global scope; read it.
      // If not present, this returns undefined.
      return window.graphData;
    });
  }

  async getInternalGraphVertices() {
    return await this.page.evaluate(() => {
      return window.graphVertices;
    });
  }
}

test.describe('Depth-First Search (DFS) interactive page - basic behaviors and edge cases', () => {
  // Each test will collect console messages and page errors that occur during the navigation and interactions.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    // Note: navigation is done in each test to ensure fresh monitors and environment per test.
  });

  test('Initial page load: structure, input and button are present and enabled', async ({ page }) => {
    // Purpose:
    // Verify the page loads, the main interactive elements exist, and initial attributes are as expected.
    const dfs = new DFSPage(page);
    await dfs.gotoAndMonitor(consoleMessages, pageErrors);

    // Assert no uncaught page errors occurred during load.
    expect(pageErrors).toHaveLength(0);

    // Verify input and button locators are visible and enabled
    await expect(dfs.input).toBeVisible();
    await expect(dfs.dfsButton).toBeVisible();
    expect(await dfs.isButtonEnabled()).toBe(true);

    // Verify placeholder text on the input and button label text
    expect(await dfs.getInputPlaceholder()).toBe('Enter vertices (space-separated):');
    expect((await dfs.getButtonText()).trim()).toBe('Depth-First Search');

    // Canvas is present; before clicking, its width/height might be 0 (not yet initialized by script)
    await expect(dfs.canvas).toBeVisible();

    // There should be no console errors during initial load (we allow warnings/info)
    const errors = consoleMessages.filter((m) => m.type() === 'error');
    expect(errors.length).toBe(0);
  });

  test('Clicking DFS without typing should set up canvas dimensions but not draw nodes; internal graph variables reflect empty input behavior', async ({ page }) => {
    // Purpose:
    // Confirm the button click executes the script path when no vertices have been typed.
    // The page's implementation uses a global `graphData` variable (not input.value).
    const dfs1 = new DFSPage(page);
    await dfs.gotoAndMonitor(consoleMessages, pageErrors);

    // Sanity: ensure input is empty initially
    expect(await dfs.getInputValue()).toBe('');

    // Click the DFS button
    await dfs.clickDFS();

    // After click, the script sets canvas.width and canvas.height to 300x200.
    const size = await dfs.getCanvasSize();
    expect(size).toEqual({ width: 300, height: 200 });

    // The script uses a global `graphData` string (initially ''), and sets graphVertices based on it.
    // Since the code never reads input.value into graphData, graphData should remain ''.
    const internalGraphData = await dfs.getInternalGraphData();
    expect(internalGraphData).toBe(''); // confirm it remained the initial empty string

    // graphVertices should be set by the script to [""] because graphData.trim().split(' ') on '' yields ['']
    const internalVertices = await dfs.getInternalGraphVertices();
    // It may be undefined if the page didn't reach that code path, but per script it assigns.
    expect(Array.isArray(internalVertices)).toBe(true);
    expect(internalVertices.length).toBeGreaterThanOrEqual(1);
    // The first (and only) vertex expected to be empty string
    expect(internalVertices[0]).toBe('');

    // Inspect the canvas center pixel alpha to check whether anything was drawn.
    // Given the implementation's control flow, it does not enter the isCurrent=true branch for the initial stack,
    // so no fillRect or text should be drawn and the canvas should be transparent (alpha 0).
    const centerAlpha = await dfs.getCanvasCenterPixelAlpha();
    // If getImageData succeeded, we expect alpha === 0 (transparent).
    if (typeof centerAlpha === 'number') {
      expect(centerAlpha).toBe(0);
    } else {
      // In case getImageData couldn't be read for environment reasons, assert it's not a runtime fatal error string.
      expect(centerAlpha).not.toMatch(/^error:/);
    }

    // Assert no unexpected page errors were thrown during the interaction
    expect(pageErrors).toHaveLength(0);

    // Also assert that no console errors were emitted
    const consoleErrors = consoleMessages.filter((m) => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Typing vertices into the input does not affect the internal graphData (page uses its own global) - show mismatch between UI and internal state', async ({ page }) => {
    // Purpose:
    // Demonstrate that user input into the #graph input field is not read by the script,
    // and thus internal variables remain independent of what the user typed.
    const dfs2 = new DFSPage(page);
    await dfs.gotoAndMonitor(consoleMessages, pageErrors);

    // Type a list of vertices into the visible input field
    await dfs.enterVertices('A B C');

    // Confirm the input's value reflects what the user typed
    expect(await dfs.getInputValue()).toBe('A B C');

    // Click the DFS button
    await dfs.clickDFS();

    // The page's global graphData should still be '' if the script never copied input.value to it.
    const internalGraphData1 = await dfs.getInternalGraphData();
    expect(internalGraphData).toBe(''); // expected based on the page's implementation

    // graphVertices will be an array derived from graphData (likely [''])
    const internalVertices1 = await dfs.getInternalGraphVertices();
    expect(Array.isArray(internalVertices)).toBe(true);
    // None of the internal vertices should equal 'A' because graphData was not updated
    expect(internalVertices.join(' ')).not.toContain('A');

    // There should be no uncaught page errors
    expect(pageErrors).toHaveLength(0);
  });

  test('Edge case: entering only whitespace and clicking DFS leads to graphVertices containing an empty string element', async ({ page }) => {
    // Purpose:
    // Validate how the script handles whitespace-only input at the internal variable level.
    // Because the script uses graphData.trim().split(' '), if graphData is '', we expect [''].
    const dfs3 = new DFSPage(page);
    await dfs.gotoAndMonitor(consoleMessages, pageErrors);

    // Simulate typing whitespace into the input (though script doesn't read input.value)
    await dfs.enterVertices('   ');

    // Click the DFS button
    await dfs.clickDFS();

    // Examine internal graphVertices
    const vertices = await dfs.getInternalGraphVertices();
    expect(Array.isArray(vertices)).toBe(true);
    // For the current implementation, expect at least one element and that first element is ''
    expect(vertices.length).toBeGreaterThan(0);
    expect(vertices[0]).toBe('');

    // No uncaught exceptions
    expect(pageErrors).toHaveLength(0);
  });

  test('Console and page error monitoring: capture any runtime errors during interactions', async ({ page }) => {
    // Purpose:
    // Ensure our monitoring hooks capture console errors and page errors.
    // This test intentionally performs interactions and then inspects captured messages.
    const dfs4 = new DFSPage(page);
    await dfs.gotoAndMonitor(consoleMessages, pageErrors);

    // Perform an interaction sequence
    await dfs.enterVertices('X Y Z');
    await dfs.clickDFS();

    // After interactions, inspect captured console messages and page errors.
    // We do not expect runtime errors for this page, so assert zero pageErrors.
    expect(pageErrors).toHaveLength(0);

    // Filter console errors (if any)
    const consoleErrors1 = consoleMessages.filter((m) => m.type() === 'error');

    // The test asserts that there are no console error-level messages during normal operation.
    expect(consoleErrors.length).toBe(0);

    // Additionally, verify at least some console messages were captured (info/debug) or none,
    // but we ensure the monitoring itself worked by ensuring consoleMessages is defined.
    expect(Array.isArray(consoleMessages)).toBe(true);
  });
});