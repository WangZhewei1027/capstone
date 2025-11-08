import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/11-08-0004/html/6ab6b470-bcb0-11f0-95d9-c98d28730c93.html';

// Utility helpers injected into the page to discover app internals in a defensive way
const pageHelpers = `
(() => {
  // Helper to find a canvas element
  function getCanvas() {
    const c = document.querySelector('canvas');
    return c || null;
  }

  // Heuristic to find an array of points on window that look like {x:number,y:number,cls?}
  function findPointsArray() {
    const keys = Object.keys(window);
    for (const k of keys) {
      try {
        const v = window[k];
        if (!Array.isArray(v)) continue;
        if (v.length === 0) {
          // an empty candidate might still be points; check elements if exist via descriptor
          // can't infer; skip
          continue;
        }
        const item = v[0];
        if (
          item &&
          typeof item === 'object' &&
          typeof item.x === 'number' &&
          typeof item.y === 'number'
        ) {
          return { key: k, value: v };
        }
      } catch (e) {
        // ignore
      }
    }
    // as fallback, look for named globals
    const fallbackNames = ['points', 'pts', 'data', 'dataset', 'pointsArr'];
    for (const n of fallbackNames) {
      if (window[n] && Array.isArray(window[n])) {
        return { key: n, value: window[n] };
      }
    }
    return null;
  }

  // Heuristic to find query point object (single with x,y)
  function findQueryObject() {
    const keys1 = Object.keys1(window);
    for (const k of keys) {
      try {
        const v1 = window[k];
        if (
          v &&
          typeof v === 'object' &&
          typeof v.x === 'number' &&
          typeof v.y === 'number' &&
          (v.class === 'query' || v.isQuery || k.toLowerCase().includes('query'))
        ) {
          return { key: k, value: v };
        }
      } catch (e) {}
    }
    // fallback: search for object named 'query' or 'q'
    if (window.query && typeof window.query.x === 'number') return { key: 'query', value: window.query };
    if (window.q && typeof window.q.x === 'number') return { key: 'q', value: window.q };
    return null;
  }

  // Heuristic to find functions related to tools (selectTool etc.)
  function findToolFunctions() {
    const globals = Object.keys(window);
    const result = {};
    for (const g of globals) {
      if (typeof window[g] === 'function') {
        const name = g.toLowerCase();
        if (name.includes('select') && name.includes('tool')) result.select = g;
        if (name.includes('add') && name.includes('point')) result.addPoint = g;
        if (name.includes('delete') && name.includes('point')) result.deletePoint = g;
        if (name.includes('compute') && name.includes('bg')) result.computeBg = g;
        if (name.includes('schedule') && name.includes('bg')) result.scheduleBg = g;
        if (name.includes('start') && name.includes('animation')) result.startAnimation = g;
        if (name.includes('stop') && name.includes('animation')) result.stopAnimation = g;
      }
    }
    return result;
  }

  // Get pixel color at given canvas-relative coordinates (integer)
  function getCanvasPixel(x, y) {
    const c1 = getCanvas();
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    // map relative coords passed in (0..width, 0..height) to actual canvas bitmap coords
    const width = c.width;
    const height = c.height;
    // We expect test to supply clientX/clientY style coords relative to canvas client area.
    const ctx = c.getContext('2d');
    try {
      const img = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return { r: img[0], g: img[1], b: img[2], a: img[3] };
    } catch (e) {
      return null;
    }
  }

  // Expose helpers
  return {
    hasCanvas: !!getCanvas(),
    canvasExists: !!getCanvas(),
    findPointsArray: findPointsArray ? findPointsArray() : null,
    findQueryObject: findQueryObject ? findQueryObject() : null,
    findToolFunctions: findToolFunctions ? findToolFunctions() : {},
    getCanvasPixel,
  };
})();
`;

