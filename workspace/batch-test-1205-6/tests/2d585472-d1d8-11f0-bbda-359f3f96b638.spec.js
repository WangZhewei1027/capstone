import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d585472-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the K-Means Demo page
class KMeansPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getStartButton() {
    return this.page.locator('#startButton');
  }

  async clickStart() {
    await this.page.click('#startButton');
  }

  async getCanvasDataUrl() {
    return this.page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      // toDataURL will throw if canvas is tainted; let that happen naturally if it occurs
      return canvas.toDataURL();
    });
  }

  async getPointsLength() {
    return this.page.evaluate(() => {
      // Access the global points array created by the page script
      return typeof points !== 'undefined' ? points.length : null;
    });
  }

  async getClustersLength() {
    return this.page.evaluate(() => {
      return typeof clusters !== 'undefined' ? clusters.length : null;
    });
  }

  async getSomePointClusterInfo(index = 0) {
    return this.page.evaluate((i) => {
      if (typeof points === 'undefined' || points.length === 0) return null;
      const p = points[i] || points[0];
      return {
        hasCluster: !!p.cluster,
        clusterColor: p.cluster ? p.cluster.color : null,
        clusterIndex: p.cluster ? p.cluster.index : null,
        x: p.x,
        y: p.y
      };
    }, index);
  }

  async getClustersInfo() {
    return this.page.evaluate(() => {
      if (typeof clusters === 'undefined') return null;
      return clusters.map(c => ({ x: c.x, y: c.y, color: c.color }));
    });
  }
}

