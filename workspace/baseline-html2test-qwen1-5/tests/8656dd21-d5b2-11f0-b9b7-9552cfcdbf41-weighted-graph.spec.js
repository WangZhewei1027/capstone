import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/8656dd21-d5b2-11f0-b9b7-9552cfcdbf41.html';

test.describe('Weighted Graph App (8656dd21-d5b2-11f0-b9b7-9552cfcdbf41)', () => {
  // Arrays to collect runtime errors and console error messages for each test.
  let pageErrors;
  let consoleErrors;

  // Attach global handlers before each test to capture errors emitted during page load and interactions.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture unhandled exceptions thrown in the page context (e.g., ReferenceError, TypeError).
    page.on('pageerror', (err) => {
      try {
        pageErrors.push(err && err.message ? String(err.message) : String(err));
      } catch (e) {
        // Safeguard: still push stringified error if something unexpected occurs.
        pageErrors.push(String(err));
      }
    });

    // Capture console.error messages emitted by the page.
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the target HTML page and wait for load (this is where initialization errors may occur).
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Test 1: Basic DOM presence and initial state verification.
  test('Initial load shows title, description, image and seven input fields', async ({ page }) => {
    // Verify page title and heading are present and correct.
    await expect(page.locator('h1')).toHaveText('Weighted Graph');
    await expect(page.locator('p')).toContainText('Enter the weights of each node');

    // Verify there are exactly seven input elements for node weights with expected placeholders.
    const inputs = page.locator('input[type="text"]');
    await expect(inputs).toHaveCount(7);
    await expect(page.locator('#node1_weight')).toHaveAttribute('placeholder', 'Node 1 Weight');
    await expect(page.locator('#node7_weight')).toHaveAttribute('placeholder', 'Node 7 Weight');

    // Verify the image is visible and has the expected alt attribute.
    const image = page.locator('img[alt="Weighted Graph"]');
    await expect(image).toBeVisible();

    // Verify inputs are empty by default (value should be empty string).
    for (let i = 1; i <= 7; i++) {
      const selector = `#node${i}_weight`;
      await expect(page.locator(selector)).toHaveValue('');
    }
  });

  // Test 2: Ensure script/runtime initialization produced errors (the page's embedded script contains intentional issues).
  test('Page initialization should emit script/runtime errors (captured via pageerror or console.error)', async ({ page }) => {
    // At least one error should have been captured during page load due to problems in the embedded script.
    const totalErrors = pageErrors.length + consoleErrors.length;
    expect(totalErrors).toBeGreaterThan(0);

    // Combine messages for pattern checks.
    const combinedMessages = [...pageErrors, ...consoleErrors].join('\n');

    // Expect at least one message to reference common JS issues from the provided script:
    // - "Alpine" usage problems
    // - "is not a constructor" errors
    // - ReferenceError or TypeError messages
    expect(combinedMessages).toMatch(/Alpine|is not a constructor|ReferenceError|TypeError|SyntaxError|Uncaught/i);
  });

  // Test 3: Clicking the Calculate button should produce a runtime error because calculate may not be defined or will fail.
  test('Clicking "Calculate Weighted Graph" triggers a runtime error (calculate undefined or fails)', async ({ page }) => {
    // Clear any previously captured errors to focus on click-induced errors.
    pageErrors.length = 0;
    consoleErrors.length = 0;

    // Click the Calculate button.
    await page.click('button:has-text("Calculate Weighted Graph")');

    // Wait briefly to allow synchronous errors triggered by the click to be emitted and captured.
    await page.waitForTimeout(100);

    const totalErrorsAfterClick = pageErrors.length + consoleErrors.length;
    expect(totalErrorsAfterClick).toBeGreaterThan(0);

    const combinedMessages = [...pageErrors, ...consoleErrors].join('\n');

    // The click is expected to cause an error referencing "calculate" not being defined or similar ReferenceError.
    expect(combinedMessages).toMatch(/calculate is not defined|ReferenceError|is not defined|TypeError|Uncaught/i);
  });

  // Test 4: Inputs stay editable and maintain user-entered values despite script failures; innerHTML remains unchanged.
  test('User can type into inputs; values persist and input.innerHTML remains empty after attempted calculation', async ({ page }) => {
    // Fill each input with a test value and assert the value was set.
    for (let i = 1; i <= 7; i++) {
      const selector = `#node${i}_weight`;
      await page.fill(selector, String(i * 10)); // e.g., 10,20,...70
      await expect(page.locator(selector)).toHaveValue(String(i * 10));
    }

    // Ensure that the inputs' innerHTML property is still empty strings (script tries to set innerHTML and would only run if calculate executes).
    const innerHTMLs = await page.evaluate(() => {
      const result = [];
      for (let i = 1; i <= 7; i++) {
        const el = document.getElementById(`node${i}_weight`);
        // If the element exists, record both .value and .innerHTML for inspection.
        if (el) {
          result.push({ id: `node${i}_weight`, value: el.value, innerHTML: el.innerHTML });
        } else {
          result.push({ id: `node${i}_weight`, value: null, innerHTML: null });
        }
      }
      return result;
    });

    // Assert the shapes and expected content:
    for (let i = 0; i < innerHTMLs.length; i++) {
      const entry = innerHTMLs[i];
      expect(entry.value).toBe(String((i + 1) * 10));
      // Because the broken script sets innerHTML (not value) and likely never executed, innerHTML for input elements should remain an empty string.
      expect(entry.innerHTML).toBe('');
    }

    // Now attempt to click the Calculate button and ensure that clicking still triggers an error (doesn't clear or alter the values).
    pageErrors.length = 0;
    consoleErrors.length = 0;
    await page.click('button:has-text("Calculate Weighted Graph")');
    await page.waitForTimeout(100);

    // Values should remain unchanged after the click.
    for (let i = 1; i <= 7; i++) {
      await expect(page.locator(`#node${i}_weight`)).toHaveValue(String(i * 10));
    }

    // Confirm that clicking caused an error as expected.
    const totalErrorsAfterClick = pageErrors.length + consoleErrors.length;
    expect(totalErrorsAfterClick).toBeGreaterThan(0);
  });

  // Test 5: Accessibility and interaction checks - ensure the button is reachable and focusable.
  test('Calculate button is visible, enabled and focusable', async ({ page }) => {
    const button = page.locator('button:has-text("Calculate Weighted Graph")');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Focus the button and ensure document.activeElement becomes it.
    await button.focus();
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeTag).toBe('BUTTON');
  });
});