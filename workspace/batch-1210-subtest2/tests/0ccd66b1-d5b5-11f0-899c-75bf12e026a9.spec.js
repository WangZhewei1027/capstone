import { test, expect } from '@playwright/test';

test.describe('K-Means Clustering Demo - FSM and Interactions (Application ID: 0ccd66b1-d5b5-11f0-899c-75bf12e026a9)', () => {
  // Helper to collect console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Capture console logs and errors
    page['_consoleMessages'] = [];
    page['_pageErrors'] = [];

    page.on('console', msg => {
      page['_consoleMessages'].push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      page['_pageErrors'].push(error);
    });

    // Navigate to the served HTML page
    await page.goto('http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccd66b1-d5b5-11f0-899c-75bf12e026a9.html');
  });

  test.afterEach(async ({ page }) => {
    // Assert there were no uncaught runtime errors on the page
    const pageErrors = page['_pageErrors'] || [];
    expect(pageErrors.length, `Expected no uncaught page errors, but found: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);

    // Assert there are no console.error messages (unexpected runtime errors)
    const consoleErrors = (page['_consoleMessages'] || []).filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console.error messages, but found: ${consoleErrors.map(m => m.text).join('; ')}`).toBe(0);
  });


  // Utility: get pixel RGBA at client coordinates (clientX, clientY)
  async function getCanvasPixelRGBA(page, clientX, clientY) {
    return await page.evaluate(({ clientX, clientY }) => {
      const canvas = document.getElementById('canvas');
      const rect = canvas.getBoundingClientRect();
      // Map client coordinates to canvas internal pixel coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((clientX - rect.left) * scaleX);
      const y = Math.floor((clientY - rect.top) * scaleY);
      const ctx = canvas.getContext('2d');
      try {
        const d = ctx.getImageData(Math.max(0, Math.min(canvas.width - 1, x)), Math.max(0, Math.min(canvas.height - 1, y)), 1, 1).data;
        return Array.from(d); // [r,g,b,a]
      } catch (e) {
        // Some environments may throw; return transparent pixel
        return [0,0,0,0];
      }
    }, { clientX, clientY });
  }

  // Utility: get bounding box of canvas and compute a client coordinate inside it
  async function getCanvasClientCenter(page) {
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('Canvas bounding box not available');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  }

  test.describe('Input State (S0_Input) interactions', () => {
    test('Clicking canvas adds a point (pixel becomes non-transparent) and UI buttons remain correct', async ({ page }) => {
      // This test validates:
      // - clicking canvas in input state adds a point (canvas pixel alpha > 0)
      // - start button is enabled, step/run buttons remain disabled initially
      // - no runtime page errors occur

      // Ensure initial button states match expectation
      const startBtn = page.locator('#startBtn');
      const stepBtn = page.locator('#stepBtn');
      const runBtn = page.locator('#runBtn');
      const kInput = page.locator('#kInput');

      await expect(startBtn).toBeEnabled();
      await expect(stepBtn).toBeDisabled();
      await expect(runBtn).toBeDisabled();
      await expect(kInput).toBeEnabled();

      // Get canvas center coordinates
      const { x, y } = await getCanvasClientCenter(page);

      // Ensure initial pixel at center is transparent (no drawn content)
      const before = await getCanvasPixelRGBA(page, x, y);
      expect(before.length).toBe(4);
      // alpha === 0 indicates transparent canvas pixel (no drawing yet)
      expect(before[3]).toBe(0);

      // Click on canvas to add a point at center
      await page.mouse.click(x, y);

      // After clicking, pixel at center should be drawn (alpha > 0)
      const after = await getCanvasPixelRGBA(page, x, y);
      expect(after.length).toBe(4);
      expect(after[3], 'Expected non-transparent pixel after adding a point').toBeGreaterThan(0);

      // Clicking again at an offset should also draw another point
      await page.mouse.click(x + 30, y + 20);
      const after2 = await getCanvasPixelRGBA(page, x + 30, y + 20);
      expect(after2[3]).toBeGreaterThan(0);

      // Buttons should be unchanged in input state
      await expect(startBtn).toBeEnabled();
      await expect(stepBtn).toBeDisabled();
      await expect(runBtn).toBeDisabled();
    });

    test('Pressing Enter on canvas adds a point at the center (keyboard accessibility)', async ({ page }) => {
      // Validates keyboard event handling: KeyDownEnter adds a center point when canvas focused

      const canvas = page.locator('#canvas');
      const { x, y } = await getCanvasClientCenter(page);

      // Ensure center pixel is initially transparent
      const before = await getCanvasPixelRGBA(page, x, y);
      expect(before[3]).toBe(0);

      // Focus the canvas and press Enter
      await canvas.focus();
      await page.keyboard.press('Enter');

      // Verify pixel at center is now drawn (alpha > 0)
      const after = await getCanvasPixelRGBA(page, x, y);
      expect(after[3]).toBeGreaterThan(0);
    });

    test('Start button shows an alert if no points added (edge case)', async ({ page }) => {
      // Validates edge-case behavior and dialog handling:
      // - clicking Start with zero points should trigger an alert with an informative message

      // Ensure no points exist: reset first to be safe
      await page.click('#resetBtn');

      // Intercept dialog
      let dialogMessage = null;
      page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Click Start Clustering with zero points
      await page.click('#startBtn');

      // Wait briefly for dialog handler to run
      await page.waitForTimeout(200);

      expect(dialogMessage, 'Expected alert dialog for starting with 0 points').toContain('Please add some points');
    });

    test('Start button shows alert if k > number of points (edge case)', async ({ page }) => {
      // Validates starting clustering when k > points triggers the specific validation alert

      // Reset to initial
      await page.click('#resetBtn');

      // Add a single point
      const { x, y } = await getCanvasClientCenter(page);
      await page.mouse.click(x, y);

      // Set k to a value larger than current points (e.g., 5)
      await page.fill('#kInput', '5');

      // Intercept dialog
      let dialogMessage = null;
      page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      // Click start
      await page.click('#startBtn');

      // Wait briefly for dialog handler to run
      await page.waitForTimeout(200);

      expect(dialogMessage, 'Expected alert dialog for k > number of points').toContain('Number of clusters k should be less or equal to number of points');
    });
  });


  test.describe('Clustering State (S1_Clustering) interactions', () => {
    test('Starting clustering transitions to clustering state and enables iteration controls', async ({ page }) => {
      // Validates transition S0_Input -> S1_Clustering:
      // - initializeCentroids() should run (centroids drawn)
      // - UI state: startBtn disabled, step/run enabled, kInput disabled

      // Prepare: reset, add 3 points (default k=3)
      await page.click('#resetBtn');
      const box = await page.locator('#canvas').boundingBox();
      if (!box) throw new Error('Canvas bounding box missing');
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      await page.mouse.click(centerX - 60, centerY - 40);
      await page.mouse.click(centerX + 60, centerY - 40);
      await page.mouse.click(centerX, centerY + 60);

      // Start clustering
      await page.click('#startBtn');

      // Verify UI state toggles: start disabled, step & run enabled, kInput disabled
      await expect(page.locator('#startBtn')).toBeDisabled();
      await expect(page.locator('#stepBtn')).toBeEnabled();
      await expect(page.locator('#runBtn')).toBeEnabled();
      await expect(page.locator('#kInput')).toBeDisabled();

      // Centroids should be drawn on the canvas: verify that there are non-transparent pixels somewhere (we already drew points),
      // but centroids have larger radius; check a pixel near each of the three points that likely changed by centroid drawing or assignments.
      // We'll sample at the positions we clicked and ensure non-transparent pixels exist (they do since points drawn). This mostly asserts draw() called.
      const p1 = await getCanvasPixelRGBA(page, centerX - 60, centerY - 40);
      const p2 = await getCanvasPixelRGBA(page, centerX + 60, centerY - 40);
      const p3 = await getCanvasPixelRGBA(page, centerX, centerY + 60);
      expect(p1[3]).toBeGreaterThan(0);
      expect(p2[3]).toBeGreaterThan(0);
      expect(p3[3]).toBeGreaterThan(0);
    }, { timeout: 10000 });

    test('Step button performs an iteration and may lead to convergence (S1_Clustering self-loop)', async ({ page }) => {
      // Validates StepIteration event:
      // - clicking Step when in clustering performs one iterate() call
      // - observable: canvas redraw; step/run disabled if converged, start enabled when finished

      // Prepare: reset and add 5 points to reduce immediate degenerate cases, set k=2
      await page.click('#resetBtn');
      const box = await page.locator('#canvas').boundingBox();
      if (!box) throw new Error('Canvas bounding box missing');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx - 100, cy - 80);
      await page.mouse.click(cx - 90, cy + 70);
      await page.mouse.click(cx + 80, cy - 60);
      await page.mouse.click(cx + 90, cy + 70);
      await page.mouse.click(cx, cy + 10);

      await page.fill('#kInput', '2');
      await page.click('#startBtn');

      // Capture a snapshot of a pixel before step
      const sampleX = cx - 100;
      const sampleY = cy - 80;
      const before = await getCanvasPixelRGBA(page, sampleX, sampleY);

      // Click Step to perform one iteration
      await page.click('#stepBtn');

      // After step, canvas should be redrawn. Pixel at sample may have changed (alpha stays >0) or color may change.
      const after = await getCanvasPixelRGBA(page, sampleX, sampleY);
      expect(after[3]).toBeGreaterThan(0);

      // Try stepping repeatedly up to a limit to allow potential convergence
      let converged = false;
      for (let i = 0; i < 15; i++) {
        // If step button becomes disabled, the app likely converged (iterate() sets converged and disables step/run)
        const stepDisabled = await page.locator('#stepBtn').isDisabled();
        if (stepDisabled) {
          converged = true;
          break;
        }
        await page.click('#stepBtn');
        await page.waitForTimeout(100); // small wait for redraw
      }

      // It's acceptable if clustering converged within these steps; ensure that UI reflects finished state when converged
      if (converged) {
        await expect(page.locator('#runBtn')).toBeDisabled();
        await expect(page.locator('#startBtn')).toBeEnabled();
        // Also kInput should be enabled after convergence per iterate()
        await expect(page.locator('#kInput')).toBeEnabled();
      } else {
        // If not converged within attempts, ensure UI still in clustering (step/run enabled)
        await expect(page.locator('#stepBtn')).toBeEnabled();
        await expect(page.locator('#runBtn')).toBeEnabled();
      }
    }, { timeout: 20000 });

    test('Run button runs clustering to convergence (S1_Clustering -> S2_Finished)', async ({ page }) => {
      // Validates RunToConvergence event:
      // - clicking Run disables controls during run and finally leaves UI in finished state
      // - resetBtn disabled during run, and enabled when finished

      // Prepare: reset and add 4 points, set k=2 to ensure reasonable convergence time
      await page.click('#resetBtn');
      const box = await page.locator('#canvas').boundingBox();
      if (!box) throw new Error('Canvas bounding box missing');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx - 60, cy - 40);
      await page.mouse.click(cx - 50, cy + 40);
      await page.mouse.click(cx + 60, cy - 40);
      await page.mouse.click(cx + 50, cy + 40);

      await page.fill('#kInput', '2');
      await page.click('#startBtn');

      // Click Run
      await page.click('#runBtn');

      // Immediately after clicking Run, the app should disable resetBtn during the run
      await expect(page.locator('#resetBtn')).toBeDisabled();

      // Wait for resetBtn to be re-enabled which indicates runToConvergence completed
      await page.waitForFunction(() => !document.getElementById('resetBtn').disabled, null, { timeout: 15000 });

      // After completion, UI should reflect finished state:
      await expect(page.locator('#stepBtn')).toBeDisabled();
      await expect(page.locator('#runBtn')).toBeDisabled();
      await expect(page.locator('#startBtn')).toBeEnabled();
      await expect(page.locator('#kInput')).toBeEnabled();
      await expect(page.locator('#resetBtn')).toBeEnabled();
    }, { timeout: 20000 });
  });


  test.describe('Reset transition and general sanity checks (S1_Clustering -> S0_Input, S2_Finished -> S0_Input)', () => {
    test('Reset clears points, centroids and restores initial UI state', async ({ page }) => {
      // Validates Reset event:
      // - after clustering or adding points, clicking Reset should clear canvas and restore initial UI

      // Prepare: add points and start clustering
      await page.click('#resetBtn');
      const box = await page.locator('#canvas').boundingBox();
      if (!box) throw new Error('Canvas bounding box missing');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx - 40, cy - 30);
      await page.mouse.click(cx + 40, cy - 30);
      await page.mouse.click(cx, cy + 40);
      await page.fill('#kInput', '3');
      await page.click('#startBtn');

      // Ensure we are in clustering UI state
      await expect(page.locator('#startBtn')).toBeDisabled();
      await expect(page.locator('#stepBtn')).toBeEnabled();

      // Click Reset
      await page.click('#resetBtn');

      // After reset, canvas should be cleared: sample center pixel should be transparent
      const centerPixel = await getCanvasPixelRGBA(page, cx, cy);
      expect(centerPixel[3], 'Expected canvas to be cleared (transparent) after reset').toBe(0);

      // Buttons restored to initial states
      await expect(page.locator('#startBtn')).toBeEnabled();
      await expect(page.locator('#stepBtn')).toBeDisabled();
      await expect(page.locator('#runBtn')).toBeDisabled();
      await expect(page.locator('#kInput')).toBeEnabled();
    });

    test('Reset during finished state returns to input state', async ({ page }) => {
      // Validate that if clustering finished (S2_Finished), Reset returns to input (S0_Input)

      // Prepare and force a quick convergence: add 2 points with k=2
      await page.click('#resetBtn');
      const box = await page.locator('#canvas').boundingBox();
      if (!box) throw new Error('Canvas bounding box missing');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.click(cx - 30, cy);
      await page.mouse.click(cx + 30, cy);
      await page.fill('#kInput', '2');
      await page.click('#startBtn');

      // Run to convergence
      await page.click('#runBtn');
      // Wait for run to finish
      await page.waitForFunction(() => !document.getElementById('resetBtn').disabled, null, { timeout: 15000 });

      // Verify app is in finished state UI
      await expect(page.locator('#stepBtn')).toBeDisabled();
      await expect(page.locator('#runBtn')).toBeDisabled();
      await expect(page.locator('#startBtn')).toBeEnabled();

      // Click Reset to go back to input
      await page.click('#resetBtn');

      // Now UI should be back to input state
      await expect(page.locator('#startBtn')).toBeEnabled();
      await expect(page.locator('#stepBtn')).toBeDisabled();
      await expect(page.locator('#runBtn')).toBeDisabled();
      const centerPixel = await getCanvasPixelRGBA(page, cx, cy);
      expect(centerPixel[3]).toBe(0); // cleared canvas
    }, { timeout: 20000 });
  });

  test.describe('Sanity: Console and page error observation', () => {
    test('Page should not emit ReferenceError, SyntaxError, or TypeError (observe and assert)', async ({ page }) => {
      // This test explicitly observes the console and page errors and asserts none occurred.
      // It fulfills the requirement to "observe console logs and page errors" and "let errors happen naturally".
      // If any such errors occurred during page load or interactions, the assertions will report them.

      // Wait a short while to ensure all initial scripts run
      await page.waitForTimeout(500);

      const pageErrors = page['_pageErrors'] || [];
      const consoleMessages = page['_consoleMessages'] || [];

      // Check for the presence of common runtime error types in page errors
      const hasReferenceError = pageErrors.some(e => e.message && e.message.includes('ReferenceError'));
      const hasTypeError = pageErrors.some(e => e.message && e.message.includes('TypeError'));
      const hasSyntaxError = pageErrors.some(e => e.message && e.message.includes('SyntaxError'));

      // Also check console.error messages text for those error names
      const consoleTexts = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
      const consoleHasReferenceError = consoleTexts.some(t => t.includes('ReferenceError'));
      const consoleHasTypeError = consoleTexts.some(t => t.includes('TypeError'));
      const consoleHasSyntaxError = consoleTexts.some(t => t.includes('SyntaxError'));

      // Assert that none of these errors occurred
      expect(hasReferenceError || consoleHasReferenceError, 'No ReferenceError expected').toBe(false);
      expect(hasTypeError || consoleHasTypeError, 'No TypeError expected').toBe(false);
      expect(hasSyntaxError || consoleHasSyntaxError, 'No SyntaxError expected').toBe(false);

      // Also assert that the page emitted no pageerror entries at all
      expect(pageErrors.length, `Expected no uncaught page errors, found: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    });
  });
});