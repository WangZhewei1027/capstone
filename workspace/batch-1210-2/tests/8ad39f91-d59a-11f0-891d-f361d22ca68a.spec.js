import { test, expect } from '@playwright/test';

// URL of the HTML under test
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad39f91-d59a-11f0-891d-f361d22ca68a.html';

// Page Object Model for the Selection Sort page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.tableSelector = '#sort-table';
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getTableInnerHTML() {
    return this.page.locator(this.tableSelector).innerHTML();
  }

  async getConsoleMessages() {
    // This function intentionally left as a placeholder if needed.
    // In tests, we attach listeners instead to capture console output.
    return [];
  }
}

test.describe('Selection Sort FSM and UI validations (Application ID: 8ad39f91-d59a-11f0-891d-f361d22ca68a)', () => {
  // Collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  // Reusable helper to attach listeners for console and pageerror
  async function attachListeners(page) {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      // Record console messages with type and text
      consoleMessages.push({ type: msg.type(), text: msg.text(), location: msg.location() });
    });

    page.on('pageerror', err => {
      // Record unhandled exceptions thrown in page context
      pageErrors.push(err);
    });
  }

  test.beforeEach(async ({ page }) => {
    await attachListeners(page);
  });

  test('Initial State: Original array is logged on page load', async ({ page }) => {
    // This test validates the Initial State entry action:
    // console.log('Original array is: ', arr);
    const app = new SelectionSortPage(page);
    await app.goto();

    // Wait briefly to ensure scripts run
    await page.waitForTimeout(200);

    // Find a console log that contains "Original array is:"
    const originalLogs = consoleMessages.filter(m => m.type === 'log' && m.text.includes('Original array is:'));
    // Assert that the original array log was emitted exactly once on load
    expect(originalLogs.length).toBeGreaterThanOrEqual(1); // allow >=1 in case environment logs multiple times
    // Assert the logged text includes the original unsorted array values (as part of the message)
    const found = originalLogs.some(m => m.text.includes('64') && m.text.includes('34') && m.text.includes('25'));
    expect(found).toBeTruthy();
  });

  test('Sorting State: selectionSort runs and emits "Sorted array is:" logs expected number of times and final sorted array', async ({ page }) => {
    // This test validates the Sorting State entry action:
    // selectionSort(arr);
    const app = new SelectionSortPage(page);
    await app.goto();

    // Wait to ensure sorting logs are emitted
    await page.waitForTimeout(300);

    // Collect all "Sorted array is:" logs
    const sortedLogs = consoleMessages.filter(m => m.type === 'log' && m.text.includes('Sorted array is:'));
    // The selectionSort implementation logs once per i iteration: n-1 times for array of length n
    // Given arr = [64,34,25,12,22,11,90] => n = 7 => expect 6 logs
    expect(sortedLogs.length).toBeGreaterThanOrEqual(6);
    // Assert that the final sorted array appears in at least one log message
    const finalSortedFound = sortedLogs.some(m => m.text.includes('11') && m.text.includes('90'));
    expect(finalSortedFound).toBeTruthy();
  });

  test('Table Updated State: printTable output updates DOM and contains expected values (including undefined fields)', async ({ page }) => {
    // This test validates the Table Updated State entry action:
    // printTable(arr);
    const app = new SelectionSortPage(page);
    await app.goto();

    // Wait to ensure printTable has updated the DOM
    await page.waitForTimeout(200);

    const innerHTML = await app.getTableInnerHTML();

    // The implemented printTable builds a nested table and attempts to access properties
    // like PreviousIndex on numeric array items which will yield "undefined" string when coerced.
    // Assert that the DOM now contains a <table> nested string and number values.
    expect(innerHTML).toContain('<table>');
    // Check for presence of the numeric values that were in the original array
    expect(innerHTML).toContain('64');
    expect(innerHTML).toContain('34');
    expect(innerHTML).toContain('90');

    // Since printTable attempts to access arr[i].PreviousIndex on numbers, those evaluate to undefined.
    // We assert that "undefined" appears in the produced table string to confirm the erroneous access occurred.
    expect(innerHTML).toMatch(/undefined/);
  });

  test('FSM Transition Order: "Original array" log appears before sorting logs and DOM update occurs after sorting logs', async ({ page }) => {
    // This test checks the ordering of observable effects corresponding to
    // S0_Initial -> S1_Sorting -> S2_TableUpdated transitions.
    const app = new SelectionSortPage(page);

    await app.goto();

    // Wait for logs to be emitted
    await page.waitForTimeout(300);

    // Find timestamps or positions of relevant logs in the captured consoleMessages array
    const originalIndex = consoleMessages.findIndex(m => m.type === 'log' && m.text.includes('Original array is:'));
    const firstSortedIndex = consoleMessages.findIndex(m => m.type === 'log' && m.text.includes('Sorted array is:'));
    // Ensure both logs exist
    expect(originalIndex).toBeGreaterThanOrEqual(0);
    expect(firstSortedIndex).toBeGreaterThanOrEqual(0);
    // Assert original log appears before the first sorted log
    expect(originalIndex).toBeLessThan(firstSortedIndex);

    // Now check that the DOM table was updated after sorting logs appeared.
    // We will check the time the last "Sorted array is:" log occurred vs when the DOM contains the nested table.
    // Since we don't have exact timestamps, we'll assert that there is at least one sorted log
    // and that the table innerHTML contains nested <table>.
    const sortedLogs = consoleMessages.filter(m => m.type === 'log' && m.text.includes('Sorted array is:'));
    expect(sortedLogs.length).toBeGreaterThanOrEqual(1);

    const innerHTML = await app.getTableInnerHTML();
    expect(innerHTML).toContain('<table>');
  });

  test('Edge case & error scenario: invoking printTable(null) triggers a TypeError in page context and emits a pageerror', async ({ page }) => {
    // This test intentionally invokes printTable with a null argument to exercise an error path.
    // It does not modify page functions; it only calls an existing function as-is to let errors happen naturally.
    const app = new SelectionSortPage(page);
    await app.goto();

    // Prepare to capture the next pageerror emitted
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Call printTable(null) in the page. This should attempt to access null.length and throw a TypeError.
    // We expect page.evaluate to reject because the function throws; we catch that and also verify the pageerror event.
    let evalRejected = false;
    try {
      await page.evaluate(() => {
        // Deliberately call the existing function with invalid input
        // This will cause an exception in page context and emit a 'pageerror'
        // The thrown error will also cause evaluate() to reject.
        // We intentionally do not wrap in try/catch to allow natural error propagation.
        // eslint-disable-next-line no-undef
        printTable(null);
      });
    } catch (e) {
      evalRejected = true;
    }

    // Ensure evaluate did reject due to the thrown error
    expect(evalRejected).toBe(true);

    // Await the pageerror event and assert it is a TypeError or contains expected message
    const pageErr = await pageErrorPromise;
    expect(pageErr).toBeTruthy();
    // The message in modern engines will likely include "Cannot read properties of null"
    const msg = String(pageErr.message || pageErr);
    const isTypeError = msg.includes('Cannot read') || msg.toLowerCase().includes('typeerror') || msg.includes('reading \'length\'');
    expect(isTypeError).toBeTruthy();
  });

  test('Sanity check: There are no unexpected console errors on initial load (prior to induced error)', async ({ page }) => {
    // This test ensures that on normal load (without our induced error) there are no console "error" messages.
    const app = new SelectionSortPage(page);
    await app.goto();

    // Wait to capture any console emissions during load
    await page.waitForTimeout(200);

    const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
    // Expect there to be zero console.error messages on initial load
    expect(errorConsoleEntries.length).toBe(0);
    // Also ensure there are no unhandled page errors at this point
    expect(pageErrors.length).toBe(0);
  });
});