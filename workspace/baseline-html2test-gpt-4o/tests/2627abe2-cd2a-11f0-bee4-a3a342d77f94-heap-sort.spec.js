import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe2-cd2a-11f0-bee4-a3a342d77f94.html';

/**
 * Page object for the Heap Sort visualization page.
 * Encapsulates common interactions and queries against the page DOM.
 */
class HeapSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('.container');
    this.title = page.locator('h1');
    this.sortButton = page.locator('button', { hasText: 'Sort Array' });
    this.arrayContainer = page.locator('#array');
    this.barLocator = page.locator('#array .bar');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the initial drawing to complete: the script calls drawArray(-1) on load.
    await this.barLocator.first().waitFor({ state: 'attached', timeout: 2000 });
  }

  async getBarCount() {
    return await this.barLocator.count();
  }

  // Returns array of inline style heights for all bars (e.g. "150px")
  async getBarHeights() {
    return await this.page.$$eval('#array .bar', bars => bars.map(b => b.style.height));
  }

  // Returns array of booleans whether each bar has the 'bar-sorted' class
  async getBarSortedFlags() {
    return await this.page.$$eval('#array .bar', bars => bars.map(b => b.classList.contains('bar-sorted')));
  }

  async clickSort() {
    await this.sortButton.click();
  }

  // Returns number of elements with class 'bar-sorted'
  async getSortedCount() {
    return await this.page.$$eval('#array .bar-sorted', els => els.length);
  }
}

test.describe('Heap Sort Visualization - 2627abe2-cd2a-11f0-bee4-a3a342d77f94', () => {
  // Each test will create its own page fixture supplied by Playwright

  // Test initial page load and default state
  test('Initial load shows title, sort button, and 30 bars with expected styles', async ({ page }) => {
    // Capture console messages and page errors so we can assert no unexpected runtime errors.
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(msg));
    page.on('pageerror', err => pageErrors.push(err));

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Verify header and button are visible
    await expect(heapPage.title).toHaveText('Heap Sort Visualization');
    await expect(heapPage.sortButton).toBeVisible();
    await expect(heapPage.sortButton).toHaveText('Sort Array');

    // Verify there are 30 bars rendered
    const barCount = await heapPage.getBarCount();
    expect(barCount).toBe(30);

    // Validate that each bar has the expected inline styles and none are initially marked as sorted
    const heights = await heapPage.getBarHeights();
    expect(heights.length).toBe(30);
    for (const h of heights) {
      // Each bar's height should be a non-empty string ending with "px"
      expect(typeof h).toBe('string');
      expect(h.length).toBeGreaterThan(0);
      expect(h.endsWith('px')).toBeTruthy();
    }

    const sortedFlags = await heapPage.getBarSortedFlags();
    // On initial render drawArray(-1) should produce no 'bar-sorted' classes
    expect(sortedFlags.every(flag => flag === false)).toBeTruthy();

    // Assert there were no uncaught page errors and no console errors logged during load
    const consoleErrorCount = consoleMessages.filter(m => m.type() === 'error').length;
    expect(pageErrors.length).toBe(0);
    expect(consoleErrorCount).toBe(0);
  });

  // Test user interaction: clicking the "Sort Array" button should start the heap sort and update the DOM
  test('Clicking "Sort Array" starts sorting and applies .bar-sorted classes dynamically', async ({ page }) => {
    // Collect console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(msg));
    page.on('pageerror', err => pageErrors.push(err));

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Capture a snapshot of heights before sorting begins
    const initialHeights = await heapPage.getBarHeights();

    // Start the sort
    await heapPage.clickSort();

    // Wait for at least one element to be marked as 'bar-sorted'
    // The algorithm uses a 100ms delay between major steps; we allow a generous timeout.
    await page.waitForSelector('#array .bar-sorted', { state: 'attached', timeout: 8000 });

    // After some sorting has occurred, there should be at least one 'bar-sorted' element
    const sortedCount = await heapPage.getSortedCount();
    expect(sortedCount).toBeGreaterThan(0);

    // Heights should have changed as the underlying array is mutated by the algorithm
    const duringHeights = await heapPage.getBarHeights();
    // At least some bar height should differ from the initial snapshot
    const anyChanged = duringHeights.some((h, i) => h !== initialHeights[i]);
    expect(anyChanged).toBeTruthy();

    // Ensure no uncaught exceptions or console-level errors happened during the sort window we observed
    const consoleErrorCount = consoleMessages.filter(m => m.type() === 'error').length;
    expect(pageErrors.length).toBe(0);
    expect(consoleErrorCount).toBe(0);
  });

  // Test robustness when clicking the sort button multiple times during operation.
  test('Clicking sort multiple times does not produce uncaught exceptions', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(msg));
    page.on('pageerror', err => pageErrors.push(err));

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Snapshot before any clicks
    const beforeHeights = await heapPage.getBarHeights();

    // Trigger multiple clicks in quick succession to exercise reentrant behavior
    await heapPage.clickSort();
    // Click again quickly - the page code will simply call heapSort() again
    await heapPage.clickSort();

    // Wait a short while to let visible changes occur (some sorting steps)
    await page.waitForTimeout(600);

    // There should be at least one visible change in bar heights after these interactions
    const afterHeights = await heapPage.getBarHeights();
    const changed = afterHeights.some((h, i) => h !== beforeHeights[i]);
    expect(changed).toBeTruthy();

    // No uncaught exceptions or console errors should have been thrown as a result
    const consoleErrorCount = consoleMessages.filter(m => m.type() === 'error').length;
    expect(pageErrors.length).toBe(0);
    expect(consoleErrorCount).toBe(0);
  });

  // Test final state: after allowing the sort to complete, verify the DOM stabilizes.
  test('After sorting completes the UI stabilizes and no runtime errors occur', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push(msg));
    page.on('pageerror', err => pageErrors.push(err));

    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // Start the sort
    await heapPage.clickSort();

    // The algorithm performs ~30 iterations with 100ms delays; wait long enough for the sort to reasonably complete.
    // If the environment is slower, this may need to be increased; we choose 7000ms as a conservative default.
    await page.waitForTimeout(7000);

    // The implementation's final drawArray(-1) removes 'bar-sorted' classes, so we expect zero elements with that class.
    // This verifies that the visualization attempted to finalize state.
    const finalSortedCount = await heapPage.getSortedCount();
    expect(finalSortedCount).toBe(0);

    // Ensure the bars still exist and count remains 30
    const finalBarCount = await heapPage.getBarCount();
    expect(finalBarCount).toBe(30);

    // Confirm no page errors and no console.error entries were emitted during the full run
    const consoleErrorCount = consoleMessages.filter(m => m.type() === 'error').length;
    expect(pageErrors.length).toBe(0);
    expect(consoleErrorCount).toBe(0);
  });

  // Accessibility and basic control checks
  test('Sort button is accessible and focusable', async ({ page }) => {
    const heapPage = new HeapSortPage(page);
    await heapPage.goto();

    // The button should be enabled and have an accessible name
    await expect(heapPage.sortButton).toBeEnabled();
    // Focus the button and ensure it receives focus
    await heapPage.sortButton.focus();
    await expect(heapPage.sortButton).toBeFocused();
    // The accessible name is the visible text "Sort Array"
    await expect(heapPage.sortButton).toHaveText('Sort Array');
  });
});