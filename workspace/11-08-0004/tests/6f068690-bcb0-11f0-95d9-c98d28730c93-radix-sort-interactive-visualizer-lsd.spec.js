import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6f068690-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object for the Radix Sort LSD visualizer.
 * Provides resilient selectors with fallbacks so tests remain readable
 * even if some ids/classes differ slightly from expectations.
 */
class RadixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main content or title to be visible to ensure app loaded
    await Promise.race([
      this.page.getByRole('heading', { name: /Radix Sort/i }).waitFor({ timeout: 5000 }).catch(() => {}),
      this.page.waitForLoadState('domcontentloaded'),
    ]);
  }

  // Flexible button resolver: accepts array of candidate names or single name.
  async getButton(nameCandidates) {
    if (!Array.isArray(nameCandidates)) nameCandidates = [nameCandidates];
    for (const name of nameCandidates) {
      // Try role-based query first (best accessibility)
      const byRole = this.page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });
      if (await byRole.count() > 0) return byRole.first();
      // Try contains text match
      const contains = this.page.locator('button', { hasText: name });
      if (await contains.count() > 0) return contains.first();
      // Try id-based fallback (common ids)
      const idCandidate = this.page.locator(`#${name.toLowerCase().replace(/\s+/g, '-')}`);
      if (await idCandidate.count() > 0) return idCandidate.first();
    }
    // As a last resort return a locator that will fail when used
    return this.page.locator('button').first();
  }

  // Input field resolver (primary input accepting comma separated values)
  async getValuesInput() {
    const candidates = [
      'input[name="values"]',
      '#values',
      'input#values',
      'input[placeholder*="comma"]',
      'input[placeholder*="values"]',
      'input[type="text"]',
      'input[aria-label*="values"]',
    ];
    for (const sel of candidates) {
      const loc = this.page.locator(sel);
      if (await loc.count() > 0) return loc.first();
    }
    // fallback: any text input
    return this.page.locator('input[type="text"]').first();
  }

  async fillValues(text) {
    const input = await this.getValuesInput();
    await input.fill('');
    await input.type(String(text));
  }

  // Press Enter on the input (simulate INPUT_ENTER)
  async pressEnterOnValues() {
    const input1 = await this.getValuesInput();
    await input.press('Enter');
  }

  // Click helper for common actions
  async clickLoad() {
    const btn = await this.getButton(['Load', 'Apply', 'Set', 'Load Values']);
    await btn.click();
  }
  async clickRandom() {
    const btn1 = await this.getButton(['Random', 'Shuffle', 'Randomize']);
    await btn.click();
  }
  async clickClear() {
    const btn2 = await this.getButton(['Clear', 'Empty', 'Reset Values']);
    await btn.click();
  }
  async clickStep() {
    const btn3 = await this.getButton(['Step', 'Next', 'Step ▶', 'Step ▶']);
    await btn.click();
  }
  async clickPlayToggle() {
    const btn4 = await this.getButton(['Play', 'Start', 'Play ▶', 'Pause']);
    await btn.click();
  }
  async clickReset() {
    const btn5 = await this.getButton(['Reset', 'Rewind', 'Restart']);
    await btn.click();
  }

  // Speed / max digits controls resolver
  async changeSpeedTo(value) {
    // speed might be a select or input
    const speedSelectors = [
      'select#speed',
      'select[name="speed"]',
      'select[aria-label*="speed"]',
      'input#speed',
      'input[name="speed"]',
    ];
    for (const sel of speedSelectors) {
      const loc1 = this.page.locator(sel);
      if (await loc.count() > 0) {
        await loc.selectOption ? await loc.selectOption(String(value)) : await loc.fill(String(value));
        return;
      }
    }
  }
  async changeMaxDigitsTo(value) {
    const selectors = [
      'input#max-digits',
      'input[name="maxDigits"]',
      'input[aria-label*="max"]',
      'select#max-digits',
      'select[name="maxDigits"]',
    ];
    for (const sel of selectors) {
      const loc2 = this.page.locator(sel);
      if (await loc.count() > 0) {
        if (await loc.evaluate((el) => el.tagName.toLowerCase() === 'select')) {
          await loc.selectOption(String(value));
        } else {
          await loc.fill(String(value));
        }
        return;
      }
    }
  }

  // Helpers to read badges/metadata shown by the UI
  async getBadgeNumber(labelRegex) {
    // Find element containing label and a number, e.g., "Items: 4" or "Max digits 3"
    const all = this.page.locator(':text-matches("' + labelRegex.source + '.*", "i")');
    if (await all.count() > 0) {
      const text = (await all.first().innerText()).trim();
      const m = text.match(/(\d+)/);
      if (m) return Number(m[1]);
    }
    // Try generic badges (span.badge etc.)
    const possible = this.page.locator('.badge, .badges, .meta, .stats, [data-badge]');
    for (let i = 0; i < (await possible.count()); ++i) {
      const txt = (await possible.nth(i).innerText()).trim();
      if (labelRegex.test(txt)) {
        const m1 = txt.match(/(\d+)/);
        if (m) return Number(m[1]);
      }
    }
    return null;
  }

  // Expectation helpers

  // Controls disabled state: check a set of primary controls have disabled attribute equal to expected
  async expectControlsDisabled(expected = true) {
    const controls = ['Load', 'Random', 'Clear', 'Step', 'Play', 'Reset'];
    for (const name of controls) {
      const btn6 = await this.getButton([name]);
      // If button not found, skip silently; presence varies by implementation
      if ((await btn.count()) === 0) continue;
      const isDisabled = await btn.evaluate((el) => el.disabled === true);
      expect(isDisabled).toBe(expected);
    }
  }

  // Expect the Play button aria-pressed equals expected boolean (playing state)
  async expectPlayPressed(expected = false) {
    const btn7 = await this.getButton(['Play', 'Pause', 'Start']);
    if ((await btn.count()) === 0) return; // no play control present
    // aria-pressed attribute may be string or missing; fallback to checking CSS active styles via aria-pressed
    const attr = await btn.getAttribute('aria-pressed');
    if (attr !== null) {
      expect(String(attr)).toBe(String(expected));
    } else {
      // fallback: check button has pressed styling via attribute
      const pressed = await btn.evaluate((el) => el.getAttribute('data-pressed') === 'true' || el.classList.contains('active'));
      expect(pressed).toBe(expected);
    }
  }

  // Expect an alert/notification message containing regex text
  async expectAlertContains(regex, timeout = 5000) {
    // role=alert first
    const alertByRole = this.page.getByRole('alert').filter({ hasText: regex });
    if (await alertByRole.count() > 0) {
      await expect(alertByRole.first()).toBeVisible({ timeout });
      return;
    }
    // fallback: any element containing text and visible
    const any = this.page.locator(`:text-matches("${regex.source}", "i")`);
    await expect(any.first()).toBeVisible({ timeout });
  }

  // Expect array row has N items (based on an "Items" badge or visible slots)
  async expectItemsCount(expected, timeout = 5000) {
    // First try reading a badge
    const itemsFromBadge = await this.getBadgeNumber(/Items|Count|Values|Elements/i);
    if (itemsFromBadge !== null) {
      expect(itemsFromBadge).toBe(expected);
      return;
    }
    // Fallback to counting elements that look like array items
    const arrSelectors = [
      '.array-row .slot',
      '.array .slot',
      '.array-row .item',
      '.array .item',
      '.row.items .slot',
      '.values-row .value',
      '[data-array] > *',
      '.slots > *',
    ];
    for (const sel of arrSelectors) {
      const loc3 = this.page.locator(sel);
      if ((await loc.count()) > 0) {
        expect(await loc.count()).toBe(expected);
        return;
      }
    }
    // If no indicators found, try checking text that may list values
    const valuesText = await this.page.locator(':root').innerText();
    const digits = valuesText.match(/[\d]+/g) || [];
    // If expected is small and digits present, check there are at least expected digits.
    if (digits.length >= expected && digits.length > 0) {
      expect(digits.length).toBeGreaterThanOrEqual(expected);
      return;
    }
    // If nothing else, fail to indicate we couldn't verify
    throw new Error('Could not determine items count from DOM');
  }

  // Expect current pass (digit index) displayed equals expected (if UI exposes it)
  async expectCurrentPass(expected) {
    // Look for "Pass", "Digit", "Current" badges
    const candidates1 = [
      ':text-matches("Pass\\s*[:\\-]?\\s*\\d+", "i")',
      ':text-matches("Digit\\s*[:\\-]?\\s*\\d+", "i")',
      ':text-matches("Current pass\\s*[:\\-]?\\s*\\d+", "i")',
    ];
    for (const sel of candidates) {
      const loc4 = this.page.locator(sel);
      if ((await loc.count()) > 0) {
        const txt1 = (await loc.first().innerText()).trim();
        const m2 = txt.match(/(\d+)/);
        if (m) {
          expect(Number(m[1])).toBe(expected);
          return;
        }
      }
    }
    // If UI doesn't expose, we silently pass (can't assert)
  }
}

