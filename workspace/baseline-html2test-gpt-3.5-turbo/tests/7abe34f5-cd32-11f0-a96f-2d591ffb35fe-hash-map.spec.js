import { test, expect } from '@playwright/test';

// Playwright tests for Hash Map Demo
// File: 7abe34f5-cd32-11f0-a96f-2d591ffb35fe-hash-map.spec.js
// Tests load the page as-is, observe console and page errors, and verify UI behavior.

// Page object encapsulating interactions with the Hash Map demo
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url =
      'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe34f5-cd32-11f0-a96f-2d591ffb35fe.html';
    this.selectors = {
      keyInput: '#keyInput',
      valueInput: '#valueInput',
      addBtn: '#addBtn',
      deleteBtn: '#deleteBtn',
      getBtn: '#getBtn',
      clearBtn: '#clearBtn',
      message: '#message',
      tableBody: '#hashMapTable tbody',
      table: '#hashMapTable',
    };
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async fillKey(key) {
    await this.page.fill(this.selectors.keyInput, key);
  }

  async fillValue(value) {
    await this.page.fill(this.selectors.valueInput, value);
  }

  async clickAdd() {
    await this.page.click(this.selectors.addBtn);
  }

  async clickDelete() {
    await this.page.click(this.selectors.deleteBtn);
  }

  async clickGet() {
    await this.page.click(this.selectors.getBtn);
  }

  async clickClear() {
    await this.page.click(this.selectors.clearBtn);
  }

  async getMessageText() {
    return (await this.page.locator(this.selectors.message).innerText()).trim();
  }

  async getMessageColor() {
    return this.page.locator(this.selectors.message).evaluate((el) => getComputedStyle(el).color);
  }

  async getTableRows() {
    return this.page.$$(`${this.selectors.tableBody} tr`);
  }

  async readTableContents() {
    // returns array of { key, value } or empty marker text
    const rows = await this.getTableRows();
    if (rows.length === 0) return [];
    const firstRowText = await rows[0].innerText();
    // empty map shows single cell with "(Map is empty)"
    if (firstRowText.includes('(Map is empty)')) {
      return [];
    }
    const results = [];
    for (const row of rows) {
      const cells = await row.$$('td');
      if (cells.length >= 2) {
        const key = (await cells[0].innerText()).trim();
        const value = (await cells[1].innerText()).trim();
        results.push({ key, value });
      }
    }
    return results;
  }

  async getValueInput() {
    return this.page.$eval(this.selectors.valueInput, (el) => el.value);
  }

  async getKeyInput() {
    return this.page.$eval(this.selectors.keyInput, (el) => el.value);
  }

  async tableAriaLabel() {
    return this.page.getAttribute(this.selectors.table, 'aria-label');
  }
}

