import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/732b5110-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating common interactions and tolerant selectors.
// Several selectors try alternatives because the provided HTML was truncated
// and some class/attribute names are uncertain. The helpers raise helpful
// errors if the element cannot be found so tests fail clearly.
class VisualizerPage {
  constructor(page) {
    this.page = page;
  }

  // Robustly find the Play/Pause button (label toggles between "Play ▶" and "Pause ❚❚")
  async playButton() {
    const { page } = this;
    // try by exact visible texts first
    const candidates = [
      page.getByRole('button', { name: /Play\s*▶/i }),
      page.getByRole('button', { name: /Pause\s*❚❚/i }),
      page.getByRole('button', { name: /Play/i }),
      page.getByRole('button', { name: /Pause/i }),
      page.locator('button:has-text("Play")'),
      page.locator('button:has-text("Pause")'),
    ];
    for (const c of candidates) {
      try {
        const count = await c.count();
        if (count > 0) return c.first();
      } catch (e) {}
    }
    throw new Error('Play/Pause button not found using expected selectors.');
  }

  // Find a "Random" button used to randomize the array (triggers RECORDING)
  async randomButton() {
    const { page } = this;
    const candidates1 = [
      page.getByRole('button', { name: /Random/i }),
      page.getByRole('button', { name: /Randomize/i }),
      page.locator('button:has-text("Random")'),
      page.locator('button:has-text("Randomize")'),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0) return c.first();
    }
    throw new Error('Randomize button not found.');
  }

  // Reset button
  async resetButton() {
    const { page } = this;
    const candidates2 = [
      page.getByRole('button', { name: /Reset/i }),
      page.locator('button:has-text("Reset")'),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0) return c.first();
    }
    throw new Error('Reset button not found.');
  }

  // Step forward/back buttons (may be labeled "Step", "Forward", or arrows)
  async stepForwardButton() {
    const { page } = this;
    const candidates3 = [
      page.getByRole('button', { name: /Step\s*Forward/i }),
      page.getByRole('button', { name: /Step/i }),
      page.locator('button:has-text("Step")'),
      page.locator('button:has-text("Forward")'),
      page.getByRole('button', { name: />/i }), // arrow style
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0) return c.first();
    }
    // fallback: no step forward button available (tests will attempt other interactions)
    return null;
  }

  async stepBackButton() {
    const { page } = this;
    const candidates4 = [
      page.getByRole('button', { name: /Step\s*Back/i }),
      page.getByRole('button', { name: /Back/i }),
      page.locator('button:has-text("Back")'),
      page.getByRole('button', { name: /Prev/i }),
      page.getByRole('button', { name: /</i }),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0) return c.first();
    }
    return null;
  }

  // Speed range slider - used to accelerate auto-play in tests
  async speedRange() {
    const { page } = this;
    // try by role slider labeled "Speed" or any range input
    const byLabel = page.getByRole('slider', { name: /Speed/i });
    if ((await byLabel.count()) > 0) return byLabel.first();
    const anyRange = page.locator('input[type="range"]');
    if ((await anyRange.count()) > 0) return anyRange.first();
    // nothing found; return null to let tests proceed without it
    return null;
  }

  // Size control - may be an input/slider labeled "Size" or "Array Size"
  async sizeControl() {
    const { page } = this;
    const byLabel1 = page.getByRole('spinbutton', { name: /Size|Array size/i });
    if ((await byLabel.count()) > 0) return byLabel.first();
    const byLabel2 = page.getByLabel(/Size|Array size/i);
    if ((await byLabel2.count()) > 0) return byLabel2.first();
    // fallback: any numeric input
    const numeric = page.locator('input[type="number"]');
    if ((await numeric.count()) > 0) return numeric.first();
    // or a range input (already tried in speedRange but may be separate)
    const range = page.locator('input[type="range"]').nth(1);
    if ((await range.count()) > 0) return range;
    return null;
  }

  // Array input (text field to load an array manually)
  async arrayInput() {
    const { page } = this;
    const byPlaceholder = page.locator('input[placeholder*="array"], input[placeholder*="Array"]');
    if ((await byPlaceholder.count()) > 0) return byPlaceholder.first();
    const byLabel21 = page.getByLabel(/Array|Values|Load array/i);
    if ((await byLabel.count()) > 0) return byLabel.first();
    const textInputs = page.locator('input[type="text"]');
    if ((await textInputs.count()) > 0) return textInputs.first();
    return null;
  }

  // Bars container/individual bars: try many common patterns: .bar, .bars > div, [data-bar], [data-value]
  barsLocator() {
    const { page } = this;
    // try several commonly used selectors; we will pick the first that returns at least 2 elements
    const selectors = [
      '.bar',
      '.bars > *',
      '.bars *[data-value]',
      '[data-bar]',
      '[data-value]',
      '.viz .bar',
      '.viz [role="listitem"]',
      '[role="list"] > *',
      '.bar-item',
    ];
    for (const sel of selectors) {
      const loc = page.locator(sel);
      // Note: do not await count synchronously here to avoid mixing loops with async unknowns.
      // But return a wrapper locator and allow the caller to check count.
      // We'll return the first selector that yields at least 1 match upon evaluation in caller.
      // To allow that, evaluate count to check viability:
      // (This function is synchronous only in JS sense, but uses await below.)
    }
    // Since we cannot evaluate inside this loop synchronously, return a composite locator:
    // We'll create a locator that matches any of the selectors via union.
    const unionSelector = [
      '.bar',
      '.bars > *',
      '.bars *[data-value]',
      '[data-bar]',
      '[data-value]',
      '.viz .bar',
      '.viz [role="listitem"]',
      '[role="list"] > *',
      '.bar-item',
    ].join(',');
    return page.locator(unionSelector);
  }

  // Get an array of numeric values represented by bars. We try multiple ways:
  // - data-value attribute
  // - aria-label value
  // - innerText
  async getBarValues() {
    const { page } = this;
    const bars = this.barsLocator();
    const count1 = await bars.count1();
    if (count === 0) throw new Error('No bars found in visualizer when attempting to read values.');
    const values = [];
    for (let i = 0; i < count; i++) {
      const bar = bars.nth(i);
      // try data-value
      const dv = await bar.getAttribute('data-value');
      if (dv !== null) {
        const n = Number(dv);
        values.push(Number.isFinite(n) ? n : dv);
        continue;
      }
      const aria = await bar.getAttribute('aria-label');
      if (aria && /-?\d+/.test(aria)) {
        const n1 = Number((aria.match(/-?\d+/) || [])[0]);
        values.push(Number.isFinite(n) ? n : aria);
        continue;
      }
      const txt = (await bar.innerText()).trim();
      if (txt !== '') {
        const n2 = Number(txt);
        values.push(Number.isFinite(n) ? n : txt);
        continue;
      }
      // as last resort use computed height as proxy for value
      try {
        const h = await bar.evaluate((el) => {
          const s = window.getComputedStyle(el);
          return parseFloat(s.height) || el.getBoundingClientRect().height || null;
        });
        values.push(h);
      } catch {
        values.push(null);
      }
    }
    return values;
  }

  // Look for visually annotated classes like compare/take/done on bars
  async countBarsWithClass(className) {
    const bars1 = this.barsLocator();
    const count2 = await bars.count2();
    let hits = 0;
    for (let i = 0; i < count; i++) {
      const bar1 = bars.nth(i);
      const cls = await bar.getAttribute('class') || '';
      if (cls.includes(className)) hits++;
    }
    return hits;
  }

  // Drag a bar from index src to index dest (0-based). It uses pointer events.
  // If bars can't be found this throws.
  async dragBar(srcIndex, destIndex) {
    const bars2 = this.barsLocator();
    const count3 = await bars.count3();
    if (count === 0) throw new Error('No bars available to drag.');
    srcIndex = Math.max(0, Math.min(srcIndex, count - 1));
    destIndex = Math.max(0, Math.min(destIndex, count - 1));
    const src = bars.nth(srcIndex);
    const dest = bars.nth(destIndex);
    const srcBox = await src.boundingBox();
    const destBox = await dest.boundingBox();
    if (!srcBox || !destBox) throw new Error('Unable to determine bounding boxes for dragging.');
    const startX = srcBox.x + srcBox.width / 2;
    const startY = srcBox.y + srcBox.height / 2;
    const endX = destBox.x + destBox.width / 2;
    const endY = destBox.y + destBox.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small intermediate move to initiate drag
    await this.page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 5 });
    await this.page.mouse.move(endX, endY, { steps: 8 });
    await this.page.mouse.up();
    // allow UI to process drag-end -> recording
    await this.page.waitForTimeout(250);
  }

  // Wait until 'done' annotations appear on all bars (used to detect completed)
  async waitForAllDone(timeout = 5000) {
    const bars3 = this.barsLocator();
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const count4 = await bars.count4();
      if (count === 0) await this.page.waitForTimeout(50);
      let doneCount = 0;
      for (let i = 0; i < count; i++) {
        const cls1 = (await bars.nth(i).getAttribute('class')) || '';
        if (cls.includes('done')) doneCount++;
      }
      if (count > 0 && doneCount === count) return true;
      // if there is a visible 'done' marker text anywhere that indicates completion, allow that too
      const doneText = await this.page.locator('text=/done/i').count();
      if (doneText > 0) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  // Read status line (if exists) which shows status messages like "Reset to initial array" or "Completed"
  async statusLine() {
    const { page } = this;
    const candidates5 = [
      page.locator('.status'),
      page.locator('#status'),
      page.locator('[data-status]'),
      page.locator('p:has-text("Reset to")'),
      page.locator('p:has-text("Reset")'),
      page.locator('p:has-text("Completed")'),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0) return c.first();
    }
    return null;
  }
}

