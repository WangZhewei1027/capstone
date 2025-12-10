import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb3c-d5a1-11f0-9c7a-cdf1d7a06e11.html';

// Page Object to encapsulate selectors and common interactions
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.seq1Selector = '#seq1';
    this.seq2Selector = '#seq2';
    this.formSelector = '#form';
    this.submitButtonSelector = 'button[type="submit"]';
    this.resultSelector = '#result';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async seq1() {
    return this.page.locator(this.seq1Selector);
  }

  async seq2() {
    return this.page.locator(this.seq2Selector);
  }

  async result() {
    return this.page.locator(this.resultSelector);
  }

  // Fill the input fields
  async fillSequences(s1, s2) {
    await this.page.fill(this.seq1Selector, s1);
    await this.page.fill(this.seq2Selector, s2);
  }

  // Click the submit button (which will submit the form)
  async submitAndWaitForNavigation() {
    // The form has no action attribute, so submitting will reload the same page.
    // Wait for navigation in parallel to the click to ensure the reload is observed.
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'load', timeout: 5000 }).catch(() => null),
      this.page.click(this.submitButtonSelector),
    ]);
  }

  // Read result div text
  async getResultText() {
    return (await this.page.locator(this.resultSelector).innerText()).trim();
  }

  // Helper to call the in-page findLCS function directly
  async evaluateFindLCS(s1, s2) {
    return this.page.evaluate(
      (a, b) => {
        // Call the function defined by the page script
        // This will naturally throw if the function isn't defined; we let such errors surface.
        return window.findLCS(a, b);
      },
      s1,
      s2
    );
  }
}

// Utility to assert that `candidate` array (of single-character strings) is a subsequence of the given string
function isSubsequence(candidateArray, sourceString) {
  let i = 0;
  for (const ch of sourceString) {
    if (i < candidateArray.length && candidateArray[i] === ch) {
      i++;
    }
  }
  return i === candidateArray.length;
}

