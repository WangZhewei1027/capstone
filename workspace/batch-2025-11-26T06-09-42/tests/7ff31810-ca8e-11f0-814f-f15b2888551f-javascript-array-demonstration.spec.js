import { test, expect } from '@playwright/test';

// Test file for Application ID: 7ff31810-ca8e-11f0-814f-f15b2888551f
// URL: http://127.0.0.1:5500/workspace/batch-2025-11-26T06-09-42/html/7ff31810-ca8e-11f0-814f-f15b2888551f.html
// Filename required: 7ff31810-ca8e-11f0-814f-f15b2888551f-javascript-array-demonstration.spec.js

// Page Object encapsulating interactions and assertions for the Array Demonstration app
class ArrayAppPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T06-09-42/html/7ff31810-ca8e-11f0-814f-f15b2888551f.html';
    // Locators
    this.arrayDisplay = page.locator('#array-display');
    this.arrayStringDisplay = page.locator('#array-string-display');
    this.arrayLengthDisplay = page.locator('#array-length');
    this.itemInput = page.locator('#item-input');
    this.outputDiv = page.locator('#output');

    // Buttons
    this.btnAddToEnd = page.locator('button.primary', { hasText: 'Add to End (push)' });
    this.btnAddToStart = page.getByRole('button', { name: 'Add to Start (unshift)' });
    this.btnRemoveFromEnd = page.getByRole('button', { name: 'Remove from End (pop)' });
    this.btnRemoveFromStart = page.getByRole('button', { name: 'Remove from Start (shift)' });
    this.btnSort = page.getByRole('button', { name: 'Sort (sort)' });
    this.btnReverse = page.getByRole('button', { name: 'Reverse (reverse)' });
    this.btnFindApple = page.getByRole('button', { name: "Find 'Apple' (find)" });
    this.btnFilter = page.getByRole('button', { name: 'Filter items > length 5 (filter)' });
    this.btnMap = page.getByRole('button', { name: 'Capitalize All (map)' });
    this.btnReset = page.getByRole('button', { name: 'Reset Array' });
  }

  async goto() {
    await this.page.goto(this.url);
    // Wait for the initial updateDisplay to have run and rendered items
    await expect(this.arrayDisplay).toBeVisible();
  }

  async getArrayItemsText() {
    const count = await this.arrayDisplay.locator('.array-item').count();
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.arrayDisplay.locator('.array-item').nth(i).innerText());
    }
    return items;
  }

  async getArrayString() {
    return (await this.arrayStringDisplay.innerText()).trim();
  }

  async getArrayLength() {
    const text = (await this.arrayLengthDisplay.innerText()).trim();
    return Number(text);
  }

  async getOutputText() {
    return (await this.outputDiv.innerText()).trim();
  }

  async fillInput(text) {
    await this.itemInput.fill(text);
  }

  async addItem(text) {
    if (text !== undefined) await this.fillInput(text);
    // primary button
    await Promise.all([
      this.page.waitForTimeout(50), // slight pause to ensure DOM ready for click handlers
      this.btnAddToEnd.click()
    ]);
  }

  async addItemToStart(text) {
    if (text !== undefined) await this.fillInput(text);
    await this.btnAddToStart.click();
  }

  async removeItem() {
    await this.btnRemoveFromEnd.click();
  }

  async removeItemFromStart() {
    await this.btnRemoveFromStart.click();
  }

  async sortArray() {
    await this.btnSort.click();
  }

  async reverseArray() {
    await this.btnReverse.click();
  }

  async findItem() {
    await this.btnFindApple.click();
  }

  async filterItems() {
    await this.btnFilter.click();
  }

  async mapItems() {
    await this.btnMap.click();
  }

  async resetArray() {
    await this.btnReset.click();
  }

  // Utility to empty the array by repeatedly removing from end
  async emptyArrayViaPop() {
    // Keep removing until length becomes 0; guard against infinite loop by limit
    for (let i = 0; i < 20; i++) {
      const len = await this.getArrayLength();
      if (len === 0) return;
      await this.removeItem();
    }
  }
}

