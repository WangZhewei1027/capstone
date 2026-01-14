import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad26711-d59a-11f0-891d-f361d22ca68a.html';

/**
 * Page Object for the Hash Table demo page.
 * Encapsulates common interactions and queries.
 */
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.form = page.locator('#hash-table-form');
    this.submitButton = page.locator('button[type="submit"]');
    this.container = page.locator('#hash-table-container');
    // Provide a simple accessor for tr rows inside the container
    this.rows = () => this.container.locator('tr');
  }

  async navigate() {
    await this.page.goto(APP_URL);
  }

  async insert(key, value) {
    await this.keyInput.fill(key);
    await this.valueInput.fill(value);
    // Submit by clicking the button so that the 'submit' event is fired.
    await this.submitButton.click();
  }

  async getRowCount() {
    return await this.rows().count();
  }

  async getRowsText() {
    const count = await this.getRowCount();
    const results = [];
    for (let i = 0; i < count; i++) {
      const row = this.rows().nth(i);
      const cells = row.locator('td');
      const cellCount = await cells.count();
      const cellTexts = [];
      for (let c = 0; c < cellCount; c++) {
        cellTexts.push((await cells.nth(c).innerText()).trim());
      }
      results.push(cellTexts);
    }
    return results;
  }

  async getContainerInnerHTML() {
    return await this.container.innerHTML();
  }
}

