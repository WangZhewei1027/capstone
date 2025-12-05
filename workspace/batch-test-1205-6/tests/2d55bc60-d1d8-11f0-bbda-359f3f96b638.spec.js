import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d55bc60-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Hash Table demo
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keySelector = '#key';
    this.valueSelector = '#value';
    this.insertButton = "button[onclick='insert()']";
    this.searchButton = "button[onclick='search()']";
    this.removeButton = "button[onclick='remove()']";
    this.tableBody = '#tableBody';
    this.header = 'h1';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getHeaderText() {
    return (await this.page.locator(this.header).innerText()).trim();
  }

  async fillKey(key) {
    await this.page.fill(this.keySelector, key);
  }

  async fillValue(value) {
    await this.page.fill(this.valueSelector, value);
  }

  async getInputValues() {
    const key = await this.page.$eval(this.keySelector, el => el.value);
    const value = await this.page.$eval(this.valueSelector, el => el.value);
    return { key, value };
  }

  async clickInsert() {
    await this.page.click(this.insertButton);
  }

  async clickSearch() {
    await this.page.click(this.searchButton);
  }

  async clickRemove() {
    await this.page.click(this.removeButton);
  }

  // Returns array of rows as objects { index, key, value }
  async getTableRows() {
    return await this.page.$$eval(`${this.tableBody} tr`, rows =>
      rows.map(r => {
        const cells = r.querySelectorAll('td');
        return {
          index: cells[0]?.innerText ?? '',
          key: cells[1]?.innerText ?? '',
          value: cells[2]?.innerText ?? ''
        };
      })
    );
  }

  async countTableRows() {
    return await this.page.$$eval(`${this.tableBody} tr`, rows => rows.length);
  }

  // Helper to check whether a specific key/value exists in table
  async hasRowWithKeyValue(key, value) {
    const rows = await this.getTableRows();
    return rows.some(r => r.key === key && r.value === value);
  }
}

