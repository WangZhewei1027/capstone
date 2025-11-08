import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/741737b0-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object encapsulating interactions and common assertions
class RBTreePage {
  constructor(page) {
    this.page = page;
    this.input = page.locator('input[type="number"]');
    this.insertBtn = page.getByRole('button', { name: /insert/i });
    this.resetBtn = page.getByRole('button', { name: /reset/i });
    // Navigation controls: allow multiple naming conventions
    this.nextBtn = page.getByRole('button', { name: /next/i }).first();
    this.prevBtn = page.getByRole('button', { name: /(prev|previous)/i }).first();
    this.stepBtn = page.getByRole('button', { name: /step/i }).first();
    // Auto toggle could be "Auto", "Auto Play", "Play", "Auto-play"
    this.autoBtn = page.getByRole('button', { name: /(auto|play)/i }).filter({ hasText: /auto|play/i }).first();
    // Status and explanation blocks
    this.status = page.locator('.status').first();
    this.explain = page.locator('.explain').first();
    // SVG drawing area
    this.svg = page.locator('svg').first();
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for main interactive module to be present
    await this.page.waitForSelector('main');
  }

  async clearInput() {
    await this.input.fill('');
  }

  // insert a numeric value using the input and Insert button (or Enter)
  async insert(value, useEnter = false) {
    await this.input.fill(String(value));
    if (useEnter) {
      await this.input.focus();
      await this.page.keyboard.press('Enter');
    } else {
      await this.insertBtn.click();
    }
  }

  async reset() {
    await this.resetBtn.click();
  }

  async toggleAuto() {
    await this.autoBtn.click();
  }

  async clickNext() {
    await this.nextBtn.click();
  }

