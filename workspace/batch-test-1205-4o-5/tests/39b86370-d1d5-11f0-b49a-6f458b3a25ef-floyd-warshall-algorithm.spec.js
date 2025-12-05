import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b86370-d1d5-11f0-b49a-6f458b3a25ef.html';

test.describe('Floyd-Warshall Algorithm Visualization (App ID: 39b86370-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  // Arrays to collect console messages and uncaught page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners and navigate to the page before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Ensure basic page elements are loaded before tests run
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#matrixInput')).toBeVisible();
    await expect(page.locator('button')).toBeVisible();
  });

  test.afterEach(async () => {
    // nothing to teardown beyond Playwright's built-in cleanup
  });

  test.describe('Initial state and UI elements', () => {
    test('Initial page load shows title, default textarea content, and result table is hidden', async ({ page }) => {
      // Verify the title is present and correct
      await expect(page.locator('h1')).toHaveText('Floyd-Warshall Algorithm Visualization');

      // Verify textarea has the expected default matrix value
      const textarea = page.locator('#matrixInput');
      const value = await textarea.inputValue();
      // Check the textarea contains the beginning of the default content
      await expect(value).toContain('0 3 Infinity 7');

      // The result table should be present in the DOM but hidden initially (display)
      const resultTable = page.locator('#resultTable');
      await expect(resultTable).toBeAttached();
      // Check computed style for display none
      const displayStyle = await resultTable.evaluate((el) => getComputedStyle(el).display);
      expect(displayStyle === 'none' || displayStyle === 'hidden' ? true : displayStyle).toBe('none');
    });
  });

  test.describe('Core functionality and interactions', () => {
    test('Clicking "Run Floyd-Warshall Algorithm" computes shortest paths and displays the result table with expected values', async ({ page }) => {
      // Click the Run button
      const runButton = page.getByRole('button', { name: /Run Floyd-Warshall Algorithm/i });
      await runButton.click();

      // Wait for the result table to be visible
      const table = page.locator('#resultTable');
      await expect(table).toBeVisible();

      // Extract table text content into a structured array
      const rows = await table.locator('tr').allTextContents();

      // Expect header row and 4 data rows (4x4 matrix => header + 4 rows)
      expect(rows.length).toBe(5);

      // Header row should start with empty header cell then 0 1 2 3
      expect(rows[0].trim()).toBe('0 1 2 3' || rows[0].includes('0')); // lenient check for header presence

      // Build a 2D array of the cell values for clearer assertions
      const cellMatrix = await table.evaluate((tbl) => {
        const data = [];
        const trs = Array.from(tbl.querySelectorAll('tr'));
        // skip header row text cell mapping: first row contains header labels
        for (let i = 1; i < trs.length; i++) {
          const cells = Array.from(trs[i].querySelectorAll('th, td')).map(c => c.textContent.trim());
          data.push(cells);
        }
        return data;
      });

      // The table rows include the leading row header in each row; expected format: [rowHeader, c0, c1, c2, c3]
      // Convert to numerical/text values for comparison
      // Expected final shortest path matrix computed manually:
      // 0 3 4 5
      // 6 0 1 2
      // 7 10 0 3
      // 4 7 8 0
      const expected = [
        ['0', '3', '4', '5'],
        ['6', '0', '1', '2'],
        ['7', '10', '0', '3'],
        ['4', '7', '8', '0'],
      ];

      // Iterate and assert each cell matches expected values
      for (let i = 0; i < expected.length; i++) {
        // cellMatrix[i] like ['i', val0, val1, val2, val3] or sometimes no row header depending on render; handle both
        const rowCells = cellMatrix[i];
        // If first item equals the row label, drop it
        let values = rowCells;
        if (rowCells.length === expected[i].length + 1) {
          values = rowCells.slice(1);
        }
        expect(values.length).toBe(expected[i].length);
        for (let j = 0; j < expected[i].length; j++) {
          expect(values[j]).toBe(expected[i][j]);
        }
      }
    });

    test('Updating the matrix input to a 2x2 identity-like with Infinity shows correct result (edge case: small matrix)', async ({ page }) => {
      // Replace textarea content with a 2x2 matrix that has no edges (only self-zero)
      const newContent = '0 Infinity\nInfinity 0';
      const textarea1 = page.locator('#matrixInput');
      await textarea.fill(newContent);

      // Click Run and wait for the table
      await page.getByRole('button', { name: /Run Floyd-Warshall Algorithm/i }).click();
      const table1 = page.locator('#resultTable');
      await expect(table).toBeVisible();

      // Extract rows and ensure 2x2 values preserved (self zeros and infinities shown as ∞)
      const cellText = await table.evaluate((tbl) => {
        const result = [];
        const trs1 = Array.from(tbl.querySelectorAll('tr'));
        for (let i = 1; i < trs.length; i++) {
          const tds = Array.from(trs[i].querySelectorAll('th, td')).map(n => n.textContent.trim());
          // drop row header if present
          if (tds.length > 2) {
            result.push(tds.slice(1));
          } else {
            result.push(tds);
          }
        }
        return result;
      });

      // Expected textual display: '0' and '∞'
      expect(cellText.length).toBe(2);
      expect(cellText[0]).toEqual(['0', '∞']);
      expect(cellText[1]).toEqual(['∞', '0']);
    });

    test('Malformed input (non-numeric tokens) is parsed and displayed (NaN propagation) without throwing page errors', async ({ page }) => {
      // Provide malformed input that will produce NaN when Number() is applied
      const badInput = 'a b\nc d';
      await page.locator('#matrixInput').fill(badInput);

      // Click Run and wait for table to display results
      await page.getByRole('button', { name: /Run Floyd-Warshall Algorithm/i }).click();
      await expect(page.locator('#resultTable')).toBeVisible();

      // The displayResult will place whatever values are in the computed matrix into the table.
      // With NaN entries, we expect 'NaN' to appear in the table text.
      const tableText = await page.locator('#resultTable').innerText();
      // Assert that 'NaN' appears at least once in the rendered table
      expect(tableText).toContain('NaN');

      // Also assert that there were no uncaught page errors (runtime exceptions) during this operation
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Console and error monitoring', () => {
    test('No uncaught page errors are emitted during normal usage', async ({ page }) => {
      // Run the algorithm with default matrix to ensure normal usage
      await page.getByRole('button', { name: /Run Floyd-Warshall Algorithm/i }).click();
      await expect(page.locator('#resultTable')).toBeVisible();

      // Assert there were no uncaught page errors captured
      expect(pageErrors.length).toBe(0);

      // Inspect captured console messages for any 'error' type logs
      const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
      // Expect no console errors during a normal run
      expect(errorConsoleMessages.length).toBe(0);
    });

    test('Capture and expose console messages for debugging purposes', async ({ page }) => {
      // This test demonstrates collection of console output. We do not expect specific logs,
      // but we assert that the collector captured an array (possibly empty).
      // Trigger a run to generate any console activity from the page scripts
      await page.getByRole('button', { name: /Run Floyd-Warshall Algorithm/i }).click();
      await expect(page.locator('#resultTable')).toBeVisible();

      // consoleMessages is an array of objects {type, text}
      expect(Array.isArray(consoleMessages)).toBe(true);
      // Every captured entry should have a type and text
      for (const msg of consoleMessages) {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('text');
      }
    });
  });
});