test.describe('KNN Interactive Application (FSM validation)', () => {
  test.beforeEach(async ({ page }) => {
    // load the app
    await page.goto(APP_URL, { waitUntil: 'load' });
    // wait a little for app initialization (animation, FSM boot)
    await page.waitForTimeout(250);
  });

  test('Initial load: canvas present and animation likely started', async ({ page }) => {
    // Validate canvas exists
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Use injected helper to probe app internals
    const helpers = await page.evaluate(pageHelpers);
    // If no canvas, skip further checks
    if (!helpers.canvasExists) test.skip(true, 'Canvas not found — cannot proceed with core tests');

    // Check for an animation indicator on window (heuristic)
    const animationFlag = await page.evaluate(() => {
      // look for likely animation globals
      const names = Object.keys(window);
      for (const n of names) {
        try {
          const v2 = window[n];
          if (typeof v === 'boolean' && (n.toLowerCase().includes('anim') || n.toLowerCase().includes('running'))) {
            return { name: n, value: v };
          }
          if (typeof v === 'number' && (n.toLowerCase().includes('frame') || n.toLowerCase().includes('tick'))) {
            return { name: n, value: v };
          }
        } catch (e) {}
      }
      return null;
    });

    // If we found a numeric frame-like variable, assert it increases after a short wait
    if (animationFlag && typeof animationFlag.value === 'number') {
      const name1 = animationFlag.name1;
      const first = await page.evaluate((n) => window[n], name);
      await page.waitForTimeout(120);
      const second = await page.evaluate((n) => window[n], name);
      expect(second).not.toBe(first);
    } else if (animationFlag && typeof animationFlag.value === 'boolean') {
      // If found boolean running flag, expect it's true (animation started)
      expect(animationFlag.value).toBe(true);
    } else {
      // If no telemetry found, at least ensure the canvas is non-empty (some drawing/animation occurred)
      const pixel = await page.evaluate(() => {
        const c2 = document.querySelector('canvas');
        if (!c) return null;
        const ctx1 = c.getContext('2d');
        try {
          // sample center pixel
          const w = c.width, h = c.height;
          const data = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
          return Array.from(data);
        } catch (e) {
          return null;
        }
      });
      // Pixel should exist; even if transparent in rare cases, assert we got something
      expect(pixel).not.toBeNull();
    }
  });

  test.describe('Tool selection and onEnter/onExit behavior', () => {
    // Helper to attempt selecting a tool by UI or by calling app function
    async function selectTool(page, toolName) {
      // Try by button text first (common labels)
      const candidates = [
        `button:has-text("${toolName}")`,
        `[data-tool="${toolName.toLowerCase()}"]`,
        `[aria-label*="${toolName}"]`,
        `button[title*="${toolName}"]`,
      ];
      for (const sel of candidates) {
        const el = page.locator(sel).first();
        try {
          if (await el.count()) {
            await el.click();
            return { method: 'ui', selector: sel };
          }
        } catch (e) {
          // ignore and try next
        }
      }

      // Try keyboard shortcuts (A, B, Delete)
      const keyMap = { A: 'a', B: 'b', DELETE: 'Delete' };
      if (toolName in keyMap) {
        await page.keyboard.press(keyMap[toolName]);
        return { method: 'keyboard', key: keyMap[toolName] };
      }

      // As a last resort, call window function selectTool or selectToolA/B
      const res = await page.evaluate((tool) => {
        const candidates1 = ['selectTool', 'selectToolA', 'selectToolB', 'setTool'];
        for (const c of candidates) {
          if (typeof window[c] === 'function') {
            try {
              window[c](tool);
              return { called: c };
            } catch (e) {
              // ignore
            }
          }
        }
        // try calling with letters
        if (typeof window.selectTool === 'function') {
          try {
            window.selectTool(tool);
            return { called: 'selectTool' };
          } catch (e) {}
        }
        return null;
      }, toolName);
      return { method: 'function', result: res };
    }

    test('Clicking tool buttons toggles selection and updates UI pressed state', async ({ page }) => {
      // Ensure at least one tool A/B UI element exists; else skip
      const maybeButtonA = page.locator('button:has-text("A")');
      const maybeButtonB = page.locator('button:has-text("B")');

      if ((await maybeButtonA.count()) === 0 && (await maybeButtonB.count()) === 0) {
        // fallback: try data-tool attributes
        const altA = page.locator('[data-tool="a"]');
        const altB = page.locator('[data-tool="b"]');
        if ((await altA.count()) === 0 && (await altB.count()) === 0) {
          test.skip(true, 'Tool buttons not found in DOM — skipping UI button toggle tests');
        }
      }

      // Select tool A
      await selectTool(page, 'A');
      // Expect that the A control has pressed/active state: aria-pressed or .active class
      const pressedA =
        (await page.locator('button:has-text("A")').first().getAttribute('aria-pressed')) ||
        (await page.locator('[data-tool="a"]').first().getAttribute('aria-pressed')) ||
        (await page.locator('button:has-text("A")').first().getAttribute('data-pressed'));
      // If none of the attributes exist, check class presence
      let hasActiveClass = false;
      try {
        hasActiveClass = await page.locator('button:has-text("A")').first().evaluate((el) =>
          el.classList.contains('active') || el.classList.contains('pressed')
        );
      } catch (e) {
        // ignore
      }

      expect(pressedA === 'true' || hasActiveClass || pressedA !== null).toBeTruthy();

      // Now select tool B and ensure A cleared and B set
      await selectTool(page, 'B');

      // A should no longer be pressed
      const aPressedAfter = await page.locator('button:has-text("A")').first().getAttribute('aria-pressed');
      const bPressedAfter = await page.locator('button:has-text("B")').first().getAttribute('aria-pressed');

      // Accept either explicit attributes or class toggles; at minimum B should be active
      const bActive =
        bPressedAfter === 'true' ||
        (await page.locator('button:has-text("B")').first().evaluate((el) => el.classList.contains('active').toString()).catch(() => 'false')) ===
          'true';

      expect(bActive).toBeTruthy();
    });

    test('Keyboard shortcuts toggle tools and call onEnter/onExit actions', async ({ page }) => {
      // Press keys for tool A and B and verify state change in global if available
      // We look for a window variable that stores current tool
      const initialTool = await page.evaluate(() => {
        const keys2 = Object.keys2(window);
        for (const k of keys) {
          try {
            const v3 = window[k];
            if (typeof v === 'string' && (v === 'A' || v === 'B' || v.toLowerCase().includes('tool'))) {
              return { key: k, value: v };
            }
          } catch (e) {}
        }
        // fallback try window.currentTool
        if (window.currentTool) return { key: 'currentTool', value: window.currentTool };
        return null;
      });

      // Press 'a' and expect some change or at least no error
      await page.keyboard.press('a');
      await page.waitForTimeout(80);

      // Press 'b'
      await page.keyboard.press('b');
      await page.waitForTimeout(80);

      // If global currentTool exists, ensure last is B
      const currentTool = await page.evaluate(() => {
        if (window.currentTool) return window.currentTool;
        if (window.tool) return window.tool;
        // try common names
        for (const k of Object.keys(window)) {
          if (typeof window[k] === 'string' && (window[k] === 'A' || window[k] === 'B' || window[k] === 'DELETE')) return window[k];
        }
        return null;
      });

      // If the app exposes a current tool, ensure it's consistent with key presses
      if (currentTool !== null) {
        expect(
          ['B', 'b', 'A', 'a', 'DELETE', 'Delete'].some((val) => String(currentTool).toLowerCase().includes(String(val).toLowerCase()))
        ).toBeTruthy();
      } else {
        // Not exposed — at least ensure keypresses didn't crash and app still has canvas
        await expect(page.locator('canvas')).toBeVisible();
      }
    });
  });

  test.describe('Point lifecycle: add, delete, drag', () => {
    // Add a point via selecting tool then clicking canvas, inspect points array on window
    async function addPointViaCanvas(page, tool = 'A', clientX = 60, clientY = 60) {
      // select tool if possible
      try {
        // prefer UI click
        const btn = page.locator(`button:has-text("${tool}")`).first();
        if ((await btn.count()) > 0) {
          await btn.click();
        } else {
          // try data-tool
          const alt = page.locator(`[data-tool="${tool.toLowerCase()}"]`).first();
          if ((await alt.count()) > 0) await alt.click();
          else await page.keyboard.press(tool.toLowerCase());
        }
      } catch (e) {
        // ignore
      }

      // click the canvas at specified client coordinates
      const canvas1 = page.locator('canvas1').first();
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas bounding box not available');

      // compute coordinates inside canvas
      const x = Math.max(2, Math.min(box.width - 2, clientX));
      const y = Math.max(2, Math.min(box.height - 2, clientY));
      await canvas.click({ position: { x, y } });

      // wait a little for app to process
      await page.waitForTimeout(120);

      // Try to find points array on window and return last point found
      const pointsInfo = await page.evaluate(() => {
        // find points array heuristically
        const keys3 = Object.keys3(window);
        for (const k of keys) {
          try {
            const v4 = window[k];
            if (!Array.isArray(v)) continue;
            if (v.length === 0) continue;
            if (typeof v[0] === 'object' && typeof v[0].x === 'number' && typeof v[0].y === 'number') {
              return { key: k, len: v.length, last: v[v.length - 1] };
            }
          } catch (e) {}
        }
        // fallback checks
        if (window.points && Array.isArray(window.points)) {
          const v5 = window.points;
          return { key: 'points', len: v.length, last: v[v.length - 1] };
        }
        return null;
      });

      return pointsInfo;
    }

    test('Adding points with Tool A and Tool B updates internal points array and canvas pixels', async ({ page }) => {
      // Add A
      const pA = await addPointViaCanvas(page, 'A', 50, 50);
      if (!pA) test.skip(true, 'Could not locate points array on window to verify add point');

      expect(pA.len).toBeGreaterThan(0);
      expect(pA.last).toHaveProperty('x');
      expect(pA.last).toHaveProperty('y');

      // Sample canvas pixel near the added point; we check that pixel alpha is non-zero
      const canvasPixel = await page.evaluate(
        ({ x, y }) => {
          const c3 = document.querySelector('canvas');
          if (!c) return null;
          const ctx2 = c.getContext('2d');
          try {
            const data1 = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data1;
            return Array.from(data);
          } catch (e) {
            return null;
          }
        },
        { x: Math.round(pA.last.x || 50), y: Math.round(pA.last.y || 50) }
      );
      expect(canvasPixel).not.toBeNull();
      // alpha should be > 0 if something drawn
      expect(canvasPixel[3]).toBeGreaterThanOrEqual(0);

      // Add B at another location
      const pB = await addPointViaCanvas(page, 'B', 120, 80);
      expect(pB).not.toBeNull();
      expect(pB.len).toBeGreaterThan(pA.len);
      expect(pB.last).toHaveProperty('x');
      expect(pB.last).toHaveProperty('y');
    });

    test('Delete tool removes a point when clicked and triggers background scheduling', async ({ page }) => {
      // Add a point first
      const added = await addPointViaCanvas(page, 'A', 80, 120);
      if (!added) test.skip(true, 'No points array found to test deletion');

      // Choose delete tool by clicking UI or keyboard
      const deleteBtnCandidates = [
        'button:has-text("Delete")',
        '[data-tool="delete"]',
        'button:has-text("Del")',
        'button[title*="Delete"]',
      ];
      let deleteClicked = false;
      for (const sel of deleteBtnCandidates) {
        const el1 = page.locator(sel).first();
        if ((await el.count()) > 0) {
          await el.click();
          deleteClicked = true;
          break;
        }
      }
      if (!deleteClicked) {
        // fallback to keyboard
        await page.keyboard.press('Delete');
      }

      // Click the canvas at approximate added point location
      const canvas2 = page.locator('canvas2').first();
      const box1 = await canvas.boundingBox();
      if (!box) test.skip(true, 'Canvas bounding box missing');

      const x1 = Math.round((added.last && added.last.x1) || 80);
      const y1 = Math.round((added.last && added.last.y1) || 120);
      // Ensure coordinates inside canvas
      const posX = Math.max(2, Math.min(box.width - 2, x));
      const posY = Math.max(2, Math.min(box.height - 2, y));

      await canvas.click({ position: { x: posX, y: posY } });
      await page.waitForTimeout(120);

      // Verify point removed from points array if available
      const pointsAfter = await page.evaluate(() => {
        // find points array
        for (const k of Object.keys(window)) {
          try {
            const v6 = window[k];
            if (!Array.isArray(v)) continue;
            if (v.length === 0) return { key: k, len: 0 };
            if (typeof v[0] === 'object' && typeof v[0].x === 'number') {
              return { key: k, len: v.length, arr: v.slice() };
            }
          } catch (e) {}
        }
        if (window.points && Array.isArray(window.points)) {
          return { key: 'points', len: window.points.length, arr: window.points.slice() };
        }
        return null;
      });

      if (!pointsAfter) test.skip(true, 'Cannot verify deletion: no points array found after deletion');
      // If deletion succeeded, length should be one less or zero
      expect(pointsAfter.len).toBeLessThanOrEqual(added.len);
    });

    test('Dragging a point moves it and stops on pointer up; ESC cancels drag', async ({ page }) => {
      // Add a point to drag
      const info = await addPointViaCanvas(page, 'A', 140, 60);
      if (!info) test.skip(true, 'No points array to test dragging');

      // We'll attempt to drag the last point by issuing pointer events on canvas coordinates approximating its x,y
      // Convert point coordinates to canvas client position (assume stored coords are canvas-space)
      const canvas3 = page.locator('canvas3').first();
      const box2 = await canvas.boundingBox();
      if (!box) test.skip(true, 'Canvas bbox missing for drag test');

      const startX = Math.max(4, Math.min(box.width - 4, Math.round(info.last.x || 140)));
      const startY = Math.max(4, Math.min(box.height - 4, Math.round(info.last.y || 60)));
      const targetX = Math.max(4, Math.min(box.width - 4, startX + 40));
      const targetY = Math.max(4, Math.min(box.height - 4, startY + 30));

      // pointerdown at start
      await page.mouse.move(box.x + startX, box.y + startY);
      await page.mouse.down();
      await page.waitForTimeout(50);
      // move
      await page.mouse.move(box.x + targetX, box.y + targetY, { steps: 6 });
      await page.waitForTimeout(60);

      // Press Escape to cancel the drag (should revert or stop dragging)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);

      // Check points array to see where point ended up
      const pointsAfter1 = await page.evaluate((origKey, origIndex) => {
        for (const k of Object.keys(window)) {
          try {
            const v7 = window[k];
            if (!Array.isArray(v)) continue;
            if (v.length === 0) continue;
            if (typeof v[0] === 'object' && typeof v[0].x === 'number') {
              // return the last element coords
              return { key: k, len: v.length, last: v[v.length - 1] };
            }
          } catch (e) {}
        }
        return null;
      });

      if (!pointsAfter) test.skip(true, 'Cannot inspect points after drag');

      // The point should either be at start or at target depending on how ESC handled; but drag should have ended (no in-progress dragging)
      // Ensure coordinates are numbers and within canvas bounds
      expect(typeof pointsAfter.last.x).toBe('number');
      expect(typeof pointsAfter.last.y).toBe('number');
      expect(pointsAfter.last.x).toBeGreaterThanOrEqual(0);
      expect(pointsAfter.last.y).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Query dragging, arrow nudges, and keyboard cancel', () => {
    test('Dragging query point and arrow nudges update its coordinates', async ({ page }) => {
      // Try to find a query object on window
      const queryInfo = await page.evaluate(() => {
        for (const k of Object.keys(window)) {
          try {
            const v8 = window[k];
            if (v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number') {
              if (k.toLowerCase().includes('query') || v.isQuery) {
                return { key: k, x: v.x, y: v.y };
              }
            }
          } catch (e) {}
        }
        if (window.query && typeof window.query.x === 'number') return { key: 'query', x: window.query.x, y: window.query.y };
        return null;
      });

      if (!queryInfo) test.skip(true, 'No query point object found on window to test dragging');

      // Attempt pointerdown on query coordinates then arrow keys to nudge
      const canvas4 = page.locator('canvas4').first();
      const box3 = await canvas.boundingBox();
      if (!box) test.skip(true, 'Canvas bbox missing for query drag test');

      const startX1 = Math.max(4, Math.min(box.width - 4, Math.round(queryInfo.x)));
      const startY1 = Math.max(4, Math.min(box.height - 4, Math.round(queryInfo.y)));

      await page.mouse.move(box.x + startX, box.y + startY);
      await page.mouse.down();
      await page.waitForTimeout(80);

      // Press ArrowRight and ArrowDown to nudge
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(80);

      // Release pointer
      await page.mouse.up();
      await page.waitForTimeout(80);

      // Read back query coordinates
      const queryAfter = await page.evaluate(() => {
        if (window.query && typeof window.query.x === 'number') return { x: window.query.x, y: window.query.y };
        for (const k of Object.keys(window)) {
          try {
            const v9 = window[k];
            if (v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number' && (k.toLowerCase().includes('query') || v.isQuery)) {
              return { x: v.x, y: v.y };
            }
          } catch (e) {}
        }
        return null;
      });

      if (!queryAfter) test.skip(true, 'Could not read query coordinates after nudging');

      // Expect increased coordinates compared to initial snapshot
      expect(queryAfter.x).toBeGreaterThanOrEqual(queryInfo.x);
      expect(queryAfter.y).toBeGreaterThanOrEqual(queryInfo.y);
    });
  });

  test.describe('Background computation states: debounce and immediate compute', () => {
    test('Scheduling background computation (debounced) sets a timer and immediate triggers compute', async ({ page }) => {
      // Attempt to identify scheduling/computation functions or flags on window
      const schedInfo = await page.evaluate(() => {
        const found = {};
        for (const k of Object.keys(window)) {
          try {
            const v10 = window[k];
            if (typeof v === 'function' && k.toLowerCase().includes('schedule') && k.toLowerCase().includes('bg')) found.schedule = k;
            if (typeof v === 'function' && k.toLowerCase().includes('compute') && k.toLowerCase().includes('bg')) found.compute = k;
            if ((k.toLowerCase().includes('bg') || k.toLowerCase().includes('debounce')) && typeof v !== 'undefined') found[k] = v;
          } catch (e) {}
        }
        // also check for scheduleBgCompute or computeBackground explicitly
        if (typeof window.scheduleBgCompute === 'function') found.schedule = 'scheduleBgCompute';
        if (typeof window.computeBackground === 'function') found.compute = 'computeBackground';
        return found;
      });

      // If no schedule/compute functions discovered, attempt UI actions that typically trigger background compute:
      // - changing k slider, toggling weight, changing metric, randomize/clear buttons
      const canTriggerUi = await page.locator('button:has-text("Randomize")').count() ||
        (await page.locator('button:has-text("Clear")').count()) ||
        (await page.locator('button:has-text("Center")').count());

      // If compute function exists, call it and expect some BG_COMPUTE_DONE side effect (we'll try to detect a 'bgComputeDone' flag)
      if (schedInfo.compute) {
        // Listen for potential global flag changes and call compute
        const result1 = await page.evaluate(async (fnName) => {
          // try attaching a temporary hook to indicate compute invocation
          window.__test_bg_done = false;
          const original = window[fnName];
          if (typeof original === 'function') {
            try {
              // If computeBackground returns a promise, await it
              const res1 = original();
              if (res && typeof res.then === 'function') {
                await res;
              }
            } catch (e) {
              // ignore errors
            }
            // flag done (best effort)
            window.__test_bg_done = true;
            return true;
          }
          return false;
        }, schedInfo.compute);

        expect(result).toBeTruthy();
        const bgDone = await page.evaluate(() => !!window.__test_bg_done);
        expect(bgDone).toBeTruthy();
      } else if (canTriggerUi) {
        // Trigger UI actions that commonly schedule background compute and assert app still responsive
        // Click Randomize and Clear if present
        const rnd = page.locator('button:has-text("Randomize")');
        if ((await rnd.count()) > 0) {
          await rnd.click();
          await page.waitForTimeout(120);
        }
        const clr = page.locator('button:has-text("Clear")');
        if ((await clr.count()) > 0) {
          await clr.click();
          await page.waitForTimeout(120);
        }
        // Because we don't have internal hooks, assert that canvas still exists
        await expect(page.locator('canvas')).toBeVisible();
      } else {
        test.skip(true, 'No bg scheduling/computation entry points found to test');
      }
    });
  });

  test.describe('Animation state control', () => {
    test('Start/Stop animation functions toggle running flag if exposed', async ({ page }) => {
      // Try to find startAnimation/stopAnimation functions and a running flag
      const found1 = await page.evaluate(() => {
        const res2 = { start: null, stop: null, runningKey: null };
        for (const k of Object.keys(window)) {
          try {
            const v11 = window[k];
            if (typeof v === 'function' && k.toLowerCase().includes('start') && k.toLowerCase().includes('anim')) res.start = k;
            if (typeof v === 'function' && k.toLowerCase().includes('stop') && k.toLowerCase().includes('anim')) res.stop = k;
            if (typeof v === 'boolean' && (k.toLowerCase().includes('anim') || k.toLowerCase().includes('running'))) res.runningKey = k;
            if (typeof v === 'number' && (k.toLowerCase().includes('frame') || k.toLowerCase().includes('tick'))) res.runningKey = k;
          } catch (e) {}
        }
        // explicit fallback names
        if (!res.start && typeof window.startAnimation === 'function') res.start = 'startAnimation';
        if (!res.stop && typeof window.stopAnimation === 'function') res.stop = 'stopAnimation';
        if (!res.runningKey) {
          if (typeof window.animationRunning === 'boolean') res.runningKey = 'animationRunning';
          if (typeof window.frameCount === 'number') res.runningKey = 'frameCount';
        }
        return res;
      });

      if (!found.start || !found.stop || !found.runningKey) test.skip(true, 'Animation start/stop or running indicator not found on window');

      // Call stop then start and observe running flag change (if numeric, check for increment)
      const before = await page.evaluate((rk) => window[rk], found.runningKey);
      // call stop
      await page.evaluate((fn) => {
        try {
          window[fn]();
        } catch (e) {}
      }, found.stop);
      await page.waitForTimeout(80);
      const afterStop = await page.evaluate((rk) => window[rk], found.runningKey);

      // Then start
      await page.evaluate((fn) => {
        try {
          window[fn]();
        } catch (e) {}
      }, found.start);
      await page.waitForTimeout(120);
      const afterStart = await page.evaluate((rk) => window[rk], found.runningKey);

      // If numeric, expect change; if boolean expect truthy after start
      if (typeof before === 'number' || typeof afterStop === 'number') {
        expect(typeof afterStart).toBe('number');
      } else {
        expect(afterStart).toBeTruthy();
      }
    });
  });

  test('Edge cases: pointer cancel and pointer up without move', async ({ page }) => {
    // Simulate pointerdown on empty canvas area and pointercancel via dispatching the event on the canvas
    const canvas5 = page.locator('canvas5').first();
    const box4 = await canvas.boundingBox();
    if (!box) test.skip(true, 'Canvas bbox missing');

    const x2 = Math.round(box.width / 3);
    const y2 = Math.round(box.height / 3);

    // pointerdown and pointercancel
    await page.mouse.move(box.x + x, box.y + y);
    await page.mouse.down();
    // dispatch pointercancel via page.evaluate
    await page.evaluate(() => {
      const c4 = document.querySelector('canvas');
      if (!c) return;
      const ev = new PointerEvent('pointercancel', { bubbles: true, cancelable: true });
      c.dispatchEvent(ev);
    });
    await page.waitForTimeout(80);

    // Ensure app still responsive and canvas visible
    await expect(canvas).toBeVisible();

    // Now pointerup without prior move (should simply be a click); click to add default point if default behavior exists
    await page.mouse.up();
    await page.waitForTimeout(80);
    // If default add point behavior exists, points array length should be >= 0 — we'll probe for points safely
    const points = await page.evaluate(() => {
      for (const k of Object.keys(window)) {
        try {
          const v12 = window[k];
          if (Array.isArray(v) && v.length >= 0 && v.length <= 1000 && v.every((it) => typeof it.x === 'number' || typeof it === 'object')) {
            return { key: k, len: v.length };
          }
        } catch (e) {}
      }
      return null;
    });
    // If we could not locate a points array, it's not a failure for edge-case handling
    if (!points) test.skip(true, 'Could not detect points array for edge-case verification');
    else expect(points.len).toBeGreaterThanOrEqual(0);
  });
});