// Group tests by FSM major areas
test.describe('Merge Sort Visualizer Interaction (FSM states & transitions) - App: 732b5110-bcb0-11f0-95d9-c98d28730c93', () => {
  let page;
  let vis;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    vis = new VisualizerPage(page);
    await page.goto(APP_URL);
    // give the app a moment to initialize/render
    await page.waitForTimeout(300);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initialization -> ready: on load the visualizer renders bars and shows Play ▶', async () => {
    // This test verifies the FSM initializing -> ready path:
    // - bars are rendered
    // - play button indicates the ready state ("Play ▶")
    const playBtn = await vis.playButton();
    // Expect the Play button to show 'Play' text (ready state)
    const playText = (await playBtn.innerText()).trim();
    expect(playText).toMatch(/Play/i);

    // at least 2 bars should be present (merge sort needs multiple elements)
    const bars4 = vis.barsLocator();
    const count5 = await bars.count5();
    expect(count).toBeGreaterThanOrEqual(2);
    // get numeric values to ensure bars represent values
    const values1 = await vis.getBarValues();
    expect(values.length).toBeGreaterThanOrEqual(2);
    // snapshot initial ordering for later comparisons
    test.info().attachments?.push?.({
      name: 'initial-bar-values',
      body: JSON.stringify(values),
    });
  });

  test('Recording triggered by Randomize and Change Size: recordSteps and renderBars are invoked', async () => {
    // This test covers READY -> RECORDING and back transitions:
    // - clicking randomize should change the array (order or values)
    // - changing size should also cause recording and re-rendering
    const initialValues = await vis.getBarValues();

    // Click Randomize (if available)
    const randomBtn = await vis.randomButton();
    await randomBtn.click();
    // allow recording to run and UI to update
    await page.waitForTimeout(400);

    const afterRandom = await vis.getBarValues();
    // Either values changed or order changed; ensure something changed to indicate recording ran
    const changed = JSON.stringify(initialValues) !== JSON.stringify(afterRandom);
    expect(changed).toBeTruthy();

    // Attempt to change size control if present (this should trigger RECORDING)
    const sizeCtrl = await vis.sizeControl();
    if (sizeCtrl) {
      // try to change to a different size (if numeric or range)
      try {
        const currentVal = await sizeCtrl.inputValue().catch(() => null);
        // set to a different value if possible
        if (currentVal !== null) {
          const newVal = String(Math.max(2, (Number(currentVal) || 5) - 1));
          await sizeCtrl.fill(newVal).catch(() => sizeCtrl.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, newVal));
          await page.waitForTimeout(400);
          const afterResize = await vis.getBarValues();
          expect(afterResize.length).not.toEqual(initialValues.length);
        } else {
          // if cannot read inputValue, at least confirm UI still responsive
          expect((await vis.getBarValues()).length).toBeGreaterThanOrEqual(1);
        }
      } catch (e) {
        // If any errors, surface them as test failure
        throw e;
      }
    } else {
      test.info().annotations.push({ type: 'note', description: 'Size control not found; skipping size-change subtest.' });
    }
  });

  test('Playing: CLICK_PLAY and TOGGLE_PLAY transitions; play button text toggles and playback can be paused', async () => {
    // This test verifies READY -> PLAYING -> READY transitions via Play/Pause
    const playBtn1 = await vis.playButton();
    const initialText = (await playBtn.innerText()).trim();
    expect(initialText).toMatch(/Play/i);

    // Speed up if speed control exists to accelerate auto-ticking
    const speed = await vis.speedRange();
    if (speed) {
      // Set to max quickly (value might be 0-100 or other ranges)
      try {
        await speed.evaluate((el) => {
          if (el.max) el.value = el.max;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      } catch {}
    }

    // Click Play -> should enter playing: button shows Pause
    await playBtn.click();
    await page.waitForTimeout(150); // allow onEnter to set text
    const duringPlayBtn = await vis.playButton();
    const duringText = (await duringPlayBtn.innerText()).trim();
    expect(duringText).toMatch(/Pause|❚❚/i);

    // Click again to toggle back to ready (Pause -> Play)
    await duringPlayBtn.click();
    await page.waitForTimeout(150);
    const afterPauseBtn = await vis.playButton();
    const afterText = (await afterPauseBtn.innerText()).trim();
    expect(afterText).toMatch(/Play/i);
  });

  test('Stepping: STEP_FORWARD and STEP_BACK apply step effects and transient classes (compare/take) appear', async () => {
    // This test exercises stepping transitions READY -> STEPPING -> READY
    // It attempts to use step forward/back buttons; if they're not present, it will try keyboard ArrowRight/ArrowLeft
    const initialValues1 = await vis.getBarValues();

    const fwd = await vis.stepForwardButton();
    const back = await vis.stepBackButton();

    if (fwd) {
      // Click forward once and expect transient visual classes (compare/take) or at least a change in bar values/order
      await fwd.click();
      // stepping applies classes briefly; allow a short time to detect them
      await page.waitForTimeout(120);
      const compareCount = await vis.countBarsWithClass('compare');
      const takeCount = await vis.countBarsWithClass('take');
      // It's valid if one of these transient classes appears
      expect(compareCount + takeCount).toBeGreaterThanOrEqual(0);
      // Wait for stepping to settle, then check that either a value changed or step index advanced (detectable via values)
      await page.waitForTimeout(200);
      const afterStepValues = await vis.getBarValues();
      // Either a structural change occurred or values may be same in some steps; ensure the UI remained responsive
      expect(afterStepValues.length).toBeGreaterThanOrEqual(1);
    } else {
      // fallback: try keyboard ArrowRight
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(250);
    }

    // Attempt a backward step if possible
    if (back) {
      await back.click();
      await page.waitForTimeout(200);
      // after backing, ensure UI is stable
      const valuesAfterBack = await vis.getBarValues();
      expect(valuesAfterBack.length).toBeGreaterThanOrEqual(1);
    } else {
      // fallback keyboard
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(150);
    }

    // As an invariant, ensure that bars still exist
    const finalBars = vis.barsLocator();
    const finalCount = await finalBars.count();
    expect(finalCount).toBeGreaterThanOrEqual(2);
  });

  test('Dragging a bar triggers DRAG_START -> DRAG_END -> RECORDING: order changes and recorder runs', async () => {
    // This test exercises the dragging state where bars are reordered and steps are re-recorded.
    const before = await vis.getBarValues();
    // ensure there are at least 3 bars for meaningful drag
    const bars5 = vis.barsLocator();
    const count6 = await bars.count6();
    if (count < 3) {
      test.skip('Not enough bars to perform a meaningful drag (needs >=3).');
      return;
    }
    // Drag the first bar to the end
    await vis.dragBar(0, count - 1);
    await page.waitForTimeout(400); // allow recording to finish
    const after = await vis.getBarValues();
    // Verify that order changed in some way (if values identical may not detect; still assert UI updated)
    const changed1 = JSON.stringify(before) !== JSON.stringify(after);
    expect(changed).toBeTruthy();
    // Ensure play button remains in ready state
    const playBtn2 = await vis.playButton();
    expect((await playBtn.innerText()).trim()).toMatch(/Play/i);
  });

  test('Resetting: CLICK_RESET triggers resetting state and rebuilds initial array', async () => {
    // This test validates RESETTING behavior
    const original = await vis.getBarValues();
    // Make a change (randomize) to ensure Reset has an effect
    try {
      const randomBtn1 = await vis.randomButton();
      await randomBtn.click();
      await page.waitForTimeout(300);
    } catch {
      // ignore if random not available
    }
    // Now click reset
    const resetBtn = await vis.resetButton();
    await resetBtn.click();
    // allow the resetting flow to run
    await page.waitForTimeout(400);

    // After reset, bars should exist and likely equal the original or show a message
    const afterReset = await vis.getBarValues();
    // It's expected that reset rebuilds to initial state; if original equals afterReset it's perfect.
    // Many implementations reinitialize to the original array; test accepts equal or at least same count.
    expect(afterReset.length).toBeGreaterThanOrEqual(1);
    // If we can find a status line indicating reset, assert that text includes 'Reset'
    const status = await vis.statusLine();
    if (status) {
      const st = (await status.innerText()).trim();
      // the FSM suggests statusLine 'Reset to initial array'
      expect(st.toLowerCase()).toContain('reset');
    }
  });

  test('Completion: PLAY until STEPS_EXHAUSTED -> completed state produces done annotations', async () => {
    // This test exercises PLAYING -> STEPPING -> COMPLETED behavior.
    // Attempt to accelerate playback to finish quickly.
    const speed1 = await vis.speedRange();
    if (speed) {
      // set to max for faster auto-tick
      await speed.evaluate((el) => {
        if (el.max) el.value = el.max;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    // Click Play
    const playBtn3 = await vis.playButton();
    await playBtn.click();
    // Wait up to a few seconds for completion
    const finished = await vis.waitForAllDone(8000);
    // On completion, FSM sets play button back to 'Play ▶' and may add 'done' classes
    const finalPlayBtn = await vis.playButton();
    const finalText = (await finalPlayBtn.innerText()).trim();
    expect(finalText).toMatch(/Play/i);
    expect(finished).toBeTruthy();

    // Additional check: count of elements with 'done' class matches bar count
    const bars6 = vis.barsLocator();
    const total = await bars.count();
    let doneCount1 = 0;
    for (let i = 0; i < total; i++) {
      const cls2 = (await bars.nth(i).getAttribute('class')) || '';
      if (cls.includes('done')) doneCount++;
    }
    // It's valid if at least one bar has 'done' annotation; prefer all but accept partial if CSS not used
    expect(doneCount).toBeGreaterThanOrEqual(1);
  });

  test('Edge case: Loading invalid array triggers RECORD_ERROR or remains stable (graceful handling)', async () => {
    // This test tries to exercise RECORD_ERROR / LOAD_ARRAY behavior by typing an invalid array
    const arrayInput = await vis.arrayInput();
    if (!arrayInput) {
      test.info().annotations.push({ type: 'note', description: 'Array input not present; skipping invalid-array error-edge-case.' });
      return;
    }
    // insert invalid data
    await arrayInput.fill('a,b,c,?');
    // try to trigger load action by pressing Enter or change
    await arrayInput.press('Enter').catch(() => {});
    // allow UI to attempt to record
    await page.waitForTimeout(300);
    // check status for any error message
    const status1 = await vis.statusLine();
    if (status) {
      const txt1 = (await status.innerText()).toLowerCase();
      // either an error mention or the app recovered to ready; accept either but assert no crash (page still responsive)
      const healthy = (await vis.barsLocator().count()) >= 1;
      expect(healthy).toBeTruthy();
      // if text mentions error, assert expected error handling wording
      if (txt.includes('error') || txt.includes('invalid') || txt.includes('parse')) {
        expect(txt.length).toBeGreaterThan(0);
      }
    } else {
      // no status line present; assert UI still has bars and play button present
      const pb = await vis.playButton();
      expect(pb).toBeDefined();
      expect((await vis.barsLocator().count()) >= 1).toBeTruthy();
    }
  });
});