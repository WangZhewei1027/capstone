import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0755-d5a0-11f0-8040-510e90b1f3a7.html';

// Page object for the linear regression demo
class RegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.generateBtn = page.locator('button', { hasText: 'Generate Random Data' });
    this.addCustomBtn = page.locator('button', { hasText: 'Add Custom Point' });
    this.clearBtn = page.locator('button', { hasText: 'Clear All Points' });
    this.xInput = page.locator('#xInput');
    this.yInput = page.locator('#yInput');
    this.canvas = page.locator('#regressionChart');
    this.equation = page.locator('#equation');
    this.statsDetails = page.locator('#statsDetails');
  }

  // Wait for main elements to be visible
  async waitForReady() {
    await expect(this.page.locator('h1', { hasText: 'Linear Regression Demonstration' })).toBeVisible();
    await expect(this.canvas).toBeVisible();
    await expect(this.equation).toBeVisible();
  }

  // Helper to click canvas at page coordinates (offset from top-left of canvas)
  async clickCanvasAt(offsetX, offsetY) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    await this.page.mouse.click(x, y);
  }

  // Get the number of data points from the page's JS dataPoints array
  async getPointCount() {
    return await this.page.evaluate(() => {
      return Array.isArray(window.dataPoints) ? window.dataPoints.length : null;
    });
  }

  // Get whether a regression line exists (window.regressionLine is non-null)
  async hasRegressionLine() {
    return await this.page.evaluate(() => {
      return !!window.regressionLine;
    });
  }

  // Read full stats HTML text
  async getStatsText() {
    return await this.statsDetails.innerText();
  }

  // Read equation text content
  async getEquationText() {
    return await this.equation.innerText();
  }
}

