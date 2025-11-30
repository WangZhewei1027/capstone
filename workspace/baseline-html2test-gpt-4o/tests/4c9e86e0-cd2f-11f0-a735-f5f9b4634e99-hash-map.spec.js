import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e86e0-cd2f-11f0-a735-f5f9b4634e99.html';

/**
 * Page object for the Hash Map page.
 * Encapsulates DOM queries and common interactions with the page.
 */
class HashMapPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns the page heading text
  async getHeadingText() {
    return this.page.textContent('h1');
  }

  // Returns the subheading text inside the hash map display
  async getHashMapHeadingText() {
    return this.page.textContent('#hashMapDisplay h2');
  }

  // Returns number of displayed key-value divs
  async getDisplayedEntriesCount() {
    return this.page.locator('#hashMapDisplay .key-value').count();
  }

  // Returns an array of the text contents of displayed key-value divs
  async getDisplayedEntriesText() {
    const locator = this.page.locator('#hashMapDisplay .key-value');
    const count = await locator.count();
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push((await locator.nth(i).textContent()) || '');
    }
    return results;
  }

  // Calls the global myHashMap.put and myHashMap.displayHashMap in the page context
  async addEntryViaApi(key, value) {
    // Call put and then refresh display
    await this.page.evaluate(
      ({ key, value }) => {
        // Use the page-provided myHashMap instance
        // This intentionally does not patch anything; it calls existing globals.
        if (window.myHashMap && typeof window.myHashMap.put === 'function') {
          window.myHashMap.put(key, value);
          if (typeof window.myHashMap.displayHashMap === 'function') {
            window.myHashMap.displayHashMap();
          }
        } else {
          // If the global is missing, do nothing; tests will capture the result
        }
      },
      { key, value }
    );
  }

  // Calls the global myHashMap.get and returns the result
  async getValueViaApi(key) {
    return this.page.evaluate((k) => {
      if (window.myHashMap && typeof window.myHashMap.get === 'function') {
        return window.myHashMap.get(k);
      }
      return undefined;
    }, key);
  }

  // Calls the global myHashMap.hash and returns the numeric hash
  async getHashForKey(key) {
    return this.page.evaluate((k) => {
      if (window.myHashMap && typeof window.myHashMap.hash === 'function') {
        return window.myHashMap.hash(k);
      }
      return null;
    }, key);
  }

  // Returns count of interactive elements (inputs, buttons, selects, forms, textareas)
  async countInteractiveElements() {
    return this.page.evaluate(() => {
      return document.querySelectorAll('input, button, select, form, textarea').length;
    });
  }
}

