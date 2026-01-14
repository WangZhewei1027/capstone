import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f22-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Heap app
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.minHeapContainer = page.locator('#minHeap');
    this.maxHeapContainer = page.locator('#maxHeap');
    this.valueInput = page.locator('#valueInput');
    this.insertButton = page.locator('button', { hasText: 'Insert' });
    this.extractButton = page.locator('button', { hasText: 'Extract Root' });
    this.generateRandomButton = page.locator('button', { hasText: 'Generate Random Heap' });
    this.clearButton = page.locator('button', { hasText: 'Clear' });
    this.heapTypeSelect = page.locator('#heapType');
    this.minOperations = page.locator('#minOperations');
    this.maxOperations = page.locator('#maxOperations');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for initial visualization nodes to render (onload inserts initial values)
    await this.page.waitForSelector('#minHeap .node');
    await this.page.waitForSelector('#maxHeap .node');
  }

  async selectHeapType(type) {
    await this.heapTypeSelect.selectOption(type); // 'min' or 'max'
  }

  async insertValueIntoSelectedHeap(value) {
    await this.valueInput.fill(String(value));
    await this.insertButton.click();
  }

  async extractRootFromSelectedHeap() {
    await this.extractButton.click();
  }

  async clickGenerateRandomHeap() {
    await this.generateRandomButton.click();
  }

  async clickClearHeap() {
    await this.clearButton.click();
  }

  async getRootValue(heap = 'min') {
    const container = heap === 'min' ? this.minHeapContainer : this.maxHeapContainer;
    const rootNode = container.locator('.level').first().locator('.node').first();
    // If "Heap is empty" text appears, return null
    const exists = await rootNode.count();
    if (!exists) {
      // check for empty text
      const text = (await container.textContent()) || '';
      if (text.trim().includes('Heap is empty')) return null;
      return null;
    }
    return (await rootNode.textContent()).trim();
  }

  async countNodes(heap = 'min') {
    const container = heap === 'min' ? this.minHeapContainer : this.maxHeapContainer;
    return await container.locator('.node').count();
  }

  async operationsText(heap = 'min') {
    return heap === 'min' ? (await this.minOperations.textContent()) : (await this.maxOperations.textContent());
  }

  async rootHasActiveClass(heap = 'min') {
    const container = heap === 'min' ? this.minHeapContainer : this.maxHeapContainer;
    const rootNode = container.locator('.level').first().locator('.node').first();
    // return boolean if root has active class
    return await rootNode.evaluate(node => node.classList.contains('active'));
  }
}

