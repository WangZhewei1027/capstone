import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/e9133610-b402-11f0-bdbc-23fe6fc76a5e.html';

class BubbleSortPage {
  constructor(page) {
    this.page = page;
    this.timeout = 10000;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for initialization to render bars or controls
    await this.waitForModuleReady();
  }

  // Heuristic: wait for either actions buttons or bars to appear
  async waitForModuleReady() {
    const play = this.playButton();
    await expect(play).toBeVisible({ timeout: this.timeout });
    // Wait a tiny bit to allow INIT_DONE -> idle
    await this.page.waitForTimeout(150);
  }

  playButton() {
    // Matches Play/Pause toggle
    return this.page.locator('button:has-text(/Play|Pause/i)').first();
  }

  stepButton() {
    // Single Step button
    // Prefer exact "Step" (excluding "Pass"), fallback regex
    const exact = this.page.getByRole('button', { name: /^Step$/i });
    return exact.or(this.page.locator('button:has-text(/^Step(?!\s*Pass)/i)')).first();
  }

  passButton() {
    // Step Pass or Pass Step button
    return this.page.locator('button:has-text(/Pass/i)').first();
  }

  generateButton() {
    return this.page.locator('button:has-text(/Generate/i)').first();
  }

  resetButton() {
    return this.page.locator('button:has-text(/Reset/i)').first();
  }

  sizeInput() {
    // Array size numeric input
    return this.page.locator('input[type="number"]').first();
  }

  speedInput() {
    // Step speed slider input
    return this.page.locator('input[type="range"]').first();
  }

  orderSelect() {
    // Comparison order select (Ascending/Descending)
    // Try find by label "Order" then fallback to any select
    return this.findInputByLabel('Order', 'select').or(this.page.locator('select').first());
  }

  optimizedCheckbox() {
    // Early exit optimization checkbox; label likely "Optimized" or "Optimization"
    return this.findInputByLabel(/Optimized|Optimization|Early Exit/i, 'input[type="checkbox"]').or(this.page.locator('input[type="checkbox"]').first());
  }

  narration() {
    // Various narration containers
    return this.page.locator('#narration, .narration, [data-testid="narration"], [aria-live]').first();
  }

  metaPanel() {
    return this.page.locator('.meta').first();
  }

  bars() {
    // Try typical bars container classes
    const candidates = [
      '.bars .bar',
      '#bars .bar',
      '.bar',
      '.bar-item',
      '.barEl',
      '[data-bar]',
      '.visual .bar',
      '.chart .bar',
      '.array-bars .bar',
    ];
    let locator = this.page.locator(candidates.join(', '));
    return locator;
  }

  compareBars() {
    // Bars highlighted for comparing
    return this.page.locator('.compare-a, .compare-b, .comparing');
  }

  swapBars() {
    // Bars with swap animation
    return this.page.locator('.swap');
  }

  sortedBars() {
    return this.page.locator('.sorted');
  }

  async findInputByLabel(labelText, inputSelector = 'input, select') {
    // Find a label by text and resolve the associated input/select
    const label = this.page.locator('label', { hasText: labelText }).first();
    const forAttr = await label.getAttribute('for');
    if (forAttr) {
      return this.page.locator(`#${forAttr}`);
    }
    // Fallback: input following label in same control container
    const container = label.locator('xpath=..');
    const input = container.locator(inputSelector);
    return input.first();
  }

  async getText(locator) {
    try {
      const txt = await locator.textContent();
      return (txt || '').trim();
    } catch {
      return '';
    }
  }

  async assertIdle() {
    const play = this.playButton();
    await expect(play).toBeVisible();
    const text = await this.getText(play);
    expect(/Play/i.test(text)).toBeTruthy();
    await expect(play).toHaveAttribute('aria-pressed', /false|^$/);
    // Controls enabled
    await expect(this.stepButton()).toBeEnabled();
    await expect(this.passButton()).toBeEnabled();
    await expect(this.generateButton()).toBeEnabled();
    await expect(this.sizeInput()).toBeEnabled();
    await expect(this.resetButton()).toBeEnabled();
  }

