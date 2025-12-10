import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3be-d59e-11f0-89ab-2f71529652ac.html';

// Page Object Model for the Linear Regression demo page
class LinearRegressionPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.addRandomButton = page.getByRole('button', { name: /Add Random Point/i });
    this.clearButton = page.getByRole('button', { name: /Clear Points/i });
    this.pointsList = page.locator('#pointsList');
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Click the Add Random Point button
  async clickAddRandom() {
    await this.addRandomButton.click();
  }

  // Click the Clear Points button
  async clickClear() {
    await this.clearButton.click();
  }

  // Get array of li text contents for points list
  async getPointsListItems() {
    return this.pointsList.locator('li').allTextContents();
  }

  // Get number of li items
  async countPoints() {
    return this.pointsList.locator('li').count();
  }

  // Read the global `points` array length from the page
  async getPointsLengthFromWindow() {
    return this.page.evaluate(() => {
      // Return length of the existing global points array if present
      // Do not inject new globals; only read existing one
      return typeof points !== 'undefined' ? points.length : null;
    });
  }

  // Set the global points array to a deterministic set of points (existing global variable)
  async setPoints(pointsArray) {
    // pointsArray should be an array of objects like [{x:0,y:0}, ...]
    await this.page.evaluate((arr) => {
      // Use the existing `points` variable declared in the page
      if (typeof points === 'undefined') {
        // If somehow points is not defined, set a property on window but avoid creating new globals named differently
        window.points = arr;
      } else {
        points = arr;
      }
      // Update points list and redraw using page's functions
      if (typeof updatePointsList === 'function') updatePointsList();
      if (typeof draw === 'function') draw();
    }, pointsArray);
  }

  // Call linearRegression() in page context and return its result
  async linearRegressionResult() {
    return this.page.evaluate(() => {
      if (typeof linearRegression !== 'function') return null;
      return linearRegression();
    });
  }
}

// Helper to capture console errors and page errors during a test
function setupErrorCapture(page) {
  const errors = [];
  const consoleListener = msg => {
    try {
      if (msg.type && typeof msg.type === 'function') {
        // Playwright ConsoleMessage: msg.type() returns string
        if (msg.type() === 'error') {
          errors.push({ source: 'console', text: msg.text() });
        }
      } else if (msg.type) {
        // Fallback: older API shape
        if (msg.type === 'error') errors.push({ source: 'console', text: msg.text });
      }
    } catch (e) {
      // Ignore any listener exceptions
    }
  };
  const pageErrorListener = err => {
    // Capture uncaught exceptions from the page
    errors.push({ source: 'pageerror', text: err && err.message ? err.message : String(err) });
  };

  page.on('console', consoleListener);
  page.on('pageerror', pageErrorListener);

  return {
    getErrors: () => errors.slice(),
    dispose: () => {
      page.off('console', consoleListener);
      page.off('pageerror', pageErrorListener);
    }
  };
}

