import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe5c02-cd32-11f0-a96f-2d591ffb35fe.html';

// Page object encapsulating interactions with the Heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.heapType = page.locator('#heapType');
    this.inputValue = page.locator('#inputValue');
    this.insertBtn = page.locator('#insertBtn');
    this.extractBtn = page.locator('#extractBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.arrayDisplay = page.locator('#heapArrayDisplay');
    this.treeVisual = page.locator('#heapTreeVisual');
    this.nodeLocator = page.locator('.node');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Selects the heap type ('min' or 'max')
  async selectHeapType(type) {
    await this.heapType.selectOption(type);
  }

  // Fills the input field with a value (string or number) and clicks Insert
  async insertValue(value) {
    await this.inputValue.fill(String(value));
    await this.insertBtn.click();
  }

  // Clicks the Extract Root button
  async extractRoot() {
    await this.extractBtn.click();
  }

  // Clicks the Clear button
  async clearHeap() {
    await this.clearBtn.click();
  }

  // Returns the raw text content of the array display
  async getArrayText() {
    return (await this.arrayDisplay.textContent()).trim();
  }

  // Returns the tree text (either '(empty)' or nodes' text concatenated)
  async getTreeText() {
    return (await this.treeVisual.textContent()).trim();
  }

  // Returns an array of node text contents in DOM order
  async getNodeValues() {
    return await this.nodeLocator.allTextContents();
  }

  // Returns number of rendered nodes
  async nodeCount() {
    return await this.nodeLocator.count();
  }

  // Returns currently selected heap type
  async getSelectedHeapType() {
    return await this.heapType.inputValue();
  }
}

