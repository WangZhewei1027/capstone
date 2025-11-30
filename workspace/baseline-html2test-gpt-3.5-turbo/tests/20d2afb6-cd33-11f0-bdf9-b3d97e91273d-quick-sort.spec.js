import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb6-cd33-11f0-bdf9-b3d97e91273d.html';

// Page selectors used across tests
const selectors = {
  arrayInput: '#arrayInput',
  startSortBtn: '#startSort',
  arrayDisplay: '#arrayDisplay',
  stepsDisplay: '#stepsDisplay',
  speedRange: '#speedRange',
  speedValue: '#speedValue',
  arrayItems: '#arrayDisplay .array-item',
};

test.describe('Quick Sort Visualization - end-to-end', () => {
  let consoleErrors;

  // Before each test navigate to the application and start listening for console errors and page errors.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ type: 'console', text: msg.text() });
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push({ type: 'pageerror', text: String(err) });
    });

    await page.goto(APP_URL);
  });

  // After each test assert that no unexpected console or page errors occurred during the test.
  test.afterEach(async () => {
    // Fail the test if any console errors or page errors were captured.
    expect(consoleErrors, `Unexpected console/page errors:\n${consoleErrors.map(e => e.text).join('\n')}`).toHaveLength(0);
  });

  // Test initial page load and default state
  test('Initial page load: UI elements present and default values', async ({ page }) => {
    // Ensure the main interactive elements are present and visible
    await expect(page.locator(selectors.arrayInput)).toBeVisible();
    await expect(page.locator(selectors.startSortBtn)).toBeVisible();
    await expect(page.locator(selectors.speedRange)).toBeVisible();
    await expect(page.locator(selectors.speedValue)).toBeVisible();
    await expect(page.locator(selectors.arrayDisplay)).toBeVisible();
    await expect(page.locator(selectors.stepsDisplay)).toBeVisible();

    // The input should be empty by default
    await expect(page.locator(selectors.arrayInput)).toHaveValue('');

    // The start button should be enabled by default
    await expect(page.locator(selectors.startSortBtn)).toBeEnabled();

    // The speed value should show the default of 500 ms
    await expect(page.locator(selectors.speedValue)).toHaveText('500 ms');

    // There should be no array items rendered initially
    await expect(page.locator(selectors.arrayItems)).toHaveCount(0);

    // Steps display should be empty initially
    const stepsText = await page.locator(selectors.stepsDisplay).textContent();
    expect(stepsText.trim()).toBe('');
  });

  // Test speed control updates the displayed speed value
  test('Speed control: changing range updates displayed speed text', async ({ page }) => {
    // Change speed range value using setInputFiles style method: use evaluate to set the value and dispatch input event
    await page.evaluate(() => {
      const range = document.getElementById('speedRange');
      range.value = '100';
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(page.locator(selectors.speedValue)).toHaveText('100 ms');

    // Also try another value to ensure dynamic update works
    await page.evaluate(() => {
      const range1 = document.getElementById('speedRange');
      range.value = '750';
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(page.locator(selectors.speedValue)).toHaveText('750 ms');
  });

  // Test edge case: clicking Start Sorting with empty input should show an alert
  test('Validation: empty input triggers alert asking for numbers', async ({ page }) => {
    // Ensure input is empty
    await page.fill(selectors.arrayInput, '');

    // Wait for the dialog to appear when clicking start
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click(selectors.startSortBtn),
    ]);

    // Assert the alert message is the expected validation message
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter some numbers separated by commas.');

    // Close the alert
    await dialog.accept();
  });

  // Test edge case: invalid numbers produce an alert
  test('Validation: invalid numeric input triggers alert', async ({ page }) => {
    await page.fill(selectors.arrayInput, '5, abc, 7');

    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click(selectors.startSortBtn),
    ]);

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter valid numbers only.');
    await dialog.accept();
  });

  // Comprehensive test: run a full sort and verify DOM updates, steps log, and final sorted array
  test('Sorting flow: visual updates, steps logged, and final array sorted', async ({ page }) => {
    // Provide a known unsorted array
    await page.fill(selectors.arrayInput, '3,1,4,2');

    // Speed up animation to make test run quickly: set to minimal 50 ms
    await page.evaluate(() => {
      const range2 = document.getElementById('speedRange');
      range.value = '50';
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator(selectors.speedValue)).toHaveText('50 ms');

    // Click start and begin the sorting process
    const startBtn = page.locator(selectors.startSortBtn);
    const inputField = page.locator(selectors.arrayInput);

    // After clicking, the script disables the button and input
    await Promise.all([
      page.waitForFunction(selector => !document.querySelector(selector).disabled, {}, selectors.startSortBtn) // ensure enabled before click
    ]);

    // Click to start sorting
    await Promise.all([
      page.click(selectors.startSortBtn),
      // The first render and log happen synchronously in the click handler, ensure steps contain initial array
    ]);

    // Immediately after clicking, start button and input should be disabled during sorting
    await expect(startBtn).toBeDisabled();
    await expect(inputField).toBeDisabled();

    // Verify the initial array was rendered in the array display
    await page.waitForSelector(`${selectors.arrayDisplay} .array-item`);
    const initialItems = page.locator(selectors.arrayItems);
    await expect(initialItems).toHaveCount(4);
    const initialTexts = await initialItems.allTextContents();
    // Should reflect input sequence [3,1,4,2]
    expect(initialTexts.map(t => t.trim())).toEqual(['3', '1', '4', '2']);

    // The stepsDisplay should contain the initial array log entry
    await expect(page.locator(selectors.stepsDisplay)).toContainText('Initial array: [3, 1, 4, 2]');

    // During sorting, pivot, comparing, and swapped visual classes should appear at least once.
    // Wait for elements with those classes to appear within a generous timeout.
    // pivot class (rightmost element during partition) should appear
    await page.waitForSelector('#arrayDisplay .pivot', { timeout: 5000 });

    // comparing class should appear when comparisons occur
    await page.waitForSelector('#arrayDisplay .comparing', { timeout: 5000 });

    // swapped class should appear when a swap occurs (for this input swaps do occur)
    await page.waitForSelector('#arrayDisplay .swapped', { timeout: 5000 });

    // Wait until sorting completes: the steps display will include "Sorting complete!"
    await page.waitForFunction(() => {
      const steps = document.getElementById('stepsDisplay');
      return steps && steps.textContent && steps.textContent.includes('Sorting complete!');
    }, { timeout: 10000 });

    // After completion, start button and input should be re-enabled
    await expect(startBtn).toBeEnabled();
    await expect(inputField).toBeEnabled();

    // Final array rendering (no highlights) should show sorted order [1,2,3,4]
    const finalItems = page.locator(selectors.arrayItems);
    await expect(finalItems).toHaveCount(4);
    const finalTexts = await finalItems.allTextContents();
    expect(finalTexts.map(t => t.trim())).toEqual(['1', '2', '3', '4']);

    // The steps display should contain the final sorted array message
    await expect(page.locator(selectors.stepsDisplay)).toContainText('Final sorted array: [1, 2, 3, 4]');
  });
});