import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0005/html/7bc077e0-b406-11f0-b2cf-31de200d1aa8.html';

// Page Object encapsulating selectors and actions for the Bubble Sort app
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.playButton = page.getByRole('button', { name: /Play|Pause/ });
    this.stepButton = page.getByRole('button', { name: /Step/ });
    this.resetButton = page.getByRole('button', { name: /Reset/ });
    this.shuffleButton = page.getByRole('button', { name: /Shuffle/ });
    this.applyButton = page.getByRole('button', { name: /Apply/ });

    // Inputs/selects/sliders (using labels to be resilient)
    this.arrayInput = page.getByLabel(/Array/i, { exact: false });
    this.orderSelect = page.getByLabel(/Order/i, { exact: false });
    this.sizeSlider = page.getByLabel(/Size/i, { exact: false });
    this.speedSlider = page.getByLabel(/Speed/i, { exact: false });

    // Visualization and status
    this.bars = page.locator('.bars .bar');
    this.sortedBars = page.locator('.bars .bar.sorted');
    this.compareA = page.locator('.bars .bar.compare-a');
    this.compareB = page.locator('.bars .bar.compare-b');
    this.swappingBars = page.locator('.bars .bar.swapping');

    // Announce / status area: try common candidates
    this.announce = page.locator('#announce, .announce, [data-testid="announce"], .status, .subtitle').first();

    // Array input error message: try common candidates
    this.arrayError = page.locator('#arrayError, .array-error, [data-testid="array-error"]').first();
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async setSpeedFastest() {
    // Set speed to the fastest (reduce delays). Use slider via label if found, else do nothing
    if (await this.speedSlider.count()) {
      // Try to set to minimum value using evaluate on the input element
      const handle = await this.speedSlider.elementHandle();
      if (handle) {
        await this.page.evaluate((el) => {
          el.value = el.min ?? el.value ?? '0';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, handle);
      }
    }
  }

  async setSize(value) {
    if (await this.sizeSlider.count()) {
      const handle = await this.sizeSlider.elementHandle();
      if (handle) {
        await this.page.evaluate((el, v) => {
          el.value = String(v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, handle, value);
      }
    }
  }

  async setOrderByText(optionText) {
    if (await this.orderSelect.count()) {
      try {
        await this.orderSelect.selectOption({ label: optionText });
      } catch {
        // fallback: try value names
        await this.orderSelect.selectOption(optionText.toLowerCase());
      }
    }
  }

  async setArrayInput(text) {
    if (await this.arrayInput.count()) {
      await this.arrayInput.fill(text);
    }
  }

  async clickApply() {
    await this.applyButton.click();
  }

  async clickPlay() {
    await this.playButton.click();
  }

  async clickStep() {
    await this.stepButton.click();
  }

  async clickPause() {
    // The same playButton toggles pause; ensure current label is Pause
    const label = await this.playPauseLabel();
    if (label.match(/Pause/i)) {
      await this.playButton.click();
    } else {
      // If not currently playing, pressing Play then pressing again to pause
      await this.playButton.click();
      await this.playButton.click();
    }
  }

  async clickReset() {
    await this.resetButton.click();
  }

  async clickShuffle() {
    await this.shuffleButton.click();
  }

  async playPauseLabel() {
    // Obtain current button text of Play/Pause
    const text = await this.playButton.textContent();
    return (text || '').trim();
  }

  async isPlaying() {
    // playing -> controls disabled; step disabled is a strong indicator
    const stepDisabled = await this.stepButton.isDisabled().catch(() => false);
    const applyDisabled = await this.applyButton.isDisabled().catch(() => false);
    const shuffleDisabled = await this.shuffleButton.isDisabled().catch(() => false);
    return stepDisabled && applyDisabled && shuffleDisabled;
  }

  async isPaused() {
    // paused: running=false, Play button shows "Play", controls enabled
    const label = await this.playPauseLabel();
    const stepEnabled = !(await this.stepButton.isDisabled().catch(() => true));
    return /Play/i.test(label) && stepEnabled && !(await this.isPlaying());
  }

  async waitForReady() {
    // ready state: controls enabled and announce includes 'Ready'
    await expect(this.stepButton).toBeEnabled({ timeout: 5000 });
    // Not strictly required, but if announce exists, expect it to include 'Ready'
    if (await this.announce.count()) {
      await expect(this.announce).toContainText(/Ready/i, { timeout: 5000 });
    }
  }

  async waitForComparing() {
    await this.page.waitForSelector('.bars .bar.compare-a', { timeout: 5000 });
    await this.page.waitForSelector('.bars .bar.compare-b', { timeout: 5000 });
  }

  async waitForComparingCleared() {
    await this.page.waitForSelector('.bars .bar.compare-a', { state: 'detached', timeout: 5000 });
    await this.page.waitForSelector('.bars .bar.compare-b', { state: 'detached', timeout: 5000 });
  }

  async waitForSwapping() {
    await this.page.waitForSelector('.bars .bar.swapping', { timeout: 5000 });
  }

  async waitForSwappingCleared() {
    await this.page.waitForSelector('.bars .bar.swapping', { state: 'detached', timeout: 5000 });
  }

  async waitForSomeSortedCount(minCount = 1) {
    await expect(this.sortedBars).toHaveCount(minCount, { timeout: 5000 });
  }

  async getBarValues() {
    const count = await this.bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const bar = this.bars.nth(i);
      const valueAttr = await bar.getAttribute('data-value');
      const text = (await bar.textContent()) || '';
      // Prefer data-value if present, else parse text digits
      const parsed = valueAttr ? parseInt(valueAttr, 10) : parseInt(text.trim(), 10);
      values.push(parsed);
    }
    return values;
  }

  async getBarLeftPositions() {
    const count = await this.bars.count();
    const positions = [];
    for (let i = 0; i < count; i++) {
      const box = await this.bars.nth(i).boundingBox();
      positions.push(box ? box.x : 0);
    }
    return positions;
  }
}

test.describe('Bubble Sort Visualization FSM - Interactive Application', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new BubbleSortPage(page);
    await app.goto();
    await app.setSpeedFastest();
    // Ensure we start in ready state
    await app.waitForReady();
  });

  test.afterEach(async ({ page }) => {
    // Teardown hook; nothing specific required other than ensuring page is closed by runner
  });

  test.describe('Ready state', () => {
    test('renders bars and enables controls on load (onEnter: renderBarsAndCreateGenerator)', async () => {
      // Validate that bars exist and controls are enabled
      await expect(app.bars).toHaveCountGreaterThan(0);
      await expect(app.stepButton).toBeEnabled();
      await expect(app.applyButton).toBeEnabled();
      await expect(app.shuffleButton).toBeEnabled();
      // Announce should indicate ready
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Ready/i);
      }
    });

    test('ORDER_CHANGE remains in ready and does not disable controls', async () => {
      await app.setOrderByText('Descending');
      await expect(app.stepButton).toBeEnabled();
      await app.setOrderByText('Ascending');
      await expect(app.stepButton).toBeEnabled();
      if (await app.announce.count()) {
        // Announcement might stay ready or change with order; still should be non-error
        await expect(app.announce).toContainText(/Ready|sort/i);
      }
    });

    test('SIZE_CHANGE triggers resetting then returns to ready with updated bars', async () => {
      const initialCount = await app.bars.count();
      await app.setSize(3);
      // After RESET_COMPLETE -> ready
      await app.waitForReady();
      await expect(app.bars).toHaveCount(3);
      // Use another size to verify change
      await app.setSize(initialCount);
      await app.waitForReady();
      await expect(app.bars).toHaveCount(initialCount);
    });

    test('APPLY_ARRAY_VALID transitions to resetting then ready; bars reflect values', async () => {
      await app.setArrayInput('5,1,4,2');
      await app.clickApply();
      await app.waitForReady();
      const values = await app.getBarValues();
      // Values may be rendered as exact input order before sorting
      expect(values.length).toBe(4);
      expect(values).toEqual([5, 1, 4, 2]);
    });

    test('APPLY_ARRAY_INVALID enters input_error and shows message', async () => {
      await app.setArrayInput('1,,abc,4');
      await app.clickApply();
      // Input error should be visible
      await expect(app.arrayError).toBeVisible();
      await expect(app.arrayError).toContainText(/invalid|error|array/i);
    });

    test('STEP_* from ready executes single visual action and returns to ready', async () => {
      // Configure a simple array that triggers compare then swap then mark sorted then finish within multiple steps
      await app.setArrayInput('2,1');
      await app.clickApply();
      await app.waitForReady();

      // STEP_COMPARE: one step should lead to comparing visual
      await app.clickStep();
      await app.waitForComparing();
      // After animation completes, comparing should clear and return to ready
      await app.waitForComparingCleared();
      await app.waitForReady();

      // STEP_SWAP: Step again until we see swapping
      // Depending on generator, swap may occur next; step until swap appears
      for (let i = 0; i < 3; i++) {
        await app.clickStep();
        const hasSwap = await app.swappingBars.count();
        if (hasSwap > 0) break;
      }
      await app.waitForSwapping();
      await app.waitForSwappingCleared();
      await app.waitForReady();

      // STEP_MARK_SORTED: step until a bar is marked sorted
      // With [2,1], last element becomes sorted after pass; step until at least one sorted
      for (let i = 0; i < 3; i++) {
        await app.clickStep();
        const sortedCount = await app.sortedBars.count();
        if (sortedCount > 0) break;
      }
      await app.waitForSomeSortedCount(1);
      await app.waitForReady();

      // STEP_FINISH: if array is size 2, additional steps eventually finish
      for (let i = 0; i < 5; i++) {
        await app.clickStep();
      }
      // done state: all bars sorted
      const barCount = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(barCount);
    });

    test('RESET transitions to resetting then returns to ready (onEnter: resetToInitial)', async () => {
      await app.clickReset();
      await app.waitForReady();
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Reset|Ready/i);
      }
      await expect(app.stepButton).toBeEnabled();
    });

    test('SHUFFLE transitions to shuffling then returns to ready with different order', async () => {
      const beforePositions = await app.getBarLeftPositions();
      await app.clickShuffle();
      await app.waitForReady();
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Shuffled/i);
      }
      const afterPositions = await app.getBarLeftPositions();
      // Positions should differ for at least one bar; not strict, but likely true
      const changed = beforePositions.some((pos, i) => afterPositions[i] !== pos);
      expect(changed).toBeTruthy();
    });

    test('WINDOW_RESIZE event keeps state ready and updates layout without errors', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 600 });
      await app.waitForReady();
      // Bars remain rendered
      await expect(app.bars).toHaveCountGreaterThan(0);
    });
  });

  test.describe('Input Error state', () => {
    test.beforeEach(async () => {
      await app.setArrayInput('invalid,xx,,');
      await app.clickApply();
      await expect(app.arrayError).toBeVisible();
    });

    test('onEnter: showArrayError; onExit: clearArrayError after valid apply', async () => {
      await expect(app.arrayError).toBeVisible();
      // Apply valid array -> resetting -> ready -> error cleared
      await app.setArrayInput('3,2,1');
      await app.clickApply();
      await app.waitForReady();
      await expect(app.arrayError).toBeHidden();
    });

    test('ORDER_CHANGE stays in input_error and keeps error visible', async () => {
      await app.setOrderByText('Descending');
      await expect(app.arrayError).toBeVisible();
      await app.setOrderByText('Ascending');
      await expect(app.arrayError).toBeVisible();
    });

    test('RESET transitions out to resetting then ready and clears error', async () => {
      await app.clickReset();
      await app.waitForReady();
      await expect(app.arrayError).toBeHidden();
    });

    test('SHUFFLE transitions out to shuffling then ready and clears error', async () => {
      await app.clickShuffle();
      await app.waitForReady();
      await expect(app.arrayError).toBeHidden();
    });

    test('PLAY transitions to playing even from input_error and disables controls', async () => {
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
      await expect(app.arrayError).toBeHidden(); // onExit should clear error
      // Pause to exit playing
      await app.clickPause();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('WINDOW_RESIZE stays in input_error and retains message', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(app.arrayError).toBeVisible();
    });
  });

  test.describe('Playing state', () => {
    test.beforeEach(async () => {
      await app.setArrayInput('5,1,4,2');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      // playing: setRunningTrue disables controls
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('onEnter: setRunningTrue disables controls', async () => {
      await expect(app.stepButton).toBeDisabled();
      await expect(app.applyButton).toBeDisabled();
      await expect(app.shuffleButton).toBeDisabled();
      // Changing order/size while playing is ignored and stays playing
      const labelBefore = await app.playPauseLabel();
      await app.setOrderByText('Descending');
      await app.setSize(2);
      const labelAfter = await app.playPauseLabel();
      expect(labelBefore).toMatch(/Pause/i);
      expect(labelAfter).toMatch(/Pause/i);
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('COMPARE -> comparing visual state then returns to playing (ANIMATION_COMPLETE_TO_PLAYING)', async () => {
      // Wait for an eventual compare state during play
      await app.waitForComparing();
      // Compare classes should appear
      await expect(app.compareA).toHaveCount(1);
      await expect(app.compareB).toHaveCount(1);
      // After animation completes, should clear and remain playing
      await app.waitForComparingCleared();
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('SWAP -> swapping visual state then returns to playing', async () => {
      // Wait for a swap during play
      await app.waitForSwapping();
      await app.waitForSwappingCleared();
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('MARK_SORTED -> marks an index sorted during play', async () => {
      // Wait until at least one bar is marked sorted
      await app.waitForSomeSortedCount(1);
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('PAUSE transitions to paused (onExit: setRunningFalse)', async () => {
      await app.clickPause();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('FINISH transitions to done and marks all bars sorted', async () => {
      // Let run to completion quickly; speed already set
      // Poll until all bars sorted or timeout
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars, { timeout: 10000 });
      // Controls should be enabled now (finished)
      await expect(app.stepButton).toBeEnabled();
      await expect(app.applyButton).toBeEnabled();
      // Announcement should indicate sorted
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Array sorted|sorted/i);
      }
    });

    test('WINDOW_RESIZE stays in playing and does not disrupt animation', async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 600 });
      expect(await app.isPlaying()).toBeTruthy();
      // Visual changes continue (await next compare)
      await app.waitForComparing();
    });
  });

  test.describe('Paused state', () => {
    test.beforeEach(async () => {
      await app.setArrayInput('5,1,4,2');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
      await app.clickPause();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('onEnter: announcePaused; controls enabled and Play resumes', async () => {
      // Announcement may include 'Paused'
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Paused|pause/i);
      }
      await expect(app.stepButton).toBeEnabled();
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('STEP_COMPARE processes one compare and returns to paused (ANIMATION_COMPLETE_TO_PAUSED)', async () => {
      await app.clickStep();
      await app.waitForComparing();
      await app.waitForComparingCleared();
      // Still paused afterwards
      expect(await app.isPaused()).toBeTruthy();
    });

    test('STEP_SWAP processes one swap and returns to paused', async () => {
      // Step until swap occurs once
      let sawSwap = false;
      for (let i = 0; i < 5; i++) {
        await app.clickStep();
        if (await app.swappingBars.count()) {
          sawSwap = true;
          await app.waitForSwappingCleared();
          break;
        }
      }
      expect(sawSwap).toBeTruthy();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('STEP_MARK_SORTED processes a mark sorted and returns to paused', async () => {
      const beforeCount = await app.sortedBars.count();
      // Step repeatedly until sorted count increases by at least 1
      let increased = false;
      for (let i = 0; i < 10; i++) {
        await app.clickStep();
        const cur = await app.sortedBars.count();
        if (cur > beforeCount) {
          increased = true;
          break;
        }
      }
      expect(increased).toBeTruthy();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('STEP_FINISH transitions to done and enables controls', async () => {
      // Step until finish is reached
      for (let i = 0; i < 30; i++) {
        await app.clickStep();
        const allSorted = (await app.sortedBars.count()) === (await app.bars.count());
        if (allSorted) break;
      }
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars);
      await expect(app.stepButton).toBeEnabled();
    });

    test('RESET transitions to resetting and then ready', async () => {
      await app.clickReset();
      await app.waitForReady();
      await expect(app.stepButton).toBeEnabled();
    });

    test('SHUFFLE transitions to shuffling then ready', async () => {
      await app.clickShuffle();
      await app.waitForReady();
      await expect(app.stepButton).toBeEnabled();
    });

    test('ORDER_CHANGE while paused stays paused but clears sorted marks and resets generator', async () => {
      // Create some sorted marks by stepping
      for (let i = 0; i < 5; i++) {
        await app.clickStep();
      }
      const sortedCountBefore = await app.sortedBars.count();
      await app.setOrderByText('Descending');
      // Sorted marks should be cleared according to notes
      await expect(app.sortedBars).toHaveCount(0);
      // Still paused
      expect(await app.isPaused()).toBeTruthy();
    });

    test('WINDOW_RESIZE stays in paused state', async ({ page }) => {
      await page.setViewportSize({ width: 700, height: 500 });
      expect(await app.isPaused()).toBeTruthy();
    });
  });

  test.describe('Comparing visual state', () => {
    test('onEnter: highlightCompare adds compare classes; onExit: clearStyles removes them', async () => {
      // Step from ready to ensure ANIMATION_COMPLETE_TO_READY
      await app.setArrayInput('1,2');
      await app.clickApply();
      await app.waitForReady();

      await app.clickStep();
      await app.waitForComparing();
      await expect(app.compareA).toHaveCount(1);
      await expect(app.compareB).toHaveCount(1);
      // After animation completes, classes cleared
      await app.waitForComparingCleared();
      // State back to ready
      await app.waitForReady();
    });

    test('PAUSE during comparing -> after animation completes, state becomes paused', async () => {
      await app.setArrayInput('2,1,3');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
      await app.waitForComparing();
      // Trigger pause while in comparing
      await app.clickPause();
      // Classes should clear after animation; final state paused
      await app.waitForComparingCleared();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('WINDOW_RESIZE keeps comparing state (no state change; visual may reflow)', async ({ page }) => {
      await app.setArrayInput('3,1,2');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      await app.waitForComparing();
      await page.setViewportSize({ width: 1100, height: 700 });
      // Still in playing; comparing may proceed
      expect(await app.isPlaying()).toBeTruthy();
    });
  });

  test.describe('Swapping visual state', () => {
    test('onEnter: performSwapVisual adds swapping class and updates values; onExit: clearStyles', async () => {
      // Force an early swap by array [2,1]
      await app.setArrayInput('2,1');
      await app.clickApply();
      await app.waitForReady();

      // Step until swapping occurs
      for (let i = 0; i < 3; i++) {
        await app.clickStep();
        if (await app.swappingBars.count()) break;
      }
      await app.waitForSwapping();
      // After animation complete, class removed
      await app.waitForSwappingCleared();
      await app.waitForReady();
    });

    test('PAUSE during swapping -> ends in paused after animation', async () => {
      await app.setArrayInput('4,3,2,1');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      // Wait for first swap and pause
      await app.waitForSwapping();
      await app.clickPause();
      await app.waitForSwappingCleared();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('WINDOW_RESIZE during swapping does not change state', async ({ page }) => {
      await app.setArrayInput('4,3,2,1');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      await app.waitForSwapping();
      await page.setViewportSize({ width: 900, height: 600 });
      // Swapping clears, remains playing
      await app.waitForSwappingCleared();
      expect(await app.isPlaying()).toBeTruthy();
    });
  });

  test.describe('Marking sorted visual state', () => {
    test('onEnter: markSortedIndex sets sorted class; transitions context dependent', async () => {
      await app.setArrayInput('2,1,3');
      await app.clickApply();
      await app.waitForReady();

      // Play to ensure marking happens; verify at least one sorted bar appears
      await app.clickPlay();
      await app.waitForSomeSortedCount(1);
      expect(await app.isPlaying()).toBeTruthy();
      // Pause and step marking
      await app.clickPause();
      expect(await app.isPaused()).toBeTruthy();
      const beforeSorted = await app.sortedBars.count();
      for (let i = 0; i < 5; i++) {
        await app.clickStep();
        const curSorted = await app.sortedBars.count();
        if (curSorted > beforeSorted) break;
      }
      expect(await app.isPaused()).toBeTruthy();
    });

    test('PAUSE during marking_sorted -> ends in paused', async () => {
      await app.setArrayInput('5,4,3,2,1');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      await app.waitForSomeSortedCount(1);
      await app.clickPause();
      expect(await app.isPaused()).toBeTruthy();
    });

    test('WINDOW_RESIZE during marking_sorted stays in current state', async ({ page }) => {
      await app.setArrayInput('3,2,1');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      await app.waitForSomeSortedCount(1);
      await page.setViewportSize({ width: 1200, height: 800 });
      expect(await app.isPlaying()).toBeTruthy();
    });
  });

  test.describe('Done state', () => {
    test('onEnter: markAllSorted marks all bars sorted and enables controls', async () => {
      await app.setArrayInput('3,2,1');
      await app.clickApply();
      await app.waitForReady();
      await app.clickPlay();
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars, { timeout: 10000 });
      await expect(app.stepButton).toBeEnabled();
      await expect(app.applyButton).toBeEnabled();
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Array sorted|sorted/i);
      }
    });

    test('PLAY from done prepares replay (clears sorted marks, resets counters) and enters playing', async () => {
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars);
      await app.clickPlay();
      // After entering playing again, sorted marks should be cleared
      await expect(app.sortedBars).toHaveCount(0);
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('STEP in done does nothing (stays done)', async () => {
      // Ensure we reach done first
      await app.clickPause(); // pause from playing to manipulate; then step to finish again quickly
      for (let i = 0; i < 20; i++) {
        await app.clickStep();
      }
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars, { timeout: 10000 });
      // Click Step in done; nothing changes
      const sortedBefore = await app.sortedBars.count();
      await app.clickStep();
      const sortedAfter = await app.sortedBars.count();
      expect(sortedAfter).toBe(sortedBefore);
    });

    test('ORDER_CHANGE when done moves to ready and clears sorted marks', async () => {
      // Ensure done
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars);
      await app.setOrderByText('Descending');
      // Should transition to ready per FSM and clear sorted marks
      await expect(app.sortedBars).toHaveCount(0);
      await app.waitForReady();
    });

    test('SHUFFLE from done transitions to shuffling then back to ready', async () => {
      await app.clickShuffle();
      await app.waitForReady();
      await expect(app.stepButton).toBeEnabled();
    });

    test('APPLY_ARRAY_VALID from done transitions to resetting then ready', async () => {
      await app.setArrayInput('10,9,8');
      await app.clickApply();
      await app.waitForReady();
      const values = await app.getBarValues();
      expect(values).toEqual([10, 9, 8]);
    });

    test('WINDOW_RESIZE while done retains done state visuals', async ({ page }) => {
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars);
      await page.setViewportSize({ width: 800, height: 600 });
      await expect(app.sortedBars).toHaveCount(totalBars);
    });
  });

  test.describe('Resetting state', () => {
    test('resetToInitial sets running=false, finished=false, renders bars, and transitions via RESET_COMPLETE to ready', async () => {
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
      await app.clickReset();
      await app.waitForReady();
      // Controls enabled
      await expect(app.stepButton).toBeEnabled();
      // Announcement indicates reset
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Reset/i);
      }
    });

    test('WINDOW_RESIZE does not break resetting (still reaches ready)', async ({ page }) => {
      await app.clickReset();
      await page.setViewportSize({ width: 1000, height: 700 });
      await app.waitForReady();
    });
  });

  test.describe('Shuffling state', () => {
    test('shuffleAndReset announces shuffle and transitions via RESET_COMPLETE to ready', async () => {
      await app.clickShuffle();
      await app.waitForReady();
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Shuffled/i);
      }
      await expect(app.stepButton).toBeEnabled();
    });

    test('WINDOW_RESIZE does not break shuffling (still reaches ready)', async ({ page }) => {
      await app.clickShuffle();
      await page.setViewportSize({ width: 1100, height: 700 });
      await app.waitForReady();
    });
  });

  test.describe('Keyboard shortcuts', () => {
    test('Space toggles PLAY/PAUSE', async ({ page }) => {
      await page.keyboard.press('Space');
      expect(await app.isPlaying()).toBeTruthy();
      // Wait for some visual activity
      await app.waitForComparing();
      await page.keyboard.press('Space');
      expect(await app.isPaused()).toBeTruthy();
    });

    test('S triggers STEP; R triggers RESET; H triggers SHUFFLE', async ({ page }) => {
      await app.setArrayInput('2,1');
      await app.clickApply();
      await app.waitForReady();

      await page.keyboard.press('KeyS');
      await app.waitForComparing();
      await app.waitForComparingCleared();
      await app.waitForReady();

      await page.keyboard.press('KeyR');
      await app.waitForReady();
      if (await app.announce.count()) {
        await expect(app.announce).toContainText(/Reset/i);
      }

      const beforePositions = await app.getBarLeftPositions();
      await page.keyboard.press('KeyH');
      await app.waitForReady();
      const afterPositions = await app.getBarLeftPositions();
      const changed = beforePositions.some((pos, i) => afterPositions[i] !== pos);
      expect(changed).toBeTruthy();
    });
  });

  test.describe('Edge cases', () => {
    test('Controls disabled while playing prevents Apply/Shuffle/Size/Order changes', async () => {
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
      await expect(app.applyButton).toBeDisabled();
      await expect(app.shuffleButton).toBeDisabled();
      // Attempt changing size/order should not throw and should leave playing unchanged
      await app.setSize(2);
      await app.setOrderByText('Descending');
      expect(await app.isPlaying()).toBeTruthy();
    });

    test('Applying valid array while playing is ignored due to disabled controls', async () => {
      await app.clickPlay();
      await expect(app.applyButton).toBeDisabled();
      const valuesBefore = await app.getBarValues();
      // Try to set input but cannot click apply
      await app.setArrayInput('9,8,7');
      // Still playing and values unchanged
      expect(await app.isPlaying()).toBeTruthy();
      const valuesAfter = await app.getBarValues();
      expect(valuesAfter).toEqual(valuesBefore);
    });

    test('Size 1 array: STEP_FINISH should immediately lead to done', async () => {
      await app.setSize(1);
      await app.waitForReady();
      // Step once to finish
      await app.clickStep();
      const totalBars = await app.bars.count();
      await expect(app.sortedBars).toHaveCount(totalBars);
      await expect(app.stepButton).toBeEnabled();
    });

    test('ORDER_CHANGE while playing is ignored (state remains playing)', async () => {
      await app.setArrayInput('5,1,4,2');
      await app.clickApply();
      await app.clickPlay();
      expect(await app.isPlaying()).toBeTruthy();
      await app.setOrderByText('Descending');
      expect(await app.isPlaying()).toBeTruthy();
    });
  });
});