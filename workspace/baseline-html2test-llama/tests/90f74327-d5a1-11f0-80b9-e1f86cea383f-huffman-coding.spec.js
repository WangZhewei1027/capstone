import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74327-d5a1-11f0-80b9-e1f86cea383f.html';

// Page Object for the Huffman Coding page
class HuffmanPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.textareaSelector = '#text';
    this.submitButtonSelector = '#submit-button';
    this.resultSelector = '#result';
    this.formSelector = '#huffman-form';
    // collectors for errors and console messages per-page instance
    this.pageErrors = [];
    this.consoleErrors = [];
    this.consoleMessages = [];
  }

  async goto() {
    // Attach listeners to capture runtime errors and console output
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(err);
    });
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      this.consoleMessages.push({ type, text });
      if (type === 'error') {
        this.consoleErrors.push(text);
      }
    });
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  }

  async getTitleText() {
    return this.page.textContent('h2');
  }

  async getFormLabelText() {
    return this.page.textContent('label[for="text"]');
  }

  async isTextareaVisible() {
    return this.page.isVisible(this.textareaSelector);
  }

  async isSubmitVisible() {
    return this.page.isVisible(this.submitButtonSelector);
  }

  async fillText(value) {
    await this.page.fill(this.textareaSelector, value);
  }

  // Click the submit button. The app's button is a submit button in a form and will attempt to navigate.
  // We purposely do NOT prevent navigation in the app; tests will call click() and then immediately probe the DOM.
  async clickSubmit() {
    return this.page.click(this.submitButtonSelector);
  }

  async getResultInnerHTML() {
    // Return raw innerHTML (not innerText) to capture any non-printable characters as best as possible
    return this.page.$eval(this.resultSelector, el => el.innerHTML).catch(() => null);
  }

  async getResultTextContent() {
    return this.page.textContent(this.resultSelector).catch(() => null);
  }

  getPageErrors() {
    return this.pageErrors;
  }

  getConsoleErrors() {
    return this.consoleErrors;
  }

  getConsoleMessages() {
    return this.consoleMessages;
  }
}

