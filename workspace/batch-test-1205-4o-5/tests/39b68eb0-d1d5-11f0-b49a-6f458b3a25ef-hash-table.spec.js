import { test, expect } from '@playwright/test';

// Page Object for the Hash Table demo page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.addButton = page.locator('button', { hasText: 'Add to Hash Table' });
    this.table = page.locator('#hashTable');
  }

  // Navigate to the demo page
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b68eb0-d1d5-11f0-b49a-6f458b3a25ef.html', { waitUntil: 'load' });
  }

  // Fill key input
  async fillKey(key) {
    await this.keyInput.fill(key);
  }

  // Fill value input
  async fillValue(value) {
    await this.valueInput.fill(value);
  }

  // Click the Add button
  async clickAdd() {
    await this.addButton.click();
  }

  // Return the number of rows in the table (including header)
  async rowCount() {
    return await this.table.locator('tr').count();
  }

  // Get table rows (excluding header) as array of objects { index, key, value }
  async getRowsData() {
    const rows = [];
    const rowLocator = this.table.locator('tr');
    const count = await rowLocator.count();
    // skip header at position 0
    for (let i = 1; i < count; i++) {
      const row = rowLocator.nth(i);
      const indexText = await row.locator('td').nth(0).innerText();
      const keyText = await row.locator('td').nth(1).innerText();
      const valueText = await row.locator('td').nth(2).innerText();
      rows.push({ index: indexText, key: keyText, value: valueText });
    }
    return rows;
  }

  // Helper to call hashTable.get() in page context
  async getValueFromHashTable(key) {
    return await this.page.evaluate((k) => {
      // Access the global hashTable created by the page
      return window.hashTable ? window.hashTable.get(k) : undefined;
    }, key);
  }
}

