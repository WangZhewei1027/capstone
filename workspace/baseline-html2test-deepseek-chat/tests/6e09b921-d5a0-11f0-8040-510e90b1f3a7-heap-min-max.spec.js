import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09b921-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for the Heap Visualizer page
class HeapPage {
  constructor(page) {
    this.page = page;
    // Controls
    this.minHeapBtn = page.locator('#minHeapBtn');
    this.maxHeapBtn = page.locator('#maxHeapBtn');
    this.valueInput = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.removeBtn = page.locator('#removeBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.clearBtn = page.locator('#clearBtn');

    // Displays
    this.treeContainer = page.locator('#treeContainer');
    this.arrayContainer = page.locator('#arrayContainer');
    this.logContent = page.locator('#logContent');
    this.heapExplanation = page.locator('#heapExplanation');
  }

  // Utility to get the array value cells (returns an array of strings)
  async getArrayValues() {
    // arrayContainer structure: possibly empty OR two child divs:
    // [ indexRow, valueRow ]
    const children = this.arrayContainer.locator('> div');
    const count = await children.count();
    if (count < 2) return [];
    const valueRow = children.nth(1);
    const valueCells = valueRow.locator('.array-cell');
    const n = await valueCells.count();
    const values = [];
    for (let i = 0; i < n; i++) {
      const text = await valueCells.nth(i).innerText();
      values.push(text.trim());
    }
    return values;
  }

  // Utility to get index cells (strings)
  async getIndexValues() {
    const children = this.arrayContainer.locator('> div');
    const count = await children.count();
    if (count < 2) return [];
    const indexRow = children.nth(0);
    const indexCells = indexRow.locator('.array-cell.index');
    const n = await indexCells.count();
    const idx = [];
    for (let i = 0; i < n; i++) {
      idx.push((await indexCells.nth(i).innerText()).trim());
    }
    return idx;
  }

  // Get all nodes text from tree
  async getTreeNodeValues() {
    const nodes = this.treeContainer.locator('.node');
    const n = await nodes.count();
    const vals = [];
    for (let i = 0; i < n; i++) {
      vals.push((await nodes.nth(i).innerText()).trim());
    }
    return vals;
  }

  // Insert value via input and click Insert
  async insertValue(value) {
    await this.valueInput.fill(String(value));
    await this.insertBtn.click();
  }

  // Insert value by pressing Enter
  async insertValueByEnter(value) {
    await this.valueInput.fill(String(value));
    await this.valueInput.press('Enter');
  }

  // Click random insert
  async insertRandom() {
    await this.randomBtn.click();
  }

  // Remove root
  async removeRoot() {
    await this.removeBtn.click();
  }

  // Clear heap
  async clearHeap() {
    await this.clearBtn.click();
  }

  // Switch to max heap
  async switchToMax() {
    await this.maxHeapBtn.click();
  }

  // Switch to min heap
  async switchToMin() {
    await this.minHeapBtn.click();
  }

  // Read log lines as array of strings
  async getLogLines() {
    const entries = this.logContent.locator('div');
    const n = await entries.count();
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push((await entries.nth(i).innerText()).trim());
    }
    return out;
  }
}

