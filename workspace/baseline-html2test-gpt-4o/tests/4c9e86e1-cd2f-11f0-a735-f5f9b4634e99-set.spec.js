import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e86e1-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object Model for the demo page
class SetDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.button = page.getByRole('button', { name: 'Demonstrate Set Operations' });
    this.output = page.locator('#output');
    this.description = page.locator('#description');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickDemonstrate() {
    await this.button.click();
  }

  async outputText() {
    return this.output.innerHTML();
  }

  async waitForOutputContains(text, timeout = 2000) {
    await this.page.waitForFunction(
      ({ selector, text }) => {
        const el = document.querySelector(selector);
        return el && el.innerHTML && el.innerHTML.includes(text);
      },
      { selector: '#output', text },
      { timeout }
    );
  }
}

test.describe('JavaScript Set Demo - End-to-End Tests', () => {
  // Arrays to collect console errors and page errors per test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset error collectors before each test
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and collect error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`${msg.text()}`);
      }
    });

    // Listen to runtime exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test.afterEach(async ({ page }) => {
    // Small sanity check in teardown: no unexpected page errors occurred during the test
    // We assert this inside tests too where relevant, but keep a generic check here to aid debugging.
    // Note: Individual tests will make precise assertions about errors as needed.
    // No action required for teardown beyond this comment.
  });

  test('Initial page load shows expected static content and no output', async ({ page }) => {
    // Purpose: Verify initial page structure, content and that there are no runtime errors on load.
    const demo = new SetDemoPage(page);
    await demo.goto();

    // Check the page title and heading
    await expect(page).toHaveTitle(/JavaScript Set Demo/);
    await expect(demo.heading).toHaveText('JavaScript Set Example');

    // Check description is visible and contains expected explanation text
    await expect(demo.description).toBeVisible();
    await expect(demo.description).toContainText('A JavaScript Set is a collection of unique values');

    // Output area should be present but initially empty
    await expect(demo.output).toBeVisible();
    const initialOutput = await demo.output.innerHTML();
    expect(initialOutput.trim()).toBe('', 'Expected output to be empty on initial load');

    // The interactive button should be visible and enabled with accessible name
    await expect(demo.button).toBeVisible();
    await expect(demo.button).toBeEnabled();

    // Assert that no console errors or page errors occurred during initial page load
    expect(consoleErrors.length, `console.error events on load: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `page errors on load: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Clicking "Demonstrate Set Operations" populates output with set details and operations', async ({ page }) => {
    // Purpose: Validate that clicking the demo button performs set operations and updates DOM accordingly.
    const demo = new SetDemoPage(page);
    await demo.goto();

    // Click the button to run the demonstration
    await demo.clickDemonstrate();

    // Wait for output to contain the heading text written by the script
    await demo.waitForOutputContains('Set Contents (should contain no duplicates):');

    // Get the output HTML/text and run assertions against expected pieces of information.
    const out = await demo.output.innerHTML();

    // The set was populated with 1, 5, "hello", and an object {"key":"object"}.
    // JSON.stringify produces:
    //  - 1  -> "1" (but rendered as text 1)
    //  - 5  -> "5"
    //  - "hello" -> "\"hello\"" (a quoted string)
    //  - { key: "object" } -> '{"key":"object"}'
    expect(out).toContain('Set Contents (should contain no duplicates):');
    expect(out).toContain('1'); // number 1 present
    expect(out).toContain('5'); // number 5 present in initial listing
    expect(out).toContain('"hello"'); // string hello will be JSON stringified with quotes
    expect(out).toContain('{"key":"object"}'); // object stringification

    // Existence checks
    expect(out).toContain('Does the set contain the number 5? <strong>true</strong>');
    expect(out).toContain('Does the set contain the number 10? <strong>false</strong>');

    // Size checks before and after delete/clear operations
    expect(out).toContain('Size of set: <strong>4</strong>');
    expect(out).toContain('Deleted number 5 from the set.');
    expect(out).toContain('Updated size of set: <strong>3</strong>');
    expect(out).toContain('Cleared the set.');
    expect(out).toContain('Final size of set: <strong>0</strong>');

    // Assert that no runtime page errors or console.error messages occurred during the demonstration
    expect(consoleErrors.length, `console.error events after demo click: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `page errors after demo click: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Clicking the demonstrate button multiple times is idempotent and updates output each time', async ({ page }) => {
    // Purpose: Ensure repeated interactions produce consistent, correct outputs and do not accumulate unexpected state.
    const demo = new SetDemoPage(page);
    await demo.goto();

    // First click
    await demo.clickDemonstrate();
    await demo.waitForOutputContains('Size of set: <strong>4</strong>');
    const firstOut = await demo.output.innerHTML();

    // Second click - function creates a fresh set each time, so output should be effectively the same
    await demo.clickDemonstrate();
    await demo.waitForOutputContains('Final size of set: <strong>0</strong>');
    const secondOut = await demo.output.innerHTML();

    // Compare outputs for stability - they should be non-empty and contain the expected final size marker
    expect(firstOut.length).toBeGreaterThan(0);
    expect(secondOut.length).toBeGreaterThan(0);
    expect(secondOut).toContain('Final size of set: <strong>0</strong>');
    // They should be equal or at least include the same key messages; we assert that both contain the same critical phrases.
    const keyPhrases = [
      'Set Contents (should contain no duplicates):',
      'Does the set contain the number 5? <strong>true</strong>',
      'Does the set contain the number 10? <strong>false</strong>',
      'Size of set: <strong>4</strong>',
      'Updated size of set: <strong>3</strong>',
      'Final size of set: <strong>0</strong>',
    ];
    for (const phrase of keyPhrases) {
      expect(firstOut).toContain(phrase);
      expect(secondOut).toContain(phrase);
    }

    // Confirm no console or page errors occurred during repeated interactions
    expect(consoleErrors.length, `console.error events during repeated clicks: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `page errors during repeated clicks: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Accessibility checks: button is discoverable by role and has an accessible name', async ({ page }) => {
    // Purpose: Basic accessibility checks ensuring interactive control is accessible via ARIA roles/names.
    const demo = new SetDemoPage(page);
    await demo.goto();

    // The button should be findable by its role and name
    const buttonByRole = page.getByRole('button', { name: 'Demonstrate Set Operations' });
    await expect(buttonByRole).toBeVisible();
    await expect(buttonByRole).toBeEnabled();

    // Activate via keyboard (Enter) to simulate accessible activation
    await buttonByRole.focus();
    await page.keyboard.press('Enter');

    // Ensure the output changed as a result of keyboard activation
    await demo.waitForOutputContains('Set Contents (should contain no duplicates):');
    expect(await demo.output.innerHTML()).toContain('Final size of set: <strong>0</strong>');

    // Ensure no console/page errors during keyboard activation
    expect(consoleErrors.length, `console.error events during keyboard activation: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `page errors during keyboard activation: ${pageErrors.join(' | ')}`).toBe(0);
  });

  test('Edge case: ensure output area handles multiple rapid clicks without throwing runtime errors', async ({ page }) => {
    // Purpose: Rapid user interactions can reveal race conditions or runtime exceptions. We ensure none appear.
    const demo = new SetDemoPage(page);
    await demo.goto();

    // Perform rapid clicks
    for (let i = 0; i < 5; i++) {
      await demo.button.click();
    }

    // Expect a valid output with final size zero; the implementation creates a new set each time so it should be stable.
    await demo.waitForOutputContains('Final size of set: <strong>0</strong>');

    // Assert no page errors or console errors were produced under rapid interactions
    expect(consoleErrors.length, `console.error events after rapid clicks: ${consoleErrors.join(' | ')}`).toBe(0);
    expect(pageErrors.length, `page errors after rapid clicks: ${pageErrors.join(' | ')}`).toBe(0);
  });
});