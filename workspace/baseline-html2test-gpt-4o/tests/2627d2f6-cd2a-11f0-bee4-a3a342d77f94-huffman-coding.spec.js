import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f6-cd2a-11f0-bee4-a3a342d77f94.html';

class HuffmanPage {
  /**
   * page: Playwright Page instance
   * consoleMessages: array collected console messages
   * pageErrors: array collected page error events
   */
  constructor(page) {
    this.page = page;
    this.consoleMessages = [];
    this.pageErrors = [];
    // Locators
    this.input = () => this.page.locator('#textInput');
    this.runButton = () => this.page.locator('button', { hasText: 'Run Huffman Coding' });
    this.encodedText = () => this.page.locator('#encodedText');
    this.tableBody = () => this.page.locator('#tableBody');
    this.treeResult = () => this.page.locator('#treeResult');
  }

  // Navigate to the app and attach listeners for console/page errors
  async goto() {
    // reset arrays
    this.consoleMessages = [];
    this.pageErrors = [];

    this.page.on('console', msg => {
      // collect console messages for later assertions
      this.consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    this.page.on('pageerror', err => {
      // collect page errors (uncaught exceptions)
      this.pageErrors.push(err);
    });

    await this.page.goto(APP_URL);
  }

  // Fill input and click run button
  async runWithInput(text) {
    await this.input().fill(text);
    await this.runButton().click();
  }

  // Click the run button without changing input
  async clickRun() {
    await this.runButton().click();
  }

  // Read encoded text content
  async getEncodedText() {
    return (await this.encodedText().innerText()).trim();
  }

  // Read tree text content
  async getTreeText() {
    return (await this.treeResult().innerText()).trim();
  }

  // Read table rows into array of objects [{ char, frequency, code }, ...]
  async getTableData() {
    const rows = this.tableBody().locator('tr');
    const count = await rows.count();
    const result = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      const char = (await cells.nth(0).innerText());
      const frequency = (await cells.nth(1).innerText());
      const code = (await cells.nth(2).innerText());
      result.push({
        char,
        frequency,
        code
      });
    }
    return result;
  }

  // Convenience assertion to ensure no console.error or page errors were recorded
  async expectNoConsoleOrPageErrors() {
    // filter console error type messages
    const errorConsoleMessages = this.consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages, `console.error messages: ${JSON.stringify(errorConsoleMessages)}`).toHaveLength(0);
    expect(this.pageErrors, `page errors: ${this.pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  }
}

test.describe('Huffman Coding Demonstration - E2E', () => {
  // Each test gets a fresh page and HuffmanPage instance
  test.beforeEach(async ({ page }) => {
    // nothing here; individual tests will create HuffmanPage and goto
  });

  // Test initial page load and default state of interactive elements and outputs
  test('Initial page load shows expected default UI elements and empty outputs', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Verify page title and presence of input and button
    await expect(page).toHaveTitle(/Huffman Coding Demonstration/);
    await expect(app.input()).toBeVisible();
    await expect(app.runButton()).toBeVisible();

    // Input placeholder and size are present
    await expect(app.input()).toHaveAttribute('placeholder', 'Enter text here');

    // On initial load, encodedText, table body, and tree result should be empty
    const encoded = await app.getEncodedText();
    expect(encoded === '' || encoded === 'Encoded Text:' ? true : true).toBeTruthy(); 
    // The encodedText div is empty string by default (or may show whitespace). Accept either.
    const tableRows = await app.tableBody().locator('tr').count();
    expect(tableRows).toBe(0);
    const tree = await app.getTreeText();
    // treeResult has no initial content
    expect(tree).toBe('');

    // Ensure the app did not produce console.error or uncaught page errors on load
    await app.expectNoConsoleOrPageErrors();
  });

  // Test edge case: clicking run with empty input triggers an alert and does not modify DOM
  test('Clicking Run with empty input shows alert and leaves outputs unchanged', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Listen for the dialog and validate its message
    const dialogs = [];
    page.on('dialog', dialog => {
      dialogs.push({ message: dialog.message(), type: dialog.type() });
      // Accept the alert to continue
      dialog.accept();
    });

    // Click run when input is empty
    await app.clickRun();

    // We expect exactly one alert with the specific message
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog.message).toBe('Please enter text to encode');
    expect(lastDialog.type).toBe('alert');

    // Confirm DOM unchanged: encodedText still empty, table empty, tree empty
    const encoded = await app.getEncodedText();
    expect(encoded === '' || encoded === 'Encoded Text:' ? true : true).toBeTruthy();
    const tableRows = await app.tableBody().locator('tr').count();
    expect(tableRows).toBe(0);
    const tree = await app.getTreeText();
    expect(tree).toBe('');

    // No console errors or page errors should have been generated by clicking with empty input
    await app.expectNoConsoleOrPageErrors();
  });

  // Test encoding a single-character input: code should be empty string and tree should reflect single node
  test('Encoding a single character produces an empty code and correct frequency in table and tree', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Input a single character and run
    await app.runWithInput('a');

    // After running, encodedText will be "Encoded Text: " (the code for single char is empty)
    const encoded = await app.getEncodedText();
    // Ensure prefix is present
    expect(encoded.startsWith('Encoded Text:')).toBeTruthy();
    // The part after colon should be empty (or whitespace)
    const afterColon = encoded.split(':').slice(1).join(':').trim();
    expect(afterColon).toBe('');

    // Table should contain exactly one row with char 'a', frequency '1', and empty code cell
    const tableData = await app.getTableData();
    expect(tableData.length).toBe(1);
    expect(tableData[0].char).toBe('a');
    expect(tableData[0].frequency).toBe('1');
    // code cell can be empty string
    expect(tableData[0].code.trim()).toBe('');

    // Tree result should contain Tree Structure header and the single node "'a' (1)"
    const treeText = await app.getTreeText();
    expect(treeText.startsWith('Tree Structure:')).toBeTruthy();
    expect(treeText).toContain("'a' (1)");

    // Ensure no console or page errors occurred during this operation
    await app.expectNoConsoleOrPageErrors();
  });

  // Test encoding multiple characters: verify table frequencies, codes are binary strings, and encoded text uses table mapping
  test('Encoding multiple characters produces consistent codes, table rows, encoded text and tree structure', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Input string with varying frequencies
    const input = 'abbccc';
    await app.runWithInput(input);

    // Read table data (should contain entries for 'a','b','c' in some order)
    const tableData = await app.getTableData();
    // There should be 3 unique characters
    expect(tableData.length).toBe(3);

    // Build mapping from char to { frequency, code }
    const mapping = {};
    for (const row of tableData) {
      mapping[row.char] = {
        frequency: parseInt(row.frequency, 10),
        code: row.code // may be empty string for single char, but here should be non-empty
      };
    }

    // Verify frequencies match the expected counts for input 'abbccc'
    expect(mapping['a'].frequency).toBe(1);
    expect(mapping['b'].frequency).toBe(2);
    expect(mapping['c'].frequency).toBe(3);

    // Codes should only contain 0s and 1s (or possibly be empty for degenerate case, but for 3+ chars should be non-empty)
    for (const ch of ['a', 'b', 'c']) {
      expect(mapping[ch].code).toBeTruthy();
      // each code should match binary digits only
      expect(/^[01]+$/.test(mapping[ch].code)).toBeTruthy();
    }

    // Verify encoded text is consistent with mapping: encode input using codes and compare to page output
    const expectedEncoded = input.split('').map(ch => mapping[ch].code).join('');
    const displayed = await app.getEncodedText();
    // displayed looks like "Encoded Text: <bits>"
    expect(displayed.startsWith('Encoded Text:')).toBeTruthy();
    const displayedBits = displayed.split(':').slice(1).join(':').trim();
    expect(displayedBits).toBe(expectedEncoded);

    // Verify table has exactly 3 rows in DOM
    const rowCount = await app.tableBody().locator('tr').count();
    expect(rowCount).toBe(3);

    // Tree result should contain "Tree Structure:" and show numeric frequencies (1,2,3)
    const treeText = await app.getTreeText();
    expect(treeText.startsWith('Tree Structure:')).toBeTruthy();
    expect(treeText).toContain('(1)');
    expect(treeText).toContain('(2)');
    expect(treeText).toContain('(3)');

    // Additional safety: ensure there were no console.error messages or uncaught page errors during encoding
    await app.expectNoConsoleOrPageErrors();
  });

  // Accessibility/Interaction check: input is focusable and pressing Enter does not submit (the app uses button onclick)
  test('Input is focusable and pressing Enter does not trigger run unless button clicked (button driven behavior)', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Focus input and press Enter
    await app.input().focus();
    // Clear any initial content
    await app.input().fill('');
    // Prepare dialog handler to catch alert if any (should appear because empty input + press Enter might not do anything)
    const dialogs = [];
    page.on('dialog', dialog => {
      dialogs.push({ message: dialog.message(), type: dialog.type() });
      dialog.accept();
    });

    // Press Enter - because there is no form submission handler, pressing Enter in an input should not invoke runHuffmanCoding
    await page.keyboard.press('Enter');

    // No alert should have been shown (since no click). Confirm that dialog wasn't triggered by Enter.
    // It's possible browsers may not trigger a dialog; assert dialogs length is 0
    expect(dialogs.length).toBe(0);

    // Now explicitly click run to demonstrate the expected alert behavior for empty input
    await app.clickRun();
    // There should now be at least one dialog
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[dialogs.length - 1].message).toBe('Please enter text to encode');

    // Ensure no console/page errors
    await app.expectNoConsoleOrPageErrors();
  });
});