test.describe('Linear Regression Demo - Interactive Tests', () => {
  // Each test will create its own page context via the fixture `page`
  test('Page loads with expected default UI elements and no initial points', async ({ page }) => {
    // Purpose: Verify initial load state: header, canvas, buttons, and empty points list.
    const errorCapture = setupErrorCapture(page);
    const lr = new LinearRegressionPage(page);
    await lr.goto();

    // Basic UI assertions
    await expect(lr.header).toHaveText('Linear Regression Demo');
    await expect(lr.canvas).toBeVisible();
    await expect(lr.addRandomButton).toBeVisible();
    await expect(lr.clearButton).toBeVisible();

    // Points list should start empty
    const count = await lr.countPoints();
    expect(count).toBe(0);

    // The page should not have emitted console errors or uncaught page errors during load
    const errors1 = errorCapture.getErrors();
    errorCapture.dispose();
    expect(errors.length).toBe(0);
  });

  test('Clicking "Add Random Point" adds one point to the list and updates internal points array', async ({ page }) => {
    // Purpose: Verify button interaction causes a new point to be appended and displayed.
    const errorCapture1 = setupErrorCapture(page);
    const lr1 = new LinearRegressionPage(page);
    await lr.goto();

    // Click to add a random point
    await lr.clickAddRandom();

    // Wait for the list to update to one item
    await expect(lr.pointsList.locator('li')).toHaveCount(1);

    // The list item text should match the expected format "(x.xx, y.yy)"
    const items = await lr.getPointsListItems();
    expect(items.length).toBe(1);
    expect(items[0]).toMatch(/^\(\d+\.\d{2}, \s*\d+\.\d{2}\)$/);

    // The internal points length should be 1
    const len = await lr.getPointsLengthFromWindow();
    expect(len).toBe(1);

    // No console errors or page errors observed
    const errors2 = errorCapture.getErrors();
    errorCapture.dispose();
    expect(errors.length).toBe(0);
  });

  test('Adding two deterministic points returns expected linear regression (slope ~1, intercept ~0)', async ({ page }) => {
    // Purpose: Set a known points array and assert linearRegression computes expected m and b.
    const errorCapture2 = setupErrorCapture(page);
    const lr2 = new LinearRegressionPage(page);
    await lr.goto();

    // Set two deterministic points: (0,0) and (100,100) -> slope 1, intercept 0
    await lr.setPoints([{ x: 0, y: 0 }, { x: 100, y: 100 }]);

    // Points list should show two entries
    await expect(lr.pointsList.locator('li')).toHaveCount(2);
    const items1 = await lr.getPointsListItems();
    expect(items[0]).toMatch(/^\(0\.00, \s*0\.00\)$/);
    expect(items[1]).toMatch(/^\(100\.00, \s*100\.00\)$/);

    // Call linearRegression and verify results approximately equal 1 and 0
    const result = await lr.linearRegressionResult();
    expect(result).not.toBeNull();
    // Because of floating point math, allow a small tolerance
    expect(typeof result.m).toBe('number');
    expect(typeof result.b).toBe('number');
    expect(Number.isFinite(result.m)).toBeTruthy();
    expect(Math.abs(result.m - 1)).toBeLessThan(1e-8);
    expect(Math.abs(result.b - 0)).toBeLessThan(1e-8);

    // No console errors or page errors observed
    const errors3 = errorCapture.getErrors();
    errorCapture.dispose();
    expect(errors.length).toBe(0);
  });

  test('Clear Points button removes all points and resets the points list and internal array', async ({ page }) => {
    // Purpose: Validate that Clear Points empties both the DOM list and the internal points array.
    const errorCapture3 = setupErrorCapture(page);
    const lr3 = new LinearRegressionPage(page);
    await lr.goto();

    // Add two random points using UI
    await lr.clickAddRandom();
    await lr.clickAddRandom();

    // Verify we have two points
    await expect(lr.pointsList.locator('li')).toHaveCount(2);
    let len1 = await lr.getPointsLengthFromWindow();
    expect(len).toBe(2);

    // Click Clear Points
    await lr.clickClear();

    // Points list should be empty
    await expect(lr.pointsList.locator('li')).toHaveCount(0);

    // Internal points array should be length 0
    len = await lr.getPointsLengthFromWindow();
    expect(len).toBe(0);

    // No console errors or page errors observed
    const errors4 = errorCapture.getErrors();
    errorCapture.dispose();
    expect(errors.length).toBe(0);
  });

  test('linearRegression handles vertical-line edge case (identical x values) without throwing errors', async ({ page }) => {
    // Purpose: Provide points with identical x values to exercise the division-by-zero branch.
    const errorCapture4 = setupErrorCapture(page);
    const lr4 = new LinearRegressionPage(page);
    await lr.goto();

    // Two points with identical x values -> denominator is zero; slope may be NaN or Infinity
    await lr.setPoints([{ x: 50, y: 10 }, { x: 50, y: 20 }]);

    // Ensure the points are listed
    await expect(lr.pointsList.locator('li')).toHaveCount(2);

    // Call linearRegression and capture the result
    const result1 = await lr.linearRegressionResult();
    expect(result).not.toBeNull();
    // Slope may be NaN or Infinity; ensure it does not throw and returns something numeric/NaN
    expect(result).toHaveProperty('m');
    expect(result).toHaveProperty('b');
    // m could be NaN or ±Infinity -> ensure it's a number type (NaN is typeof 'number')
    expect(typeof result.m).toBe('number');
    expect(typeof result.b).toBe('number');

    // Validate that an unstable slope is reflected (not a finite number)
    const isFiniteM = Number.isFinite(result.m);
    // For identical x we expect not finite (either NaN or Infinity) — assert that at least one of these is true
    expect(isFiniteM).toBe(false);

    // Ensure that no console or uncaught page errors were emitted during this edge-case computation
    const errors5 = errorCapture.getErrors();
    errorCapture.dispose();
    expect(errors.length).toBe(0);
  });

  test('Multiple interactions sequence: add, compute, clear, add again - state remains consistent', async ({ page }) => {
    // Purpose: Run a sequence of UI interactions to confirm state transitions remain consistent across operations.
    const errorCapture5 = setupErrorCapture(page);
    const lr5 = new LinearRegressionPage(page);
    await lr.goto();

    // Start fresh: ensure empty
    await expect(lr.pointsList.locator('li')).toHaveCount(0);

    // Add three random points
    await lr.clickAddRandom();
    await lr.clickAddRandom();
    await lr.clickAddRandom();

    // Should have three items now
    await expect(lr.pointsList.locator('li')).toHaveCount(3);
    let len2 = await lr.getPointsLengthFromWindow();
    expect(len).toBe(3);

    // Compute regression result - ensure it returns an object with numeric m and b
    const res1 = await lr.linearRegressionResult();
    expect(res1).not.toBeNull();
    expect(typeof res1.m).toBe('number');
    expect(typeof res1.b).toBe('number');

    // Clear points
    await lr.clickClear();
    await expect(lr.pointsList.locator('li')).toHaveCount(0);
    len = await lr.getPointsLengthFromWindow();
    expect(len).toBe(0);

    // Add a deterministic pair and check computed slope is as expected (0 and 1 examples)
    await lr.setPoints([{ x: 10, y: 0 }, { x: 20, y: 10 }]); // slope 1, intercept -10
    const res2 = await lr.linearRegressionResult();
    expect(res2).not.toBeNull();
    expect(Math.abs(res2.m - 1)).toBeLessThan(1e-8);
    expect(Math.abs(res2.b + 10)).toBeLessThan(1e-8);

    // No console errors or page errors observed through the sequence
    const errors6 = errorCapture.getErrors();
    errorCapture.dispose();
    expect(errors.length).toBe(0);
  });
});