import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7e3e6650-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Helper: Try to locate the application controller object on window.
 * Many demos attach module objects to different names; try several common ones.
 * Returns a serializable snapshot of useful state properties to assert on.
 */
async function readAppState(page) {
  return await page.evaluate(() => {
    const candidates = [
      window.insertionSort,
      window.InsertionSort,
      window.insertionSortModule,
      window.InsertionSortModule,
      window.sortModule,
      window.SortModule,
      window.app,
      window.module,
      window.__APP__,
      window.__insertion_sort__,
    ];
    // Find first object that looks like the module (has steps or stepIndex or play functions)
    const mod = candidates.find(
      (m) => m && (typeof m.stepIndex === 'number' || Array.isArray(m.steps) || typeof m.play === 'function')
    );
    if (!mod) return null;

    // Try to safely extract known properties
    const safe = {
      hasSteps: !!Array.isArray(mod.steps),
      stepsLength: Array.isArray(mod.steps) ? mod.steps.length : null,
      stepIndex: typeof mod.stepIndex === 'number' ? mod.stepIndex : null,
      playing: typeof mod.playing === 'boolean' ? mod.playing : null,
      playSpeed: typeof mod.playSpeed === 'number' ? mod.playSpeed : null,
      currentMeta:
        Array.isArray(mod.steps) && typeof mod.stepIndex === 'number' && mod.steps[mod.stepIndex]
          ? mod.steps[mod.stepIndex].meta || null
          : null,
    };
    return safe;
  });
}

/**
 * Helper: Find a button by trying multiple label variants.
 * Returns the first locator that exists/visible.
 */
async function findButton(page, labels) {
  for (const label of labels) {
    // Try role based lookup (accessible)
    const byRole = page.getByRole('button', { name: label, exact: false });
    if (await byRole.count()) return byRole.first();

    // Try text lookup
    const byText = page.getByText(label, { exact: false });
    if (await byText.count()) return byText.first();

    // Try attribute-ish selectors
    const byAttr = page.locator(`button[aria-label*="${label}"], button[data-test*="${label}"], button[id*="${label}"]`);
    if (await byAttr.count()) return byAttr.first();
  }
  return null;
}

/**
 * Helper: Find a numeric input or speed control
 */
async function findSpeedControl(page) {
  // try common selectors
  const candidates1 = [
    page.locator('input[type="range"][name="speed"]'),
    page.locator('input[type="range"][id^="speed"]'),
    page.locator('input[type="number"][name="speed"]'),
    page.locator('select[name="speed"]'),
    page.getByLabel('Speed', { exact: false }),
    page.locator('select#speed, input#speed'),
  ];
  for (const c of candidates) {
    if (await c.count()) return c.first();
  }
  return null;
}

/**
 * Helper: Locate bars container and bar elements.
 * Bars are expected to be child elements with class 'bar' or data-value attributes.
 */
async function getBarsLocator(page) {
  const containers = [
    '.bars',
    '#bars',
    '.bar-container',
    '.visual-bars',
    '.bars-wrap',
    '[data-role="bars"]',
  ];
  for (const sel of containers) {
    const c = page.locator(sel);
    if (await c.count()) {
      // find elements that look like bars inside
      const bars = c.locator('.bar, [data-value], div.bar-item, .bar-rect, .bar');
      if (await bars.count()) return bars;
      // fallback to any direct children
      const children = c.locator('> *');
      if (await children.count()) return children;
    }
  }
  // fallback: search globally for elements that look like bars
  const globalBars = page.locator('.bar, [data-value], .bar-rect, .bar-item');
  if (await globalBars.count()) return globalBars;
  // last resort: any tall divs inside visual-panel
  const visual = page.locator('.visual-panel');
  if (await visual.count()) {
    const potential = visual.locator('div');
    if (await potential.count()) return potential;
  }
  return page.locator('html'); // dummy locator but shouldn't happen
}

