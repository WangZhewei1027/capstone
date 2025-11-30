import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262736b4-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object Model for the Hash Table page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('button', { hasText: 'Add' });
    this.tbody = page.locator('#hashTable tbody');
    this.rows = this.tbody.locator('tr');
  }

  // Navigate to the page and wait for it to load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Fill inputs and click the Add button
  async addEntry(key, value) {
    if (key !== null) {
      await this.keyInput.fill(key);
    }
    if (value !== null) {
      await this.valueInput.fill(value);
    }
    // Click the Add button to trigger addToHashTable
    await Promise.all([
      this.page.waitForTimeout(50), // small pause to allow any immediate DOM updates
      this.addButton.click()
    ]);
  }

  // Return an array of rows as objects: [{ index, key, value }, ...]
  async getTableRows() {
    const count = await this.rows.count();
    const result = [];
    for (let i = 0; i < count; i++) {
      const row = this.rows.nth(i);
      const cells = row.locator('td');
      const indexText = (await cells.nth(0).innerText()).trim();
      const keyText = (await cells.nth(1).innerText()).trim();
      const valueText = (await cells.nth(2).innerText()).trim();
      result.push({ index: indexText, key: keyText, value: valueText });
    }
    return result;
  }

  // Get raw text content of the table body
  async getTableText() {
    return (await this.tbody.innerText()).trim();
  }

  // Return the current values of the key and value inputs
  async getInputValues() {
    return {
      key: await this.keyInput.inputValue(),
      value: await this.valueInput.inputValue()
    };
  }

  // Utility to call the page's hashTable.get(key) from the browser context
  async getValueFromHashTable(key) {
    return await this.page.evaluate((k) => {
      // Access the global hashTable created by the page script
      // We intentionally do not modify it, only read via its public get method
      // If hashTable is not defined, this will throw in the page context and surface as a page error
      return window.hashTable.get(k);
    }, key);
  }
}

