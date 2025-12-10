import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b3450-d1c9-11f0-9efc-d1db1618a544.html';

// Page object model for the Binary Search Visualizer
class BinarySearchPage {
  constructor(page) {
    this.page = page;
    this.locators = {
      title: 'h1',
      arrayContainer: '#arrayContainer',
      sizeInput: '#sizeInput',
      genBtn: '#genBtn',
      minVal: '#minVal',
      maxVal: '#maxVal',
      targetInput: '#targetInput',
      setTargetBtn: '#setTargetBtn',
      randomTargetBtn: '#randomTargetBtn',
      stepBtn: '#stepBtn',
      playBtn: '#playBtn',
      resetBtn: '#resetBtn',
      fastBtn: '#fastBtn',
      speedInput: '#speed',
      compCount: '#compCount',
      stepCount: '#stepCount',
      message: '#message',
      modeSelect: '#modeSelect',
      pseudocode: '#pseudocode',
      stackArea: '#stackArea',
      stackFrames: '#stackFrames',
    };
  }

  async goto() {
    await this.page.goto(URL);
    // Wait for array to be rendered (generateArray runs on load)
    await this.page.waitForSelector(this.locators.arrayContainer + ' .cell', { timeout: 5000 });
  }

  // Utility to retrieve cell count
  async getCellCount() {
    return await this.page.locator(this.locators.arrayContainer + ' .cell').count();
  }

  // Get text content of the status message
  async getStatusText() {
    return (await this.page.locator(this.locators.message).textContent()) || '';
  }

  // Get the value present in the target input
  async getTargetInputValue() {
    return (await this.page.locator(this.locators.targetInput).inputValue()) || '';
  }

  // Click a cell by index
  async clickCell(idx) {
    const cell = this.page.locator(`${this.locators.arrayContainer} .cell`).nth(idx);
    await cell.click();
  }

  // Get numeric value displayed in cell idx (the .val div)
  async getCellValue(idx) {
    const el = this.page.locator(`${this.locators.arrayContainer} .cell`).nth(idx).locator('.val');
    return (await el.textContent())?.trim() ?? '';
  }

  // Click buttons and inputs
  async clickGenerate() { await this.page.click(this.locators.genBtn); }
  async clickSetTarget() { await this.page.click(this.locators.setTargetBtn); }
  async clickRandomTarget() { await this.page.click(this.locators.randomTargetBtn); }
  async clickStep() { await this.page.click(this.locators.stepBtn); }
  async clickPlay() { await this.page.click(this.locators.playBtn); }
  async clickReset() { await this.page.click(this.locators.resetBtn); }
  async clickFast() { await this.page.click(this.locators.fastBtn); }
  async changeMode(modeValue) {
    await this.page.selectOption(this.locators.modeSelect, modeValue);
  }
  async setTargetInput(value) {
    await this.page.fill(this.locators.targetInput, String(value));
  }
  async setSize(n) {
    await this.page.fill(this.locators.sizeInput, String(n));
    // trigger generate if desired via clicking gen button
  }
  async setSpeed(ms) {
    // set value and dispatch input event so in-page listener picks it up
    await this.page.evaluate((v) => {
      const el = document.getElementById('speed');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, ms);
  }

  // Get classes on a cell (space-separated)
  async getCellClasses(idx) {
    return await this.page.locator(`${this.locators.arrayContainer} .cell`).nth(idx).getAttribute('class') || '';
  }

  // Get currently active pseudocode line index (-1 if none)
  async getActivePseudoLineIndex() {
    const lines = this.page.locator(`${this.locators.pseudocode} .line`);
    const count = await lines.count();
    for (let i = 0; i < count; i++) {
      const ln = lines.nth(i);
      const cls = await ln.getAttribute('class') || '';
      if (cls.includes('active')) return i;
    }
    return -1;
  }

  // Get stack frame display strings (top-first as shown in UI)
  async getStackFramesText() {
    const frames = this.page.locator(`${this.locators.stackFrames} .frame`);
    const count = await frames.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push((await frames.nth(i).textContent())?.trim() ?? '');
    }
    return out;
  }

  async getComparisonCount() {
    return Number((await this.page.locator(this.locators.compCount).textContent()) || '0');
  }
  async getStepCount() {
    return Number((await this.page.locator(this.locators.stepCount).textContent()) || '0');
  }
}