test.describe('Heap Visualization (Min/Max Heap) - 6e09b921-d5a0-11f0-8040-510e90b1f3a7', () => {
  let pageErrors;
  let consoleErrors;
  let consoleLogs;

  test.beforeEach(async ({ page }) => {
    // Capture page errors and console messages for assertions
    pageErrors = [];
    consoleErrors = [];
    consoleLogs = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') consoleErrors.push(text);
      consoleLogs.push({ type, text });
    });

    // Navigate to the application
    await page.goto(APP_URL);
    // Ensure the main control is present before tests continue
    await page.waitForSelector('#minHeapBtn', { state: 'visible' });
  });

  test.afterEach(async ({}) => {
    // After each test we will assert that there were no unexpected runtime page errors.
    // It's important to surface console errors (e.g., ReferenceError, TypeError) if they happen.
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  // Test initial load and default state
  test('Initial load shows controls and default Min Heap state', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Ensure Min Heap button is active by default
    await expect(heapPage.minHeapBtn).toHaveClass(/active/);
    await expect(heapPage.maxHeapBtn).not.toHaveClass(/active/);

    // Tree container should show "Heap is empty" when no values are present
    await expect(heapPage.treeContainer).toContainText('Heap is empty');

    // Array container should be empty (no index/value rows)
    const values = await heapPage.getArrayValues();
    expect(values.length).toBe(0);

    // Log should be empty initially
    const logs = await heapPage.getLogLines();
    expect(logs.length).toBe(0);

    // Input field should have placeholder and min/max attributes set
    await expect(heapPage.valueInput).toHaveAttribute('placeholder', 'Enter a number');
    await expect(heapPage.valueInput).toHaveAttribute('min', '0');
    await expect(heapPage.valueInput).toHaveAttribute('max', '99');
  });

  // Test insertion via Insert button and Enter key, and verify DOM updates + highlight
  test('Inserting values updates array and tree; root highlight appears after insert', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Insert 10 via Insert button
    await heapPage.insertValue(10);

    // Log should contain "Inserted 10"
    await page.waitForFunction(() => {
      const log = document.getElementById('logContent');
      return Array.from(log.children).some(e => e.textContent.includes('Inserted 10'));
    });
    const logsAfterFirst = await heapPage.getLogLines();
    expect(logsAfterFirst.some(l => l.includes('Inserted 10'))).toBeTruthy();

    // Array should show index 0 and value 10
    const indices = await heapPage.getIndexValues();
    expect(indices.length).toBe(1);
    expect(indices[0]).toBe('0');

    const values = await heapPage.getArrayValues();
    expect(values.length).toBe(1);
    expect(values[0]).toBe('10');

    // Tree should have one node with value 10
    const treeNodes = await heapPage.getTreeNodeValues();
    expect(treeNodes).toEqual(['10']);

    // The root should be highlighted briefly. Wait for a .node.highlight to appear.
    // The application adds the highlight after 100ms then removes after 1000ms.
    await page.waitForSelector('#treeContainer .node.highlight', { timeout: 1500 });

    // Now insert 5 by pressing Enter to test keyboard submission and heap ordering (min-heap)
    await heapPage.insertValueByEnter(5);

    // Wait until the logs include insertion of 5
    await page.waitForFunction(() => {
      const log = document.getElementById('logContent');
      return Array.from(log.children).some(e => e.textContent.includes('Inserted 5'));
    });

    // After inserting 5, because it's a min-heap, root should become 5
    const valuesAfterSecond = await heapPage.getArrayValues();
    expect(valuesAfterSecond.length).toBeGreaterThanOrEqual(2);
    // The first value in the array is the root (heap[0])
    expect(valuesAfterSecond[0]).toBe('5');

    // The tree should reflect two nodes (order can be tree layout, but heap invariant should hold)
    const treeNodesAfter = await heapPage.getTreeNodeValues();
    expect(treeNodesAfter.length).toBeGreaterThanOrEqual(2);
  });

  // Test removing the root reorders the heap and logs the removed root
  test('Removing root extracts correct value and updates display and log', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Prepare heap: insert 7 and 3 using UI
    await heapPage.insertValue(7);
    await page.waitForFunction(() => document.getElementById('logContent').children.length >= 1);
    await heapPage.insertValue(3);
    await page.waitForFunction(() => document.getElementById('logContent').children.length >= 2);

    // Ensure current root is 3 (min-heap)
    const preRemoveValues = await heapPage.getArrayValues();
    expect(preRemoveValues[0]).toBe('3');

    // Click remove root
    await heapPage.removeRoot();

    // Log should include "Removed root: 3"
    await page.waitForFunction(() => {
      return Array.from(document.getElementById('logContent').children).some(e => e.textContent.includes('Removed root:'));
    });
    const logs = await heapPage.getLogLines();
    expect(logs.some(l => /Removed root:\s*\d+/.test(l))).toBeTruthy();
    expect(logs.some(l => l.includes('Removed root: 3'))).toBeTruthy();

    // After removal, root should not be 3; and array length decreased by 1
    const postRemoveValues = await heapPage.getArrayValues();
    // If only one element remained it becomes empty; but our sequence had two then remove leaves one
    if (postRemoveValues.length > 0) {
      expect(postRemoveValues[0]).not.toBe('3');
    } else {
      // If empty, tree should show 'Heap is empty'
      await expect(heapPage.treeContainer).toContainText('Heap is empty');
    }
  });

  // Test Random insert adds a value and logs appropriately
  test('Insert Random button inserts a random value and log contains an Inserted entry', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Click random button
    await heapPage.insertRandom();

    // Wait for a log entry that starts with "Inserted " to appear
    await page.waitForFunction(() => {
      const log = document.getElementById('logContent');
      return Array.from(log.children).some(e => e.textContent.includes('Inserted '));
    }, null, { timeout: 2000 });

    const logs = await heapPage.getLogLines();
    expect(logs.some(l => l.includes('Inserted '))).toBeTruthy();

    // And array should reflect at least one value
    const values = await heapPage.getArrayValues();
    expect(values.length).toBeGreaterThanOrEqual(1);
    // Values are numeric strings; ensure parseable
    expect(values.every(v => !isNaN(Number(v)))).toBeTruthy();
  });

  // Test converting to Max Heap updates explanation and button classes and heap root becomes max
  test('Switching to Max Heap converts heap, updates explanation and button active state', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Build a set of values: 2, 9, 4
    await heapPage.insertValue(2);
    await heapPage.insertValue(9);
    await heapPage.insertValue(4);

    // Ensure min heap active initially
    await expect(heapPage.minHeapBtn).toHaveClass(/active/);

    // Now switch to Max Heap
    await heapPage.switchToMax();

    // Buttons should update classes
    await expect(heapPage.maxHeapBtn).toHaveClass(/active/);
    await expect(heapPage.minHeapBtn).not.toHaveClass(/active/);

    // Explanation should reference "Max Heap"
    await expect(heapPage.heapExplanation).toContainText('Max Heap');

    // Log should include a conversion entry
    const logs = await heapPage.getLogLines();
    expect(logs.some(l => l.includes('Converted to Max Heap') || l.includes('Converted to Max'))).toBeTruthy();

    // The displayed root in the array (heap[0]) should equal the max of displayed values
    const values = (await heapPage.getArrayValues()).map(s => Number(s));
    expect(values.length).toBeGreaterThanOrEqual(1);
    const displayedRoot = values[0];
    const actualMax = Math.max(...values);
    expect(displayedRoot).toBe(actualMax);
  });

  // Test clearing the heap and removing from an empty heap logs the correct message
  test('Clear Heap empties the heap and removing from empty heap logs a warning', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Insert a couple values
    await heapPage.insertValue(11);
    await heapPage.insertValue(22);

    // Clear the heap
    await heapPage.clearHeap();

    // Log should contain 'Cleared heap'
    await page.waitForFunction(() => Array.from(document.getElementById('logContent').children).some(e => e.textContent.includes('Cleared heap')));
    const logsAfterClear = await heapPage.getLogLines();
    expect(logsAfterClear.some(l => l.includes('Cleared heap'))).toBeTruthy();

    // Tree should report empty
    await expect(heapPage.treeContainer).toContainText('Heap is empty');

    // Now click remove on empty heap
    await heapPage.removeRoot();

    // Log should include 'Heap is empty!'
    await page.waitForFunction(() => Array.from(document.getElementById('logContent').children).some(e => e.textContent.includes('Heap is empty!')));
    const logsFinal = await heapPage.getLogLines();
    expect(logsFinal.some(l => l.includes('Heap is empty!'))).toBeTruthy();
  });

  // Accessibility and edge conditions: ensure controls exist and are interactable
  test('All interactive controls are present and operable', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Buttons should be visible and enabled
    await expect(heapPage.insertBtn).toBeVisible();
    await expect(heapPage.insertBtn).toBeEnabled();

    await expect(heapPage.removeBtn).toBeVisible();
    await expect(heapPage.removeBtn).toBeEnabled();

    await expect(heapPage.randomBtn).toBeVisible();
    await expect(heapPage.randomBtn).toBeEnabled();

    await expect(heapPage.clearBtn).toBeVisible();
    await expect(heapPage.clearBtn).toBeEnabled();

    // Input should accept numbers; try entering an out-of-range value and ensure it's reflected in the input element (browser-level validation not enforced here)
    await heapPage.valueInput.fill('123'); // beyond max attribute
    await expect(heapPage.valueInput).toHaveValue('123');

    // Clear input
    await heapPage.valueInput.fill('');
    await expect(heapPage.valueInput).toHaveValue('');
  });
});