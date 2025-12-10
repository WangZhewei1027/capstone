import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8acca4-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Radix Sort Visualization page
class RadixSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arraySelector = '#array-container';
    this.barSelector = '#array-container .bar';
    this.startButtonSelector = 'button:has-text("Start Radix Sort")';
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the initial visualization has been rendered
    await this.page.waitForSelector(this.barSelector);
  }

  // Return number of bars currently displayed
  async getBarCount() {
    return await this.page.$$eval(this.barSelector, (els) => els.length);
  }

  // Return array of computed heights (as numbers, in pixels) for the bars
  async getBarHeights() {
    return await this.page.$$eval(this.barSelector, (els) =>
      Array.from(els).map((el) => {
        const h = window.getComputedStyle(el).height;
        return parseFloat(h); // px value
      })
    );
  }

  // Return array of computed background colors for the bars (string)
  async getBarBackgrounds() {
    return await this.page.$$eval(this.barSelector, (els) =>
      Array.from(els).map((el) => window.getComputedStyle(el).backgroundColor)
    );
  }

  // Click the Start Radix Sort button
  async clickStart() {
    await Promise.all([
      // the click itself
      this.page.click(this.startButtonSelector),
    ]);
  }

  // Wait until at least one bar has the orange highlight (rgb(255, 165, 0))
  async waitForAnyOrangeBar(timeout = 15000) {
    const orangeRgb = 'rgb(255, 165, 0)';
    await this.page.waitForFunction(
      (selector, orange) => {
        const bars = document.querySelectorAll(selector);
        for (const b of bars) {
          const bg = window.getComputedStyle(b).backgroundColor;
          if (bg === orange) return true;
        }
        return false;
      },
      this.barSelector,
      orangeRgb,
      { timeout }
    );
  }

  // Wait until bars heights match the expected numeric heights array (values in pixels)
  async waitForHeights(expectedHeightsPx, timeout = 60000) {
    // expectedHeightsPx: array of numbers (px)
    await this.page.waitForFunction(
      (selector, expected) => {
        const bars1 = Array.from(document.querySelectorAll(selector));
        if (bars.length !== expected.length) return false;
        for (let i = 0; i < bars.length; i++) {
          const h1 = parseFloat(window.getComputedStyle(bars[i]).height);
          if (Math.abs(h - expected[i]) > 0.5) return false; // allow small rounding diff
        }
        return true;
      },
      this.barSelector,
      expectedHeightsPx,
      { timeout }
    );
  }
}