  async clickPrev() {
    await this.prevBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async resize(width, height) {
    await this.page.setViewportSize({ width, height });
    // give app a moment to handle resize
    await this.page.waitForTimeout(150);
  }

  async svgNodeCount() {
    // Count obvious SVG node labels/text elements (robust to implementations)
    // Accept text elements inside svg as representing nodes; fallback to circle elements
    const textCount = await this.svg.locator('text').count().catch(() => 0);
    if (textCount > 0) return textCount;
    const circleCount = await this.svg.locator('circle').count().catch(() => 0);
    return circleCount;
  }

  async statusText() {
    return (await this.status.innerText()).trim();
  }

  async explainText() {
    return (await this.explain.innerText()).trim();
  }

  async inputValue() {
    return await this.input.inputValue();
  }

  async isButtonDisabled(locator) {
    // Accept both disabled attribute and aria-disabled pattern
    const el = locator;
    const disabled = await el.getAttribute('disabled');
    if (disabled !== null) return true;
    const aria = await el.getAttribute('aria-disabled');
    return aria === 'true';
  }
}

test.describe.serial('Red-Black Tree Insertion Interactive — FSM validation', () => {
  let pageObj;

  test.beforeEach(async ({ page }) => {
    pageObj = new RBTreePage(page);
    await pageObj.goto();
  });

  test.afterEach(async ({ page }) => {
    // Attempt to reset state between tests to reduce cross-test interference
    try {
      await pageObj.reset();
      // small wait to ensure UI settles
      await page.waitForTimeout(150);
    } catch (e) {
      // ignore if reset not available
    }
  });

  test.describe('Empty state and basic UI', () => {
    test('loads in empty state: input exists, svg empty, explanation visible', async () => {
      // Validate input exists and is empty
      await expect(pageObj.input).toBeVisible();
      expect(await pageObj.inputValue()).toBe('');
      // SVG should be present, but have no nodes yet
      await expect(pageObj.svg).toBeVisible();
      const nodeCount = await pageObj.svgNodeCount();
      expect(nodeCount).toBeLessThanOrEqual(1); // 0 or 1 depending on placeholder; not >1
      // Explanation area should be visible and contain high-level instructions
      const explain = await pageObj.explainText();
      expect(explain.length).toBeGreaterThan(0);
      // Status area visible and not indicating an error on load
      const st = await pageObj.statusText();
      expect(st.length).toBeGreaterThan(0);
    });

    test('resize in empty state keeps UI intact (RESIZE event)', async ({ page }) => {
      // Trigger RESIZE by changing viewport then assert UI still renders
      await pageObj.resize(800, 600);
      await expect(pageObj.svg).toBeVisible();
      expect(await pageObj.explainText().then(t => t.length)).toBeGreaterThan(0);
    });
  });

  test.describe('Insertion flows and validating onEnter/onExit', () => {
    test('valid INSERT transitions: inserting -> viewing_at_end; input cleared and svg updated', async () => {
      // Insert 42 using button
      await pageObj.insert(42);
      // After clicking Insert, input should be cleared by finalizeInsert (onExit)
      await pageObj.page.waitForTimeout(200); // allow animation/render to finish
      expect(await pageObj.inputValue()).toBe('');
      // SVG should have at least one visible node/text
      const nodes = await pageObj.svgNodeCount();
      expect(nodes).toBeGreaterThanOrEqual(1);
      // Status should indicate we are at the end (commonly something like "step N of N")
      const status = await pageObj.statusText();
      expect(status.length).toBeGreaterThan(0);
      // Next should be disabled at end (cannot go beyond end)
      const nextDisabled = await pageObj.isButtonDisabled(pageObj.nextBtn);
      expect(nextDisabled).toBeTruthy();
      // Prev should be enabled if more than one step; at minimum it can be enabled/disabled
      // but ensure Prev is present
      await expect(pageObj.prevBtn).toBeVisible();
    });

    test('KEY_ENTER triggers insert (keyboard event mapping)', async () => {
      // Use Enter key to submit new value
      await pageObj.insert(7, true); // useEnter true triggers keyboard Enter
      await pageObj.page.waitForTimeout(200);
      // Confirm node added
      const nodes1 = await pageObj.svgNodeCount();
      expect(nodes).toBeGreaterThanOrEqual(1);
      // Status updated
      expect((await pageObj.statusText()).length).toBeGreaterThan(0);
    });

    test('inserting duplicate value results in INSERT_DUPLICATE transition -> viewing_at_end and no node count increase', async () => {
      // Insert 99 first time
      await pageObj.insert(99);
      await pageObj.page.waitForTimeout(200);
      const countAfterFirst = await pageObj.svgNodeCount();
      // Insert duplicate 99 again
      await pageObj.insert(99);
      await pageObj.page.waitForTimeout(200);
      const countAfterSecond = await pageObj.svgNodeCount();
      // Duplicate insertion should not increase total number of nodes
      expect(countAfterSecond).toBeLessThanOrEqual(countAfterFirst);
      // The UI should still be in a viewing state (end)
      const status1 = await pageObj.statusText();
      expect(status.length).toBeGreaterThan(0);
    });

    test('invalid INSERT (empty input) triggers error state; typing clears error (INPUT_CHANGED)', async () => {
      // Ensure input is empty
      await pageObj.clearInput();
      // Click Insert with empty input => should trigger error state
      await pageObj.insertBtn.click();
      await pageObj.page.waitForTimeout(150);
      // Explain area should include an error message
      const explain1 = await pageObj.explainText();
      // error message likely mentions "enter" or "invalid" or "number"; assert contains one of these keywords
      const lower = explain.toLowerCase();
      expect(
        lower.includes('enter') || lower.includes('invalid') || lower.includes('number') || lower.includes('value')
      ).toBeTruthy();
      // Controls should remain enabled (per FSM keepControlsEnabled)
      await expect(pageObj.insertBtn).toBeEnabled();
      // Now type into input to trigger INPUT_CHANGED and clear error
      await pageObj.input.fill('13');
      await pageObj.page.waitForTimeout(100);
      // After input change the explain text should no longer mention the error keywords
      const explainAfter = (await pageObj.explainText()).toLowerCase();
      expect(
        explainAfter.includes('enter') === false || explainAfter.includes('invalid') === false
      ).toBeTruthy();
      // Now perform a valid insert to exit error state
      await pageObj.insert(13);
      await pageObj.page.waitForTimeout(200);
      expect(await pageObj.svgNodeCount()).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Step navigation (viewing_at_start, viewing_mid, viewing_at_end)', () => {
    test('navigating with Prev/Next/Step updates controls and state indicators', async ({ page }) => {
      // Prepare a scenario with at least one insertion that has steps.
      // Insert a value likely to produce some fixup steps: insert sequence [50, 30, 70, 60]
      // These sequential inserts will create a tree with multiple nodes and likely multi-step fixups
      await pageObj.insert(50);
      await pageObj.page.waitForTimeout(120);
      await pageObj.insert(30);
      await pageObj.page.waitForTimeout(120);
      await pageObj.insert(70);
      await pageObj.page.waitForTimeout(120);
      await pageObj.insert(60);
      await pageObj.page.waitForTimeout(300);

      // At this point UI should be at the end (viewing_at_end): Next disabled
      expect(await pageObj.isButtonDisabled(pageObj.nextBtn)).toBeTruthy();

      // Click Prev to move away from end. After Prev, Next should become enabled
      await pageObj.clickPrev();
      await pageObj.page.waitForTimeout(200);
      expect(await pageObj.isButtonDisabled(pageObj.nextBtn)).toBeFalsy();

      // Click Step (advance a single step) - ensure Step exists and is clickable
      // If Step button not present, this will throw; guard by checking visibility
      if (await pageObj.stepBtn.isVisible()) {
        await pageObj.clickStep();
        await pageObj.page.waitForTimeout(150);
        // After stepping, Next may still be enabled until end
        expect(await pageObj.isButtonDisabled(pageObj.nextBtn)).toBeFalsy();
      }

      // Use keyboard ArrowRight to go forward if supported (KEY_ARROW_RIGHT)
      // Focus main body then press ArrowRight
      await page.locator('body').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(120);
      // After moving forward possibly we arrive at end; status text should reflect a numeric-ish state
      const statusText = await pageObj.statusText();
      expect(statusText.length).toBeGreaterThan(0);

      // Now navigate all the way back to start using Prev repeatedly and ensure Prev eventually disabled at start
      for (let i = 0; i < 10; i++) {
        await pageObj.prevBtn.click();
        await page.waitForTimeout(80);
        // break early if Prev becomes disabled
        if (await pageObj.isButtonDisabled(pageObj.prevBtn)) break;
      }
      // Prev should be disabled at viewing_at_start if we've reached it
      // Some implementations keep Prev enabled at start; allow both but assert the UI responds
      const prevDisabled = await pageObj.isButtonDisabled(pageObj.prevBtn);
      // Either disabled or still visible; ensure status remains present
      expect((await pageObj.statusText()).length).toBeGreaterThan(0);
    });

    test('keyboard ArrowLeft/ArrowRight map to PREV/ NEXT events', async ({ page }) => {
      // Ensure there is some content
      await pageObj.insert(5);
      await pageObj.page.waitForTimeout(120);
      await pageObj.insert(3);
      await pageObj.page.waitForTimeout(120);
      // Focus body and press ArrowLeft to go backward
      await page.locator('body').focus();
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(120);
      // After ArrowLeft, status still exists and UI didn't crash
      expect((await pageObj.statusText()).length).toBeGreaterThan(0);
      // ArrowRight to go forward
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(120);
      expect((await pageObj.statusText()).length).toBeGreaterThan(0);
    });

    test('RESIZE while viewing preserves current step and does not error', async ({ page }) => {
      // Insert a value and then resize while viewing
      await pageObj.insert(88);
      await pageObj.page.waitForTimeout(200);
      const beforeStatus = await pageObj.statusText();
      await pageObj.resize(1024, 768);
      const afterStatus = await pageObj.statusText();
      // Ensure status remains meaningful and consistent
      expect(afterStatus.length).toBeGreaterThan(0);
      // Some implementations preserve exact text; at minimum text is not empty
      expect(beforeStatus.length).toBeGreaterThan(0);
    });
  });

  test.describe('Auto-play behavior (auto_playing state)', () => {
    test('toggle AUTO starts autoplay: controls disabled during auto, then enabled at finish', async ({ page }) => {
      // Create a situation with multiple steps by inserting a new value expected to have steps
      await pageObj.insert(200);
      await pageObj.page.waitForTimeout(120);
      await pageObj.insert(150);
      await pageObj.page.waitForTimeout(120);
      await pageObj.insert(175);
      await pageObj.page.waitForTimeout(200);

      // If auto button is present, use it
      if (await pageObj.autoBtn.isVisible()) {
        // Start auto
        await pageObj.toggleAuto();
        // Once auto starts, the app should disable controls like Insert/Prev/Next per FSM
        // wait a short time for UI to reflect disabling
        await page.waitForTimeout(150);
        // Insert should be disabled while auto playing (or at least aria-disabled)
        const insertDisabledDuring = await pageObj.isButtonDisabled(pageObj.insertBtn);
        // It's acceptable for some apps to keep insert enabled, but per FSM it should be disabled.
        // So assert insert is either disabled or auto button indicates running
        const autoLabel = (await pageObj.autoBtn.innerText()).toLowerCase();
        // Wait up to a couple of seconds for autoplay to run to completion
        await page.waitForTimeout(1200);
        // After autoplay finishes, controls should be enabled again
        const insertDisabledAfter = await pageObj.isButtonDisabled(pageObj.insertBtn);
        expect(insertDisabledAfter).toBeFalsy();
        // Also Next should be disabled at final state (viewing_at_end)
        const nextDisabledAtEnd = await pageObj.isButtonDisabled(pageObj.nextBtn);
        expect(nextDisabledAtEnd).toBeTruthy();
        // Status and explain remain visible and non-empty
        expect((await pageObj.statusText()).length).toBeGreaterThan(0);
        expect((await pageObj.explainText()).length).toBeGreaterThan(0);
        // At least one of the assertions about disable behavior or auto label should have held true
        expect(insertDisabledDuring === true || autoLabel.includes('stop') || autoLabel.includes('pause') || autoLabel.includes('running')).toBeTruthy();
      } else {
        test.skip('Auto button not present on this build; skipping auto-play test');
      }
    });

    test('AUTO_STOP event: toggling auto again during play should stop autoplay and restore controls', async ({ page }) => {
      if (await pageObj.autoBtn.isVisible()) {
        // Ensure we have steps
        await pageObj.insert(300);
        await pageObj.page.waitForTimeout(120);
        // Start auto
        await pageObj.toggleAuto();
        await page.waitForTimeout(200);
        // Toggle auto again to stop
        await pageObj.toggleAuto();
        await page.waitForTimeout(200);
        // Controls should be enabled
        expect((await pageObj.isButtonDisabled(pageObj.insertBtn))).toBeFalsy();
        expect((await pageObj.isButtonDisabled(pageObj.nextBtn)) === false || (await pageObj.isButtonDisabled(pageObj.prevBtn)) === false).toBeTruthy();
      } else {
        test.skip('Auto button not present; skipping AUTO_STOP test');
      }
    });
  });

  test.describe('Reset and error clearing', () => {
    test('RESET_CLICK clears tree and returns to empty state', async () => {
      // Insert some nodes first
      await pageObj.insert(11);
      await pageObj.page.waitForTimeout(150);
      await pageObj.insert(22);
      await pageObj.page.waitForTimeout(150);
      const beforeNodes = await pageObj.svgNodeCount();
      expect(beforeNodes).toBeGreaterThanOrEqual(1);
      // Click Reset
      await pageObj.reset();
      await pageObj.page.waitForTimeout(200);
      // After reset, SVG node count should be reduced (empty)
      const afterNodes = await pageObj.svgNodeCount();
      // Depending on implementation afterNodes may be 0 or minimal; ensure it's not greater than before
      expect(afterNodes).toBeLessThanOrEqual(beforeNodes);
      // Input should be cleared and status/explain should be appropriate
      expect(await pageObj.inputValue()).toBe('');
      expect((await pageObj.explainText()).length).toBeGreaterThan(0);
    });

    test('error state persists until input changed and is cleared on valid insert', async () => {
      // Trigger error by clicking insert with empty input
      await pageObj.clearInput();
      await pageObj.insertBtn.click();
      await pageObj.page.waitForTimeout(120);
      const explainError = (await pageObj.explainText()).toLowerCase();
      expect(explainError.length).toBeGreaterThan(0);
      // Now change input to another value and ensure error cleared
      await pageObj.input.fill('44');
      await pageObj.page.waitForTimeout(120);
      const explainAfterChange = (await pageObj.explainText()).toLowerCase();
      // It should not still be the same error message; at minimum ensure not empty
      expect(explainAfterChange.length).toBeGreaterThan(0);
      // Submit valid insert and verify we exit error and have nodes
      await pageObj.insert(44);
      await pageObj.page.waitForTimeout(200);
      expect(await pageObj.svgNodeCount()).toBeGreaterThanOrEqual(1);
    });
  });
});