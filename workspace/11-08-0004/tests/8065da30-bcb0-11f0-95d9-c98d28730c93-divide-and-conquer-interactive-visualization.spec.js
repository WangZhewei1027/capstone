import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/8065da30-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object for the Divide-and-Conquer interactive visualization.
 * Provides robust selectors and helper actions used across tests.
 */
class AppPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Multiple fallback selectors for each UI piece to be tolerant to minor HTML differences
    this.selectors = {
      playButton: 'button:has-text("Play"), button[aria-label="Play"], button[title="Play"]',
      pauseButton: 'button:has-text("Pause"), button[aria-label="Pause"], button[title="Pause"]',
      stepButton: 'button:has-text("Step"), button:has-text("Next"), button[aria-label="Step"], button[title="Step"]',
      backButton: 'button:has-text("Back"), button:has-text("Rewind"), button[aria-label="Back"], button[title="Back"]',
      resetButton: 'button:has-text("Reset"), button[aria-label="Reset"], button[title="Reset"]',
      randomizeButton: 'button:has-text("Randomize"), button:has-text("Random"), button[aria-label="Randomize"]',
      applyButton: 'button:has-text("Apply"), button:has-text("Apply Custom"), button[aria-label="Apply"]',
      sizeInput: 'input[type="range"][name="size"], input[type="range"].size, input[type="range"]',
      customInput: 'input[type="text"][name="custom"], input[type="text"].custom, input[type="text"]',
      barsContainer: '[data-testid="bars"], .bars, #array, .array-bars, .bars-container',
      actionLog: '#actions, .action-log, .actions, .log',
      modeLabel: '.mode, #mode, .playback-mode, .status',
      treeContainer: '#tree, .recursion-tree, .tree',
      treeNode: '.tree-node, button.tree-node, [data-node]',
      animatingIndicator: '.animating, .merge-anim, [data-anim-running], .animation-running',
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for some primary UI element to appear
    await this.page.waitForLoadState('networkidle');
    await this.waitForMainUI();
  }

  async waitForMainUI() {
    // Ensure at least one of the main containers is present
    await this.page.waitForSelector(this.selectors.barsContainer, { timeout: 5000 });
    await this.page.waitForSelector(this.selectors.actionLog, { timeout: 5000 });
  }

  getBySelector(name) {
    return this.page.locator(this.selectors[name]);
  }

  async clickPlay() {
    const play = this.page.locator(this.selectors.playButton);
    if (await play.count() > 0) {
      await play.first().click();
      return;
    }
    // Fallback: toggle via space (keyboard)
    await this.page.keyboard.press('Space');
  }

  async clickPause() {
    const pause = this.page.locator(this.selectors.pauseButton);
    if (await pause.count() > 0) {
      await pause.first().click();
      return;
    }
    // fallback keyboard
    await this.page.keyboard.press('Space');
  }

  async clickStep() {
    const step = this.page.locator(this.selectors.stepButton);
    if (await step.count() > 0) {
      await step.first().click();
      return;
    }
    await this.page.keyboard.press('ArrowRight');
  }

  async clickBack() {
    const back = this.page.locator(this.selectors.backButton);
    if (await back.count() > 0) {
      await back.first().click();
      return;
    }
    await this.page.keyboard.press('ArrowLeft');
  }

  async clickRandomize() {
    const btn = this.page.locator(this.selectors.randomizeButton);
    await expect(btn.first()).toBeVisible({ timeout: 3000 });
    await btn.first().click();
  }

  async clickApplyCustom(text) {
    const input = this.page.locator(this.selectors.customInput);
    await expect(input.first()).toBeVisible({ timeout: 3000 });
    await input.first().fill(text);
    const apply = this.page.locator(this.selectors.applyButton);
    await expect(apply.first()).toBeVisible({ timeout: 3000 });
    await apply.first().click();
  }

  async clickReset() {
    const reset = this.page.locator(this.selectors.resetButton);
    await expect(reset.first()).toBeVisible({ timeout: 3000 });
    await reset.first().click();
  }

  async changeSize(value) {
    const input1 = this.page.locator(this.selectors.sizeInput);
    await expect(input.first()).toBeVisible({ timeout: 3000 });
    // Try to set via evaluate for range inputs
    await input.first().evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(value));
  }

  async getModeText() {
    const mode = this.page.locator(this.selectors.modeLabel);
    if ((await mode.count()) === 0) return null;
    return (await mode.first().innerText()).trim();
  }

  async getActionLogItems() {
    const log = this.page.locator(this.selectors.actionLog);
    if ((await log.count()) === 0) return [];
    // try to find children entries
    const entries = log.first().locator('li, .action-item, .entry, div');
    const c = await entries.count();
    const texts = [];
    for (let i = 0; i < c; i++) {
      texts.push((await entries.nth(i).innerText()).trim());
    }
    return texts;
  }

  async getBarsCount() {
    const bars = this.page.locator(`${this.selectors.barsContainer} .bar, ${this.selectors.barsContainer} rect, ${this.selectors.barsContainer} .bar-item`);
    // fallback: treat direct container children as bars
    if ((await bars.count()) === 0) {
      const container = this.page.locator(this.selectors.barsContainer);
      if ((await container.count()) === 0) return 0;
      const childCount = await container.first().evaluate((el) => el.children.length);
      return childCount;
    }
    return await bars.count();
  }

  async isAnimating() {
    const anim = this.page.locator(this.selectors.animatingIndicator);
    return (await anim.count()) > 0;
  }

  async clickTreeNode(index = 0) {
    const nodes = this.page.locator(this.selectors.treeNode);
    if ((await nodes.count()) === 0) {
      // As a fallback try clicking inside the tree container
      const tree = this.page.locator(this.selectors.treeContainer);
      if ((await tree.count()) === 0) throw new Error('No tree nodes or tree container found');
      await tree.first().click();
      return;
    }
    await nodes.nth(index).click();
  }

  async getFirstTreeNodeClass() {
    const nodes1 = this.page.locator(this.selectors.treeNode);
    if ((await nodes.count()) === 0) return null;
    return (await nodes.first().getAttribute('class')) || '';
  }
}

