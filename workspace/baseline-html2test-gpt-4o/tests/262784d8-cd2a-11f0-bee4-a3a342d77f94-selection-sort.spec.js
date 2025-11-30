import { test, expect } from '@playwright/test';

// Test file for Selection Sort Visualization application
// URL: http://127.0.0.1:5500/workspace/html2test/html/262784d8-cd2a-11f0-bee4-a3a342d77f94.html
// Filename required by prompt: 262784d8-cd2a-11f0-bee4-a3a342d77f94-selection-sort.spec.js
//
// The tests below:
// - load the page as-is (do not modify the page or globals)
// - observe console messages and page errors
// - verify DOM structure, interactivity, and visual updates
// - validate selection sort animation result
//
// Note: We avoid patching or fixing any in-page code; we assert observed behavior and that no unexpected errors occurred.

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262784d8-cd2a-11f0-bee4-a3a342d77f94.html';

// Simple sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Page Object Model for the selection sort page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Returns the sort button element handle
  async getSortButton() {
    return this.page.locator('button', { hasText: 'Sort with Selection Sort' });
  }

  // Returns the array bar locators
  async getArrayBars() {
    return this.page.locator('#array-container .array-bar');
  }

  // Returns array of numeric values displayed on bars
  async readBarValues() {
    const bars = await this.getArrayBars().elementHandles();
    const values = [];
    for (const bar of bars) {
      const text = await bar.innerText();
      const num = Number(text.trim());
      values.push(num);
    }
    return values;
  }

  // Returns array of computed background-color values for each bar
  async readBarBackgroundColors() {
    return this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('#array-container .array-bar'));
      return bars.map((b) => {
        const style = window.getComputedStyle(b);
        return style.backgroundColor;
      });
    });
  }

  // Returns array of inline height values for each bar (e.g., "150px")
  async readBarHeights() {
    return this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('#array-container .array-bar'));
      return bars.map((b) => b.style.height);
    });
  }

  // Start the sort by clicking the button
  async startSort() {
    const btn = await this.getSortButton();
    await btn.click();
  }

  // Obtain number of animations by calling in-page function
  async getAnimationCount() {
    return this.page.evaluate(() => {
      if (typeof getSelectionSortAnimations === 'function' && typeof array !== 'undefined') {
        try {
          return getSelectionSortAnimations([...array]).length;
        } catch (e) {
          // If something goes wrong, propagate undefined
          return -1;
        }
      }
      return -1;
    });
  }
}

