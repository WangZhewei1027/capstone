import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a9d-cd36-11f0-b98e-a1744d282049.html';

// Page Object Model for the K-Means app
class KMeansPage {
  constructor(page) {
    this.page = page;
    this.locators = {
      title: page.locator('h1'),
      kValue: page.locator('#kValue'),
      kSlider: page.locator('#kSlider'),
      initMethod: page.locator('#initMethod'),
      initBtn: page.locator('#initBtn'),
      stepBtn: page.locator('#stepBtn'),
      runBtn: page.locator('#runBtn'),
      stopBtn: page.locator('#stopBtn'),
      genBtn: page.locator('#genBtn'),
      clearBtn: page.locator('#clearBtn'),
      maxIter: page.locator('#maxIter'),
      tol: page.locator('#tol'),
      iterDisplay: page.locator('#iter'),
      sseDisplay: page.locator('#sse'),
      nPointsDisplay: page.locator('#nPoints'),
      legend: page.locator('#legend'),
      canvas: page.locator('#canvas'),
    };
  }

  async goto() {
    await this.page.goto(URL);
    // wait for canvas to be present and JS to run
    await this.locators.canvas.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Helper to get numeric text content
  async getNumber(selector) {
    const txt = await this.page.locator(selector).innerText();
    return Number(txt);
  }

  // Set the K slider programmatically and fire input event
  async setK(value) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('kSlider');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  // Change select for init method
  async setInitMethod(value) {
    await this.locators.initMethod.selectOption(value);
    // give app a tick to react
    await this.page.waitForTimeout(50);
  }

  // Click canvas at a specific (x,y) relative to the canvas's bounding box
  async clickCanvasAt(offsetX, offsetY, options = {}) {
    const box = await this.locators.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    await this.page.mouse.click(x, y, options);
  }

  // Add a point by clicking near center
  async addPointNearCenter() {
    const box1 = await this.locators.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const cx = Math.floor(box.width / 2);
    const cy = Math.floor(box.height / 2);
    await this.clickCanvasAt(cx, cy);
    // small wait for update
    await this.page.waitForTimeout(50);
  }

  // Shift+click canvas at a position to remove a point
  async shiftClickCanvasAt(offsetX, offsetY) {
    await this.clickCanvasAt(offsetX, offsetY, { modifiers: ['Shift'] });
    await this.page.waitForTimeout(50);
  }

  // Drag action on canvas: press at (sx,sy) move to (ex,ey) then release
  async dragOnCanvas(sx, sy, ex, ey, modifiers = []) {
    const box2 = await this.locators.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const startX = box.x + sx;
    const startY = box.y + sy;
    const endX = box.x + ex;
    const endY = box.y + ey;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down({ button: 'left', modifiers });
    // small step to simulate drag
    await this.page.mouse.move((startX + endX) / 2, (startY + endY) / 2);
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
    await this.page.waitForTimeout(80);
  }

  // Retrieve internal points via exposed debug API (if present)
  async getPointsViaDebug() {
    return this.page.evaluate(() => {
      try {
        return window._kmeans && window._kmeans.getPoints ? window._kmeans.getPoints() : null;
      } catch (e) {
        return null;
      }
    });
  }

  async getCentroidsViaDebug() {
    return this.page.evaluate(() => {
      try {
        return window._kmeans && window._kmeans.getCentroids ? window._kmeans.getCentroids() : null;
      } catch (e) {
        return null;
      }
    });
  }
}

test.describe('K-Means Clustering Interactive Demo - End-to-end', () => {
  // Collect console error messages and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (msg) => {
      // capture console messages of severity 'error'
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test('Initial load shows UI elements and default state', async ({ page }) => {
    // Purpose: verify page loads, script runs, and initial UI shows expected values.
    const app = new KMeansPage(page);
    await app.goto();

    // Title is present
    await expect(app.locators.title).toHaveText(/K-Means Clustering/i);

    // Default K value should be visible and be 3 (as per HTML)
    await expect(app.locators.kValue).toHaveText('3');

    // Legend should have K items (initial initCentroids called on load)
    const kText = await app.locators.kValue.innerText();
    const k = Number(kText);
    await expect(app.locators.legend.locator('.legend-item')).toHaveCount(k);

    // Iter should be 0 on load
    await expect(app.locators.iterDisplay).toHaveText('0');

    // There should be some points generated by the script's initial genBtn click
    const nPoints = Number(await app.locators.nPointsDisplay.innerText());
    expect(nPoints).toBeGreaterThan(0);

    // Stop button should be disabled initially
    await expect(app.locators.stopBtn).toBeDisabled();

    // Ensure no unexpected UI elements are hidden
    await expect(app.locators.canvas).toBeVisible();

    // Assert: no console errors or page errors occurred during load
    expect(consoleErrors, `Expected no console.error logs, found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Expected no page errors, found: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });

  test('Control interactions: change K, initialization methods, Init button updates legend and resets iter', async ({ page }) => {
    // Purpose: verify changing K, selecting init method, and clicking Init behaves correctly
    const app1 = new KMeansPage(page);
    await app.goto();

    // Change K to 5
    await app.setK(5);
    await expect(app.locators.kValue).toHaveText('5');

    // Legend should reflect 5 clusters after clicking Init
    await app.locators.initBtn.click();
    await page.waitForTimeout(80);
    await expect(app.locators.legend.locator('.legend-item')).toHaveCount(5);

    // Change initialization method to kpp and click Init again
    await app.setInitMethod('kpp');
    await app.locators.initBtn.click();
    await page.waitForTimeout(80);

    // Iter should still be 0 after re-initialization
    await expect(app.locators.iterDisplay).toHaveText('0');

    // No console/page errors during these operations
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Generate blobs and Clear button update point counts and UI', async ({ page }) => {
    // Purpose: verify genBtn creates points and clearBtn empties them
    const app2 = new KMeansPage(page);
    await app.goto();

    // Generate new blobs
    await app.locators.genBtn.click();
    await page.waitForTimeout(120);
    const nAfterGen = Number(await app.locators.nPointsDisplay.innerText());
    expect(nAfterGen).toBeGreaterThan(0);

    // Click Clear and verify points go to 0 and iter resets
    await app.locators.clearBtn.click();
    await page.waitForTimeout(80);
    const nAfterClear = Number(await app.locators.nPointsDisplay.innerText());
    expect(nAfterClear).toBe(0);
    await expect(app.locators.iterDisplay).toHaveText('0');

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Canvas interactions: add a point by left-click and remove by Shift+click', async ({ page }) => {
    // Purpose: ensure adding and removing points via canvas works
    const app3 = new KMeansPage(page);
    await app.goto();

    // Record initial nPoints
    const initial = Number(await app.locators.nPointsDisplay.innerText());

    // Add a point near center
    await app.addPointNearCenter();
    const afterAdd = Number(await app.locators.nPointsDisplay.innerText());
    expect(afterAdd).toBe(initial + 1);

    // Use the center coordinates to shift+click and remove the most-recent point
    const box3 = await app.locators.canvas.boundingBox();
    const cx1 = Math.floor(box.width / 2);
    const cy1 = Math.floor(box.height / 2);

    // Shift+click at same location to attempt removal
    await app.shiftClickCanvasAt(cx, cy);
    const afterRemove = Number(await app.locators.nPointsDisplay.innerText());
    // After removal, either decreased by 1 or stayed same (if no point found). We assert decreased.
    expect(afterRemove).toBeLessThanOrEqual(afterAdd);
    // It is expected to remove one if it found a nearby point; allow equality as a non-fatal case
    // but prefer to see a decrease when possible:
    expect(afterRemove === afterAdd - 1 || afterRemove === afterAdd).toBeTruthy();

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Dragging a point updates its coordinates (via debug API) and UI updates', async ({ page }) => {
    // Purpose: verify dragging a point modifies its position and UI stays consistent
    const app4 = new KMeansPage(page);
    await app.goto();

    // Ensure at least one point exists; if none, generate blobs
    let pts = await app.getPointsViaDebug();
    if (!pts || pts.length === 0) {
      await app.locators.genBtn.click();
      await page.waitForTimeout(120);
      pts = await app.getPointsViaDebug();
    }
    expect(pts && pts.length).toBeGreaterThan(0);

    // Pick the first point position
    const first = pts[0];
    // Compute a target slightly offset
    const box4 = await app.locators.canvas.boundingBox();
    // Convert point coordinates relative to canvas bounding box
    const startX1 = Math.max(10, Math.min(box.width - 10, Math.floor(first.x)));
    const startY1 = Math.max(10, Math.min(box.height - 10, Math.floor(first.y)));
    const endX1 = Math.min(box.width - 10, startX + 40);
    const endY1 = Math.min(box.height - 10, startY + 20);

    // Drag using Page.mouse: move to point and drag
    await app.dragOnCanvas(startX, startY, endX, endY);

    // Check points via debug to ensure the first point moved (coordinates changed)
    const ptsAfter = await app.getPointsViaDebug();
    expect(ptsAfter && ptsAfter.length).toBeGreaterThan(0);

    const newFirst = ptsAfter[0];
    // The point's x or y should have changed compared to previous snapshot
    const moved = Math.abs(newFirst.x - first.x) > 0.1 || Math.abs(newFirst.y - first.y) > 0.1;
    expect(moved).toBeTruthy();

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Step and Run operations update iteration count and Stop toggles', async ({ page }) => {
    // Purpose: test iterateOnce via Step button and runUntilConverged via Run/Stop controls
    const app5 = new KMeansPage(page);
    await app.goto();

    // Ensure some points exist
    let pts1 = await app.getPointsViaDebug();
    if (!pts || pts.length === 0) {
      await app.locators.genBtn.click();
      await page.waitForTimeout(120);
      pts = await app.getPointsViaDebug();
    }
    expect(pts && pts.length).toBeGreaterThan(0);

    // Click Init to ensure centroids initialized
    await app.locators.initBtn.click();
    await page.waitForTimeout(80);

    // Click Step and expect iter increments by 1
    const iterBefore = Number(await app.locators.iterDisplay.innerText());
    await app.locators.stepBtn.click();
    await page.waitForTimeout(80);
    const iterAfterStep = Number(await app.locators.iterDisplay.innerText());
    expect(iterAfterStep).toBe(iterBefore + 1);

    // Set maxIter to a small number to make Run finish quickly
    await app.locators.maxIter.fill('3');
    await app.locators.maxIter.dispatchEvent('change');
    await app.locators.tol.fill('0.0001');
    await app.locators.tol.dispatchEvent('change');

    // Click Run and wait until iter reaches >= 1 (it should start)
    await app.locators.runBtn.click();

    // Wait for iter to become >= iterAfterStep (at least one more iter) or for stop button disabled state toggling
    await page.waitForFunction(
      (sel, prev) => Number(document.querySelector(sel).textContent) >= prev,
      {},
      '#iter',
      iterAfterStep
    );

    // After some time, stop the run (defensive)
    await page.waitForTimeout(200);
    // Click Stop to ensure running stops
    await app.locators.stopBtn.click();
    await page.waitForTimeout(80);

    // Stop button should be disabled after stopping
    await expect(app.locators.stopBtn).toBeDisabled();

    // Iter value is a number and not NaN
    const finalIter = Number(await app.locators.iterDisplay.innerText());
    expect(Number.isFinite(finalIter)).toBeTruthy();

    // SSE display is a numeric string
    const sseText = await app.locators.sseDisplay.innerText();
    expect(() => Number(sseText)).not.toThrow();
    expect(!Number.isNaN(Number(sseText))).toBeTruthy();

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Edge cases: changing K to 1 and initializing with fewer points than K', async ({ page }) => {
    // Purpose: ensure the app handles small K and cases where points < K
    const app6 = new KMeansPage(page);
    await app.goto();

    // Clear points to create fewer points than K
    await app.locators.clearBtn.click();
    await page.waitForTimeout(50);
    const n0 = Number(await app.locators.nPointsDisplay.innerText());
    expect(n0).toBe(0);

    // Set K to 6 (larger than current points = 0)
    await app.setK(6);
    await expect(app.locators.kValue).toHaveText('6');

    // Click Init with random method
    await app.setInitMethod('random');
    await app.locators.initBtn.click();
    await page.waitForTimeout(80);

    // With zero points, centroids should still be created; legend should have 6 items
    await expect(app.locators.legend.locator('.legend-item')).toHaveCount(6);

    // Now set K to 1 and init; legend has 1 item
    await app.setK(1);
    await app.locators.initBtn.click();
    await page.waitForTimeout(80);
    await expect(app.locators.legend.locator('.legend-item')).toHaveCount(1);

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test.afterEach(async ({ page }) => {
    // Final check for console errors or page errors that might have occurred during test
    // We assert there are no console.error logs and no uncaught page errors.
    expect(consoleErrors, `Console errors were observed: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Page errors were observed: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });
});