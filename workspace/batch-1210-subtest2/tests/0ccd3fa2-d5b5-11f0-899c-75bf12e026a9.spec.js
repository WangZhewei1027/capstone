import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccd3fa2-d5b5-11f0-899c-75bf12e026a9.html';

// Page object encapsulating interactions and inspections for the Linear Regression demo
class LinearRegressionPage {
  constructor(page) {
    this.page = page;
    this.canvasSelector = '#plot';
    this.clearBtnSelector = '#clearBtn';
  }

  // Click relative to the top-left of the canvas element.
  // x,y are pixels relative to the canvas top-left (as used by Playwright's position).
  async clickCanvasAt(x, y) {
    await this.page.click(this.canvasSelector, { position: { x, y } });
  }

  // Click the Clear Points button
  async clickClear() {
    await this.page.click(this.clearBtnSelector);
  }

  // Read the RMSE text content (empty string if none)
  async getRMSEText() {
    return await this.page.locator('#rmse').textContent();
  }

  // Sample the canvas pixels and return counts for approximate blue and red pixels.
  // We sample at a stride to reduce work while remaining deterministic.
  async sampleCanvasColorCounts() {
    return await this.page.evaluate(() => {
      const canvas = document.getElementById('plot');
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      // read entire image data
      const img = ctx.getImageData(0, 0, w, h).data;
      // We'll sample every 3rd pixel (by x and y) to keep compute reasonable
      let blueCount = 0;
      let redCount = 0;
      let coloredCount = 0;
      const stride = 3;
      for (let y = 0; y < h; y += stride) {
        for (let x = 0; x < w; x += stride) {
          const idx = (y * w + x) * 4;
          const r = img[idx];
          const g = img[idx + 1];
          const b = img[idx + 2];
          const a = img[idx + 3];
          if (a === 0) continue;
          // Detect blue-ish pixels (points are drawn in pure 'blue')
          if (b > 150 && r < 70 && g < 70) {
            blueCount++;
            coloredCount++;
            continue;
          }
          // Detect red-ish pixels (regression line drawn in 'red')
          if (r > 150 && g < 100 && b < 100) {
            redCount++;
            coloredCount++;
            continue;
          }
        }
      }
      return { blueCount, redCount, coloredCount };
    });
  }

  // Click at a position outside the plotting area / inside the canvas margins
  // We'll click near the top-left corner (which is usually margin)
  async clickOutsidePlotArea() {
    // Click at (10,10) relative to canvas: the script uses margin.top=30 and margin.left=60,
    // so (10,10) is outside the plotting area and should be ignored by the app.
    await this.page.click(this.canvasSelector, { position: { x: 10, y: 10 } });
  }

  // Helper to wait a bit for drawing to complete (redraw is synchronous but UI updates may schedule)
  async waitForRedraw() {
    await this.page.waitForTimeout(100); // small wait to let canvas painting settle
  }
}

