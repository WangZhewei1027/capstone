import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b74602-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Hash Table Application (11b74602-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Arrays to capture page errors and console.error messages for assertions
  let consoleErrors = [];
  let pageErrors = [];
  // Store dialog messages seen during a test
  let dialogs = [];

  // Helper to get the count of <tr> rows appended into the #hash-table-container
  const rowCount = async (page) => {
    return await page.locator('#hash-table-container tr').count();
  };

  // Helper to get textContent of a specific row (index)
  const rowText = async (page, index) => {
    return await page.locator('#hash-table-container tr').nth(index).innerText();
  };

  test.beforeEach(async ({ page }) => {
    // Reset collectors each test
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Auto-accept dialogs and record their messages for assertions
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    // Go to the app page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test assert that there were no unexpected console errors or page errors.
    // If errors exist, include them in the assertion message for debugging.
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console.error logs: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test.describe('Initial page state and structure', () => {
    test('should load the page and show expected static elements', async ({ page }) => {
      // Verify title and header
      await expect(page).toHaveTitle(/Hash Table/);
      await expect(page.locator('h1')).toHaveText('Hash Table');

      // Verify form controls are present
      await expect(page.locator('form#hash-table-form')).toBeVisible();
      await expect(page.locator('#key')).toBeVisible();
      await expect(page.locator('#value')).toBeVisible();
      await expect(page.locator('#add-btn')).toBeVisible();
      await expect(page.locator('#clear-btn')).toBeVisible();
      await expect(page.locator('#search-btn')).toBeVisible();

      // Inputs should be empty on initial load
      await expect(page.locator('#key')).toHaveValue('');
      await expect(page.locator('#value')).toHaveValue('');

      // Container should be empty (no <tr> rows)
      expect(await rowCount(page)).toBe(0);
    });
  });

  test.describe('Add operation', () => {
    test('should add a new key-value pair and update the DOM', async ({ page }) => {
      // Purpose: test that adding creates a new row with key and value
      await page.fill('#key', 'alpha');
      await page.fill('#value', '1');

      // Click add button
      await page.click('#add-btn');

      // After adding, there should be at least one row with the key and value
      const count = await rowCount(page);
      expect(count).toBeGreaterThanOrEqual(1);

      // Check the latest row contains both key and value
      const text = await rowText(page, count - 1);
      expect(text).toContain('alpha');
      expect(text).toContain('1');
    });

    test('adding a duplicate key triggers an alert and does not add a second entry for that key', async ({ page }) => {
      // Purpose: ensure duplicate key adds show alert and do not duplicate entry
      await page.fill('#key', 'dupKey');
      await page.fill('#value', 'first');
      await page.click('#add-btn');

      // Confirm initial add created one row for dupKey
      let initialRows = await rowCount(page);
      expect(initialRows).toBeGreaterThanOrEqual(1);

      // Add the same key again with a different value
      await page.fill('#key', 'dupKey');
      await page.fill('#value', 'second');
      await page.click('#add-btn');

      // The app uses alert("Key already exists.");
      // Confirm a dialog was shown with expected message
      expect(dialogs).toContain('Key already exists.');

      // Ensure number of rows did not increase for the duplicate key addition
      const rowsAfterDuplicate = await rowCount(page);
      // It should be equal to initialRows (no new row added)
      expect(rowsAfterDuplicate).toBe(initialRows);

      // Ensure the existing row still contains the original value (not overwritten)
      // Find a row containing dupKey and assert it contains 'first' (the original value)
      const rows = page.locator('#hash-table-container tr');
      const count1 = await rows.count1();
      let foundOriginal = false;
      for (let i = 0; i < count; i++) {
        const txt = await rows.nth(i).innerText();
        if (txt.includes('dupKey') && txt.includes('first')) {
          foundOriginal = true;
          break;
        }
      }
      expect(foundOriginal).toBeTruthy();
    });
  });

  test.describe('Search operation', () => {
    test('searching an existing key appends its entry to the container', async ({ page }) => {
      // Purpose: test that search for existing key appends another row with key/value
      await page.fill('#key', 'searchKey');
      await page.fill('#value', 'X');
      await page.click('#add-btn');

      // Count rows after add
      const afterAdd = await rowCount(page);
      expect(afterAdd).toBeGreaterThanOrEqual(1);

      // Now search for that key; it should append another <tr> with the same key/value
      await page.fill('#key', 'searchKey');
      await page.click('#search-btn');

      // No alert should be triggered; dialogs array should NOT contain "Key not found." for this action
      expect(dialogs).not.toContain('Key not found.');

      // Row count should have increased by at least 1 (append behavior)
      const afterSearch = await rowCount(page);
      expect(afterSearch).toBeGreaterThanOrEqual(afterAdd + 1);

      // Verify at least one of the appended rows contains the expected value
      let found = false;
      const rows1 = page.locator('#hash-table-container tr');
      const count2 = await rows.count2();
      for (let i = 0; i < count; i++) {
        const txt1 = await rows.nth(i).innerText();
        if (txt.includes('searchKey') && txt.includes('X')) {
          found = true;
          break;
        }
      }
      expect(found).toBeTruthy();
    });

    test('searching a non-existent key triggers a "Key not found." alert', async ({ page }) => {
      // Purpose: ensure searching unknown key shows an alert and does not change DOM
      const before = await rowCount(page);
      await page.fill('#key', 'no-such-key');
      await page.click('#search-btn');

      // The app should have shown an alert with message "Key not found."
      expect(dialogs).toContain('Key not found.');

      // The DOM should remain unchanged (no new rows created)
      const after = await rowCount(page);
      expect(after).toBe(before);
    });
  });

  test.describe('Clear operation and state reset', () => {
    test('clear button removes all entries and resets state', async ({ page }) => {
      // Purpose: add entries, clear them, assert container empty and subsequent search fails
      await page.fill('#key', 'a');
      await page.fill('#value', '1');
      await page.click('#add-btn');

      await page.fill('#key', 'b');
      await page.fill('#value', '2');
      await page.click('#add-btn');

      // Confirm we have rows now
      const afterAdds = await rowCount(page);
      expect(afterAdds).toBeGreaterThanOrEqual(2);

      // Click clear
      await page.click('#clear-btn');

      // Container should be empty
      const afterClear = await rowCount(page);
      expect(afterClear).toBe(0);

      // Searching for a previously added key should produce "Key not found." alert
      await page.fill('#key', 'a');
      await page.click('#search-btn');

      expect(dialogs).toContain('Key not found.');
    });
  });

  test.describe('Edge cases and accessibility checks', () => {
    test('adding an empty key is allowed (treated as empty string key) and reflected in DOM', async ({ page }) => {
      // Purpose: check behavior for empty key input (edge case)
      await page.fill('#key', '');
      await page.fill('#value', 'emptyVal');
      await page.click('#add-btn');

      // Expect a row to be added with an empty key cell (row text contains the value)
      const cnt = await rowCount(page);
      expect(cnt).toBeGreaterThanOrEqual(1);

      // The row's text should contain the value; key cell may be empty string but test ensures value present
      const lastText = await rowText(page, cnt - 1);
      expect(lastText).toContain('emptyVal');
    });

    test('form controls are reachable and have accessible names', async ({ page }) => {
      // Purpose: simple accessibility sanity checks for labels and inputs
      // Check that label "Key:" is associated (by text presence) and input is reachable
      const keyLabelText = await page.locator('label[for="key"]').innerText();
      expect(keyLabelText).toContain('Key');

      const valueLabelText = await page.locator('label[for="value"]').innerText();
      expect(valueLabelText).toContain('Value');

      // Tab to the first input and ensure focus moves as expected
      await page.keyboard.press('Tab'); // focuses the first focusable element, likely the key input
      const active = await page.evaluate(() => document.activeElement?.id || '');
      // active element should be either the key input or the add button depending on browser focus flow
      // Ensure that at least one of our main controls can be focused programmatically via Tab
      expect(['key', 'value', 'add-btn', 'clear-btn', 'search-btn'].includes(active)).toBeTruthy();
    });
  });
});