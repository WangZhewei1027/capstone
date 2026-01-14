import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f76670b1-d5b8-11f0-9ee1-ef07bdc6053d.html';

/**
 * Page Object representing the Hash Map Demonstration page.
 * Encapsulates interactions (fill inputs, click buttons, read output).
 */
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = () => this.page.locator('#key');
    this.valueInput = () => this.page.locator('#value');
    this.addButton = () => this.page.locator("button[onclick='addItem()']");
    this.removeButton = () => this.page.locator("button[onclick='removeItem()']");
    this.displayButton = () => this.page.locator("button[onclick='displayHashMap()']");
    this.output = () => this.page.locator('#output');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Read the visible output text
  async readOutputText() {
    return await this.output().innerText();
  }

  // Fill key and value fields
  async fillKeyValue(key, value) {
    await this.keyInput().fill(key ?? '');
    await this.valueInput().fill(value ?? '');
  }

  // Click Add and capture the alert message (if any)
  async clickAddAndGetDialogMessage() {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.addButton().click();
    const dialog = await dialogPromise;
    const msg = dialog.message();
    await dialog.accept();
    return msg;
  }

  // Click Remove and capture the alert message (if any)
  async clickRemoveAndGetDialogMessage() {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.removeButton().click();
    const dialog = await dialogPromise;
    const msg = dialog.message();
    await dialog.accept();
    return msg;
  }

  // Click Display and wait for output to update
  async clickDisplay() {
    await this.displayButton().click();
    // small wait to allow DOM update
    await this.page.waitForTimeout(50);
  }
}

