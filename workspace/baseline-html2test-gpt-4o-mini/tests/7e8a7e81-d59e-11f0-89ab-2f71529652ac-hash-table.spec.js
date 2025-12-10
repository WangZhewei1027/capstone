import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8a7e81-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Hash Table demo page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('button', { hasText: 'Add to Hash Table' });
    this.tableBody = page.locator('#tableBody');
    this.tableRows = () => this.tableBody.locator('tr');
    this.tableCells = (rowIndex) => this.tableRows().nth(rowIndex).locator('td');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill inputs then click Add button
  async addKeyValue(key, value) {
    await this.keyInput.fill(key);
    await this.valueInput.fill(value);
    await this.addButton.click();
  }

  // Click add without filling
  async clickAdd() {
    await this.addButton.click();
  }

  async getAllRowsText() {
    const rows = await this.tableRows().count();
    const result = [];
    for (let i = 0; i < rows; i++) {
      const cells = this.tableCells(i);
      const key = await cells.nth(0).textContent();
      const value = await cells.nth(1).textContent();
      result.push([key?.trim() ?? '', value?.trim() ?? '']);
    }
    return result;
  }

  async getInputValues() {
    return {
      key: await this.keyInput.inputValue(),
      value: await this.valueInput.inputValue(),
    };
  }
}

