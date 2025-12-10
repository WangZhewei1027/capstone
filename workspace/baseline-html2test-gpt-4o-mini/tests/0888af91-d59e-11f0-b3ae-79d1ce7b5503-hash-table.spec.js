import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888af91-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Hash Table Demo page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('button', { hasText: 'Add to Hash Table' });
    this.getButton = page.locator('button', { hasText: 'Get Value by Key' });
    this.output = page.locator('#hashTableOutput');
    this.title = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterKey(key) {
    await this.keyInput.fill(key);
  }

  async enterValue(value) {
    await this.valueInput.fill(value);
  }

  // Click add and wait for the output to be populated (display is called in add())
  async clickAdd() {
    // Wait for the output text to change or become non-empty after add
    await Promise.all([
      this.page.waitForFunction(
        (selector) => document.querySelector(selector).textContent.length > 0,
        {},
        '#hashTableOutput'
      ),
      this.addButton.click()
    ]);
  }

  // Click get - returns the dialog that appears
  async clickGetAndWaitDialog() {
    return Promise.all([
      this.page.waitForEvent('dialog'),
      this.getButton.click()
    ]);
  }

  async getOutputText() {
    const text = await this.output.textContent();
    return text ?? '';
  }

  async getOutputLines() {
    const text1 = await this.getOutputText();
    // If empty, return empty array
    return text === '' ? [] : text.split('\n');
  }

  // Utility to get specific bucket line, return null if not present
  async getBucketLine(index) {
    const lines = await this.getOutputLines();
    return lines[index] ?? null;
  }

  async clearInputs() {
    await this.keyInput.fill('');
    await this.valueInput.fill('');
  }

  async keyValueInputsAreEmpty() {
    const key = await this.keyInput.inputValue();
    const value = await this.valueInput.inputValue();
    return key === '' && value === '';
  }
}

