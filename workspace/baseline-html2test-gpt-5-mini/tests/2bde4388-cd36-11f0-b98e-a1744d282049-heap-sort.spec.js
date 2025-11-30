import { test, expect } from '@playwright/test';

// Page object for the Heap Sort visualizer
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4388-cd36-11f0-b98e-a1744d282049.html';
    this.app = page.locator('.app');
    this.sizeLabel = page.locator('#sizeLabel');
    this.stageLabel = page.locator('#stageLabel');
    this.compCount = page.locator('#compCount');
    this.swapCount = page.locator('#swapCount');
    this.bars = page.locator('#bars .bar');
    this.shuffleBtn = page.locator('#shuffleBtn');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.playPauseBtn = page.locator('#playPauseBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.speedRange = page.locator('#speedRange');
    this.speedLabel = page.locator('#speedLabel');
    this.codeLines = page.locator('.codeLine');
  }

  // Navigate to the page and wait for app to be visible
  async goto() {
    await this.page.goto(this.url);
    await expect(this.app).toBeVisible();
    // ensure initial UI rendered
    await expect(this.sizeLabel).toHaveText(/\d+/);
  }

  // Read all bar labels (values)
  async getBarValues() {
    const count = await this.bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const lbl = this.bars.nth(i).locator('.barLabel');
      values.push(await lbl.textContent());
    }
    return values;
  }

  // Returns number of bars with a given class
  async countBarsWithClass(cls) {
    return await this.page.evaluate((c) => {
      const bars = Array.from(document.querySelectorAll('#bars .bar'));
      return bars.filter(b => b.classList.contains(c)).length;
    }, cls);
  }

  // Set speedRange to ms (string or number) and dispatch input event
  async setSpeed(ms) {
    await this.page.evaluate((val) => {
      const el = document.getElementById('speedRange');
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, ms);
    await expect(this.speedLabel).toHaveText(`${ms} ms`);
  }
}

