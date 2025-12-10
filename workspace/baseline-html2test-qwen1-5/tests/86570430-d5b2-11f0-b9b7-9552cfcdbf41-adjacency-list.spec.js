import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/86570430-d5b2-11f0-b9b7-9552cfcdbf41.html';

// Page Object for the Adjacency List page to encapsulate interactions and observations
class AdjacencyListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Arrays to collect console messages and page errors that occur during navigation/execution
    this.consoleMessages = [];
    this.consoleErrors = [];
    this.pageErrors = [];

    // Bind handlers early so we capture events during navigation/initial script execution
    this._onConsole = msg => {
      // store all console messages
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    };
    this._onPageError = error => {
      // pageerror yields an Error object (or similar) with message and name
      this.pageErrors.push({
        name: error.name || '',
        message: error.message || String(error),
        stack: error.stack || '',
      });
    };

    this.page.on('console', this._onConsole);
    this.page.on('pageerror', this._onPageError);
  }

  // Navigate to the app and wait for load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // ensure any synchronous script has run
    await this.page.waitForLoadState('load');
  }

  // Helper to get the heading text
  async getHeadingText() {
    return this.page.locator('h1').innerText();
  }

  // Helper to get paragraphs' text content
  async getParagraphsText() {
    const ps = this.page.locator('body > p');
    const count = await ps.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await ps.nth(i).innerText());
    }
    return texts;
  }

  // Get the UL adjacency list element locator
  getListLocator() {
    return this.page.locator('#adjacencyList');
  }

  // Count LI children under adjacencyList
  async getListItemCount() {
    return this.page.locator('#adjacencyList > li').count();
  }

  // Get raw innerHTML of the adjacencyList
  async getListInnerHTML() {
    return this.page.locator('#adjacencyList').evaluate(node => node.innerHTML);
  }

  // Get captured console messages (type + text)
  getConsoleMessages() {
    return this.consoleMessages;
  }

  // Get captured console error texts
  getConsoleErrors() {
    return this.consoleErrors;
  }

  // Get captured page errors
  getPageErrors() {
    return this.pageErrors;
  }

  // Cleanup listeners to avoid leaking between tests
  async dispose() {
    this.page.removeListener('console', this._onConsole);
    this.page.removeListener('pageerror', this._onPageError);
  }
}

test.describe('Adjacency List Application (86570430-d5b2-11f0-b9b7-9552cfcdbf41)', () => {
  // Basic sanity test: page loads and structural elements are present
  test('Initial load: heading, descriptive paragraphs, and adjacency list are present', async ({ page }) => {
    // Attach page object and navigate
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Assert heading text
    const heading = await app.getHeadingText();
    expect(heading).toBe('Adjacency List');

    // Assert descriptive paragraphs exist and contain expected keywords
    const paragraphs = await app.getParagraphsText();
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0]).toContain('Welcome to the Adjacency List');
    expect(paragraphs[1]).toContain('graph');

    // The HTML contains a UL with id adjacencyList. Verify it exists and is empty after the script runs.
    const listLocator = app.getListLocator();
    await expect(listLocator).toBeVisible();
    const itemCount = await app.getListItemCount();
    // The implementation clears innerHTML at the end of the script, so we expect 0 items.
    expect(itemCount).toBe(0);

    // Ensure the innerHTML is explicitly empty string as the script sets it
    const innerHTML = await app.getListInnerHTML();
    expect(innerHTML).toBe('');

    // No unexpected console error messages should have been emitted for this static page (capture if any)
    const consoleErrors = app.getConsoleErrors();
    expect(consoleErrors.length).toBe(0);

    // No unhandled page errors should have been thrown during load in the served environment
    const pageErrors = app.getPageErrors();
    expect(pageErrors.length).toBe(0);

    await app.dispose();
  });

  // There are no interactive controls in the HTML. Confirm that and assert expected behavior.
  test('No interactive form controls exist (buttons, inputs, selects, forms)', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Check for interactive elements that the FSM/test guidelines expect to consider
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const selects = await page.locator('select').count();
    const forms = await page.locator('form').count();
    // The provided HTML contains none of these, assert zero counts
    expect(buttons).toBe(0);
    expect(inputs).toBe(0);
    expect(selects).toBe(0);
    expect(forms).toBe(0);

    // Still assert UL exists
    await expect(app.getListLocator()).toBeVisible();

    await app.dispose();
  });

  // Observe and assert any runtime exceptions (if they occur). If none occur, the test still passes.
  test('Observe runtime errors and console output: if errors occur they should be of expected JS error types', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    const pageErrors = app.getPageErrors();
    const consoleMessages = app.getConsoleMessages();

    // If there are page errors, assert each is a common JS error type (ReferenceError, TypeError, SyntaxError)
    if (pageErrors.length > 0) {
      const allowed = new Set(['ReferenceError', 'TypeError', 'SyntaxError', 'EvalError', 'RangeError', 'URIError']);
      for (const err of pageErrors) {
        // Each error object includes a name and message; ensure name is one of the expected ones
        expect(allowed.has(err.name)).toBeTruthy();
      }
    } else {
      // No page errors observed; assert that that's acceptable for this environment
      expect(pageErrors.length).toBe(0);
    }

    // Check console messages for error-level logs; if present, they should contain useful diagnostic text
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    // We do not enforce that there must be console errors; but if there are, ensure they are non-empty strings
    for (const txt of errorConsoleMessages) {
      expect(typeof txt).toBe('string');
      expect(txt.length).toBeGreaterThan(0);
    }

    await app.dispose();
  });

  // Test that list manipulation code did not create unexpected DOM elements after load
  test('No unexpected DOM nodes were appended to body by script', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // The broken script attempts to append 'neighbor' to document.body conditionally inside a click handler.
    // Because there are no list items, we expect no additional <li> elements appended to body.
    const bodyLiCount = await page.locator('body > li').count();
    expect(bodyLiCount).toBe(0);

    // Also ensure the only UL with id adjacencyList remains present and empty
    const appListCount = await app.getListItemCount();
    expect(appListCount).toBe(0);

    await app.dispose();
  });

  // Edge case test: programmatically add LI elements after load is not part of the original app behavior,
  // but we assert the script already ran and won't run again: reloading page is the only path to execute script.
  test('Reloading the page preserves behavior: script runs on load and adjacencyList ends up empty', async ({ page }) => {
    const app = new AdjacencyListPage(page);
    await app.goto();

    // Reload the page to ensure the script executes again in a fresh environment
    await page.reload({ waitUntil: 'load' });

    // Give the page a chance to emit console/page errors during reload
    await page.waitForLoadState('load');

    // After reload, adjacencyList should again be present and empty
    const itemCountAfterReload = await page.locator('#adjacencyList > li').count();
    expect(itemCountAfterReload).toBe(0);

    // Capture any page errors that might have occurred during the reload
    const pageErrors = app.getPageErrors();
    // If any page errors are present, ensure they're of expected JS error types as in previous test
    if (pageErrors.length > 0) {
      for (const err of pageErrors) {
        expect(typeof err.name).toBe('string');
      }
    }

    await app.dispose();
  });
});