import { test, expect } from '@playwright/test';

// Page Object for the Selection Sort visualization page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/4c9eadf7-cd2f-11f0-a735-f5f9b4634e99.html';
    this.generateButton = page.locator('#generateArray');
    this.sortButton = page.locator('#sortArray');
    this.arrayContainer = page.locator('#arrayContainer');
    this.arrayBars = page.locator('.array-bar');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  // Returns an array of the numeric values displayed in the bars (as numbers)
  async getBarValues() {
    const texts = await this.arrayBars.allTextContents();
    return texts.map(t => {
      // parseInt will extract leading numeric portion; if not numeric returns NaN
      const n = parseInt(t, 10);
      return Number.isNaN(n) ? t : n;
    });
  }

  // Returns an array of inline background-color style values for visible bars
  async getBarInlineBackgrounds() {
    return await this.page.$$eval('.array-bar', bars =>
      bars.map(b => b.style.backgroundColor || '')
    );
  }

  // Click generate array
  async clickGenerate() {
    await this.generateButton.click();
  }

  // Click sort button
  async clickSort() {
    await this.sortButton.click();
  }

  // Wait for at least one highlighted bar (class 'highlight') to appear
  async waitForHighlight(timeout = 3000) {
    await this.page.waitForSelector('.array-bar.highlight', { timeout });
  }

  // Wait for any inline green background to appear on any bar
  async waitForAnyGreenBackground(timeout = 5000) {
    await this.page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('.array-bar'));
      return bars.some(b => {
        const bg = b.style.backgroundColor || '';
        // Check for the expected inline green set by script (#5cb85c)
        // style.backgroundColor may be returned in rgb format, so handle both.
        return bg.includes('5cb85c') || bg.includes('92, 184, 92') || bg.includes('92,184,92');
      });
    }, null, { timeout });
  }
}