test.describe('Hash Table Demonstration - FSM states and transitions', () => {
  // Collect console errors and page errors to assert runtime health
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
  });

  // Test S0_Idle: initial render
  test('S0_Idle: Page renders initial state with header, inputs and empty table', async ({ page }) => {
    const app = new HashTablePage(page);
    await app.goto();

    // Validate header present as evidence of Idle state renderPage()
    const header = await app.getHeaderText();
    expect(header).toBe('Simple Hash Table Demonstration');

    // Inputs and buttons exist
    await expect(page.locator('#key')).toBeVisible();
    await expect(page.locator('#value')).toBeVisible();
    await expect(page.locator("button[onclick='insert()']")).toBeVisible();
    await expect(page.locator("button[onclick='search()']")).toBeVisible();
    await expect(page.locator("button[onclick='remove()']")).toBeVisible();

    // Table initially empty
    const rowCount = await app.countTableRows();
    expect(rowCount).toBe(0);

    // No runtime console errors should have occurred during load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test Insert event: S0 -> S1 (Inserted)
  test('Insert: Inserting a key/value updates table and clears inputs (S0 -> S1)', async ({ page }) => {
    const app1 = new HashTablePage(page);
    await app.goto();

    // Insert a key-value pair
    await app.fillKey('alpha');
    await app.fillValue('1');

    // Click Insert and wait for table update
    await app.clickInsert();

    // After insert, inputs should have been cleared
    const inputs = await app.getInputValues();
    expect(inputs.key).toBe('');
    expect(inputs.value).toBe('');

    // Table should contain the inserted key/value
    const exists = await app.hasRowWithKeyValue('alpha', '1');
    expect(exists).toBe(true);

    // No runtime console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test Search event: S0 -> S2 (Search Result) for both found and not found
  test('Search: Searching returns "Value found" for existing and "Key not found." for missing (S0 -> S2)', async ({ page }) => {
    const app2 = new HashTablePage(page);
    await app.goto();

    // Insert an item to search for
    await app.fillKey('key1');
    await app.fillValue('val1');
    await app.clickInsert();

    // Search for existing key => expect dialog "Value found: val1"
    await app.fillKey('key1');
    const dialogPromise1 = page.waitForEvent('dialog');
    await app.clickSearch();
    const dialog1 = await dialogPromise1;
    expect(dialog1.message()).toBe('Value found: val1');
    await dialog1.accept();

    // Search for non-existing key => expect dialog "Key not found."
    await app.fillKey('no-such-key');
    const dialogPromise2 = page.waitForEvent('dialog');
    await app.clickSearch();
    const dialog2 = await dialogPromise2;
    expect(dialog2.message()).toBe('Key not found.');
    await dialog2.accept();

    // No runtime console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test Remove event: S0 -> S3 (Removed)
  test('Remove: Removing an existing key shows "Key removed." and updates table (S0 -> S3)', async ({ page }) => {
    const app3 = new HashTablePage(page);
    await app.goto();

    // Insert then remove
    await app.fillKey('toRemove');
    await app.fillValue('xyz');
    await app.clickInsert();

    // Ensure it's present
    expect(await app.hasRowWithKeyValue('toRemove', 'xyz')).toBe(true);

    // Remove the key
    await app.fillKey('toRemove');
    const dialogPromise = page.waitForEvent('dialog');
    await app.clickRemove();
    const dialog = await dialogPromise;
    expect(dialog.message()).toBe('Key removed.');
    await dialog.accept();

    // Table should no longer contain the key
    expect(await app.hasRowWithKeyValue('toRemove', 'xyz')).toBe(false);

    // No runtime console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test Insert from S1 (Inserted) to S0: inserting additional item while in inserted state
  test('S1_Inserted -> S0_Idle: Insert again from inserted state adds another pair and table contains both', async ({ page }) => {
    const app4 = new HashTablePage(page);
    await app.goto();

    // First insert
    await app.fillKey('first');
    await app.fillValue('1');
    await app.clickInsert();

    // Second insert (transition S1 -> S0 per FSM)
    await app.fillKey('second');
    await app.fillValue('2');
    await app.clickInsert();

    // Both entries should exist in table
    expect(await app.hasRowWithKeyValue('first', '1')).toBe(true);
    expect(await app.hasRowWithKeyValue('second', '2')).toBe(true);

    // No runtime console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test Remove transition S3 -> S0 by removing twice (first succeeds, second results in "Key not found.")
  test('S3_Removed -> S0_Idle: Removing twice demonstrates removal then not-found behavior', async ({ page }) => {
    const app5 = new HashTablePage(page);
    await app.goto();

    // Insert a key
    await app.fillKey('duplicate');
    await app.fillValue('valdup');
    await app.clickInsert();

    // First remove - should remove
    await app.fillKey('duplicate');
    const dialog1Promise = page.waitForEvent('dialog');
    await app.clickRemove();
    const dialog11 = await dialog1Promise;
    expect(dialog1.message()).toBe('Key removed.');
    await dialog1.accept();

    // Table should not contain it
    expect(await app.hasRowWithKeyValue('duplicate', 'valdup')).toBe(false);

    // Second remove - should alert 'Key not found.'
    await app.fillKey('duplicate');
    const dialog2Promise = page.waitForEvent('dialog');
    await app.clickRemove();
    const dialog21 = await dialog2Promise;
    expect(dialog2.message()).toBe('Key not found.');
    await dialog2.accept();

    // Table remains unchanged (still does not contain it)
    expect(await app.hasRowWithKeyValue('duplicate', 'valdup')).toBe(false);

    // No runtime console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Edge cases and error scenarios
  test('Edge cases: Empty key insert/search/remove behaviors', async ({ page }) => {
    const app6 = new HashTablePage(page);
    await app.goto();

    // Insert an empty key - allowed by implementation (empty string)
    await app.fillKey('');
    await app.fillValue('emptyVal');
    await app.clickInsert();

    // Table should have an entry with empty key and value 'emptyVal'
    const rows1 = await app.getTableRows();
    // Find an entry with value 'emptyVal'; key cell may be empty string
    const foundEmpty = rows.some(r => r.value === 'emptyVal');
    expect(foundEmpty).toBe(true);

    // Search for empty key: should find the value we just inserted
    await app.fillKey('');
    const dialogSearch = await page.waitForEvent('dialog');
    await app.clickSearch();
    const dialogMsg = (await dialogSearch).message();
    // Could be "Value found: emptyVal" or another message if collision; assert contains expected substring
    expect(dialogMsg).toBe('Value found: emptyVal');
    await dialogSearch.accept();

    // Remove empty key: should alert 'Key removed.'
    await app.fillKey('');
    const dialogRemove = page.waitForEvent('dialog');
    await app.clickRemove();
    const dialogRemoveObj = await dialogRemove;
    expect(dialogRemoveObj.message()).toBe('Key removed.');
    await dialogRemoveObj.accept();

    // After removal the table should no longer contain that value
    expect((await app.getTableRows()).some(r => r.value === 'emptyVal')).toBe(false);

    // No runtime console errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test.afterEach(async () => {
    // No global teardown required here; individual tests assert console/page errors.
    // This hook is provided for completeness and possible future instrumentation.
  });
});