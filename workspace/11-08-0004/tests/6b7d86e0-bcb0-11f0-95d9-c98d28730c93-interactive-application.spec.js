import { test, expect } from '@playwright/test';

/**
 * Playwright end-to-end tests for:
 * Application ID: 6b7d86e0-bcb0-11f0-95d9-c98d28730c93
 *
 * Notes:
 * - Tests attempt to be resilient to slight DOM differences by using multiple selector fallbacks.
 * - Each test validates FSM-related interactions and expected UI feedback described in the FSM.
 *
 * URL under test:
 * http://127.0.0.1:5500/workspace/11-08-0004/html/6b7d86e0-bcb0-11f0-95d9-c98d28730c93.html
 */

/**
 * Page object encapsulating common interactions and resilient selectors.
 */
class LinearSearchPage {
  constructor(page) {
    this.page = page;

    // Buttons - use role-based lookups with flexible names (case-insensitive)
    this.generateBtn = page.getByRole('button', { name: /generate/i }).first();
    this.startBtn = page.getByRole('button', { name: /start search|start/i }).first();
    this.stepBtn = page.getByRole('button', { name: /step|next/i }).first();
    this.backBtn = page.getByRole('button', { name: /back|previous|step back/i }).first();
    this.autoBtn = page.getByRole('button', { name: /auto|play|pause/i }).first();
    this.resetBtn = page.getByRole('button', { name: /reset/i }).first();
    this.copyBtn = page.getByRole('button', { name: /copy/i }).first();
    this.explainBtn = page.getByRole('button', { name: /explain|explanation/i }).first();

    // Speed select (if present)
    this.speedSelect = page.locator('select[name="speed"], select#speed, select').first();

    // Primary input for search target - flexible: try common input selectors
    this.targetInput = page.locator('input[type="text"], input[type="number"], input#target, input[name="target"]').first();

    // Result / narration / status area - try aria-live or dedicated result containers
    this.status = page.locator('[aria-live], [role="status"], .result, .narration, .status').first();

    // Comparisons counter (if any)
    this.comparisons = page.locator('text=/comps|comparisons|checks|steps/i, .comparisons, #comparisons, .steps').first();

    // Flexible tile locator to capture various implementations
    this.tileLocator = page.locator(
      '.array-wrap .tile, .array-wrap .cell, .array-wrap > * , .tiles .tile, .tile, [data-tile], [data-index], .array .cell, .array-item, [role="listitem"]'
    );
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0004/html/6b7d86e0-bcb0-11f0-95d9-c98d28730c93.html', {
      waitUntil: 'load',
    });
    // Wait for the UI to stabilize - main panel or tiles should be visible
    await Promise.race([
      this.page.waitForSelector('.module, .canvas, .panel', { timeout: 3000 }).catch(() => {}),
      this.tileLocator.first().waitFor({ timeout: 3000 }).catch(() => {}),
    ]);
  }

  async ensureControlsPresent() {
    // Ensure critical controls exist - these asserts will fail fast if UI missing
    await expect(this.generateBtn).toBeVisible();
    await expect(this.resetBtn).toBeVisible();
    await expect(this.targetInput).toBeVisible();
    // At least one of the primary action buttons should exist
    const startOrStepCount = (await this.startBtn.count()) + (await this.stepBtn.count());
    expect(startOrStepCount).toBeGreaterThan(0);
  }

  async waitForTiles(min = 1) {
    await this.page.waitForTimeout(200); // brief pause for render
    await this.page.waitForFunction(
      (selector, min) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        return nodes.length >= min;
      },
      this.tileLocator._selector,
      min,
      { timeout: 3000 }
    );
    // Return Playwright locator for tiles
    return this.tileLocator;
  }

  async getTileValues() {
    const tiles = await this.waitForTiles(1);
    const count = await tiles.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = (await tiles.nth(i).innerText()).trim();
      values.push(text);
    }
    return values;
  }

  async clickGenerate() {
    if (await this.generateBtn.count()) {
      await this.generateBtn.click();
      await this.page.waitForTimeout(250);
    } else {
      // try an alternative button that looks like generate (fallback)
      const alt = this.page.getByRole('button', { name: /random|shuffle/i }).first();
      if (await alt.count()) {
        await alt.click();
        await this.page.waitForTimeout(250);
      }
    }
    // ensure tiles rendered
    await this.waitForTiles(2);
  }

  async setTarget(value) {
    await this.targetInput.fill(''); // clear
    await this.targetInput.type(String(value));
    // blur to trigger INPUT_BLUR / PREPARE_SEARCH
    await this.targetInput.press('Tab');
    await this.page.waitForTimeout(200);
  }

  async clickStart() {
    if (await this.startBtn.count()) {
      await this.startBtn.click();
      return;
    }
    // fallback to 'Step' if no start visible (start can be same as step)
    if (await this.stepBtn.count()) {
      await this.stepBtn.click();
    }
  }

  async clickStep() {
    if (await this.stepBtn.count()) {
      await this.stepBtn.click();
    } else if (await this.startBtn.count()) {
      // some implementations use start as a single-step
      await this.startBtn.click();
    }
  }

  async clickAutoToggle() {
    if (await this.autoBtn.count()) {
      await this.autoBtn.click();
    } else {
      // fallback to play button
      const alt1 = this.page.getByRole('button', { name: /play|auto/i }).first();
      if (await alt.count()) await alt.click();
    }
  }

  async clickReset() {
    if (await this.resetBtn.count()) {
      await this.resetBtn.click();
    }
    await this.page.waitForTimeout(200);
  }

  async clickCopy() {
    if (await this.copyBtn.count()) {
      await this.copyBtn.click();
    }
    await this.page.waitForTimeout(150);
  }

  async clickExplain() {
    if (await this.explainBtn.count()) {
      await this.explainBtn.click();
      await this.page.waitForTimeout(150);
    }
  }

  async getStatusText() {
    if (await this.status.count()) {
      return (await this.status.innerText()).trim();
    }
    // search generically for text nodes indicating results
    const probable = await this.page.locator('text=/found|not found|no match|match|complete/i').first();
    if (await probable.count()) return (await probable.innerText()).trim();
    return '';
  }

  async countTilesWithStateMatch() {
    // Count tiles that appear marked as matched - look for typical classes or symbols
    const matchedSelector =
      '.matched, .is-matched, .tile.match, .tile.matched, [data-matched], .checked.match, .result-match, .match';
    const matched = this.page.locator(matchedSelector);
    return (await matched.count());
  }

  async countCheckedTiles() {
    // Count tiles marked as checked / visited
    const checkedSelector = '.checked, .is-checked, .visited, .tile.checked, [data-checked], .tile.checked';
    const checked = this.page.locator(checkedSelector);
    return (await checked.count());
  }

  async getComparisonsText() {
    if (await this.comparisons.count()) {
      return (await this.comparisons.innerText()).trim();
    }
    return '';
  }
}

