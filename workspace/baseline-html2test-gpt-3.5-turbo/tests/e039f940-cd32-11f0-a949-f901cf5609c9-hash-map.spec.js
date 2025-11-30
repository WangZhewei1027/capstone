import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039f940-cd32-11f0-a949-f901cf5609c9.html';

// Page Object Model for the Hash Map demo page
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.keyInput = page.locator('#keyInput');
    this.valueInput = page.locator('#valueInput');
    this.insertBtn = page.locator('#insertBtn');
    this.getBtn = page.locator('#getBtn');
    this.removeBtn = page.locator('#removeBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.mapDisplay = page.locator('#mapDisplay');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main UI to be ready
    await expect(this.mapDisplay).toBeVisible();
    await expect(this.insertBtn).toBeVisible();
  }

  async setKey(text) {
    await this.keyInput.fill(text);
  }

  async setValue(text) {
    await this.valueInput.fill(text);
  }

  async clickInsert() {
    await this.insertBtn.click();
  }

  async clickGet() {
    await this.getBtn.click();
  }

  async clickRemove() {
    await this.removeBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async getOutputText() {
    // Trim to normalize whitespace differences
    const txt = (await this.output.textContent()) || '';
    return txt.trim();
  }

  async getMapDisplayText() {
    const txt1 = (await this.mapDisplay.textContent()) || '';
    return txt.trim();
  }
}

