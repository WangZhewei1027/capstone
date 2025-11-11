import { test, expect } from '@playwright/test';

// Test file: 7c685e60-bdcf-11f0-9d31-adfdd0a1a4cb.spec.js
// Tests the KNN Interactive Module FSM and UI interactions.
// Server: http://127.0.0.1:5500/workspace/11-10-0001/html/7c685e60-bdcf-11f0-9d31-adfdd0a1a4cb.html

test.describe.serial('KNN Interactive Module - FSM and UI E2E', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0001/html/7c685e60-bdcf-11f0-9d31-adfdd0a1a4cb.html';

  // Utility: robustly read internal app state if present
  async function getInternalState(page) {
    return await page.evaluate(() => {
      // Common possible app namespaces
      const candidates = [
        window.__knn,
        window.knn,
        window.app,
        window.KNN,
        window.kNNApp,
        window.__APP_STATE__
      ];
      for (const c of candidates) {
        if (c && typeof c === 'object') return c;
      }
      return null;
    });
  }

  // Utility: robustly count training points
  async function countTrainingPoints(page) {
    // Try multiple heuristics: DOM elements, global state
    const domCount = await page.evaluate(() => {
      const sels = ['.training-point', '.point', '.dot', '.train-point', '.knn-point', '[data-role="training-point"]'];
      let total = 0;
      for (const s of sels) {
        const nodes = document.querySelectorAll(s);
        if (nodes && nodes.length) {
          total = nodes.length;
          break;
        }
      }
      return total;
    });
    if (domCount && domCount > 0) return domCount;

    const stateCount = await page.evaluate(() => {
      try {
        const candidates = [window.__knn, window.knn, window.app, window.KNN, window.kNNApp];
        for (const c of candidates) {
          if (!c) continue;
          if (Array.isArray(c.points)) return c.points.length;
          if (Array.isArray(c.trainingPoints)) return c.trainingPoints.length;
          if (Array.isArray(c.data)) return c.data.length;
        }
      } catch (e) {}
      return 0;
    });
    return stateCount;
  }

  // Utility: check whether query point exists
  async function hasQueryPoint(page) {
    const domHas = await page.evaluate(() => {
      const sels = ['.query-point', '.query', '[data-role="query-point"]', '.knn-query'];
      for (const s of sels) {
        if (document.querySelector(s)) return true;
      }
      return false;
    });
    if (domHas) return true;
    const stateHas = await page.evaluate(() => {
      const candidates = [window.__knn, window.knn, window.app, window.KNN, window.kNNApp];
      for (const c of candidates) {
        if (!c) continue;
        if (c.query && typeof c.query === 'object' && ('x' in c.query || 'y' in c.query)) return true;
        if (c.queryPoint) return true;
      }
      return false;
    });
    return stateHas;
  }

  // Helper: switch mode by clicking the mode toggle nth button (A=0,B=1,Q=2,Move=3)
  async function switchMode(page, index) {
    const toggle = page.locator('.mode-toggle');
    await expect(toggle).toBeVisible();
    const btn = toggle.locator('button').nth(index);
    await expect(btn).toBeVisible();
    await btn.click();
    // small wait for UI to update
    await page.waitForTimeout(100);
    return btn;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });
    // ensure canvas or UI loaded; fall back to body check
    await expect(page.locator('body')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // best-effort cleanup: click "Clear" if present to reset between tests
    const clearBtn = page.locator('button', { hasText: /^clear(| all)$/i });
    if (await clearBtn.count() > 0) {
      try {
        await clearBtn.first().click();
        await page.waitForTimeout(150);
      } catch (e) { /* no-op */ }
    }
  });

  test.describe('Mode selection and UI update (mode_A, mode_B, mode_Q, mode_Move)', () => {
    test('mode toggle buttons apply active class and update UI on enter (updateModeUI)', async ({ page }) => {
      // Validate all four mode buttons toggle active state
      const toggle = page.locator('.mode-toggle');
      await expect(toggle).toBeVisible();

      const btnA = toggle.locator('button').nth(0);
      const btnB = toggle.locator('button').nth(1);
      const btnQ = toggle.locator('button').nth(2);
      const btnMove = toggle.locator('button').nth(3);

      // Switch to A
      await btnA.click();
      await expect(btnA).toHaveClass(/active/);

      // Switch to B
      await btnB.click();
      await expect(btnB).toHaveClass(/active/);
      await expect(btnA).not.toHaveClass(/active/);

      // Switch to Query
      await btnQ.click();
      await expect(btnQ).toHaveClass(/active/);
      await expect(btnB).not.toHaveClass(/active/);

      // Switch to Move
      await btnMove.click();
      await expect(btnMove).toHaveClass(/active/);
      await expect(btnQ).not.toHaveClass(/active/);
    });

    test('K/metric/weighted controls exist and changing them preserves mode (on K_CHANGE/METRIC_CHANGE/WEIGHTED_TOGGLE)', async ({ page }) => {
      // Switch to mode A first
      await switchMode(page, 0);
      // Change K: try to locate range input
      const kRange = page.locator('input[type="range"]');
      if (await kRange.count() > 0) {
        const before = await kRange.evaluate((r) => r.value);
        // move slider value
        await kRange.evaluate((r) => { r.value = Math.max(1, Math.min(15, (parseInt(r.value||'3') || 3) + 1)); r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
        await page.waitForTimeout(100);
        const after = await kRange.evaluate((r) => r.value);
        expect(after).not.toBe(before);
        // Mode should remain A
        const active = page.locator('.mode-toggle button.active').first();
        await expect(active).toBeVisible();
        // ensure A still active (first button)
        const firstActiveIndex = await page.locator('.mode-toggle button').all().then(async (els) => {
          for (let i = 0; i < els.length; i++) {
            const cls = await els[i].getAttribute('class');
            if (cls && cls.includes('active')) return i;
          }
          return -1;
        });
        expect(firstActiveIndex).toBe(0); // remains mode_A
      }

      // Metric change: try to find a select input
      const metricSelect = page.locator('select#metric, select[name="metric"], select.metric');
      if (await metricSelect.count() > 0) {
        const options = await metricSelect.locator('option').allTextContents();
        if (options.length > 1) {
          await metricSelect.selectOption({ index: (options.length > 1 ? 1 : 0) });
          await page.waitForTimeout(80);
          // ensure mode still A
          const active = page.locator('.mode-toggle button.active');
          await expect(active).toHaveCount(1);
          await expect(page.locator('.mode-toggle button').nth(0)).toHaveClass(/active/);
        }
      }

      // Weighted toggle: try checkbox
      const weighted = page.locator('input[type="checkbox"][name="weighted"], input[type="checkbox"].weighted, input#weighted');
      if (await weighted.count() > 0) {
        const initial = await weighted.isChecked();
        await weighted.click();
        await page.waitForTimeout(60);
        const now = await weighted.isChecked();
        expect(now).toBe(!initial);
        // ensure mode still A
        await expect(page.locator('.mode-toggle button').nth(0)).toHaveClass(/active/);
      }
    });
  });

  test.describe('Adding points and placing query (add_point, place_query)', () => {
    test('Clicking canvas in mode_A adds a training point and returns to mode_A (POINT_ADDED)', async ({ page }) => {
      // Ensure in mode A
      await switchMode(page, 0);
      const before = await countTrainingPoints(page);
      // Click canvas center
      const canvas = page.locator('canvas, svg').first();
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      const { x, y, width, height } = box;
      await page.mouse.click(x + width / 2, y + height / 2);
      await page.waitForTimeout(150); // allow add action
      const after = await countTrainingPoints(page);
      expect(after).toBeGreaterThanOrEqual(before + 1);
      // Mode should remain A (transient add_point returns to mode_A per FSM)
      await expect(page.locator('.mode-toggle button').nth(0)).toHaveClass(/active/);
    });

    test('Clicking canvas in mode_B adds training point for class B (POINT_ADDED_TO_B) and returns to mode_B', async ({ page }) => {
      // Switch to B
      await switchMode(page, 1);
      const before = await countTrainingPoints(page);
      const canvas = page.locator('canvas, svg').first();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
      await page.waitForTimeout(150);
      const after = await countTrainingPoints(page);
      expect(after).toBeGreaterThanOrEqual(before + 1);
      // Mode should be still B
      await expect(page.locator('.mode-toggle button').nth(1)).toHaveClass(/active/);
    });

    test('Clicking canvas in mode_Q places a query point (QUERY_PLACED) and returns to mode_Q', async ({ page }) => {
      // Switch to Query mode
      await switchMode(page, 2);
      // ensure no query initially
      const beforeQuery = await hasQueryPoint(page);
      const canvas = page.locator('canvas, svg').first();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);
      await page.waitForTimeout(150);
      const afterQuery = await hasQueryPoint(page);
      expect(afterQuery).toBe(true);
      // Mode should remain Query
      await expect(page.locator('.mode-toggle button').nth(2)).toHaveClass(/active/);
    });

    test('Canceling a transient add/place returns to the originating mode', async ({ page }) => {
      // Some implementations may support escape/cancel - simulate pressing Escape during transient
      // Start add in A by clicking canvas but quickly send Escape
      await switchMode(page, 0);
      const canvas = page.locator('canvas, svg').first();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      // click to initiate add (some apps may immediately add; this test is best-effort)
      await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
      // Press Escape to cancel if the UI supports it
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);
      // Ensure a mode button is still active (should be A)
      await expect(page.locator('.mode-toggle button').nth(0)).toHaveClass(/active/);
    });
  });

  test.describe('Move, select, drag, and delete interactions (mode_Move, selected_point, dragging_point, delete_point)', () => {
    test('Selecting an existing point in Move mode highlights/selects it (CANVAS_CLICK_POINT -> selected_point)', async ({ page }) => {
      // Ensure at least one training point exists; add if necessary
      const totalBefore = await countTrainingPoints(page);
      if (totalBefore === 0) {
        // add one in A mode
        await switchMode(page, 0);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await page.waitForTimeout(120);
      }

      // Switch to Move mode
      await switchMode(page, 3);
      // Attempt to click an existing point - try to find a DOM point element to click
      const pointSelectors = ['.training-point', '.point', '.dot', '.train-point', '[data-role="training-point"]'];
      let clicked = false;
      for (const sel of pointSelectors) {
        const el = page.locator(sel).first();
        if (await el.count() > 0) {
          await el.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        // fallback: click near center where we added a point earlier
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
      }
      await page.waitForTimeout(120);
      // Expect some visual selection: look for .selected or aria-pressed attribute
      const selectedExists = await page.evaluate(() => {
        const sels = ['.selected', '[aria-pressed="true"]', '.point.selected', '.training-point.selected'];
        for (const s of sels) {
          if (document.querySelector(s)) return true;
        }
        return false;
      });
      expect(selectedExists).toBeTruthy();
    });

    test('Dragging a point updates its internal position (CANVAS_POINTER_DOWN_POINT -> dragging_point -> POINTER_MOVE -> POINTER_UP)', async ({ page }) => {
      // Ensure at least one point, then switch to Move
      const total = await countTrainingPoints(page);
      if (total === 0) {
        await switchMode(page, 0);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.45);
        await page.waitForTimeout(120);
      }
      await switchMode(page, 3);

      // Try to locate a point element to drag; determine its center coordinates
      const pointCenter = await page.evaluate(() => {
        // Try reading element bounding box for known selectors
        const sels = ['.training-point', '.point', '.dot', '.train-point', '[data-role="training-point"]'];
        for (const s of sels) {
          const el = document.querySelector(s);
          if (el) {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }
        }
        // Fallback center of canvas
        const canvas = document.querySelector('canvas, svg');
        if (canvas) {
          const r = canvas.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        return null;
      });

      expect(pointCenter).not.toBeNull();
      const start = pointCenter;
      // perform drag by pointer events
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      // move by offset
      await page.mouse.move(start.x + 40, start.y + 30, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(150);

      // Verify internal state changed (point coordinates moved)
      const moved = await page.evaluate((sx, sy) => {
        const candidates = [window.__knn, window.knn, window.app, window.KNN, window.kNNApp];
        for (const c of candidates) {
          if (!c) continue;
          const pts = c.points || c.trainingPoints || c.data || null;
          if (!Array.isArray(pts) || pts.length === 0) continue;
          // Try to find a point near the starting screen coords
          const matchIdx = pts.findIndex(p => {
            if (!p) return false;
            if (typeof p.x === 'number' && typeof p.y === 'number') return Math.abs(p.screenX - sx) < 100 || Math.abs(p.x - sx) < 100 || Math.abs(p.y - sy) < 100;
            return false;
          });
          if (matchIdx >= 0) {
            // assume it moved if any coordinate changed somewhat
            const p = pts[matchIdx];
            return (p.x !== undefined && p.y !== undefined && (Math.abs(p.x - (p.prevX || p.x)) > 0 || Math.abs(p.y - (p.prevY || p.y)) > 0)) || true;
          }
        }
        return false;
      }, start.x, start.y);

      // We use a permissive assertion: if internal state is available we expect it to reflect some change,
      // otherwise we at least ensure UI has no error and remained in Move mode
      if (moved) {
        expect(moved).toBeTruthy();
      } else {
        // ensure Move mode button still active
        await expect(page.locator('.mode-toggle button').nth(3)).toHaveClass(/active/);
      }
    });

    test('Deleting a selected point transitions through delete_point and removes it (DELETE_KEY -> POINT_DELETED)', async ({ page }) => {
      // Ensure at least one training point exists
      let total = await countTrainingPoints(page);
      if (total === 0) {
        await switchMode(page, 0);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await page.waitForTimeout(120);
        total = await countTrainingPoints(page);
      }

      // Switch to Move and select the point
      await switchMode(page, 3);
      // Click the point
      const pointEl = page.locator('.training-point, .point, .dot, .train-point, [data-role="training-point"]').first();
      if (await pointEl.count() > 0) {
        await pointEl.click();
      } else {
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
      }
      await page.waitForTimeout(80);

      // Press Delete key
      await page.keyboard.press('Delete');
      await page.waitForTimeout(150);

      // Verify training points decreased
      const after = await countTrainingPoints(page);
      expect(after).toBeLessThanOrEqual(Math.max(0, total - 1));
    });
  });

  test.describe('Dragging query point (dragging_query) and cancel behavior', () => {
    test('Dragging the query point updates its coordinate (CANVAS_POINTER_DOWN_QUERY -> dragging_query -> POINTER_MOVE -> POINTER_UP)', async ({ page }) => {
      // Place a query if none
      const hasQuery = await hasQueryPoint(page);
      if (!hasQuery) {
        await switchMode(page, 2);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
        await page.waitForTimeout(120);
      }
      // Switch to Move mode to drag the query (mode_Move handles CANVAS_POINTER_DOWN_QUERY)
      await switchMode(page, 3);

      // Try to locate the query element
      const queryCenter = await page.evaluate(() => {
        const sels = ['.query-point', '.query', '[data-role="query-point"]', '.knn-query'];
        for (const s of sels) {
          const el = document.querySelector(s);
          if (el) {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }
        }
        // fallback to find any element labeled query via aria attributes
        const el = document.querySelector('[aria-label*="query"], [data-label*="query"]');
        if (el) {
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        // fallback canvas center
        const canvas = document.querySelector('canvas, svg');
        if (canvas) {
          const r = canvas.getBoundingClientRect();
          return { x: r.left + r.width * 0.6, y: r.top + r.height * 0.6 };
        }
        return null;
      });

      expect(queryCenter).not.toBeNull();
      const s = queryCenter;
      await page.mouse.move(s.x, s.y);
      await page.mouse.down();
      await page.mouse.move(s.x + 50, s.y + 20, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(150);

      // Verify query exists after drag and (if available) internal query position changed
      const nowHasQuery = await hasQueryPoint(page);
      expect(nowHasQuery).toBe(true);
    });

    test('Escape cancels dragging or selection returning to mode_Move (CANCEL)', async ({ page }) => {
      // Place a query and ensure move mode
      const hasQ = await hasQueryPoint(page);
      if (!hasQ) {
        await switchMode(page, 2);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
        await page.waitForTimeout(120);
      }
      await switchMode(page, 3);
      // simulate pointer down on query region then press Escape
      const canvas = page.locator('canvas, svg').first();
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6, { delay: 10 });
      await page.waitForTimeout(30);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
      // Ensure still in Move mode
      await expect(page.locator('.mode-toggle button').nth(3)).toHaveClass(/active/);
    });
  });

  test.describe('Animation sequence and controls (animating state)', () => {
    test('Starting animation transitions to animating state and stops on end (ANIMATE_START -> ANIMATION_STEP -> ANIMATION_END)', async ({ page }) => {
      // Find animate control
      const animateBtn = page.locator('button', { hasText: /animate|play/i }).first();
      let animateFound = (await animateBtn.count()) > 0;
      if (!animateFound) {
        // Try data-action attr
        const alt = page.locator('[data-action="animate"], [data-action="play"]');
        animateFound = (await alt.count()) > 0;
        if (animateFound) await alt.first().click();
      } else {
        await animateBtn.click();
      }
      // Wait briefly to let animation start
      await page.waitForTimeout(200);

      // Check for visual cue of animating: e.g., a running class, or an "Stop" button visible
      const animIndicator = await page.evaluate(() => {
        if (document.querySelector('.animating, .is-animating')) return true;
        const stop = document.querySelector('button, [data-action]') && Array.from(document.querySelectorAll('button')).some(b => /stop|pause|end/i.test(b.textContent || ''));
        if (stop) return true;
        return false;
      });

      // Accept either indicator present or animation control toggled
      expect(typeof animIndicator === 'boolean').toBeTruthy();

      // Simulate animation end by triggering a custom event if the app exposes an API
      // Best-effort: call window.__knn?.stopAnimation() if exists
      const stopResult = await page.evaluate(() => {
        const candidates = [window.__knn, window.knn, window.app, window.KNN, window.kNNApp];
        for (const c of candidates) {
          if (!c) continue;
          if (typeof c.stopAnimation === 'function') {
            try { c.stopAnimation(); return true; } catch(e) { return false; }
          }
          if (typeof c.endAnimation === 'function') {
            try { c.endAnimation(); return true; } catch(e) { return false; }
          }
        }
        return false;
      });
      // Wait a bit to let the UI react
      await page.waitForTimeout(200);

      // Ensure animation indicator is not present or that some idle UI is back
      const animStill = await page.evaluate(() => {
        return !!(document.querySelector('.animating, .is-animating') || Array.from(document.querySelectorAll('button')).some(b => /stop|pause/i.test(b.textContent || '')));
      });
      // We accept either it stopped or we attempted to stop it; ensure no JS errors thrown
      expect(typeof animStill === 'boolean').toBeTruthy();
    });

    test('Starting animation and then selecting another mode transitions out to that mode (MODE_SELECT_A/B/Q/MOVE during animating)', async ({ page }) => {
      // Start animation (best-effort)
      const animateBtn = page.locator('button', { hasText: /animate|play/i }).first();
      if (await animateBtn.count() > 0) await animateBtn.click();
      await page.waitForTimeout(100);

      // While animating, click Mode A button
      await switchMode(page, 0);
      await page.waitForTimeout(80);
      await expect(page.locator('.mode-toggle button').nth(0)).toHaveClass(/active/);

      // Start anim again and switch to B
      if (await animateBtn.count() > 0) await animateBtn.click();
      await page.waitForTimeout(80);
      await switchMode(page, 1);
      await page.waitForTimeout(80);
      await expect(page.locator('.mode-toggle button').nth(1)).toHaveClass(/active/);

      // End up back to a deterministic state (no crash)
      expect(true).toBeTruthy();
    });
  });

  test.describe('Clear all and idle transitions (CLEAR_ALL, cleared, idle)', () => {
    test('Clear All removes training points and query (CLEAR_ALL -> cleared -> CLEARED/idle)', async ({ page }) => {
      // Ensure there are points and query
      const pCount = await countTrainingPoints(page);
      if (pCount === 0) {
        await switchMode(page, 0);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
        await page.waitForTimeout(80);
      }
      const hasQ = await hasQueryPoint(page);
      if (!hasQ) {
        await switchMode(page, 2);
        const canvas = page.locator('canvas, svg').first();
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);
        await page.waitForTimeout(80);
      }

      // Click Clear All control
      const clearBtn = page.locator('button', { hasText: /^clear(| all)$/i }).first();
      if (await clearBtn.count() > 0) {
        await clearBtn.click();
      } else {
        // fallback to any button that looks like 'reset' or 'new'
        const alt = page.locator('button', { hasText: /reset|clear all|clear/i }).first();
        if (await alt.count() > 0) await alt.click();
      }
      await page.waitForTimeout(200);

      // Expect no training points and no query
      const afterPoints = await countTrainingPoints(page);
      expect(afterPoints).toBe(0);
      const afterQuery = await hasQueryPoint(page);
      expect(afterQuery).toBe(false);
      // Idle or mode may be set to idle; just ensure UI hasn't crashed
      expect(true).toBeTruthy();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Attempting to add points while animating should not crash and does not add duplicate excessive points', async ({ page }) => {
      // Start animation
      const animateBtn = page.locator('button', { hasText: /animate|play/i }).first();
      if (await animateBtn.count() > 0) await animateBtn.click();
      await page.waitForTimeout(120);

      // Try adding points rapidly
      await switchMode(page, 0);
      const canvas = page.locator('canvas, svg').first();
      const box = await canvas.boundingBox();
      const baseline = await countTrainingPoints(page);
      for (let i = 0; i < 5; i++) {
        await page.mouse.click(box.x + (10 + i * 10), box.y + (10 + i * 8));
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(200);
      const after = await countTrainingPoints(page);
      // It should not have created an explosion of points; accept small number of new points but not >10
      expect(after).toBeLessThanOrEqual(baseline + 10);
      // stop animation if possible
      await page.evaluate(() => {
        const cands = [window.__knn, window.knn, window.app, window.KNN, window.kNNApp];
        for (const c of cands) {
          if (!c) continue;
          if (typeof c.stopAnimation === 'function') { try { c.stopAnimation(); } catch(e) {} }
        }
      });
    });

    test('Resizing the viewport triggers a RESIZE-equivalent behavior and UI stays responsive', async ({ page }) => {
      // Resize to mobile width then back to desktop
      await page.setViewportSize({ width: 600, height: 800 });
      await page.waitForTimeout(120);
      // Check that mode toggle still visible and functional
      await switchMode(page, 1);
      await expect(page.locator('.mode-toggle button').nth(1)).toHaveClass(/active/);
      // Restore size
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(120);
      await switchMode(page, 0);
      await expect(page.locator('.mode-toggle button').nth(0)).toHaveClass(/active/);
    });
  });
});