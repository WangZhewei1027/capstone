import { test, expect } from '@playwright/test';

// Test file: 39b6b5c0-d1d5-11f0-b49a-6f458b3a25ef-hash-map.spec.js
// Application URL (served externally as per requirements)
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b6b5c0-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object Model for the Hash Map demo page
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.addButton = page.locator('#addButton');
    this.displayButton = page.locator('#displayButton');
    this.clearButton = page.locator('#clearButton');
    this.hashMapDiv = page.locator('#hashMap');
  }

  // Fill the key input
  async fillKey(key) {
    await this.keyInput.fill(key);
  }

  // Fill the value input
  async fillValue(value) {
    await this.valueInput.fill(value);
  }

  // Click the "Add to Hash Map" button
  async clickAdd() {
    await this.addButton.click();
  }

  // Click the "Display Hash Map" button
  async clickDisplay() {
    await this.displayButton.click();
  }

  // Click the "Clear Hash Map" button
  async clickClear() {
    await this.clearButton.click();
  }

  // Read the displayed hash map content
  async getHashMapText() {
    return (await this.hashMapDiv.textContent()) || '';
  }

  // Convenience: add a key-value pair (does not click display)
  async addKeyValue(key, value) {
    await this.fillKey(key);
    await this.fillValue(value);
    await this.clickAdd();
  }
}

