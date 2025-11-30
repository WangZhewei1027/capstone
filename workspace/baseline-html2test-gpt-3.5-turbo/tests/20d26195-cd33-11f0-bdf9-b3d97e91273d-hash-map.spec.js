import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d26195-cd33-11f0-bdf9-b3d97e91273d.html';

test.describe('Hash Map Demonstration (20d26195-cd33-11f0-bdf9-b3d97e91273d)', () => {
  // Per-test arrays to capture console errors and page errors
  let consoleErrors;
  let pageErrors;

  // Common locators used in tests
  const selectors = {
    keyInput: '#hashKey',
    valueInput: '#hashValue',
    insertBtn: '#insertBtn',
    getBtn: '#getBtn',
    removeBtn: '#removeBtn',
    clearBtn: '#clearBtn',
    msgDiv: '#msg',
    tableBody: '#hashTable tbody'
  };

  // Attach listeners before each test and navigate to the app
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location ? msg.location() : undefined });
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Wait for main container to ensure script executed
    await expect(page.locator('h1')).toHaveText('Hash Map Demonstration');
  });

  // After each test, assert that no unexpected console errors or page errors occurred.
  // This ensures we observe runtime errors if they occur. Tests will fail if any are present.
  test.afterEach(async ({}, testInfo) => {
    // Make assertions in afterEach to ensure they run for every test.
    // If there are console errors / page errors, fail the test with details.
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Build an informative message for debugging
      const msgs = [];
      if (consoleErrors.length > 0) {
        msgs.push(`Console errors (${consoleErrors.length}):\n` + consoleErrors.map((c) => c.text).join('\n'));
      }
      if (pageErrors.length > 0) {
        msgs.push(`Page errors (${pageErrors.length}):\n` + pageErrors.map((e) => String(e)).join('\n'));
      }
      // Use testInfo.fail to annotate the test failure
      testInfo.attach('runtime-errors', { body: msgs.join('\n\n'), contentType: 'text/plain' });
      throw new Error(msgs.join('\n\n'));
    }
  });

  // Helper: get message text and class
  const getMsgLocator = (page) => page.locator(selectors.msgDiv);
  const getTableBody = (page) => page.locator(selectors.tableBody);
  const getKeyInput = (page) => page.locator(selectors.keyInput);
  const getValueInput = (page) => page.locator(selectors.valueInput);

  test('Initial load shows empty hash map and inputs are empty', async ({ page }) => {
    // Verify inputs are empty
    await expect(getKeyInput(page)).toHaveValue('');
    await expect(getValueInput(page)).toHaveValue('');

    // The table should show the "Hash Map is empty" row with colspan=2
    const tbody = getTableBody(page);
    await expect(tbody.locator('tr')).toHaveCount(1);
    const firstCell = tbody.locator('tr >> td').first();
    await expect(firstCell).toHaveText('Hash Map is empty');
    await expect(firstCell).toHaveAttribute('colspan', '2');

    // The message area should be empty initially (no message)
    await expect(getMsgLocator(page)).toHaveText('');
  });

  test('Insert a new key-value pair updates the table and shows success message', async ({ page }) => {
    // Enter key and value, then click Insert
    await getKeyInput(page).fill('foo');
    await getValueInput(page).fill('bar');
    await page.click(selectors.insertBtn);

    // Message should reflect insertion and have success class
    await expect(getMsgLocator(page)).toHaveText('Key "foo" inserted/updated successfully.');
    await expect(getMsgLocator(page)).toHaveClass('success');

    // Table should now have one row with key 'foo' and value 'bar'
    const tbody1 = getTableBody(page);
    await expect(tbody.locator('tr')).toHaveCount(1);
    const keyCell = tbody.locator('tr >> td').nth(0);
    const valCell = tbody.locator('tr >> td').nth(1);
    await expect(keyCell).toHaveText('foo');
    await expect(valCell).toHaveText('bar');
  });

  test('Updating an existing key replaces its value', async ({ page }) => {
    // Insert initial pair
    await getKeyInput(page).fill('alpha');
    await getValueInput(page).fill('one');
    await page.click(selectors.insertBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "alpha" inserted/updated successfully.');

    // Update the same key with a new value
    await getKeyInput(page).fill('alpha');
    await getValueInput(page).fill('uno');
    await page.click(selectors.insertBtn);

    // Confirm update message and that table shows updated value
    await expect(getMsgLocator(page)).toHaveText('Key "alpha" inserted/updated successfully.');
    const tbody2 = getTableBody(page);
    // Find the row with key 'alpha' (should be present exactly once)
    const rows = tbody.locator('tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('td').nth(0)).toHaveText('alpha');
    await expect(rows.locator('td').nth(1)).toHaveText('uno');
  });

  test('Get value for existing and non-existing keys shows correct messages and classes', async ({ page }) => {
    // Ensure a known key exists
    await getKeyInput(page).fill('k1');
    await getValueInput(page).fill('v1');
    await page.click(selectors.insertBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "k1" inserted/updated successfully.');

    // Get existing key
    await getKeyInput(page).fill('k1');
    await page.click(selectors.getBtn);
    await expect(getMsgLocator(page)).toHaveText('Value for key "k1": "v1"');
    await expect(getMsgLocator(page)).toHaveClass('success');

    // Get non-existing key
    await getKeyInput(page).fill('doesNotExist');
    await page.click(selectors.getBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "doesNotExist" not found in the hash map.');
    await expect(getMsgLocator(page)).toHaveClass('error');
  });

  test('Remove existing key removes it from table; removing non-existing key shows error', async ({ page }) => {
    // Insert a key to remove
    await getKeyInput(page).fill('toremove');
    await getValueInput(page).fill('val');
    await page.click(selectors.insertBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "toremove" inserted/updated successfully.');

    // Remove it
    await getKeyInput(page).fill('toremove');
    await page.click(selectors.removeBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "toremove" removed successfully.');
    await expect(getMsgLocator(page)).toHaveClass('success');

    // After removal, table should be empty (show Hash Map is empty)
    const tbody3 = getTableBody(page);
    await expect(tbody.locator('tr')).toHaveCount(1);
    await expect(tbody.locator('tr >> td').first()).toHaveText('Hash Map is empty');

    // Attempt to remove a non-existing key
    await getKeyInput(page).fill('no-such-key');
    await page.click(selectors.removeBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "no-such-key" not found in the hash map.');
    await expect(getMsgLocator(page)).toHaveClass('error');
  });

  test('Clear All removes all entries and shows cleared message', async ({ page }) => {
    // Insert multiple keys
    await getKeyInput(page).fill('a');
    await getValueInput(page).fill('1');
    await page.click(selectors.insertBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "a" inserted/updated successfully.');

    await getKeyInput(page).fill('b');
    await getValueInput(page).fill('2');
    await page.click(selectors.insertBtn);
    await expect(getMsgLocator(page)).toHaveText('Key "b" inserted/updated successfully.');

    // Ensure table has 2 rows now
    const tbody4 = getTableBody(page);
    await expect(tbody.locator('tr')).toHaveCount(2);

    // Click Clear All
    await page.click(selectors.clearBtn);
    await expect(getMsgLocator(page)).toHaveText('Hash map cleared.');
    await expect(getMsgLocator(page)).toHaveClass('success');

    // Table should show empty message again
    await expect(tbody.locator('tr')).toHaveCount(1);
    await expect(tbody.locator('tr >> td').first()).toHaveText('Hash Map is empty');
  });

  test('Edge cases: inserting with empty key shows an error and does not alter table', async ({ page }) => {
    // Ensure table is empty to start
    const tbody5 = getTableBody(page);
    await expect(tbody.locator('tr')).toHaveCount(1);
    await expect(tbody.locator('tr >> td').first()).toHaveText('Hash Map is empty');

    // Attempt to insert with empty key
    await getKeyInput(page).fill('   '); // whitespace-only should be trimmed to empty
    await getValueInput(page).fill('someval');
    await page.click(selectors.insertBtn);
    await expect(getMsgLocator(page)).toHaveText('Please enter a valid non-empty key.');
    await expect(getMsgLocator(page)).toHaveClass('error');

    // Table should remain unchanged (still empty)
    await expect(tbody.locator('tr')).toHaveCount(1);
    await expect(tbody.locator('tr >> td').first()).toHaveText('Hash Map is empty');
  });

  test('Edge cases: Get and Remove with empty key show appropriate error messages', async ({ page }) => {
    // Get with empty key
    await getKeyInput(page).fill('   ');
    await page.click(selectors.getBtn);
    await expect(getMsgLocator(page)).toHaveText('Please enter a key to get its value.');
    await expect(getMsgLocator(page)).toHaveClass('error');

    // Remove with empty key
    await getKeyInput(page).fill('');
    await page.click(selectors.removeBtn);
    await expect(getMsgLocator(page)).toHaveText('Please enter a key to remove.');
    await expect(getMsgLocator(page)).toHaveClass('error');
  });
});