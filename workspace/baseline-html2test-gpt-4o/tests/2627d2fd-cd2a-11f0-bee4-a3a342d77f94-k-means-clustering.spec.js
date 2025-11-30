import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2fd-cd2a-11f0-bee4-a3a342d77f94.html';

/**
 * Page Object for the K-Means demo page.
 * Encapsulates common interactions and queries so tests are easier to read.
 */
class KMeansPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.runButton = page.getByRole('button', { name: 'Run K-Means' });
  }

  // Navigate to the app root and wait for full load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Click the Run K-Means button
  async clickRun() {
    await this.runButton.click();
  }

  // Read points array from the page (reads window.points)
  async getPoints() {
    return await this.page.evaluate(() => {
      // Return a shallow copy of points for assertions
      return (window.points || []).map(p => ({ x: p.x, y: p.y }));
    });
  }

  // Read centroids array from the page (reads window.centroids)
  async getCentroids() {
    return await this.page.evaluate(() => {
      return (window.centroids || []).map(c => ({ x: c.x, y: c.y }));
    });
  }

  // Read configuration constants like K and colors
  async getConfig() {
    return await this.page.evaluate(() => {
      return {
        K: window.K,
        colors: window.colors ? window.colors.slice() : undefined,
        canvasWidth: window.canvas ? window.canvas.width : undefined,
        canvasHeight: window.canvas ? window.canvas.height : undefined
      };
    });
  }

  // Ask the page to run the assignClusters() function and return result
  async getAssignedClusters() {
    return await this.page.evaluate(() => {
      if (typeof assignClusters !== 'function') return null;
      return assignClusters();
    });
  }

  // Check whether the canvas element is present and has the requested size attributes
  async getCanvasSize() {
    return await this.page.evaluate(() => {
      const c = document.getElementById('canvas');
      if (!c) return null;
      return { width: c.width, height: c.height };
    });
  }
}