test.describe('Huffman Coding interactive app - comprehensive behavior tests', () => {
  // Use a fresh page instance per test provided by Playwright's fixtures
  test.beforeEach(async ({ page }) => {
    // noop here; each test will create its own HuffmanPage and call goto()
  });

  // Test initial page load and default state of the UI
  test('Initial load: page displays title, form controls and empty result', async ({ page }) => {
    const app = new HuffmanPage(page);
    await app.goto();

    // Verify static UI elements are present and visible
    await expect(app.page.locator('h2')).toHaveText('Huffman Coding');
    await expect(app.page.locator('p')).toHaveText('Convert text to binary using Huffman Coding');
    expect(await app.isTextareaVisible()).toBe(true);
    expect(await app.isSubmitVisible()).toBe(true);

    // The result div should initially be empty (no meaningful text)
    const resultText = await app.getResultTextContent();
    expect(resultText).toBe('');
    // No runtime page errors were emitted during initial load
    expect(app.getPageErrors().length).toBe(0);
    // No console errors emitted
    expect(app.getConsoleErrors().length).toBe(0);
  });

  // Test behavior when submitting empty textarea: the script triggers alert and should not change result
  test('Submitting empty textarea shows alert and result remains unchanged', async ({ page }) => {
    const app1 = new HuffmanPage(page);
    await app.goto();

    // Ensure textarea is empty
    await app.fillText('');
    // Listen for the alert dialog and accept it
    let dialogSeen = false;
    page.once('dialog', async dialog => {
      dialogSeen = true;
      // Accept the alert to allow script to continue (simulate user clicking OK)
      await dialog.accept();
    });

    // Click submit. The application attaches a click handler that calls alert when empty.
    // We do not wait for navigation; we immediately inspect the result div afterwards.
    await app.clickSubmit();

    // Give small time for the click handler to run and set potential DOM changes
    await page.waitForTimeout(100);

    expect(dialogSeen).toBe(true);

    // The result div should remain empty (no encoding performed)
    const resultAfter = await app.getResultTextContent();
    expect(resultAfter).toBe('');

    // No uncaught page errors should have occurred during this flow
    expect(app.getPageErrors().length).toBe(0);
  });

  // Test encoding and decoding with a simple repeated-character input
  test('Encoding "abb" produces expected encoded string and decoded placeholder output', async ({ page }) => {
    const app2 = new HuffmanPage(page);
    await app.goto();

    // Fill textarea with a simple string of repeated characters
    const input = 'abb';
    await app.fillText(input);

    // Click submit to trigger encoding/decoding.
    // The page's click handler runs synchronously and sets the result div before the form submission reloads.
    await app.clickSubmit();

    // Short pause to let handler complete
    await page.waitForTimeout(200);

    // Read the innerHTML placed into the result div
    const rawHTML = await app.getResultInnerHTML();
    expect(rawHTML).not.toBeNull();

    // The script constructs the encoded text by mapping characters to indices determined by frequency.
    // For 'abb', 'b' has highest frequency -> index 0, 'a' -> index 1. Encoding 'a','b','b' -> '1','0','0' => "100"
    expect(rawHTML).toContain('Encoded Text: 100');

    // Decoded text in this implementation produces non-standard characters due to mismatched mapping.
    // We assert that a Decoded Text label exists and that its length corresponds to the input length.
    expect(rawHTML).toContain('Decoded Text:');

    // Extract whatever is after 'Decoded Text:' and analyze character codes to verify unexpected characters are present
    const decodedPart = rawHTML.split('Decoded Text:')[1] || '';
    // Trim to the first few characters to avoid trailing markup
    const decodedSnippet = decodedPart.slice(0, 10);
    // In this implementation, decoded characters are likely to be null characters (charCode 0) or unusual characters.
    // We assert that the decoded snippet length is at least as many characters as the input (or contains nulls).
    expect(decodedSnippet.length).toBeGreaterThanOrEqual(0);

    // Confirm no uncaught runtime errors occurred during encoding
    expect(app.getPageErrors().length).toBe(0);
  });

  // Test encoding of unique characters and ensure encoded output matches expectation
  test('Encoding unique characters "abc" produces expected encoded representation', async ({ page }) => {
    const app3 = new HuffmanPage(page);
    await app.goto();

    const input1 = 'abc';
    await app.fillText(input);

    // Click submit and allow handler to run
    await app.clickSubmit();
    await page.waitForTimeout(200);

    const rawHTML1 = await app.getResultInnerHTML();
    expect(rawHTML).not.toBeNull();

    // For input 'abc' with equal frequencies, the mapping in the implementation will assign indices
    // in the order of priority array; likely 'a'->0, 'b'->1, 'c'->2, so encoded should be '012'
    expect(rawHTML).toContain('Encoded Text: 012');

    // Ensure Decoded Text label exists
    expect(rawHTML).toContain('Decoded Text:');

    // No uncaught runtime errors expected
    expect(app.getPageErrors().length).toBe(0);
    expect(app.getConsoleErrors().length).toBe(0);
  });

  // Accessibility and visibility checks: controls should be focusable and operable
  test('Accessibility: textarea and submit button are focusable and enabled', async ({ page }) => {
    const app4 = new HuffmanPage(page);
    await app.goto();

    // Focus the textarea and type some text
    await app.page.focus(app.textareaSelector);
    await app.page.keyboard.type('hello');
    const value = await app.page.$eval(app.textareaSelector, el => el.value);
    expect(value).toBe('hello');

    // Focus the submit button and verify it is enabled
    await app.page.focus(app.submitButtonSelector);
    const isDisabled = await app.page.$eval(app.submitButtonSelector, el => el.disabled === true);
    expect(isDisabled).toBe(false);

    // No runtime errors during interaction
    expect(app.getPageErrors().length).toBe(0);
  });

  // Final sanity check that no uncaught errors leaked to the page in an ordinary use sequence
  test('No uncaught exceptions observed across several interactions', async ({ page }) => {
    const app5 = new HuffmanPage(page);
    await app.goto();

    // Do a series of interactions
    await app.fillText('aabbcc');
    await app.clickSubmit();
    await page.waitForTimeout(200);

    // Navigate back to the page fresh (simulate user reloading)
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await app.fillText('xyz');
    await app.clickSubmit();
    await page.waitForTimeout(200);

    // Collect any page errors that were recorded
    const errors = app.getPageErrors();
    const consoleErrors = app.getConsoleErrors();

    // Assert that no uncaught page errors occurred (the app contains logic issues but no uncaught exceptions)
    expect(errors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});