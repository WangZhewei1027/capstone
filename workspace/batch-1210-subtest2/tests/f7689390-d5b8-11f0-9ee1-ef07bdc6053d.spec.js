import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7689390-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the LCS application
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.string1 = page.locator('#string1');
    this.string2 = page.locator('#string2');
    this.findButton = page.locator('button[onclick="findLCS()"]');
    this.result = page.locator('#result');
    this.header = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async setStrings(a, b) {
    await this.string1.fill('');
    await this.string2.fill('');
    if (a !== null) await this.string1.fill(String(a));
    if (b !== null) await this.string2.fill(String(b));
  }

  async clickFind() {
    await this.findButton.click();
  }

  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  async getHeaderText() {
    return (await this.header.textContent()) ?? '';
  }
}

// Helper: compute LCS (same algorithm as app) to derive expected results in tests
function computeLCS(str1, str2) {
  const dp = Array.from({ length: str1.length + 1 }, () =>
    Array(str2.length + 1).fill(0)
  );

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let lcs = '';
  let i = str1.length,
    j = str2.length;

  while (i > 0 && j > 0) {
    if (str1[i - 1] === str2[j - 1]) {
      lcs = str1[i - 1] + lcs;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

test.describe('LCS Visualizer - f7689390-d5b8-11f0-9ee1-ef07bdc6053d', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Setup/teardown for each test: navigate and collect console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Collect runtime page errors (unhandled exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Collect console messages of type error
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : undefined,
        });
      }
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Assert no unexpected runtime/page errors were emitted during the test.
    // The application HTML/JS is used as-is; these assertions ensure the runtime is clean.
    expect(pageErrors, 'No page errors should have occurred').toEqual([]);
    expect(consoleErrors, 'No console.error messages should have been emitted').toEqual([]);
  });

  test('Initial state (S0_Idle) renders expected header and empty result', async ({ page }) => {
    // Validate initial Idle state per FSM: header exists and result area is empty
    const app = new LCSPage(page);

    // header evidence: "<h1>Longest Common Subsequence (LCS)</h1>"
    const headerText = await app.getHeaderText();
    expect(headerText).toBe('Longest Common Subsequence (LCS)');

    // Result area should exist and be empty initially
    const resultText = await app.getResultText();
    expect(resultText.trim()).toBe(''); // pre is empty on initial render
  });

  test('Transition S0 -> S1: Find LCS for simple strings', async ({ page }) => {
    // This test validates the primary transition: user inputs two strings and clicks "Find LCS"
    const app = new LCSPage(page);

    const a = 'ABCDEF';
    const b = 'ACE';
    const expectedLCS = computeLCS(a, b); // expected "ACE"

    // Enter inputs
    await app.setStrings(a, b);

    // Click the button (event: FindLCS_Click)
    await app.clickFind();

    // Verify result content contains the expected prefix and LCS
    const result = await app.getResultText();
    expect(result).toContain('Longest Common Subsequence:');
    expect(result.trim()).toBe(`Longest Common Subsequence: ${expectedLCS}`);
  });

  test('Edge case: one empty input yields empty LCS', async ({ page }) => {
    // Validate behavior when one or both inputs are empty strings
    const app = new LCSPage(page);

    // Case A: first empty, second non-empty
    await app.setStrings('', 'ABC');
    await app.clickFind();
    let result = await app.getResultText();
    expect(result.trim()).toBe('Longest Common Subsequence: ' + computeLCS('', 'ABC'));

    // Case B: both empty
    await app.setStrings('', '');
    await app.clickFind();
    result = await app.getResultText();
    expect(result.trim()).toBe('Longest Common Subsequence: ' + computeLCS('', ''));

    // Case C: second empty, first non-empty
    await app.setStrings('XYZ', '');
    await app.clickFind();
    result = await app.getResultText();
    expect(result.trim()).toBe('Longest Common Subsequence: ' + computeLCS('XYZ', ''));
  });

  test('No common subsequence: result is empty LCS string', async ({ page }) => {
    // Validate when there are no shared characters between strings
    const app = new LCSPage(page);

    const a = 'ABC';
    const b = 'DEF';
    const expectedLCS = computeLCS(a, b); // expected ""

    await app.setStrings(a, b);
    await app.clickFind();

    const result = await app.getResultText();
    expect(result.trim()).toBe(`Longest Common Subsequence: ${expectedLCS}`);
    expect(expectedLCS).toBe(''); // ensure expectation is indeed empty
  });

  test('Identical strings produce themselves as LCS', async ({ page }) => {
    // When both strings are identical, the LCS should be the string itself
    const app = new LCSPage(page);

    const s = 'LONGSTRING';
    await app.setStrings(s, s);
    await app.clickFind();

    const result = await app.getResultText();
    expect(result.trim()).toBe(`Longest Common Subsequence: ${s}`);
  });

  test('Whitespace and special characters are handled correctly', async ({ page }) => {
    // Ensure that spaces and punctuation are considered like any other character
    const app = new LCSPage(page);

    const a = 'a b,c!';
    const b = 'ab,c!';
    // compute expected via same algorithm
    const expected = computeLCS(a, b);

    await app.setStrings(a, b);
    await app.clickFind();

    const result = await app.getResultText();
    expect(result.trim()).toBe(`Longest Common Subsequence: ${expected}`);
  });

  test('Multiple sequential clicks update result consistently', async ({ page }) => {
    // Ensure repeated interactions produce predictable and correct updates
    const app = new LCSPage(page);

    // First pair
    await app.setStrings('AXY', 'AYX');
    await app.clickFind();
    let result = await app.getResultText();
    expect(result.trim()).toBe(`Longest Common Subsequence: ${computeLCS('AXY', 'AYX')}`);

    // Second pair
    await app.setStrings('HELLO', 'HEL');
    await app.clickFind();
    result = await app.getResultText();
    expect(result.trim()).toBe(`Longest Common Subsequence: ${computeLCS('HELLO', 'HEL')}`);

    // Third pair - no common chars
    await app.setStrings('123', 'abc');
    await app.clickFind();
    result = await app.getResultText();
    expect(result.trim()).toBe(`Longest Common Subsequence: ${computeLCS('123', 'abc')}`);
  });

  test('Verifies presence of expected DOM elements described in FSM components', async ({ page }) => {
    // Check all components from FSM are present: #string1, #string2, button with onclick findLCS(), #result
    const app = new LCSPage(page);

    await expect(app.string1).toBeVisible();
    await expect(app.string2).toBeVisible();
    await expect(app.findButton).toBeVisible();
    await expect(app.result).toBeVisible();

    // Check button text matches evidence
    const btnText = await app.findButton.textContent();
    expect(btnText.trim()).toBe('Find LCS');
  });
});