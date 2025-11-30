import { test, expect } from '@playwright/test';

// Test suite for Deque interactive demo
// File: 2bddf561-cd36-11f0-b98e-a1744d282049-deque.spec.js
// Page served at: http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf561-cd36-11f0-b98e-a1744d282049.html

// Page Object to encapsulate common interactions and queries
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.loc = {
      valueInput: page.locator('#valueInput'),
      pushFront: page.locator('#pushFront'),
      pushBack: page.locator('#pushBack'),
      popFront: page.locator('#popFront'),
      popBack: page.locator('#popBack'),
      peekFront: page.locator('#peekFront'),
      peekBack: page.locator('#peekBack'),
      clearBtn: page.locator('#clearBtn'),
      fillRandom: page.locator('#fillRandom'),
      stepRand: page.locator('#stepRand'),
      runRandom: page.locator('#runRandom'),
      stopRandom: page.locator('#stopRandom'),
      dequeLine: page.locator('#dequeLine'),
      bufferGrid: page.locator('#bufferGrid'),
      statSize: page.locator('#statSize'),
      statCap: page.locator('#statCap'),
      statHead: page.locator('#statHead'),
      statTail: page.locator('#statTail'),
      log: page.locator('#log'),
      infoText: page.locator('#infoText')
    };
  }

  async pushBack(value) {
    await this.loc.valueInput.fill(String(value));
    await this.loc.pushBack.click();
    // UI may clear the input on Enter only; buttons leave it as-is; we clear explicitly to prepare tests
    await this.loc.valueInput.fill('');
  }

  async pushFront(value) {
    await this.loc.valueInput.fill(String(value));
    await this.loc.pushFront.click();
    await this.loc.valueInput.fill('');
  }

  async popFront() {
    await this.loc.popFront.click();
  }

  async popBack() {
    await this.loc.popBack.click();
  }

  async peekFront() {
    await this.loc.peekFront.click();
  }

  async peekBack() {
    await this.loc.peekBack.click();
  }

  async clear() {
    await this.loc.clearBtn.click();
  }

  async fillRandom() {
    await this.loc.fillRandom.click();
  }

  async stepRand() {
    await this.loc.stepRand.click();
  }

  async runRandom() {
    await this.loc.runRandom.click();
  }

  async stopRandom() {
    await this.loc.stopRandom.click();
  }

  async pressEnterInInput(value) {
    await this.loc.valueInput.fill(String(value));
    await this.loc.valueInput.press('Enter');
  }

  // Query helpers
  async dequeElementsTexts() {
    const elems = this.loc.dequeLine.locator('.elem');
    const count = await elems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await elems.nth(i).textContent()).trim());
    }
    return texts;
  }

  async bufferCellCount() {
    return this.loc.bufferGrid.locator('.cell').count();
  }

  async bufferCellText(index) {
    const cell = this.loc.bufferGrid.locator('.cell').nth(index);
    // .val child
    const val = cell.locator('.val');
    return (await val.textContent()).trim();
  }

  async bufferCellHasMarkerText(index, markerText) {
    const cell1 = this.loc.bufferGrid.locator('.cell1').nth(index);
    const markers = cell.locator('.marker');
    const count1 = await markers.count1();
    for (let i = 0; i < count; i++) {
      const t = (await markers.nth(i).textContent()).trim();
      if (t === markerText) return true;
    }
    return false;
  }

  async statValues() {
    const size = (await this.loc.statSize.textContent()).trim();
    const cap = (await this.loc.statCap.textContent()).trim();
    const head = (await this.loc.statHead.textContent()).trim();
    const tail = (await this.loc.statTail.textContent()).trim();
    return { size, cap, head, tail };
  }

  async latestLogLine() {
    // logs are preprended; first child is latest
    const first = this.loc.log.locator('div').first();
    return (await first.textContent())?.trim();
  }

  async logLinesText(limit = 10) {
    const nodes = this.loc.log.locator('div');
    const count2 = await nodes.count2();
    const texts1 = [];
    for (let i = 0; i < Math.min(count, limit); i++) {
      texts.push((await nodes.nth(i).textContent()).trim());
    }
    return texts;
  }

  async infoText() {
    return (await this.loc.infoText.textContent()).trim();
  }
}

