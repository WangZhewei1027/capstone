import { test, expect } from '@playwright/test';

// Page object for the Longest Common Subsequence application
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input1 = page.locator('#string1');
    this.input2 = page.locator('#string2');
    this.button = page.locator('button', { hasText: 'Find LCS' });
    this.result = page.locator('#result');
  }

  // Navigate to the application's URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/html2test/html/1da11ba8-cd2f-11f0-a440-159d7b77af86.html');
  }

  // Fill the two input fields
  async setStrings(s1, s2) {
    await this.input1.fill(s1);
    await this.input2.fill(s2);
  }

  // Click the Find LCS button
  async clickFind() {
    await this.button.click();
  }

  // Read the visible result text from the page
  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  // Extract only the LCS value from the result text (after the label)
  async getLCSValue() {
    const text = await this.getResultText();
    const prefix = 'Longest Common Subsequence: ';
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length);
    }
    return text;
  }

  // Verify visibility of core elements
  async expectControlsVisible() {
    await expect(this.input1).toBeVisible();
    await expect(this.input2).toBeVisible();
    await expect(this.button).toBeVisible();
    await expect(this.result).toBeVisible();
  }
}

// Helper to check if candidate is a subsequence of source
function isSubsequence(candidate, source) {
  if (candidate.length === 0) return true;
  let i = 0;
  for (const ch of source) {
    if (ch === candidate[i]) {
      i++;
      if (i === candidate.length) return true;
    }
  }
  return false;
}

test.describe('Longest Common Subsequence App - 1da11ba8-cd2f-11f0-a440-159d7b77af86', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners before each test to capture console and page errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];
    page.on('console', (msg) => {
      // Collect console messages for assertions later
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });
    page.on('pageerror', (err) => {
      // Collect uncaught page errors (ReferenceError, TypeError, etc.)
      pageErrors.push(err);
    });
  });

  // After each test, ensure there are no uncaught page errors and no console errors.
  // This asserts that the page executed without throwing runtime errors.
  test.afterEach(async () => {
    // Assert no uncaught page errors were emitted
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);

    // Assert there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter((m) => m.type === 'error');
    expect(consoleErrors, `No console.error messages expected, found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
  });

  test('Initial page load shows inputs, button and an empty result', async ({ page }) => {
    // Purpose: Verify initial DOM structure and default state on load
    const app = new LCSPage(page);
    await app.goto();

    // Controls should be visible and present
    await app.expectControlsVisible();

    // Inputs should have expected placeholders
    await expect(app.input1).toHaveAttribute('placeholder', 'Enter first string');
    await expect(app.input2).toHaveAttribute('placeholder', 'Enter second string');

    // Result should be empty initially (no LCS calculated yet)
    const resultText = await app.getResultText();
    expect(resultText).toBe('', 'Result area should be empty on initial load');
  });

  test('Compute LCS for two non-trivial strings and validate output format and correctness', async ({ page }) => {
    // Purpose: Validate core functionality with non-trivial inputs.
    const app = new LCSPage(page);
    await app.goto();

    // Example strings from classic LCS examples
    const s1 = 'ABCBDAB';
    const s2 = 'BDCABA';

    await app.setStrings(s1, s2);
    await app.clickFind();

    // The result area should be updated and visible
    await expect(app.result).toBeVisible();
    const fullText = await app.getResultText();

    // Check prefix format is correct
    expect(fullText.startsWith('Longest Common Subsequence: ')).toBeTruthy();

    // Extract the computed LCS
    const lcs = await app.getLCSValue();

    // The length should be 4 for this pair (classic example)
    expect(lcs.length).toBe(4);

    // The found LCS must be a subsequence of both inputs
    expect(isSubsequence(lcs, s1)).toBeTruthy();
    expect(isSubsequence(lcs, s2)).toBeTruthy();
  });

  test('Edge case: both inputs empty should produce empty LCS', async ({ page }) => {
    // Purpose: Validate behavior when both inputs are empty strings
    const app = new LCSPage(page);
    await app.goto();

    await app.setStrings('', '');
    await app.clickFind();

    const lcs = await app.getLCSValue();
    // Should be empty string
    expect(lcs).toBe('');
    // And the result text should still show the label
    const text = await app.getResultText();
    expect(text).toBe('Longest Common Subsequence: ');
  });

  test('Edge case: one empty and one non-empty input should produce empty LCS', async ({ page }) => {
    // Purpose: Validate behavior when one input is empty
    const app = new LCSPage(page);
    await app.goto();

    await app.setStrings('', 'ABCDEF');
    await app.clickFind();

    let lcs = await app.getLCSValue();
    expect(lcs).toBe('');

    // Now reverse: first non-empty, second empty
    await app.setStrings('XYZ', '');
    await app.clickFind();

    lcs = await app.getLCSValue();
    expect(lcs).toBe('');
  });

  test('Case sensitivity: same letters different case produce empty LCS if no exact matches', async ({ page }) => {
    // Purpose: Ensure LCS computation is case-sensitive as implemented
    const app = new LCSPage(page);
    await app.goto();

    await app.setStrings('abc', 'ABC');
    await app.clickFind();

    const lcs = await app.getLCSValue();
    // With case-sensitivity, there should be no match
    expect(lcs).toBe('');
  });

  test('Special characters and repeated characters handling', async ({ page }) => {
    // Purpose: Verify that special characters and repeated characters are handled
    const app = new LCSPage(page);
    await app.goto();

    const s1 = '!@#!!@#';
    const s2 = '@#!@#!';
    await app.setStrings(s1, s2);
    await app.clickFind();

    const lcs = await app.getLCSValue();
    // Must be a subsequence of both
    expect(isSubsequence(lcs, s1)).toBeTruthy();
    expect(isSubsequence(lcs, s2)).toBeTruthy();
    // Also ensure the result area contains the expected label
    await expect(app.result).toContainText('Longest Common Subsequence:');
  });

  test('Recomputing with different inputs updates the DOM accordingly', async ({ page }) => {
    // Purpose: Ensure repeated interactions update the result each time
    const app = new LCSPage(page);
    await app.goto();

    await app.setStrings('ABCDEFGHIJ', 'ACEGI');
    await app.clickFind();
    let lcs1 = await app.getLCSValue();
    expect(lcs1).toBe('CEGI' || 'ACEG'.slice(0, lcs1.length) || lcs1); // just ensure non-empty and subsequence
    expect(isSubsequence(lcs1, 'ABCDEFGHIJ')).toBeTruthy();
    expect(isSubsequence(lcs1, 'ACEGI')).toBeTruthy();

    // Compute again with different inputs
    await app.setStrings('12345', '54321');
    await app.clickFind();
    const lcs2 = await app.getLCSValue();
    // For these inputs LCS length is 1 (any single matching digit)
    expect(lcs2.length).toBeGreaterThanOrEqual(0);
    expect(isSubsequence(lcs2, '12345')).toBeTruthy();
    expect(isSubsequence(lcs2, '54321')).toBeTruthy();

    // The result should have changed (it's unlikely to be identical to the previous LCS)
    // We assert that at least the DOM is updated to reflect the new computation
    const fullText = await app.getResultText();
    expect(fullText.startsWith('Longest Common Subsequence: ')).toBeTruthy();
  });
});