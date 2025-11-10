import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7c48b0d0-bcb0-11f0-95d9-c98d28730c93.html';

// Helper utilities to find UI elements robustly across possible DOM variants
async function findButton(page, labelRegex, fallbackSelectors = []) {
  // Try accessible role first
  const byRole = page.getByRole('button', { name: labelRegex });
  if (await byRole.count() > 0) return byRole.first();

  // Try fallback selectors
  for (const sel of fallbackSelectors) {
    const loc = page.locator(sel);
    if (await loc.count() > 0) return loc.first();
  }

  // As last resort try any button containing the text
  const contains = page.locator('button', { hasText: labelRegex });
  if (await contains.count() > 0) return contains.first();

  throw new Error(`Button not found for ${labelRegex}`);
}

async function findNumberInput(page) {
  // try common possibilities
  const candidates = [
    page.getByRole('spinbutton'), // number input
    page.locator('input[type="number"]'),
    page.locator('input[name="n"]'),
    page.locator('input[id*="n"]'),
    page.locator('input[placeholder*="n"]'),
    page.locator('input'),
  ];
  for (const loc of candidates) {
    try {
      if (await loc.count() > 0) return loc.first();
    } catch (e) { /* ignore */ }
  }
  throw new Error('Number input not found');
}

async function findStackContainer(page) {
  const selectors = ['#stack', '.stack', '[data-test="stack"]', '[aria-label*="stack"]', '[id*="stack"]'];
  for (const sel of selectors) {
    const loc1 = page.locator(sel);
    if (await loc.count() > 0) return loc.first();
  }
  // fallback to something that looks like a visual area on the right
  const possible = page.locator('[class*="call"], [class*="Stack"], [class*="stack"]');
  if (await possible.count() > 0) return possible.first();
  return null;
}

async function findTraceContainer(page) {
  const selectors1 = ['#trace', '.trace', '[data-test="trace"]', '[aria-label*="trace"]', '[id*="trace"]'];
  for (const sel of selectors) {
    const loc2 = page.locator(sel);
    if (await loc.count() > 0) return loc.first();
  }
  const possible1 = page.locator('[class*="trace"], [id*="trace"]');
  if (await possible.count() > 0) return possible.first();
  return null;
}

async function findStatusElement(page) {
  const selectors2 = ['#status', '.status', '[data-test="status"]', '[aria-label*="status"]', '[id*="status"]'];
  for (const sel of selectors) {
    const loc3 = page.locator(sel);
    if (await loc.count() > 0) return loc.first();
  }
  // try any small muted text area
  const alt = page.locator('text=/step|status|ready|done/i');
  if (await alt.count() > 0) return alt.first();
  return null;
}

async function findSpeedSlider(page) {
  const candidates1 = [
    page.locator('input[type="range"]'),
    page.locator('#speedSlider'),
    page.locator('input[name="speed"]'),
    page.locator('[data-test="speed"]'),
  ];
  for (const loc of candidates) {
    if (await loc.count() > 0) return loc.first();
  }
  return null;
}

async function findFloatingElement(page) {
  // common class substrings used for floating return badges
  const sel = page.locator('[class*=float], [class*=floating], [class*=badge], [data-floating]');
  if (await sel.count() > 0) {
    // return first visible match
    const count = await sel.count();
    for (let i = 0; i < count; i++) {
      const candidate = sel.nth(i);
      if (await candidate.isVisible()) return candidate;
    }
  }
  return null;
}

// Utility to read a numeric step index from status text - flexible
function parseStepFromStatus(text) {
  if (!text) return null;
  // Try patterns like "Step 3", "step: 3 / 7", "3 / 7"
  const m1 = text.match(/step\s*[:\-]?\s*(\d+)/i);
  if (m1) return Number(m1[1]);
  const m2 = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (m2) return Number(m2[1]);
  const m3 = text.match(/^\s*(\d+)\s*$/);
  if (m3) return Number(m3[1]);
  return null;
}

