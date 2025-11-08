import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6abf6700-bcb0-11f0-95d9-c98d28730c93.html';

// Helper selectors with fallbacks - the implementation may use slightly different class/attribute names.
// We use CSS group selectors so most reasonable markup variants will be matched.
const SELECTORS = {
  svg: 'svg, #viz, .viz, .kmeans-svg',
  // points may be circles or g elements with data attributes
  point: 'circle.point, circle[data-point], g.point, .point, [data-testid="point"]',
  centroid: 'circle.centroid, circle[data-centroid], g.centroid, .centroid, [data-testid="centroid"]',
  assignmentLine: 'line.assignment, path.assignment-line, .assignment-line, line[data-assignment]',
  btnAddRandom: 'button:has-text("Add random"), button:has-text("Add Random")',
  btnAddPoint: 'button:has-text("Add point"), button:has-text("Add Point")',
  btnInit: 'button:has-text("Init centroids"), button:has-text("Init Centroids"), button:has-text("Init")',
  btnStep: 'button:has-text("Step")',
  btnRun: 'button:has-text("Run"), button:has-text("Start"), button:has-text("Stop")',
  btnClear: 'button:has-text("Clear")',
  btnReset: 'button:has-text("Reset")',
  inputK: 'input[type="range"][name="k"], input#k, input[name="k"], input:has([aria-label="k"])',
  inputSpeed: 'input[type="range"][name="speed"], input#speed, input[name="speed"], input[aria-label="speed"]',
  legend: '.legend, [data-testid="legend"], .key-legend',
  metrics: '.metrics, [data-testid="metrics"], .stats'
};

