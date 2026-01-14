import { test, expect } from '@playwright/test';

// Page Object Model for the Heap page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa592-d59e-11f0-89ab-2f71529652ac.html';
    this.input = page.locator('#numberInput');
    this.insertButton = page.getByRole('button', { name: 'Insert' });
    this.removeMinButton = page.getByRole('button', { name: 'Remove Min' });
    this.removeMaxButton = page.getByRole('button', { name: 'Remove Max' });
    this.display = page.locator('#heapDisplay');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Fill number input and click Insert
  async insertNumber(n) {
    await this.input.fill(String(n));
    await this.insertButton.click();
  }

  // Click Remove Min button
  async clickRemoveMin() {
    await this.removeMinButton.click();
  }

  // Click Remove Max button and capture the alert message
  // Returns the alert message text
  async clickRemoveMaxAndGetAlert() {
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.removeMaxButton.click()
    ]);
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Get the raw display text
  async getDisplayText() {
    return (await this.display.textContent()) || '';
  }

  // Parse the display text into an array of numbers
  async getDisplayedHeapArray() {
    const txt = await this.getDisplayText();
    // Expected format: "Current Min Heap: 1, 2, 3"
    const parts = txt.split(':');
    if (parts.length < 2) return [];
    const numbersPart = parts.slice(1).join(':').trim();
    if (numbersPart === '') return [];
    return numbersPart.split(',').map(s => Number(s.trim()));
  }
}

