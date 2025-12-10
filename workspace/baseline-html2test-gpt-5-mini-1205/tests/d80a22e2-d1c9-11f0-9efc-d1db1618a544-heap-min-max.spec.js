import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80a22e2-d1c9-11f0-9efc-d1db1618a544.html';

// Page object to encapsulate interactions and queries for the Heap visualizer
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.modeMin = page.locator('#modeMin');
    this.modeMax = page.locator('#modeMax');
    this.valueInput = page.locator('#valueInput');
    this.addBtn = page.locator('#addBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.pollBtn = page.locator('#pollBtn');
    this.arrayInput = page.locator('#arrayInput');
    this.buildBtn = page.locator('#buildBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.arrayView = page.locator('#arrayView');
    this.treeView = page.locator('#treeView');
    this.log = page.locator('#log');
    this.speed = page.locator('#speed');
    this.speedLabel = page.locator('#speedLabel');
    this.exInsert = page.locator('#exInsert');
    this.exHeapify = page.locator('#exHeapify');
    this.codeBlock = page.locator('#codeBlock');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure initial rendering finished
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Set animation speed (ms) and ensure label updates
  async setSpeed(ms) {
    await this.page.$eval('#speed', (el, v) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(ms));
    await expect(this.speedLabel).toHaveText(String(ms) + 'ms');
  }

  // Switch mode to 'min' or 'max'
  async setMode(mode) {
    if (mode === 'min') await this.modeMin.click();
    else await this.modeMax.click();
    // renderAll and log happen; wait a tick for DOM update
    await this.page.waitForTimeout(50);
  }

  // Insert value using UI Insert button
  async insertValue(value) {
    await this.valueInput.fill(String(value));
    await this.addBtn.click();
  }

  // Press Enter when value input is focused (should trigger insert)
  async pressEnterOnValue() {
    await this.valueInput.focus();
    await this.page.keyboard.press('Enter');
  }

  // Click peek & poll
  async peek() { await this.peekBtn.click(); }
  async poll() { await this.pollBtn.click(); }

  // Build from array input and click build
  async buildFromArray(text) {
    await this.arrayInput.fill(text);
    await this.buildBtn.click();
  }

  // Click randomize
  async randomize() { await this.randomBtn.click(); }

  // Click clear
  async clear() { await this.clearBtn.click(); }

  // Click demo insert and heapify
  async demoInsert() { await this.exInsert.click(); }
  async demoHeapify() { await this.exHeapify.click(); }

  // Get the array view numeric values in order
  async getArrayValues() {
    return await this.page.$$eval('#arrayView .cell', els => els.map(e => {
      const text = e.querySelector('div')?.textContent ?? '';
      return text.trim();
    }));
  }

  // Get number of array cells (or 0 if placeholder)
  async getArrayCellCount() {
    const cells = await this.page.$$('#arrayView .cell');
    return cells.length;
  }

  // Get tree node texts and their data-idx attributes
  async getTreeNodes() {
    return await this.page.$$eval('#treeView .node', nodes => nodes.map(n => ({
      idx: n.dataset.idx,
      text: n.childNodes && n.childNodes[0] ? (n.childNodes[0].textContent || '').trim() : (n.textContent || '').trim()
    })));
  }

  // Check if array view shows the '(empty)' placeholder
  async arrayShowsEmptyPlaceholder() {
    const placeholder = await this.page.locator('#arrayView .muted').first();
    return await placeholder.isVisible().catch(()=>false);
  }

  // Get log contents (top lines)
  async getLogText() { return await this.log.textContent(); }

  // Get highlighted elements in array/tree
  async hasHighlightedCell() {
    return (await this.page.$$('.cell.highlight')).length > 0;
  }
  async hasHighlightedNode() {
    return (await this.page.$$('.node.highlight')).length > 0;
  }

  // Helper: wait until root node (index 0) equals expected text
  async waitForRootValue(expected, opts = { timeout: 5000 }) {
    await this.page.waitForFunction((exp) => {
      const el = document.querySelector('.cell[data-idx="0"]');
      if(!el) return false;
      return (el.textContent || '').includes(exp);
    }, expected, opts);
  }

  // Helper: count nodes in tree
  async treeNodeCount() {
    return await this.page.$$eval('#treeView .node', nodes => nodes.length);
  }
}

test.describe('Heap (Min / Max) Visualizer - end-to-end', () => {
  let page;
  let heap;
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and page errors for assertions later
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    heap = new HeapPage(page);
    await heap.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial page load: title, default mode, empty heap and code block present', async () => {
    // Verify page title contains Heap
    await expect(page).toHaveTitle(/Heap \(Min \/ Max\) Visualizer/);

    // Default mode: Min selected (modeMin should not have 'secondary' class, modeMax should)
    await expect(heap.modeMin).not.toHaveClass(/secondary/);
    await expect(heap.modeMax).toHaveClass(/secondary/);

    // Array view should show empty placeholder
    const showsEmpty = await heap.arrayShowsEmptyPlaceholder();
    expect(showsEmpty).toBe(true);

    // Code block should be populated and include 'BinaryHeap'
    const codeText = await heap.codeBlock.textContent();
    expect(codeText).toMatch(/class BinaryHeap/);
    expect(codeText).toMatch(/_siftDown/);

    // Ensure no unexpected console errors or page errors occurred during initial load
    expect(consoleErrors.length, 'console error messages on load').toBe(0);
    expect(pageErrors.length, 'uncaught page errors on load').toBe(0);
  });

  test('Mode toggle updates UI classes and code example comparator', async () => {
    // Switch to Max-Heap mode and assert classes update
    await heap.setMode('max');

    // modeMax should no longer have 'secondary' class; modeMin should now have 'secondary'
    await expect(heap.modeMax).not.toHaveClass(/secondary/);
    await expect(heap.modeMin).toHaveClass(/secondary/);

    // Code block should now show comparator for max-heap
    const codeText = await heap.codeBlock.textContent();
    expect(codeText).toContain('(a,b) => b-a');

    // Switch back to min and verify comparator updated
    await heap.setMode('min');
    const codeText2 = await heap.codeBlock.textContent();
    expect(codeText2).toContain('(a,b) => a-b');
  });

  test('Insert, peek, poll flow with DOM updates and highlights', async () => {
    // Speed up animations to make the test run faster
    await heap.setSpeed(50);

    // Insert a single value and wait until root appears
    await heap.insertValue(42);
    await heap.waitForRootValue('42', { timeout: 2000 });

    // There should be exactly one cell
    expect(await heap.getArrayCellCount()).toBe(1);

    // Peek should log the top and flash highlight on root node/cell
    await heap.peek();
    // Immediately after peek, a highlight class is applied (it is removed after 400ms)
    expect(await heap.hasHighlightedCell()).toBe(true);

    // Poll should remove the root and return heap to empty
    await heap.poll();
    // Wait briefly to allow UI render
    await page.waitForTimeout(200);
    const isEmpty = await heap.arrayShowsEmptyPlaceholder();
    expect(isEmpty).toBe(true);

    // Log should contain peek and poll entries
    const logText = await heap.getLogText();
    expect(logText).toMatch(/peek ->/);
    expect(logText).toMatch(/poll ->/);

    // Ensure no uncaught console/page errors from these operations
    expect(consoleErrors.length, 'console errors during insert/peek/poll').toBe(0);
    expect(pageErrors.length, 'page errors during insert/peek/poll').toBe(0);
  });

  test('Build from array, demo heapify, demo insert sequence, randomize and clear buttons', async () => {
    // Speed up animations
    await heap.setSpeed(50);

    // Build from array using explicit build input
    await heap.buildFromArray('7,2,6,3,9,1');
    // Wait for render - buildFrom triggers renderAll(true) which skips additional logging but renders
    await page.waitForTimeout(100);
    // Tree should have 6 nodes
    expect(await heap.treeNodeCount()).toBe(6);

    // Root of min-heap built from that array should be 1 (min)
    const treeNodes = await heap.getTreeNodes();
    const rootNode = treeNodes.find(n => n.idx === '0');
    expect(rootNode).toBeTruthy();
    expect(rootNode.text).toBe('1');

    // Use the demo heapify button (should re-heapify same array) and verify root remains 1
    await heap.demoHeapify();
    await page.waitForTimeout(100);
    const nodesAfterDemo = await heap.getTreeNodes();
    const rootAfterDemo = nodesAfterDemo.find(n => n.idx === '0');
    expect(rootAfterDemo.text).toBe('1');

    // Demo insert sequence: reset heap and run example sequence, then verify root is the minimum value
    await heap.setMode('min');
    await heap.setSpeed(30);
    await heap.demoInsert();
    // Demo insert is animated; wait until final expected root appears (should be 6 for the example sequence)
    await heap.page.waitForFunction(() => {
      const el = document.querySelector('.cell[data-idx="0"]');
      return el && el.textContent && el.textContent.includes('6');
    }, null, { timeout: 5000 });

    const rootText = await page.$eval('.cell[data-idx="0"]', el => el.textContent || '');
    expect(rootText).toContain('6');

    // Randomize should create 10 values
    await heap.randomize();
    await page.waitForTimeout(100);
    expect(await heap.getArrayCellCount()).toBe(10);

    // Clear should reset to empty
    await heap.clear();
    await page.waitForTimeout(50);
    expect(await heap.arrayShowsEmptyPlaceholder()).toBe(true);

    // Ensure no console/page errors during these demo actions
    expect(consoleErrors.length, 'console errors during demo actions').toBe(0);
    expect(pageErrors.length, 'page errors during demo actions').toBe(0);
  });

  test('Edge cases: invalid input triggers alert, Enter key submits correctly', async () => {
    // Listen for dialogs and assert alert message for invalid number input
    const dialogs = [];
    page.on('dialog', dialog => {
      dialogs.push(dialog);
      dialog.accept();
    });

    // Enter invalid non-numeric string into numeric input and click Insert -> should alert
    await heap.valueInput.fill('not-a-number');
    await heap.addBtn.click();
    // Wait for popup handler
    await page.waitForTimeout(10);
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message()).toBe('Enter a valid number');

    // Now test pressing Enter on the value input triggers insert (use a numeric input)
    // Clear dialogs array
    dialogs.length = 0;
    await heap.valueInput.fill('55');
    await heap.pressEnterOnValue();

    // Wait for root to equal 55
    await heap.waitForRootValue('55', { timeout: 2000 });
    const root = await page.$eval('.cell[data-idx="0"]', el => el.textContent || '');
    expect(root).toContain('55');

    // Clean up by clearing heap
    await heap.clear();

    // Ensure no console/page errors captured during edge case tests
    expect(consoleErrors.length, 'console errors during edge case tests').toBe(0);
    expect(pageErrors.length, 'page errors during edge case tests').toBe(0);
  });

  test('Accessibility & DOM sanity checks: nodes and array indices match heap data', async () => {
    // Build an explicit array, then assert that data-idx indices are present and sequential
    await heap.buildFromArray('10,5,3,2,8');
    await page.waitForTimeout(50);

    const cells = await page.$$eval('#arrayView .cell', els => els.map(e => ({
      idx: e.dataset.idx,
      text: (e.querySelector('div')?.textContent || '').trim()
    })));
    // Assert number of cells matches 5
    expect(cells.length).toBe(5);

    // Indices should be '0','1','2','3','4' in order
    const indices = cells.map(c => c.idx);
    expect(indices).toEqual(['0','1','2','3','4']);

    // The tree nodes should also include the same indices
    const treeNodes = await heap.getTreeNodes();
    const treeIndices = treeNodes.map(n => n.idx);
    expect(treeIndices.sort()).toEqual(indices.sort());

    // Ensure no console/page errors from these checks
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Console and page error observation: assert no unexpected runtime errors', async () => {
    // This test explicitly ensures we captured and report console/page errors if any.
    // Interact a bit to exercise code paths
    await heap.setSpeed(40);
    await heap.insertValue(7);
    await heap.waitForRootValue('7', { timeout: 1500 });
    await heap.peek();
    await heap.poll();

    // Final assertions: there should be no console errors nor uncaught page errors.
    // If any exist, provide them in message to make debugging clearer.
    expect(consoleErrors.length, `Console error messages: ${consoleErrors.map(c => c.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });
});