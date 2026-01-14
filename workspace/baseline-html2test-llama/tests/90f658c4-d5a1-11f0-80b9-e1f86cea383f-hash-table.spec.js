import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f658c4-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Hash Table App (90f658c4-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Page object for the Hash Table UI
  class HashTablePage {
    constructor(page) {
      this.page = page;
      this.keyInput = page.locator('#key');
      this.valueInput = page.locator('#value');
      this.form = page.locator('#hash-table-form');
      this.submitButton = page.locator('input[type="submit"]');
      this.hashTableContainer = page.locator('#hash-table');
      this.paragraphs = () => this.hashTableContainer.locator('p');
    }

    async goto() {
      await this.page.goto(APP_URL);
    }

    async addEntry(key, value) {
      await this.keyInput.fill(key);
      await this.valueInput.fill(value);
      // Use the form submit to exercise the preventDefault handler
      await Promise.all([
        this.page.waitForResponse(response => true).catch(() => {}), // harmless catcher in case no network
        this.form.evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))).catch(() => {})
      ]);
      // Some environments may not trigger the same way with evaluate-submitted event;
      // fallback to clicking submit to match user interaction:
      await this.submitButton.click();
    }
  }

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application before each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Nothing special to teardown - Playwright fixture will close pages automatically.
    // We keep this hook to make it explicit and reserved for cleanup if needed.
  });

  test('Initial page load: UI elements are present and hash table is empty', async ({ page }) => {
    // Purpose: Verify initial state of the page, presence of form elements and empty display area
    const ui = new HashTablePage(page);

    // Check page title and heading
    await expect(page.locator('h1')).toHaveText('Hash Table');

    // Inputs and form should be visible
    await expect(ui.keyInput).toBeVisible();
    await expect(ui.valueInput).toBeVisible();
    await expect(ui.submitButton).toBeVisible();

    // The container for entries should exist and be empty initially
    await expect(ui.hashTableContainer).toBeVisible();
    await expect(ui.paragraphs()).toHaveCount(0);

    // Ensure there are no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    // Ensure no console error messages emitted
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Adding a single key-value pair updates the display with "key: value"', async ({ page }) => {
    // Purpose: Test submitting a new key-value pair creates a paragraph with the expected text
    const ui1 = new HashTablePage(page);

    // Use the visible inputs and submit the form
    await ui.keyInput.fill('fruit');
    await ui.valueInput.fill('apple');
    await ui.submitButton.click();

    // After submission, one paragraph should appear with the content "fruit: apple"
    const paragraphs = ui.paragraphs();
    await expect(paragraphs).toHaveCount(1);
    await expect(paragraphs.nth(0)).toHaveText('fruit: apple');

    // Confirm there were no runtime exceptions during the operation
    expect(pageErrors.length).toBe(0);
    const consoleError = consoleMessages.find(m => m.type === 'error');
    expect(consoleError).toBeUndefined();
  });

  test('Adding another value to an existing key appends to stored values and displays combined entry', async ({ page }) => {
    // Purpose: Verify duplicate key handling: values are aggregated and latest paragraph shows combined values
    const ui2 = new HashTablePage(page);

    // Add first value for key 'color'
    await ui.keyInput.fill('color');
    await ui.valueInput.fill('red');
    await ui.submitButton.click();

    // Add second value for same key 'color'
    await ui.keyInput.fill('color');
    await ui.valueInput.fill('blue');
    await ui.submitButton.click();

    // There should be two paragraphs:
    // - first: "color: red"
    // - second: "color: red, blue" (as the script appends a new <p> with the combined value)
    const paragraphs1 = ui.paragraphs1();
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.nth(0)).toHaveText('color: red');
    await expect(paragraphs.nth(1)).toHaveText('color: red, blue');

    // Also ensure the last paragraph contains both values separated by comma and space
    const lastText = await paragraphs.nth(1).textContent();
    expect(lastText).toBe('color: red, blue');

    // No uncaught exceptions should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test('Submitting with an empty key creates an entry using an empty string as the key', async ({ page }) => {
    // Purpose: Edge case - the implementation allows empty keys; verify behavior is consistent
    const ui3 = new HashTablePage(page);

    // Submit an entry with empty key and a value
    await ui.keyInput.fill('');
    await ui.valueInput.fill('mystery');
    await ui.submitButton.click();

    // Expect a paragraph starting with ": mystery"
    const paragraphs2 = ui.paragraphs2();
    await expect(paragraphs).toHaveCount(1);
    await expect(paragraphs.nth(0)).toHaveText(': mystery');

    // Submit another value for the same empty key to ensure aggregation behavior
    await ui.keyInput.fill('');
    await ui.valueInput.fill('another');
    await ui.submitButton.click();

    // Should now have two paragraphs; last one should show ': mystery, another'
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.nth(1)).toHaveText(': mystery, another');

    // Verify no uncaught runtime errors
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test('Form submission does not reload the page (preventDefault is active)', async ({ page }) => {
    // Purpose: Ensure submit handler prevents default form submission and the page does not navigate away
    const ui4 = new HashTablePage(page);
    const initialURL = page.url();

    // Fill and submit the form
    await ui.keyInput.fill('navtest');
    await ui.valueInput.fill('stay');
    await ui.submitButton.click();

    // The URL should remain the same (no reload/navigation)
    expect(page.url()).toBe(initialURL);

    // Check that the DOM was updated as a result of JS without navigation
    await expect(ui.paragraphs()).toHaveCount(1);
    await expect(ui.paragraphs().nth(0)).toHaveText('navtest: stay');

    // Confirm no uncaught exceptions occurred while preventing navigation
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });

  test('Multiple varied interactions maintain correct DOM updates and no runtime errors', async ({ page }) => {
    // Purpose: Perform a series of operations to verify state consistency and error-free behavior over multiple actions
    const ui5 = new HashTablePage(page);

    const entries = [
      { k: 'a', v: '1' },
      { k: 'b', v: '2' },
      { k: 'a', v: '3' }, // duplicate key 'a' should aggregate
      { k: 'c', v: '' },  // empty value allowed
      { k: '', v: '' }    // both empty
    ];

    for (const e of entries) {
      await ui.keyInput.fill(e.k);
      await ui.valueInput.fill(e.v);
      await ui.submitButton.click();
    }

    // Verify number of paragraphs equals number of submissions (implementation appends each submission)
    await expect(ui.paragraphs()).toHaveCount(entries.length);

    // Check specific expected texts:
    await expect(ui.paragraphs().nth(0)).toHaveText('a: 1');
    await expect(ui.paragraphs().nth(1)).toHaveText('b: 2');
    // After adding 'a' again, the implementation will append a paragraph with 'a: 1, 3'
    await expect(ui.paragraphs().nth(2)).toHaveText('a: 1, 3');
    // empty value yields 'c: '
    await expect(ui.paragraphs().nth(3)).toHaveText('c: ');
    // both empty yields ': '
    await expect(ui.paragraphs().nth(4)).toHaveText(': ');

    // Final check: no uncaught JS errors during this sequence
    expect(pageErrors.length).toBe(0);
    expect(consoleMessages.filter(m => m.type === 'error').length).toBe(0);
  });
});