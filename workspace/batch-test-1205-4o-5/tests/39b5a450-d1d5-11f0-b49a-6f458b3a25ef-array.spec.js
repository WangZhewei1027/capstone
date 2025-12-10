import { test, expect } from '@playwright/test';

// Page Object for the Array Demonstration application
class ArrayDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.button = page.getByRole('button', { name: 'Show Array Elements' });
    this.output = page.locator('#arrayOutput');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b5a450-d1d5-11f0-b49a-6f458b3a25ef.html', { waitUntil: 'load' });
  }

  // Click the show array button
  async clickShow() {
    await this.button.click();
  }

  // Return the raw innerHTML of the output container
  async getOutputHTML() {
    return (await this.output.evaluate((el) => el.innerHTML)).trim();
  }

  // Return the visible text content lines as an array (split by newline)
  async getOutputLines() {
    // Use innerText to get rendered lines
    const text = (await this.output.evaluate((el) => el.innerText)).trim();
    if (!text) return [];
    // Split by line breaks and filter empties
    return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
}

test.describe('Array Demonstration App - 39b5a450-d1d5-11f0-b49a-6f458b3a25ef', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Setup before each test: create arrays to track console and page errors and navigate to page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Teardown/verification after each test: assert that there were no page errors and no console errors
  test.afterEach(async () => {
    // Ensure no uncaught page errors were emitted during the test
    expect(pageErrors, 'No uncaught page errors should have occurred').toEqual([]);

    // Ensure there were no console messages of type 'error'
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages, 'No console.error messages should have been logged').toEqual([]);
  });

  test('Initial page load: UI elements present and default state is empty', async ({ page }) => {
    // Test purpose: Verify initial UI state before any interactions
    const app = new ArrayDemoPage(page);
    await app.goto();

    // The button should be visible and accessible by role/name
    await expect(app.button).toBeVisible();
    await expect(app.button).toHaveText('Show Array Elements');

    // The output container should exist and be empty by default
    const html = await app.getOutputHTML();
    // Trim and expect empty string (no content)
    expect(html === '' || html === null).toBeTruthy();

    // Verify the button has the expected onclick attribute (verifying HTML wiring)
    const onclick = await page.locator('button').getAttribute('onclick');
    expect(onclick).toBe('demonstrateArray()');

    // Verify that the demonstrateArray function is defined on the window
    const hasFunction = await page.evaluate(() => typeof window.demonstrateArray === 'function');
    expect(hasFunction).toBe(true);
  });

  test('Clicking the "Show Array Elements" button populates the output with 5 elements', async ({ page }) => {
    // Test purpose: Validate the main interaction and DOM update
    const app1 = new ArrayDemoPage(page);
    await app.goto();

    // Click the button to show array elements
    await app.clickShow();

    // The output should contain a strong header and five elements
    const html1 = await app.getOutputHTML();
    expect(html).toContain('<strong>Array Elements:</strong>');
    // Ensure that element lines are present in innerHTML (Element 0: Apple etc)
    expect(html).toContain('Element 0: Apple');
    expect(html).toContain('Element 1: Banana');
    expect(html).toContain('Element 2: Cherry');
    expect(html).toContain('Element 3: Date');
    expect(html).toContain('Element 4: Elderberry');

    // As visible text, there should be 6 lines: header + 5 elements
    const lines = await app.getOutputLines();
    expect(lines.length).toBe(6);
    expect(lines[0]).toContain('Array Elements:');
    // Check specific element line texts
    expect(lines).toContain('Element 0: Apple');
    expect(lines).toContain('Element 4: Elderberry');
  });

  test('Clicking the button multiple times replaces content (idempotent behavior)', async ({ page }) => {
    // Test purpose: Ensure repeated interactions do not accumulate duplicate content
    const app2 = new ArrayDemoPage(page);
    await app.goto();

    // First click
    await app.clickShow();
    const firstHTML = await app.getOutputHTML();

    // Second click quickly after
    await app.clickShow();
    const secondHTML = await app.getOutputHTML();

    // Content should be the same (innerHTML replaced, not appended)
    expect(secondHTML).toBe(firstHTML);

    // Confirm the number of visible lines remains 6 (header + 5)
    const lines1 = await app.getOutputLines();
    expect(lines.length).toBe(6);
  });

  test('Output markup contains expected HTML structure (strong tag and <br> separators)', async ({ page }) => {
    // Test purpose: Verify that the implementation uses strong element and line breaks as intended
    const app3 = new ArrayDemoPage(page);
    await app.goto();

    await app.clickShow();
    const html2 = await app.getOutputHTML();

    // The header should be wrapped in a <strong> tag
    expect(html).toContain('<strong>Array Elements:</strong>');
    // There should be at least one <br> present (used to separate lines)
    expect(html).toContain('<br>');
  });

  test('Edge case: Verify behavior when clicking with rapid repeat clicks', async ({ page }) => {
    // Test purpose: Simulate a user clicking the button rapidly multiple times and ensure stable state
    const app4 = new ArrayDemoPage(page);
    await app.goto();

    // Perform several rapid clicks
    for (let i = 0; i < 10; i++) {
      await app.clickShow();
    }

    // Confirm stable expected output (still header + 5 elements)
    const lines2 = await app.getOutputLines();
    expect(lines.length).toBe(6);
    expect(lines[1]).toBe('Element 0: Apple');
  });

  test('Accessibility check: button is focusable and activatable via keyboard', async ({ page }) => {
    // Test purpose: Basic accessibility interaction - focus and press Enter to activate
    const app5 = new ArrayDemoPage(page);
    await app.goto();

    // Focus the button and press Enter
    await app.button.focus();
    await page.keyboard.press('Enter');

    // The output should be populated as if clicked
    const lines3 = await app.getOutputLines();
    expect(lines.length).toBe(6);
    expect(lines[0]).toContain('Array Elements:');
  });

  test('No unexpected console errors or runtime exceptions during normal use', async ({ page }) => {
    // Test purpose: Ensure there are no console.error logs or uncaught exceptions during normal operations
    const app6 = new ArrayDemoPage(page);
    await app.goto();

    // Perform typical interactions
    await app.clickShow();
    await page.keyboard.press('Tab');
    await app.clickShow();

    // The afterEach hook will assert that there were no page errors and no console.error messages.
    // Here we also directly assert the collected arrays to provide clear failure messages if something went wrong.
    // The arrays are checked in afterEach, but assert here too for immediate clarity.
    // Note: the arrays are populated via listeners set up in beforeEach.
    // We don't have direct access to them here, so rely on afterEach assertions.
    // This test ensures the app works under basic repeated interactions.
    expect(await app.getOutputLines()).toHaveLength(6);
  });
});