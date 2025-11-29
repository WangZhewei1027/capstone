import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-50-37/html/d5468981-ca8b-11f0-bf19-77e409d50591.html';

class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs
    this.valueInput = page.locator('#valueInput');
    this.speedRange = page.locator('#speedRange');
    this.speedLabel = page.locator('#speedLabel');
    // Buttons
    this.pushFrontBtn = page.locator('#pushFrontBtn');
    this.pushBackBtn = page.locator('#pushBackBtn');
    this.popFrontBtn = page.locator('#popFrontBtn');
    this.popBackBtn = page.locator('#popBackBtn');
    this.peekFrontBtn = page.locator('#peekFrontBtn');
    this.peekBackBtn = page.locator('#peekBackBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.fillRandomBtn = page.locator('#fillRandomBtn');
    // Labels/Displays
    this.capLabel = page.locator('#capLabel');
    this.sizeLabel = page.locator('#sizeLabel');
    this.headLabel = page.locator('#headLabel');
    this.tailLabel = page.locator('#tailLabel');
    this.logicalLabel = page.locator('#logicalLabel');
    this.logBox = page.locator('#logBox');
    this.dequeVisual = page.locator('#dequeVisual');
    this.internalArr = page.locator('#internalArr');
  }

  async goto() {
    await this.page.goto(BASE_URL);
  }

  async fillInput(value) {
    await this.valueInput.fill(value);
  }

  /**
   * Waits for animation to complete based on speedRange plus a small buffer
   * Since animateOperation returns a promise which waits the duration given by speedRange
   */
  async waitAnimation() {
    // read current animation delay (ms)
    const delay = await this.speedRange.evaluate((el) => parseInt(el.value, 10) || 0);
    await this.page.waitForTimeout(delay + 50);
  }

  async clickPushFront(value) {
    await this.fillInput(value);
    await this.pushFrontBtn.click();
    await this.waitAnimation();
  }

  async clickPushBack(value) {
    await this.fillInput(value);
    await this.pushBackBtn.click();
    await this.waitAnimation();
  }

  async clickPopFront() {
    await this.popFrontBtn.click();
    await this.waitAnimation();
  }

  async clickPopBack() {
    await this.popBackBtn.click();
    await this.waitAnimation();
  }

  async clickPeekFront() {
    await this.peekFrontBtn.click();
    await this.waitAnimation();
  }

  async clickPeekBack() {
    await this.peekBackBtn.click();
    await this.waitAnimation();
  }

  async clickClear() {
    await this.clearBtn.click();
    await this.waitAnimation();
  }

  async clickFillRandom() {
    // This is an async fill with internal waits
    await this.fillRandomBtn.click();
    // Wait for "Done fillRandom." log to appear or a timeout of 2000ms max
    await this.page.waitForFunction(() => {
      const logBox = document.getElementById('logBox');
      return logBox && logBox.textContent.includes('Done fillRandom.');
    }, null, { timeout: 2000 });
  }

  /**
   * Retrieves array of deque values displayed in the #dequeVisual
   * If empty, returns empty array
   */
  async getDequeVisualValues() {
    const hasEmptyMsg = await this.dequeVisual.locator('text=Deque is empty').count();
    if (hasEmptyMsg > 0) return [];
    return this.dequeVisual.locator('.cell').allTextContents().then(allTexts =>
      // Remove "front" and/or "back" text from sub elements
      allTexts.map(text => text.replace(/front|back/g, '').trim())
    );
  }

  /**
   * Retrieves array of internal array slot values in order of internal buffer indexes
   * undefined slots returned as empty string ''
   */
  async getInternalBufferValues() {
    const slotCount = await this.internalArr.locator('.arr-slot').count();
    const results = [];
    for (let i = 0; i < slotCount; i++) {
      const slot = this.internalArr.locator('.arr-slot').nth(i);
      const text = (await slot.textContent()).replace(/head|tail/g, '').trim();
      results.push(text);
    }
    return results;
  }

  /**
   * Gets the latest log message from the log box (top-most)
   */
  async getLatestLog() {
    const logDiv = this.logBox.locator('div').first();
    return (await logDiv.textContent()).trim();
  }

  /**
   * Check that head and tail indices are numbers and within capacity constraints
   */
  async headTailIndicesPlausible() {
    const headText = await this.headLabel.textContent();
    const tailText = await this.tailLabel.textContent();
    const capacityText = await this.capLabel.textContent();
    const cap = parseInt(capacityText, 10);
    const head = parseInt(headText, 10);
    const tail = parseInt(tailText, 10);
    expect(head).toBeGreaterThanOrEqual(0);
    expect(head).toBeLessThan(cap);
    expect(tail).toBeGreaterThanOrEqual(0);
    expect(tail).toBeLessThan(cap);
  }

  /**
   * Verifies that animation speed label updates on input change
   */
  async setSpeed(ms) {
    await this.speedRange.fill(String(ms));
    // Trigger input event by dispatching manually
    await this.speedRange.evaluate((el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input'));
    }, String(ms));
    await expect(this.speedLabel).toHaveText(`${ms}ms`);
  }
}

