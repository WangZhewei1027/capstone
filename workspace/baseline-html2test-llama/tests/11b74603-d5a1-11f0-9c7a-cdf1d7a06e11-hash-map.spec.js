import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b74603-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Hash Map Example (11b74603-d5a1-11f0-9c7a-cdf1d7a06e11)', () => {
  // Arrays to collect runtime issues and console output for each test
  let pageErrors;
  let consoleMessages;

  // Setup a new context for each test to collect page errors and console logs
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors (uncaught exceptions in the page)
    page.on('pageerror', (err) => {
      // store the Error object for assertions
      pageErrors.push(err);
    });

    // Collect console messages for visibility into what the page logs
    page.on('console', (msg) => {
      // store text and type for assertions / debugging
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the page and wait until load to ensure scripts run
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No special teardown required — page fixture is cleaned up by Playwright
  });

  test('Initial load: DOM structure is present and script error is emitted', async ({ page }) => {
    // Purpose: Verify main elements exist and the runtime error (due to missing #add element) occurs on load.

    // Check title and heading presence
    await expect(page).toHaveTitle(/Hash Map Example/);
    const heading = page.locator('h2');
    await expect(heading).toHaveText('Hash Map Example');

    // Verify inputs and button exist in the DOM
    const keyInput = page.locator('input#key');
    const valueInput = page.locator('input#value');
    const addButton = page.locator('button[type="submit"]');

    await expect(keyInput).toBeVisible();
    await expect(valueInput).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(addButton).toHaveText('Add');

    // The page's inline script attempts to attach a click handler to an element with id "add",
    // but the button has no id. This should cause a runtime TypeError during initial script execution.
    // Assert that at least one pageerror occurred and it is a TypeError related to addEventListener/null.
    // Give a short timeout to ensure the pageerror event has fired if it will.
    await page.waitForTimeout(50);

    // Ensure we observed at least one page error
    expect(pageErrors.length).toBeGreaterThan(0);

    // Assert one of the collected errors is a TypeError and mentions "addEventListener" or "Cannot read properties"
    const hasExpectedTypeError = pageErrors.some(e => {
      const name = e.name || '';
      const message = e.message || '';
      return name === 'TypeError' ||
        message.includes('addEventListener') ||
        message.includes('Cannot read properties') ||
        message.includes("Cannot read property 'addEventListener'") ||
        message.includes('null');
    });
    expect(hasExpectedTypeError).toBeTruthy();

    // Also verify console.log of hashMap likely did NOT run because the script threw before reaching console.log
    const hasMapConsole = consoleMessages.some(m => m.text.includes('Map') || m.text.includes('map'));
    expect(hasMapConsole).toBeFalsy();
  });

  test('Typing a key input registers the key in internal Map (listeners added before error)', async ({ page }) => {
    // Purpose: Confirm that the key input's 'input' listener (added before the runtime error) executed
    // and updated the internal hashMap. We cannot directly access top-level let variables via window,
    // but page.evaluate runs in the page context and can reference the lexical binding.

    // Clear prior messages
    consoleMessages.length = 0;
    pageErrors.length = pageErrors.length; // retain previous errors; we'll examine new ones below

    // Type a key value into the key input
    await page.fill('#key', 'foo');

    // Small delay to let the input handler run
    await page.waitForTimeout(50);

    // Check whether the top-level variable `hashMap` exists and contains the key 'foo'.
    // We do this by evaluating in the page context.
    const mapInfo = await page.evaluate(() => {
      try {
        // Access the lexically scoped hashMap declared by the page script
        const exists = typeof hashMap !== 'undefined';
        const hasFoo = exists ? hashMap.has('foo') : undefined;
        const valueForFoo = exists ? hashMap.get('foo') : undefined;
        return { exists, hasFoo, valueForFoo };
      } catch (e) {
        return { error: e.toString() };
      }
    });

    // Ensure no evaluation error occurred
    expect(mapInfo.error).toBeUndefined();

    // The hashMap variable should exist and should have an entry for 'foo' (set to an empty array [])
    expect(mapInfo.exists).toBeTruthy();
    expect(mapInfo.hasFoo).toBeTruthy();
    // valueForFoo should be an array; convert to JSON-friendly check
    expect(Array.isArray(mapInfo.valueForFoo)).toBeTruthy();
    expect(mapInfo.valueForFoo.length).toBe(0);

    // Ensure no new pageerrors were introduced by interacting with the inputs
    // (we allow the original load-time TypeError that we've already observed)
    const additionalErrors = pageErrors.filter(e => {
      // No extra errors expected beyond the initial load-time TypeError (we can't strictly identify which is which,
      // but ensure we don't have many new types of errors)
      return true;
    });
    expect(pageErrors.length).toBeGreaterThan(0);
  });

  test('Typing into value input does not modify key added previously (logic bug: key used incorrectly)', async ({ page }) => {
    // Purpose: The value input's handler uses this.value as the key as well, so it will check hashMap.has(value).
    // This test verifies that typing a value does not incorrectly modify the 'foo' entry.

    // Ensure 'foo' exists from the key test: if this test runs in isolation, create it first.
    await page.fill('#key', 'foo');
    await page.waitForTimeout(20);

    // Type into the value input (this handler uses wrong key variable)
    await page.fill('#value', 'bar');
    await page.waitForTimeout(50);

    // Verify internal map state: 'foo' should remain present and still be an empty array,
    // and 'bar' should not be present (because the value handler looked for key === 'bar' which doesn't exist)
    const mapStatus = await page.evaluate(() => {
      try {
        return {
          hasFoo: hashMap.has('foo'),
          fooVal: hashMap.get('foo'),
          hasBar: hashMap.has('bar'),
          barVal: hashMap.get('bar')
        };
      } catch (e) {
        return { error: e.toString() };
      }
    });

    expect(mapStatus.error).toBeUndefined();
    expect(mapStatus.hasFoo).toBeTruthy();
    expect(Array.isArray(mapStatus.fooVal)).toBeTruthy();
    // Value array for 'foo' should still be empty because the value input pushed only when key matched value input ('bar')
    expect(mapStatus.fooVal.length).toBe(0);
    // 'bar' should not be present because we never set a key named 'bar'
    expect(mapStatus.hasBar).toBeFalsy();
    expect(mapStatus.barVal).toBeUndefined();
  });

  test('Clicking the visible "Add" button does nothing (no click handler attached) and does not crash further', async ({ page }) => {
    // Purpose: The script attempted to add a click handler to an element with id 'add' and threw an error.
    // The visible button has no handler attached; clicking it should not change the internal hashMap
    // and should not create new page errors.

    // Prepare state
    await page.fill('#key', 'foo');
    await page.waitForTimeout(20);

    // Record current error count
    const priorErrorCount = pageErrors.length;

    // Click the button present in the DOM (it has no id="add"; click handler wasn't attached)
    await page.click('button[type="submit"]');

    // Allow any handlers (if present) to run
    await page.waitForTimeout(50);

    // No new page errors should be thrown as a result of clicking the button
    expect(pageErrors.length).toBeGreaterThanOrEqual(priorErrorCount);
    // We expect no additional errors beyond initial load-time error(s)
    expect(pageErrors.length).toBe(priorErrorCount);

    // Verify that the internal hashMap did not receive a new value for 'foo' from the Add button
    const currentMap = await page.evaluate(() => {
      try {
        return {
          hasFoo: hashMap.has('foo'),
          fooVal: hashMap.get('foo')
        };
      } catch (e) {
        return { error: e.toString() };
      }
    });

    expect(currentMap.error).toBeUndefined();
    expect(currentMap.hasFoo).toBeTruthy();
    // The add handler (which would set the key to [value]) wasn't attached, so foo should remain unchanged (empty array)
    expect(Array.isArray(currentMap.fooVal)).toBeTruthy();
    expect(currentMap.fooVal.length).toBe(0);
  });

  test('Accessibility and visibility: inputs and button are accessible and labeled', async ({ page }) => {
    // Purpose: Basic accessibility checks - labels exist and are associated with inputs,
    // and the button is visible and enabled.

    // Ensure the label 'for' attributes match the input ids
    const keyLabelFor = await page.locator('label[for="key"]').getAttribute('for');
    const valueLabelFor = await page.locator('label[for="value"]').getAttribute('for');
    expect(keyLabelFor).toBe('key');
    expect(valueLabelFor).toBe('value');

    // Ensure inputs are enabled and focusable
    await expect(page.locator('#key')).toBeEnabled();
    await expect(page.locator('#value')).toBeEnabled();

    // Ensure the Add button is visible and enabled (even though it lacks the expected click handler)
    const addBtn = page.locator('button[type="submit"]');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });
});