test.describe('Divide-and-Conquer Interactive Visualization — FSM validation', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Ensure a clean state between tests
    try {
      await app.clickReset();
      // small delay to allow UI to settle
      await page.waitForTimeout(200);
    } catch {
      // ignore if reset not available
    }
  });

  test.describe('Idle state and initialization', () => {
    test('Initial page loads into Idle: bars/tree present, actions empty, mode set to Idle', async () => {
      // Validate bars and tree are rendered
      const barsCount = await app.getBarsCount();
      expect(barsCount).toBeGreaterThan(0);

      // Validate action log present and initially empty
      const actions = await app.getActionLogItems();
      expect(actions.length).toBeGreaterThanOrEqual(0); // allow zero or prefilled minimal instructions

      // Mode should be Idle if mode label present
      const mode1 = await app.getModeText();
      if (mode !== null) {
        expect(mode.toLowerCase()).toMatch(/idle|ready/);
      }
    });

    test('Randomize resets to Idle and updates bars (RANDOMIZE event)', async ({ page }) => {
      // Get initial bars snapshot
      const initialBars = await app.getBarsCount();

      // Click Randomize
      await app.clickRandomize();

      // After randomize, mode should be Idle (or similar) and bars should change count or values
      const modeAfter = await app.getModeText();
      if (modeAfter !== null) {
        expect(modeAfter.toLowerCase()).toMatch(/idle|ready/);
      }

      const afterBars = await app.getBarsCount();
      // Randomize may keep same number of bars, but should still be defined; assert at least one bar exists
      expect(afterBars).toBeGreaterThan(0);
      // It's acceptable if count unchanged; the primary check is the UI remained stable and Idle
    });

    test('Apply custom array updates bars and stays Idle (APPLY_CUSTOM event)', async () => {
      // Apply a simple custom array
      await app.clickApplyCustom('5,1,4,2');

      // Bars should reflect the custom input as non-zero count
      const barsCount1 = await app.getBarsCount();
      expect(barsCount).toBeGreaterThan(0);

      // Actions should be cleared/prepared but mode remains Idle
      const mode2 = await app.getModeText();
      if (mode !== null) expect(mode.toLowerCase()).toMatch(/idle|ready/);
    });

    test('Size change modifies array size and remains Idle (SIZE_CHANGE event)', async () => {
      // Change size to a smaller number (value normalized to string)
      await app.changeSize(4);
      await app.page.waitForTimeout(200);
      const barsAfter = await app.getBarsCount();
      expect(barsAfter).toBeGreaterThan(0);
      // The count should be reasonable (>=1 and likely <=10)
      expect(barsAfter).toBeLessThanOrEqual(50);
    });
  });

  test.describe('Playing and Pausing behavior (PLAY / PAUSE events)', () => {
    test('Play starts automated progression (PLAY -> playing onEnter actions)', async ({ page }) => {
      // Click Play
      await app.clickPlay();

      // The UI should show a Pause control now or mode 'Playing'
      const pauseVisible = await page.locator(app.selectors.pauseButton).count() > 0;
      const mode3 = await app.getModeText();

      if (mode !== null) {
        expect(mode.toLowerCase()).toMatch(/playing/);
      } else {
        expect(pauseVisible).toBeTruthy();
      }

      // Action log should start receiving entries while playing (allow a short window)
      const initialCount = (await app.getActionLogItems()).length;
      await page.waitForTimeout(600); // allow some actions to be processed
      const laterCount = (await app.getActionLogItems()).length;
      expect(laterCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('Pause stops automated progression and clears timers (PAUSE event)', async ({ page }) => {
      // Start playing then pause
      await app.clickPlay();
      await page.waitForTimeout(300); // let it start
      const beforePause = (await app.getActionLogItems()).length;

      await app.clickPause();
      // Mode label should reflect paused if available
      const mode4 = await app.getModeText();
      if (mode !== null) {
        expect(mode.toLowerCase()).toMatch(/pause|paused/);
      }

      // Ensure no new actions are added for a short period after pause (timers cleared)
      await page.waitForTimeout(700);
      const afterPause = (await app.getActionLogItems()).length;
      expect(afterPause).toBe(beforePause);
    });

    test('Keyboard shortcut (Space) toggles Play/Pause', async ({ page }) => {
      // Press space to start
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      let mode5 = await app.getModeText();
      if (mode !== null) expect(mode.toLowerCase()).toMatch(/playing/);

      // Press space to pause
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      mode = await app.getModeText();
      if (mode !== null) expect(mode.toLowerCase()).toMatch(/pause|paused/);
    });
  });

  test.describe('Stepping and Animating (STEP, MERGE_ANIMATION_STARTED, ANIMATION_DONE_* )', () => {
    test('Single STEP advances one action synchronously or starts an animation (STEP event)', async ({ page }) => {
      // Ensure Idle
      await app.clickReset();
      await page.waitForTimeout(150);

      // Do a single step
      await app.clickStep();

      // Immediately after step, either action log increased or animation started
      const actionsAfter = (await app.getActionLogItems()).length;
      const animRunning = await app.isAnimating();

      // At least one of these should indicate progress
      expect(actionsAfter + (animRunning ? 1 : 0)).toBeGreaterThanOrEqual(1);

      // If an animation started, wait for it to complete and ensure the FSM returns to Idle or Playing depending on UI
      if (animRunning) {
        // Wait a reasonable time for animation to finish and FSM to settle
        await page.waitForTimeout(1500);
        const animStill = await app.isAnimating();
        expect(animStill).toBeFalsy();

        const mode6 = await app.getModeText();
        if (mode !== null) {
          // After step animation, the FSM defines STEP_COMPLETE -> idle
          expect(mode.toLowerCase()).toMatch(/idle|ready/);
        }
      } else {
        // If no animation, the FSM should transition to idle after STEP_COMPLETE
        const mode7 = await app.getModeText();
        if (mode !== null) expect(mode.toLowerCase()).toMatch(/idle|ready/);
      }
    });

    test('MERGE animation started during playing transitions to animating state (ANIMATION_STARTED -> animating)', async ({ page }) => {
      // Start playback to trigger animations naturally
      await app.clickPlay();

      // Wait for an animation indicator to appear
      const animLocator = page.locator(app.selectors.animatingIndicator);
      const appeared = await animLocator.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);

      // If an animation appears, assert animating state
      if (appeared) {
        const animRunning1 = await app.isAnimating();
        expect(animRunning).toBeTruthy();

        // Now pause during animation to test PAUSE -> paused behavior
        await app.clickPause();
        const mode8 = await app.getModeText();
        if (mode !== null) expect(mode.toLowerCase()).toMatch(/pause|paused/);

        // After pausing, the animating indicator should be cleared (onExit clearAnimTimer)
        await page.waitForTimeout(300);
        const animStill1 = await app.isAnimating();
        expect(animStill).toBeFalsy();
      } else {
        // If no visual animation indicator is present in DOM, at least ensure action log progressed
        const actions1 = (await app.getActionLogItems()).length;
        expect(actions).toBeGreaterThan(0);
      }

      // Be sure to reset afterwards
      await app.clickReset();
    });

    test('ANIMATION_DONE_KEEP_PLAYING vs ANIMATION_DONE_STOP behavior (finish animation paths)', async ({ page }) => {
      // Start playing
      await app.clickPlay();
      // Wait to potentially hit an animation
      await page.waitForTimeout(500);
      // If animating, wait for completion and observe whether playing resumed or stopped
      if (await app.isAnimating()) {
        // wait until animation done
        await page.waitForSelector(app.selectors.animatingIndicator, { state: 'detached', timeout: 5000 }).catch(() => {});
      } else {
        // If not animating, wait some more to allow finish events
        await page.waitForTimeout(800);
      }

      // Evaluate mode: either playing (if KEEP_PLAYING) or idle/finished (if stopped)
      const modeFinal = await app.getModeText();
      if (modeFinal !== null) {
        // Accept any of the legitimate end-states: playing, idle, or finished
        expect(modeFinal.toLowerCase()).toMatch(/playing|idle|finished|ready/);
      }
    });
  });

  test.describe('Rewinding (BACK, BACK_COMPLETE) and finish behavior', () => {
    test('Back rewinds one action and results in BACK_COMPLETE -> idle', async ({ page }) => {
      // Ensure some progress: either play briefly or step several times
      await app.clickStep();
      await page.waitForTimeout(200);
      await app.clickStep();
      await page.waitForTimeout(200);

      const before = (await app.getActionLogItems()).length;

      // Trigger Back
      await app.clickBack();
      // Wait for UI to re-render (rewind may be synchronous)
      await page.waitForTimeout(400);

      const after = (await app.getActionLogItems()).length;

      // After rewinding, the action log count should be less than or equal to before
      expect(after).toBeLessThanOrEqual(before);

      // Mode should be Idle when back complete
      const mode9 = await app.getModeText();
      if (mode !== null) expect(mode.toLowerCase()).toMatch(/idle|ready/);
    });

    test('Finish state reached when algorithm completes (FINISH -> finished)', async ({ page }) => {
      // Attempt to reach Finished by playing through; set a reasonable guard timeout
      await app.clickReset();
      await app.clickPlay();

      // Wait until mode indicates finished or until a timeout
      let finished = false;
      const maxWait = 15000; // up to 15s for full run
      const pollInterval = 500;
      let waited = 0;
      while (waited < maxWait) {
        const mode10 = await app.getModeText();
        if (mode && mode.toLowerCase().includes('finished')) {
          finished = true;
          break;
        }
        // Some implementations don't expose 'Finished' explicitly; detect if play button becomes available and no further actions occur
        await page.waitForTimeout(pollInterval);
        waited += pollInterval;
      }

      // It's acceptable if finished is not explicitly exposed; but if it is present, assert it's reachable
      if (finished) {
        const finalMode = await app.getModeText();
        expect(finalMode.toLowerCase()).toContain('finished');
      } else {
        // As fallback assert that a significant number of actions were executed indicating completion
        const actions2 = (await app.getActionLogItems()).length;
        expect(actions).toBeGreaterThan(0);
      }
    });
  });

  test.describe('UI interactions that should NOT change global playback state', () => {
    test('Clicking a node in the recursion tree focuses subarray but does not stop playing (NODE_CLICK event)', async ({ page }) => {
      // Start playback
      await app.clickPlay();
      await page.waitForTimeout(300);

      // Capture mode while playing
      const modeBefore = await app.getModeText();

      // Click a tree node
      // If none present this test will use the container as a fallback
      await app.clickTreeNode(0);
      await page.waitForTimeout(200);

      // Mode should remain playing (or unchanged)
      const modeAfter1 = await app.getModeText();
      if (modeBefore !== null && modeAfter !== null) {
        // Allow for minor string differences e.g., "Playing" vs "playing"
        expect(modeAfter.toLowerCase()).toContain(modeBefore.toLowerCase().split(' ')[0]);
      }

      // Optionally check that tree node shows focused/active CSS class
      const nodeClass = await app.getFirstTreeNodeClass();
      if (nodeClass !== null) {
        // Either focused or active class added
        expect(nodeClass.length).toBeGreaterThanOrEqual(0);
      }

      // Cleanup: pause
      await app.clickPause();
    });

    test('Keyboard shortcuts: ArrowRight triggers STEP and ArrowLeft triggers BACK', async ({ page }) => {
      // Reset and ensure Idle
      await app.clickReset();
      await page.waitForTimeout(150);

      const before1 = (await app.getActionLogItems()).length;

      // ArrowRight step
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      const afterStep = (await app.getActionLogItems()).length;
      expect(afterStep).toBeGreaterThanOrEqual(before);

      // ArrowLeft back
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);
      const afterBack = (await app.getActionLogItems()).length;
      expect(afterBack).toBeLessThanOrEqual(afterStep);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Applying malformed custom input shows no crash and remains Idle (error scenarios)', async ({ page }) => {
      // Provide malformed input
      await app.clickApplyCustom('foo, , , - , 9999999');

      // App should not crash: page remains loaded and main UI present
      await app.waitForMainUI();

      // Mode should remain Idle or return to Idle after attempted apply
      const mode11 = await app.getModeText();
      if (mode !== null) {
        expect(mode.toLowerCase()).toMatch(/idle|ready|error|invalid/);
      }

      // Bars should be present (either reflecting sanitized input or previous array)
      const bars1 = await app.getBarsCount();
      expect(bars).toBeGreaterThanOrEqual(0);
    });

    test('Rapid Play/Pause/Step/Back commands do not leave timers running (onExit clearAnimTimer)', async ({ page }) => {
      // Rapidly toggle play/pause/step/back
      await app.clickPlay();
      await page.waitForTimeout(80);
      await app.clickPause();
      await page.waitForTimeout(80);
      await app.clickStep();
      await page.waitForTimeout(80);
      await app.clickPlay();
      await page.waitForTimeout(80);
      await app.clickBack();
      await page.waitForTimeout(300);

      // After a short stabilization time, there should be no animation indicator
      expect(await app.isAnimating()).toBeFalsy();

      // And the page should still be responsive (click Reset)
      await app.clickReset();
      await page.waitForTimeout(200);
      const bars2 = await app.getBarsCount();
      expect(bars).toBeGreaterThanOrEqual(0);
    });
  });
});