test.describe('JavaScript Array Demonstration - FSM & UI validation', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Setup and teardown for each test: navigate to the page and collect console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // push the error object so tests can assert none occurred
      pageErrors.push(err);
      consoleMessages.push({ type: 'pageerror', text: err.message });
    });

    // Collect console messages (info/warn/error) for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // After each test assert that there were no runtime page errors (ReferenceError/SyntaxError/TypeError)
    // This validates the page loaded and executed without uncaught exceptions.
    // If errors exist, fail the test and include collected console messages for debugging.
    const seriousErrors = pageErrors.filter(e =>
      ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name)
    );
    expect(seriousErrors, `Unexpected runtime errors: ${JSON.stringify(pageErrors.map(e => e.message))}\nConsole: ${JSON.stringify(consoleMessages)}`).toEqual([]);
  });

  test.describe('Initial state and onEnter/updateDisplay behavior', () => {
    test('Initial render shows the default array, length, and output placeholder', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Validate the visual items
      const items = await app.getArrayItemsText();
      expect(items).toEqual(['Banana', 'Apple', 'Orange', 'Mango']);

      // Validate string representation and length
      const arrString = await app.getArrayString();
      expect(arrString).toBe('["Banana", "Apple", "Orange", "Mango"]');
      const length = await app.getArrayLength();
      expect(length).toBe(4);

      // onEnter (updateDisplay) clears previous output and sets it to '...'
      const output = await app.getOutputText();
      expect(output).toBe('...');
    });
  });

  test.describe('Push / Unshift / Pop / Shift operations', () => {
    test('Add to End (push) appends item and updates UI & output', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.addItem('Pineapple');

      const items = await app.getArrayItemsText();
      expect(items[items.length - 1]).toBe('Pineapple');
      expect(await app.getArrayLength()).toBe(5);

      const output = await app.getOutputText();
      expect(output).toBe('Pushed "Pineapple" to the end of the array.');
    });

    test('Add to Start (unshift) inserts at beginning and clears input', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.addItemToStart('Kiwi');

      const items = await app.getArrayItemsText();
      expect(items[0]).toBe('Kiwi');
      expect(await app.getArrayLength()).toBe(5);

      const output = await app.getOutputText();
      expect(output).toBe('Unshifted "Kiwi" to the start of the array.');

      // Input should be cleared
      expect(await app.itemInput.inputValue()).toBe('');
    });

    test('Remove from End (pop) removes last item and updates output', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Remove last item (Mango)
      await app.removeItem();

      const items = await app.getArrayItemsText();
      expect(items).toEqual(['Banana', 'Apple', 'Orange']);
      expect(await app.getArrayLength()).toBe(3);

      const output = await app.getOutputText();
      expect(output).toBe('Popped "Mango" from the end of the array.');
    });

    test('Remove from Start (shift) removes first item and updates output', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Remove first item (Banana)
      await app.removeItemFromStart();

      const items = await app.getArrayItemsText();
      expect(items).toEqual(['Apple', 'Orange', 'Mango']);
      expect(await app.getArrayLength()).toBe(3);

      const output = await app.getOutputText();
      expect(output).toBe('Shifted "Banana" from the start of the array.');
    });

    test('Removing from empty array triggers alert "Array is empty!"', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Empty the array via repeated pops
      await app.emptyArrayViaPop();
      expect(await app.getArrayLength()).toBe(0);

      // Handle dialog and assert its message
      let dialogMessage = null;
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await app.removeItem(); // this should trigger alert
      expect(dialogMessage).toBe('Array is empty!');
    });
  });

  test.describe('Other common methods: sort, reverse, find, filter, map, reset', () => {
    test('Sort sorts alphabetically and updates the display & output', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.sortArray();

      const items = await app.getArrayItemsText();
      expect(items).toEqual(['Apple', 'Banana', 'Mango', 'Orange']); // alphabetical
      expect(await app.getOutputText()).toBe('Array has been sorted alphabetically.');
      expect(await app.getArrayString()).toBe('["Apple", "Banana", "Mango", "Orange"]');
    });

    test('Reverse reverses order and updates the display & output', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.reverseArray();

      const items = await app.getArrayItemsText();
      expect(items).toEqual(['Mango', 'Orange', 'Apple', 'Banana']);
      expect(await app.getOutputText()).toBe('Array order has been reversed.');
      expect(await app.getArrayLength()).toBe(4);
    });

    test('Find "Apple" finds the item (case-insensitive) and reports result', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.findItem();

      const output = await app.getOutputText();
      expect(output).toBe('Found the first instance: "Apple".');
    });

    test('Filter items > length 5 returns expected list and does not modify original array', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.filterItems();

      const output = await app.getOutputText();
      // Should include Banana and Orange, original unchanged
      expect(output).toContain('Items with more than 5 characters: [Banana, Orange]');
      expect(await app.getArrayLength()).toBe(4); // original array unchanged
      expect(await app.getArrayItemsText()).toEqual(['Banana', 'Apple', 'Orange', 'Mango']);
    });

    test('Map items converts to uppercase and updates the array & output', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      await app.mapItems();

      const items = await app.getArrayItemsText();
      expect(items).toEqual(['BANANA', 'APPLE', 'ORANGE', 'MANGO']);
      expect(await app.getOutputText()).toBe('Applied .map() to capitalize all items. The original array has been modified.');
    });

    test('Reset returns array to initial values after modifications', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Modify some state
      await app.addItem('Papaya');
      expect((await app.getArrayLength()) >= 5).toBeTruthy();

      // Reset
      await app.resetArray();

      // Validate original state restored
      expect(await app.getArrayItemsText()).toEqual(['Banana', 'Apple', 'Orange', 'Mango']);
      expect(await app.getArrayString()).toBe('["Banana", "Apple", "Orange", "Mango"]');
      expect(await app.getOutputText()).toBe('Array has been reset to its initial state.');
    });
  });

  test.describe('Edge cases and user interactions', () => {
    test('Attempting to add an empty value triggers alert and does not change array', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Ensure input empty
      await app.fillInput('');

      let dialogMessage = null;
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      // Click add (primary) with empty input
      await app.addItem();

      expect(dialogMessage).toBe('Please enter a value to add.');

      // Array remains unchanged
      expect(await app.getArrayItemsText()).toEqual(['Banana', 'Apple', 'Orange', 'Mango']);
    });

    test('Multiple operations in sequence produce expected combined effects', async ({ page }) => {
      const app = new ArrayAppPage(page);
      await app.goto();

      // Sequence: add to start, add to end, sort, map, remove start, reverse
      await app.addItemToStart('Avocado'); // Avocado, Banana, Apple, Orange, Mango
      await app.addItem('Blueberry'); // Avocado, Banana, Apple, Orange, Mango, Blueberry
      await app.sortArray(); // Alphabetical
      expect(await app.getArrayItemsText()).toEqual(['Apple', 'Avocado', 'Banana', 'Blueberry', 'Mango', 'Orange']);

      await app.mapItems(); // uppercase
      expect(await app.getArrayItemsText()).toEqual(['APPLE', 'AVOCADO', 'BANANA', 'BLUEBERRY', 'MANGO', 'ORANGE']);

      await app.removeItemFromStart(); // removes APPLE
      expect(await app.getArrayItemsText()[0]).toBe('AVOCADO');

      await app.reverseArray();
      const items = await app.getArrayItemsText();
      // last operation reverse should invert the current order
      expect(items[0]).toBe('ORANGE');
    });
  });

  test('No unexpected console errors or runtime exceptions occurred during interactions', async ({ page }) => {
    // This test ensures that during normal usage (navigating and performing some actions) no uncaught errors are emitted.
    const app = new ArrayAppPage(page);
    await app.goto();

    // Perform several actions to exercise code paths
    await app.addItem('TestFruit');
    await app.removeItem();
    await app.sortArray();
    await app.findItem();
    await app.filterItems();
    await app.mapItems();
    await app.resetArray();

    // After actions, assert that there are no page errors captured.
    // The afterEach will also assert for ReferenceError/SyntaxError/TypeError.
    // Here we additionally check console for any messages of type 'error'.
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors, `Console errors were emitted: ${JSON.stringify(errors)}`).toEqual([]);
  });
});