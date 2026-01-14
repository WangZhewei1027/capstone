import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f76670b0-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Hash Table demonstration page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.key = page.locator('#key');
    this.value = page.locator('#value');
    this.addButton = page.locator('#addButton');
    this.displayButton = page.locator('#displayButton');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // ensure the main interactive elements are present
    await Promise.all([
      this.page.waitForSelector('#key'),
      this.page.waitForSelector('#value'),
      this.page.waitForSelector('#addButton'),
      this.page.waitForSelector('#displayButton'),
      this.page.waitForSelector('#output'),
    ]);
  }

  // Fill the inputs (does not submit)
  async fillInputs(key, value) {
    await this.key.fill(key);
    await this.value.fill(value);
  }

  // Click add and handle the alert dialog; returns the alert message text
  async clickAddAndAcceptDialog() {
    // Wait for dialog and click
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.addButton.click(),
    ]);
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Click add without expecting a dialog (if you want to handle differently)
  async clickAdd() {
    await this.addButton.click();
  }

  // Click the display button and return the output innerHTML
  async clickDisplayAndGetOutput() {
    await this.displayButton.click();
    // innerHTML is synchronous in this app, but wait for a microtask to be safe
    await this.page.waitForTimeout(10);
    return await this.output.innerHTML();
  }

  async getKeyValue() {
    return {
      key: await this.key.inputValue(),
      value: await this.value.inputValue(),
    };
  }
}

// Helper to compute the same hash used by the page (size 10)
function computeHashIndex(key, size = 10) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash += key.charCodeAt(i);
  }
  return hash % size;
}

