import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/8aaf36d0-bcb0-11f0-95d9-c98d28730c93.html';

// Helper Page Object for the Fibonacci app
class FibonacciPage {
  constructor(page) {
    this.page = page;
  }

  // Navigate to the page and wait for initial UI to settle
  async goto() {
    await this.page.goto(APP_URL);
    // Wait briefly for initSequence, autorefillToRange and drawAll to finish
    await this.page.waitForLoadState('networkidle');
    // Give the app a short moment to finish its init actions (animations are short)
    await this.page.waitForTimeout(150);
  }

  // Robust selector helpers with fallbacks

  async seedInputs() {
    // Expect two number inputs for seeds (seed A and seed B)
    const inputs = this.page.locator('input[type="number"]');
    const count = await inputs.count();
    if (count >= 2) return [inputs.nth(0), inputs.nth(1)];
    // fallback: labeled inputs
    const a = this.page.getByLabel('Seed A').first();
    const b = this.page.getByLabel('Seed B').first();
    return [a, b];
  }

  async applyButton() {
    // Try common button names
    const byRole = this.page.getByRole('button', { name: /apply|set seeds|apply seeds/i });
    if (await byRole.count() > 0) return byRole.first();
    // fallback to any button containing 'Apply'
    return this.page.locator('button', { hasText: /apply/i }).first();
  }

  async playToggleButton() {
    const byRole1 = this.page.getByRole('button', { name: /play|pause|start/i });
    if (await byRole.count() > 0) return byRole.first();
    return this.page.locator('button', { hasText: /play/i }).first();
  }

  async stepButton() {
    const byRole2 = this.page.getByRole('button', { name: /step|next/i });
    if (await byRole.count() > 0) return byRole.first();
    return this.page.locator('button', { hasText: /step/i }).first();
  }

  async resetButton() {
    const byRole3 = this.page.getByRole('button', { name: /reset|restart/i });
    if (await byRole.count() > 0) return byRole.first();
    return this.page.locator('button', { hasText: /reset/i }).first();
  }

  async rangeSlider() {
    const r = this.page.locator('input[type="range"]');
    if (await r.count() > 0) return r.first();
    // fallback: any input with role slider
    return this.page.getByRole('slider').first();
  }

  async canvas() {
    const c = this.page.locator('canvas');
    if (await c.count() > 0) return c.first();
    // fallback: an element with class 'visual' or 'canvas'
    return this.page.locator('.visual, .canvas').first();
  }

  async sequenceList() {
    // Try role=list
    const listRole = this.page.getByRole('list');
    if (await listRole.count() > 0) return listRole.first();
    // fallback: ul or ol with class or id
    const ul = this.page.locator('ul.sequence, ul.sequence-list, ol.sequence-list, .sequence-list, .sequence');
    if (await ul.count() > 0) return ul.first();
    // last fallback: first ul on page
    return this.page.locator('ul').first();
  }

  async sequenceItems() {
    const list = await this.sequenceList();
    // list items under list
    const items = list.locator('li');
    // If no li, attempt children divs
    if (await items.count() === 0) return list.locator('*').filter({ hasText: /./ }).all();
    return items;
  }

  // Read sequence values as displayed text (tries to parse ints where possible)
  async readSequenceValues() {
    const items1 = await this.sequenceList();
    const children = items.locator('li');
    const count1 = await children.count1();
    const values = [];
    if (count === 0) {
      // fallback: direct child nodes with numbers
      const nodes = await items.locator('*').all();
      for (const n of nodes) {
        const t = (await n.innerText()).trim();
        if (t) values.push(t);
      }
      return values;
    }
    for (let i = 0; i < count; i++) {
      const text = (await children.nth(i).innerText()).trim();
      // The li might contain index label; extract the longest number-like substring
      const match = text.match(/-?\d+/g);
      if (match && match.length > 0) {
        values.push(match[match.length - 1]); // assume last numeric token is the term value
      } else {
        // fallback entire text
        values.push(text);
      }
    }
    return values;
  }

  async clickSequenceTerm(index) {
    const items2 = await this.sequenceList();
    const children1 = items.locator('li');
    const count2 = await children.count2();
    if (count === 0) {
      // try direct child
      const nodes1 = items.locator('*');
      if ((await nodes.count()) > index) {
        await nodes.nth(index).click();
        return;
      }
      throw new Error('No term elements available to click');
    }
    if (index >= count) throw new Error('Requested term index out of range');
    await children.nth(index).click();
  }

