import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6cc-cd33-11f0-bdf9-b3d97e91273d.html';

test.describe('Huffman Coding Demo - End-to-End', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  // Run before each test: navigate to page and attach listeners to capture console and page errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught page errors (exceptions)
    page.on('pageerror', (err) => {
      // store the error object for assertions later
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Ensure the main heading is present to confirm page loaded
    await expect(page.locator('h1')).toHaveText('Huffman Coding Demo');
  });

  // Run after each test: make sure the error collectors are available for assertions in tests
  test.afterEach(async () => {
    // nothing to tear down beyond what Playwright already does
  });

  test('Initial page load: default values and UI hidden state', async ({ page }) => {
    // Purpose: Verify initial DOM structure, default textarea content, and that results are hidden.

    const input = page.locator('#input-text');
    const buildBtn = page.locator('#build-btn');
    const results = page.locator('#results');
    const freqTbody = page.locator('#freq-table tbody');
    const codeTbody = page.locator('#code-table tbody');
    const encodedOutput = page.locator('#encoded-output');
    const decodedOutput = page.locator('#decoded-output');

    // The textarea should contain the default sample text provided in the HTML
    await expect(input).toHaveValue('this is an example for huffman encoding');

    // Build button should be visible and enabled
    await expect(buildBtn).toBeVisible();
    await expect(buildBtn).toBeEnabled();

    // Results div should be hidden initially (display)
    // Use evaluate to check computed style or element style attribute
    const resultsDisplay = await results.evaluate((el) => window.getComputedStyle(el).display);
    expect(resultsDisplay === 'none' || resultsDisplay === 'hidden').toBeTruthy();

    // Tables and outputs should be empty prior to building
    await expect(freqTbody.locator('tr')).toHaveCount(0);
    await expect(codeTbody.locator('tr')).toHaveCount(0);
    await expect(encodedOutput).toHaveText('');
    await expect(decodedOutput).toHaveText('');

    // Accessibility checks: tables have aria-label attributes
    await expect(page.locator('#freq-table')).toHaveAttribute('aria-label', /Character frequency table/);
    await expect(page.locator('#code-table')).toHaveAttribute('aria-label', /Character Huffman codes table/);
    await expect(page.locator('#encoded-output')).toHaveAttribute('aria-label', /Encoded binary string/);

    // Assert that no uncaught page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Build Huffman Tree & Encode: populates frequency table, codes, and encoded output', async ({ page }) => {
    // Purpose: Click the build button and verify frequency table, code table, and encoded output update correctly.

    const input1 = page.locator('#input1-text');
    const buildBtn1 = page.locator('#build-btn');
    const results1 = page.locator('#results1');
    const freqRows = page.locator('#freq-table tbody tr');
    const codeRows = page.locator('#code-table tbody tr');
    const encodedOutput1 = page.locator('#encoded-output');

    // Use default text; click build
    await buildBtn.click();

    // Results section should now be visible
    await expect(results).toBeVisible();

    // Frequency table should have rows (one per unique character)
    await expect(freqRows).toHaveCountGreaterThan(0);

    // Code table should have rows and each code cell should contain spans with class 'code-bit'
    await expect(codeRows).toHaveCountGreaterThan(0);
    // Verify the first code-row contains at least one .code-bit element
    const firstCodeBits = page.locator('#code-table tbody tr >> td >> .code-bit');
    await expect(firstCodeBits.first()).toBeVisible();

    // Encoded output should contain only 0/1 and spaces (formatted in groups of up to 8 bits)
    const encodedText = (await encodedOutput.textContent()) || '';
    expect(encodedText.trim().length).toBeGreaterThan(0);
    // Remove spaces and check only 0s and 1s remain
    const rawBits = encodedText.replace(/\s+/g, '');
    expect(/^[01]+$/.test(rawBits)).toBe(true);

    // Confirm formatted grouping: groups separated by single spaces, each group length <=8
    const groups = encodedText.trim().split(/\s+/);
    for (const g of groups) {
      expect(g.length).toBeLessThanOrEqual(8);
      expect(/^[01]*$/.test(g)).toBeTruthy();
    }

    // After building, decoded output should still be empty until decode is pressed
    await expect(page.locator('#decoded-output')).toHaveText('');

    // No uncaught page errors during encoding step
    expect(pageErrors.length).toBe(0);
  });

  test('Decode button decodes encoded string back to original text', async ({ page }) => {
    // Purpose: Ensure that after building, clicking Decode returns exactly the original text.

    const input2 = page.locator('#input2-text');
    const buildBtn2 = page.locator('#build-btn');
    const decodeBtn = page.locator('#decode-btn');
    const decodedOutput1 = page.locator('#decoded-output');

    // Build using default text
    await buildBtn.click();
    await expect(page.locator('#results')).toBeVisible();

    // Click decode and verify decoded output matches original textarea value
    await decodeBtn.click();

    const originalValue = await input.inputValue();
    await expect(decodedOutput).toHaveText(originalValue);

    // No uncaught page errors during decode
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: clicking Build with empty input shows alert and does not proceed', async ({ page }) => {
    // Purpose: Verify empty input triggers alert and no results are shown.

    const input3 = page.locator('#input3-text');
    const buildBtn3 = page.locator('#build-btn');
    const results2 = page.locator('#results2');

    // Clear the textarea
    await input.fill('');

    // Listen for dialog and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      buildBtn.click()
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Please enter some text to encode.');
    await dialog.dismiss();

    // Results should remain hidden and tables empty
    const resultsDisplay1 = await results.evaluate((el) => window.getComputedStyle(el).display);
    expect(resultsDisplay === 'none' || resultsDisplay === 'hidden').toBeTruthy();
    await expect(page.locator('#freq-table tbody tr')).toHaveCount(0);
    await expect(page.locator('#code-table tbody tr')).toHaveCount(0);

    // No uncaught page errors during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Edge case: clicking Decode before encoding shows alert', async ({ page }) => {
    // Purpose: Verify that decoding without first encoding triggers an alert message.

    const decodeBtn1 = page.locator('#decode-btn');

    // Ensure we are in initial state (no encode done)
    // Listen for dialog and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      decodeBtn.click()
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Please encode text first.');
    await dialog.dismiss();

    // No uncaught page errors during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Single-character input: codes assigned as single-bit "0" and decoding works', async ({ page }) => {
    // Purpose: Test the single-character tree edge-case handling where code should be "0".

    const input4 = page.locator('#input4-text');
    const buildBtn4 = page.locator('#build-btn');
    const decodeBtn2 = page.locator('#decode-btn');
    const codeRows1 = page.locator('#code-table tbody tr');
    const encodedOutput2 = page.locator('#encoded-output');
    const decodedOutput2 = page.locator('#decoded-output');

    // Provide single repeated character input
    await input.fill('aaaaa');

    // Build tree
    await buildBtn.click();
    await expect(page.locator('#results')).toBeVisible();

    // There should be exactly one code row for 'a'
    await expect(codeRows).toHaveCount(1);

    // The code cell should consist of '0' bits (one or more, but generateCodes uses '0' for single node)
    const codeCellText = await codeRows.nth(0).locator('td').nth(1).textContent();
    expect(codeCellText.replace(/\s+/g, '')).toContain('0');

    // Encoded output (without spaces) should be '00000'
    const encodedText1 = (await encodedOutput.textContent()) || '';
    const rawBits1 = encodedText.replace(/\s+/g, '');
    expect(rawBits).toBe('00000');

    // Decoding should return the original string
    await decodeBtn.click();
    await expect(decodedOutput).toHaveText('aaaaa');

    // No uncaught page errors during this scenario
    expect(pageErrors.length).toBe(0);
  });

  test('Visual and DOM checks: code bits have correct class and special characters are labeled', async ({ page }) => {
    // Purpose: Verify DOM presentation details: .code-bit class usage and 'space' label for spaces in character column.

    const buildBtn5 = page.locator('#build-btn');

    // Use default text which includes spaces
    await buildBtn.click();
    await expect(page.locator('#results')).toBeVisible();

    // Ensure there are elements with class 'code-bit' in the code table
    const codeBitSpans = page.locator('#code-table .code-bit');
    await expect(codeBitSpans).toHaveCountGreaterThan(0);

    // Verify that at least one row in freq table represents 'space' text for whitespace characters
    const freqChars = page.locator('#freq-table tbody td:first-child');
    const texts = await freqChars.allTextContents();
    const hasSpaceLabel = texts.some(t => t.trim().toLowerCase() === 'space');
    expect(hasSpaceLabel).toBeTruthy();

    // No uncaught page errors during these DOM/visual checks
    expect(pageErrors.length).toBe(0);
  });

  test('Console and page error observation: record presence or absence of errors', async ({ page }) => {
    // Purpose: Explicitly assert captured console messages and page errors arrays are available and reasonable.

    // Trigger a normal build sequence to potentially generate logs/errors
    await page.locator('#build-btn').click();
    await expect(page.locator('#results')).toBeVisible();

    // Check that we captured console messages array (may be empty or not)
    expect(Array.isArray(consoleMessages)).toBe(true);

    // Assert there are no uncaught page errors (uncaught exceptions) during normal use
    // This test intentionally asserts zero pageErrors to validate runtime stability.
    expect(pageErrors.length).toBe(0);
  });
});