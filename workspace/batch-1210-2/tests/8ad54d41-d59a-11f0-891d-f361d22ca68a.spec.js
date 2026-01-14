import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad54d41-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Two Pointers Concept Demo - FSM and DOM tests', () => {
  // Collect page errors and console messages for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture runtime page errors that occur during script execution (e.g., ReferenceError)
    page.on('pageerror', (err) => {
      // err.message typically contains the error description
      pageErrors.push(err.message || String(err));
    });

    // Capture console messages for additional visibility
    page.on('console', (msg) => {
      try {
        consoleMessages.push(msg.text());
      } catch (e) {
        consoleMessages.push(String(msg));
      }
    });

    // Navigate to the page and allow any synchronous script errors to surface.
    await page.goto(APP_URL);

    // The page's script intentionally calls a missing function (addEventListeners), which should
    // produce a ReferenceError. Wait a short time for that error to be reported and collected.
    try {
      // Wait for a pageerror event if it happens soon after load
      const err = await page.waitForEvent('pageerror', { timeout: 2000 });
      if (err && err.message) pageErrors.push(err.message);
    } catch {
      // ignore timeout - error may have already been captured by the page.on handler
    }

    // Reset mutable page state variables to ensure tests are isolated.
    // We are not injecting new globals; we only modify existing ones declared by the page script.
    await page.evaluate(() => {
      try {
        if (typeof points !== 'undefined') points.length = 0;
        if (typeof mouseDown !== 'undefined') mouseDown = false;
      } catch (e) {
        // If variables aren't defined for some reason, don't throw; tests will assert their absence.
      }
    });
  });

  test.describe('Initial load and error observation', () => {
    test('Page loads and canvas element exists with expected attributes (Idle state evidence)', async ({ page }) => {
      // Validate that the canvas exists and has the expected width/height attributes
      const canvasHandle = await page.$('#canvas');
      expect(canvasHandle).not.toBeNull();

      const attrs = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        return {
          exists: !!c,
          width: c ? c.getAttribute('width') : null,
          height: c ? c.getAttribute('height') : null,
          offsetLeft: c ? c.offsetLeft : null,
          offsetTop: c ? c.offsetTop : null,
        };
      });

      expect(attrs.exists).toBe(true);
      expect(attrs.width).toBe('800');
      expect(attrs.height).toBe('600');
    });

    test('A ReferenceError is emitted because addEventListeners is not defined', async ({ page }) => {
      // The page's inline script calls addEventListeners() which doesn't exist.
      // Ensure we captured a ReferenceError mentioning 'addEventListeners'.
      const hasRefErr = pageErrors.some((m) =>
        typeof m === 'string' && m.toLowerCase().includes('addeventlisteners')
      );

      expect(hasRefErr).toBeTruthy();
    });

    test('Key functions (handleMouseDown/Move/Up) exist even though addEventListeners threw', async ({ page }) => {
      // The script defined these functions before calling addEventListeners(), so they should exist.
      const functionsExist = await page.evaluate(() => {
        return {
          handleMouseDown: typeof handleMouseDown === 'function',
          handleMouseMove: typeof handleMouseMove === 'function',
          handleMouseUp: typeof handleMouseUp === 'function',
          draw: typeof draw === 'function',
          addPoint: typeof addPoint === 'function',
        };
      });

      expect(functionsExist.handleMouseDown).toBe(true);
      expect(functionsExist.handleMouseMove).toBe(true);
      expect(functionsExist.handleMouseUp).toBe(true);
      expect(functionsExist.draw).toBe(true);
      expect(functionsExist.addPoint).toBe(true);
    });

    test('FSM entry action "renderPage" is not implemented (onEnter check)', async ({ page }) => {
      // The FSM mentions renderPage() as an entry action; verify whether it exists.
      const renderPageExists = await page.evaluate(() => typeof renderPage !== 'undefined');
      expect(renderPageExists).toBe(false);
    });
  });

  test.describe('FSM events and transitions (simulate handlers directly)', () => {
    test('MouseDown (left button) transitions Idle -> Drawing by setting mouseDown = true', async ({ page }) => {
      // Ensure starting state
      await page.evaluate(() => {
        if (typeof mouseDown !== 'undefined') mouseDown = false;
        if (typeof points !== 'undefined') points.length = 0;
      });

      // Call the defined handler with a left-button event and check mouseDown state
      const result = await page.evaluate(() => {
        try {
          handleMouseDown({ button: 0 });
          return { mouseDown: typeof mouseDown !== 'undefined' ? mouseDown : null };
        } catch (e) {
          return { error: e.message || String(e) };
        }
      });

      expect(result.error).toBeUndefined();
      expect(result.mouseDown).toBe(true);
    });

    test('MouseMove while mouseDown true adds a point and calls draw (Drawing -> Drawing)', async ({ page }) => {
      // Prepare state: ensure mouseDown true and empty points array
      const outcome = await page.evaluate(() => {
        try {
          // Reset state
          if (typeof points !== 'undefined') points.length = 0;
          if (typeof mouseDown !== 'undefined') mouseDown = true;

          // Simulate a mousemove; choose a clientX/clientY that will compute to positive dx/dy
          const evt = { clientX: 120, clientY: 140 };
          const before = typeof points !== 'undefined' ? points.length : null;

          // Call the handler
          handleMouseMove(evt);

          const after = typeof points !== 'undefined' ? points.length : null;
          const last = (points && points.length) ? points[points.length - 1] : null;

          // compute expected dx/dy relative to canvas offset
          const c = document.getElementById('canvas');
          const expectedDx = evt.clientX - (c ? c.offsetLeft : 0);
          const expectedDy = evt.clientY - (c ? c.offsetTop : 0);

          return { before, after, last, expectedDx, expectedDy };
        } catch (e) {
          return { error: e.message || String(e) };
        }
      });

      expect(outcome.error).toBeUndefined();
      expect(typeof outcome.before).toBe('number');
      expect(typeof outcome.after).toBe('number');
      expect(outcome.after).toBe(outcome.before + 1);
      expect(outcome.last).not.toBeNull();
      // The stored point coordinates should match the dx/dy computed in the handler
      expect(Math.abs(outcome.last.x - outcome.expectedDx)).toBeLessThan(1e-6);
      expect(Math.abs(outcome.last.y - outcome.expectedDy)).toBeLessThan(1e-6);
    });

    test('MouseUp transitions Drawing -> Idle by setting mouseDown = false', async ({ page }) => {
      // Ensure mouseDown true first, then call mouseup and validate false
      const result = await page.evaluate(() => {
        try {
          if (typeof mouseDown !== 'undefined') mouseDown = true;
          handleMouseUp({}); // event not used in implementation
          return { mouseDown: typeof mouseDown !== 'undefined' ? mouseDown : null };
        } catch (e) {
          return { error: e.message || String(e) };
        }
      });

      expect(result.error).toBeUndefined();
      expect(result.mouseDown).toBe(false);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('MouseDown with non-left button does not set mouseDown', async ({ page }) => {
      // Reset state
      await page.evaluate(() => {
        if (typeof mouseDown !== 'undefined') mouseDown = false;
      });

      const res = await page.evaluate(() => {
        try {
          handleMouseDown({ button: 1 }); // right/middle button
          return typeof mouseDown !== 'undefined' ? mouseDown : null;
        } catch (e) {
          return { error: e.message || String(e) };
        }
      });

      if (typeof res === 'object' && res.error) {
        // If the handler threw, surface the error for test visibility
        throw new Error('handleMouseDown threw: ' + res.error);
      }

      expect(res).toBe(false);
    });

    test('MouseMove while mouseDown is false does not push points', async ({ page }) => {
      // Ensure mouseDown false and reset points
      await page.evaluate(() => {
        if (typeof mouseDown !== 'undefined') mouseDown = false;
        if (typeof points !== 'undefined') points.length = 0;
      });

      const outcome = await page.evaluate(() => {
        try {
          const before = typeof points !== 'undefined' ? points.length : null;
          handleMouseMove({ clientX: 200, clientY: 220 });
          const after = typeof points !== 'undefined' ? points.length : null;
          return { before, after };
        } catch (e) {
          return { error: e.message || String(e) };
        }
      });

      expect(outcome.error).toBeUndefined();
      expect(outcome.before).toBe(0);
      expect(outcome.after).toBe(0);
    });

    test('addPoint behavior: first call pushes into points, subsequent calls draw but do not push', async ({ page }) => {
      // Reset points and call addPoint multiple times to observe behavior
      const result = await page.evaluate(() => {
        try {
          if (typeof points !== 'undefined') points.length = 0;
          const c = document.getElementById('canvas');
          // First call: should push into points (since points.length === 0)
          addPoint(30, 40);
          const afterFirst = points.length;

          // Second call: according to implementation, it does not push into points, only draws a line
          addPoint(50, 60);
          const afterSecond = points.length;

          return { afterFirst, afterSecond, pointsSnapshot: points.slice() };
        } catch (e) {
          return { error: e.message || String(e) };
        }
      });

      expect(result.error).toBeUndefined();
      // afterFirst should be 1 (first addPoint pushes)
      expect(result.afterFirst).toBe(1);
      // afterSecond should remain 1 (second addPoint draws but doesn't push)
      expect(result.afterSecond).toBe(1);
      expect(Array.isArray(result.pointsSnapshot)).toBe(true);
      expect(result.pointsSnapshot.length).toBe(1);
      expect(result.pointsSnapshot[0]).toHaveProperty('x');
      expect(result.pointsSnapshot[0]).toHaveProperty('y');
    });

    test('Confirm that the initial script error is present in captured console/page errors for diagnostics', async ({ page }) => {
      // We expect at least one page error referencing the missing function call.
      const anyErrorMentionsMissing = pageErrors.some((m) =>
        typeof m === 'string' && /addeventlisteners/i.test(m)
      );
      expect(anyErrorMentionsMissing).toBe(true);

      // Also assert that console messages (if any) were captured; not required to have messages, but we record them
      expect(Array.isArray(consoleMessages)).toBe(true);
    });
  });
});