test.describe('Heap (Min/Max) Visualization - dfd73f22-d59e-11f0-ae0b-570552a0b645', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions later.
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (error) => {
      // Collect any uncaught exceptions from the page
      pageErrors.push(error);
    });

    page.on('console', (msg) => {
      // Collect console messages for inspection; include text and type
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Initial load: page renders and shows Min and Max heaps with correct roots and active class', async ({ page }) => {
    // Purpose: Verify the page loads, initial heaps are rendered and the root nodes are highlighted.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Verify page title and headings exist
    await expect(page.locator('h1')).toHaveText(/Heap \(Min\/Max\) Data Structure/);
    await expect(page.locator('.heap-title').first()).toHaveText('Min Heap Visualization');
    await expect(page.locator('.heap-title').nth(1)).toHaveText('Max Heap Visualization');

    // On initialization the script inserts [10,20,5,30,15,25,8] into both heaps.
    // For the MinHeap, the root should be the smallest of those (5).
    const minRoot = await heapPage.getRootValue('min');
    expect(minRoot).toBe('5'); // assert root is 5

    // For the MaxHeap, the root should be the largest (30).
    const maxRoot = await heapPage.getRootValue('max');
    expect(maxRoot).toBe('30'); // assert root is 30

    // Check that root nodes have the 'active' class for visual highlight
    expect(await heapPage.rootHasActiveClass('min')).toBe(true);
    expect(await heapPage.rootHasActiveClass('max')).toBe(true);

    // Ensure some nodes exist (full tree levels should have at least 7 nodes)
    expect(await heapPage.countNodes('min')).toBeGreaterThanOrEqual(7);
    expect(await heapPage.countNodes('max')).toBeGreaterThanOrEqual(7);

    // Assert that the page did not emit any uncaught exceptions during load
    expect(Array.isArray(pageErrors)).toBe(true);
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Interactive controls and data flow', () => {
    test('Insert into Min Heap makes inserted smaller value the new root and updates operations', async ({ page }) => {
      // Purpose: Verify inserting a small value into the Min heap promotes it to root and logs the operation.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Choose Min Heap
      await heapPage.selectHeapType('min');

      // Insert a very small value to ensure it becomes root
      await heapPage.insertValueIntoSelectedHeap(1);

      // After insertion the min root should become '1'
      const newMinRoot = await heapPage.getRootValue('min');
      expect(newMinRoot).toBe('1');

      // The operations box for min heap should include the inserted value text
      const minOps = await heapPage.operationsText('min');
      expect(minOps).toContain('Inserted 1');

      // No uncaught exceptions should be present
      expect(pageErrors.length).toBe(0);
    });

    test('Insert into Max Heap makes inserted larger value the new root and updates operations', async ({ page }) => {
      // Purpose: Verify inserting a large value into the Max heap promotes it to root and logs the operation.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Choose Max Heap
      await heapPage.selectHeapType('max');

      // Insert a very large value to ensure it becomes root
      await heapPage.insertValueIntoSelectedHeap(99);

      const newMaxRoot = await heapPage.getRootValue('max');
      expect(newMaxRoot).toBe('99');

      // The operations box for max heap should include the inserted value text
      const maxOps = await heapPage.operationsText('max');
      expect(maxOps).toContain('Inserted 99');

      // No uncaught exceptions
      expect(pageErrors.length).toBe(0);
    });

    test('Extract Root removes root from the currently selected heap and updates visualization', async ({ page }) => {
      // Purpose: Validate extractRoot removes the visible root and visualization updates accordingly.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Test on Min Heap
      await heapPage.selectHeapType('min');
      const minRootBefore = await heapPage.getRootValue('min');
      expect(minRootBefore).toBe('5'); // sanity

      // Extract root
      await heapPage.extractRootFromSelectedHeap();

      // After extraction, the new root should not be equal to the previous root (unless heap had duplicates)
      const minRootAfter = await heapPage.getRootValue('min');
      expect(minRootAfter).not.toBe(minRootBefore);

      // Min operations should log extraction
      const minOps = await heapPage.operationsText('min') || '';
      expect(minOps).toContain('Extracted min:');

      // Test on Max Heap
      await heapPage.selectHeapType('max');
      const maxRootBefore = await heapPage.getRootValue('max');
      expect(maxRootBefore).toBe('30'); // sanity

      // Extract root
      await heapPage.extractRootFromSelectedHeap();

      const maxRootAfter = await heapPage.getRootValue('max');
      expect(maxRootAfter).not.toBe(maxRootBefore);

      const maxOps = await heapPage.operationsText('max') || '';
      expect(maxOps).toContain('Extracted max:');

      // Ensure no uncaught exceptions happened during extraction
      expect(pageErrors.length).toBe(0);
    });

    test('Generate Random Heap creates 7 nodes for both heaps and logs insertions', async ({ page }) => {
      // Purpose: Ensure "Generate Random Heap" builds a fresh heap of 7 elements for both min and max, and operations are recorded.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Click generate random
      await heapPage.clickGenerateRandomHeap();

      // Both heaps should now have 7 nodes displayed
      const minCount = await heapPage.countNodes('min');
      const maxCount = await heapPage.countNodes('max');

      expect(minCount).toBe(7);
      expect(maxCount).toBe(7);

      // Operations text for both should contain multiple "Inserted" entries
      const minOps = (await heapPage.operationsText('min')) || '';
      const maxOps = (await heapPage.operationsText('max')) || '';
      expect(minOps.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(7);
      expect(maxOps.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(7);

      // No uncaught exceptions during generation
      expect(pageErrors.length).toBe(0);
    });

    test('Clear button empties both heaps and clears operations', async ({ page }) => {
      // Purpose: Verify clear resets heaps and clears operations display.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Ensure heaps currently hold nodes
      expect(await heapPage.countNodes('min')).toBeGreaterThan(0);
      expect(await heapPage.countNodes('max')).toBeGreaterThan(0);

      // Click clear
      await heapPage.clickClearHeap();

      // After clearing, containers should display the "Heap is empty" message
      const minText = (await heapPage.minHeapContainer.textContent()) || '';
      const maxText = (await heapPage.maxHeapContainer.textContent()) || '';
      expect(minText).toContain('Heap is empty');
      expect(maxText).toContain('Heap is empty');

      // Operations should be empty
      expect((await heapPage.operationsText('min')).trim()).toBe('');
      expect((await heapPage.operationsText('max')).trim()).toBe('');

      // No uncaught exceptions
      expect(pageErrors.length).toBe(0);
    });

    test('Inserting invalid input (empty/non-numeric) does not change heap state', async ({ page }) => {
      // Purpose: Assert that providing invalid input (empty string) and clicking Insert does nothing.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Record counts before
      const minCountBefore = await heapPage.countNodes('min');
      const maxCountBefore = await heapPage.countNodes('max');

      // Ensure input is empty and click insert (default heapType is 'min')
      await heapPage.valueInput.fill('');
      await heapPage.insertButton.click();

      // Nothing should change for min heap
      const minCountAfter = await heapPage.countNodes('min');
      expect(minCountAfter).toBe(minCountBefore);

      // Switch to max and do the same (set select to max)
      await heapPage.selectHeapType('max');
      await heapPage.valueInput.fill(''); // empty
      await heapPage.insertButton.click();

      const maxCountAfter = await heapPage.countNodes('max');
      expect(maxCountAfter).toBe(maxCountBefore);

      // No uncaught exceptions produced by invalid input handling
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('UI basics and accessibility checks', () => {
    test('Controls are visible and input has placeholder and bounds', async ({ page }) => {
      // Purpose: Basic UI and accessibility checks for controls presence and attributes.
      const heapPage = new HeapPage(page);
      await heapPage.goto();

      // Input exists and has placeholder and min/max attributes
      await expect(heapPage.valueInput).toBeVisible();
      expect(await heapPage.valueInput.getAttribute('placeholder')).toBe('Enter value');
      expect(await heapPage.valueInput.getAttribute('min')).toBe('0');
      expect(await heapPage.valueInput.getAttribute('max')).toBe('99');

      // Buttons and select exist
      await expect(heapPage.insertButton).toBeVisible();
      await expect(heapPage.extractButton).toBeVisible();
      await expect(heapPage.generateRandomButton).toBeVisible();
      await expect(heapPage.clearButton).toBeVisible();
      await expect(heapPage.heapTypeSelect).toBeVisible();

      // No page errors during simple UI assertions
      expect(pageErrors.length).toBe(0);
    });
  });

  test('Console messages and page error monitoring sanity check', async ({ page }) => {
    // Purpose: Validate that our listeners captured console messages and page errors arrays exist and are accessible.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Interact to produce operations (which are not console logs but will update DOM)
    await heapPage.selectHeapType('min');
    await heapPage.insertValueIntoSelectedHeap(42);

    // The console message array should be an array (even if empty)
    expect(Array.isArray(consoleMessages)).toBe(true);

    // The pageErrors array should be present and (for this app) is expected to be empty
    expect(Array.isArray(pageErrors)).toBe(true);

    // Assert there were no uncaught errors during the interactions
    expect(pageErrors.length).toBe(0);

    // As defensive check, include the latest DOM operation is present
    expect(await heapPage.operationsText('min')).toContain('Inserted 42');
  });
});