test.describe('Hash Table Demonstration - UI and behavior', () => {
  // Collect console messages and page errors so tests can assert on them
  test.beforeEach(async ({ page }) => {
    // No-op here; listeners are added per test to avoid cross-test bleed
  });

  // Group of tests validating initial load and default state
  test.describe('Initial load and default state', () => {
    test('loads the page, shows header, inputs and an empty table with no uncaught page errors', async ({ page }) => {
      const pageErrors = [];
      const consoleMessages = [];

      // Listen for uncaught exceptions and console messages
      page.on('pageerror', (err) => {
        pageErrors.push(err);
      });
      page.on('console', (msg) => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      });

      const app = new HashTablePage(page);
      await app.goto();

      // Basic UI elements are visible
      await expect(page.locator('h1')).toHaveText('Hash Table Demonstration');
      await expect(app.keyInput).toBeVisible();
      await expect(app.valueInput).toBeVisible();
      await expect(app.addButton).toBeVisible();

      // The table exists and is initially empty (tbody has no rows)
      await expect(page.locator('#hashTable')).toBeVisible();
      await expect(app.tableRows()).toHaveCount(0);

      // Ensure no uncaught page errors occurred during initial load
      expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e=>String(e)).join(', ')}`).toBe(0);

      // Also assert no console messages with error types or JavaScript error names appeared
      const problematicConsole = consoleMessages.filter(m =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/.test(m.text)
      );
      expect(problematicConsole.length, `Console reported errors: ${JSON.stringify(problematicConsole)}`).toBe(0);
    });
  });

  // Tests for adding entries and validating DOM updates
  test.describe('Adding entries and DOM updates', () => {
    test('adds a single key-value pair and clears inputs after adding', async ({ page }) => {
      const pageErrors1 = [];
      const consoleMessages1 = [];
      page.on('pageerror', (err) => pageErrors.push(err));
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      const app1 = new HashTablePage(page);
      await app.goto();

      // Add one pair
      await app.addKeyValue('foo', 'bar');

      // Table should show one new row with the key and value
      await expect(app.tableRows()).toHaveCount(1);
      const rowsText = await app.getAllRowsText();
      expect(rowsText).toEqual([['foo', 'bar']]);

      // Inputs should be cleared after successful add
      const inputs = await app.getInputValues();
      expect(inputs.key).toBe('');
      expect(inputs.value).toBe('');

      // No unexpected page errors or console errors
      expect(pageErrors.length).toBe(0);
      const problematicConsole1 = consoleMessages.filter(m =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/.test(m.text)
      );
      expect(problematicConsole.length).toBe(0);
    });

    test('shows an alert when attempting to add with missing key or value', async ({ page }) => {
      const pageErrors2 = [];
      const consoleMessages2 = [];
      page.on('pageerror', (err) => pageErrors.push(err));
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      const app2 = new HashTablePage(page);
      await app.goto();

      // Case 1: both empty
      const dialogs1 = [];
      page.once('dialog', dialog => {
        dialogs1.push({ message: dialog.message(), type: dialog.type() });
        dialog.accept();
      });
      await app.clickAdd();
      expect(dialogs1.length).toBe(1);
      expect(dialogs1[0].message).toBe('Please enter both key and value.');
      expect(dialogs1[0].type).toBe('alert');

      // Case 2: key only
      await app.keyInput.fill('onlyKey');
      const dialogs2 = [];
      page.once('dialog', dialog => {
        dialogs2.push({ message: dialog.message(), type: dialog.type() });
        dialog.accept();
      });
      await app.clickAdd();
      expect(dialogs2.length).toBe(1);
      expect(dialogs2[0].message).toBe('Please enter both key and value.');

      // Case 3: value only
      await app.keyInput.fill(''); // clear
      await app.valueInput.fill('onlyValue');
      const dialogs3 = [];
      page.once('dialog', dialog => {
        dialogs3.push({ message: dialog.message(), type: dialog.type() });
        dialog.accept();
      });
      await app.clickAdd();
      expect(dialogs3.length).toBe(1);
      expect(dialogs3[0].message).toBe('Please enter both key and value.');

      // Ensure no uncaught errors happened
      expect(pageErrors.length).toBe(0);
      const problematicConsole2 = consoleMessages.filter(m =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/.test(m.text)
      );
      expect(problematicConsole.length).toBe(0);
    });

    test('handles hash collisions: multiple keys mapping to same index appear as separate rows', async ({ page }) => {
      // Keys 'a' and 'k' both have ASCII sums that mod 10 yield same index (97 % 10 = 7, 107 % 10 = 7)
      const pageErrors3 = [];
      const consoleMessages3 = [];
      page.on('pageerror', (err) => pageErrors.push(err));
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      const app3 = new HashTablePage(page);
      await app.goto();

      await app.addKeyValue('a', 'first');
      await app.addKeyValue('k', 'second');

      // Both entries should be displayed as separate rows in the table
      const rows1 = await app.tableRows().count();
      expect(rows).toBeGreaterThanOrEqual(2);
      const rowsText1 = await app.getAllRowsText();
      // Ensure both key-value pairs are present somewhere in the table
      const hasA = rowsText.some(r => r[0] === 'a' && r[1] === 'first');
      const hasK = rowsText.some(r => r[0] === 'k' && r[1] === 'second');
      expect(hasA).toBe(true);
      expect(hasK).toBe(true);

      // No uncaught errors or console errors during collisions
      expect(pageErrors.length).toBe(0);
      const problematicConsole3 = consoleMessages.filter(m =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/.test(m.text)
      );
      expect(problematicConsole.length).toBe(0);
    });

    test('multiple sequential additions produce the correct number of rows and maintain content', async ({ page }) => {
      const pageErrors4 = [];
      const consoleMessages4 = [];
      page.on('pageerror', (err) => pageErrors.push(err));
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      const app4 = new HashTablePage(page);
      await app.goto();

      const pairs = [
        ['alpha', '1'],
        ['beta', '2'],
        ['gamma', '3'],
      ];

      for (const [k, v] of pairs) {
        await app.addKeyValue(k, v);
      }

      // Verify the number of rows equals the number of pairs added
      await expect(app.tableRows()).toHaveCount(pairs.length);

      const rowsText2 = await app.getAllRowsText();
      for (const [k, v] of pairs) {
        const found = rowsText.some(r => r[0] === k && r[1] === v);
        expect(found, `Expected to find pair ${k}:${v} in table`).toBe(true);
      }

      // No uncaught page errors
      expect(pageErrors.length).toBe(0);
      const problematicConsole4 = consoleMessages.filter(m =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/.test(m.text)
      );
      expect(problematicConsole.length).toBe(0);
    });
  });

  // Additional checks tying DOM to internal data when possible (read-only)
  test.describe('Data integrity and internal state exposure', () => {
    test('table rows mirror internal hash table display() structure (where accessible)', async ({ page }) => {
      const pageErrors5 = [];
      const consoleMessages5 = [];
      page.on('pageerror', (err) => pageErrors.push(err));
      page.on('console', (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));

      const app5 = new HashTablePage(page);
      await app.goto();

      // Add a few entries
      await app.addKeyValue('one', '1');
      await app.addKeyValue('two', '2');
      await app.addKeyValue('three', '3');

      // Read the DOM rows
      const domRows = await app.getAllRowsText();

      // Attempt to read the internal hashTable.display() if accessible.
      // We will not modify the internal object, only read it to compare content that should be present in the DOM.
      const internalTable = await page.evaluate(() => {
        // If hashTable is defined on the window, call display(); otherwise return null.
        try {
          // Accessing window.hashTable as-is; do not modify
          if (typeof window.hashTable !== 'undefined' && typeof window.hashTable.display === 'function') {
            return window.hashTable.display();
          }
          return null;
        } catch (e) {
          // Propagate the error to be captured by pageerror if it's unexpected
          throw e;
        }
      });

      // If internalTable is available, ensure every key-value pair in DOM exists inside the internal table structure
      if (internalTable) {
        // Flatten internal table into pairs
        const internalPairs = [];
        for (let bucket of internalTable) {
          if (Array.isArray(bucket)) {
            for (let pair of bucket) {
              // pair expected as [key, value]
              internalPairs.push([String(pair[0]), String(pair[1])]);
            }
          }
        }

        // For each DOM row, verify it exists in internalPairs
        for (const [k, v] of domRows) {
          const found1 = internalPairs.some(ip => ip[0] === k && ip[1] === v);
          expect(found, `DOM row ${k}:${v} should be present in internal hash table`).toBe(true);
        }
      } else {
        // If internal representation not available, at least assert we have DOM content
        expect(domRows.length).toBeGreaterThan(0);
      }

      // No uncaught page errors during this read
      expect(pageErrors.length).toBe(0);
      const problematicConsole5 = consoleMessages.filter(m =>
        m.type === 'error' ||
        /ReferenceError|SyntaxError|TypeError/.test(m.text)
      );
      expect(problematicConsole.length).toBe(0);
    });
  });
});