test.describe('K-Means Clustering Demo - FSM validation (App ID: 2d585472-d1d8-11f0-bbda-359f3f96b638)', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Capture page errors and console messages for assertions later
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // Record console messages and their types
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Initial state S0_Idle: generateRandomPoints(100) executed on load', async ({ page }) => {
    // This test validates the FSM initial state S0_Idle entry action:
    // - generateRandomPoints(100) should run on page load
    // - points.length should be 100
    // - clusters should not be initialized yet (clusters.length === 0)
    // - no uncaught page errors should occur during initial load

    const app = new KMeansPage(page);
    await app.goto();

    // Confirm no uncaught exceptions occurred during load
    expect(pageErrors.length, 'No uncaught page errors on initial load').toBe(0);

    // points.length should be 100 as per initial entry action generateRandomPoints(100)
    const pointsLen = await app.getPointsLength();
    expect(pointsLen, 'Initial points length from generateRandomPoints(100)').toBe(100);

    // clusters should be an array but not initialized until clustering starts (clusters.length === 0)
    const clustersLen = await app.getClustersLength();
    // If clusters variable exists but empty array expected; if undefined, allow null but fail explicitly
    expect(clustersLen, 'Clusters should be present and length 0 before starting clustering').toBe(0);

    // Canvas should not yet be drawn by the initial entry action (generateRandomPoints doesn't draw on load)
    // Capture the canvas data URL to compare later after clustering starts.
    const dataUrlBefore = await app.getCanvasDataUrl();
    expect(typeof dataUrlBefore).toBe('string');
    // Data URL should at least indicate a PNG image; exact content not asserted here
    expect(dataUrlBefore.startsWith('data:image/png')).toBe(true);

    // Ensure no console errors were emitted during load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages on initial load').toBe(0);
  });

  test('Transition S0_Idle -> S1_Clustering on StartClustering click: clusters initialized and clustering runs', async ({ page }) => {
    // This test validates the transition triggered by clicking #startButton:
    // - points array is reset to 100
    // - clusters are initialized (length equals numClusters === 3)
    // - kMeansClustering runs, which assigns points to clusters and updates centroids
    // - canvas is updated after clustering
    // - no uncaught exceptions occur during the transition

    const app1 = new KMeansPage(page);
    await app.goto();

    // Capture canvas before clicking to compare changes
    const beforeClickDataUrl = await app.getCanvasDataUrl();

    // Ensure initial conditions
    expect(await app.getPointsLength()).toBe(100);
    expect(await app.getClustersLength()).toBe(0);

    // Click start to trigger clustering
    await app.clickStart();

    // Wait briefly to allow the synchronous clustering algorithm (runs on main thread) to complete.
    // The page's kMeansClustering runs a finite loop synchronously; a short wait ensures the browser finishes painting.
    await page.waitForTimeout(200);

    // After click: points should be reset to 100
    const pointsLenAfter = await app.getPointsLength();
    expect(pointsLenAfter, 'Points length after starting clustering').toBe(100);

    // clusters should now be initialized to numClusters (3)
    const clustersLenAfter = await app.getClustersLength();
    expect(clustersLenAfter, 'Clusters length after starting clustering (numClusters)').toBeGreaterThanOrEqual(1);
    // The implementation defines numClusters = 3; check for at least 3 centroids
    expect(clustersLenAfter, 'Expect numClusters (3) centroids created').toBe(3);

    // Validate that points have been assigned to clusters (cluster property on a sample point)
    const samplePointInfo = await app.getSomePointClusterInfo(0);
    expect(samplePointInfo, 'Sample point cluster info should be available').not.toBeNull();
    expect(samplePointInfo.hasCluster, 'Sample point should have a cluster assigned after clustering').toBe(true);
    expect(typeof samplePointInfo.clusterColor).toBe('string');
    expect(samplePointInfo.clusterIndex).not.toBeNull();

    // Validate clusters/centroids coordinates are within canvas bounds (0..width/height)
    const clustersInfo = await app.getClustersInfo();
    expect(Array.isArray(clustersInfo)).toBe(true);
    clustersInfo.forEach((c, idx) => {
      expect(typeof c.x).toBe('number');
      expect(typeof c.y).toBe('number');
      expect(typeof c.color).toBe('string');
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(500);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(500);
    });

    // Canvas should have been updated by draw calls during clustering -> data URL should change
    const afterClickDataUrl = await app.getCanvasDataUrl();
    expect(afterClickDataUrl).not.toBeNull();
    expect(afterClickDataUrl.startsWith('data:image/png')).toBe(true);
    expect(afterClickDataUrl, 'Canvas should be updated after clustering (dataURL differs)').not.toEqual(beforeClickDataUrl);

    // Ensure no uncaught exceptions occurred during the click/transition
    expect(pageErrors.length, 'No uncaught page errors during clustering transition').toBe(0);

    // Ensure no console.error messages were emitted during clustering
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'No console.error messages during clustering transition').toBe(0);
  });

  test('Edge case: multiple rapid Start clicks should reset points and clusters without uncaught errors', async ({ page }) => {
    // This test checks robustness: clicking the start button multiple times rapidly should:
    // - reinitialize points and clusters each time
    // - not produce uncaught JS errors
    const app2 = new KMeansPage(page);
    await app.goto();

    // First click
    await app.clickStart();
    await page.waitForTimeout(150);

    const pointsAfterFirst = await app.getPointsLength();
    const clustersAfterFirst = await app.getClustersLength();
    expect(pointsAfterFirst).toBe(100);
    expect(clustersAfterFirst).toBe(3);

    // Click again rapidly
    await Promise.all([
      app.clickStart(),
      app.clickStart(),
      app.clickStart()
    ]);
    // Give some time for synchronous clustering to finish painting
    await page.waitForTimeout(300);

    const pointsAfterMultiple = await app.getPointsLength();
    const clustersAfterMultiple = await app.getClustersLength();
    expect(pointsAfterMultiple, 'Points length after multiple starts should still be 100').toBe(100);
    expect(clustersAfterMultiple, 'Clusters length after multiple starts should still equal numClusters (3)').toBe(3);

    // Confirm at least one point remains assigned to a cluster
    const sampleInfo = await app.getSomePointClusterInfo(5);
    expect(sampleInfo).not.toBeNull();
    expect(sampleInfo.hasCluster).toBe(true);

    // Validate still no uncaught exceptions from repeated clicks
    expect(pageErrors.length, 'No uncaught page errors after multiple rapid clicks').toBe(0);
  });

  test('Behavioral sanity check: global variables points and clusters exist and have expected shapes', async ({ page }) => {
    // This test asserts that the global arrays and their element shapes conform to expectations
    const app3 = new KMeansPage(page);
    await app.goto();

    // Ensure global points/ clusters exist
    const pointsLen1 = await app.getPointsLength();
    const clustersLen1 = await app.getClustersLength();
    expect(pointsLen).toBe(100);
    expect(clustersLen).toBe(0);

    // Verify point object shape (x, y, cluster)
    const sampleShape = await page.evaluate(() => {
      const p1 = points[0];
      return {
        hasX: 'x' in p,
        hasY: 'y' in p,
        hasClusterKey: 'cluster' in p,
        xType: typeof p.x,
        yType: typeof p.y
      };
    });
    expect(sampleShape.hasX).toBe(true);
    expect(sampleShape.hasY).toBe(true);
    expect(sampleShape.hasClusterKey).toBe(true);
    expect(sampleShape.xType).toBe('number');
    expect(sampleShape.yType).toBe('number');
  });

  test.afterEach(async ({ page }) => {
    // Final safety checks after each test
    // If any unexpected page errors occurred, include them in the test failure diagnostics
    if (pageErrors.length > 0) {
      // Fail the test explicitly with collected errors for easier debugging
      const errMessages = pageErrors.map(e => e.toString()).join('\n---\n');
      // Use expect to create a clear failure rather than throwing
      expect(pageErrors.length, `Unexpected page errors:\n${errMessages}`).toBe(0);
    }
  });
});