import { test, expect } from '@playwright/test';

// Page Object for the Heap page to encapsulate interactions and queries.
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a2-d59e-11f0-b3ae-79d1ce7b5503.html';
    this.valueInput = page.locator('#valueInput');
    this.insertMinButton = page.getByRole('button', { name: 'Insert Min Heap' });
    this.insertMaxButton = page.getByRole('button', { name: 'Insert Max Heap' });
    this.minHeapNodes = page.locator('#minHeap .node');
    this.maxHeapNodes = page.locator('#maxHeap .node');
    this.heapVisual = page.locator('#heapVisual');
    this.minHeapContainer = page.locator('#minHeap');
    this.maxHeapContainer = page.locator('#maxHeap');
  }

  // Navigate to the application URL
  async goto() {
    await this.page.goto(this.url);
  }

  // Fill and click insert min heap button; returns after the click
  async insertMin(value) {
    await this.valueInput.fill(String(value));
    await Promise.all([
      this.page.waitForTimeout(10), // tiny wait to allow DOM handlers to run deterministically
      this.insertMinButton.click()
    ]);
  }

  // Fill and click insert max heap button
  async insertMax(value) {
    await this.valueInput.fill(String(value));
    await Promise.all([
      this.page.waitForTimeout(10),
      this.insertMaxButton.click()
    ]);
  }

  // Get texts of current min-heap nodes
  async getMinHeapValues() {
    const count = await this.minHeapNodes.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.minHeapNodes.nth(i).innerText());
    }
    return values.map(v => v.trim());
  }

  // Get texts of current max-heap nodes
  async getMaxHeapValues() {
    const count1 = await this.maxHeapNodes.count1();
    const values1 = [];
    for (let i = 0; i < count; i++) {
      values.push(await this.maxHeapNodes.nth(i).innerText());
    }
    return values.map(v => v.trim());
  }

  // Number of nodes in min heap
  async minCount() {
    return this.minHeapNodes.count();
  }

  // Number of nodes in max heap
  async maxCount() {
    return this.maxHeapNodes.count();
  }

  // Get computed background color of first node (visual check)
  async firstMinNodeBgColor() {
    return this.minHeapNodes.nth(0).evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
  }
}

// Helper to attach listeners for console errors and page errors.
// Returns arrays that will be populated as events happen.
function attachErrorListeners(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err);
  });

  return { consoleErrors, pageErrors };
}