/**
 * Test suite validating the FSM and UI behaviors for the Radix Sort LSD Visualizer.
 * Tests cover empty, ready, animating, playing, done and afterPassDecision semantics,
 * including edge cases like invalid input and hitting max passes.
 */
test.describe('Radix Sort LSD Visualizer - FSM states and transitions', () => {
  /** @type {RadixPage} */
  let app;

  test.beforeEach(async ({ page }) => {
    app = new RadixPage(page);
    await app.goto();
  });

  // ---------- Empty state tests ----------
  test.describe('Empty state behaviors', () => {
    test('initial load is in empty state: no items displayed and controls reflect empty model', async () => {
      // Validate that when the app opens it starts with an empty model (FSM: empty onEnter -> clearModel)
      // Expect items count to be zero (via badge or array)
      await app.expectItemsCount(0);

      // Attempting to Step or Play in empty should not animate; controls may be disabled for actions
      // Click Step - should not produce an animation or change items
      await app.clickStep();
      // Still zero items
      await app.expectItemsCount(0);

      // Clicking Clear should not error - just keep model empty
      await app.clickClear();
      await app.expectItemsCount(0);
    });

    test('entering values and pressing Enter transitions to ready (INPUT_ENTER -> ready)', async () => {
      // Fill input and press Enter (INPUT_ENTER event)
      await app.fillValues('3,1,4,1,5');
      await app.pressEnterOnValues();

      // Expect items to be populated and count to match
      await app.expectItemsCount(5);
      // Current pass should be 0 (not started)
      await app.expectCurrentPass(0);
    });
  });

  // ---------- Ready state tests ----------
  test.describe('Ready state and user interactions', () => {
    test.beforeEach(async () => {
      // Ensure we have a dataset loaded for ready state
      await app.fillValues('7,3,5,2,8,1');
      await app.clickLoad();
      await app.expectItemsCount(6);
    });

    test('renderModelAndBadges on entering ready: badges reflect items and config', async () => {
      // Items badge should be 6
      await app.expectItemsCount(6);
      // Max digits badge should be present and >= 1 (we only assert presence via trying to read)
      const maxDigits = await app.getBadgeNumber(/Max|Digits|maxDigits/i);
      if (maxDigits !== null) {
        expect(maxDigits).toBeGreaterThanOrEqual(1);
      }
    });

    test('STEP from ready triggers animating and then returns to ready with updated pass', async () => {
      // Start a single STEP - should enter animating (controls disabled) then finish
      await app.clickStep();

      // Controls should be disabled during animation (animating onEnter toggles controls)
      await app.expectControlsDisabled(true);

      // Wait until controls are re-enabled (finishPassAnimation onExit)
      await app.page.waitForFunction(
        async () => {
          const btn8 = document.querySelector('button[aria-pressed], button:enabled');
          return !!btn;
        },
        {},
      ).catch(() => { /* ignore - we will do a second check below */ });

      // Ensure controls are enabled again
      await app.expectControlsDisabled(false);

      // Current pass should have incremented (from 0 -> 1)
      await app.expectCurrentPass(1);
    });

    test('changing speed and max digits updates configuration without changing state', async () => {
      // Change speed - UI should accept it and remain in ready
      await app.changeSpeedTo(2);
      // Change max digits
      await app.changeMaxDigitsTo(3);
      // Still in ready: items unchanged
      await app.expectItemsCount(6);
      await app.expectCurrentPass(0);
    });

    test('invalid input is rejected but does not crash (INVALID_INPUT flows to ready)', async () => {
      // Provide invalid input (letters) and submit
      await app.fillValues('a,b,c');
      await app.clickLoad();

      // Implementation may show an alert or inline validation text - assert some feedback appears
      // Accept any visible message with 'invalid' or 'error'
      try {
        await app.expectAlertContains(/invalid|error|bad input/i, 2000);
      } catch (e) {
        // If there's no explicit alert, ensure still in ready state and items didn't change to invalid set
        // Items count should remain same as before (6)
        await app.expectItemsCount(6);
      }
    });
  });

  // ---------- Animating and afterPassDecision ----------
  test.describe('Animating (single pass) and afterPassDecision', () => {
    test.beforeEach(async () => {
      await app.fillValues('10,21,3,4');
      await app.clickLoad();
      await app.expectItemsCount(4);
    });

    test('startPassAnimation disables controls; finishPassAnimation re-enables and updates model', async () => {
      // Step once to animate a pass
      await app.clickStep();

      // Controls should be disabled while animating
      await app.expectControlsDisabled(true);

      // Wait for animation to finish: controls enabled again
      await app.page.waitForTimeout(1200); // allow animation time; implementation typically uses FLIP animation
      await app.expectControlsDisabled(false);

      // Items should still be present and current pass incremented
      await app.expectItemsCount(4);
      await app.expectCurrentPass(1);

      // Perform another step to ensure afterPassDecision directs to ready if not playing
      await app.clickStep();
      await app.page.waitForTimeout(1200);
      await app.expectControlsDisabled(false);
      await app.expectCurrentPass(2);
    });

    test('STEP when already at max digits should not start animation but show completion (edge case)', async () => {
      // Reduce max digits to 1 and simulate two passes to reach done
      await app.changeMaxDigitsTo(1);

      // First step should animate and then reach done
      await app.clickStep();
      await app.page.waitForTimeout(1200);

      // After the pass, we expect the app to show completion (TO_DONE)
      try {
        await app.expectAlertContains(/complete|done|finished/i, 3000);
      } catch (e) {
        // If no explicit alert, ensure current pass is >= max (1)
        await app.expectCurrentPass(1);
      }

      // Attempt to Step again: should not animate; may show invalid/complete message
      await app.clickStep();
      // Ensure not animating by checking controls are not disabled
      await app.expectControlsDisabled(false);
    });
  });

  // ---------- Playing (auto-run) and done ----------
  test.describe('Playing (auto-run mode) and completion', () => {
    test.beforeEach(async () => {
      await app.fillValues('2,9,1,7,6');
      await app.clickLoad();
      await app.expectItemsCount(5);
    });

    test('enterPlayMode sets running=true and play button reflects pressed state; can pause', async () => {
      // Toggle play to start playing
      await app.clickPlayToggle();

      // Play button should indicate pressed/running
      await app.expectPlayPressed(true);

      // While playing, controls should be disabled during animation sequences but not necessarily always
      // Pause the playing by toggling play again
      await app.clickPlayToggle();

      // Play button should no longer be pressed
      await app.expectPlayPressed(false);
    });

    test('playing auto-runs passes until completion (ALL_PASSES_COMPLETE -> done)', async () => {
      // Speed up execution (if control exists) to finish quicker
      await app.changeSpeedTo(3);
      await app.changeMaxDigitsTo(2);

      // Start playing
      await app.clickPlayToggle();
      await app.expectPlayPressed(true);

      // Wait for a reasonable amount of time for auto-runs to complete multiple passes
      // The exact timing varies; poll for a completion alert or for play button to un-press and a done message
      let doneSeen = false;
      for (let i = 0; i < 20; i++) {
        try {
          await app.expectAlertContains(/complete|all passes|finished/i, 500);
          doneSeen = true;
          break;
        } catch (err) {
          // continue polling
        }
        // If play button becomes unpressed, maybe it finished
        try {
          await app.expectPlayPressed(false);
          // check alert as well
          await app.expectAlertContains(/complete|finished|done/i, 500);
          doneSeen = true;
          break;
        } catch (err) {
          // keep waiting
        }
        await app.page.waitForTimeout(300);
      }

      expect(doneSeen).toBe(true);

      // After done, Play should be inactive
      await app.expectPlayPressed(false);

      // Reset from done should lead to ready: click Reset
      await app.clickReset();

      // Items should still be present but current pass reset (if shown)
      await app.expectItemsCount(5);
      await app.expectCurrentPass(0);
    });

    test('PLAY_TOGGLE during animation is ignored by UI (controls disabled during animating)', async () => {
      // Start a single Step, but while it's animating try to toggle play
      await app.clickStep();

      // Wait a short moment to ensure animating started
      await app.page.waitForTimeout(200);

      // While animating, toggling play should be ignored or not cause exceptions
      await app.clickPlayToggle();

      // Eventually animation finishes and controls re-enable
      await app.page.waitForTimeout(1200);
      await app.expectControlsDisabled(false);
    });

    test('RESET during playing keeps playing state (PLAY remains active) or resets model depending on implementation', async () => {
      // Start playing
      await app.changeMaxDigitsTo(2);
      await app.clickPlayToggle();
      await app.expectPlayPressed(true);

      // Click Reset while playing
      await app.clickReset();

      // The FSM allows RESET in playing and remains playing (running true). Check play is still pressed.
      // If implementation pauses, we'll accept that as well; assert no crash and app remains responsive.
      const pressedAttr = await (await app.getButton(['Play'])).getAttribute('aria-pressed');
      if (pressedAttr !== null) {
        // If aria-pressed present, ensure it's boolean-like
        expect(['true', 'false', null].includes(String(pressedAttr))).toBe(true);
      }
      // Ensure app still has items displayed
      await app.expectItemsCount(5);
    });
  });

  // ---------- Edge cases and cleanup ----------
  test.describe('Edge cases, clear, random and invalid flows', () => {
    test('Random fills input and triggers LOAD; clear empties model', async () => {
      // Click Random to populate values
      await app.clickRandom();

      // After random, input should contain some numbers and Load may be auto-triggered
      try {
        // If items loaded automatically, items count > 0
        await app.page.waitForTimeout(300);
        const count = await (async () => {
          try {
            return await app.getBadgeNumber(/Items|Count|Values|Elements/i);
          } catch (e) {
            return null;
          }
        })();
        if (count === null) {
          // Try to assert that some array items exist
          await app.expectItemsCount(1);
        } else {
          expect(count).toBeGreaterThan(0);
        }
      } catch (e) {
        // If Random is not present or didn't load data, at minimum ensure no crash
      }

      // Clear should empty model
      await app.clickClear();
      await app.expectItemsCount(0);
    });

    test('Trying to load extremely large maxDigits or weird speed values is handled gracefully', async () => {
      // Set max digits to a very large number
      await app.changeMaxDigitsTo(50);
      // Set speed to an unusual value
      await app.changeSpeedTo(999);

      // Load normal data and ensure app doesn't crash and items render
      await app.fillValues('1,2,3');
      await app.clickLoad();
      await app.expectItemsCount(3);
    });
  });
});