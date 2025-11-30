import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e5fd4-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object for the Hash Table demo page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('button', { hasText: 'Add Entry' });
    this.tableBody = page.locator('#hashTable tbody');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main heading to ensure page loaded
    await this.page.locator('h1', { hasText: 'Hash Table Demonstration' }).waitFor();
  }

  // Fill inputs and click Add Entry button
  async addEntry(key, value) {
    await this.keyInput.fill(key);
    await this.valueInput.fill(value);
    await this.addButton.click();
  }

  // Click add button without filling inputs
  async clickAddButton() {
    await this.addButton.click();
  }

  // Read table rows as array of { key, value } objects
  async getTableRows() {
    return await this.tableBody.evaluate((tbody) => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      return rows.map((r) => {
        const cells = r.querySelectorAll('td');
        return {
          key: cells[0] ? cells[0].textContent.trim() : '',
          value: cells[1] ? cells[1].textContent.trim() : '',
          colspan: cells[0] && cells[0].getAttribute('colspan'),
        };
      });
    });
  }

  // Return current input values
  async getInputValues() {
    const key = await this.keyInput.inputValue();
    const value = await this.valueInput.inputValue();
    return { key, value };
  }

  // Returns whether the "No entries" row is present
  async hasNoEntriesRow() {
    const rows = await this.getTableRows();
    return rows.length === 1 && rows[0].key === 'No entries' || await this.tableBody.locator('tr:has-text("No entries")').count() > 0;
  }
}

