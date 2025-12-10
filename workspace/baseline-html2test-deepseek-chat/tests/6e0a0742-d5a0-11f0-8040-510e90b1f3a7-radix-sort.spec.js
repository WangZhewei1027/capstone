import { test, expect } from '@playwright/test';

// Test file for Radix Sort Visualization
// File: 6e0a0742-d5a0-11f0-8040-510e90b1f3a7-radix-sort.spec.js
// Page URL is specified by the prompt
const PAGE_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0742-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object Model for the Radix Sort page
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs & Controls
    this.arrayInput = page.locator('#arrayInput');
    this.algorithmType = page.locator('#algorithmType');
    this.speedControl = page.locator('#speed');
    this.startBtn = page.locator('#startBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.stepBtn = page.locator('#stepBtn');
    // Displays
    this.originalArray = page.locator('#originalArray');
    this.currentArray = page.locator('#currentArray');
    this.bucketsContainer = page.locator('#bucketsContainer');
    this.stepInfo = page.locator('#stepInfo');
  }

  // Helper: read numeric values from a container (.digit children)
  async getNumbersFrom(containerLocator) {
    const elems = containerLocator.locator('.digit');
    const count = await elems.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = (await elems.nth(i).textContent()) || '';
      // parseInt may produce NaN if content unexpected; keep as string fallback
      const num = parseInt(text.trim());
      values.push(Number.isNaN(num) ? text.trim() : num);
    }
    return values;
  }

  // Click start and wait a tiny moment to allow the UI to update
  async clickStart() {
    await this.startBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async setAlgorithm(type) {
    await this.algorithmType.selectOption(type);
  }

  async setSpeed(value) {
    // value should be string or number acceptable by <input type=range>
    await this.speedControl.fill(String(value));
    // trigger input event by using evaluate to set value and dispatch input (some browsers require)
    await this.page.evaluate((v) => {
      const el = document.getElementById('speed');
      if (el) {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, value);
  }

  async setArrayInput(value) {
    await this.arrayInput.fill(value);
    // trigger load/initialize only happens on window load or Reset - so to update displayed arrays we click Reset
    // But we do NOT alter app code; use Reset button to reinitialize
    await this.resetBtn.click();
  }

  // Wait until stepInfo contains a substring
  async waitForStepInfoContains(text, options = {}) {
    await expect(this.stepInfo).toHaveText(new RegExp(text), { timeout: options.timeout ?? 5000 });
  }
}

test.describe('Radix Sort Visualization - E2E', () => {
  // Arrays to collect console messages and page errors per test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture all console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions and page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the page and wait for load event where initialize() runs
    await page.goto(PAGE_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Provide debug info in case of failures; tests will assert on these arrays as needed.
    // No modifications of runtime or page; just leave listeners to be garbage collected.
  });

  test('Initial load: default array, controls present, and no runtime errors on load', async ({ page }) => {
    // Purpose: Verify the page initializes correctly, the default array is displayed,
    // controls are available and there are no console errors or runtime page errors during load.
    const radix = new RadixSortPage(page);

    // Verify original array displays expected default values
    const originalValues = await radix.getNumbersFrom(radix.originalArray);
    // The input default in the HTML is: "170, 45, 75, 90, 802, 24, 2, 66"
    expect(originalValues).toEqual([170, 45, 75, 90, 802, 24, 2, 66]);

    // The current array should reflect the same initially
    const currentValues = await radix.getNumbersFrom(radix.currentArray);
    expect(currentValues).toEqual(originalValues);

    // Verify controls exist and are enabled/disabled as expected after initialize()
    // startBtn should be enabled (not disabled)
    await expect(radix.startBtn).toBeEnabled();

    // stepBtn was disabled in markup but initialize() sets it based on isSorting (false) -> enabled
    await expect(radix.stepBtn).toBeEnabled();

    // resetBtn should be enabled
    await expect(radix.resetBtn).toBeEnabled();

    // Verify stepInfo contains initial message about original array
    await expect(radix.stepInfo).toHaveText(new RegExp(`Original array: \\[${originalValues.join(', ')}\\]`));

    // Assert there were no console error messages and no page errors during load
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages expected on load').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected on load').toHaveLength(0);
  });

  test('Start Sorting: starting animation disables controls and completes to a sorted array', async ({ page }) => {
    // Purpose: Validate that clicking "Start Sorting" begins the animation, disables controls,
    // and eventually produces a sorted array with visual completion classes.
    const radix = new RadixSortPage(page);

    // Speed up the animation to finish quickly (set to 10 -> shortest delay)
    await radix.setSpeed('10');

    // Click Start
    await radix.clickStart();

    // Immediately after starting, start and step buttons should become disabled
    await expect(radix.startBtn).toBeDisabled();
    await expect(radix.stepBtn).toBeDisabled();

    // Wait until the UI displays the "Sorting completed!" text in stepInfo.
    // The default numbers sort to: [2, 24, 45, 66, 75, 90, 170, 802]
    await expect(radix.stepInfo).toHaveText(/Sorting completed! Final sorted array:/, { timeout: 10000 });

    // After completion, the currentArray items should have the 'completed' class
    const completedDigits = radix.currentArray.locator('.digit.completed');
    await expect(completedDigits).toHaveCount(8);

    // Verify order is sorted numerically ascending
    const finalValues = await radix.getNumbersFrom(radix.currentArray);
    expect(finalValues).toEqual([2, 24, 45, 66, 75, 90, 170, 802]);

    // After sorting completes, start button should be enabled again (isSorting becomes false)
    await expect(radix.startBtn).toBeEnabled();

    // Ensure there were no console error messages or uncaught page errors during sorting
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages expected during sorting').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected during sorting').toHaveLength(0);
  });

  test('Step-by-step mode: using Next Step advances the algorithm and populates buckets', async ({ page }) => {
    // Purpose: Test that the "Next Step" (Step) button can be used to manually step through
    // the algorithm when not animating, and that buckets and stepInfo update accordingly.
    const radix = new RadixSortPage(page);

    // Ensure we are in LSD mode for predictable digit positions
    await radix.setAlgorithm('lsd');

    // Reset to ensure reinitialization (initialize called on load, but ensure a clean state)
    await radix.clickReset();

    // Step 0 -> Clicking step should perform the initial step behavior and increment currentStep
    await radix.clickStep();

    // Expect stepInfo to reflect that sorting has started (Step 1 or Starting message)
    await expect(radix.stepInfo).toHaveText(/Step 1\/\d+:|Starting LSD Radix Sort|Sorting by digit/, { timeout: 2000 });

    // After one step there should be buckets with some items (bucketsContainer should contain bucket items)
    // Bucket items are inside elements with id bucket-0 .. bucket-9 -> have .digit children
    // Wait a moment for buckets to be created
    await expect(radix.bucketsContainer.locator('.bucket')).toHaveCount(10);

    // There should be at least one bucket with items (after first distribution)
    let totalBucketItems = 0;
    for (let d = 0; d < 10; d++) {
      const bucketItems = radix.bucketsContainer.locator(`#bucket-${d} .digit`);
      const count = await bucketItems.count();
      totalBucketItems += count;
    }
    expect(totalBucketItems).toBeGreaterThan(0);

    // Click step repeatedly until sorting completes
    // We allow a reasonable timeout for completion when stepping manually
    const maxManualSteps = 10;
    let completed = false;
    for (let i = 0; i < maxManualSteps; i++) {
      // Check if sorting already completed
      const text = await radix.stepInfo.textContent();
      if (text && text.includes('Sorting completed')) {
        completed = true;
        break;
      }
      // Click next step and give a small pause for UI updates
      await radix.clickStep();
      await page.waitForTimeout(150);
    }

    // After stepping, we expect sorting to eventually complete
    const finalText = await radix.stepInfo.textContent();
    expect(finalText).toMatch(/Sorting completed! Final sorted array:/);

    // Assert no console errors or page errors during manual stepping
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages expected during manual stepping').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected during manual stepping').toHaveLength(0);
  });

  test('Reset restores original state and clears completion highlights', async ({ page }) => {
    // Purpose: After a full sort, clicking Reset should restore the original array and remove completed styling.
    const radix = new RadixSortPage(page);

    // Speed up and start sorting to completion
    await radix.setSpeed('10');
    await radix.clickStart();

    // Wait for completion
    await expect(radix.stepInfo).toHaveText(/Sorting completed! Final sorted array:/, { timeout: 10000 });

    // Ensure completed classes are present before reset
    await expect(radix.currentArray.locator('.digit.completed')).toHaveCount(8);

    // Click reset to reinitialize UI and state
    await radix.clickReset();

    // After reset, completed classes should be cleared
    await expect(radix.currentArray.locator('.digit.completed')).toHaveCount(0);

    // Original array should be displayed again
    const originalValuesAfterReset = await radix.getNumbersFrom(radix.originalArray);
    expect(originalValuesAfterReset).toEqual([170, 45, 75, 90, 802, 24, 2, 66]);

    // The stepInfo should reflect the original array
    await expect(radix.stepInfo).toHaveText(new RegExp(`Original array: \\[${originalValuesAfterReset.join(', ')}\\]`));

    // Assert no page errors or console.errors triggered by reset
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages expected after reset').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected after reset').toHaveLength(0);
  });

  test('Algorithm type change (MSD) affects digit selection and visualization', async ({ page }) => {
    // Purpose: Change algorithm type to MSD and verify that digits are highlighted differently
    // and that stepInfo mentions MSD when stepping.
    const radix = new RadixSortPage(page);

    // Switch to MSD
    await radix.setAlgorithm('msd');

    // Reset to apply algorithm change to state
    await radix.clickReset();

    // Click a step to start MSD processing
    await radix.clickStep();

    // stepInfo should reference MSD or left-to-right
    await expect(radix.stepInfo).toHaveText(/MSD|left-to-right \(MSD\)/i);

    // At least one of the displayed digits should have an inline background-color applied due to highlighting
    const digitElems = radix.currentArray.locator('.digit');
    const count = await digitElems.count();
    expect(count).toBeGreaterThan(0);

    // Check that at least one element has a background-color style set (highlighting for the current digit)
    let foundHighlightStyle = false;
    for (let i = 0; i < count; i++) {
      const style = await digitElems.nth(i).evaluate((el) => el.style.backgroundColor || '');
      if (style && style !== '') {
        foundHighlightStyle = true;
        break;
      }
    }
    expect(foundHighlightStyle).toBeTruthy();

    // Assert no console errors or page errors on algorithm switch & step
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages expected when switching algorithm').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected when switching algorithm').toHaveLength(0);
  });

  test('Speed control mapping: high speed results in faster completion (practical check)', async ({ page }) => {
    // Purpose: Verify that increasing speed results in a faster completion in practice.
    // This is a pragmatic test: set to maximum speed and assert completion within a reasonable time.
    const radix = new RadixSortPage(page);

    // Set to highest speed (10 -> shortest delay)
    await radix.setSpeed('10');

    // Start sorting
    const start = Date.now();
    await radix.clickStart();

    // Wait for completion with a timeout that should be comfortably larger than expected time at max speed
    await expect(radix.stepInfo).toHaveText(/Sorting completed! Final sorted array:/, { timeout: 8000 });
    const durationMs = Date.now() - start;

    // Since maxDigits for the default array is 3, and animationSpeed at value 10 yields ~100ms per step,
    // we expect completion well under 8 seconds. We assert it's under 5 seconds as a practical threshold.
    expect(durationMs).toBeLessThan(5000);

    // Assert no console errors or page errors during this fast run
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, 'No console.error messages expected during fast run').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors expected during fast run').toHaveLength(0);
  });
});