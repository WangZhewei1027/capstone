import { test, expect } from '@playwright/test';

const APP = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde438a-cd36-11f0-b98e-a1744d282049.html';

// Page Object for the Radix Sort Visualizer
class RadixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Core selectors
    this.arrayInput = '#arrayInput';
    this.loadBtn = '#loadBtn';
    this.randomBtn = '#randomBtn';
    this.clearBtn = '#clearBtn';
    this.baseInput = '#baseInput';
    this.speedInput = '#speed';
    this.stepForwardBtn = '#stepForward';
    this.stepBackBtn = '#stepBack';
    this.playPauseBtn = '#playPause';
    this.resetBtn = '#resetBtn';
    this.arrayRow = '#arrayRow';
    this.buckets = '#buckets';
    this.digitPos = '#digitPos';
    this.phase = '#phase';
    this.curBase = '#curBase';
    this.error = '#error';
    this.preset = '#preset';
    this.randCount = '#randCount';
    this.message = '#message';
  }

  async goto() {
    await this.page.goto(APP);
  }

  async getConsoleAndPageErrors() {
    const messages = [];
    const pageErrors = [];
    this.page.on('console', (m) => {
      messages.push({ type: m.type(), text: m.text() });
    });
    this.page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    return { messages, pageErrors };
  }

  async setArrayInput(value) {
    await this.page.fill(this.arrayInput, value);
  }

  async clickLoad() {
    await this.page.click(this.loadBtn);
  }

  async clickRandom() {
    await this.page.click(this.randomBtn);
  }

  async clickClear() {
    await this.page.click(this.clearBtn);
  }

  async setBase(value) {
    // baseInput is type=number; use fill then blur to trigger change
    await this.page.fill(this.baseInput, String(value));
    // trigger change event by blurring
    await this.page.dispatchEvent(this.baseInput, 'change');
  }

  async setSpeed(value) {
    await this.page.fill(this.speedInput, String(value));
    // speed input has no change listener, but play interval reads its value dynamically
  }

  async clickStepForward() {
    await this.page.click(this.stepForwardBtn);
  }

  async clickStepBack() {
    await this.page.click(this.stepBackBtn);
  }

  async togglePlayPause() {
    await this.page.click(this.playPauseBtn);
  }

  async clickReset() {
    await this.page.click(this.resetBtn);
  }

  async selectPreset(value) {
    await this.page.selectOption(this.preset, { value });
  }

  async setRandCount(value) {
    await this.page.fill(this.randCount, String(value));
  }

  // Utilities to extract DOM state

  async getWorkingArrayValues() {
    // Extract the textual number value from each array cell's first text node
    return this.page.$$eval(`${this.arrayRow} .cell`, (cells) =>
      cells.map((c) => {
        // the cell contains a text node then a .digit child
        if (c.childNodes && c.childNodes.length > 0) {
          const first = c.childNodes[0];
          if (first.nodeType === Node.TEXT_NODE) return first.nodeValue.trim();
        }
        // fallback to full text
        return c.textContent.trim();
      })
    );
  }

  async getArrayCellsCount() {
    return this.page.$$eval(`${this.arrayRow} .cell`, (cells) => cells.length);
  }

  async getBucketValuesByIndex(idx) {
    // buckets are in order created with index 0..base-1
    return this.page.$$eval(`#buckets .bucket`, (buckets, idx) => {
      if (!buckets[idx]) return [];
      const stack = buckets[idx].querySelector('.stack');
      if (!stack) return [];
      return Array.from(stack.querySelectorAll('.cell')).map((c) => {
        if (c.childNodes && c.childNodes.length > 0) {
          const first1 = c.childNodes[0];
          if (first.nodeType === Node.TEXT_NODE) return first.nodeValue.trim();
        }
        return c.textContent.trim();
      });
    }, idx);
  }

  async getPhaseText() {
    return this.page.textContent(this.phase);
  }

  async getDigitPosText() {
    return this.page.textContent(this.digitPos);
  }

  async getCurBaseText() {
    return this.page.textContent(this.curBase);
  }

  async getErrorText() {
    const visible = await this.page.$eval(this.error, (el) => {
      return window.getComputedStyle(el).display !== 'none';
    }).catch(()=>false);
    if (!visible) return '';
    return this.page.textContent(this.error);
  }

  async getMessageText() {
    return this.page.textContent(this.message);
  }

  async clickArrayCellAt(index) {
    // nth-child is 1-based
    await this.page.click(`${this.arrayRow} .cell:nth-child(${index + 1})`);
  }

  async hasArrayCellHighlight(index) {
    return this.page.$eval(`${this.arrayRow} .cell:nth-child(${index + 1})`, (el) =>
      el.classList.contains('highlight')
    );
  }

  async clickBucketCell(bucketIndex, cellIndex) {
    await this.page.click(`#buckets .bucket:nth-child(${bucketIndex + 1}) .stack .cell:nth-child(${cellIndex + 1})`);
  }

  async isErrorVisible() {
    return this.page.$eval(this.error, (el) => window.getComputedStyle(el).display !== 'none').catch(()=>false);
  }
}

