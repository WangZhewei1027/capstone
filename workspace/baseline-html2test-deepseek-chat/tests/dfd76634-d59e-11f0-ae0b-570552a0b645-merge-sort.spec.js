import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76634-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Merge Sort Visualization - dfd76634-d59e-11f0-ae0b-570552a0b-570552a0b645', () => {
  // Arrays to collect console messages and page errors for each test
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  // Setup listeners before each test and navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages (log, info, warn, error, etc.)
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push({ type, text });
      if (type === 'error') consoleErrors.push(text);
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the app URL
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Teardown (not strictly necessary, but makes intent clear)
  test.afterEach(async () => {
    // Clear collected arrays
    consoleMessages = null;
    consoleErrors = null;
    pageErrors = null;
  });

  test('Initial load: default input value, buttons present, steps empty, console contains explanation, no page errors', async ({ page }) => {
    // Purpose: Verify that the page loads correctly with expected default state
    const input = page.locator('#array-input');
    const sortBtn = page.locator('#sort-btn');
    const resetBtn = page.locator('#reset-btn');
    const stepsContainer = page.locator('#steps-container');

    // Check default input value
    await expect(input).toHaveValue('38,27,43,3,9,82,10');

    // Buttons should be visible and enabled
    await expect(sortBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(sortBtn).toBeEnabled();
    await expect(resetBtn).toBeEnabled();

    // Steps container should be empty on initial load
    await expect(stepsContainer).toBeVisible();
    await expect(stepsContainer.locator('.step')).toHaveCount(0);

    // Verify the console contained the Merge Sort explanation log emitted during DOMContentLoaded
    const foundExplanation = consoleMessages.some(m =>
      typeof m.text === 'string' && m.text.includes('Merge Sort Algorithm Explanation:')
    );
    expect(foundExplanation, 'Expected a console log containing the Merge Sort explanation').toBeTruthy();

    // Assert there are no uncaught page errors
    expect(pageErrors.length, `Expected no uncaught page errors, found: ${pageErrors.join('; ')}`).toBe(0);

    // Also assert there are no console error messages
    expect(consoleErrors.length, `Expected no console.error messages, found: ${consoleErrors.join('; ')}`).toBe(0);
  });

  test('Clicking Sort populates steps and displays final sorted array with correct classes', async ({ page }) => {
    // Purpose: Ensure sorting runs and the visualization steps are rendered correctly,
    // including final sorted result and classification of steps (comparison/merging/sorted)
    const sortBtn = page.locator('#sort-btn');
    const stepsContainer = page.locator('#steps-container');

    // Click Sort
    await sortBtn.click();

    // After clicking Sort, many steps should be displayed
    const stepLocator = stepsContainer.locator('.step');
    await expect(stepLocator).toHaveCountGreaterThan(0);

    // There should be at least one 'comparison' and one 'merging' visual item
    const comparisonItems = stepsContainer.locator('.comparison');
    const mergingItems = stepsContainer.locator('.merging');
    await expect(comparisonItems.count()).toBeGreaterThan(0);
    await expect(mergingItems.count()).toBeGreaterThan(0);

    // The final step should contain "Final sorted array" and be marked with 'sorted' class
    const sortedItems = stepsContainer.locator('.sorted');
    await expect(sortedItems).toHaveCount(1);
    const finalText = await sortedItems.nth(0).innerText();
    expect(finalText).toContain('Final sorted array');

    // Extract the numbers from the final sorted array text and verify ascending order
    // finalText example: "Final sorted array: [3, 9, 10, 27, 38, 43, 82]"
    const matches = finalText.match(/\[([0-9,\s-]+)\]/);
    expect(matches, 'Expected final sorted array to contain an array representation').not.toBeNull();
    const numbers = matches[1].split(',').map(s => parseInt(s.trim(), 10));
    // verify numbers are strictly non-decreasing
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i - 1]);
    }

    // After sorting completes, the Sort button should be enabled again
    await expect(sortBtn).toBeEnabled();

    // Ensure no uncaught page errors occurred during sorting
    expect(pageErrors.length, `Expected no uncaught page errors during sorting, found: ${pageErrors.join('; ')}`).toBe(0);
  });

  test('Reset button clears steps and restores default input value', async ({ page }) => {
    // Purpose: Validate that Reset restores the initial state (input and steps)
    const input = page.locator('#array-input');
    const sortBtn = page.locator('#sort-btn');
    const resetBtn = page.locator('#reset-btn');
    const stepsContainer = page.locator('#steps-container');

    // Change input to a different array and run sort to create steps
    await input.fill('5,4,3,2,1');
    await sortBtn.click();

    // Confirm that steps were created
    await expect(stepsContainer.locator('.step')).toHaveCountGreaterThan(0);

    // Click Reset and confirm state restored
    await resetBtn.click();

    // Steps should be cleared
    await expect(stepsContainer.locator('.step')).toHaveCount(0);

    // Input should be reset to the original default value
    await expect(input).toHaveValue('38,27,43,3,9,82,10');

    // Buttons should be enabled
    await expect(sortBtn).toBeEnabled();
    await expect(resetBtn).toBeEnabled();

    // No uncaught page errors
    expect(pageErrors.length, `Expected no uncaught page errors after reset, found: ${pageErrors.join('; ')}`).toBe(0);
  });

  test('Empty input shows alert "Please enter valid numbers" (edge case)', async ({ page }) => {
    // Purpose: Test validation path where user attempts to sort with no valid numbers
    const input = page.locator('#array-input');
    const sortBtn = page.locator('#sort-btn');

    // Clear the input to produce invalid input
    await input.fill('');

    // Listen for dialog triggered by alert and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      sortBtn.click()
    ]);

    expect(dialog).toBeDefined();
    expect(dialog.message()).toBe('Please enter valid numbers');

    // Dismiss the alert to allow the page to continue functioning
    await dialog.dismiss();

    // Ensure no uncaught page errors occurred as a result
    expect(pageErrors.length, `Expected no uncaught page errors after alert, found: ${pageErrors.join('; ')}`).toBe(0);
  });

  test('DOM structure consistency: presence of key elements and classes after operations', async ({ page }) => {
    // Purpose: Verify persistent DOM elements and expected class usage during typical operations
    const input = page.locator('#array-input');
    const sortBtn = page.locator('#sort-btn');
    const resetBtn = page.locator('#reset-btn');
    const stepsContainer = page.locator('#steps-container');

    // Sanity checks on static DOM elements
    await expect(page.locator('h1')).toHaveText('Merge Sort Visualization');
    await expect(page.locator('label[for="array-input"]')).toBeVisible();
    await expect(input).toBeVisible();
    await expect(sortBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();

    // Run sort to populate steps and inspect step element structure
    await sortBtn.click();

    const steps = await stepsContainer.locator('.step').elementHandles();
    expect(steps.length).toBeGreaterThan(0);

    // Inspect a few steps to ensure inner structure uses .array-display and appropriate classes
    const firstStepHtml = await stepsContainer.locator('.step').first().innerHTML();
    expect(firstStepHtml).toContain('array-display');

    // There should be at least one element with the 'merging' class and one with 'comparison'
    await expect(stepsContainer.locator('.merging')).toHaveCountGreaterThan(0);
    await expect(stepsContainer.locator('.comparison')).toHaveCountGreaterThan(0);

    // Verify there is exactly one final 'sorted' display
    await expect(stepsContainer.locator('.sorted')).toHaveCount(1);

    // Ensure no uncaught page errors were captured
    expect(pageErrors.length, `Expected no uncaught page errors during DOM structure checks, found: ${pageErrors.join('; ')}`).toBe(0);
  });
});