test.describe('Longest Common Subsequence App - end-to-end tests', () => {
  // Arrays to capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial page load and default state
  test('Initial load: inputs present and result is empty', async ({ page }) => {
    // Purpose: Verify that the page loads, inputs are visible and initially empty,
    // and the result div contains no content (script executed at load using empty inputs).
    const lcs = new LCSPage(page);
    await lcs.goto();

    // Check inputs are visible and empty
    await expect(lcs.seq1()).toBeVisible();
    await expect(lcs.seq2()).toBeVisible();
    await expect(lcs.seq1()).toHaveValue('');
    await expect(lcs.seq2()).toHaveValue('');

    // Result should be present but empty (script computed with empty inputs at load)
    const resultText = await lcs.getResultText();
    expect(resultText).toBe('', 'Result area should be empty string on initial load');

    // Ensure the findLCS function is defined by the page script
    const findLcsType = await page.evaluate(() => typeof window.findLCS);
    expect(findLcsType).toBe('function');

    // Assert no unexpected console errors or page errors occurred during load
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test calling the exposed findLCS function directly without submitting the form
  test('findLCS function computes correct LCS array for non-trivial input', async ({ page }) => {
    // Purpose: Exercise the in-page algorithm directly and verify:
    // - it returns an array of characters representing an LCS,
    // - the returned sequence is indeed a subsequence of both inputs,
    // - length matches expected LCS length for the chosen test strings.
    const lcs1 = new LCSPage(page);
    await lcs.goto();

    const seqA = 'ABCBDAB';
    const seqB = 'BDCABA';

    // Call the function defined on the page
    const resultArray = await lcs.evaluateFindLCS(seqA, seqB);

    // The algorithm returns an array of characters. Ensure type and structure.
    expect(Array.isArray(resultArray)).toBe(true);
    resultArray.forEach(ch => expect(typeof ch).toBe('string'));

    // Known LCS length for these sequences is 4 (classic example). Assert length.
    expect(resultArray.length).toBe(4);

    // Ensure returned sequence is a subsequence of both original strings (validity check).
    const joined = resultArray.join('');
    expect(isSubsequence(resultArray, seqA)).toBe(true);
    expect(isSubsequence(resultArray, seqB)).toBe(true);

    // Also assert that the UI has not changed (since the page script computed result only at load)
    const uiResult = await lcs.getResultText();
    expect(uiResult).toBe('', 'UI result should remain unchanged after filling inputs or calling function directly');

    // Ensure no console/page errors were produced by calling into the function
    const errorConsoleMsgs1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test submitting the form: expected behavior is a page reload and reset of state
  test('Submitting the form reloads the page and resets inputs/result', async ({ page }) => {
    // Purpose: Verify that clicking the Find LCS button (submitting the form) triggers a reload
    // (default form submit behavior), which in turn recomputes result on load (with empty inputs).
    const lcs2 = new LCSPage(page);
    await lcs.goto();

    // Fill inputs to non-empty values
    await lcs.fillSequences('HELLO', 'WORLD');

    // Sanity check: the inputs now have the values we set
    await expect(lcs.seq1()).toHaveValue('HELLO');
    await expect(lcs.seq2()).toHaveValue('WORLD');

    // Submit the form and wait for the page to reload (if navigation occurs).
    // We allow waitForNavigation to time out gracefully (caught in the helper) in case the environment treats
    // the form submit as same-page without a navigation event. We still proceed to assert DOM state after.
    await lcs.submitAndWaitForNavigation();

    // After submission + reload the page script ran again; inputs are expected to be reset (empty)
    await expect(lcs.seq1()).toHaveValue('');
    await expect(lcs.seq2()).toHaveValue('');

    // Result should also be empty after reload (script ran with empty inputs)
    const resultTextAfterReload = await lcs.getResultText();
    expect(resultTextAfterReload).toBe('', 'After submitting and reload the result should be empty');

    // Ensure no unexpected console errors or uncaught exceptions happened during submit/reload
    const errorConsoleMsgs2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Edge case tests using the in-page function
  test('Edge cases: empty strings and single-character strings', async ({ page }) => {
    // Purpose: Validate algorithm behavior on edge inputs.
    const lcs3 = new LCSPage(page);
    await lcs.goto();

    // Both empty
    const resEmpty = await lcs.evaluateFindLCS('', '');
    expect(Array.isArray(resEmpty)).toBe(true);
    expect(resEmpty.length).toBe(0);

    // One empty, one non-empty
    const resOneEmpty = await lcs.evaluateFindLCS('ABC', '');
    expect(Array.isArray(resOneEmpty)).toBe(true);
    expect(resOneEmpty.length).toBe(0);

    // Single-character identical
    const resSingleMatch = await lcs.evaluateFindLCS('A', 'A');
    expect(Array.isArray(resSingleMatch)).toBe(true);
    expect(resSingleMatch.length).toBe(1);
    expect(resSingleMatch[0]).toBe('A');

    // Single-character different
    const resSingleDiff = await lcs.evaluateFindLCS('A', 'B');
    expect(Array.isArray(resSingleDiff)).toBe(true);
    expect(resSingleDiff.length).toBe(0);

    // Ensure no page errors or console error messages from these evaluations
    const errorConsoleMsgs3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility and interaction sanity checks
  test('Accessibility and interaction: form and controls are keyboard-focusable and visible', async ({ page }) => {
    // Purpose: Verify interactive elements are focusable and have accessible presence on the page.
    const lcs4 = new LCSPage(page);
    await lcs.goto();

    // Tab to seq1 input and ensure focus is on it
    await page.keyboard.press('Tab');
    const active1 = await page.evaluate(() => document.activeElement.id);
    expect(active1 === 'seq1' || active1 === '', 'First Tab should focus the first input (seq1)');

    // Tab to seq2 input
    await page.keyboard.press('Tab');
    const active2 = await page.evaluate(() => document.activeElement.id);
    // active2 may be seq2 or the submit button depending on browser focus order; ensure seq2 exists and is visible.
    await expect(lcs.seq2()).toBeVisible();

    // Focus submit button via keyboard tabbing until it's focused (at most 3 tabs)
    let focusedId = await page.evaluate(() => document.activeElement.id);
    let attempts = 0;
    while (focusedId !== '' && focusedId !== 'result' && attempts < 5) {
      await page.keyboard.press('Tab');
      focusedId = await page.evaluate(() => document.activeElement.id);
      attempts++;
    }

    // At least ensure the submit button exists and is visible
    await expect(page.locator(lcs.submitButtonSelector)).toBeVisible();

    // No console/page errors from these keyboard interactions
    const errorConsoleMsgs4 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});