import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed500-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object for the Linear Search app
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayContainer = page.locator('#array-container');
    this.input = page.locator('#search-element');
    this.searchButton = page.locator('button', { hasText: 'Search' });
    this.result = page.locator('#result');
    this.label = page.locator('label[for="search-element"]');
  }

  // Navigate to the app and wait for initial render
  async goto() {
    await this.page.goto(APP_URL);
    await this.arrayContainer.waitFor({ state: 'visible' });
  }

  // Read the displayed array text
  async getArrayText() {
    return await this.arrayContainer.innerText();
  }

  // Fill the input and click search. Leaves a small wait for the result to update.
  async performSearch(value) {
    // Use fill to set input value (works for number input as string)
    await this.input.fill(String(value));
    await this.searchButton.click();
    // Wait for result innerHTML to update (it will always be updated by the function)
    await this.page.waitForFunction(() => {
      const el = document.getElementById('result');
      return el && el.innerHTML !== '';
    });
  }

  // Get result innerHTML (so we can assert span.highlight presence)
  async getResultInnerHTML() {
    return await this.result.innerHTML();
  }

  // Get all highlighted span elements inside result
  async getHighlights() {
    return this.result.locator('.highlight');
  }

  // Get the visible text of the result (strips tags)
  async getResultText() {
    return await this.result.innerText();
  }
}

test.describe('Linear Search Demo - end-to-end', () => {
  // We'll collect console messages and page errors per test to assert none of them are present.
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial state and static content
  test('Initial load shows the array and an empty result area; label is associated with input', async ({ page }) => {
    const app = new LinearSearchPage(page);
    // Navigate to the app
    await app.goto();

    // Verify the array is displayed correctly
    const arrayText = await app.getArrayText();
    await expect(arrayText).toBe('Array: [3, 5, 7, 2, 8, 9, 10]');

    // Verify result area is present but initially empty
    const resultText = await app.getResultText();
    await expect(resultText.trim()).toBe('');

    // Verify the label is associated with the input via for/id
    await expect(app.label).toHaveText('Enter number to search:');
    const forAttr = await app.label.getAttribute('for');
    await expect(forAttr).toBe('search-element');

    // Ensure no page errors or console errors happened during load
    // (We expect a clean load in this implementation.)
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test searching an element that exists in the array
  test('Searching for an existing element displays found message with highlighted value and index', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Search for 7, which is at index 2
    await app.performSearch(7);

    // Verify result text contains "found at index"
    const resultText = await app.getResultText();
    await expect(resultText).toContain('found at index');

    // Verify innerHTML contains two highlighted spans: one for the element and one for the index
    const inner = await app.getResultInnerHTML();
    await expect(inner).toContain('Element <span class="highlight">7</span>');
    await expect(inner).toContain('index <span class="highlight">2</span>');

    // Verify there are exactly two highlight spans and their text values are correct
    const highlights = app.getHighlights();
    await expect(highlights).toHaveCount(2);
    const first = await highlights.nth(0).innerText();
    const second = await highlights.nth(1).innerText();
    await expect(first).toBe('7');
    await expect(second).toBe('2');

    // No console errors or uncaught exceptions during the interaction
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test searching for an element that does NOT exist
  test('Searching for a non-existing element displays not found message with highlighted search value', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Search for 4 which is not in the array
    await app.performSearch(4);

    // Verify that the not found message is shown
    const resultText = await app.getResultText();
    await expect(resultText).toContain('not found in the array');

    // The innerHTML should contain one highlight with the searched value 4
    const inner = await app.getResultInnerHTML();
    await expect(inner).toContain('<span class="highlight">4</span>');
    const highlights = app.getHighlights();
    await expect(highlights).toHaveCount(1);
    await expect(highlights.nth(0)).toHaveText('4');

    // No console errors or uncaught exceptions during the interaction
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: empty input should lead to NaN due to parseInt('') -> NaN, and display "NaN not found"
  test('Empty input results in NaN being displayed and not found message', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Clear input and click search
    await app.performSearch(''); // fill with empty string

    // Verify the result indicates NaN not found
    const inner = await app.getResultInnerHTML();
    await expect(inner).toContain('<span class="highlight">NaN</span>');
    await expect(inner).toContain('not found in the array');

    // One highlighted span containing NaN
    const highlights = app.getHighlights();
    await expect(highlights).toHaveCount(1);
    await expect(highlights.nth(0)).toHaveText('NaN');

    // No console errors or uncaught exceptions during the interaction
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: non-numeric input (e.g., 'abc') -> parseInt('abc') -> NaN
  test('Non-numeric input results in NaN and shows not found message', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Fill input with non-numeric string
    await app.performSearch('abc');

    // The app uses parseInt and will display NaN in the result
    const inner = await app.getResultInnerHTML();
    await expect(inner).toContain('<span class="highlight">NaN</span>');
    await expect(inner).toContain('not found in the array');

    const highlights = app.getHighlights();
    await expect(highlights).toHaveCount(1);
    await expect(highlights.nth(0)).toHaveText('NaN');

    // No console errors or uncaught exceptions during the interaction
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test repeated searches update the DOM result accordingly
  test('Repeated searches update the result area to reflect the latest search', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // First search for 3
    await app.performSearch(3);
    let inner = await app.getResultInnerHTML();
    await expect(inner).toContain('<span class="highlight">3</span>');
    await expect(inner).toContain('found at index');

    // Then search for 10
    await app.performSearch(10);
    inner = await app.getResultInnerHTML();
    await expect(inner).toContain('<span class="highlight">10</span>');
    // 10 is at index 6
    await expect(inner).toContain('<span class="highlight">6</span>');
    await expect(inner).toContain('found at index');

    // Finally search for a missing value 99
    await app.performSearch(99);
    inner = await app.getResultInnerHTML();
    await expect(inner).toContain('<span class="highlight">99</span>');
    await expect(inner).toContain('not found in the array');

    // No console errors or uncaught exceptions across repeated interactions
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Observe console logs and page errors explicitly: ensure none of the common runtime errors (ReferenceError, SyntaxError, TypeError) were thrown
  test('No runtime errors (ReferenceError, SyntaxError, TypeError) emitted to console or as page errors during interactions', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // perform a few interactions to exercise code paths
    await app.performSearch(5);
    await app.performSearch(12345);
    await app.performSearch('abc');

    // Inspect collected pageErrors for particular error types
    const errorMessages = pageErrors.map(e => String(e));
    // Assert we did not receive any page errors (uncaught exceptions)
    expect(pageErrors.length).toBe(0);

    // Inspect console errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    // If any console errors exist, fail the test (we expect none for this app)
    expect(consoleErrors.length).toBe(0);

    // Additionally ensure none of the console messages contain "ReferenceError", "SyntaxError", or "TypeError"
    const allConsoleText = consoleMessages.map(m => m.text).join('\n');
    expect(allConsoleText).not.toMatch(/ReferenceError/);
    expect(allConsoleText).not.toMatch(/SyntaxError/);
    expect(allConsoleText).not.toMatch(/TypeError/);
  });
});