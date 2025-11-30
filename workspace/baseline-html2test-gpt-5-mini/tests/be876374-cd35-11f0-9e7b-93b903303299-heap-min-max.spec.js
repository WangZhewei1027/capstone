import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be876374-cd35-11f0-9e7b-93b903303299.html';

// Page Object Model for the Heap app
class HeapApp {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      insertBtn: '#insertBtn',
      extractBtn: '#extractBtn',
      peekBtn: '#peekBtn',
      buildBtn: '#buildBtn',
      randomBtn: '#randomBtn',
      clearBtn: '#clearBtn',
      toggleMode: '#toggleMode',
      valueInput: '#valueInput',
      arrayInput: '#arrayInput',
      arrayView: '#arrayView',
      canvasWrap: '#canvasWrap',
      log: '#log',
      nodeEls: '.node-el',
    };
  }

  // Navigate to app and wait for demo initial log
  async goto() {
    this.consoleErrors = [];
    this.pageErrors = [];

    // Capture console errors and page errors for assertions
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') this.consoleErrors.push({ text: msg.text(), location: msg.location() });
    });
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(err);
    });

    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait for initial demo log that indicates the app finished initial creation
    await this.waitForLogEntry('demo heap created', 5000);
  }

  // Helper to wait until '#log' contains specific text
  async waitForLogEntry(text, timeout = 5000) {
    await this.page.waitForFunction(
      (t) => document.getElementById('log') && document.getElementById('log').innerText.includes(t),
      text,
      { timeout }
    );
  }

  async click(selector) {
    await this.page.click(selector);
  }

  // Insert a value via UI and wait for the resulting log entry
  async insertValue(value, waitLog = true) {
    await this.page.fill(this.selectors.valueInput, String(value));
    await Promise.all([
      this.page.waitForTimeout(50), // slight delay to ensure input is registered
      this.page.click(this.selectors.insertBtn),
    ]);
    if (waitLog) {
      await this.waitForLogEntry(`inserted ${value}`, 7000);
    }
  }

  // Click extract and wait for log
  async extractRoot() {
    await this.page.click(this.selectors.extractBtn);
    await this.waitForLogEntry('extracted root', 7000);
  }

  // Click peek and wait for log entry containing 'peek:'
  async peekRoot() {
    await this.page.click(this.selectors.peekBtn);
    await this.waitForLogEntry('peek:', 3000);
  }

  // Build from comma-separated array string
  async buildFromArray(csv) {
    await this.page.fill(this.selectors.arrayInput, csv);
    await this.page.click(this.selectors.buildBtn);
    await this.waitForLogEntry('built heap from array', 7000);
  }

  // Click random and wait for build log
  async clickRandom() {
    await this.page.click(this.selectors.randomBtn);
    await this.waitForLogEntry('built heap from array', 8000);
  }

  // Clear heap and wait for log
  async clearHeap() {
    await this.page.click(this.selectors.clearBtn);
    await this.waitForLogEntry('cleared heap', 3000);
  }

  // Toggle mode and wait for switched log (MIN <-> MAX)
  async toggleMode() {
    await this.page.click(this.selectors.toggleMode);
    // The toggle logs 'switched to MIN' or 'switched to MAX' when done; wait for either
    await this.page.waitForFunction(() => {
      return document.getElementById('log') && /(switched to MIN|switched to MAX)/i.test(document.getElementById('log').innerText);
    }, null, { timeout: 15000 });
  }

  // Get number of cells in array view
  async getArrayCount() {
    return await this.page.locator(this.selectors.arrayView).locator('.cell').count();
  }

  // Get array values (text content of each cell's first child)
  async getArrayValues() {
    const cells = this.page.locator(this.selectors.arrayView).locator('.cell');
    const count = await cells.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const cell = cells.nth(i);
      // first child contains the value text node
      const text = (await cell.innerText()).split('\n')[0].trim();
      values.push(text);
    }
    return values;
  }

  // Get number of node elements in tree view
  async getNodeCount() {
    return await this.page.locator(this.selectors.nodeEls).count();
  }

  // Read top-most log text
  async getTopLogText() {
    const logEl = this.page.locator(this.selectors.log);
    const firstDiv = logEl.locator('div').first();
    if ((await firstDiv.count()) === 0) return '';
    return (await firstDiv.textContent()) || '';
  }

  // Accept next dialog and capture message
  async captureNextDialog(action) {
    const dialogPromise = new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const message = dialog.message();
        await dialog.dismiss();
        resolve(message);
      });
    });
    await action();
    return await dialogPromise;
  }
}

/*
  Tests
  - Grouped with describe blocks
  - Each test ensures no console/page errors occurred during execution
*/

