import { test, expect } from '@playwright/test';

// URL of the static HTML page to test
const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca7663-d5af-11f0-852d-73feb043b9f3.html';

// Page Object for the Fibonacci page to encapsulate common queries
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Returns the heading locator
  heading() {
    return this.page.getByRole('heading', { name: 'Fibonacci Sequence' });
  }

  // Returns the paragraph locator that contains the sequence
  sequenceParagraph() {
    // Use a text-based locator as the paragraph does not have an id or role.
    return this.page.locator('p', { hasText: '1, 2, 3, 5, 8, 13, 21, 34, 55, 89.' });
  }

  // Utility to collect counts of interactive elements that should not exist in this static page
  async interactiveCounts() {
    const counts = {};
    counts.buttons = await this.page.locator('button').count();
    counts.inputs = await this.page.locator('input').count();
    counts.textareas = await this.page.locator('textarea').count();
    counts.selects = await this.page.locator('select').count();
    counts.forms = await this.page.locator('form').count();
    return counts;
  }
}

test.describe('Fibonacci Sequence - Static Page Tests', () => {
  // Basic smoke test: page loads, title present, heading and paragraph visible with expected text.
  test('should load the page and show the heading and Fibonacci sequence paragraph', async ({ page }) => {
    // Capture console messages and page errors that occur during navigation and interaction
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      // Collect only error-level console messages for stronger assertions below
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const fib = new FibonacciPage(page);

    // Navigate to the static HTML page
    await page.goto(APP_URL);

    // Verify title of the page
    await expect(page).toHaveTitle('Fibonacci Sequence');

    // The main heading should be visible and have the exact text
    await expect(fib.heading()).toBeVisible();
    await expect(fib.heading()).toHaveText('Fibonacci Sequence');

    // The paragraph containing the sequence should be visible and must match exactly as in the HTML
    const expectedSequenceText = '1, 2, 3, 5, 8, 13, 21, 34, 55, 89.';
    await expect(fib.sequenceParagraph()).toBeVisible();
    await expect(fib.sequenceParagraph()).toHaveText(expectedSequenceText);

    // Confirm there are no interactive elements (buttons, inputs, selects, textareas, forms)
    const counts = await fib.interactiveCounts();
    expect(counts.buttons, 'Expected zero <button> elements on this static page').toBe(0);
    expect(counts.inputs, 'Expected zero <input> elements on this static page').toBe(0);
    expect(counts.textareas, 'Expected zero <textarea> elements on this static page').toBe(0);
    expect(counts.selects, 'Expected zero <select> elements on this static page').toBe(0);
    expect(counts.forms, 'Expected zero <form> elements on this static page').toBe(0);

    // Assert that no console errors or page errors were emitted during load.
    // We collect any console messages; if there are error-level messages or page errors, fail the test.
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages, `Console reported error-level messages: ${JSON.stringify(errorConsoleMessages)}`).toHaveLength(0);
    expect(pageErrors, `Page emitted runtime errors: ${pageErrors.map((e) => String(e)).join('; ')}`).toHaveLength(0);
  });

  // Verify that interacting with the static content (clicking the paragraph) does not change DOM state
  test('clicking on the paragraph or body should not change content or visibility', async ({ page }) => {
    const fib = new FibonacciPage(page);
    await page.goto(APP_URL);

    // Capture the initial text content
    const paragraph = fib.sequenceParagraph();
    const initialText = await paragraph.textContent();

    // Click the paragraph and then the body; these interactions should have no effect
    await paragraph.click();
    await page.locator('body').click();

    // Wait briefly to allow any potential (but unexpected) mutation to happen
    await page.waitForTimeout(100);

    const afterText = await paragraph.textContent();
    expect(afterText, 'The sequence paragraph text should remain unchanged after clicks').toBe(initialText);

    // The heading should still be visible
    await expect(fib.heading()).toBeVisible();
  });

  // Accessibility-oriented test: ensure the main heading is discoverable via role and that the paragraph is present in the accessibility tree
  test('accessibility checks: heading role and paragraph text are exposed', async ({ page }) => {
    await page.goto(APP_URL);
    const fib = new FibonacciPage(page);

    // Use getByRole for heading and getByText for the paragraph to simulate assistive technology queries
    const heading = page.getByRole('heading', { name: 'Fibonacci Sequence' });
    await expect(heading).toBeVisible();

    const paragraphByText = page.getByText('1, 2, 3, 5, 8, 13, 21, 34, 55, 89.');
    await expect(paragraphByText).toBeVisible();
  });

  // Edge case tests: query for non-existent interactive controls and verify selectors return empty results
  test('edge case: confirm selectors for interactive elements return empty results', async ({ page }) => {
    await page.goto(APP_URL);

    // Query using a variety of selectors that often indicate interactive UI parts.
    const buttonCount = await page.locator('button, [role="button"], [data-testid="button"]').count();
    const formCount = await page.locator('form, [role="form"]').count();
    const inputLikeCount = await page.locator('input, textarea, select, [contenteditable="true"]').count();

    // The static HTML provides no interactive controls, so all counts must be zero
    expect(buttonCount, 'No clickable controls should exist on the page').toBe(0);
    expect(formCount, 'No forms should exist on the page').toBe(0);
    expect(inputLikeCount, 'No input-like elements should exist on the page').toBe(0);
  });

  // Observability test: listen for any console errors that might appear later during page lifetime
  test('observability: no console errors or runtime exceptions appear while the page is open', async ({ page }) => {
    const consoleErrors = [];
    const runtimeErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      runtimeErrors.push(String(error));
    });

    await page.goto(APP_URL);

    // Keep the page open and idle for a short period to observe any late-arriving errors
    await page.waitForTimeout(200);

    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join('; ')}`).toHaveLength(0);
    expect(runtimeErrors, `Unexpected runtime errors: ${runtimeErrors.join('; ')}`).toHaveLength(0);
  });
});