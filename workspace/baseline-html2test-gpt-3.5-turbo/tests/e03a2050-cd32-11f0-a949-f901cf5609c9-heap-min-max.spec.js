import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a2050-cd32-11f0-a949-f901cf5609c9.html';

// Page Object Model for the Heap demo page
class HeapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.heapType = page.locator('#heap-type');
    this.insertValue = page.locator('#insert-value');
    this.insertBtn = page.locator('#insert-btn');
    this.extractBtn = page.locator('#extract-btn');
    this.peekBtn = page.locator('#peek-btn');
    this.clearBtn = page.locator('#clear-btn');
    this.heapArray = page.locator('#heap-array');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Select heap type by value: 'min' or 'max'
  async selectHeapType(type) {
    await this.heapType.selectOption(type);
  }

  // Insert a string into the input and click Insert
  async insertValueAndClick(value) {
    await this.insertValue.fill(String(value));
    await this.insertBtn.click();
  }

  // Click extract root
  async clickExtract() {
    await this.extractBtn.click();
  }

  // Click peek root
  async clickPeek() {
    await this.peekBtn.click();
  }

  // Click clear
  async clickClear() {
    await this.clearBtn.click();
  }

  // Get text contents
  async getHeapArrayText() {
    return (await this.heapArray.textContent()) ?? '';
  }

  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }
}

