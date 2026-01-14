import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/3cca7660-d5af-11f0-852d-73feb043b9f3.html';

test.describe('Kruskal\'s Algorithm - static HTML validation and runtime observations', () => {
  // Arrays to collect runtime issues and console output for each test run
  let pageErrors = [];
  let consoleMessages = [];
  let consoleErrors = [];

  // Attach listeners before each test to capture console and page errors that happen during navigation/load
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];
    consoleErrors = [];

    // Capture unhandled exceptions from the page
    page.on('pageerror', (err) => {
      // Store the actual Error object for later assertions
      pageErrors.push(err);
    });

    // Capture all console messages and separately track console.error messages
    page.on('console', (msg) => {
      consoleMessages.push(msg);
      if (msg.type() === 'error') consoleErrors.push(msg);
    });

    // Navigate to the application and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Cleanup listeners after each test to avoid cross-test noise (Playwright auto-cleans page between tests,
  // but this ensures our arrays are reset and no duplicate listeners persist)
  test.afterEach(async ({ page }) => {
    // remove listeners by recreating page event handlers are local to the page instance and cleared between tests
    // No explicit teardown code is required here beyond resetting arrays in beforeEach
  });

  test('Initial page load: heading, description, and list structure are present and correct', async ({ page }) => {
    // Purpose: Verify the static content on initial load matches the HTML structure provided.

    // Check the main heading
    const heading = await page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Kruskal's Algorithm");

    // Check the descriptive paragraph exists and contains reference to algorithm
    const paragraph = await page.locator('p');
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toContainText('A simple algorithm');

    // Check the list exists and has exactly 11 list items as in the HTML
    const listItems = page.locator('ul > li');
    await expect(listItems).toHaveCount(11);

    // Spot check contents of a few list items to ensure correct ordering and text presence
    await expect(listItems.nth(0)).toContainText('Start at the first element');
    await expect(listItems.nth(1)).toContainText('The first element is always at its position');
    await expect(listItems.nth(10)).toContainText('The eleventh element is the sum');

    // Verify there are no interactive controls rendered in the DOM (buttons, inputs, selects, textareas, forms)
    // Purpose: The provided HTML is static; tests assert that interactive elements are absent.
    const buttonsCount = await page.locator('button').count();
    const inputsCount = await page.locator('input').count();
    const selectsCount = await page.locator('select').count();
    const textareasCount = await page.locator('textarea').count();
    const formsCount = await page.locator('form').count();

    await expect(buttonsCount).toBe(0);
    await expect(inputsCount).toBe(0);
    await expect(selectsCount).toBe(0);
    await expect(textareasCount).toBe(0);
    await expect(formsCount).toBe(0);
  });

  test('Runtime: observe console messages and page errors (should be none for a static HTML page)', async ({ page }) => {
    // Purpose: Capture console output and uncaught page errors during load and assert expected behavior.
    //
    // We collect all console messages and page errors via listeners in beforeEach.
    // For this static HTML page we expect there to be no console.error messages and no uncaught page errors.
    // If any errors do occur naturally in the environment, the test will report them by failing these assertions.

    // Small sanity checks that we captured the DOM and can query elements
    await expect(page.locator('h1')).toBeVisible();

    // Assert there were no uncaught exceptions on the page
    expect(pageErrors.length, `Expected zero uncaught page errors but found: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);

    // Assert there were no console.error messages emitted
    expect(consoleErrors.length, `Expected zero console.error messages but found ${consoleErrors.length}`).toBe(0);

    // Additionally assert that all console messages (if any) are informational (not marked as error)
    for (const msg of consoleMessages) {
      expect(msg.type() !== 'error', `Found console message of type 'error': ${msg.text()}`).toBe(true);
    }

    // If an environment causes a SyntaxError, ReferenceError or TypeError naturally, those would appear in pageErrors.
    // This test specifically asserts none of those error types were thrown.
    for (const err of pageErrors) {
      // Fail if any of these common JS error types are present
      const name = err && err.name ? err.name : '';
      expect(['ReferenceError', 'SyntaxError', 'TypeError'].includes(name)).toBe(false);
    }
  });

  test('Accessibility & visibility checks for static content', async ({ page }) => {
    // Purpose: Validate basic accessibility-related properties and visibility of content.

    // The H1 should be the first visible heading
    const firstHeading = await page.locator('h1').first();
    await expect(firstHeading).toHaveText("Kruskal's Algorithm");

    // The list should be visible and each list item should have non-empty text content
    const items = page.locator('ul > li');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).textContent()) || '';
      // Every list item should have some descriptive text (non-empty after trimming)
      expect(text.trim().length).toBeGreaterThan(0);
    }

    // Ensure that document language attribute is set (lang="en" in the provided HTML)
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('en');
  });

  test('Edge case: attempt interactions that should not exist and assert no changes', async ({ page }) => {
    // Purpose: Try to interact with non-existent controls and verify that the DOM remains unchanged.

    // Snapshot some content prior to "interactions"
    const initialHtml = await page.locator('body').innerHTML();

    // Attempt clicks on non-existent elements via selectors that would target typical controls
    await page.click('button', { timeout: 1000 }).catch(() => { /* expected: no button to click */ });
    await page.click('input[type="submit"]', { timeout: 1000 }).catch(() => { /* expected: no input to click */ });
    await page.fill('input[type="text"]', 'test value').catch(() => { /* expected: no input to fill */ });

    // After no-op interactions, DOM should match initial snapshot
    const postHtml = await page.locator('body').innerHTML();
    expect(postHtml).toBe(initialHtml);
  });
});