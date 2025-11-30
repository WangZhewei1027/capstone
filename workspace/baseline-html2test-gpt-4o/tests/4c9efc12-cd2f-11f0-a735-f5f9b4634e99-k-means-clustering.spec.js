import { test, expect } from '@playwright/test';

// Test suite for K-Means Clustering Demo
// File: 4c9efc12-cd2f-11f0-a735-f5f9b4634e99-k-means-clustering.spec.js
//
// These tests load the HTML page as-is, observe console logs and page errors,
// interact with the UI buttons, and assert DOM & visual outcomes.
// We intentionally do NOT modify or patch the page under test.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9efc12-cd2f-11f0-a735-f5f9b4634e99.html';

test.describe('K-Means Clustering Demo - Visual and Interaction Tests', () => {
  // Arrays to capture console messages and page errors for assertions
  let consoleMessages = [];
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset capture arrays before each test
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console events (info/debug/warn/error)
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error && error.message ? error.message : String(error));
    });

    // Navigate to the app URL and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Helper: evaluate canvas pixel statistics in page context
  const getCanvasPixelStats = async (page) => {
    return await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      if (!canvas) return { error: 'no-canvas' };
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h).data;

      let nonWhiteCount = 0;
      let blackCount = 0;
      let redCount = 0;
      let blueCount = 0;
      let greenCount = 0;

      for (let i = 0; i < img.length; i += 4) {
        const r = img[i], g = img[i + 1], b = img[i + 2], a = img[i + 3];
        if (a === 0) continue;
        const isWhite = (r === 255 && g === 255 && b === 255);
        if (!isWhite) nonWhiteCount++;
        const isBlack = (r === 0 && g === 0 && b === 0);
        if (isBlack) blackCount++;

        // very simple color thresholds for red/green/blue detection
        if (r > 180 && g < 120 && b < 120) redCount++;
        if (b > 180 && r < 120 && g < 120) blueCount++;
        if (g > 180 && r < 120 && b < 120) greenCount++;
      }

      return { width: w, height: h, nonWhiteCount, blackCount, redCount, blueCount, greenCount };
    });
  };

  test('Initial load should render the canvas and draw black points', async ({ page }) => {
    // Purpose: Verify canvas exists, is visible, and initial draw created non-white pixels (black points).
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }

    // Give a tiny delay for onload init drawing to finish (script runs on window.onload)
    await page.waitForTimeout(100);

    const stats = await getCanvasPixelStats(page);
    // Ensure canvas was found
    expect(stats.error).toBeUndefined();

    // Expect that some pixels are non-white (points were drawn)
    expect(stats.nonWhiteCount).toBeGreaterThan(0);

    // Because initial points are drawn in black, expect some black pixels
    expect(stats.blackCount).toBeGreaterThan(0);

    // No unexpected page errors or console errors on initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Initialize redraws the canvas (different pixels)', async ({ page }) => {
    // Purpose: Ensure the Initialize button regenerates random points and updates canvas pixels.
    await page.waitForTimeout(50);
    const before = await getCanvasPixelStats(page);
    expect(before.nonWhiteCount).toBeGreaterThan(0);

    // Click the Initialize button
    const initButton = page.getByRole('button', { name: 'Initialize' });
    await expect(initButton).toBeVisible();
    await initButton.click();

    // Wait a short time for redraw to occur
    await page.waitForTimeout(100);

    const after = await getCanvasPixelStats(page);
    expect(after.nonWhiteCount).toBeGreaterThan(0);

    // The two images should not be identical in general — at least some change expected
    // We assert at least one of the relevant counts differs.
    const anyChange =
      before.nonWhiteCount !== after.nonWhiteCount ||
      before.blackCount !== after.blackCount ||
      before.redCount !== after.redCount ||
      before.blueCount !== after.blueCount ||
      before.greenCount !== after.greenCount;

    expect(anyChange).toBeTruthy();

    // Ensure no page errors or console errors occurred during initialize
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Run K-Means assigns clusters and colors points (red, blue, green)', async ({ page }) => {
    // Purpose: Validate that clicking "Run K-Means" recolors points into cluster colors.
    // Ensure there are black points initially, then after running K-Means, expect colored pixels.

    // Ensure initial state has black points
    const before = await getCanvasPixelStats(page);
    expect(before.blackCount).toBeGreaterThan(0);

    // Click "Run K-Means"
    const runButton = page.getByRole('button', { name: 'Run K-Means' });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // Wait briefly for cluster assignment & render to finish
    await page.waitForTimeout(100);

    const after = await getCanvasPixelStats(page);

    // After running K-Means, we expect presence of colored pixels representing clusters
    // The demo uses "red", "blue", "green" colors for clusters.
    expect(after.redCount + after.blueCount + after.greenCount).toBeGreaterThan(0);

    // Ideally, all three cluster colors should appear at least once
    expect(after.redCount).toBeGreaterThan(0);
    expect(after.blueCount).toBeGreaterThan(0);
    expect(after.greenCount).toBeGreaterThan(0);

    // Some black pixels may remain in background if points were few; ensure canvas still non-empty
    expect(after.nonWhiteCount).toBeGreaterThan(0);

    // No page errors or console errors produced by running the algorithm
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Multiple Run K-Means calls update canvas and do not throw errors', async ({ page }) => {
    // Purpose: Ensure repeated calls to runKMeans are stable and do not emit console/page errors.

    const runButton = page.getByRole('button', { name: 'Run K-Means' });
    await expect(runButton).toBeVisible();

    // Capture stats after first run
    await runButton.click();
    await page.waitForTimeout(100);
    const stats1 = await getCanvasPixelStats(page);

    // Run again
    await runButton.click();
    await page.waitForTimeout(100);
    const stats2 = await getCanvasPixelStats(page);

    // There should be colored pixels after both runs
    expect(stats1.redCount + stats1.blueCount + stats1.greenCount).toBeGreaterThan(0);
    expect(stats2.redCount + stats2.blueCount + stats2.greenCount).toBeGreaterThan(0);

    // Either stable or changed; ensure at least one metric exists and no exceptions occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Interactive controls are accessible and have correct labels', async ({ page }) => {
    // Purpose: Verify the presence and accessibility of interactive controls (buttons).
    const initButton = page.getByRole('button', { name: 'Initialize' });
    const runButton = page.getByRole('button', { name: 'Run K-Means' });

    await expect(initButton).toBeVisible();
    await expect(runButton).toBeVisible();

    // Buttons should be enabled
    await expect(initButton).toBeEnabled();
    await expect(runButton).toBeEnabled();

    // Clicking both in quick succession shouldn't cause errors
    await initButton.click();
    await runButton.click();
    await page.waitForTimeout(100);

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('No uncaught page errors or console errors were emitted during the test lifecycle', async ({ page }) => {
    // Purpose: Assert that during the page interactions we observed no uncaught errors.
    // We include this as a final check to ensure the demo runs without throwing exceptions.
    await page.waitForTimeout(50);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});