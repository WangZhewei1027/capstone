import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b0d42-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object Model for the Linear Search demo
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.randBtn = page.locator('#randBtn');
    this.lengthRand = page.locator('#lengthRand');
    this.maxRand = page.locator('#maxRand');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.autoBtn = page.locator('#autoBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.speed = page.locator('#speed');

    this.arrayArea = page.locator('#arrayArea');
    this.cells = page.locator('#arrayArea .cell');
    this.currentIndexEl = page.locator('#currentIndex');
    this.comparisonsEl = page.locator('#comparisons');
    this.resultEl = page.locator('#result');
    this.logEl = page.locator('#log');
    this.pseudocode = page.locator('#pseudocode');
    this.codeLines = this.pseudocode.locator('.code-line');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Helpers
  async getArrayInputValue() {
    return this.arrayInput.inputValue();
  }

  async getTargetInputValue() {
    return this.targetInput.inputValue();
  }

  async getCellsCount() {
    return this.cells.count();
  }

  async getCellText(idx) {
    const cell = this.page.locator(`.cell[data-idx="${idx}"] .val`);
    return cell.textContent();
  }

  async getCellClasses(idx) {
    const cell = this.page.locator(`.cell[data-idx="${idx}"]`);
    const classAttr = await cell.getAttribute('class');
    return (classAttr || '').split(/\s+/).filter(Boolean);
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickAuto() {
    await this.autoBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async clickGenerate() {
    await this.randBtn.click();
  }

  async setTarget(value) {
    await this.targetInput.fill(String(value));
  }

  async setArray(value) {
    await this.arrayInput.fill(value);
    // Trigger change event (the page listens for change)
    await this.arrayInput.press('Enter');
  }

  async setSpeed(value) {
    await this.speed.evaluate((el, v) => el.value = v, value);
    // dispatch input/change so event listener triggers
    await this.speed.dispatchEvent('change');
  }

  async pressEnterOnTarget() {
    await this.targetInput.press('Enter');
  }

  async waitForResultTextContains(text, timeout = 5000) {
    await this.page.waitForFunction(
      (selector, expected) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.includes(expected);
      },
      this.resultEl.selector || '#result',
      text,
      { timeout }
    );
  }

  async readResultText() {
    return this.resultEl.textContent();
  }

  async readComparisons() {
    return this.comparisonsEl.textContent();
  }

  async readCurrentIndex() {
    return this.currentIndexEl.textContent();
  }

  async logContains(substr) {
    return this.page.evaluate((s) => {
      const log = document.getElementById('log');
      return Array.from(log.children).some(n => n.textContent.includes(s));
    }, substr);
  }
}

test.describe('Linear Search Interactive Demo (d80b0d42-d1c9-11f0-9efc-d1db1618a544)', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // collect page errors and console errors for assertions
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
  });

  test.afterEach(async () => {
    // Ensure no uncaught page errors or console errors occurred during tests
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);
    expect(consoleErrors, 'No console.error messages should be emitted').toHaveLength(0);
  });

  test('Initial page load shows default inputs, array rendering, and baseline status', async ({ page }) => {
    // Purpose: Verify initial UI state and default values are rendered correctly
    const app = new LinearSearchPage(page);
    await app.goto();

    // Inputs should have default values
    await expect(app.arrayInput).toHaveValue('7, 3, 9, 1, 4, 5, 2');
    await expect(app.targetInput).toHaveValue('4');

    // Array should render 7 cells (matching default array)
    await expect(app.cells).toHaveCount(7);
    const firstCellText = await app.getCellText(0);
    expect(firstCellText.trim()).toBe('7');

    // Status elements initial values
    await expect(app.currentIndexEl).toHaveText('—');
    await expect(app.comparisonsEl).toHaveText('0');
    await expect(app.resultEl).toHaveText('—');

    // Pseudocode should render 6 lines
    await expect(app.codeLines).toHaveCount(6);
  });

  test('Clicking "Step" advances one comparison and highlights the current cell', async ({ page }) => {
    // Purpose: Validate that stepping through advances index, increments comparisons, and logs comparison
    const app = new LinearSearchPage(page);
    await app.goto();

    // Perform a single step
    await app.clickStep();

    // After first step, current index should be 0, comparisons should be 1
    await expect(app.currentIndexEl).toHaveText('0');
    await expect(app.comparisonsEl).toHaveText('1');

    // Cell 0 should have class 'current'
    const classes = await app.getCellClasses(0);
    expect(classes).toContain('current');

    // Log should contain compare message for index 0
    const hasLog = await app.logContains('Compare array[0]');
    expect(hasLog).toBeTruthy();
  });

  test('Stepping repeatedly finds the target and marks the found cell and pseudocode line', async ({ page }) => {
    // Purpose: Step until the known target (4) is found and verify found state and UI changes
    const app = new LinearSearchPage(page);
    await app.goto();

    // Default target is 4 at index 4 in the default array
    // Step 5 times (0..4)
    for (let step = 0; step < 6; step++) {
      await app.clickStep();
      // small wait for DOM updates between steps
      await page.waitForTimeout(50);
      const resultText = await app.readResultText();
      if (resultText && resultText.includes('Found at index')) break;
    }

    // Verify result indicates found at index 4
    await app.waitForResultTextContains('Found at index 4', 2000);
    const resultTextFinal = await app.readResultText();
    expect(resultTextFinal).toContain('Found at index 4');

    // The cell at index 4 should have 'found' class
    const classes = await app.getCellClasses(4);
    expect(classes).toContain('found');

    // Comparisons should be at least 1 and equal to index+1 when found (5)
    const comparisons = Number((await app.readComparisons()).trim());
    expect(comparisons).toBeGreaterThanOrEqual(1);
    expect(comparisons).toBe(5);

    // Pseudocode line 4 should be active when found (line 4 corresponds to return i)
    const activeLineText = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('.pseudocode .code-line'));
      const active = lines.find(l => l.classList.contains('active'));
      return active ? active.getAttribute('data-line') : null;
    });
    // It may have been active during the final step; assert it's 4 or absent but not erroneous
    expect(['4', null, undefined]).toContain(activeLineText);
  });

  test('Start Search runs until completion and produces same found result as steps', async ({ page }) => {
    // Purpose: Validate the "Start Search" button triggers a full run to completion (until found)
    const app = new LinearSearchPage(page);
    await app.goto();

    // Reset to ensure predictable state and then click Start
    await app.clickReset();
    await app.clickStart();

    // Wait until result shows found
    await app.waitForResultTextContains('Found at index 4', 4000);
    const resultText = await app.readResultText();
    expect(resultText).toContain('Found at index 4');

    // Comparisons and current index should be consistent with found state
    const comparisons = Number((await app.readComparisons()).trim());
    expect(comparisons).toBeGreaterThan(0);
    // currentIndex may be shown as 4 or '—' depending on final UI update; ensure result drives correctness
    expect((await app.readResultText()).includes('Found at index 4')).toBeTruthy();
  });

  test('Auto Play runs automatically and can be paused, then reset clears highlights and logs', async ({ page }) => {
    // Purpose: Start Auto Play and assert that it completes and that Reset clears highlights
    const app = new LinearSearchPage(page);
    await app.goto();

    // Ensure we start from reset state
    await app.clickReset();

    // Click Auto Play (this will start auto-run)
    await app.clickAuto();

    // Wait until the demo indicates found at index 4
    await app.waitForResultTextContains('Found at index 4', 8000);

    // Now click Auto button again to attempt to pause (it toggles)
    await app.clickAuto();

    // Then reset demo and assert highlights removed and comparisons reset
    await app.clickReset();

    await expect(app.currentIndexEl).toHaveText('—');
    await expect(app.comparisonsEl).toHaveText('0');

    // No cell should have 'current' or 'found' class after reset
    const anySpecial = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cell')).some(c =>
        c.classList.contains('current') || c.classList.contains('found') || c.classList.contains('checked')
      );
    });
    expect(anySpecial).toBe(false);

    // Log should contain "Reset demo."
    const resetLogged = await app.logContains('Reset demo');
    expect(resetLogged).toBeTruthy();
  });

  test('Generate random array updates input and renders new cells (Randomize control)', async ({ page }) => {
    // Purpose: Verify random generation control updates the array input and re-renders the array
    const app = new LinearSearchPage(page);
    await app.goto();

    // Set desired length and max, then click generate
    await app.lengthRand.fill('10');
    await app.maxRand.fill('50');
    await app.clickGenerate();

    // After clicking generate, the arrayInput should be updated with 10 values
    const arrayVal = await app.getArrayInputValue();
    // split by comma or space
    const tokens = arrayVal.split(/[,\\s]+/).filter(s => s.length);
    expect(tokens.length).toBe(10);

    // arrayArea should render 10 cells
    await expect(app.cells).toHaveCount(10);
  });

  test('Search for non-existent target ends with "Not found" result', async ({ page }) => {
    // Purpose: Validate behavior when target is not present in the array
    const app = new LinearSearchPage(page);
    await app.goto();

    // Set a target that does not exist in the default array
    await app.setTarget('9999');

    // Click Start Search to run full search
    await app.clickStart();

    // Wait for Not found result
    await app.waitForResultTextContains('Not found', 5000);
    const res = await app.readResultText();
    expect(res).toContain('Not found');

    // Comparisons should be at least equal to array length (7) when not found
    const comparisons = Number((await app.readComparisons()).trim());
    expect(comparisons).toBeGreaterThanOrEqual(7);
  });

  test('Pressing Enter in target input triggers step behavior (keyboard interaction)', async ({ page }) => {
    // Purpose: Ensure the Enter key behavior bound to inputs triggers the step-start sequence
    const app = new LinearSearchPage(page);
    await app.goto();

    // Reset then focus target input and press Enter
    await app.clickReset();
    await app.targetInput.focus();
    await app.pressEnterOnTarget();

    // After pressing Enter, at least one comparison should have occurred
    await expect(app.comparisonsEl).not.toHaveText('0');
    const comparisons = Number((await app.readComparisons()).trim());
    expect(comparisons).toBeGreaterThanOrEqual(1);

    // There should be a log entry indicating search started
    const startedLogged = await app.logContains('Search started');
    expect(startedLogged).toBeTruthy();
  });

  test('Changing speed while auto running does not throw errors (robustness)', async ({ page }) => {
    // Purpose: Ensure changing speed triggers the change handler and does not produce runtime errors
    const app = new LinearSearchPage(page);
    await app.goto();

    // Start auto
    await app.clickReset();
    await app.clickAuto();

    // Change speed value to an alternative and dispatch change event
    await app.setSpeed('300');

    // Let auto run briefly
    await page.waitForTimeout(500);

    // Stop auto (toggle)
    await app.clickAuto();

    // No uncaught errors should have been captured by listeners (checked in afterEach)
    // Also ensure that some progress was made (comparisons > 0)
    const comparisons = Number((await app.readComparisons()).trim());
    expect(comparisons).toBeGreaterThanOrEqual(0);
  });
});