import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0015/html/99e489d0-c498-11f0-80cf-db121751e4f0.html';

// Page Object for the Bubble Sort Visualization app
class BubbleSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = '#arrayContainer';
    this.sortBtn = '#sortBtn';
    this.resetBtn = '#resetBtn';
    this.barSelector = '.bar';
    this.sortedSelector = '.bar.sorted';
  }

  async goto() {
    // Speed up visualization delays by clamping setTimeout durations before app scripts run
    await this.page.addInitScript(() => {
      // Replace setTimeout with a version that clamps large delays to 10ms to speed tests.
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = (fn, t, ...args) => {
        // If a very small or undefined timeout is provided, keep it. Otherwise clamp to 10ms.
        const newT = typeof t === 'number' && t > 10 ? 10 : t;
        return originalSetTimeout(fn, newT, ...args);
      };
    });
    await this.page.goto(APP_URL);
    // Ensure initial render
    await this.page.waitForSelector(this.container);
    await this.page.waitForSelector(this.barSelector);
  }

  async clickSort() {
    return this.page.click(this.sortBtn);
  }

  async clickReset() {
    return this.page.click(this.resetBtn);
  }

  // Returns array of heights (strings like '100px') for the current visible bars
  async getBarHeights() {
    return this.page.$$eval(this.barSelector, bars => bars.map(b => b.style.height));
  }

  // Returns number of bars with 'sorted' class
  async getSortedCount() {
    return this.page.$$eval(this.sortedSelector, els => els.length);
  }

  // Returns true if any bar is currently highlighted in orange (comparison highlight)
  async isAnyBarHighlightedOrange() {
    return this.page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.some(b => {
        const c = getComputedStyle(b).backgroundColor;
        // computed rgb string typically is "rgb(255, 165, 0)" for orange
        return c.includes('255') && c.includes('165') && c.includes('0');
      });
    });
  }

  // Wait until a predicate on the page returns true
  async waitForPredicate(predicate, timeout = 2000) {
    await this.page.waitForFunction(predicate, null, { timeout });
  }
}

