import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed133-cd32-11f0-a96f-2d591ffb35fe.html';

/**
 * Page Object Model for the Merge Sort Visualization app
 * Encapsulates selectors and common interactions
 */
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputArray');
    this.sortButton = page.locator('#sortButton');
    this.output = page.locator('#output');
    this.trace = page.locator('#trace');
  }

  // Navigate to the application
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input array text box
  async setInput(value) {
    await this.input.fill(value);
  }

  // Click the Sort and Visualize button
  async clickSort() {
    await this.sortButton.click();
  }

  // Get the output text as displayed
  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }

  // Get the full trace text content
  async getTraceText() {
    return (await this.trace.textContent()) ?? '';
  }

  // Get the number of trace "line" entries (div children)
  async getTraceLineCount() {
    return await this.trace.locator('div').count();
  }

  // Wait until output contains specific substring
  async waitForOutputContains(substring, timeout = 2000) {
    await this.page.waitForFunction(
      (selector, substr) => {
        const el = document.querySelector(selector);
        return el && el.textContent && el.textContent.includes(substr);
      },
      this.output.selector || '#output',
      substring,
      { timeout }
    );
  }
}

test.describe('Divide and Conquer: Merge Sort Visualization', () => {
  // Basic smoke test to ensure the page loads and default state is correct
  test('Initial page load shows default input, visible controls, and empty outputs', async ({ page }) => {
    // Monitor console messages and page errors for the duration of this test
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const app = new MergeSortPage(page);
    // Navigate to the application HTML
    await app.goto();

    // Verify interactive elements are present and visible
    await expect(app.input).toBeVisible();
    await expect(app.sortButton).toBeVisible();
    await expect(app.output).toBeVisible();
    await expect(app.trace).toBeVisible();

    // The input has a default value as provided in the HTML
    await expect(app.input).toHaveValue('38, 27, 43, 3, 9, 82, 10');

    // On initial load, output and trace should be empty
    expect(await app.getOutputText()).toBe('');
    expect(await app.getTraceLineCount()).toBe(0);

    // Assert that there are no uncaught page errors or console errors during initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Sort and Visualize sorts default array and populates trace', async ({ page }) => {
    // Capture console and page errors for diagnostic assertions
    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const app1 = new MergeSortPage(page);
    await app.goto();

    // Click the sort button with default data
    await app.clickSort();

    // The algorithm is synchronous in the page script, so the output should be set immediately.
    // Wait for the expected sorted output string
    await expect(app.output).toHaveText('[3, 9, 10, 27, 38, 43, 82]');

    // The trace should contain multiple lines describing the divide and merge steps.
    const traceText = await app.getTraceText();
    expect(traceText).toContain('Starting Merge Sort (Divide and Conquer)...');
    expect(traceText).toContain('Dividing: [');
    expect(traceText).toContain('Merging left');
    expect(traceText).toContain('Merge Sort Complete!');

    // There should be multiple trace lines (at least the starting and a few divide/merge logs)
    const traceLineCount = await app.getTraceLineCount();
    expect(traceLineCount).toBeGreaterThanOrEqual(5);

    // Ensure no runtime page errors or console errors occurred during sorting
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Empty input yields a friendly message and does not produce a trace', async ({ page }) => {
    // Observe console and page errors
    const consoleMessages2 = [];
    const pageErrors2 = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const app2 = new MergeSortPage(page);
    await app.goto();

    // Clear the input and click sort
    await app.setInput('');
    await app.clickSort();

    // The output should show the validation message
    await expect(app.output).toHaveText('Please enter a valid list of numbers.');

    // The trace area should remain empty (no steps)
    expect(await app.getTraceLineCount()).toBe(0);
    expect(await app.getTraceText()).toBe('');

    // No page errors or console errors should have been produced
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Input with non-numeric tokens filters them out and sorts the remaining numbers', async ({ page }) => {
    const consoleMessages3 = [];
    const pageErrors3 = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const app3 = new MergeSortPage(page);
    await app.goto();

    // Provide mixed input with invalid tokens and extra separators
    await app.setInput('5, abc, 2, , 7');
    await app.clickSort();

    // Expect the app to parse [5,2,7] and produce sorted result [2, 5, 7]
    await expect(app.output).toHaveText('[2, 5, 7]');

    // Trace should still contain Merge Sort logs
    const traceText1 = await app.getTraceText();
    expect(traceText).toContain('Starting Merge Sort (Divide and Conquer)...');
    expect(traceText).toContain('Base case reached');

    // No runtime errors or console errors
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Trace includes "Base case reached" entries corresponding to single-element subarrays', async ({ page }) => {
    // This test verifies that base-case logs are emitted for single-element arrays.
    const consoleMessages4 = [];
    const pageErrors4 = [];
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    const app4 = new MergeSortPage(page);
    await app.goto();

    // Use a small array of four elements to make counting predictable
    await app.setInput('4, 1, 3, 2');
    await app.clickSort();

    // Count occurrences of "Base case reached" in the trace text
    const traceText2 = await app.getTraceText();
    const matches = traceText.match(/Base case reached/g) || [];
    // For 4 elements, there should be 4 base-case logs for the single-element subarrays
    expect(matches.length).toBeGreaterThanOrEqual(4);

    // Confirm final sorted output is correct
    await expect(app.output).toHaveText('[1, 2, 3, 4]');

    // No page errors or console errors
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});