test.describe('Hash Map Application - full behavior and DOM checks', () => {
  // Standard navigation before each test to ensure a fresh page load, unless the test
  // needs to attach listeners before navigation (those tests will navigate themselves).
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('Initial page load displays heading and hash map container', async ({ page }) => {
    // Purpose: Verify the main headings and container exist on load
    const hp = new HashMapPage(page);
    const heading = await hp.getHeadingText();
    expect(heading).toBeTruthy();
    expect(heading.trim()).toContain('Simple Hash Map');

    const subheading = await hp.getHashMapHeadingText();
    expect(subheading).toBe('Hash Map Contents:');

    // The container should exist
    const container = await page.$('#hashMapDisplay');
    expect(container).not.toBeNull();
  });

  test('Initial contents include three entries with expected values', async ({ page }) => {
    // Purpose: Verify that the script populated three entries and that values are visible
    const hp = new HashMapPage(page);
    const count = await hp.getDisplayedEntriesCount();
    expect(count).toBe(3);

    const texts = await hp.getDisplayedEntriesText();
    // Each entry's text should include "Key Hash: <num>, Value: <value>"
    // We assert presence of the expected values (Alice, 30, Developer)
    const joined = texts.join(' | ');
    expect(joined).toContain('Alice');
    expect(joined).toContain('30');
    expect(joined).toContain('Developer');

    // Ensure each displayed entry includes the "Key Hash" label
    for (const t of texts) {
      expect(t).toMatch(/Key Hash:\s*-?\d+, Value:/);
    }
  });

  test('No interactive form controls exist on the page (expected static demo)', async ({ page }) => {
    // Purpose: Confirm there are no input/button/select/form/textarea elements
    const hp = new HashMapPage(page);
    const interactiveCount = await hp.countInteractiveElements();
    expect(interactiveCount).toBe(0);
  });

  test('Adding an entry through the page API updates the DOM', async ({ page }) => {
    // Purpose: Use the provided global myHashMap API to add an entry and confirm DOM updates
    const hp = new HashMapPage(page);

    // Verify the entry is not present before adding
    const beforeTexts = await hp.getDisplayedEntriesText();
    expect(beforeTexts.join()).not.toContain('NYC');

    // Add new entry and refresh display from page context
    await hp.addEntryViaApi('city', 'NYC');

    // Wait for a small tick to allow DOM changes by the page script
    await page.waitForTimeout(50);

    const afterTexts = await hp.getDisplayedEntriesText();
    expect(afterTexts.join(' | ')).toContain('NYC');

    // Ensure the count increased by 1 (from initial 3 to 4)
    const count = await hp.getDisplayedEntriesCount();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('myHashMap.get returns existing value and undefined for missing key', async ({ page }) => {
    // Purpose: Verify data retrieval behavior via global API
    const hp = new HashMapPage(page);

    const nameValue = await hp.getValueViaApi('name');
    expect(nameValue).toBe('Alice');

    const missingValue = await hp.getValueViaApi('thisKeyDoesNotExist');
    // get should return undefined when key not present
    expect(missingValue).toBeUndefined();
  });

  test('hash function produces a numeric 32-bit integer for a given key', async ({ page }) => {
    // Purpose: Ensure the page-provided hash function runs and returns a numeric hash
    const hp = new HashMapPage(page);
    const hash = await hp.getHashForKey('name');

    expect(typeof hash).toBe('number');
    // It should be an integer within 32-bit signed range
    expect(Number.isInteger(hash)).toBeTruthy();
    expect(hash).toBeGreaterThanOrEqual(-2147483648);
    expect(hash).toBeLessThanOrEqual(2147483647);
  });

  test('Safe behavior: attempting to use myHashMap when it is missing does not throw in tests', async ({ page }) => {
    // Purpose: Verify that the page defines myHashMap; if not defined, tests still handle gracefully.
    // This test simply queries whether the global exists and that calls return expected types.
    const exists = await page.evaluate(() => typeof window.myHashMap !== 'undefined');
    expect(exists).toBeTruthy();
  });

  test('No console errors or uncaught page errors during navigation', async ({ browser }) => {
    // Purpose: Attach listeners before navigation, capture console errors and page errors,
    // navigate to the app, and assert that there are no errors emitted.
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      // Capture only console messages of type 'error'
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      // Capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(err.message);
    });

    // Navigate after listeners attached to capture any runtime load errors
    await page.goto(APP_URL);

    // Wait briefly to allow any asynchronous errors to propagate
    await page.waitForTimeout(100);

    // Close context
    await context.close();

    // Assert that there were no console errors and no page errors.
    // If there are errors, surface them in the assertion messages to aid debugging.
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Edge case: adding an empty-string key and retrieving it works', async ({ page }) => {
    // Purpose: Test an edge case input (empty string key)
    const hp = new HashMapPage(page);

    // Add an entry with empty string key
    await hp.addEntryViaApi('', 'emptyKeyValue');

    // Small wait to let the display update
    await page.waitForTimeout(50);

    // Ensure the new value appears in the DOM
    const texts = await hp.getDisplayedEntriesText();
    expect(texts.join(' | ')).toContain('emptyKeyValue');

    // Ensure get('') returns the stored value
    const val = await hp.getValueViaApi('');
    expect(val).toBe('emptyKeyValue');
  });
});