test.describe('Bubble Sort Visualization - FSM state & transition tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to app with fast timeouts
    const app = new BubbleSortPage(page);
    await app.goto();
  });

  // Initial idle state checks
  test('Initial idle state: array is displayed, no items marked sorted', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Validate initial bars count and heights correspond to [5,3,8,4,2] * 20px
    const heights = await app.getBarHeights();
    expect(heights.length).toBe(5);
    expect(heights).toEqual(['100px', '60px', '160px', '80px', '40px']);

    // No bars should be marked as sorted in idle
    const sortedCount = await app.getSortedCount();
    expect(sortedCount).toBe(0);

    // Controls present and enabled
    await expect(page.locator(app.sortBtn)).toBeVisible();
    await expect(page.locator(app.resetBtn)).toBeVisible();
    await expect(page.locator(app.sortBtn)).toBeEnabled();
    await expect(page.locator(app.resetBtn)).toBeEnabled();
  });

  test('Sort -> sorting -> done: clicking Sort sorts array and marks all items sorted', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Click sort to start sorting
    await app.clickSort();

    // While sorting occurs, we expect at least one comparison highlight (orange) to appear at some point
    await app.waitForPredicate(() => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.some(b => {
        const c = getComputedStyle(b).backgroundColor;
        return c.includes('255') && c.includes('165') && c.includes('0'); // orange rgb(255,165,0)
      });
    }, 2000);

    // Wait for completion: all bars should eventually be marked sorted
    await app.waitForPredicate(() => document.querySelectorAll('.bar.sorted').length === 5, 5000);

    // Validate final heights are sorted ascending -> [2,3,4,5,8] * 20px
    const finalHeights = await app.getBarHeights();
    expect(finalHeights).toEqual(['40px', '60px', '80px', '100px', '160px']);

    // All bars have 'sorted' class
    const sortedCount = await app.getSortedCount();
    expect(sortedCount).toBe(5);
  });

  test('Comparing and swapping visual cues: first comparison and swap reflect in DOM', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Start sorting
    await app.clickSort();

    // Wait for the first comparison highlight (two bars turn orange)
    await app.waitForPredicate(() => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.slice(0, 2).some(b => {
        const c = getComputedStyle(b).backgroundColor;
        return c.includes('255') && c.includes('165'); // orange
      });
    }, 2000);

    // After the first comparison finishes, if a swap occurred (5 and 3) heights should change:
    // Expect bar 0 to become 60px (value 3 * 20px)
    await app.waitForPredicate(() => {
      const b = document.querySelectorAll('.bar')[0];
      return b && b.style.height === '60px';
    }, 2000);

    // Confirm at least one bar got its height changed from initial state
    const heightsAfterFirstSwap = await app.getBarHeights();
    expect(heightsAfterFirstSwap[0]).toBe('60px');
  });

  test('Marking_sorted state: items get marked sorted during sorting (progressive marking)', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Start sorting
    await app.clickSort();

    // The last item (index 4) should be marked sorted after the first full pass (i=0)
    await app.waitForPredicate(() => {
      const bars = document.querySelectorAll('.bar');
      return bars[4] && bars[4].classList.contains('sorted');
    }, 3000);

    // After some more time, more items should be marked sorted (at least 2)
    await app.waitForPredicate(() => document.querySelectorAll('.bar.sorted').length >= 2, 5000);

    const sortedCount = await app.getSortedCount();
    expect(sortedCount).toBeGreaterThanOrEqual(2);
  });

  test('Reset during sorting resets visible array and prevents stale DOM state leakage', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Start sorting
    await app.clickSort();

    // Wait until a comparison starts
    await app.waitForPredicate(() => {
      const bars = Array.from(document.querySelectorAll('.bar'));
      return bars.some(b => {
        const c = getComputedStyle(b).backgroundColor;
        return c.includes('255') && c.includes('165');
      });
    }, 2000);

    // Click reset while sorting is happening
    await app.clickReset();

    // Visible bars should match the initial array again (resetArray called)
    const heightsAfterReset = await app.getBarHeights();
    expect(heightsAfterReset).toEqual(['100px', '60px', '160px', '80px', '40px']);

    // No visible bars should have the 'sorted' class immediately after reset
    const sortedAfterReset = await app.getSortedCount();
    expect(sortedAfterReset).toBe(0);

    // Ensure that additional resets do not throw and keep DOM stable
    await expect(async () => {
      await app.clickReset();
      await app.clickReset();
      const h = await app.getBarHeights();
      expect(h.length).toBe(5);
    }).not.toThrow();
  });

  test('From done state, clicking Sort restarts sorting (SORT_CLICKED from done -> sorting)', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Complete a full sort
    await app.clickSort();
    await app.waitForPredicate(() => document.querySelectorAll('.bar.sorted').length === 5, 5000);
    const finalHeights = await app.getBarHeights();
    expect(finalHeights).toEqual(['40px', '60px', '80px', '100px', '160px']);

    // Click sort again from done state
    await app.clickSort();

    // After restarting, sorting should complete again and end in the same final sorted heights
    await app.waitForPredicate(() => document.querySelectorAll('.bar.sorted').length === 5, 5000);
    const heightsAfterRestart = await app.getBarHeights();
    expect(heightsAfterRestart).toEqual(['40px', '60px', '80px', '100px', '160px']);
  });

  test('Edge case: multiple rapid interactions do not break app (robustness)', async ({ page }) => {
    const app = new BubbleSortPage(page);

    // Rapidly click sort and reset multiple times
    await app.clickSort();
    await app.clickReset();
    await app.clickSort();
    await app.clickReset();
    await app.clickReset();

    // Give a moment for any rapid actions to stabilize (short)
    await page.waitForTimeout(100);

    // The DOM should remain consistent: 5 bars with valid height strings
    const heights = await app.getBarHeights();
    expect(heights.length).toBe(5);
    heights.forEach(h => expect(h).toMatch(/^\d+px$/));
  });
});