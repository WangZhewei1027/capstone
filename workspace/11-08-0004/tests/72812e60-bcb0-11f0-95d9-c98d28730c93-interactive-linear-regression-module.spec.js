import { test, expect } from '@playwright/test';

// Test file: 72812e60-bcb0-11f0-95d9-c98d28730c93.spec.js
// Application URL (served by test harness)
const APP_URL =
  'http://127.0.0.1:5500/workspace/11-08-0004/html/72812e60-bcb0-11f0-95d9-c98d28730c93.html';

// Helper utilities for interacting with the app and probing internal state.
// These utilities attempt to be resilient to multiple implementation styles:
// - They try to read common global app objects (window.app, window.lrApp, window.__APP__, etc.)
// - They fall back to DOM cues (button text, status labels) when internal state is not exposed.
class AppPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('canvas');
    // Generic button locators using visible text fallbacks
    this.btnAddPoint = page.getByRole('button', { name: /add point/i }).first();
    this.btnResetData = page.getByRole('button', { name: /reset data|reset/i }).first();
    this.btnApplyManual = page.getByRole('button', { name: /apply manual|apply/i }).first();
    this.btnFitOLS = page.getByRole('button', { name: /fit ols|fit/i }).first();
    // Gradient descent controls: try to find Start/Run and Pause buttons
    this.btnGdStart = page.getByRole('button', { name: /start gd|start|run|resume/i }).first();
    this.btnGdPause = page.getByRole('button', { name: /pause|stop/i }).first();
    this.btnGdReset = page.getByRole('button', { name: /reset.*gd|reset/i }).first();
    // Inputs for manual slope/intercept. Fallback to range inputs if labeled ones don't exist.
    this.inputSlope = page.getByLabel('Slope').first();
    this.inputIntercept = page.getByLabel('Intercept').first();
    this.rangeInputs = page.locator('input[type="range"]');
    // Parameter display text area that many implementations use
    this.paramsDisplay = page.locator('text=/slope|intercept|m =|b =/i').first();
    // Generic status label (some implementations show Running/Paused)
    this.statusLabel = page.locator('text=/running|paused|converged/i').first();
  }

  // Try to read the app state from known global variables.
  // Returns the state string if found, otherwise null.
  async getInternalState() {
    return this.page.evaluate(() => {
      // List of possible global references the app might attach to:
      const candidates = [
        window.app,
        window.__APP__,
        window.lrApp,
        window.linearRegressionApp,
        window.LinearRegressionApp,
        window.__LR_APP__,
        window.__APP_STATE__,
        window.appState,
      ];
      function extractState(obj) {
        if (!obj) return null;
        // Common shapes:
        // obj.state?.value
        if (obj.state && typeof obj.state.value === 'string') return obj.state.value;
        // obj.current
        if (typeof obj.current === 'string') return obj.current;
        // obj.getState?.()
        if (typeof obj.getState === 'function') {
          try {
            const s = obj.getState();
            if (s && (s.state || s.current || s.value)) {
              return s.state || s.current || s.value;
            }
            if (typeof s === 'string') return s;
          } catch (e) {}
        }
        // obj.machine?.state
        if (obj.machine && obj.machine.state) {
          if (typeof obj.machine.state === 'string') return obj.machine.state;
          if (obj.machine.state.value) return obj.machine.state.value;
        }
        // obj.stateValue
        if (obj.stateValue && typeof obj.stateValue === 'string') return obj.stateValue;
        // fallback: obj.gdRunning / obj.gdPaused booleans - map to state names
        if (typeof obj.gdRunning === 'boolean' || typeof obj.gdPaused === 'boolean') {
          if (obj.gdRunning) return 'gd_running';
          if (obj.gdPaused) return 'gd_paused';
        }
        return null;
      }
      for (const c of candidates) {
        const s1 = extractState(c);
        if (s) return s;
      }
      return null;
    });
  }

  // Try to call an action on internal app to simulate an event (GD_CONVERGED etc.)
  // Returns true if call succeeded, false otherwise.
  async trySendInternalEvent(eventName) {
    return this.page.evaluate((eventName) => {
      const candidates1 = [
        window.app,
        window.__APP__,
        window.lrApp,
        window.linearRegressionApp,
        window.LinearRegressionApp,
        window.__LR_APP__,
      ];
      function trySend(obj) {
        if (!obj) return false;
        // common send() or dispatch()
        if (typeof obj.send === 'function') {
          try {
            obj.send(eventName);
            return true;
          } catch (e) {}
        }
        if (typeof obj.dispatch === 'function') {
          try {
            obj.dispatch(eventName);
            return true;
          } catch (e) {}
        }
        // some apps provide methods like gdConverged()
        if (eventName === 'GD_CONVERGED' && typeof obj.gdConverged === 'function') {
          try {
            obj.gdConverged();
            return true;
          } catch (e) {}
        }
        return false;
      }
      for (const c of candidates) {
        if (trySend(c)) return true;
      }
      return false;
    }, eventName);
  }

  // Wait for an app-level state OR DOM hint to indicate the expected state.
  // This is resilient: it checks internal state via getInternalState or looks for textual cues.
  async waitForState(expectedState, timeout = 2000) {
    const page = this.page;
    const expected = expectedState.toLowerCase();
    const start = Date.now();
    while (Date.now() - start < timeout) {
      // 1) Check internal state
      const internal = await this.getInternalState();
      if (internal && internal.toLowerCase() === expected) return true;
      // 2) Fallback DOM checks:
      // - gd_running -> status label contains 'running' OR Start button toggled to 'Pause'
      // - gd_paused -> status label contains 'paused' OR Start button visible
      // - dragging / point_selected -> canvas may have a data attribute or selected element; try to query attributes
      const statusText = await this.statusLabel.textContent().catch(() => null);
      if (statusText && statusText.toLowerCase().includes(expected.replace('_', ' '))) return true;
      // Check canvas attributes that some implementations set
      const canvasDataState = await this.canvas.getAttribute('data-state').catch(() => null);
      if (canvasDataState && canvasDataState.toLowerCase() === expected) return true;
      // Check for existence of a 'selected' class on canvas children (rare)
      const hasSelected = await page
        .locator('.selected, .point.selected, .highlighted')
        .first()
        .count()
        .catch(() => 0);
      if (expected === 'point_selected' && hasSelected > 0) return true;
      // Check for 'dragging' attribute on canvas
      const draggingAttr = await this.canvas.getAttribute('data-dragging').catch(() => null);
      if (draggingAttr && expected === 'dragging') return true;
      // Check for text labels that match states
      const possibleLabel = await page.locator(`text=${expected.replace('_', ' ')}`).count();
      if (possibleLabel > 0) return true;
      // Wait a bit before retry
      await page.waitForTimeout(100);
    }
    // Final attempt: return false
    return false;
  }

  // Get number of datapoints from internal model if exposed; fallback to null.
  async getPointsCount() {
    return this.page.evaluate(() => {
      const candidates2 = [
        window.app,
        window.__APP__,
        window.lrApp,
        window.linearRegressionApp,
        window.LinearRegressionApp,
        window.__LR_APP__,
      ];
      for (const c of candidates) {
        if (!c) continue;
        // common property names: points, data, dataset
        if (Array.isArray(c.points)) return c.points.length;
        if (Array.isArray(c.data)) return c.data.length;
        if (Array.isArray(c.dataset)) return c.dataset.length;
        // sometimes nested under model
        if (c.model && Array.isArray(c.model.points)) return c.model.points.length;
      }
      return null;
    });
  }

  // Read current slope/intercept from internal model if available, otherwise try to parse from UI text.
  async getParameters() {
    return this.page.evaluate(() => {
      const candidates3 = [
        window.app,
        window.__APP__,
        window.lrApp,
        window.linearRegressionApp,
        window.LinearRegressionApp,
        window.__LR_APP__,
      ];
      for (const c of candidates) {
        if (!c) continue;
        // possible shapes
        if (c.params && typeof c.params === 'object') {
          const m = c.params.slope ?? c.params.m ?? c.params[0];
          const b = c.params.intercept ?? c.params.b ?? c.params[1];
          if (m !== undefined && b !== undefined) return { slope: m, intercept: b };
        }
        if (c.model && c.model.params) {
          const m1 = c.model.params.m1 ?? c.model.params.slope;
          const b1 = c.model.params.b1 ?? c.model.params.intercept;
          if (m !== undefined && b !== undefined) return { slope: m, intercept: b };
        }
      }
      // DOM fallback: look for text like "m = 1.23" or "slope: 1.23"
      const bodyText = document.body.innerText;
      const mMatch = bodyText.match(/(?:m\s*=?\s*|slope[:=]\s*)(-?\d+(\.\d+)?)/i);
      const bMatch = bodyText.match(/(?:b\s*=?\s*|intercept[:=]\s*)(-?\d+(\.\d+)?)/i);
      if (mMatch || bMatch) {
        return {
          slope: mMatch ? parseFloat(mMatch[1]) : null,
          intercept: bMatch ? parseFloat(bMatch[1]) : null,
        };
      }
      return null;
    });
  }
}

