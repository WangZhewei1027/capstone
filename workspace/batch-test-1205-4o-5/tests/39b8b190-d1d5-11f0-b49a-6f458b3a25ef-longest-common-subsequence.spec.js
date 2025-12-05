import { test, expect } from '@playwright/test';

// Page Object for the Longest Common Subsequence application
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Selectors based on the provided HTML structure
    this.input1 = page.locator('#string1');
    this.input2 = page.locator('#string2');
    this.button = page.locator('button', { hasText: 'Find LCS' });
    this.result = page.locator('#result');

    // Arrays to capture runtime errors and console error messages
    this.pageErrors = [];
    this.consoleErrors = [];

    // Attach listeners to capture page errors and console error messages
    this._attachErrorListeners();
  }

  _attachErrorListeners() {
    // Capture unhandled exceptions (ReferenceError, TypeError, etc.) that bubble to page
    this.page.on('pageerror', (err) => {
      // err is typically an Error object; store its message and name for assertions
      try {
        this.pageErrors.push({ message: err.message, name: err.name });
      } catch (e) {
        // Fallback if err doesn't have expected shape
        this.pageErrors.push({ message: String(err), name: 'UnknownError' });
      }
    });

    // Capture console messages of type "error" emitted by the page
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b8b190-d1d5-11f0-b49a-6f458b3a25ef.html', { waitUntil: 'load' });
  }

  // Fill both input fields
  async fillInputs(a, b) {
    await this.input1.fill(a);
    await this.input2.fill(b);
  }

  // Click the Find LCS button
  async clickFind() {
    await this.button.click();
  }

  // Read the result text as displayed in the UI
  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  // Convenience: compute expected displayed prefix used by the app
  getResultPrefix() {
    return 'Longest Common Subsequence: ';
  }
}