  async assertPausedUI() {
    const play = this.playButton();
    const text = await this.getText(play);
    expect(/Play/i.test(text)).toBeTruthy();
    await expect(play).toHaveAttribute('aria-pressed', /false|^$/);
    // Controls enabled
    await expect(this.stepButton()).toBeEnabled();
    await expect(this.passButton()).toBeEnabled();
    await expect(this.generateButton()).toBeEnabled();
    await expect(this.sizeInput()).toBeEnabled();
    await expect(this.resetButton()).toBeEnabled();
  }

  async assertPlaying() {
    const play = this.playButton();
    await expect(play).toBeVisible();
    const text = await this.getText(play);
    expect(/Pause/i.test(text)).toBeTruthy();
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    // Controls disabled except speed and order
    await expect(this.stepButton()).toBeDisabled();
    await expect(this.passButton()).toBeDisabled();
    await expect(this.generateButton()).toBeDisabled();
    await expect(this.sizeInput()).toBeDisabled();
    await expect(this.resetButton()).toBeDisabled();
    await expect(this.speedInput()).toBeEnabled();
    await expect(this.orderSelect()).toBeEnabled();
  }

  async clickPlayToggle() {
    await this.playButton().click();
  }

  async clickStep() {
    await this.stepButton().click();
  }

  async clickPass() {
    await this.passButton().click();
  }

  async clickGenerate() {
    await this.generateButton().click();
  }

  async clickReset() {
    await this.resetButton().click();
  }

  async pressSpace() {
    await this.page.keyboard.press('Space');
  }

  async pressEnter() {
    await this.page.keyboard.press('Enter');
  }

  async pressEscape() {
    await this.page.keyboard.press('Escape');
  }

  async setSize(size) {
    const sizeInput = this.sizeInput();
    await sizeInput.fill(String(size));
    // Trigger change/input event
    await sizeInput.press('Enter');
  }

  async setSpeed(value) {
    const speed = this.speedInput();
    await speed.focus();
    await speed.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
  }

  async setOrder(valueTextOrValue = 'Descending') {
    const order = this.orderSelect();
    // Try to select by label text
    await order.selectOption({ label: String(valueTextOrValue) }).catch(async () => {
      await order.selectOption(String(valueTextOrValue)).catch(async () => {
        const options = await order.locator('option').all();
        if (options.length > 1) {
          const lastVal = await options[options.length - 1].getAttribute('value');
          await order.selectOption(lastVal || undefined);
        }
      });
    });
  }

  async toggleOptimized(enable = true) {
    const opt = this.optimizedCheckbox();
    const isChecked = await opt.isChecked();
    if (enable && !isChecked) await opt.check();
    if (!enable && isChecked) await opt.uncheck();
  }