test.describe('Hash Table Demo - FSM tests (Idle -> Inserted)', () => {
  // Attach console and page error collectors on each test's page.
  test.beforeEach(async ({ page }) => {
    // Arrays to collect events; attach to page so tests can access them.
    page.consoleMessages = [];
    page.consoleErrors = [];
    page.pageErrors = [];

    page.on('console', (msg) => {
      const text = msg.text();
      // Record console messages with their type level for assertions.
      page.consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error') {
        page.consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err) => {
      // Capture runtime exceptions (ReferenceError, TypeError, etc.)
      page.pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // Basic teardown validation: ensure no unexpected JS errors were thrown.
    // If there were page errors we fail fast with details to aid debugging.
    if (page.pageErrors && page.pageErrors.length > 0) {
      // Convert errors to readable messages for failing assertion.
      const msgs = page.pageErrors.map(e => `${e.name}: ${e.message}`).join('\n');
      // Fail the test by asserting zero length (this will provide the error details).
      expect(page.pageErrors, `Unexpected page errors:\n${msgs}`).toHaveLength(0);
    }
    // Also assert there are no console.error messages emitted during the test.
    if (page.consoleErrors && page.consoleErrors.length > 0) {
      expect(page.consoleErrors, `Unexpected console.error messages:\n${page.consoleErrors.join('\n')}`).toHaveLength(0);
    }
  });

  test('Idle state: page renders the form and initial UI elements', async ({ page }) => {
    // Validate initial (S0_Idle) state: the form and its fields are present and container is empty.
    const ht = new HashTablePage(page);
    await ht.navigate();

    // Verify the form exists
    await expect(ht.form).toBeVisible();

    // Verify inputs and submit button are visible and correctly labeled
    await expect(ht.keyInput).toBeVisible();
    await expect(ht.valueInput).toBeVisible();
    await expect(ht.submitButton).toBeVisible();
    await expect(ht.submitButton).toHaveText('Insert');

    // The container should be empty at start (no table rows)
    await expect(ht.rows()).toHaveCount(0);

    // Verify that no runtime page errors or console.error messages occurred on initial render
    expect(page.pageErrors).toHaveLength(0);
    expect(page.consoleErrors).toHaveLength(0);

    // Confirm evidence element from FSM is present: the form's HTML id
    const formHtml = await page.locator('#hash-table-form').evaluate((el) => el.outerHTML);
    expect(formHtml).toContain('id="hash-table-form"');
  });

  test('Submit form (Insert) transitions to Inserted state and displays new key-value pair', async ({ page }) => {
    // This test validates the SubmitForm event triggers transition S0_Idle -> S1_Inserted
    // and that displayHashTable() updates the DOM and a console log is emitted.
    const ht = new HashTablePage(page);
    await ht.navigate();

    // Prepare unique key/value
    const key = 'fruit';
    const value = 'apple';

    // Perform insertion
    await ht.insert(key, value);

    // After submit, displayHashTable should have created a row with the key and value.
    // The implementation appends <tr> directly into the container.
    await expect(ht.rows()).toHaveCount(1);

    const rowsText = await ht.getRowsText();
    expect(rowsText[0]).toEqual([key, value]);

    // Check console messages include the expected "Key <key> added" message.
    const messages = page.consoleMessages.map(m => m.text);
    const hadAddMessage = messages.some(m => m.includes(`Key ${key} added to the hash table.`));
    expect(hadAddMessage).toBeTruthy();

    // Ensure no page errors or console.error were emitted during this interaction.
    expect(page.pageErrors).toHaveLength(0);
    expect(page.consoleErrors).toHaveLength(0);
  });

  test('Submitting the same key again logs "already exists" and does not duplicate the entry', async ({ page }) => {
    // This test validates duplicate insertion handling (edge-case).
    const ht = new HashTablePage(page);
    await ht.navigate();

    const key = 'color';
    const firstValue = 'blue';
    const secondValue = 'green';

    // First insertion
    await ht.insert(key, firstValue);
    await expect(ht.rows()).toHaveCount(1);
    let rowsText = await ht.getRowsText();
    expect(rowsText[0]).toEqual([key, firstValue]);

    // Capture console messages after first insert
    const beforeSecond = page.consoleMessages.map(m => m.text).slice();

    // Second insertion with same key but different value
    await ht.insert(key, secondValue);

    // The number of rows should remain 1 (no duplicate)
    await expect(ht.rows()).toHaveCount(1);
    rowsText = await ht.getRowsText();
    // Value should remain the original (implementation guards against overwrite)
    expect(rowsText[0]).toEqual([key, firstValue]);

    // Console should contain the "already exists" message
    const allMessages = page.consoleMessages.map(m => m.text);
    const newMessages = allMessages.slice(beforeSecond.length);
    const foundAlreadyExists = newMessages.some(m => m.includes(`Key ${key} already exists in the hash table.`));
    expect(foundAlreadyExists).toBeTruthy();

    // Ensure no runtime errors were emitted
    expect(page.pageErrors).toHaveLength(0);
    expect(page.consoleErrors).toHaveLength(0);
  });

  test('Edge cases: empty key and empty value handling', async ({ page }) => {
    // Validate behavior when key or value is empty string.
    const ht = new HashTablePage(page);
    await ht.navigate();

    // Insert empty key with a non-empty value
    const emptyKey = '';
    const valueA = 'someValue';
    await ht.insert(emptyKey, valueA);

    // The code treats empty string as a valid key and will add it.
    await expect(ht.rows()).toHaveCount(1);
    let rowsText = await ht.getRowsText();
    // Because key is empty, the first cell should be an empty string
    expect(rowsText[0]).toEqual([emptyKey, valueA]);

    // Insert a non-empty key with empty value - value should be inserted as empty string
    const keyB = 'k2';
    const emptyValue = '';
    await ht.insert(keyB, emptyValue);

    await expect(ht.rows()).toHaveCount(2);
    rowsText = await ht.getRowsText();
    // Find the row for keyB
    const found = rowsText.some(r => r[0] === keyB && r[1] === emptyValue);
    expect(found).toBeTruthy();

    // Ensure expected console messages exist for both adds
    const messages = page.consoleMessages.map(m => m.text).join('\n');
    expect(messages).toContain(`Key  added to the hash table.`); // empty key message
    expect(messages).toContain(`Key ${keyB} added to the hash table.`);

    expect(page.pageErrors).toHaveLength(0);
    expect(page.consoleErrors).toHaveLength(0);
  });

  test('Display update (displayHashTable) is observable via DOM mutation after insertion', async ({ page }) => {
    // This test ensures that displayHashTable() (onEnter S1_Inserted) updates the DOM.
    const ht = new HashTablePage(page);
    await ht.navigate();

    // Observe the container for mutations by checking innerHTML change
    const initialHTML = await ht.getContainerInnerHTML();

    const key = 'alpha';
    const value = 'beta';
    await ht.insert(key, value);

    // Wait and assert container innerHTML has changed from initial
    await page.waitForFunction(
      (selector, before) => document.querySelector(selector).innerHTML !== before,
      '#hash-table-container',
      initialHTML
    );

    const newHTML = await ht.getContainerInnerHTML();
    expect(newHTML).not.toBe(initialHTML);
    expect(newHTML).toContain('<td>'); // should contain table cells

    // Confirm the key/value are present in the HTML
    expect(newHTML).toContain(key);
    expect(newHTML).toContain(value);

    expect(page.pageErrors).toHaveLength(0);
    expect(page.consoleErrors).toHaveLength(0);
  });

  test('Observes console and page errors: report if ReferenceError / SyntaxError / TypeError occur', async ({ page }) => {
    // This test explicitly monitors page errors and console messages and asserts none of the
    // severe error types occurred during normal usage of the page.
    const ht = new HashTablePage(page);
    await ht.navigate();

    // Perform a normal interaction
    await ht.insert('ok', '1');

    // Collate any runtime errors captured
    const pageErrors = page.pageErrors || [];
    // Create a readable list for assertion messages
    const errorSummaries = pageErrors.map(e => `${e.name}: ${e.message}`);

    // Assert that no ReferenceError / SyntaxError / TypeError occurred.
    // If they did occur, include details in the failure message.
    const severeErrors = pageErrors.filter(e => ['ReferenceError', 'SyntaxError', 'TypeError'].includes(e.name));
    expect(severeErrors, `Severe runtime errors occurred:\n${errorSummaries.join('\n')}`).toHaveLength(0);

    // Also assert there are no console.error entries
    expect(page.consoleErrors).toHaveLength(0);
  });
});