test.describe('Heap (Min/Max) Demo - e03a2050-cd32-11f0-a949-f901cf5609c9', () => {
  // Shared across tests to capture console messages and page errors
  let consoleMessages;
  let pageErrors;

  // Setup and teardown for each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages (log, error, warn, etc.)
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Basic assertion to ensure no unexpected page errors occurred during the test run.
    // If there are page errors, include them in the assertion message for debugging.
    expect(pageErrors.length, `Page errors were emitted: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);
    // Also assert that the console did not emit any error-level messages.
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, `Console error messages: ${errorConsole.map(m => m.text).join(' | ')}`).toBe(0);
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and show default Min Heap state', async ({ page }) => {
      const heapPage = new HeapPage(page);

      // Navigate to the application
      await heapPage.goto();

      // The script calls updateHeapType() on init which logs 'Switched to Min Heap'
      // Verify output displays that message and heap array starts as an empty array.
      await expect(heapPage.heapArray).toHaveText('[]');
      await expect(heapPage.output).toHaveText('Switched to Min Heap');

      // Ensure the select default value is 'min'
      await expect(heapPage.heapType).toHaveValue('min');

      // Check console captured the initial log (non-error)
      const initLogs = consoleMessages.map(m => `${m.type}:${m.text}`).join(' | ');
      // At least one console message should have been emitted (the page script logs); assert that.
      expect(initLogs.length).toBeGreaterThan(0);
    });
  });

  test.describe('Heap type switching', () => {
    test('should switch to Max Heap and back to Min Heap with proper output', async ({ page }) => {
      const heapPage1 = new HeapPage(page);
      await heapPage.goto();

      // Switch to Max Heap
      await heapPage.selectHeapType('max');
      await expect(heapPage.output).toHaveText('Switched to Max Heap');
      await expect(heapPage.heapType).toHaveValue('max');

      // Switch back to Min Heap
      await heapPage.selectHeapType('min');
      await expect(heapPage.output).toHaveText('Switched to Min Heap');
      await expect(heapPage.heapType).toHaveValue('min');

      // Heap display should remain an array (empty)
      await expect(heapPage.heapArray).toHaveText('[]');
    });
  });

  test.describe('Min Heap operations', () => {
    test('should insert values and maintain min-heap property, peek and extract correctly', async ({ page }) => {
      const heapPage2 = new HeapPage(page);
      await heapPage.goto();

      // Ensure min heap is selected
      await heapPage.selectHeapType('min');
      await expect(heapPage.output).toHaveText('Switched to Min Heap');

      // Insert sequence [5, 3, 8, 1] and assert the heap internal array after each insert
      await heapPage.insertValueAndClick(5);
      await expect(heapPage.output).toHaveText('Inserted value: 5');
      await expect(heapPage.heapArray).toHaveText('[5]');

      await heapPage.insertValueAndClick(3);
      await expect(heapPage.output).toHaveText('Inserted value: 3');
      await expect(heapPage.heapArray).toHaveText('[3,5]');

      await heapPage.insertValueAndClick(8);
      await expect(heapPage.output).toHaveText('Inserted value: 8');
      await expect(heapPage.heapArray).toHaveText('[3,5,8]');

      await heapPage.insertValueAndClick(1);
      await expect(heapPage.output).toHaveText('Inserted value: 1');
      // Expected min-heap internal array for inserts [5,3,8,1] is [1,3,8,5]
      await expect(heapPage.heapArray).toHaveText('[1,3,8,5]');

      // Peek root should show 1
      await heapPage.clickPeek();
      await expect(heapPage.output).toHaveText('Root (peek): 1');

      // Extract root should remove 1 and reorder to [3,5,8]
      await heapPage.clickExtract();
      await expect(heapPage.output).toHaveText('Extracted root: 1');
      await expect(heapPage.heapArray).toHaveText('[3,5,8]');

      // Extract until empty and check messages
      await heapPage.clickExtract();
      expect(await heapPage.getOutputText()).toMatch(/Extracted root:/);
      await heapPage.clickExtract();
      expect(await heapPage.getOutputText()).toMatch(/Extracted root:/);
      // Now one more extract should empty the heap
      await heapPage.clickExtract();
      // When heap empty, it should report 'Heap is empty. Nothing to extract.' or return null
      await expect(heapPage.output).toHaveText('Heap is empty. Nothing to extract.');
      await expect(heapPage.heapArray).toHaveText('[]');

      // Clear on empty still works and reports cleared
      await heapPage.clickClear();
      await expect(heapPage.output).toHaveText('Heap cleared.');
      await expect(heapPage.heapArray).toHaveText('[]');
    });
  });

  test.describe('Input validation and error handling', () => {
    test('should report an error message when inserting a non-numeric value', async ({ page }) => {
      const heapPage3 = new HeapPage(page);
      await heapPage.goto();

      // Insert an invalid value 'abc'
      await heapPage.insertValueAndClick('abc');

      // The app should display a validation message and not change the heap array
      await expect(heapPage.output).toHaveText('Please enter a valid number to insert.');
      await expect(heapPage.heapArray).toHaveText('[]');
    });

    test('empty string as input should convert to 0 (Number(\'\') === 0) and insert 0', async ({ page }) => {
      const heapPage4 = new HeapPage(page);
      await heapPage.goto();

      // Fill an empty string (clear) and click insert - per implementation Number('') === 0
      await heapPage.insertValue.fill(''); // ensures empty
      await heapPage.insertBtn.click();

      // Because Number('') is 0, the app will accept and insert 0
      await expect(heapPage.output).toHaveText('Inserted value: 0');
      await expect(heapPage.heapArray).toHaveText('[0]');
    });
  });

  test.describe('Max Heap operations', () => {
    test('should operate as a Max Heap when selected', async ({ page }) => {
      const heapPage5 = new HeapPage(page);
      await heapPage.goto();

      // Switch to max heap
      await heapPage.selectHeapType('max');
      await expect(heapPage.output).toHaveText('Switched to Max Heap');

      // Insert sequence [2, 9, 4]
      await heapPage.insertValueAndClick(2);
      await expect(heapPage.output).toHaveText('Inserted value: 2');
      await expect(heapPage.heapArray).toHaveText('[2]');

      await heapPage.insertValueAndClick(9);
      await expect(heapPage.output).toHaveText('Inserted value: 9');
      await expect(heapPage.heapArray).toHaveText('[9,2]');

      await heapPage.insertValueAndClick(4);
      await expect(heapPage.output).toHaveText('Inserted value: 4');
      await expect(heapPage.heapArray).toHaveText('[9,2,4]');

      // Peek should show 9 (the maximum)
      await heapPage.clickPeek();
      await expect(heapPage.output).toHaveText('Root (peek): 9');

      // Extract root should remove 9 and reorder to [4,2]
      await heapPage.clickExtract();
      await expect(heapPage.output).toHaveText('Extracted root: 9');
      await expect(heapPage.heapArray).toHaveText('[4,2]');

      // Clear the heap and assert empty
      await heapPage.clickClear();
      await expect(heapPage.output).toHaveText('Heap cleared.');
      await expect(heapPage.heapArray).toHaveText('[]');
    });
  });

  test.describe('Console & accessibility checks', () => {
    test('should not emit page errors and should log expected output messages for actions', async ({ page }) => {
      const heapPage6 = new HeapPage(page);
      await heapPage.goto();

      // Clear collected logs for focused assertions
      consoleMessages = [];

      // Do several operations to generate logs
      await heapPage.insertValueAndClick(7);
      await heapPage.clickPeek();
      await heapPage.insertValueAndClick(2);
      await heapPage.clickExtract();
      await heapPage.clickClear();

      // Ensure some console logs were emitted and include expected messages
      const texts = consoleMessages.map(m => m.text).join(' | ');
      expect(texts.length).toBeGreaterThan(0);

      // Check that the application's textual output reflects recent operations
      const lastOutput = await heapPage.getOutputText();
      // After Clear, the app logs 'Heap cleared.'
      expect(lastOutput).toBe('Heap cleared.');

      // Accessibility sanity: ensure buttons and inputs are visible and enabled
      await expect(heapPage.insertBtn).toBeVisible();
      await expect(heapPage.insertBtn).toBeEnabled();
      await expect(heapPage.extractBtn).toBeVisible();
      await expect(heapPage.peekBtn).toBeVisible();
      await expect(heapPage.clearBtn).toBeVisible();
      await expect(heapPage.insertValue).toBeVisible();
      await expect(heapPage.heapType).toBeVisible();
    });
  });
});