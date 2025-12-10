import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d579120-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Prim's Algorithm page
class PrimsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app and wait for load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Click the Start Prim's Algorithm button
  async clickStart() {
    await this.page.click('button[onclick="startPrims()"]');
  }

  // Click the Reset button
  async clickReset() {
    await this.page.click('button[onclick="reset()"]');
  }

  // Get the serialized canvas image (data URL)
  async getCanvasDataURL() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      // toDataURL should always be available in browser context; return empty string if not
      try {
        return canvas.toDataURL('image/png');
      } catch (e) {
        return '';
      }
    });
  }

  // Read a global variable from the page context
  async getGlobal(name) {
    return await this.page.evaluate((n) => {
      // return undefined if not present
      return window[n];
    }, name);
  }

  // Get the type of a global (e.g., 'function' or 'undefined')
  async getGlobalType(name) {
    return await this.page.evaluate((n) => {
      return typeof window[n];
    }, name);
  }
}

test.describe('Prim\'s Algorithm Visualization - FSM states and transitions', () => {
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors for each test
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.describe('Initialization and Idle state (S0_Idle)', () => {
    test('Page loads and initial functions/variables exist; drawGraph is called on load', async ({ page }) => {
      const p = new PrimsPage(page);

      // Load the page
      await p.goto();

      // Verify core global functions exist as expected by the FSM
      const drawGraphType = await p.getGlobalType('drawGraph');
      const startPrimsType = await p.getGlobalType('startPrims');
      const resetType = await p.getGlobalType('reset');
      const primsAlgorithmType = await p.getGlobalType('primsAlgorithm');

      // Assert functions are defined
      expect(drawGraphType).toBe('function');
      expect(startPrimsType).toBe('function');
      expect(resetType).toBe('function');
      expect(primsAlgorithmType).toBe('function');

      // Verify initial variables are present and in expected idle values
      const visited = await p.getGlobal('visited');
      const mst = await p.getGlobal('mst');
      const currentVertex = await p.getGlobal('currentVertex');
      const vertices = await p.getGlobal('vertices');

      // drawGraph() called at script end; initial visited is an empty array (idle)
      expect(Array.isArray(visited)).toBeTruthy();
      expect(visited.length).toBe(0);

      // mst should be an array (initialized in script)
      expect(Array.isArray(mst)).toBeTruthy();

      // currentVertex should be defined (initial value is 0 in declaration, but after script it is 0)
      expect(typeof currentVertex === 'number' || currentVertex === undefined).toBeTruthy();

      // vertices should be an array with expected length (5 from the HTML)
      expect(Array.isArray(vertices)).toBeTruthy();
      expect(vertices.length).toBeGreaterThanOrEqual(5);

      // Verify the canvas has some drawing after initial drawGraph
      const initialDataURL = await p.getCanvasDataURL();
      expect(typeof initialDataURL).toBe('string');
      // Ensure it's a non-empty PNG data URL
      expect(initialDataURL.startsWith('data:image/png')).toBeTruthy();
      expect(initialDataURL.length).toBeGreaterThan(1000);

      // Assert no uncaught page errors occurred during load
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Start Prim\'s Algorithm (S1_AlgorithmRunning) and transition from Idle -> Running', () => {
    test('Click Start triggers startPrims and updates visited, and the canvas changes over time', async ({ page }) => {
      const p1 = new PrimsPage(page);
      await p.goto();

      // Capture canvas before starting
      const beforeStart = await p.getCanvasDataURL();

      // Click the Start button to transition to S1_AlgorithmRunning
      await p.clickStart();

      // Immediately after clicking startPrims, visited should be an array with vertices.length entries
      const visitedAfterStart = await p.getGlobal('visited');
      const vertices1 = await p.getGlobal('vertices1');
      expect(Array.isArray(visitedAfterStart)).toBeTruthy();
      expect(visitedAfterStart.length).toBe(vertices.length);

      // The first vertex (index 0) should be marked visited true by startPrims
      expect(visitedAfterStart[0]).toBeTruthy();

      // Check that mst variable was reset by startPrims
      const mstAfterStart = await p.getGlobal('mst');
      expect(Array.isArray(mstAfterStart)).toBeTruthy();
      expect(mstAfterStart.length).toBe(0);

      // The canvas should change visually as the algorithm runs.
      // The algorithm draws progressively with timeouts. Wait enough time for all scheduled visual updates.
      // vertices.length = 5 -> final display of total weight happens after 1000 * (vertices.length - 1) = 4000ms
      await page.waitForTimeout(5200); // wait a bit longer than the total animation time

      const afterStart = await p.getCanvasDataURL();

      // The canvas content should differ after the algorithm has run (blue edges / total weight text)
      expect(afterStart).not.toBe(beforeStart);

      // There should be no uncaught errors while algorithm runs
      expect(pageErrors.length).toBe(0);

      // Assert that console captured some messages (if any). Not required to be non-empty, but record for debug.
      // This is informational; keep an assertion that consoleMessages is an array.
      expect(Array.isArray(consoleMessages)).toBeTruthy();
    }, 20000); // extended timeout for animations
  });

  test.describe('Reset behavior (S2_Reset) and transition Running -> Idle', () => {
    test('Click Reset returns visualization to initial state and visited/mst are cleared', async ({ page }) => {
      const p2 = new PrimsPage(page);
      await p.goto();

      // Save initial canvas snapshot to compare after reset
      const initialSnapshot = await p.getCanvasDataURL();

      // Start algorithm to change state
      await p.clickStart();

      // Wait a short while to let startPrims take effect (but not necessarily finish all timeouts)
      await page.waitForTimeout(200);

      // Ensure visited changed from initial (empty) to an array including a true at index 0
      const visitedDuringRun = await p.getGlobal('visited');
      expect(Array.isArray(visitedDuringRun)).toBeTruthy();
      expect(visitedDuringRun.length).toBeGreaterThan(0);
      expect(visitedDuringRun[0]).toBeTruthy();

      // Now click Reset to transition to S2_Reset
      await p.clickReset();

      // After reset, visited should be an empty array again (per implementation)
      const visitedAfterReset = await p.getGlobal('visited');
      expect(Array.isArray(visitedAfterReset)).toBeTruthy();
      expect(visitedAfterReset.length).toBe(0);

      // mst should be reset as well
      const mstAfterReset = await p.getGlobal('mst');
      expect(Array.isArray(mstAfterReset)).toBeTruthy();
      expect(mstAfterReset.length).toBe(0);

      // Canvas should be redrawn to reflect reset (should match initial snapshot)
      const afterResetSnapshot = await p.getCanvasDataURL();

      // Because drawing after reset uses the same logic as initial drawGraph(), image should match initial
      expect(afterResetSnapshot).toBe(initialSnapshot);

      // No uncaught page errors during reset
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Click Start multiple times and Start then immediate Reset - no uncaught exceptions', async ({ page }) => {
      const p3 = new PrimsPage(page);
      await p.goto();

      // Click start multiple times in quick succession
      await p.clickStart();
      await p.clickStart();
      await p.clickStart();

      // The implementation of startPrims replaces visited each time; check that visited is an array and first entry true
      const visitedAfterMultipleStarts = await p.getGlobal('visited');
      expect(Array.isArray(visitedAfterMultipleStarts)).toBeTruthy();
      expect(visitedAfterMultipleStarts.length).toBeGreaterThan(0);
      expect(visitedAfterMultipleStarts[0]).toBeTruthy();

      // Now click start and immediately reset to simulate racing/timeouts
      await p.clickStart();
      await p.clickReset();

      // Wait longer than the longest scheduled timeout from the algorithm to allow any pending timeouts to fire
      await page.waitForTimeout(5200);

      // After potential pending timeouts, ensure no uncaught page errors occurred
      expect(pageErrors.length).toBe(0);

      // After these operations, ensure the page remains responsive and global functions still exist
      const startType = await p.getGlobalType('startPrims');
      const resetType1 = await p.getGlobalType('reset');
      expect(startType).toBe('function');
      expect(resetType).toBe('function');

      // Ensure canvas still returns a valid image
      const canvasImg = await p.getCanvasDataURL();
      expect(typeof canvasImg).toBe('string');
      expect(canvasImg.startsWith('data:image/png')).toBeTruthy();
      expect(canvasImg.length).toBeGreaterThan(1000);
    }, 30000);

    test('Observe and assert console/page errors (if any) are captured; expect none for this implementation', async ({ page }) => {
      const p4 = new PrimsPage(page);
      await p.goto();

      // Do some interactions that exercise code paths
      await p.clickStart();
      await page.waitForTimeout(100);
      await p.clickReset();
      await page.waitForTimeout(100);

      // We assert that no pageerror events were emitted during these interactions.
      // This both documents observation and enforces that runtime errors (ReferenceError/SyntaxError/TypeError) did not occur
      expect(pageErrors.length).toBe(0);

      // Log console messages collected for debugging purposes (kept as assertions about structure)
      expect(Array.isArray(consoleMessages)).toBeTruthy();
      consoleMessages.forEach(msg => {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('text');
      });
    });
  });
});