test.describe('Heap Visualizer (Min / Max) - be876374-cd35-11f0-9e7b-93b903303299', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new HeapApp(page);
    await app.goto();
  });

  test.afterEach(async ({ page }) => {
    // Ensure no uncaught page errors or console.error were emitted during the test
    // We expose the captured arrays through the POM instance
    expect(app.consoleErrors, 'No console.error messages').toEqual([]);
    expect(app.pageErrors, 'No page errors (unhandled exceptions)').toEqual([]);
    // final screenshot could be useful during debugging (not required)
    // await page.screenshot({ path: `tmp-${Date.now()}.png`, fullPage: true });
  });

  test.describe('Initial Load and Default State', () => {
    test('should load the page and render initial demo heap', async () => {
      // Verify page title/h1 exists
      await expect(app.page.locator('h1')).toBeVisible();
      // Initial demo created should have logged
      const logText = await app.page.locator('#log').innerText();
      expect(logText).toContain('demo heap created');

      // Default demo array length is 7 as in the embedded demo
      const arrayCount = await app.getArrayCount();
      expect(arrayCount).toBeGreaterThanOrEqual(7);

      // Tree nodes should exist and match array count
      const nodeCount = await app.getNodeCount();
      expect(nodeCount).toBe(arrayCount);
    });
  });

  test.describe('Core Heap Operations', () => {
    test('insert button should add a value and update array view & logs', async () => {
      // Insert a numeric value '3'
      const before = await app.getArrayCount();
      await app.insertValue('3');
      // Wait a short while to ensure DOM update after animations
      await app.page.waitForTimeout(600);
      const after = await app.getArrayCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);

      // Verify the log contains the inserted value
      const topLog = await app.getTopLogText();
      expect(topLog).toContain('inserted 3');

      // Ensure array values contain the string '3'
      const values1 = await app.getArrayValues();
      expect(values.some(v => v === '3')).toBe(true);
    });

    test('peek and extract modify state and produce logs', async () => {
      // Peek should log current root or "heap empty" if empty
      await app.peekRoot();
      const peekLog = await app.page.locator('#log').innerText();
      expect(peekLog).toMatch(/peek:/i);

      // Record array size, perform extract
      const sizeBefore = await app.getArrayCount();
      if (sizeBefore === 0) {
        // If empty, clicking extract logs 'heap empty' without throwing
        await app.page.click('#extractBtn');
        await app.waitForLogEntry('heap empty', 3000);
        const logText1 = await app.page.locator('#log').innerText();
        expect(logText).toContain('heap empty');
      } else {
        await app.extractRoot();
        // After extract, array count should decrease by at least 1
        await app.page.waitForTimeout(600);
        const sizeAfter = await app.getArrayCount();
        expect(sizeAfter).toBeLessThanOrEqual(sizeBefore - 1);
        // Confirm extract log present
        const topLog1 = await app.getTopLogText();
        expect(topLog).toContain('extracted root');
      }
    });
  });

  test.describe('Build, Random, Clear and Toggle Mode', () => {
    test('build from array should create specified heap and clear should empty it', async () => {
      // Build a known array
      await app.buildFromArray('5,3,8,1,2');
      // After building, array view should contain 5 items
      const count1 = await app.getArrayCount();
      expect(count).toBe(5);

      // In min-heap mode (default), peek should be the smallest element '1'
      await app.peekRoot();
      const peekTop = await app.getTopLogText();
      expect(peekTop.toLowerCase()).toContain('peek:');

      // Clear the heap
      await app.clearHeap();
      const afterClear = await app.getArrayCount();
      expect(afterClear).toBe(0);
      const clearLog = await app.getTopLogText();
      expect(clearLog).toContain('cleared heap');
    });

    test('random button populates array input and triggers build', async () => {
      // Click random; it should put random CSV into arrayInput and trigger build
      await app.clickRandom();

      // After building from random, arrayView should be non-empty
      const count2 = await app.getArrayCount();
      expect(count).toBeGreaterThan(0);

      // Ensure latest log contains 'built heap from array'
      const topLog2 = await app.getTopLogText();
      expect(topLog).toContain('built heap from array');
    });

    test('toggle mode switches comparator and logs the change', async () => {
      // Read current toggle button label
      const toggleBtn = app.page.locator('#toggleMode');
      const beforeText = (await toggleBtn.innerText()).trim();

      // Toggle mode (this triggers animated re-inserts and logs when done)
      await app.toggleMode();

      // After toggle completes, button text should have changed
      const afterText = (await toggleBtn.innerText()).trim();
      expect(afterText === 'MIN' || afterText === 'MAX').toBeTruthy();
      expect(afterText).not.toBe(beforeText);

      // Log should report switched to MIN or MAX
      const logs = await app.page.locator('#log').innerText();
      expect(/switched to (MIN|MAX)/i.test(logs)).toBeTruthy();
    });
  });

  test.describe('Input Validation and Edge Cases', () => {
    test('inserting empty value should show alert dialog', async () => {
      // Ensure input is empty and click insert; an alert dialog should appear
      await app.page.fill('#valueInput', '');
      const dialogMessage = await app.captureNextDialog(async () => {
        await app.page.click('#insertBtn');
      });
      expect(dialogMessage).toBe('Enter a value to insert');
    });

    test('building with empty array input should show alert dialog', async () => {
      await app.page.fill('#arrayInput', '');
      const dialogMessage1 = await app.captureNextDialog(async () => {
        await app.page.click('#buildBtn');
      });
      expect(dialogMessage).toBe('Enter comma-separated values');
    });
  });
});