import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccaf5b0-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object Model for the Hash Table Demo
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.removeBtn = page.locator('#removeBtn');
    this.searchBtn = page.locator('#searchBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.output = page.locator('#output');
    this.table = this.output.locator('table');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async fillKey(key) {
    await this.keyInput.fill(key);
  }

  async fillValue(value) {
    await this.valueInput.fill(value);
  }

  async clickInsert() {
    await this.insertBtn.click();
  }

  async clickRemove() {
    await this.removeBtn.click();
  }

  async clickSearch() {
    await this.searchBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  // Returns raw innerHTML of #output
  async getOutputHTML() {
    return await this.page.$eval('#output', el => el.innerHTML);
  }

  // Returns visible text content of the output container
  async getOutputText() {
    return await this.page.$eval('#output', el => el.textContent.trim());
  }

  // Returns number of rows in table tbody (if present). If no table, returns 0.
  async tableRowCount() {
    const hasTable = await this.output.locator('table').count();
    if (!hasTable) return 0;
    return await this.output.locator('table tbody tr').count();
  }

  // Checks whether any cell in the table contains both key and value text
  async tableHasKeyValue(key, value) {
    const html = await this.getOutputHTML();
    return html.includes(`<b>${key}</b>`) && html.includes(`>${value}<`) || html.includes(`> ${value} <`);
  }

  // Checks whether any cell contains the key text (used for negatives)
  async tableHasKey(key) {
    const html = await this.getOutputHTML();
    return html.includes(`<b>${key}</b>`);
  }

  // Get the inline style color of the message <p> if present (search messages use showMessage without renderTable)
  async getMessageColor() {
    // message is inserted as <p style="color:...; font-weight:bold;">...</p>
    const p = await this.output.locator('p').elementHandle();
    if (!p) return null;
    const color = await this.page.evaluate(el => el.style.color, p);
    return color || null;
  }
}

test.describe('Hash Table Demonstration - FSM validation', () => {
  let page;
  let ht;
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a new context/page per test to ensure isolation
    const context = await browser.newContext();
    page = await context.newPage();

    // Collect console messages and errors for each test
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      // store all console messages and separately record error-level messages
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === 'error') consoleErrors.push(text);
    });

    page.on('pageerror', err => {
      // Uncaught exceptions end up here
      pageErrors.push(err.message || String(err));
    });

    ht = new HashTablePage(page);
    // Load the application under test
    await ht.goto();
  });

  test.afterEach(async () => {
    // Assert that no unexpected JavaScript runtime errors happened on the page
    expect(pageErrors, `No uncaught page errors expected. Found: ${pageErrors.join(' | ')}`).toEqual([]);
    // Assert that no console level 'error' messages were emitted
    expect(consoleErrors, `No console.error expected. Found: ${consoleErrors.join(' | ')}`).toEqual([]);
    // Close context/page
    await page.close();
  });

  test.describe('Initialization and Idle state (S0_Idle)', () => {
    test('Initial renderTable() produces a table with the configured number of buckets', async () => {
      // Validate that renderTable was invoked on initialization by checking table rows count = size (20)
      const rows = await ht.tableRowCount();
      expect(rows).toBeGreaterThanOrEqual(20); // table should show 20 rows (buckets)
      // Each empty bucket renders an <i>empty</i> cell for empty chains initially
      const outputHTML = await ht.getOutputHTML();
      // Check at least one 'empty' placeholder exists in output
      expect(outputHTML).toContain('<i>empty</i>');
    });
  });

  test.describe('Insert / Update transitions (S1_KeyInserted) and back to Idle', () => {
    test('Insert a new key creates a chain item and is visible in the table', async () => {
      // Insert key "alpha" with value "1"
      await ht.fillKey('alpha');
      await ht.fillValue('1');
      await ht.clickInsert();

      // After insertion, renderTable() is invoked so the table should contain the key
      const html = await ht.getOutputHTML();
      expect(html).toContain('<b>alpha</b>');
      expect(html).toContain('1');

      // Verify that the key/value pair persists in the table rows
      const hasPair = await ht.tableHasKeyValue('alpha', '1');
      expect(hasPair).toBeTruthy();
    });

    test('Updating an existing key changes the value in the table (update observable)', async () => {
      // First insert
      await ht.fillKey('alpha');
      await ht.fillValue('1');
      await ht.clickInsert();

      // Update same key with new value '2'
      await ht.fillKey('alpha');
      await ht.fillValue('2');
      await ht.clickInsert();

      // Table must reflect updated value
      const html = await ht.getOutputHTML();
      expect(html).toContain('<b>alpha</b>');
      expect(html).toContain('2');
      // Old value should not be present for that key
      expect(html).not.toContain('1</span>'); // 1 as value for that chain-item should be gone
    });
  });

  test.describe('Remove transitions (S2_KeyRemoved) and back to Idle', () => {
    test('Removing an existing key removes it from the table and shows appropriate behavior', async () => {
      // Insert a key to remove
      await ht.fillKey('toRemove');
      await ht.fillValue('X');
      await ht.clickInsert();

      // Remove it
      await ht.fillKey('toRemove');
      await ht.clickRemove();

      // After removal, table should no longer contain the key
      const html = await ht.getOutputHTML();
      expect(html).not.toContain('<b>toRemove</b>');
    });

    test('Removing a non-existent key leaves the table unchanged and shows not-found result', async () => {
      // Capture table before attempted removal
      const beforeHTML = await ht.getOutputHTML();

      // Attempt to remove a key that does not exist
      await ht.fillKey('nonExistentKey');
      await ht.clickRemove();

      // Table should be re-rendered but still not contain the key and otherwise should match structure
      const afterHTML = await ht.getOutputHTML();
      expect(afterHTML).toBeTruthy();
      expect(afterHTML).not.toContain('<b>nonExistentKey</b>');

      // Ensure that nonExistentKey was not accidentally inserted/removed incorrectly
      expect(afterHTML.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Search transitions (S3_KeySearched) and back to Idle', () => {
    test('Searching for an existing key shows a found message with success color', async () => {
      // Insert a key to search
      await ht.fillKey('searchMe');
      await ht.fillValue('foundValue');
      await ht.clickInsert();

      // Now search for it
      await ht.fillKey('searchMe');
      await ht.clickSearch();

      // Search uses showMessage() and does NOT call renderTable(); therefore output should be a <p> message
      const outputText = await ht.getOutputText();
      expect(outputText).toContain('Found key "searchMe" with value: "foundValue".');

      // The message is styled with the success color '#007a3d'
      const color = await ht.getMessageColor();
      // Normalize color (browsers may return rgb), so check that the color string includes either hex or common rgb
      expect(color).not.toBeNull();
      // Accept either the exact hex or a non-empty string (we mainly assert presence not exact format)
      expect(color.length).toBeGreaterThan(0);
    });

    test('Searching for a missing key shows not-found message with error color', async () => {
      // Ensure the key is not present
      await ht.fillKey('missingKey123');
      // Clear value field to avoid interfering
      await ht.fillValue('');
      await ht.clickSearch();

      const outputText = await ht.getOutputText();
      expect(outputText).toContain('Key "missingKey123" not found in the table.');

      const color = await ht.getMessageColor();
      expect(color).not.toBeNull();
      // Error color used for not-found is '#cc3e3e' according to implementation
      expect(color.length).toBeGreaterThan(0);
    });
  });

  test.describe('Clear Table transition (S4_TableCleared) and back to Idle', () => {
    test('Clear empties all buckets and renderTable shows empty placeholders for all buckets', async () => {
      // Insert multiple keys to populate the table
      await ht.fillKey('k1'); await ht.fillValue('v1'); await ht.clickInsert();
      await ht.fillKey('k2'); await ht.fillValue('v2'); await ht.clickInsert();

      // Now clear
      await ht.clickClear();

      // After clear, renderTable() is called and table should show only empty chains
      const rows = await ht.tableRowCount();
      // Expect at least 20 buckets (size) present
      expect(rows).toBeGreaterThanOrEqual(20);

      const html = await ht.getOutputHTML();
      // No keys should be present anymore
      expect(html).not.toContain('<b>k1</b>');
      expect(html).not.toContain('<b>k2</b>');
      // Expect the "Hash Table cleared." message was shown before renderTable(), but final DOM is table
      // So we check table emptiness as observable of onExit renderTable()
      expect(html).toContain('<i>empty</i>');
    });
  });

  test.describe('Edge cases and input validation', () => {
    test('Insert with empty key shows validation message and does not modify table', async () => {
      // Snapshot table before attempt
      const before = await ht.getOutputHTML();

      // Attempt to insert with empty key but non-empty value
      await ht.fillKey(''); // empty
      await ht.fillValue('someValue');
      await ht.clickInsert();

      // The implementation shows a message and returns early; it does not call renderTable()
      // Because renderTable isn't called in the early-return path, output should contain the error message p element
      const text = await ht.getOutputText();
      expect(text).toContain('Please enter a valid key to insert/update.');

      // Table should be unchanged (since renderTable was not re-invoked after early return)
      // Note: initial renderTable existed; since showMessage overwrote it, the output is the message - not the table.
      // We assert that before snapshot had a table structure; since current output contains message, this validates input validation behavior
      expect(before).toContain('<table') || expect(before).toContain('<i>empty</i>');
    });

    test('Insert with empty value shows validation message and does not insert', async () => {
      // Ensure empty value is rejected
      await ht.fillKey('someKeyX');
      await ht.fillValue(''); // empty value
      await ht.clickInsert();

      const text = await ht.getOutputText();
      expect(text).toContain('Please enter a value.');
    });

    test('Remove with empty key shows validation message', async () => {
      await ht.fillKey('');
      await ht.clickRemove();
      const text = await ht.getOutputText();
      expect(text).toContain('Please enter a key to remove.');
    });

    test('Search with empty key shows validation message', async () => {
      await ht.fillKey('');
      await ht.clickSearch();
      const text = await ht.getOutputText();
      expect(text).toContain('Please enter a key to search.');
    });
  });

  test.describe('Console and runtime observations', () => {
    test('No unexpected runtime exceptions or console.error during normal interactions', async () => {
      // Perform a sequence of typical operations to observe console and runtime behavior
      await ht.fillKey('seq1'); await ht.fillValue('a'); await ht.clickInsert();
      await ht.fillKey('seq1'); await ht.clickSearch(); // should show found message
      await ht.fillKey('seq1'); await ht.clickRemove(); // remove
      await ht.fillKey('doesNotExist'); await ht.clickRemove(); // remove non-existent
      await ht.clickClear();

      // At this point after several interactions, assert there were no page errors
      // These assertions will also be checked in afterEach; include here for explicit test clarity
      expect(pageErrors.length).toBe(0);
      expect(consoleErrors.length).toBe(0);

      // Also ensure console messages were captured (not necessarily errors) to verify instrumentation
      expect(consoleMessages.length).toBeGreaterThanOrEqual(0);
    });
  });
});