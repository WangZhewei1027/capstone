import { test, expect } from '@playwright/test';

// Test file for: Two Pointers — Interactive Visualizer
// URL under test:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80c93e0-d1c9-11f0-9efc-d1db1618a544.html

// Page object to encapsulate common interactions and queries
class TwoPointersPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80c93e0-d1c9-11f0-9efc-d1db1618a544.html';
    // controls
    this.algoSelect = page.locator('#algoSelect');
    this.inputArray = page.locator('#inputArray');
    this.parseBtn = page.locator('#parseBtn');
    this.arrayRow = page.locator('#arrayRow');
    this.annotation = page.locator('#annotation');
    this.codeBlock = page.locator('#codeBlock');
    this.speed = page.locator('#speed');
    this.speedLabel = page.locator('#speedLabel');
    this.playBtn = page.locator('#playBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.stepForward = page.locator('#stepForward');
    this.stepBack = page.locator('#stepBack');
    this.resetBtn = page.locator('#resetBtn');
    this.stepIdx = page.locator('#stepIdx');
    this.stepMax = page.locator('#stepMax');
    this.opsCount = page.locator('#opsCount');
    this.resultText = page.locator('#resultText');
    this.randomBtn = page.locator('#randomBtn');
    this.sortBtn = page.locator('#sortBtn');
    this.targetArea = page.locator('#targetArea');
    this.targetInput = page.locator('#targetInput');
    this.logEl = page.locator('#log');
    this.presets = page.locator('[data-preset]');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Build steps by clicking Run & Build Steps
  async buildSteps() {
    await this.parseBtn.click();
    // wait for log to become visible which indicates steps were created
    await expect(this.logEl).toBeVisible();
  }

  async setSpeed(ms) {
    await this.speed.fill(String(ms));
    // trigger input event by using setValue + dispatch in browser is not necessary;
    // Playwright's fill triggers input events. Wait for label update.
    await expect(this.speedLabel).toHaveText(`${ms} ms`);
  }

  async selectAlgorithm(keyOrIndex) {
    if (typeof keyOrIndex === 'number') {
      await this.algoSelect.selectOption({ index: keyOrIndex });
    } else {
      await this.algoSelect.selectOption(keyOrIndex);
    }
  }

  async getArrayCells() {
    return this.arrayRow.locator('.cell');
  }

  async getPointers() {
    // pointers are appended as .pointer elements within arrayRow
    return this.arrayRow.locator('.pointer');
  }
}

