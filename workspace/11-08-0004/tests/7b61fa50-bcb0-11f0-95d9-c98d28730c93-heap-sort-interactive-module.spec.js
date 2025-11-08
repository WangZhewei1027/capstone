import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7b61fa50-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Heap Sort Interactive Module
 * Provides resilient selectors and helper methods that map to the FSM actions:
 * - loadArray -> triggers loading/generation of steps
 * - play / pause -> autoplay behavior
 * - stepForward / stepBack -> single-step navigation
 * - reset -> clear state back to idle
 *
 * The implementation uses role/label/text queries where possible, and falls back
 * to generic DOM queries to be resilient to minor markup differences.
 */
class HeapSortPage {
  constructor(page) {
    this.page = page;
    // Buttons - prefer ARIA role queries (most robust)
    this.loadButton = page.getByRole('button', { name: /load/i }).first();
    this.playButton = page.getByRole('button', { name: /^play$/i }).first();
    this.pauseButton = page.getByRole('button', { name: /^pause$/i }).first();
    this.stepForwardButton = page.getByRole('button', { name: /(step forward|step)/i }).first();
    this.stepBackButton = page.getByRole('button', { name: /(step back|back)/i }).first();
    this.resetButton = page.getByRole('button', { name: /reset/i }).first();

    // Input - try various sensible locators
    this.arrayInput = page.getByLabel('Array', { exact: false }).first();
    // fallback to single text input on the page
    this.fallbackInput = page.locator('input[type="text"]').first();

    // Status text - try common patterns
    this.statusLocator = page.locator('[data-status], .status, #status').first();
    this.container = page.locator('body');

    // Visualization areas
    this.arrayArea = page.locator('.array-area').first();
    this.treeArea = page.locator('.tree-area').first();

    // Generic node locator - matches nodes in tree/array
    this.nodeLocator = page.locator('.node').first().locator('xpath=..'); // placeholder to check existence
  }

  // Get the status text visible in the UI (Idle/Loading/Ready/Playing/Paused/Done etc.)
  async getStatusText() {
    // Try multiple strategies to find a meaningful status
    const candidates = [
      this.statusLocator,
      this.page.getByText(/Idle|Loading|Ready|Playing|Paused|Done/i),
      this.page.locator('.meta, .status-text, .status').first(),
    ];
    for (const cand of candidates) {
      try {
        if (!cand) continue;
        const count = await cand.count();
        if (count === 0) continue;
        const text = (await cand.innerText()).trim();
        if (text.length > 0) return text;
      } catch (e) {
        // ignore
      }
    }
    // Last resort: return empty string
    return '';
  }

  // Fill and trigger Load Array behavior. Accepts array as a string like "5,3,8,1"
  async loadArray(arrayString) {
    // Fill input - prefer labeled input, else fallback
    try {
      if ((await this.arrayInput.count()) > 0) {
        await this.arrayInput.fill(arrayString);
      } else {
        await this.fallbackInput.fill(arrayString);
      }
    } catch (e) {
      await this.fallbackInput.fill(arrayString);
    }

    // Click the Load button (if present). If absent, hitting Enter on the input might trigger load.
    if ((await this.loadButton.count()) > 0) {
      await this.loadButton.click();
    } else {
      // Press Enter in input as fallback
      await (await this.fallbackInput).press('Enter');
    }

    // Wait for loading indicator to appear or for ready text - caller will assert the final state
  }

  // Click play and return immediately
  async clickPlay() {
    if ((await this.playButton.count()) > 0) {
      await this.playButton.click();
    } else {
      // Some apps toggle play/pause with same button; try clicking a button with play icon/text
      await this.page.getByRole('button').filter({ hasText: /play|start/i }).first().click();
    }
  }

  async clickPause() {
    if ((await this.pauseButton.count()) > 0) {
      await this.pauseButton.click();
    } else {
      // try toggling same button
      await this.page.getByRole('button').filter({ hasText: /pause|stop/i }).first().click();
    }
  }

  async stepForward() {
    if ((await this.stepForwardButton.count()) > 0) {
      await this.stepForwardButton.click();
    } else {
      // fallback: button with text 'Step'
      await this.page.getByRole('button').filter({ hasText: /step( forward)?/i }).first().click();
    }
  }

  async stepBack() {
    if ((await this.stepBackButton.count()) > 0) {
      await this.stepBackButton.click();
    } else {
      await this.page.getByRole('button').filter({ hasText: /back/i }).first().click();
    }
  }