test.describe('K-Means Clustering Demo - End to End', () => {
  // Basic smoke test: page loads, canvas and button visible, variables initialized
  test('Initial page load: canvas, button and internal data structures are initialized', async ({ page }) => {
    // Purpose: Verify that the page loads and internal structures (points, centroids, K) exist with expected types/lengths.
    const app = new KMeansPage(page);

    // Collect console messages and page errors during load to inspect later
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await app.goto();

    // DOM checks
    await expect(app.canvas).toBeVisible();
    await expect(app.runButton).toBeVisible();
    await expect(app.runButton).toBeEnabled();

    // Validate canvas dimensions
    const size = await app.getCanvasSize();
    expect(size).not.toBeNull();
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(size.width).toBe(600); // as per HTML
    expect(size.height).toBe(600);

    // Validate JS variables on the page
    const points = await app.getPoints();
    expect(Array.isArray(points)).toBeTruthy();
    expect(points.length).toBe(100); // generated with length: 100

    // Ensure each point has numeric coordinates within canvas bounds
    for (const p of points) {
      expect(typeof p.x).toBe('number');
      expect(typeof p.y).toBe('number');
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(size.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(size.height);
    }

    const centroids = await app.getCentroids();
    expect(Array.isArray(centroids)).toBeTruthy();
    expect(centroids.length).toBe(3); // K = 3

    // Centroids are initially assigned via Math.floor random integers; assert they are integers
    for (const c of centroids) {
      expect(typeof c.x).toBe('number');
      expect(typeof c.y).toBe('number');
      // They should be integers initially because of Math.floor in initialization
      expect(Number.isInteger(c.x)).toBeTruthy();
      expect(Number.isInteger(c.y)).toBeTruthy();
    }

    const config = await app.getConfig();
    expect(config.K).toBe(3);
    expect(Array.isArray(config.colors)).toBeTruthy();
    expect(config.colors.length).toBeGreaterThanOrEqual(3);

    // Ensure there were no uncaught page errors during load
    expect(pageErrors.length).toBe(0);

    // We allow console messages (info) but assert that there are no console error messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Run K-Means button: triggers clustering and updates centroids and clusters', async ({ page }) => {
    // Purpose: Validate that clicking the "Run K-Means" button runs the algorithm,
    // updates centroids (to potentially non-integer averaged values) and that clusters are assigned.
    const app = new KMeansPage(page);

    // Collect page errors and console errors during interaction to assert none occur
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await app.goto();

    // Snapshot centroids before running
    const centroidsBefore = await app.getCentroids();
    expect(centroidsBefore.length).toBe(3);

    // Click the Run K-Means button
    await app.clickRun();

    // runKMeans is synchronous in the page script but loops; still give brief time for any async work
    await page.waitForTimeout(200);

    // Get centroids after running
    const centroidsAfter = await app.getCentroids();
    expect(centroidsAfter.length).toBe(3);

    // At least one centroid should have been updated to the averaged position (which may be non-integer)
    // Check that at least one centroid has a non-integer coordinate (averaging produces floats).
    const hasNonIntegerCentroid = centroidsAfter.some(c => !Number.isInteger(c.x) || !Number.isInteger(c.y));
    expect(hasNonIntegerCentroid).toBeTruthy();

    // Ensure centroids are within canvas bounds and are numeric
    const size = await app.getCanvasSize();
    for (const c of centroidsAfter) {
      expect(typeof c.x).toBe('number');
      expect(typeof c.y).toBe('number');
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(size.width);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(size.height);
    }

    // Ensure assignClusters works and returns an array the same length as points
    const clusters = await app.getAssignedClusters();
    expect(Array.isArray(clusters)).toBeTruthy();
    expect(clusters.length).toBe(100);

    // Verify cluster values are in the expected range 0..K-1
    const config = await app.getConfig();
    const invalidCluster = clusters.find(c => typeof c !== 'number' || c < 0 || c >= config.K);
    expect(invalidCluster).toBeUndefined();

    // No uncaught page errors or console errors should have been recorded during the operation
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('UI accessibility: Run K-Means button is discoverable via role and name', async ({ page }) => {
    // Purpose: Ensure accessibility basics - the main button is reachable by role/name and actionable.
    const app = new KMeansPage(page);
    await app.goto();

    // The button should be available via ARIA role API and readable name "Run K-Means"
    const runBtn = page.getByRole('button', { name: 'Run K-Means' });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();

    // Clicking via the accessible locator should trigger the same behavior as a direct click
    const centroidsBefore = await app.getCentroids();
    await runBtn.click();
    await page.waitForTimeout(150);
    const centroidsAfter = await app.getCentroids();

    // Ensure some change occurred (centroids likely updated)
    const changed = centroidsAfter.some((c, i) => c.x !== centroidsBefore[i].x || c.y !== centroidsBefore[i].y);
    expect(changed).toBeTruthy();
  });

  test('Resilience: repeated runs do not produce runtime errors', async ({ page }) => {
    // Purpose: Repeatedly invoke the algorithm and assert no errors are thrown or logged.
    const app = new KMeansPage(page);

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await app.goto();

    // Click the button multiple times to simulate repeated user interactions
    for (let i = 0; i < 5; i++) {
      await app.clickRun();
      // small pause to allow the synchronous computation to finish and any console messages to appear
      await page.waitForTimeout(100);
    }

    // Ensure no page errors or console errors occurred during repeated interactions
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // Final sanity checks on centroids remain valid
    const centroids = await app.getCentroids();
    const size = await app.getCanvasSize();
    for (const c of centroids) {
      expect(Number.isFinite(c.x)).toBeTruthy();
      expect(Number.isFinite(c.y)).toBeTruthy();
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(size.width);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(size.height);
    }
  });

  test('Debug and diagnostics: capture console messages and page errors during load and interaction', async ({ page }) => {
    // Purpose: Observe and assert console and page errors (if any). This test collects diagnostics and
    // explicitly fails if unexpected errors are logged during normal operations.
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    const app = new KMeansPage(page);
    await app.goto();

    // Interact
    await app.clickRun();
    await page.waitForTimeout(200);

    // Report (assert) that no uncaught errors occurred
    // This assertion makes sure the application does not produce runtime exceptions.
    expect(pageErrors.length).toBe(0);

    // Ensure there are no console.error messages; we allow console.log/info messages.
    const consoleErrorMessages = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorMessages.length).toBe(0);
  });
});