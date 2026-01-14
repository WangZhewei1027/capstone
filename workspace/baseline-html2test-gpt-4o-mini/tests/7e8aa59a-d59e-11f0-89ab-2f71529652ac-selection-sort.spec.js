import { test, expect } from '@playwright/test';

// Page object model for the Selection Sort page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa59a-d59e-11f0-89ab-2f71529652ac.html';
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
    // Ensure initial draw has completed
    await this.page.waitForSelector('#arrayContainer .bar');
  }

  // Return the Sort Array button locator
  getSortButton() {
    return this.page.locator('button:has-text("Sort Array")');
  }

  // Return locator for all bars
  getBars() {
    return this.page.locator('#arrayContainer .bar');
  }

  // Read pixel heights of all bars as numbers (parseInt of style.height)
  async getBarHeights() {
    const barCount = await this.getBars().count();
    const heights = [];
    for (let i = 0; i < barCount; i++) {
      const handle = this.getBars().nth(i);
      const height = await handle.evaluate((el) => {
        // style.height is like "320px"
        return window.getComputedStyle(el).height;
      });
      heights.push(parseInt(height, 10));
    }
    return heights;
  }

  // Click the Sort Array button
  async clickSortButton() {
    await this.getSortButton().click();
  }

  // Wait until the bars match the expected heights array (numbers in px)
  async waitForBarHeights(expectedHeightsPx, { timeout = 10000 } = {}) {
    await expect.poll(async () => {
      const heights1 = await this.getBarHeights();
      return JSON.stringify(heights);
    }, { timeout }).toBe(JSON.stringify(expectedHeightsPx));
  }
}

test.describe('Selection Sort Visualization - end-to-end', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      // record console type and text for later assertions / debugging
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial page state and DOM correctness
  test('Initial load: title, button visibility and initial bars are rendered with expected heights', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Check page title contains expected text
    await expect(page).toHaveTitle(/Selection Sort Visualization/);

    // Ensure the Sort Array button is visible and accessible
    const sortButton = app.getSortButton();
    await expect(sortButton).toBeVisible();
    await expect(sortButton).toHaveText('Sort Array');

    // Verify initial bars count and their heights
    const bars = app.getBars();
    await expect(bars).toHaveCount(5);

    // The implementation uses values [64,25,12,22,11] and style.height = value * 5 px
    const expectedInitialHeightsPx = [64 * 5, 25 * 5, 12 * 5, 22 * 5, 11 * 5];
    const actualHeights = await app.getBarHeights();
    expect(actualHeights).toEqual(expectedInitialHeightsPx);

    // Assert no uncaught page errors occurred during initial load
    // (This verifies the page loaded without runtime exceptions such as ReferenceError/SyntaxError/TypeError)
    expect(pageErrors.length).toBe(0);

    // Optionally ensure there are no console messages with severity 'error'
    const errorConsoles = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Test the sorting interaction and final state
  test('Clicking "Sort Array" sorts the bars visually to ascending order', async ({ page }) => {
    const app1 = new SelectionSortPage(page);
    await app.goto();

    // Capture initial heights to confirm they change
    const initialHeights = await app.getBarHeights();
    expect(initialHeights).toEqual([64 * 5, 25 * 5, 12 * 5, 22 * 5, 11 * 5]);

    // Click the Sort Array button to start sorting
    await app.clickSortButton();

    // The expected final sorted heights in ascending order (values sorted: [11,12,22,25,64])
    const expectedFinalHeightsPx = [11 * 5, 12 * 5, 22 * 5, 25 * 5, 64 * 5];

    // Wait for the final sorted visual state to be applied.
    // Because the implementation uses a 500ms delay per swap and multiple swaps may occur,
    // we allow generous timeout to account for the async visualization.
    await app.waitForBarHeights(expectedFinalHeightsPx, { timeout: 10000 });

    // Finally, assert the DOM shows the sorted heights exactly
    const finalHeights = await app.getBarHeights();
    expect(finalHeights).toEqual(expectedFinalHeightsPx);

    // Verify no uncaught runtime errors occurred during sorting
    expect(pageErrors.length).toBe(0);

    // No console error messages were logged
    const errorConsoles1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Test clicking the button multiple times during sorting (edge case)
  test('Clicking the sort button multiple times while sorting does not crash and results in sorted final state', async ({ page }) => {
    const app2 = new SelectionSortPage(page);
    await app.goto();

    // Start sorting
    await app.clickSortButton();

    // Click again almost immediately to simulate a user double-clicking or clicking again while animation runs
    await app.clickSortButton();

    // Expect the final state to still be sorted ascending; allow time for both invocations to complete
    const expectedFinalHeightsPx1 = [11 * 5, 12 * 5, 22 * 5, 25 * 5, 64 * 5];
    await app.waitForBarHeights(expectedFinalHeightsPx, { timeout: 15000 });

    const finalHeights1 = await app.getBarHeights();
    expect(finalHeights).toEqual(expectedFinalHeightsPx);

    // Check that no uncaught errors leaked into the page
    expect(pageErrors.length).toBe(0);

    // Ensure console didn't log errors
    const errorConsoles2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Test that the DOM updates occur on each swap (observable intermediate state)
  test('During sorting, intermediate DOM updates occur (at least one change from initial state before final state)', async ({ page }) => {
    const app3 = new SelectionSortPage(page);
    await app.goto();

    // Record initial heights
    const initialHeights1 = await app.getBarHeights();

    // Start sorting
    await app.clickSortButton();

    // Poll for any change in heights that is neither initial nor final, within the animation duration.
    // We expect at least one intermediate state because the algorithm swaps several times.
    const expectedFinalHeightsPx2 = [11 * 5, 12 * 5, 22 * 5, 25 * 5, 64 * 5];

    // Wait until either we observe a heights array that's different from initial (an intermediate update),
    // or until final state is reached.
    const observedIntermediate = await expect.poll(async () => {
      const h = await app.getBarHeights();
      if (JSON.stringify(h) === JSON.stringify(initialHeights)) return false;
      // If equal to final, still treat as success (intermediate may have been quick)
      if (JSON.stringify(h) === JSON.stringify(expectedFinalHeightsPx)) return true;
      return true;
    }, { timeout: 5000 }).toBeTruthy();

    // After that, ensure final state is achieved
    await app.waitForBarHeights(expectedFinalHeightsPx, { timeout: 10000 });

    // Final sanity checks
    expect(pageErrors.length).toBe(0);
    const errorConsoles3 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Accessibility and visibility checks
  test('Accessibility: sort button is reachable and labeled appropriately', async ({ page }) => {
    const app4 = new SelectionSortPage(page);
    await app.goto();

    const sortButton1 = app.getSortButton();
    // The button should be enabled and accessible via its text
    await expect(sortButton).toBeEnabled();
    await expect(sortButton).toHaveAttribute('onclick', /selectionSort/);

    // Ensure the array container has role-less bars but they are visible to users
    const bars1 = app.getBars();
    await expect(bars.first()).toBeVisible();

    // No runtime page errors present
    expect(pageErrors.length).toBe(0);
  });
});