import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f766e5e1-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Heap page to encapsulate interactions and queries
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#nodeValue');
    this.insertButton = page.locator('button', { hasText: 'Insert' });
    this.removeButton = page.locator('button', { hasText: 'Remove Root' });
    this.container = page.locator('#heap-container');
    this.nodeLocator = this.container.locator('.heap-node');
  }

  // Navigate to the app and wait for the main elements
  async goto() {
    await this.page.goto(APP_URL);
    await expect(this.input).toBeVisible();
    await expect(this.insertButton).toBeVisible();
    await expect(this.removeButton).toBeVisible();
    await expect(this.container).toBeVisible();
  }

  // Insert a value via the UI (types into input and clicks insert)
  async insertValue(value) {
    // Clear and type. If value is undefined we intentionally do nothing to simulate empty input.
    if (value !== undefined) {
      await this.input.fill(String(value));
    } else {
      // Ensure input is empty for edge-case test
      await this.input.fill('');
    }
    await this.insertButton.click();
  }

  // Click remove root button
  async removeRoot() {
    await this.removeButton.click();
  }

  // Get count of heap nodes visible
  async getNodeCount() {
    return await this.nodeLocator.count();
  }

  // Get text content of nth node (0-based). Returns string.
  async getNodeTextAt(index) {
    const locator = this.nodeLocator.nth(index);
    return (await locator.textContent())?.trim() ?? '';
  }

  // Get array of all node texts in order rendered
  async getAllNodeTexts() {
    const count = await this.getNodeCount();
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(await this.getNodeTextAt(i));
    }
    return result;
  }
}

// Grouping tests related to the Heap FSM: states and transitions
test.describe('Min/Max Heap Visualization - FSM states & transitions', () => {
  // Collect console messages and page errors for each test so we can assert no runtime errors occurred
  test.beforeEach(async ({ page }) => {
    // Improve test reliability by handling console events (collected in the test via closures)
  });

  // Test the initial Idle state: controls present and heap container empty
  test('Initial Idle state: controls visible and heap empty', async ({ page }) => {
    // Collect console and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const heap = new HeapPage(page);
    await heap.goto();

    // Verify the input and buttons are present and empty heap is rendered
    await expect(heap.input).toBeVisible();
    await expect(heap.insertButton).toBeVisible();
    await expect(heap.removeButton).toBeVisible();

    const count = await heap.getNodeCount();
    // FSM S0_Idle should show empty heap on initial load
    expect(count).toBe(0);

    // Assert no uncaught page errors occurred during initial load
    expect(pageErrors.length).toBe(0);

    // Assert there are no console error-level messages
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test InsertValue transition: inserting a value updates visualization (S0 -> S1)
  test('InsertValue transition adds node and triggers render (S0_Idle -> S1_ValueInserted)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const heap = new HeapPage(page);
    await heap.goto();

    // Insert value 10 and verify visualization updated
    await heap.insertValue(10);

    // After insertion, expect one node with value '10'
    await expect(heap.nodeLocator).toHaveCount(1);
    const text = await heap.getNodeTextAt(0);
    expect(text).toBe('10');

    // The FSM entry actions for S1_ValueInserted include minHeap.insert(value) and render()
    // We validate that render happened by observing DOM changes (node exists with correct value)
    // Ensure no runtime errors
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test ordering behavior after multiple inserts (min-heap property)
  test('Min-heap ordering after multiple inserts: root is minimum value', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const heap = new HeapPage(page);
    await heap.goto();

    // Insert a set of values; order of insertion will test bubbleUp logic
    const values = [5, 3, 8, 1];
    for (const v of values) {
      await heap.insertValue(v);
    }

    // There should be 4 nodes
    await expect(heap.nodeLocator).toHaveCount(4);

    // The root (first rendered node) should be the minimum value (1)
    const rootText = await heap.getNodeTextAt(0);
    expect(Number(rootText)).toBe(1);

    // Also verify all inserted values are present (as text), count matches
    const allTexts = await heap.getAllNodeTexts();
    const asNumbers = allTexts.map(t => Number(t));
    values.forEach(v => {
      expect(asNumbers).toContain(v);
    });

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Test RemoveRoot transition removes the root and updates visualization (S0 -> S2)
  test('RemoveRoot transition removes root and updates heap visualization (S0_Idle -> S2_RootRemoved)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const heap = new HeapPage(page);
    await heap.goto();

    // Setup: insert several values
    await heap.insertValue(20);
    await heap.insertValue(7);
    await heap.insertValue(15);

    // Confirm initial count and root
    await expect(heap.nodeLocator).toHaveCount(3);
    const initialRoot = Number(await heap.getNodeTextAt(0));

    // Click remove root
    await heap.removeRoot();

    // After removal, count should decrease by 1
    await expect(heap.nodeLocator).toHaveCount(2);

    // New root should be the next smallest among remaining values
    const remainingTexts = await heap.getAllNodeTexts();
    const remainingNumbers = remainingTexts.map(t => Number(t));
    // The removed value should not be present
    expect(remainingNumbers).not.toContain(initialRoot);

    // The FSM S2_RootRemoved entry actions include minHeap.remove() and render()
    // We validated the DOM changed (node removed) implying render executed
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Edge case: clicking Insert with empty input -> observe behavior (this app converts empty to 0 via Number('') === 0)
  test('Edge case: clicking Insert with empty input inserts 0 (observed behavior)', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const heap = new HeapPage(page);
    await heap.goto();

    // Ensure input is empty and click Insert (no value typed)
    await heap.insertValue(undefined); // undefined indicates we intentionally leave input blank

    // The implementation uses Number(input.value) without guarding empty string specially,
    // so Number('') === 0 and the code will insert 0. We assert this observed behavior.
    await expect(heap.nodeLocator).toHaveCount(1);
    const text = await heap.getNodeTextAt(0);
    expect(text).toBe('0'); // This documents the current behavior (could be considered a bug)

    // No runtime errors expected
    expect(pageErrors.length).toBe(0);
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  // Edge case: removing root when heap is empty should be a no-op and must not throw any errors
  test('Edge case: removing root on empty heap does not throw and leaves heap empty', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const heap = new HeapPage(page);
    await heap.goto();

    // Ensure heap is empty to start
    await expect(heap.nodeLocator).toHaveCount(0);

    // Click remove root on empty heap
    await heap.removeRoot();

    // Still empty and no uncaught exceptions
    await expect(heap.nodeLocator).toHaveCount(0);
    expect(pageErrors.length).toBe(0);

    // No console error-level messages
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });
});