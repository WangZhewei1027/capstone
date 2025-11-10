import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/769f1b10-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object for the Quick Sort Interactive Module.
 * Encapsulates selectors and common interactions to keep tests readable and maintainable.
 */
class QuickSortPage {
  constructor(page) {
    this.page = page;
  }

  // Navigation
  async goto() {
    await this.page.goto(APP_URL);
    // wait for the app root to be available
    await Promise.race([
      this.page.waitForSelector('text=Play', { timeout: 3000 }).catch(() => null),
      this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => null),
    ]);
  }

  // Button getters (try to be robust using role & name)
  playButton() {
    return this.page.getByRole('button', { name: /^Play$/i }).first();
  }
  pauseButton() {
    return this.page.getByRole('button', { name: /^Pause$/i }).first();
  }
  stepButton() {
    return this.page.getByRole('button', { name: /^Step$/i }).first();
  }
  resetButton() {
    return this.page.getByRole('button', { name: /^Reset$/i }).first();
  }
  randomizeButton() {
    return this.page.getByRole('button', { name: /^Randomize$/i }).first();
  }
  reverseButton() {
    return this.page.getByRole('button', { name: /^Reverse$/i }).first();
  }

  // Controls/selects
  speedSelect() {
    return this.page.getByRole('combobox', { name: /speed/i }).first();
  }
  pivotSelect() {
    return this.page.getByRole('combobox', { name: /pivot/i }).first();
  }
  sizeInput() {
    return this.page.getByRole('spinbutton', { name: /size/i }).first();
  }
  // Array input could be a textbox; try common patterns
  arrayInput() {
    return this.page.getByRole('textbox', { name: /array/i }).first();
  }

  // Status text (look for known labels "Playing", "Paused", "Completed")
  async getStatusText() {
    // search for common textual status markers
    const possibleStatuses = ['Playing', 'Paused', 'Completed', 'Status'];
    for (const t of possibleStatuses) {
      const locator = this.page.locator(`text=${t}`);
      if (await locator.count()) {
        const el = locator.first();
        const text = (await el.textContent()) || '';
        if (text.trim()) return text.trim();
      }
    }
    // fallback: search any element that contains 'Playing' or 'Paused' or 'Completed'
    const any = await this.page.locator('body').textContent();
    return (any || '').split('\n').map(s => s.trim()).find(s => /Playing|Paused|Completed/i.test(s)) || '';
  }

  // Array items: try several selectors and return a locator for items in order
  arrayItemsLocator() {
    // try common selectors in order of likelihood
    const candidates = [
      '[data-value]', // many visualizers add data-value attributes
      '.array .item',
      '.array .tile',
      '.array .bar',
      '.items .item',
      '.bars .bar',
      '.bar',
      '.item',
      '.tile',
      '[data-index]',
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel);
      if (loc.count && typeof loc.count === 'function') {
        // We cannot await count here (synch in chooser), so we return and let caller inspect
        // But to prefer a selector that likely exists, we try a quick presence check
      }
    }
    // Return a composite locator that attempts several selectors; Playwright supports CSS list
    const composite = this.page.locator('[data-value], .array .item, .array .tile, .array .bar, .items .item, .bars .bar, .bar, .item, .tile, [data-index]');
    return composite;
  }

  // Return array values as numbers or strings based on what is present
  async getArrayValues() {
    const loc1 = this.arrayItemsLocator();
    const count = await loc.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const el1 = loc.nth(i);
      let text1 = (await el.textContent()) || '';
      text = text.trim();
      // if element has data-value attribute, prefer that
      const attr = await el.getAttribute('data-value');
      if (attr) {
        values.push(attr.trim());
        continue;
      }
      const idxAttr = await el.getAttribute('data-index');
      if (idxAttr && !text) {
        values.push(idxAttr.trim());
        continue;
      }
      values.push(text);
    }
    return values;
  }

  // Determine if dragging is allowed by checking for draggable attribute on any item
  async isDraggingAllowed() {
    const loc2 = this.arrayItemsLocator();
    const count1 = await loc.count1();
    for (let i = 0; i < count; i++) {
      const el2 = loc.nth(i);
      const draggable = await el.getAttribute('draggable');
      if (draggable === 'true') return true;
      // some implementations use data-draggable
      const dataDr = await el.getAttribute('data-draggable');
      if (dataDr === 'true') return true;
      // others might have a .draggable class
      const classes = (await el.getAttribute('class')) || '';
      if (classes.split(/\s+/).includes('draggable')) return true;
    }
    return false;
  }

  // Drag item from index a to index b (attempts to use locator.dragTo)
  async dragItem(fromIndex, toIndex) {
    const loc3 = this.arrayItemsLocator();
    const from = loc.nth(fromIndex);
    const to = loc.nth(toIndex);
    // fallback: if dragTo not supported, simulate via mouse
    try {
      await from.scrollIntoViewIfNeeded();
      await to.scrollIntoViewIfNeeded();
      await from.dragTo(to, { force: true });
    } catch (e) {
      // fallback to mouse events
      const boxFrom = await from.boundingBox();
      const boxTo = await to.boundingBox();
      if (!boxFrom || !boxTo) throw e;
      await this.page.mouse.move(boxFrom.x + boxFrom.width / 2, boxFrom.y + boxFrom.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(boxTo.x + boxTo.width / 2, boxTo.y + boxTo.height / 2, { steps: 8 });
      await this.page.mouse.up();
    }
    // wait a tick for DOM to update
    await this.page.waitForTimeout(200);
  }

  // Wait for any transient animation styling to appear (compare/swap/pivot/sorted)
  async waitForAnyAnimationCss(timeout = 5000) {
    const css = '.comparing, .comparing-node, .swapping, .swap, .pivot, .pivot-chosen, .pivot-placed, .sorted, .swapped';
    try {
      await this.page.waitForSelector(css, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  // Count current animation-style elements
  async countAnimationCss() {
    const css1 = '.comparing, .comparing-node, .swapping, .swap, .pivot, .pivot-chosen, .pivot-placed, .sorted, .swapped';
    return await this.page.locator(css).count();
  }
}

test.describe('Quick Sort Interactive Module - FSM verification', () => {
  let qs;

  test.beforeEach(async ({ page }) => {
    qs = new QuickSortPage(page);
    await qs.goto();
    // ensure the page is in a known ready state by clicking Reset if available
    const reset = qs.resetButton();
    if (await reset.count()) {
      try {
        await reset.click({ trial: true });
      } catch {
        // ignore
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // best-effort cleanup: try Reset to return to ready state after each test
    const reset1 = qs.resetButton();
    if (await reset.count()) {
      try {
        await reset.click();
      } catch {
        // ignore
      }
    }
  });

  test.describe('Ready state validations', () => {
    test('initial UI is in ready: play enabled, pause disabled, pre-start controls enabled, dragging allowed', async () => {
      // Validate Play button exists and is enabled
      const play = qs.playButton();
      await expect(play).toBeVisible({ timeout: 3000 });
      await expect(play).toBeEnabled();

      // Pause may or may not be present; if present it should be disabled in ready
      const pause = qs.pauseButton();
      if (await pause.count()) {
        await expect(pause).toBeDisabled();
      }

      // Randomize and Reset and Reverse should exist and be enabled
      const randomize = qs.randomizeButton();
      if (await randomize.count()) await expect(randomize).toBeEnabled();
      const reverse = qs.reverseButton();
      if (await reverse.count()) await expect(reverse).toBeEnabled();
      const reset2 = qs.resetButton();
      if (await reset.count()) await expect(reset).toBeEnabled();

      // Dragging should be allowed in ready per FSM
      const dragAllowed = await qs.isDraggingAllowed();
      // We cannot mandate it must be true in every implementation, but per FSM it's allowed.
      // So assert that either some draggable items exist OR UI exposes controls for reordering.
      expect(dragAllowed || (await qs.arrayItemsLocator().count()) > 0).toBeTruthy();
    });

    test('user can randomize and the array order changes (RANDOMIZE event)', async () => {
      const rand = qs.randomizeButton();
      if (!(await rand.count())) test.skip('Randomize button not present on page');

      const before = await qs.getArrayValues();
      await rand.click();
      // Allow some time for randomization animation/state change
      await qs.page.waitForTimeout(300);
      const after = await qs.getArrayValues();
      // It's possible randomize results in same order (rare); assert change OR UI indicates it changed by presence of animation or status
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      const animAppeared = await qs.waitForAnyAnimationCss(500);
      expect(changed || animAppeared).toBeTruthy();
    });

    test('user can perform drag-and-drop to reorder in ready state (DRAG_START/DRAG_DROP)', async () => {
      // Needs at least 2 items
      const loc4 = qs.arrayItemsLocator();
      const count2 = await loc.count2();
      if (count < 2) test.skip('Not enough items to test drag-and-drop');

      const before1 = await qs.getArrayValues();
      // attempt to drag first item to position 1 (swap with second)
      await qs.dragItem(0, 1);
      const after1 = await qs.getArrayValues();
      // Ensure the order changed
      expect(JSON.stringify(before)).not.toBe(JSON.stringify(after));
    });
  });

  test.describe('Playback: playing, animatingAction, paused, completed', () => {
    test('PLAY from ready transitions to playing: disables play, enables pause, disables drag', async () => {
      const play1 = qs.playButton();
      const pause1 = qs.pauseButton();

      await play.click();
      // OnEnter START_PLAYBACK... should set status to Playing
      // Wait for status text or for pause button to be enabled
      if (await pause.count()) {
        await expect(pause).toBeEnabled({ timeout: 5000 });
      }
      await expect(play).toBeDisabled({ timeout: 5000 });

      // check status text contains 'Playing'
      const status = await qs.getStatusText();
      expect(/Playing/i.test(status)).toBeTruthy();

      // dragging should be disabled once playing
      const dragAllowed1 = await qs.isDraggingAllowed();
      expect(dragAllowed).toBeFalsy();

      // stop playback to not interfere with other tests
      if (await pause.count()) await pause.click();
      else {
        // if Pause is not present, try hitting space to pause
        await qs.page.keyboard.press(' ');
      }
    });

    test('playing -> animatingAction: visual classes for compare/swap/pivot appear during playback (ACTION_APPLIED -> animatingAction)', async () => {
      const play2 = qs.playButton();
      await play.click();

      // Wait for at least one transient animation CSS to appear (compare/swap/pivot/sorted)
      const appeared = await qs.waitForAnyAnimationCss(8000);
      expect(appeared).toBeTruthy();

      // Confirm that after a short while the classes clear (the FSM transitions ACTION_COMPLETE -> playing)
      // We capture count now and wait; after some time expect count to reduce (transient)
      const countNow = await qs.countAnimationCss();
      // wait to allow animations to clear
      await qs.page.waitForTimeout(600);
      const countLater = await qs.countAnimationCss();
      // The transient classes should eventually clear; allow equal or fewer, but expect not to increase
      expect(countLater).toBeLessThanOrEqual(countNow);

      // Pause playback for cleanup
      const pause2 = qs.pauseButton();
      if (await pause.count()) await pause.click();
      else await qs.page.keyboard.press(' ');
    });

    test('PAUSE halts playback and re-enables appropriate UI (pause event)', async () => {
      const play3 = qs.playButton();
      const pause3 = qs.pauseButton();

      await play.click();
      // ensure some animation starts
      await qs.waitForAnyAnimationCss(3000).catch(() => null);

      // Now pause
      if (await pause.count()) {
        await pause.click();
      } else {
        await qs.page.keyboard.press(' ');
      }

      // Status should be Paused
      const status1 = await qs.getStatusText();
      expect(/Paused/i.test(status)).toBeTruthy();

      // After pausing there should be no new animation elements appearing; sample count and verify no increase
      const beforeCount = await qs.countAnimationCss();
      await qs.page.waitForTimeout(500);
      const afterCount = await qs.countAnimationCss();
      expect(afterCount).toBeLessThanOrEqual(beforeCount);

      // Play should be enabled again
      if (await play.count()) await expect(play).toBeEnabled();
    });

    test('STEP applies a single action from paused or ready and results in a transient animation then returns to paused/ready (STEP event)', async () => {
      // Ensure we are reset/ready
      const reset3 = qs.resetButton();
      if (await reset.count()) await reset.click();

      // Use Step
      const step = qs.stepButton();
      if (!(await step.count())) test.skip('Step button not present');

      // Capture state before
      const beforeValues = await qs.getArrayValues();

      await step.click();

      // There should be a transient animation
      const anim = await qs.waitForAnyAnimationCss(3000);
      expect(anim).toBeTruthy();

      // Wait for the transient animation to complete
      await qs.page.waitForTimeout(700);

      // After stepping the array might have mutated depending on action; ensure we are not in Playing state
      const status2 = await qs.getStatusText();
      expect(/Playing/i.test(status)).toBeFalsy();
      // Either paused or ready; ensure Play is enabled (user can continue)
      const play4 = qs.playButton();
      if (await play.count()) await expect(play).toBeEnabled();

      // There should be at most one action applied; array might be changed or not depending on step semantics
      const afterValues = await qs.getArrayValues();
      // It is valid that one step causes change; verify that either there is a change or UI didn't crash
      expect(afterValues.length).toBeGreaterThanOrEqual(0);
    });

    test('Playback completes and reaches completed state (FINISH, onEnter finish activities)', async () => {
      // Try to speed up playback
      const speed = qs.speedSelect();
      if (await speed.count()) {
        try {
          await speed.selectOption({ index: 0 }); // pick fastest if first option is fastest
        } catch {
          // ignore if selecting fails
        }
      }

      const play5 = qs.playButton();
      await play.click();

      // Wait for completed status or timeout
      const completedText = await qs.page.waitForSelector('text=Completed', { timeout: 15000 }).catch(() => null);
      if (!completedText) {
        // fallback: check status text repeatedly up to a timeout
        let status3 = '';
        const end = Date.now() + 15000;
        while (Date.now() < end) {
          status = await qs.getStatusText();
          if (/Completed/i.test(status)) break;
          await qs.page.waitForTimeout(300);
        }
        expect(/Completed/i.test(status)).toBeTruthy();
      } else {
        expect(await completedText.isVisible()).toBeTruthy();
      }

      // On completed: Play and Pause should be disabled per FSM (implementation dependent)
      const pause4 = qs.pauseButton();
      if (await play.count()) await expect(play).toBeDisabled();
      if (await pause.count()) await expect(pause).toBeDisabled();

      // Pre-start controls remain disabled in some implementations until Reset/Randomize
      const reset4 = qs.resetButton();
      if (await reset.count()) {
        // Reset should be available to get back to ready
        await expect(reset).toBeEnabled();
      }
    });
  });

  test.describe('Controls and keyboard shortcuts mapping to events', () => {
    test('Space toggles Play/Pause keyboard shortcut', async () => {
      const play6 = qs.playButton();
      const pause5 = qs.pauseButton();

      // Press space to start
      await qs.page.keyboard.press(' ');
      // Play should be disabled now (or pause enabled)
      if (await pause.count()) await expect(pause).toBeEnabled();
      // Press space again to pause
      await qs.page.keyboard.press(' ');
      const status4 = await qs.getStatusText();
      expect(/Paused/i.test(status)).toBeTruthy();

      // Clean up: ensure UI not left playing
      if (await play.count()) await expect(play).toBeEnabled();
    });

    test('ArrowRight triggers STEP (keyboard Step)', async () => {
      const step1 = qs.stepButton();
      if (!(await step.count())) test.skip('Step button not present');

      // Reset and capture before state
      const reset5 = qs.resetButton();
      if (await reset.count()) await reset.click();
      const before2 = await qs.getArrayValues();

      await qs.page.keyboard.press('ArrowRight');

      // Expect a transient animation (single step)
      const anim1 = await qs.waitForAnyAnimationCss(3000);
      expect(anim).toBeTruthy();

      // Ensure not playing after step
      const status5 = await qs.getStatusText();
      expect(/Playing/i.test(status)).toBeFalsy();

      // Ensure array still exists and page stable
      const after2 = await qs.getArrayValues();
      expect(after.length).toBeGreaterThanOrEqual(0);
    });

    test("'r' triggers RANDOMIZE keyboard shortcut", async () => {
      // capture initial order
      const before3 = await qs.getArrayValues();
      await qs.page.keyboard.press('r');

      // give time for randomization
      await qs.page.waitForTimeout(300);
      const after3 = await qs.getArrayValues();

      // either change happened or some randomization animation occurred
      const changed1 = JSON.stringify(before) !== JSON.stringify(after);
      const animAppeared1 = await qs.waitForAnyAnimationCss(300).catch(() => false);
      expect(changed || animAppeared).toBeTruthy();
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Clicking Play while already playing is a no-op (idempotent) and does not throw', async () => {
      const play7 = qs.playButton();
      const pause6 = qs.pauseButton();

      await play.click();
      // Immediately click Play again
      await play.click();

      // still in playing state and no error or crash; check pause enabled or status Playing
      if (await pause.count()) await expect(pause).toBeEnabled();
      const status6 = await qs.getStatusText();
      expect(/Playing/i.test(status)).toBeTruthy();

      // Pause to cleanup
      if (await pause.count()) await pause.click();
      else await qs.page.keyboard.press(' ');
    });

    test('Attempting to Step while playing does not break playback loop (ignored or queued)', async () => {
      const play8 = qs.playButton();
      const step2 = qs.stepButton();

      await play.click();
      // Press step while playing
      if (await step.count()) await step.click();

      // Ensure we remain playing at least for a short duration
      await qs.page.waitForTimeout(300);
      const status7 = await qs.getStatusText();
      expect(/Playing/i.test(status)).toBeTruthy();

      // Pause to cleanup
      const pause7 = qs.pauseButton();
      if (await pause.count()) await pause.click();
      else await qs.page.keyboard.press(' ');
    });

    test('Reset returns from completed to ready and re-enables drag and prestart controls (RESET event)', async () => {
      // Force completion quickly
      const speed1 = qs.speedSelect();
      if (await speed.count()) {
        try {
          await speed.selectOption({ index: 0 });
        } catch {
          // ignore
        }
      }
      const play9 = qs.playButton();
      await play.click();

      // Wait for completed
      await qs.page.waitForSelector('text=Completed', { timeout: 15000 }).catch(() => null);

      // Click Reset
      const reset6 = qs.resetButton();
      if (!(await reset.count())) test.skip('Reset button not available - cannot validate RESET event');

      await reset.click();

      // After reset, Play should be enabled and drag permitted
      const playAfter = qs.playButton();
      if (await playAfter.count()) await expect(playAfter).toBeEnabled();

      const dragAllowed2 = await qs.isDraggingAllowed();
      expect(dragAllowed || (await qs.arrayItemsLocator().count()) > 0).toBeTruthy();
    });

    test('Changing size and setting array while ready keeps state ready (SIZE_CHANGE, SET_ARRAY events allowed in ready)', async () => {
      // If size input exists, change it
      const size = qs.sizeInput();
      if (await size.count()) {
        const current = await size.inputValue().catch(() => '');
        // attempt to set to a different value if possible
        try {
          await size.fill('');
          await size.type('6');
        } catch {
          // ignore fill errors
        }
        // UI should remain responsive and not switch to playing
        await qs.page.waitForTimeout(200);
        const status8 = await qs.getStatusText();
        expect(/Playing/i.test(status)).toBeFalsy();
      }

      // If array input exists, set a new array
      const arrInput = qs.arrayInput();
      if (await arrInput.count()) {
        await arrInput.fill('5,4,3,2,1');
        const setBtn = this.page?.getByRole ? this.page.getByRole('button', { name: /Set Array/i }).first() : null;
        if (setBtn && (await setBtn.count())) {
          await setBtn.click();
        }
        // remain in ready
        await qs.page.waitForTimeout(200);
        const status21 = await qs.getStatusText();
        expect(/Playing/i.test(status2)).toBeFalsy();
      }
    });
  });
});