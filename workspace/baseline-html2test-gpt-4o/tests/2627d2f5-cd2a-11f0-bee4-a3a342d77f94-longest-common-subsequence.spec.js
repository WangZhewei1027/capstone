import { test, expect } from '@playwright/test';

// Test file for: Longest Common Subsequence application
// URL: http://127.0.0.1:5500/workspace/html2test/html/2627d2f5-cd2a-11f0-bee4-a3a342d77f94.html
// Filename required by the task:
// 2627d2f5-cd2a-11f0-bee4-a3a342d77f94-longest-common-subsequence.spec.js

// This suite validates the UI, interactions, and visible results of the LCS app.
// It also observes console messages and page errors for each test and asserts none occurred.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627d2f5-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Longest Common Subsequence App - UI and behavior', () => {
  // Shared hooks to collect console errors and page errors per test
  test.beforeEach(async ({ page }) => {
    // Arrays to record console error messages and uncaught page errors
    page.setDefaultTimeout(5000);
  });

  test('Initial page load shows inputs, button and empty result', async ({ page }) => {
    // Track console error messages and page errors for this test
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);

    // Verify basic layout elements are present and visible
    const header = page.locator('h1', { hasText: 'Longest Common Subsequence Finder' });
    await expect(header).toBeVisible();

    const input1 = page.locator('input#string1');
    const input2 = page.locator('input#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    // Inputs and button should be visible and empty on load
    await expect(input1).toBeVisible();
    await expect(input2).toBeVisible();
    await expect(button).toBeVisible();
    await expect(input1).toHaveValue('');
    await expect(input2).toHaveValue('');

    // Result element should exist and be empty (no LCS shown)
    // The element exists but inner content should be empty string initially
    await expect(result).toHaveText('', { timeout: 1000 });

    // Ensure no console errors or uncaught exceptions were emitted during load
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Compute LCS for typical example: AGGTAB vs GXTXAYB -> GTAB', async ({ page }) => {
    // Comments: This test verifies that clicking the button computes LCS and updates DOM
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    // Fill inputs with the example strings
    const input1 = page.locator('#string1');
    const input2 = page.locator('#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    await input1.fill('AGGTAB');
    await input2.fill('GXTXAYB');

    // Click the button to invoke the inline onclick handler (findLCS)
    await button.click();

    // The result element's innerHTML should include the strong label and the expected LCS
    await expect(result).toBeVisible();
    const inner = await result.innerHTML();
    expect(inner).toContain('Longest Common Subsequence:');
    // The known LCS for these strings is "GTAB"
    expect(inner).toContain('GTAB');

    // The visible text should include the label and the LCS text
    await expect(result).toHaveText(/Longest Common Subsequence:\s*GTAB/, { timeout: 1000 });

    // No console or page errors should have occurred during this operation
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Edge case: both inputs empty should produce empty LCS and not throw errors', async ({ page }) => {
    // This test verifies behavior when both input strings are empty
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    const input1 = page.locator('#string1');
    const input2 = page.locator('#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    // Ensure inputs are cleared
    await input1.fill('');
    await input2.fill('');

    // Click to compute
    await button.click();

    // Expect the result to show the label but no characters for LCS (empty)
    const html = await result.innerHTML();
    expect(html).toContain('Longest Common Subsequence:');
    // There should be no characters after the label except possible whitespace
    const text = await result.textContent();
    // Normalize whitespace and expect it equals label followed by nothing significant
    expect(text).toMatch(/^Longest Common Subsequence:\s*$/);

    // No runtime errors
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('No common subsequence: "abc" vs "def" yields empty LCS', async ({ page }) => {
    // Verifies that when there is no common character subsequence, the displayed LCS is empty
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    const input1 = page.locator('#string1');
    const input2 = page.locator('#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    await input1.fill('abc');
    await input2.fill('def');
    await button.click();

    // The result should include the label and show no common chars
    await expect(result).toBeVisible();
    const content = await result.innerHTML();
    expect(content).toContain('Longest Common Subsequence:');
    // No letters should appear after the label
    await expect(result).toHaveText(/Longest Common Subsequence:\s*$/);

    // No console / page errors
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Identical strings produce the full string as LCS', async ({ page }) => {
    // Verifies that identical input strings yield the whole string as the LCS
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    const testStr = 'HELLOWORLD';
    const input1 = page.locator('#string1');
    const input2 = page.locator('#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    await input1.fill(testStr);
    await input2.fill(testStr);
    await button.click();

    // Expect the LCS equals the full string for identical inputs
    await expect(result).toBeVisible();
    await expect(result).toHaveText(new RegExp(`Longest Common Subsequence:\\s*${testStr}`));

    // No errors expected
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Handles inputs with repeated characters and special characters', async ({ page }) => {
    // This test checks correctness when strings include repeated letters and punctuation
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    const input1 = page.locator('#string1');
    const input2 = page.locator('#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    // Example: both share "a-a" subsequence if punctuation matches
    await input1.fill('a--a--b!!c');
    await input2.fill('xa--a--y!!c');
    await button.click();

    // Validate the result contains the expected subsequence characters in order.
    // We assert at least that 'a--a--' or '!!c' subsequences are detected in output, or combined.
    const text = await result.textContent();
    expect(text).toContain('Longest Common Subsequence:');

    // The exact LCS depends on algorithm choices, but it must be non-empty for these inputs.
    // So assert there is non-whitespace content after the label.
    const afterLabel = text.replace(/^Longest Common Subsequence:\s*/, '');
    expect(afterLabel.length).toBeGreaterThan(0);

    // No runtime errors
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Button is clickable and uses the inline onclick handler (integration)', async ({ page }) => {
    // This test ensures the button element is wired to the inline onclick attribute by clicking it and observing a change.
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    const input1 = page.locator('#string1');
    const input2 = page.locator('#string2');
    const button = page.locator('button', { hasText: 'Find LCS' });
    const result = page.locator('#result');

    // Provide known values
    await input1.fill('XMJYAUZ');
    await input2.fill('MZJAWXU');

    // Click multiple times to ensure handler is stable when invoked repeatedly
    await button.click();
    await expect(result).toBeVisible();
    const first = await result.textContent();
    expect(first).toContain('Longest Common Subsequence:');

    // Click again and ensure result remains consistent (idempotency)
    await button.click();
    const second = await result.textContent();
    expect(second).toBe(first);

    // No runtime errors were produced during clicks
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });
});