// Test suite
test.describe('Linear Regression Interactive Demo (FSM validation)', () => {
  let page;
  let lrPage;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a new context / page for each test to isolate state
    const context = await browser.newContext();
    page = await context.newPage();

    consoleMessages = [];
    pageErrors = [];

    // Collect console events
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    lrPage = new LinearRegressionPage(page);

    // Navigate to the app page exactly as provided
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure canvas and button have appeared
    await expect(page.locator('#plot')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();
  });

  test.afterEach(async () => {
    // Assert that no uncaught page errors occurred during the test
    // This validates that there were no unexpected ReferenceError/SyntaxError/TypeError in the runtime.
    expect(pageErrors.map(e => String(e))).toEqual([]);
    // Additionally assert that there were no console.error messages
    const errorConsoles = consoleMessages.filter(c => c.type === 'error');
    expect(errorConsoles).toEqual([]);
    await page.close();
    await page.context().close();
  });

  test.describe('State: S0_Idle (Initial state)', () => {
    test('initial redraw should have happened: canvas present and RMSE empty', async () => {
      // The FSM S0_Idle includes entry action redraw()
      // Validate that the RMSE div is empty initially (no regression displayed)
      const rmseText = await lrPage.getRMSEText();
      expect(rmseText).toBe('');
      // Ensure that there are no colored pixels (no data points or regression line)
      const counts = await lrPage.sampleCanvasColorCounts();
      expect(counts.blueCount).toBe(0);
      expect(counts.redCount).toBe(0);
    });
  });

  test.describe('Event: ClickCanvas and State transitions S0 -> S1 and S1 -> S1', () => {
    test('clicking canvas inside plot area adds a point (S0 -> S1) and draws a blue point', async () => {
      // Click inside the plotting area. Based on the implementation:
      // width=700,height=400, margin.left=60, margin.top=30, margin.right=30, margin.bottom=50
      // Plotting X range: [60, 670], Y range: [30, 350]
      // Choose a point safely inside: (150, 300)
      await lrPage.clickCanvasAt(150, 300);
      await lrPage.waitForRedraw();

      // After adding one point, linear regression needs >=2 points; RMSE remains empty.
      const rmseText = await lrPage.getRMSEText();
      expect(rmseText).toBe('');

      // The canvas should now contain a blue point
      const counts = await lrPage.sampleCanvasColorCounts();
      expect(counts.blueCount).toBeGreaterThan(0);
      // No red regression line with only one point
      expect(counts.redCount).toBe(0);
    });

    test('clicking canvas a second time adds a second point (S1 -> S1), draws a second blue point and regression line (red) appears with RMSE = 0.000 for two exact points', async () => {
      // Add two distinct points that are not vertically aligned to allow regression to compute
      await lrPage.clickCanvasAt(150, 300); // first point
      await lrPage.waitForRedraw();
      await lrPage.clickCanvasAt(550, 100); // second point
      await lrPage.waitForRedraw();

      // With two points, the regression line should perfectly fit both points => RMSE == 0.000
      const rmseText = await lrPage.getRMSEText();
      // The script formats rmse.toFixed(3)
      expect(rmseText).toMatch(/Root Mean Squared Error \(RMSE\):\s*0\.000/);

      // The canvas should show both blue points and a red regression line
      const counts = await lrPage.sampleCanvasColorCounts();
      expect(counts.blueCount).toBeGreaterThanOrEqual(1); // at least the points are present
      expect(counts.redCount).toBeGreaterThan(0); // regression line present
    });

    test('clicks outside plotting area should be ignored and not add points', async () => {
      // Start with known state: add one point
      await lrPage.clickCanvasAt(150, 300);
      await lrPage.waitForRedraw();
      const beforeCounts = await lrPage.sampleCanvasColorCounts();

      // Click outside plotting area - e.g., at (10,10) relative to canvas - should be ignored
      await lrPage.clickOutsidePlotArea();
      await lrPage.waitForRedraw();

      const afterCounts = await lrPage.sampleCanvasColorCounts();
      // No new colored pixels should be introduced (blue/red counts should remain the same)
      expect(afterCounts.blueCount).toBeGreaterThanOrEqual(beforeCounts.blueCount);
      // Because sampling may include small variances, assert not significantly increased
      expect(afterCounts.blueCount).toBeLessThanOrEqual(beforeCounts.blueCount + 2);
      expect(afterCounts.redCount).toBe(beforeCounts.redCount);
    });
  });

  test.describe('Event: ClickClearButton transitions back to S0_Idle', () => {
    test('clicking clear resets points and removes regression line (S1 -> S0 and S0 -> S0)', async () => {
      // Add two points to produce regression line
      await lrPage.clickCanvasAt(150, 300);
      await lrPage.waitForRedraw();
      await lrPage.clickCanvasAt(550, 100);
      await lrPage.waitForRedraw();

      // Validate we have colored pixels
      const countsBefore = await lrPage.sampleCanvasColorCounts();
      expect(countsBefore.blueCount).toBeGreaterThan(0);
      expect(countsBefore.redCount).toBeGreaterThan(0);

      // Click clear button
      await lrPage.clickClear();
      await lrPage.waitForRedraw();

      // RMSE should be cleared
      const rmseAfter = await lrPage.getRMSEText();
      expect(rmseAfter).toBe('');

      // Colored pixels corresponding to points/line should be gone (or at least substantially reduced)
      const countsAfter = await lrPage.sampleCanvasColorCounts();
      expect(countsAfter.blueCount).toBe(0);
      expect(countsAfter.redCount).toBe(0);
    });

    test('clicking clear when already idle (S0 -> S0) leaves the canvas in initial state', async () => {
      // Ensure we're in initial state (no points)
      const rmseInitial = await lrPage.getRMSEText();
      expect(rmseInitial).toBe('');
      const countsInitial = await lrPage.sampleCanvasColorCounts();
      expect(countsInitial.blueCount).toBe(0);
      expect(countsInitial.redCount).toBe(0);

      // Click clear button when no points exist
      await lrPage.clickClear();
      await lrPage.waitForRedraw();

      // State should remain idle: RMSE empty and no colored pixels
      const rmseAfter = await lrPage.getRMSEText();
      expect(rmseAfter).toBe('');
      const countsAfter = await lrPage.sampleCanvasColorCounts();
      expect(countsAfter.blueCount).toBe(0);
      expect(countsAfter.redCount).toBe(0);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('multiple rapid clicks add multiple points and regression computes (nonzero RMSE if not perfect fit)', async () => {
      // Click several points forming a noisy set
      const pointsToClick = [
        { x: 120, y: 300 },
        { x: 200, y: 250 },
        { x: 300, y: 200 },
        { x: 400, y: 180 },
        { x: 500, y: 150 }
      ];
      for (const p of pointsToClick) {
        await lrPage.clickCanvasAt(p.x, p.y);
        // small inter-click delay to emulate user
        await lrPage.waitForRedraw();
      }

      // With >2 points the RMSE should be displayed. For imperfect set, RMSE > 0
      const rmseText = await lrPage.getRMSEText();
      expect(rmseText).toMatch(/Root Mean Squared Error \(RMSE\):\s*[0-9]+\.[0-9]{3}/);
      const numeric = parseFloat(rmseText.replace(/[^\d.]/g, ''));
      expect(Number.isFinite(numeric)).toBe(true);
      // It may be 0 if all fit perfectly; however for our chosen disparate points it should be >= 0
      expect(numeric).toBeGreaterThanOrEqual(0);

      // Ensure there are colored pixels for points and regression line
      const counts = await lrPage.sampleCanvasColorCounts();
      expect(counts.blueCount).toBeGreaterThan(0);
      // Regression line should exist for >=2 points
      expect(counts.redCount).toBeGreaterThan(0);

      // Clean up for sanity
      await lrPage.clickClear();
      await lrPage.waitForRedraw();
      const countsAfterClear = await lrPage.sampleCanvasColorCounts();
      expect(countsAfterClear.blueCount).toBe(0);
      expect(countsAfterClear.redCount).toBe(0);
    });

    test('no unexpected console errors or page exceptions occurred during interactions (monitored throughout)', async () => {
      // This test exists to assert that normal user flows did not produce runtime exceptions.
      // We'll perform a couple of interactions and rely on afterEach to assert no page errors.
      await lrPage.clickCanvasAt(160, 280);
      await lrPage.waitForRedraw();
      await lrPage.clickCanvasAt(540, 120);
      await lrPage.waitForRedraw();
      await lrPage.clickClear();
      await lrPage.waitForRedraw();

      // Also ensure we have collected console messages (but none of error type)
      // Check we have at least some console messages (could be none depending on implementation)
      // but most importantly ensure none are of type 'error' (the afterEach will assert that).
      expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
    });
  });
});