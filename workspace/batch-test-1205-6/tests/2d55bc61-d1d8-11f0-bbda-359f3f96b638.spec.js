import { test, expect } from '@playwright/test';

// Test file for Application ID: 2d55bc61-d1d8-11f0-bbda-359f3f96b638
// Served at: http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d55bc61-d1d8-11f0-bbda-359f3f96b638.html
// Filename requirement: 2d55bc61-d1d8-11f0-bbda-359f3f96b638.spec.js
//
// These tests validate the FSM states and transitions for the "Hash Map Demo" app.
// - S0_Idle: initial UI rendered
// - S1_KeyValueAdded: after adding key/value, list updates
// - S2_ValueRetrieved: retrieving value shows correct result or 'Key not found'
//
// Tests also observe console messages and page errors (pageerror). We let any runtime errors occur naturally
// and assert about their presence/absence as part of verification. Each test collects console + page errors
// to ensure the runtime behaved as expected for that interaction.

const APP_URL =
  'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d55bc61-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object Model for the Hash Map Demo page
class HashMapPage {
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.addButton = page.locator('#addButton');
    this.getButton = page.locator('#getButton');
    this.hashMapList = page.locator('#hashMapList');
    this.retrievedValue = page.locator('#retrievedValue');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the basic elements are visible before interacting further
    await expect(this.keyInput).toBeVisible();
    await expect(this.valueInput).toBeVisible();
    await expect(this.addButton).toBeVisible();
    await expect(this.getButton).toBeVisible();
  }

  async fillKey(key) {
    await this.keyInput.fill(key);
  }

  async fillValue(value) {
    await this.valueInput.fill(value);
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async clickGet() {
    await this.getButton.click();
  }

  async addKeyValue(key, value) {
    await this.fillKey(key);
    await this.fillValue(value);
    await this.clickAdd();
  }

  // Return array of text contents of list items
  async getListItems() {
    return await this.hashMapList.locator('li').allTextContents();
  }

  async getRetrievedValueText() {
    return await this.retrievedValue.textContent();
  }
}

test.describe('Hash Map Demo - FSM states and transitions', () => {
  let consoleMessages;
  let pageErrors;

  // Setup before each test: create collectors for console and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages (info, warning, error, debug, etc.)
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect unhandled page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store error object for assertions
      pageErrors.push(err);
    });
  });

  // Teardown after each test: assert there were no unexpected runtime errors
  test.afterEach(async () => {
    // We assert that no uncaught page errors occurred during the test.
    // If any ReferenceError/SyntaxError/TypeError happened, they would appear in pageErrors.
    // The application as provided is expected to be syntactically correct; assert zero page errors.
    expect(
      pageErrors.length,
      `Expected no uncaught page errors, but found: ${pageErrors
        .map((e) => `${e.name}: ${e.message}`)
        .join('; ')}`
    ).toBe(0);
  });

  test('S0_Idle: initial render shows inputs, buttons, empty list and value area', async ({ page }) => {
    // Validate initial idle state rendering (S0_Idle)
    const app = new HashMapPage(page);
    await app.goto();

    // Inputs should be empty initially
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // List and retrieved value should be empty
    const listItems = await app.getListItems();
    expect(listItems.length).toBe(0);

    const retrieved = (await app.getRetrievedValueText()) || '';
    expect(retrieved.trim()).toBe('');

    // Confirm no console errors of type 'error' were logged during load
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('AddKeyValuePair (S0 -> S1): adding a key-value pair updates the displayed list and clears inputs', async ({ page }) => {
    // Validate transition to Key-Value Added (S1_KeyValueAdded)
    const app1 = new HashMapPage(page);
    await app.goto();

    // Add a key-value pair
    const key = 'fruit';
    const value = 'apple';
    await app.addKeyValue(key, value);

    // After adding, inputs should be cleared (behavior in code)
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // The list should contain the new entry in the format 'key: value'
    const items = await app.getListItems();
    expect(items).toContain(`${key}: ${value}`);

    // Add another distinct pair and ensure list grows
    await app.addKeyValue('color', 'blue');
    const itemsAfter = await app.getListItems();
    expect(itemsAfter.length).toBeGreaterThanOrEqual(2);
    expect(itemsAfter).toContain('color: blue');
  });

  test('GetValueByKey (S0 -> S2): retrieving an existing value displays it in retrievedValue', async ({ page }) => {
    // Validate transition to Value Retrieved (S2_ValueRetrieved) for existing key
    const app2 = new HashMapPage(page);
    await app.goto();

    // Add a known key/value first
    const key1 = 'name';
    const value1 = 'Playwright';
    await app.addKeyValue(key, value);

    // Since add clears inputs, fill key to retrieve
    await app.fillKey(key);
    await app.clickGet();

    // retrievedValue should show the exact value
    const retrievedText = (await app.getRetrievedValueText()) || '';
    expect(retrievedText.trim()).toBe(value);
  });

  test("GetValueByKey: searching for a non-existent key shows 'Key not found'", async ({ page }) => {
    // Edge case: key not present -> should display 'Key not found'
    const app3 = new HashMapPage(page);
    await app.goto();

    // Ensure map is empty initially
    const initialItems = await app.getListItems();
    expect(initialItems.length).toBe(0);

    // Fill a key that doesn't exist and click Get
    await app.fillKey('nonexistent');
    await app.clickGet();

    const retrievedText1 = (await app.getRetrievedValueText()) || '';
    expect(retrievedText.trim()).toBe('Key not found');
  });

  test('Edge case: trying to add with missing key or value triggers alert dialog (user feedback)', async ({ page }) => {
    // The page uses alert() when either key or value is missing.
    // We intercept dialog and assert the message.
    const app4 = new HashMapPage(page);
    await app.goto();

    // Case 1: both empty
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await app.clickAdd(); // clicking add with empty fields
    expect(dialogMessage).toBe('Please enter both key and value');

    // Case 2: missing value
    dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await app.fillKey('onlyKey');
    await app.valueInput.fill(''); // ensure empty
    await app.clickAdd();
    expect(dialogMessage).toBe('Please enter both key and value');
  });

  test('Edge case: trying to get with empty key triggers alert dialog (user feedback)', async ({ page }) => {
    // Test the alert when attempting to get with empty key
    const app5 = new HashMapPage(page);
    await app.goto();

    let dialogMessage1 = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Ensure key input is empty
    await app.keyInput.fill('');
    await app.clickGet();
    expect(dialogMessage).toBe('Please enter a key to search');
  });

  test('Adding duplicate keys stores both entries and entries() reflects duplicates', async ({ page }) => {
    // The HashMap implementation stores multiple entries even for same key in separate array entries
    // This test adds same key multiple times and ensures entries show duplicates.
    const app6 = new HashMapPage(page);
    await app.goto();

    const key2 = 'dup';
    await app.addKeyValue(key, 'first');
    await app.addKeyValue(key, 'second');

    // Since entries() pushes each key:value pair, we expect both to appear in the list
    const items1 = await app.getListItems();

    // It should contain both 'dup: first' and 'dup: second'
    expect(items).toContain('dup: first');
    expect(items).toContain('dup: second');

    // Now retrieving the key with get() should return the first matching value (per implementation)
    await app.fillKey(key);
    await app.clickGet();
    const retrievedText2 = (await app.getRetrievedValueText()) || '';
    // Implementation iterates and returns first match -> expects 'first'
    expect(retrievedText.trim()).toBe('first');
  });
});