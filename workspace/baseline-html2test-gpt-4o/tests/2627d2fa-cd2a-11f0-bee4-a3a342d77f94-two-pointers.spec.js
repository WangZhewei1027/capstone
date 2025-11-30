import { test, expect } from '@playwright/test';

// URL of the static HTML to test
const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2fa-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object Model for the Two Pointers example page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Navigate to the page and wait for load
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Get the raw text content of the #array element
  async getArrayText() {
    return (await this.page.locator('#array').textContent())?.trim();
  }

  // Get the target sum text
  async getTargetText() {
    return (await this.page.locator('#target').textContent())?.trim();
  }

  // Click the "Find Pairs" button by role + name (accessible)
  async clickFindPairs() {
    // Use locator by role ensuring accessibility checks
    await this.page.getByRole('button', { name: 'Find Pairs' }).click();
  }

  // Get the result text shown in the #result div
  async getResultText() {
    return (await this.page.locator('#result').textContent())?.trim();
  }

  // Get computed styles for #result (color and font-weight)
  async getResultStyles() {
    return this.page.$eval('#result', el => {
      const cs = window.getComputedStyle(el);
      return {
        color: cs.color,
        fontWeight: cs.fontWeight
      };
    });
  }

  // Set the visible array text in the DOM (this does not modify the internal function's hardcoded array)
  async setVisibleArrayText(text) {
    await this.page.evaluate((txt) => {
      const el = document.getElementById('array');
      if (el) el.textContent = txt;
    }, text);
  }
}

test.describe('Two Pointers Application - Two Pointers Example Page', () => {
  // Collect console messages and page errors for each test to assert
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events and collect them
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Listen to uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Nothing else here; navigation is done in individual tests via page object
  });

  test.afterEach(async () => {
    // No special teardown required; listeners are attached to the page fixture which is cleaned by Playwright
    // But we keep the arrays around to allow assertions in tests themselves
  });

  test('Initial page load shows expected static content and controls', async ({ page }) => {
    // Purpose: Verify that on initial load the array, target, and button are visible,
    // and that the result area is initially empty.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Check array text content
    const arrayText = await twoPointers.getArrayText();
    expect(arrayText).toBe('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]');

    // Check target text content
    const targetText = await twoPointers.getTargetText();
    expect(targetText).toBe('10');

    // The result div should exist but be empty initially
    const resultText = await twoPointers.getResultText();
    // If the page hasn't run findPairs yet, the result div should have no content
    expect(resultText).toBe('');

    // The "Find Pairs" button should be present and accessible by role/name
    const button = page.getByRole('button', { name: 'Find Pairs' });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Ensure there are no console errors or page errors on initial load
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking "Find Pairs" computes and displays the correct pairs', async ({ page }) => {
    // Purpose: Simulate the user clicking the button and assert the DOM updates to show expected pairs.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Click the Find Pairs button
    await twoPointers.clickFindPairs();

    // Expected result string based on the implementation
    const expected = 'Pairs: [1, 9], [2, 8], [3, 7], [4, 6]';

    // Verify result text equals expected output
    const resultText = await twoPointers.getResultText();
    expect(resultText).toBe(expected);

    // Verify visual styling applied via CSS (color should be green and font-weight bold)
    const styles = await twoPointers.getResultStyles();
    // computed color may be returned as rgb(...) depending on browser
    expect(styles.color === 'green' || styles.color === 'rgb(0, 128, 0)').toBeTruthy();
    // fontWeight can be '700' or 'bold' depending on UA stylesheet
    expect(['700', 'bold']).toContain(styles.fontWeight);

    // Ensure no console errors nor page errors were produced by the click action
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking the button multiple times is idempotent and yields the same result', async ({ page }) => {
    // Purpose: Ensure repeated user interactions do not produce divergent or accumulating UI state
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Click multiple times
    await twoPointers.clickFindPairs();
    const firstResult = await twoPointers.getResultText();
    await twoPointers.clickFindPairs();
    const secondResult = await twoPointers.getResultText();

    // Both results should be identical
    expect(firstResult).toBe(secondResult);

    // Confirm content matches expected output
    expect(firstResult).toBe('Pairs: [1, 9], [2, 8], [3, 7], [4, 6]');

    // No console/page errors should be emitted by subsequent clicks
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Visible DOM changes do not affect internal computation (function uses hardcoded array)', async ({ page }) => {
    // Purpose: Demonstrate that the implementation uses an internal array,
    // so changing the visible array text in the DOM does not change behavior.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Change the visible array text to something else (simulate user editing DOM)
    await twoPointers.setVisibleArrayText('[]');

    // Sanity check: the visible array text was updated
    const modifiedArrayText = await twoPointers.getArrayText();
    expect(modifiedArrayText).toBe('[]');

    // Click the Find Pairs button - the underlying function uses a hardcoded JS array,
    // so the result should remain the same as before
    await twoPointers.clickFindPairs();
    const resultText = await twoPointers.getResultText();
    expect(resultText).toBe('Pairs: [1, 9], [2, 8], [3, 7], [4, 6]');

    // No console/page errors should be emitted by this action
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility: "Find Pairs" button is reachable by role and keyboard-focusable', async ({ page }) => {
    // Purpose: Check basic accessibility features: the button is exposed via ARIA role and keyboard focus works
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    const button = page.getByRole('button', { name: 'Find Pairs' });
    await expect(button).toBeVisible();

    // Focus the button via keyboard tabbing
    await page.keyboard.press('Tab');
    // After one tab the button may or may not be focused depending on page structure; explicitly focus if not focused.
    const isFocused = await button.evaluate(el => el === document.activeElement);
    if (!isFocused) {
      await button.focus();
    }
    // Now assert the button is focused
    const focusedNow = await button.evaluate(el => el === document.activeElement);
    expect(focusedNow).toBeTruthy();

    // Trigger click via keyboard (Enter)
    await page.keyboard.press('Enter');

    // Check that a result appears
    const resultText = await twoPointers.getResultText();
    expect(resultText.length).toBeGreaterThan(0);

    // No console/page errors should be emitted by keyboard interaction
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Observe console messages and page errors while interacting with the app', async ({ page }) => {
    // Purpose: Explicitly collect console and page error information during a full interaction and assert none occurred.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Perform a set of interactions
    await twoPointers.clickFindPairs();
    await twoPointers.setVisibleArrayText('[100]');
    await twoPointers.clickFindPairs();

    // After interactions, inspect collected messages
    // Collect any console messages (info/debug/warn/error) for reporting
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    // If there are console errors or page errors, include them in the assertion message for debugging
    expect(errorConsoleMessages.length, `Unexpected console.error calls: ${JSON.stringify(errorConsoleMessages)}`).toBe(0);
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });
});