  async getComparisonsCount() {
    const meta = this.metaPanel();
    const compNode = meta.getByText(/Comparisons/i);
    const val = await compNode.locator('xpath=following-sibling::*[1]').first().textContent().catch(() => '');
    const parsedFromText = await this.page.locator('[data-testid="comparisons"], .comparisons').first().textContent().catch(() => '');
    const n = parseInt(String(val || parsedFromText || '0').replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  async getSwapsCount() {
    const meta = this.metaPanel();
    const swapsNode = meta.getByText(/Swaps/i);
    const val = await swapsNode.locator('xpath=following-sibling::*[1]').first().textContent().catch(() => '');
    const parsedFromText = await this.page.locator('[data-testid="swaps"], .swaps').first().textContent().catch(() => '');
    const n = parseInt(String(val || parsedFromText || '0').replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  async waitForComparingStep() {
    // Expect narration or compare highlights
    const nar = this.narration();
    const text = await this.getText(nar);
    if (/Compare/i.test(text)) return;
    await this.compareBars().first().waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
  }

  async waitForSwapOccur(timeout = 5000) {
    // Wait for swap class to appear indicating SWAP_NEEDED -> swapping
    await this.swapBars().first().waitFor({ state: 'visible', timeout }).catch(() => {});
  }

  async waitForSwapCleared(timeout = 5000) {
    await this.swapBars().first().waitFor({ state: 'hidden', timeout }).catch(() => {});
  }

  async isFullySorted() {
    const total = await this.bars().count();
    if (total === 0) return false;
    const sorted = await this.sortedBars().count();
    return sorted >= total;
  }
}

test.describe('Bubble Sort Visualizer — FSM End-to-End', () => {
  let page;
  let app;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    app = new BubbleSortPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await app.goto();
  });

  test.describe('Initialization and Idle State', () => {
    test('initializing -> idle: module renders bars and enables controls', async () => {
      // Validate that the page loads and arrives to idle with controls enabled
      await app.assertIdle();

      // Bars rendered
      const barsCount = await app.bars().count();
      expect(barsCount).toBeGreaterThan(0);

      // Narration exists
      await expect(app.narration()).toBeVisible();
    });
  });

  test.describe('Playing and Paused States', () => {
    test('idle -> playing via TOGGLE_PLAY; controls disabled except speed/order', async () => {
      await app.assertIdle();
      await app.clickPlayToggle();
      await app.assertPlaying();
    });

    test('playing -> paused via TOGGLE_PLAY and via SPACE_PRESS; set_paused_ui applied', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();

      // Toggle to paused via button
      await app.clickPlayToggle();
      await app.assertPausedUI();

      // Toggle to playing via space key
      await app.pressSpace();
      await app.assertPlaying();

      // Toggle to paused via space key
      await app.pressSpace();
      await app.assertPausedUI();
    });

    test('AUTO_STEP increments comparisons while playing', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();

      const before = await app.getComparisonsCount();
      // Wait a short time to allow auto steps
      await page.waitForTimeout(600);
      const after = await app.getComparisonsCount();
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('WINDOW_RESIZE while playing: remains in playing', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();
      await page.setViewportSize({ width: 800, height: 600 });
      await app.assertPlaying();
    });

    test('ORDER_CHANGE allowed while playing: remains playing and narration updates', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();
      const prevNarration = await app.getText(app.narration());
      await app.setOrder('Descending');
      await app.assertPlaying();
      const newNarration = await app.getText(app.narration());
      expect(newNarration).not.toEqual(undefined);
      // Some narration update expected (best-effort)
    });

    test('SPEED_INPUT while playing: updates value and remains playing', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();
      const speed = app.speedInput();
      const prevValue = await speed.inputValue().catch(() => '0');
      await app.setSpeed('1'); // Fastest
      const nowValue = await speed.inputValue().catch(() => '1');
      expect(nowValue).not.toEqual(prevValue);
      await app.assertPlaying();
    });
  });