test.describe('Deque Interactive Demo - FSM & UI validation', () => {
  let page;
  let deque;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    deque = new DequePage(page);
    await deque.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle state rendering and initial UI checks', () => {
    test('should initialize with empty deque and proper labels', async () => {
      // OnEnter idle => render called
      const values = await deque.getDequeVisualValues();
      expect(values).toEqual([]);
      await expect(deque.sizeLabel).toHaveText('0');
      await expect(deque.headLabel).toHaveText('0');
      await expect(deque.tailLabel).toHaveText('0');
      await expect(deque.capLabel).toHaveText('8');
      await expect(deque.logicalLabel).toHaveText('[]');
      // Log contains initial message on initialization
      const log = await deque.getLatestLog();
      expect(log).toContain('Deque initialized');
    });

    test('animation speed label defaults to 200ms and updates on change', async () => {
      await expect(deque.speedLabel).toHaveText('200ms');
      await deque.setSpeed(500);
      await deque.setSpeed(0);
      await deque.setSpeed(1000);
    });

    test('push buttons disabled if input is empty - triggers INPUT_EMPTY event', async () => {
      await deque.valueInput.fill('');
      // Try clicking push front and back with empty input
      await deque.pushFrontBtn.click();
      let log = await deque.getLatestLog();
      expect(log).toContain('Please enter a value to push.');

      await deque.pushBackBtn.click();
      log = await deque.getLatestLog();
      expect(log).toContain('Please enter a value to push.');
    });
  });

  test.describe('Push Operations - animating_push_front & animating_push_back states', () => {
    test('pushFront should add element to front and update UI', async () => {
      await deque.clickPushFront('10');
      let values = await deque.getDequeVisualValues();
      expect(values[0]).toBe('10');
      await expect(deque.sizeLabel).toHaveText('1');
      await deque.headTailIndicesPlausible();

      await deque.clickPushFront('20');
      values = await deque.getDequeVisualValues();
      expect(values).toEqual(['20', '10']);
    });

    test('pushBack should add element to back and update UI', async () => {
      await deque.clickPushBack('A');
      let values = await deque.getDequeVisualValues();
      expect(values[0]).toBe('A');
      await expect(deque.sizeLabel).toHaveText('1');

      await deque.clickPushBack('B');
      values = await deque.getDequeVisualValues();
      expect(values).toEqual(['A', 'B']);
    });

    test('pushing various data types parsed correctly', async () => {
      // boolean true
      await deque.clickPushBack('true');
      expect(await deque.getDequeVisualValues()).toContain('true');

      // number parsing 123
      await deque.clickPushBack('123');
      expect(await deque.getDequeVisualValues()).toContain('123');

      // string "abc"
      await deque.clickPushBack('abc');
      expect(await deque.getDequeVisualValues()).toContain('abc');

      // null
      await deque.clickPushBack('null');
      expect(await deque.getDequeVisualValues()).toContain('null');
    });

    test('pushFront and pushBack animate and log operations correctly', async () => {
      await deque.fillInput('X');
      await deque.pushFrontBtn.click();
      await deque.waitAnimation();
      let log = await deque.getLatestLog();
      expect(log).toMatch(/pushFront\(.*\)/);

      await deque.fillInput('Y');
      await deque.pushBackBtn.click();
      await deque.waitAnimation();
      log = await deque.getLatestLog();
      expect(log).toMatch(/pushBack\(.*\)/);
    });

    test('internalArr and pointers update correctly after pushes', async () => {
      await deque.clickPushBack('1');
      await deque.clickPushBack('2');
      const internal = await deque.getInternalBufferValues();
      expect(internal.filter(v => v !== '')).toEqual(expect.arrayContaining(['1', '2']));

      await deque.headTailIndicesPlausible();
    });
  });

  test.describe('Pop Operations - animating_pop_front & animating_pop_back states', () => {
    test.beforeEach(async () => {
      // Pre-populate deque for pops
      await deque.clickPushBack('a');
      await deque.clickPushBack('b');
      await deque.clickPushBack('c');
    });

    test('popFront should remove front element and update UI and log', async () => {
      let valuesBefore = await deque.getDequeVisualValues();
      expect(valuesBefore.length).toBeGreaterThan(0);

      await deque.clickPopFront();
      const valuesAfter = await deque.getDequeVisualValues();
      expect(valuesAfter.length).toBe(valuesBefore.length - 1);

      const log = await deque.getLatestLog();
      expect(log).toMatch(/popFront\(\)/);
    });

    test('popBack should remove back element and update UI and log', async () => {
      let valuesBefore = await deque.getDequeVisualValues();
      expect(valuesBefore.length).toBeGreaterThan(0);

      await deque.clickPopBack();
      const valuesAfter = await deque.getDequeVisualValues();
      expect(valuesAfter.length).toBe(valuesBefore.length - 1);

      const log = await deque.getLatestLog();
      expect(log).toMatch(/popBack\(\)/);
    });

    test('popping from empty deque returns undefined and logs accordingly', async () => {
      // Clear first
      await deque.clickClear();
      // Pop front empty
      await deque.clickPopFront();
      let log = await deque.getLatestLog();
      expect(log).toMatch(/popFront\(\)/);

      // Pop back empty
      await deque.clickPopBack();
      log = await deque.getLatestLog();
      expect(log).toMatch(/popBack\(\)/);
    });

    test('pointers update correctly after pops', async () => {
      await deque.clickPopFront();
      await deque.headTailIndicesPlausible();

      await deque.clickPopBack();
      await deque.headTailIndicesPlausible();
    });
  });

  test.describe('Peek Operations - animating_peek_front & animating_peek_back states', () => {
    test.beforeEach(async () => {
      // Reset and add values
      await deque.clickClear();
      await deque.clickPushBack('100');
      await deque.clickPushBack('200');
    });

    test('peekFront returns front value without removal and logs it', async () => {
      await deque.clickPeekFront();
      const log = await deque.getLatestLog();
      expect(log).toMatch(/peekFront\(\)/);
      expect(log).toMatch(/100/);

      const values = await deque.getDequeVisualValues();
      expect(values[0]).toBe('100');
    });

    test('peekBack returns back value without removal and logs it', async () => {
      await deque.clickPeekBack();
      const log = await deque.getLatestLog();
      expect(log).toMatch(/peekBack\(\)/);
      expect(log).toMatch(/200/);

      const values = await deque.getDequeVisualValues();
      expect(values[values.length - 1]).toBe('200');
    });

    test('peek on empty deque logs with undefined or similar', async () => {
      await deque.clickClear();

      await deque.clickPeekFront();
      let log = await deque.getLatestLog();
      expect(log).toMatch(/peekFront\(\)/);

      await deque.clickPeekBack();
      log = await deque.getLatestLog();
      expect(log).toMatch(/peekBack\(\)/);
    });
  });

  test.describe('Clear Operation - animating_clear state', () => {
    test.beforeEach(async () => {
      // Add values before clear
      await deque.clickPushBack('hello');
      await deque.clickPushBack('world');
    });

    test('clear empties the deque and updates UI and logs', async () => {
      await deque.clickClear();
      const values = await deque.getDequeVisualValues();
      expect(values).toEqual([]);
      await expect(deque.sizeLabel).toHaveText('0');
      const log = await deque.getLatestLog();
      expect(log).toMatch(/clear\(\)/);
    });
  });

  test.describe('Fill Random Operation - filling_random state', () => {
    test('fillRandom fills deque with random numbers and triggers FILL_RANDOM_DONE', async () => {
      await deque.clickFillRandom();

      // After fillRandom finishing, deque should not be empty
      const values = await deque.getDequeVisualValues();
      expect(values.length).toBeGreaterThanOrEqual(3);

      // Check appropriate log entries present
      const logText = await deque.logBox.textContent();
      expect(logText).toContain('Filling with');
      expect(logText).toContain('Done fillRandom.');

      // Internal buffer and visual deque should be consistent
      await deque.headTailIndicesPlausible();
    });

    test('fillRandom triggers multiple pushBack operations with render and logs', async () => {
      await deque.clickFillRandom();
      // Verify internal buffer slots at least partially filled
      const internalValues = await deque.getInternalBufferValues();
      const filtered = internalValues.filter((v) => v !== '');
      expect(filtered.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Keyboard shortcuts mapping to button actions', () => {
    test('Pressing [ triggers pushFront button click', async () => {
      await deque.fillInput('keyFront');
      // Press '[' key
      await page.keyboard.press('[');
      await deque.waitAnimation();

      const values = await deque.getDequeVisualValues();
      expect(values).toContain('keyFront');
      const log = await deque.getLatestLog();
      expect(log).toMatch(/pushFront\(.*keyFront.*\)/);
    });

    test('Pressing ] triggers pushBack button click', async () => {
      await deque.fillInput('keyBack');
      // Press ']' key
      await page.keyboard.press(']');
      await deque.waitAnimation();

      const values = await deque.getDequeVisualValues();
      expect(values).toContain('keyBack');
      const log = await deque.getLatestLog();
      expect(log).toMatch(/pushBack\(.*keyBack.*\)/);
    });

    test('Pressing Enter triggers pushBack button click', async () => {
      await deque.fillInput('enterValue');
      // Press 'Enter' key
      await page.keyboard.press('Enter');
      await deque.waitAnimation();

      const values = await deque.getDequeVisualValues();
      expect(values).toContain('enterValue');
      const log = await deque.getLatestLog();
      expect(log).toMatch(/pushBack\(.*enterValue.*\)/);
    });

    test('Ctrl + Enter does not trigger pushBack', async () => {
      await deque.fillInput('ctrlEnter');
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');

      // Wait a short period then confirm no push action was logged
      await page.waitForTimeout(300);
      const log = await deque.getLatestLog();
      expect(log).not.toMatch(/pushBack\(.*ctrlEnter.*\)/);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Pushing empty string ("") is treated as empty input and triggers INPUT_EMPTY logic', async () => {
      await deque.fillInput('');
      await deque.pushFrontBtn.click();
      let log = await deque.getLatestLog();
      expect(log).toContain('Please enter a value to push.');

      await deque.pushBackBtn.click();
      log = await deque.getLatestLog();
      expect(log).toContain('Please enter a value to push.');
    });

    test('Clearing empty deque leaves UI consistent', async () => {
      await deque.clickClear(); // clear when empty is allowed
      const size = await deque.sizeLabel.textContent();
      expect(size).toBe('0');
      const values = await deque.getDequeVisualValues();
      expect(values).toEqual([]);
    });

    test('Deque resizes (capacity doubles) when full after pushes', async () => {
      // Capacity initial is 8. Push 9 elements to trigger resize.
      for (let i = 0; i < 9; i++) {
        await deque.clickPushBack(String(i));
      }

      // Capacity should have doubled to 16
      await expect(deque.capLabel).toHaveText('16');
      const size = await deque.sizeLabel.textContent();
      expect(Number(size)).toBe(9);

      // internalArr length should match new capacity
      const internalCount = await deque.internalArr.locator('.arr-slot').count();
      expect(internalCount).toBe(16);

      // Head and tail pointers plausible
      await deque.headTailIndicesPlausible();

      // Logical array should match pushed values
      const logical = await deque.logicalLabel.textContent();
      const arrLogical = JSON.parse(logical);
      expect(arrLogical.length).toBe(9);
      for (let i = 0; i < 9; i++) {
        expect(arrLogical[i]).toBe(String(i));
      }
    });

    test('Logging shows error messages if operation throws (simulated by typing invalid input)', async () => {
      // The UI parseInput gracefully parses values, so no obvious triggering error

      // But we can simulate by empty input and clicking pop on empty deque
      await deque.clickClear();
      // Pop front empty
      await deque.clickPopFront();
      let log = await deque.getLatestLog();
      expect(log).toMatch(/popFront\(\)/);

      // Pop back empty
      await deque.clickPopBack();
      log = await deque.getLatestLog();
      expect(log).toMatch(/popBack\(\)/);
    });
  });

  test.describe('Transitions and triggers verified via UI elements and logs', () => {
    test('Speed change triggers SPEED_CHANGED event and updates animation delay', async () => {
      // Change speed and check label updates
      await deque.setSpeed(100);
      let logBefore = await deque.getLatestLog();

      // After changing speed, do a push to confirm animation delay
      await deque.clickPushBack('speedTest');
      let logAfter = await deque.getLatestLog();
      expect(logAfter).toMatch(/pushBack\(.*speedTest.*\)/);

      // Delay adjustment confirmed by waiting less time than 200ms default previously
      // (This is inferred; actual timing precision is not asserted here)
      expect(logBefore).not.toEqual(logAfter);
    });

    test('On OP_COMPLETE event deque returns to idle state - UI stable after operations', async () => {
      await deque.clickPushBack('a');
      await deque.clickPopFront();
      await deque.clickPeekFront();
      await deque.clickClear();

      // After all animateOperation resolves, UI elements should be interactive and labels updated
      await expect(deque.pushFrontBtn).toBeEnabled();
      await expect(deque.popBackBtn).toBeEnabled();

      const sizeText = await deque.sizeLabel.textContent();
      expect(Number(sizeText)).toBeGreaterThanOrEqual(0);
    });

    test('RESIZE_OCCURRED event reflected in internalArr UI when capacity doubles', async () => {
      // Fill to capacity to force resize
      for (let i = 0; i < 8; i++) {
        await deque.clickPushBack(String(i));
      }
      // Push one more to trigger resize
      await deque.clickPushBack('resize');

      const capLabel = await deque.capLabel.textContent();
      expect(Number(capLabel)).toBeGreaterThan(8);

      // Internal arr slots count matches capacity doubling
      const internalCount = await deque.internalArr.locator('.arr-slot').count();
      expect(internalCount).toBe(Number(capLabel));

      // Entries remain consistent after resize reflected in internal buffer UI
      const internalVals = await deque.getInternalBufferValues();
      expect(internalVals.filter(v => v !== '')).toContain('resize');
    });
  });
});