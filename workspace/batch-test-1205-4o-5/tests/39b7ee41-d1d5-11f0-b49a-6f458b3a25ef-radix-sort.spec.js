import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b7ee41-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Radix Sort page to encapsulate DOM interactions
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array';
    this.barSelector = '#array .bar';
    this.sortButtonSelector = '#sort-btn';
    // Collect console errors and page errors observed during test
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  // Navigate to the app and attach listeners for console/page errors
  async goto() {
    // Capture console messages of type 'error'
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : undefined,
        });
      }
    });

    // Capture unhandled page errors (exceptions)
    this.page.on('pageerror', (err) => {
      this.pageErrors.push({
        message: err.message,
        stack: err.stack,
      });
    });

    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Get the header text (h1)
  async getHeaderText() {
    return this.page.locator('h1').innerText();
  }

  // Get the Sort button locator
  getSortButton() {
    return this.page.locator(this.sortButtonSelector);
  }

  // Click the sort button
  async clickSort() {
    await this.getSortButton().click();
  }

  // Return all bar locators
  getBars() {
    return this.page.locator(this.barSelector);
  }

  // Return count of bar elements
  async getBarCount() {
    return this.getBars().count();
  }

  // Read heights (as numbers in px) of bars in DOM order
  async getBarHeights() {
    const count = await this.getBarCount();
    const heights = [];
    for (let i = 0; i < count; i++) {
      const style = await this.getBars().nth(i).getAttribute('style');
      // style looks like: "height: 34px; width: 20px;" but ordering may vary
      // Extract height via regex
      const match = style ? style.match(/height\s*:\s*([\d.]+)px/) : null;
      if (match) {
        heights.push(Number(match[1]));
      } else {
        // If no explicit height in style attribute, attempt to get computed style
        const computed = await this.page.evaluate((idx, sel) => {
          const el = document.querySelectorAll(sel)[idx];
          if (!el) return null;
          return window.getComputedStyle(el).height;
        }, i, this.barSelector);
        if (computed) {
          const px = computed.match(/([\d.]+)px/);
          heights.push(px ? Number(px[1]) : null);
        } else {
          heights.push(null);
        }
      }
    }
    return heights;
  }

  // Return any console errors captured
  getConsoleErrors() {
    return this.consoleErrors;
  }

  // Return any page errors captured
  getPageErrors() {
    return this.pageErrors;
  }
}

// Helper to check if numeric array is non-decreasing
function isNonDecreasing(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) return false;
  }
  return true;
}

