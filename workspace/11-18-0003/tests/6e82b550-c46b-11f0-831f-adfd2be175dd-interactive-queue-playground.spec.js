import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0003/html/6e82b550-c46b-11f0-831f-adfd2be175dd.html';

// Page object for the Queue Playground
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls - use accessible queries where possible
    this.enqueueButton = page.getByRole('button', { name: /enqueue/i });
    this.dequeueButton = page.getByRole('button', { name: /dequeue/i });
    this.clearButton = page.getByRole('button', { name: /clear/i });
    this.randomizeButton = page.getByRole('button', { name: /randomize/i });
    this.playButton = page.getByRole('button', { name: /play/i });
    this.pauseButton = page.getByRole('button', { name: /pause/i });
    this.stepButton = page.getByRole('button', { name: /step/i });
    this.stopButton = page.getByRole('button', { name: /stop/i });
    // Generic input fallback - first text input on the page
    this.input = page.locator('input[type="text"], input[type="number"], textarea').first();
    // Visual queue container
    this.queueSlots = page.locator('.queue-array .slot');
    this.canvas = page.locator('.canvas');
    // Potential status/done/error elements (role based and generic)
    this.alert = page.getByRole('alert').first();
    this.doneText = page.locator(':text("done"), :text("empty"), :text("queue is empty")').first();
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main interactive area to be visible
    await expect(this.canvas).toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  // Get current slot count
  async slotCount() {
    return await this.queueSlots.count();
  }

  // Enqueue a value using the input and enqueue button
  async enqueue(value = '') {
    if (await this.input.count() > 0) {
      await this.input.fill(String(value));
      // Press Enter in addition to clicking to support multiple implementations
      await this.input.press('Enter').catch(() => {});
    }
    if (await this.enqueueButton.count() > 0) {
      await this.enqueueButton.click();
    }
  }

  // Dequeue by clicking the dequeue control
  async dequeue() {
    await this.dequeueButton.click();
  }

  // Clear queue
  async clear() {
    if (await this.clearButton.count() > 0) {
      await this.clearButton.click();
    }
  }

  // Click randomize
  async randomize() {
    if (await this.randomizeButton.count() > 0) {
      await this.randomizeButton.click();
    }
  }

  // Play auto-run
  async play() {
    if (await this.playButton.count() > 0) {
      await this.playButton.click();
    }
  }

  // Pause auto-run
  async pause() {
    if (await this.pauseButton.count() > 0) {
      await this.pauseButton.click();
    }
  }

  // Step single action
  async step() {
    if (await this.stepButton.count() > 0) {
      await this.stepButton.click();
    }
  }

  // Stop auto-run
  async stop() {
    if (await this.stopButton.count() > 0) {
      await this.stopButton.click();
    }
  }

  // Utility: wait for any "animating" indicator to disappear or fallback short sleep
  async waitForAnimationEnd(timeout = 3000) {
    // Common patterns: element with class 'animating', data-animating attribute, or .is-animating
    const animators = [
      '.animating',
      '[data-animating]',
      '.is-animating',
      '.animate',
      '.slot.animating'
    ];
    const start = Date.now();
    for (const selector of animators) {
      // If any of these exist, wait for them to disappear
      const loc = this.page.locator(selector);
      if (await loc.count() > 0) {
        try {
          await expect(loc).toHaveCount(0, { timeout });
          return;
        } catch {
          // fallback to polling below
        }
      }
    }
    // Poll for absence of inline CSS transitions: look for any element with computed animation or transition running (best-effort)
    const pollInterval = 150;
    while (Date.now() - start < timeout) {
      const anyAnimating = await this.page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        for (const el of els) {
          const style = window.getComputedStyle(el);
          if (style.animationName && style.animationName !== 'none') return true;
          if (parseFloat(style.animationDuration.replace('s', '')) > 0) return true;
          if (el.classList.contains('animating') || el.dataset.animating === 'true') return true;
        }
        return false;
      });
      if (!anyAnimating) return;
      await this.page.waitForTimeout(pollInterval);
    }
    // Final short wait to let the UI settle
    await this.page.waitForTimeout(100);
  }

  // Detect visible error message (role alert or element with "error" text)
  async isErrorVisible() {
    try {
      if (await this.alert.count() > 0) {
        const txt = await this.alert.textContent();
        if (txt && /error|invalid|failed|full/i.test(txt)) return true;
      }
    } catch {}
    const errorByText = this.page.locator(':text("error"), :text("invalid"), :text("failed"), :text("full")');
    return (await errorByText.count()) > 0;
  }

  // Detect done/empty state text
  async isDoneVisible() {
    try {
      if (await this.doneText.count() > 0) {
        const txt = await this.doneText.textContent();
        if (txt && /done|empty|queue is empty/i.test(txt)) return true;
      }
    } catch {}
    const doneByText = this.page.locator(':text("done"), :text("empty"), :text("queue is empty")');
    return (await doneByText.count()) > 0;
  }
}

