import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb41-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page object representing the Two Pointers page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns the page title string
  async title() {
    return this.page.title();
  }

  // Returns the H1 text content
  async headerText() {
    return this.page.textContent('h1');
  }

  // Returns the number of table rows (including header)
  async tableRowCount() {
    return this.page.$$eval('table tr', rows => rows.length);
  }

  // Returns an array of data rows (excluding header), each row as array of cell text
  async tableDataRows() {
    return this.page.$$eval('table tr', rows =>
      Array.from(rows).slice(1).map(row => Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim()))
    );
  }

  // Returns all console messages captured during the session (captured externally)
  // No implementation here; console capturing is done in tests.
}

test.describe('Two Pointers Concept - Integration tests', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Reset arrays
    pageErrors = [];
    consoleMessages = [];

    // Capture console messages
    page.on('console', msg => {
      // Collect console messages for assertions
      // msg.text() returns the text content of the console call
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // noop - listeners are attached to page which is disposed by Playwright per test
  });

  test('Initial load: title and header are present and correct', async ({ page }) => {
    // Purpose: Verify the document title and main header load as expected
    const twoPointers = new TwoPointersPage(page);

    // Verify page title contains expected phrase
    await twoPointers.goto(); // ensure we are on the app page
    const title = await twoPointers.title();
    expect(title).toBe('Two Pointers Concept');

    // Verify H1 header text
    const header = await twoPointers.headerText();
    expect(header).toBe('Two Pointers Concept');
  });

  test('Table structure: header + 10 data rows and expected cell contents', async ({ page }) => {
    // Purpose: Verify the table exists, correct number of rows, and specific cell content matches the HTML
    const twoPointers1 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Table should have 11 tr elements (1 header + 10 data rows)
    const rowCount = await twoPointers.tableRowCount();
    expect(rowCount).toBe(11);

    // Verify data rows content (first and last, and a few in-between) to ensure DOM matches provided HTML
    const dataRows = await twoPointers.tableDataRows();
    expect(dataRows.length).toBe(10);

    // Row 0 corresponds to index 0 in the HTML table (first data row)
    expect(dataRows[0]).toEqual(['0', '10', '10']);
    // Middle row (index 4)
    expect(dataRows[4]).toEqual(['4', '5', '5']);
    // Last data row (index 9)
    expect(dataRows[9]).toEqual(['9', '5', '5']);

    // Spot-check a few other rows
    expect(dataRows[1]).toEqual(['1', '20', '20']);
    expect(dataRows[5]).toEqual(['5', '15', '15']);
    expect(dataRows[6]).toEqual(['6', '10', '10']);
  });

  test('No interactive controls exist (inputs, buttons, selects, forms)', async ({ page }) => {
    // Purpose: Confirm the page has no interactive controls as per the HTML file
    const twoPointers2 = new TwoPointersPage(page);
    await twoPointers.goto();

    const interactiveHandles = await page.$$('input, button, select, textarea, form');
    expect(interactiveHandles.length).toBe(0);
  });

  test('Clicking table cells does not mutate DOM and produces no errors', async ({ page }) => {
    // Purpose: Simulate user clicking non-interactive elements and assert no DOM mutation and no errors
    const twoPointers3 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Capture outerHTML before clicks
    const beforeHTML = await page.$eval('table', el => el.outerHTML);

    // Click several table cells (first, middle, last)
    await page.click('table tr:nth-child(2) td:nth-child(2)'); // first data row, value cell
    await page.click('table tr:nth-child(6) td:nth-child(2)'); // middle data row, value cell
    await page.click('table tr:nth-child(11) td:nth-child(2)'); // last data row, value cell

    // Capture outerHTML after clicks
    const afterHTML = await page.$eval('table', el => el.outerHTML);

    // No DOM mutation expected
    expect(afterHTML).toBe(beforeHTML);

    // No page errors should have been emitted by clicking non-interactive elements
    expect(pageErrors.length).toBe(0);
  });

  test('twoPointers algorithm executed and logs expected console output', async ({ page }) => {
    // Purpose: Verify the inline script ran, produced console logs, and produced expected pair(s)
    const twoPointers4 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Wait briefly to allow script logs to be emitted (script runs synchronously on load, so this is mostly a safeguard)
    await page.waitForTimeout(50);

    // Filter console messages to just text strings for easier assertions
    const texts = consoleMessages.map(m => ({ type: m.type, text: m.text }));
    // Expect at least one log message announcing the pairs
    const announcement = texts.find(m => m.text.includes('Pairs of elements that sum up to'));
    expect(announcement).toBeTruthy();
    expect(announcement.text).toContain('Pairs of elements that sum up to 35 are:');

    // Expect the specific pair "(1, 5)" to be logged (the algorithm on the provided array should log this pair)
    const pairLogged = texts.find(m => m.text.includes('(1, 5)'));
    expect(pairLogged).toBeTruthy();

    // Ensure there are no page runtime errors
    expect(pageErrors.length).toBe(0);
  });

  test('Global function twoPointers exists and returns expected result when invoked in page context', async ({ page }) => {
    // Purpose: Without modifying the application code, read-only invocation to confirm the function exists and behaves as defined
    const twoPointers5 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Evaluate in page context: check that twoPointers is defined and calling it with the same array returns expected result
    const result = await page.evaluate(() => {
      // Access the function and data as defined in the page. This does not inject or modify globals.
      const exists = typeof twoPointers === 'function' ? true : false;
      let output;
      try {
        // The script defines arr = [10,20,15,25,5,15] and targetSum = 35 in the page's script.
        // We invoke twoPointers using that same array to verify its return value.
        const arr = [10, 20, 15, 25, 5, 15];
        const res = twoPointers(arr, 35);
        output = res;
      } catch (e) {
        output = { error: String(e) };
      }
      return { exists, output };
    });

    // Ensure the function exists
    expect(result.exists).toBe(true);

    // The algorithm as implemented should produce [[1,5]] for the given arr and target 35
    expect(Array.isArray(result.output)).toBe(true);
    expect(result.output.length).toBeGreaterThanOrEqual(1);
    // Check that [1,5] is present among results
    const hasPair = result.output.some(pair => Array.isArray(pair) && pair[0] === 1 && pair[1] === 5);
    expect(hasPair).toBe(true);

    // Confirm no page errors occurred during evaluation
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and semantics: table uses headers and structure is accessible', async ({ page }) => {
    // Purpose: Basic accessibility checks for semantic HTML: table headers present and cells exist
    const twoPointers6 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Ensure table header cells exist and contain expected labels
    const headers = await page.$$eval('table th', ths => ths.map(th => th.textContent.trim()));
    expect(headers).toEqual(['Index', 'Value', 'Sum']);

    // Ensure each data row has exactly 3 cells
    const rowCellCounts = await page.$$eval('table tr', rows =>
      Array.from(rows).slice(1).map(row => row.querySelectorAll('td').length)
    );
    rowCellCounts.forEach(count => expect(count).toBe(3));
  });

  test('Edge case observation: script does not log unexpected errors to console', async ({ page }) => {
    // Purpose: Ensure no console.error or uncaught exception was emitted during page load
    const twoPointers7 = new TwoPointersPage(page);
    await twoPointers.goto();

    // Wait a short time for any stray logs/errors
    await page.waitForTimeout(50);

    // Look for console.error messages
    const errorMessages = consoleMessages.filter(m => m.type === 'error' || /error/i.test(m.text));
    expect(errorMessages.length).toBe(0);

    // Also ensure no page errors were captured
    expect(pageErrors.length).toBe(0);
  });
});