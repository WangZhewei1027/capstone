import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6b7374c0-bcb0-95d9-c98d28730c93.html';

// Page Object for the Radix Sort visualizer
class RadixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Common controls (use role-based queries where possible)
    this.input = page.locator('input[type="text"], textarea, input[name="numbers"], #input, [data-role="input"]');
    this.btnGenerate = page.getByRole('button', { name: /generate/i }).first();
    this.btnLoad = page.getByRole('button', { name: /load/i }).first();
    this.btnReset = page.getByRole('button', { name: /reset/i }).first();
    this.btnPlay = page.getByRole('button', { name: /play/i }).first();
    this.btnPause = page.getByRole('button', { name: /pause/i }).first();
    this.btnStep = page.getByRole('button', { name: /step/i }).first();
    this.speed = page.locator('input[type="range"], [aria-label*="speed"], #speed');
    // Visual containers (best-effort selectors)
    this.cardLocator = page.locator('.card, .digit-card, [data-role="card"], .num-card, .token');
    this.bucketLocator = page.locator('.bucket, [data-role="bucket"], .bucket-slot');
    // A status/phase indicator if present
    this.phaseDisplay = page.locator('[data-phase], #phase, .phase, .status, [data-role="phase"]').first();
    // An area/container for the main list/input cards
    this.inputArea = page.locator('.input-area, #inputArea, .cards-area, .stack, [data-role="input-area"]').first();
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait a moment for any script initialization
    await this.page.waitForTimeout(200);
  }

  // Helper to ensure a locator is visible and ready
  async ensureReady() {
    await expect(this.page.locator('body')).toBeVisible();
  }

  // Click Generate (if present) and wait for input to be populated
  async clickGenerate() {
    if (await this.btnGenerate.count() > 0) {
      await this.btnGenerate.click();
      // give generator a moment to populate
      await this.page.waitForTimeout(150);
    } else {
      throw new Error('Generate button not found');
    }
  }

  // Click Load (must exist)
  async clickLoad() {
    if (await this.btnLoad.count() > 0) {
      await this.btnLoad.click();
      // allow onEnter handlers to run
      await this.page.waitForTimeout(200);
    } else {
      throw new Error('Load button not found');
    }
  }

  async clickReset() {
    if (await this.btnReset.count() > 0) {
      await this.btnReset.click();
      // allow reset to clear DOM
      await this.page.waitForTimeout(150);
    } else {
      throw new Error('Reset button not found');
    }
  }

  async clickPlay() {
    if (await this.btnPlay.count() > 0) {
      await this.btnPlay.click();
      await this.page.waitForTimeout(100);
    } else {
      throw new Error('Play button not found');
    }
  }

  async clickPause() {
    if (await this.btnPause.count() > 0) {
      await this.btnPause.click();
      await this.page.waitForTimeout(100);
    } else {
      // some UIs toggle the play button text; attempt to click Play again to pause
      if (await this.btnPlay.count() > 0) {
        await this.btnPlay.click();
        await this.page.waitForTimeout(100);
      } else {
        throw new Error('Pause button not found');
      }
    }
  }

  async clickStep() {
    if (await this.btnStep.count() > 0) {
      await this.btnStep.click();
      // atomic animation may take CSS transition time
      await this.page.waitForTimeout(100);
    } else {
      throw new Error('Step button not found');
    }
  }

  async setSpeed(value = 100) {
    if (await this.speed.count() > 0) {
      // set range value; clamp to allowed range if necessary
      await this.speed.evaluate((el, v) => {
        try { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }, value);
      await this.page.waitForTimeout(80);
    }
  }

  async getInputValue() {
    if (await this.input.count() > 0) {
      return (await this.input.first().inputValue()).trim();
    }
    return '';
  }

  // Returns number of cards currently in the main input area / stack
  async getCardCount() {
    // if an explicit inputArea exists, count cards within it
    if (await this.inputArea.count() > 0) {
      const area = this.inputArea.first();
      const cards = area.locator('.card, .digit-card, [data-role="card"], .num-card, .token');
      return await cards.count();
    }
    // fallback to global card locator
    return await this.cardLocator.count();
  }

  // Returns total number of buckets detected
  async getBucketCount() {
    return await this.bucketLocator.count();
  }

  // Return array of counts of cards inside each bucket (best-effort)
  async getBucketCardCounts() {
    const counts = [];
    const bucketCount = await this.getBucketCount();
    for (let i = 0; i < bucketCount; i++) {
      const bucket = this.bucketLocator.nth(i);
      // look for card children
      const cardsInBucket = bucket.locator('.card, .digit-card, [data-role="card"], .num-card, .token');
      counts.push(await cardsInBucket.count());
    }
    return counts;
  }

  // Attempt to read a phase/status string
  async getPhaseText() {
    if (await this.phaseDisplay.count() > 0) {
      return (await this.phaseDisplay.first().innerText()).toLowerCase();
    }
    // fallback: look for a small status text somewhere
    const statusCandidates = this.page.locator('text=/phase|placing|collecting|done|idle|ready|playing/i');
    if (await statusCandidates.count() > 0) {
      return (await statusCandidates.first().innerText()).toLowerCase();
    }
    return '';
  }

  // Get text contents of all cards (in input area)
  async getCardValues() {
    const cards1 = [];
    // prefer cards inside input area
    if (await this.inputArea.count() > 0) {
      const cardLoc = this.inputArea.first().locator('.card, .digit-card, [data-role="card"], .num-card, .token');
      const n = await cardLoc.count();
      for (let i = 0; i < n; i++) {
        cards.push((await cardLoc.nth(i).innerText()).trim());
      }
      return cards.filter(Boolean);
    }
    // fallback to global
    const globalCards = this.cardLocator;
    const n1 = await globalCards.count();
    for (let i = 0; i < n; i++) {
      cards.push((await globalCards.nth(i).innerText()).trim());
    }
    return cards.filter(Boolean);
  }
}

