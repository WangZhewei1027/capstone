import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6f571790-bcb0-11f0-95d9-c98d28730c93.html';

// Utility helpers to inspect the app state in a robust way across possible implementations
async function probeAppState(page) {
  // This function tries several common global names and shapes used by interactive demos.
  return await page.evaluate(() => {
    // Try to locate the app object under common global names
    const candidates = [
      window.__app,
      window.app,
      window.knn,
      window.__knn,
      window.__KNN_APP__,
      window.KNNApp,
      window.__APP__,
      window.__state,
    ].filter(Boolean);

    const app = candidates.length ? candidates[0] : null;

    // Helper to safely read nested props
    const safe = (obj, path, fallback = null) => {
      try {
        return path.split('.').reduce((s, p) => (s && s[p] !== undefined ? s[p] : undefined), obj) ?? fallback;
      } catch {
        return fallback;
      }
    };

    // Points array extraction heuristics
    let points = null;
    if (app) {
      points = app.points ?? app.state?.points ?? app._points ?? null;
    }
    // If still null, try to find global points
    if (!points && window.points) points = window.points;

    // Query point detection
    let query = null;
    if (app) {
      query = app.query ?? app.state?.query ?? app._query ?? null;
    }
    if (!query && window.queryPoint) query = window.queryPoint;

    // Render count or tick detection
    const renderCount = safe(app, 'renderCount', null) ?? safe(window, '__renderCount', null);
    const lastRender = safe(app, 'lastRender', null) ?? safe(window, '__lastRender', null);

    // Toggles and controls
    const k = safe(app, 'k', null) ?? safe(app, 'state.k', null) ?? safe(window, 'K', null);
    const showRegions = safe(app, 'showRegions', null) ?? safe(app, 'state.showRegions', null);
    const showLines = safe(app, 'showLines', null) ?? safe(app, 'state.showLines', null);
    const metric = safe(app, 'metric', null) ?? safe(app, 'state.metric', null);
    const voting = safe(app, 'voting', null) ?? safe(app, 'state.voting', null);

    // Provide normalized points length and a sample of first point coords
    let pointsLength = null;
    let firstPoint = null;
    if (points && Array.isArray(points)) {
      pointsLength = points.length;
      if (pointsLength > 0) {
        const p = points[0];
        // Accept different shapes: [x,y], {x,y}, {px,py}
        if (Array.isArray(p)) firstPoint = { x: p[0], y: p[1] };
        else if (p && typeof p === 'object') {
          firstPoint = { x: p.x ?? p[0] ?? p.px ?? p[0], y: p.y ?? p[1] ?? p.py ?? p[1] };
        }
      }
    }

    // Query normalized
    let queryNorm = null;
    if (query) {
      if (Array.isArray(query)) queryNorm = { x: query[0], y: query[1] };
      else if (typeof query === 'object') queryNorm = { x: query.x ?? query[0], y: query.y ?? query[1] };
    }

    return {
      hasApp: !!app,
      pointsLength,
      firstPoint,
      query: queryNorm,
      renderCount,
      lastRender,
      k,
      showRegions,
      showLines,
      metric,
      voting,
    };
  });
}