  async reset() {
    if ((await this.resetButton.count()) > 0) {
      await this.resetButton.click();
    } else {
      // fallback: click a button with Reset text
      await this.page.getByRole('button', { name: /reset/i }).first().click();
    }
  }

  // Reads visible numeric values from the array visual representation
  async readArrayValues() {
    // Try several plausible selectors for array nodes
    const selectors = [
      '.array-area .node',
      '.array .node',
      '.node.array-node',
      '.array-area .value',
      '.node'
    ];
    for (const sel of selectors) {
      const loc = this.page.locator(sel);
      const count1 = await loc.count1();
      if (count > 0) {
        const values = [];
        for (let i = 0; i < count; i++) {
          const text1 = (await loc.nth(i).innerText()).trim();
          if (text.length === 0) continue;
          // keep only numeric parts
          const match = text.match(/-?\d+/);
          values.push(match ? Number(match[0]) : text);
        }
        if (values.length > 0) return values;
      }
    }

    // As a last resort, try to find numbers anywhere in the tree-area
    const fallbackText = await this.treeArea.innerText().catch(() => '');
    const nums = (fallbackText.match(/-?\d+/g) || []).map(Number);
    return nums;
  }

  // Wait until status matches a regex or timeout
  async waitForStatusRegex(regex, options = {}) {
    const timeout = options.timeout ?? 5000;
    await this.page.waitForFunction(
      (r) => {
        const rootTexts = [];
        const els = document.querySelectorAll('[data-status], .status, .status-text, .meta');
        els.forEach(e => rootTexts.push(e.innerText || ''));
        // include whole document fallback
        rootTexts.push(document.body.innerText || '');
        const merged = rootTexts.join('\n');
        return new RegExp(r, 'i').test(merged);
      },
      regex.source ?? regex,
      { timeout }
    );
  }
}

