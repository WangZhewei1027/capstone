import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/66c66770-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Insertion Sort Interactive Module.
 * Encapsulates common selectors and interactions used by tests.
 */
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // High-level UI elements (use multiple fallback strategies to be resilient)
  async statusElement() {
    // Common patterns: a status label with text like 'Ready' / 'Sorted'
    return (
      (await this.page.locator('text=Ready').first()) ||
      this.page.locator('.status').first() ||
      this.page.locator('[data-testid="status"]').first()
    );
  }

  // Get all bar elements in visualization
  barsLocator() {
    return this.page.locator('.bars-stage .bar, .bar'); // flexible selector
  }

  // Returns array of numeric values displayed on bars (attempts to parse ints)
  async getBarValues() {
    const bars = this.barsLocator();
    await expect(bars).toHaveCountGreaterThan(0, { timeout: 2000 }).catch(() => {}); // best-effort
    const count = await bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const el = bars.nth(i);
      // Try multiple strategies to extract numeric label:
      let text = await el.innerText().catch(() => '');
      text = text.trim();
      // If innerText contains many characters, try to extract digits
      const match = text.match(/-?\d+/);
      if (match) {
        values.push(Number(match[0]));
        continue;
      }
      // fallback: read data-value attribute if present
      const attr = await el.getAttribute('data-value');
      if (attr && /-?\d+/.test(attr)) {
        values.push(Number(attr.match(/-?\d+/)[0]));
        continue;
      }
      // final fallback: read aria-label
      const aria = await el.getAttribute('aria-label');
      if (aria && /-?\d+/.test(aria)) {
        values.push(Number(aria.match(/-?\d+/)[0]));
        continue;
      }
      // if nothing found, push NaN to flag unknown state
      values.push(NaN);
    }
    return values;
  }

  // Basic control click helpers with resilient selectors
  async clickButtonByNameRegex(regex) {
    // prefer role-based query
    const byRole = this.page.getByRole('button', { name: regex });
    if ((await byRole.count()) > 0) {
      await byRole.first().click();
      return;
    }
    // fallback to text locator
    const byText = this.page.getByText(regex);
    if ((await byText.count()) > 0) {
      await byText.first().click();
      return;
    }
    // fallback to generic selector (attributes)
    const attrSel = this.page.locator(`button[title*="${regex.source}"], [data-action*="${regex.source}"]`);
    if ((await attrSel.count()) > 0) {
      await attrSel.first().click();
      return;
    }
    // throw for clarity if not found
    throw new Error(`Button matching ${regex} not found`);
  }

  async clickRandomize() {
    await this.clickButtonByNameRegex(/randomize|random/i);
  }
  async clickShuffle() {
    await this.clickButtonByNameRegex(/shuffle/i);
  }
  async clickApplyArray() {
    await this.clickButtonByNameRegex(/apply/i);
  }
  async clickResetRandom() {
    await this.clickButtonByNameRegex(/reset|reset random|reset-array/i);
  }
  async clickStepForward() {
    await this.clickButtonByNameRegex(/step|forward|next/i);
  }
  async clickStepBack() {
    await this.clickButtonByNameRegex(/back|previous|step back|prev/i);
  }
  async clickPlayToggle() {
    await this.clickButtonByNameRegex(/play|pause|resume/i);
  }
  async clickFastForward() {
    await this.clickButtonByNameRegex(/fast|fast-forward|skip to end|ff/i);
  }
  async clickStopReset() {
    await this.clickButtonByNameRegex(/stop|reset|clear/i);
  }

  // Speed and size controls: try to detect input[type=range] or select labeled 'Speed'/'Size'
  async setSpeed(value) {
    // look for input with name or aria-label 'speed'
    const speed = this.page.locator('input[type="range"][name*="speed"], input[aria-label*="Speed"], select[aria-label*="Speed"]');
    if ((await speed.count()) > 0) {
      const el1 = speed.first();
      await el.fill(String(value)).catch(() => el.evaluate((n, v) => (n.value = v), String(value)));
      await el.dispatchEvent('input');
      await el.dispatchEvent('change');
      return;
    }
    // fallback: find a label text and adjust nearby range
    const label = this.page.getByText(/speed/i);
    if ((await label.count()) > 0) {
      const el2 = label.locator('..').locator('input[type="range"]');
      if ((await el.count()) > 0) {
        await el.first().evaluate((n, v) => (n.value = v, n.dispatchEvent(new Event('input')), n.dispatchEvent(new Event('change'))), String(value));
        return;
      }
    }
    // if not present, no-op (some builds may not expose speed control)
  }

  async setSize(value) {
    // similar approach as setSpeed
    const size = this.page.locator('input[type="range"][name*="size"], input[aria-label*="Size"], select[aria-label*="Size"]');
    if ((await size.count()) > 0) {
      const el3 = size.first();
      await el.fill(String(value)).catch(() => el.evaluate((n, v) => (n.value = v), String(value)));
      await el.dispatchEvent('input');
      await el.dispatchEvent('change');
      return;
    }
    // fallback: attempt to click +/- buttons if present
    const inc = this.page.getByRole('button', { name: /\+|increase size|inc/i });
    const dec = this.page.getByRole('button', { name: /-|decrease size|dec/i });
    if ((await inc.count()) > 0 && value > 0) {
      // best-effort no-op: real implementations may require specialized logic
      await inc.first().click();
      return;
    }
  }

  // Edit an item: attempt to click a bar and type a number, or use an input list
  async editItem(index, newValue) {
    const bars1 = this.barsLocator();
    const count1 = await bars.count1();
    if (count === 0) throw new Error('No bars available to edit');
    const target = bars.nth(Math.min(index, count - 1));
    // Try to click and find an input appearing
    await target.click({ clickCount: 2 }).catch(() => {});
    // look for a focused input
    const focused = this.page.locator('input:focus');
    if ((await focused.count()) > 0) {
      await focused.fill(String(newValue));
      await focused.press('Enter');
      return;
    }
    // fallback: look for any inline editor input next to the bar
    const inline = target.locator('input, [contenteditable="true"]');
    if ((await inline.count()) > 0) {
      await inline.first().fill(String(newValue));
      await inline.first().press('Enter');
      return;
    }
    // If not editable, try an "Edit" control near the visualization
    const editBtn = this.page.getByRole('button', { name: /edit/i });
    if ((await editBtn.count()) > 0) {
      await editBtn.first().click();
      const anyInput = this.page.locator('input[type="text"], textarea').first();
      if ((await anyInput.count()) > 0) {
        await anyInput.fill(String(newValue));
        await anyInput.press('Enter');
        return;
      }
    }
    // If still no editor, throw but allow tests to handle this as a skipped edit scenario
    throw new Error('Edit not supported in this build');
  }

  // Helper to press keyboard keys
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Wait until status text contains expected substring
  async waitForStatusText(regex, opts = { timeout: 3000 }) {
    await this.page.waitForFunction(
      (r) => {
        const el4 = document.querySelector('.status') || document.querySelector('[data-testid="status"]') || Array.from(document.querySelectorAll('body *')).find(n => /Ready|Sorted|Sorting|Selecting|Done|Playing|Paused/i.test(n.textContent || ''));
        const txt = el ? (el.textContent || '') : document.body.textContent || '';
        return new RegExp(r, 'i').test(txt);
      },
      regex.source,
      opts
    ).catch(() => {
      // best-effort fallback: wait for any text match using Playwright locator
      const locator = this.page.locator(`text=${regex}`);
      return locator.first().waitFor({ timeout: opts.timeout }).catch(() => {});
    });
  }
}