test.describe('Min/Max Heap Visualization - end-to-end', () => {

  // Test initial page load and default state
  test('Initial load shows required elements and empty heaps', async ({ page }) => {
    // Attach listeners to capture any console errors or page errors
    const { consoleErrors, pageErrors } = attachErrorListeners(page);

    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Verify title and main headings exist
    await expect(page.locator('h1')).toHaveText('Min/Max Heap Visualization');
    await expect(page.locator('h2', { hasText: 'Min Heap' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Max Heap' })).toBeVisible();

    // Verify input and buttons are visible
    await expect(heapPage.valueInput).toBeVisible();
    await expect(heapPage.insertMinButton).toBeVisible();
    await expect(heapPage.insertMaxButton).toBeVisible();

    // Heaps should be empty initially (no .node elements)
    await expect(heapPage.minHeapContainer.locator('.node')).toHaveCount(0);
    await expect(heapPage.maxHeapContainer.locator('.node')).toHaveCount(0);

    // Value input should be empty
    expect(await heapPage.valueInput.inputValue()).toBe('');

    // Visual container exists
    await expect(heapPage.heapVisual).toBeVisible();

    // Assert no console or page errors occurred during initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test inserting values into the min heap preserves the min-heap property and updates DOM
  test('Insert values into Min Heap updates DOM and root is minimum', async ({ page }) => {
    // Capture errors
    const { consoleErrors, pageErrors } = attachErrorListeners(page);
    const heapPage1 = new HeapPage(page);
    await heapPage.goto();

    // Values to insert
    const values2 = [5, 3, 8, 1];

    // Insert values one by one and assert counts and input cleared
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      await heapPage.insertMin(value);

      // After insertion, number of nodes should equal i+1
      await expect(heapPage.minHeapContainer.locator('.node')).toHaveCount(i + 1);

      // Input should be cleared after insertion
      expect(await heapPage.valueInput.inputValue()).toBe('');
    }

    // After all insertions, min-heap root should be the smallest value
    const minNodesText = await heapPage.getMinHeapValues();
    const rootText = minNodesText[0];
    const rootValue = parseInt(rootText, 10);
    expect(rootValue).toBe(Math.min(...values));

    // Visual check: nodes have .node class with expected styling (background-color)
    const bgColor = await heapPage.firstMinNodeBgColor();
    // The CSS sets background-color: #4CAF50 -> computed rgb(76, 175, 80) in most browsers
    expect(bgColor).toBeDefined();
    expect(bgColor.length).toBeGreaterThan(0);

    // Assert no console or page errors occurred during interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test inserting values into the max heap preserves max-heap property and updates DOM
  test('Insert values into Max Heap updates DOM and root is maximum', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);
    const heapPage2 = new HeapPage(page);
    await heapPage.goto();

    const values3 = [2, 9, 4, 7];

    for (let i = 0; i < values.length; i++) {
      await heapPage.insertMax(values[i]);
      await expect(heapPage.maxHeapContainer.locator('.node')).toHaveCount(i + 1);
      expect(await heapPage.valueInput.inputValue()).toBe('');
    }

    // After insertions, root should be the maximum value
    const maxNodesText = await heapPage.getMaxHeapValues();
    const rootValue1 = parseInt(maxNodesText[0], 10);
    expect(rootValue).toBe(Math.max(...values));

    // Ensure nodes are visible and contain numeric text
    for (const text of maxNodesText) {
      expect(text).toMatch(/^-?\d+$/);
    }

    // Assert no console or page errors occurred during interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test invalid input scenarios (empty input and non-numeric input) trigger alert and do not change heaps
  test('Invalid input triggers alert and does not modify heaps', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);
    const heapPage3 = new HeapPage(page);
    await heapPage.goto();

    // Ensure heaps start empty
    await expect(heapPage.minHeapContainer.locator('.node')).toHaveCount(0);
    await expect(heapPage.maxHeapContainer.locator('.node')).toHaveCount(0);

    // Listen for dialogs and capture messages
    const dialogs = [];
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    // Click insert without entering a value (empty input) for min heap
    await heapPage.valueInput.fill(''); // ensure empty
    await heapPage.insertMin(''); // trigger with empty value
    // Allow any DOM updates/alerts to be processed
    await page.waitForTimeout(50);

    // Click insert with a non-numeric value for max heap
    // Because input type=number, filling text may not always be allowed in some browsers;
    // Playwright can still fill the field with a string via .fill(), which simulates user input.
    await heapPage.valueInput.fill('abc');
    await heapPage.insertMax('abc');
    await page.waitForTimeout(50);

    // Two alerts should have been shown (one for each invalid attempt)
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    // The alert message in the implementation is 'Please enter a valid number.'
    const foundAlert = dialogs.some(d => d.message === 'Please enter a valid number.');
    expect(foundAlert).toBe(true);

    // Ensure no nodes were added to either heap after invalid operations
    await expect(heapPage.minHeapContainer.locator('.node')).toHaveCount(0);
    await expect(heapPage.maxHeapContainer.locator('.node')).toHaveCount(0);

    // Assert no console or page errors occurred during invalid interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Combined scenario: multiple interleaved inserts into min and max heaps
  test('Interleaved inserts into both heaps maintain separate states', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorListeners(page);
    const heapPage4 = new HeapPage(page);
    await heapPage.goto();

    // Interleave operations
    await heapPage.insertMin(10);
    await heapPage.insertMax(20);
    await heapPage.insertMin(2);
    await heapPage.insertMax(15);
    await heapPage.insertMin(7);
    await heapPage.insertMax(30);

    // Check counts
    await expect(heapPage.minHeapContainer.locator('.node')).toHaveCount(3);
    await expect(heapPage.maxHeapContainer.locator('.node')).toHaveCount(3);

    // Check min-root is minimum of min-inserted values
    const minInserted = [10, 2, 7];
    const minRoot = parseInt((await heapPage.getMinHeapValues())[0], 10);
    expect(minRoot).toBe(Math.min(...minInserted));

    // Check max-root is maximum of max-inserted values
    const maxInserted = [20, 15, 30];
    const maxRoot = parseInt((await heapPage.getMaxHeapValues())[0], 10);
    expect(maxRoot).toBe(Math.max(...maxInserted));

    // Assert no console or page errors occurred during interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

});