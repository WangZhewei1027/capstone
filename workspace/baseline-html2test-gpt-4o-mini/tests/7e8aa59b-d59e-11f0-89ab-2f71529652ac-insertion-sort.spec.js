import { test, expect } from '@playwright/test';

test.setTimeout(120000);

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa59b-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Insertion Sort Visualization (7e8aa59b-d59e-11f0-89ab-2f71529652ac)', () => {
  // Collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console events and page errors so we can assert none occur unexpectedly
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application page and wait for load handlers to run
    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Ensure the page's root elements are present before proceeding
    await expect(page.locator('h1')).toHaveText('Insertion Sort Visualization');
    await expect(page.locator('button', { hasText: 'Start Sorting' })).toBeVisible();
    await expect(page.locator('#array')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Small sanity check that no uncaught page errors were emitted
    // Tests will explicitly assert this where relevant, but always keep this as a helpful guard
    expect(pageErrors.length).toBe(0);
    // Also ensure no console errors were emitted
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    // Close page is handled by Playwright fixtures automatically
  });

  // Helper to read current numeric heights of bars from the page
  async function getBarHeights(page) {
    return await page.$$eval('#array .bar', bars => bars.map(b => {
      // style.height is like "123px"; parseInt handles it
      return parseInt(b.style.height || '0', 10);
    }));
  }

  // Helper to determine if an array of heights is sorted non-decreasingly
  function isNonDecreasing(arr) {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }

  test('Initial load renders 20 bars with valid heights and Start button present', async ({ page }) => {
    // Purpose: verify that on page load the array visualization is created with expected default state

    const bars = page.locator('#array .bar');
    // There should be 20 bars (arraySize == 20)
    await expect(bars).toHaveCount(20);

    const heights = await getBarHeights(page);

    // Heights should be integers and within the expected range [10, 209]
    // The app generates Math.floor(Math.random() * 200) + 10 => range 10..209
    for (const h of heights) {
      expect(Number.isInteger(h)).toBeTruthy();
      expect(h).toBeGreaterThanOrEqual(10);
      expect(h).toBeLessThanOrEqual(209);
    }

    // Start Sorting button should be visible and enabled
    const startButton = page.locator('button', { hasText: 'Start Sorting' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    // No uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Start Sorting begins animation and eventually sorts the array in non-decreasing order', async ({ page }) => {
    // Purpose: verify that clicking the Start Sorting button triggers the sorting process
    // and that after the process completes the displayed bars are sorted.

    // Capture initial heights to detect DOM changes during sorting
    const initialHeights = await getBarHeights(page);
    expect(initialHeights.length).toBe(20);

    // Click the Start Sorting button to start sorting animation
    await page.click('button', { timeout: 5000 });

    // After starting, the DOM should update; wait briefly and confirm at least one height changed
    await page.waitForTimeout(300); // allow some animation steps to occur
    const afterStartHeights = await getBarHeights(page);
    // It's possible generateRandomArray re-rendered some bars; at least the array should still have 20 elements
    expect(afterStartHeights.length).toBe(20);

    // Assert that at least one bar height differs from initial (indicates DOM updates)
    const anyChange = afterStartHeights.some((h, i) => h !== initialHeights[i]);
    expect(anyChange).toBeTruthy();

    // Wait until the bars are fully sorted in non-decreasing order.
    // The insertionSort implementation uses sleeps and may take several seconds; allow generous timeout.
    await page.waitForFunction(() => {
      const bars1 = Array.from(document.querySelectorAll('#array .bar'));
      if (bars.length === 0) return false;
      const heights1 = bars.map(b => parseInt(b.style.height || '0', 10));
      for (let i = 1; i < heights.length; i++) {
        if (heights[i] < heights[i - 1]) return false;
      }
      return true;
    }, null, { timeout: 60000 });

    // After waiting, validate that heights are sorted
    const finalHeights = await getBarHeights(page);
    expect(isNonDecreasing(finalHeights)).toBeTruthy();

    // No uncaught page errors or console errors should have been emitted during sorting
    expect(pageErrors.length).toBe(0);
    const consoleErrors2 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Multiple rapid clicks of Start Sorting do not crash the page and result in a sorted array', async ({ page }) => {
    // Purpose: simulate repeated user interactions to see if concurrent sorting invocations break functionality.

    const startButton1 = page.locator('button', { hasText: 'Start Sorting' });

    // Click the button rapidly multiple times
    await startButton.click();
    await startButton.click();
    await startButton.click();

    // Ensure the array still has 20 bars after multiple clicks
    const bars2 = page.locator('#array .bar');
    await expect(bars).toHaveCount(20);

    // Eventually the array should become sorted (even if sorts overlapped)
    await page.waitForFunction(() => {
      const bars3 = Array.from(document.querySelectorAll('#array .bar'));
      if (bars.length === 0) return false;
      const heights2 = bars.map(b => parseInt(b.style.height || '0', 10));
      for (let i = 1; i < heights.length; i++) {
        if (heights[i] < heights[i - 1]) return false;
      }
      return true;
    }, null, { timeout: 60000 });

    const finalHeights1 = await getBarHeights(page);
    expect(isNonDecreasing(finalHeights)).toBeTruthy();

    // Check for no uncaught runtime errors
    expect(pageErrors.length).toBe(0);
    const consoleErrors3 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Rapid repeated clicks preserve DOM element count and do not produce page errors', async ({ page }) => {
    // Purpose: aggressively stress the Start Sorting button and ensure the visualization remains stable.

    const startButton2 = page.locator('button', { hasText: 'Start Sorting' });

    // Rapidly click the button 6 times with minimal delays
    for (let i = 0; i < 6; i++) {
      await startButton.click();
      await page.waitForTimeout(50);
    }

    // Verify there are still 20 bars
    await expect(page.locator('#array .bar')).toHaveCount(20);

    // Wait for eventual sorted state to be reached
    await page.waitForFunction(() => {
      const bars4 = Array.from(document.querySelectorAll('#array .bar'));
      if (!bars.length) return false;
      const heights3 = bars.map(b => parseInt(b.style.height || '0', 10));
      return heights.every((v, i, a) => i === 0 || a[i] >= a[i - 1]);
    }, null, { timeout: 60000 });

    // Final assertions: sorted and no page errors
    const finalHeights2 = await getBarHeights(page);
    expect(isNonDecreasing(finalHeights)).toBeTruthy();
    expect(pageErrors.length).toBe(0);
    const consoleErrors4 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility and visibility checks for interactive elements', async ({ page }) => {
    // Purpose: simple accessibility checks - the control should be reachable and readable.

    const startButton3 = page.locator('button', { hasText: 'Start Sorting' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText('Start Sorting');

    // Tab to the button and ensure it receives focus (keyboard accessibility)
    await page.keyboard.press('Tab');
    // There may be other tabbable elements (or none), but ensure that the button is focusable by clicking and checking activeElement
    await startButton.focus();
    const activeTag = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
    expect(activeTag === 'BUTTON' || activeTag === 'DIV' || activeTag === 'BODY').toBeTruthy();

    // No runtime errors observed while performing accessibility interactions
    expect(pageErrors.length).toBe(0);
    const consoleErrors5 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

});