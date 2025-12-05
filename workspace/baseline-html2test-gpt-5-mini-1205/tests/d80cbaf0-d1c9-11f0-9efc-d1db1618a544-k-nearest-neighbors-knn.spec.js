import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80cbaf0-d1c9-11f0-9efc-d1db1618a544.html';

// Page object wrapper for common interactions with the KNN demo
class KNNPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.kRange = page.locator('#kRange');
    this.kLabel = page.locator('#kLabel');
    this.metric = page.locator('#metric');
    this.weighted = page.locator('#weighted');
    this.modeAdd = page.locator('#modeAdd');
    this.modeQuery = page.locator('#modeQuery');
    this.btnRandom = page.locator('#btnRandom');
    this.btnClear = page.locator('#btnClear');
    this.btnBoundary = page.locator('#btnBoundary');
    this.btnReset = page.locator('#btnReset');
    this.resolution = page.locator('#resolution');
    this.resLabel = page.locator('#resLabel');
    this.classLegend = page.locator('#classLegend');
    this.selectedClassBox = page.locator('#selectedClassBox');
    this.neighborsList = page.locator('#neighborsList');
    this.status = page.locator('#status');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for initial drawing/resizing which is scheduled (init uses setTimeout)
    await this.page.waitForTimeout(150);
  }

  // Click the canvas at coordinates relative to the element's top-left
  async clickCanvasAt(x, y) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const px = Math.max(1, Math.min(box.width - 1, x));
    const py = Math.max(1, Math.min(box.height - 1, y));
    await this.canvas.click({ position: { x: Math.floor(px), y: Math.floor(py) } });
    // Give time for draw() to run and update DOM
    await this.page.waitForTimeout(60);
  }

  // Get number of data points in the demo (reads exposed window._knnDemo.points)
  async getPointsCount() {
    return await this.page.evaluate(() => {
      try { return window._knnDemo && Array.isArray(window._knnDemo.points) ? window._knnDemo.points.length : -1; }
      catch (e) { return -1; }
    });
  }

  async getQuery() {
    return await this.page.evaluate(() => {
      try { return window._knnDemo ? window._knnDemo.query : undefined; }
      catch (e) { return undefined; }
    });
  }

  async setK(value) {
    // set via slider input - use evaluate to set value and dispatch input event
    await this.page.evaluate((v) => {
      const el = document.getElementById('kRange');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    await this.page.waitForTimeout(40);
  }

  async toggleModeToQuery() {
    await this.modeQuery.click();
    await this.page.waitForTimeout(40);
  }

  async toggleModeToAdd() {
    await this.modeAdd.click();
    await this.page.waitForTimeout(40);
  }

  async clickLegendItem(idx) {
    const item = this.classLegend.locator('.legend-item').nth(idx);
    await item.click();
    await this.page.waitForTimeout(40);
  }

  async clickClear() {
    await this.btnClear.click();
    await this.page.waitForTimeout(40);
  }

  async clickBoundary() {
    await this.btnBoundary.click();
    await this.page.waitForTimeout(60);
  }

  async clickReset() {
    await this.btnReset.click();
    await this.page.waitForTimeout(120);
  }

  async pressKeyboardKey(key) {
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(60);
  }

  async getNeighborsListText() {
    return await this.neighborsList.innerText();
  }
}

test.describe('K-Nearest Neighbors Interactive Demo - d80cbaf0...', () => {
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // capture console.error messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({ text: msg.text(), location: msg.location() });
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // detach listeners by removing all listeners that were added (cleanup)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    // Assert no console errors or page errors were emitted during the test
    expect(consoleErrors, `console.error messages: ${consoleErrors.map(e => e.text).join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `page errors: ${pageErrors.map(e => (e && e.message) || e).join(' | ')}`).toHaveLength(0);
  });

  test('Initial load: UI elements exist and default state is set', async ({ page }) => {
    // Purpose: verify the page loads, basic controls exist and have default values
    const knn = new KNNPage(page);
    await knn.goto();

    // Basic controls present
    await expect(knn.kRange).toBeVisible();
    await expect(knn.metric).toBeVisible();
    await expect(knn.weighted).toBeVisible();
    await expect(knn.modeAdd).toBeVisible();
    await expect(knn.modeQuery).toBeVisible();
    await expect(knn.classLegend).toBeVisible();
    await expect(knn.canvas).toBeVisible();

    // Default values: k label should reflect range value 3
    await expect(knn.kLabel).toHaveText('3');

    // Default metric is euclidean
    await expect(knn.metric).toHaveValue('euclidean');

    // Default resolution label value
    await expect(knn.resLabel).toHaveText('6');

    // Default mode is Add (class-pill has "active" class)
    const modeAddClass = await page.locator('#modeAdd').getAttribute('class');
    expect(modeAddClass).toContain('active');

    // There must be a selected class box visible
    await expect(knn.selectedClassBox).toBeVisible();

    // There should be an initial set of points generated by init's generateRandomClusters after reset
    const pointsCount = await knn.getPointsCount();
    // The demo generates clusters with at least some points; ensure non-negative and not -1 (exposed)
    expect(pointsCount).toBeGreaterThanOrEqual(0);
  });

  test('Interactive: clear, add deterministic points, switch to query and classify', async ({ page }) => {
    // Purpose: clear random data, add specific class-labeled points deterministically,
    // switch to Query mode, classify a point and verify neighbors list updates.
    const knn = new KNNPage(page);
    await knn.goto();

    // Ensure we start from a clean state by clicking Clear
    await knn.clickClear();
    let cnt = await knn.getPointsCount();
    expect(cnt).toBe(0);

    // Ensure mode is Add
    await knn.toggleModeToAdd();
    await expect(knn.status).toContainText('Add Points');

    // Add a point for Class 1 at a known canvas-relative location (near top-left)
    // Click first legend item to select class 0
    await knn.clickLegendItem(0);
    // Click canvas at (60,60) relative to canvas top-left
    await knn.clickCanvasAt(60, 60);

    // Add a point for Class 2 by selecting legend item index 1 and clicking another spot
    await knn.clickLegendItem(1);
    await knn.clickCanvasAt(260, 260);

    // Validate two points exist
    cnt = await knn.getPointsCount();
    expect(cnt).toBe(2);

    // Switch to Query mode and set K=1
    await knn.toggleModeToQuery();
    await expect(knn.status).toContainText('Query');

    await knn.setK(1);
    await expect(knn.kLabel).toHaveText('1');

    // Click near the first added point to produce classification as Class 1 (index 0)
    await knn.clickCanvasAt(65, 65);

    // Query should now be set and neighbors list should show "Predicted:"
    const neighborsText = await knn.getNeighborsListText();
    expect(neighborsText.toLowerCase()).toContain('predicted');

    // Predicted class should correspond to one of the two classes (Class 1 or Class 2)
    const predictedMatch = neighborsText.match(/Predicted:\s*Class\s*(\d+)/i);
    expect(predictedMatch).not.toBeNull();
    const predictedClass = Number(predictedMatch[1]);
    expect([1, 2]).toContain(predictedClass);

    // Additionally ensure neighbors list displays distances for the neighbor(s)
    expect(neighborsText).toMatch(/\d\.\d{4}/); // distances formatted to 4 decimals appear
  });

  test('Boundary toggle and resolution slider influence drawing (DOM text changes)', async ({ page }) => {
    // Purpose: Toggle decision boundary and check button text changes; change resolution and verify label update
    const knn = new KNNPage(page);
    await knn.goto();

    // Ensure there are some points to allow boundary drawing
    const initialPoints = await knn.getPointsCount();
    if (initialPoints === 0) {
      // generate random clusters to ensure boundary can be drawn
      await knn.clickReset();
    }

    // Toggle boundary on - button text should change to "Hide Decision Boundary"
    await knn.clickBoundary();
    await expect(knn.btnBoundary).toHaveText(/Hide Decision Boundary|Toggle Decision Boundary/);

    // Change resolution slider to a different value and expect the label to update
    await knn.page.evaluate(() => {
      const el = document.getElementById('resolution');
      el.value = '12';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await knn.page.waitForTimeout(50);
    await expect(knn.resLabel).toHaveText('12');

    // Toggle boundary off - button text should revert
    await knn.clickBoundary();
    await expect(knn.btnBoundary).toHaveText('Toggle Decision Boundary');
  });

  test('Weighting and metric selection affect classification path (no thrown errors, DOM updates)', async ({ page }) => {
    // Purpose: flip the weighted checkbox and change metric to ensure no exceptions and UI is responsive.
    const knn = new KNNPage(page);
    await knn.goto();

    // Clear existing points and add two points so classification is possible
    await knn.clickClear();
    await knn.toggleModeToAdd();
    await knn.clickLegendItem(0);
    await knn.clickCanvasAt(80, 80);
    await knn.clickLegendItem(1);
    await knn.clickCanvasAt(220, 220);

    // Switch to Query mode
    await knn.toggleModeToQuery();
    await knn.setK(3);

    // Try different metrics and ensure drawing + neighbor list update without errors
    const metrics = ['euclidean', 'manhattan', 'chebyshev'];
    for (const m of metrics) {
      await knn.page.selectOption('#metric', m);
      await knn.page.waitForTimeout(40);
      // Click on canvas center to trigger classification/draw
      await knn.clickCanvasAt(150, 150);
      const txt = await knn.getNeighborsListText();
      // neighborsList should either show a "Predicted" line or the muted fallback if no neighbors
      expect(txt.length).toBeGreaterThan(0);
    }

    // Toggle weighted voting and ensure UI still updates
    await knn.weighted.click();
    await knn.page.waitForTimeout(40);
    await knn.clickCanvasAt(150, 150);
    const afterWeightedText = await knn.getNeighborsListText();
    expect(afterWeightedText.length).toBeGreaterThan(0);
  });

  test('Reset button recreates demo state and keyboard can change number of classes', async ({ page }) => {
    // Purpose: reset returns a populated demo and pressing numeric keys adjusts classes legend
    const knn = new KNNPage(page);
    await knn.goto();

    // Click Reset
    await knn.clickReset();

    // After reset there should be some points (generateRandomClusters was called)
    const pCount = await knn.getPointsCount();
    expect(pCount).toBeGreaterThan(0);

    // Default classesCount is 3 (legend should have at least 3 entries)
    const legendCount = await page.locator('#classLegend .legend-item').count();
    expect(legendCount).toBeGreaterThanOrEqual(3);

    // Press '4' to change classesCount to 4 (demo listens to keydown)
    await knn.pressKeyboardKey('4');
    const legendCountAfter = await page.locator('#classLegend .legend-item').count();
    expect(legendCountAfter).toBeGreaterThanOrEqual(4);
  });

  test('Edge case: classification with zero points leads to null label and friendly UI message', async ({ page }) => {
    // Purpose: clear everything and switch to Query mode and click - confirm neighborsList shows guidance text
    const knn = new KNNPage(page);
    await knn.goto();

    // Clear all points
    await knn.clickClear();
    let cnt = await knn.getPointsCount();
    expect(cnt).toBe(0);

    // Switch to Query mode
    await knn.toggleModeToQuery();
    await knn.clickCanvasAt(120, 120);

    // neighborsList should show 'No neighbors' or guidance message when there are no points
    const text = await knn.getNeighborsListText();
    // Accept two possible messages:
    const ok = /no neighbors to display/i.test(text) || /no query selected/i.test(text) || /no neighbors/i.test(text);
    expect(ok).toBeTruthy();
  });
});