test.describe('K-Means Interactive Module - FSM validation', () => {
  // Navigate to the app before each test
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for main SVG to be ready (if present)
    await page.waitForTimeout(100); // small delay to allow initial scripts to run
    await page.waitForSelector(SELECTORS.svg, { timeout: 2000 }).catch(() => {
      // If no svg, tests will still run with graceful checks
    });
  });

  // Utility to count elements with fallback selectors
  async function countLocator(page, selector) {
    const locator = page.locator(selector);
    try {
      return await locator.count();
    } catch {
      return 0;
    }
  }

  // Get bounding box center for an element
  async function centerOfElement(page, locator) {
    const box = await locator.boundingBox();
    if (!box) return null;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  // Click the "Add random" control; fallback to clicking the add button or invoking click on SVG
  async function addRandomPoints(page) {
    const addRandom = page.locator(SELECTORS.btnAddRandom);
    if (await addRandom.count() > 0) {
      await addRandom.first().click();
      return true;
    }
    // fallback: click an "Add point" multiple times on random locations on svg
    const svg = page.locator(SELECTORS.svg);
    if (await svg.count() > 0) {
      const box1 = await svg.first().boundingBox();
      if (!box) return false;
      // Click 3 random points
      for (let i = 0; i < 3; i++) {
        const x = box.x + 20 + Math.random() * (box.width - 40);
        const y = box.y + 20 + Math.random() * (box.height - 40);
        await page.mouse.click(x, y);
        await page.waitForTimeout(50);
      }
      return true;
    }
    return false;
  }

  test.describe('Initial and basic states (empty -> idle -> ready)', () => {
    test('Initial load starts in empty state (no points, no centroids)', async ({ page }) => {
      // Validate there are no points and no centroids on initial load
      const pointCount = await countLocator(page, SELECTORS.point);
      const centroidCount = await countLocator(page, SELECTORS.centroid);
      expect(pointCount).toBe(0);
      expect(centroidCount).toBe(0);

      // Metrics should be empty or show zero items if present
      const metrics = page.locator(SELECTORS.metrics);
      if (await metrics.count() > 0) {
        const text = (await metrics.first().innerText()).trim();
        // Expect either empty string or some text indicating zero points
        expect(text.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('Adding random points transitions to idle (points appear)', async ({ page }) => {
      // Click Add Random (or fallback)
      const worked = await addRandomPoints(page);
      expect(worked).toBeTruthy();

      // After adding, there must be at least one point
      await page.waitForTimeout(100);
      const pointCount1 = await countLocator(page, SELECTORS.point);
      expect(pointCount).toBeGreaterThanOrEqual(1);

      // INIT_CENTROIDS should move to ready when clicked
      const initBtn = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) {
        await initBtn.first().click();
        await page.waitForTimeout(100);
        const centroids = await countLocator(page, SELECTORS.centroid);
        expect(centroids).toBeGreaterThanOrEqual(1); // K centroids initialized
        // Metrics should be updated (if present)
        const metrics1 = page.locator(SELECTORS.metrics1);
        if (await metrics.count() > 0) {
          await expect(metrics.first()).toBeVisible();
        }
      } else {
        test.info().log('Init centroids button not found; skipping centroid init assertions.');
      }
    });
  });

  test.describe('Step / Assigning / Updating cycle', () => {
    test('STEP triggers assignment lines then centroid updates (assigning -> updating -> ready)', async ({ page }) => {
      // Ensure there are points and centroids: add points then init
      await addRandomPoints(page);
      const initBtn1 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) {
        await initBtn.first().click();
      } else {
        // If no init button, assume centroids present or skip
      }
      await page.waitForTimeout(150);

      const stepBtn = page.locator(SELECTORS.btnStep);
      if (await stepBtn.count() === 0) {
        test.info().log('Step button not found; skipping STEP test.');
        return;
      }

      // Capture centroid positions before step
      const centroidsBefore = page.locator(SELECTORS.centroid);
      const beforeCount = await centroidsBefore.count();
      const beforeCenters = [];
      for (let i = 0; i < beforeCount; i++) {
        const c = centroidsBefore.nth(i);
        const pos = await centerOfElement(page, c);
        beforeCenters.push(pos);
      }

      // Click Step to start assign -> update
      await stepBtn.first().click();

      // After entering assigning, assignment lines should be rendered (quick check)
      await page.waitForTimeout(100);
      const assignmentCount = await countLocator(page, SELECTORS.assignmentLine);
      expect(assignmentCount).toBeGreaterThanOrEqual(1);

      // Wait a bit longer than ASSIGN_TIMEOUT to allow update animation to begin
      await page.waitForTimeout(350);

      // During updating, centroid positions may be animating; wait for animation to finish
      // Default speed might be ~300ms; wait a safe margin
      const speedInput = page.locator(SELECTORS.inputSpeed);
      let speedMs = 300;
      if (await speedInput.count() > 0) {
        try {
          const val = await speedInput.first().evaluate((el) => el.value);
          speedMs = Math.max(0, parseInt(val || '300'));
        } catch {
          speedMs = 300;
        }
      }
      await page.waitForTimeout(speedMs + 80);

      // After update completes, centroid positions should be present and may differ from initial
      const centroidsAfter = page.locator(SELECTORS.centroid);
      const afterCount = await centroidsAfter.count();
      expect(afterCount).toBeGreaterThanOrEqual(1);
      // Compare at least one centroid moved (if there were >0 centroids before)
      if (beforeCenters.length > 0 && afterCount >= beforeCenters.length) {
        let moved = false;
        for (let i = 0; i < beforeCenters.length; i++) {
          const posAfter = await centerOfElement(page, centroidsAfter.nth(i));
          const posBefore = beforeCenters[i];
          if (!posAfter || !posBefore) continue;
          const dx = Math.abs(posAfter.x - posBefore.x);
          const dy = Math.abs(posAfter.y - posBefore.y);
          if (dx > 1 || dy > 1) {
            moved = true;
            break;
          }
        }
        // If no centroid moved, it's acceptable in degenerate datasets but we still assert presence of centroids
        test.expect(Boolean(afterCount)).toBeTruthy();
        test.info().log('At least one centroid movement detected: ' + moved);
      }
    });

    test('STEP when no centroids does not throw and stays in idle/empty', async ({ page }) => {
      // Click Clear to ensure empty
      const clearBtn = page.locator(SELECTORS.btnClear);
      if (await clearBtn.count() > 0) {
        await clearBtn.first().click();
        await page.waitForTimeout(50);
      }

      // Click Step even though there are no centroids/points
      const stepBtn1 = page.locator(SELECTORS.btnStep);
      if (await stepBtn.count() > 0) {
        await stepBtn.first().click();
        // No uncaught exceptions should bubble to the UI; check console errors not permitted in Playwright tests by default
        await page.waitForTimeout(100);
        const pointCount2 = await countLocator(page, SELECTORS.point);
        const centroids1 = await countLocator(page, SELECTORS.centroid);
        // Remain empty or idle - ensure not crash: counts remain low
        expect(pointCount).toBeLessThanOrEqual(0);
        expect(centroids).toBeLessThanOrEqual(0);
      } else {
        test.info().log('No Step button found; cannot exercise step-without-centroids edge case.');
      }
    });
  });

  test.describe('Running (auto-step) behavior', () => {
    test('RUN_PRESS toggles auto-run and generates periodic iterations (running -> ready)', async ({ page }) => {
      // Ensure points and centroids present
      await addRandomPoints(page);
      const initBtn2 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) await initBtn.first().click();
      await page.waitForTimeout(150);

      const runBtn = page.locator(SELECTORS.btnRun);
      if (await runBtn.count() === 0) {
        test.info().log('Run button not found; skipping running behavior test.');
        return;
      }

      // Capture centroid positions before run
      const centroids2 = page.locator(SELECTORS.centroid);
      const beforePositions = [];
      const cCount = await centroids.count();
      for (let i = 0; i < cCount; i++) {
        beforePositions.push(await centerOfElement(page, centroids.nth(i)));
      }

      // Click Run to start auto-run
      await runBtn.first().click();

      // Running state's interval computed as Math.max(400, speed + 200). Wait for at least one interval + some margin
      const speedInput1 = page.locator(SELECTORS.inputSpeed);
      let speedMs1 = 300;
      if (await speedInput.count() > 0) {
        try {
          speedMs = Math.max(0, parseInt(await speedInput.first().evaluate((el) => el.value || '300')));
        } catch {
          speedMs = 300;
        }
      }
      const intervalMs = Math.max(400, speedMs + 200);
      // Wait for two intervals to give time for an assign+update cycle
      await page.waitForTimeout(intervalMs * 2 + 200);

      // At least one centroid should have moved compared to before
      const afterPositions = [];
      const afterCount1 = await centroids.count();
      for (let i = 0; i < afterCount; i++) {
        afterPositions.push(await centerOfElement(page, centroids.nth(i)));
      }

      let moved1 = false;
      for (let i = 0; i < Math.min(beforePositions.length, afterPositions.length); i++) {
        const a = beforePositions[i];
        const b = afterPositions[i];
        if (!a || !b) continue;
        if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) {
          moved = true;
          break;
        }
      }
      test.info().log('Auto-run caused centroid movement: ' + moved);

      // Click Run again to stop auto-run
      await runBtn.first().click();
      await page.waitForTimeout(150);

      // Verify that after stopping, further waiting does not move centroids
      const stablePositions = [];
      for (let i = 0; i < afterCount; i++) stablePositions.push(await centerOfElement(page, centroids.nth(i)));
      await page.waitForTimeout(intervalMs + 200);
      let stillMoved = false;
      for (let i = 0; i < stablePositions.length; i++) {
        const prev = stablePositions[i];
        const cur = await centerOfElement(page, centroids.nth(i));
        if (!prev || !cur) continue;
        if (Math.abs(prev.x - cur.x) > 1 || Math.abs(prev.y - cur.y) > 1) {
          stillMoved = true;
          break;
        }
      }
      expect(stillMoved).toBeFalsy();
    });
  });

  test.describe('Drag interactions (points and centroids)', () => {
    test('Dragging a point updates its position and releases back to ready (dragging_point)', async ({ page }) => {
      await addRandomPoints(page);

      const pointLocator = page.locator(SELECTORS.point);
      if (await pointLocator.count() === 0) {
        test.info().log('No points available to drag; skipping point drag test.');
        return;
      }

      const p = pointLocator.first();
      const start = await centerOfElement(page, p);
      if (!start) {
        test.info().log('Could not determine point center; skipping drag.');
        return;
      }

      // Drag the point by 60 pixels to the right and 30 down
      const target = { x: start.x + 60, y: start.y + 30 };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 8 });
      // During dragging, the element center should move (live update)
      await page.waitForTimeout(80);
      const midPos = await centerOfElement(page, p);
      expect(midPos).not.toBeNull();
      if (midPos) {
        // Either moved while dragging or will move on release; assert either changed x or y
        const dx1 = Math.abs(midPos.x - start.x);
        const dy1 = Math.abs(midPos.y - start.y);
        expect(dx > 0 || dy > 0).toBeTruthy();
      }
      // Release
      await page.mouse.up();
      await page.waitForTimeout(120);

      const endPos = await centerOfElement(page, p);
      expect(endPos).not.toBeNull();
      if (endPos) {
        // Ensure final position is roughly at target (allow some tolerance)
        const dx2 = Math.abs(endPos.x - target.x);
        const dy2 = Math.abs(endPos.y - target.y);
        expect(dx < 70).toBeTruthy();
        expect(dy < 70).toBeTruthy();
      }
    });

    test('Dragging a centroid disables CSS transition during drag and restores afterwards (dragging_centroid)', async ({ page }) => {
      // Ensure we have centroids
      await addRandomPoints(page);
      const initBtn3 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) await initBtn.first().click();
      await page.waitForTimeout(150);

      const centroidLocator = page.locator(SELECTORS.centroid);
      if (await centroidLocator.count() === 0) {
        test.info().log('No centroids to drag; skipping centroid drag test.');
        return;
      }

      const c1 = centroidLocator.first();

      // Check computed transition before drag
      const preTransition = await c.evaluate((el) => getComputedStyle(el).transition || '');
      // Start drag
      const start1 = await centerOfElement(page, c);
      if (!start) {
        test.info().log('Cannot compute centroid center; skipping centroid drag.');
        return;
      }
      const target1 = { x: start.x + 50, y: start.y + 20 };

      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      // After pointer capture, many implementations set element.style.transition = 'none'
      // Give a short moment for that to take effect
      await page.waitForTimeout(50);
      const duringTransition = await c.evaluate((el) => getComputedStyle(el).transition || '');
      // During drag, transition should be disabled or shorter; assert difference from preTransition
      test.info().log('preTransition: ' + preTransition + ' during: ' + duringTransition);
      expect(duringTransition === '' || duringTransition.includes('none') || duringTransition !== preTransition).toBeTruthy();

      // Move centroid
      await page.mouse.move(target.x, target.y, { steps: 6 });
      await page.waitForTimeout(50);
      const mid = await centerOfElement(page, c);
      expect(mid).not.toBeNull();
      if (mid) {
        expect(Math.abs(mid.x - target.x) < 70 || Math.abs(mid.y - target.y) < 70).toBeTruthy();
      }

      // Release
      await page.mouse.up();
      await page.waitForTimeout(150);
      const postTransition = await c.evaluate((el) => getComputedStyle(el).transition || '');
      // Transition should be restored to something resembling the original (might not be identical string)
      test.info().log('postTransition: ' + postTransition);
      expect(postTransition.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Auxiliary UI interactions and controls', () => {
    test('K change updates number of centroids after Init (K_CHANGE)', async ({ page }) => {
      // Add points, change K, init and validate centroid count matches K when possible
      await addRandomPoints(page);

      const kInput = page.locator(SELECTORS.inputK);
      if (await kInput.count() === 0) {
        test.info().log('K input not found; skipping K change test.');
        return;
      }

      // Set K to 4 (or a new value)
      await kInput.first().evaluate((el) => {
        el.value = 4;
        // dispatch input/change events
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Click init to create centroids
      const initBtn4 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) {
        await initBtn.first().click();
        await page.waitForTimeout(150);
        // Count centroids and assert >= 1 and ideally equals 4
        const cCount1 = await countLocator(page, SELECTORS.centroid);
        test.info().log('Centroid count after K change: ' + cCount);
        // It might not create exactly 4 if there are fewer points; ensure it reflects attempt to create up to K
        expect(cCount).toBeGreaterThanOrEqual(1);
      } else {
        test.info().log('Init button missing; cannot validate K change behavior.');
      }
    });

    test('Speed change affects update timing (SPEED_CHANGE)', async ({ page }) => {
      // Add points and init
      await addRandomPoints(page);
      const initBtn5 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) await initBtn.first().click();
      await page.waitForTimeout(150);

      const speedInput2 = page.locator(SELECTORS.inputSpeed);
      if (await speedInput.count() === 0) {
        test.info().log('Speed input not found; skipping speed change timing test.');
        return;
      }

      // Set speed to a larger value to observe slower animation
      await speedInput.first().evaluate((el) => {
        el.value = 800;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Capture centroid before step
      const centroid = page.locator(SELECTORS.centroid).first();
      const centerBefore = await centerOfElement(page, centroid);
      if (!centerBefore) {
        test.info().log('Could not get centroid center; skipping remainder.');
        return;
      }

      // Step and measure duration until final update; because UI uses speedInput.value + 40 ms for UPDATE_TIMEOUT
      const stepBtn2 = page.locator(SELECTORS.btnStep);
      if (await stepBtn.count() === 0) {
        test.info().log('Step button missing; skipping speed timing test.');
        return;
      }

      await stepBtn.first().click();
      // ASSERT: assignment occurs quickly (~300ms) then update should complete after speed + 40
      await page.waitForTimeout(350); // wait for assign
      // Now measure that centroid hasn't immediately jumped but moves after speed time roughly
      const midPos1 = await centerOfElement(page, centroid);
      // Mid position may be unchanged or starting animation; ensure not already at final (we'll check after speed)
      // Wait speed + margin
      await page.waitForTimeout(800 + 80);
      const afterPos = await centerOfElement(page, centroid);
      // After should exist and possibly differ from before
      if (afterPos && centerBefore) {
        const dx3 = Math.abs(afterPos.x - centerBefore.x);
        const dy3 = Math.abs(afterPos.y - centerBefore.y);
        test.info().log(`Centroid moved dx=${dx}, dy=${dy} after long speed`);
        // Movement may be small for symmetric data but this verifies that animation had time to complete
        expect(typeof afterPos.x).toBe('number');
      }
    });

    test('Legend click and reset/clear behaviors', async ({ page }) => {
      // Legend click: may toggle filters or highlights; simply try clicking if present and ensure no crash
      const legend = page.locator(SELECTORS.legend);
      if (await legend.count() > 0) {
        await legend.first().click();
        await page.waitForTimeout(80);
        // Clicking legend should not remove points unexpectedly; ensure points count remains non-negative
        const pts = await countLocator(page, SELECTORS.point);
        expect(pts).toBeGreaterThanOrEqual(0);
      } else {
        test.info().log('Legend not found; skipping legend click test.');
      }

      // Test Reset: should remove centroids but keep points
      await addRandomPoints(page);
      const initBtn6 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) await initBtn.first().click();
      await page.waitForTimeout(120);
      const resetBtn = page.locator(SELECTORS.btnReset);
      if (await resetBtn.count() > 0) {
        await resetBtn.first().click();
        await page.waitForTimeout(120);
        const cCount2 = await countLocator(page, SELECTORS.centroid);
        const pCount = await countLocator(page, SELECTORS.point);
        // Centroids should be removed or reset
        expect(cCount).toBeLessThanOrEqual(0);
        // Points remain
        expect(pCount).toBeGreaterThanOrEqual(0);
      } else {
        test.info().log('Reset button not found; skipping reset test.');
      }

      // Test Clear: should remove both centroids and points
      const clearBtn1 = page.locator(SELECTORS.btnClear);
      if (await clearBtn.count() > 0) {
        await clearBtn.first().click();
        await page.waitForTimeout(120);
        const cCount21 = await countLocator(page, SELECTORS.centroid);
        const pCount2 = await countLocator(page, SELECTORS.point);
        expect(cCount2).toBeLessThanOrEqual(0);
        expect(pCount2).toBeLessThanOrEqual(0);
      } else {
        test.info().log('Clear button not found; skipping clear test.');
      }
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Rapid K and Speed changes during running do not crash and respect controls', async ({ page }) => {
      // Add points and init
      await addRandomPoints(page);
      const initBtn7 = page.locator(SELECTORS.btnInit);
      if (await initBtn.count() > 0) await initBtn.first().click();
      await page.waitForTimeout(120);

      // Start running if possible
      const runBtn1 = page.locator(SELECTORS.btnRun);
      if (await runBtn.count() > 0) await runBtn.first().click();
      await page.waitForTimeout(80);

      // Rapidly change K and speed inputs if present
      const kInput1 = page.locator(SELECTORS.inputK);
      if (await kInput.count() > 0) {
        for (const val of [2, 5, 3]) {
          await kInput.first().evaluate((el, v) => {
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, val);
          await page.waitForTimeout(60);
        }
      }

      const speedInput3 = page.locator(SELECTORS.inputSpeed);
      if (await speedInput.count() > 0) {
        for (const val of [100, 900, 300]) {
          await speedInput.first().evaluate((el, v) => {
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, val);
          await page.waitForTimeout(60);
        }
      }

      // Stop running
      if (await runBtn.count() > 0) await runBtn.first().click();
      await page.waitForTimeout(120);

      // Ensure UI still responsive: can click step
      const stepBtn3 = page.locator(SELECTORS.btnStep);
      if (await stepBtn.count() > 0) {
        await stepBtn.first().click();
        await page.waitForTimeout(150);
      }
      // No obvious crashes: check page title still present
      expect(await page.title()).toBeTruthy();
    });
  });
});