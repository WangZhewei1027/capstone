import { test, expect } from '@playwright/test';

// URL of the page under test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a674-cd2f-11f0-a440-159d7b77af86.html';

// Page Object Model for the Hash Map page
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('button', { hasText: 'Add to Hash Map' });
    this.displayButton = page.locator('button', { hasText: 'Display Hash Map' });
    this.output = page.locator('#output');
    this.header = page.locator('h1');
  }

  // Navigate to the page and ensure it is loaded
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
  }

  // Fill the key input
  async fillKey(text) {
    await this.keyInput.fill(text);
  }

  // Fill the value input
  async fillValue(text) {
    await this.valueInput.fill(text);
  }

  // Click the add button
  async clickAdd() {
    await this.addButton.click();
  }

  // Click the display button
  async clickDisplay() {
    await this.displayButton.click();
  }

  // Get the visible text content of the output element
  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }

  // Get the innerHTML of the output element (useful for checking <strong> and <br> markup)
  async getOutputInnerHTML() {
    return await this.page.$eval('#output', (el) => el.innerHTML);
  }

  // Check if key and value inputs are empty
  async inputsAreEmpty() {
    const key = await this.keyInput.inputValue();
    const value = await this.valueInput.inputValue();
    return key === '' && value === '';
  }

  // Get computed background color of the output element
  async outputBackgroundColor() {
    return await this.page.$eval('#output', (el) => window.getComputedStyle(el).backgroundColor);
  }
}

test.describe('Hash Map Implementation - End-to-End Tests', () => {
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners and navigate to the app before each test
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Create page object and navigate
    const hm = new HashMapPage(page);
    await hm.goto();
  });

  // After each test, assert that no page errors or console error-level messages were emitted
  test.afterEach(async ({ page }) => {
    // Allow a brief moment for any late errors to surface
    await page.waitForTimeout(50);

    // Assert no uncaught page errors
    expect(pageErrors, `Expected no uncaught page errors, found: ${JSON.stringify(pageErrors)}`).toEqual([]);

    // Assert there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors, `Expected no console.error messages, found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  test('Initial page load shows expected static elements and default state', async ({ page }) => {
    // Purpose: Verify initial UI state: header, inputs, buttons, and empty output area
    const hm = new HashMapPage(page);

    // Header contains expected title text
    await expect(hm.header).toHaveText('Hash Map Implementation');

    // Inputs are visible and empty by default
    await expect(hm.keyInput).toBeVisible();
    await expect(hm.valueInput).toBeVisible();
    expect(await hm.keyInput.inputValue()).toBe('');
    expect(await hm.valueInput.inputValue()).toBe('');

    // Buttons are visible and enabled
    await expect(hm.addButton).toBeVisible();
    await expect(hm.displayButton).toBeVisible();
    await expect(hm.addButton).toBeEnabled();
    await expect(hm.displayButton).toBeEnabled();

    // Output exists and is empty initially
    const outputText = await hm.getOutputText();
    expect(outputText.trim()).toBe('');

    // Visual check: output background color matches CSS (#e8ffe8 -> rgb(232, 255, 232))
    const bgColor = await hm.outputBackgroundColor();
    expect(bgColor).toBe('rgb(232, 255, 232)');
  });

  test('Adding a key-value pair updates state and shows confirmation; inputs are cleared', async ({ page }) => {
    // Purpose: Ensure addToHashMap works: stores pair, shows "Added" message, and clears inputs
    const hm = new HashMapPage(page);

    // Fill inputs and click Add
    await hm.fillKey('foo');
    await hm.fillValue('bar');
    await hm.clickAdd();

    // The output should show the "Added" confirmation with exact formatting
    const out = await hm.getOutputText();
    expect(out).toContain('Added: "foo" -> "bar" to the hash map.');

    // Inputs should be cleared after adding
    expect(await hm.inputsAreEmpty()).toBe(true);
  });

  test('Display button shows all current entries in the hash map', async ({ page }) => {
    // Purpose: Validate displayHashMap iterates over stored entries and renders them
    const hm = new HashMapPage(page);

    // Add two entries
    await hm.fillKey('alpha');
    await hm.fillValue('1');
    await hm.clickAdd();

    await hm.fillKey('beta');
    await hm.fillValue('2');
    await hm.clickAdd();

    // Click display and inspect innerHTML for markup and exact entries
    await hm.clickDisplay();

    const inner = await hm.getOutputInnerHTML();

    // Should include the strong header and both entries
    expect(inner).toContain('<strong>Current Hash Map:</strong>');
    expect(inner).toContain('"alpha": "1"');
    expect(inner).toContain('"beta": "2"');

    // Ensure entries are separated by <br> (as per implementation)
    expect(inner).toMatch(/"alpha": "1"<br>/);
    expect(inner).toMatch(/"beta": "2"<br>/);
  });

  test('Attempting to add without providing both key and value triggers an alert', async ({ page }) => {
    // Purpose: Verify edge case handling: both fields required -> alert shown
    const hm = new HashMapPage(page);

    // Ensure both inputs empty and click add
    await hm.fillKey('');
    await hm.fillValue('');

    // Listen for dialog that should be created by alert()
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      hm.clickAdd()
    ]);

    // Assert the dialog message content and accept it
    expect(dialog.message()).toBe('Both key and value must be provided.');
    await dialog.accept();

    // Output should remain unchanged (empty)
    const out = await hm.getOutputText();
    expect(out.trim()).toBe('');
  });

  test('Adding a duplicate key overwrites its value in the hash map', async ({ page }) => {
    // Purpose: Ensure hashMap[key] = value semantics: new value overwrites old value
    const hm = new HashMapPage(page);

    // Add key 'dup' with 'first'
    await hm.fillKey('dup');
    await hm.fillValue('first');
    await hm.clickAdd();

    // Add key 'dup' again with 'second'
    await hm.fillKey('dup');
    await hm.fillValue('second');
    await hm.clickAdd();

    // Display and assert that the value for 'dup' is the latest one
    await hm.clickDisplay();
    const inner = await hm.getOutputInnerHTML();
    expect(inner).toContain('"dup": "second"');
    // Ensure the old value does not appear
    expect(inner).not.toContain('"dup": "first"');
  });

  test('Keys and values with special characters are handled and displayed correctly', async ({ page }) => {
    // Purpose: Validate that arbitrary strings (spaces, punctuation) work as keys/values
    const hm = new HashMapPage(page);

    const specialKey = 'key with spaces & symbols #$@!';
    const specialValue = 'value: <> "quotes" & more';

    await hm.fillKey(specialKey);
    await hm.fillValue(specialValue);
    await hm.clickAdd();

    // Display and ensure the exact strings appear within the output innerHTML
    await hm.clickDisplay();
    const inner = await hm.getOutputInnerHTML();

    // The implementation wraps keys/values in double quotes in the HTML output
    expect(inner).toContain(`"${specialKey}": "${specialValue}"`);
  });
});