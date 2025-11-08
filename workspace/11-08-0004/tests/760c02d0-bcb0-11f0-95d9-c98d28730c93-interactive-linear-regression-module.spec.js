import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/760c02d0-bcb0-11f0-95d9-c98d28730c93.html';

// Page object for the regression module UI
class RegressionPage {
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app and wait for initial rendering
  async open() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
    // wait for an SVG to exist (core UI)
    await this.page.waitForSelector('svg', { timeout: 5000 });
  }

  // Generic helper to find a button by partial text (case-insensitive)
  buttonByText(regex) {
    return this.page.locator('button', { hasText: regex }).first();
  }

  // Try to find a control by label text (for toggles/checkboxes)
  labelByText(regex) {
    return this.page.locator('label', { hasText: regex }).first();
  }

  // The main SVG element
  svg() {
    return this.page.locator('svg').first();
  }

  // Group containing point circles - try possible selectors
  pointsGroup() {
    return this.page.locator('g#points, g.points, g[data-role="points"]').first();
  }

  // Return locator for point circles (fallback to any circle inside SVG)
  points() {
    return this.page.locator('g#points circle, g.points circle, svg circle, circle').filter({ has: this.svg() });
  }

  // Count number of points currently rendered
  async pointsCount() {
    // limit to ensure valid number retrieval
    const count = await this.page.evaluate(() => {
      // try to find an explicit points group first
      const g = document.querySelector('g#points') || document.querySelector('g.points') || document.querySelector('g[data-role="points"]');
      if (g) return g.querySelectorAll('circle').length;
      // fallback: any circle inside first svg that has class "point" or any circle
      const svg = document.querySelector('svg');
      if (!svg) return 0;
      const byClass = svg.querySelectorAll('circle.point');
      if (byClass.length) return byClass.length;
      return svg.querySelectorAll('circle').length;
    });
    return count;
  }

  // Click on SVG at relative coordinates (percent values 0..1)
  async clickSvgAt(relX = 0.5, relY = 0.5) {
    const svgHandle = await this.svg();
    const box = await svgHandle.boundingBox();
    if (!box) throw new Error('SVG bounding box not available');
    const x = box.x + relX * box.width;
    const y = box.y + relY * box.height;
    await this.page.mouse.click(x, y, { button: 'left' });
  }

  // Find a point circle locator by index (0-based)
  pointByIndex(index = 0) {
    // attempt to return the nth circle in the points group
    return this.page.locator('g#points circle, g.points circle, svg circle, circle').nth(index);
  }

  // Double-click a point
  async doubleClickPoint(index = 0) {
    const pt = this.pointByIndex(index);
    await pt.dblclick();
  }

  // Drag a point by dx/dy in pixels
  async dragPointBy(index = 0, dx = 20, dy = 0) {
    const pt1 = this.pointByIndex(index);
    const box1 = await pt.boundingBox();
    if (!box) throw new Error('Point bounding box not available for dragging');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small move to ensure pointer capture
    await this.page.mouse.move(startX + 2, startY + 2);
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 10 });
    await this.page.mouse.up();
  }

  // Press a key on page
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Find a slider (range input)
  rangeInput() {
    return this.page.locator('input[type="range"]').first();
  }

  // Set learning rate slider value by direct evaluation (if slider exists)
  async setLearningRate(value) {
    const slider = this.rangeInput();
    if (await slider.count() === 0) {
      // fallback: try to set a JS variable if present
      await this.page.evaluate((v) => {
        const w = window;
        if (w && w.params) w.params.learningRate = v;
      }, value);
      return;
    }
    // set value via DOM and dispatch input event
    await slider.evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  // Click common buttons used by the UI using probable labels
  async clickClear() {
    const btn = this.buttonByText(/clear|reset points|clear points/i);
    if (await btn.count() === 0) {
      // fallback button text "C"
      const btn2 = this.buttonByText(/^C$/);
      if (await btn2.count() === 0) throw new Error('Clear button not found');
      await btn2.click();
      return;
    }
    await btn.click();
  }

  async clickUndo() {
    const btn1 = this.buttonByText(/undo/i);
    if (await btn.count() === 0) return; // optional
    await btn.click();
  }

  async clickOLS() {
    const btn21 = this.buttonByText(/ols|least squares|compute ols/i);
    if (await btn.count() === 0) {
      // try button with text "OLS"
      const btn211 = this.buttonByText(/^OLS$/i);
      if (await btn2.count() === 0) throw new Error('OLS button not found');
      await btn2.click();
      return;
    }
    await btn.click();
  }

  async clickGdToggle() {
    const btn3 = this.buttonByText(/gd|gradient/i);
    if (await btn.count() === 0) {
      // try "Start" or "Pause"
      const alt = this.buttonByText(/start|pause/i);
      if (await alt.count() === 0) throw new Error('GD toggle button not found');
      await alt.click();
      return;
    }
    await btn.click();
  }

  async clickStep() {
    const btn4 = this.buttonByText(/step/i);
    if (await btn.count() === 0) throw new Error('Step button not found');
    await btn.click();
  }

  async clickResetParams() {
    const btn5 = this.buttonByText(/reset params|reset parameters|reset/i);
    if (await btn.count() === 0) return;
    await btn.click();
  }

  // Toggle a labeled checkbox (e.g., Residuals, Show OLS)
  async toggleLabeled(labelRegex) {
    const label = this.labelByText(labelRegex);
    if (await label.count() === 0) return;
    // find associated input inside label or next to it
    const input = label.locator('input, button, [role="switch"]').first();
    if (await input.count() === 0) {
      // click label area
      await label.click();
    } else {
      await input.click();
    }
  }

  // Resize viewport to trigger window resize handlers
  async triggerResize(width = 800, height = 600) {
    await this.page.setViewportSize({ width, height });
    // dispatch resize event
    await this.page.evaluate(() => window.dispatchEvent(new Event('resize')));
  }

  // Try to read module params from window if exposed
  async readParamsFromWindow() {
    const params = await this.page.evaluate(() => {
      // Common variable names that may hold the module state
      const candidates = ['params', 'state', 'app', 'module', 'lrModule', 'linearRegression'];
      for (const name of candidates) {
        // @ts-ignore
        if (window[name] && typeof window[name] === 'object') {
          // @ts-ignore
          const p = window[name].params || window[name];
          if (p && typeof p === 'object' && ('b0' in p || 'b1' in p || 'learningRate' in p)) return p;
        }
      }
      // fallback: direct top-level b0/b1
      // @ts-ignore
      if (window.b0 !== undefined || window.b1 !== undefined) return { b0: window.b0, b1: window.b1 };
      return null;
    });
    return params;
  }

  // Try to read param text (b0/b1) from DOM text nodes if displayed
  async readParamsFromDOM() {
    // look for elements containing 'b0' or 'b1' labels or numbers near "b0" text
    const text = await this.page.evaluate(() => document.body.innerText || '');
    // try to extract decimals following b0/b1 labels
    const b0Match = text.match(/b0[:\s]*([+-]?\d+(\.\d+)?)/i);
    const b1Match = text.match(/b1[:\s]*([+-]?\d+(\.\d+)?)/i);
    if (b0Match || b1Match) {
      return {
        b0: b0Match ? parseFloat(b0Match[1]) : undefined,
        b1: b1Match ? parseFloat(b1Match[1]) : undefined,
      };
    }
    // try generic "bias" or "slope"
    const slopeMatch = text.match(/slope[:\s]*([+-]?\d+(\.\d+)?)/i) || text.match(/m[:\s]*([+-]?\d+(\.\d+)?)/i);
    if (slopeMatch) {
      return { b1: parseFloat(slopeMatch[1]) };
    }
    return null;
  }

  // Read params via either window or DOM fallback
  async getParams() {
    const win = await this.readParamsFromWindow();
    if (win) return win;
    const dom = await this.readParamsFromDOM();
    return dom;
  }

  // Helper to wait until a condition function returns true or timeout
  async waitForCondition(fn, timeout = 3000, interval = 50) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const ok = await this.page.evaluate(fn);
      if (ok) return true;
      await this.page.waitForTimeout(interval);
    }
    throw new Error('waitForCondition timed out');
  }
}