// Poll until status indicates at least provided step or timeout
async function waitForStepAtLeast(page, targetStep, statusEl, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const txt = statusEl ? await statusEl.innerText() : await page.textContent('body');
    const current = parseStepFromStatus(txt);
    if (current !== null && current >= targetStep) return current;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timeout waiting for step >= ${targetStep}`);
}

test.describe('Recursion — Call Stack Explorer (FSM validation)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // small wait for any initial scripts
    await page.waitForLoadState('networkidle');
  });

  test('Idle state on initial load: no snapshots, controls available but no trace/stack entries', async ({ page }) => {
    // Verify number input exists
    const input = await findNumberInput(page);
    expect(input).toBeTruthy();

    // Run button should be present
    const btnRun = await findButton(page, /run/i, ['#btnRun', '[data-test="run"]']);
    expect(btnRun).toBeTruthy();

    // Trace and stack should be empty / not populated
    const trace = await findTraceContainer(page);
    if (trace) {
      const entries = await trace.locator('*').count();
      expect(entries).toBe(0);
    }

    const stack = await findStackContainer(page);
    if (stack) {
      // expect no frames visible
      const frames = await stack.locator('.frame, .stack-frame, [data-test="frame"], li').count();
      expect(frames).toBe(0);
    }

    // STEP and PLAY toggles should not crash when no snapshots exist.
    // Find step/back/play and click them and assert still idle (no entries)
    const btnStep = await findButton(page, /step forward|step ▶|step/i, ['#btnStep', '[data-test="step"]']).catch(() => null);
    const btnBack = await findButton(page, /back|step back|previous/i, ['#btnBack', '[data-test="back"]']).catch(() => null);
    const btnPlay = await findButton(page, /play|pause|▶|■/i, ['#btnPlay', '[data-test="play"]']).catch(() => null);

    if (btnStep) await btnStep.click();
    if (btnBack) await btnBack.click();
    if (btnPlay) await btnPlay.click();

    // Still no trace entries
    if (trace) {
      const entriesAfter = await trace.locator('*').count();
      expect(entriesAfter).toBe(0);
    }
  });

  test.describe('RUN transitions and paused state behaviors', () => {
    test('RUN via Run button builds snapshots and shows initial UI at step 0', async ({ page }) => {
      const input1 = await findNumberInput(page);
      await input.fill('4');

      const btnRun1 = await findButton(page, /run/i, ['#btnRun1', '[data-test="run"]']);
      await btnRun.click();

      // After RUN, there should be trace entries and step index = 0 in status
      const trace1 = await findTraceContainer(page);
      expect(trace).toBeTruthy();
      // trace should contain at least one child (intro trace entry)
      await expect(trace.locator('*')).toHaveCountGreaterThan(0);

      const status = await findStatusElement(page);
      expect(status).toBeTruthy();
      const txt1 = await status.innerText();
      const step = parseStepFromStatus(txt);
      expect(step).not.toBeNull();
      expect(step).toBe(0);
    });

    test('RUN via Enter key triggers same behavior and clamps input values', async ({ page }) => {
      const input2 = await findNumberInput(page);
      // Enter very large value to test clamping
      await input.fill('999');
      await input.press('Enter');

      // UI should update to step 0 as with RUN
      const status1 = await findStatusElement(page);
      expect(status).toBeTruthy();
      const txt2 = await status.innerText();
      const step1 = parseStepFromStatus(txt);
      expect(step).toBe(0);

      // Also validate that runtime clamps to <=12 if the UI exposes max or snapshot count is reasonable.
      // We can't rely on exact count, but there should be more than 0 trace entries.
      const trace2 = await findTraceContainer(page);
      if (trace) {
        const entries1 = await trace.locator('*').count();
        expect(entries).toBeGreaterThan(0);
      }
    });

    test('STEP_FORWARD and STEP_BACK update UI and maintain paused state', async ({ page }) => {
      const input3 = await findNumberInput(page);
      await input.fill('3');
      const btnRun2 = await findButton(page, /run/i, ['#btnRun2', '[data-test="run"]']);
      await btnRun.click();

      const btnStep1 = await findButton(page, /step forward|step ▶|step/i, ['#btnStep1', '[data-test="step"]']);
      const btnBack1 = await findButton(page, /back|step back|previous/i, ['#btnBack1', '[data-test="back"]']);

      const status2 = await findStatusElement(page);
      expect(status).toBeTruthy();

      const before = parseStepFromStatus(await status.innerText());
      expect(before).toBe(0);

      // Advance one step
      if (!btnStep) throw new Error('Step button not found for STEP_FORWARD test');
      await btnStep.click();

      // New status should reflect step 1
      await waitForStepAtLeast(page, 1, status);

      // Step back
      if (!btnBack) throw new Error('Back button not found for STEP_BACK test');
      await btnBack.click();

      // Back to 0
      await waitForStepAtLeast(page, 0, status);
      const currentTxt = await status.innerText();
      const current1 = parseStepFromStatus(currentTxt);
      expect(current).toBe(0);
    });

    test('Code highlight and trace entry effects occur on updateUI (pulse and trace animation)', async ({ page }) => {
      const input4 = await findNumberInput(page);
      await input.fill('3');
      const btnRun3 = await findButton(page, /run/i, ['#btnRun3', '[data-test="run"]']);
      await btnRun.click();

      // After running there should be some element with a "pulse" class briefly added by renderCodeHighlight
      // We check for existence of any element with class including 'pulse'
      const pulse = page.locator('[class*="pulse"]');
      // It may be added then removed quickly, so wait briefly for it to appear
      await page.waitForTimeout(200);
      const hasPulse = (await pulse.count()) > 0;
      expect(hasPulse).toBe(true);
    });
  });

  test.describe('PLAYING state, TIMER_TICK, SPEED_CHANGE and DONE', () => {
    test('PLAY_TOGGLE starts playing (Play->Pause) and TIMER_TICK advances steps', async ({ page }) => {
      const input5 = await findNumberInput(page);
      await input.fill('4');
      const btnRun4 = await findButton(page, /run/i, ['#btnRun4', '[data-test="run"]']);
      await btnRun.click();

      const btnPlay1 = await findButton(page, /play|pause|▶|■/i, ['#btnPlay1', '[data-test="play"]']);
      if (!btnPlay) throw new Error('Play button not found');

      // Start playing
      await btnPlay.click();

      // Play button text should change to indicate Pause
      const btnText = await btnPlay.innerText();
      expect(/pause|■/i.test(btnText)).toBe(true);

      // Verify timer tick advances step index (wait for step >= 1)
      const status3 = await findStatusElement(page);
      await waitForStepAtLeast(page, 1, status, 8000);

      // Change speed slider while playing to test SPEED_CHANGE handling
      const slider = await findSpeedSlider(page);
      if (slider) {
        // Change the value. We don't know exact min/max; set to middle using evaluate
        await slider.evaluate((el) => {
          if (el.max) {
            el.value = Math.max(1, Math.floor((Number(el.max) - Number(el.min || 0)) / 2));
            el.dispatchEvent(new Event('input'));
            el.dispatchEvent(new Event('change'));
          } else {
            el.value = 50;
            el.dispatchEvent(new Event('input'));
            el.dispatchEvent(new Event('change'));
          }
        });
        // After speed change, playing should continue (button still Pause)
        const afterTxt = await btnPlay.innerText();
        expect(/pause|■/i.test(afterTxt)).toBe(true);

        // Ensure additional ticks continue (wait for at least step 2)
        await waitForStepAtLeast(page, 2, status, 8000);
      }

      // Pause playback to clean up
      await btnPlay.click();
      const pausedTxt = await btnPlay.innerText();
      expect(/play|▶/i.test(pausedTxt)).toBe(true);
    });

    test('Automatic play reaches DONE state and play button resets to Play', async ({ page }) => {
      // Use a small n to reach done quickly
      const input6 = await findNumberInput(page);
      await input.fill('2');
      const btnRun5 = await findButton(page, /run/i, ['#btnRun5', '[data-test="run"]']);
      await btnRun.click();

      const btnPlay2 = await findButton(page, /play|pause|▶|■/i, ['#btnPlay2', '[data-test="play"]']);
      if (!btnPlay) throw new Error('Play button not found');

      // Start playing
      await btnPlay.click();

      // Wait up to 8s for play to reach done (play button should go back to Play)
      const start1 = Date.now();
      let done = false;
      while (Date.now() - start < 10000) {
        const txt3 = await btnPlay.innerText();
        if (/play|▶/i.test(txt)) { done = true; break; }
        await page.waitForTimeout(100);
      }
      expect(done).toBe(true);

      // Status should indicate a final step (non-null)
      const status4 = await findStatusElement(page);
      const statusTxt = status ? await status.innerText() : '';
      const step2 = parseStepFromStatus(statusTxt);
      expect(step).not.toBeNull();

      // Pressing Play from done may briefly start then return to done; ensure it does not throw
      await btnPlay.click();
      // allow a short window for any immediate stop
      await page.waitForTimeout(500);
      const finalTxt = await btnPlay.innerText();
      expect(/play|▶/i.test(finalTxt)).toBe(true);
    });
  });

  test.describe('ANIMATING_RETURN transient state and floating badge behavior', () => {
    test('Manual STEP_FORWARD over a pop snapshot triggers floating return animation and ANIMATION_END', async ({ page }) => {
      // Using n=3 provides some pops during stepping
      const input7 = await findNumberInput(page);
      await input.fill('3');
      const btnRun6 = await findButton(page, /run/i, ['#btnRun6', '[data-test="run"]']);
      await btnRun.click();

      const btnStep2 = await findButton(page, /step forward|step ▶|step/i, ['#btnStep2', '[data-test="step"]']);
      if (!btnStep) throw new Error('Step button not found');

      const status5 = await findStatusElement(page);
      expect(status).toBeTruthy();

      // We'll step forward repeatedly and check for the floating element appearing.
      let floatingFound = false;
      const maxSteps = 20; // safety to avoid infinite loops
      for (let i = 0; i < maxSteps; i++) {
        await btnStep.click();
        // brief wait for animation to be created if this was a pop
        await page.waitForTimeout(150);
        const floating = await findFloatingElement(page);
        if (floating) {
          floatingFound = true;
          // assert it's visible
          expect(await floating.isVisible()).toBe(true);

          // Wait for the floating element to be removed as ANIMATION_END effect (~900-1500ms)
          // Give generous timeout
          await page.waitForTimeout(1600);
          const floatingAfter = await findFloatingElement(page);
          // By ANIMATION_END the element should be gone or not visible
          if (floatingAfter) {
            expect(await floatingAfter.isVisible()).toBe(false);
          }
          break;
        }
      }
      expect(floatingFound).toBe(true);
    });

    test('Playing mode triggers animating_return on pop snapshots and then continues', async ({ page }) => {
      // Use n=4 to include multiple pops while playing
      const input8 = await findNumberInput(page);
      await input.fill('4');
      const btnRun7 = await findButton(page, /run/i, ['#btnRun7', '[data-test="run"]']);
      await btnRun.click();

      const btnPlay3 = await findButton(page, /play|pause|▶|■/i, ['#btnPlay3', '[data-test="play"]']);
      if (!btnPlay) throw new Error('Play button not found');

      const status6 = await findStatusElement(page);

      // Start playing
      await btnPlay.click();
      // Wait until at least one step advanced
      await waitForStepAtLeast(page, 1, status, 8000);

      // Poll for a floating element while playing - it should appear at least once during run
      let sawFloating = false;
      const start2 = Date.now();
      while (Date.now() - start < 10000) {
        const floatEl = await findFloatingElement(page);
        if (floatEl) {
          sawFloating = true;
          // Wait for the animation to complete and be removed
          await page.waitForTimeout(1600);
          const after = await findFloatingElement(page);
          // should be gone
          if (after) {
            expect(await after.isVisible()).toBe(false);
          }
          break;
        }
        await page.waitForTimeout(200);
      }
      // Pause playback to clean up
      await btnPlay.click();
      expect(sawFloating).toBe(true);
    });
  });

  test.describe('Edge cases and guards', () => {
    test('STEP_FORWARD at final snapshot is no-op (DONE remains done)', async ({ page }) => {
      // Run with small n and step to final step
      const input9 = await findNumberInput(page);
      await input.fill('2');
      const btnRun8 = await findButton(page, /run/i, ['#btnRun8', '[data-test="run"]']);
      await btnRun.click();

      const btnStep3 = await findButton(page, /step forward|step ▶|step/i, ['#btnStep3', '[data-test="step"]']);
      const status7 = await findStatusElement(page);
      expect(status).toBeTruthy();

      // Advance until no further change in step index
      let prev = parseStepFromStatus(await status.innerText());
      for (let i = 0; i < 10; i++) {
        await btnStep.click();
        await page.waitForTimeout(300);
        const current2 = parseStepFromStatus(await status.innerText());
        if (current === prev) {
          // Likely at final snapshot; clicking step had no effect
          break;
        }
        prev = current;
      }
      // Now clicking step again should keep it the same
      await btnStep.click();
      await page.waitForTimeout(300);
      const final = parseStepFromStatus(await status.innerText());
      expect(final).toBe(prev);
    });

    test('RUN interrupts animations/playing and resets to paused at step 0', async ({ page }) => {
      // Start running with n=4 and start playing
      const input10 = await findNumberInput(page);
      await input.fill('4');
      const btnRun9 = await findButton(page, /run/i, ['#btnRun9', '[data-test="run"]']);
      await btnRun.click();

      const btnPlay4 = await findButton(page, /play|pause|▶|■/i, ['#btnPlay4', '[data-test="play"]']);
      await btnPlay.click();
      // Let it play for some ticks
      await page.waitForTimeout(500);

      // Now issue RUN again (rebuild snapshots) which should stop playing and reset to step 0 paused
      await btnRun.click();

      const status8 = await findStatusElement(page);
      const txt4 = await status.innerText();
      const step3 = parseStepFromStatus(txt);
      expect(step).toBe(0);

      // Play button should show Play (not Pause)
      const btnTxt = await btnPlay.innerText();
      expect(/play|▶/i.test(btnTxt)).toBe(true);
    });
  });

  test.afterEach(async ({ page }) => {
    // Try to reset UI between tests by reloading
    await page.reload();
    await page.waitForLoadState('networkidle');
  });
});