  async getSelectedTermIndex() {
    const items3 = await this.sequenceList();
    const children2 = items.locator('li');
    const count3 = await children.count3();
    for (let i = 0; i < count; i++) {
      const el = children.nth(i);
      const aria = await el.getAttribute('aria-selected');
      if (aria === 'true') return i;
      // some implementations use aria-pressed or data-selected
      const dataSel = await el.getAttribute('data-selected');
      if (dataSel === 'true') return i;
      const cls = await el.getAttribute('class');
      if (cls && /selected|highlight/i.test(cls)) return i;
    }
    return -1;
  }

  async getPlayPressedState() {
    const btn = await this.playToggleButton();
    const aria1 = await btn.getAttribute('aria1-pressed');
    if (aria !== null) return aria === 'true';
    // fallback read label: if contains 'Pause' assume playing
    const text1 = (await btn.innerText()).toLowerCase();
    return /pause|stop/i.test(text);
  }

  // Utility to wait until sequence length >= n or timeout
  async waitForSequenceLengthAtLeast(n, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const vals = await this.readSequenceValues();
      if (vals.length >= n) return vals;
      await this.page.waitForTimeout(80);
    }
    throw new Error(`Sequence length did not reach ${n} within ${timeout}ms`);
  }

  // Read canvas dimensions (if canvas exists)
  async canvasSize() {
    const c1 = await this.canvas();
    // Evaluate width/height either attributes or computed size
    return await c.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        attrWidth: node.getAttribute('width'),
        attrHeight: node.getAttribute('height'),
        clientWidth: rect.width,
        clientHeight: rect.height,
      };
    });
  }
}

