import { test, expect } from '@playwright/test';

const APP_URL = encodeURI('http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccb6ae1-d5b5-11f0-899c-75bf12e026a9.html');

// Page Object Model for interacting with the Heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // MIN heap locators
    this.minInput = page.locator('#minHeapInput');
    this.minInsertBtn = page.locator('#minHeapInsertBtn');
    this.minExtractBtn = page.locator('#minHeapExtractBtn');
    this.minClearBtn = page.locator('#minHeapClearBtn');
    this.minOutput = page.locator('#minHeapOutput');
    this.minTree = page.locator('#minHeapTree');

    // MAX heap locators
    this.maxInput = page.locator('#maxHeapInput');
    this.maxInsertBtn = page.locator('#maxHeapInsertBtn');
    this.maxExtractBtn = page.locator('#maxHeapExtractBtn');
    this.maxClearBtn = page.locator('#maxHeapClearBtn');
    this.maxOutput = page.locator('#maxHeapOutput');
    this.maxTree = page.locator('#maxHeapTree');
  }

  // MIN heap helpers
  async insertMin(value) {
    await this.minInput.fill(String(value));
    await this.minInsertBtn.click();
  }

  async extractMin() {
    await this.minExtractBtn.click();
  }

  async clearMin() {
    await this.minClearBtn.click();
  }

  async minNodes() {
    return this.minTree.locator('.node');
  }

  async minTreeText() {
    return this.minTree.textContent();
  }

  async minOutputText() {
    return this.minOutput.textContent();
  }

  // MAX heap helpers
  async insertMax(value) {
    await this.maxInput.fill(String(value));
    await this.maxInsertBtn.click();
  }

  async extractMax() {
    await this.maxExtractBtn.click();
  }

  async clearMax() {
    await this.maxClearBtn.click();
  }

  async maxNodes() {
    return this.maxTree.locator('.node');
  }

  async maxTreeText() {
    return this.maxTree.textContent();
  }

  async maxOutputText() {
    return this.maxOutput.textContent();
  }
}

