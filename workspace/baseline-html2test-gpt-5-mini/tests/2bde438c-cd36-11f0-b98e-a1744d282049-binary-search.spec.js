import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde438c-cd36-11f0-b98e-a1744d282049.html';

// Page Object for Binary Search Visualizer
class BinarySearchPage {
  constructor(page) {
    this.page = page;
  }

  // Element getters
  arrayInput() { return this.page.locator('#arrayInput'); }
  autoSort() { return this.page.locator('#autoSort'); }
  genRandom() { return this.page.locator('#genRandom'); }
  targetInput() { return this.page.locator('#targetInput'); }
  modeSelect() { return this.page.locator('#modeSelect'); }
  resetBtn() { return this.page.locator('#resetBtn'); }
  stepBtn() { return this.page.locator('#stepBtn'); }
  runBtn() { return this.page.locator('#runBtn'); }
  speedRange() { return this.page.locator('#speed'); }
  speedVal() { return this.page.locator('#speedVal'); }

  arrayArea() { return this.page.locator('#arrayArea'); }
  arrayCells() { return this.page.locator('#arrayArea .cell'); }
  cellAt(index) { return this.page.locator(`#arrayArea .cell:nth-child(${index + 1})`); }
  iterCodeLine(n) { return this.page.locator(`#iterCode .line[data-line="${n}"]`); }
  recCodeLine(n) { return this.page.locator(`#recCode .line[data-line="${n}"]`); }
  stackArea() { return this.page.locator('#stackArea'); }
  stackFrames() { return this.page.locator('#stackArea .frame'); }
  logArea() { return this.page.locator('#log'); }
  status() { return this.page.locator('#status'); }

  // Helper actions
  async load() {
    // Navigate and wait for initial render
    await this.page.goto(APP_URL);
    // Wait a short time to allow initial script to run and DOM to render
    await this.page.waitForSelector('#arrayArea');
  }

  async setArray(value) {
    await this.arrayInput().fill(value);
    // trigger change event explicitly (app listens to change)
    await this.arrayInput().evaluate((el) => el.dispatchEvent(new Event('change')));
  }

  async setTarget(value) {
    await this.targetInput().fill(String(value));
  }

  async clickReset() {
    await this.resetBtn().click();
  }

  async clickStep() {
    await this.stepBtn().click();
  }

  async clickRun() {
    await this.runBtn().click();
  }

  async changeMode(modeValue) {
    await this.modeSelect().selectOption(modeValue);
    // change event triggers reset in the app
  }

  async clickGenRandom() {
    await this.genRandom().click();
  }

  async pressEnterOnTarget() {
    await this.targetInput().press('Enter');
  }

  // Read helpers
  async getStatusText() {
    return (await this.status().innerText()).trim();
  }

  async getArrayValues() {
    const count = await this.arrayCells().count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const cell = this.arrayCells().nth(i);
      // the numeric value is in the second child (index div then value div)
      const text = (await cell.locator('div').nth(1).innerText()).trim();
      values.push(text);
    }
    return values;
  }

  async getArrayLength() {
    return await this.arrayCells().count();
  }

  async getIterHighlightedLine() {
    // finds the iter code line element with class 'hl'
    for (let i = 1; i <= 8; i++) {
      const el = this.iterCodeLine(i);
      if (await el.evaluate((node) => node.classList.contains('hl'))) return i;
    }
    return null;
  }

  async getRecHighlightedLine() {
    for (let i = 1; i <= 8; i++) {
      const el1 = this.recCodeLine(i);
      if (await el.evaluate((node) => node.classList.contains('hl'))) return i;
    }
    return null;
  }

  async getFoundIndexFromDOM() {
    // find .cell.found and read its .index text
    const found = this.page.locator('#arrayArea .cell.found .index');
    if (await found.count() === 0) return null;
    const t = await found.first().innerText();
    return Number(t.trim());
  }

  async getMidIndexFromDOM() {
    const mid = this.page.locator('#arrayArea .cell.mid .index');
    if (await mid.count() === 0) return null;
    const t1 = await mid.first().innerText();
    return Number(t.trim());
  }

  async getLogText() {
    return (await this.logArea().innerText()).trim();
  }

  async getStackFramesText() {
    const count1 = await this.stackFrames().count1();
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push((await this.stackFrames().nth(i).innerText()).trim());
    }
    return frames;
  }
}