test.describe('Radix Sort Visualization - 7e8acca4-d59e-11f0-89ab-2f71529652ac', () => {
  // Increase default timeout for tests that wait for animation-driven sorting to complete
  test.setTimeout(120000); // 2 minutes

  test('Initial page load - renders bars matching the initial array', async ({ page }) => {
    // Purpose: Verify that the page loads and the initial visualization matches the provided array.
    const radixPage = new RadixSortPage(page);
    await radixPage.goto();

    // The implementation's initial array is [170, 45, 75, 90, 802, 24, 2, 66]
    const initialArray = [170, 45, 75, 90, 802, 24, 2, 66];
    const expectedHeights = initialArray.map((v) => v * 2); // style.height = `${value * 2}px`

    // Assert the correct number of bars are rendered
    const barCount = await radixPage.getBarCount();
    expect(barCount).toBe(initialArray.length);

    // Assert that the heights match expected heights
    const heights = await radixPage.getBarHeights();
    expect(heights.length).toBe(expectedHeights.length);
    for (let i = 0; i < expectedHeights.length; i++) {
      // Allow small pixel rounding differences
      expect(heights[i]).toBeGreaterThan(expectedHeights[i] - 1);
      expect(heights[i]).toBeLessThan(expectedHeights[i] + 1);
    }

    // Assert that bars' default background color is the teal defined in CSS (inline style is not set initially)
    const backgrounds = await radixPage.getBarBackgrounds();
    // We expect the bars to be teal; computed color may vary (e.g., rgb format).
    // At minimum ensure none are 'orange' initially.
    for (const bg of backgrounds) {
      expect(bg).not.toBe('rgb(255, 165, 0)'); // not orange initially
    }
  });

  test('Start button exists, is visible, and clickable', async ({ page }) => {
    // Purpose: Verify the Start Radix Sort button is present and interactable.
    const radixPage1 = new RadixSortPage(page);
    await radixPage.goto();

    const startButton = await page.locator('button', { hasText: 'Start Radix Sort' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText('Start Radix Sort');

    // Click the button to ensure it is clickable (we don't assert side effects here)
    await startButton.click();
    // After clicking, the page should still have bar elements.
    await page.waitForSelector('#array-container .bar');
    const barCount1 = await radixPage.getBarCount();
    expect(barCount).toBeGreaterThan(0);
  });

  test('Clicking Start triggers visualization changes and completes with sorted array', async ({ page }) => {
    // Purpose: Validate that clicking Start animates sorting, highlights active bars,
    // and finally results in the correct sorted array visualization.
    const radixPage2 = new RadixSortPage(page);

    // Collect console errors and page errors while running this test
    const consoleErrors = [];
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      // Record console messages and mark error-level messages
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      // Uncaught exceptions on the page will be captured here
      pageErrors.push(err.message);
    });

    await radixPage.goto();

    // Start sorting
    await radixPage.clickStart();

    // During the sort, an active bar should be highlighted with orange.
    // Wait for at least one orange highlight occurrence within a reasonable time.
    await radixPage.waitForAnyOrangeBar(20000);

    // The final sorted array should be [2, 24, 45, 66, 75, 90, 170, 802]
    const sortedArray = [2, 24, 45, 66, 75, 90, 170, 802];
    const expectedFinalHeights = sortedArray.map((v) => v * 2);

    // Wait for the animation to complete and the DOM to reflect the final sorted heights.
    // The implementation uses many setTimeouts; we allow generous timeout.
    await radixPage.waitForHeights(expectedFinalHeights, 90000);

    // After completion, assert final heights exactly match expected sorted heights
    const finalHeights = await radixPage.getBarHeights();
    expect(finalHeights.length).toBe(expectedFinalHeights.length);
    for (let i = 0; i < expectedFinalHeights.length; i++) {
      expect(finalHeights[i]).toBeGreaterThan(expectedFinalHeights[i] - 1);
      expect(finalHeights[i]).toBeLessThan(expectedFinalHeights[i] + 1);
    }

    // Check that there were no uncaught page errors (ReferenceError/SyntaxError/TypeError)
    // and no console.error messages emitted during the run.
    // This verifies the runtime executed without throwing unhandled exceptions.
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    // Optionally ensure some console messages exist (informational logs) - not required.
    // Ensure that we observed at least one console message (could be none depending on implementation)
    // but do not fail if consoleMessages is empty; we only assert absence of errors.
  });

  test('Clicking Start multiple times does not produce runtime errors', async ({ page }) => {
    // Purpose: Ensure repeated clicks do not cause unhandled exceptions.
    const radixPage3 = new RadixSortPage(page);

    // Collect page errors and console.error messages
    const pageErrors1 = [];
    const consoleErrors1 = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await radixPage.goto();

    // Click start twice in quick succession to exercise potential concurrency issues.
    await Promise.all([radixPage.clickStart(), radixPage.clickStart()]);

    // Wait a short while to let any errors surface (if present)
    await page.waitForTimeout(2000);

    // We will not wait for full sort here; just ensure no immediate runtime errors occurred.
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Accessibility checks: Start button is reachable and labeled', async ({ page }) => {
    // Purpose: Basic accessibility check to ensure controls are labeled/accessible.
    const radixPage4 = new RadixSortPage(page);
    await radixPage.goto();

    // The button has visible text; ensure it is focusable via keyboard.
    const startButton1 = page.locator('button', { hasText: 'Start Radix Sort' });
    await expect(startButton).toBeVisible();

    // Tab to the button and ensure it receives focus
    await page.keyboard.press('Tab'); // may move to first focusable element
    // If multiple tabbable elements exist, ensure the button can be focused directly:
    await startButton.focus();
    const hasFocus = await startButton.evaluate((el) => el === document.activeElement);
    expect(hasFocus).toBe(true);
  });
});