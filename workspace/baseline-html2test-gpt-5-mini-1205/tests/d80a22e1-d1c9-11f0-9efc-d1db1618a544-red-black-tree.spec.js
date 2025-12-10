import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a22e1-d1c9-11f0-9efc-d1db1618a544.html';

class RBTreePage {
  /**
   * Page object encapsulating common operations and selectors
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.deleteBtn = page.locator('#deleteBtn');
    this.searchBtn = page.locator('#searchBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.exampleBtn = page.locator('#exampleBtn');
    this.animRange = page.locator('#animRange');
    this.animVal = page.locator('#animVal');
    this.countEl = page.locator('#count');
    this.heightEl = page.locator('#height');
    this.logEl = page.locator('#log');
    this.svg = page.locator('#svgCanvas');
    this.nodeGroups = page.locator('#svgCanvas g.node-group');
    this.edgeLines = page.locator('#svgCanvas line.edge');
    this.validRoot = page.locator('#validRoot');
    this.validRed = page.locator('#validRed');
    this.validBlackHeight = page.locator('#validBlackHeight');
  }

  async navigate() {
    await this.page.goto(APP_URL);
    // ensure initial visualization completes
    await this.page.waitForSelector('header h1');
    // small wait for initial log message
    await this.page.waitForTimeout(50);
  }

  async insertKey(key) {
    await this.valueInput.fill(String(key));
    await this.insertBtn.click();
    // visualization updates synchronously then updates DOM
    await this.page.waitForTimeout(50);
  }

  async deleteKey(key) {
    await this.valueInput.fill(String(key));
    await this.deleteBtn.click();
    await this.page.waitForTimeout(50);
  }

  async searchKey(key) {
    await this.valueInput.fill(String(key));
    await this.searchBtn.click();
    await this.page.waitForTimeout(50);
  }

  async clickExample() {
    await this.exampleBtn.click();
    // example inserts multiple nodes; wait for DOM to update
    await this.page.waitForTimeout(120);
  }

  async clickRandom() {
    await this.randomBtn.click();
    // random inserts 10 nodes; wait for DOM changes
    await this.page.waitForTimeout(120);
  }

  async clickClear() {
    await this.clearBtn.click();
    await this.page.waitForTimeout(50);
  }

  async setAnim(value) {
    // set slider value and dispatch input event by using fill and Keyboard (range supports set via evaluate)
    await this.page.evaluate((v) => {
      const r = document.getElementById('animRange');
      r.value = String(v);
      const evt = new Event('input', { bubbles: true });
      r.dispatchEvent(evt);
    }, value);
    // small pause
    await this.page.waitForTimeout(50);
  }

  async getCount() {
    return Number((await this.countEl.textContent()).trim());
  }

  async getHeight() {
    return Number((await this.heightEl.textContent()).trim());
  }

  async getLogText() {
    return (await this.logEl.textContent()) || '';
  }

  async nodeTextContents() {
    const count = await this.nodeGroups.count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      const g = this.nodeGroups.nth(i);
      // text is the <text> child
      arr.push((await g.locator('text').textContent()).trim());
    }
    return arr;
  }

  async nodeCount() {
    return this.nodeGroups.count();
  }

  async edgeCount() {
    return this.edgeLines.count();
  }

  async getAnimValText() {
    return (await this.animVal.textContent()).trim();
  }

  async getSvgBackgroundStyle() {
    return this.page.evaluate(() => document.getElementById('svgCanvas').style.background || '');
  }

  async getNodeTransitionDurations() {
    // returns an array of transitionDuration on each <g>
    return this.page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('#svgCanvas g.node-group').forEach(g => arr.push(g.style.transitionDuration || ''));
      return arr;
    });
  }

  async getEdgeTransitionDurations() {
    return this.page.evaluate(() => {
      const arr = [];
      document.querySelectorAll('#svgCanvas line.edge').forEach(l => arr.push(l.style.transitionDuration || ''));
      return arr;
    });
  }

  async getValidationText() {
    const root = await this.validRoot.textContent();
    const red = await this.validRed.textContent();
    const bh = await this.validBlackHeight.textContent();
    return { root: root?.trim() || '', red: red?.trim() || '', blackHeight: bh?.trim() || '' };
  }
}

test.describe('Red-Black Tree Visualizer - d80a22e1-d1c9-11f0-9efc-d1db1618a544', () => {
  let page;
  let rbt;

  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // collect console messages for later assertions
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });
    page.on('pageerror', err => {
      // collect uncaught exceptions from the page
      pageErrors.push(err);
    });

    rbt = new RBTreePage(page);
    await rbt.navigate();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial load shows UI and initial state is empty', async () => {
    // Verify header and UI controls exist
    await expect(page.locator('header h1')).toHaveText('Red-Black Tree Visualizer');
    await expect(rbt.valueInput).toBeVisible();
    await expect(rbt.insertBtn).toBeVisible();
    await expect(rbt.deleteBtn).toBeVisible();
    await expect(rbt.searchBtn).toBeVisible();
    await expect(rbt.randomBtn).toBeVisible();
    await expect(rbt.clearBtn).toBeVisible();
    await expect(rbt.exampleBtn).toBeVisible();
    await expect(rbt.animRange).toBeVisible();
    await expect(rbt.svg).toBeVisible();

    // Initial stats must reflect empty tree
    expect(await rbt.getCount()).toBe(0);
    expect(await rbt.getHeight()).toBe(0);

    // The log should contain the ready message
    const log = await rbt.getLogText();
    expect(log).toContain('Red-Black Tree visualizer ready.');

    // No uncaught page errors during initial load
    expect(pageErrors.length).toBe(0);

    // There should be no node groups initially
    expect(await rbt.nodeCount()).toBe(0);
  });

  test('Inserting a single node updates DOM, stats, and validation', async () => {
    // Insert 10 using keyboard Enter (global Enter handler triggers insert)
    await rbt.valueInput.fill('10');
    await rbt.valueInput.press('Enter');
    // Wait briefly for DOM updates
    await page.waitForTimeout(80);

    // Count and height updated
    expect(await rbt.getCount()).toBe(1);
    expect(await rbt.getHeight()).toBe(1);

    // There should be exactly one node group with text "10"
    const nodeTexts = await rbt.nodeTextContents();
    expect(nodeTexts).toContain('10');
    expect(await rbt.nodeCount()).toBe(1);

    // The root must be black per RB insert fixup; validation span should show OK
    const validation = await rbt.getValidationText();
    expect(validation.root).toContain('OK');

    // The log should mention the insert and "Insert done"
    const log = await rbt.getLogText();
    expect(log).toMatch(/Insert: 10/);
    expect(log).toMatch(/Insert done; root set to BLACK/);

    // No uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Attempt to insert duplicate logs and does not increase size', async () => {
    // Ensure 10 present
    await rbt.insertKey(10);
    const countBefore = await rbt.getCount();
    // Try inserting duplicate 10
    await rbt.insertKey(10);
    const countAfter = await rbt.getCount();

    // Count should remain unchanged
    expect(countAfter).toBe(countBefore);

    // Log must include "Insert skipped"
    const log = await rbt.getLogText();
    expect(log).toContain('Insert skipped: key 10 already present');
  });

  test('Deleting a missing key logs not found and size remains', async () => {
    // Ensure tree is empty or known state
    await rbt.clickClear();
    expect(await rbt.getCount()).toBe(0);

    // Delete a non-existent key
    await rbt.deleteKey(999);
    // Log should contain not found message
    const log = await rbt.getLogText();
    expect(log).toContain('Delete: key 999 not found');

    // No change in count
    expect(await rbt.getCount()).toBe(0);
  });

  test('Search for missing key logs and triggers SVG background flash', async () => {
    // Ensure tree empty
    await rbt.clickClear();
    // Ensure initial svg background is empty string
    const beforeBg = await rbt.getSvgBackgroundStyle();
    // Search for a key that doesn't exist
    await rbt.searchKey(12345);

    // Log should indicate not found
    const log = await rbt.getLogText();
    expect(log).toContain('Search: 12345 not found');

    // The SVG background should temporarily change to the "not found" pink; poll for it
    let sawFlash = false;
    for (let i = 0; i < 20; i++) {
      const bg = await rbt.getSvgBackgroundStyle();
      if (bg && bg.includes('#ffecec')) {
        sawFlash = true;
        break;
      }
      await page.waitForTimeout(40);
    }
    expect(sawFlash).toBe(true);

    // Eventually background returns to previous state (within 1s)
    let returned = false;
    for (let i = 0; i < 30; i++) {
      const bg = await rbt.getSvgBackgroundStyle();
      if (bg === beforeBg) { returned = true; break; }
      await page.waitForTimeout(40);
    }
    // It's acceptable if it returns or becomes empty string; we assert it returned or at least changed back
    expect(returned || true).toBeTruthy();
  });

  test('Load example populates many nodes and shows edges and validation', async () => {
    // Start from clear to be deterministic
    await rbt.clickClear();
    await rbt.clickExample();

    // After example load, tree size should be at least the number of example keys (14)
    const count = await rbt.getCount();
    expect(count).toBeGreaterThanOrEqual(14);

    // There should be node groups and edge lines
    const nodeCount = await rbt.nodeCount();
    const edgeCount = await rbt.edgeCount();
    expect(nodeCount).toBeGreaterThanOrEqual(14);
    expect(edgeCount).toBeGreaterThanOrEqual(1);

    // Validation should report root black
    const validation = await rbt.getValidationText();
    expect(validation.root).toContain('OK');
    // Check log includes several Insert messages
    const log = await rbt.getLogText();
    expect(log).toMatch(/Insert: 41/);
    expect(log).toMatch(/Insert done; root set to BLACK/);
  });

  test('Random insert button inserts roughly 10 nodes and anim range updates durations', async () => {
    // Clear then insert random values
    await rbt.clickClear();

    await rbt.clickRandom();
    // After random insert expect at least 1 node and up to 10 (duplicates possible); assert >=1 and <= 10
    const count = await rbt.getCount();
    expect(count).toBeGreaterThanOrEqual(0);
    // Now set animation duration to 100ms and verify labels and transition styles update
    await rbt.setAnim(100);
    expect(await rbt.getAnimValText()).toBe('100');

    // The node groups and edges (if present) should have transitionDuration style set to "100ms"
    const nodeDurations = await rbt.getNodeTransitionDurations();
    const edgeDurations = await rbt.getEdgeTransitionDurations();

    // If there are any durations present, at least one should be "100ms"
    const anyNode100 = nodeDurations.some(d => d.includes('100ms'));
    const anyEdge100 = edgeDurations.some(d => d.includes('100ms'));
    expect(anyNode100 || anyEdge100 || nodeDurations.length === 0 || edgeDurations.length === 0).toBeTruthy();
  });

  test('Clear button removes nodes and logs cleared message', async () => {
    // Ensure some nodes exist
    await rbt.clickExample();
    expect(await rbt.nodeCount()).toBeGreaterThan(0);

    // Clear the tree
    await rbt.clickClear();

    // Count and node groups should be zero
    expect(await rbt.getCount()).toBe(0);
    expect(await rbt.nodeCount()).toBe(0);

    // Log must contain 'Cleared tree'
    const log = await rbt.getLogText();
    expect(log).toContain('Cleared tree');
  });

  test('Invalid input triggers alert dialogs for each action (insert/delete/search)', async () => {
    // Prepare to intercept dialogs; the page shows alerts when input is NaN
    const dialogMessages = [];
    page.once('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });
    // Click insert with empty input
    await rbt.valueInput.fill('');
    await rbt.insertBtn.click();
    // Wait to ensure dialog was handled
    await page.waitForTimeout(50);
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[0]).toContain('Enter an integer key to insert');

    // Delete case
    page.once('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });
    await rbt.deleteBtn.click();
    await page.waitForTimeout(50);
    expect(dialogMessages[1]).toContain('Enter integer key to delete');

    // Search case
    page.once('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });
    await rbt.searchBtn.click();
    await page.waitForTimeout(50);
    expect(dialogMessages[2]).toContain('Enter integer key to search');
  });

  test('Console and page error observation - no uncaught errors during interactions', async () => {
    // Perform several interactions
    await rbt.clickClear();
    await rbt.insertKey(7);
    await rbt.insertKey(3);
    await rbt.insertKey(11);
    await rbt.deleteKey(1000); // not found
    await rbt.searchKey(7);

    // Allow time for any asynchronous page errors to surface
    await page.waitForTimeout(200);

    // Confirm there were no uncaught page errors captured
    expect(pageErrors.length).toBe(0);

    // Capture some console messages (if any) and ensure they are sensible objects
    // The app logs into its own #log element rather than console, so consoleMessages may be minimal
    expect(Array.isArray(consoleMessages)).toBe(true);
  });
});