test.describe('Hash Map Demonstration - End-to-End', () => {
  // Shared variables to capture page console errors, page errors, and dialogs
  let consoleErrors;
  let pageErrors;
  let dialogs;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleErrors = [];
    pageErrors = [];
    dialogs = [];

    // Collect console messages of type 'error' for assertions later
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Handle alerts/prompts/confirm dialogs by capturing their messages and accepting
    page.on('dialog', async (dialog) => {
      dialogs.push({
        type: dialog.type(),
        message: dialog.message()
      });
      await dialog.accept();
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test we assert that there were no unexpected runtime errors logged to the page console
    // and no uncaught exceptions. This validates the page executed without runtime exceptions.
    expect(consoleErrors.length, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors, found: ${JSON.stringify(pageErrors)}`).toBe(0);
  });

  test('Initial page load: elements are visible and inputs are empty', async ({ page }) => {
    // Purpose: Verify the initial DOM state and visibility of interactive controls
    const p = new HashMapPage(page);

    // Page title and header sanity checks
    await expect(page).toHaveTitle(/Hash Map Demonstration/);
    await expect(page.locator('h1')).toHaveText('Hash Map Demonstration');

    // Inputs should be visible and empty
    await expect(p.keyInput).toBeVisible();
    await expect(p.valueInput).toBeVisible();
    await expect(p.keyInput).toHaveValue('');
    await expect(p.valueInput).toHaveValue('');

    // Buttons should be visible and enabled
    await expect(p.addButton).toBeVisible();
    await expect(p.displayButton).toBeVisible();
    await expect(p.clearButton).toBeVisible();

    // Hash map display area should be present and initially empty
    await expect(p.hashMapDiv).toBeVisible();
    const initialContent = await p.getHashMapText();
    expect(initialContent).toBe('', 'Expected hash map display to be empty on initial load');

    // No dialogs should have appeared on page load
    expect(dialogs.length).toBe(0);
  });

  test('Add a key-value pair: triggers alert, clears inputs, and displays on request', async ({ page }) => {
    // Purpose: Validate adding an entry produces the expected alert, clears inputs, and updates display
    const p1 = new HashMapPage(page);

    // Add an entry and verify an alert with the correct message is shown
    await p.addKeyValue('alpha', '1');

    // One dialog (alert) should have been shown with the exact message
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const addDialog = dialogs.shift(); // consume the first dialog
    expect(addDialog.message).toBe('Added: alpha -> 1');

    // After adding, inputs should be cleared according to implementation
    await expect(p.keyInput).toHaveValue('');
    await expect(p.valueInput).toHaveValue('');

    // Display the hash map and verify the JSON formatted output contains the key-value pair
    await p.clickDisplay();
    const displayed = await p.getHashMapText();
    // JSON.stringify with 2-space indentation produces a pretty printed JSON object
    const expectedJson = '{\n  "alpha": "1"\n}';
    expect(displayed.trim()).toBe(expectedJson, `Expected displayed JSON to match exactly. Got: ${displayed}`);

    // No additional unexpected dialogs should be pending (remaining dialogs may be from other interactions)
    // (we already asserted at end of test that there are no console/page errors)
  });

  test('Adding with missing inputs shows validation alert and does not change map', async ({ page }) => {
    // Purpose: Ensure validation path for missing inputs triggers the correct alert and map remains unchanged
    const p2 = new HashMapPage(page);

    // Ensure map is in a known empty state before test by clicking clear (and accepting its alert)
    await p.clickClear();
    // A clear alert should appear; capture and remove it
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const clearDialog = dialogs.shift();
    expect(clearDialog.message).toBe('Hash Map cleared');

    // Try adding with both inputs empty
    await p.clickAdd();
    // Alert for missing fields should appear
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    let missingDialog = dialogs.shift();
    expect(missingDialog.message).toBe('Please enter both key and value.');

    // Map should still be empty when displayed
    await p.clickDisplay();
    const displayedAfterMissing = await p.getHashMapText();
    expect(displayedAfterMissing).toBe('', 'Expected hash map display to remain empty after invalid add');

    // Try adding with only key filled
    await p.fillKey('onlyKey');
    await p.fillValue(''); // ensure empty
    await p.clickAdd();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    missingDialog = dialogs.shift();
    expect(missingDialog.message).toBe('Please enter both key and value.');

    // Ensure inputs after invalid attempt: implementation does not clear inputs on invalid add, so key should remain
    await expect(p.keyInput).toHaveValue('onlyKey');
    await expect(p.valueInput).toHaveValue('');
  });

  test('Clear button empties the map and shows an alert', async ({ page }) => {
    // Purpose: Validate the clear functionality: it clears the internal map, clears UI, and shows alert
    const p3 = new HashMapPage(page);

    // Add two entries in order
    await p.addKeyValue('a', '1');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    dialogs.shift(); // remove add alert for 'a'
    await p.addKeyValue('b', '2');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    dialogs.shift(); // remove add alert for 'b'

    // Display should now show both entries in insertion order with pretty printing
    await p.clickDisplay();
    const displayedBeforeClear = await p.getHashMapText();
    const expectedBeforeClear = '{\n  "a": "1",\n  "b": "2"\n}';
    expect(displayedBeforeClear.trim()).toBe(expectedBeforeClear);

    // Click clear and assert the clear alert appears
    await p.clickClear();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const clearAlert = dialogs.shift();
    expect(clearAlert.message).toBe('Hash Map cleared');

    // After clearing, the display should be empty
    const displayedAfterClear = await p.getHashMapText();
    expect(displayedAfterClear).toBe('', 'Expected hash map display to be empty after clearing');
  });

  test('Multiple adds preserve insertion order and display formatting', async ({ page }) => {
    // Purpose: Add multiple entries and verify the JSON output preserves insertion order and formatting
    const p4 = new HashMapPage(page);

    // Clear any pre-existing state
    await p.clickClear();
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    dialogs.shift(); // consume clear alert

    // Add entries in a specific order
    const entries = [
      ['first', 'one'],
      ['second', 'two'],
      ['third', 'three']
    ];

    for (const [k, v] of entries) {
      await p.addKeyValue(k, v);
      expect(dialogs.length).toBeGreaterThanOrEqual(1);
      dialogs.shift(); // consume add alert
    }

    // Display and assert exact formatting from JSON.stringify with 2 spaces
    await p.clickDisplay();

    // Build expected JSON string exactly as produced by JSON.stringify
    const expectedObj = {
      first: 'one',
      second: 'two',
      third: 'three'
    };
    const expectedString = JSON.stringify(expectedObj, null, 2);

    const displayed1 = await p.getHashMapText();
    expect(displayed).toBe(expectedString, `Expected displayed JSON to match pretty-printed object. Got: ${displayed}`);
  });

  test('Accessibility and focus behavior: inputs can be focused and buttons are keyboard accessible', async ({ page }) => {
    // Purpose: Smoke test accessibility basics: focusability and keyboard activation
    const p5 = new HashMapPage(page);

    // Focus key input via keyboard tab sequence: start from body and press Tab until focused
    await page.keyboard.press('Tab'); // may focus first input or some other element
    // Ensure at least one input can be focused programmatically
    await p.keyInput.focus();
    await expect(p.keyInput).toBeFocused();

    // Type into inputs using keyboard and trigger Add via Enter key when focused on addButton
    await p.keyInput.fill('kbdKey');
    await p.valueInput.fill('kbdValue');

    // Focus add button and press Enter to trigger the click handler
    await p.addButton.focus();
    await expect(p.addButton).toBeFocused();
    await page.keyboard.press('Enter');

    // Alert should appear for the add
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const addDialog1 = dialogs.shift();
    expect(addDialog.message).toBe('Added: kbdKey -> kbdValue');

    // Display and verify the stored value
    await p.clickDisplay();
    const displayed2 = await p.getHashMapText();
    const expected = '{\n  "kbdKey": "kbdValue"\n}';
    expect(displayed.trim()).toBe(expected);
  });
});