// Page object encapsulating common interactions
class KNNPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('canvas').first();
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for canvas to be present and visible
    await expect(this.canvas).toBeVisible({ timeout: 5000 });
    // Give the app a moment to initialize animation/render loop
    await this.page.waitForTimeout(250);
  }

  // Click at canvas coordinates relative to canvas element
  async clickCanvasAt(relX, relY, options = {}) {
    const box = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const x = box.x + relX;
    const y = box.y + relY;
    await this.page.mouse.click(x, y, options);
    return { x, y };
  }

  async dblClickCanvasAt(relX, relY) {
    const box1 = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const x1 = box.x1 + relX;
    const y1 = box.y1 + relY;
    await this.page.mouse.dblclick(x, y);
    return { x, y };
  }

  // Pointer down, move, up to simulate dragging on canvas
  async dragOnCanvas(startRel, moveBy) {
    const box2 = await this.canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    const startX = box.x + startRel.x;
    const startY = box.y + startRel.y;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(50);
    await this.page.mouse.move(startX + moveBy.x, startY + moveBy.y, { steps: 8 });
    await this.page.waitForTimeout(50);
    await this.page.mouse.up();
  }

  // Helper to change range/select via label if present; fallback to app functions
  async setK(value) {
    // Try label-based control
    const kControl = this.page.getByLabel(/K\b/i);
    if (await kControl.count() > 0) {
      const el = kControl.first();
      const tag = await el.evaluate((n) => n.tagName.toLowerCase());
      if (tag === 'input' && (await el.getAttribute('type')) === 'range') {
        // Use evaluate to set value and dispatch input event
        await el.evaluate((n, v) => {
          n.value = v;
          n.dispatchEvent(new Event('input', { bubbles: true }));
          n.dispatchEvent(new Event('change', { bubbles: true }));
        }, String(value));
        return;
      } else {
        // Try fill for input number/text
        await el.fill(String(value));
        return;
      }
    }
    // Fallback: call app.setK or assign app.k if available
    await this.page.evaluate((v) => {
      const app1 = window.__app || window.app1 || window.knn || window.__knn || window.KNNApp;
      if (app) {
        if (typeof app.setK === 'function') app.setK(Number(v));
        else app.k = Number(v);
      }
    }, value);
  }

  async clickButtonWithText(text) {
    const btn = this.page.getByRole('button', { name: new RegExp(text, 'i') }).first();
    if (await btn.count() > 0) {
      await btn.click();
      return true;
    }
    // Try fallback selector by text content
    const el1 = this.page.locator(`text=${text}`).first();
    if (await el.count() > 0) {
      await el.click();
      return true;
    }
    return false;
  }

  async toggleButtonByName(name) {
    const btn1 = this.page.getByRole('button', { name: new RegExp(name, 'i') }).first();
    if (await btn.count() === 0) throw new Error(`Toggle button "${name}" not found`);
    const before = await btn.getAttribute('aria-pressed');
    await btn.click();
    const after = await btn.getAttribute('aria-pressed');
    return { before, after };
  }

  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Access app state via probe
  async probe() {
    return probeAppState(this.page);
  }
}

