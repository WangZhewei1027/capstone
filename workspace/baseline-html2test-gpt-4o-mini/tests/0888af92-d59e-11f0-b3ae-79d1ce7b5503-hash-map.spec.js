import { test, expect } from '@playwright/test';

// Page Object for the Hash Map page to encapsulate common interactions
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#key');
    this.valueInput = page.locator('#value');
    this.addButton = page.locator('#addButton');
    this.getButton = page.locator('#getButton');
    this.removeButton = page.locator('#removeButton');
    this.output = page.locator('#output');
  }

  // Navigate to the page URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888af92-d59e-11f0-b3ae-79d1ce7b5503.html', { waitUntil: 'domcontentloaded' });
  }

  // Fill key input
  async fillKey(key) {
    await this.keyInput.fill('');
    if (key !== '') {
      await this.keyInput.fill(key);
    }
  }

  // Fill value input
  async fillValue(value) {
    await this.valueInput.fill('');
    if (value !== '') {
      await this.valueInput.fill(value);
    }
  }

  // Click Add
  async clickAdd() {
    await this.addButton.click();
  }

  // Click Get
  async clickGet() {
    await this.getButton.click();
  }

  // Click Remove
  async clickRemove() {
    await this.removeButton.click();
  }

  // Read output text
  async outputText() {
    return (await this.output.textContent()) || '';
  }

  // Read internal HashMap display via global variable (if present)
  async internalMapDisplay() {
    return await this.page.evaluate(() => {
      // Return string if hashMap exists, otherwise undefined
      try {
        if (window.hashMap && typeof window.hashMap.display === 'function') {
          return window.hashMap.display();
        }
        return undefined;
      } catch (e) {
        return `__EVAL_ERROR__${e && e.message ? ': ' + e.message : ''}`;
      }
    });
  }
}