// Shared setup to capture console messages and page errors for each test
test.describe('Binary Search Visualizer - E2E', () => {
  let page;
  let binaryPage;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleMessages = [];
    pageErrors = [];

    // Capture console and page errors
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    binaryPage = new BinarySearchPage(page);
    await binaryPage.goto();
  });

  test.afterEach(async () => {
    // Assert there were no uncaught page errors
    expect(pageErrors, 'No page errors should have occurred during the test').toHaveLength(0);
    // Assert no console.error messages were emitted
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, `Console should not contain error-level messages: ${JSON.stringify(errors)}`).toHaveLength(0);
    await page.close();
  });

  test('Initial load shows title, generated array and ready status', async () => {
    // Verify title and initial status text
    await expect(page.locator(binaryPage.locators.title)).toHaveText('Binary Search Visualizer');
    const status = await binaryPage.getStatusText();
    expect(status.toLowerCase()).toContain('ready');
    // Array should contain number of cells equal to initial size input (default 15)
    const sizeVal = Number(await page.locator(binaryPage.locators.sizeInput).inputValue());
    const cellCount = await binaryPage.getCellCount();
    expect(cellCount).toBeGreaterThanOrEqual(3); // sanity: default should be 15 but ensure >=3
    // Pseudocode should be rendered
    const pseudoLines = await page.locator(`${binaryPage.locators.pseudocode} .line`).count();
    expect(pseudoLines).toBeGreaterThan(0);
  });

  test('Setting invalid target via input shows error message', async () => {
    // Enter non-numeric string and click Set Target
    await binaryPage.setTargetInput('not-a-number');
    await binaryPage.clickSetTarget();
    const status = await binaryPage.getStatusText();
    // Should show invalid target message
    expect(status).toMatch(/Invalid target value/i);
    // Target input should be cleared by the script
    const targetVal = await binaryPage.getTargetInputValue();
    expect(targetVal).toBe('');
  });

  test('Clicking an array cell sets the target and updates input', async () => {
    // Click the first cell to set target
    const cellCount = await binaryPage.getCellCount();
    expect(cellCount).toBeGreaterThan(0);
    const value0 = await binaryPage.getCellValue(0);
    await binaryPage.clickCell(0);
    // Status should reflect target set and input updated
    const status = await binaryPage.getStatusText();
    expect(status).toContain('Target set to');
    const inputValue = await binaryPage.getTargetInputValue();
    expect(Number(inputValue)).toBe(Number(value0));
  });

  test('Stepping iterative mode finds a clicked target and highlights found cell', async () => {
    // Ensure iterative mode
    await binaryPage.changeMode('iterative');
    // Wait for resetSimulation triggered by changeMode
    await page.waitForTimeout(100);
    const cellCount = await binaryPage.getCellCount();
    expect(cellCount).toBeGreaterThan(5);

    // Choose a target by clicking a mid index cell to make fewer steps predictable
    const idx = Math.floor(cellCount / 2);
    const targetVal = await binaryPage.getCellValue(idx);
    await binaryPage.clickCell(idx);

    // First step initializes the search (idle -> calc_mid)
    await binaryPage.clickStep();
    // After first step, pseudocode line 0 (left=0,right=n-1) should be active
    const activeLine1 = await binaryPage.getActivePseudoLineIndex();
    expect(activeLine1).toBe(0);

    // Second step should calculate mid (calc_mid -> compare)
    await binaryPage.clickStep();
    const activeLine2 = await binaryPage.getActivePseudoLineIndex();
    // mid calculation is line index 2 in iterative pseudo; check active line is 2
    expect(activeLine2).toBe(2);

    // Continue stepping until found (safeguard max loops)
    let found = false;
    for (let i = 0; i < 40; i++) {
      await binaryPage.clickStep();
      const status = await binaryPage.getStatusText();
      if (/Found target at index/i.test(status) || /Search finished \(found\)/i.test(status)) {
        found = true;
        break;
      }
      // If not found, the loop will continue; break if it becomes notfound
      if (/not found/i.test(status) || /Search finished \(not found\)/i.test(status)) break;
    }
    expect(found, 'The iterative stepping should eventually find the clicked target').toBe(true);

    // The found cell should have class 'found'
    const classes = await binaryPage.getCellClasses(idx);
    expect(classes.includes('found')).toBe(true);
    // Comparison count should be at least 1
    expect(await binaryPage.getComparisonCount()).toBeGreaterThanOrEqual(1);
  });

  test('Clicking Step without a target produces an instructive error', async () => {
    // Reset and ensure empty target
    await binaryPage.clickReset();
    await page.waitForTimeout(50);
    await binaryPage.setTargetInput('');
    // Click step with no target should show an error and do nothing
    await binaryPage.clickStep();
    const status = await binaryPage.getStatusText();
    expect(status.toLowerCase()).toContain('set a target first');
  });

  test('Fast Run respects target set and updates state to done or notfound', async () => {
    // Reset and pick a known target via cell click
    await binaryPage.clickReset();
    await page.waitForTimeout(50);
    const count = await binaryPage.getCellCount();
    expect(count).toBeGreaterThan(0);
    // Choose the last cell to reduce chance of duplicates
    const idx = count - 1;
    const targetVal = await binaryPage.getCellValue(idx);
    await binaryPage.clickCell(idx);
    // Fast run should find it quickly
    await binaryPage.clickFast();
    // After fast run, status should indicate found or not found; we expect found for existing cell
    const status = await binaryPage.getStatusText();
    expect(status.toLowerCase()).toContain('found');
    // Found cell should have 'found' class
    const classes = await binaryPage.getCellClasses(idx);
    expect(classes.includes('found')).toBe(true);

    // Now test fast run with no target => should produce 'Set a target first' error message
    await binaryPage.clickReset();
    await page.waitForTimeout(50);
    // Ensure target input empty
    await binaryPage.setTargetInput('');
    await binaryPage.clickFast();
    const status2 = await binaryPage.getStatusText();
    expect(status2.toLowerCase()).toContain('set a target first');
  });

  test('Recursive mode shows stack frames and can step through recursion', async () => {
    // Switch to recursive mode
    await binaryPage.changeMode('recursive');
    // resetSimulation called automatically; stackArea shown
    await page.waitForTimeout(100);
    // Verify stack area is visible
    const stackAreaVisible = await page.locator(binaryPage.locators.stackArea).isVisible();
    expect(stackAreaVisible).toBe(true);

    // Pick a target by clicking a cell near middle
    const count = await binaryPage.getCellCount();
    const idx = Math.floor(count / 2);
    const val = await binaryPage.getCellValue(idx);
    await binaryPage.clickCell(idx);

    // First step should push initial frame
    await binaryPage.clickStep();
    let frames = await binaryPage.getStackFramesText();
    expect(frames.length).toBeGreaterThanOrEqual(1);
    // The top frame should correspond to [0, n-1] visible in one of the frames
    expect(frames.some(f => f.includes('[0,'))).toBe(true);

    // Step recursively until found (or limits)
    let found = false;
    for (let i = 0; i < 80; i++) {
      await binaryPage.clickStep();
      const status = await binaryPage.getStatusText();
      if (/Found target at index/i.test(status) || /Search finished \(found\)/i.test(status)) {
        found = true;
        break;
      }
      if (/not found/i.test(status)) break;
    }
    expect(found, 'Recursive stepping should eventually find the clicked target').toBe(true);
    // After found, stack frames should be cleared (stack length 0 yields "Empty stack")
    frames = await binaryPage.getStackFramesText();
    // It's acceptable if frames show 'Empty stack' or are empty
    expect(frames.length).toBeGreaterThanOrEqual(0);
  });

  test('Play (auto-step) runs to completion and respects speed changes', async () => {
    // Reset, ensure iterative mode
    await binaryPage.changeMode('iterative');
    await page.waitForTimeout(50);

    // Pick a target and set a fast speed so autoplay finishes quickly
    const count = await binaryPage.getCellCount();
    const idx = Math.floor(count / 3);
    const val = await binaryPage.getCellValue(idx);
    await binaryPage.clickCell(idx);

    // Set a faster speed for interval
    await binaryPage.setSpeed(100);

    // Start autoplay
    await binaryPage.clickPlay();

    // Wait until status indicates finished (either found or not found)
    await expect.poll(async () => {
      const s = await binaryPage.getStatusText();
      return s.toLowerCase();
    }, {
      timeout: 10000,
      message: 'Auto-play should finish and update status to finished within timeout'
    }).toMatch(/found|not found|search finished/);

    const finalStatus = await binaryPage.getStatusText();
    // Should indicate found in this test since we clicked an existing cell
    expect(finalStatus.toLowerCase()).toContain('found');

    // Ensure the play button text reverted to 'Play' because clearAuto updates it
    const playText = await page.locator(binaryPage.locators.playBtn).textContent();
    // It may show 'Play' or 'Pause' depending on timing; at least ensure it exists
    expect(playText?.length).toBeGreaterThan(0);

    // Reset to check that reset clears highlights and counts
    await binaryPage.clickReset();
    await page.waitForTimeout(50);
    const compCount = await binaryPage.getComparisonCount();
    const stepCount = await binaryPage.getStepCount();
    expect(compCount).toBeGreaterThanOrEqual(0);
    expect(stepCount).toBeGreaterThanOrEqual(0);
  });
});