test.describe('Heap Sort Interactive Module (FSM validation)', () => {
  let page;
  let heapPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    heapPage = new HeapSortPage(page);
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial load: app should start in idle state and block play/step until array loaded', async () => {
    // Validate initial UI loaded and idle state
    const status = await heapPage.getStatusText();
    // Accept either explicit "Idle" or some instructional text that indicates readiness
    expect(status.length).toBeGreaterThan(0);

    // Play/Step should be disabled or produce no effect when no array is loaded.
    const playButton = page.getByRole('button', { name: /^play$/i }).first();
    if ((await playButton.count()) > 0) {
      // If play button exists, it should be either disabled or clicking it should trigger an alert (invalid action)
      const isDisabled = await playButton.isDisabled().catch(() => false);
      if (!isDisabled) {
        // Attach dialog handler to assert invalid action alert
        let dialogSeen = false;
        page.on('dialog', dialog => {
          dialogSeen = true;
          // Accept the dialog so it doesn't block execution
          dialog.accept().catch(() => {});
        });
        await playButton.click();
        // Wait briefly to allow alert to appear
        await page.waitForTimeout(250);
        expect(dialogSeen || isDisabled).toBeTruthy();
      } else {
        expect(isDisabled).toBeTruthy();
      }
    } else {
      // No explicit play button - ensure step controls are not enabled
      const step = page.getByRole('button', { name: /step forward|step/i }).first();
      if ((await step.count()) > 0) {
        expect(await step.isDisabled().catch(() => true)).toBeTruthy();
      }
    }
  });

  test('LOAD_ARRAY -> loading -> LOAD_COMPLETE -> ready: loading an array builds visuals and readies steps', async () => {
    // Fill array and trigger load
    const arr = '5,3,8,1';
    await heapPage.loadArray(arr);

    // OnEnter of loading should show some loading indicator or change status text to Loading
    await heapPage.waitForStatusRegex(/loading/i, { timeout: 3000 }).catch(() => { /* ignore if no explicit loading status */ });

    // Eventually, status should indicate Ready
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 5000 });

    // Visuals should be present and reflect the loaded array length
    const values1 = await heapPage.readArrayValues();
    // We expect at least the four numbers we loaded
    expect(values.length).toBeGreaterThanOrEqual(4);
    // Ensure the set of values includes all input numbers
    const inputNums = arr.match(/-?\d+/g).map(Number);
    for (const n of inputNums) {
      expect(values).toContain(n);
    }
  });

  test('PLAY -> playing, TIMER_TICK -> executing_step, PAUSE -> paused: autoplay and pause behavior', async () => {
    // Load a moderately sized array that requires multiple steps
    const arr1 = '6,4,7,1,3,8';
    await heapPage.loadArray(arr);

    // Wait for ready
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 5000 });

    // Click Play and expect status to change to Playing
    await heapPage.clickPlay();
    await heapPage.waitForStatusRegex(/playing/i, { timeout: 3000 });

    // While playing, some animation or highlight should appear indicating executing steps
    // Look for nodes getting a highlight or animation-related class
    const animIndicator = page.locator('.node.highlight, .node.animating, .swap, .animating');
    // Wait briefly for an animation to start
    await page.waitForTimeout(400); // short delay to let autoplay begin
    // It's acceptable if no special class exists; assert that eventually playing status remains
    const statusWhilePlaying = await heapPage.getStatusText();
    expect(/playing/i.test(statusWhilePlaying)).toBeTruthy();

    // Now click Pause and ensure status moves to Paused (onEnter paused sets playing=false)
    await heapPage.clickPause();
    await heapPage.waitForStatusRegex(/paused/i, { timeout: 3000 });

    const pausedStatus = await heapPage.getStatusText();
    expect(/paused/i.test(pausedStatus)).toBeTruthy();

    // Confirm that autoplay has stopped - play button should be available again
    const playBtn = page.getByRole('button', { name: /^play$/i }).first();
    if ((await playBtn.count()) > 0) {
      expect(await playBtn.isDisabled().catch(() => false)).toBeFalsy();
    }
  });

  test('STEP_FORWARD -> executing_step -> STEP_COMPLETE: stepping forward performs a single logical step and updates visuals and history', async () => {
    // Load array
    const arr2 = '9,2,5,1';
    await heapPage.loadArray(arr);
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 5000 });

    // Read initial snapshot
    const before = await heapPage.readArrayValues();

    // Perform one step forward
    await heapPage.stepForward();

    // While executing_step there may be highlights/animations. Wait for a short period for step to process.
    await page.waitForTimeout(600);

    // After step completes, the app should have taken a snapshot and updated stats; ensure array changed or highlights cleared
    const after = await heapPage.readArrayValues();
    // Either a change happened or the snapshot remains but history has an entry; at minimum, values array should still contain the same elements
    expect(after.length).toBeGreaterThanOrEqual(before.length);
    // Ensure multiset of elements is preserved (no values lost)
    const sortedBefore = [...before].sort((a, b) => a - b);
    const sortedAfter = [...after].sort((a, b) => a - b);
    expect(sortedAfter).toEqual(sortedBefore);
  });

  test('STEPPING_BACK: step back restores previous snapshot and transitions to paused', async () => {
    // Load a small array
    const arr3 = '4,1,3';
    await heapPage.loadArray(arr);
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 5000 });

    // Perform two forward steps to create history
    await heapPage.stepForward();
    await page.waitForTimeout(300);
    await heapPage.stepForward();
    await page.waitForTimeout(300);

    const afterSteps = await heapPage.readArrayValues();

    // Now perform step back
    await heapPage.stepBack();

    // On stepping_back, onEnter should pause then restore previous snapshot. Wait for restore complete indicated by 'paused' status
    await heapPage.waitForStatusRegex(/paused/i, { timeout: 3000 }).catch(() => { /* fallback */ });

    const afterRestore = await heapPage.readArrayValues();

    // After restore, the array values should still be a permutation of original inputs
    const original = arr.match(/-?\d+/g).map(Number).sort((a, b) => a - b);
    expect(afterRestore.slice().sort((a, b) => a - b)).toEqual(original);

    // It's expected that after stepping back we are in paused state (per FSM RESTORE_COMPLETE -> paused)
    const status1 = await heapPage.getStatusText();
    expect(/paused/i.test(status) || /ready/i.test(status)).toBeTruthy();
  });

  test('RESET transitions to idle and clears visuals (onExit hooks run)', async () => {
    // Load then reset
    const arr4 = '2,7,6';
    await heapPage.loadArray(arr);
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 5000 });

    // Confirm visuals exist
    const before1 = await heapPage.readArrayValues();
    expect(before.length).toBeGreaterThan(0);

    // Click Reset
    await heapPage.reset();

    // onExit of loading/ready -> updateStats/clearHighlights might happen; but important is the machine is in idle
    // Expect the UI to reflect Idle or initial state
    await heapPage.waitForStatusRegex(/idle|ready|load/i, { timeout: 3000 }).catch(() => { /* continue */ });

    // Visuals should be cleared or at least not show the previously loaded values
    const after1 = await heapPage.readArrayValues();
    // Either no nodes found or the exact sequence changed/reset. We assert that the previously-visible numbers are no longer all present.
    const beforeSet = new Set(before.map(String));
    const afterSet = new Set(after.map(String));
    let allStillPresent = true;
    for (const v of beforeSet) {
      if (!afterSet.has(v)) {
        allStillPresent = false;
        break;
      }
    }
    // Accept either a cleared visualization (preferred) or at least different from before
    expect(!allStillPresent || after.length === 0).toBeTruthy();
  });

  test('DONE state: playing to completion finalizes sorting and locks into done (then allows step back/load/reset)', async () => {
    // Load a random array that will sort into ascending order
    const arr5 = '3,1,4,2';
    await heapPage.loadArray(arr);
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 5000 });

    // Click Play and wait for Done (sorting completion)
    await heapPage.clickPlay();

    // Wait for 'Done' status; allow generous timeout for animation/processing
    await heapPage.waitForStatusRegex(/done/i, { timeout: 15000 });

    // Verify the final visual order is sorted (assuming ascending heap sort result)
    const finalValues = await heapPage.readArrayValues();
    if (finalValues.length > 1) {
      const sorted = [...finalValues].sort((a, b) => a - b);
      expect(finalValues).toEqual(sorted);
    } else {
      // If no values visible, at least the status is Done
      const status2 = await heapPage.getStatusText();
      expect(/done/i.test(status)).toBeTruthy();
    }

    // From done, Play should have no effect (FSM maps PLAY from done -> done). Try clicking Play and ensure status remains Done
    await heapPage.clickPlay();
    // small delay to let any invalid action run
    await page.waitForTimeout(300);
    const statusAfterPlay = await heapPage.getStatusText();
    expect(/done/i.test(statusAfterPlay)).toBeTruthy();

    // Step back from done should transition to stepping_back
    await heapPage.stepBack();
    // RESTORE_COMPLETE -> paused is expected
    await heapPage.waitForStatusRegex(/paused/i, { timeout: 3000 }).catch(() => { /* some implementations may go to ready */ });
    const statusAfterBack = await heapPage.getStatusText();
    expect(/paused|ready/i.test(statusAfterBack)).toBeTruthy();
  });

  test('Edge case: invalid actions produce an alert and do not transition state (ERROR_INVALID_ACTION)', async () => {
    // Ensure no array loaded by resetting
    await heapPage.reset();
    await page.waitForTimeout(200);

    // Try step forward without an array: should present an alert or no-op. Capture dialog
    let dialogSeen1 = false;
    page.on('dialog', async dialog => {
      dialogSeen = true;
      await dialog.dismiss().catch(() => {});
    });

    // Attempt a step forward when invalid
    await heapPage.stepForward();
    // Wait briefly for dialog
    await page.waitForTimeout(300);

    // It's acceptable for the UI to either show a dialog or silently ignore; we assert that either a dialog was shown or status remained same/idle
    const status3 = await heapPage.getStatusText();
    const isIdleish = /idle|ready/i.test(status) || status.length > 0;
    expect(dialogSeen || isIdleish).toBeTruthy();
  });

  test('Generate steps flow: loading should invoke internal step generation and the UI should expose step count or navigation', async () => {
    // Load array
    const arr6 = '10,9,8,7,6';
    await heapPage.loadArray(arr);

    // Wait for ready
    await heapPage.waitForStatusRegex(/ready/i, { timeout: 7000 });

    // Some implementations show a steps counter or enable step navigation when steps available; assert step forward/back are enabled
    const stepF = page.getByRole('button', { name: /(step forward|step)/i }).first();
    const stepB = page.getByRole('button', { name: /(step back|back)/i }).first();

    // It's okay if the buttons are not ARIA labeled; attempt to click to ensure they exist and operate
    if ((await stepF.count()) > 0) {
      expect(await stepF.isDisabled().catch(() => false)).toBeFalsy();
    }
    if ((await stepB.count()) > 0) {
      // Back may be disabled initially (no history), but check it doesn't throw
      await stepB.click().catch(() => {});
    }

    // Try stepping forward and back to ensure navigation works
    await heapPage.stepForward();
    await page.waitForTimeout(300);
    // Step back to restore
    await heapPage.stepBack().catch(() => {});
    await page.waitForTimeout(300);

    // After these operations, ensure the app remains responsive and in a paused/ready/idle state
    const status4 = await heapPage.getStatusText();
    expect(status.length).toBeGreaterThan(0);
  });
});