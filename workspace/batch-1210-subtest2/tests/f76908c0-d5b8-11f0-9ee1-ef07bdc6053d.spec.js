import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f76908c0-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page object encapsulating interactions and queries for the K-Means demo page
class KMeansPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the page has loaded script and had a chance to run initial draw
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Returns number of data points (reads dataPoints.length from page context)
  async getDataPointsLength() {
    return await this.page.evaluate(() => {
      // Access the page-scoped variable directly
      return typeof dataPoints !== 'undefined' ? dataPoints.length : null;
    });
  }

  // Returns number of centroids
  async getCentroidsLength() {
    return await this.page.evaluate(() => {
      return typeof centroids !== 'undefined' ? centroids.length : null;
    });
  }

  // Returns a deep copy of centroid coordinates array
  async getCentroidCoordinates() {
    return await this.page.evaluate(() => {
      return typeof centroids !== 'undefined'
        ? centroids.map(c => ({ x: c.x, y: c.y }))
        : null;
    });
  }

  // Returns clusterAssignments length
  async getClusterAssignmentsLength() {
    return await this.page.evaluate(() => {
      return typeof clusterAssignments !== 'undefined' ? clusterAssignments.length : null;
    });
  }

  // Click the Start button by selector
  async clickStart() {
    await this.page.click('#startButton');
  }

  // Read a simple fingerprint (number of non-transparent pixels) from the canvas
  async getCanvasNonTransparentPixelCount() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const img = ctx.getImageData(0, 0, width, height).data;
      let count = 0;
      for (let i = 0; i < img.length; i += 4) {
        const alpha = img[i + 3];
        if (alpha > 0) count++;
      }
      return count;
    });
  }

  // Return button innerText
  async getStartButtonText() {
    return await this.page.$eval('#startButton', el => el.innerText);
  }

  // Return the page title text
  async getTitleText() {
    return await this.page.$eval('h1', el => el.innerText);
  }

  // Force a short wait to allow drawing loops to finish
  async shortPause() {
    await this.page.waitForTimeout(300);
  }
}