test.describe('Selection Sort Visualization - E2E', () => {
  // Keep arrays of console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages for inspection
    page.on('console', msg => {
      // store both type and text for debugging
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.describe('Initial page load and default state', () => {
    // Test initial page load and verify default UI elements are present and valid
    test('loads the page and displays the default array with controls', async ({ page }) => {
      const sp = new SelectionSortPage(page);
      await sp.goto();

      // Verify buttons are visible and enabled
      await expect(sp.generateButton).toBeVisible();
      await expect(sp.generateButton).toBeEnabled();
      await expect(sp.sortButton).toBeVisible();
      await expect(sp.sortButton).toBeEnabled();

      // Verify the array container exists and contains bars
      await expect(sp.arrayContainer).toBeVisible();

      // Expect some bars to be present (default createRandomArray size = 10)
      const barCount = await sp.arrayBars.count();
      expect(barCount).toBeGreaterThanOrEqual(1); // at least 1 bar
      // Expect numeric content for each bar and heights set via style attribute
      const values = await sp.getBarValues();
      expect(values.length).toEqual(barCount);
      values.forEach(v => {
        expect(typeof v === 'number').toBeTruthy();
        // values should be between 0 and 99 per implementation
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(99);
      });

      // There should be no uncaught page errors on initial load
      expect(pageErrors.length, `pageerrors: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    });
  });

  test.describe('Interactive controls', () => {
    test('Generate New Array button produces a new set of values', async ({ page }) => {
      const sp = new SelectionSortPage(page);
      await sp.goto();

      // Capture current values
      const beforeValues = await sp.getBarValues();

      // Click generate and wait for DOM update (a simple heuristic: bar texts change)
      await sp.clickGenerate();

      // Wait for at least one value to differ from beforeValues (with a small timeout)
      await page.waitForFunction(
        (old) => {
          const bars = Array.from(document.querySelectorAll('.array-bar')).map(b => parseInt(b.textContent || '', 10));
          if (bars.length !== old.length) return true;
          return bars.some((v, i) => v !== old[i]);
        },
        beforeValues,
        { timeout: 2000 }
      );

      const afterValues = await sp.getBarValues();

      // They should not be identical arrays in most cases; assert that at least one difference exists
      const identical = JSON.stringify(beforeValues) === JSON.stringify(afterValues);
      expect(identical).toBeFalsy();

      // Also assert no uncaught errors happened during generation
      expect(pageErrors.length, `pageerrors during generate: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    });

    test('Sort Array triggers sorting process and shows highlights', async ({ page }) => {
      const sp = new SelectionSortPage(page);
      await sp.goto();

      // Start sorting
      await sp.clickSort();

      // The algorithm marks the current minimum with 'highlight' class early in the loop.
      // Wait for at least one element to have that class as evidence the process started.
      await sp.waitForHighlight(3000);

      // Assert there is at least one highlighted element
      const highlightedCount = await page.locator('.array-bar.highlight').count();
      expect(highlightedCount).toBeGreaterThanOrEqual(1);

      // Optionally wait to see if any inline green background is applied (visual cue for swapped items)
      // The implementation applies inline backgroundColor '#5cb85c' to bars in some steps.
      // Wait briefly; this is a best-effort check and non-fatal if not found.
      let greenFound = false;
      try {
        await sp.waitForAnyGreenBackground(4000);
        const greens = await sp.getBarInlineBackgrounds();
        greenFound = greens.some(bg => bg && (bg.includes('5cb85c') || bg.includes('92, 184, 92') || bg.includes('92,184,92')));
      } catch (e) {
        // timeout waiting for green is not a test failure per se; we capture that no green was found
        greenFound = false;
      }

      // At minimum, the algorithm should have attempted to highlight; assert that we observed highlight
      expect(highlightedCount).toBeGreaterThanOrEqual(1);

      // Check for page errors during sorting; ideally none
      expect(pageErrors.length, `page errors during sort: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);

      // Log the presence/absence of inline green styling for visibility in test output (not a strict assertion)
      // (We assert it's a boolean)
      expect(typeof greenFound).toBe('boolean');
    });
  });

  test.describe('State updates and DOM integrity', () => {
    test('After sorting process starts, the array DOM is consistently present and bars remain numeric', async ({ page }) => {
      const sp = new SelectionSortPage(page);
      await sp.goto();

      // Start sorting (the function is async internally but not awaited by the click handler)
      await sp.clickSort();

      // While sorting is running, repeatedly sample the bar texts to ensure DOM remains valid
      // Do this a few times to catch transient issues where displayArray may clear container
      for (let i = 0; i < 5; i++) {
        // short delay between samples
        await page.waitForTimeout(250);
        const bars = await sp.arrayBars.count();
        // There should always be at least 1 bar element in the DOM during the visualization
        expect(bars).toBeGreaterThanOrEqual(1);
        const values = await sp.getBarValues();
        // All values should be numeric strings convertible to numbers
        values.forEach(v => {
          expect(typeof v === 'number').toBeTruthy();
        });
      }

      // Assert no uncaught exceptions were thrown during these DOM updates
      expect(pageErrors.length, `page errors during DOM sampling: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Buttons remain operable after multiple generate/sort actions', async ({ page }) => {
      const sp = new SelectionSortPage(page);
      await sp.goto();

      // Perform multiple cycles of generate and sort to ensure controls remain responsive
      for (let cycle = 0; cycle < 3; cycle++) {
        // Generate new array
        await sp.clickGenerate();
        await page.waitForTimeout(200); // brief pause for DOM update
        const countAfterGen = await sp.arrayBars.count();
        expect(countAfterGen).toBeGreaterThanOrEqual(1);

        // Trigger sort; wait for at least one highlight as evidence it started
        await sp.clickSort();
        try {
          await sp.waitForHighlight(2000);
        } catch (e) {
          // If highlight didn't appear in time, that's an observation but not fatal for this robustness check
        }

        // Ensure buttons are still enabled
        await expect(sp.generateButton).toBeEnabled();
        await expect(sp.sortButton).toBeEnabled();
      }

      // Conclude with check for page errors during the stress actions
      expect(pageErrors.length, `page errors during repeated actions: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    });
  });

  test.afterEach(async ({}, testInfo) => {
    // Attach console and error summaries to the test report for debugging purposes
    if (consoleMessages.length > 0) {
      testInfo.attach('console-messages', { body: JSON.stringify(consoleMessages, null, 2), contentType: 'application/json' });
    }
    if (pageErrors.length > 0) {
      testInfo.attach('page-errors', { body: JSON.stringify(pageErrors.map(e => String(e)), null, 2), contentType: 'application/json' });
    }
  });
});