import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed131-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Huffman Coding Demo (Application ID: 7abed131-cd32-11f0-a96f-2d591ffb35fe)', () => {
  // Arrays to collect page errors and console messages for assertions
  let pageErrors = [];
  let consoleMessages = [];

  // Setup: navigate to the page and attach listeners before the page scripts run
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect page errors (uncaught exceptions, syntax errors, etc.)
    page.on('pageerror', (err) => {
      // store Error object for examination in tests
      pageErrors.push(err);
    });

    // Collect console messages for later inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application page (do not modify page environment)
    await page.goto(APP_URL);
  });

  // Teardown: no special teardown needed beyond Playwright fixtures

  test('Initial UI loads with expected static elements and output is hidden', async ({ page }) => {
    // Verify page title is present in DOM
    await expect(page.locator('h1')).toHaveText('Huffman Coding Demonstration');

    // Verify interactive elements exist
    await expect(page.locator('#inputText')).toBeVisible();
    await expect(page.locator('#encodeBtn')).toBeVisible();

    // Output section should be hidden by default (style display:none)
    await expect(page.locator('#output')).toBeHidden();

    // Verify frequency and code tables exist with their headers
    await expect(page.locator('#freqTable thead tr th').first()).toHaveText('Character');
    await expect(page.locator('#codeTable thead tr th').first()).toHaveText('Character');

    // Verify visualization container exists (even if empty)
    await expect(page.locator('#tree-svg')).toBeVisible();
  });

  test('Page reports a JavaScript error (SyntaxError or similar) on load', async ({ page }) => {
    // The provided HTML implementation is intentionally truncated and contains a broken JS line ("const line")
    // We expect the browser to emit a pageerror (e.g., SyntaxError / Unexpected token)
    // Wait for the pageerror event triggered during page load
    const err = await page.waitForEvent('pageerror', { timeout: 2000 });

    // Basic assertions about the error: there should be an error object and its message should indicate a syntax/runtime parsing problem.
    expect(err).toBeTruthy();

    // Error message can vary by engine. Assert it matches common indicators.
    const msg = (err && err.message) ? err.message : '';
    expect(msg).toMatch(/(SyntaxError|Unexpected|Unexpected end|const line)/);

    // Also ensure our listener collected the same error
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    expect(pageErrors[0].message).toMatch(/(SyntaxError|Unexpected|Unexpected end|const line)/);
  });

  test('Interacting with controls does not produce expected encoding results due to script error', async ({ page }) => {
    // Type sample input into the textarea
    const sampleText = 'abbccc';
    await page.fill('#inputText', sampleText);

    // Click the Encode button
    await page.click('#encodeBtn');

    // Allow a short time for any (broken) event handlers to run or fail
    await page.waitForTimeout(300);

    // Because the page script fails to parse/execute, the output should remain hidden
    await expect(page.locator('#output')).toBeHidden();

    // Check that no encoded binary has been produced in the DOM
    const encodedBin = (await page.textContent('#encodedBin')) || '';
    expect(encodedBin.trim()).toBe('');

    // Decoded text element should remain empty
    const decodedText = (await page.textContent('#decodedText')) || '';
    expect(decodedText.trim()).toBe('');

    // Bits and compression ratio spans should be empty (no values filled)
    const origBits = (await page.textContent('#origBits')) || '';
    const encodedBits = (await page.textContent('#encodedBits')) || '';
    const compressionRatio = (await page.textContent('#compressionRatio')) || '';

    expect(origBits.trim()).toBe('');
    expect(encodedBits.trim()).toBe('');
    expect(compressionRatio.trim()).toBe('');
  });

  test('Clicking Encode with empty input does not show results and does not mask the original page error', async ({ page }) => {
    // Ensure textarea is empty
    await page.fill('#inputText', '');

    // Click the Encode button
    await page.click('#encodeBtn');

    // Short wait
    await page.waitForTimeout(200);

    // Output must remain hidden
    await expect(page.locator('#output')).toBeHidden();

    // There should be at least one page error captured from load; ensure it still exists
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Some consoles may additionally log messages; ensure that any console error messages are captured (if any)
    const errorConsoleEntries = consoleMessages.filter(m => m.type === 'error');
    // We don't require there to be console errors, but we capture them if present.
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Diagnose captured console and page errors for helpful debugging info', async ({ page }) => {
    // Allow a small window for any late errors to appear
    await page.waitForTimeout(200);

    // At least one page error should be present (expected due to truncated JS)
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);

    // Check that the first page error message contains likely failure token(s)
    const firstErrMsg = pageErrors[0].message;
    expect(firstErrMsg).toMatch(/(const line|Unexpected|SyntaxError|Unexpected end)/);

    // Inspect collected console messages - if present, assert they are structured
    expect(Array.isArray(consoleMessages)).toBe(true);
    // If any console messages exist, ensure each has a type and text
    for (const m of consoleMessages) {
      expect(m).toHaveProperty('type');
      expect(m).toHaveProperty('text');
      expect(typeof m.type).toBe('string');
      expect(typeof m.text).toBe('string');
    }
  });
});