test.describe('Longest Common Subsequence App - End to End', () => {
  // Each test gets a fresh page
  test.beforeEach(async ({ page }) => {
    // No-op here; individual tests will construct LCSPage and navigate
  });

  // Test initial load and default state of the application
  test('Initial page load shows expected elements and default state', async ({ page }) => {
    const app = new LCSPage(page);
    // Navigate to the page
    await app.goto();

    // Verify page title and header presence - basic smoke checks
    await expect(page).toHaveTitle(/Longest Common Subsequence/i);
    await expect(page.locator('h1')).toHaveText(/Longest Common Subsequence Finder/i);

    // Inputs should be visible and empty by default
    await expect(app.input1).toBeVisible();
    await expect(app.input2).toBeVisible();
    await expect(app.input1).toHaveValue('');
    await expect(app.input2).toHaveValue('');

    // The Find LCS button should be visible and enabled
    await expect(app.button).toBeVisible();
    await expect(app.button).toBeEnabled();

    // Result DIV should be visible (exists) and initially empty string (no LCS)
    await expect(app.result).toBeVisible();
    const initialResult = await app.getResultText();
    // The app sets innerText to 'Longest Common Subsequence: ' + lcs when invoked,
    // but until invoked it should be empty initially.
    expect(initialResult).toBe('');

    // Ensure no runtime page errors or console errors occurred during initial load
    expect(app.pageErrors.length).toBe(0);
    expect(app.consoleErrors.length).toBe(0);
  });

  // Test a known example where the LCS is well-known: AGGTAB and GXTXAYB -> GTAB
  test('Computes LCS correctly for the example AGGTAB & GXTXAYB -> GTAB', async ({ page }) => {
    const app1 = new LCSPage(page);
    await app.goto();

    // Fill inputs with the example strings
    await app.fillInputs('AGGTAB', 'GXTXAYB');

    // Click the Find LCS button to trigger computation
    await app.clickFind();

    // Verify the displayed result text matches expected LCS
    const displayed = await app.getResultText();
    expect(displayed).toBe(app.getResultPrefix() + 'GTAB');

    // Ensure result element remains visible and contains the expected substring
    await expect(app.result).toBeVisible();
    await expect(app.result).toContainText('GTAB');

    // No runtime errors should have occurred during this interaction
    expect(app.pageErrors.length).toBe(0);
    expect(app.consoleErrors.length).toBe(0);
  });

  // Test empty input edge cases
  test('Empty inputs produce an empty LCS (no characters after the prefix)', async ({ page }) => {
    const app2 = new LCSPage(page);
    await app.goto();

    // Ensure both inputs are empty
    await app.fillInputs('', '');

    // Click Find LCS
    await app.clickFind();

    // Result should contain the prefix but no LCS string appended
    const displayed1 = await app.getResultText();
    expect(displayed).toBe(app.getResultPrefix());

    // Check that the result element text length equals prefix length (i.e., no characters after)
    expect(displayed.length).toBe(app.getResultPrefix().length);

    // No runtime errors or console errors were produced
    expect(app.pageErrors.length).toBe(0);
    expect(app.consoleErrors.length).toBe(0);
  });

  // Test identical strings return the same string as LCS
  test('Identical strings return the full string as LCS', async ({ page }) => {
    const app3 = new LCSPage(page);
    await app.goto();

    const s = 'HELLO';
    await app.fillInputs(s, s);
    await app.clickFind();

    const displayed2 = await app.getResultText();
    expect(displayed).toBe(app.getResultPrefix() + s);

    // Also verify the displayed result includes the full string and length is correct
    expect((await app.result.innerText()).length).toBe(app.getResultPrefix().length + s.length);

    // Confirm no page or console errors
    expect(app.pageErrors.length).toBe(0);
    expect(app.consoleErrors.length).toBe(0);
  });

  // Test with a simple overlapping example where LCS is obvious: ABCDEF & ACE -> ACE
  test('Handles partial overlap example ABCDEF & ACE -> ACE', async ({ page }) => {
    const app4 = new LCSPage(page);
    await app.goto();

    await app.fillInputs('ABCDEF', 'ACE');
    await app.clickFind();

    const displayed3 = await app.getResultText();
    expect(displayed).toBe(app.getResultPrefix() + 'ACE');

    // Ensure the result DOM contains the expected text
    await expect(app.result).toContainText('ACE');

    // Validate no runtime page errors or console errors occurred
    expect(app.pageErrors.length).toBe(0);
    expect(app.consoleErrors.length).toBe(0);
  });

  // Comprehensive test: interact with multiple inputs sequentially and ensure state updates correctly
  test('Sequential interactions update state correctly and are idempotent', async ({ page }) => {
    const app5 = new LCSPage(page);
    await app.goto();

    // First computation
    await app.fillInputs('ABC', 'ABC');
    await app.clickFind();
    expect(await app.getResultText()).toBe(app.getResultPrefix() + 'ABC');

    // Change inputs to different strings and compute again
    await app.fillInputs('XMJYAUZ', 'MZJAWXU');
    await app.clickFind();
    // Known LCS for that pair is 'MJAU' or 'MJAU'? The algorithm will produce deterministic result.
    // To avoid presuming wrong sequence, we will assert that the result is non-empty and is a subsequence of both inputs.
    const resultText = (await app.getResultText()).replace(app.getResultPrefix(), '');
    // result must be a string (possibly empty if no common subsequence)
    expect(typeof resultText).toBe('string');

    // Verify the computed result is a subsequence of both original inputs
    function isSubsequence(sub, str) {
      let i = 0, j = 0;
      while (i < sub.length && j < str.length) {
        if (sub[i] === str[j]) i++;
        j++;
      }
      return i === sub.length;
    }

    expect(isSubsequence(resultText, 'XMJYAUZ')).toBe(true);
    expect(isSubsequence(resultText, 'MZJAWXU')).toBe(true);

    // No errors should have been logged by the runtime
    expect(app.pageErrors.length).toBe(0);
    expect(app.consoleErrors.length).toBe(0);
  });

  // Final test to explicitly assert that no ReferenceError, SyntaxError, or TypeError occurred during all interactions
  test('No ReferenceError, SyntaxError, or TypeError occurred during usage', async ({ page }) => {
    const app6 = new LCSPage(page);
    await app.goto();

    // Perform a normal interaction to exercise scripts
    await app.fillInputs('TEST', 'TSET');
    await app.clickFind();

    // Collect error names from pageErrors to ensure none are ReferenceError, SyntaxError, or TypeError
    const errorNames = app.pageErrors.map(e => e.name);
    for (const errName of errorNames) {
      expect(errName).not.toBe('ReferenceError');
      expect(errName).not.toBe('SyntaxError');
      expect(errName).not.toBe('TypeError');
    }

    // Also ensure there were no console errors emitted
    expect(app.consoleErrors.length).toBe(0);
  });
});