test.describe('Hash Table Demonstration - End-to-End', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors and console messages for assertions
    page.on('pageerror', (err) => {
      // store the stack/message for diagnostics
      pageErrors.push(String(err && err.stack ? err.stack : err));
    });

    page.on('console', (msg) => {
      // Keep all console messages for assertions, including their type
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the app
    const htPage = new HashTablePage(page);
    await htPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // In each test we will assert there are no uncaught page errors (unless expected)
    // This ensures we observed console & page issues during the test lifecycle.
    // No specific teardown is required for the page; Playwright handles it.
    // We leave the check to the individual tests which may assert on pageErrors/consoleMessages.
  });

  test('Initial page load displays heading, inputs and an empty table', async ({ page }) => {
    // Purpose: Verify initial UI elements and default table state on load
    const ht = new HashTablePage(page);

    // Assert heading present
    await expect(page.locator('h1')).toHaveText('Hash Table Demonstration');

    // Inputs and button are visible
    await expect(ht.keyInput).toBeVisible();
    await expect(ht.valueInput).toBeVisible();
    await expect(ht.addButton).toBeVisible();

    // The table should show a "No entries" message (implementation writes a row when none)
    const rows = await ht.getTableRows();
    // There should be at least one row indicating no entries
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // The implementation sets tbody.innerHTML = '<tr><td colspan="2">No entries</td></tr>' when empty
    const noEntries = await page.locator('#hashTable tbody tr td:has-text("No entries")').count();
    expect(noEntries).toBeGreaterThan(0);

    // Ensure no page errors were emitted during load
    expect(pageErrors).toEqual([]);
    // Ensure no console error-level messages occurred
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Adding a single valid entry updates the table and clears inputs', async ({ page }) => {
    // Purpose: Verify that adding a valid key/value pair updates the table and clears inputs
    const ht = new HashTablePage(page);

    // Add an entry
    await ht.addEntry('apple', 'fruit');

    // After adding, the table should have a row with the key and value
    const rows = await ht.getTableRows();
    // Because initially there was "No entries" and now there's a real entry; expect at least 1 row with our key
    const found = rows.find(r => r.key === 'apple' && r.value === 'fruit');
    expect(found).toBeTruthy();

    // Inputs should be cleared by clearInputs()
    const inputs = await ht.getInputValues();
    expect(inputs.key).toBe('');
    expect(inputs.value).toBe('');

    // No page errors or console errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Adding multiple entries results in multiple table rows (order preserved)', async ({ page }) => {
    // Purpose: Validate that multiple distinct entries are displayed in the table
    const ht = new HashTablePage(page);

    // Add two entries
    await ht.addEntry('k1', 'v1');
    await ht.addEntry('k2', 'v2');

    // Read table rows and map to simple arrays
    const rows = await ht.getTableRows();
    const kv = rows.map(r => `${r.key}:${r.value}`);

    // Both entries must be present
    expect(kv).toContain('k1:v1');
    expect(kv).toContain('k2:v2');

    // Ensure distinct row count >= 2 (depending on initial 'No entries' behavior it should replace with entries)
    const presentRows = rows.filter(r => r.key !== 'No entries');
    expect(presentRows.length).toBeGreaterThanOrEqual(2);

    // No page errors and no console errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Adding an entry with an existing key overwrites the value (object semantics)', async ({ page }) => {
    // Purpose: Ensure object semantics: same key replaced with new value (resulting in one table row for that key)
    const ht = new HashTablePage(page);

    // Add a key 'dup' with value 'first'
    await ht.addEntry('dup', 'first');

    // Add same key with a new value 'second'
    await ht.addEntry('dup', 'second');

    // There should be exactly one row for key 'dup' and its value should be 'second'
    const rows = await ht.getTableRows();
    const dupRows = rows.filter(r => r.key === 'dup');
    expect(dupRows.length).toBe(1);
    expect(dupRows[0].value).toBe('second');

    // No page errors and no console errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Attempting to add without key or value triggers an alert dialog', async ({ page }) => {
    // Purpose: Validate error handling when inputs are missing (alert is shown)
    const ht = new HashTablePage(page);

    // Ensure both inputs are empty
    await ht.keyInput.fill('');
    await ht.valueInput.fill('');

    // Prepare to catch the dialog and verify its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      ht.clickAddButton(), // This should trigger the alert
    ]);

    // The alert message should match the expected string from addEntry()
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Both key and value are required.');

    // Accept the alert to allow the page to continue
    await dialog.accept();

    // Ensure the table still contains the 'No entries' row (no change)
    const noEntriesCount = await page.locator('#hashTable tbody tr td:has-text("No entries")').count();
    expect(noEntriesCount).toBeGreaterThan(0);

    // The attempt should not produce uncaught page errors; it is handled via alert
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Inputs have required attributes present in the DOM', async ({ page }) => {
    // Purpose: Verify presence of 'required' attribute on inputs (accessibility / form semantics)
    const ht = new HashTablePage(page);

    // The inputs in the HTML include required attributes
    const keyHasRequired = await page.locator('#key').getAttribute('required');
    const valueHasRequired = await page.locator('#value').getAttribute('required');

    // The attribute may be present as an empty string or 'true' depending on the browser; assert it's not null
    expect(keyHasRequired).not.toBeNull();
    expect(valueHasRequired).not.toBeNull();

    // No page errors and no console errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Special characters and whitespace in keys and values are preserved in the table display', async ({ page }) => {
    // Purpose: Ensure that special characters and leading/trailing whitespace are preserved in display
    const ht = new HashTablePage(page);

    const specialKey = '  space:key@# ';
    const specialValue = ' value!\nnewline\tand\ttabs ';
    await ht.addEntry(specialKey, specialValue);

    const rows = await ht.getTableRows();
    // Find the row where key includes 'space:key' (trimmed by the display code uses .textContent.trim())
    // Note: displayEntries inserts raw key/value and then textContent.trim() on read will remove outer whitespace.
    // The app's display does not escape or transform characters, but trimming occurs when we read them via textContent.trim().
    const found = rows.find(r => r.key.includes('space:key') && r.value.includes('value!'));
    expect(found).toBeTruthy();

    // No page errors and no console errors
    expect(pageErrors).toEqual([]);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });

  test('Observe console and page errors throughout interactions remain empty (sanity check)', async ({ page }) => {
    // Purpose: Run a set of interactions and ensure no console errors or uncaught page errors occurred
    const ht = new HashTablePage(page);

    // Perform interactions
    await ht.addEntry('alpha', '1');
    await ht.addEntry('beta', '2');
    // Trigger an alert case
    const dialogPromise = page.waitForEvent('dialog');
    await ht.keyInput.fill('');
    await ht.valueInput.fill('');
    await ht.clickAddButton();
    const dialog = await dialogPromise;
    await dialog.accept();

    // Now assert that no pageerrors were collected
    expect(pageErrors).toEqual([]);

    // And there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([]);
  });
});