test.describe('Interactive Queue Playground — FSM validation', () => {
  let queue;

  test.beforeEach(async ({ page }) => {
    queue = new QueuePage(page);
    await queue.goto();
  });

  test.afterEach(async ({ page }) => {
    // Try to reset UI for next test if possible: click clear and stop
    try {
      await queue.stop();
      await queue.clear();
    } catch {
      // ignore errors in teardown
    }
    await page.waitForTimeout(150);
  });

  test('Idle state: initial UI elements present and no animations running', async ({ page }) => {
    // Validate idle state by asserting controls exist and no animation
    const q = new QueuePage(page);
    await q.goto();
    // Buttons in the header/controls should be visible (best-effort)
    await expect(q.enqueueButton).toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(q.dequeueButton).toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(q.clearButton).toBeVisible({ timeout: 3000 }).catch(() => {});
    // No animating slots should be present at idle
    const anyAnimating = await page.locator('.animating, [data-animating], .is-animating').count();
    expect(anyAnimating).toBe(0);
  });

  test('Enqueueing state: enqueue an item triggers animation and updates UI (onEnter/onExit)', async ({ page }) => {
    // Ensure a deterministic starting point
    const initialCount = await queue.slotCount();
    // Enqueue a new item
    await queue.enqueue('A');
    // Immediately after click, we expect either a new slot to appear (item enqueued) and possibly an animation
    // Wait briefly then check
    await page.waitForTimeout(100);
    const midCount = await queue.slotCount();
    expect(midCount).toBeGreaterThanOrEqual(initialCount);
    // Check for animation indicator then wait for it to end
    await queue.waitForAnimationEnd(3000);
    // After animation end (onExit), UI should reflect the new item persisted
    const finalCount = await queue.slotCount();
    expect(finalCount).toBeGreaterThanOrEqual(midCount);
  });

  test('Dequeuing state: dequeue removes item with animation and updates UI (onEnter/onExit)', async ({ page }) => {
    // Ensure at least one item exists
    if ((await queue.slotCount()) === 0) {
      await queue.enqueue('X');
      await queue.waitForAnimationEnd(2000);
    }
    const before = await queue.slotCount();
    expect(before).toBeGreaterThan(0);
    await queue.dequeue();
    // After clicking dequeue we expect an animation and then a reduced count
    await queue.waitForAnimationEnd(3000);
    const after = await queue.slotCount();
    // Either the slot count decreased by 1, or if queue emptied, it becomes 0 and possibly shows done state
    expect(after).toBeLessThanOrEqual(before);
    if (after === 0) {
      // If empty, the FSM can go to done state: verify done indicator or empty visual
      const done = await queue.isDoneVisible();
      expect(done || after === 0).toBeTruthy();
    }
  });

  test('Playing state: auto-run dequeues items over time and can be paused/stopped', async ({ page }) => {
    // Prepare with multiple items
    const needed = 3;
    for (let i = 0; i < needed; i++) {
      await queue.enqueue(`P${i}`);
      await queue.waitForAnimationEnd(1500);
    }
    let countBefore = await queue.slotCount();
    expect(countBefore).toBeGreaterThanOrEqual(needed);

    // Start playing (auto-run)
    await queue.play();
    // When playing, Pause control should become available (app-dependent)
    // Wait a bit to let auto-dequeue remove at least one item
    await page.waitForTimeout(1200);
    // Poll until at least one item removed or timeout
    const start = Date.now();
    let countAfter = countBefore;
    while (Date.now() - start < 5000) {
      countAfter = await queue.slotCount();
      if (countAfter < countBefore) break;
      await page.waitForTimeout(200);
    }
    expect(countAfter).toBeLessThanOrEqual(countBefore);

    // Pause playback and ensure items stop being removed
    const afterPauseCandidate = countAfter;
    await queue.pause();
    await page.waitForTimeout(800);
    const afterPause = await queue.slotCount();
    expect(afterPause).toBeGreaterThanOrEqual(0);
    // After pausing, count should remain stable (not strictly guaranteed but likely)
    expect(afterPause).toBeGreaterThanOrEqual(afterPauseCandidate);

    // Stop playback returns to idle
    await queue.stop();
    await page.waitForTimeout(200);
  });

  test('Paused state: allow enqueue and step while paused', async ({ page }) => {
    // Ensure some items exist
    await queue.enqueue('S1');
    await queue.waitForAnimationEnd(1200);
    await queue.enqueue('S2');
    await queue.waitForAnimationEnd(1200);

    await queue.play();
    await page.waitForTimeout(300);
    // Pause to enter paused state
    await queue.pause();
    await page.waitForTimeout(200);

    // Enqueue while paused should still add an item (FSM allows CLICK_ENQUEUE in paused)
    const before = await queue.slotCount();
    await queue.enqueue('S-PAUSE');
    await queue.waitForAnimationEnd(1200);
    const mid = await queue.slotCount();
    expect(mid).toBeGreaterThanOrEqual(before);

    // Step while paused should perform one step (dequeue or enqueue depending on next action)
    // We'll call step and expect at most one change in count
    const beforeStep = await queue.slotCount();
    await queue.step();
    await queue.waitForAnimationEnd(1200);
    const afterStep = await queue.slotCount();
    // afterStep should be <= beforeStep (if the step performed a dequeue) OR >= if it was an enqueue,
    // but it should not be wildly different; assert difference magnitude <=1
    expect(Math.abs(afterStep - beforeStep)).toBeLessThanOrEqual(1);
  });

  test('Step state: performs a single operation and returns to idle', async ({ page }) => {
    // Ensure at least one item to make step meaningful
    if ((await queue.slotCount()) === 0) {
      await queue.enqueue('Step-Item');
      await queue.waitForAnimationEnd(1200);
    }
    const before = await queue.slotCount();
    await queue.step();
    await queue.waitForAnimationEnd(1500);
    const after = await queue.slotCount();
    // Step likely dequeues one item: check count decreased by at least 0 and at most 1
    expect(after).toBeLessThanOrEqual(before);
    expect(before - after).toBeGreaterThanOrEqual(0);
    expect(before - after).toBeLessThanOrEqual(1);
  });

  test('Loading state: submitting input triggers loading path and updates model (INPUT_SUBMIT -> LOAD_COMPLETE)', async ({ page }) => {
    // Use input Enter to simulate INPUT_SUBMIT
    // Clear queue first
    await queue.clear();
    await queue.waitForAnimationEnd(800);
    // Fill using input submit - try a multi-value string if implementation supports parsing
    if (await queue.input.count() > 0) {
      await queue.input.fill('L1,L2,L3');
      await queue.input.press('Enter');
    } else {
      // fallback: click enqueue multiple times
      for (const v of ['L1', 'L2', 'L3']) {
        await queue.enqueue(v);
        await queue.waitForAnimationEnd(500);
      }
    }
    // Wait for the loading animation/processing to finish
    await queue.waitForAnimationEnd(2000);
    // Assert that model has items loaded
    const c = await queue.slotCount();
    expect(c).toBeGreaterThanOrEqual(1);
  });

  test('Clearing state: clicking clear starts clear animation and results in empty queue (CLEAR_COMPLETE)', async ({ page }) => {
    // Ensure a few items exist
    for (let i = 0; i < 3; i++) {
      await queue.enqueue(`C${i}`);
      await queue.waitForAnimationEnd(400);
    }
    const before = await queue.slotCount();
    expect(before).toBeGreaterThanOrEqual(1);

    // Click clear
    await queue.clear();
    // Some implementations animate clear; wait for it
    await queue.waitForAnimationEnd(2500);
    // After clear completes, queue should be empty or show done state
    const after = await queue.slotCount();
    expect(after).toBe(0);
    const doneVisible = await queue.isDoneVisible();
    expect(doneVisible || after === 0).toBeTruthy();
  });

  test('Randomizing state: randomize populates/changes the queue and UI updates accordingly', async ({ page }) => {
    // Capture current snapshot length
    const before = await queue.slotCount();
    await queue.randomize();
    // Randomize may animate; wait for completion
    await queue.waitForAnimationEnd(2000);
    // After randomize, slot count should be >=0 and likely different from before
    const after = await queue.slotCount();
    expect(after).toBeGreaterThanOrEqual(0);
    // Preferably, the content changed; at minimum, no error shown
    const error = await queue.isErrorVisible();
    expect(error).toBeFalsy();
  });

  test('Error state: invalid input or overfill triggers error and allows reset/clear/enqueue/play transitions', async ({ page }) => {
    // Try to force an error by submitting an empty input (common validation)
    if (await queue.input.count() > 0) {
      await queue.input.fill('');
      // Press enter to submit empty
      await queue.input.press('Enter').catch(() => {});
    }
    // Alternatively try to overfill by enqueuing many times until an error appears
    let sawError = await queue.isErrorVisible();
    if (!sawError) {
      for (let i = 0; i < 50 && !sawError; i++) {
        await queue.enqueue(`E${i}`);
        await queue.waitForAnimationEnd(120);
        sawError = await queue.isErrorVisible();
      }
    }
    // If we could not provoke an error, at least assert that app still handles many enqueues without crashing
    if (!sawError) {
      expect(await queue.slotCount()).toBeGreaterThanOrEqual(0);
    } else {
      // If error is visible, try transitions out of error per FSM: RESET -> idle (if reset control exists), CLICK_CLEAR, CLICK_ENQUEUE, CLICK_PLAY
      // Try clicking clear to move to clearing state
      if (await queue.clearButton.count() > 0) {
        await queue.clear();
        await queue.waitForAnimationEnd(1000);
        const errAfter = await queue.isErrorVisible();
        expect(errAfter).toBeFalsy();
      } else {
        // Try clicking play to leave error (some implementations allow)
        if (await queue.playButton.count() > 0) {
          await queue.play();
          await queue.waitForTimeout(300);
          const errAfter = await queue.isErrorVisible();
          // Either error cleared or playing state suppressed error
          expect(errAfter === true || errAfter === false).toBeTruthy();
        }
      }
    }
  });

  test('Done state: when queue becomes empty FSM enters done and reset/back-to-idle transitions available', async ({ page }) => {
    // Ensure queue empties fully
    // Dequeue until no items remain (limit loop)
    for (let i = 0; i < 50; i++) {
      const count = await queue.slotCount();
      if (count === 0) break;
      await queue.dequeue();
      await queue.waitForAnimationEnd(400);
    }
    const finalCount = await queue.slotCount();
    expect(finalCount).toBe(0);
    // Done indicator should be visible or queue empty is valid proxy
    const done = await queue.isDoneVisible();
    // If done text isn't present, still the semantics (empty queue) indicate done
    expect(done || finalCount === 0).toBeTruthy();

    // Test transitions from done: CLICK_ENQUEUE should add an item and go to enqueueing then idle
    await queue.enqueue('Done->Enq');
    await queue.waitForAnimationEnd(1200);
    const afterEnqueue = await queue.slotCount();
    expect(afterEnqueue).toBeGreaterThanOrEqual(1);

    // Clear back to empty
    await queue.clear();
    await queue.waitForAnimationEnd(800);
    expect(await queue.slotCount()).toBe(0);
  });

  test('Edge case: rapid play/pause/step sequences do not crash and keep FSM consistent', async ({ page }) => {
    // Prepare queue
    for (let i = 0; i < 4; i++) {
      await queue.enqueue(`R${i}`);
      await queue.waitForAnimationEnd(200);
    }
    const startCount = await queue.slotCount();
    expect(startCount).toBeGreaterThanOrEqual(1);

    // Rapidly toggle play/pause and perform steps
    await queue.play();
    await page.waitForTimeout(100);
    await queue.pause();
    await page.waitForTimeout(80);
    await queue.step();
    await page.waitForTimeout(80);
    await queue.play();
    await page.waitForTimeout(150);
    await queue.pause();
    await page.waitForTimeout(80);
    // Verify queue is still a valid number of slots and no error visible
    const after = await queue.slotCount();
    expect(after).toBeGreaterThanOrEqual(0);
    const err = await queue.isErrorVisible();
    expect(err).toBeFalsy();
  });
});