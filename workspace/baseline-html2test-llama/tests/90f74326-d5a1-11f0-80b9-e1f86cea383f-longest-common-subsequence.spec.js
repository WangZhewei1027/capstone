import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f74326-d5a1-11f0-80b9-e1f86cea383f.html';

// Page object encapsulating interactions with the LCS app
class LCSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.seq1 = page.locator('#seq1');
    this.seq2 = page.locator('#seq2');
    this.submitBtn = page.locator('#submit');
    this.result = page.locator('#result');
    this.form = page.locator('#form');
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill both sequence textareas
  async fillSequences(s1, s2) {
    await this.seq1.fill(s1);
    await this.seq2.fill(s2);
  }

  // Submit the form by clicking the submit button
  async submit() {
    await this.submitBtn.click();
  }

  // Get the result DIV text
  async getResultText() {
    return (await this.result.textContent()) ?? '';
  }

  // Wait for an alert dialog and return its message
  async waitForDialogAndAccept() {
    return new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const message = dialog.message();
        await dialog.accept();
        resolve(message);
      });
    });
  }

  // Get computed style property of result element (evaluated in page context)
  async getResultComputedStyle(prop) {
    return this.page.evaluate(
      ([propSelector, property]) => {
        const el = document.querySelector('#result');
        if (!el) return null;
        return window.getComputedStyle(el)[property];
      },
      [null, prop]
    );
  }
}

test.describe('Longest Common Subsequence App - Integration Tests', () => {
  // Arrays to collect console messages and page errors for assertions
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset capture arrays
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Ensure there were no uncaught page errors during the test run
    expect(pageErrors.length, `Expected no uncaught page errors, but found: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    // Ensure no console error-level messages were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length, `Expected no console errors, but found: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial page load shows expected layout and default state', async ({ page }) => {
    // Purpose: Verify initial UI elements exist and default state is correct
    const app = new LCSPage(page);
    await app.goto();

    // Title should be present
    await expect(page.locator('h1')).toHaveText('Longest Common Subsequence');

    // Form and controls exist
    await expect(app.form).toBeVisible();
    await expect(app.seq1).toBeVisible();
    await expect(app.seq2).toBeVisible();
    await expect(app.submitBtn).toBeVisible();

    // Submit button should be enabled (clickable)
    await expect(app.submitBtn).toBeEnabled();

    // Result div should exist and be empty on load
    const initialResult = await app.getResultText();
    expect(initialResult).toBe('', 'Result div should be empty on initial load');
  });

  test('Submitting form with empty sequences triggers an alert', async ({ page }) => {
    // Purpose: Validate edge-case handling for missing input (alert)
    const app1 = new LCSPage(page);
    await app.goto();

    // Make sure both textareas are empty
    await app.seq1.fill('');
    await app.seq2.fill('');

    // Setup dialog wait before clicking submit
    const dialogPromise = app.waitForDialogAndAccept();

    // Click submit - the app uses alert when fields are empty
    await app.submit();

    const message1 = await dialogPromise;
    expect(message).toBe('Please enter both sequences', 'Expected alert asking user to enter both sequences');
  });

  test('Computes LCS correctly for well-known example', async ({ page }) => {
    // Purpose: Verify algorithm computes the correct LCS and updates the DOM
    const app2 = new LCSPage(page);
    await app.goto();

    // Use classic example: seq1 = "AGGTAB", seq2 = "GXTXAYB" -> LCS "GTAB"
    await app.fillSequences('AGGTAB', 'GXTXAYB');
    await app.submit();

    // Check result text
    const resText = await app.getResultText();
    expect(resText).toBe('Longest Common Subsequence: GTAB', 'Result text should show the correct LCS');

    // Check result element is visible and styled (font-weight should be bold as per style)
    await expect(app.result).toBeVisible();
    // Verify the font-weight is bold (>=700)
    const fontWeight = await page.evaluate(() => window.getComputedStyle(document.getElementById('result')).fontWeight);
    // fontWeight can be "bold" or "700", so check both possibilities
    expect(['bold', '700']).toContain(fontWeight);
  });

  test('Handles case with no common subsequence (empty LCS)', async ({ page }) => {
    // Purpose: Ensure the app handles sequences with zero intersection gracefully
    const app3 = new LCSPage(page);
    await app.goto();

    await app.fillSequences('ABC', 'DEF');
    await app.submit();

    const resText1 = await app.getResultText();
    // When no common characters, lcs.join('') is '', so expect trailing colon and space
    expect(resText).toBe('Longest Common Subsequence: ', 'Result should show empty LCS for non-overlapping inputs');
  });

  test('Multiple submissions update the result correctly', async ({ page }) => {
    // Purpose: Verify state updates on subsequent form submissions
    const app4 = new LCSPage(page);
    await app.goto();

    // First submission
    await app.fillSequences('ABCXYZ', 'XYZABC');
    await app.submit();
    const first = await app.getResultText();
    // Could be "ABC" or "XYZ" depending on algorithm path; assert it contains expected prefix
    expect(first.startsWith('Longest Common Subsequence: ')).toBeTruthy();
    const firstValue = first.replace('Longest Common Subsequence: ', '');

    // Second submission with different inputs
    await app.fillSequences('HELLO', 'HELO');
    await app.submit();
    const second = await app.getResultText();
    expect(second).toBe('Longest Common Subsequence: HELO', 'Second submission should replace previous result with new LCS');
  });

  test('Accessibility check: form controls have accessible names and are focusable', async ({ page }) => {
    // Purpose: Basic accessibility checks for form controls
    const app5 = new LCSPage(page);
    await app.goto();

    // Ensure textarea elements have associated labels (by for/id)
    const labelForSeq1 = await page.locator('label[for="seq1"]').textContent();
    const labelForSeq2 = await page.locator('label[for="seq2"]').textContent();
    expect(labelForSeq1).toBeTruthy();
    expect(labelForSeq2).toBeTruthy();

    // Ensure controls are focusable via keyboard tab order
    await page.keyboard.press('Tab'); // likely focuses first control; we assert that something gets focus
    const active1 = await page.evaluate(() => document.activeElement?.id);
    expect(active1).toBeDefined();

    // Move focus to second textarea and then to submit button to ensure they can be focused
    await page.locator('#seq2').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('seq2');

    await page.locator('#submit').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('submit');
  });
});