import { test, expect } from '@playwright/test';

// Test file for: 39b8ffb1-d1d5-11f0-b49a-6f458b3a25ef
// Purpose: End-to-end tests for the K-Means Clustering demo page.
// Notes:
// - We only load the page as-is and observe console logs / page errors.
// - We do not modify the page code; we let any runtime errors happen naturally and assert their presence/absence.
// - Tests use the canvas pixel data to reason about visual updates (initial draw, re-draw after generate, and k-means result).

const APP_URL =
  'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8ffb1-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('K-Means Clustering Visualization (App ID: 39b8ffb1-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  // Page object encapsulating interactions with the app
  class KMeansPage {
    constructor(page) {
      this.page = page;
      this.generateBtn = page.locator('#generateData');
      this.kMeansBtn = page.locator('#kMeans');
      this.kInput = page.locator('#kInput');
      this.canvas = page.locator('#canvas');
    }

    // Click the "Generate Random Data" button
    async clickGenerate() {
      await this.generateBtn.click();
    }

    // Click the "Run K-Means" button
    async clickKMeans() {
      await this.kMeansBtn.click();
    }

    // Set the k input value (string or number)
    async setK(value) {
      await this.kInput.fill(String(value));
    }

    // Get numeric value of kInput
    async getKValue() {
      return await this.kInput.inputValue();
    }

    // Get raw canvas ImageData (Uint8ClampedArray) and dimensions
    // Returned object: { width, height, data: [...numbers...] }
    async getCanvasImageData() {
      return await this.page.evaluate(() => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const imgData = ctx.getImageData(0, 0, width, height);
        // Convert to a regular array for transfer
        return {
          width,
          height,
          data: Array.from(imgData.data)
        };
      });
    }

    // Count non-transparent pixels (alpha > 0) in the canvas image data
    static countNonTransparentPixels(imageData) {
      const { data } = imageData;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) count++;
      }
      return count;
    }

    // Determine whether the canvas contains any pixels approximately matching a given RGB color
    // tolerance is per-channel difference allowed (0-255)
    static hasColorPixels(imageData, targetRgb, tolerance = 30, minMatches = 10) {
      const { data } = imageData;
      let matches = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a === 0) continue;
        if (
          Math.abs(r - targetRgb[0]) <= tolerance &&
          Math.abs(g - targetRgb[1]) <= tolerance &&
          Math.abs(b - targetRgb[2]) <= tolerance
        ) {
          matches++;
          if (matches >= minMatches) return true;
        }
      }
      return false;
    }
  }

  // Setup a listener for console messages and page errors before navigation.
  // Returns arrays that will be populated during page load and interactions.
  async function setupListeners(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      // collect console messages including text and type
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // collect uncaught exceptions from the page
      pageErrors.push(err);
    });

    return { consoleMessages, pageErrors };
  }

  // Before each test navigate to the app and ensure essential elements are available.
  test.beforeEach(async ({ page }) => {
    // nothing here; per-test we will set up listeners then goto to capture load-time logs/errors
  });

  // Test: Initial page load and default state
  test('Initial load: canvas and controls are present and initial drawing occurs', async ({ page }) => {
    // Purpose: Verify the page loads without script crashes and initial random data is drawn to the canvas.
    const { consoleMessages, pageErrors } = await setupListeners(page);
    await page.goto(APP_URL);

    const app = new KMeansPage(page);

    // Controls are visible and have expected defaults
    await expect(app.generateBtn).toBeVisible();
    await expect(app.kMeansBtn).toBeVisible();
    await expect(app.kInput).toBeVisible();

    // Default k value should be '3'
    const kVal = await app.getKValue();
    expect(kVal).toBe('3');

    // Canvas exists and has a non-empty drawing (some non-transparent pixels)
    const imageData = await app.getCanvasImageData();
    const nonTransparent = KMeansPage.countNonTransparentPixels(imageData);
    // There should be a non-zero amount of pixels drawn (100 points should produce many pixels)
    expect(nonTransparent).toBeGreaterThan(0);

    // Assert that there were no uncaught page errors during load
    // (We assert their absence here; any ReferenceError/TypeError/etc. would have been captured.)
    expect(pageErrors.length).toBe(0);

    // Also assert there are no console.error messages (collect any console entry of type 'error')
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  // Test: Clicking Generate Random Data updates the canvas (re-draw)
  test('Generate Random Data button redraws the canvas with new random points', async ({ page }) => {
    // Purpose: Clicking the generate button should change the canvas pixel data (new random points)
    const { consoleMessages, pageErrors } = await setupListeners(page);
    await page.goto(APP_URL);

    const app1 = new KMeansPage(page);

    // Capture the canvas before clicking
    const before = await app.getCanvasImageData();
    const beforeHash = before.data.slice(0, 100).join(','); // trivial fingerprint of initial pixels

    // Click generate and wait briefly for drawing to happen
    await app.clickGenerate();
    // small wait to allow drawing; uses Playwright's waitForTimeout
    await page.waitForTimeout(200);

    const after = await app.getCanvasImageData();
    const afterHash = after.data.slice(0, 100).join(',');

    // Expect the canvas to have changed (most likely different random points)
    // It's possible, though extremely unlikely, for the random draw to produce identical pixel data;
    // we check that either the fingerprint differs or the non-transparent pixel count differs.
    const beforeCount = KMeansPage.countNonTransparentPixels(before);
    const afterCount = KMeansPage.countNonTransparentPixels(after);

    const changed = beforeHash !== afterHash || beforeCount !== afterCount;
    expect(changed).toBeTruthy();

    // No uncaught page errors were thrown during the interaction
    expect(pageErrors.length).toBe(0);

    // No console errors
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  // Test: Run K-Means with default k (3) and check for centroid visualization (yellow)
  test('Running K-Means (default k=3) updates canvas and shows centroids (yellow pixels)', async ({ page }) => {
    // Purpose: Click the K-Means button and verify the visual result includes centroids colored yellow.
    const { consoleMessages, pageErrors } = await setupListeners(page);
    await page.goto(APP_URL);

    const app2 = new KMeansPage(page);

    // Ensure initial drawing exists
    const before1 = await app.getCanvasImageData();
    const beforeNonTransparent = KMeansPage.countNonTransparentPixels(before);
    expect(beforeNonTransparent).toBeGreaterThan(0);

    // Run k-means
    await app.clickKMeans();
    // wait for drawing
    await page.waitForTimeout(500);

    const after1 = await app.getCanvasImageData();

    // Check that the canvas has changed
    const afterNonTransparent = KMeansPage.countNonTransparentPixels(after);
    expect(afterNonTransparent).toBeGreaterThan(0);

    // The implementation draws centroids as yellow filled circles (RGB: approx [255,255,0]).
    // We'll search for yellow-ish pixels on the canvas to detect centroids.
    const hasYellow = KMeansPage.hasColorPixels(after, [255, 255, 0], 60, 20);
    expect(hasYellow).toBeTruthy();

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    // No console errors
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  // Test: Varying k input values (edge cases: 1 and 10)
  test('Running K-Means with k=1 and k=10 behaves without runtime errors and updates canvas', async ({ page }) => {
    // Purpose: Verify different k values can be set and executed without throwing errors,
    // and that the canvas is updated visually.
    const { consoleMessages, pageErrors } = await setupListeners(page);
    await page.goto(APP_URL);

    const app3 = new KMeansPage(page);

    // Test k = 1
    await app.setK(1);
    await expect(app.kInput).toHaveValue('1');
    await app.clickKMeans();
    await page.waitForTimeout(400);
    const img1 = await app.getCanvasImageData();
    const nonTransparent1 = KMeansPage.countNonTransparentPixels(img1);
    expect(nonTransparent1).toBeGreaterThan(0);

    // Look for a yellow centroid for k=1 (should be at least one)
    const hasYellow1 = KMeansPage.hasColorPixels(img1, [255, 255, 0], 60, 10);
    expect(hasYellow1).toBeTruthy();

    // Test k = 10 (max allowed)
    await app.setK(10);
    await expect(app.kInput).toHaveValue('10');
    await app.clickKMeans();
    await page.waitForTimeout(600);
    const img10 = await app.getCanvasImageData();
    const nonTransparent10 = KMeansPage.countNonTransparentPixels(img10);
    expect(nonTransparent10).toBeGreaterThan(0);

    // For k=10 we expect multiple centroids — check for presence of yellow pixels (many centroids)
    const hasYellow10 = KMeansPage.hasColorPixels(img10, [255, 255, 0], 60, 50);
    expect(hasYellow10).toBeTruthy();

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    // No console errors
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  // Test: Input validation and edge conditions - empty or invalid k value
  test('Edge case: invalid k input (empty string) should not crash the app', async ({ page }) => {
    // Purpose: Programmatically set the k input to an empty string and run k-means.
    // The code uses parseInt on the input value; invalid input could lead to NaN.
    // We assert that the app does not crash with uncaught exceptions and the canvas remains drawn.
    const { consoleMessages, pageErrors } = await setupListeners(page);
    await page.goto(APP_URL);

    const app4 = new KMeansPage(page);

    // Fill empty value (simulate user clearing the field)
    await app.kInput.fill('');
    const valueNow = await app.getKValue();
    expect(valueNow).toBe('');

    // Run k-means with empty input; the page code parses it and calls kMeans(NaN), which should not throw uncaught errors.
    await app.clickKMeans();
    await page.waitForTimeout(400);

    // Canvas should still contain drawing (drawPoints is called inside drawClusters)
    const img = await app.getCanvasImageData();
    const nonTransparent1 = KMeansPage.countNonTransparentPixels(img);
    expect(nonTransparent).toBeGreaterThan(0);

    // Ensure no uncaught page errors were recorded
    expect(pageErrors.length).toBe(0);

    // No console errors
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });

  // Test: Accessibility and basic attributes
  test('Accessibility & attributes: controls have accessible names and constraints', async ({ page }) => {
    // Purpose: Check that controls are present with correct labels/attributes and that min/max on input exist.
    const { consoleMessages, pageErrors } = await setupListeners(page);
    await page.goto(APP_URL);

    const app5 = new KMeansPage(page);

    // kInput has min=1 and max=10 attributes
    const minAttr = await page.$eval('#kInput', el => el.getAttribute('min'));
    const maxAttr = await page.$eval('#kInput', el => el.getAttribute('max'));
    expect(minAttr).toBe('1');
    expect(maxAttr).toBe('10');

    // Buttons have accessible text
    await expect(app.generateBtn).toHaveText('Generate Random Data');
    await expect(app.kMeansBtn).toHaveText('Run K-Means');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);

    // No console errors
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(consoleErrors.length).toBe(0);
  });
});