test.describe('Hash Table Implementation Demo (0888af91-...)', () => {
  // Collect console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Nothing global to set up here; each test will create its own page object.
  });

  test.describe('Initial page and UI elements', () => {
    test('Initial load shows header, inputs, buttons and empty output', async ({ page }) => {
      // Track console messages & page errors for this test
      const consoleMessages = [];
      const pageErrors = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht = new HashTablePage(page);
      await ht.goto();

      // Verify header text is present
      await expect(ht.title).toHaveText('Hash Table Implementation Demo');

      // Verify inputs and buttons are visible
      await expect(ht.keyInput).toBeVisible();
      await expect(ht.valueInput).toBeVisible();
      await expect(ht.addButton).toBeVisible();
      await expect(ht.getButton).toBeVisible();

      // On initial load, display() hasn't been called yet, so output should be empty
      const outputText = await ht.getOutputText();
      expect(outputText).toBe('', 'Expected initial hash table output to be empty before any additions');

      // Assert that there were no uncaught page errors and no console.error messages emitted during load
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });
  });

  test.describe('Adding and updating entries', () => {
    // Add a known key and verify the bucket and input clearing
    test('Adding a key-value pair updates the table and clears inputs', async ({ page }) => {
      const consoleMessages1 = [];
      const pageErrors1 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht1 = new HashTablePage(page);
      await ht.goto();

      // Add "foo":"bar"
      await ht.enterKey('foo');
      await ht.enterValue('bar');

      // Click Add and wait for output to be populated
      await Promise.all([
        ht.addButton.click(),
        page.waitForFunction(
          selector => document.querySelector(selector).textContent.length > 0,
          {},
          '#hashTableOutput'
        )
      ]);

      // The hash function sums char codes: 'f'(102)+ 'o'(111)+ 'o'(111) = 324 => 324 % 10 = 4
      const bucketLine = await ht.getBucketLine(4);
      expect(bucketLine).not.toBeNull();
      expect(bucketLine).toContain('4:');
      expect(bucketLine).toContain('[["foo","bar"]]');

      // After add, inputs should be cleared
      const keyValueEmpty = await ht.keyValueInputsAreEmpty();
      expect(keyValueEmpty).toBe(true);

      // Ensure other buckets are represented (output should have 10 lines since display maps 0..9)
      const lines1 = await ht.getOutputLines();
      expect(lines.length).toBe(10);

      // No runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount1 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });

    test('Adding a colliding key stores both entries in the same bucket', async ({ page }) => {
      const consoleMessages2 = [];
      const pageErrors2 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht2 = new HashTablePage(page);
      await ht.goto();

      // Add initial key "foo":"bar"
      await ht.enterKey('foo');
      await ht.enterValue('bar');
      await Promise.all([
        ht.addButton.click(),
        page.waitForFunction(s => document.querySelector(s).textContent.length > 0, {}, '#hashTableOutput')
      ]);

      // Add colliding key "oof":"baz" which has the same char sum as "foo" (111+111+102 = 324)
      await ht.enterKey('oof');
      await ht.enterValue('baz');
      await Promise.all([
        ht.addButton.click(),
        page.waitForFunction(
          // Wait until the bucket line for index 4 contains the second key
          selector => document.querySelector(selector).textContent.includes('oof'),
          {},
          '#hashTableOutput'
        )
      ]);

      const bucketLine1 = await ht.getBucketLine(4);
      expect(bucketLine).not.toBeNull();
      // Both pairs should be present in JSON array for bucket 4
      expect(bucketLine).toContain('[["foo","bar"],["oof","baz"]]');

      // No runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount2 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });

    test('Updating an existing key replaces its value and does not duplicate the key', async ({ page }) => {
      const consoleMessages3 = [];
      const pageErrors3 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht3 = new HashTablePage(page);
      await ht.goto();

      // Add two entries that collide: "foo" and "oof"
      await ht.enterKey('foo');
      await ht.enterValue('bar');
      await Promise.all([ht.addButton.click(), page.waitForFunction(s => document.querySelector(s).textContent.length > 0, {}, '#hashTableOutput')]);

      await ht.enterKey('oof');
      await ht.enterValue('baz');
      await Promise.all([ht.addButton.click(), page.waitForFunction(s => document.querySelector(s).textContent.includes('oof'), {}, '#hashTableOutput')]);

      // Update "foo" to new value "updated"
      await ht.enterKey('foo');
      await ht.enterValue('updated');
      await Promise.all([
        ht.addButton.click(),
        page.waitForFunction(
          // wait until the bucket text includes the updated value string
          selector => document.querySelector(selector).textContent.includes('updated'),
          {},
          '#hashTableOutput'
        )
      ]);

      const bucketLine2 = await ht.getBucketLine(4);
      expect(bucketLine).not.toBeNull();
      // Expect the foo item to be updated and no duplicate "foo" entries
      expect(bucketLine).toContain('[["foo","updated"],["oof","baz"]]');
      // Ensure only two pairs exist in that bucket
      const bucketJsonMatch = bucketLine.match(/4:\s*(.+)$/);
      expect(bucketJsonMatch).not.toBeNull();
      const bucketJson = JSON.parse(bucketJsonMatch[1]);
      expect(Array.isArray(bucketJson)).toBe(true);
      // lengths should be 2 -> only foo and oof
      expect(bucketJson.length).toBe(2);

      // No runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount3 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });
  });

  test.describe('Retrieving values and alert handling', () => {
    test('Get existing key shows alert with value and clears key input', async ({ page }) => {
      const consoleMessages4 = [];
      const pageErrors4 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht4 = new HashTablePage(page);
      await ht.goto();

      // Prepare state: add "foo":"bar", then update to "updated" to ensure we get latest value
      await ht.enterKey('foo');
      await ht.enterValue('bar');
      await Promise.all([ht.addButton.click(), page.waitForFunction(s => document.querySelector(s).textContent.length > 0, {}, '#hashTableOutput')]);

      await ht.enterKey('foo');
      await ht.enterValue('updated');
      await Promise.all([ht.addButton.click(), page.waitForFunction(s => document.querySelector(s).textContent.includes('updated'), {}, '#hashTableOutput')]);

      // Now attempt to get the value for "foo"
      await ht.enterKey('foo');

      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        ht.getButton.click()
      ]);

      // The alert message should indicate the value
      expect(dialog.message()).toBe('Value for "foo": updated');
      await dialog.accept();

      // After getValue the key input should be cleared
      const keyVal = await ht.keyInput.inputValue();
      expect(keyVal).toBe('', 'Expected key input to be cleared after getValue');

      // No runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount4 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });

    test('Get non-existent key shows not found alert and clears key input', async ({ page }) => {
      const consoleMessages5 = [];
      const pageErrors5 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht5 = new HashTablePage(page);
      await ht.goto();

      await ht.enterKey('doesNotExist');

      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        ht.getButton.click()
      ]);

      // The alert message should indicate not found (note code uses quotes around key)
      expect(dialog.message()).toBe('"doesNotExist" not found');
      await dialog.accept();

      // Key input should be cleared
      const keyVal1 = await ht.keyInput.inputValue();
      expect(keyVal).toBe('');

      // No runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount5 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });
  });

  test.describe('Validation and edge cases (alerts)', () => {
    test('Adding with missing key or value triggers an alert', async ({ page }) => {
      const consoleMessages6 = [];
      const pageErrors6 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht6 = new HashTablePage(page);
      await ht.goto();

      // Case 1: Only key provided, no value
      await ht.enterKey('onlyKey');
      await ht.valueInput.fill(''); // make sure value is empty

      let dialogPromise = page.waitForEvent('dialog');
      await ht.addButton.click();
      const dialog1 = await dialogPromise;
      expect(dialog1.message()).toBe('Please enter both key and value');
      await dialog1.accept();

      // Inputs should remain as per page code? addValue clears only on successful add; ensure value input is still empty and key remains as entered until user clears - code does not clear on failed add
      const keyAfter = await ht.keyInput.inputValue();
      const valueAfter = await ht.valueInput.inputValue();
      expect(keyAfter).toBe('onlyKey');
      expect(valueAfter).toBe('');

      // Case 2: Only value provided, no key
      await ht.keyInput.fill('');
      await ht.valueInput.fill('onlyValue');

      dialogPromise = page.waitForEvent('dialog');
      await ht.addButton.click();
      const dialog2 = await dialogPromise;
      expect(dialog2.message()).toBe('Please enter both key and value');
      await dialog2.accept();

      // Inputs remain unchanged after failed add
      expect(await ht.keyInput.inputValue()).toBe('');
      expect(await ht.valueInput.inputValue()).toBe('onlyValue');

      // No unexpected runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount6 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });

    test('Get without entering a key triggers a helpful alert', async ({ page }) => {
      const consoleMessages7 = [];
      const pageErrors7 = [];
      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const ht7 = new HashTablePage(page);
      await ht.goto();

      // Ensure key input is empty
      await ht.keyInput.fill('');

      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        ht.getButton.click()
      ]);
      expect(dialog.message()).toBe('Please enter a key');
      await dialog.accept();

      // No unexpected runtime errors or console errors occurred
      expect(pageErrors.length).toBe(0);
      const consoleErrorCount7 = consoleMessages.filter(m => m.type() === 'error').length;
      expect(consoleErrorCount).toBe(0);
    });
  });
});