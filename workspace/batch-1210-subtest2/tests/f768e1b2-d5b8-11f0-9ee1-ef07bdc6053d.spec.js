import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f768e1b2-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page object encapsulating common interactions with the KNN page
class KNNPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click the canvas at coordinates relative to the top-left of the canvas element
  async clickCanvas(x, y) {
    const canvas = await this.page.$('#canvas');
    const box = await canvas.boundingBox();
    // Click at absolute coordinates
    await this.page.mouse.click(box.x + x, box.y + y);
  }

  // Click the "Add Data Point" button
  async clickAddData() {
    await this.page.click('#add-data');
  }

  // Click the "Compute KNN" button
  async clickComputeKNN() {
    await this.page.click('#compute-knn');
  }

  // Read the in-page points array
  async getPoints() {
    return await this.page.evaluate(() => {
      // Return a deep copy so tests don't accidentally mutate in-page structures
      return (window.points || []).map(p => ({ x: p.x, y: p.y, class: p.class }));
    });
  }

  // Fill the k-value input
  async setKValue(value) {
    await this.page.fill('#k-value', String(value));
    // Trigger blur to ensure value is applied
    await this.page.locator('#k-value').press('Tab');
  }

  // Sample the canvas pixel at given coordinates and return [r,g,b,a]
  async getCanvasPixel(x, y) {
    return await this.page.evaluate(({ x, y }) => {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      // Round coordinates to pixel grid
      const rx = Math.round(x);
      const ry = Math.round(y);
      // Clamp to canvas bounds
      const cx = Math.max(0, Math.min(canvas.width - 1, rx));
      const cy = Math.max(0, Math.min(canvas.height - 1, ry));
      const img = ctx.getImageData(cx, cy, 1, 1).data;
      return [img[0], img[1], img[2], img[3]];
    }, { x, y });
  }
}