test.describe('Radix Sort Visualizer (LSD) - End to End', () => {
  // Reuse page object across tests using new page per test from Playwright
  test.beforeEach(async ({ page }) => {
    // nothing global to set up beyond navigating to the page per test
    await page.goto(APP);
  });

  test('Initial load: UI renders default array, base, phase and emits startup console message', async ({ page }) => {
    // Verify initial UI state and console output
    const radix = new RadixPage(page);

    // Capture console messages and page errors
    const consoleMessages = [];
    const pageErrors1 = [];
    page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (err) => pageErrors.push(err));

    // Wait for the page script to initialize (it logs a message)
    await expect.poll(async () => {
      return consoleMessages.find((m) => /Radix Sort \(LSD\) Visualizer loaded/.test(m.text)) ? true : false;
    }, { timeout: 2000 }).toBeTruthy();

    // Assert no runtime page errors occurred during load
    expect(pageErrors.length).toBe(0);

    // Validate default array values displayed match the default input value
    const arrVals = await radix.getWorkingArrayValues();
    // default input "170,45,75,90,802,24,2,66"
    expect(arrVals.join(',')).toBe('170,45,75,90,802,24,2,66');

    // Validate base and phase/digit initial values shown
    const baseText = await radix.getCurBaseText();
    expect(baseText.trim()).toBe('10');

    const phaseText = await radix.getPhaseText();
    expect(phaseText.trim()).toBe('distribute'); // resetState sets phase to 'distribute' on non-empty array

    const digitText = await radix.getDigitPosText();
    expect(digitText.trim()).toBe('0'); // initial digit position 0

    // Message displays array size and max digits
    const message = await radix.getMessageText();
    expect(message).toContain('Array size: 8');
    expect(message).toContain('Max digits:');
  });

  test('Load button shows errors for invalid inputs (non-integer and negative) and for excessively large arrays', async ({ page }) => {
    const radix1 = new RadixPage(page);

    // Non-integer test
    await radix.setArrayInput('1.5,2');
    await radix.clickLoad();
    // Should display "Only integers allowed."
    await expect.poll(async () => (await radix.getErrorText()) || '').toContain('Only integers allowed.');

    // Negative number test
    await radix.setArrayInput('-1,2');
    await radix.clickLoad();
    await expect.poll(async () => (await radix.getErrorText()) || '').toContain('Negative numbers not supported');

    // Too large array (>80) test
    const many = new Array(81).fill(1).join(',');
    await radix.setArrayInput(many);
    await radix.clickLoad();
    await expect.poll(async () => (await radix.getErrorText()) || '').toContain('Array too large for visualization');
  });

  test('Random button populates array using randCount and updates working array size', async ({ page }) => {
    const radix2 = new RadixPage(page);

    // Set randCount to 6 and click Random
    await radix.setRandCount(6);
    await radix.clickRandom();

    // After random load, working array length should be 6
    await expect.poll(async () => {
      return (await radix.getArrayCellsCount()) === 6;
    }, { timeout: 2000 }).toBeTruthy();

    // Message should report the array size
    const message1 = await radix.getMessageText();
    expect(message).toContain('Array size: 6');
  });

  test('Step forward moves elements into buckets and then collects them back (distribution -> collection flow)', async ({ page }) => {
    const radix3 = new RadixPage(page);

    // Use a small deterministic array to assert step-by-step
    await radix.setArrayInput('2,66');
    await radix.clickLoad();

    // initial state check
    let working = await radix.getWorkingArrayValues();
    expect(working.join(',')).toBe('2,66');
    expect(await radix.getPhaseText()).toBe('distribute');
    expect(await radix.getDigitPosText()).toBe('0');

    // Step 1: distribute first element (2) to bucket 2
    await radix.clickStepForward();
    working = await radix.getWorkingArrayValues();
    // one element should remain in array
    expect(working.join(',')).toBe('66');

    // Bucket 2 should contain '2'
    const b2 = await radix.getBucketValuesByIndex(2);
    expect(b2).toEqual(['2']);

    // Step 2: distribute next element (66) to bucket 6
    await radix.clickStepForward();
    working = await radix.getWorkingArrayValues();
    // array should be empty
    expect(working.length).toBe(0);
    const b6 = await radix.getBucketValuesByIndex(6);
    expect(b6).toEqual(['66']);

    // Step 3: first collect should bring '2' back into working array (from bucket 2)
    await radix.clickStepForward();
    working = await radix.getWorkingArrayValues();
    expect(working.join(',')).toBe('2');

    // Step 4: collect should bring '66' back
    await radix.clickStepForward();
    working = await radix.getWorkingArrayValues();
    expect(working.join(',')).toBe('2,66');

    // After collection for digit 0 finishes, next phase should become 'distribute' for next digit (digitPos 1)
    // Wait for the UI to update digitPos and phase
    await expect.poll(async () => {
      return (await radix.getDigitPosText()).trim() === '1' && (await radix.getPhaseText()).trim() === 'distribute';
    }, { timeout: 2000 }).toBeTruthy();
  });

  test('Clicking array cells toggles highlight CSS class', async ({ page }) => {
    const radix4 = new RadixPage(page);

    // Use a small array and load
    await radix.setArrayInput('5,7,9');
    await radix.clickLoad();

    // Click first cell to toggle highlight on
    await radix.clickArrayCellAt(0);
    await expect.poll(async () => await radix.hasArrayCellHighlight(0), { timeout: 1000 }).toBeTruthy();

    // Click again to toggle off
    await radix.clickArrayCellAt(0);
    await expect.poll(async () => await radix.hasArrayCellHighlight(0) === false, { timeout: 1000 }).toBeTruthy();
  });

  test('Step back reverts previous micro-step to previous state (basic rewind behavior)', async ({ page }) => {
    const radix5 = new RadixPage(page);

    // Use small array for deterministic behavior
    await radix.setArrayInput('2,66');
    await radix.clickLoad();

    // Step forward once -> moves 2 to bucket 2
    await radix.clickStepForward();
    let working1 = await radix.getWorkingArrayValues();
    expect(working.join(',')).toBe('66');
    let b21 = await radix.getBucketValuesByIndex(2);
    expect(b2).toEqual(['2']);

    // Step back -> expected to revert to initial array [2,66] and empty buckets
    await radix.clickStepBack();

    // After step back, working array should match initial input
    await expect.poll(async () => (await radix.getWorkingArrayValues()).join(',') === '2,66', { timeout: 2000 }).toBeTruthy();

    // Buckets should be empty after rewind (bucket 2 should be empty)
    b2 = await radix.getBucketValuesByIndex(2);
    expect(b2.length).toBe(0);
  });

  test('Play/Pause toggles and full autoplay can complete sorting (ends in done phase)', async ({ page }) => {
    const radix6 = new RadixPage(page);

    // Use default array but reduce speed to accelerate test
    await radix.setSpeed(100); // reduce interval length used by the timer
    // Ensure base still 10
    await radix.setBase(10);

    // Start play
    await radix.togglePlayPause();

    // Wait for 'done' phase (sorting complete)
    await expect.poll(async () => (await radix.getPhaseText()).trim() === 'done', { timeout: 15000 }).toBeTruthy();

    // After done, array should be sorted ascending (string numeric sort)
    const result = (await radix.getWorkingArrayValues()).map((s) => Number(s));
    const sorted = [...result].slice().sort((a, b) => a - b);
    expect(result).toEqual(sorted);

    // Pause button should be in 'Play' state after auto-stop; clicking toggles play state
    // Toggle once to ensure clicking works without error
    await radix.togglePlayPause();
    // Play again and then pause immediately
    await radix.togglePlayPause();
  }, { timeout: 20000 });

  test('Clear button empties the input and sets UI to idle with no working array', async ({ page }) => {
    const radix7 = new RadixPage(page);

    await radix.setArrayInput('1,2,3');
    await radix.clickLoad();

    // Now click clear
    await radix.clickClear();

    // Working array should be empty and phase should be 'idle' and digit pos '-'
    await expect.poll(async () => (await radix.getArrayCellsCount()) === 0, { timeout: 2000 }).toBeTruthy();
    expect((await radix.getPhaseText()).trim()).toBe('idle');
    expect((await radix.getDigitPosText()).trim()).toBe('-');
  });

  test('Preset selection updates the input value and load button loads the preset', async ({ page }) => {
    const radix8 = new RadixPage(page);

    // Select the "Pi digits" preset (value attribute contains the array)
    await radix.selectPreset('3,1,4,1,5,9,2,6,5,3,5');

    // Ensure that array input has been updated to the preset value (select only changes input, not auto-load)
    const inputVal = await page.$eval('#arrayInput', (el) => el.value);
    expect(inputVal).toBe('3,1,4,1,5,9,2,6,5,3,5');

    // Now click load and verify working array matches
    await radix.clickLoad();
    await expect.poll(async () => (await radix.getArrayCellsCount()) === 11, { timeout: 2000 }).toBeTruthy();
  });

  test('Base change updates display and recomputes internal state (curBase shown)', async ({ page }) => {
    const radix9 = new RadixPage(page);

    // Set base to 2 and trigger change
    await radix.setBase(2);

    // curBase element should update immediately
    await expect.poll(async () => (await radix.getCurBaseText()).trim() === '2', { timeout: 1000 }).toBeTruthy();

    // DigitPos and phase should be recomputed; for the default array, still a digitPos >= 0 or '-'
    const curBase = await radix.getCurBaseText();
    expect(curBase.trim()).toBe('2');
  });

  test('Keyboard controls: ArrowRight triggers step forward and space toggles play/pause', async ({ page }) => {
    const radix10 = new RadixPage(page);

    await radix.setArrayInput('2,66');
    await radix.clickLoad();

    // Press ArrowRight to step forward
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await radix.getWorkingArrayValues()).join(',') === '66', { timeout: 2000 }).toBeTruthy();

    // Press Space to start/pause autoplay (toggle)
    await page.keyboard.press(' ');
    // Wait a short moment to allow toggle to occur (it changes button text)
    await page.waitForTimeout(200);
    // Toggle again to pause
    await page.keyboard.press(' ');
  });
});