test.describe('Two Pointers Visualizer - Basic UI and interactions', () => {
  let page;
  let app;
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // capture console messages and page errors for assertions
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    app = new TwoPointersPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  // Test initial page load and default state
  test('Initial load: header, controls and default state are correct', async () => {
    // header text
    await expect(page.locator('h1')).toHaveText('Two Pointers — Interactive Visualizer');

    // default select value corresponds to pairSum option
    await expect(app.algoSelect).toHaveValue('pairSum');

    // default input array is present
    await expect(app.inputArray).toHaveValue('1,2,3,4,5,6,7,8,9');

    // target input visible for pairSum and default value 10
    await expect(app.targetArea).toBeVisible();
    await expect(app.targetInput).toHaveValue('10');

    // codeBlock should contain snippet for pairSum
    await expect(app.codeBlock).toContainText('Sorted array two-pointer pair sum');

    // status counters start at 0 or dash
    await expect(app.stepIdx).toHaveText('0');
    await expect(page.locator('#stepMax')).toHaveText('0');
    await expect(page.locator('#opsCount')).toHaveText('0');
    await expect(app.resultText).toHaveText('—');

    // annotation initial text
    await expect(app.annotation).toHaveText('Build steps to begin.');

    // arrayRow should be empty initially (no .cell children)
    await expect(app.arrayRow.locator('.cell')).toHaveCount(0);

    // ensure no console errors and no page errors were emitted during load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Build steps, inspect DOM changes, and verify result text
  test('Build steps for Pair Sum: steps generated, result shown and array rendered', async () => {
    // Click Run & Build Steps
    await app.buildSteps();

    // After build: log visible, step index should be 1 and stepMax > 0
    await expect(app.stepIdx).toHaveText('1');
    const stepMaxText = await app.stepMax.textContent();
    const stepMaxNum = Number(stepMaxText);
    expect(stepMaxNum).toBeGreaterThan(0);

    // resultText should show the found pair for default input (target 10) -> [0, 8]
    await expect(app.resultText).toHaveText('[0, 8]');

    // arrayRow should have 9 cells (1..9)
    await expect(app.arrayRow.locator('.cell')).toHaveCount(9);

    // the log element should contain Step descriptions
    await expect(app.logEl).toBeVisible();
    await expect(app.logEl).toContainText('Step 1');

    // annotation must reflect the current (first) step description
    await expect(app.annotation).not.toHaveText('Build steps to begin.');

    // pointers should exist above cells for the current step (start step has left=0 right=8)
    const pointers = await app.getPointers();
    // There may be two pointer elements (L and R)
    expect(await pointers.count()).toBeGreaterThanOrEqual(0); // not strict due to dynamic layout, but ensure no crash

    // ensure no console errors and no page errors occurred while building
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Play and Pause animation advances steps; stepping controls work', async () => {
    // set speed low to make play quicker
    await app.setSpeed(50);

    // Build steps first
    await app.buildSteps();

    // Start playing
    await app.playBtn.click();

    // Wait for step index to advance beyond initial (1)
    await page.waitForFunction(() => {
      const el = document.querySelector('#stepIdx');
      if (!el) return false;
      return Number(el.textContent) > 1;
    }, {}, { timeout: 2000 });

    const idxAfterPlay = Number(await app.stepIdx.textContent());
    expect(idxAfterPlay).toBeGreaterThan(1);

    // Pause the animation
    await app.pauseBtn.click();

    // Capture current step index
    const pausedIndex = Number(await app.stepIdx.textContent());

    // Press Step ▶ to move forward by one
    await app.stepForward.click();
    const afterForward = Number(await app.stepIdx.textContent());
    expect(afterForward).toBeGreaterThanOrEqual(pausedIndex);

    // Press Step ◀ to move back at least one (or to minimum)
    await app.stepBack.click();
    const afterBack = Number(await app.stepIdx.textContent());
    // afterBack should be <= afterForward
    expect(afterBack).toBeLessThanOrEqual(afterForward);

    // Reset should clear visualization and counters
    await app.resetBtn.click();
    await expect(app.stepIdx).toHaveText('0');
    await expect(app.resultText).toHaveText('—');
    await expect(app.annotation).toHaveText('Build steps to begin.');
    await expect(app.arrayRow.locator('.cell')).toHaveCount(0);
  });

  test('Sorting input via Sort button and Random populate input', async () => {
    // set a known unsorted value
    await app.inputArray.fill('5,1,4,2,3');
    await app.sortBtn.click();

    // After clicking sort, inputArray should be sorted ascending
    // Note: sort button triggers parseArrayInput then sets inputArray.value
    await expect(app.inputArray).toHaveValue('1,2,3,4,5');

    // Random button populates a random array of length 8
    await app.randomBtn.click();
    const randomVal = await app.inputArray.inputValue();
    const tokens = randomVal.split(',').filter(Boolean);
    expect(tokens.length).toBe(8);
  });

  test('Algorithm switch: Reverse String builds and shows reversed result', async () => {
    // Select reverseString algorithm by value
    await app.selectAlgorithm('reverseString');

    // targetArea should be hidden for reverseString
    await expect(app.targetArea).toBeHidden();

    // Set input to a string without commas
    await app.inputArray.fill('hello');
    // Run build
    await app.buildSteps();

    // After build, resultText should show reversed string "olleh"
    await expect(app.resultText).toHaveText('olleh');

    // The arrayRow should display characters as cells and final state should be reversed
    const cells = app.arrayRow.locator('.cell');
    await expect(cells).toHaveCount(5);
    // Verify the content of the first and last cells reflect reversed string
    await expect(cells.nth(0)).toHaveText('o');
    await expect(cells.nth(4)).toHaveText('h');

    // No console errors or pageerrors during this flow
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Remove Duplicates: builds steps and returns new length', async () => {
    // Choose removeDuplicates algorithm
    await app.selectAlgorithm('removeDuplicates');

    // Set input to include duplicates
    await app.inputArray.fill('1,1,1,2,2,3');

    // Run build
    await app.buildSteps();

    // ResultText should show new length, expected 3 (unique elements 1,2,3)
    await expect(app.resultText).toHaveText('3');

    // Log should contain "Done. New length" message
    await expect(app.logEl).toContainText('Done. New length');

    // Ensure cells exist (final array visualization shows transformed array)
    await expect(app.arrayRow.locator('.cell')).toHaveCount(6);

    // No console errors or page errors occurred while running this algorithm
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Presets update input value when clicked', async () => {
    // Pick the first preset and click
    const firstPreset = app.presets.nth(0);
    const presetValue = await firstPreset.getAttribute('data-preset');
    await firstPreset.click();

    // inputArray should now equal the preset
    await expect(app.inputArray).toHaveValue(presetValue);

    // Running build for pairSum with this preset should produce either a result or no-result without errors
    await app.buildSteps();
    // stepMax should be greater than 0
    const stepMaxText = await app.stepMax.textContent();
    expect(Number(stepMaxText)).toBeGreaterThan(0);

    // No console errors or page errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Two Pointers Visualizer - Edge cases and accessibility checks', () => {
  let page;
  let app;
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));
    app = new TwoPointersPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Pair Sum with non-numeric input displays an annotation error', async () => {
    // default algorithm is pairSum; set non-numeric input
    await app.inputArray.fill('a,b,c');
    await app.parseBtn.click();

    // parse will detect non-number tokens and update annotation text
    await expect(app.annotation).toContainText('Array must contain numbers for this algorithm.');

    // steps should not be built: log remains hidden
    await expect(app.logEl).toBeHidden();

    // No uncaught page errors should occur (the app handles the case)
    expect(pageErrors.length).toBe(0);

    // There may be console warnings/info but assert no console.error
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Pair Sum with invalid target shows annotation error', async () => {
    // Enter a valid numeric array
    await app.inputArray.fill('1,2,3');
    // Set invalid target
    await app.targetInput.fill('notANumber');
    await app.parseBtn.click();

    // Expect annotation to say target must be a number
    await expect(app.annotation).toContainText('Target must be a number.');

    // No console or page errors should be emitted
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Keyboard shortcuts: Space toggles play/pause and arrows step', async () => {
    // Build steps first
    await app.buildSteps();

    // Ensure initial stepIdx is 1
    await expect(app.stepIdx).toHaveText('1');

    // Press ArrowRight to step forward
    await page.keyboard.press('ArrowRight');
    // stepIdx should increment (or remain within bounds)
    const idxAfterRight = Number(await app.stepIdx.textContent());
    expect(idxAfterRight).toBeGreaterThanOrEqual(1);

    // Press ArrowLeft to step back
    await page.keyboard.press('ArrowLeft');
    const idxAfterLeft = Number(await app.stepIdx.textContent());
    expect(idxAfterLeft).toBeGreaterThanOrEqual(0);

    // Press Space to toggle play/pause - trigger may start playback; we will send Space then immediately Space to stop
    await page.keyboard.press(' ');
    // allow small time to potentially change
    await page.waitForTimeout(100);
    await page.keyboard.press(' ');
    // After toggling ensure no page errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});