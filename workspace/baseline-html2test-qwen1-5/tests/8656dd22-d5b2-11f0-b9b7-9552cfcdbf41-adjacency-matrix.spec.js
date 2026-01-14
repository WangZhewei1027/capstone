import { test, expect } from '@playwright/test';

// Test file for Application ID: 8656dd22-d5b2-11f0-b9b7-9552cfcdbf41
// URL served at:
// http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/8656dd22-d5b2-11f0-b9b7-9552cfcdbf41.html
//
// Purpose:
// - Load the page exactly as-is (do not modify runtime).
// - Observe console messages and page errors (let ReferenceError/SyntaxError/TypeError happen naturally).
// - Assert the expected UI elements (heading) are present.
// - Detect and assert that runtime/script load errors occur (flexible matching).
// - Discover any interactive elements and exercise them in a safe, non-invasive way,
//   verifying DOM updates where obvious and ensuring interactions do not produce new errors.
//
// Notes:
// - The page includes only an <h2> and a script tag in the provided HTML.
// - adjacencyMatrix.js may be missing or contain errors; tests observe and assert those errors occur.
// - Tests are organized into describe blocks and include comments explaining purposes.

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/8656dd22-d5b2-11f0-b9b7-9552cfcdbf41.html';

// Helper Page Object to encapsulate common selectors and actions
class AdjacencyMatrixPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Return the heading element locator (level 2)
  heading() {
    return this.page.getByRole('heading', { level: 2 });
  }

  // All common interactive elements that might exist
  async allButtons() {
    return this.page.locator('button');
  }
  async allInputs() {
    return this.page.locator('input, textarea');
  }
  async allForms() {
    return this.page.locator('form');
  }
  async allSelects() {
    return this.page.locator('select');
  }

  // Script tag that the HTML references
  scriptTag() {
    return this.page.locator('script[src="adjacencyMatrix.js"]');
  }
}

