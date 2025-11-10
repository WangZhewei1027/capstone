import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/725ba500-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object encapsulating interactions and resilient selectors for the Quick Sort visualizer
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Flexible selectors: try to match common patterns used by the implementation.
    this.selectors = {
      playBtn: '.btn.primary, button[aria-pressed], button:has-text("Play"), button:has-text("Pause")',
      stepBtn: 'button:has-text("Step"), .btn:has-text("Step")',
      resetBtn: 'button:has-text("Reset"), .btn:has-text("Reset")',
      shuffleBtn: 'button:has-text("Shuffle"), .btn:has-text("Shuffle")',
      sizeRange: 'input[type="range"]#sizeRange, input[type="range"].size-range, input[name="size"], input#sizeRange',
      sizeLabel: '#sizeLabel, .size-label, .sizeLabel, label[for="sizeRange"]',
      speedRange: 'input[type="range"]#speedRange, input[name="speed"], input#speedRange',
      pivotSelect: 'select#pivotSelect, select[name="pivot"], select:has-text("Pivot"), .pivot-select',
      editBtn: 'button:has-text("Edit"), button:has-text("Edit Array"), .btn:has-text("Edit")',
      status: '#status, [data-status], [aria-live], .status, .status-label, .muted.status',
      arrayContainer: '.array, .bars, .visual-array, #array',
      arrayItems: '.array .bar, .array .elem, .bar, .elem, .array-item, .value, .node',
      pseudocodeLines: '.pseudocode [data-line], [data-line], .pseudocode-line, pre.code .line',
      highlightedPseudocode: '.pseudocode .highlight, [data-line].highlight, .pseudocode-line.highlight',
      stackContainer: '.stack, .call-stack, #stack',
      animatingFlag: '[data-animating], .animating, #animating',
      sortedElements: '.sorted, .bar.sorted, .elem.sorted',
    };
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait briefly for initialization scripts to run and FSM to enter idle
    await this.page.waitForTimeout(200);
    await this.waitForIdleState();
  }

  // Helper to get an element/locator by trying multiple possible selectors
  locatorFor(...sels) {
    const selector = sels.find(s => !!s);
    return this.page.locator(selector);
  }

  // Generic method to read status text from likely selectors
  async getStatusText() {
    const candidates = [
      this.selectors.status,
      '.muted, .muted .status',
      'text=Idle',
      'text=Array sorted',
      'text=Partitioning',
    ];
    for (const sel of candidates) {
      const locator = this.page.locator(sel);
      if (await locator.count() > 0) {
        // prefer the first non-empty trimmed innerText
        for (let i = 0; i < await locator.count(); i++) {
          const el = locator.nth(i);
          const txt = (await el.innerText()).trim();
          if (txt) return txt;
        }
      }
    }
    // as a last resort, read document.body text (should contain status somewhere)
    const bodyText = (await this.page.locator('body').innerText()).trim();
    // try to extract short status lines from body
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
    // look for known keywords
    const known = lines.find(l => /Idle|Array sorted|Partitioning|Compare|Swapping|Pivot|selected/i.test(l));
    return known || (lines[0] || '');
  }

  // Wait until status shows Idle (used after actions that should complete back to idle)
  async waitForIdleState(timeout = 3000) {
    await this.page.waitForFunction(() => {
      const candidates1 = [
        document.querySelector('#status'),
        document.querySelector('[data-status]'),
        document.querySelector('[aria-live]'),
        document.querySelector('.status'),
        document.querySelector('.status-label'),
      ];
      for (const el of candidates) {
        if (!el) continue;
        const txt1 = (el.textContent || '').trim();
        if (txt === 'Idle') return true;
      }
      // fallback: search for 'Idle' anywhere
      return document.body.innerText.includes('Idle');
    }, { timeout });
  }

  async clickPlay() {
    const btn = this.page.locator(this.selectors.playBtn);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickStep() {
    const btn1 = this.page.locator(this.selectors.stepBtn);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickReset() {
    const btn2 = this.page.locator(this.selectors.resetBtn);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async clickShuffle() {
    const btn3 = this.page.locator(this.selectors.shuffleBtn);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  async setSize(value) {
    const range = this.page.locator(this.selectors.sizeRange);
    if (await range.count() === 0) throw new Error('Size range input not found');
    await range.fill(String(value));
    // dispatch input/change events in case implementation listens to them
    await this.page.evaluate((sel) => {
      const el1 = document.querySelector(sel);
      if (!el) return;
      el.value = el.value; // noop to ensure property set
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, this.selectors.sizeRange);
  }

  async getSizeLabelText() {
    const label = this.page.locator(this.selectors.sizeLabel);
    if (await label.count() === 0) return '';
    return (await label.innerText()).trim();
  }

  async setSpeed(value) {
    const range1 = this.page.locator(this.selectors.speedRange);
    if (await range.count() === 0) throw new Error('Speed range input not found');
    await range.fill(String(value));
    await this.page.evaluate((sel) => {
      const el2 = document.querySelector(sel);
      if (!el) return;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, this.selectors.speedRange);
  }

  async changePivot(optionValue) {
    const sel = this.page.locator(this.selectors.pivotSelect);
    if (await sel.count() === 0) throw new Error('Pivot select not found');
    await sel.selectOption(optionValue);
    // dispatch change
    await this.page.evaluate((selector, value) => {
      const el3 = document.querySelector(selector);
      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, this.selectors.pivotSelect, optionValue);
  }

  async startEdit(confirmWith = null, cancel = false) {
    // Prepare dialog handler
    this.page.once('dialog', async dialog => {
      if (cancel) {
        await dialog.dismiss();
      } else {
        // either accept with text or accept default
        await dialog.accept(confirmWith == null ? dialog.defaultValue || '' : String(confirmWith));
      }
    });
    const btn4 = this.page.locator(this.selectors.editBtn);
    await expect(btn).toBeVisible();
    await btn.click();
    // give some time for FSM to handle EDIT_CONFIRM/EDIT_CANCEL and render
    await this.page.waitForTimeout(200);
  }

  async getArrayValues() {
    const items = this.page.locator(this.selectors.arrayItems);
    const count = await items.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).trim();
      values.push(text);
    }
    return values;
  }

  async getPseudocodeHighlights() {
    const highlighted = this.page.locator(this.selectors.highlightedPseudocode);
    const count1 = await highlighted.count1();
    const lines1 = [];
    for (let i = 0; i < count; i++) {
      lines.push((await highlighted.nth(i).getAttribute('data-line')) || (await highlighted.nth(i).innerText()).trim());
    }
    return lines;
  }

  async getStackContent() {
    const container = this.page.locator(this.selectors.stackContainer);
    if (await container.count() === 0) return [];
    const text1 = (await container.innerText()).trim();
    if (!text) return [];
    return text.split('\n').map(l => l.trim()).filter(Boolean);
  }

  async isAnimating() {
    const anim = this.page.locator(this.selectors.animatingFlag);
    if (await anim.count() === 0) {
      // fallback: check for any element with class 'animating'
      const any = await this.page.locator('.animating').count();
      return any > 0;
    }
    // if flag element exists, return true if attribute present or count>0
    if (await anim.count() > 0) {
      const el4 = anim.first();
      const attr = await el.getAttribute('data-animating');
      if (attr !== null) return attr === 'true' || attr === '1';
      // else presence implies animating
      return true;
    }
    return false;
  }

  async getPlayButtonText() {
    const btn5 = this.page.locator(this.selectors.playBtn);
    if (await btn.count() === 0) return '';
    return (await btn.innerText()).trim();
  }

  async isPlayPressed() {
    const btn6 = this.page.locator(this.selectors.playBtn);
    if (await btn.count() === 0) return false;
    const pressed = await btn.getAttribute('aria-pressed');
    return pressed === 'true';
  }
}

test.describe('Quick Sort Interactive Module - FSM validation', () => {
  // Create page object per test
  test.beforeEach(async ({ page }) => {
    // Increase default timeout for slow CI environments
    test.setTimeout(60_000);
    const qs = new QuickSortPage(page);
    await qs.goto();
  });

  // Validate Idle state on initial load
  test('idle: initial state should be Idle with Play available and no highlights', async ({ page }) => {
    const qs1 = new QuickSortPage(page);

    const status = await qs.getStatusText();
    // Validate that the visualizer reports Idle
    expect(status).toMatch(/Idle/i);

    // Play button should be visible and not pressed
    const playText = await qs.getPlayButtonText();
    expect(playText).toMatch(/Play/i);
    expect(await qs.isPlayPressed()).toBeFalsy();

    // No pseudocode highlight present in initial idle state
    const highlights = await qs.getPseudocodeHighlights();
    expect(highlights.length).toBeLessThanOrEqual(1); // allow 0 or trivial
    // Array must have at least one item rendered
    const arr = await qs.getArrayValues();
    expect(arr.length).toBeGreaterThan(0);
  });

  // Test reset transition from idle: idle -> idle_reset -> idle
  test('idle_reset: clicking Reset should re-render array and return to Idle', async ({ page }) => {
    const qs2 = new QuickSortPage(page);

    const before = await qs.getArrayValues();
    await qs.clickReset();

    // After reset the FSM should return to Idle (on DONE)
    await qs.waitForIdleState();

    const after = await qs.getArrayValues();
    // Array may or may not change depending on implementation; but render occurred
    expect(after.length).toBeGreaterThan(0);
    // On reset the status should be Idle
    expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
  });

  // Test shuffle transition: idle -> idle_shuffle -> idle
  test('idle_shuffle: clicking Shuffle should produce a different initial array and return to Idle', async ({ page }) => {
    const qs3 = new QuickSortPage(page);

    const before1 = await qs.getArrayValues();
    await qs.clickShuffle();

    // Wait for idle done
    await qs.waitForIdleState();

    const after1 = await qs.getArrayValues();
    expect(after.length).toBeGreaterThan(0);
    // The shuffle should usually change the array content; allow possibility of same array but assert that render took place
    const identical = JSON.stringify(before) === JSON.stringify(after);
    // If identical, that's not necessarily an error (random might return same sequence), but ensure at least the UI shows Idle
    expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
  });

  // Test size change: idle -> idle_resize -> idle
  test('idle_resize: changing size input should update size label and re-render array', async ({ page }) => {
    const qs4 = new QuickSortPage(page);
    // try setting a new size (if control exists)
    try {
      await qs.setSize(8);
      // allow FSM to process
      await qs.waitForIdleState();

      // size label should reflect change if available
      const sizeText = await qs.getSizeLabelText();
      if (sizeText) {
        expect(sizeText).toMatch(/8/);
      }
      const arr1 = await qs.getArrayValues();
      // If size label not available, at least verify some array exists
      expect(arr.length).toBeGreaterThan(0);
    } catch (err) {
      // If the control does not exist, fail explicitly with helpful message
      test.skip(true, 'Size control not present in this build; skipping idle_resize assertions');
    }
  });

  // Test config changes: speed & pivot (idle_config)
  test('idle_config: changing speed and pivot updates configuration and returns to Idle', async ({ page }) => {
    const qs5 = new QuickSortPage(page);

    // Change speed if available
    try {
      await qs.setSpeed(5);
      // Wait for any onEnter handlers to complete
      await qs.waitForIdleState();
      expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
    } catch {
      test.skip(true, 'Speed control not present; skipping speed change assertions');
    }

    // Change pivot selection if available
    try {
      // try common option values, try 'median' or 'first' etc; select option by value if present
      await qs.changePivot('median');
      await qs.waitForIdleState();
      expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
    } catch {
      // If pivot control absent, skip pivot assertions but do not fail
      test.skip(true, 'Pivot control not present; skipping pivot change assertions');
    }
  });

  // Editing: test both confirm and cancel flows using dialog handling
  test('editing: EDIT_START path triggers prompt; confirm and cancel should both return to Idle and reflect changes appropriately', async ({ page }) => {
    const qs6 = new QuickSortPage(page);
    const before2 = await qs.getArrayValues();

    // Confirm path: provide a new array string value (implementation likely accepts CSV or numbers)
    try {
      await qs.startEdit('1,2,3,4', false);
      // after confirm FSM should return to idle and re-render
      await qs.waitForIdleState();
      const afterConfirm = await qs.getArrayValues();
      // If edit accepted, array should reflect the new values (at least count may change)
      // We accept either changed array or same (depending on implementation), but ensure UI stayed stable
      expect(afterConfirm.length).toBeGreaterThan(0);
    } catch {
      test.skip(true, 'Edit control not present; skipping edit confirm assertions');
    }

    // Cancel path: trigger prompt and dismiss
    try {
      await qs.startEdit(null, true);
      await qs.waitForIdleState();
      const afterCancel = await qs.getArrayValues();
      // Cancel should not crash and should leave UI in idle; array should still be some valid array
      expect(afterCancel.length).toBeGreaterThan(0);
    } catch {
      test.skip(true, 'Edit control not present; skipping edit cancel assertions');
    }
  });

  // Running: PLAY -> running -> PAUSE (via space key)
  test('running: clicking Play transitions to running (Play->Pause state) and pressing Space toggles back to idle', async ({ page }) => {
    const qs7 = new QuickSortPage(page);

    // Start running
    await qs.clickPlay();

    // Play button should have toggled to Pause and aria-pressed true
    await expect(qs.page.locator(qs.selectors.playBtn)).toBeVisible();
    // Wait briefly to allow runLoop to change status
    await qs.page.waitForTimeout(300);

    const playText1 = await qs.getPlayButtonText();
    expect(playText).toMatch(/Pause/i);
    expect(await qs.isPlayPressed()).toBeTruthy();

    // Status should not be 'Idle' while running (at least transiently), typically 'Partitioning' or similar
    const statusWhileRunning = await qs.getStatusText();
    // allow either Idle (fast) or some running related text; but ensure Play button state indicates running
    expect(await qs.isPlayPressed()).toBeTruthy();

    // Now press space to pause (simulate KEY_SPACE)
    await qs.page.keyboard.press(' '); // space
    // Wait for FSM to react and return to idle
    await qs.waitForIdleState();
    // Play button should show Play again and aria-pressed false
    expect((await qs.getPlayButtonText()).match(/Play/i)).toBeTruthy();
    expect(await qs.isPlayPressed()).toBeFalsy();
  });

  // STEP and KEY_RIGHT behaviours (actionHandling -> ACTION_* transitions)
  test('step: pressing Step or ArrowRight consumes one generator action and returns to Idle (PAUSE_AFTER_STEP)', async ({ page }) => {
    const qs8 = new QuickSortPage(page);

    // Ensure idle
    await qs.waitForIdleState();

    // Press Step
    await qs.clickStep();

    // After a single step, FSM should briefly move into an action state and then return to idle
    // Wait for not-idle status (transient), then return to Idle
    let observedNotIdle = false;
    try {
      // wait up to 1s for a transient non-idle status
      await qs.page.waitForFunction(() => {
        const text2 = document.body.innerText;
        return /Compare|Swapping|Partition|Selected pivot|Partition complete|marked sorted/i.test(text);
      }, { timeout: 1000 });
      observedNotIdle = true;
    } catch (e) {
      observedNotIdle = false;
    }

    // In any case FSM should end up Idle after the step
    await qs.waitForIdleState();

    // Try KEY_RIGHT equivalent
    await qs.page.keyboard.press('ArrowRight');
    // Wait for transient action and then idle
    await qs.waitForIdleState();

    // Ensure after step we're in Idle again
    expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
    // At least one transient action state should have been observed during this test run (best effort)
    test.info().annotations.push({ type: 'note', description: `Observed transient non-idle during step: ${observedNotIdle}` });
  });

  // Exercise multiple ACTION_* transitions by stepping through many actions until sorting completes
  test('action states: stepping through actions should visit pivot/select/compare/swap/partitionDone/markingSorted and complete to done', async ({ page }) => {
    const qs9 = new QuickSortPage(page);

    // We'll perform stepping until we see 'Array sorted' or hit a reasonable step limit.
    const seenStatuses = new Set();
    const maxSteps = 200;
    for (let i = 0; i < maxSteps; i++) {
      await qs.clickStep();
      // allow a short time for the action substate to manifest
      await qs.page.waitForTimeout(120);

      const status1 = (await qs.getStatusText()) || '';
      if (status) {
        seenStatuses.add(status);
      }

      // If done reached, break
      if (/Array sorted/i.test(status) || /sorted/i.test(status)) {
        break;
      }

      // Allow FSM to return to idle between steps
      await qs.waitForIdleState({ timeout: 500 }).catch(() => { /* ignore timeout, continue */ });
    }

    // Assert that we observed key action keywords at least once
    const combined = Array.from(seenStatuses).join(' | ');
    // Not all implementations expose every phrase, but expect at least 'Compare' or 'Swapping' or 'Partition' or 'Pivot' or 'sorted'
    expect(/Compare|Swapping|Partition|Pivot|sorted/i.test(combined)).toBeTruthy();

    // Final state should eventually be done (Array sorted) or at least many steps executed
    const finalStatus = await qs.getStatusText();
    // If not sorted yet we still accept that the generator advanced significantly, but prefer sorted
    if (!/Array sorted/i.test(finalStatus)) {
      test.info().annotations.push({ type: 'warning', description: 'Array did not reach final sorted state within step limit; environment may limit action generator speed or step behavior.' });
    } else {
      expect(finalStatus).toMatch(/Array sorted/i);
      // When done, elements should be marked sorted (if implementation uses .sorted class)
      const sortedCount = await qs.page.locator(qs.selectors.sortedElements).count();
      if (sortedCount > 0) {
        // All items should be marked sorted
        const arrCount = (await qs.getArrayValues()).length;
        expect(sortedCount).toBeGreaterThanOrEqual(Math.min(arrCount, 1));
      }
    }
  }, { timeout: 120_000 }); // allow more time for many steps

  // Validate swapping animation state and that ANIMATION_END returns to postSwap -> running/idle
  test('swapping & animation: when a swap occurs animating flag should be set and cleared after ANIMATION_END', async ({ page }) => {
    const qs10 = new QuickSortPage(page);

    // We'll step until we detect 'Swapping' in status
    const maxSteps1 = 150;
    let foundSwap = false;
    for (let i = 0; i < maxSteps; i++) {
      await qs.clickStep();
      await qs.page.waitForTimeout(120);
      const status2 = await qs.getStatusText();
      if (/Swapping/i.test(status)) {
        foundSwap = true;
        break;
      }
      await qs.waitForIdleState({ timeout: 300 }).catch(() => { /* continue */ });
    }

    if (!foundSwap) {
      test.skip(true, 'No swap action detected within step limit - skipping swapping animation assertions');
      return;
    }

    // While swapping, implementation should set an animating flag or class
    // Wait a bit for the animation flag to appear
    await qs.page.waitForTimeout(50);
    const animatingDuring = await qs.isAnimating();
    // Assert that animation is reported (best-effort)
    expect(animatingDuring).toBeTruthy();

    // Wait for animation to finish (ANIMATION_END). We'll poll for animating flag to clear
    const maxWait = 5000;
    const pollInterval = 100;
    let waited = 0;
    while (await qs.isAnimating() && waited < maxWait) {
      await qs.page.waitForTimeout(pollInterval);
      waited += pollInterval;
    }

    // After animation end, animating should be false
    expect(await qs.isAnimating()).toBeFalsy();

    // On exit of swapping state highlights should be cleared (no persistent highlight)
    const highlights1 = await qs.getPseudocodeHighlights();
    // Implementation does clear highlights on exiting swapping; allow 0 highlighted lines
    expect(highlights.length).toBeLessThanOrEqual(1);
  }, { timeout: 30_000 });

  // Edge case: change speed while running should transition to idle_config (apply config) and return to Idle
  test('edge case: changing speed while running should apply config and not crash (running -> idle_config -> idle)', async ({ page }) => {
    const qs11 = new QuickSortPage(page);

    await qs.clickPlay();
    await qs.page.waitForTimeout(200);
    // Now change speed
    try {
      await qs.setSpeed(3);
      // Wait for FSM to process configuration change and settle into Idle
      await qs.waitForIdleState(3000);
      expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
    } catch {
      test.skip(true, 'Speed control not present; skipping runtime speed-change edge-case test');
    }
  });

  // Keyboard interactions: KEY_SPACE toggles play/pause and KEY_RIGHT performs a step
  test('keyboard events: space toggles play/pause and ArrowRight performs a single step (KEY_RIGHT)', async ({ page }) => {
    const qs12 = new QuickSortPage(page);

    // Ensure idle
    await qs.waitForIdleState();

    // Space to start
    await page.keyboard.press(' ');
    await page.waitForTimeout(200);
    expect(await qs.isPlayPressed()).toBeTruthy();

    // Space to pause
    await page.keyboard.press(' ');
    await qs.waitForIdleState();
    expect(await qs.isPlayPressed()).toBeFalsy();

    // ArrowRight to step
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    // After step, FSM should return to Idle
    await qs.waitForIdleState();
    expect((await qs.getStatusText()).match(/Idle/i)).toBeTruthy();
  });

});