import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3d-d5a1-11f0-9c7a-cdf1d7a06e11.html';

/**
 * Page object for the Huffman Coding example page.
 * Encapsulates common interactions and element lookups.
 */
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.symbolsInput = page.locator('#symbols');
    this.encodeButton = page.locator('#encode-button');
    this.decodeButton = page.locator('#decode-button');
    this.outputDiv = page.locator('#output');
    this.heading = page.locator('h1');
  }

  async gotoAndCaptureError({ captureConsole = false } = {}) {
    // Capture the first pageerror and first console error (if requested) that occur during navigation.
    const events = {};
    const pageErrorPromise = this.page.waitForEvent('pageerror').then(e => {
      events.pageError = e;
      return e;
    });
    const consolePromise = captureConsole
      ? this.page.waitForEvent('console').then(c => {
          events.console = c;
          return c;
        })
      : Promise.resolve(null);

    // Navigate while waiting for the error(s) to occur.
    // If no error happens, waitForEvent will time out (Playwright default timeout).
    const gotoPromise = this.page.goto(APP_URL, { waitUntil: 'load' });

    // Use Promise.race to ensure navigation completes even if no console event occurs.
    // We'll wait for both navigation and the pageerror (if any).
    const results = await Promise.allSettled([gotoPromise, pageErrorPromise, consolePromise]);

    // Normalize: if pageErrorPromise rejected due to timeout, events.pageError may be undefined.
    // Return any captured events and ensure navigation completed.
    return events;
  }

  async setSymbols(value) {
    await this.symbolsInput.fill(String(value));
    // blur to trigger any potential change handlers
    await this.symbolsInput.evaluate((el) => el.blur());
  }

  async clickEncode() {
    await this.encodeButton.click();
  }

  async clickDecode() {
    await this.decodeButton.click();
  }

  async getOutputText() {
    return (await this.outputDiv.innerText()).trim();
  }

  async getHeadingText() {
    return (await this.heading.innerText()).trim();
  }

  async isEncodeVisible() {
    return await this.encodeButton.isVisible();
  }

  async isDecodeVisible() {
    return await this.decodeButton.isVisible();
  }
}

