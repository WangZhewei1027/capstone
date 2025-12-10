import { test, expect } from '@playwright/test';

// Playwright tests for Huffman Coding Visualizer
// File: 39b8b191-d1d5-11f0-b49a-6f458b3a25ef-huffman-coding.spec.js
// The tests load the page as-is and observe runtime console/page errors without modifying page code.

// Page object to encapsulate interactions with the Huffman app
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textarea = page.locator('#inputText');
    this.generateButton = page.locator('button', { hasText: 'Generate Huffman Codes' });
    this.resultDiv = page.locator('#result');
  }

  // Fill the input textarea with provided text
  async fillInput(text) {
    await this.textarea.fill(text);
  }

  // Click the Generate button
  async clickGenerate() {
    await this.generateButton.click();
  }

  // Get the result div's visible text content
  async getResultText() {
    // Use textContent to get the raw text as displayed
    return (await this.resultDiv.textContent()) ?? '';
  }

  // Get result as parsed JSON if possible, otherwise return null
  async getResultAsJson() {
    const text = await this.getResultText();
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
}

test.describe('Huffman Coding Visualizer - Application ID 39b8b191-d1d5-11f0-b49a-6f458b3a25ef', () => {
  const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8b191-d1d5-11f0-b49a-6f458b3a25ef.html';

  // Arrays to capture console messages and page errors during each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset capture arrays
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages emitted by the page
    page.on('console', (msg) => {
      // store console message type and text for later assertions or debugging
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions / page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Go to the application page exactly as-is
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test we will not modify the page. We simply leave teardown to Playwright.
    // Tests themselves will assert on consoleMessages and pageErrors as needed.
  });

  test('Initial load shows textarea and empty result area', async ({ page }) => {
    // Purpose: Verify initial page load and default state of interactive elements
    const app = new HuffmanPage(page);

    // Title should contain app heading text
    await expect(page.locator('h1')).toHaveText(/Huffman Coding Visualizer/);

    // Textarea should be visible and empty by default
    await expect(app.textarea).toBeVisible();
    const initialInput = await app.textarea.inputValue();
    expect(initialInput).toBe(''); // default empty

    // Result div should exist and be empty
    await expect(app.resultDiv).toBeVisible();
    const initialResult = await app.getResultText();
    expect(initialResult).toBe(''); // initial empty result

    // No uncaught page errors should have happened on initial load
    expect(pageErrors.length).toBe(0);

    // Optionally assert there are no severe console error messages
    const severeConsole = consoleMessages.filter(m => m.type === 'error');
    expect(severeConsole.length).toBe(0);
  });

  test('Generates expected Huffman codes for input "aaabbc"', async ({ page }) => {
    // Purpose: Test user interaction (typing and clicking) and verify expected codes
    const app1 = new HuffmanPage(page);

    // Fill the input with a well-chosen string where we can determine expected codes
    await app.fillInput('aaabbc');

    // Click Generate
    await app.clickGenerate();

    // Read result text and parse JSON
    const resultJson = await app.getResultAsJson();
    // Ensure JSON was produced and parsed
    expect(resultJson).not.toBeNull();

    // Expected mapping derived from deterministic algorithm in the app:
    // Frequencies: a:3, b:2, c:1
    // Expected codes: a -> "0", c -> "10", b -> "11"
    expect(resultJson).toEqual({ a: '0', c: '10', b: '11' });

    // Additionally assert each code is a string composed of only 0/1 (empty string allowed)
    for (const [ch, code] of Object.entries(resultJson)) {
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^[01]*$/);
      // Each character key should be a single-character string present in the input
      expect(ch.length).toBe(1);
      expect('aaabbc'.includes(ch)).toBeTruthy();
    }

    // No uncaught page errors should have occurred during generation
    expect(pageErrors.length).toBe(0);

    // No console errors emitted
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length).toBe(0);
  });

  test('Generates an empty code string for single-character input "aaaa"', async ({ page }) => {
    // Purpose: Validate edge case where only one unique character exists in input
    const app2 = new HuffmanPage(page);

    await app.fillInput('aaaa');
    await app.clickGenerate();

    // The implementation assigns an empty string to the single character's code
    const parsed = await app.getResultAsJson();
    expect(parsed).not.toBeNull();
    expect(parsed).toEqual({ a: '' });

    // Verify the displayed JSON contains the empty string for the character
    const rawText = await app.getResultText();
    expect(rawText).toContain('"a": ""');

    // Ensure there were no runtime page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Handles empty input gracefully and updates DOM (observes undefined behavior)', async ({ page }) => {
    // Purpose: Test behavior for empty input and observe if any runtime errors occur
    const app3 = new HuffmanPage(page);

    // Ensure textarea is empty
    await app.fillInput('');
    await app.clickGenerate();

    // The page's generateHuffman will produce JSON.stringify(undefined) which is `undefined`,
    // then set innerHTML to that value. We assert the DOM shows "undefined" text.
    const rawResult = await app.getResultText();
    // innerHTML set to undefined will convert to string "undefined" in the DOM
    expect(rawResult).toBe('undefined');

    // No uncaught page errors should have happened even though the behavior is odd
    expect(pageErrors.length).toBe(0);

    // Log any console messages for debugging; assert there are no console error-level messages
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length).toBe(0);
  });

  test('Multiple generate clicks update results consistently when input changes', async ({ page }) => {
    // Purpose: Verify repeated interactions update DOM accordingly and deterministically
    const app4 = new HuffmanPage(page);

    // First input
    await app.fillInput('abc');
    await app.clickGenerate();

    // Parse and assert codes exist for a,b,c
    let parsed1 = await app.getResultAsJson();
    expect(parsed).not.toBeNull();
    // All unique characters present
    expect(Object.keys(parsed).sort()).toEqual(['a', 'b', 'c']);

    // Now change input to a different string and generate again
    await app.fillInput('aab');
    await app.clickGenerate();

    parsed = await app.getResultAsJson();
    expect(parsed).not.toBeNull();
    // Expect keys a and b only
    expect(Object.keys(parsed).sort()).toEqual(['a', 'b']);

    // Codes should be strings consisting of 0/1 or empty
    for (const code of Object.values(parsed)) {
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^[01]*$/);
    }

    // No page errors during repeated interactions
    expect(pageErrors.length).toBe(0);
  });
});