test.describe('Hash Map (JavaScript Map) Demo - E2E tests', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let pageEventsCleanup = [];

  // Setup a fresh page for every test and capture console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect page errors (uncaught exceptions)
    const pageErrorHandler = (err) => {
      pageErrors.push(err);
    };
    page.on('pageerror', pageErrorHandler);
    pageEventsCleanup.push(() => page.off('pageerror', pageErrorHandler));

    // Collect console.error messages
    const consoleHandler = (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    };
    page.on('console', consoleHandler);
    pageEventsCleanup.push(() => page.off('console', consoleHandler));

    // Auto-accept confirm dialogs (used when clearing the map)
    const dialogHandler = async (dialog) => {
      // Accept all dialogs to simulate user confirming clear map
      await dialog.accept();
    };
    page.on('dialog', dialogHandler);
    pageEventsCleanup.push(() => page.off('dialog', dialogHandler));
  });

  test.afterEach(async () => {
    // cleanup event listeners if any
    for (const off of pageEventsCleanup) {
      try {
        off();
      } catch {
        // ignore
      }
    }
    pageEventsCleanup = [];

    // Assert there were no runtime page errors or console error messages during each test.
    // This verifies that the application ran without uncaught exceptions.
    expect(pageErrors.length, `Expected no page errors, got: ${pageErrors.map(String).join(', ')}`).toBe(0);
    expect(
      consoleErrors.length,
      `Expected no console.error messages, got: ${consoleErrors.map((c) => c.text).join(' | ')}`
    ).toBe(0);
  });

  test.describe('Initial load and UI structure', () => {
    test('Page loads with title, empty map table and message area', async ({ page }) => {
      const app = new HashMapPage(page);
      await app.goto();

      // Verify page heading is visible
      await expect(page.locator('h1')).toHaveText('Hash Map (JavaScript Map) Demo');

      // Table should have aria-label
      const aria = await app.tableAriaLabel();
      expect(aria).toBe('Hash Map Contents');

      // On initial load the table should display the "(Map is empty)" placeholder
      const contents = await app.readTableContents();
      expect(contents).toEqual([]); // empty map represented as empty array here

      // Message area should be present and initially empty
      const message = await app.getMessageText();
      expect(message).toBe('');

      // Inputs and buttons should be visible/enabled
      await expect(page.locator('#keyInput')).toBeVisible();
      await expect(page.locator('#valueInput')).toBeVisible();
      await expect(page.locator('#addBtn')).toBeVisible();
      await expect(page.locator('#deleteBtn')).toBeVisible();
      await expect(page.locator('#getBtn')).toBeVisible();
      await expect(page.locator('#clearBtn')).toBeVisible();
    });
  });

  test.describe('Add / Update entries', () => {
    // Test adding a valid entry
    test('Adding a new entry updates the table and shows success message', async ({ page }) => {
      const app1 = new HashMapPage(page);
      await app.goto();

      // Add entry key1 -> value1
      await app.fillKey('key1');
      await app.fillValue('value1');
      await app.clickAdd();

      // Message should indicate addition
      const msg = await app.getMessageText();
      expect(msg).toBe('Added entry with key "key1".');

      // Message color should be success color (#005a00)
      const color = await app.getMessageColor();
      expect(color).toContain('5, 90, 0'); // rgb or similar; check for 5,90,0 values presence

      // Table should include the new entry
      const table = await app.readTableContents();
      expect(table).toEqual([{ key: 'key1', value: 'value1' }]);
    });

    // Test adding with empty key
    test('Adding with empty key shows error and does not modify map', async ({ page }) => {
      const app2 = new HashMapPage(page);
      await app.goto();

      // Attempt to add without key
      await app.fillKey('');
      await app.fillValue('someValue');
      await app.clickAdd();

      // Should show error message and error color
      const msg1 = await app.getMessageText();
      expect(msg).toBe('Please enter a non-empty key.');

      const color1 = await app.getMessageColor();
      expect(color).toContain('176, 42, 55'); // '#b02a37' => rgb(176,42,55)

      // Table should remain empty
      const table1 = await app.readTableContents();
      expect(table).toEqual([]);
    });

    // Test adding with empty value
    test('Adding with empty value shows error and does not modify map', async ({ page }) => {
      const app3 = new HashMapPage(page);
      await app.goto();

      await app.fillKey('k2');
      await app.fillValue('');
      await app.clickAdd();

      const msg2 = await app.getMessageText();
      expect(msg).toBe('Please enter a value.');

      const color2 = await app.getMessageColor();
      expect(color).toContain('176, 42, 55'); // error color

      const table2 = await app.readTableContents();
      expect(table).toEqual([]);
    });

    // Test updating an existing entry
    test('Updating an existing entry shows update message and replaces value', async ({ page }) => {
      const app4 = new HashMapPage(page);
      await app.goto();

      // Add initial
      await app.fillKey('shared');
      await app.fillValue('v1');
      await app.clickAdd();

      // Update value
      await app.fillKey('shared');
      await app.fillValue('v2');
      await app.clickAdd();

      const msg3 = await app.getMessageText();
      expect(msg).toBe('Updated entry with key "shared".');

      const table3 = await app.readTableContents();
      expect(table).toEqual([{ key: 'shared', value: 'v2' }]);
    });
  });

  test.describe('Get and Delete operations', () => {
    test('Get existing key populates value input and shows info message', async ({ page }) => {
      const app5 = new HashMapPage(page);
      await app.goto();

      // Prepare entry
      await app.fillKey('myKey');
      await app.fillValue('myVal');
      await app.clickAdd();

      // Clear value input to verify get populates it
      await app.fillValue('');
      await app.fillKey('myKey'); // ensure key is set
      await app.clickGet();

      const msg4 = await app.getMessageText();
      expect(msg).toBe('Value for key "myKey": myVal');

      // Value input should now contain the retrieved value
      const valueInput = await app.getValueInput();
      expect(valueInput).toBe('myVal');
    });

    test('Get missing key shows error and clears value input', async ({ page }) => {
      const app6 = new HashMapPage(page);
      await app.goto();

      await app.fillKey('doesNotExist');
      // Ensure value input has something to check it gets cleared
      await app.fillValue('shouldBeCleared');
      await app.clickGet();

      const msg5 = await app.getMessageText();
      expect(msg).toBe('No entry found with key "doesNotExist".');

      const valueInput1 = await app.getValueInput();
      expect(valueInput).toBe(''); // cleared by app
    });

    test('Deleting existing key removes it from the table and shows message', async ({ page }) => {
      const app7 = new HashMapPage(page);
      await app.goto();

      // Add an entry and then delete it
      await app.fillKey('temp');
      await app.fillValue('toDelete');
      await app.clickAdd();

      // Delete
      await app.fillKey('temp');
      await app.clickDelete();

      const msg6 = await app.getMessageText();
      expect(msg).toBe('Deleted entry with key "temp".');

      const table4 = await app.readTableContents();
      expect(table).toEqual([]); // map should be empty again
    });

    test('Deleting non-existing key shows an error message', async ({ page }) => {
      const app8 = new HashMapPage(page);
      await app.goto();

      await app.fillKey('noKeyHere');
      await app.clickDelete();

      const msg7 = await app.getMessageText();
      expect(msg).toBe('No entry found with key "noKeyHere".');

      // Table remains empty
      const table5 = await app.readTableContents();
      expect(table).toEqual([]);
    });
  });

  test.describe('Clear map behavior and edge cases', () => {
    test('Clear map when entries exist clears the map after confirming', async ({ page }) => {
      const app9 = new HashMapPage(page);
      await app.goto();

      // Add two entries
      await app.fillKey('a');
      await app.fillValue('1');
      await app.clickAdd();

      await app.fillKey('b');
      await app.fillValue('2');
      await app.clickAdd();

      // Ensure table has two entries
      let table6 = await app.readTableContents();
      expect(table).toEqual([
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
      ]);

      // Click clear - the test's dialog handler will accept confirm
      await app.clickClear();

      // After clearing, message should indicate map cleared
      const msg8 = await app.getMessageText();
      expect(msg).toBe('Map cleared.');

      // Inputs should be cleared
      const keyInput = await app.getKeyInput();
      const valueInput2 = await app.getValueInput();
      expect(keyInput).toBe('');
      expect(valueInput).toBe('');

      // Table should be empty now
      table = await app.readTableContents();
      expect(table).toEqual([]);
    });

    test('Clear map when already empty shows appropriate error message', async ({ page }) => {
      const app10 = new HashMapPage(page);
      await app.goto();

      // Ensure map is empty
      let table7 = await app.readTableContents();
      expect(table).toEqual([]);

      // Click clear on empty map (no confirm should be triggered)
      await app.clickClear();

      const msg9 = await app.getMessageText();
      expect(msg).toBe('Map is already empty.');

      // Table remains unchanged
      table = await app.readTableContents();
      expect(table).toEqual([]);
    });
  });

  test.describe('Accessibility and DOM checks', () => {
    test('Table has correct header columns and is accessible', async ({ page }) => {
      const app11 = new HashMapPage(page);
      await app.goto();

      // Verify header cells
      const headerCells = await page.$$eval('#hashMapTable thead th', (ths) => ths.map((t) => t.textContent.trim()));
      expect(headerCells).toEqual(['Key', 'Value']);

      // Verify aria-label is meaningful
      const aria1 = await app.tableAriaLabel();
      expect(aria).toBeTruthy();
      expect(aria.toLowerCase()).toContain('hash map');
    });
  });
});