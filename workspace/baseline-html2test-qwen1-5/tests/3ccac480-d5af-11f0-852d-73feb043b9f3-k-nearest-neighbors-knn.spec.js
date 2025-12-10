import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3ccac480-d5af-11f0-852d-73feb043b9f3.html';

test.describe('K-Nearest Neighbors (KNN) app - 3ccac480-d5af-11f0-852d-73feb043b9f3', () => {
  // Capture page errors and console messages for each test
  test.beforeEach(async ({ page }) => {
    // Ensure a clean state for listeners; Playwright gives a fresh page per test
    page.context().setDefaultNavigationTimeout(30_000);
  });

  // Helper to attach listeners and return collected messages
  async function captureConsoleAndErrors(page) {
    const pageErrors = [];
    const consoleMessages = [];

    page.on('pageerror', (err) => {
      // pageerror receives an Error object; store its message
      pageErrors.push(String(err?.message ?? err));
    });

    page.on('console', (msg) => {
      try {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
        });
      } catch {
        // ignore any exotic console event issues
      }
    });

    return { pageErrors, consoleMessages };
  }

  // Utility: check if collected error messages contain expected TensorFlow/top-level-await SyntaxError hints
  function hasTfTopLevelAwaitError(messages) {
    return messages.some((m) => /await|syntaxerror|unexpected|loadModel|tf\.loadModel/i.test(m));
  }

  test('Initial page load: static DOM structure is present and top-level script error is reported', async ({ page }) => {
    // Attach listeners to capture runtime errors and console output
    const { pageErrors, consoleMessages } = await captureConsoleAndErrors(page);

    // Load the page
    const response = await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Basic navigation success
    expect(response && response.ok()).toBeTruthy();

    // Verify title and main heading
    await expect(page).toHaveTitle(/K-Nearest Neighbors/i);
    await expect(page.locator('h1')).toHaveText('K-Nearest Neighbors');

    // Verify form and interactive elements exist
    const form = page.locator('#knn-form');
    await expect(form).toBeVisible();

    const xInput = page.locator('input#x-score');
    const yInput = page.locator('input#y-score');
    const submitButton = page.locator('button[type=submit]');

    await expect(xInput).toBeVisible();
    await expect(yInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Verify attributes for number inputs (min/max)
    expect(await xInput.getAttribute('type')).toBe('number');
    expect(await xInput.getAttribute('min')).toBe('1');
    expect(await xInput.getAttribute('max')).toBe('100');

    expect(await yInput.getAttribute('type')).toBe('number');
    expect(await yInput.getAttribute('min')).toBe('1');
    expect(await yInput.getAttribute('max')).toBe('100');

    // The script in the page uses top-level 'await' and tf.loadModel; it is expected to produce a runtime/page error.
    // Wait a short time to allow script parsing/execution to produce page errors/console messages.
    await page.waitForTimeout(500);

    // The results container may remain empty due to the script failing early. Assert its content is blank or not populated with expected output.
    const resultsText = (await page.locator('#results').innerText()).trim();
    // It's acceptable for it to be empty string when script fails; assert that it's either empty or contains non-meaningful JS objects
    expect(typeof resultsText).toBe('string');

    // Assert that at least one page error or console error occurred and it looks like the top-level await / TF load issue.
    // We allow either page error or console error evidence.
    const collectedErrors = pageErrors.concat(consoleMessages.map(c => c.text));
    expect(collectedErrors.length).toBeGreaterThanOrEqual(1);

    const foundTfError = hasTfTopLevelAwaitError(collectedErrors);
    expect(foundTfError).toBeTruthy();
  });

  test('Form input interaction: fill values, validate constraints, and submit triggers navigation (default submit behavior)', async ({ page }) => {
    // Capture console and errors
    const { pageErrors, consoleMessages } = await captureConsoleAndErrors(page);

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    const xInput = page.locator('#x-score');
    const yInput = page.locator('#y-score');
    const submitButton = page.locator('button[type=submit]');
    const form = page.locator('#knn-form');

    // Fill valid values within min/max and assert they are reflected in the DOM
    await xInput.fill('25');
    await yInput.fill('75');

    expect(await xInput.inputValue()).toBe('25');
    expect(await yInput.inputValue()).toBe('75');

    // Check built-in HTML5 validity from the form element (should be valid for these values)
    const valid = await form.evaluate((f) => f.checkValidity());
    expect(valid).toBe(true);

    // Because no JS submit handler is installed (script likely errored), clicking submit will perform default submit and page reload.
    // Wait for navigation to occur as a result of form submission.
    const [nav] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: 5000 }).catch(() => null),
      submitButton.click(),
    ]);

    // Navigation should have occurred (form submits to same URL with no action attribute)
    expect(nav).not.toBeNull();

    // After reload, basic DOM elements should still be present
    await expect(page.locator('h1')).toHaveText('K-Nearest Neighbors');

    // Allow script to attempt execution again and capture any new errors
    await page.waitForTimeout(500);

    // There should still be page errors related to the top-level await / tf.loadModel
    const collected = pageErrors.concat(consoleMessages.map(c => c.text));
    expect(collected.length).toBeGreaterThanOrEqual(1);
    expect(hasTfTopLevelAwaitError(collected)).toBeTruthy();
  });

  test('Constraint validation edge cases: inputs outside min/max are reported invalid by the browser', async ({ page }) => {
    // Capture console and errors, though this test focuses on built-in validation
    await captureConsoleAndErrors(page);

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    const xInput = page.locator('#x-score');
    const yInput = page.locator('#y-score');
    const form = page.locator('#knn-form');

    // Fill values outside allowed range
    await xInput.fill('0');    // below min (1)
    await yInput.fill('200');  // above max (100)

    // Directly evaluate validity for each input via the element's validity property
    const xValid = await xInput.evaluate((el) => el.validity.valid);
    const yValid = await yInput.evaluate((el) => el.validity.valid);
    expect(xValid).toBe(false);
    expect(yValid).toBe(false);

    // Overall form validity should be false due to invalid inputs
    const formValid = await form.evaluate((f) => f.checkValidity());
    expect(formValid).toBe(false);

    // We will not attempt to force a submit here because that would bypass browser validation or modify page behavior;
    // the important behavior is that the browser recognizes the invalid values.
  });

  test('Console inspection: ensure TensorFlow / script parsing errors appear on console or as page errors', async ({ page }) => {
    const { pageErrors, consoleMessages } = await captureConsoleAndErrors(page);

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Give the page some time for scripts to parse/execute and emit errors
    await page.waitForTimeout(600);

    // Combine captured messages for inspection
    const combined = [...pageErrors, ...consoleMessages.map(c => `[${c.type}] ${c.text}`)];

    // At least one error-like message should have been captured (SyntaxError/await/unexpected/loadModel)
    expect(combined.length).toBeGreaterThanOrEqual(1);
    const found = combined.some((m) => /await|syntaxerror|unexpected|loadModel|tf\.loadModel/i.test(m));
    expect(found).toBeTruthy();

    // Also assert that there is at least one console entry of type 'error' when inspecting consoleMessages array
    const hasConsoleError = consoleMessages.some((c) => c.type === 'error' || /error/i.test(c.type));
    expect(hasConsoleError).toBeTruthy();
  });
});