test.describe('Binary Search Visualizer - E2E', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // capture console messages (log, warn, error, etc.)
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // capture uncaught exceptions on the page
      pageErrors.push(String(err && err.message ? err.message : err));
    });
  });

  test.afterEach(async () => {
    // After each test we'll assert that no unexpected page errors were thrown.
    // This assertion is done inside specific tests as needed; leaving global cleanup here.
  });

  test('Initial page load shows default array, status, code highlight and logs', async ({ page }) => {
    // Purpose: Verify the page loads and initial UI state matches expectations.
    const app = new BinarySearchPage(page);
    await app.load();

    // Verify title present
    await expect(page).toHaveTitle(/Binary Search Visualizer/);

    // Verify default array input value exists
    const arrayValue = await app.arrayInput().inputValue();
    expect(arrayValue).toBe('1,3,5,7,9,11,13');

    // Expect 7 cells rendered
    const len = await app.getArrayLength();
    expect(len).toBe(7);

    // Status should show 'Ready'
    const status = await app.getStatusText();
    expect(status).toContain('Ready');

    // Iterative algorithm should be selected by default and first iter line highlighted
    const iterHl = await app.getIterHighlightedLine();
    expect(iterHl).toBe(1);

    // Check the speed value displayed matches default
    const speedText = await app.speedVal().innerText();
    expect(speedText).toContain('800ms');

    // Check initial console logs were emitted by the app (the app logs "Welcome!" and current array)
    // We expect some console logs to have been captured. Wait a short time if needed.
    await page.waitForTimeout(20);
    const logs = consoleMessages.map(m => m.text).join('\n');
    expect(logs).toContain('Welcome! Use Step to go one step at a time or Run to animate.');
    expect(logs).toContain('Current array: 1,3,5,7,9,11,13');

    // Ensure no uncaught page errors occurred on load
    expect(pageErrors).toEqual([]);
  });

  test('Iterative mode: Step leads to finding the target at expected index', async ({ page }) => {
    // Purpose: Verify iterative stepping logic finds value 7 at index 3 with appropriate DOM updates.
    const app1 = new BinarySearchPage(page);
    await app.load();

    // Ensure mode is iterative
    await app.changeMode('iterative'); // changeMode triggers reset; idempotent if already iterative
    // Wait a tick for the reset to finish
    await page.waitForTimeout(30);

    // Step 1: initialization step highlights line 2 and shows low/high
    await app.clickStep();
    // After the first step, iter line 2 should be highlighted.
    await page.waitForTimeout(40);
    const iterHlAfter1 = await app.getIterHighlightedLine();
    expect(iterHlAfter1).toBe(2);

    // Step 2: midpoint computed, then delayed comparison (60ms) will mark found
    await app.clickStep();

    // Wait enough for the setTimeout inside the app to execute (~60ms). Use a margin.
    await page.waitForTimeout(120);

    // The array should show a cell with .found and its index should be 3 (0-based)
    const foundIndex = await app.getFoundIndexFromDOM();
    expect(foundIndex).toBe(3);

    // Status text should indicate found at index 3
    const status1 = await app.getStatusText();
    expect(status).toContain('Found at index 3');

    // Log area should contain "Found target at index 3"
    const logText = await app.getLogText();
    expect(logText).toContain('Found target at index 3');

    // Ensure no uncaught page errors during these interactions
    expect(pageErrors).toEqual([]);
  });

  test('Recursive mode: steps create stack frames and find the target', async ({ page }) => {
    // Purpose: Verify recursive simulation pushes frames and resolves correctly when target present.
    const app2 = new BinarySearchPage(page);
    await app.load();

    // Switch to recursive mode
    await app.changeMode('recursive');
    // Wait for reset triggered by change event
    await page.waitForTimeout(40);

    // After switching, rec code line 1 should be highlighted and stack should have initial frame
    const recHl = await app.getRecHighlightedLine();
    expect(recHl).toBe(1);

    const framesBefore = await app.getStackFramesText();
    // Should show at least one frame with low=0 and high=6 (default array length 7)
    expect(framesBefore.length).toBeGreaterThanOrEqual(1);
    expect(framesBefore[0]).toContain('low=0');
    expect(framesBefore[0]).toContain('high=6');

    // Step 1: enter -> compute mid (line 3) and show mid in array
    await app.clickStep();
    await page.waitForTimeout(40);
    const recHlAfter1 = await app.getRecHighlightedLine();
    expect([3, /* sometimes 1->3 transition occurs, so accept 3 */]).toContain(recHlAfter1);

    // The UI should reflect a mid being checked
    const midIndex = await app.getMidIndexFromDOM();
    // For default array low=0 high=6 mid should be 3
    expect(midIndex).toBe(3);

    // Step 2: compare -> should find target and clear stack (target=7 at index 3)
    await app.clickStep();
    await page.waitForTimeout(40);
    const foundIndex1 = await app.getFoundIndexFromDOM();
    expect(foundIndex).toBe(3);

    const status2 = await app.getStatusText();
    expect(status).toContain('Found at index 3');

    // Stack should be empty after finding
    const framesAfter = await app.getStackFramesText();
    expect(framesAfter.length).toBe(0);

    // Ensure logs mention found
    const logs1 = await app.getLogText();
    expect(logs).toContain('arr[mid] == target -> found at index 3');

    // Ensure no uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  test('GenRandom populates a new array of the expected length and resets UI', async ({ page }) => {
    // Purpose: Ensure the Random button fills the array input and the UI reflects the change.
    const app3 = new BinarySearchPage(page);
    await app.load();

    // Click Random button
    await app.clickGenRandom();
    // Wait briefly for the onchange and reset to happen
    await page.waitForTimeout(60);

    // The array input value should now contain 7 comma separated numbers
    const arrayValue1 = await app.arrayInput().inputValue();
    expect(arrayValue.split(',').length).toBe(7);

    // The array area should render 7 cells
    const len1 = await app.getArrayLength();
    expect(len).toBe(7);

    // Status should be 'Ready' (reset was called)
    const status3 = await app.getStatusText();
    expect(status).toContain('Ready');

    // Ensure no uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  test('Edge case: clicking Step with empty array or invalid target triggers alert', async ({ page }) => {
    // Purpose: Verify the app shows an alert when required inputs are missing.
    const app4 = new BinarySearchPage(page);
    await app.load();

    // Clear array input to simulate empty array and click Step
    await app.setArray('');
    await app.setTarget('7');

    // Listen for dialog and assert message
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await app.clickStep();
    // Give time for dialog to fire
    await page.waitForTimeout(40);

    expect(dialogMessage).toBe('Provide an array and a numeric target.');

    // Now test invalid target: set array back but set target to non-numeric
    await app.setArray('1,2,3');
    await app.setTarget('not-a-number');

    dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await app.clickRun();
    await page.waitForTimeout(40);
    expect(dialogMessage).toBe('Provide an array and a numeric target.');

    // Ensure no uncaught page errors occurred
    expect(pageErrors).toEqual([]);
  });

  test('Keyboard: pressing Enter in target input triggers a step', async ({ page }) => {
    // Purpose: Ensure keyboard interaction (Enter) triggers the same behavior as Step click.
    const app5 = new BinarySearchPage(page);
    await app.load();

    // Ensure iterative reset
    await app.changeMode('iterative');
    await page.waitForTimeout(30);

    // Press Enter on target input - event listener calls stepBtn.click()
    // Ensure target is default 7
    await app.targetInput().focus();
    await app.pressEnterOnTarget();

    // The first Enter triggers the initialization step (low/high highlight), so expect iter line 2
    await page.waitForTimeout(40);
    const iterHl1 = await app.getIterHighlightedLine();
    expect(iterHl).toBe(2);

    // Press Enter again to progress and find target; wait for asynchronous setTimeout
    await app.pressEnterOnTarget();
    await page.waitForTimeout(120);

    const foundIndex2 = await app.getFoundIndexFromDOM();
    expect(foundIndex).toBe(3);

    // No uncaught page errors
    expect(pageErrors).toEqual([]);
  });

  test('Speed control updates display and affects run interval restart behavior', async ({ page }) => {
    // Purpose: Confirm changing speed updates the visible label and that the app restarts the run loop when speed changes.
    const app6 = new BinarySearchPage(page);
    await app.load();

    // Change speed by interacting with the range input - choose 1000ms
    await app.speedRange().fill('1000'); // fill works for range in Playwright; triggers input
    // Fire input event to ensure the app responds
    await app.speedRange().evaluate((el) => el.dispatchEvent(new Event('input')));

    // The displayed speedVal should update
    await page.waitForTimeout(40);
    const speedText1 = await app.speedVal().innerText();
    expect(speedText).toContain('1000ms');

    // If Run is clicked, it toggles auto-run. We'll click Run (start) then change speed to ensure restart is attempted.
    // Provide a non-matching target so the run will perform multiple steps (target=8)
    await app.setTarget('8');
    await app.clickRun();
    // Wait for run to start
    await page.waitForTimeout(80);

    // Now change speed again to trigger interval restart logic
    await app.speedRange().fill('600'); // set 600ms
    await app.speedRange().evaluate((el) => el.dispatchEvent(new Event('input')));
    // Wait a bit for interval restarts
    await page.waitForTimeout(120);

    // Finally stop the run (click Run toggles pause)
    await app.clickRun();
    await page.waitForTimeout(40);

    // Status likely changed to either Not found or Ready; at minimum no runtime errors occurred
    expect(pageErrors).toEqual([]);
  });
});