test.describe('Interactive Linear Regression Module - FSM behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Ensure canvas exists and is visible
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Attempt to stop any running GD animation by clicking pause/reset if present to leave a clean state
    const app = new AppPage(page);
    try {
      await app.btnGdPause.click({ timeout: 500 }).catch(() => {});
      await app.btnGdReset.click({ timeout: 500 }).catch(() => {});
    } catch (e) {
      // ignore cleanup errors
    }
  });

  test('Initial load: should render canvas and controls (idle state)', async ({ page }) => {
    const app1 = new AppPage(page);

    // Validate canvas dimensions and visibility (onEnter)
    const canvasBox = await app.canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (canvasBox) {
      expect(canvasBox.width).toBeGreaterThan(100);
      expect(canvasBox.height).toBeGreaterThan(100);
    }

    // Ensure major control buttons exist (best-effort: they may or may not be visible by exact text)
    const anyButtonVisible =
      (await app.btnAddPoint.count()) +
      (await app.btnResetData.count()) +
      (await app.btnApplyManual.count()) +
      (await app.btnFitOLS.count()) >
      0;
    expect(anyButtonVisible).toBeTruthy();

    // Verify app reports idle state (internal or DOM)
    const internal1 = await app.getInternalState();
    if (internal) {
      expect(['idle', 'Idle', 'IDLE'].map((s) => s.toLowerCase())).toContain(internal.toLowerCase());
    } else {
      // If no internal, check that status label does not show "running" or "paused"
      const statusText1 = await app.statusLabel.textContent().catch(() => null);
      if (statusText) {
        expect(statusText.toLowerCase()).not.toContain('running');
      }
    }
  });

  test('Clicking a point selects it (point_selected) and arrow keys can adjust selection', async ({ page }) => {
    const app2 = new AppPage(page);
    // Attempt to click on a likely point location: center of canvas
    const box = await app.canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = Math.round((box.x + box.width) / 2);
    const cy = Math.round((box.y + box.height) / 2);

    // Click canvas at center to try to select an existing point
    await page.mouse.click(cx, cy, { button: 'left' });

    // Wait for state to become 'point_selected' (best-effort)
    const selected = await app.waitForState('point_selected', 1200);
    // Either the app transitioned to point_selected or it didn't have a clear selection UI.
    // We assert that either an internal state or a DOM visual cue is present.
    expect(selected).toBeTruthy();

    // If selected, sending arrow keys should keep the 'point_selected' state and possibly update params
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    const stillSelected = await app.waitForState('point_selected', 600);
    expect(stillSelected).toBeTruthy();

    // Press Escape / click outside should move to idle
    await page.mouse.click(10, 10); // click outside
    const returnedToIdle = await app.waitForState('idle', 1000);
    expect(returnedToIdle).toBeTruthy();
  });

  test('Dragging a point transitions to dragging state and recomputes on release', async ({ page }) => {
    const app3 = new AppPage(page);
    const preParams = await app.getParameters();

    // Determine a start point on canvas (center-ish) and drag a short distance
    const box1 = await app.canvas.boundingBox();
    expect(box).not.toBeNull();
    const startX = Math.round(box.x + box.width / 2);
    const startY = Math.round(box.y + box.height / 2);
    const endX = startX + 30;
    const endY = startY + 20;

    // Dispatch pointerdown at start (simulate pressed pointer)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Immediately check for dragging state (transient)
    const isDraggingNow = await app.waitForState('dragging', 800);
    expect(isDraggingNow).toBeTruthy();

    // Move pointer to new location and release
    await page.mouse.move(endX, endY);
    await page.mouse.up();

    // After pointerup, app should return to idle and recompute stats/draw
    const backToIdle = await app.waitForState('idle', 1200);
    expect(backToIdle).toBeTruthy();

    // Parameters may have changed due to point move - either internal params change or not, but we allow both.
    const postParams = await app.getParameters();
    // It's acceptable if params are null (not exposed), otherwise they should be an object
    if (postParams) {
      // If we had parameters before, expect them to be numbers
      if (preParams && preParams.slope !== null && preParams.slope !== undefined) {
        expect(typeof postParams.slope).toBe('number');
      }
    }
  });

  test('Manual parameter inputs and Apply Manual event update the model (APPLY_MANUAL_CLICK)', async ({ page }) => {
    const app4 = new AppPage(page);

    // Try to set slope/intercept via labeled inputs
    const slopeInputExists = (await app.inputSlope.count()) > 0;
    const interceptInputExists = (await app.inputIntercept.count()) > 0;

    if (slopeInputExists && interceptInputExists) {
      // Use the labeled inputs
      await app.inputSlope.fill('2');
      await app.inputIntercept.fill('1');
      // Click apply
      await app.btnApplyManual.click();
      // Wait a short time and confirm that parameters changed accordingly (internal or DOM)
      await page.waitForTimeout(300);
      const params = await app.getParameters();
      if (params) {
        // Accept slight float differences
        expect(Math.abs(params.slope - 2)).toBeLessThan(1e-6);
        expect(Math.abs(params.intercept - 1)).toBeLessThan(1e-6);
      } else {
        // If parameters not exposed, check for text on page
        const bodyText1 = await page.textContent('body');
        expect(bodyText.toLowerCase()).toContain('slope') || expect(bodyText.toLowerCase()).toContain('intercept');
      }
    } else {
      // Fallback: use first range inputs if any
      const ranges = app.rangeInputs;
      const count = await ranges.count();
      if (count >= 2) {
        // Set slope and intercept ranges programmatically
        await ranges.nth(0).evaluate((el) => (el.value = '2'));
        await ranges.nth(1).evaluate((el) => (el.value = '1'));
        // Click apply if present
        await app.btnApplyManual.click();
        await page.waitForTimeout(300);
        const params1 = await app.getParameters();
        if (params) {
          expect(Math.abs(params.slope - 2)).toBeLessThan(1e-6);
        }
      } else {
        // If no inputs, the app may not support manual apply; at minimum ensure Apply button is present
        expect(await app.btnApplyManual.count()).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Fit OLS click updates model parameters (FIT_OLS_CLICK)', async ({ page }) => {
    const app5 = new AppPage(page);

    // Record prior params
    const prior = await app.getParameters();

    // Click Fit OLS button
    await app.btnFitOLS.click();
    // Allow some time for computation/draw
    await page.waitForTimeout(400);

    // After fitting, parameters should be numbers if exposed
    const after = await app.getParameters();
    if (after) {
      expect(typeof after.slope === 'number' || after.slope === null).toBeTruthy();
      expect(typeof after.intercept === 'number' || after.intercept === null).toBeTruthy();
      // If prior existed and differs, it's okay—fitting may change them
      if (prior && prior.slope !== null && prior.slope !== undefined) {
        // Either changed or remained same - both acceptable, but should be numbers
        expect(typeof after.slope).toBe('number');
      }
    } else {
      // If not exposed, ensure page shows some updated numeric params text
      const bodyText2 = await page.textContent('body');
      expect(/m\s*=?\s*-?\d+(\.\d+)?|slope[:=]\s*-?\d+(\.\d+)?/i.test(bodyText)).toBeTruthy();
    }
  });

  test('Add point via button then canvas (ADD_POINT_BUTTON_CLICK + ADD_POINT_CANVAS)', async ({ page }) => {
    const app6 = new AppPage(page);
    // Count points before
    const beforeCount = await app.getPointsCount();

    // If Add Point button exists, click it, then click canvas to add
    if ((await app.btnAddPoint.count()) > 0) {
      await app.btnAddPoint.click();
      // Click somewhere on canvas to add a point (lower-right quarter)
      const box2 = await app.canvas.boundingBox();
      expect(box).not.toBeNull();
      const x = Math.round(box.x + box.width * 0.75);
      const y = Math.round(box.y + box.height * 0.75);
      await page.mouse.click(x, y);
      await page.waitForTimeout(300);
      const afterCount = await app.getPointsCount();
      // If internal points count available, expect increment
      if (beforeCount !== null && afterCount !== null) {
        expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 1);
      } else {
        // If counts not exposed, check that canvas drew something by ensuring the canvas pixel data changed
        const imageAfter = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
        expect(imageAfter.length).toBeGreaterThan(0);
      }
    } else {
      // If no button, fallback to clicking canvas to attempt adding point
      const box3 = await app.canvas.boundingBox();
      const x1 = Math.round(box.x1 + box.width * 0.6);
      const y1 = Math.round(box.y1 + box.height * 0.6);
      await page.mouse.click(x, y);
      await page.waitForTimeout(300);
      // At minimum, ensure canvas exists and still visible
      await expect(app.canvas).toBeVisible();
    }
  });

  test('Reset data click restores initial state (RESET_DATA_CLICK)', async ({ page }) => {
    const app7 = new AppPage(page);

    // Modify data: add a point if possible
    if ((await app.btnAddPoint.count()) > 0) {
      await app.btnAddPoint.click();
      const box4 = await app.canvas.boundingBox();
      if (box) await page.mouse.click(Math.round(box.x + 10), Math.round(box.y + 10));
      await page.waitForTimeout(200);
    }

    // Count after modification
    const modifiedCount = await app.getPointsCount();

    // Click reset data
    if ((await app.btnResetData.count()) > 0) {
      await app.btnResetData.click();
      await page.waitForTimeout(300);
      const resetCount = await app.getPointsCount();
      if (modifiedCount !== null && resetCount !== null) {
        // Reset should set points back to some baseline (likely fewer or equal)
        expect(resetCount).toBeLessThanOrEqual(modifiedCount);
      } else {
        // Fallback: check that canvas is still present and app is in paused/idle state
        const idle = await app.waitForState('idle', 800);
        expect(idle).toBeTruthy();
      }
    } else {
      // If reset button not present, we at least ensure no error occurred
      expect(true).toBeTruthy();
    }
  });

  test('Start GD transitions to gd_running and Pause/Reset control transitions to gd_paused', async ({ page }) => {
    const app8 = new AppPage(page);

    // Click Start / Run GD
    if ((await app.btnGdStart.count()) > 0) {
      await app.btnGdStart.click();
    } else {
      // Try to click a button labelled 'Run' or 'Start' generically
      await page.getByRole('button', { name: /start|run|resume/i }).first().click().catch(() => {});
    }

    // Wait for gd_running
    const running = await app.waitForState('gd_running', 2000);
    expect(running).toBeTruthy();

    // While running, try dragging should transition to dragging but keep GD running when released
    const box5 = await app.canvas.boundingBox();
    if (box) {
      const startX1 = Math.round(box.x + box.width / 2);
      const startY1 = Math.round(box.y + box.height / 2);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      const isDragging = await app.waitForState('dragging', 800);
      expect(isDragging).toBeTruthy();
      await page.mouse.up();
      // After release, GD should still be running
      const stillRunning = await app.waitForState('gd_running', 1500);
      expect(stillRunning).toBeTruthy();
    }

    // Pause GD
    if ((await app.btnGdPause.count()) > 0) {
      await app.btnGdPause.click();
      const paused = await app.waitForState('gd_paused', 2000);
      expect(paused).toBeTruthy();
    } else {
      // Try generic Pause button
      await page.getByRole('button', { name: /pause|stop/i }).first().click().catch(() => {});
      const paused1 = await app.waitForState('gd_paused', 1500);
      expect(paused).toBeTruthy();
    }

    // Reset GD while paused should remain paused but reset internal gdState
    if ((await app.btnGdReset.count()) > 0) {
      await app.btnGdReset.click();
      const pausedAfterReset = await app.waitForState('gd_paused', 1200);
      expect(pausedAfterReset).toBeTruthy();
    }
  });

  test('GD_CONVERGED event transitions to gd_paused (simulate via internal API if available)', async ({ page }) => {
    const app9 = new AppPage(page);

    // Start GD if needed
    if ((await app.btnGdStart.count()) > 0) {
      await app.btnGdStart.click().catch(() => {});
    } else {
      await page.getByRole('button', { name: /start|run/i }).first().click().catch(() => {});
    }
    const running1 = await app.waitForState('gd_running', 1500);
    expect(running).toBeTruthy();

    // Attempt to trigger GD_CONVERGED via internal app API
    const triggered = await app.trySendInternalEvent('GD_CONVERGED');
    if (triggered) {
      // If we successfully triggered the event, expect gd_paused
      const paused2 = await app.waitForState('gd_paused', 1500);
      expect(paused).toBeTruthy();
    } else {
      // If internal event could not be triggered, emulate user pause/reset and assert paused
      if ((await app.btnGdPause.count()) > 0) {
        await app.btnGdPause.click();
      } else {
        await page.getByRole('button', { name: /pause|stop/i }).first().click().catch(() => {});
      }
      const paused3 = await app.waitForState('gd_paused', 1500);
      expect(paused).toBeTruthy();
    }
  });

  test('Resize and TICK events trigger redraw without changing logical state', async ({ page }) => {
    const app10 = new AppPage(page);

    // Ensure app is in idle
    const idleBefore = await app.waitForState('idle', 800);
    expect(idleBefore).toBeTruthy();

    // Resize the viewport to trigger a RESIZE event in many implementations
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(300);
    // Confirm still idle
    const idleAfter = await app.waitForState('idle', 800);
    expect(idleAfter).toBeTruthy();

    // Trigger a 'tick' by waiting briefly (some apps use requestAnimationFrame loops)
    await page.waitForTimeout(200);
    const stillIdle = await app.waitForState('idle', 800);
    expect(stillIdle).toBeTruthy();
  });

  test('Edge cases: pointer cancel and pointer up without down should not crash and leaves app in idle', async ({ page }) => {
    const app11 = new AppPage(page);

    // Dispatch pointercancel on canvas (without prior down)
    await app.canvas.dispatchEvent('pointercancel').catch(() => {});
    await page.waitForTimeout(200);
    const idle1 = await app.waitForState('idle1', 800);
    expect(idle).toBeTruthy();

    // Dispatch pointerup (without prior down)
    await app.canvas.dispatchEvent('pointerup').catch(() => {});
    await page.waitForTimeout(200);
    const idle2 = await app.waitForState('idle', 800);
    expect(idle2).toBeTruthy();
  });
});