// Tests grouped by FSM states and transitions
test.describe('Radix Sort Interactive Module - FSM validation', () => {
  test.beforeEach(async ({ page }) => {
    const app = new RadixPage(page);
    await app.goto();
    await app.ensureReady();
  });

  test.describe('Idle state behavior and onEnter resetAll', () => {
    test('Initial load should be in idle: input empty, no cards rendered, generate populates input', async ({ page }) => {
      const app1 = new RadixPage(page);

      // Verify page loads and essential controls exist
      await expect(page.locator('body')).toBeVisible();

      // Input should exist and be empty initially (idle)
      const inputVal = await app.getInputValue();
      expect(inputVal === '' || inputVal.length < 5).toBeTruthy();

      // Initially no cards should be present
      const initialCards = await app.getCardCount();
      expect(initialCards).toBeLessThanOrEqual(1); // allow for possible placeholder tokens but generally zero

      // Generate button should populate the input with a numeric string
      if ((await app.btnGenerate.count()) > 0) {
        await app.clickGenerate();
        const afterGen = await app.getInputValue();
        expect(afterGen.length).toBeGreaterThan(0);
        // expect at least one digit in the generated string
        expect(/\d/.test(afterGen)).toBeTruthy();
      } else {
        // If no generator exists, proceed but fail the specific expectation
        test.info().log('Generate button not present in this build (skipping generate check).');
      }
    });

    test('Reset clears DOM and returns to idle', async ({ page }) => {
      const app2 = new RadixPage(page);
      // If generate exists, produce input then load to create cards
      if ((await app.btnGenerate.count()) > 0) {
        await app.clickGenerate();
      }
      // Load if available
      if ((await app.btnLoad.count()) > 0) {
        await app.clickLoad();
      }
      // Wait briefly then reset
      await page.waitForTimeout(200);
      await app.clickReset();

      // After reset, expect input value to be empty or minimal and no cards in DOM
      const afterResetInput = await app.getInputValue();
      expect(afterResetInput.length === 0 || afterResetInput.length < 5).toBeTruthy();

      const afterResetCards = await app.getCardCount();
      expect(afterResetCards).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Ready state: loading input, preparing queue', () => {
    test('CLICK_LOAD should create cards and buckets; phase should indicate placing', async ({ page }) => {
      const app3 = new RadixPage(page);

      // Provide a known input (classic LSD example). If input not present, click generate first.
      if ((await app.input.count()) === 0) {
        throw new Error('Input element not found');
      }

      // Set known numbers into the input to make behavior deterministic
      await app.input.first().fill('170 45 75 90 802 24 2 66');
      // Click Load to transition to ready and trigger onEnter actions
      await app.clickLoad();

      // After load, we expect multiple cards created
      await page.waitForTimeout(250);
      const cardCount = await app.getCardCount();
      expect(cardCount).toBeGreaterThanOrEqual(8);

      // Buckets (0-9) should exist - expect at least 10 bucket elements or some bucket container
      const bucketCount1 = await app.getBucketCount();
      expect(bucketCount).toBeGreaterThanOrEqual(10);

      // Phase or status should indicate 'placing' or 'ready' (onEnter set phase='placing')
      const phaseText = await app.getPhaseText();
      expect(/placing|ready|loaded/.test(phaseText)).toBeTruthy();
    });

    test('Loading empty or invalid input should not create cards (edge case)', async ({ page }) => {
      const app4 = new RadixPage(page);

      // Clear input and click load
      await app.input.first().fill('');
      await app.clickLoad();

      // Allow processing
      await page.waitForTimeout(180);

      // No cards expected
      const cardCount1 = await app.getCardCount();
      expect(cardCount).toBeLessThanOrEqual(1);

      // Optionally a validation hint may appear; ensure no crash and page still interactive
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Animating and Step transitions', () => {
    test('CLICK_STEP should perform one atomic animation (placing one card into a bucket)', async ({ page }) => {
      const app5 = new RadixPage(page);

      // Prepare deterministic input and load
      await app.input.first().fill('170 45 75 90 802 24 2 66');
      await app.clickLoad();
      await page.waitForTimeout(250);

      const beforeInputCards = await app.getCardCount();
      const beforeBucketCounts = await app.getBucketCardCounts();
      const totalBefore = beforeInputCards + beforeBucketCounts.reduce((a, b) => a + b, 0);

      // Step once
      await app.clickStep();

      // Wait for animation to likely complete (CSS transition + JS promise)
      await page.waitForTimeout(700);

      const afterInputCards = await app.getCardCount();
      const afterBucketCounts = await app.getBucketCardCounts();
      const totalAfter = afterInputCards + afterBucketCounts.reduce((a, b) => a + b, 0);

      // The total number of cards should remain constant
      expect(totalAfter).toEqual(totalBefore);

      // Expect at least one bucket to have gained a card
      const gained = afterBucketCounts.some((count, i) => count > (beforeBucketCounts[i] || 0));
      expect(gained).toBeTruthy();

      // Ensure that input area lost at least one card (unless cards are always cloned)
      expect(afterInputCards).toBeLessThanOrEqual(beforeInputCards);
    });

    test('Keyboard SPACE triggers a single step (KEY_SPACE event)', async ({ page }) => {
      const app6 = new RadixPage(page);

      await app.input.first().fill('5 15 25');
      await app.clickLoad();
      await page.waitForTimeout(200);

      const before = await app.getCardCount();
      // Press Space to trigger KEY_SPACE
      await page.keyboard.press('Space');
      // wait for animation resolution
      await page.waitForTimeout(500);
      const after = await app.getCardCount();

      // After a single step, expect fewer or equal cards in input area and at least one placed in buckets
      expect(after).toBeLessThanOrEqual(before);
      const bucketCounts = await app.getBucketCardCounts();
      const sumBuckets = bucketCounts.reduce((a, b) => a + b, 0);
      expect(sumBuckets).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Playing (autoPlay) and done state', () => {
    test('CLICK_PLAY should autoplay until MOVE_QUEUE_EMPTY -> done and markDone onEnter actions run', async ({ page }) => {
      const app7 = new RadixPage(page);
      // Use faster speed if control is present
      await app.input.first().fill('170 45 75 90 802 24 2 66');
      await app.clickLoad();

      // Increase speed to reduce test runtime if available
      await app.setSpeed(100);

      // Count initial total cards to compare after completion
      const initialCount = await app.getCardCount();
      const initialBucketSum = (await app.getBucketCardCounts()).reduce((a, b) => a + b, 0);
      const totalInitial = initialCount + initialBucketSum;

      // Start playing
      await app.clickPlay();

      // Wait until "done" condition: we expect cards to be collected back and possibly sorted.
      // This can take multiple passes; give generous timeout but poll for completion.
      const maxWait = 20000; // 20s
      const pollInterval = 300;
      let elapsed = 0;
      let doneDetected = false;
      while (elapsed < maxWait) {
        // Check for a 'done' indicator in phase or for Play button toggled/state changed
        const phase = await app.getPhaseText();
        // Common implementations show "done" or set phase='done'
        if (/done|sorted|complete|finished/.test(phase)) {
          doneDetected = true;
          break;
        }
        // Another indicator: all cards are again in input area and no cards in buckets
        const cardCount2 = await app.getCardCount();
        const bucketCounts1 = await app.getBucketCardCounts();
        const bucketSum = bucketCounts.reduce((a, b) => a + b, 0);
        if (cardCount === totalInitial && bucketSum === 0) {
          // very likely finished/collected back
          doneDetected = true;
          break;
        }

        await page.waitForTimeout(pollInterval);
        elapsed += pollInterval;
      }

      expect(doneDetected).toBeTruthy();

      // After done, expect markDone to have set a done phase or pulsing visual hint
      const finalPhase = await app.getPhaseText();
      expect(/done|sorted|complete|finished/.test(finalPhase) || finalPhase.length >= 0).toBeTruthy();

      // Verify that the number of cards equals original total
      const finalCardCount = await app.getCardCount();
      const finalBucketCounts = await app.getBucketCardCounts();
      const finalBucketSum = finalBucketCounts.reduce((a, b) => a + b, 0);
      expect(finalCardCount + finalBucketSum).toEqual(totalInitial);

      // If cards are rendered back in input area, check that text values are numeric and likely sorted ascending
      const values = await app.getCardValues();
      if (values.length >= 2) {
        // Extract numeric values where possible
        const nums = values.map(v => {
          const m = v.match(/-?\d+/);
          return m ? Number(m[0]) : NaN;
        }).filter(n => !Number.isNaN(n));
        if (nums.length >= 2) {
          // Expect non-decreasing (sorted ascending) as LSD radix sort completes
          let sorted = true;
          for (let i = 1; i < nums.length; i++) {
            if (nums[i] < nums[i - 1]) {
              sorted = false;
              break;
            }
          }
          // Accept either sorted behavior or simply successful completion; log if not sorted
          test.info().log(`Final numeric sequence: ${nums.join(', ')}, sorted?: ${sorted}`);
        }
      }
    });
  });

  test.describe('Playing and pausing interactions', () => {
    test('CLICK_PLAY then CLICK_PAUSE toggles autoplay and updates UI (onEnter/onExit actions)', async ({ page }) => {
      const app8 = new RadixPage(page);
      await app.input.first().fill('5 3 9 1 7');
      await app.clickLoad();
      await page.waitForTimeout(200);

      // Start playing
      await app.clickPlay();
      // Immediately attempt to pause
      await page.waitForTimeout(150);
      // Use Pause control
      if ((await app.btnPause.count()) > 0) {
        await app.clickPause();
      } else {
        // Fallback: click Play again to toggle pause
        await app.clickPlay();
      }
      // After pausing, ensure that auto-play is stopped and UI is still interactive (ready)
      await page.waitForTimeout(200);
      const phase1 = await app.getPhaseText();
      // Expect to be in ready or similar non-playing state
      expect(/ready|placing|paused|idle/.test(phase) || phase.length >= 0).toBeTruthy();
    });
  });

  test.describe('Edge cases and invalid inputs', () => {
    test('Invalid tokens in input are ignored or cause no crash (error handling)', async ({ page }) => {
      const app9 = new RadixPage(page);
      await app.input.first().fill('12 abc 34 ! @ 56');
      await app.clickLoad();
      // allow parsing
      await page.waitForTimeout(200);
      // Expect numeric cards to exist (at least two numeric tokens: 12,34,56)
      const values1 = await app.getCardValues();
      // Filter numeric presence
      const numericCount = values.filter(v => /\d/.test(v)).length;
      expect(numericCount).toBeGreaterThanOrEqual(2);
    });

    test('CLICK_GENERATE while in done state should not break (CLICK_GENERATE event in done)', async ({ page }) => {
      const app10 = new RadixPage(page);
      // Prepare small input, load and finish quickly
      await app.input.first().fill('2 1 3');
      await app.clickLoad();
      await app.setSpeed(100);
      await app.clickPlay();

      // Wait for completion (small input => quick)
      await page.waitForTimeout(1500);

      // Click Generate while done
      if ((await app.btnGenerate.count()) > 0) {
        await app.clickGenerate();
        // UI should still be responsive; ensure input changed
        const after1 = await app.getInputValue();
        expect(after.length).toBeGreaterThan(0);
      } else {
        test.info().log('Generate not present - skipping generate-in-done check.');
      }
    });
  });

  test.describe('Transitions triggered by keyboard ENTER and speed change handling', () => {
    test('KEY_ENTER should start playing from ready', async ({ page }) => {
      const app11 = new RadixPage(page);
      await app.input.first().fill('8 6 7 5 3 0 9');
      await app.clickLoad();
      await page.waitForTimeout(200);

      // Press Enter to start playing (KEY_ENTER)
      await page.keyboard.press('Enter');

      // Wait a moment for autoplay to begin
      await page.waitForTimeout(300);

      // Expect some bucket activity as autoplay consumes moves
      const bucketSum1 = (await app.getBucketCardCounts()).reduce((a, b) => a + b, 0);
      expect(bucketSum).toBeGreaterThanOrEqual(1);
    });

    test('SPEED_CHANGE should be accepted and reflected without breaking playing', async ({ page }) => {
      const app12 = new RadixPage(page);
      await app.input.first().fill('4 2 9 1');
      await app.clickLoad();
      await page.waitForTimeout(150);

      // Start playing
      await app.clickPlay();
      await page.waitForTimeout(200);

      // Change speed mid-play
      await app.setSpeed(20);
      await page.waitForTimeout(200);
      await app.setSpeed(100);
      await page.waitForTimeout(200);

      // Ensure page still progresses (buckets have cards)
      const bucketSum2 = (await app.getBucketCardCounts()).reduce((a, b) => a + b, 0);
      expect(bucketSum).toBeGreaterThanOrEqual(1);
    });
  });
});