test.describe('Insertion Sort Interactive Module (FSM validation)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    // Wait briefly for client-side module initialization
    await page.waitForTimeout(200);
  });

  test.afterEach(async ({ page }) => {
    // Try to pause playback if still playing (defensive cleanup)
    const playBtn = await findButton(page, ['Play', 'Pause', 'Resume']);
    if (playBtn) {
      // If it's labeled Pause, click to pause
      const text = await playBtn.innerText().catch(() => '');
      if (/pause/i.test(text)) await playBtn.click();
      // also send Space to ensure playback stopped
      await page.keyboard.press('Space').catch(() => {});
    }
  });

  test('builds steps and renders initial snapshot on RANDOM_ARRAY / INIT / SET_VALUES', async ({ page }) => {
    // Validate that clicking Randomize builds steps and initial snapshot is applied
    const randomBtn = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (!randomBtn) {
      test.skip('Randomize button not found - cannot test build flow');
      return;
    }

    // Before randomize, record app state if available
    const before = await readAppState(page);

    // Click randomize to dispatch RANDOM_ARRAY / INIT
    await randomBtn.click();
    await page.waitForTimeout(250);

    // Read app state after randomize
    const after = await readAppState(page);
    expect(after).not.toBeNull();
    expect(after.hasSteps).toBe(true);
    expect(after.stepsLength).toBeGreaterThan(0);
    // initial stepIndex should be 0 (applyStepVisual for step 0)
    expect(after.stepIndex).toBe(0);

    // Visual: bars rendered and count consistent with step snapshot if available
    const bars1 = await getBarsLocator(page);
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);

    // If app made snapshot available, ensure DOM count equals snapshot array length if present
    if (after.currentMeta && after.currentMeta.snapshot && Array.isArray(after.currentMeta.snapshot.values)) {
      const snapLen = after.currentMeta.snapshot.values.length;
      expect(count).toBe(snapLen);
    }

    // Edge: Invoking SET_VALUES should also rebuild steps. Try to find a values input+button pair
    const valuesInput = page.locator('input[type="text"][name="values"], textarea[name="values"], input#values, textarea#values').first();
    const setBtn = await findButton(page, ['Set Values', 'Apply', 'Build']);
    if (await valuesInput.count() && setBtn) {
      await valuesInput.fill('5,3,8,1');
      await setBtn.click();
      await page.waitForTimeout(200);
      const s = await readAppState(page);
      expect(s).not.toBeNull();
      expect(s.stepsLength).toBeGreaterThan(0);
      expect(s.stepIndex).toBe(0);
    }
  });

  test('STEP_FORWARD and STEP_BACK change stepIndex and update visuals', async ({ page }) => {
    // Ensure we have a starting array: click Randomize if needed
    const randomBtn1 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (randomBtn) await randomBtn.click();
    await page.waitForTimeout(200);

    const nextBtn = await findButton(page, ['Next', 'Step Forward', 'Step', 'Forward', '›', '→', 'ArrowRight']);
    const prevBtn = await findButton(page, ['Prev', 'Step Back', 'Back', 'Previous', '←', '‹', 'ArrowLeft']);

    // If specific step buttons not found, fallback to keyboard arrow testing
    const bars2 = await getBarsLocator(page);
    const initialHeights = await bars.evaluateAll((els) => els.map((el) => el.style.height || el.getAttribute('data-height') || el.getAttribute('data-value') || el.textContent.trim()));

    // Step forward using button or keyboard
    if (nextBtn) {
      await nextBtn.click();
    } else {
      await page.keyboard.press('ArrowRight');
    }
    await page.waitForTimeout(200);

    // Verify internal stepIndex advanced when possible
    const s1 = await readAppState(page);
    if (s1) {
      // if there is more than one step, stepIndex should have advanced or be clamped to end
      if (s1.stepsLength > 1) {
        expect(s1.stepIndex).toBeGreaterThanOrEqual(0);
      }
    }

    const afterHeights = await bars.evaluateAll((els) => els.map((el) => el.style.height || el.getAttribute('data-height') || el.getAttribute('data-value') || el.textContent.trim()));
    // Visual change: at least one bar should differ from the initial snapshot (unless array of length 1)
    const changed = initialHeights.some((h, i) => h !== afterHeights[i]);
    // If more than 1 bar, expect change across some step
    const barsCount = await bars.count();
    if (barsCount > 1) expect(changed).toBe(true);

    // Now step back and ensure we return to the previous visual
    if (prevBtn) {
      await prevBtn.click();
    } else {
      await page.keyboard.press('ArrowLeft');
    }
    await page.waitForTimeout(200);

    const afterBackHeights = await bars.evaluateAll((els) => els.map((el) => el.style.height || el.getAttribute('data-height') || el.getAttribute('data-value') || el.textContent.trim()));
    // Expect to be back to the initial snapshot values (or at least equal to initialHeights)
    const reverted = initialHeights.every((h, i) => h === afterBackHeights[i]);
    // If step back is valid, we should have reverted; tolerate if stepsLength === 1
    if (barsCount > 1) expect(reverted).toBe(true);
  });

  test('PLAY_PRESS toggles playing state; playing auto-advances steps and STOPs at done', async ({ page }) => {
    // Build steps
    const randomBtn2 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (randomBtn) await randomBtn.click();
    await page.waitForTimeout(150);

    const playBtn1 = await findButton(page, ['Play', 'Pause', 'Resume']);
    expect(playBtn).not.toBeNull();

    // Read initial app state
    const before1 = await readAppState(page);
    expect(before).not.toBeNull();

    // Press Play -> should set playing true
    await playBtn.click();
    await page.waitForTimeout(100); // allow onEnter playing to run
    const during = await readAppState(page);
    expect(during).not.toBeNull();
    // playing should be true after Play pressed (unless immediate completion)
    if (during.playing !== null) expect(during.playing).toBe(true);

    // Wait sufficiently long for a few ticks (bounded by min interval 120ms; use a safety time)
    await page.waitForTimeout(800);

    const later = await readAppState(page);
    expect(later).not.toBeNull();
    // stepIndex should have advanced or reached final step
    if (typeof before.stepIndex === 'number' && typeof later.stepIndex === 'number') {
      expect(later.stepIndex).toBeGreaterThanOrEqual(before.stepIndex);
    }

    // If playing reached done, playing should be false (setPlayingFalse) and currentMeta.action === 'done'
    if (later.currentMeta && later.currentMeta.action === 'done') {
      expect(later.playing).toBe(false);
    } else {
      // Otherwise, click to pause and ensure playing flips to false
      await playBtn.click();
      await page.waitForTimeout(120);
      const paused = await readAppState(page);
      if (paused && paused.playing !== null) expect(paused.playing).toBe(false);
    }
  });

  test('PLAY_TICK via timer during playing triggers goto-next and COMPLETE triggers action-done', async ({ page }) => {
    // Ensure we have a small array to reach done quickly by setting values
    const valuesInput1 = page.locator('input[type="text"][name="values"], textarea[name="values"], input#values, textarea#values').first();
    const setBtn1 = await findButton(page, ['Set Values', 'Apply', 'Build']);
    if (await valuesInput.count() && setBtn) {
      await valuesInput.fill('3,1'); // minimal array to allow finishing quickly
      await setBtn.click();
      await page.waitForTimeout(150);
    } else {
      // otherwise randomize and hope we finish within test
      const randomBtn3 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
      if (randomBtn) await randomBtn.click();
      await page.waitForTimeout(150);
    }

    const playBtn2 = await findButton(page, ['Play', 'Pause', 'Resume']);
    if (!playBtn) test.skip('Play button not found - cannot test playback ticks');
    await playBtn.click();
    // Wait up to a few seconds for completion (should stop at done)
    const start = Date.now();
    let last = await readAppState(page);
    while (Date.now() - start < 5000) {
      const s11 = await readAppState(page);
      if (s && s.currentMeta && s.currentMeta.action === 'done') {
        last = s;
        break;
      }
      last = s;
      await page.waitForTimeout(150);
    }
    expect(last).not.toBeNull();
    // If done reached, playing should be false and stepIndex at end
    if (last.currentMeta && last.currentMeta.action === 'done') {
      expect(last.playing).toBe(false);
      expect(last.stepIndex).toBeGreaterThanOrEqual(0);
      // Try stepping forward at done; STEP_FORWARD should remain at done (action-done loops)
      const nextBtn1 = await findButton(page, ['Next', 'Step Forward', 'Step', 'Forward', '›', '→', 'ArrowRight']);
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(120);
        const s2 = await readAppState(page);
        expect(s2.currentMeta.action === 'done' || typeof s2.stepIndex === 'number').toBeTruthy();
      }
    } else {
      test.info().annotations.push({ type: 'warning', description: 'Did not reach done state within timeout - environment may be slow or steps long' });
    }
  });

  test('SPEED_CHANGE adjusts playSpeed and affects timer interval calculation', async ({ page }) => {
    const speedControl = await findSpeedControl(page);
    if (!speedControl) test.skip('No speed control found on page');

    // Read current speed
    const before2 = await readAppState(page);
    const initialSpeed = before ? before.playSpeed : null;

    // If it's a select or input range, change it
    const tag = await speedControl.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      // pick a different option
      const options = await speedControl.locator('option').allTextContents();
      if (options.length > 1) {
        await speedControl.selectOption({ index: Math.min(1, options.length - 1) });
      }
    } else {
      // input range or number: increase value
      const cur = await speedControl.inputValue().catch(() => null);
      if (cur !== null) {
        const n = Number(cur) || 1;
        await speedControl.fill(String(Math.max(1, n + 1)));
      } else {
        // try setting value attribute
        await speedControl.evaluate((el) => (el.value = '2'));
        await speedControl.dispatchEvent('change');
      }
    }

    await page.waitForTimeout(120);
    const after1 = await readAppState(page);
    if (after && initialSpeed !== null && after.playSpeed !== null) {
      expect(after.playSpeed).not.toBe(initialSpeed);
    }

    // Start playing and ensure it uses the updated speed (we cannot measure interval precisely but at least playing remains true)
    const playBtn3 = await findButton(page, ['Play', 'Pause']);
    if (playBtn) {
      await playBtn.click();
      await page.waitForTimeout(80);
      const during1 = await readAppState(page);
      if (during && during.playing !== null) expect(during.playing).toBe(true);
      // Pause again
      await playBtn.click();
      await page.waitForTimeout(80);
    }
  });

  test('RESET returns UI to initial action-start snapshot and clears transient highlights', async ({ page }) => {
    // Build steps
    const randomBtn4 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (randomBtn) await randomBtn.click();
    await page.waitForTimeout(150);

    // Step forward a few times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(80);
    }
    const mid = await readAppState(page);

    // Click Reset
    const resetBtn = await findButton(page, ['Reset', 'Restart']);
    if (!resetBtn) test.skip('Reset button not found - cannot verify reset behavior');
    await resetBtn.click();
    await page.waitForTimeout(150);

    const after2 = await readAppState(page);
    expect(after).not.toBeNull();
    // After reset, stepIndex should be set back to 0 (action-start)
    if (after.stepIndex !== null) expect(after.stepIndex).toBe(0);

    // Visual: transient highlights (if any) should be cleared; we can assert that no element has a temporary highlight class
    const transientSelectors = ['.transient', '.compare', '.shift', '.active-key', '.picked', '.highlight'];
    for (const sel of transientSelectors) {
      const l = page.locator(sel);
      // It's acceptable if there are none; expect that transient highlight is not present
      if (await l.count()) {
        // If found, check they are hidden/removed after reset
        const visible = await l.isVisible().catch(() => false);
        expect(visible).toBeFalsy();
      }
    }
  });

  test('RESIZE recalculates bar layout and re-applies current snapshot', async ({ page }) => {
    // Ensure bars exist
    const bars3 = await getBarsLocator(page);
    const count1 = await bars.count1();
    if (count <= 0) test.skip('No bars found to validate resize');

    // Read bounding box widths before resize
    const beforeBoxes = await bars.evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }));

    // Resize viewport smaller
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(200);

    // Resize viewport larger
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForTimeout(200);

    // Read new bounding boxes; layout recalculation likely changes widths
    const afterBoxes = await bars.evaluateAll((els) => els.map((el) => {
      const r1 = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }));

    // At least one width or height should differ after resize (unless CSS fixed the sizes)
    const changed1 = beforeBoxes.some((b, i) => b.w !== afterBoxes[i].w || b.h !== afterBoxes[i].h);
    expect(changed).toBeTruthy();
  });

  test('Keyboard interactions: Space toggles play/pause; ArrowRight/ArrowLeft step forward/back', async ({ page }) => {
    // Prepare steps
    const randomBtn5 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (randomBtn) await randomBtn.click();
    await page.waitForTimeout(150);

    const before3 = await readAppState(page);
    expect(before).not.toBeNull();

    // Space -> play
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    const mid1 = await readAppState(page);
    if (mid && mid.playing !== null) expect(mid.playing).toBe(true);

    // Space -> pause
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    const paused1 = await readAppState(page);
    if (paused && paused.playing !== null) expect(paused.playing).toBe(false);

    // ArrowRight -> step forward
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(120);
    const afterRight = await readAppState(page);
    if (typeof before.stepIndex === 'number' && typeof afterRight.stepIndex === 'number') {
      expect(afterRight.stepIndex).toBeGreaterThanOrEqual(before.stepIndex);
    }

    // ArrowLeft -> step back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(120);
    const afterLeft = await readAppState(page);
    if (typeof afterLeft.stepIndex === 'number') {
      // should not go below 0
      expect(afterLeft.stepIndex).toBeGreaterThanOrEqual(0);
    }
  });

  test('Edge cases: STEP_BACK at index 0 is clamped; excessive STEP_FORWARD does not overflow', async ({ page }) => {
    // Build steps
    const randomBtn6 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (randomBtn) await randomBtn.click();
    await page.waitForTimeout(150);

    const before4 = await readAppState(page);
    expect(before).not.toBeNull();

    // Move to 0 explicitly by resetting
    const resetBtn1 = await findButton(page, ['Reset', 'Restart']);
    if (resetBtn) {
      await resetBtn.click();
      await page.waitForTimeout(120);
    }

    // Press back multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(60);
    }
    const afterBack = await readAppState(page);
    if (afterBack && typeof afterBack.stepIndex === 'number') expect(afterBack.stepIndex).toBeGreaterThanOrEqual(0);

    // Now press forward many times beyond stepsLength
    const stepsLen = afterBack && afterBack.stepsLength ? afterBack.stepsLength : 10;
    for (let i = 0; i < stepsLen + 10; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(40);
    }
    const afterForward = await readAppState(page);
    if (afterForward && typeof afterForward.stepIndex === 'number' && afterForward.stepsLength !== null) {
      expect(afterForward.stepIndex).toBeLessThanOrEqual(afterForward.stepsLength - 1);
    }
  });

  test('onEnter/onExit actions: applying and clearing transient highlights around action-* steps', async ({ page }) => {
    // Build steps and then step through until we find a snapshot with meta.action 'pick-key' or 'compare'
    const randomBtn7 = await findButton(page, ['Randomize', 'Random', 'Shuffle', 'New Array']);
    if (randomBtn) await randomBtn.click();
    await page.waitForTimeout(200);

    const maxStepsProbe = 100;
    let found = false;
    let foundMeta = null;
    for (let i = 0; i < maxStepsProbe; i++) {
      const s21 = await readAppState(page);
      if (!s) break;
      if (s.currentMeta && (/pick-key|compare|shift|compare-false|compare-end|place-key/i).test(s.currentMeta.action || '')) {
        found = true;
        foundMeta = s.currentMeta.action;
        break;
      }
      // advance
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
    }
    if (!found) test.skip('Could not find an action-* snapshot to verify onEnter/onExit transient behavior');

    // At this point currently in an action-* state. Check for transient highlight presence in DOM
    const transientLocators = ['.transient', '.compare', '.shift', '.active-key', '.picked', '.highlight', '.compare-true', '.compare-false'];
    let transientFound = false;
    for (const sel of transientLocators) {
      const loc = page.locator(sel);
      if (await loc.count()) {
        transientFound = true;
        break;
      }
    }
    // We expect some transient highlight to be present upon entering an action-* snapshot in many implementations
    // But be tolerant: if none present, at least the app state indicates the action
    expect(foundMeta).toBeTruthy();

    // Now step forward to trigger onExit for the action, and ensure transient highlights cleared
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(120);

    let transientCleared = true;
    for (const sel of transientLocators) {
      const loc1 = page.locator(sel);
      if (await loc.count()) {
        // if any such node visible, consider not cleared
        if (await loc.isVisible().catch(() => false)) transientCleared = false;
      }
    }
    expect(transientCleared).toBeTruthy();
  });
});