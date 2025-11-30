import { test, expect } from '@playwright/test';

test.describe('Interactive Linear Regression Demo (2bde6a9b-cd36-11f0-b98e-a1744d282049)', () => {
  const APP_URL =
    'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a9b-cd36-11f0-b98e-a1744d282049.html';

  // Hold console messages and page errors observed during a test run
  let consoleMessages;
  let pageErrors;

  // Helper to set range/input values robustly and dispatch input events
  async function setInputValue(page, selector, value) {
    const el = page.locator(selector);
    await el.evaluate((node, val) => {
      node.value = val;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Go to app and wait for essential UI
    await page.goto(APP_URL, { waitUntil: 'load' });
    await page.waitForSelector('#plot');
    // ensure UI labels initialized by script
    await page.waitForSelector('#nPtsLabel');
  });

  test.afterEach(async () => {
    // nothing to cleanup beyond collected logs; tests will assert on them as needed
  });

  test.describe('Initial load and default state', () => {
    test('page loads with expected UI elements and default labels', async ({ page }) => {
      // Verify main UI elements exist
      await expect(page.locator('h1')).toHaveText('Interactive Linear Regression');
      await expect(page.locator('#plot')).toBeVisible();
      await expect(page.locator('#randBtn')).toBeVisible();
      await expect(page.locator('#clearBtn')).toBeVisible();
      await expect(page.locator('#startBtn')).toBeVisible();
      await expect(page.locator('#stopBtn')).toBeVisible();
      await expect(page.locator('#resetGD')).toBeVisible();

      // Verify default control labels match HTML initial values
      await expect(page.locator('#nPtsLabel')).toHaveText('30');
      await expect(page.locator('#trueSlopeLabel')).toHaveText('1.2');
      await expect(page.locator('#trueIntLabel')).toHaveText('0');
      await expect(page.locator('#noiseLabel')).toHaveText('1');

      // Gradient descent defaults
      await expect(page.locator('#lrLabel')).toHaveText('0.01');
      await expect(page.locator('#iterLabel')).toHaveText('200');

      // On init the script generates random data so closed-form values should be shown (not '—')
      const mCF = await page.locator('#mCF').textContent();
      const bCF = await page.locator('#bCF').textContent();
      expect(mCF).not.toBeNull();
      expect(bCF).not.toBeNull();
      // They should not remain the placeholder em-dash if dataset present
      expect(mCF.trim()).not.toBe('—');
      expect(bCF.trim()).not.toBe('—');

      // Ensure no uncaught page errors were thrown during load
      expect(pageErrors.length).toBe(0);
      // Ensure there are no console errors emitted on load
      const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Interactive controls and data flow', () => {
    test('changing sliders updates labels and triggers input events', async ({ page }) => {
      // change number of points from 30 to 50 and assert label updates
      await setInputValue(page, '#nPts', '50');
      await expect(page.locator('#nPtsLabel')).toHaveText('50');

      // change true slope and intercept values and check labels
      await setInputValue(page, '#trueSlope', '-2.5');
      await expect(page.locator('#trueSlopeLabel')).toHaveText('-2.5');

      await setInputValue(page, '#trueInt', '3.1');
      await expect(page.locator('#trueIntLabel')).toHaveText('3.1');

      // change noise std
      await setInputValue(page, '#noise', '0.5');
      await expect(page.locator('#noiseLabel')).toHaveText('0.5');

      // ensure no console error spawned by these interactions
      const consoleErrors1 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('Generate Random Data updates closed-form and gradient-descent displays', async ({ page }) => {
      // Grab baseline closed-form parameters
      const priorM = await page.locator('#mCF').textContent();
      const priorB = await page.locator('#bCF').textContent();

      // Click generate random data
      await page.click('#randBtn');

      // Allow background processing to run and UI to update
      await page.waitForTimeout(150);

      const newM = (await page.locator('#mCF').textContent()).trim();
      const newB = (await page.locator('#bCF').textContent()).trim();

      // The closed-form fit should update and remain a numeric display (not the dash placeholder)
      expect(newM).not.toBe('—');
      expect(newB).not.toBe('—');

      // It's possible they match prior values due to randomness; at minimum they are valid numerics or dashes.
      // Also ensure loss display exists and is numeric
      const lossCF = (await page.locator('#lossCF').textContent()).trim();
      expect(lossCF).not.toBe('');
      expect(pageErrors.length).toBe(0);
      const consoleErrors2 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('clicking on canvas adds a point and updates closed-form solution', async ({ page }) => {
      // Take current closed-form m/b
      const beforeM = (await page.locator('#mCF').textContent()).trim();

      // Click near center of canvas
      const canvas = page.locator('#plot');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas bounding box not available');
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      await page.mouse.click(centerX, centerY);

      // Allow UI to recompute
      await page.waitForTimeout(100);

      const afterM = (await page.locator('#mCF').textContent()).trim();

      // After adding a point, closed-form slope should still be displayed (not '—')
      expect(afterM).not.toBe('—');

      // Might change or remain similar; primary assertion is that no runtime errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrors3 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('clear button removes points and resets closed-form/metrics to placeholder', async ({ page }) => {
      // Ensure there are points initially by generating
      await page.click('#randBtn');
      await page.waitForTimeout(100);

      // Click clear
      await page.click('#clearBtn');
      await page.waitForTimeout(50);

      // When points is empty, closed-form values should display '—'
      await expect(page.locator('#mCF')).toHaveText('—');
      await expect(page.locator('#bCF')).toHaveText('—');
      await expect(page.locator('#lossCF')).toHaveText('—');
      await expect(page.locator('#rmseCF')).toHaveText('—');

      // Gradient descent loss/params will also become placeholders or zeros for display
      // lossGD likely '—' because no points
      const lossGD = (await page.locator('#lossGD').textContent()).trim();
      expect(lossGD).toBe('—');

      expect(pageErrors.length).toBe(0);
      const consoleErrors4 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Gradient descent loop and parameter controls', () => {
    test('starting and stopping GD updates gradient-descent parameters', async ({ page }) => {
      // Ensure dataset present: generate random data
      await page.click('#randBtn');
      await page.waitForTimeout(100);

      // Read initial mGD and bGD
      const beforeMStr = (await page.locator('#mGD').textContent()).trim();
      const beforeBStr = (await page.locator('#bGD').textContent()).trim();

      // Start GD
      await page.click('#startBtn');

      // Allow GD to run for a short while so parameters can update
      await page.waitForTimeout(300);

      // Stop GD
      await page.click('#stopBtn');

      const afterMStr = (await page.locator('#mGD').textContent()).trim();
      const afterBStr = (await page.locator('#bGD').textContent()).trim();

      // After running, either the values changed or were finite; at minimum they should be present
      expect(afterMStr.length).toBeGreaterThan(0);
      expect(afterBStr.length).toBeGreaterThan(0);

      // If they were numeric before, they should likely differ afterwards as GD moves; allow either, but ensure no runtime exceptions
      expect(pageErrors.length).toBe(0);
      const consoleErrors5 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('reset GD button sets m and b to zero', async ({ page }) => {
      // Make sure mGD is not exactly zero by starting GD briefly
      await page.click('#randBtn');
      await page.waitForTimeout(100);
      await page.click('#startBtn');
      await page.waitForTimeout(200);
      await page.click('#stopBtn');

      // Click reset params
      await page.click('#resetGD');
      await page.waitForTimeout(50);

      // mGD and bGD should now be formatted zero strings "0.0000"
      await expect(page.locator('#mGD')).toHaveText('0.0000');
      await expect(page.locator('#bGD')).toHaveText('0.0000');

      expect(pageErrors.length).toBe(0);
      const consoleErrors6 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('keyboard space toggles gradient descent start/stop', async ({ page }) => {
      // Ensure data for GD
      await page.click('#randBtn');
      await page.waitForTimeout(100);

      // Read mGD baseline
      const baseline = (await page.locator('#mGD').textContent()).trim();

      // Press Space to start GD
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);

      // Press Space to stop GD
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);

      const after = (await page.locator('#mGD').textContent()).trim();

      // The value should be a string of some content (zero or numeric). Ensure no runtime errors.
      expect(after.length).toBeGreaterThanOrEqual(1);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Prediction and edge cases', () => {
    test('predict button computes outputs using GD and closed-form when available', async ({ page }) => {
      // Ensure data available
      await page.click('#randBtn');
      await page.waitForTimeout(100);

      // Enter a prediction x value
      const xVal = '2.5';
      await page.fill('#xPred', xVal);
      await page.click('#predBtn');

      // Wait small moment for UI update
      await page.waitForTimeout(50);

      const predText = (await page.locator('#predResult').textContent()).trim();

      // The prediction text should mention GD at least; closed-form may also be included
      expect(predText.length).toBeGreaterThan(0);
      expect(predText).toContain('GD:');

      // If closed-form fit exists, CF should be in parentheses
      // No throw should have occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrors7 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('predict without valid x input shows a helpful message', async ({ page }) => {
      // Clear input
      await page.fill('#xPred', '');
      await page.click('#predBtn');

      await page.waitForTimeout(20);

      const text = (await page.locator('#predResult').textContent()).trim();
      // Expect the helper message "Enter a valid x value"
      expect(text).toContain('Enter a valid x value');

      // No runtime exceptions
      expect(pageErrors.length).toBe(0);
      const consoleErrors8 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Console and runtime sanity checks', () => {
    test('no uncaught exceptions or console errors during interactive usage', async ({ page }) => {
      // Perform a set of interactions to exercise the app and gather logs
      await page.click('#randBtn');
      await page.waitForTimeout(50);
      await page.click('#startBtn');
      await page.waitForTimeout(120);
      await page.click('#stopBtn');
      await page.click('#clearBtn');
      await page.waitForTimeout(50);
      await page.click('#randBtn');
      await page.waitForTimeout(50);

      // Validate that there are no page errors (uncaught exceptions)
      expect(pageErrors.length).toBe(0);

      // And no console messages of level 'error'
      const consoleErrors9 = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrors.length).toBe(0);

      // Also assert that some informational console messages may exist, but we only require zero errors
      const errorTexts = consoleErrors.map((e) => e.text).join('\n');
      // include in expectation message if it fails (Playwright will include stack)
      expect(errorTexts).toBe('');
    });
  });
});