test.describe('Heap (Min/Max) Visualization and Demo - End-to-End', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // store console messages (type and text)
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // collect page runtime errors (uncaught exceptions)
      pageErrors.push(err);
    });

    // Navigate to the app URL exactly as provided (encoded)
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait a short time to allow initial visualization entry actions to run
    await page.waitForTimeout(100);
  });

  test.afterEach(async ({ page }) => {
    // Attach page content to test artifacts in case of failures for debugging
    // (Playwright test runner will include failure traces; we keep this minimal)
    // No teardown modifications to the page allowed; just leaving page to close.
  });

  test('Initial state: Min and Max heaps should be visualized as empty and extract buttons disabled', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Verify entry actions: visualizeHeap called on load resulting in "(empty)" text
    await expect(heapPage.minTree).toHaveText('(empty)');
    await expect(heapPage.maxTree).toHaveText('(empty)');

    // Extract buttons should be disabled initially (entry action sets disabled)
    await expect(heapPage.minExtractBtn).toBeDisabled();
    await expect(heapPage.maxExtractBtn).toBeDisabled();

    // Outputs should be empty (no logs yet)
    const minOut = await heapPage.minOutputText();
    const maxOut = await heapPage.maxOutputText();
    expect(minOut.trim()).toBe('');
    expect(maxOut.trim()).toBe('');

    // Ensure there are no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);

    // Optionally ensure console did not log any severe errors
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test.describe('Min Heap interactions (Insert, Extract, Clear)', () => {
    test('Insert into Min Heap transitions to non-empty and enables Extract', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Insert a value into Min Heap
      await heapPage.insertMin(5);

      // The output should log the insertion
      await expect(heapPage.minOutput).toContainText('Inserted 5 into Min Heap.');

      // The tree should now have at least one node with the inserted value
      const nodes = heapPage.minNodes();
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('5');
      await expect(nodes.first()).toHaveClass(/min/);

      // Extract button should now be enabled
      await expect(heapPage.minExtractBtn).toBeEnabled();

      // No runtime page errors occurred during insertion
      expect(pageErrors.length).toBe(0);
    });

    test('Extract Min removes the minimum and logs the extracted value', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Insert multiple values to ensure extract removes the minimum
      await heapPage.insertMin(10);
      await heapPage.insertMin(3);
      await heapPage.insertMin(7);

      // After insertions, ensure at least 3 nodes exist
      await expect(heapPage.minNodes()).toHaveCount(3);

      // Extract the minimum value
      await heapPage.extractMin();

      // The output should contain the extracted minimum (which should be 3)
      await expect(heapPage.minOutput).toContainText('Extracted min value: 3');

      // Node count should be reduced by one (from 3 to 2)
      await expect(heapPage.minNodes()).toHaveCount(2);

      // Ensure tree still visualizes valid nodes (class 'node' present)
      const nodesText = await heapPage.minTreeText();
      expect(nodesText).not.toContain('(empty)');

      // No runtime errors from extract
      expect(pageErrors.length).toBe(0);
    });

    test('Clear Min empties the heap visualization and logs the action', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Insert a value then clear
      await heapPage.insertMin(42);
      await expect(heapPage.minNodes()).toHaveCount(1);

      await heapPage.clearMin();

      // After clearing, visualization should indicate empty and extract disabled
      await expect(heapPage.minTree).toHaveText('(empty)');
      await expect(heapPage.minExtractBtn).toBeDisabled();

      // Output should include clear message
      await expect(heapPage.minOutput).toContainText('Cleared Min Heap.');

      // No runtime errors
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Max Heap interactions (Insert, Extract, Clear)', () => {
    test('Insert into Max Heap transitions to non-empty and enables Extract', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Insert a value into Max Heap
      await heapPage.insertMax(2);

      // The output should log the insertion
      await expect(heapPage.maxOutput).toContainText('Inserted 2 into Max Heap.');

      // The tree should now have at least one node with the inserted value
      const nodes = heapPage.maxNodes();
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toHaveText('2');
      await expect(nodes.first()).toHaveClass(/max/);

      // Extract button should now be enabled
      await expect(heapPage.maxExtractBtn).toBeEnabled();

      // No runtime page errors during insertion
      expect(pageErrors.length).toBe(0);
    });

    test('Extract Max removes the maximum and logs the extracted value', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Insert multiple values
      await heapPage.insertMax(1);
      await heapPage.insertMax(9);
      await heapPage.insertMax(4);

      // Confirm nodes present
      await expect(heapPage.maxNodes()).toHaveCount(3);

      // Extract max; should remove 9
      await heapPage.extractMax();

      // Output should contain extracted max value 9
      await expect(heapPage.maxOutput).toContainText('Extracted max value: 9');

      // Node count should be reduced
      await expect(heapPage.maxNodes()).toHaveCount(2);

      // No runtime errors
      expect(pageErrors.length).toBe(0);
    });

    test('Clear Max empties the heap visualization and logs the action', async ({ page }) => {
      const heapPage = new HeapPage(page);

      await heapPage.insertMax(100);
      await expect(heapPage.maxNodes()).toHaveCount(1);

      await heapPage.clearMax();

      // After clearing, visualization should indicate empty and extract disabled
      await expect(heapPage.maxTree).toHaveText('(empty)');
      await expect(heapPage.maxExtractBtn).toBeDisabled();

      // Output should include clear message
      await expect(heapPage.maxOutput).toContainText('Cleared Max Heap.');

      // No runtime errors
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Inserting non-number (empty input) triggers an alert and does not change heap', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Ensure the min heap is empty initially
      await expect(heapPage.minTree).toHaveText('(empty)');

      // Listen for the alert dialog and assert its message
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        // Attempt to click Insert without typing a number (value is empty)
        heapPage.minInsertBtn.click(),
      ]);

      // Validate the dialog text matches application alert
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter a valid number.');
      await dialog.accept();

      // Ensure heap stayed empty and no nodes were added
      await expect(heapPage.minTree).toHaveText('(empty)');

      // Check that there are no uncaught page errors from this flow
      expect(pageErrors.length).toBe(0);
    });

    test('Console should not contain uncaught exceptions (ReferenceError/SyntaxError/TypeError) during typical flows', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Perform some typical actions
      await heapPage.insertMin(8);
      await heapPage.insertMax(15);
      await heapPage.extractMin();
      await heapPage.extractMax();
      await heapPage.clearMin();
      await heapPage.clearMax();

      // Wait briefly to let any asynchronous errors surface
      await page.waitForTimeout(100);

      // Assert that no uncaught page errors were captured
      expect(pageErrors.length).toBe(0);

      // Also ensure there are no console.error messages logged by the page
      const errorConsole = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsole.length).toBe(0);
    });
  });

  test('Visual connections and node classes should exist after insertion (sanity check)', async ({ page }) => {
    const heapPage = new HeapPage(page);

    // Insert multiple nodes into min heap and ensure nodes and connection container appear
    await heapPage.insertMin(11);
    await heapPage.insertMin(6);
    await heapPage.insertMin(14);
    await page.waitForTimeout(120); // allow connection drawing timeout (50ms in app)

    // There should be node elements rendered
    await expect(heapPage.minNodes()).toHaveCount(3);

    // The container should have a connections element appended by createConnections
    const connections = await page.locator('#minHeapTree .connections').first();
    await expect(connections).toBeVisible();

    // Node elements should have min class for min-heap
    const firstNode = heapPage.minTree.locator('.node.min').first();
    await expect(firstNode).toBeVisible();

    // No runtime errors created in the process
    expect(pageErrors.length).toBe(0);
  });
});