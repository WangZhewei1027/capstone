import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/90f6cdf3-d5a1-11f0-80b9-e1f86cea383f.html';

test.describe('Selection Sort - Interactive HTML Application (90f6cdf3-d5a1-11f0-80b9-e1f86cea383f)', () => {
  // We capture console messages and page errors for assertions.
  let consoleMessages = [];
  let pageErrors = [];
  let consoleHandler;
  let pageErrorHandler;

  // Before each test navigate to the page and attach listeners to observe runtime behavior.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events into an array for assertions.
    consoleHandler = msg => {
      try {
        // text() is typically available; fallback to JSON stringification for safety.
        consoleMessages.push(msg.text ? msg.text() : String(msg));
      } catch (e) {
        consoleMessages.push(String(msg));
      }
    };
    page.on('console', consoleHandler);

    // Capture uncaught exceptions / runtime errors
    pageErrorHandler = err => {
      pageErrors.push(err);
    };
    page.on('pageerror', pageErrorHandler);

    // Load the application page exactly as-is.
    await page.goto(APP_URL);
    // Give a small pause to let inline scripts run and console messages flush.
    await page.waitForTimeout(150);
  });

  // After each test remove listeners (cleanup).
  test.afterEach(async ({ page }) => {
    if (consoleHandler) page.off('console', consoleHandler);
    if (pageErrorHandler) page.off('pageerror', pageErrorHandler);
  });

  test('Initial page load shows correct static headings, description, and code container', async ({ page }) => {
    // Verify the page title
    await expect(page).toHaveTitle(/Selection Sort/i);

    // Verify the main heading is present and correct
    const heading = await page.locator('h1').innerText();
    expect(heading).toMatch(/Selection Sort/i);

    // Verify the description paragraph describes selection sort
    const paragraph = await page.locator('body > p').innerText();
    expect(paragraph).toContain('Selection sort is a simple sorting algorithm');

    // Verify there is a "Code" subheading
    const codeHeading = await page.locator('h2').innerText();
    expect(codeHeading).toMatch(/Code/i);

    // Verify a pre element exists and contains a script child element
    const preCount = await page.locator('pre').count();
    expect(preCount).toBeGreaterThan(0);

    // Ensure a script element is inside the pre (the implementation includes a script tag within pre)
    const scriptInPre = await page.$('pre > script');
    expect(scriptInPre).not.toBeNull();

    // There are no interactive controls (buttons, inputs, forms, selects, textareas) in the markup.
    const interactiveSelectors = ['button', 'input', 'form', 'select', 'textarea'];
    for (const sel of interactiveSelectors) {
      const count = await page.locator(sel).count();
      expect(count, `Expected no "${sel}" elements on the page`).toBe(0);
    }
  });

  test('Inline script logs original and sorted arrays to the console', async ({ page }) => {
    // We expect the inline script to have printed two console statements:
    // "Original array: ..." and "Sorted array: ..."
    // Wait briefly to ensure console messages are collected (scripts run on load).
    await page.waitForTimeout(100);

    // Ensure at least some console messages were captured
    expect(consoleMessages.length, 'Expected at least one console message from the inline script').toBeGreaterThanOrEqual(1);

    // Find messages that include the expected markers.
    const hasOriginal = consoleMessages.some(msg => msg.includes('Original array'));
    const hasSorted = consoleMessages.some(msg => msg.includes('Sorted array'));

    expect(hasOriginal).toBe(true);
    expect(hasSorted).toBe(true);

    // Additionally, verify that the sorted array printed contains the expected sorted values
    // from the default array [64, 34, 25, 12, 22, 11, 90] -> [11,12,22,25,34,64,90]
    const sortedMessage = consoleMessages.find(msg => msg.includes('Sorted array'));
    expect(sortedMessage).toBeTruthy();
    // Check presence of the sorted numbers in the output string
    expect(sortedMessage).toMatch(/11/);
    expect(sortedMessage).toMatch(/12/);
    expect(sortedMessage).toMatch(/22/);
    expect(sortedMessage).toMatch(/25/);
    expect(sortedMessage).toMatch(/34/);
    expect(sortedMessage).toMatch(/64/);
    expect(sortedMessage).toMatch(/90/);
  });

  test('selectionSort function is available on the page and sorts arrays as expected', async ({ page }) => {
    // Call the selectionSort function in the page context with various test arrays
    // and verify it returns sorted arrays. This validates data flow and algorithm correctness.
    const sortedSimple = await page.evaluate(() => {
      // The page defines selectionSort in the inline script; call it here.
      // We deliberately do not redefine or patch anything.
      return selectionSort([3, 1, 2]);
    });
    expect(sortedSimple).toEqual([1, 2, 3]);

    const sortedEmpty = await page.evaluate(() => selectionSort([]));
    expect(sortedEmpty).toEqual([]);

    const sortedSingle = await page.evaluate(() => selectionSort([42]));
    expect(sortedSingle).toEqual([42]);

    const sortedWithDuplicates = await page.evaluate(() => selectionSort([5, 3, 5, 2, 2]));
    expect(sortedWithDuplicates).toEqual([2, 2, 3, 5, 5]);
  });

  test('No unexpected runtime page errors occurred during load', async () => {
    // The inline script should execute without uncaught exceptions; assert that no page errors were captured.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
  });

  test('Confirms absence of interactive behaviors — asserts no click/input interactions possible', async ({ page }) => {
    // Since the page contains no interactive controls, attempting to locate a button or input should fail.
    const hasAnyInteractive = await page.evaluate(() => {
      return !!document.querySelector('button, input, textarea, select, form');
    });
    expect(hasAnyInteractive).toBe(false);

    // Attempting to click on non-existent controls should raise, so we assert that the selectors return empty.
    for (const sel of ['button', 'input', 'form', 'select', 'textarea']) {
      const count1 = await page.locator(sel).count1();
      expect(count).toBe(0);
    }
  });

  test('Accessibility basics: heading structure exists and is readable', async ({ page }) => {
    // Verify that there is at least one h1 and one h2 for accessibility outline
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h2Count).toBeGreaterThanOrEqual(1);

    // Ensure the main heading is visible
    await expect(page.locator('h1')).toBeVisible();

    // Ensure the description paragraph is visible
    await expect(page.locator('body > p')).toBeVisible();
  });
});