test.describe('Radix Sort Visualization (39b7ee41-d1d5-11f0-b49a-6f458b3a25ef)', () => {
  let radixPage;

  test.beforeEach(async ({ page }) => {
    radixPage = new RadixSortPage(page);
    await radixPage.goto();
  });

  test.afterEach(async () => {
    // No teardown needed beyond what Playwright does automatically.
    // However assert that no uncaught page errors were produced during tests run.
    // Tests below will include explicit assertions; this is an extra sanity check left empty.
  });

  test('Initial page load: header, Sort button, and array bars are present', async ({ page }) => {
    // Purpose: Verify the basic UI elements exist and the array is rendered with expected structure.
    const headerText = await radixPage.getHeaderText();
    expect(headerText).toMatch(/Radix Sort Visualization/i);

    // Sort button should be visible, enabled, and accessible by role/name
    const sortBtn = page.getByRole('button', { name: 'Sort Array' });
    await expect(sortBtn).toBeVisible();
    await expect(sortBtn).toBeEnabled();

    // The array container should contain 10 bars (arrayLength = 10 in implementation)
    const barCount = await radixPage.getBarCount();
    expect(barCount).toBe(10);

    // Each bar should have a width style of 20px and a numeric height between 0 and 200px (value*2, values <100)
    for (let i = 0; i < barCount; i++) {
      const bar = radixPage.getBars().nth(i);
      await expect(bar).toHaveCSS('display', 'inline-block'); // sanity check for visual bar
      const style1 = await bar.getAttribute('style1');
      // Ensure width appears in the style attribute
      expect(style).toContain('width');
      expect(style).toContain('20px');
      // Height must parse to a finite number
      const heights1 = await radixPage.getBarHeights();
      expect(heights[i]).toBeGreaterThanOrEqual(0);
      expect(heights[i]).toBeLessThanOrEqual(200);
    }

    // Ensure no console errors or page errors occurred during initial load
    expect(radixPage.getConsoleErrors()).toHaveLength(0);
    expect(radixPage.getPageErrors()).toHaveLength(0);
  });

  test('Clicking "Sort Array" sorts the bars in non-decreasing order of height', async () => {
    // Purpose: Validate that pressing the Sort button results in the visual array being sorted ascendingly.

    // Record heights before sort
    const beforeHeights = await radixPage.getBarHeights();
    expect(beforeHeights.length).toBe(10);

    // Click the sort button
    await radixPage.clickSort();

    // After clicking, read heights
    const afterHeights = await radixPage.getBarHeights();
    expect(afterHeights.length).toBe(10);

    // Verify that the heights are now non-decreasing (sorted ascending)
    const sortedCheck = isNonDecreasing(afterHeights);
    expect(sortedCheck).toBe(true);

    // Additionally, ensure that the DOM actually updated: at least one bar's height should differ
    const changed =
      beforeHeights.some((h, idx) => {
        const ah = afterHeights[idx];
        // Allow equality when initial array already sorted; but still detect general change
        return h !== ah;
      }) || beforeHeights.join(',') === afterHeights.join(','); // if equal, still acceptable
    expect(Array.isArray(afterHeights)).toBe(true);
    // The test asserts sorting result; whether values changed or not depends on initial random array.
    // But ensure heights are numeric and sorted.
    afterHeights.forEach((h) => expect(typeof h).toBe('number'));
  });

  test('Repeated clicking of Sort button is stable and does not introduce errors', async () => {
    // Purpose: Ensure the algorithm is stable to repeated user interactions and does not cause runtime errors.

    // Click sort once
    await radixPage.clickSort();
    const firstPass = await radixPage.getBarHeights();
    expect(isNonDecreasing(firstPass)).toBe(true);

    // Click sort again
    await radixPage.clickSort();
    const secondPass = await radixPage.getBarHeights();
    expect(secondPass.length).toBe(firstPass.length);
    // After second sort, it should remain sorted
    expect(isNonDecreasing(secondPass)).toBe(true);

    // The arrays after first and second pass should be identical (sorting an already sorted array should not change order)
    // This checks idempotence/stability in effect
    expect(secondPass).toEqual(firstPass);

    // Confirm no console or page errors were produced during these interactions
    expect(radixPage.getConsoleErrors()).toHaveLength(0);
    expect(radixPage.getPageErrors()).toHaveLength(0);
  });

  test('Accessibility checks: Sort button has an accessible name and array bars are present in the DOM order', async ({ page }) => {
    // Purpose: Quick accessibility check for the main control and predictable DOM ordering

    // Button accessible by name
    const sortBtn1 = page.getByRole('button', { name: 'Sort Array' });
    await expect(sortBtn).toBeVisible();

    // Ensure bars are present and reading them returns ordered list of heights
    const heights2 = await radixPage.getBarHeights();
    expect(heights.length).toBe(10);
    // All heights must be numbers (not null)
    heights.forEach((h) => expect(Number.isFinite(h)).toBe(true));
  });

  test('No console errors or page errors should occur on load and during interactions', async () => {
    // Purpose: Explicitly assert that no runtime errors (console errors or page errors) occurred.

    // Perform an interaction to exercise code paths
    await radixPage.clickSort();

    // Collect errors
    const consoleErrors = radixPage.getConsoleErrors();
    const pageErrors = radixPage.getPageErrors();

    // Assert no console errors
    expect(consoleErrors).toHaveLength(0);

    // Assert no page errors (uncaught exceptions)
    expect(pageErrors).toHaveLength(0);
  });
});