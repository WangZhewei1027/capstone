import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-qwen1-5/html/865640e1-d5b2-11f0-b9b7-9552cfcdbf41.html';

test.describe('Hash Map Example (865640e1-d5b2-11f0-b9b7-9552cfcdbf41)', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  // Attach listeners and navigate before each test to capture runtime console/page errors during load
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages with their type and text
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store the error message for assertions
      pageErrors.push(err.message || String(err));
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // No explicit teardown required; listeners are attached to the page instance and cleared by Playwright.
  });

  test('Initial load: title and top-level heading are correct', async ({ page }) => {
    // Verify the HTML title
    await expect(page).toHaveTitle('Hash Map Example');

    // Verify there is an H1 with the expected text
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Hash Map Example');
  });

  test('Page contains repeated explanatory paragraphs and example key/value text', async ({ page }) => {
    // Ensure there are many <p> elements produced by the static HTML
    const paragraphs = page.locator('p');
    const paragraphCount = await paragraphs.count();
    // The provided HTML repeats the same paragraph many times; expect at least 10 paragraphs to confirm repetition
    expect(paragraphCount).toBeGreaterThanOrEqual(10);

    // At least one paragraph should contain the example key and value mention "key1" and "value1"
    const hasKey1 = await page.locator('p', { hasText: 'key1' }).count();
    const hasValue1 = await page.locator('p', { hasText: 'value1' }).count();
    expect(hasKey1).toBeGreaterThanOrEqual(1);
    expect(hasValue1).toBeGreaterThanOrEqual(1);

    // Check that the first paragraph's text contains the phrase "This is a simple hash map."
    const firstPText = await paragraphs.nth(0).innerText();
    expect(firstPText).toMatch(/This is a simple hash map\./i);
  });

  test('There are no interactive form controls (inputs, buttons, selects, textareas, or forms)', async ({ page }) => {
    // Identify any interactive elements; the sample HTML is static and should not contain these
    const interactiveSelectors = 'input, button, select, textarea, form';
    const interactiveCount = await page.locator(interactiveSelectors).count();

    // Assert that the page contains no interactive controls
    expect(interactiveCount).toBe(0);

    // Additional explicit checks for typical interactive elements
    await expect(page.locator('button')).toHaveCount(0);
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('No console errors or uncaught page errors occurred during load', async () => {
    // Filter console messages for types that indicate problems
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');

    // Assert there are no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Assert there are no console error messages emitted during load
    // It's acceptable to have informational logs, but none are expected in this static HTML
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Accessibility check: heading is discoverable and main content is present', async ({ page }) => {
    // The H1 should be accessible via role and content should be present
    const h1 = page.getByRole('heading', { level: 1, name: 'Hash Map Example' });
    await expect(h1).toBeVisible();

    // Ensure that the document has at least one paragraph that is visible to users
    const visibleParagraph = page.locator('p:visible').first();
    await expect(visibleParagraph).toBeVisible();
    const text = await visibleParagraph.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('Edge case verification: searching for non-existent interactive controls fails gracefully', async ({ page }) => {
    // Try to locate an element that the page does not include (e.g., an "Add" button)
    const addButton = page.locator('button:has-text("Add"), button#add, button.add');
    await expect(addButton).toHaveCount(0);

    // Attempting to click such a non-existent control should not be done — instead, assert absence
    // We confirm the absence and therefore that no accidental interactive behavior exists
    expect(await addButton.count()).toBe(0);
  });

  test('Content stability: repeated paragraphs contain consistent example text', async ({ page }) => {
    // Collect a sample of paragraphs that mention the example key/value pair and ensure they match a common pattern
    const exampleParas = page.locator('p', { hasText: 'The key "key1" is associated with the value "value1"' });
    const sampleCount = await exampleParas.count();

    // The static HTML repeats that same example many times; expect at least a few occurrences
    expect(sampleCount).toBeGreaterThanOrEqual(1);

    // Verify that each matched paragraph contains both key and value strings
    for (let i = 0; i < sampleCount; i++) {
      const txt = await exampleParas.nth(i).innerText();
      expect(txt).toContain('key1');
      expect(txt).toContain('value1');
    }
  });
});