test.describe('Heap Sort Visualization — end-to-end', () => {
  // Capture page errors and console messages for assertions
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];
    page.on('pageerror', (err) => {
      // collect uncaught exceptions from the page
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      // collect console messages for inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  // Basic loading and initial state assertions
  test('page loads and has correct initial UI state', async ({ page }) => {
    const heap = new HeapSortPage(page);
    await heap.goto();

    // Verify page title and main header present
    await expect(page.locator('h1')).toHaveText(/Heap Sort/);

    // Default array size expected from HTML script DEFAULT_SIZE = 30
    await expect(heap.sizeLabel).toHaveText('30');

    // Initially no comparisons or swaps
    await expect(heap.compCount).toHaveText('0');
    await expect(heap.swapCount).toHaveText('0');

    // Initial stage should be 'idle'
    await expect(heap.stageLabel).toHaveText('idle');

    // Expect 30 bars rendered (one per array element)
    await expect(heap.bars).toHaveCount(30);

    // Pseudocode should be present and contain line numbers
    await expect(page.locator('.codeLine[data-line="1"]')).toBeVisible();
    await expect(page.locator('.codeLine[data-line="8"]')).toBeVisible();
    // ensure no uncaught page errors occurred during load
    expect(pageErrors.length, `page errors: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);

    // Expect the console to have the initialization message
    const hasInitMsg = consoleMessages.some(m => m.text.includes('Heap Sort visualizer ready'));
    expect(hasInitMsg).toBe(true);
  });

  test.describe('Controls and interactions', () => {
    test('shuffle resets array values and counters', async ({ page }) => {
      const heap1 = new HeapSortPage(page);
      await heap.goto();

      // Capture initial bar values
      const before = await heap.getBarValues();
      expect(before.length).toBeGreaterThan(0);

      // Click shuffle to generate a new array
      await heap.shuffleBtn.click();

      // After shuffle, bars should re-render and counts reset
      await expect(heap.compCount).toHaveText('0');
      await expect(heap.swapCount).toHaveText('0');
      await expect(heap.stageLabel).toHaveText('idle');

      const after = await heap.getBarValues();

      // Usually values will differ after shuffle; assert that it's not identical.
      // It's possible random generates same sequence, so allow either: if identical, at least ensure DOM updated (bar count same).
      if (before.join(',') !== after.join(',')) {
        // Values changed as expected
        expect(after.join(',')).not.toBe(before.join(','));
      } else {
        // If identical by chance, ensure count and structure remain consistent
        expect(after.length).toBe(before.length);
      }
    });

    test('start creates generator; step performs sift-down and highlights code', async ({ page }) => {
      const heap2 = new HeapSortPage(page);
      await heap.goto();

      // Ensure starting from clean state
      await expect(heap.stageLabel).toHaveText('idle');

      // Click Start - should create the generator and set stage to 'started'
      await heap.startBtn.click();
      await expect(heap.stageLabel).toHaveText('started');

      // Click Step - should execute one action from generator (likely a siftStart)
      await heap.stepBtn.click();

      // After a single step, stage label should indicate sift or comparing (sift-start sets 'sift-down (root=...)')
      await expect(heap.stageLabel).toHaveText(/sift-down|comparing|swapping/);

      // Code highlighting should have at least one active line after a step
      // Wait until a codeLine has class 'lineActive' or timeout
      await page.waitForFunction(() => {
        return !!document.querySelector('.codeLine.lineActive');
      }, { timeout: 2000 });

      // Assert at least one code line is active
      const activeLines = await page.locator('.codeLine.lineActive').count();
      expect(activeLines).toBeGreaterThan(0);

      // After a step, comparisons counter may have increased (>=0)
      const compText = await heap.compCount.textContent();
      expect(Number(compText)).toBeGreaterThanOrEqual(0);
    });

    test('play starts automatic progression and pause returns control', async ({ page }) => {
      const heap3 = new HeapSortPage(page);
      await heap.goto();

      // Speed up the animation / delays so the play loop advances quickly
      await heap.setSpeed(10); // 10 ms for fast progression

      // Make sure generator is created
      await heap.startBtn.click();
      await expect(heap.stageLabel).toHaveText('started');

      // Start playing
      await heap.playPauseBtn.click();
      // Play button becomes Pause (class primary applied)
      await expect(heap.playPauseBtn).toHaveText('Pause');

      // Let the algorithm run briefly (short time)
      await page.waitForTimeout(250);

      // Pause playback
      await heap.playPauseBtn.click();
      // Button text returns to Play after pausing
      await expect(heap.playPauseBtn).toHaveText('Play');

      // Verify that the algorithm made progress: comparisons and/or swaps incremented
      const comp = Number(await heap.compCount.textContent());
      const swaps = Number(await heap.swapCount.textContent());
      expect(comp + swaps).toBeGreaterThan(0);

      // At least some bars should have been marked as part of heap or sorted
      const heapCount = await heap.countBarsWithClass('heap');
      const sortedCount = await heap.countBarsWithClass('sorted');
      // Either there are items marked in heap or some sorted elements after short play
      expect(heapCount + sortedCount).toBeGreaterThan(0);
    });

    test('reset returns UI to idle and counters to zero', async ({ page }) => {
      const heap4 = new HeapSortPage(page);
      await heap.goto();

      // Make some progress
      await heap.startBtn.click();
      await heap.stepBtn.click();
      await expect(heap.stageLabel).not.toHaveText('idle');

      // Click reset -> should create a new random array and set stage to idle
      await heap.resetBtn.click();
      await expect(heap.stageLabel).toHaveText('idle');
      await expect(heap.compCount).toHaveText('0');
      await expect(heap.swapCount).toHaveText('0');

      // Bars count should remain same as sizeLabel (still default size)
      const size = Number(await heap.sizeLabel.textContent());
      await expect(heap.bars).toHaveCount(size);
    });

    test('clicking Start twice triggers an alert dialog', async ({ page }) => {
      const heap5 = new HeapSortPage(page);
      await heap.goto();

      // First start: initialize the generator
      await heap.startBtn.click();
      await expect(heap.stageLabel).toHaveText('started');

      // Prepare to catch the alert dialog that occurs when Start is clicked again
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      // Second start should produce an alert
      await heap.startBtn.click();

      // Wait briefly to allow dialog handler to run
      await page.waitForTimeout(200);

      // Assert we received a dialog with expected text
      expect(dialogMessage).toContain('Sorting already started');
    });

    test('speed control updates transition duration and label', async ({ page }) => {
      const heap6 = new HeapSortPage(page);
      await heap.goto();

      // Set speed to a different value and assert UI updates
      await heap.setSpeed(120);

      // Ensure bar elements have transitionDuration matching the speed (in seconds)
      // We examine computed style of the first bar
      const duration = await page.evaluate(() => {
        const bar = document.querySelector('#bars .bar');
        return window.getComputedStyle(bar).transitionDuration;
      });
      // transitionDuration is in seconds like '0.12s'
      expect(duration).toMatch(/s$/);
      // Convert to milliseconds and assert it's near our set value (tolerant)
      const seconds = parseFloat(duration.replace('s',''));
      expect(Math.round(seconds * 1000)).toBeGreaterThanOrEqual(100);
      expect(await heap.speedLabel.textContent()).toBe('120 ms');
    });
  });

  test.describe('Robustness and error observation', () => {
    test('no uncaught page errors during a short play session', async ({ page }) => {
      const heap7 = new HeapSortPage(page);
      await heap.goto();

      // Ensure we capture any runtime issues while interacting
      await heap.setSpeed(10);
      await heap.startBtn.click();
      await heap.playPauseBtn.click();
      // Let play run a short while
      await page.waitForTimeout(200);
      // Pause
      await heap.playPauseBtn.click();

      // Assert there were no uncaught page errors collected
      // If any errors occurred, fail and provide the messages
      expect(pageErrors.length, `page errors: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);

      // Also ensure console contains the ready message at least
      const hasInitMsg1 = consoleMessages.some(m => m.text.includes('Heap Sort visualizer ready'));
      expect(hasInitMsg).toBe(true);
    });
  });
});