test.describe('Linear Regression Visualization - Comprehensive E2E', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = [];
    pageErrors = [];

    // Listen to console messages and page errors
    page.on('console', (msg) => {
      // Collect only error-level console messages for assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', (err) => {
      // Uncaught exceptions on the page
      pageErrors.push(err);
    });

    // Navigate to the target page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure no unexpected page errors or console errors were collected across tests.
    // Tests below also explicitly assert this where appropriate.
  });

  test('Initial load: chart, default points and regression stats are rendered', async ({ page }) => {
    // Purpose: Validate that the page loads and initial regression is computed from initial points.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    // The script adds initial points on window.onload; ensure dataPoints exists and has 4 items
    const count = await rp.getPointCount();
    expect(count).toBeGreaterThanOrEqual(4); // should have at least the 4 initialized points

    // Equation should be updated to numeric values, not the literal "y = mx + b"
    const eqText = await rp.getEquationText();
    expect(eqText).toMatch(/^y =\s*-?\d+(\.\d+)?x\s+\+\s*-?\d+(\.\d+)?/);

    // Stats details should include number of points
    const stats = await rp.getStatsText();
    expect(stats).toContain('Number of Points');
    expect(stats).toMatch(/\d+/);

    // Ensure a regression line dataset exists (because there are >=2 points)
    const hasLine = await rp.hasRegressionLine();
    expect(hasLine).toBe(true);

    // Assert that no uncaught page errors or console.error events occurred during load
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Generate Random Data button creates 20 points and updates stats', async ({ page }) => {
    // Purpose: Verify Generate Random Data resets points to 20 and updates regression accordingly.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    // Click the button to generate random data
    await rp.generateBtn.click();

    // Wait for the page's dataPoints to reflect the change
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length === 20);

    const count = await rp.getPointCount();
    expect(count).toBe(20);

    // Stats should report 20 points
    const statsText = await rp.getStatsText();
    expect(statsText).toContain('Number of Points');
    expect(statsText).toContain('20');

    // After generating many points, regression line should be present
    const hasLine = await rp.hasRegressionLine();
    expect(hasLine).toBe(true);

    // No errors should have been emitted
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Add Custom Point button uses input values and increments point count', async ({ page }) => {
    // Purpose: Ensure adding a custom point reads inputs and updates state and UI.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    const before = await rp.getPointCount();

    // Set custom inputs
    await rp.xInput.fill('12.5');
    await rp.yInput.fill('7.25');

    // Click Add Custom Point
    await rp.addCustomBtn.click();

    // Wait for the dataPoints length to increase by 1
    await page.waitForFunction((prev) => {
      return Array.isArray(window.dataPoints) && window.dataPoints.length === prev + 1;
    }, before);

    const after = await rp.getPointCount();
    expect(after).toBe(before + 1);

    // The stats should reflect the new number of points
    const stats = await rp.getStatsText();
    expect(stats).toContain('Number of Points');
    expect(stats).toContain(String(after));

    // Equation should still be numeric (regression computed if >=2 points)
    const eq = await rp.getEquationText();
    expect(eq).toMatch(/^y =\s*-?\d+(\.\d+)?x\s+\+\s*-?\d+(\.\d+)?/);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Clear All Points removes points and displays "Need at least 2 points for regression"', async ({ page }) => {
    // Purpose: Verify clearing all points empties data and updates UI message accordingly.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    // Ensure there are points to clear
    const before = await rp.getPointCount();
    expect(before).toBeGreaterThanOrEqual(1);

    // Click clear
    await rp.clearBtn.click();

    // After clearing, page.dataPoints length should be 0
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length === 0);

    const after = await rp.getPointCount();
    expect(after).toBe(0);

    // Equation element should display the "Need at least 2 points for regression" message
    const eqText = await rp.getEquationText();
    expect(eqText).toBe('Need at least 2 points for regression');

    // Stats details should be empty string as per the implementation
    const stats = await rp.getStatsText();
    expect(stats.trim()).toBe('');

    // Regression line should be removed
    const hasLine = await rp.hasRegressionLine();
    expect(hasLine).toBe(false);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Clicking on canvas adds points; two clicks produce a regression line', async ({ page }) => {
    // Purpose: Test canvas interactions: clicking at empty locations should add data points and produce regression.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    // Clear all existing points to have deterministic starting point
    await rp.clearBtn.click();
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length === 0);
    expect(await rp.getPointCount()).toBe(0);

    // Click near the center of the canvas to add first point
    const box = await rp.canvas.boundingBox();
    if (!box) throw new Error('Canvas not available for clicks');
    const centerX = Math.floor(box.width / 2);
    const centerY = Math.floor(box.height / 2);

    await rp.clickCanvasAt(centerX, centerY);

    // After first click, expect one point to be added
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length === 1);
    expect(await rp.getPointCount()).toBe(1);

    // Equation should still indicate need for at least 2 points
    expect(await rp.getEquationText()).toBe('Need at least 2 points for regression');

    // Click a second distinct location (offset)
    await rp.clickCanvasAt(centerX + Math.min(50, centerX - 1), centerY + Math.min(30, centerY - 1));

    // Now expect at least 2 points and regression computed
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length >= 2);

    const count = await rp.getPointCount();
    expect(count).toBeGreaterThanOrEqual(2);

    // Now equation should be numeric and stats should include number of points
    const eq = await rp.getEquationText();
    expect(eq).toMatch(/^y =\s*-?\d+(\.\d+)?x\s+\+\s*-?\d+(\.\d+)?/);

    const stats = await rp.getStatsText();
    expect(stats).toContain('Number of Points');
    expect(stats).toContain(String(count));

    // Regression line should exist
    expect(await rp.hasRegressionLine()).toBe(true);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Internal chart objects reflect visible UI state (consistency checks)', async ({ page }) => {
    // Purpose: Cross-check window.chart, window.dataPoints and window.regressionLine for internal consistency.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    // Ensure there are at least two points so regression exists
    const initialCount = await rp.getPointCount();
    if (initialCount < 2) {
      // generate some points to ensure regression exists
      await rp.generateBtn.click();
      await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length >= 2);
    }

    // Read internal objects from the page
    const internal = await page.evaluate(() => {
      return {
        dataPointsLength: Array.isArray(window.dataPoints) ? window.dataPoints.length : null,
        chartDefined: !!window.chart,
        regressionLineDefined: !!window.regressionLine,
        dataset0Length: (window.chart && window.chart.data && window.chart.data.datasets && window.chart.data.datasets[0] && window.chart.data.datasets[0].data) ? window.chart.data.datasets[0].data.length : null,
        regressionDatasetPresent: window.chart && window.chart.data && Array.isArray(window.chart.data.datasets) ? window.chart.data.datasets.some(ds => ds.label === 'Regression Line') : false
      };
    });

    // Basic consistency checks
    expect(internal.chartDefined).toBe(true);
    expect(internal.dataPointsLength).toBeGreaterThanOrEqual(2);
    expect(internal.dataset0Length).toBe(internal.dataPointsLength);
    // If regressionLineDefined is true, chart datasets should include label 'Regression Line'
    if (internal.regressionLineDefined) {
      expect(internal.regressionDatasetPresent).toBe(true);
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('No uncaught ReferenceError, SyntaxError, or TypeError occurred during interactions', async ({ page }) => {
    // Purpose: Explicitly assert that no JS runtime errors of key types occurred (pageerror contains errors).
    // We will perform a few interactions to increase chances of surface errors.
    const rp = new RegressionPage(page);
    await rp.waitForReady();

    // Perform a couple interactions
    await rp.generateBtn.click();
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length === 20);

    await rp.addCustomBtn.click(); // with current inputs
    // Clear afterwards
    await rp.clearBtn.click();
    await page.waitForFunction(() => Array.isArray(window.dataPoints) && window.dataPoints.length === 0);

    // Collect all pageErrors and consoleErrors and verify none are ReferenceError/SyntaxError/TypeError
    const pageErrorMessages = pageErrors.map(e => (e && e.message) ? e.message : String(e));
    const consoleErrorMessages = consoleErrors.map(c => c.text);

    // Assert that there are no page errors at all
    expect(pageErrors.length).toBe(0);

    // Assert that no console.error messages were emitted
    expect(consoleErrors.length).toBe(0);

    // Defensive: if any messages exist, check they do not include common error class names
    for (const msg of [...pageErrorMessages, ...consoleErrorMessages]) {
      expect(msg).not.toMatch(/ReferenceError/);
      expect(msg).not.toMatch(/SyntaxError/);
      expect(msg).not.toMatch(/TypeError/);
    }
  });
});