test.describe('Interactive Hash Table - 262736b4-cd2a-11f0-bee4-a3a342d77f94', () => {
  // Collect console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console 'error' messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // Listen for uncaught exceptions in the page
    page.on('pageerror', (err) => {
      try {
        pageErrors.push(err.message);
      } catch (e) {
        // ignore listener errors
      }
    });
  });

  test.afterEach(async () => {
    // Assert that there were no console error messages emitted by the page
    // This verifies that no runtime ReferenceError/SyntaxError/TypeError surfaced during the test
    expect(consoleErrors, `Console errors detected: ${consoleErrors.join(' || ')}`).toHaveLength(0);
    expect(pageErrors, `Page errors detected: ${pageErrors.join(' || ')}`).toHaveLength(0);
  });

  test('Initial load: inputs and table are present and table is empty', async ({ page }) => {
    // Purpose: Verify initial DOM state on page load
    const htPage = new HashTablePage(page);
    await htPage.goto();

    // Title and header exist
    await expect(page.locator('h1')).toHaveText('Interactive Hash Table Example');

    // Inputs and button are visible
    await expect(htPage.keyInput).toBeVisible();
    await expect(htPage.valueInput).toBeVisible();
    await expect(htPage.addButton).toBeVisible();

    // Inputs should be empty by default
    const inputs = await htPage.getInputValues();
    expect(inputs.key).toBe('');
    expect(inputs.value).toBe('');

    // Table body should be empty (no rows)
    const rows = await htPage.getTableRows();
    expect(rows.length).toBe(0);

    // There should be a table with the correct headers
    await expect(page.locator('#hashTable thead th')).toHaveCount(3);
    await expect(page.locator('#hashTable thead th').nth(0)).toHaveText('Index');
    await expect(page.locator('#hashTable thead th').nth(1)).toHaveText('Key');
    await expect(page.locator('#hashTable thead th').nth(2)).toHaveText('Value');
  });

  test('Adding a key-value pair updates the table and clears inputs', async ({ page }) => {
    // Purpose: Validate adding an entry updates the DOM and clears input fields
    const htPage = new HashTablePage(page);
    await htPage.goto();

    // Add a simple entry
    await htPage.addEntry('alpha', '1');

    // After adding, inputs should be cleared by the page script
    const inputsAfter = await htPage.getInputValues();
    expect(inputsAfter.key).toBe('');
    expect(inputsAfter.value).toBe('');

    // Table should contain exactly one row with the inserted key/value
    const rows = await htPage.getTableRows();
    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.key).toBe('alpha');
    expect(row.value).toBe('1');

    // Index should be a number string (0..6) because hash table default size is 7
    expect(Number.isInteger(Number(row.index))).toBeTruthy();
    const idx = Number(row.index);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(7);

    // Also verify that calling the page's hashTable.get returns the stored value
    const valueFromHT = await htPage.getValueFromHashTable('alpha');
    expect(valueFromHT).toBe('1');
  });

  test('Adding multiple entries including collisions shows multiple rows and get() returns expected first entry', async ({ page }) => {
    // Purpose: Test collisions (multiple items mapping to same index) and behavior when adding duplicate keys
    const htPage = new HashTablePage(page);
    await htPage.goto();

    // Single-character keys hash to 0 because the hash function multiplies charCode by index and index 0 contributes 0.
    // This creates collisions intentionally for testing.
    await htPage.addEntry('a', 'one');
    await htPage.addEntry('b', 'two');
    await htPage.addEntry('c', 'three');

    // Verify that three rows are present
    let rows = await htPage.getTableRows();
    expect(rows.length).toBe(3);

    // All rows should likely have the same index (commonly '0' for single-char keys). Validate at least they are numbers.
    rows.forEach((r) => {
      expect(Number.isInteger(Number(r.index))).toBeTruthy();
    });

    // Verify specific content exists in the table
    const keys = rows.map(r => r.key);
    const values = rows.map(r => r.value);
    expect(keys).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(values).toEqual(expect.arrayContaining(['one', 'two', 'three']));

    // Now test duplicate key behavior: add same key twice with different values
    await htPage.addEntry('x', 'first');
    await htPage.addEntry('x', 'second');

    // Two rows with key 'x' should be present; the HashTable.get should return the first inserted value ('first')
    rows = await htPage.getTableRows();
    const xRows = rows.filter(r => r.key === 'x');
    expect(xRows.length).toBeGreaterThanOrEqual(2);

    const firstValueFromGet = await htPage.getValueFromHashTable('x');
    expect(firstValueFromGet).toBe('first');

    // The table should reflect both entries for the duplicate key (both 'first' and 'second' should appear as values)
    const xValuesInTable = xRows.map(r => r.value);
    expect(xValuesInTable).toEqual(expect.arrayContaining(['first', 'second']));
  });

  test('Clicking Add with missing inputs triggers an alert and does not modify the table', async ({ page }) => {
    // Purpose: Test edge case where user tries to add with missing key or value -> alert is shown and no table change
    const htPage = new HashTablePage(page);
    await htPage.goto();

    // Ensure starting from empty state
    let initialRows = await htPage.getTableRows();
    expect(initialRows.length).toBe(0);

    // Fill only the value input and leave key empty -> should trigger alert
    await htPage.valueInput.fill('onlyValue');

    // Listen for the dialog and assert its message
    const dialogPromise = page.waitForEvent('dialog');
    await htPage.addButton.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Both key and value are required.');
    await dialog.dismiss();

    // Table should remain unchanged
    const rowsAfter = await htPage.getTableRows();
    expect(rowsAfter.length).toBe(0);

    // Now fill only key and leave value empty -> should trigger alert again
    await htPage.keyInput.fill('onlyKey');
    const dialogPromise2 = page.waitForEvent('dialog');
    await htPage.addButton.click();
    const dialog2 = await dialogPromise2;
    expect(dialog2.message()).toBe('Both key and value are required.');
    await dialog2.dismiss();

    // Table still unchanged
    const rowsAfter2 = await htPage.getTableRows();
    expect(rowsAfter2.length).toBe(0);

    // Finally fill both and ensure add works (sanity)
    await htPage.keyInput.fill('final');
    await htPage.valueInput.fill('val');
    await htPage.addButton.click();
    const finalRows = await htPage.getTableRows();
    expect(finalRows.length).toBe(1);
    expect(finalRows[0].key).toBe('final');
    expect(finalRows[0].value).toBe('val');
  });

  test('Accessibility and visibility checks for interactive elements', async ({ page }) => {
    // Purpose: Ensure inputs and button are accessible and visible to users
    const htPage = new HashTablePage(page);
    await htPage.goto();

    // Inputs should have accessible names via placeholders
    await expect(htPage.keyInput).toHaveAttribute('placeholder', 'Key');
    await expect(htPage.valueInput).toHaveAttribute('placeholder', 'Value');

    // Button should be focusable and operable via keyboard - we simulate pressing Enter while focused
    await htPage.keyInput.focus();
    await htPage.keyInput.fill('tabKey');
    await page.keyboard.press('Tab'); // move focus to value input
    await htPage.valueInput.fill('tabValue');
    await page.keyboard.press('Tab'); // move focus to Add button
    // Press Space to activate the button while focused
    await page.keyboard.press('Space');

    // After activation, table should have the row added
    const rows = await htPage.getTableRows();
    expect(rows.length).toBe(1);
    expect(rows[0].key).toBe('tabKey');
    expect(rows[0].value).toBe('tabValue');
  });
});