// Group related tests
test.describe('Hash Table Demonstration - E2E', () => {
  let pageErrors;
  let consoleErrors;

  // Each test will set up a new page and page object
  test.beforeEach(async ({ page }) => {
    // Track console.error messages and uncaught page errors for each test
    pageErrors = [];
    consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      // Collect uncaught exceptions thrown in the page
      pageErrors.push(err.message);
    });
  });

  // Test initial page load and default state
  test('should load the page and display default elements', async ({ page }) => {
    const app = new HashTablePage(page);
    // Navigate to the page
    await app.goto();

    // Verify title and headings are present
    await expect(page.locator('h1')).toHaveText('Hash Table Demonstration');
    await expect(page.locator('h2')).toHaveText('Hash Table');

    // Verify inputs and button exist and are visible
    await expect(app.keyInput).toBeVisible();
    await expect(app.valueInput).toBeVisible();
    await expect(app.addButton).toBeVisible();

    // Verify table has only header row initially
    const rows1 = await app.rowCount();
    expect(rows).toBe(1); // header only

    // Assert no uncaught page errors or console errors occurred during load
    expect(pageErrors, 'No uncaught page errors during initial load').toHaveLength(0);
    expect(consoleErrors, 'No console errors during initial load').toHaveLength(0);
  });

  // Test adding a single key/value pair
  test('should add a key-value pair and update the table, then clear inputs', async ({ page }) => {
    const app1 = new HashTablePage(page);
    await app.goto();

    // Ensure inputs empty at start
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // Fill inputs and click add
    await app.fillKey('name');
    await app.fillValue('Alice');
    await app.clickAdd();

    // After adding, header + 1 row
    const rows2 = await app.rowCount();
    expect(rows).toBe(2);

    // Verify the table content includes the added key/value
    const data = await app.getRowsData();
    expect(data.length).toBe(1);
    expect(data[0].key).toBe('name');
    expect(data[0].value).toBe('Alice');
    // index should be a number string between 0 and 9
    const indexNum = parseInt(data[0].index, 10);
    expect(Number.isInteger(indexNum)).toBe(true);
    expect(indexNum).toBeGreaterThanOrEqual(0);
    expect(indexNum).toBeLessThanOrEqual(9);

    // Inputs should be cleared after successful add
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // Verify internal hashTable.get returns the expected value
    const stored = await app.getValueFromHashTable('name');
    expect(stored).toBe('Alice');

    // Assert no uncaught page errors or console errors during interaction
    expect(pageErrors, 'No uncaught page errors while adding pair').toHaveLength(0);
    expect(consoleErrors, 'No console errors while adding pair').toHaveLength(0);
  });

  // Test handling of collisions: two different keys mapping to same index
  test('should handle collisions by adding multiple pairs to same index', async ({ page }) => {
    const app2 = new HashTablePage(page);
    await app.goto();

    // Use 'a' and 'k' which have char codes 97 and 107 -> both %10 == 7 (collision)
    await app.fillKey('a');
    await app.fillValue('first');
    await app.clickAdd();

    await app.fillKey('k');
    await app.fillValue('second');
    await app.clickAdd();

    // After two adds, header + 2 rows
    const totalRows = await app.rowCount();
    expect(totalRows).toBe(3);

    const data1 = await app.getRowsData();
    expect(data.length).toBe(2);

    // Both rows should have the same index
    expect(data[0].index).toBe(data[1].index);
    // Keys and values should be present
    const keys = data.map(r => r.key);
    const values = data.map(r => r.value);
    expect(keys).toEqual(expect.arrayContaining(['a', 'k']));
    expect(values).toEqual(expect.arrayContaining(['first', 'second']));

    // Check internal storage via hashTable.get
    const valA = await app.getValueFromHashTable('a');
    const valK = await app.getValueFromHashTable('k');
    expect(valA).toBe('first');
    expect(valK).toBe('second');

    // Assert no runtime errors during collision tests
    expect(pageErrors, 'No uncaught page errors during collision test').toHaveLength(0);
    expect(consoleErrors, 'No console errors during collision test').toHaveLength(0);
  });

  // Test edge case: attempting to add with missing inputs should show alert and not modify table
  test('should alert when trying to add without both key and value and not change table', async ({ page }) => {
    const app3 = new HashTablePage(page);
    await app.goto();

    // Track dialog messages
    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    // Initially table has header only
    expect(await app.rowCount()).toBe(1);

    // Case 1: Missing value
    await app.fillKey('onlyKey');
    // Ensure value empty
    await expect(app.valueInput).toHaveValue('');
    await app.clickAdd();

    // Expect an alert dialog with appropriate message
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[dialogs.length - 1]).toBe('Please enter both key and value');
    // Table unchanged
    expect(await app.rowCount()).toBe(1);

    // Case 2: Missing key
    await app.fillValue('onlyValue');
    await expect(app.keyInput).toHaveValue('');
    await app.clickAdd();
    expect(dialogs[dialogs.length - 1]).toBe('Please enter both key and value');
    expect(await app.rowCount()).toBe(1);

    // Case 3: Both missing
    await app.clickAdd();
    expect(dialogs[dialogs.length - 1]).toBe('Please enter both key and value');
    expect(await app.rowCount()).toBe(1);

    // Assert no uncaught exceptions triggered aside from the expected dialog flow
    expect(pageErrors, 'No uncaught page errors when triggering alert scenarios').toHaveLength(0);
    expect(consoleErrors, 'No console errors when triggering alert scenarios').toHaveLength(0);
  });

  // Test that multiple sequential adds accumulate in the table correctly
  test('should correctly accumulate multiple entries in table and preserve order by index scanning', async ({ page }) => {
    const app4 = new HashTablePage(page);
    await app.goto();

    const entries = [
      { key: 'one', value: '1' },
      { key: 'two', value: '2' },
      { key: 'three', value: '3' },
    ];

    for (const e of entries) {
      await app.fillKey(e.key);
      await app.fillValue(e.value);
      await app.clickAdd();
    }

    // header + 3 rows
    expect(await app.rowCount()).toBe(4);

    const data2 = await app.getRowsData();
    expect(data.length).toBe(3);

    // Ensure each added key/value present
    for (const e of entries) {
      expect(data.map(d => d.key)).toContain(e.key);
      expect(data.map(d => d.value)).toContain(e.value);
      const fromInternal = await app.getValueFromHashTable(e.key);
      expect(fromInternal).toBe(e.value);
    }

    // Assert no runtime errors
    expect(pageErrors, 'No uncaught page errors during multiple-adds test').toHaveLength(0);
    expect(consoleErrors, 'No console errors during multiple-adds test').toHaveLength(0);
  });
});