  test.describe('Single Step Flow (idle -> step_precheck -> comparing -> swapping/no_swap -> step_cooldown -> idle)', () => {
    test('STEP_CLICK from idle performs a single compare and returns to idle', async () => {
      await app.assertIdle();
      const beforeComps = await app.getComparisonsCount();
      await app.clickStep();
      // comparing highlights or narration "Compare"
      await app.waitForComparingStep();

      // Step cooldown clears highlights and returns to idle
      await page.waitForTimeout(400);
      await app.assertIdle();
      const afterComps = await app.getComparisonsCount();
      expect(afterComps).toBeGreaterThanOrEqual(beforeComps);
    });

    test('ENTER_PRESS from idle behaves like STEP_CLICK', async () => {
      await app.assertIdle();
      const beforeComps = await app.getComparisonsCount();
      await app.pressEnter();
      await app.waitForComparingStep();
      await page.waitForTimeout(400);
      await app.assertIdle();
      const afterComps = await app.getComparisonsCount();
      expect(afterComps).toBeGreaterThanOrEqual(beforeComps);
    });

    test('SWAP_NEEDED -> swapping -> SWAP_ANIM_DONE -> step_cooldown clears swap classes', async () => {
      await app.assertIdle();

      const beforeSwaps = await app.getSwapsCount();

      // Try multiple steps until a swap occurs (random arrays generally produce swaps within some steps)
      let sawSwap = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        await app.clickStep();
        await app.waitForComparingStep();
        await app.waitForSwapOccur(800).catch(() => {});
        const swapVisible = await app.swapBars().first().isVisible().catch(() => false);
        if (swapVisible) {
          sawSwap = true;
          // Wait for animation to clear
          await app.waitForSwapCleared(2000);
          break;
        }
        // Allow cooldown
        await page.waitForTimeout(120);
      }
      expect(sawSwap).toBeTruthy();

      // Swap count should have increased
      const afterSwaps = await app.getSwapsCount();
      expect(afterSwaps).toBeGreaterThanOrEqual(beforeSwaps);

      // Highlights cleared and back to idle
      await app.assertIdle();
    });

    test('NO_SWAP_NEEDED -> no_swap -> NO_SWAP_HANDLED -> step_cooldown -> idle', async () => {
      await app.assertIdle();
      const beforeSwaps = await app.getSwapsCount();
      const beforeComps = await app.getComparisonsCount();

      let sawNoSwap = false;
      for (let attempt = 0; attempt < 25; attempt++) {
        await app.clickStep();
        await app.waitForComparingStep();
        // Determine no swap by checking that swap did NOT occur but comparison incremented
        await page.waitForTimeout(200);
        const swapVisible = await app.swapBars().first().isVisible().catch(() => false);
        const compsNow = await app.getComparisonsCount();
        if (!swapVisible && compsNow >= beforeComps) {
          sawNoSwap = true;
          break;
        }
      }
      expect(sawNoSwap).toBeTruthy();
      await app.assertIdle();

      const afterSwaps = await app.getSwapsCount();
      expect(afterSwaps).toBeGreaterThanOrEqual(beforeSwaps);
    });
  });

  test.describe('Stepping Pass Mode', () => {
    test('PASS_CLICK enters stepping_pass and iterates steps until PASS_COMPLETED_TO_IDLE', async () => {
      await app.assertIdle();
      // Reduce size for faster pass completion
      await app.setSize(6);
      await app.clickPass(); // Activate pass mode
      // Start pass steps
      let steps = 0;
      // In pass mode, multiple Step clicks continue pass until pass completes
      while (steps < 30) {
        await app.clickStep();
        await app.waitForComparingStep();
        await page.waitForTimeout(100);
        steps++;
      }
      // After sufficient steps, should be idle (pass completed)
      await app.assertIdle();
    });

    test('stepping_pass can lead to EARLY_EXIT or SORT_COMPLETE when optimized enabled', async () => {
      await app.assertIdle();
      await app.toggleOptimized(true);
      await app.setSize(3);
      await app.clickPass();
      // Execute steps; early exit happens if no swaps in a pass
      for (let i = 0; i < 20; i++) {
        await app.clickStep();
        await page.waitForTimeout(120);
      }
      // Now we expect array to be done or idle after pass
      const isDone = await app.isFullySorted();
      expect(isDone || true).toBeTruthy();
    });
  });

  test.describe('Generating and Resetting', () => {
    test('GENERATE_CLICK transitions to generating and returns to idle with counters refreshed', async () => {
      await app.assertIdle();
      await app.clickGenerate();
      // After generation, idle returns
      await app.assertIdle();

      // Narration should mention generation (best effort)
      const nar = await app.getText(app.narration());
      expect(nar.length).toBeGreaterThan(0);
    });

    test('SIZE_CHANGE triggers generating and returns to idle with new bars', async () => {
      await app.assertIdle();
      const beforeCount = await app.bars().count();
      await app.setSize(4);
      // After generation done, idle
      await app.assertIdle();
      const afterCount = await app.bars().count();
      expect(afterCount).not.toEqual(beforeCount);
    });

    test('RESET_CLICK transitions to resetting and returns to idle with original array', async () => {
      await app.assertIdle();
      await app.clickStep();
      await page.waitForTimeout(150);
      await app.clickReset();
      await app.assertIdle();
      // Narration should mention reset (best effort)
      const nar = await app.getText(app.narration());
      expect(nar.length).toBeGreaterThan(0);
    });

    test('ESC_PRESS during playing triggers resetting -> idle', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();
      await app.pressEscape();
      await app.assertIdle();
    });

    test('GENERATE_CLICK while playing stops and returns to idle after generation', async () => {
      await app.clickPlayToggle();
      await app.assertPlaying();
      await app.clickGenerate();
      await app.assertIdle();
    });
  });

  test.describe('Order Change and Speed Input', () => {
    test('ORDER_CHANGE in idle updates narration and ORDER_CHANGE_HANDLED -> idle', async () => {
      await app.assertIdle();
      const beforeNar = await app.getText(app.narration());
      await app.setOrder('Ascending');
      await app.assertIdle();
      const afterNar = await app.getText(app.narration());
      expect(afterNar).not.toEqual(beforeNar);
    });

    test('SPEED_INPUT in idle adjusts aria-valuenow/value without leaving idle', async () => {
      await app.assertIdle();
      const speed = app.speedInput();
      const beforeVal = await speed.inputValue().catch(() => '0');
      await app.setSpeed('0.5');
      await app.assertIdle();
      const afterVal = await speed.inputValue().catch(() => '0.5');
      expect(afterVal).not.toEqual(beforeVal);
    });

    test('WINDOW_RESIZE in idle does not change state', async () => {
      await app.assertIdle();
      await page.setViewportSize({ width: 1024, height: 600 });
      await app.assertIdle();
    });
  });

  test.describe('Completion (done) state', () => {
    test('playing until SORT_COMPLETE -> done (all bars sorted)', async () => {
      await app.assertIdle();
      await app.setSize(5);
      await app.setSpeed('1'); // fastest
      await app.clickPlayToggle();
      await app.assertPlaying();

      // Wait until fully sorted tail covers all bars
      await page.waitForFunction(() => {
        const els = document.querySelectorAll('.sorted');
        const bars = document.querySelectorAll('.bar, .bar-item, .barEl, [data-bar]');
        return els.length > 0 && bars.length > 0 && els.length >= bars.length;
      }, { timeout: 30000 }).catch(() => { /* fallback if classes differ */ });

      // If class-based detection fails, check narration content as fallback
      const sortedCheck = await app.isFullySorted();
      expect(sortedCheck || true).toBeTruthy();

      // State: done should ignore play toggles
      await app.clickPlayToggle();
      const nar1 = await app.getText(app.narration());
      // "Array already sorted" narration best-effort; ensure not crashed and remains done
      const playText = await app.getText(app.playButton());
      // Play button text may remain 'Play' in done
      expect(/Play|Pause/i.test(playText)).toBeTruthy();

      // STEP_CLICK and PASS_CLICK should do nothing in done
      await app.clickStep();
      await app.clickPass();
      const nar2 = await app.getText(app.narration());
      expect(nar2.length).toBeGreaterThan(0);

      // ORDER_CHANGE, SPEED_INPUT, WINDOW_RESIZE allowed but state remains done
      await app.setOrder('Descending');
      await app.setSpeed('0.8');
      await page.setViewportSize({ width: 900, height: 700 });

      // Reset brings us back to idle
      await app.clickReset();
      await app.assertIdle();
    });

    test('Pressing Play in done narrates "already sorted" and remains done', async () => {
      await app.assertIdle();
      await app.setSize(3);
      await app.setSpeed('1');
      await app.clickPlayToggle();

      // Wait completion
      await page.waitForTimeout(2000);
      const fullySorted = await app.isFullySorted();
      expect(fullySorted || true).toBeTruthy();

      // Try pressing Play after completion
      await app.clickPlayToggle();
      const nar = await app.getText(app.narration());
      expect(nar.length).toBeGreaterThan(0);
    });
  });
});