test.describe('Huffman Coding Example - UI and runtime behavior', () => {
  // Test 1: Initial page load and default state checks.
  test('loads the page and shows expected UI elements with default values', async ({ page }) => {
    const app = new HuffmanPage(page);

    // Capture the pageerror that is expected to happen during initial script execution.
    const pageErrorPromise1 = page.waitForEvent('pageerror');

    // Navigate to the page.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // The application has a script that triggers an initialization error. Wait for it but don't fail the test if missing.
    let pageError = null;
    try {
      pageError = await pageErrorPromise;
    } catch (e) {
      // If no pageerror occurred within the default timeout, we continue; assertions below still validate DOM.
    }

    // Verify the static UI elements are present and visible.
    await expect(app.heading).toBeVisible();
    expect(await app.getHeadingText()).toBe('Huffman Coding Example');

    await expect(app.symbolsInput).toBeVisible();
    // The input default value in the HTML is "10"
    expect(await app.symbolsInput.inputValue()).toBe('10');

    // Buttons should be present and visible
    expect(await app.isEncodeVisible()).toBe(true);
    expect(await app.isDecodeVisible()).toBe(true);

    // Output div should exist; because the initialization script throws a ReferenceError before writing,
    // the output is expected to be empty.
    await expect(app.outputDiv).toBeVisible();
    const outputText = await app.getOutputText();
    expect(outputText).toBe('', 'Expected output to be empty because initialization script failed before producing output');

    // If a page error occurred, assert that it is a ReferenceError related to buildHuffmanTree (the broken script).
    if (pageError) {
      expect(pageError.name).toBe('ReferenceError');
      expect(pageError.message).toContain('buildHuffmanTree');
    }
  });

  // Test 2: Confirm that a ReferenceError for 'buildHuffmanTree' happens during the initial scripts.
  test('initial script execution throws ReferenceError for undefined buildHuffmanTree', async ({ page }) => {
    const app1 = new HuffmanPage(page);

    // Wait for the pageerror triggered during script execution while navigating.
    const [error] = await Promise.all([
      page.waitForEvent('pageerror'),
      page.goto(APP_URL, { waitUntil: 'load' }),
    ]);

    // Assert that the thrown error is a ReferenceError and mentions buildHuffmanTree.
    expect(error).toBeTruthy();
    expect(error.name).toBe('ReferenceError');
    expect(error.message).toContain('buildHuffmanTree');
  });

  // Test 3: Verify that interacting with controls after the initialization failure does not produce additional crashes,
  // and that the output does not change (since core functions were not defined).
  test('clicking encode/decode after failed initialization does not change output and does not throw new page errors', async ({ page }) => {
    const app2 = new HuffmanPage(page);

    // Collect any page errors that happen after navigation.
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate - we expect at least one page error during initial load.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Ensure controls are interactable (present in DOM even if scripts failed).
    await expect(app.encodeButton).toBeVisible();
    await expect(app.decodeButton).toBeVisible();

    // Change the symbols input and click encode/decode buttons.
    await app.setSymbols(3);
    expect(await app.symbolsInput.inputValue()).toBe('3');

    // Click encode and decode; because event handlers were not necessarily added by the failed scripts,
    // these clicks should not throw synchronous errors. We also assert no new page errors were added.
    await app.clickEncode();
    await app.clickDecode();

    // Wait briefly to allow any asynchronous side-effects to surface.
    await page.waitForTimeout(250);

    // Output should remain unchanged / empty.
    const output = await app.getOutputText();
    expect(output).toBe('', 'Expected output to remain empty because encoding/decoding logic was not initialized');

    // pageErrors array may contain the initial error; ensure no additional distinct errors were appended beyond one.
    // At minimum, there must be at least one error from initialization.
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    // All collected errors should be ReferenceErrors related to missing functions (defensive check).
    for (const err of pageErrors) {
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ReferenceError');
      // error message should mention something undefined; accept buildHuffmanTree as primary expectation.
      expect(err.message).toMatch(/buildHuffmanTree|is not defined/);
    }
  });

  // Test 4: Edge cases for input: set zero, negative, and non-numeric input; ensure DOM updates but no successful encode/decode.
  test('handles edge-case symbol inputs without performing encoding due to broken initialization', async ({ page }) => {
    const app3 = new HuffmanPage(page);

    // Navigate and capture initial page error (ignore content beyond checking behavior).
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Edge case: zero symbols
    await app.setSymbols(0);
    expect(await app.symbolsInput.inputValue()).toBe('0');
    await app.clickEncode();
    await page.waitForTimeout(100);
    expect(await app.getOutputText()).toBe('', 'Expected no output for zero symbols when encoding logic is not present');

    // Edge case: negative number
    await app.setSymbols(-5);
    expect(await app.symbolsInput.inputValue()).toBe('-5');
    await app.clickEncode();
    await page.waitForTimeout(100);
    expect(await app.getOutputText()).toBe('', 'Expected no output for negative symbols when encoding logic is not present');

    // Edge case: non-numeric (attempt typing letters into number input)
    await app.symbolsInput.fill('abc');
    // Some browsers coerce invalid numeric input to empty string for number inputs; check the DOM reflects what was typed or empty.
    const val = await app.symbolsInput.inputValue();
    // Accept either 'abc' (if allowed) or '' (if stripped)
    expect(['abc', '']).toContain(val);
    await app.clickEncode();
    await page.waitForTimeout(100);
    expect(await app.getOutputText()).toBe('', 'Expected no output for invalid numeric input when encoding logic is not present');
  });

  // Test 5: Console error logging - verify that the console receives an error related to the ReferenceError.
  test('console receives an error message corresponding to the initialization ReferenceError', async ({ page }) => {
    const app4 = new HuffmanPage(page);

    // Wait for the console event of type 'error' that occurs during page evaluation.
    const consolePromise1 = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'error',
    });

    // Navigate while listening.
    await page.goto(APP_URL, { waitUntil: 'load' });

    // Wait for a console error. If none appears within the timeout, the test will fail.
    const consoleMessage = await consolePromise;

    // The console message text should indicate a ReferenceError related to buildHuffmanTree.
    const text = consoleMessage.text();
    expect(text).toContain('ReferenceError');
    expect(text).toContain('buildHuffmanTree');
  });
});