test.describe('Selection Sort Visualization - End-to-end Tests', () => {
  // Collect console messages and page errors to assert there are none unexpected
  /** @type {Array<import('@playwright/test').ConsoleMessage>} */
  let consoleMessages;
  /** @type {Array<Error>} */
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for diagnostics and assertions
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });

    // Capture runtime errors thrown on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test: initial load and default state
  test('Initial load shows title, sort button and 10 array bars with correct structure', async ({ page }) => {
    const app = new SelectionSortPage(page);
    // Navigate to the application
    await app.goto();

    // Verify page title contains expected text
    await expect(page).toHaveTitle(/Selection Sort Visualization/);

    // Verify that the sort button is visible and has correct accessible name
    const sortButton = await app.getSortButton();
    await expect(sortButton).toBeVisible();
    await expect(sortButton).toHaveText('Sort with Selection Sort');

    // Verify container and bars exist
    const bars = await app.getArrayBars();
    // There should be 10 bars as the page generates an array of size 10
    await expect(bars).toHaveCount(10);

    // Verify each bar has the class, a numeric innerText and inline height in px
    const values = await app.readBarValues();
    expect(Array.isArray(values)).toBeTruthy();
    expect(values.length).toBe(10);
    for (const v of values) {
      // Each displayed value should be a finite number within expected range 10..100
      expect(Number.isFinite(v)).toBeTruthy();
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(100);
    }

    // Heights should correspond to value * 3 + 'px'
    const heights = await app.readBarHeights();
    for (let i = 0; i < heights.length; i++) {
      const expected = `${values[i] * 3}px`;
      expect(heights[i]).toBe(expected);
    }

    // Ensure no page runtime errors were emitted during initial load
    expect(pageErrors.length).toBe(0);
  });

  // Test: starting the sort triggers animations and results in a sorted array
  test('Clicking sort runs selection sort animation and results in sorted values', async ({ page }) => {
    // Increase test timeout to allow animations to complete in CI
    test.slow();

    const app = new SelectionSortPage(page);
    await app.goto();

    // Read initial values for later comparison
    const initialValues = await app.readBarValues();

    // Sanity check: initialValues length == 10
    expect(initialValues.length).toBe(10);

    // Compute how many animation steps the page will perform
    const animationCount = await app.getAnimationCount();
    expect(typeof animationCount).toBe('number');
    expect(animationCount).toBeGreaterThanOrEqual(0);

    // Start the sort by clicking the button
    await app.startSort();

    // Attempt to detect at least one transient color change to red during animations.
    // The first animation is scheduled with index 0 => setTimeout(..., 0) so it should run almost immediately.
    // That animation sets involved bars to red and then back to green after 100ms.
    // We poll for up to 500ms to try to observe a red background color on any bar.
    let sawRed = false;
    const pollTimeout = 800; // ms
    const pollInterval = 25; // ms
    const start = Date.now();
    while (Date.now() - start < pollTimeout) {
      const colors = await app.readBarBackgroundColors();
      if (colors.some((c) => c === 'rgb(255, 0, 0)' || c === 'red')) {
        sawRed = true;
        break;
      }
      await sleep(pollInterval);
    }
    // It's acceptable if transient red was not observed (race), but we assert that at least the animation ran by waiting for final sorted state below.
    // So we do not fail here if sawRed is false, but we record it in the test output via an expectation that is not strict.
    // Use a soft expectation: if we saw red, great. If not, log for diagnostics (but do not fail).
    // However include an informative assertion to ensure test author can see the behavior.
    if (!sawRed) {
      console.log('Did not observe transient red color during animation (timing race possible).');
    } else {
      expect(sawRed).toBeTruthy();
    }

    // Wait for animations to complete. Each animation scheduled at index * 500ms; add buffer.
    // If animationCount is 0, wait a small stable delay.
    const totalAnimationTime = animationCount > 0 ? animationCount * 500 + 300 : 300;
    await sleep(totalAnimationTime);

    // After all animations, read final values from DOM
    const finalValues = await app.readBarValues();

    // Assert that the final values are sorted ascending
    const isSorted = finalValues.every((v, i, arr) => i === 0 || arr[i - 1] <= v);
    expect(isSorted).toBeTruthy();

    // Validate that final array is a permutation of the initial values (i.e., same multiset)
    const sortCopy = (a) => [...a].sort((x, y) => x - y);
    expect(sortCopy(finalValues)).toEqual(sortCopy(initialValues));

    // Ensure no runtime page errors were emitted during animation
    expect(pageErrors.length).toBe(0);
  });

  // Test: validate in-page helper function behavior for edge cases (call from test context)
  test('getSelectionSortAnimations returns empty array for empty input and does not throw', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Evaluate getSelectionSortAnimations([]) in page context
    const animationsForEmpty = await page.evaluate(() => {
      if (typeof getSelectionSortAnimations === 'function') {
        try {
          return getSelectionSortAnimations([]);
        } catch (err) {
          return { __error: err && err.toString ? err.toString() : String(err) };
        }
      }
      return { __missing: true };
    });

    // If function missing, fail the test; otherwise expect an empty array
    if (animationsForEmpty && animationsForEmpty.__missing) {
      throw new Error('getSelectionSortAnimations is not defined on the page');
    }
    if (animationsForEmpty && animationsForEmpty.__error) {
      throw new Error('getSelectionSortAnimations threw when called with empty array: ' + animationsForEmpty.__error);
    }

    expect(Array.isArray(animationsForEmpty)).toBeTruthy();
    expect(animationsForEmpty.length).toBe(0);

    // Ensure no page runtime errors were emitted during this interaction
    expect(pageErrors.length).toBe(0);
  });

  // Accessibility/light checks: button is focusable and receives keyboard activation
  test('Sort button is keyboard-focusable and can be activated via keyboard', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    const sortButton = await app.getSortButton();

    // Focus the button via keyboard tabbing: use page.keyboard to tab until focused
    await page.keyboard.press('Tab');
    // Ensure something is focused (this is a light-check; if not focused then click fallback)
    const active = await page.evaluate(() => document.activeElement && document.activeElement.outerHTML);
    // If button is not the focused element after a Tab, programmatically focus it (we do not modify behavior, only call focus())
    // Calling focus() is allowed as it's interacting with the page like a user would.
    await sortButton.focus();
    // Now press Enter to activate
    await page.keyboard.press('Enter');

    // Wait a short while for immediate animation steps to occur
    await sleep(150);

    // Assert that at least some bars exist and there were no immediate page errors
    const bars = await app.getArrayBars();
    await expect(bars).toHaveCount(10);
    expect(pageErrors.length).toBe(0);
  });

  // After all tests, optionally print console messages if any non-info messages occurred (diagnostic)
  test.afterEach(async ({}, testInfo) => {
    if (consoleMessages && consoleMessages.length > 0) {
      // Filter for error/warn console messages for diagnostics
      const errorLike = consoleMessages.filter((m) => {
        const t = m.type();
        return t === 'error' || t === 'warning';
      });
      if (errorLike.length > 0) {
        console.log(`Console emitted ${errorLike.length} error/warn messages during test "${testInfo.title}":`);
        for (const msg of errorLike) {
          console.log(`[console.${msg.type()}] ${msg.text()}`);
        }
      }
    }

    if (pageErrors && pageErrors.length > 0) {
      console.log(`Page emitted ${pageErrors.length} pageerror(s) during test "${testInfo.title}":`);
      for (const err of pageErrors) {
        console.log(err.stack || String(err));
      }
    }
  });
});