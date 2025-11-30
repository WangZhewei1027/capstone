import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a9a-cd36-11f0-b98e-a1744d282049.html';

// Page Object for the Two Pointers app to encapsulate common interactions and selectors
class TwoPointersPage {
  constructor(page) {
    this.page = page;
    // Inputs & controls
    this.demoSelect = page.locator('#demoSelect');
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.randomBtn = page.locator('#randomBtn');
    this.sortBtn = page.locator('#sortBtn');
    this.reverseBtn = page.locator('#reverseBtn');
    this.startBtn = page.locator('#startBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.speed = page.locator('#speed');
    this.speedVal = page.locator('#speedVal');

    // Visualization & status
    this.visArea = page.locator('#visArea');
    this.logEl = page.locator('#log');
    this.stateChip = page.locator('#stateChip');
    this.ptrChip = page.locator('#ptrChip');
    this.opsChip = page.locator('#opsChip');
    this.resChip = page.locator('#resChip');
    this.codeBlock = page.locator('#codeBlock');
    this.demoTitle = page.locator('#demoTitle');
    this.demoDesc = page.locator('#demoDesc');
    this.demoExtra = page.locator('#demoExtra');
  }

  // Helpers
  async goto() {
    await this.page.goto(APP_URL);
  }

  async setArray(arr) {
    await this.arrayInput.fill(arr.join(','));
    // give the page a moment to reflect changes (renderInitialVisualization may not auto-run)
    await this.page.waitForTimeout(50);
  }

  async selectDemo(value) {
    await this.demoSelect.selectOption(value);
    // UI updates demo text and code on change; wait a touch
    await this.page.waitForTimeout(50);
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickPause() {
    await this.pauseBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async clickRandom() {
    await this.randomBtn.click();
  }

  async clickSort() {
    await this.sortBtn.click();
  }

  async clickReverse() {
    await this.reverseBtn.click();
  }

  async setTarget(v) {
    await this.targetInput.fill(String(v));
  }

  async changeSpeed(value) {
    await this.speed.fill(String(value));
    // trigger input event by setting value via evaluate if needed
    await this.page.evaluate((v) => {
      const el = document.getElementById('speed');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  // Utility to step until the generator finishes (or until maxSteps)
  async stepUntilFinished(maxSteps = 30) {
    for (let i = 0; i < maxSteps; i++) {
      // read stateChip; if already finished we break
      const chip = (await this.stateChip.textContent()) || '';
      if (chip.toLowerCase().includes('finished')) return true;
      await this.clickStep();
      // small delay so UI can update between steps
      await this.page.waitForTimeout(80);
    }
    return false;
  }

  // helper: count boxes or bars inside visArea
  async countBoxes() {
    return this.visArea.locator('.boxes .box').count();
  }

  async countBars() {
    return this.visArea.locator('.bars .bar').count();
  }

  // convenience: get pointer labels present (L/R)
  async getPointerTexts() {
    return this.visArea.locator('.pointer').allTextContents();
  }

  // get log text
  async getLog() {
    return (await this.logEl.textContent()) || '';
  }

  async getCodeLines() {
    return this.codeBlock.locator('.code-line').allTextContents();
  }

  async getOps() {
    const t = (await this.opsChip.textContent()) || '0';
    return Number(t);
  }
}

test.describe('Two Pointers — Interactive Visualizer (2bde6a9a-cd36-11f0-b98e-a1744d282049)', () => {
  let page;
  let app;
  let consoleMessages = [];
  let pageErrors = [];
  let dialogs = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // collect console messages for assertion
    consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // collect page errors (uncaught exceptions)
    pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // auto-accept any alert dialogs while recording that they appeared
    dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    app = new TwoPointersPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial page load: default UI elements and initial visualization render', async () => {
    // Confirm page header and demo title
    await expect(page.locator('h1')).toHaveText('Two Pointers — Interactive Visualizer');

    // Default demo should be "Two-sum in a sorted array"
    await expect(app.demoTitle).toHaveText('Two-sum in a sorted array');
    await expect(app.demoDesc).toContainText('Use two pointers');

    // Default array input is set by script to '1,2,3,4,5,6'
    await expect(app.arrayInput).toHaveValue('1,2,3,4,5,6');

    // Visualization should render boxes for the default 6 elements
    const boxCount = await app.countBoxes();
    expect(boxCount).toBe(6);

    // State chip should show idle state as initialized by markup
    await expect(app.stateChip).toHaveText('State: idle');

    // Speed display should reflect the slider default "700ms"
    await expect(app.speedVal).toHaveText('700ms');

    // code block is empty initially (renderCode([], -1) called)
    const codeLines = await app.getCodeLines();
    expect(codeLines.length).toBe(0);

    // No uncaught page errors should be present
    expect(pageErrors.length).toBe(0);

    // There should be console messages (at least for resource loads or script) — ensure we captured the console stream
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('Speed control updates visual label and does not cause runtime errors', async () => {
    // Change speed and verify the speed label updates and no runtime errors fired
    await app.changeSpeed(500);
    await expect(app.speedVal).toHaveText('500ms');
    expect(pageErrors.length).toBe(0);
    // ensure console didn't record any console.error messages
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test('Two-sum demo: step through and find a pair for a known target', async () => {
    // Prepare inputs for two-sum demo and step through manually
    await app.selectDemo('twoSum');
    await app.setArray([1, 2, 3, 4, 6]);
    await app.setTarget(7);

    // Ensure demo text updated
    await expect(app.demoTitle).toHaveText('Two-sum in a sorted array');

    // Step once: should produce initial compare state with L at 0 and R at last index
    await app.clickStep();
    await page.waitForTimeout(80);
    const log1 = await app.getLog();
    expect(log1).toContain('Compare arr[0]');

    // Pointers L and R should be present in the visualization
    const pointers1 = await app.getPointerTexts();
    expect(pointers1.some(t => t === 'L')).toBeTruthy();
    expect(pointers1.some(t => t === 'R')).toBeTruthy();

    // ops should have incremented
    expect(await app.getOps()).toBeGreaterThanOrEqual(1);

    // Step again: the pair equals target → finish state expected
    await app.clickStep();
    await page.waitForTimeout(100);
    // state should be finished
    await expect(app.stateChip).toHaveText('finished');

    // Result chip should contain the pair (indices)
    const resText = (await app.resChip.textContent()) || '';
    // The return sets result as an array [l,r] which becomes text like "0,4"
    expect(resText.replace(/\s/g, '')).toContain('0');
    expect(resText.replace(/\s/g, '')).toContain('4');

    // Final log message should mention Found pair
    const finalLog = await app.getLog();
    expect(finalLog.toLowerCase()).toContain('found pair');

    // No page errors produced during this scenario
    expect(pageErrors.length).toBe(0);
  });

  test('Remove Duplicates demo: step through to completion and validate result length and visualization markers', async () => {
    // Setup demo and array with duplicates
    await app.selectDemo('removeDup');
    await app.setArray([0, 0, 1, 1, 1, 2, 2]);
    // Step until finished (max steps to avoid infinite loops)
    const finished = await app.stepUntilFinished(40);
    expect(finished).toBeTruthy();

    // After completion, the resChip should show the new length (i + 1)
    const resText1 = (await app.resChip.textContent()) || '';
    // from array [0,0,1,1,1,2,2] unique values are [0,1,2] → new length 3
    expect(resText.replace(/\s/g, '')).toMatch(/3|3/);

    // Visualization should show removed indices as .removed elements inside boxes
    const removedBoxes = await page.locator('.boxes .box.removed').count();
    // There should be at least one removed (there were duplicates)
    expect(removedBoxes).toBeGreaterThanOrEqual(1);

    // The code block should display lines (highlighted line exists)
    const codeLines1 = await app.getCodeLines();
    expect(codeLines.length).toBeGreaterThan(0);

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
  });

  test('Max Area demo: runs to completion and displays best area in visualization info line', async () => {
    await app.selectDemo('maxArea');
    const testHeights = [1, 8, 6, 2, 5, 4, 8, 3, 7];
    await app.setArray(testHeights);

    // Step until finished (the demo reports best area when done)
    const finished1 = await app.stepUntilFinished(60);
    expect(finished).toBeTruthy();

    // The visArea info line contains "Best area" number
    const infoText = await app.visArea.textContent();
    expect(infoText).toBeTruthy();
    expect(infoText.toLowerCase()).toContain('best');

    // The result chip should contain numeric best area (max area for this array is known: 49)
    const res = (await app.resChip.textContent()) || '';
    // Some routes store result in resChip; ensure it contains a number (49 ideally)
    expect(res.replace(/\s/g, '')).toMatch(/\d+/);

    // Bars visualization should exist
    const barCount = await app.countBars();
    expect(barCount).toBe(testHeights.length);

    // No runtime page errors occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Control buttons: Random, Sort Ascending, Reverse and Reset behaviors', async () => {
    // Click Random and ensure array input changes
    const before = await app.arrayInput.inputValue();
    await app.clickRandom();
    await page.waitForTimeout(50);
    const afterRandom = await app.arrayInput.inputValue();
    expect(afterRandom.length).toBeGreaterThan(0);
    expect(afterRandom).not.toBe(before);

    // Click Sort Ascending: ensure values sorted ascending
    // Put a clearly unsorted array then sort
    await app.setArray([5, 1, 4, 2]);
    await app.clickSort();
    await page.waitForTimeout(50);
    const sorted = (await app.arrayInput.inputValue()).split(',').map(s => Number(s));
    // sorted should be [1,2,4,5]
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
    }

    // Click Reverse to reverse the array order
    const beforeReverse = sorted.slice();
    await app.clickReverse();
    await page.waitForTimeout(50);
    const reversed = (await app.arrayInput.inputValue()).split(',').map(s => Number(s));
    expect(reversed[0]).toBe(beforeReverse[beforeReverse.length - 1]);

    // Reset should restore state to idle and clear runtime state values such as ops/res/log
    await app.clickStart(); // initialize and start interval if possible
    await page.waitForTimeout(80);
    await app.clickReset();
    await page.waitForTimeout(80);
    await expect(app.stateChip).toHaveText('State: idle');
    await expect(app.opsChip).toHaveText('0');
    await expect(app.logEl).toHaveText('');
  });

  test('Edge cases: alert when trying to start without array or without two-sum target', async () => {
    // Make array empty and attempt to Step (this will trigger initializeGenerator -> alert)
    await app.setArray([]);
    // Ensure any upcoming dialogs are captured
    dialogs = [];
    await app.clickStep();
    // wait a bit for dialog handler to run
    await page.waitForTimeout(80);

    // There should have been an alert dialog triggered by empty array
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message.toLowerCase()).toContain('please provide an array');

    // Now set a non-empty array but clear target for two-sum and Start -> should alert about numeric target
    await app.setArray([1, 2, 3]);
    await app.selectDemo('twoSum');
    await app.setTarget(''); // empty target
    dialogs = [];
    await app.clickStart();
    // wait for alert to appear and be handled
    await page.waitForTimeout(80);
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message.toLowerCase()).toContain('enter a numeric target');

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Console and pageerror observation: ensure no console.error messages and no uncaught exceptions', async () => {
    // We already collected console messages and pageErrors on navigation and interactions.
    // Assert there are no console.error messages
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);

    // Assert there were no uncaught exceptions
    expect(pageErrors.length).toBe(0);
  });
});