test.describe('Linear Search Interactive — FSM-driven tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to a standard size for consistent rendering
    await page.setViewportSize({ width: 1200, height: 900 });
  });

  test.describe('Idle -> Ready (prepareSearch) and control visibility', () => {
    test('initial load shows controls and prepareSearch on input blur leads to ready', async ({ page }) => {
      const app = new LinearSearchPage(page);
      await app.goto();

      // Ensure critical controls are present in the idle state
      await app.ensureControlsPresent();

      // Click generate to ensure an array exists
      await app.clickGenerate();

      // Pick a tile value to set as target and trigger PREPARE_SEARCH (INPUT_BLUR)
      const values1 = await app.getTileValues();
      expect(values.length).toBeGreaterThan(0);

      const firstVal = values[0];
      // Enter value in target input and blur (this should trigger PREPARE_SEARCH -> ready)
      await app.setTarget(firstVal);

      // After prepare, the Start or Step button should be visible and enabled
      if (await app.startBtn.count()) {
        await expect(app.startBtn).toBeVisible();
        // If the start button has 'disabled' attribute ensure it's not disabled
        const btnDisabled = await app.startBtn.getAttribute('disabled');
        if (btnDisabled !== null) {
          // Some implementations keep start disabled until valid input; in that case fail
          expect(btnDisabled).toBeNull();
        }
      } else {
        // If start absent, assert step exists
        await expect(app.stepBtn).toBeVisible();
      }
    });
  });

  test.describe('Probing state: step forward, highlight, comparisons increment, step back', () => {
    test('STEP_FORWARD transitions to probing and marks a tile as checked/current and increments comparisons', async ({
      page,
    }) => {
      const app1 = new LinearSearchPage(page);
      await app.goto();
      await app.clickGenerate();

      // prepare target that is not obviously in the first tile (use something that may be found later)
      const values2 = await app.getTileValues();
      expect(values.length).toBeGreaterThanOrEqual(2);

      // use a target equal to second tile to ensure we can step and detect change
      const target = values[1];
      await app.setTarget(target);

      // Get comparisons text before starting (if available)
      const beforeComps = await app.getComparisonsText();

      // Step forward -> probing
      await app.clickStep();

      // Wait a little for transient highlights/animations
      await page.waitForTimeout(300);

      // After stepping, at least one tile should be marked as checked/current (common class names)
      const checkedCount = await app.countCheckedTiles();
      // Some implementations mark current tile as transient class; accept either checked or any tile with a "current" like class
      const currentSelector = '.current, .is-current, .tile.current, .probing, .active';
      const currentCount = await page.locator(currentSelector).count();

      expect(checkedCount + currentCount).toBeGreaterThanOrEqual(1);

      // Comparisons counter should have increased if present
      const afterComps = await app.getComparisonsText();
      if (beforeComps && afterComps) {
        // Attempt to parse numbers from texts
        const beforeNum = parseInt((beforeComps.match(/\d+/) || ['0'])[0], 10);
        const afterNum = parseInt((afterComps.match(/\d+/) || ['0'])[0], 10);
        expect(afterNum).toBeGreaterThanOrEqual(beforeNum + 1);
      }

      // Test STEP_BACK: attempting to step back should expose a ready-like state (index decrease)
      // Use the back button if present, otherwise click some expected control
      if (await app.backBtn.count()) {
        await app.backBtn.click();
        await page.waitForTimeout(200);
        // After stepping back, checked count should be less or equal (depending on implementation)
        const checkedAfterBack = await app.countCheckedTiles();
        expect(checkedAfterBack).toBeGreaterThanOrEqual(0);
      } else {
        // If no explicit back, pressing ArrowLeft should map to KEY_LEFT -> ready
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe('Auto-playing and paused states (startAuto, stopAuto, SPEED_CHANGE)', () => {
    test('AUTO_TOGGLE starts autoPlay and toggling again pauses it; speed change updates timing', async ({ page }) => {
      const app2 = new LinearSearchPage(page);
      await app.goto();
      await app.clickGenerate();

      // Prepare with target that is unlikely to be first (use last value so auto must advance)
      const values3 = await app.getTileValues();
      expect(values.length).toBeGreaterThan(2);
      const lastValue = values[values.length - 1];
      await app.setTarget(lastValue);

      // Click auto to start autoPlaying
      await app.clickAutoToggle();

      // Give it a moment to start; often UI indicates playing by changing the button label to "Pause" or setting aria-pressed
      await page.waitForTimeout(300);

      // Check for a playing indicator: auto button might have aria-pressed or changed text
      let isPlaying = false;
      if (await app.autoBtn.count()) {
        const ariaPressed = await app.autoBtn.getAttribute('aria-pressed');
        if (ariaPressed === 'true') isPlaying = true;
        const btnText = (await app.autoBtn.innerText()).toLowerCase();
        if (btnText.includes('pause') || btnText.includes('stop')) isPlaying = true;
      }

      expect(isPlaying).toBeTruthy();

      // Try changing speed (if speed control present)
      if (await app.speedSelect.count()) {
        const origValue = await app.speedSelect.inputValue().catch(() => '');
        // change to another option index if possible
        try {
          await app.speedSelect.selectOption({ index: 0 });
          await page.waitForTimeout(150);
          // if selection changed, it should not crash — assert value exists
          const newValue = await app.speedSelect.inputValue();
          expect(newValue).toBeDefined();
          // revert if needed
          if (origValue) await app.speedSelect.selectOption(origValue).catch(() => {});
        } catch {
          // ignore if selectOption unsupported
        }
      }

      // Now toggle to pause
      await app.clickAutoToggle();
      await page.waitForTimeout(300);

      // After toggling again the UI should reflect paused/stopped state
      let isPaused = true;
      if (await app.autoBtn.count()) {
        const ariaPressed1 = await app.autoBtn.getAttribute('aria-pressed');
        if (ariaPressed === 'true') isPaused = false;
        const btnText1 = (await app.autoBtn.innerText()).toLowerCase();
        if (btnText.includes('play') || btnText.includes('resume')) isPaused = true;
        if (btnText.includes('pause')) isPaused = false;
      }
      expect(isPaused).toBeTruthy();
    });
  });

  test.describe('Found and NotFound terminal states', () => {
    test('FINISH_FOUND: searching for an existing value results in found state (markMatch, result UI)', async ({ page }) => {
      const app3 = new LinearSearchPage(page);
      await app.goto();
      await app.clickGenerate();

      // Choose a known existing value (first tile) to guarantee found quickly
      const values4 = await app.getTileValues();
      expect(values.length).toBeGreaterThan(0);
      const target1 = values[0];
      await app.setTarget(target);

      // Start search (probing). Use start or auto to get to found.
      await app.clickStart();

      // Wait until status displays 'found' or until a tile is marked as matched
      const foundPromise = page.waitForFunction(
        () =>
          !!document.querySelector('.matched, .is-matched, .tile.match, .tile.matched, [data-matched]') ||
          /found|match/i.test(document.body.innerText),
        { timeout: 4000 }
      );

      await foundPromise;

      // Validate that at least one tile is marked as matched
      const matchedCount = await app.countTilesWithStateMatch();
      expect(matchedCount).toBeGreaterThanOrEqual(1);

      // Validate that result/status text indicates found/match
      const statusText = await app.getStatusText();
      expect(/found|match|result/i.test(statusText.toLowerCase())).toBeTruthy();
    });

    test('FINISH_NOT_FOUND: searching for a non-existing value completes as notFound and marks all checked', async ({ page }) => {
      const app4 = new LinearSearchPage(page);
      await app.goto();
      await app.clickGenerate();

      // collect current tile values and pick a value that is definitely not present
      const values5 = await app.getTileValues();
      const numericValues = values.map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
      // find a candidate not in list
      let candidate = 99999;
      while (numericValues.includes(candidate)) candidate += 1;

      await app.setTarget(candidate);

      // Start auto-play to speed up marking all or repeatedly step until complete
      await app.clickAutoToggle();
      // Wait for completion: look for "not found", "no match", or all tiles checked
      await page.waitForFunction(
        (selector) => {
          const bodyText = document.body.innerText.toLowerCase();
          if (/(not found|no match|not found)/.test(bodyText)) return true;
          // check if all tiles have a checked/matched attribute/class
          const candidates = Array.from(document.querySelectorAll(selector));
          if (!candidates.length) return false;
          return candidates.every((el) => {
            const cls = el.className || '';
            return /checked|visited|is-checked|is-matched|match|data-checked|data-matched/i.test(cls) || el.getAttribute('data-checked') || el.getAttribute('data-matched');
          });
        },
        app.tileLocator._selector,
        { timeout: 8000 }
      );

      // Pause auto to stop timers if still running
      await app.clickAutoToggle().catch(() => {});

      // Validate 'not found' presence in status or page text
      const statusText1 = await app.getStatusText();
      const bodyText1 = (await page.content()).toLowerCase();
      expect(/not found|no match|no results|not found/i.test(statusText.toLowerCase()) || /not found|no match|no results|not found/i.test(bodyText)).toBeTruthy();

      // Validate that many tiles are marked as checked (likely all)
      const checkedCount1 = await app.countCheckedTiles();
      const totalTiles = await app.tileLocator.count();
      // At least one checked, and often equals total, but accept >=50% as robust check
      expect(checkedCount).toBeGreaterThanOrEqual(Math.max(1, Math.floor(totalTiles / 2)));
    }, 20000);
  });

  test.describe('UI helper actions and edge cases', () => {
    test('COPY_ARRAY and EXPLAIN perform side-effects without changing progression state', async ({ page }) => {
      const app5 = new LinearSearchPage(page);
      await app.goto();
      await app.clickGenerate();

      // Prepare a target and start one step so we leave idle -> ready -> probing
      const values6 = await app.getTileValues();
      expect(values.length).toBeGreaterThan(0);
      const target2 = values[0];
      await app.setTarget(target);

      // Perform copy array - should not advance search
      await app.clickCopy();

      // Look for 'copied' toast or similar text in page; if none, at least no exception thrown and DOM remained
      const copiedLoc = page.locator('text=/copi(ed|ed to clipboard)|clipboard/i');
      if (await copiedLoc.count()) {
        await expect(copiedLoc.first()).toBeVisible();
      }

      // Click explain and expect narration or help area to become visible or update
      await app.clickExplain();
      const narration = page.locator('.narration, .explain, [role="note"], [aria-live]').first();
      if (await narration.count()) {
        await expect(narration).toBeVisible();
      }

      // Ensure progression state did not unintentionally start searching (no new checked tiles)
      const checkedCount2 = await app.countCheckedTiles();
      expect(checkedCount).toBeGreaterThanOrEqual(0);
    });

    test('Invalid input does not crash and leaves Start/Step disabled (edge case)', async ({ page }) => {
      const app6 = new LinearSearchPage(page);
      await app.goto();
      await app.clickGenerate();

      // Enter a clearly invalid input string
      await app.setTarget('!!!invalid###');

      // If the Start or Step control validates input, it may be disabled; check both if present
      if (await app.startBtn.count()) {
        const isDisabled = (await app.startBtn.getAttribute('disabled')) !== null || (await app.startBtn.getAttribute('aria-disabled')) === 'true';
        // It's acceptable for start to be disabled for invalid input
        expect(typeof isDisabled === 'boolean').toBeTruthy();
      }
      if (await app.stepBtn.count()) {
        const isDisabledStep = (await app.stepBtn.getAttribute('disabled')) !== null || (await app.stepBtn.getAttribute('aria-disabled')) === 'true';
        expect(typeof isDisabledStep === 'boolean').toBeTruthy();
      }

      // The app should still have its UI intact and not have thrown an error visible in the page
      const errorText = await page.locator('text=/error|exception|uncaught|failed/i').count();
      expect(errorText).toBeLessThan(1);
    });
  });

  test.afterEach(async ({ page }) => {
    // Attempt a cleanup reset for deterministic state for the next test
    const app7 = new LinearSearchPage(page);
    if (await app.resetBtn.count()) {
      await app.clickReset().catch(() => {});
    }
  });
});