// Test suite
test.describe('K-Means Clustering Demo (FSM: Idle -> Clustering)', () => {
  /** @type {import('@playwright/test').Page} */
  let page;
  /** @type {KMeansPage} */
  let kmPage;
  let consoleMessages;
  let pageErrors;

  // Setup: navigate to the demo page and attach console / pageerror listeners
  test.beforeEach(async ({ browser }) => {
    // Create a new context+page per test to isolate console events
    const context = await browser.newContext();
    page = await context.newPage();

    consoleMessages = [];
    pageErrors = [];

    // Collect console messages emitted by page (info/warn/error)
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught exceptions (pageerror)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    kmPage = new KMeansPage(page);
    await kmPage.goto();
    // Allow initial draw to settle
    await kmPage.shortPause();
  });

  // Teardown: ensure context is closed
  test.afterEach(async () => {
    // Assert that no uncaught page errors occurred during the test
    // This verifies the runtime did not raise unexpected ReferenceError/SyntaxError/TypeError
    expect(pageErrors.length, `Expected zero uncaught page errors, but got: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // Also fail if console reported any 'error' level messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected zero console.error messages, but got: ${consoleErrors.map(m => m.text).join(' || ')}`).toBe(0);

    // Close the page's context
    await page.context().close();
  });

  // Test initial Idle state (S0_Idle) expectations
  test('Idle state (S0_Idle) - initial draw and initialization', async () => {
    // Comment: Validate static UI elements exist and have expected text
    expect(await kmPage.getTitleText()).toContain('K-Means Clustering Demo');
    expect(await kmPage.getStartButtonText()).toBe('Start K-Means Clustering');

    // Comment: Validate entry actions for S0_Idle: generateDataPoints(20), initializeCentroids(), draw()
    const dpLen = await kmPage.getDataPointsLength();
    const cLen = await kmPage.getCentroidsLength();
    const caLen = await kmPage.getClusterAssignmentsLength();

    // The FSM entry said generateDataPoints(20) and initializeCentroids()
    expect(dpLen, 'Expected 20 data points after initial generation').toBe(20);
    expect(cLen, 'Expected number of centroids equal to numClusters (3)').toBe(3);

    // clusterAssignments expected to be empty at initial draw (no assignments performed)
    expect(caLen, 'Expected clusterAssignments to be empty at initial draw (no clustering yet)').toBe(0);

    // Canvas should have some drawn pixels (initial points and centroids drawn)
    const nonTransparentBefore = await kmPage.getCanvasNonTransparentPixelCount();
    expect(nonTransparentBefore, 'Expected some drawn pixels on canvas after initial draw').toBeGreaterThan(0);
  });

  // Test transition from Idle to Clustering (click Start)
  test('Transition StartClustering (click #startButton) moves to Clustering state (S1_Clustering)', async () => {
    // Capture centroids and canvas fingerprint before starting clustering
    const centroidsBefore = await kmPage.getCentroidCoordinates();
    const canvasBefore = await kmPage.getCanvasNonTransparentPixelCount();

    // Click Start to trigger the clustering transition
    await kmPage.clickStart();

    // The application runs 10 iterations of kMeans synchronously; give a short pause to ensure rendering completed
    await kmPage.shortPause();

    // After clicking, dataPoints should be regenerated to length 20, centroids reinitialized
    const dpLenAfter = await kmPage.getDataPointsLength();
    const cLenAfter = await kmPage.getCentroidsLength();
    const caLenAfter = await kmPage.getClusterAssignmentsLength();

    expect(dpLenAfter, 'Expected 20 data points after clicking Start').toBe(20);
    expect(cLenAfter, 'Expected 3 centroids after clicking Start').toBe(3);
    // clusterAssignments should be set (kMeans assigns clusters)
    expect(caLenAfter, 'Expected clusterAssignments to have entries after kMeans runs').toBe(20);

    // Verify that centroid coordinates have changed compared to before clicking (re-initialized + kMeans moved them)
    const centroidsAfter = await kmPage.getCentroidCoordinates();
    // At least one centroid coordinate should differ (either reinitialized or updated)
    const coordsChanged = centroidsBefore.some((cBefore, idx) => {
      const cAfter = centroidsAfter[idx];
      // If either object is null/undefined, treat as changed
      if (!cBefore || !cAfter) return true;
      return cBefore.x !== cAfter.x || cBefore.y !== cAfter.y;
    });
    expect(coordsChanged, 'Expected centroids to change after clicking Start and running kMeans').toBe(true);

    // Verify canvas changed (visual feedback)
    const canvasAfter = await kmPage.getCanvasNonTransparentPixelCount();
    // The drawing should differ; at minimum the pixel count may change
    expect(canvasAfter, 'Expected canvas to be updated after clustering iterations').not.toBe(canvasBefore);
  });

  // Edge case: clicking Start multiple times rapidly should not cause uncaught exceptions and should reset arrays
  test('Rapid repeated clicks on Start do not produce uncaught errors and reset data', async () => {
    // Trigger multiple clicks in quick succession
    await kmPage.clickStart();
    await kmPage.clickStart();
    await kmPage.clickStart();

    // Allow some time for synchronous loops to finish and drawings to settle
    await kmPage.shortPause();

    // After repeated clicks, dataPoints and centroids should still be in consistent expected sizes
    const dpLen = await kmPage.getDataPointsLength();
    const cLen = await kmPage.getCentroidsLength();
    const caLen = await kmPage.getClusterAssignmentsLength();

    expect(dpLen, 'Expected 20 data points after repeated clicks').toBe(20);
    expect(cLen, 'Expected 3 centroids after repeated clicks').toBe(3);
    expect(caLen, 'Expected clusterAssignments to be populated after repeated clicks').toBe(20);

    // Assert that no page errors or console.errors were captured (will be checked in afterEach as well)
    expect(pageErrors.length, 'Expected no uncaught page errors during rapid clicks').toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, 'Expected no console.error during rapid clicks').toBe(0);
  });

  // Validate some of the FSM "onEnter" actions for S1_Clustering by introspecting that arrays were cleared before re-generation
  test('S1_Clustering entry actions clear arrays before generating points and centroids', async () => {
    // Manually set up a known state by invoking generateDataPoints once more through page.evaluate
    // We'll push an extra marker to dataPoints so we can detect clearing
    await page.evaluate(() => {
      // If dataPoints exists, add a sentinel
      if (typeof dataPoints !== 'undefined') dataPoints.push({ x: -1, y: -1, sentinel: true });
    });

    // Confirm sentinel present
    const hadSentinel = await page.evaluate(() => {
      return dataPoints.some(p => p && p.sentinel === true);
    });
    expect(hadSentinel, 'Sentinel should have been added to dataPoints').toBe(true);

    // Click Start; S1 entry actions should set dataPoints.length = 0 etc.
    await kmPage.clickStart();
    await kmPage.shortPause();

    // After click, sentinel should be gone because arrays were cleared
    const sentinelStillPresent = await page.evaluate(() => {
      return dataPoints.some(p => p && p.sentinel === true);
    });
    expect(sentinelStillPresent, 'Expected sentinel to be removed by array clearing during S1 entry').toBe(false);

    // And arrays should have expected lengths again
    expect(await kmPage.getDataPointsLength()).toBe(20);
    expect(await kmPage.getCentroidsLength()).toBe(3);
    expect(await kmPage.getClusterAssignmentsLength()).toBe(20);
  });

  // Validate that UI components declared in FSM exist and are reachable
  test('UI components (#startButton and #canvas) exist and have correct attributes', async () => {
    const button = await page.$('#startButton');
    expect(button).not.toBeNull();
    const buttonText = await kmPage.getStartButtonText();
    expect(buttonText).toBe('Start K-Means Clustering');

    const canvasHandle = await page.$('#canvas');
    expect(canvasHandle).not.toBeNull();
    const canvasSize = await canvasHandle.evaluate(c => ({ width: c.width, height: c.height }));
    expect(canvasSize.width).toBe(600);
    expect(canvasSize.height).toBe(400);
  });

  // Observability test: ensure no unexpected console warnings or errors during a standard interaction
  test('Observability: track console messages and ensure no error-level logs during normal usage', async () => {
    // Clear any prior collected messages
    consoleMessages = [];
    pageErrors = [];

    // Perform normal interaction
    await kmPage.clickStart();
    await kmPage.shortPause();

    // Validate no uncaught page errors were emitted during use
    expect(pageErrors.length, `Expected zero uncaught page errors but got: ${pageErrors.map(e => e.message).join(', ')}`).toBe(0);

    // Ensure console has no 'error' type messages
    const errs = consoleMessages.filter(m => m.type === 'error');
    expect(errs.length, `Expected no console.error messages but found: ${errs.map(e => e.text).join(' || ')}`).toBe(0);

    // It's acceptable to have console.info/debug messages; we just ensure absence of error-level logs
  });
});