// Collect console errors and page errors across tests
test.describe('Heap (Min/Max) Visualization - End-to-End', () => {
  // We'll attach listeners in beforeEach to collect console and page errors
  test.beforeEach(async ({ page }) => {
    // No-op here; listeners are attached inside each test to ensure isolation
  });

  // Test initial page load and default state
  test('Initial load: UI elements are visible and display is empty', async ({ page }) => {
    // Purpose: Verify that the page loads, input and buttons are visible and the heap display shows default text.
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const heap = new HeapPage(page);
    await heap.goto();

    // Check page title is present in DOM (sanity)
    await expect(page).toHaveTitle(/Heap/i);

    // Input should be visible and empty
    await expect(heap.input).toBeVisible();
    await expect(heap.input).toHaveValue('');

    // Buttons should be visible
    await expect(heap.insertButton).toBeVisible();
    await expect(heap.removeMinButton).toBeVisible();
    await expect(heap.removeMaxButton).toBeVisible();

    // Display should show the label but no numbers
    const displayText = await heap.getDisplayText();
    expect(displayText.startsWith('Current Min Heap:')).toBe(true);
    // After colon, it should be empty or whitespace
    const afterColon = displayText.split(':').slice(1).join(':').trim();
    expect(afterColon).toBe('');

    // Assert there were no uncaught page errors or console error messages
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test insertion and heap root correctness
  test('Insert numbers: display updates and root equals minimum value', async ({ page }) => {
    // Purpose: Insert multiple numbers and verify the heap display includes them and the root is the minimum.
    const consoleErrors1 = [];
    const pageErrors1 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const heap1 = new HeapPage(page);
    await heap.goto();

    const values = [5, 3, 8, 1, 6];
    for (const v of values) {
      await heap.insertNumber(v);
    }

    // The display should mention all inserted numbers (in heap internal order)
    const displayed = await heap.getDisplayedHeapArray();
    // Each inserted value should appear at least once in the displayed heap
    for (const v of values) {
      expect(displayed).toContain(v);
    }

    // The root (first element of internal heap array) should be the minimum of the inserted set
    if (displayed.length > 0) {
      const root = displayed[0];
      const expectedMin = Math.min(...values);
      expect(root).toBe(expectedMin);
    } else {
      // Fail if display is unexpectedly empty
      expect(displayed.length).toBeGreaterThan(0);
    }

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test removing the minimum element
  test('Remove Min: removes the root (minimum) and updates display accordingly', async ({ page }) => {
    // Purpose: Ensure Remove Min removes the smallest element and display reflects the change.
    const consoleErrors2 = [];
    const pageErrors2 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const heap2 = new HeapPage(page);
    await heap.goto();

    const values1 = [4, 2, 7];
    for (const v of values) {
      await heap.insertNumber(v);
    }

    // Capture current heap array
    const before = await heap.getDisplayedHeapArray();
    expect(before.length).toBe(values.length);

    // The element removed should be the minimum
    const expectedMin1 = Math.min(...values);

    // Click Remove Min
    await heap.clickRemoveMin();

    const after = await heap.getDisplayedHeapArray();

    // After removal, the length should decrease by one
    expect(after.length).toBe(before.length - 1);

    // The removed min should no longer be present (one instance removed)
    // If there were duplicates, we'd only require one fewer instance; here values are unique.
    expect(after).not.toContain(expectedMin);

    // New root (if any) should equal the min of remaining elements
    if (after.length > 0) {
      expect(after[0]).toBe(Math.min(...after));
    }

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test Remove Max behavior: shows alert and does NOT modify heap (implementation bug)
  test('Remove Max: alerts with max value and heap remains unchanged (bug verification)', async ({ page }) => {
    // Purpose: Verify Remove Max shows an alert with the maximum value but does not actually remove it from the heap.
    const consoleErrors3 = [];
    const pageErrors3 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const heap3 = new HeapPage(page);
    await heap.goto();

    // Insert known values
    const values2 = [10, 2, 8];
    for (const v of values) {
      await heap.insertNumber(v);
    }

    const before1 = await heap.getDisplayedHeapArray();
    // The maximum value expected
    const expectedMax = Math.max(...values);

    // Click Remove Max and capture alert text
    const alertText = await heap.clickRemoveMaxAndGetAlert();
    expect(alertText).toBe(`Max Value Removed: ${expectedMax}`);

    // After dismissing alert, verify internal heap display did not remove the max (as implemented)
    const after1 = await heap.getDisplayedHeapArray();

    // The implementation's removeMax returns Math.max(...) but does not remove the element.
    // Therefore heap should remain unchanged.
    expect(after.length).toBe(before.length);
    for (const v of before) {
      expect(after).toContain(v);
    }

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: Remove Max on empty heap -> alert shows -Infinity, display remains empty
  test('Remove Max on empty heap: alert with -Infinity and display stays empty', async ({ page }) => {
    // Purpose: Confirm behavior when removing max from an empty heap (Math.max on empty -> -Infinity).
    const consoleErrors4 = [];
    const pageErrors4 = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const heap4 = new HeapPage(page);
    await heap.goto();

    // Ensure heap is empty
    const initial = await heap.getDisplayedHeapArray();
    // If not empty, clear by repeatedly removing min
    if (initial.length > 0) {
      for (let i = 0; i < initial.length; i++) {
        await heap.clickRemoveMin();
      }
    }
    const emptyBefore = await heap.getDisplayedHeapArray();
    expect(emptyBefore.length).toBe(0);

    // Click Remove Max and capture alert
    const alertText1 = await heap.clickRemoveMaxAndGetAlert();
    expect(alertText).toBe('Max Value Removed: -Infinity');

    // Display should remain empty
    const after2 = await heap.getDisplayedHeapArray();
    expect(after.length).toBe(0);

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: Remove Min on empty heap should do nothing (no alert, no error)
  test('Remove Min on empty heap: no alert and display unchanged', async ({ page }) => {
    // Purpose: Ensure clicking Remove Min when heap is empty has no effect and causes no errors.
    const consoleErrors5 = [];
    const pageErrors5 = [];
    let dialogShown = false;

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
    page.on('dialog', () => {
      dialogShown = true;
    });

    const heap5 = new HeapPage(page);
    await heap.goto();

    // Clear heap if needed
    const initial1 = await heap.getDisplayedHeapArray();
    if (initial.length > 0) {
      for (let i = 0; i < initial.length; i++) {
        await heap.clickRemoveMin();
      }
    }
    const before2 = await heap.getDisplayedHeapArray();
    expect(before.length).toBe(0);

    // Click Remove Min - implementation guards against empty heap; nothing should happen
    await heap.clickRemoveMin();

    // No dialog should have shown and display stays empty
    expect(dialogShown).toBe(false);
    const after3 = await heap.getDisplayedHeapArray();
    expect(after.length).toBe(0);

    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});