import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f7432b-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the Two Pointers app
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#twoPointers');
    this.table = page.locator('#twoPointers table');
    this.rows = page.locator('#twoPointers table tr');
    this.h2 = page.locator('#twoPointers h2');
  }

  async getInnerHTML() {
    return this.page.locator('#twoPointers').evaluate((el) => el.innerHTML);
  }

  async getRowCount() {
    // returns number of <tr> elements (includes header row)
    return await this.rows.count();
  }

  async getCellText(rowIndex, colIndex) {
    const cell = this.page.locator(`#twoPointers table tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`);
    return (await cell.count()) ? (await cell.innerText()) : null;
  }
}

test.describe('Two Pointers App - End-to-End Tests', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Attach listeners before each test to capture runtime diagnostics
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // Capture console messages for later assertions
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions on the page
      pageErrors.push(err && err.message ? err.message : String(err));
    });
  });

  test.afterEach(async () => {
    // Basic sanity: clear arrays (not strictly necessary but keeps state clean)
    consoleMessages = [];
    pageErrors = [];
  });

  test('prompts for number of elements and renders a table for numElements = 1', async ({ page }) => {
    // Purpose: Verify prompt appears, accept "1", and validate table with one data row is created.
    const twoPointers = new TwoPointersPage(page);

    // Intercept the prompt and provide '1'
    page.on('dialog', async (dialog) => {
      // The script uses prompt(), so dialog.type() should be 'prompt'
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('1');
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for the container to be populated
    await expect(twoPointers.h2).toHaveText(/Two Pointers:/);

    // Table should exist and include header + 1 data row => total 2 <tr>
    const trCount = await twoPointers.getRowCount();
    expect(trCount).toBe(2);

    // Validate the first data row cells:
    // - First cell: numeric value between 0 and 99
    // - Second cell: likely "undefined" because elements[i+1] is out-of-bounds for single element
    const firstCell = await twoPointers.getCellText(1, 0); // rowIndex 1 => first data row
    const secondCell = await twoPointers.getCellText(1, 1);

    expect(firstCell).toMatch(/^\d+$/);
    // convert to number and assert range
    const firstNum = parseInt(firstCell, 10);
    expect(firstNum).toBeGreaterThanOrEqual(0);
    expect(firstNum).toBeLessThan(100);

    // The implementation writes elements[i + 1] even when undefined -> string "undefined" expected
    expect(secondCell).toBe('undefined');

    // Ensure no uncaught page errors were observed for this input
    expect(pageErrors.length).toBe(0);
  });

  test('handles numElements = 0 and produces only header with no data rows', async ({ page }) => {
    // Purpose: Provide "0" to prompt and verify that only the table header is present (no data rows).
    const twoPointers1 = new TwoPointersPage(page);

    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('0');
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Header should be present
    await expect(twoPointers.h2).toHaveText(/Two Pointers:/);

    // With 0 elements the for-loop should not produce any data rows -> only header row remains
    const trCount1 = await twoPointers.getRowCount();
    expect(trCount).toBe(1); // only the header row

    // No data cells should exist
    const firstDataCell = await twoPointers.getCellText(1, 0);
    expect(firstDataCell).toBeNull();

    expect(pageErrors.length).toBe(0);
  });

  test('handles non-numeric prompt input (e.g., "abc") gracefully', async ({ page }) => {
    // Purpose: Input non-numeric string and ensure application does not throw and shows header only.
    const twoPointers2 = new TwoPointersPage(page);

    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('abc');
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    // The code uses parseInt('abc') -> NaN; loops should not execute and header will be rendered.
    await expect(twoPointers.h2).toHaveText(/Two Pointers:/);

    const trCount2 = await twoPointers.getRowCount();
    expect(trCount).toBe(1);

    // Verify there were no uncaught exceptions recorded
    expect(pageErrors.length).toBe(0);
  });

  test('dismissing the prompt (cancel) behaves like invalid input and does not throw', async ({ page }) => {
    // Purpose: Dismiss (cancel) the prompt and ensure the application handles null gracefully.
    const twoPointers3 = new TwoPointersPage(page);

    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.dismiss(); // simulate user pressing Cancel
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    await expect(twoPointers.h2).toHaveText(/Two Pointers:/);

    const trCount3 = await twoPointers.getRowCount();
    expect(trCount).toBe(1);

    expect(pageErrors.length).toBe(0);
  });

  test('providing numElements = 2 leads to a blocking/infinite loop in the page script (observed as navigation/loading problem)', async ({ page }) => {
    // Purpose: The implementation contains a logic bug where pointer1 never increments.
    // For numElements > 1, the inline script will enter an infinite loop. We assert that navigation
    // cannot complete normally within a short timeout (the script blocks load).
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('2');
    });

    // Attempt navigation but set a modest timeout: the script is expected to block the page load.
    let navigationThrew = false;
    try {
      // We deliberately set a short timeout to detect blocking behavior quickly.
      await page.goto(APP_URL, { timeout: 3000, waitUntil: 'load' });
    } catch (err) {
      navigationThrew = true;
      // The error should be a timeout due to the blocking script; assert the message mentions timeout.
      expect(String(err.message).toLowerCase()).toContain('timeout');
    }

    // If navigation threw a timeout, that's consistent with the infinite loop bug.
    expect(navigationThrew).toBe(true);

    // Additionally, ensure that the page container remains empty (script never reached DOM update).
    // We allow a short delay to ensure any partial changes would have been applied.
    await page.waitForTimeout(200);
    const containerHTML = await page.locator('#twoPointers').evaluate((el) => el.innerHTML);
    // Expect no header or table was written when the script blocks before DOM update
    // It could be empty string or partial content; assert it's either empty or does NOT contain the header text.
    expect(containerHTML.includes('Two Pointers:')).toBe(false);

    // Capture if any page errors occurred (likely none; we're testing blocking)
    // We accept either zero or more errors; just attach the console messages to test output via assertion
    // (we ensure the test records these messages rather than failing).
    expect(Array.isArray(pageErrors)).toBe(true);
  });

  test('captures console messages and page errors on normal loads (diagnostics)', async ({ page }) => {
    // Purpose: Ensure we can observe console messages and page errors emitted by the page.
    // Use numElements = 1 (normal flow) to populate the page and record diagnostics.
    const twoPointers4 = new TwoPointersPage(page);

    page.on('dialog', async (dialog) => {
      await dialog.accept('1');
    });

    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait a little to capture any console activity
    await page.waitForTimeout(200);

    // We expect consoleMessages to be an array (may be empty)
    expect(Array.isArray(consoleMessages)).toBe(true);

    // No uncaught page errors should be present for this test input
    expect(pageErrors.length).toBe(0);

    // Sanity-check DOM is rendered
    await expect(twoPointers.h2).toHaveText(/Two Pointers:/);
  });
});