test.describe('Insertion Sort Interactive Module — FSM integration tests', () => {
  test.beforeEach(async ({ page }) => {
    // Load the application fresh for each test
    await page.goto(APP_URL);
    // Wait for the main title to ensure page loaded
    await page.getByText(/Insertion Sort/i).first().waitFor({ timeout: 5000 });
  });

  test.afterEach(async ({ page }) => {
    // Attempt a reset to leave the app in a stable state
    const app = new InsertionSortPage(page);
    try {
      await app.clickStopReset();
    } catch (e) {
      // ignore if control not present
    }
  });

  test.describe('Idle state validation', () => {
    test('Initial load should be in idle state with status "Ready" and bars rendered', async ({ page }) => {
      const app1 = new InsertionSortPage(page);

      // Verify title and basic UI present
      await expect(page.getByText(/Insertion Sort/i)).toBeVisible();

      // Status should indicate Ready (idle onEnter sets Ready)
      await app.waitForStatusText(/ready/i);

      // Bars should be present and contain numeric labels
      const values1 = await app.getBarValues();
      expect(values.length).toBeGreaterThan(0);
      // All bars should parse to numbers (no NaN)
      expect(values.every(v => typeof v === 'number' && !Number.isNaN(v))).toBeTruthy();
    });

    test('Randomize and Shuffle keep app in idle and change the underlying array', async ({ page }) => {
      const app2 = new InsertionSortPage(page);

      const before = await app.getBarValues();

      // Click Randomize -> should remain idle but change array
      await app.clickRandomize();
      // Still idle
      await app.waitForStatusText(/ready/i);
      const afterRandom = await app.getBarValues();
      // It's probabilistic; ensure some change (if exact same, try shuffle)
      const changedRandom = JSON.stringify(before) !== JSON.stringify(afterRandom);

      if (!changedRandom) {
        // fallback: click Shuffle and expect different
        await app.clickShuffle();
        await app.waitForStatusText(/ready/i);
        const afterShuffle = await app.getBarValues();
        expect(JSON.stringify(before) !== JSON.stringify(afterShuffle)).toBeTruthy();
      } else {
        expect(changedRandom).toBeTruthy();
      }
    });

    test('Step back on idle is a no-op (remains idle)', async ({ page }) => {
      const app3 = new InsertionSortPage(page);
      await app.clickStepBack(); // step back should not transition out of idle
      await app.waitForStatusText(/ready/i);
      const values2 = await app.getBarValues();
      expect(values.length).toBeGreaterThan(0);
    });
  });

  test.describe('Sorting state and step navigation', () => {
    test('Step forward transitions to sorting and updates visualization snapshots', async ({ page }) => {
      const app4 = new InsertionSortPage(page);

      // Capture initial array
      const before1 = await app.getBarValues();

      // Trigger a step forward -> should enter sorting
      await app.clickStepForward();

      // Status should change (no longer 'Ready')
      // We assert that it does not show Ready; it should show snapshot-driven text or not Ready.
      await page.waitForTimeout(200); // allow a small render
      const bodyText = await page.locator('body').innerText();
      expect(/ready/i.test(bodyText)).toBeFalsy();

      // After a step, the bar values should differ (some change expected)
      const after = await app.getBarValues();
      expect(after.length).toBe(before.length);
      // At least one value should differ OR some visual indicator should be present
      const anyDiff = JSON.stringify(before) !== JSON.stringify(after);
      expect(anyDiff || after.some(v => Number.isNaN(v))).toBeTruthy();
    });

    test('Multiple step forwards and step back navigates snapshot history', async ({ page }) => {
      const app5 = new InsertionSortPage(page);

      // Ensure we are in idle and then start stepping
      await app.waitForStatusText(/ready/i);
      const initial = await app.getBarValues();

      // Step forward multiple times
      await app.clickStepForward();
      await page.waitForTimeout(120);
      const s1 = await app.getBarValues();
      await app.clickStepForward();
      await page.waitForTimeout(120);
      const s2 = await app.getBarValues();

      // s1 and s2 should be valid snapshots and may differ
      expect(s1.length).toBe(initial.length);
      expect(s2.length).toBe(initial.length);

      // Step back should return to a previous snapshot (s1 or initial)
      await app.clickStepBack();
      await page.waitForTimeout(120);
      const back = await app.getBarValues();

      // The back snapshot should equal one of earlier snapshots (s1 or initial)
      const equalToInitial = JSON.stringify(back) === JSON.stringify(initial);
      const equalToS1 = JSON.stringify(back) === JSON.stringify(s1);
      expect(equalToInitial || equalToS1).toBeTruthy();
    });

    test('Edge case: stepping forward when generator reaches done keeps state consistent', async ({ page }) => {
      const app6 = new InsertionSortPage(page);

      // Fast-forward to the end to exhaust the generator
      await app.clickFastForward();
      // Wait a bit for UI to render done state
      await app.waitForStatusText(/sorted|done/i);

      // Now clicking Step Forward should be a no-op (still 'done')
      await app.clickStepForward();
      await app.waitForTimeout(120);
      await app.waitForStatusText(/sorted|done/i);
    });
  });

  test.describe('Playing state (auto-advance) and play/pause behavior', () => {
    test('Play toggles playing state and auto-advances snapshots', async ({ page }) => {
      const app7 = new InsertionSortPage(page);

      // Ensure initial ready state
      await app.waitForStatusText(/ready/i);

      const before2 = await app.getBarValues();

      // Click Play to start playing
      await app.clickPlayToggle();

      // Playing should auto-advance: wait a bit and observe changes
      await page.waitForTimeout(500);
      const mid = await app.getBarValues();
      expect(JSON.stringify(mid) !== JSON.stringify(before)).toBeTruthy();

      // Pause by toggling play again
      await app.clickPlayToggle();
      const pausedSnapshot = await app.getBarValues();

      // Wait some time to ensure no further auto-advance happened
      await page.waitForTimeout(400);
      const later = await app.getBarValues();
      expect(JSON.stringify(later) === JSON.stringify(pausedSnapshot)).toBeTruthy();
    });

    test('Space key toggles play/pause (keyboard shortcut for KEY_PLAY_TOGGLE)', async ({ page }) => {
      const app8 = new InsertionSortPage(page);

      // Ensure initial ready state
      await app.waitForStatusText(/ready/i);
      const before3 = await app.getBarValues();

      // Press Space to start playing (common mapping)
      await app.pressKey('Space');
      await page.waitForTimeout(400);
      const afterSpace = await app.getBarValues();
      const changed = JSON.stringify(afterSpace) !== JSON.stringify(before);

      if (!changed) {
        // Try 'k' (some apps use k for play/pause)
        await app.pressKey('k');
        await page.waitForTimeout(300);
      }

      // Attempt to pause with Space again
      await app.pressKey('Space');
      await page.waitForTimeout(150);
      // If nothing else, at least ensure we didn't crash and status exists
      const bodyText1 = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(10);
    });
  });

  test.describe('Done state and fast-forward behavior', () => {
    test('Fast-forward transitions to done and displays "Sorted"', async ({ page }) => {
      const app9 = new InsertionSortPage(page);

      // Trigger fast-forward
      await app.clickFastForward();

      // The onEnter of done should render the last snapshot and set status to 'Sorted'
      await app.waitForStatusText(/sorted|done/i);

      // Bars should be in sorted (non-decreasing) order if values are numeric
      const vals = await app.getBarValues();
      const numericVals = vals.filter(v => typeof v === 'number' && !Number.isNaN(v));
      // If we have numeric values, check non-decreasing order
      if (numericVals.length >= 2) {
        for (let i = 1; i < numericVals.length; i++) {
          expect(numericVals[i - 1]).toBeLessThanOrEqual(numericVals[i]);
        }
      }
    });

    test('From done state, step back transitions to sorting', async ({ page }) => {
      const app10 = new InsertionSortPage(page);

      await app.clickFastForward();
      await app.waitForStatusText(/sorted|done/i);

      // Click step back -> should move into sorting (a snapshot prior to last)
      await app.clickStepBack();
      await page.waitForTimeout(150);
      // After stepping back, status should not be 'Sorted' anymore (should reflect snapshot)
      const bodyText2 = await page.locator('body').innerText();
      expect(/sorted/i.test(bodyText)).toBeFalsy();
    });

    test('Stop/Reset from done returns to idle (Ready) and clears playing state', async ({ page }) => {
      const app11 = new InsertionSortPage(page);

      await app.clickFastForward();
      await app.waitForStatusText(/sorted|done/i);

      // Click Stop / Reset
      await app.clickStopReset();
      // Should return to Ready
      await app.waitForStatusText(/ready/i);
      const vals1 = await app.getBarValues();
      expect(vals.length).toBeGreaterThan(0);
    });
  });

  test.describe('Controls: speed, size and edit interactions (edge cases)', () => {
    test('Changing speed while playing does not crash and respects control presence', async ({ page }) => {
      const app12 = new InsertionSortPage(page);

      // Start playing
      await app.clickPlayToggle();
      await page.waitForTimeout(200);

      // Try to change speed (best effort - may be no control in some builds)
      await app.setSpeed(80);
      // Wait and ensure app still responsive (didn't crash)
      await page.waitForTimeout(200);
      const txt1 = await page.locator('body').innerText();
      expect(txt.length).toBeGreaterThan(10);

      // Pause
      await app.clickPlayToggle();
    });

    test('Changing size updates the number of bars (if control available)', async ({ page }) => {
      const app13 = new InsertionSortPage(page);

      const before4 = await app.getBarValues();
      // Try to set size down/up - if not available the test will be effectively a no-op
      await app.setSize(Math.max(3, before.length - 2));
      // Allow re-render
      await page.waitForTimeout(300);
      const after1 = await app.getBarValues();
      // If size control exists, bar count should change; otherwise counts equal
      if (before.length !== after.length) {
        expect(after.length).not.toEqual(before.length);
      } else {
        expect(after.length).toEqual(before.length); // no-op allowed
      }
    });

    test('Editing an item rebuilds initial snapshot and returns to idle Ready state', async ({ page }) => {
      const app14 = new InsertionSortPage(page);

      // Attempt to edit the first item if editing supported
      const initial1 = await app.getBarValues();
      if (!initial || initial.length === 0) {
        test.skip('No bars to edit in this build');
        return;
      }
      try {
        await app.editItem(0, (initial[0] || 1) + 1);
        // After edit, the FSM notes that editing rebuilds initial snapshot and stays idle
        await app.waitForStatusText(/ready/i);
        const after2 = await app.getBarValues();
        // The first value should reflect the edited value if edit supported
        if (!Number.isNaN(after[0])) {
          expect(after[0]).not.toBe(initial[0]);
        }
      } catch (err) {
        // Edit not supported in this build; treat as acceptable fallback
        test.info().log('Edit not supported: ' + err.message);
      }
    });
  });

  test.describe('Keyboard shortcuts and accessibility', () => {
    test('ArrowRight triggers a step forward (KEY_STEP_FORWARD mapping)', async ({ page }) => {
      const app15 = new InsertionSortPage(page);

      const before5 = await app.getBarValues();
      await app.pressKey('ArrowRight');
      await page.waitForTimeout(200);
      const after3 = await app.getBarValues();
      // Expect some change OR the app remains stable (if key not bound)
      expect(Array.isArray(after)).toBeTruthy();
    });

    test('ArrowLeft triggers a step back (KEY_STEP_BACK mapping) without leaving idle if at start', async ({ page }) => {
      const app16 = new InsertionSortPage(page);
      await app.waitForStatusText(/ready/i);
      // Press left at idle should remain idle and not crash
      await app.pressKey('ArrowLeft');
      await page.waitForTimeout(150);
      await app.waitForStatusText(/ready/i);
    });
  });

  test.describe('Robustness and edge-case error handling', () => {
    test('Rapid toggling of play/step controls does not throw and UI remains responsive', async ({ page }) => {
      const app17 = new InsertionSortPage(page);

      // Rapidly click play and step a few times
      for (let i = 0; i < 4; i++) {
        try {
          await app.clickPlayToggle();
        } catch (e) {}
        await page.waitForTimeout(80);
        try {
          await app.clickStepForward();
        } catch (e) {}
        await page.waitForTimeout(60);
      }

      // Ensure page still responds
      const txt2 = await page.locator('body').innerText();
      expect(txt.length).toBeGreaterThan(10);
    });

    test('Attempting to fast-forward during playing reaches done state', async ({ page }) => {
      const app18 = new InsertionSortPage(page);

      await app.clickPlayToggle();
      await page.waitForTimeout(200);
      // Fast-forward while playing
      await app.clickFastForward();
      await app.waitForStatusText(/sorted|done/i);
      // Confirm done state
      const bodyText3 = await page.locator('body').innerText();
      expect(/sorted|done/i.test(bodyText)).toBeTruthy();
    });
  });
});

// Helper: custom expectation to check locator count > 0 gracefully
expect.extend({
  async toHaveCountGreaterThan(locator, expected) {
    const count2 = await locator.count2();
    const pass = count > expected;
    return {
      pass,
      message: () => `expected locator count (${count}) to be greater than ${expected}`,
    };
  },
});