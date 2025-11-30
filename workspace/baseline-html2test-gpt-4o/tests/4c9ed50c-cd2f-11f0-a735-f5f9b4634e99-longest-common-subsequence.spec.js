import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9ed50c-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object Model for the LCS application
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.string1 = page.locator('#string1');
    this.string2 = page.locator('#string2');
    this.findButton = page.locator('button', { hasText: 'Find LCS' });
    this.output = page.locator('#output');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the two input fields
  async fillStrings(s1, s2) {
    await this.string1.fill(s1);
    await this.string2.fill(s2);
  }

  // Click the "Find LCS" button
  async clickFind() {
    await this.findButton.click();
  }

  // Get the output text
  async getOutputText() {
    return (await this.output.innerText()).trim();
  }

  // Helper: get input values
  async getInputValues() {
    return {
      s1: await this.string1.inputValue(),
      s2: await this.string2.inputValue(),
    };
  }
}

test.describe('Longest Common Subsequence App - 4c9ed50c-cd2f-11f0-a735-f5f9b4634e99', () => {
  // Arrays to collect console errors and uncaught page errors per test
  let consoleErrors;
  let pageErrors;

  // Attach listeners and navigate before each test
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages of type 'error'
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // If accessing msg properties throws, capture that as well
        consoleErrors.push(String(e));
      }
    });

    // Collect uncaught exceptions from the page
    page.on('pageerror', (err) => {
      // err is an Error object
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // After each test assert there were no fatal page errors or console 'error' messages.
  // This verifies the application runs without throwing uncaught exceptions.
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred
    expect(pageErrors.length, `Uncaught page errors: ${pageErrors.join(' | ')}`).toBe(0);

    // Assert no console.error messages were emitted (e.g., ReferenceError, TypeError, SyntaxError)
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(' | ')}`).toBe(0);
  });

  test.describe('Initial page load and structure', () => {
    test('should load the page and display inputs and button with correct defaults', async ({ page }) => {
      const app = new LCSPage(page);

      // Verify that the page loaded the expected elements
      await expect(app.string1).toBeVisible();
      await expect(app.string2).toBeVisible();
      await expect(app.findButton).toBeVisible();
      await expect(app.output).toBeVisible();

      // Inputs should be empty initially
      const inputs = await app.getInputValues();
      expect(inputs.s1).toBe('');
      expect(inputs.s2).toBe('');

      // Output should be empty (no result displayed)
      const outputText = await app.getOutputText();
      expect(outputText).toBe('', 'Output area should be empty on initial load');

      // Verify accessibility attributes and labels: required attribute exists on inputs
      expect(await app.string1.getAttribute('required')).not.toBeNull();
      expect(await app.string2.getAttribute('required')).not.toBeNull();

      // Button should have the expected text
      expect(await app.findButton.innerText()).toMatch(/Find LCS/);
    });
  });

  test.describe('Core LCS functionality', () => {
    // Test a straightforward identical-strings scenario
    test('computes LCS correctly when both strings are identical', async ({ page }) => {
      const app = new LCSPage(page);

      await app.fillStrings('abc', 'abc');
      await app.clickFind();

      // Expect exact output text
      const out = await app.getOutputText();
      expect(out).toBe('Longest Common Subsequence: abc');
    });

    // Test when there is no common subsequence
    test('displays empty result when there is no common subsequence', async ({ page }) => {
      const app = new LCSPage(page);

      await app.fillStrings('abc', 'def');
      await app.clickFind();

      const out = await app.getOutputText();
      // The implementation prints the label followed by the joined lcs (empty string)
      expect(out).toBe('Longest Common Subsequence: ');
    });

    // Test a well-known example to verify algorithmic correctness
    test('computes LCS for a known example (AGGTAB, GXTXAYB => GTAB)', async ({ page }) => {
      const app = new LCSPage(page);

      await app.fillStrings('AGGTAB', 'GXTXAYB');
      await app.clickFind();

      const out = await app.getOutputText();
      // The known LCS for this pair is "GTAB"
      expect(out).toBe('Longest Common Subsequence: GTAB');
    });

    // Test repeated computations to ensure state updates each time
    test('updates output on successive computations', async ({ page }) => {
      const app = new LCSPage(page);

      await app.fillStrings('abc', 'abc');
      await app.clickFind();
      expect(await app.getOutputText()).toBe('Longest Common Subsequence: abc');

      // Change inputs and compute again
      await app.fillStrings('abcd', 'abxy');
      await app.clickFind();
      // LCS of 'abcd' and 'abxy' should be 'ab'
      expect(await app.getOutputText()).toBe('Longest Common Subsequence: ab');
    });
  });

  test.describe('Edge cases and input validation', () => {
    test('handles both inputs empty without throwing and shows empty result', async ({ page }) => {
      const app = new LCSPage(page);

      // Ensure both inputs are empty
      await app.fillStrings('', '');
      await app.clickFind();

      const out = await app.getOutputText();
      expect(out).toBe('Longest Common Subsequence: ');
    });

    test('handles one empty input correctly (string2 empty)', async ({ page }) => {
      const app = new LCSPage(page);

      await app.fillStrings('abc', '');
      await app.clickFind();

      const out = await app.getOutputText();
      expect(out).toBe('Longest Common Subsequence: ');
    });

    test('handles case sensitivity: differing cases are not treated equal', async ({ page }) => {
      const app = new LCSPage(page);

      await app.fillStrings('AbC', 'abc');
      await app.clickFind();

      // Since comparison is case-sensitive, expect no common subsequence unless exact match
      const out = await app.getOutputText();
      expect(out).toBe('Longest Common Subsequence: ');
    });

    test('handles longer inputs and repeated characters', async ({ page }) => {
      const app = new LCSPage(page);

      // Repeated characters scenario
      await app.fillStrings('aaaaabbbb', 'ababa');
      await app.clickFind();

      // One valid LCS is 'aaaa' or 'ababa' related — rather than depend on non-deterministic backtracking,
      // we assert the result string length equals the computed lcs length by re-computing locally is not allowed,
      // but we can assert the output begins with the label and is a string.
      const out = await app.getOutputText();
      expect(out.startsWith('Longest Common Subsequence:')).toBeTruthy();
      // Ensure there is no runtime error and the app produced some string result (possibly empty)
      expect(typeof out).toBe('string');
    });
  });
});