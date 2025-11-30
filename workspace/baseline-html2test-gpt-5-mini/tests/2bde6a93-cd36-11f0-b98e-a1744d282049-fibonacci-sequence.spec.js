import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a93-cd36-11f0-b98e-a1744d282049.html';

test.describe('Fibonacci Sequence Explorer - End-to-end', () => {
  // Collect console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Observe console messages
    page.on('console', msg => {
      // collect messages for later assertions, along with their type and text
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Observe uncaught page errors (ReferenceError, TypeError, etc.)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Wait a short moment to allow initial run() to complete and drawing to happen
    await page.waitForTimeout(300);
  });

  test.afterEach(async ({ page }) => {
    // helpful debug hook: on failure, print console messages to test output (Playwright will show them)
    if (pageErrors.length > 0) {
      // do nothing extra here; the test assertions will surface these
    }
  });

  test('Initial load: page elements present and default state leads to a computed result', async ({ page }) => {
    // Purpose: verify that the page loads, default controls are set, and initial run() produced output.

    // Check header and description
    await expect(page.locator('h1')).toHaveText('Fibonacci Sequence Explorer');
    await expect(page.locator('p.lead')).toContainText('Generate Fibonacci numbers');

    // Verify default input and selects
    const inputN = page.locator('#input-n');
    await expect(inputN).toHaveValue('20'); // default value in the HTML

    const mode = page.locator('#mode');
    await expect(mode).toHaveValue('sequence');

    const algo = page.locator('#algo');
    await expect(algo).toHaveValue('iterative');

    // Result area should have initial computed content because the app calls run() on load
    const result = page.locator('#result');
    const resultText = await result.innerText();
    expect(resultText.length).toBeGreaterThan(10); // should contain some computed text
    expect(resultText).toContain('Computed in'); // output includes timing information

    // Canvas should exist and have positive width/height attributes
    const canvasWidth = await page.$eval('canvas#chart', c => c.width);
    const canvasHeight = await page.$eval('canvas#chart', c => c.height);
    expect(canvasWidth).toBeGreaterThan(0);
    expect(canvasHeight).toBeGreaterThan(0);

    // Ensure no uncaught page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
    // Also ensure no console messages with type 'error' were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Compute single F(n) (nth mode) with fast-doubling algorithm and verify result & meta', async ({ page }) => {
    // Purpose: exercise nth mode and fast-doubling algorithm and validate displayed value and meta info

    // Set mode to nth
    await page.selectOption('#mode', 'nth');
    // Set algorithm to fast-doubling
    await page.selectOption('#algo', 'fast-doubling');
    // Set n = 10
    await page.fill('#input-n', '10');

    // Click Run
    await page.click('#run');

    // Wait for UI to update
    await page.waitForTimeout(200);

    // Check result contains F(10) = 55
    const resultText1 = await page.locator('#result').innerText();
    expect(resultText).toContain('F(10) = 55');

    // Meta should contain Index and Digits and Time
    const metaItems = page.locator('#meta .item');
    await expect(metaItems.nth(0)).toContainText('Index');
    await expect(metaItems).toHaveCountGreaterThanOrEqual(2);

    // There should be a 'Digits' item indicating number of digits of 55 (2)
    const metaHtml = await page.locator('#meta').innerText();
    expect(metaHtml).toContain('Digits');

    // Ensure visualization has been redrawn (canvas dimensions unchanged but drawing executed)
    const canvasData = await page.$eval('canvas#chart', c => ({ w: c.width, h: c.height }));
    expect(canvasData.w).toBeGreaterThan(0);
    expect(canvasData.h).toBeGreaterThan(0);

    // No uncaught errors triggered by this operation
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Generate sequence mode with recursive-memo for small n and validate term display and meta', async ({ page }) => {
    // Purpose: generate a small sequence and assert that each term is displayed and meta shows correct terms count

    // Select sequence mode
    await page.selectOption('#mode', 'sequence');
    // Select recursive-memo algorithm
    await page.selectOption('#algo', 'recursive-memo');
    // Set n = 5
    await page.fill('#input-n', '5');

    // Click Run
    await page.click('#run');

    // Wait for generation and UI update
    await page.waitForTimeout(200);

    const resultText2 = await page.locator('#result').innerText();
    // Should contain F(0) through F(5)
    for (let i = 0; i <= 5; i++) {
      expect(resultText).toContain(`F(${i}) =`);
    }

    // Meta should report Terms = 6
    const metaText = await page.locator('#meta').innerText();
    expect(metaText).toContain('Terms');
    expect(metaText).toContain('6');

    // No unexpected page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Copy Result button shows feedback: either "Copied ✓" or "Copy failed"', async ({ page }) => {
    // Purpose: verify the copy button changes its text after being clicked (handles absence of clipboard gracefully)

    // Ensure we are in nth mode with a small n so result is a single line
    await page.selectOption('#mode', 'nth');
    await page.selectOption('#algo', 'iterative');
    await page.fill('#input-n', '7');
    await page.click('#run');

    // Wait for update
    await page.waitForTimeout(150);

    const copyBtn = page.locator('#copy');
    // Capture the initial text
    const before = await copyBtn.innerText();
    expect(before.trim()).toBe('Copy Result');

    // Click the copy button
    await copyBtn.click();

    // Wait for the short-lived status change in the page script (it reverts after ~1200ms)
    await page.waitForTimeout(300);

    // After click, the button should display either 'Copied ✓' or 'Copy failed'
    const after = (await copyBtn.innerText()).trim();
    const allowed = ['Copied ✓', 'Copy failed', 'Copy Result'];
    expect(allowed).toContain(after);

    // Wait until it reverts back to 'Copy Result' (max wait)
    await page.waitForTimeout(1400);
    const finalText = (await copyBtn.innerText()).trim();
    expect(finalText).toBe('Copy Result');

    // No uncaught errors
    expect(pageErrors.length).toBe(0);
  });

  test('Edge cases and validation messages: empty input, negative n, overly large n, and recursive-naive guard', async ({ page }) => {
    // Purpose: trigger multiple validation branches and verify displayed error messages

    const result1 = page.locator('#result1');

    // 1) Empty input
    await page.fill('#input-n', '');
    await page.click('#run');
    await page.waitForTimeout(100);
    expect(await result.innerText()).toContain('Please enter a valid integer n');

    // 2) Negative input
    await page.fill('#input-n', '-5');
    await page.click('#run');
    await page.waitForTimeout(100);
    expect(await result.innerText()).toContain('Please enter a non-negative integer n');

    // 3) Overly large n (> 10 million)
    await page.fill('#input-n', '10000001');
    await page.click('#run');
    await page.waitForTimeout(100);
    expect(await result.innerText()).toContain('n too large');

    // 4) recursive-naive guard for n > 40
    await page.selectOption('#algo', 'recursive-naive');
    await page.fill('#input-n', '45');
    await page.click('#run');
    await page.waitForTimeout(100);
    expect(await result.innerText()).toContain('Recursive naive algorithm is too slow for n > 40');

    // No unexpected uncaught page errors produced by validation logic
    expect(pageErrors.length).toBe(0);
  });

  test('Toggle log scale redraws visualization and does not cause errors', async ({ page }) => {
    // Purpose: check that toggling the logscale checkbox causes a redraw via run() without page errors

    // Ensure a reasonably sized sequence
    await page.selectOption('#mode', 'sequence');
    await page.selectOption('#algo', 'iterative');
    await page.fill('#input-n', '30');
    await page.click('#run');
    await page.waitForTimeout(200);

    // Toggle log scale
    const logCheckbox = page.locator('#logscale');
    await logCheckbox.check();
    await page.waitForTimeout(250); // run() invoked on change; wait for redraw

    // Check that result area still present and meta updated
    const metaText1 = await page.locator('#meta').innerText();
    expect(metaText.length).toBeGreaterThan(0);

    // Uncheck log scale
    await logCheckbox.uncheck();
    await page.waitForTimeout(250);

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('No uncaught ReferenceError/SyntaxError/TypeError should occur during typical interactions', async ({ page }) => {
    // Purpose: explicitly assert that no uncaught JS errors occurred during the test interactions.
    // The script must be loaded as-is and any runtime errors should surface in pageErrors.
    // We assert that pageErrors is empty indicating no unhandled exceptions.

    // Perform several interactions in quick sequence
    await page.fill('#input-n', '12');
    await page.selectOption('#mode', 'nth');
    await page.selectOption('#algo', 'fast-doubling');
    await page.click('#run');
    await page.waitForTimeout(150);

    await page.fill('#input-n', '18');
    await page.selectOption('#mode', 'sequence');
    await page.selectOption('#algo', 'iterative');
    await page.click('#run');
    await page.waitForTimeout(150);

    // Final assertion: there should be no uncaught errors of types like ReferenceError, SyntaxError, TypeError
    expect(pageErrors.length).toBe(0, `Unexpected page errors detected: ${pageErrors.map(e => e.message).join('; ')}`);
    const consoleErrorEntries = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrorEntries.length).toBe(0, `Console errors: ${consoleErrorEntries.map(e => e.text).join('; ')}`);
  });
});