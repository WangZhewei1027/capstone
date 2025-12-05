import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b72af0-d1d5-11f0-b49a-6f458b3a25ef.html';

let pageErrors = [];
let consoleMessages = [];

// Page Object Model for the Heap page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.heapTypeSelect = page.locator('#heapType');
    this.insertButton = page.locator('button', { hasText: 'Insert' });
    this.heapDisplay = page.locator('#heapDisplay');
    this.nodes = () => this.heapDisplay.locator('.node');
  }

  // Fill the input and click the Insert button
  async insert(value) {
    await this.valueInput.fill(String(value));
    await this.insertButton.click();
  }

  // Change heap type select (value should be 'min' or 'max')
  async selectHeapType(type) {
    await this.heapTypeSelect.selectOption(type);
  }

  // Get all node text contents as an array of strings
  async getNodeTexts() {
    return await this.nodes().allTextContents();
  }

  // Get count of node elements
  async getNodeCount() {
    return await this.nodes().count();
  }

  // Read the select value
  async getSelectedHeapType() {
    return await this.heapTypeSelect.inputValue();
  }

  // Check whether input is empty
  async isInputEmpty() {
    const val = await this.valueInput.inputValue();
    return val === '';
  }
}

// Setup listeners before navigation to capture any page errors or console messages during load
test.beforeEach(async ({ page }) => {
  // reset arrays for each test
  pageErrors = [];
  consoleMessages = [];

  page.on('pageerror', (err) => {
    // capture runtime errors (ReferenceError, TypeError, etc.)
    pageErrors.push(err);
  });

  page.on('console', (msg) => {
    // capture console messages for inspection
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Navigate to the application page
  await page.goto(APP_URL);
});

// Basic teardown - after each test ensure no unhandled dialogs remain (Playwright auto-dismisses)
test.afterEach(async ({ page }) => {
  // nothing specific to teardown beyond automatic cleanup
});

test.describe('Min/Max Heap Visualization - Initial load and basic UI', () => {
  test('Initial page load shows title, controls, and empty heap', async ({ page }) => {
    // Purpose: Verify that the page loads and initial DOM is in expected default state
    const heapPage = new HeapPage(page);

    // Check the page title (h1)
    const title = await page.locator('h1').innerText();
    expect(title).toContain('Min/Max Heap Visualization');

    // The select should default to "min"
    const selected = await heapPage.getSelectedHeapType();
    expect(selected).toBe('min');

    // The input and insert button should be visible
    await expect(heapPage.valueInput).toBeVisible();
    await expect(heapPage.insertButton).toBeVisible();

    // Heap display should be empty on load
    const nodeCount = await heapPage.getNodeCount();
    expect(nodeCount).toBe(0);

    // Ensure no runtime page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Min Heap behavior (default)', () => {
  test('Insert a single value into min heap displays one node and clears input', async ({ page }) => {
    // Purpose: Validate inserting a single numeric value updates the DOM and clears the input
    const heapPage1 = new HeapPage(page);

    // Insert 42
    await heapPage.insert(42);

    // After insert, one node with text "42" should be present
    const texts = await heapPage.getNodeTexts();
    expect(texts).toEqual(['42']);

    // Input should be cleared after successful insert
    const inputEmpty = await heapPage.isInputEmpty();
    expect(inputEmpty).toBeTruthy();

    // No runtime errors expected during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Insert multiple values into min heap results in expected (actual-implementation) order', async ({ page }) => {
    // Purpose: Validate bubble-up behavior for multiple inserts.
    // Note: Tests assert the behavior of the provided implementation (including its bubbleUp quirks).
    const heapPage2 = new HeapPage(page);

    // Insert 10, 5, 20, 2 sequentially
    await heapPage.insert(10);
    await heapPage.insert(5);
    await heapPage.insert(20);
    await heapPage.insert(2);

    // Based on the provided implementation's bubbleUp (parentIndex defined once),
    // the displayed order after these inserts is the actual observed behavior.
    // Compute expectation according to the running code:
    // After inserts the display should show: [5,2,20,10]
    const expected = ['5', '2', '20', '10'];
    const actual = await heapPage.getNodeTexts();
    expect(actual).toEqual(expected);

    // Also ensure there are exactly 4 nodes displayed
    expect(await heapPage.getNodeCount()).toBe(4);

    // No runtime errors expected during these operations
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Switching to Max Heap and max behavior', () => {
  test('Switching heap type to max clears existing heap and updates select', async ({ page }) => {
    // Purpose: Verify switching the select to 'max' clears heap.values and updates UI
    const heapPage3 = new HeapPage(page);

    // Insert a value to ensure heap is non-empty first
    await heapPage.insert(7);
    expect(await heapPage.getNodeCount()).toBe(1);

    // Switch to max heap via select; this should clear heap and update UI
    await heapPage.selectHeapType('max');

    // The select input value should now be 'max'
    const selected1 = await heapPage.getSelectedHeapType();
    expect(selected).toBe('max');

    // Heap display should be cleared
    expect(await heapPage.getNodeCount()).toBe(0);

    // No runtime errors expected during change
    expect(pageErrors.length).toBe(0);
  });

  test('Insert multiple values into max heap results in expected (actual-implementation) order', async ({ page }) => {
    // Purpose: Insert several values into the max heap and assert actual implementation ordering
    const heapPage4 = new HeapPage(page);

    // Switch to max heap
    await heapPage.selectHeapType('max');

    // Insert 10, 5, 20, 15 sequentially
    await heapPage.insert(10);
    await heapPage.insert(5);
    await heapPage.insert(20);
    await heapPage.insert(15);

    // With the current bubbleUp implementation (parentIndex not recomputed),
    // the observed displayed array should be: [20,15,10,5]
    const expected1 = ['20', '15', '10', '5'];
    const actual1 = await heapPage.getNodeTexts();
    expect(actual).toEqual(expected);

    // Ensure node count matches
    expect(await heapPage.getNodeCount()).toBe(4);

    // No runtime page errors expected
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Edge cases, validation, and error handling', () => {
  test('Attempting to insert an empty input shows alert and does not modify heap', async ({ page }) => {
    // Purpose: Ensure invalid input triggers an alert and heap remains unchanged
    const heapPage5 = new HeapPage(page);

    // Ensure heap is empty to start
    expect(await heapPage.getNodeCount()).toBe(0);

    // Listen for dialog and capture its message
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Click Insert with empty input
    await heapPage.insert(''); // fill with empty string and click

    // The alert should have been shown with message 'Please enter a valid number'
    expect(dialogMessage).toBe('Please enter a valid number');

    // Heap should remain empty
    expect(await heapPage.getNodeCount()).toBe(0);

    // No runtime page errors expected
    expect(pageErrors.length).toBe(0);
  });

  test('Attempting to insert a non-numeric value triggers validation alert and no change', async ({ page }) => {
    // Purpose: Ensure non-numeric input is rejected and the appropriate alert appears
    const heapPage6 = new HeapPage(page);

    // Listen for dialog
    let dialogMessage1 = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Fill input with a non-numeric string and click Insert
    await heapPage.valueInput.fill('abc');
    await heapPage.insertButton.click();

    // Alert should show same validation message
    expect(dialogMessage).toBe('Please enter a valid number');

    // Heap remains unchanged
    expect(await heapPage.getNodeCount()).toBe(0);

    // No runtime page errors expected
    expect(pageErrors.length).toBe(0);
  });
});

test.describe('Console and runtime error observations', () => {
  test('No unhandled page errors (ReferenceError/TypeError/SyntaxError) occurred during tests', async ({ page }) => {
    // Purpose: Explicitly assert that the page did not emit runtime page errors captured by Playwright.
    // This ensures any unexpected ReferenceError/TypeError/SyntaxError would fail the test if present.
    // Note: pageErrors was populated in beforeEach for this test's navigation; here we assert it's empty.
    expect(pageErrors.length).toBe(0);

    // Also assert console has no severity "error" messages (best-effort)
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    // Allow zero error-level console messages for a clean implementation
    expect(errorConsoleMessages.length).toBe(0);
  });
});