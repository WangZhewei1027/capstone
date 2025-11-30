import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a8c-cd35-11f0-9e7b-93b903303299.html';

// Page Object encapsulating common operations on the Radix Sort Visualizer page
class RadixPage {
  constructor(page) {
    this.page = page;
    // Controls
    this.size = page.locator('#size');
    this.sizeVal = page.locator('#sizeVal');
    this.maxVal = page.locator('#maxVal');
    this.maxValVal = page.locator('#maxValVal');
    this.base = page.locator('#base');
    this.speed = page.locator('#speed');
    this.speedVal = page.locator('#speedVal');
    this.generateBtn = page.locator('#generateBtn');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');

    // Views & status
    this.arrayView = page.locator('#arrayView');
    this.buckets = page.locator('#buckets');
    this.passIdx = page.locator('#passIdx');
    this.placeVal = page.locator('#placeVal');
    this.bucketCount = page.locator('#bucketCount');
    this.stepIdx = page.locator('#stepIdx');
  }

  // Set a range input value and dispatch input event so UI updates
  async setRange(selector, value) {
    await this.page.$eval(selector, (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  // Get the number of bars currently rendered in the array view
  async arrayCount() {
    return this.page.locator('#arrayView .bar').count();
  }

  // Get array labels (numbers shown on bars) in order
  async arrayLabels() {
    return this.page.$$eval('#arrayView .bar .label', nodes => nodes.map(n => n.textContent.trim()));
  }

  // Get bucket counts by index (how many .item in each bucket)
  async bucketItemsCounts() {
    return this.page.$$eval('#buckets .bucket', buckets => {
      return buckets.map(b => {
        const items = b.querySelectorAll('.items .item');
        return items ? items.length : 0;
      });
    });
  }

  // Get number of bucket elements rendered
  async bucketCountElements() {
    return this.page.locator('#buckets .bucket').count();
  }

  // Click helper with waitForNavigation not needed; actions are internal
  async clickGenerate() { await this.generateBtn.click(); }
  async clickStart() { await this.startBtn.click(); }
  async clickStep() { await this.stepBtn.click(); }
  async clickReset() { await this.resetBtn.click(); }

  // Set select value for base
  async setBase(value) {
    await this.base.selectOption(String(value));
    // change event triggers rebuild step in page script
  }

  // Set speed slider
  async setSpeed(ms) {
    await this.setRange('#speed', ms);
  }

  // Set size slider
  async setSize(n) {
    await this.setRange('#size', n);
  }

  // Utility: wait until a step index changes (simple polling)
  async waitForStepIndexToChange(previous, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const text = (await this.stepIdx.textContent()).trim();
      if (text !== previous) return text;
      await this.page.waitForTimeout(50);
    }
    throw new Error('Timeout waiting for step index to change');
  }
}

test.describe('Radix Sort Visualizer (LSD) - be878a8c-cd35-11f0-9e7b-93b903303299', () => {

  // Collect console errors and page errors for assertions
  test.beforeEach(async ({ page }) => {
    // attach listeners to capture console errors and page errors for later assertions
    page.context()._radix_consoleErrors = [];
    page.context()._radix_pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.context()._radix_consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      page.context()._radix_pageErrors.push(err.message);
    });

    // navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Assert there were no uncaught page errors or console errors during interactions
    const consoleErrors = page.context()._radix_consoleErrors || [];
    const pageErrors = page.context()._radix_pageErrors || [];

    // Provide debug info in assertion messages if any errors occurred
    expect(consoleErrors, `No console.error messages should be logged. Found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `No uncaught page errors should occur. Found: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test('Initial page load and default UI state are correct', async ({ page }) => {
    // Purpose: Verify the app loads and default controls/states are rendered as expected.
    const rad = new RadixPage(page);

    // Title / header sanity
    await expect(page.locator('h1')).toContainText('Radix Sort Visualizer');

    // Default slider and display values
    await expect(rad.sizeVal).toHaveText(await rad.size.evaluate(el => el.value));
    await expect(rad.maxValVal).toHaveText(await rad.maxVal.evaluate(el => el.value));
    await expect(rad.speedVal).toHaveText(await rad.speed.evaluate(el => el.value));

    // Default base is decimal (10) per HTML selected option
    await expect(rad.base).toHaveValue('10');

    // Array view should show bars equal to default size
    const defaultSize = Number(await rad.size.evaluate(el => el.value));
    const count = await rad.arrayCount();
    expect(count).toBe(defaultSize);

    // Buckets should be created equal to base
    const bucketElems = await rad.bucketCountElements();
    expect(bucketElems).toBe(10); // default base 10

    // Status placeholders
    await expect(rad.passIdx).toHaveText('-');
    await expect(rad.placeVal).toHaveText('-');
    await expect(rad.stepIdx).toHaveText(/0\s*\/\s*\d+/); // "0 / N"

    // No items should appear in buckets initially (they are cleared on init)
    const bucketCounts = await rad.bucketItemsCounts();
    for (const bc of bucketCounts) expect(bc).toBe(0);
  });

  test('Generate button produces a new array and resets steps', async ({ page }) => {
    // Purpose: Ensure Generate re-creates the array and status resets.
    const rad1 = new RadixPage(page);

    // Set a smaller size for deterministic checks
    await rad.setSize(8);
    const sizeText = await rad.sizeVal.textContent();
    expect(sizeText.trim()).toBe('8');

    // Capture array labels before regenerate to ensure change
    const beforeLabels = await rad.arrayLabels();

    // Click generate and verify array updated and status reset
    await rad.clickGenerate();

    // After generation, array length should reflect size slider
    const afterCount = await rad.arrayCount();
    expect(afterCount).toBe(8);

    const afterLabels = await rad.arrayLabels();
    // It's possible random generated equals previous by chance; at least ensure we're seeing numbers and labels length = size
    expect(afterLabels.length).toBe(8);

    // Step index should be reset to 0 / N
    await expect(rad.stepIdx).toHaveText(/0\s*\/\s*\d+/);

    // Buckets should be cleared and bucket count reflect base
    const bucketElems1 = await rad.bucketCountElements();
    expect(bucketElems).toBe(Number(await rad.base.evaluate(el => el.value)));
    const bucketCounts1 = await rad.bucketItemsCounts();
    for (const bc of bucketCounts) expect(bc).toBe(0);
  });

  test('Step button advances through place and collect steps and resets when finished', async ({ page }) => {
    // Purpose: Validate stepping through the precomputed steps updates array and buckets appropriately.
    const rad2 = new RadixPage(page);

    // Use a small size to keep interactions quick
    await rad.setSize(6);
    await rad.setBase('4'); // use base 4 to change number of buckets
    await rad.clickGenerate();

    // Save initial array to verify reset behavior later
    const initialLabels = await rad.arrayLabels();

    // Click step several times and inspect DOM changes
    // At least first step should be a 'place' step: highlight one moving bar and add 1 item to some bucket.
    const prevStepText = (await rad.stepIdx.textContent()).trim();
    await rad.clickStep();

    // After a place step: there should be at least one bucket item and a moving bar in the arrayView
    const bucketCountsAfter1 = await rad.bucketItemsCounts();
    const totalBucketItemsAfter1 = bucketCountsAfter1.reduce((a, b) => a + b, 0);
    expect(totalBucketItemsAfter1).toBeGreaterThanOrEqual(1);

    // The array should have a .bar element with class 'moving' for the placed item
    const movingCount = await page.locator('#arrayView .bar.moving').count();
    expect(movingCount).toBe(1);

    // Step again potentially into more 'place' steps or 'collect' steps
    await rad.clickStep();

    // After second step, stepIdx should have increased
    const newStepText = (await rad.stepIdx.textContent()).trim();
    expect(newStepText).not.toBe(prevStepText);

    // Continue stepping until 'done' is displayed or we reach a reasonable limit (guard against infinite loop)
    let attempts = 0;
    const maxAttempts = 200;
    while (attempts < maxAttempts) {
      const passText = (await rad.passIdx.textContent()).trim();
      if (passText === 'done') break;
      await rad.clickStep();
      attempts++;
    }
    // Assert we reached 'done' within the attempts
    const finalPassText = (await rad.passIdx.textContent()).trim();
    expect(finalPassText).toBe('done');

    // After finishing, clicking reset should restore the original labels from when we generated
    // (UI resetAll uses the saved initialArray)
    // But we saved initialLabels directly after generate, so clicking reset should bring the array back to that order
    await rad.clickReset();
    const resetLabels = await rad.arrayLabels();
    expect(resetLabels).toEqual(initialLabels);
  });

  test('Start button toggles play/pause and advances steps automatically', async ({ page }) => {
    // Purpose: Validate play/pause behavior: Start begins auto-advance and the button toggles to Pause.
    const rad3 = new RadixPage(page);

    // Use a small size and fast speed to see multiple progressions
    await rad.setSize(7);
    await rad.setSpeed(120); // ms
    await rad.clickGenerate();

    // Ensure start button begins playing
    await rad.clickStart();
    await expect(rad.startBtn).toHaveText('Pause');

    // Wait some time greater than one tick, then verify stepIdx increased compared to initial
    const initialStep = (await rad.stepIdx.textContent()).trim();
    // wait 300ms to allow 2-3 steps at 120ms speed
    await page.waitForTimeout(350);
    const afterStep = (await rad.stepIdx.textContent()).trim();
    expect(afterStep).not.toBe(initialStep);

    // Now pause
    await rad.clickStart();
    await expect(rad.startBtn).toHaveText('Start');

    // Remember step index and wait; it should remain the same since paused
    const pausedStep = (await rad.stepIdx.textContent()).trim();
    await page.waitForTimeout(300);
    const pausedStep2 = (await rad.stepIdx.textContent()).trim();
    expect(pausedStep2).toBe(pausedStep);
  });

  test('Changing base select rebuilds buckets and resets steps', async ({ page }) => {
    // Purpose: When user changes the base (radix), the UI rebuilds buckets and steps for current array.
    const rad4 = new RadixPage(page);

    // Ensure some initial state
    await rad.setSize(10);
    await rad.clickGenerate();

    // Change base to 2 (binary) and verify bucket count changes to 2
    await rad.setBase('2');

    // bucketCountElements should equal 2
    const bucketElemsAfter = await rad.bucketCountElements();
    expect(bucketElemsAfter).toBe(2);

    // Step index should be reset to 0 / N (verify 0 at left)
    await expect(rad.stepIdx).toHaveText(/0\s*\/\s*\d+/);

    // Change base to 16 and verify 16 buckets
    await rad.setBase('16');
    const bucketElemsAfter16 = await rad.bucketCountElements();
    expect(bucketElemsAfter16).toBe(16);
  });

  test('Keyboard shortcuts: Space toggles play/pause and ArrowRight performs a step', async ({ page }) => {
    // Purpose: Test keyboard accessibility shortcuts wired to the window.
    const rad5 = new RadixPage(page);

    await rad.setSize(6);
    await rad.setSpeed(200);
    await rad.clickGenerate();

    // Press ArrowRight to step once
    const beforeStep = (await rad.stepIdx.textContent()).trim();
    await page.keyboard.press('ArrowRight');
    const afterStep1 = (await rad.stepIdx.textContent()).trim();
    expect(afterStep).not.toBe(beforeStep);

    // Press Space to start playing
    await page.keyboard.press('Space');
    await expect(rad.startBtn).toHaveText('Pause');

    // Wait a bit to ensure it advanced
    const startedStep = (await rad.stepIdx.textContent()).trim();
    await page.waitForTimeout(250);
    const progressedStep = (await rad.stepIdx.textContent()).trim();
    expect(progressedStep).not.toBe(startedStep);

    // Press Space again to pause
    await page.keyboard.press('Space');
    await expect(rad.startBtn).toHaveText('Start');
  });

  test('Edge case: set size to maximum and verify UI scales (bars get small class)', async ({ page }) => {
    // Purpose: Use a large array size to validate responsive behavior (bars get .small) and no crashes.
    const rad6 = new RadixPage(page);

    // Set max size value per input attribute (max is 60 in HTML)
    await rad.setSize(60);
    await rad.clickGenerate();

    // Bars should be 60 and should have 'small' class applied
    const count1 = await rad.arrayCount();
    expect(count).toBe(60);

    // At least one bar should have the 'small' class (since size > 36 in script)
    const smallBars = await page.locator('#arrayView .bar.small').count();
    expect(smallBars).toBeGreaterThan(0);

    // And UI should still have bucket elements for base
    const bucketElems2 = await rad.bucketCountElements();
    expect(bucketElems).toBe(Number(await rad.base.evaluate(el => el.value)));
  });

});