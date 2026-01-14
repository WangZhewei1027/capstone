import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad4ff20-d59a-11f0-891d-f361d22ca68a.html';

/**
 * Page Object for the Longest Common Subsequence application.
 * Encapsulates selectors and common operations so tests remain readable.
 */
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.text1 = page.locator('#text1');
    this.text2 = page.locator('#text2');
    this.findBtn = page.locator('#find-btn');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for visible elements that represent the initial "Idle" state
    await Promise.all([
      this.text1.waitFor({ state: 'visible' }),
      this.text2.waitFor({ state: 'visible' }),
      this.findBtn.waitFor({ state: 'visible' }),
    ]);
  }

  async fillInputs(str1, str2) {
    await this.text1.fill(str1);
    await this.text2.fill(str2);
  }

  async clickFind() {
    await this.findBtn.click();
  }

  async getResultText() {
    // Use textContent to match what a user would visually see (no HTML markup assumed)
    return (await this.result.textContent()) ?? '';
  }
}

test.describe('Longest Common Subsequence App - FSM States and Transitions', () => {
  // Arrays to collect console errors and page errors
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors before each test
    pageErrors = [];
    consoleErrors = [];

    // Collect uncaught exceptions from the page (e.g., ReferenceError, TypeError, SyntaxError)
    page.on('pageerror', (err) => {
      // store the message for later assertions
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Collect console messages, especially errors logged via console.error
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the app for each test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test we assert there were no unexpected runtime errors
    // The application HTML/JS appears correct, so we expect no uncaught exceptions.
    // If there are errors, they will be surfaced here so the test will fail and expose them.
    expect(pageErrors, `Expected no page errors but found: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `Expected no console.error messages but found: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  test('Initial Idle state renders inputs, button, and empty result (FSM S0_Idle)', async ({ page }) => {
    // This validates the initial FSM state S0_Idle: the inputs and button should be present.
    const app = new LCSPage(page);

    // Ensure the page has the core components as described in the FSM evidence
    await app.text1.waitFor({ state: 'visible' });
    await app.text2.waitFor({ state: 'visible' });
    await app.findBtn.waitFor({ state: 'visible' });
    await app.result.waitFor({ state: 'visible' });

    // Verify placeholders/elements match FSM evidence
    expect(await app.text1.getAttribute('placeholder')).toBe('Enter first string');
    expect(await app.text2.getAttribute('placeholder')).toBe('Enter second string');
    expect(await app.findBtn.textContent()).toBe('Find LCS');

    // Result should initially be empty (no LCS computed yet)
    expect(await app.getResultText()).toBe('');
  });

  test('Clicking Find LCS transitions from Idle to ResultDisplayed and shows LCS for identical strings', async ({ page }) => {
    // This validates the transition S0_Idle -> S1_ResultDisplayed on FindLCS_Click
    const app = new LCSPage(page);
    await app.goto();

    // Setup known identical strings - LCS should be the full string
    await app.fillInputs('abc', 'abc');

    // Confirm pre-click: result empty
    expect(await app.getResultText()).toBe('');

    // Trigger the event (user clicks the Find LCS button)
    await app.clickFind();

    // After transition, the result div should contain the expected text
    const resultText = await app.getResultText();
    expect(resultText.startsWith('Longest Common Subsequence:')).toBe(true);
    expect(resultText).toBe('Longest Common Subsequence: abc');
  });

  test('Clicking Find LCS with no common characters displays empty LCS', async ({ page }) => {
    // Edge case: completely disjoint strings
    const app = new LCSPage(page);
    await app.goto();

    await app.fillInputs('abc', 'def');
    await app.clickFind();

    // Expect the LCS portion to be empty after the label
    const resultText = await app.getResultText();
    expect(resultText).toBe('Longest Common Subsequence: ');
  });

  test('Clicking Find LCS with one empty input displays empty LCS', async ({ page }) => {
    // Edge case: one string empty
    const app = new LCSPage(page);
    await app.goto();

    await app.fillInputs('', 'any');
    await app.clickFind();
    expect(await app.getResultText()).toBe('Longest Common Subsequence: ');

    // Reverse: other string empty
    await app.fillInputs('text', '');
    await app.clickFind();
    expect(await app.getResultText()).toBe('Longest Common Subsequence: ');
  });

  test('Repeated characters and indeterminate choices: verifies LCS for repeated characters', async ({ page }) => {
    // Example: str1 has repeated 'a's, str2 shorter; LCS should be the shorter repetition
    const app = new LCSPage(page);
    await app.goto();

    await app.fillInputs('aaaa', 'aa');
    await app.clickFind();

    const resultText = await app.getResultText();
    expect(resultText).toBe('Longest Common Subsequence: aa');
  });

  test('Unicode and special characters are handled correctly', async ({ page }) => {
    // Ensure the algorithm supports Unicode characters and special symbols
    const app = new LCSPage(page);
    await app.goto();

    await app.fillInputs('héllo😊', 'héllo😊');
    await app.clickFind();

    expect(await app.getResultText()).toBe('Longest Common Subsequence: héllo😊');

    // Slight variation: partial overlap
    await app.fillInputs('héllo😊', 'h😊o');
    await app.clickFind();

    // LCS should include the matching sequence; exact expected value based on algorithm:
    // Given 'héllo😊' and 'h😊o', one valid LCS is 'h😊' or 'ho' depending on char match,
    // but algorithm should pick the longest common subsequence. We assert presence of label and non-empty result.
    const res = await app.getResultText();
    expect(res.startsWith('Longest Common Subsequence:')).toBeTruthy();
    // Should not be the empty LCS for strings that share characters
    expect(res).not.toBe('Longest Common Subsequence: ');
  });

  test('Rapid repeated clicks do not cause runtime errors and result remains stable', async ({ page }) => {
    // Validate the system is stable under multiple rapid clicks (transition can be invoked multiple times)
    const app = new LCSPage(page);
    await app.goto();

    await app.fillInputs('stability', 'stability');

    // Click multiple times quickly
    await Promise.all([
      app.clickFind(),
      app.clickFind(),
      app.clickFind(),
    ]);

    // Result should be stable and correct
    expect(await app.getResultText()).toBe('Longest Common Subsequence: stability');
  });

  test('FSM evidence validation: result div is updated exactly as per transition action', async ({ page }) => {
    // This test checks that the action described in the FSM (setting innerHTML to prefix + lcs)
    // is reflected in the DOM after clicking the button.
    const app = new LCSPage(page);
    await app.goto();

    await app.fillInputs('AGGTAB', 'GXTXAYB'); // classic example where LCS is "GTAB"
    await app.clickFind();

    // We assert the expected visual observable (the result text).
    const resultText = await app.getResultText();

    // The FSM shows exact prefix: "Longest Common Subsequence: "
    expect(resultText.startsWith('Longest Common Subsequence:')).toBe(true);

    // The canonical LCS for these strings is "GTAB"; assert the algorithm produced that value.
    // If the underlying algorithm yields a different valid LCS of same length, this assertion may fail.
    // The implementation in the page uses a deterministic DP backtrace so we assert the known expected result.
    expect(resultText).toBe('Longest Common Subsequence: GTAB');
  });
});