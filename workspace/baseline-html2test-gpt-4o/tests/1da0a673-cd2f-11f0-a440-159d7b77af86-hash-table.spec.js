import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a673-cd2f-11f0-a440-159d7b77af86.html';

// Page object model for the Hash Table demo page
class HashTablePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.submitButton = page.locator('button[type="submit"]');
    this.tableRows = page.locator('#hash-table tbody tr');
    this.tableHeader = page.locator('#hash-table thead');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill inputs and submit the form
  async addEntry(key, value) {
    await this.keyInput.fill(key);
    await this.valueInput.fill(value);
    await Promise.all([
      this.page.waitForResponse(response => response.status() >= 0).catch(() => {}), // harmless placeholder to yield
      this.submitButton.click()
    ]);
  }

  // Get number of rows in the table body
  async rowCount() {
    return await this.tableRows.count();
  }

  // Get cell text by row index and column index (0-based)
  async cellText(rowIndex, colIndex) {
    const cell = this.page.locator(`#hash-table tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`);
    return await cell.textContent();
  }

  // Clear inputs
  async clearInputs() {
    await this.keyInput.fill('');
    await this.valueInput.fill('');
  }
}

test.describe('Hash Table Demonstration - UI and behavior tests', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Setup: navigate to page and attach listeners to capture console errors and uncaught exceptions.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Listen for uncaught exceptions from the page
    page.on('pageerror', (err) => {
      // Capture the error for later assertions
      pageErrors.push(err);
    });

    // Capture console messages and filter for 'error' type
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // Teardown: no special actions required beyond Playwright's automatic cleanup
  test.afterEach(async () => {
    // no-op; listeners are tied to the page instance which is cleaned up by Playwright
  });

  // Group: Structure & initial state
  test('Initial load: form and table are present; table is empty', async ({ page }) => {
    const app = new HashTablePage(page);

    // Ensure the page loaded
    await app.goto(); // redundant if beforeEach navigated, but safe to ensure state

    // Verify title and headline exist
    await expect(page).toHaveTitle(/Hash Table Example/i);
    await expect(page.locator('h1')).toHaveText(/Hash Table Demonstration/i);

    // Verify form inputs and submit button are visible
    await expect(app.keyInput).toBeVisible();
    await expect(app.valueInput).toBeVisible();
    await expect(app.submitButton).toBeVisible();

    // Verify table header is present and body is initially empty
    await expect(app.tableHeader).toBeVisible();
    const initialRows = await app.rowCount();
    expect(initialRows).toBe(0);

    // Assert no page errors or console errors occurred on initial load
    expect(pageErrors.length, `Expected no uncaught page errors on load, got: ${pageErrors.length}`).toBe(0);
    expect(consoleErrors.length, `Expected no console error messages on load, got: ${consoleErrors.length}`).toBe(0);
  });

  // Group: Adding entries
  test('Adding a single key-value pair updates the table and clears inputs', async ({ page }) => {
    const app = new HashTablePage(page);
    await app.goto();

    // Add an entry
    await app.addEntry('apple', 'fruit');

    // Table should have exactly one row
    expect(await app.rowCount()).toBe(1);

    // Verify the row contents
    expect(await app.cellText(0, 0)).toBe('apple'); // key cell
    expect(await app.cellText(0, 1)).toBe('fruit'); // value cell

    // After submission inputs should be cleared
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // No uncaught errors should have occurred during the interaction
    expect(pageErrors.length, `Expected no page errors after adding one entry`).toBe(0);
    expect(consoleErrors.length, `Expected no console errors after adding one entry`).toBe(0);
  });

  test('Adding multiple entries preserves insertion order and displays all rows', async ({ page }) => {
    const app = new HashTablePage(page);
    await app.goto();

    // Add several entries in specific order
    await app.addEntry('first', '1');
    await app.addEntry('second', '2');
    await app.addEntry('third', '3');

    // Expect 3 rows
    expect(await app.rowCount()).toBe(3);

    // Verify order and values
    expect(await app.cellText(0, 0)).toBe('first');
    expect(await app.cellText(0, 1)).toBe('1');

    expect(await app.cellText(1, 0)).toBe('second');
    expect(await app.cellText(1, 1)).toBe('2');

    expect(await app.cellText(2, 0)).toBe('third');
    expect(await app.cellText(2, 1)).toBe('3');

    // Check no errors occurred during multiple additions
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Adding an entry with an existing key overwrites the previous value', async ({ page }) => {
    const app = new HashTablePage(page);
    await app.goto();

    // Add initial entry
    await app.addEntry('dupKey', 'firstValue');
    expect(await app.rowCount()).toBe(1);
    expect(await app.cellText(0, 0)).toBe('dupKey');
    expect(await app.cellText(0, 1)).toBe('firstValue');

    // Add entry with same key but different value
    await app.addEntry('dupKey', 'secondValue');

    // Should still have only one row, and its value should be the new one
    expect(await app.rowCount()).toBe(1);
    expect(await app.cellText(0, 0)).toBe('dupKey');
    expect(await app.cellText(0, 1)).toBe('secondValue');

    // No unexpected errors during overwrite
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Group: Form validation and edge cases
  test('Submitting with empty inputs should not add a row due to required attributes', async ({ page }) => {
    const app = new HashTablePage(page);
    await app.goto();

    // Ensure starting with zero rows
    expect(await app.rowCount()).toBe(0);

    // Attempt to submit with empty inputs (browser validation should prevent the submit)
    await app.clearInputs();

    // Click the submit button - built-in constraint validation should block submission.
    // If the browser allowed submission programmatically, the page script uses values and would add an empty key/value.
    await app.submitButton.click();

    // Confirm that no rows were added
    expect(await app.rowCount()).toBe(0);

    // Ensure no page errors or console errors were produced by trying to submit empty form
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Group: Accessibility & DOM checks
  test('Table and form elements are accessible and have expected semantics', async ({ page }) => {
    const app = new HashTablePage(page);
    await app.goto();

    // Inputs should have 'required' attribute per markup
    await expect(app.keyInput).toHaveAttribute('required', '');
    await expect(app.valueInput).toHaveAttribute('required', '');

    // Table should have a thead with two headers "Key" and "Value"
    const headers = page.locator('#hash-table thead th');
    expect(await headers.count()).toBe(2);
    expect(await headers.nth(0).textContent()).toBe('Key');
    expect(await headers.nth(1).textContent()).toBe('Value');

    // No JS runtime errors observed
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Final check: collect and assert that no unexpected runtime errors occurred during the whole suite of interactions in this test file's scope.
  // Note: Each test has its own page instance and listeners; this assertion ensures the listeners captured no errors per test.
  test('No uncaught page errors or console error messages were emitted during interactions', async ({ page }) => {
    // This test simply navigates and performs a few interactions while capturing errors.
    pageErrors = [];
    consoleErrors = [];

    // Attach listeners again on this fresh page
    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() }); });

    const app = new HashTablePage(page);
    await app.goto();

    // Perform interactions
    await app.addEntry('x', '1');
    await app.addEntry('y', '2');
    await app.addEntry('x', 'updated');

    // Confirm expected state
    expect(await app.rowCount()).toBe(2);
    expect(await app.cellText(0, 0)).toBe('x');
    expect(await app.cellText(0, 1)).toBe('updated');

    // Assert no uncaught errors or console error messages occurred
    expect(pageErrors.length, `Found page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Found console.errors: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });
});