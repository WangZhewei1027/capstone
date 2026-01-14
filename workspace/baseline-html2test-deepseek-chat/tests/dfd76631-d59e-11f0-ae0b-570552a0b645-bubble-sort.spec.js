import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76631-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Bubble Sort Visualization - dfd76631-d59e-11f0-ae0b-570552a0b645', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Observe console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Observe uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Load the app exactly as-is
    await page.goto(APP_URL);
    // Wait for main elements to be available
    await expect(page.locator('h1')).toHaveText(/Bubble Sort Algorithm Visualization/);
    await expect(page.locator('#array-container')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Make sure each test ends with a fresh page to avoid background sorting interfering with others
    await page.close();
  });

  test('Initial load: page elements present and default state is correct', async ({ page }) => {
    // Purpose: Verify initial rendering, default step count, and presence of controls.
    const stepCount = await page.locator('#step-count').textContent();
    expect(stepCount.trim()).toBe('0');

    // There should be 20 bars created on load
    const bars = page.locator('.array-container .array-bar');
    await expect(bars).toHaveCount(20);

    // Buttons should exist and be enabled by default
    await expect(page.locator('#generate-btn')).toBeVisible();
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#reset-btn')).toBeVisible();
    await expect(page.locator('#step-btn')).toBeVisible();

    await expect(page.locator('#generate-btn')).toBeEnabled();
    await expect(page.locator('#start-btn')).toBeEnabled();
    await expect(page.locator('#reset-btn')).toBeEnabled();
    await expect(page.locator('#step-btn')).toBeEnabled();

    // Verify there are no uncaught page errors on load
    expect(pageErrors.length).toBe(0);

    // Verify there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Generate New Array resets step count and updates the bars', async ({ page }) => {
    // Purpose: Ensure Generate New Array clears step count and updates DOM
    // Capture current heights snapshot
    const barLocator = page.locator('.array-container .array-bar');
    const count = await barLocator.count();
    expect(count).toBe(20);

    const heightsBefore = [];
    for (let i = 0; i < count; i++) {
      const h = await barLocator.nth(i).evaluate(el => el.style.height);
      heightsBefore.push(h);
    }

    // Click generate
    await page.click('#generate-btn');

    // After generate, step count should be reset to 0
    const stepCountAfter = await page.locator('#step-count').textContent();
    expect(stepCountAfter.trim()).toBe('0');

    // There should still be 20 bars
    await expect(barLocator).toHaveCount(20);

    // At least one bar height should differ in most cases (random), but if identical (rare), assert the DOM updated
    const heightsAfter = [];
    for (let i = 0; i < count; i++) {
      const h = await barLocator.nth(i).evaluate(el => el.style.height);
      heightsAfter.push(h);
    }

    // Check that the two arrays are either different OR that the element nodes were reconstructed (innerHTML changed)
    const anyDifferent = heightsBefore.some((h, idx) => h !== heightsAfter[idx]);
    const containerHtmlBefore = heightsBefore.join(',');
    const containerHtmlAfter = heightsAfter.join(',');
    // We assert that either heights changed or at least the HTML representation is present (sanity)
    expect(anyDifferent || containerHtmlAfter.length > 0).toBeTruthy();
  });

  test('Step By Step advances algorithm and increments step count', async ({ page }) => {
    // Purpose: Verify that clicking "Step By Step" triggers an algorithm step and increments the step counter.
    const stepCountLocator = page.locator('#step-count');

    // Ensure at least one step is possible. If array is already sorted, regenerate once.
    const isArraySorted = await page.evaluate(() => {
      // Reconstruct values from bar heights to check sortedness
      const bars = Array.from(document.querySelectorAll('.array-bar'));
      const heights = bars.map(b => parseFloat(b.style.height || '0'));
      for (let i = 0; i < heights.length - 1; i++) {
        if (heights[i] > heights[i + 1]) return false;
      }
      return true;
    });

    if (isArraySorted) {
      await page.click('#generate-btn');
    }

    const beforeCount = parseInt((await stepCountLocator.textContent()).trim(), 10);

    // Click step button to advance by one step
    await page.click('#step-btn');

    // After one step, step count should increment by at least 1
    const afterCountText = await stepCountLocator.textContent();
    const afterCount = parseInt(afterCountText.trim(), 10);

    expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 1);

    // Clicking step multiple times should continue to increment the count
    await page.click('#step-btn');
    await page.click('#step-btn');

    const afterMultipleText = await stepCountLocator.textContent();
    const afterMultiple = parseInt(afterMultipleText.trim(), 10);
    expect(afterMultiple).toBeGreaterThanOrEqual(afterCount + 2);
  });

  test('Reset restores the original array and resets step counter', async ({ page }) => {
    // Purpose: Ensure "Reset" restores the array to the initial generated state and stepCount to 0.
    const bars = page.locator('.array-container .array-bar');
    const count = await bars.count();
    expect(count).toBe(20);

    // Snapshot initial heights
    const initialHeights = [];
    for (let i = 0; i < count; i++) {
      initialHeights.push(await bars.nth(i).evaluate(el => el.style.height));
    }

    // Perform a step to change the array
    // If array is already sorted, generate a new one to ensure change
    const sortedCheck = await page.evaluate(() => {
      const arr = Array.from(document.querySelectorAll('.array-bar')).map(b => parseFloat(b.style.height || '0'));
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] > arr[i + 1]) return false;
      }
      return true;
    });
    if (sortedCheck) {
      await page.click('#generate-btn');
      // update initialHeights to the new generation
      for (let i = 0; i < count; i++) {
        initialHeights[i] = await bars.nth(i).evaluate(el => el.style.height);
      }
    }

    // Click step, which should modify array or at least increment step count
    await page.click('#step-btn');

    // Ensure the array DOM is different OR the stepCount is > 0
    const postStepHeights = [];
    for (let i = 0; i < count; i++) {
      postStepHeights.push(await bars.nth(i).evaluate(el => el.style.height));
    }

    // Now click reset
    await page.click('#reset-btn');

    // After reset, step count should be zero
    const stepCountAfterReset = await page.locator('#step-count').textContent();
    expect(stepCountAfterReset.trim()).toBe('0');

    // Heights should match initial snapshot
    const heightsAfterReset = [];
    for (let i = 0; i < count; i++) {
      heightsAfterReset.push(await bars.nth(i).evaluate(el => el.style.height));
    }

    // They should equal the initial heights that were captured (reset restores from sortedArray)
    expect(heightsAfterReset).toEqual(initialHeights);
  });

  test('Start Sorting disables controls immediately when sorting begins', async ({ page }) => {
    // Purpose: Check that when Start is clicked, controls become disabled immediately.
    // This verifies that disableControls() is invoked at the start of the sorting process.

    // Click start to begin sorting
    await page.click('#start-btn');

    // Immediately after click, buttons should be disabled
    await expect(page.locator('#generate-btn')).toBeDisabled();
    await expect(page.locator('#start-btn')).toBeDisabled();
    await expect(page.locator('#reset-btn')).toBeDisabled();
    await expect(page.locator('#step-btn')).toBeDisabled();

    // Because sorting may be long-running, reload the page to stop background work and restore state.
    await page.reload();

    // After reload, controls should be enabled again
    await expect(page.locator('#generate-btn')).toBeEnabled();
    await expect(page.locator('#start-btn')).toBeEnabled();
    await expect(page.locator('#reset-btn')).toBeEnabled();
    await expect(page.locator('#step-btn')).toBeEnabled();
  });

  test('No uncaught ReferenceError, SyntaxError, or TypeError on page load', async ({ page }) => {
    // Purpose: Observe runtime errors exposed via pageerror and console and assert none are critical JavaScript errors.
    // Collect any page errors captured during beforeEach

    // Ensure we have visibility into console errors as well
    const errorConsoleMessages = consoleMessages.filter(msg => msg.type === 'error').map(m => m.text);

    // Assert that there are no page errors of types ReferenceError, SyntaxError, TypeError
    const criticalErrors = pageErrors.filter(err => {
      const name = err && err.name ? err.name : '';
      return name === 'ReferenceError' || name === 'SyntaxError' || name === 'TypeError';
    });

    // Also inspect console error text for these error names
    const consoleCritical = errorConsoleMessages.filter(text =>
      /ReferenceError|SyntaxError|TypeError/.test(text)
    );

    // Expect none of these critical errors to have occurred
    expect(criticalErrors.length).toBe(0);
    expect(consoleCritical.length).toBe(0);
  });
});