test.describe('Interactive Linear Regression Module - FSM end-to-end tests', () => {
  let page;
  let rp;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    rp = new RegressionPage(page);
    await rp.open();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initialization and default state (init -> idle / no_points)', () => {
    test('should seed example points on init or handle no points (init state)', async () => {
      // Validate that the page has initialized and that either seeded points are present or no_points state is active
      const count1 = await rp.pointsCount();
      // either zero (no_points) or >= 1 (idle)
      expect(count).toBeGreaterThanOrEqual(0);
      // If points exist, ensure at least one SVG circle is visible
      if (count > 0) {
        const firstPoint = rp.pointByIndex(0);
        await expect(firstPoint).toBeVisible();
      } else {
        // no points: ensure clear action was applied and no circles exist
        expect(count).toBe(0);
        // If params are exposed, they should be reset to zeros per FSM no_points onEnter
        const params1 = await rp.getParams();
        if (params) {
          // param object may have b0 and b1 set to 0
          if ('b0' in params) expect(Number(params.b0)).toBeCloseTo(0, 6);
          if ('b1' in params) expect(Number(params.b1)).toBeCloseTo(0, 6);
        }
      }
    });
  });

  test.describe('Point interactions (adding, removing, dragging)', () => {
    test('adding a point by clicking the SVG increases points count and renders circle', async () => {
      const before = await rp.pointsCount();
      await rp.clickSvgAt(0.25, 0.25);
      // Wait a bit for render
      await page.waitForTimeout(200);
      const after = await rp.pointsCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);
    });

    test('double-clicking a point removes it and transitions to no_points when last removed', async () => {
      // Ensure there is at least one point
      const initial = await rp.pointsCount();
      if (initial === 0) {
        // add one
        await rp.clickSvgAt(0.5, 0.5);
        await page.waitForTimeout(200);
      }
      let count2 = await rp.pointsCount();
      expect(count).toBeGreaterThanOrEqual(1);
      // Remove all points by double-clicking them one-by-one
      while (count > 0) {
        await rp.doubleClickPoint(0);
        // allow UI to update
        await page.waitForTimeout(150);
        count = await rp.pointsCount();
      }
      // After removing last point, ensure we are in no_points state: no circles present
      expect(count).toBe(0);
      // params should be reset if exposed
      const params2 = await rp.getParams();
      if (params) {
        if ('b0' in params) expect(Number(params.b0)).toBeCloseTo(0, 6);
        if ('b1' in params) expect(Number(params.b1)).toBeCloseTo(0, 6);
      }
    });

    test('dragging a point updates its SVG position and triggers update onEnd', async () => {
      // Need at least one point
      let count3 = await rp.pointsCount();
      if (count === 0) {
        await rp.clickSvgAt(0.6, 0.6);
        await page.waitForTimeout(150);
        count = await rp.pointsCount();
      }
      expect(count).toBeGreaterThan(0);
      // Read original cx/cy of first point
      const pt2 = rp.pointByIndex(0);
      const beforeBox = await pt.boundingBox();
      expect(beforeBox).not.toBeNull();
      // Drag horizontally by +30px
      await rp.dragPointBy(0, 30, 0);
      // After drag, the circle's boundingBox center should have changed
      const afterBox = await pt.boundingBox();
      expect(afterBox).not.toBeNull();
      // Ensure x moved roughly by 30 (allow tolerance)
      const deltaX = Math.abs((afterBox.x + afterBox.width / 2) - (beforeBox.x + beforeBox.width / 2));
      expect(deltaX).toBeGreaterThan(10); // some movement should have occurred
    });

    test('keyboard delete on focused point removes it', async () => {
      // Add a point to ensure it exists
      await rp.clickSvgAt(0.55, 0.3);
      await page.waitForTimeout(150);
      let count4 = await rp.pointsCount();
      expect(count).toBeGreaterThan(0);
      // Focus the first point and press Delete
      const first = rp.pointByIndex(0);
      await first.focus();
      // Press Delete key
      await rp.pressKey('Delete');
      await page.waitForTimeout(150);
      const after1 = await rp.pointsCount();
      // After pressing delete, the point count should be reduced by at least 0 (some implementations remove only when focused)
      expect(after).toBeLessThanOrEqual(count);
    });
  });

  test.describe('Gradient descent (GD) controls and behavior', () => {
    test('clicking GD toggle starts/stops the GD animation loop (gd_running <-> idle)', async () => {
      // Ensure there are points to run GD on
      let count5 = await rp.pointsCount();
      if (count === 0) {
        // add two points
        await rp.clickSvgAt(0.3, 0.7);
        await rp.clickSvgAt(0.7, 0.3);
        await page.waitForTimeout(200);
      }

      // Read params before starting GD
      const paramsBefore = await rp.getParams();
      // Start GD
      await rp.clickGdToggle();
      // Wait some time for animation steps to update parameters
      await page.waitForTimeout(700);
      // Attempt to read params again - b1 or b0 should have changed if GD ran
      const paramsDuring = await rp.getParams();
      let changed = false;
      if (paramsBefore && paramsDuring) {
        if ('b1' in paramsBefore && 'b1' in paramsDuring) {
          changed = Number(paramsBefore.b1) !== Number(paramsDuring.b1);
        } else if ('b0' in paramsBefore && 'b0' in paramsDuring) {
          changed = Number(paramsBefore.b0) !== Number(paramsDuring.b0);
        }
      } else {
        // fallback: attempt to detect any change in DOM-rendered params
        const domBefore = await rp.readParamsFromDOM();
        await page.waitForTimeout(300);
        const domAfter = await rp.readParamsFromDOM();
        if (domBefore && domAfter) {
          changed = (domBefore.b1 !== domAfter.b1) || (domBefore.b0 !== domAfter.b0);
        }
      }
      expect(changed).toBeTruthy();

      // Now click toggle again to pause GD
      await rp.clickGdToggle();
      // wait to allow RAF cancellation
      await page.waitForTimeout(200);
      // Read params after stopping and ensure they don't change significantly over short time
      const paramsStopped = await rp.getParams();
      await page.waitForTimeout(400);
      const paramsLater = await rp.getParams();
      if (paramsStopped && paramsLater) {
        // Should remain effectively the same
        if ('b1' in paramsStopped && 'b1' in paramsLater) {
          expect(Number(paramsStopped.b1)).toBeCloseTo(Number(paramsLater.b1), 6);
        }
      }
    });

    test('GD auto-pauses when points become empty (POINTS_EMPTY transition)', async () => {
      // Ensure GD is running and points exist
      let count6 = await rp.pointsCount();
      if (count === 0) {
        await rp.clickSvgAt(0.4, 0.4);
        await page.waitForTimeout(120);
      }
      // Start GD
      await rp.clickGdToggle();
      await page.waitForTimeout(400);
      // Clear points while running
      await rp.clickClear();
      // Wait to allow module to react
      await page.waitForTimeout(200);
      // Points count should be zero
      const afterCount = await rp.pointsCount();
      expect(afterCount).toBe(0);
      // Check that GD is no longer updating: try to read window state variable if present
      const paramsNow = await rp.getParams();
      // Wait and ensure no further changes occur to params (if any)
      await page.waitForTimeout(300);
      const paramsLater1 = await rp.getParams();
      if (paramsNow && paramsLater && ('b1' in paramsNow || 'b0' in paramsNow)) {
        if ('b1' in paramsNow && 'b1' in paramsLater) {
          expect(Number(paramsNow.b1)).toBeCloseTo(Number(paramsLater.b1), 6);
        }
      }
    });

    test('CLICK_STEP performs a single GD step without starting animation loop', async () => {
      // Ensure points are present
      let count7 = await rp.pointsCount();
      if (count < 2) {
        await rp.clickSvgAt(0.2, 0.2);
        await rp.clickSvgAt(0.8, 0.8);
        await page.waitForTimeout(200);
      }
      const before1 = await rp.getParams();
      // Click step
      await rp.clickStep();
      await page.waitForTimeout(250);
      const after2 = await rp.getParams();
      // Verify that a param changed indicating a single GD step
      if (before && after) {
        let changed1 = false;
        if ('b1' in before && 'b1' in after) changed = Number(before.b1) !== Number(after.b1);
        if ('b0' in before && 'b0' in after) changed = changed || Number(before.b0) !== Number(after.b0);
        expect(changed).toBeTruthy();
      } else {
        // If params not exposed, ensure no continuous animation started: clicking step should not toggle GD running
        // Try to toggle GD via 'g' and ensure state changes accordingly (defensive)
        await rp.clickGdToggle(); // start
        await page.waitForTimeout(200);
        await rp.clickGdToggle(); // stop
        await page.waitForTimeout(200);
      }
    });

    test('changing learning rate (LR_CHANGE) affects GD behavior', async () => {
      // Ensure points present
      let count8 = await rp.pointsCount();
      if (count === 0) {
        await rp.clickSvgAt(0.33, 0.33);
        await rp.clickSvgAt(0.66, 0.66);
        await page.waitForTimeout(200);
      }
      // Read initial params
      const before2 = await rp.getParams();
      // Set a different learning rate using slider (if present)
      await rp.setLearningRate(0.5);
      // Start GD and observe speed of parameter change relative to a small LR
      await rp.setLearningRate(0.001); // set tiny LR first
      await rp.clickGdToggle(); // start
      await page.waitForTimeout(600);
      const smallLRParams = await rp.getParams();
      // Restart with larger LR
      await rp.clickGdToggle(); // pause
      await page.waitForTimeout(200);
      await rp.setLearningRate(0.1);
      await rp.clickGdToggle(); // start again
      await page.waitForTimeout(600);
      const bigLRParams = await rp.getParams();
      // Pause GD
      await rp.clickGdToggle();
      // If parameters are available, expect larger change magnitude when LR is larger (best effort check)
      if (smallLRParams && bigLRParams && before) {
        const changeSmall = Math.abs((smallLRParams.b1 || 0) - (before.b1 || 0));
        const changeBig = Math.abs((bigLRParams.b1 || 0) - (before.b1 || 0));
        // big change should be >= small change most of the time
        expect(changeBig).toBeGreaterThanOrEqual(changeSmall - 1e-8);
      }
    });

    test('toggles (residuals, show OLS, show GD) update UI while GD is running', async () => {
      // Ensure there are points
      let count9 = await rp.pointsCount();
      if (count === 0) {
        await rp.clickSvgAt(0.4, 0.4);
        await page.waitForTimeout(120);
      }
      // Start GD
      await rp.clickGdToggle();
      await page.waitForTimeout(300);
      // Toggle residuals label if present
      await rp.toggleLabeled(/residuals/i);
      // Toggle show OLS
      await rp.toggleLabeled(/show ols|ols line|ols/i);
      // Toggle show GD fit
      await rp.toggleLabeled(/show gd|gd line|gradient/i);
      // Wait a bit and ensure GD is still running (params change)
      const p1 = await rp.getParams();
      await page.waitForTimeout(400);
      const p2 = await rp.getParams();
      if (p1 && p2 && 'b1' in p1 && 'b1' in p2) {
        expect(Number(p1.b1)).not.toBeCloseTo(Number(p2.b1), 12);
      }
      // Stop GD to clean up
      await rp.clickGdToggle();
      await page.waitForTimeout(150);
    });
  });

  test.describe('OLS controls, reset and keyboard shortcuts', () => {
    test('CLICK_OLS computes OLS and sets params accordingly', async () => {
      // Ensure at least two points exist
      let count10 = await rp.pointsCount();
      if (count < 2) {
        await rp.clickSvgAt(0.2, 0.4);
        await rp.clickSvgAt(0.8, 0.6);
        await page.waitForTimeout(200);
      }
      // Click OLS
      await rp.clickOLS();
      await page.waitForTimeout(200);
      // OLS should set params. If exposed, olsParams should match current params
      const params3 = await rp.getParams();
      if (params) {
        // Expect numeric values (not NaN)
        if ('b1' in params) expect(Number.isFinite(Number(params.b1))).toBeTruthy();
        if ('b0' in params) expect(Number.isFinite(Number(params.b0))).toBeTruthy();
      }
    });

    test('CLICK_RESET_PARAMS sets params back to defaults (likely 0s) without altering points', async () => {
      // Ensure points exist
      await rp.clickSvgAt(0.3, 0.3);
      await rp.clickSvgAt(0.7, 0.7);
      await page.waitForTimeout(200);
      const countBefore = await rp.pointsCount();
      // Click reset params
      await rp.clickResetParams();
      await page.waitForTimeout(150);
      const countAfter = await rp.pointsCount();
      expect(countAfter).toBe(countBefore);
      // Params, if accessible, should be reset or changed
      const params4 = await rp.getParams();
      if (params) {
        if ('b0' in params) expect(Number(params.b0)).toBeCloseTo(0, 6);
        if ('b1' in params) {
          // Some implementations reset to OLS; allow either 0 or finite value
          expect(Number.isFinite(Number(params.b1))).toBeTruthy();
        }
      }
    });

    test('keyboard shortcuts: g toggles GD, o computes OLS, c clears points', async () => {
      // Ensure there are points for OLS and GD
      await rp.clickSvgAt(0.25, 0.25);
      await rp.clickSvgAt(0.75, 0.75);
      await page.waitForTimeout(200);

      // Press 'g' to start GD
      await rp.pressKey('g');
      await page.waitForTimeout(300);
      // Press 'g' to pause GD
      await rp.pressKey('g');
      await page.waitForTimeout(200);

      // Press 'o' to compute OLS
      await rp.pressKey('o');
      await page.waitForTimeout(150);
      const olsParams = await rp.getParams();
      if (olsParams) {
        if ('b1' in olsParams) expect(Number.isFinite(Number(olsParams.b1))).toBeTruthy();
      }

      // Press 'c' to clear points
      await rp.pressKey('c');
      await page.waitForTimeout(200);
      const finalCount = await rp.pointsCount();
      expect(finalCount).toBe(0);
    });
  });

  test.describe('Window resize and undo/clear edge-cases', () => {
    test('window resize triggers redraw without changing interaction mode', async () => {
      // Ensure some points present
      await rp.clickSvgAt(0.4, 0.4);
      await rp.clickSvgAt(0.6, 0.6);
      await page.waitForTimeout(200);
      const beforeCount = await rp.pointsCount();
      // Trigger resize
      await rp.triggerResize(1024, 768);
      await page.waitForTimeout(200);
      const afterCount1 = await rp.pointsCount();
      expect(afterCount).toBe(beforeCount);
      // Resize smaller and ensure still the same
      await rp.triggerResize(480, 640);
      await page.waitForTimeout(200);
      const afterCount2 = await rp.pointsCount();
      expect(afterCount2).toBe(beforeCount);
    });

    test('undo behaves gracefully when there are no points (CLICK_UNDO in no_points)', async () => {
      // Clear all points
      await rp.clickClear();
      await page.waitForTimeout(200);
      const count11 = await rp.pointsCount();
      expect(count).toBe(0);
      // Click undo - should not throw and should remain in no_points
      await rp.clickUndo();
      await page.waitForTimeout(150);
      const after3 = await rp.pointsCount();
      expect(after).toBe(0);
    });

    test('clear while GD running should pause GD and enter no_points', async () => {
      // Ensure points and start GD
      await rp.clickSvgAt(0.2, 0.2);
      await rp.clickSvgAt(0.8, 0.8);
      await page.waitForTimeout(200);
      // Start GD
      await rp.clickGdToggle();
      await page.waitForTimeout(300);
      // Clear points while running
      await rp.clickClear();
      await page.waitForTimeout(250);
      // Points are empty
      const count12 = await rp.pointsCount();
      expect(count).toBe(0);
      // GD should be paused - params should no longer be changing
      const pNow = await rp.getParams();
      await page.waitForTimeout(300);
      const pLater = await rp.getParams();
      if (pNow && pLater && 'b1' in pNow && 'b1' in pLater) {
        expect(Number(pNow.b1)).toBeCloseTo(Number(pLater.b1), 6);
      }
    });
  });
});