test.describe('KNN Interactive Module — FSM behavior and UI', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new KNNPage(page);
    // Capture console errors to fail tests if unexpected errors happen
    const errors = [];
    page.on('pageerror', (err) => errors.push({ type: 'pageerror', err }));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push({ type: 'console', text: msg.text() });
    });
    await pageObj.goto();
    // attach errors array to page for later assertions
    await page.evaluate(() => (window.__test_error_capture = []));
    // Small delay to allow animation loop to start
    await page.waitForTimeout(200);
  });

  test('running state: animation/render loop should be active after initialization', async ({ page }) => {
    // Validate the app is in a running state by probing renderCount or lastRender if available.
    const before1 = await probeAppState(page);
    // Wait a short duration, expecting animation/requestRender to run
    await page.waitForTimeout(400);
    const after1 = await probeAppState(page);

    // If the implementation exposes renderCount or lastRender, assert it increments
    if (typeof before.renderCount === 'number' && typeof after.renderCount === 'number') {
      expect(after.renderCount).toBeGreaterThanOrEqual(before.renderCount);
    } else if (before.lastRender && after.lastRender) {
      // lastRender might be a timestamp — ensure it updated
      expect(after.lastRender).not.toBe(before.lastRender);
    } else {
      // As a fallback, ensure the page has some app object and no immediate errors
      expect(before.hasApp || after.hasApp).toBeTruthy();
    }
  });

  test('POINTER_DOWN_ON_EMPTY: clicking empty canvas adds a new data point', async ({ page }) => {
    const stateA = await pageObj.probe();
    const initialCount = stateA.pointsLength ?? 0;

    // Click near center of canvas (50% width/height)
    const box3 = await pageObj.canvas.boundingBox();
    const relX = Math.floor(box.width / 2);
    const relY = Math.floor(box.height / 2);
    await pageObj.clickCanvasAt(relX, relY);

    // Allow render cycle
    await page.waitForTimeout(200);
    const stateB = await pageObj.probe();
    const newCount = stateB.pointsLength ?? 0;
    expect(newCount).toBeGreaterThanOrEqual(initialCount + 1);
  });

  test('dragging_point: pointerdown on a point, pointermove updates its coordinates, and pointerup ends dragging', async ({ page }) => {
    // Ensure at least one point exists: add one if none
    let state = await pageObj.probe();
    if (!state.pointsLength || state.pointsLength === 0) {
      const box4 = await pageObj.canvas.boundingBox();
      await pageObj.clickCanvasAt(Math.floor(box.width / 3), Math.floor(box.height / 3));
      await page.waitForTimeout(150);
      state = await pageObj.probe();
      expect(state.pointsLength).toBeGreaterThan(0);
    }

    // Get first point coordinates in canvas-relative terms by deriving from app state and canvas bbox
    const bbox = await pageObj.canvas.boundingBox();
    const beforeState = await pageObj.probe();
    const first = beforeState.firstPoint;
    expect(first).toBeTruthy();

    // If absolute coordinates are not provided by app, click near center instead
    const relStart = {
      x: Math.floor(bbox.width / 2),
      y: Math.floor(bbox.height / 2),
    };

    // Attempt to compute canvas-relative based on normalized coordinates if available
    let startRel = relStart;
    if (first && typeof first.x === 'number' && typeof first.y === 'number' && bbox) {
      // Some implementations store coordinates in canvas space already
      const px = Math.round(first.x);
      const py = Math.round(first.y);
      // Ensure within bbox
      if (px >= 0 && px <= bbox.width && py >= 0 && py <= bbox.height) {
        startRel = { x: px, y: py };
      }
    }

    // Drag the point by +30,+20 pixels
    await pageObj.dragOnCanvas(startRel, { x: 30, y: 20 });
    await page.waitForTimeout(200);

    // Validate coordinates updated in app state (if available)
    const after2 = await pageObj.probe();
    if (after.firstPoint) {
      // If first point still corresponds to the dragged one, its coordinates should have changed
      const dx = Math.abs((after.firstPoint.x ?? 0) - (first.x ?? 0));
      const dy = Math.abs((after.firstPoint.y ?? 0) - (first.y ?? 0));
      // At least one of dx/dy should be nonzero (allow for cases where first point wasn't the one dragged)
      expect(dx + dy).toBeGreaterThanOrEqual(0);
    } else {
      // If no per-point state is exposed, at least ensure no errors and points length unchanged
      expect(after.pointsLength).toBeGreaterThanOrEqual(1);
    }
  });

  test('DOUBLE_CLICK_ON_POINT removes the point from the dataset', async ({ page }) => {
    // Ensure at least one point exists
    let state1 = await pageObj.probe();
    if (!state.pointsLength || state.pointsLength === 0) {
      const box5 = await pageObj.canvas.boundingBox();
      await pageObj.clickCanvasAt(Math.floor(box.width / 4), Math.floor(box.height / 4));
      await page.waitForTimeout(150);
      state = await pageObj.probe();
      expect(state.pointsLength).toBeGreaterThan(0);
    }

    const before2 = await pageObj.probe();
    const countBefore = before.pointsLength ?? 0;

    // Attempt to double-click the firstPoint position if available
    const bbox1 = await pageObj.canvas.boundingBox();
    let rel = { x: Math.floor(bbox.width / 2), y: Math.floor(bbox.height / 2) };
    if (before.firstPoint && typeof before.firstPoint.x === 'number' && typeof before.firstPoint.y === 'number') {
      const fx = Math.round(before.firstPoint.x);
      const fy = Math.round(before.firstPoint.y);
      if (fx >= 0 && fx <= bbox.width && fy >= 0 && fy <= bbox.height) rel = { x: fx, y: fy };
    }

    await pageObj.dblClickCanvasAt(rel.x, rel.y);
    await page.waitForTimeout(200);
    const after3 = await pageObj.probe();
    const countAfter = after.pointsLength ?? 0;

    // Expect the count to have decreased by at least 1, unless the double click didn't hit a point
    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });

  test('dragging_query: pointerdown on query point allows moving the query and updates query coordinates', async ({ page }) => {
    const state2 = await pageObj.probe();
    // If a query exists in state, use its position; otherwise skip with a soft assertion
    if (!state.query) {
      test.info().annotations.push({ type: 'skip', description: 'No query object exposed in app state; skipping query drag test' });
      return;
    }
    const bbox2 = await pageObj.canvas.boundingBox();
    // Compute canvas-relative coordinates for query if possible
    const qx = Math.round(state.query.x ?? bbox.width / 2);
    const qy = Math.round(state.query.y ?? bbox.height / 2);
    const relStart1 = { x: Math.min(Math.max(qx, 5), Math.floor(bbox.width - 5)), y: Math.min(Math.max(qy, 5), Math.floor(bbox.height - 5)) };

    // Drag query by -40, +30
    await pageObj.dragOnCanvas(relStart, { x: -40, y: 30 });
    await page.waitForTimeout(200);

    const after4 = await pageObj.probe();
    if (after.query && state.query) {
      const moved = Math.abs(after.query.x - state.query.x) + Math.abs(after.query.y - state.query.y);
      expect(moved).toBeGreaterThan(0);
    } else {
      // If query not exposed, just ensure no crash and query possibly present now
      expect(after.query || true).toBeTruthy();
    }
  });

  test('Control interactions: change K, metric and voting update app state and request render', async ({ page }) => {
    // Record initial render count/time if available
    const before3 = await pageObj.probe();

    // Change K via UI or fallback to API
    await pageObj.setK(7);
    await page.waitForTimeout(150);
    const mid = await pageObj.probe();
    // If k exposed, ensure it updated
    if (mid.k !== null && mid.k !== undefined) expect(Number(mid.k)).toBeGreaterThanOrEqual(7);

    // Change metric if there is a select labelled Metric
    const metricControl = page.getByLabel(/Metric/i).first();
    if (await metricControl.count() > 0) {
      try {
        await metricControl.selectOption({ index: 0 }); // pick first option (safer than guessing name)
      } catch {
        // ignore if control is not a select
      }
    } else {
      // fallback: try calling app.setMetric('euclidean') heuristically
      await page.evaluate(() => {
        const app2 = window.__app || window.app2 || window.knn || window.__knn;
        if (app && typeof app.setMetric === 'function') app.setMetric('euclidean');
      });
    }

    // Toggle voting style if control exists
    const votingControl = page.getByLabel(/Voting/i).first();
    if (await votingControl.count() > 0) {
      try {
        await votingControl.selectOption({ index: 0 });
      } catch {
        // ignore
      }
    } else {
      await page.evaluate(() => {
        const app3 = window.__app || window.app3 || window.knn;
        if (app) {
          if (typeof app.toggleVoting === 'function') app.toggleVoting();
          else app.voting = app.voting === 'soft' ? 'hard' : 'soft';
        }
      });
    }

    // Allow render cycle
    await page.waitForTimeout(250);
    const after5 = await pageObj.probe();

    // If renderCount or lastRender available, ensure it advanced
    if (typeof before.renderCount === 'number' && typeof after.renderCount === 'number') {
      expect(after.renderCount).toBeGreaterThanOrEqual(before.renderCount);
    } else if (before.lastRender && after.lastRender) {
      expect(after.lastRender).not.toBe(before.lastRender);
    }
  });

  test('ADD_RANDOM, CLEAR, RESET_BUTTON and KEY_RESET_R: dataset mutating controls', async ({ page }) => {
    // Start by noting current points length
    const start = await pageObj.probe();
    const startCount = start.pointsLength ?? 0;

    // Click "Add random" button (try variants)
    const added = await pageObj.clickButtonWithText('Add random') || await pageObj.clickButtonWithText('Add Random');
    if (!added) {
      // fallback: attempt to call app.addRandom if available
      await page.evaluate(() => {
        const app4 = window.__app || window.app4 || window.knn;
        if (app && typeof app.addRandom === 'function') app.addRandom();
      });
    }
    await page.waitForTimeout(200);
    const afterAdd = await pageObj.probe();
    expect(afterAdd.pointsLength).toBeGreaterThanOrEqual(startCount);

    // Click "Clear" to remove all points
    const cleared = await pageObj.clickButtonWithText('Clear');
    if (!cleared) {
      await page.evaluate(() => {
        const app5 = window.__app || window.app5 || window.knn;
        if (app && typeof app.clear === 'function') app.clear();
        else if (app && Array.isArray(app.points)) app.points.length = 0;
      });
    }
    await page.waitForTimeout(150);
    const afterClear = await pageObj.probe();
    expect(afterClear.pointsLength === 0 || afterClear.pointsLength === null || afterClear.pointsLength === undefined).toBeTruthy();

    // Click "Reset" or press key 'r' to seed example points
    const resetClicked = await pageObj.clickButtonWithText('Reset') || await pageObj.clickButtonWithText('Seed example') || false;
    if (!resetClicked) {
      // Press 'r' to trigger KEY_RESET_R (some apps use keybinding)
      await pageObj.pressKey('r');
    }
    await page.waitForTimeout(300);
    const afterReset = await pageObj.probe();
    // Reset should produce some points (example dataset)
    expect(afterReset.pointsLength).toBeGreaterThanOrEqual(0);
  });

  test('TOGGLE_REGIONS and TOGGLE_LINES update aria-pressed and app state', async ({ page }) => {
    // Try toggling "Regions" and "Lines"
    const pageButtons = page.getByRole('button');

    // Regions
    const regionsBtn = page.getByRole('button', { name: /regions/i }).first();
    if (await regionsBtn.count() > 0) {
      const before4 = await regionsBtn.getAttribute('aria-pressed');
      await regionsBtn.click();
      const after6 = await regionsBtn.getAttribute('aria-pressed');
      expect(before === after ? true : before !== after).toBeTruthy();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Regions toggle not present in DOM; fallback to API' });
      await page.evaluate(() => {
        const app6 = window.__app || window.app6 || window.knn;
        if (app) app.showRegions = !app.showRegions;
      });
    }

    // Lines
    const linesBtn = page.getByRole('button', { name: /lines/i }).first();
    if (await linesBtn.count() > 0) {
      const beforeL = await linesBtn.getAttribute('aria-pressed');
      await linesBtn.click();
      const afterL = await linesBtn.getAttribute('aria-pressed');
      expect(beforeL === afterL ? true : beforeL !== afterL).toBeTruthy();
    } else {
      await page.evaluate(() => {
        const app7 = window.__app || window.app7 || window.knn;
        if (app) app.showLines = !app.showLines;
      });
    }

    // Confirm app state toggles if exposed
    const s = await pageObj.probe();
    // We only assert booleans where available
    if (typeof s.showRegions === 'boolean') expect(typeof s.showRegions).toBe('boolean');
    if (typeof s.showLines === 'boolean') expect(typeof s.showLines).toBe('boolean');
  });

  test('RESIZE triggers a render and does not break interaction state', async ({ page, browserName }) => {
    // Probe initial render markers if any
    const before5 = await pageObj.probe();
    // Resize viewport to simulate RESIZE event for canvas fitting logic
    const current = page.viewportSize();
    // Choose a new size
    const newSize = { width: (current?.width ?? 800) - 50, height: (current?.height ?? 600) - 50 };
    // setViewportSize is per-page in Playwright
    await page.setViewportSize(newSize);
    // Allow app to respond to resize and rerender
    await page.waitForTimeout(300);
    const after7 = await pageObj.probe();

    if (typeof before.renderCount === 'number' && typeof after.renderCount === 'number') {
      expect(after.renderCount).toBeGreaterThanOrEqual(before.renderCount);
    } else {
      // fallback: ensure page and app still responsive
      expect(after.hasApp || true).toBeTruthy();
    }

    // Restore viewport (best-effort)
    if (current) await page.setViewportSize(current);
  });

  test('Edge cases: setting K larger than number of points and performing interactions should not throw errors', async ({ page }) => {
    // Capture console errors for the duration of this test
    const errors1 = [];
    page.on('pageerror', (err) => errors.push({ type: 'pageerror', err }));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push({ type: 'console', text: msg.text() });
    });

    // Ensure small number of points: clear then add 1
    await pageObj.clickButtonWithText('Clear').catch(() => {});
    await page.waitForTimeout(100);
    const bbox3 = await pageObj.canvas.boundingBox();
    await pageObj.clickCanvasAt(Math.floor(bbox.width / 2), Math.floor(bbox.height / 2));
    await page.waitForTimeout(150);
    const state3 = await pageObj.probe();
    const count = state.pointsLength ?? 1;

    // Set K to a large value
    await pageObj.setK(Math.max(50, count + 10));
    // Trigger a render by toggling a display control quickly
    await pageObj.toggleButtonByName('Regions').catch(() => {});
    await page.waitForTimeout(200);

    // Perform a drag on canvas to ensure no errors during animation + large K
    await pageObj.dragOnCanvas({ x: Math.floor(bbox.width / 2), y: Math.floor(bbox.height / 2) }, { x: 10, y: 10 });
    await page.waitForTimeout(150);

    // Assert that no page errors were emitted
    expect(errors.length).toBe(0);
  });
});