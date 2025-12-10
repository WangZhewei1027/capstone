import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf4-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object Model for the Insertion Sort page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app URL and wait for load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Return the text of the H1 header
  async headerText() {
    return this.page.textContent('h1');
  }

  // Return number of table rows (including header)
  async tableRowCount() {
    return this.page.$$eval('table tr', rows => rows.length);
  }

  // Return the index column values as an array of strings
  async tableIndices() {
    return this.page.$$eval('table tr td:nth-child(1)', tds => tds.map(td => td.textContent.trim()));
  }

  // Return the value column values as an array of strings
  async tableValues() {
    return this.page.$$eval('table tr td:nth-child(2)', tds => tds.map(td => td.textContent.trim()));
  }

  // Check whether any interactive elements exist (buttons, inputs, selects, textareas, forms)
  async hasInteractiveElements() {
    return this.page.$$eval('button, input, select, textarea, form', els => els.length > 0);
  }
}

test.describe('Insertion Sort Application - UI and Script Validation', () => {
  // Basic smoke test to ensure the page loads and shows expected static content
  test('Initial page load shows title, header and table with expected number of rows', async ({ page }) => {
    const app = new InsertionSortPage(page);
    // Navigate to the application
    await app.goto();

    // Verify the document title is present and the H1 header is correct
    await expect(page).toHaveTitle(/Insertion Sort/i);
    const header = await app.headerText();
    expect(header).toBe('Insertion Sort');

    // Verify table exists and has 11 rows (1 header + 10 data rows)
    const rowCount = await app.tableRowCount();
    expect(rowCount).toBe(11);

    // Verify the index column and value column are present with 10 data entries
    const indices = await app.tableIndices();
    const values = await app.tableValues();
    // indices and values are only td cells; there should be 10 of each (header row has th)
    expect(indices.length).toBe(10);
    expect(values.length).toBe(10);

    // Check first and last index/value to ensure table content is as expected
    expect(indices[0]).toBe('1');
    expect(values[0]).toBe('5');
    expect(indices[indices.length - 1]).toBe('10');
    expect(values[values.length - 1]).toBe('10');
  });

  // Capture console messages and page errors emitted during page load and assert expected logs appear
  test('Console output indicates original and sorted arrays and there are no uncaught page errors', async ({ page }) => {
    const app1 = new InsertionSortPage(page);

    // Collect console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      // Record console text for assertions
      try {
        consoleMessages.push(msg.text());
      } catch (e) {
        consoleMessages.push(String(msg));
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the page (this will run the inline script that logs arrays)
    await app.goto();

    // Allow a short moment for console messages to be emitted
    await page.waitForTimeout(100);

    // Assert that the console logged the markers for original and sorted arrays
    const joinedConsole = consoleMessages.join('\n');
    expect(joinedConsole).toContain('Original Array:');
    expect(joinedConsole).toContain('Sorted Array:');

    // Assert that some console output includes numeric array contents;
    // The exact formatting can vary, so check presence of expected sequence numbers.
    // We expect that the sorted array contains '1' and '10' and other digits; at least check a concise representation.
    expect(joinedConsole).toMatch(/1/);
    expect(joinedConsole).toMatch(/10/);

    // Assert that there are no uncaught page errors during load
    expect(pageErrors.length).toBe(0);
  });

  // Verify that the sorting happens in the script scope and that the DOM is not modified by the script
  test('Script sorts internal array but does not modify table DOM - DOM remains initial unsorted values', async ({ page }) => {
    const app2 = new InsertionSortPage(page);

    await app.goto();

    // Read the DOM values (these should be the original unsorted values as present in HTML)
    const domValues = await app.tableValues();
    const domNumbers = domValues.map(v => Number(v));

    // Expected original array from the HTML
    const expectedOriginal = [5, 1, 9, 6, 8, 7, 4, 3, 2, 10];
    expect(domNumbers).toEqual(expectedOriginal);

    // Ask the page for its global 'arr' variable that the script used and sorted.
    // This checks that the script executed and mutated the in-memory array.
    const pageArray = await page.evaluate(() => {
      // Return the runtime arr if present; otherwise return null
      try {
        return window.arr;
      } catch (e) {
        return null;
      }
    });

    // The runtime arr should be sorted by the script to [1..10]
    expect(pageArray).toBeTruthy();
    expect(pageArray).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Confirm that DOM was not updated to reflect the sorted array (explicit mismatch)
    expect(domNumbers).not.toEqual(pageArray);
  });

  // Ensure there are no interactive controls on the page (the page is static)
  test('Page contains no interactive elements like buttons or inputs', async ({ page }) => {
    const app3 = new InsertionSortPage(page);
    await app.goto();

    const hasInteractive = await app.hasInteractiveElements();
    // According to the HTML provided, there are no interactive elements; assert that fact
    expect(hasInteractive).toBe(false);
  });

  // Validate that the insertionSort function is exposed and behaves correctly when invoked programmatically
  test('insertionSort function exists on the page and correctly sorts arrays when called via evaluate', async ({ page }) => {
    const app4 = new InsertionSortPage(page);
    await app.goto();

    // Verify function exists
    const typeOfFunc = await page.evaluate(() => typeof window.insertionSort);
    expect(typeOfFunc).toBe('function');

    // Call insertionSort with a small test array and assert the returned value is sorted
    const result = await page.evaluate(() => {
      // Call the global insertionSort function with a test array
      return insertionSort([3, 1, 2]);
    });
    expect(result).toEqual([1, 2, 3]);

    // Edge case: calling insertionSort with an empty array should return an empty array
    const emptyResult = await page.evaluate(() => insertionSort([]));
    expect(emptyResult).toEqual([]);
  });

  // Test how the function handles invalid input - we expect a thrown exception when null is provided
  test('Calling insertionSort with invalid input (null) should throw inside page context', async ({ page }) => {
    const app5 = new InsertionSortPage(page);
    await app.goto();

    // Execute inside the page to capture any thrown error and return its string
    const outcome = await page.evaluate(() => {
      try {
        insertionSort(null);
        return { threw: false, value: null };
      } catch (e) {
        // Return that an error was thrown and include its message for assertion (message may vary by browser)
        return { threw: true, message: String(e) };
      }
    });

    // We expect an exception to be thrown when null is passed (the algorithm expects an array)
    expect(outcome.threw).toBe(true);
    expect(outcome.message).toBeTruthy();
  });
});