test.describe('Hash Map Demonstration - Functional tests', () => {
  // Each test will capture console errors and page errors and assert none occurred
  test.beforeEach(async ({ page }) => {
    // No-op here; navigation is handled in individual tests via the page object
  });

  // Test initial page load and default state of the UI
  test('Initial page load shows expected elements and default state', async ({ page }) => {
    // Capture console and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app = new HashMapPage(page);
    // Navigate to the app
    await app.goto();

    // Verify page title and header
    await expect(page).toHaveTitle(/Hash Map Demonstration/);
    await expect(page.locator('h1')).toHaveText('Hash Map Demonstration');

    // Verify inputs and buttons are visible and have correct placeholders / text
    await expect(app.keyInput).toBeVisible();
    await expect(app.valueInput).toBeVisible();
    await expect(app.keyInput).toHaveAttribute('placeholder', 'Enter Key');
    await expect(app.valueInput).toHaveAttribute('placeholder', 'Enter Value');

    await expect(app.addButton).toBeVisible();
    await expect(app.addButton).toHaveText('Add to Hash Map');
    await expect(app.getButton).toBeVisible();
    await expect(app.getButton).toHaveText('Get Value');
    await expect(app.removeButton).toBeVisible();
    await expect(app.removeButton).toHaveText('Remove Key');

    // Output area should be visible and empty by default
    await expect(app.output).toBeVisible();
    await expect(app.output).toHaveText('');

    // Verify that no console errors or page errors were emitted during initial load
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test adding a key-value pair and verifying visual feedback and internal state
  test('Adding a key-value pair updates output and internal map', async ({ page }) => {
    const consoleErrors1 = [];
    const pageErrors1 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app1 = new HashMapPage(page);
    await app.goto();

    // Add a key-value pair
    await app.fillKey('name');
    await app.fillValue('Alice');
    await app.clickAdd();

    // Output should show the added entry
    await expect(app.output).toHaveText('Added: {name: Alice}');

    // Using the UI Get button should retrieve the same value
    await app.fillKey('name'); // re-fill to ensure the key input still holds the key
    await app.clickGet();
    await expect(app.output).toHaveText('Value for name: Alice');

    // Validate internal HashMap state via the exposed global object
    const internal = await app.internalMapDisplay();
    expect(internal).toContain('"name": "Alice"');

    // Ensure no console or page errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test retrieving a non-existent key displays a not-found message
  test('Getting a non-existent key shows not found message', async ({ page }) => {
    const consoleErrors2 = [];
    const pageErrors2 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app2 = new HashMapPage(page);
    await app.goto();

    // Ensure the key is something that hasn't been added
    await app.fillKey('doesNotExist');
    await app.clickGet();

    // Should show not found message
    await expect(app.output).toHaveText('Key "doesNotExist" not found.');

    // Ensure no console or page errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test removing a key and verifying it no longer exists
  test('Removing a key deletes it from map and changes output accordingly', async ({ page }) => {
    const consoleErrors3 = [];
    const pageErrors3 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app3 = new HashMapPage(page);
    await app.goto();

    // Add, then remove, then attempt to get
    await app.fillKey('token');
    await app.fillValue('abc123');
    await app.clickAdd();
    await expect(app.output).toHaveText('Added: {token: abc123}');

    // Remove key
    await app.fillKey('token');
    await app.clickRemove();
    await expect(app.output).toHaveText('Removed key: token');

    // Attempt to get should indicate not found
    await app.fillKey('token');
    await app.clickGet();
    await expect(app.output).toHaveText('Key "token" not found.');

    // Internal map should not contain the key anymore
    const internal1 = await app.internalMapDisplay();
    expect(internal).not.toContain('"token"');

    // Ensure no console or page errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Test overwriting a key: adding same key twice updates value
  test('Adding duplicate key overwrites previous value', async ({ page }) => {
    const consoleErrors4 = [];
    const pageErrors4 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app4 = new HashMapPage(page);
    await app.goto();

    // Add initial value
    await app.fillKey('status');
    await app.fillValue('pending');
    await app.clickAdd();
    await expect(app.output).toHaveText('Added: {status: pending}');

    // Add again with new value
    await app.fillKey('status');
    await app.fillValue('completed');
    await app.clickAdd();
    await expect(app.output).toHaveText('Added: {status: completed}');

    // Get should return the latest value
    await app.fillKey('status');
    await app.clickGet();
    await expect(app.output).toHaveText('Value for status: completed');

    // Internal map should reflect the new value
    const internal2 = await app.internalMapDisplay();
    expect(internal).toContain('"status": "completed"');

    // Ensure no console or page errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Edge case tests: empty keys and values
  test('Edge cases: empty key and empty value handling', async ({ page }) => {
    const consoleErrors5 = [];
    const pageErrors5 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app5 = new HashMapPage(page);
    await app.goto();

    // Add an empty key with empty value
    await app.fillKey('');
    await app.fillValue('');
    await app.clickAdd();

    // Output should reflect an addition, even if key/value empty (implementation simply interpolates)
    const out = await app.outputText();
    expect(out.includes('Added:'), 'Expected output to indicate an addition').toBeTruthy();

    // Internally, the HashMap uses string keys; empty string is a valid property name — check internal representation
    const internal3 = await app.internalMapDisplay();
    // internal might include "" key; JSON.stringify will show "" as an empty string key
    // So we assert that internal is a valid JSON string (not undefined) and contains braces
    expect(typeof internal === 'string' && internal.trim().startsWith('{') && internal.trim().endsWith('}')).toBeTruthy();

    // Now try getting the empty key via UI (filling nothing into key input)
    await app.fillKey('');
    await app.clickGet();
    // If empty string key exists, it should retrieve value (which is empty string) -> output will be 'Value for : ' because key is empty
    const getOut = await app.outputText();
    // Accept either not found or Value for : (depending on internal handling) — but ensure the app responded
    expect(getOut.length > 0).toBeTruthy();

    // Ensure no console or page errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  // Accessibility and visibility checks: buttons should be actionable and inputs labeled by placeholders
  test('Accessibility and visibility: controls are accessible and actionable', async ({ page }) => {
    const consoleErrors6 = [];
    const pageErrors6 = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const app6 = new HashMapPage(page);
    await app.goto();

    // Ensure buttons are enabled and can be clicked (enabled by default)
    await expect(app.addButton).toBeEnabled();
    await expect(app.getButton).toBeEnabled();
    await expect(app.removeButton).toBeEnabled();

    // Tab through inputs and buttons to ensure they are focusable (basic keyboard accessibility)
    await app.keyInput.focus();
    await page.keyboard.press('Tab');
    await expect(app.valueInput).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(app.addButton).toBeFocused();

    // Ensure placeholders provide guidance (used as primitive accessible labels here)
    await expect(app.keyInput).toHaveAttribute('placeholder', 'Enter Key');

    // Ensure no console or page errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });
});