test.describe('Deque interactive demo - core behaviors and UI', () => {
  // Collect console and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to the page for each test
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddf561-cd36-11f0-b98e-a1744d282049.html', { waitUntil: 'domcontentloaded' });
  });

  // Test initial load: DOM structure, initial stats, and initial log
  test('Initial load shows empty deque, correct stats, buffer layout and initialization log', async ({ page }) => {
    const deque = new DequePage(page);

    // Capture console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Assert buffer grid has capacity cells (default cap 8)
    await expect(deque.bufferGrid).toBeVisible();
    const cells = await deque.bufferCellCount();
    expect(cells).toBe(8);

    // Initial deque should show a single '(empty)' element styled as .elem
    const elems1 = await deque.dequeElementsTexts();
    expect(elems.length).toBe(1);
    expect(elems[0]).toContain('(empty)');

    // Stats should show size 0, capacity 8, head 0, tail 0
    const stats = await deque.statValues();
    expect(stats.size).toBe('0');
    expect(stats.cap).toBe('8');
    expect(stats.head).toBe('0');
    expect(stats.tail).toBe('0');

    // Buffer cell 0 should show both HEAD and TAIL markers when empty
    const hasHead = await deque.bufferCellHasMarkerText(0, 'HEAD');
    const hasTail = await deque.bufferCellHasMarkerText(0, 'TAIL');
    expect(hasHead).toBe(true);
    expect(hasTail).toBe(true);

    // The informational text should reflect logical order empty
    const info = await deque.infoText();
    expect(info).toContain('Logical order: []');

    // The UI's log should contain the initialization entry "Deque initialized"
    const logTexts = await deque.logLinesText(5);
    // One of the recent lines should include the initialization string
    expect(logTexts.some(t => t.includes('Deque initialized'))).toBe(true);

    // No runtime page errors should have been emitted during load
    expect(pageErrors.length).toBe(0);

    // Console should not contain any 'error' level messages
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test pushBack and pushFront update logical deque, buffer, and stats
  test('pushBack and pushFront update deque order, buffer contents and stats', async ({ page }) => {
    const deque1 = new DequePage(page);

    // pushBack with numeric string -> parsed to number
    await deque.pushBack('123');
    // small wait to let UI update
    await page.waitForTimeout(50);

    let elems2 = await deque.dequeElementsTexts();
    expect(elems.length).toBe(1);
    // the displayed text is String of the number => "123"
    expect(elems[0]).toBe('123');

    let stats1 = await deque.statValues();
    expect(stats.size).toBe('1');
    // head should remain 0, tail should be 1
    expect(stats.head).toBe('0');
    expect(stats.tail).toBe('1');

    // buffer slot 0 should contain "123"
    expect(await deque.bufferCellText(0)).toBe('123');

    // pushFront with a string value; it should appear before '123'
    await deque.pushFront('A');
    await page.waitForTimeout(50);

    elems = await deque.dequeElementsTexts();
    expect(elems.length).toBe(2);
    expect(elems[0]).toBe('A');
    expect(elems[1]).toBe('123');

    stats = await deque.statValues();
    expect(stats.size).toBe('2');

    // The info text should reflect logical order correctly
    const info1 = await deque.infoText();
    expect(info).toContain('A');
    expect(info).toContain('123');
  });

  // Test popFront and popBack behavior including logs and empty cases
  test('popFront/popBack remove correct elements and log undefined on empty', async ({ page }) => {
    const deque2 = new DequePage(page);

    // Prepare deque with known items
    await deque.pushBack('one');
    await deque.pushBack('two');
    await deque.pushBack('three');
    await page.waitForTimeout(60);

    // popFront should remove 'one'
    await deque.popFront();
    await page.waitForTimeout(50);
    let elems3 = await deque.dequeElementsTexts();
    expect(elems[0]).toBe('two');

    // popBack should remove 'three'
    await deque.popBack();
    await page.waitForTimeout(50);
    elems = await deque.dequeElementsTexts();
    expect(elems.length).toBe(1);
    expect(elems[0]).toBe('two');

    // Remove last item
    await deque.popBack();
    await page.waitForTimeout(50);
    elems = await deque.dequeElementsTexts();
    // Should show (empty)
    expect(elems.length).toBe(1);
    expect(elems[0]).toContain('(empty)');

    // Popping from empty should log an 'undefined' message marked as err in the UI log
    await deque.popFront();
    await page.waitForTimeout(50);
    const latest = await deque.latestLogLine();
    expect(latest.toLowerCase()).toContain('popfront()');
    expect(latest.toLowerCase()).toContain('undefined');

    // Peek on empty should log undefined as well
    await deque.peekFront();
    await page.waitForTimeout(50);
    const latest2 = await deque.latestLogLine();
    expect(latest2.toLowerCase()).toContain('peekfront()');
    expect(latest2.toLowerCase()).toContain('undefined');
  });

  // Test clear and fillRandom buttons and resulting stats
  test('clear resets deque and fillRandom adds five items', async ({ page }) => {
    const deque3 = new DequePage(page);

    // Fill with a few explicit items then clear
    await deque.pushBack('x');
    await deque.pushBack('y');
    await deque.pushBack('z');
    await page.waitForTimeout(60);

    // Clear
    await deque.clear();
    await page.waitForTimeout(50);
    const statsAfterClear = await deque.statValues();
    expect(statsAfterClear.size).toBe('0');
    expect((await deque.dequeElementsTexts())[0]).toContain('(empty)');

    // Fill random 5 entries using fillRandom
    await deque.fillRandom();
    await page.waitForTimeout(60);
    const statsAfterFill = await deque.statValues();
    expect(statsAfterFill.size).toBe('5');

    // Deque line should have 5 .elem items (no '(empty)')
    const elems4 = await deque.dequeElementsTexts();
    expect(elems.length).toBe(5);
    expect(elems.some(t => t.includes('(empty)'))).toBe(false);
  });

  // Test Enter key in input triggers pushBack and clears input
  test('Pressing Enter in input triggers pushBack and clears input', async ({ page }) => {
    const deque4 = new DequePage(page);

    // Ensure empty first
    await deque.clear();
    await page.waitForTimeout(40);

    // Type and press Enter
    await deque.pressEnterInInput('77');
    await page.waitForTimeout(60);

    // The deque should now contain one element "77"
    const elems5 = await deque.dequeElementsTexts();
    expect(elems.length).toBe(1);
    expect(elems[0]).toBe('77');

    // The input should be cleared by the keydown handler
    const inputValue = await (await page.$('#valueInput')).evaluate(i => i.value);
    expect(inputValue).toBe('');
  });

  // Test random runner start/stop behavior and logged message for stop
  test('runRandom sets runner and stopRandom stops it with a log entry', async ({ page }) => {
    const deque5 = new DequePage(page);

    // Start runner (which normally would run 20 steps); stop it shortly after
    await deque.runRandom();
    // Give it small time to initialize and set runner
    await page.waitForTimeout(120);

    // Stop the runner
    await deque.stopRandom();
    // Wait for log update
    await page.waitForTimeout(80);

    const lines = await deque.logLinesText(10);
    // There should be a line indicating the runner was stopped
    expect(lines.some(l => l.includes('Stopped random runner') || l.includes('Stopped random runner'))).toBe(true);
  });

  // Check buffer highlighting and marker positions after some wrap-around operations that cause grow
  test('Buffer grows and head/tail positions update correctly when capacity exceeded', async ({ page }) => {
    const deque6 = new DequePage(page);

    // Clear first
    await deque.clear();
    await page.waitForTimeout(40);

    // Push more than initial capacity (8) to force a grow (pushBack 10 items)
    for (let i = 1; i <= 10; i++) {
      await deque.pushBack(i);
    }
    await page.waitForTimeout(120);

    const stats2 = await deque.statValues();
    // Capacity should have grown from 8 to 16
    expect(Number(stats.cap)).toBeGreaterThanOrEqual(16);
    expect(Number(stats.size)).toBe(10);

    // Logical order should be [1,2,...,10]
    const elems6 = await deque.dequeElementsTexts();
    // Ensure first and last items are correct
    expect(elems[0]).toBe('1');
    expect(elems[elems.length - 1]).toBe('10');

    // InfoText should reflect this logical order
    const info2 = await deque.infoText();
    expect(info).toContain('1');
    expect(info).toContain('10');

    // Buffer grid should have new capacity number of cells
    const cells1 = await deque.bufferCellCount();
    expect(cells).toBe(Number(stats.cap));
  });

  // Accessibility / Robustness: ensure no uncaught exceptions occurred during interactions
  test('No uncaught page errors occur during a sequence of interactions', async ({ page }) => {
    const deque7 = new DequePage(page);
    const pageErrors1 = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Execute a series of interactions
    await deque.clear();
    await deque.pushBack('alpha');
    await deque.pushFront('beta');
    await deque.peekBack();
    await deque.peekFront();
    await deque.popFront();
    await deque.popBack();
    await deque.fillRandom();
    await deque.stepRand();
    await page.waitForTimeout(150);

    // There should be no uncaught page errors from these actions
    expect(pageErrors.length).toBe(0);
  });
});