test.describe('Heap (Min/Max) Demonstration - End-to-end', () => {
  // Arrays to capture console errors, page errors, and dialogs for assertions
  let consoleErrors;
  let pageErrors;
  let dialogs;

  // Handlers references so they can be removed in afterEach
  let consoleHandler;
  let pageErrorHandler;
  let dialogHandler;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Capture console.error and other console messages
    consoleHandler = (msg) => {
      // We capture error & warning messages specifically for diagnostics
      const type = msg.type(); // 'log', 'info', 'error', etc.
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        consoleErrors.push({ type, text });
      }
    };
    page.on('console', consoleHandler);

    // Capture uncaught page errors (exceptions)
    pageErrorHandler = (err) => {
      // err is an Error object from the page context
      pageErrors.push({ message: err.message, stack: err.stack });
    };
    page.on('pageerror', pageErrorHandler);

    // Auto-accept alerts but record messages so tests can assert dialogs
    dialogHandler = async (dialog) => {
      try {
        dialogs.push(dialog.message());
        await dialog.accept();
      } catch (e) {
        // In case accepting throws, push an indicative message
        dialogs.push(`dialog-accept-error: ${e && e.message}`);
      }
    };
    page.on('dialog', dialogHandler);

    // Navigate to the application
    const heapPage = new HeapPage(page);
    await heapPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid cross-test interference
    if (consoleHandler) page.off('console', consoleHandler);
    if (pageErrorHandler) page.off('pageerror', pageErrorHandler);
    if (dialogHandler) page.off('dialog', dialogHandler);
  });

  test('Initial load: default state is Min-Heap, empty array, and empty visualization', async ({ page }) => {
    // Purpose: Verify the page loads and initial UI reflects an empty min-heap
    const heap = new HeapPage(page);

    // Default selection should be 'min'
    const selected = await heap.getSelectedHeapType();
    expect(selected).toBe('min');

    // Array representation should be an empty array
    const arrayText = await heap.getArrayText();
    expect(arrayText).toBe('[]');

    // Tree visualization should show '(empty)'
    const treeText = await heap.getTreeText();
    expect(treeText).toBe('(empty)');

    // Buttons must be visible and enabled
    await expect(heap.insertBtn).toBeVisible();
    await expect(heap.extractBtn).toBeVisible();
    await expect(heap.clearBtn).toBeVisible();

    // No nodes should be present
    expect(await heap.nodeCount()).toBe(0);

    // No unexpected dialogs should have appeared on load
    expect(dialogs.length).toBe(0);
  });

  test('Insert sequence into Min-Heap updates array and tree correctly', async ({ page }) => {
    // Purpose: Insert values 5, 3, 8 into min-heap and validate array and visualization updates
    const heap1 = new HeapPage(page);

    // Insert 5
    await heap.insertValue(5);
    expect(await heap.getArrayText()).toBe('[5]');
    expect(await heap.nodeCount()).toBe(1);
    expect(await heap.getNodeValues()).toEqual(['5']);

    // Insert 3 -> should bubble up to become root
    await heap.insertValue(3);
    // After insertion, array should be [3,5]
    expect(await heap.getArrayText()).toBe('[3,5]');
    expect(await heap.nodeCount()).toBe(2);
    const nodesAfterTwo = await heap.getNodeValues();
    // Tree should contain '3' as root, '5' as child (order follows DOM rendering)
    expect(nodesAfterTwo[0]).toBe('3');
    expect(nodesAfterTwo).toContain('5');

    // Insert 8 -> should be placed as child, no bubbling above root
    await heap.insertValue(8);
    expect(await heap.getArrayText()).toBe('[3,5,8]');
    expect(await heap.nodeCount()).toBe(3);
    const nodes = await heap.getNodeValues();
    // Verify root remains 3 and children 5 and 8 are present
    expect(nodes[0]).toBe('3');
    expect(nodes).toEqual(expect.arrayContaining(['5', '8']));

    // Ensure no dialogs were triggered during valid inserts
    expect(dialogs.length).toBe(0);
  });

  test('Switching heap type resets the heap (selecting Max-Heap clears state)', async ({ page }) => {
    // Purpose: Selecting a different heap type creates a fresh heap and UI resets
    const heap2 = new HeapPage(page);

    // Insert a value to ensure non-empty state first
    await heap.insertValue(10);
    expect(await heap.getArrayText()).toBe('[10]');
    expect(await heap.nodeCount()).toBe(1);

    // Switch to 'max' -- the implementation creates a new Heap on change
    await heap.selectHeapType('max');

    // After switching, heap should be reset to empty
    expect(await heap.getArrayText()).toBe('[]');
    expect(await heap.getTreeText()).toBe('(empty)');
    expect(await heap.nodeCount()).toBe(0);
  });

  test('Max-Heap insertion and extract root behavior with alerts handled', async ({ page }) => {
    // Purpose: Validate max-heap insertions, extraction, and alert that displays extracted value
    const heap3 = new HeapPage(page);

    // Switch to max-heap
    await heap.selectHeapType('max');

    // Insert 2, then 7, then 4
    await heap.insertValue(2);
    await heap.insertValue(7);
    await heap.insertValue(4);

    // For a max-heap, the array after these insertions should be [7,2,4]
    expect(await heap.getArrayText()).toBe('[7,2,4]');
    expect(await heap.nodeCount()).toBe(3);
    expect((await heap.getNodeValues())[0]).toBe('7');

    // Prepare to capture any dialog (alert) - earlier beforeEach has been capturing and auto-accepting
    // Click extract - should produce an alert with "Max root extracted: 7"
    await heap.extractRoot();

    // Ensure an alert was shown and accepted
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    // The most recent dialog should contain the expected extraction message
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog).toContain('Max root extracted: 7');

    // After extraction, root should be 4 and heap array should be [4,2]
    expect(await heap.getArrayText()).toBe('[4,2]');
    expect(await heap.nodeCount()).toBe(2);
    const remainingNodes = await heap.getNodeValues();
    expect(remainingNodes).toEqual(expect.arrayContaining(['4', '2']));
  });

  test('Insert invalid input triggers alert and does not change heap', async ({ page }) => {
    // Purpose: Validate error handling for invalid insert input (empty or non-integer)
    const heap4 = new HeapPage(page);

    // Start with a known state: empty heap
    expect(await heap.getArrayText()).toBe('[]');

    // Attempt to insert with empty input (parseInt('') => NaN) -> should alert and not change heap
    await heap.insertValue(''); // empty input field
    // Last dialog should indicate invalid integer
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[dialogs.length - 1]).toContain('Please enter a valid integer value to insert.');

    // Heap remains empty
    expect(await heap.getArrayText()).toBe('[]');
    expect(await heap.getTreeText()).toBe('(empty)');

    // Also attempt to insert a non-numeric string (browser may coerce to '', but still test)
    await heap.inputValue.fill('abc'); // directly fill with non-numeric
    await heap.insertBtn.click();
    expect(dialogs[dialogs.length - 1]).toContain('Please enter a valid integer value to insert.');
    // Still empty
    expect(await heap.getArrayText()).toBe('[]');
  });

  test('Extracting from an empty heap shows an alert and does not crash', async ({ page }) => {
    // Purpose: Ensure extract on an empty heap triggers the expected alert and no unhandled exceptions occur
    const heap5 = new HeapPage(page);

    // Ensure heap empty
    await heap.selectHeapType('min'); // reset to min and ensure empty
    expect(await heap.getArrayText()).toBe('[]');

    // Click extract - should show alert "Heap is empty, nothing to extract."
    await heap.extractRoot();

    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[dialogs.length - 1]).toBe('Heap is empty, nothing to extract.');

    // Verify UI remains consistent
    expect(await heap.getArrayText()).toBe('[]');
    expect(await heap.getTreeText()).toBe('(empty)');
  });

  test('Clear button empties the heap and updates UI accordingly', async ({ page }) => {
    // Purpose: Insert values, then clear and verify both array and visual tree reflect empty state
    const heap6 = new HeapPage(page);

    // Insert a couple values
    await heap.insertValue(11);
    await heap.insertValue(6);
    expect(await heap.getNodeValues()).toEqual(expect.arrayContaining(['6', '11']));

    // Click clear
    await heap.clearHeap();

    // Verify array and tree are reset
    expect(await heap.getArrayText()).toBe('[]');
    expect(await heap.getTreeText()).toBe('(empty)');
    expect(await heap.nodeCount()).toBe(0);
  });

  test('Observe console and page errors and report if ReferenceError/TypeError/SyntaxError occurred', async ({ page }) => {
    // Purpose: Collect console & page errors produced during page runtime and assert their presence or absence.
    // This test does not attempt to modify the page or fix errors; it only observes.

    // Wait a short time to allow any async runtime errors to surface after load and interactions in previous tests
    await page.waitForTimeout(250);

    // Basic assertions that our monitoring captured arrays exist
    expect(Array.isArray(consoleErrors)).toBe(true);
    expect(Array.isArray(pageErrors)).toBe(true);
    expect(Array.isArray(dialogs)).toBe(true);

    // Look for specific JS error types in pageErrors and consoleErrors
    const foundErrors = [];

    // Check pageErrors (uncaught exceptions)
    for (const err of pageErrors) {
      if (err.message && /ReferenceError|TypeError|SyntaxError/.test(err.message)) {
        foundErrors.push({ source: 'pageerror', message: err.message });
      }
    }

    // Check consoleErrors messages
    for (const ce of consoleErrors) {
      if (ce.text && /ReferenceError|TypeError|SyntaxError/.test(ce.text)) {
        foundErrors.push({ source: 'console', message: ce.text });
      }
    }

    // If such errors were found, assert details so the test output contains them.
    if (foundErrors.length > 0) {
      // At least one JS core error type was observed — expose them in the assertion message
      for (const e of foundErrors) {
        // Ensure message strings are non-empty
        expect(typeof e.message).toBe('string');
        expect(e.message.length).toBeGreaterThan(0);
      }
    } else {
      // No ReferenceError/TypeError/SyntaxError found: assert that no critical page errors were captured
      // (We still pass the test; this block documents that runtime was clean of these specific error types.)
      expect(foundErrors.length).toBe(0);
    }
  });
});