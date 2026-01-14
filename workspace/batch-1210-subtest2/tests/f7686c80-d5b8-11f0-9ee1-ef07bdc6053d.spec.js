import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7686c80-d5b8-11f0-9ee1-ef07bdc6053d.html';

/*
  f7686c80-d5b8-11f0-9ee1-ef07bdc6053d.spec.js

  Tests cover:
  - FSM states: Idle (S0_Idle) and Generated (S1_Generated)
  - Event/Transition: clicking the Generate button (GenerateClick)
  - Entry action mentioned in FSM (renderPage) is validated (expected to be missing)
  - Visual/DOM checks of components (#number, button, #output)
  - Edge cases: non-integer input, zero/negative/empty inputs
  - Observes console messages and page errors and asserts none are produced during normal flows
*/

test.describe('Fibonacci Sequence - FSM driven E2E tests', () => {
  let consoleMessages;
  let pageErrors;

  // Attach listeners before each test to observe console logs and runtime errors.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // capture console messages with their type and text
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // capture unhandled exceptions from the page
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
  });

  // After each test ensure that there were no unexpected runtime errors.
  test.afterEach(async () => {
    // Assert that there were no uncaught page errors during the test.
    // If errors exist, include them in the assertion message for debugging.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);
  });

  test('Initial Idle state - components render and FSM entry action absence', async ({ page }) => {
    // Validate presence of input
    const input = page.locator('#number');
    await expect(input).toHaveCount(1);
    await expect(input).toBeVisible();

    // Validate input attributes: type=number, min=1, default value=1
    const inputType = await input.getAttribute('type');
    const inputMin = await input.getAttribute('min');
    const inputValue = await input.getAttribute('value'); // attribute default
    expect(inputType).toBe('number');
    expect(inputMin).toBe('1');
    expect(inputValue).toBe('1');

    // Validate presence of Generate button with correct onclick attribute and text
    const button = page.locator('button[onclick="generateFibonacci()"]');
    await expect(button).toHaveCount(1);
    await expect(button).toHaveText('Generate');

    // Validate output container exists and is initially empty
    const output = page.locator('#output');
    await expect(output).toHaveCount(1);
    await expect(output).toBeVisible();
    await expect(output).toHaveText(''); // Idle state's evidence: empty output

    // FSM mentions an entry action renderPage() for S0_Idle. Verify that this function
    // is not present on the window (the implementation does not define it).
    const renderPageType = await page.evaluate(() => typeof window.renderPage);
    expect(renderPageType).toBe('undefined');

    // Also check that the generateFibonacci function exists
    const genFibType = await page.evaluate(() => typeof window.generateFibonacci);
    expect(genFibType).toBe('function');
  });

  test.describe('GenerateClick transitions and output correctness', () => {
    // Helper to compute expected Fibonacci sequence string for n terms
    const expectedFib = (n) => {
      const seq = [];
      if (n >= 1) seq.push(0);
      if (n >= 2) seq.push(1);
      for (let i = 2; i < n; i++) {
        seq[i] = seq[i - 1] + seq[i - 2];
      }
      return seq.join(', ');
    };

    test('Click Generate for n=1 produces "0"', async ({ page }) => {
      // Edge: smallest valid input
      await page.fill('#number', '1');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe(expectedFib(1));
    });

    test('Click Generate for n=2 produces "0, 1"', async ({ page }) => {
      await page.fill('#number', '2');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe(expectedFib(2));
    });

    test('Click Generate for n=5 produces "0, 1, 1, 2, 3"', async ({ page }) => {
      await page.fill('#number', '5');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe(expectedFib(5));
    });

    test('Click Generate for n=10 produces 10 Fibonacci terms', async ({ page }) => {
      await page.fill('#number', '10');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe(expectedFib(10));
      // Additional check: count commas = terms-1
      const terms = outputText === '' ? 0 : outputText.split(',').length;
      expect(terms).toBe(10);
    });

    test('Non-integer input (e.g., 4.7) is truncated via parseInt and yields 4 terms', async ({ page }) => {
      // The implementation uses parseInt, so 4.7 should be treated as 4
      await page.fill('#number', '4.7');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe(expectedFib(4));
    });
  });

  test.describe('Edge cases and error scenarios (no runtime exceptions expected)', () => {
    test('Zero input (0) results in empty output (no sequence) and no page errors', async ({ page }) => {
      // Even though min=1 on input, users can programmatically set 0; implementation should handle it
      await page.fill('#number', '0');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe(''); // sequence remains empty since n>=1 check fails
    });

    test('Negative input (-3) results in empty output and no exceptions', async ({ page }) => {
      await page.fill('#number', '-3');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe('');
    });

    test('Empty input (cleared) results in empty output and no exceptions', async ({ page }) => {
      // Clear the input field (sets it to empty string). parseInt('') -> NaN, and comparisons fail.
      await page.fill('#number', '');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      expect(outputText).toBe('');
    });

    test('Large but reasonable input (20) produces expected sequence without errors', async ({ page }) => {
      await page.fill('#number', '20');
      await page.click('button[onclick="generateFibonacci()"]');

      const outputText = await page.locator('#output').innerText();
      // verify that we have 20 numbers
      const terms = outputText === '' ? 0 : outputText.split(',').length;
      expect(terms).toBe(20);
      // Basic sanity: last number should be a finite number
      const lastTerm = Number(outputText.split(',').slice(-1)[0]);
      expect(Number.isFinite(lastTerm)).toBe(true);
    });
  });

  test('Visual and DOM styling checks for output container', async ({ page }) => {
    const output = page.locator('#output');
    // Ensure output has min-height and background color applied from CSS
    const bgColor = await output.evaluate((el) => getComputedStyle(el).backgroundColor);
    // CSS background for #output is '#fff' -> rgb(255, 255, 255)
    expect(bgColor).toBe('rgb(255, 255, 255)');

    const minHeight = await output.evaluate((el) => getComputedStyle(el).minHeight);
    // min-height specified as 50px in stylesheet; verify it is at least 50px
    const numericMinHeight = parseFloat(minHeight);
    expect(numericMinHeight).toBeGreaterThanOrEqual(50);
  });

  test('Event handler attribute exists on Generate button and clicking it triggers transition (no errors)', async ({ page }) => {
    const button = page.locator('button[onclick="generateFibonacci()"]');
    const onclickAttr = await button.getAttribute('onclick');
    expect(onclickAttr).toBe('generateFibonacci()');

    // Use a sample input and click; we also assert that console did not capture errors.
    await page.fill('#number', '3');
    await page.click('button[onclick="generateFibonacci()"]');

    const outputText = await page.locator('#output').innerText();
    expect(outputText).toBe('0, 1, 1');

    // Validate that no console errors were emitted (filter console messages for 'error' type)
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
  });
});