test.describe('Hash Map Demonstration - FSM based E2E tests', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages and page errors
    page.on('console', (msg) => {
      // store objects with type and text for assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    const app = new HashMapPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    // No additional teardown required; Playwright handles closing contexts
  });

  test.describe('Initial state and UI rendering (S0_Idle)', () => {
    test('should render inputs, buttons and output div on load', async ({ page }) => {
      // Validate that all main components exist (entry action renderPage() expected)
      const app = new HashMapPage(page);

      await expect(app.keyInput()).toBeVisible();
      await expect(app.valueInput()).toBeVisible();
      await expect(app.addButton()).toBeVisible();
      await expect(app.removeButton()).toBeVisible();
      await expect(app.displayButton()).toBeVisible();
      await expect(app.output()).toBeVisible();

      // Output should be empty initially
      const outputText = await app.readOutputText();
      expect(outputText.trim()).toBe('');

      // Observe that there are no uncaught page errors on initial load
      // (We capture page errors in the beforeEach listener)
      // This asserts that loading the page did not throw runtime errors.
      // If there are runtime errors (ReferenceError, TypeError, etc.), the test will fail here.
      // NOTE: This follows the requirement to observe page errors without patching the app.
      expect(pageErrors.length).toBe(0);

      // Also ensure no console errors were emitted during load
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
    });
  });

  test.describe('Add item transition (S0_Idle -> S1_ItemAdded)', () => {
    test('should add an item when both key and value are provided and show alert', async ({ page }) => {
      const app = new HashMapPage(page);

      // Fill inputs with a key-value pair
      await app.fillKeyValue('fruit', 'apple');

      // Click Add and capture alert message (verifies S1_ItemAdded evidence: alert)
      const addMsg = await app.clickAddAndGetDialogMessage();
      expect(addMsg).toBe('Added: fruit -> apple');

      // After adding, inputs should be cleared by the app
      await expect(app.keyInput()).toHaveValue('');
      await expect(app.valueInput()).toHaveValue('');

      // Display the map and assert the output contains the newly added pair
      await app.clickDisplay();
      const outputText = await app.readOutputText();
      expect(outputText).toContain('Current Hash Map:');
      expect(outputText).toContain('"fruit": "apple"');

      // Validate no uncaught errors occurred during the add flow
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('should show error alert when trying to add with missing key or missing value (edge cases)', async ({ page }) => {
      const app = new HashMapPage(page);

      // Case 1: Missing key
      await app.fillKeyValue('', 'onlyValue');
      const msg1 = await app.clickAddAndGetDialogMessage();
      expect(msg1).toBe('Please enter both key and value.');

      // Case 2: Missing value
      await app.fillKeyValue('onlyKey', '');
      const msg2 = await app.clickAddAndGetDialogMessage();
      expect(msg2).toBe('Please enter both key and value.');

      // Case 3: Both missing
      await app.fillKeyValue('', '');
      const msg3 = await app.clickAddAndGetDialogMessage();
      expect(msg3).toBe('Please enter both key and value.');

      // Ensure no runtime page errors were emitted during these interactions
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Remove item transition (S0_Idle -> S2_ItemRemoved)', () => {
    test('should remove an existing item and show alert, and reflect removal on display', async ({ page }) => {
      const app = new HashMapPage(page);

      // Setup: add an item to remove
      await app.fillKeyValue('color', 'blue');
      const addMsg = await app.clickAddAndGetDialogMessage();
      expect(addMsg).toBe('Added: color -> blue');

      // Verify it's present
      await app.clickDisplay();
      let outputText = await app.readOutputText();
      expect(outputText).toContain('"color": "blue"');

      // Now set key and remove
      await app.fillKeyValue('color', ''); // only key necessary for remove
      const removeMsg = await app.clickRemoveAndGetDialogMessage();
      expect(removeMsg).toBe('Removed: color');

      // After removal, display should no longer contain the key
      await app.clickDisplay();
      outputText = await app.readOutputText();
      // The map should be empty or not contain the removed key
      expect(outputText).toContain('Current Hash Map:');
      expect(outputText).not.toContain('"color": "blue"');

      // Ensure no runtime page errors and no console errors
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('should show error alert when trying to remove without providing a key (edge case)', async ({ page }) => {
      const app = new HashMapPage(page);

      // Ensure key field is empty
      await app.fillKeyValue('', '');

      // Click remove -> expect alert asking to enter a key
      const removeMsg = await app.clickRemoveAndGetDialogMessage();
      expect(removeMsg).toBe('Please enter a key to remove.');

      // No change to output
      await app.clickDisplay();
      const outputText = await app.readOutputText();
      expect(outputText).toContain('Current Hash Map:');

      // Ensure no runtime page errors
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    test('removing a non-existent key still shows removed alert (implementation detail)', async ({ page }) => {
      const app = new HashMapPage(page);

      // Attempt to remove key that was never added
      await app.fillKeyValue('nonexistent', '');
      const removeMsg = await app.clickRemoveAndGetDialogMessage();
      // Implementation removes regardless of existence and alerts Removed: key
      expect(removeMsg).toBe('Removed: nonexistent');

      // Display should not show that key
      await app.clickDisplay();
      const outputText = await app.readOutputText();
      expect(outputText).not.toContain('"nonexistent":');

      // Ensure no runtime page errors
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Display transition (S0_Idle -> S3_HashMapDisplayed)', () => {
    test('should display the current hash map contents in the output div', async ({ page }) => {
      const app = new HashMapPage(page);

      // Start with empty map: display should show {}
      await app.clickDisplay();
      let outputText = await app.readOutputText();
      expect(outputText).toContain('Current Hash Map:');
      // empty object representation
      expect(outputText).toContain('{}');

      // Add two items then display and verify both are present
      await app.fillKeyValue('a', '1');
      const m1 = await app.clickAddAndGetDialogMessage();
      expect(m1).toBe('Added: a -> 1');

      await app.fillKeyValue('b', '2');
      const m2 = await app.clickAddAndGetDialogMessage();
      expect(m2).toBe('Added: b -> 2');

      await app.clickDisplay();
      outputText = await app.readOutputText();
      expect(outputText).toContain('"a": "1"');
      expect(outputText).toContain('"b": "2"');

      // Ensure no runtime errors occurred
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Integration scenarios covering FSM transitions sequence', () => {
    test('Add -> Display -> Remove -> Display sequence transitions through S1, S3, S2, S3', async ({ page }) => {
      const app = new HashMapPage(page);

      // Add an item
      await app.fillKeyValue('kiwi', 'green');
      const addMsg = await app.clickAddAndGetDialogMessage();
      expect(addMsg).toBe('Added: kiwi -> green');

      // Display (S3)
      await app.clickDisplay();
      let outputText = await app.readOutputText();
      expect(outputText).toContain('"kiwi": "green"');

      // Remove (S2)
      await app.fillKeyValue('kiwi', '');
      const removeMsg = await app.clickRemoveAndGetDialogMessage();
      expect(removeMsg).toBe('Removed: kiwi');

      // Display again (S3)
      await app.clickDisplay();
      outputText = await app.readOutputText();
      expect(outputText).not.toContain('"kiwi": "green"');
      expect(outputText).toContain('Current Hash Map:');

      // Ensure no runtime errors surfaced during the full sequence
      const consoleErrorMessages = consoleMessages.filter((m) => m.type === 'error');
      expect(consoleErrorMessages.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });
  });
});