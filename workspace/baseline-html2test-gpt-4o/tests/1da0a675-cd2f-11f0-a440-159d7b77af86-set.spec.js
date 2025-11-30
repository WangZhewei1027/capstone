import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a675-cd2f-11f0-a440-159d7b77af86.html';

// Page object model for the Set demonstration page
class SetDemoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.outputSelector = '#output';
    this.headingSelector = 'h2';
  }

  // Get the text content of the output <pre> element
  async getOutputText() {
    const raw = await this.page.locator(this.outputSelector).innerText();
    // Normalize CRLF to LF for consistent assertions across platforms
    return raw.replace(/\r\n/g, '\n');
  }

  // Get the heading text
  async getHeadingText() {
    return (await this.page.locator(this.headingSelector).innerText()).trim();
  }

  // Check visibility of the output element
  async isOutputVisible() {
    return await this.page.locator(this.outputSelector).isVisible();
  }

  // Count interactive controls (buttons, inputs, selects, forms, textareas)
  async countInteractiveControls() {
    return await this.page.evaluate(() => {
      const selectors = ['button', 'input', 'select', 'form', 'textarea', '[role="button"]'];
      return document.querySelectorAll(selectors.join(',')).length;
    });
  }
}

test.describe('JavaScript Set Demonstration - End-to-end tests', () => {
  // Arrays to capture any page errors and console.error messages that occur during navigation.
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Listen for pageerror events (uncaught exceptions)
    page.on('pageerror', error => {
      // Capture message and constructor name (helps identify ReferenceError/SyntaxError/TypeError)
      const name = error && error.name ? error.name : 'Error';
      const message = error && error.message ? error.message : String(error);
      pageErrors.push({ name, message });
    });

    // Listen for console messages; capture console.error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text() });
      }
    });

    // Navigate to the application under test. Doing this after attaching listeners so we capture early errors.
    await page.goto(APP_URL);
  });

  // Test the default state and visible content on first load
  test('Initial page load shows expected Set output and heading', async ({ page }) => {
    // Arrange: create page object
    const demo = new SetDemoPage(page);

    // Assert: Heading text is present and correct
    const heading = await demo.getHeadingText();
    expect(heading).toBe('JavaScript Set Demonstration');

    // Assert: Output <pre> is visible
    expect(await demo.isOutputVisible()).toBeTruthy();

    // Assert: output contains key pieces of expected content
    const output = await demo.getOutputText();

    // The output should describe initial set values and show the array with a single 5 (no duplicate)
    expect(output).toContain('Initial set values:');
    expect(output).toContain('[1,5,"Hello",{"name":"Alice"}]');

    // It should confirm the set contains the number 5 initially
    expect(output).toContain('Does the set contain the number 5? true');

    // After deletion, the array should no longer include 5
    expect(output).toContain('Set values after deleting 5:');
    expect(output).toContain('[1,"Hello",{"name":"Alice"}]');

    // Iteration output should list items in insertion order (after deletion)
    expect(output).toContain('Iterating over set values:');
    // Check the three lines produced by iteration: 1, Hello, {"name":"Alice"}
    expect(output).toContain('1\nHello\n{"name":"Alice"}');

    // Final size should be reported as 3
    expect(output).toContain('The size of the set is: 3');

    // Confirm there were no uncaught page errors and no console.error messages during load
    // The application is syntactically correct; this assertion checks that the environment executed it cleanly.
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test that there are no interactive form controls (the page is informational only)
  test('No interactive controls (buttons, inputs, forms, selects, textareas) are present', async ({ page }) => {
    const demo = new SetDemoPage(page);

    // Count interactive controls - expected to be zero because the sample only demonstrates a Set and writes to <pre>
    const interactiveCount = await demo.countInteractiveControls();
    expect(interactiveCount).toBe(0);
  });

  // Test the exact output string produced by the script to ensure deterministic behavior
  test('Output text exactly matches the expected multi-line content', async ({ page }) => {
    const demo = new SetDemoPage(page);
    const output = await demo.getOutputText();

    // Build the exact expected output string (including newlines) as produced by the embedded script.
    // This mirrors the concatenation logic in the page's script.
    const expected = [
      'Initial set values:',
      '[1,5,"Hello",{"name":"Alice"}]',
      '', // blank line
      'Does the set contain the number 5? true',
      '', // blank line
      'Set values after deleting 5:',
      '[1,"Hello",{"name":"Alice"}]',
      '', // blank line
      'Iterating over set values:',
      '1',
      'Hello',
      '{"name":"Alice"}',
      '', // blank line
      'The size of the set is: 3',
      '' // final newline
    ].join('\n');

    // Use strict equality to ensure the script output is exactly as expected
    expect(output).toBe(expected);

    // Re-affirm there were no runtime exceptions during execution
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge-case check: ensure duplicate addition of '5' did not result in two occurrences in the initial array
  test('Duplicate values are not duplicated in the Set representation', async ({ page }) => {
    const demo = new SetDemoPage(page);
    const output = await demo.getOutputText();

    // The initial array representation should contain the substring '5' exactly once in the array part.
    // We locate the 'Initial set values:' section and inspect the array content line.
    const initialSectionMatch = output.match(/Initial set values:\n(.+)\n/);
    expect(initialSectionMatch).not.toBeNull();
    const arrayText = initialSectionMatch ? initialSectionMatch[1] : '';
    // Count occurrences of the token '5' in the initial array textual representation
    const occurrencesOfFive = (arrayText.match(/(?<!")\b5\b(?!")/g) || []).length;
    expect(occurrencesOfFive).toBe(1);
  });

  // Accessibility-related check: ensure the output region is present and readable by assistive tech (has text and is not empty)
  test('Output region is accessible and contains readable text', async ({ page }) => {
    const demo = new SetDemoPage(page);
    const outputEl = page.locator(demo.outputSelector);

    // Visible and has non-empty accessible name (innerText should be used as accessible name for <pre>)
    await expect(outputEl).toBeVisible();
    const inner = await outputEl.innerText();
    expect(inner.trim().length).toBeGreaterThan(0);

    // The element should be a <pre> and not disabled
    const tagName = await page.evaluate(selector => {
      const el = document.querySelector(selector);
      return el ? el.tagName.toLowerCase() : null;
    }, demo.outputSelector);
    expect(tagName).toBe('pre');
  });

  // This test explicitly reports any captured runtime errors. It asserts there are none,
  // but if any do appear we provide the messages in the assertion output for debugging.
  test('No JavaScript runtime errors (pageerror) or console.error messages were emitted during load', async ({ page }) => {
    // If errors exist, include the messages to make failures easier to diagnose.
    if (pageErrors.length > 0) {
      const joined = pageErrors.map(e => `${e.name}: ${e.message}`).join('\n---\n');
      // Fail with diagnostic info
      expect(pageErrors.length, `Unexpected page errors:\n${joined}`).toBe(0);
    }
    if (consoleErrors.length > 0) {
      const joined = consoleErrors.map(e => e.text).join('\n---\n');
      expect(consoleErrors.length, `Unexpected console.error messages:\n${joined}`).toBe(0);
    }

    // Final explicit checks
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});