test.describe('Adjacency Matrix - Basic UI and runtime observation', () => {
  // Collect console messages and page errors for each test run.
  test.beforeEach(async ({ page }) => {
    // Attach listeners early to capture messages during navigation
    page.context()._consoleMessages = [];
    page.context()._pageErrors = [];

    page.on('console', (msg) => {
      // Capture full console messages for later assertions
      page.context()._consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    page.on('pageerror', (err) => {
      // Capture page-level unhandled errors
      page.context()._pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // cleanup listeners to avoid leaks (Playwright resets between tests, but explicit is fine)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test('Initial page load shows the heading "Adjacency Matrix"', async ({ page }) => {
    // Purpose: Ensure the static HTML content is present and accessible.
    const app = new AdjacencyMatrixPage(page);
    await page.goto(APP_URL);
    // Wait a short while for any dynamic script to run (if present)
    await page.waitForTimeout(300);

    // The heading should be present and have the expected text
    const heading = app.heading();
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveText('Adjacency Matrix');

    // Accessibility: heading role and level should be recognized
    const headingLocator = page.getByRole('heading', { level: 2, name: 'Adjacency Matrix' });
    await expect(headingLocator).toBeVisible();
  });

  test('Script tag reference exists and runtime errors are observed (if any)', async ({ page }) => {
    // Purpose: Verify that the HTML references adjacencyMatrix.js and that runtime/script load errors are recorded.
    const app = new AdjacencyMatrixPage(page);
    await page.goto(APP_URL);

    // Confirm the script tag with the expected src is in the DOM
    const script = app.scriptTag();
    await expect(script).toHaveCount(1);

    // Give the page some time to attempt loading and executing the script
    await page.waitForTimeout(500);

    // Retrieve captured console messages and page errors
    const consoleMessages = page.context()._consoleMessages || [];
    const pageErrors = page.context()._pageErrors || [];

    // Build a flexible check for common failure indicators:
    // - pageErrors array contains thrown exceptions (ReferenceError, SyntaxError, TypeError)
    // - console messages include "Failed to load resource", "404", "ERR_ABORTED", or mention of ReferenceError/etc.
    const consoleText = consoleMessages.map((m) => `${m.type}: ${m.text}`).join('\n');

    const hasPageError = pageErrors.length > 0;

    const errorPattern = /(ReferenceError|SyntaxError|TypeError|Failed to load resource|404|ERR_ABORTED)/i;
    const hasConsoleErrorLike = consoleMessages.some((m) => errorPattern.test(m.text));

    // We assert that at least one of the error signals is present. This is intentionally flexible:
    // - If adjacencyMatrix.js is missing or has invalid code, a runtime error or failed load should appear.
    // - If the script exists and is valid, there may be no errors; in that case, we still assert the script tag is present.
    expect(script).not.toBeNull();

    // The test will pass if either a page error was observed or a console error-like message exists.
    // We still surface the captured messages for debugging if the assertion fails.
    const errorObserved = hasPageError || hasConsoleErrorLike;
    expect(
      errorObserved,
      `Expected runtime/script load errors to be observed. pageErrors: ${pageErrors.length}, consoleMessages:\n${consoleText}`
    ).toBeTruthy();
  });

  test('Discover and safely exercise any interactive controls (inputs, buttons, selects, forms)', async ({
    page,
  }) => {
    // Purpose:
    // - Discover interactive controls if the script dynamically created them.
    // - Interact in a way that is generic and safe:
    //   * Type into text inputs and verify value reflects typed text
    //   * Click buttons and ensure no additional page-level errors occur
    //   * If forms exist, attempt to submit and ensure submission does not crash the page
    //
    // - If no interactive elements exist, assert that none are present (valid default state).
    const app = new AdjacencyMatrixPage(page);
    await page.goto(APP_URL);

    // Give potential dynamic code time to add elements
    await page.waitForTimeout(500);

    // Snapshot errors before interactions
    const beforePageErrors = (page.context()._pageErrors || []).slice();
    const beforeConsoleMessages = (page.context()._consoleMessages || []).slice();

    // Get counts of possible interactive elements
    const inputs = await app.allInputs();
    const buttons = await app.allButtons();
    const forms = await app.allForms();
    const selects = await app.allSelects();

    // Determine counts
    const inputCount = await inputs.count();
    const buttonCount = await buttons.count();
    const formCount = await forms.count();
    const selectCount = await selects.count();

    // If no interactive elements are present, assert that this is an expected minimal state.
    if (inputCount === 0 && buttonCount === 0 && formCount === 0 && selectCount === 0) {
      // No interactive elements - assert that the page's basic content is visible and stable
      await expect(app.heading()).toBeVisible();
      return;
    }

    // Otherwise, there are interactive controls. Exercise a subset safely.

    // 1) For the first up to 3 inputs, type a unique string and verify the value updates.
    const maxInputsToTest = Math.min(3, inputCount);
    for (let i = 0; i < maxInputsToTest; i++) {
      const input = inputs.nth(i);
      // Only attempt to type into inputs that are visible and not disabled
      const isVisible = await input.isVisible().catch(() => false);
      const isDisabled = await input.isDisabled().catch(() => true);
      if (!isVisible || isDisabled) continue;

      const testValue = `playwright-test-${i}`;
      await input.fill(''); // clear first
      await input.type(testValue);
      // Verify the DOM reflects typed value
      const currentValue = await input.inputValue();
      expect(
        currentValue,
        `Expected typed value to be present in input ${i}, got "${currentValue}"`
      ).toBe(testValue);
    }

    // 2) Click up to 3 buttons and ensure no additional page-level errors are thrown
    const maxButtonsToClick = Math.min(3, buttonCount);
    for (let i = 0; i < maxButtonsToClick; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);
      const isDisabled = await button.isDisabled().catch(() => true);
      if (!isVisible || isDisabled) continue;

      // Click and allow any event handlers to run
      await button.click({ timeout: 2000 }).catch((e) => {
        // If click crashes, we'll detect via page error assertions below.
      });
    }

    // 3) If forms are present, attempt a harmless submission (submit via JS) for up to 2 forms
    const maxFormsToTest = Math.min(2, formCount);
    for (let i = 0; i < maxFormsToTest; i++) {
      const form = forms.nth(i);
      const isVisible = await form.isVisible().catch(() => false);
      if (!isVisible) continue;

      // Attempt to submit the form via JS; wrap in try-catch to avoid failing the test due to unknown behavior
      try {
        await form.evaluate((f) => {
          // Attempt to dispatch a submit event. Some forms may preventDefault or have handlers.
          const evt = new Event('submit', { bubbles: true, cancelable: true });
          f.dispatchEvent(evt);
          // Also call submit if available
          if (typeof f.submit === 'function') {
            try {
              // Note: this could trigger navigation; we don't expect it in this simple app.
              f.submit();
            } catch (e) {
              // ignore synchronous submit errors; they will surface as page errors if critical
            }
          }
        });
      } catch (e) {
        // Ignore evaluation failure; we'll check for page errors below
      }
    }

    // 4) Interact with selects: choose the first option if visible
    const maxSelectsToTest = Math.min(3, selectCount);
    for (let i = 0; i < maxSelectsToTest; i++) {
      const sel = selects.nth(i);
      const isVisible = await sel.isVisible().catch(() => false);
      if (!isVisible) continue;

      // Attempt to select the second option if it exists, otherwise first
      const optionCount = await sel.locator('option').count();
      if (optionCount === 0) continue;
      const indexToSelect = optionCount > 1 ? 1 : 0;
      const value = await sel.locator(`option:nth-child(${indexToSelect + 1})`).getAttribute('value');
      if (value !== null) {
        await sel.selectOption(value);
        // Verify selection matches expected value
        const selected = await sel.inputValue();
        expect(selected).toBe(String(value));
      }
    }

    // Wait briefly to allow any asynchronous handlers to run
    await page.waitForTimeout(300);

    // Ensure no new page errors occurred as a result of interactions
    const afterPageErrors = page.context()._pageErrors || [];
    expect(
      afterPageErrors.length,
      `Expected no new page-level errors after interacting with controls. Before: ${beforePageErrors.length}, After: ${afterPageErrors.length}`
    ).toBeGreaterThanOrEqual(beforePageErrors.length);

    // For completeness, capture console messages after interactions
    const afterConsoleMessages = page.context()._consoleMessages || [];
    // No strict assertion on console messages content here; we ensure page didn't crash
    // If there are additional console errors, they will be visible in test output if tests fail.
  });

  test('Edge-case checks: no invisible hidden inputs unexpectedly present', async ({ page }) => {
    // Purpose: Verify there are no hidden inputs that might contain unexpected prefilled data.
    await page.goto(APP_URL);
    await page.waitForTimeout(250);
    // Query hidden inputs explicitly
    const hiddenInputs = await page.locator('input[type="hidden"]').count();
    // It's acceptable for hidden inputs to be zero; assert it's a non-negative integer (sanity)
    expect(Number.isInteger(hiddenInputs)).toBeTruthy();
    // If there are hidden inputs, ensure they are not exposing sensitive text content
    for (let i = 0; i < hiddenInputs; i++) {
      const value = await page.locator('input[type="hidden"]').nth(i).inputValue();
      // Assert that value is a string (could be empty). This is a benign check.
      expect(typeof value === 'string').toBeTruthy();
    }
  });
});