test.describe('K-Nearest Neighbors (KNN) Visualization - FSM validation', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors for assertions
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      // Capture Error objects thrown in page context
      pageErrors.push(error);
    });

    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Ensure the page closed cleanly - close is handled by Playwright fixture automatically.
    // This hook is reserved for any future teardown needs.
  });

  test('S0 Idle: initial render - elements present and defaults set', async ({ page }) => {
    // Validate that initial Idle state renders canvas, controls and default k value
    const knn = new KNNPage(page);
    await knn.goto(); // ensure loaded

    // Check DOM elements exist
    await expect(page.locator('#canvas')).toHaveCount(1);
    await expect(page.locator('#add-data')).toHaveCount(1);
    await expect(page.locator('#compute-knn')).toHaveCount(1);
    await expect(page.locator('#k-value')).toHaveCount(1);

    // Check default K value is "3" as per implementation
    const kValue = await page.inputValue('#k-value');
    expect(kValue).toBe('3');

    // On initial load, there should be no points
    const points = await knn.getPoints();
    expect(Array.isArray(points)).toBeTruthy();
    expect(points.length).toBe(0);

    // There should be no page errors or console errors on initial load
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('S0 -> S1 (ClickCanvas): clicking canvas adds a data point and draws it', async ({ page }) => {
    // This validates the transition triggered by clicking the canvas
    const knn = new KNNPage(page);
    await knn.goto();

    // Click canvas at (100, 120)
    await knn.clickCanvas(100, 120);

    // Read points array and ensure one point was added
    const points = await knn.getPoints();
    expect(points.length).toBe(1);

    const p = points[0];
    // Coordinates stored should be roughly the clicked coordinates (within a few pixels)
    expect(Math.abs(p.x - 100)).toBeLessThan(5);
    expect(Math.abs(p.y - 120)).toBeLessThan(5);
    // Class should be 0 or 1 (alternating)
    expect([0, 1].includes(p.class)).toBeTruthy();

    // Check the canvas pixel at the point has a non-transparent color (visual feedback)
    const pixel = await knn.getCanvasPixel(p.x, p.y);
    // Alpha should be non-zero to indicate drawn circle presence
    expect(pixel[3]).toBeGreaterThan(0);

    // No page errors should have been thrown
    expect(pageErrors.length).toBe(0);
  });

  test('S0 -> S1 (ClickAddData): clicking "Add Data Point" adds a random point', async ({ page }) => {
    // Validates adding a random point via button triggers drawPoints and updates points[]
    const knn = new KNNPage(page);
    await knn.goto();

    // Initially zero points
    let points = await knn.getPoints();
    expect(points.length).toBe(0);

    // Click the add-data button
    await knn.clickAddData();

    // Now there should be one point
    points = await knn.getPoints();
    expect(points.length).toBe(1);

    // Pixel at the added point should be non-empty
    const p = points[0];
    const pixel = await knn.getCanvasPixel(p.x, p.y);
    expect(pixel[3]).toBeGreaterThan(0);

    // No page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('S0 -> S2 (ClickComputeKNN) EDGE CASE: computing KNN with zero data points raises a TypeError', async ({ page }) => {
    // This test intentionally triggers the known edge case where computeKNN is called with no points
    // The implementation's computeKNN uses Object.keys(votes).reduce(...) which will throw on empty votes
    const knn = new KNNPage(page);
    await knn.goto();

    // Confirm zero points initially
    let points = await knn.getPoints();
    expect(points.length).toBe(0);

    // Click compute-knn and wait for the pageerror to be emitted
    const [err] = await Promise.all([
      page.waitForEvent('pageerror'),
      knn.clickComputeKNN()
    ]);

    // Assert that a TypeError occurred due to reduce on empty array in computeKNN
    expect(err).toBeTruthy();
    // Name should be TypeError in Chromium
    expect(err.name === 'TypeError' || /typeerror/i.test(err.message)).toBeTruthy();
    // The message typically mentions "Reduce of empty array", but we allow some variation
    expect(/reduce/i.test(err.message) || /empty/i.test(err.message) || err.name === 'TypeError').toBeTruthy();
  });

  test('S0 -> S2 (ClickComputeKNN) successful computation draws predicted point and logs', async ({ page }) => {
    // This test ensures computeKNN runs successfully when there are data points:
    // - Add a couple of points
    // - Set k to 1
    // - Click compute
    // - Expect a console.log with the predicted class and coordinates
    // - Verify the canvas has a drawn predicted point at the logged coordinates with expected color
    const knn = new KNNPage(page);
    await knn.goto();

    // Add two data points using the button to ensure there are neighbors
    await knn.clickAddData();
    await knn.clickAddData();

    let points = await knn.getPoints();
    expect(points.length).toBeGreaterThanOrEqual(2);

    // Set k to 1 for deterministic nearest neighbor
    await knn.setKValue(1);

    // Wait for the console.log that indicates the predicted class for x,y
    const consolePromise = page.waitForEvent('console', msg => {
      return msg.type() === 'log' && msg.text().startsWith('Predicted class for');
    });

    await knn.clickComputeKNN();

    const consoleMsg = await consolePromise;
    expect(consoleMsg).toBeTruthy();
    const text = consoleMsg.text();

    // Parse the logged message like: "Predicted class for 123.45, 67.89: Class 0"
    const match = text.match(/Predicted class for\s*([0-9.+-eE]+)\s*,\s*([0-9.+-eE]+)\s*:\s*Class\s*(\S+)/i);
    expect(match).not.toBeNull();

    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const predictedClassRaw = match[3];
    // predictedClass may be a string key from object keys -> coerce to int
    const predictedClass = parseInt(predictedClassRaw, 10);

    expect(Number.isFinite(x)).toBeTruthy();
    expect(Number.isFinite(y)).toBeTruthy();
    expect([0, 1].includes(predictedClass)).toBeTruthy();

    // Check canvas pixel at the logged coordinates maps to the expected color
    const pixel = await knn.getCanvasPixel(x, y);
    // Map predictedClass to expected RGB (implementation uses ['red', 'blue'])
    const expectedRGB = predictedClass === 0 ? [255, 0, 0] : [0, 0, 255];

    // Allow some tolerance for anti-aliasing, but the center pixel should strongly match expected channel
    const matchesColor = (
      Math.abs(pixel[0] - expectedRGB[0]) <= 50 &&
      Math.abs(pixel[1] - expectedRGB[1]) <= 50 &&
      Math.abs(pixel[2] - expectedRGB[2]) <= 50 &&
      pixel[3] > 0
    );
    expect(matchesColor).toBeTruthy();

    // Ensure no page errors were thrown during successful compute
    // (The compute path for non-empty points should not produce page errors)
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: setting K to 0 causes computeKNN to error even when points exist', async ({ page }) => {
    // This validates behavior when invalid k value (0) is used: nearestNeighbors will be empty -> reduce error
    const knn = new KNNPage(page);
    await knn.goto();

    // Add a point to avoid the "no points" case; we're testing k=0 specifically
    await knn.clickAddData();

    let points = await knn.getPoints();
    expect(points.length).toBeGreaterThanOrEqual(1);

    // Force k input to 0 (bypassing any UI min enforcement)
    await knn.setKValue(0);

    // Perform compute and expect a pageerror due to empty nearestNeighbors -> reduce on empty array
    const [err] = await Promise.all([
      page.waitForEvent('pageerror'),
      knn.clickComputeKNN()
    ]);

    expect(err).toBeTruthy();
    expect(err.name === 'TypeError' || /reduce/i.test(err.message) || /empty/i.test(err.message)).toBeTruthy();
  });
});