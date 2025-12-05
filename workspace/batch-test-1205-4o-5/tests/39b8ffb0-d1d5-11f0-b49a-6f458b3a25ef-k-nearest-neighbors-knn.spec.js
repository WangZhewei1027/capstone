import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8ffb0-d1d5-11f0-b49a-6f458b3a25ef.html';

// Local copy of the dataPoints from the page so tests can compute expected values
const PAGE_DATA_POINTS = [
  { x: 100, y: 300, label: 'A' },
  { x: 150, y: 200, label: 'A' },
  { x: 200, y: 250, label: 'B' },
  { x: 300, y: 150, label: 'B' },
  { x: 250, y: 400, label: 'A' },
  { x: 350, y: 350, label: 'B' }
];

test.describe('K-Nearest Neighbors (KNN) Visualization - 39b8ffb0-d1d5-11f0-b49a-6f458b3a25ef', () => {
  let consoleMessages;
  let pageErrors;

  // Set up listeners for console and page errors before each test and navigate to the app URL.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // capture console messages for later assertions
      try {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text()
        });
      } catch (e) {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    page.on('pageerror', err => {
      // capture uncaught exceptions
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Load the page exactly as-is and wait for load event
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Tear down - ensure no persistent listeners remain between tests
  test.afterEach(async ({ page }) => {
    // remove listeners by re-navigating to about:blank to avoid cross-test pollution
    await page.goto('about:blank');
  });

  test('Initial page load shows canvas, controls, and no runtime errors', async ({ page }) => {
    // Purpose: Verify that the main interactive elements are present and the script did not throw errors on load.
    const canvas = page.locator('#canvas');
    const kInput = page.locator('#kValue');
    const runButton = page.locator('#runKNN');

    await expect(canvas).toBeVisible();
    await expect(kInput).toBeVisible();
    await expect(runButton).toBeVisible();

    // Verify default K value is 3
    await expect(kInput).toHaveValue('3');

    // Ensure the page has the dataPoints variable with expected number of items
    const dpLength = await page.evaluate(() => {
      // Accessing the dataPoints array defined in the page script
      return window.dataPoints ? window.dataPoints.length : null;
    });
    expect(dpLength).toBe(PAGE_DATA_POINTS.length);

    // Assert that no uncaught page errors occurred during load
    expect(pageErrors).toHaveLength(0);

    // It's also useful to assert that no console.error messages were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking on canvas sets userPoint and getNeighbors returns sorted neighbors', async ({ page }) => {
    // Purpose: Validate that a canvas click creates a userPoint and neighbors are found in ascending distance order.

    // Click near the first data point (100,300). Use a small offset to ensure inside canvas.
    const clickX = 110;
    const clickY = 310;
    const canvas1 = page.locator('#canvas1');

    // Perform the click at the specified position relative to the canvas
    await canvas.click({ position: { x: clickX, y: clickY } });

    // Retrieve userPoint and neighbors computed by the page
    const result = await page.evaluate(() => {
      // Provide the current userPoint and the neighbors computed using the page's getNeighbors function
      return {
        userPoint: window.userPoint || null,
        kValue: document.getElementById('kValue') ? document.getElementById('kValue').value : null,
        neighbors: (window.userPoint && typeof window.getNeighbors === 'function')
          ? window.getNeighbors(window.userPoint.x, window.userPoint.y, Number(document.getElementById('kValue').value))
          : null
      };
    });

    // Basic assertions about userPoint existence and approximate coordinates
    expect(result.userPoint).not.toBeNull();
    // Because of potential sub-pixel differences, assert closeness within a small margin
    expect(Math.abs(result.userPoint.x - clickX)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.userPoint.y - clickY)).toBeLessThanOrEqual(1);

    // The default k is 3, ensure neighbors array exists and length equals 3
    expect(Array.isArray(result.neighbors)).toBeTruthy();
    expect(result.neighbors.length).toBe(3);

    // Verify neighbors are actual data points and distances are non-decreasing
    const userPoint = result.userPoint;
    const neighbors = result.neighbors;

    // Helper to compute Euclidean distance
    const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    // Check each neighbor corresponds to one of the known data points and compute distances
    const distances = neighbors.map(n => {
      // Ensure the neighbor matches an item in PAGE_DATA_POINTS
      const match = PAGE_DATA_POINTS.some(dp => dp.x === n.x && dp.y === n.y && dp.label === n.label);
      expect(match).toBeTruthy();
      return distance(userPoint, n);
    });

    // Distances must be sorted ascending
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
    }

    // Ensure no uncaught runtime errors were emitted during this user interaction
    expect(pageErrors).toHaveLength(0);
  });

  test('Changing K value updates number of returned neighbors and respects data point count when K is large', async ({ page }) => {
    // Purpose: Verify that modifying the K input changes how many neighbors are returned and that K > dataPoints.length returns only available points.

    const canvas2 = page.locator('#canvas2');
    const kInput1 = page.locator('#kValue');
    const runButton1 = page.locator('#runKNN');

    // Click to create a user point
    await canvas.click({ position: { x: 220, y: 260 } });
    // Set K to 2 and run
    await kInput.fill('2');
    await runButton.click();

    // Get neighbors after K=2
    const neighborsK2 = await page.evaluate(() => {
      return window.userPoint ? window.getNeighbors(window.userPoint.x, window.userPoint.y, Number(document.getElementById('kValue').value)) : null;
    });
    expect(Array.isArray(neighborsK2)).toBeTruthy();
    expect(neighborsK2.length).toBe(2);

    // Now set K to a large number (10) - larger than available data points (6)
    await kInput.fill('10');
    await runButton.click();

    const neighborsK10 = await page.evaluate(() => {
      return window.userPoint ? window.getNeighbors(window.userPoint.x, window.userPoint.y, Number(document.getElementById('kValue').value)) : null;
    });

    // Expect that we get at most the number of available data points
    expect(Array.isArray(neighborsK10)).toBeTruthy();
    expect(neighborsK10.length).toBe(PAGE_DATA_POINTS.length);

    // Confirm no errors occurred during these flows
    expect(pageErrors).toHaveLength(0);
  });

  test('Clicking Run KNN when no user point is set does not throw and keeps userPoint null', async ({ page }) => {
    // Purpose: Validate that running KNN without a selected user point is safe and does not produce uncaught errors.

    // Ensure userPoint is null on initial load by reloading the page (fresh)
    await page.reload({ waitUntil: 'load' });

    // Confirm userPoint is null initially
    const initialUserPoint = await page.evaluate(() => window.userPoint || null);
    expect(initialUserPoint).toBeNull();

    // Click the Run KNN button which calls drawDataPoints (should handle null userPoint safely)
    const runButton2 = page.locator('#runKNN');
    await runButton.click();

    // After clicking, userPoint should still be null (no point has been selected)
    const afterClickUserPoint = await page.evaluate(() => window.userPoint || null);
    expect(afterClickUserPoint).toBeNull();

    // Verify there were no runtime errors produced by the action
    expect(pageErrors).toHaveLength(0);
  });

  test('Edge case: non-numeric K value results in zero neighbors and no runtime errors', async ({ page }) => {
    // Purpose: Test handling of invalid K input (non-numeric string), ensure no exceptions and that neighbors become empty.

    const canvas3 = page.locator('#canvas3');
    const kInput2 = page.locator('#kValue');
    const runButton3 = page.locator('#runKNN');

    // Create a user point first
    await canvas.click({ position: { x: 260, y: 390 } });

    // Input a non-numeric value for K
    await kInput.fill('not-a-number');
    // Click Run KNN to trigger drawDataPoints which uses Number(...) on the input
    await runButton.click();

    // Evaluate how many neighbors get returned when K is NaN
    const neighborsAfterInvalidK = await page.evaluate(() => {
      const kVal = Number(document.getElementById('kValue').value);
      if (!window.userPoint || typeof window.getNeighbors !== 'function') return null;
      return {
        numericK: kVal,
        neighbors: window.getNeighbors(window.userPoint.x, window.userPoint.y, kVal)
      };
    });

    // Number('not-a-number') is NaN. The page's getNeighbors uses slice(0, k), and slice with NaN behaves like slice(0,0) -> empty array
    expect(neighborsAfterInvalidK).not.toBeNull();
    expect(Number.isNaN(neighborsAfterInvalidK.numericK)).toBeTruthy();
    expect(Array.isArray(neighborsAfterInvalidK.neighbors)).toBeTruthy();
    expect(neighborsAfterInvalidK.neighbors.length).toBe(0);

    // Confirm no uncaught errors happened during this edge case
    expect(pageErrors).toHaveLength(0);
  });

  test('Accessibility and attribute checks: inputs and buttons have proper attributes and are focusable', async ({ page }) => {
    // Purpose: Simple accessibility checks - inputs are focusable and have sensible attributes (min/max for number input)

    const kInput3 = page.locator('#kValue');
    const runButton4 = page.locator('#runKNN');

    // Ensure the number input has min and max attributes
    const minAttr = await kInput.getAttribute('min');
    const maxAttr = await kInput.getAttribute('max');
    expect(minAttr).toBe('1');
    expect(maxAttr).toBe('10');

    // Ensure the input and button are focusable
    await kInput.focus();
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('kValue');

    await runButton.focus();
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('runKNN');

    // Confirm no runtime errors were introduced by these simple interactions
    expect(pageErrors).toHaveLength(0);
  });
});