test.describe('Hash Map (JavaScript Map) Demo - e039f940-cd32-11f0-a949-f901cf5609c9', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture console error messages
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    pageErrors = [];
    page.on('pageerror', (err) => {
      // err is an Error
      pageErrors.push(err.message);
    });
  });

  test.afterEach(async () => {
    // After each test we assert there were no unexpected console or page errors.
    // This verifies the page did not throw runtime errors during interactions.
    expect(consoleErrors, 'No console error messages should be emitted').toEqual([]);
    expect(pageErrors, 'No unhandled page errors should occur').toEqual([]);
  });

  test('Initial page load shows expected default state and accessible elements', async ({ page }) => {
    // Purpose: Verify initial UI state, accessibility attributes, and default texts.
    const app = new HashMapPage(page);
    await app.goto();

    // Map display should say "Map is empty."
    await expect(app.mapDisplay).toHaveText('Map is empty.');

    // Output region should be empty on load
    await expect(app.output).toHaveText('');

    // Inputs should be present and empty
    await expect(app.keyInput).toHaveValue('');
    await expect(app.valueInput).toHaveValue('');

    // Buttons should be enabled and visible
    await expect(app.insertBtn).toBeEnabled();
    await expect(app.getBtn).toBeEnabled();
    await expect(app.removeBtn).toBeEnabled();
    await expect(app.clearBtn).toBeEnabled();

    // Accessibility: output region should have role "region" and aria-live set
    const role = await page.getAttribute('#output', 'role');
    const ariaLive = await page.getAttribute('#output', 'aria-live');
    expect(role).toBe('region');
    expect(ariaLive).toBe('polite');
  });

  test('Insert a new key/value pair and verify display and output message', async ({ page }) => {
    // Purpose: Ensure inserting a key updates the Map, output, and display area.
    const app1 = new HashMapPage(page);
    await app.goto();

    await app.setKey('foo');
    await app.setValue('bar');
    await app.clickInsert();

    // Output should indicate insertion and use JSON.stringify formatting (quotes around strings)
    await expect(app.output).toHaveText('Key "foo" inserted/updated with value "bar".');

    // Map display should include the key/value pair in the expected JSON string format
    const mapText = await app.getMapDisplayText();
    expect(mapText).toContain('"foo" : "bar"');
  });

  test('Update an existing key and verify the value is updated', async ({ page }) => {
    // Purpose: Insert a key, update it, and ensure the new value replaces the old one.
    const app2 = new HashMapPage(page);
    await app.goto();

    // Insert initial
    await app.setKey('color');
    await app.setValue('red');
    await app.clickInsert();
    await expect(app.output).toHaveText('Key "color" inserted/updated with value "red".');

    // Update value
    await app.setValue('blue');
    await app.clickInsert();
    await expect(app.output).toHaveText('Key "color" inserted/updated with value "blue".');

    // Map display should reflect updated value
    const display = await app.getMapDisplayText();
    expect(display).toContain('"color" : "blue"');
    expect(display).not.toContain('"color" : "red"');
  });

  test('Get value by key: existing and non-existing keys', async ({ page }) => {
    // Purpose: Verify get operation for an existing key and a missing key.
    const app3 = new HashMapPage(page);
    await app.goto();

    // Ensure map has a key
    await app.setKey('animal');
    await app.setValue('dog');
    await app.clickInsert();
    await expect(app.output).toHaveText('Key "animal" inserted/updated with value "dog".');

    // Get existing key
    await app.setKey('animal');
    await app.clickGet();
    await expect(app.output).toHaveText('Value for key "animal" is "dog".');

    // Get non-existing key
    await app.setKey('unknown-key');
    await app.clickGet();
    await expect(app.output).toHaveText('Key "unknown-key" does not exist in the map.');
  });

  test('Remove key: existing removal and attempting to remove non-existent key', async ({ page }) => {
    // Purpose: Test remove behavior for both successful and unsuccessful removals.
    const app4 = new HashMapPage(page);
    await app.goto();

    // Insert then remove
    await app.setKey('temp');
    await app.setValue('value');
    await app.clickInsert();
    await expect(app.output).toHaveText('Key "temp" inserted/updated with value "value".');

    // Remove existing
    await app.setKey('temp');
    await app.clickRemove();
    await expect(app.output).toHaveText('Key "temp" removed from the map.');
    await expect(app.mapDisplay).toHaveText('Map is empty.');

    // Try to remove a key that doesn't exist
    await app.setKey('does-not-exist');
    await app.clickRemove();
    await expect(app.output).toHaveText('Key "does-not-exist" not found to remove.');
  });

  test('Clear map: clearing when non-empty and when already empty', async ({ page }) => {
    // Purpose: Verify clear behavior when map has entries and when it's already empty.
    const app5 = new HashMapPage(page);
    await app.goto();

    // Insert multiple keys
    await app.setKey('a');
    await app.setValue('1');
    await app.clickInsert();
    await expect(app.output).toHaveText('Key "a" inserted/updated with value "1".');

    await app.setKey('b');
    await app.setValue('2');
    await app.clickInsert();
    await expect(app.output).toHaveText('Key "b" inserted/updated with value "2".');

    // Now clear
    await app.clickClear();
    await expect(app.output).toHaveText('Map cleared.');
    await expect(app.mapDisplay).toHaveText('Map is empty.');

    // Clear again when empty
    await app.clickClear();
    await expect(app.output).toHaveText('Map is already empty.');
  });

  test('Edge cases: operations when key input is empty', async ({ page }) => {
    // Purpose: Verify that actions requiring a key produce appropriate error messages when key is empty.
    const app6 = new HashMapPage(page);
    await app.goto();

    // Ensure inputs are empty
    await app.setKey('');
    await app.setValue('some');

    // Insert with empty key
    await app.clickInsert();
    await expect(app.output).toHaveText('Please enter a key to insert or update.');

    // Get with empty key
    await app.clickGet();
    await expect(app.output).toHaveText('Please enter a key to get its value.');

    // Remove with empty key
    await app.clickRemove();
    await expect(app.output).toHaveText('Please enter a key to remove.');
  });

  test('Visual and content checks after multiple operations', async ({ page }) => {
    // Purpose: Run a sequence of operations and verify the mapDisplay accumulates entries in the expected format.
    const app7 = new HashMapPage(page);
    await app.goto();

    // Insert three keys
    await app.setKey('one'); await app.setValue('1'); await app.clickInsert();
    await expect(app.output).toHaveText('Key "one" inserted/updated with value "1".');

    await app.setKey('two'); await app.setValue('2'); await app.clickInsert();
    await expect(app.output).toHaveText('Key "two" inserted/updated with value "2".');

    await app.setKey('three'); await app.setValue('3'); await app.clickInsert();
    await expect(app.output).toHaveText('Key "three" inserted/updated with value "3".');

    // Map display should contain all three lines (order of insertion preserved by Map)
    const display1 = await app.getMapDisplayText();
    expect(display).toContain('"one" : "1"');
    expect(display).toContain('"two" : "2"');
    expect(display).toContain('"three" : "3"');
  });
});