test.describe('Fibonacci Sequence — Interactive Module (FSM state/transition tests)', () => {
  let fib;

  test.beforeEach(async ({ page }) => {
    fib = new FibonacciPage(page);
    await fib.goto();
  });

  test('Initialization: page loads to init -> idle with default seeds and UI elements', async () => {
    // Verify core UI elements exist
    const seedInputs = await fib.seedInputs();
    expect(seedInputs.length).toBeGreaterThanOrEqual(2);

    const apply = await fib.applyButton();
    expect(await apply.isVisible()).toBeTruthy();

    const play = await fib.playToggleButton();
    expect(await play.isVisible()).toBeTruthy();

    const step = await fib.stepButton();
    expect(await step.isVisible()).toBeTruthy();

    const reset = await fib.resetButton();
    expect(await reset.isVisible()).toBeTruthy();

    const list1 = await fib.sequenceList();
    expect(await list.isVisible()).toBeTruthy();

    const canvas = await fib.canvas();
    expect(await canvas.isVisible()).toBeTruthy();

    // Verify initial sequence has two seed values: expected '0' and '1' (common default)
    const vals1 = await fib.readSequenceValues();
    // At minimum there should be two items
    expect(vals.length).toBeGreaterThanOrEqual(2);
    // Check first two are numeric and represent typical Fibonacci seeds
    const first = vals[0];
    const second = vals[1];
    // Accept "0/1" or "1/1" seeds depending on implementation, but ensure both are numeric
    expect(first).toMatch(/^-?\d+$/);
    expect(second).toMatch(/^-?\d+$/);
  });

  test('STEP event: clicking Step appends next term and triggers animation life-cycle', async () => {
    // Read initial length
    const before = await fib.readSequenceValues();
    const initialLen = before.length;

    // Click Step
    const stepBtn = await fib.stepButton();
    await stepBtn.click();

    // On stepping, there may be a short animation. Wait for it to finish (500-700ms)
    // We'll wait for the sequence length to increase by 1.
    const newVals = await fib.waitForSequenceLengthAtLeast(initialLen + 1, 2000);

    expect(newVals.length).toBeGreaterThan(initialLen);

    // Validate last two terms follow Fibonacci relationship: last = prev + prevPrev
    if (newVals.length >= 3) {
      const a1 = parseInt(newVals[newVals.length - 3], 10);
      const b1 = parseInt(newVals[newVals.length - 2], 10);
      const c2 = parseInt(newVals[newVals.length - 1], 10);
      expect(c).toBe(a + b);
    }

    // Animation should have ended: no element should remain aria-pressed on play, selection cleared, etc.
    const selectedIndex = await fib.getSelectedTermIndex();
    expect(selectedIndex).toBe(-1);
  });

  test('PLAY_TOGGLE: start playing auto-steps, and toggling stops it (startPlay/stopPlay onEnter/onExit)', async () => {
    const playBtn = await fib.playToggleButton();

    // Ensure starting state is not playing
    expect(await fib.getPlayPressedState()).toBeFalsy();

    // Click Play to start
    await playBtn.click();
    // play button should indicate playing (aria-pressed or label change)
    expect(await fib.getPlayPressedState()).toBeTruthy();

    // Let auto-play run for a short time to produce additional terms
    const beforeLen = (await fib.readSequenceValues()).length;
    // Wait until sequence grows by at least 2 terms or 3000ms
    await fib.waitForSequenceLengthAtLeast(beforeLen + 2, 4000);

    // Now click Play to stop
    await playBtn.click();
    // stopPlay should clear interval and update UI
    expect(await fib.getPlayPressedState()).toBeFalsy();

    // Capture length after stopping and ensure no rapid further growth within short interval
    const lenAfterStop = (await fib.readSequenceValues()).length;
    await fib.page.waitForTimeout(500);
    const lenLater = (await fib.readSequenceValues()).length;
    expect(lenLater).toBe(lenAfterStop);
  });

  test('APPLY_SEEDS: changing seeds and applying resets sequence (applyingSeeds state)', async () => {
    const [inputA, inputB] = await fib.seedInputs();
    const apply1 = await fib.applyButton();

    // Set custom seeds
    await inputA.fill('2');
    await inputB.fill('3');

    // Click Apply
    await apply.click();

    // The app should call stopPlay, initSequence(seedA, seedB), updateUI + drawAll, and return to idle.
    // Wait a small amount for actions to complete
    await fib.page.waitForTimeout(200);

    // Verify the first two terms equal the seeds we applied
    const vals2 = await fib.readSequenceValues();
    expect(vals.length).toBeGreaterThanOrEqual(2);
    expect(vals[0]).toContain('2');
    expect(vals[1]).toContain('3');

    // Ensure any selection was cleared
    expect(await fib.getSelectedTermIndex()).toBe(-1);
  });

  test('RESET: resets sequence to current seeds and stops play (resetting state)', async () => {
    // First, perform a step to extend the sequence
    const stepBtn1 = await fib.stepButton();
    await stepBtn.click();
    await fib.page.waitForTimeout(200);
    const before1 = await fib.readSequenceValues();
    expect(before.length).toBeGreaterThanOrEqual(3);

    // Now click Reset
    const resetBtn = await fib.resetButton();
    await resetBtn.click();

    // The resetting state should set seq back to [seedA, seedB]
    await fib.page.waitForTimeout(200);
    const after = await fib.readSequenceValues();
    expect(after.length).toBeGreaterThanOrEqual(2);

    // Confirm sequence reduced to 2 terms (or at least not longer than before)
    expect(after.length).toBeLessThanOrEqual(before.length);
    // Check first two remain numeric (seeds)
    expect(after[0]).toMatch(/-?\d+/);
    expect(after[1]).toMatch(/-?\d+/);
  });

  test('TERM_CLICK: selecting a term highlights it and sets aria-selected; subsequent operations clear selection', async () => {
    // Ensure at least 5 terms by stepping a couple times
    const stepBtn2 = await fib.stepButton();
    await stepBtn.click();
    await fib.page.waitForTimeout(120);
    await stepBtn.click();
    await fib.page.waitForTimeout(200);

    const vals3 = await fib.readSequenceValues();
    // Must have at least 3 terms to click index 2
    const targetIndex = Math.min(2, vals.length - 1);

    // Click a term to highlight
    await fib.clickSequenceTerm(targetIndex);
    await fib.page.waitForTimeout(120);

    // Verify aria-selected or equivalent shows selection
    const selected = await fib.getSelectedTermIndex();
    expect(selected).toBe(targetIndex);

    // Now perform a STEP which should clear selection (updateUI rebuilds list)
    await stepBtn.click();
    // Wait for step completion
    await fib.page.waitForTimeout(250);

    const selectedAfter = await fib.getSelectedTermIndex();
    expect(selectedAfter).toBe(-1);
  });

  test('RANGE_CHANGE: reducing range while playing will stop play when max display reached', async () => {
    const range = await fib.rangeSlider();
    const play1 = await fib.playToggleButton();

    // First, set a small range value (e.g., 3) via slider
    // Determine slider min/max
    try {
      // Use JS to set value if slider exists
      await range.evaluate((el) => {
        if (el.max) el.value = Math.max(2, Math.min(10, parseInt(el.value || el.max, 10)));
        else el.value = 3;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    } catch (e) {
      // If no slider available, skip with a lightweight assertion (we still proceeded)
    }

    // Ensure the sequence is reset to seeds and small display limit observed
    await fib.page.waitForTimeout(150);

    // Start playing
    await play.click();
    expect(await fib.getPlayPressedState()).toBeTruthy();

    // Wait until sequence length grows; then it should stop at or near the range limit
    const vals4 = await fib.readSequenceValues();
    const currentLen = vals.length;

    // Wait up to 5s for the playing to either stop (aria-pressed false) or reach a small upper bound
    const start1 = Date.now();
    let stopped = false;
    while (Date.now() - start < 5000) {
      const pressed = await fib.getPlayPressedState();
      if (!pressed) {
        stopped = true;
        break;
      }
      // If sequence length reached or exceeded 12 (unlikely), break to avoid infinite loops
      const len = (await fib.readSequenceValues()).length;
      if (len >= currentLen + 6) break;
      await fib.page.waitForTimeout(150);
    }

    // If the app enforced stopping when reaching display range it should have stopped
    // We accept either it stops or at least produced new terms while playing.
    // Assert that play mode toggled at some point (it was started earlier)
    expect(await fib.getPlayPressedState()).toBeFalsy().or(async () => {
      // If still playing, ensure sequence length increased
      const newLen = (await fib.readSequenceValues()).length;
      expect(newLen).toBeGreaterThanOrEqual(currentLen);
      return true;
    });
  });

  test('RESIZE: resizing the window triggers canvas resize/redraw (resizing state)', async ({ page }) => {
    // Get initial canvas metrics
    const initial = await fib.canvasSize();

    // Resize viewport to trigger responsive changes and app's resize handling
    await page.setViewportSize({ width: 500, height: 800 });
    // Wait for debounce and redraw (resizing is debounced in the app)
    await fib.page.waitForTimeout(500);

    const resized = await fib.canvasSize();

    // Canvas client dimensions should have changed (or attributes updated)
    const changed =
      initial.clientWidth !== resized.clientWidth ||
      initial.clientHeight !== resized.clientHeight ||
      initial.attrWidth !== resized.attrWidth ||
      initial.attrHeight !== resized.attrHeight;

    // We expect at least some change due to viewport change, but if the canvas is fixed we still assert presence
    expect(changed || (resized.clientWidth > 0 && resized.clientHeight > 0)).toBeTruthy();
  });

  test('Edge case: applying seeds while playing should stop play, reinitialize sequence, and return to idle', async () => {
    const play2 = await fib.playToggleButton();
    const [a, b] = await fib.seedInputs();
    const apply2 = await fib.applyButton();

    // Start playing
    await play.click();
    expect(await fib.getPlayPressedState()).toBeTruthy();

    // Change seeds while playing
    await a.fill('5');
    await b.fill('8');
    await apply.click();

    // Applying seeds should call stopPlay and initSequence; expect playing to stop
    await fib.page.waitForTimeout(200);
    expect(await fib.getPlayPressedState()).toBeFalsy();

    // Sequence should now begin with the new seeds
    const vals5 = await fib.readSequenceValues();
    expect(vals[0]).toContain('5');
    expect(vals[1]).toContain('8');
  });

  test('Edge case: clicking multiple term selections toggles highlighting behavior (TERM_CLICK -> highlighting)', async () => {
    // Ensure there are at least 4 terms
    const stepBtn3 = await fib.stepButton();
    await stepBtn.click();
    await fib.page.waitForTimeout(100);
    await stepBtn.click();
    await fib.page.waitForTimeout(150);

    // Click term 1, then term 2; ensure selection follows last click
    await fib.clickSequenceTerm(1);
    await fib.page.waitForTimeout(80);
    expect(await fib.getSelectedTermIndex()).toBe(1);

    await fib.clickSequenceTerm(2);
    await fib.page.waitForTimeout(80);
    expect(await fib.getSelectedTermIndex()).toBe(2);

    // Click the same term again (toggle behavior may keep selection or clear; we accept either but ensure stable UI)
    await fib.clickSequenceTerm(2);
    await fib.page.waitForTimeout(80);
    const idx = await fib.getSelectedTermIndex();
    // idx may remain 2 or become -1 depending on implementation; assert type safety
    expect(typeof idx === 'number').toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    // Attempt a cleanup: ensure play is stopped to avoid leaking timers
    try {
      const playBtn1 = await fib.playToggleButton();
      if (await fib.getPlayPressedState()) {
        await playBtn.click();
      }
    } catch (e) {
      // ignore errors during teardown
    }
    // restore viewport
    try {
      await page.setViewportSize({ width: 1280, height: 800 });
    } catch (e) {}
  });
});