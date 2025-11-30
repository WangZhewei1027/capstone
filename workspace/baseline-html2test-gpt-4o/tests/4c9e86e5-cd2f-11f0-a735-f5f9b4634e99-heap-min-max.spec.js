import { test, expect } from '@playwright/test';

// Test file for Application ID: 4c9e86e5-cd2f-11f0-a735-f5f9b4634e99
// Purpose: End-to-end tests for the Heap (Min/Max) Demo.
// - Verifies UI state, interactions, DOM updates, alerts, and that no unexpected page errors occur.
// - Uses a small page object pattern for clarity.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e86e5-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object representing the heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#heapInput');
    this.addButton = page.getByRole('button', { name: 'Add to Heap' });
    this.toggleButton = page.getByRole('button', { name: 'Toggle Min/Max Heap' });
    this.currentHeapType = page.locator('#currentHeapType');
    this.heapDisplay = page.locator('#heapDisplay');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async addNumber(value) {
    await this.input.fill(String(value));
    await this.addButton.click();
  }

  async toggleHeapType() {
    await this.toggleButton.click();
  }

  async getCurrentHeapTypeText() {
    return (await this.currentHeapType.textContent())?.trim();
  }

  async getHeapDisplayText() {
    // return trimmed text content (may be empty string initially)
    const t = await this.heapDisplay.textContent();
    return t === null ? '' : t.trim();
  }
}

test.describe('Heap (Min/Max) Demo - End to End', () => {
  // arrays to capture console messages and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // initialize capture arrays
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // capture console messages and errors emitted by the page
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    page.on('pageerror', (err) => {
      // collect uncaught exceptions from the page context
      pageErrors.push(err);
    });
  });

  test('Initial load shows default state: Min heap selected and empty display', async ({ page }) => {
    // Purpose: Verify the initial UI state after page load.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Expect the header to indicate Min heap by default
    await expect(heapPage.currentHeapType).toHaveText('Current Heap: Min');

    // Initially no heap has been displayed (displayHeap is not called on load),
    // so the heapDisplay element should be empty.
    const displayText = await heapPage.getHeapDisplayText();
    expect(displayText).toBe('');

    // Input should be visible and empty
    await expect(heapPage.input).toBeVisible();
    expect(await heapPage.input.inputValue()).toBe('');

    // Ensure no uncaught page errors occurred during initial load
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);

    // No console.error messages expected
    expect(consoleErrors.length).toBe(0);
  });

  test('Adding numbers into Min Heap updates display in heap order', async ({ page }) => {
    // Purpose: Test inserting numbers into the MinHeap and validate displayed array representation.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Add 5 -> expect Heap: [5]
    await heapPage.addNumber(5);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [5]');

    // Add 3 -> min bubble up -> expect Heap: [3, 5]
    await heapPage.addNumber(3);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [3, 5]');

    // Add 8 -> expect Heap: [3, 5, 8]
    await heapPage.addNumber(8);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [3, 5, 8]');

    // Ensure input was cleared after each add
    expect(await heapPage.input.inputValue()).toBe('');

    // Verify no uncaught page errors occurred during these interactions
    expect(pageErrors.length, `Unexpected page errors after adds: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Toggle to Max Heap, add numbers, and switch back to verify separate heap states', async ({ page }) => {
    // Purpose: Validate the toggle control changes heap mode, and that Min and Max heaps maintain separate internal state.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // First, populate the Min heap with values [3,5,8]
    await heapPage.addNumber(5);
    await heapPage.addNumber(3);
    await heapPage.addNumber(8);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [3, 5, 8]');

    // Toggle to Max heap
    await heapPage.toggleHeapType();
    await expect(heapPage.currentHeapType).toHaveText('Current Heap: Max');

    // Max heap is fresh (no inserts yet) -> display should show nothing or "Heap: []" depending on toggle implementation.
    // The implementation calls displayHeap with maxHeap.get() which is [] (join produces empty string) so expected "Heap: []"
    await expect(heapPage.heapDisplay).toHaveText('Heap: []');

    // Add numbers to Max heap: insert 2 then 10 -> after insertion expect [10, 2]
    await heapPage.addNumber(2);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [2]'); // first insert
    await heapPage.addNumber(10);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [10, 2]'); // after second insert

    // Toggle back to Min heap and expect to see the Min heap's earlier content preserved
    await heapPage.toggleHeapType();
    await expect(heapPage.currentHeapType).toHaveText('Current Heap: Min');
    await expect(heapPage.heapDisplay).toHaveText('Heap: [3, 5, 8]');

    // Confirm no page errors or console errors occurred during toggling and inserting
    expect(pageErrors.length, `Unexpected page errors during toggle/add: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Invalid input triggers an alert with expected message and does not modify heaps', async ({ page }) => {
    // Purpose: Validate error handling for invalid (non-numeric) input: an alert should appear and heaps should remain unchanged.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Prepare: add one valid number to min heap to ensure heap has initial state
    await heapPage.addNumber(7);
    await expect(heapPage.heapDisplay).toHaveText('Heap: [7]');

    // Register a listener to assert the alert dialog message is as expected
    const dialogPromise = page.waitForEvent('dialog');

    // Enter invalid input and click Add to Heap
    await heapPage.input.fill('abc');
    await heapPage.addButton.click();

    // Wait for dialog and assert message
    const dialog = await dialogPromise;
    try {
      expect(dialog.message()).toBe('Please enter a valid number!');
    } finally {
      // Dismiss the alert to allow the page to continue
      await dialog.dismiss();
    }

    // Ensure the heap content did not change after invalid input
    await expect(heapPage.heapDisplay).toHaveText('Heap: [7]');

    // No uncaught page errors expected
    expect(pageErrors.length, `Unexpected page errors after invalid input: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility and visibility checks for interactive controls', async ({ page }) => {
    // Purpose: Verify that the input and buttons are visible and reachable by accessible roles.
    const heapPage = new HeapPage(page);
    await heapPage.goto();

    // Input should be visible and have an accessible role of textbox
    await expect(heapPage.input).toBeVisible();

    // Add and Toggle buttons should be visible and focusable
    await expect(heapPage.addButton).toBeVisible();
    await expect(heapPage.toggleButton).toBeVisible();

    // Keyboard navigation: focus input, type a value and press Enter should not trigger anything (no form), but the control remains operable
    await heapPage.input.focus();
    await heapPage.input.type('4');
    // press Enter - the UI is not a form, so add action is not bound to Enter; ensure no dialog or errors occur
    await page.keyboard.press('Enter');

    // No page errors or console errors should have been emitted
    expect(pageErrors.length, `Unexpected page errors during accessibility check: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});