test.describe('Hash Table Demonstration - FSM states and transitions', () => {
  // Attach per-test console/page error collectors to the page object so we can assert on them in afterEach.
  test.beforeEach(async ({ page }) => {
    // Arrays to collect errors from page console and uncaught exceptions
    page._consoleErrors = [];
    page._pageErrors = [];

    page.on('console', (msg) => {
      // collect only messages considered errors (type() === 'error')
      try {
        if (msg.type && msg.type() === 'error') {
          page._consoleErrors.push({
            text: msg.text(),
            location: msg.location && msg.location(),
          });
        }
      } catch (e) {
        // ignore collector errors
      }
    });

    page.on('pageerror', (err) => {
      page._pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // Assert no unexpected runtime errors occurred during the test
    // These assertions validate that the page executed without uncaught exceptions or console errors.
    expect(page._pageErrors.length, `Unexpected page errors: ${page._pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
    expect(page._consoleErrors.length, `Unexpected console.errors: ${page._consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
  });

  test('Initial UI state (S0_Idle): inputs present, empty, output empty', async ({ page }) => {
    // Validate the Idle state: inputs are present with correct placeholders and empty values.
    const app = new HashTablePage(page);
    await app.goto();

    // Check inputs exist and have correct placeholder text
    await expect(page.locator('#key')).toBeVisible();
    await expect(page.locator('#value')).toBeVisible();
    await expect(page.locator('#key')).toHaveAttribute('placeholder', 'Enter key');
    await expect(page.locator('#value')).toHaveAttribute('placeholder', 'Enter value');

    // Inputs should be empty in the Idle state
    const kv = await app.getKeyValue();
    expect(kv.key).toBe('');
    expect(kv.value).toBe('');

    // Output should be empty initially (no display yet)
    const outputHtml = await page.locator('#output').innerHTML();
    expect(outputHtml.trim()).toBe('');

    // No dialogs should have appeared; any console/page errors handled in afterEach
  });

  test('Display when empty (S0_Idle -> S2_DisplayOutput -> S0_Idle): shows "Hash Table is empty."', async ({ page }) => {
    // Validate DisplayHashTable event when the table is empty.
    const app = new HashTablePage(page);
    await app.goto();

    const output = await app.clickDisplayAndGetOutput();
    expect(output).toBe('Hash Table is empty.');

    // After display, page remains functional (Idle). Inputs should still be empty.
    const kv = await app.getKeyValue();
    expect(kv.key).toBe('');
    expect(kv.value).toBe('');
  });

  test('Add with missing fields shows validation alert (edge case)', async ({ page }) => {
    // If either key or value missing, the app should alert 'Please enter both key and value.'
    const app = new HashTablePage(page);
    await app.goto();

    // Ensure inputs are empty
    await app.key.fill('');
    await app.value.fill('');

    // Click add and capture the alert
    const alertMessage = await app.clickAddAndAcceptDialog();
    expect(alertMessage).toBe('Please enter both key and value.');

    // After dismissing the alert, inputs remain empty (exit/action behavior)
    const kv = await app.getKeyValue();
    expect(kv.key).toBe('');
    expect(kv.value).toBe('');
  });

  test('Add item successfully triggers alert and clears inputs (S0_Idle -> S1_ItemAdded -> S0_Idle) and display shows the item', async ({ page }) => {
    // Validate successful add transition: alert occurs (entry action for S1_ItemAdded),
    // inputs are cleared (exit actions on transition back to Idle), and display shows the added item.
    const app = new HashTablePage(page);
    await app.goto();

    const testKey = 'foo';
    const testValue = 'bar';

    // Fill and click add; capture alert message
    await app.fillInputs(testKey, testValue);
    const alertMessage = await app.clickAddAndAcceptDialog();
    expect(alertMessage).toBe('Added to hash table!');

    // After accept, inputs should be cleared (exit action of the transition)
    const kvAfter = await app.getKeyValue();
    expect(kvAfter.key).toBe('');
    expect(kvAfter.value).toBe('');

    // Display the hash table and assert output contains the entry
    const outputHtml = await app.clickDisplayAndGetOutput();
    // Recreate expected formatting: "Index X: JSON_of_bucket<br>"
    const idx = computeHashIndex(testKey, 10);
    const expectedBucketJson = JSON.stringify([[testKey, testValue]]);
    const expectedLine = `Index ${idx}: ${expectedBucketJson}`;
    expect(outputHtml).toContain(expectedLine);
  });

  test('Multiple additions and display: ensure all items are present in output (including potential collisions)', async ({ page }) => {
    // Add multiple items, some of which may collide, and verify display includes all added pairs.
    const app = new HashTablePage(page);
    await app.goto();

    const items = [
      { key: 'alpha', value: '1' },
      { key: 'beta', value: '2' },
      { key: 'gamma', value: '3' },
    ];

    // Add each item and accept 'Added to hash table!' alert
    for (const item of items) {
      await app.fillInputs(item.key, item.value);
      const alertMessage = await app.clickAddAndAcceptDialog();
      expect(alertMessage).toBe('Added to hash table!');
      // Ensure inputs are cleared after each add
      const kvAfter = await app.getKeyValue();
      expect(kvAfter.key).toBe('');
      expect(kvAfter.value).toBe('');
    }

    // Display and validate that each item appears somewhere in the output
    const outputHtml = await app.clickDisplayAndGetOutput();

    for (const item of items) {
      const idx = computeHashIndex(item.key, 10);
      const expectedBucketJson = JSON.stringify([[item.key, item.value]]);
      const expectedLine = `Index ${idx}: ${expectedBucketJson}`;
      // Because collisions may group multiple pairs in same index, we check that each expected pair is represented
      // either as its own index line or included within a bucket at its computed index.
      expect(outputHtml).toContain(expectedLine);
    }
  });

  test('Repeated add attempts: add then attempt to add with empty inputs (valid add then edge add) - validates S1->S0 transition behavior', async ({ page }) => {
    // This test verifies the transition from S1_ItemAdded back to S0_Idle: after adding, inputs are cleared,
    // and a subsequent Add click with empty inputs triggers the validation alert.
    const app = new HashTablePage(page);
    await app.goto();

    // 1) Valid add
    await app.fillInputs('key1', 'value1');
    const successAlert = await app.clickAddAndAcceptDialog();
    expect(successAlert).toBe('Added to hash table!');

    // After successful add, inputs cleared
    let kv = await app.getKeyValue();
    expect(kv.key).toBe('');
    expect(kv.value).toBe('');

    // 2) Immediately click add again without filling -> should show validation alert
    const validationAlert = await app.clickAddAndAcceptDialog();
    expect(validationAlert).toBe('Please enter both key and value.');

    // Inputs stay empty
    kv = await app.getKeyValue();
    expect(kv.key).toBe('');
    expect(kv.value).toBe('');
  });
});