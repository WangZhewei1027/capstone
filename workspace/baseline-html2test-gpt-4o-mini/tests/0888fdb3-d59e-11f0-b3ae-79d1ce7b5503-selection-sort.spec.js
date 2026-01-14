import { test, expect } from '@playwright/test';

test.setTimeout(30000); // Ensure enough time for the sorting animation to complete

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdb3-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Selection Sort page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.containerSelector = '#arrayContainer';
    this.barSelector = `${this.containerSelector} .bar`;
    this.startButtonSelector = 'button:has-text("Start Sorting")';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return the number of bars currently rendered
  async getBarCount() {
    return await this.page.$$eval(this.barSelector, els => els.length);
  }

  // Return array of bar heights in pixels as numbers (parsed from style.height)
  async getBarHeightsPx() {
    return await this.page.$$eval(this.barSelector, els =>
      els.map(e => {
        // prefer style.height if set inline, otherwise fallback to computed height
        const inline = e.style && e.style.height;
        if (inline && inline.endsWith('px')) return parseFloat(inline.replace('px', ''));
        const computed = window.getComputedStyle(e).height;
        return computed && computed.endsWith('px') ? parseFloat(computed.replace('px', '')) : null;
      })
    );
  }

  // Click the Start Sorting button
  async clickStart() {
    const btn = this.page.locator(this.startButtonSelector);
    await expect(btn).toBeVisible();
    await btn.click();
  }

  // Return whether any bar has the highlight class
  async anyBarHighlighted() {
    return await this.page.$$eval(this.barSelector, els => els.some(e => e.classList.contains('highlight')));
  }

  // Return accessible name / text of the Start button
  async getStartButtonText() {
    return await this.page.textContent(this.startButtonSelector);
  }

  // Read the global "array" variable from the page (original array defined in script)
  async getOriginalArrayFromWindow() {
    return await this.page.evaluate(() => {
      try {
        return window.array;
      } catch (e) {
        return undefined;
      }
    });
  }
}

test.describe('Selection Sort Visualization - 0888fdb3-d59e-11f0-b3ae-79d1ce7b5503', () => {
  // Collect runtime errors and console errors during each test to assert afterwards
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught exceptions from the page
    page.on('pageerror', (error) => {
      // Store the Error object for assertions and debugging
      pageErrors.push(error);
    });

    // Capture console messages (we care about error-level messages)
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(String(msg.text()));
        }
      } catch (e) {
        // ignore any unexpected console inspection failures
      }
    });

    // Navigate to the app under test
    const pageObj = new SelectionSortPage(page);
    await pageObj.goto();
  });

  test.afterEach(async () => {
    // Assert that no uncaught page errors or console.error messages were produced during the test.
    // We assert that there were zero runtime errors to validate that the UI runs without Unexpected Exceptions.
    expect(pageErrors, `page errors encountered: ${pageErrors.map(e => e && e.message).join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `console errors encountered: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial load: page structure and default bars are rendered correctly', async ({ page }) => {
    // Purpose: Verify initial page load: title, button, and initial bars are present and correct.
    const pageObj1 = new SelectionSortPage(page);

    // Check page title and header
    const header = await page.textContent('h1');
    expect(header).toBe('Selection Sort Visualization');

    // Check Start Sorting button is visible and has correct label
    const startText = await pageObj.getStartButtonText();
    expect(startText).toBeTruthy();
    expect(startText.trim()).toMatch(/Start Sorting/i);

    // Verify that bars are created and count matches the expected array length (5)
    const barCount = await pageObj.getBarCount();
    expect(barCount).toBe(5);

    // Verify bar heights correspond to the initial array values [64, 25, 12, 22, 11] multiplied by 5
    const heights = await pageObj.getBarHeightsPx();
    const expectedValues = [64, 25, 12, 22, 11].map(v => v * 5);
    expect(heights).toEqual(expectedValues);

    // Verify that no bar has the 'highlight' class initially (the implementation doesn't highlight)
    const anyHighlight = await pageObj.anyBarHighlighted();
    expect(anyHighlight).toBe(false);
  });

  test('Clicking Start Sorting triggers visualization updates and eventually sorts bars', async ({ page }) => {
    // Purpose: Validate that clicking Start Sorting starts the animation, DOM is updated during sorting,
    // and final state is sorted ascending.
    const pageObj2 = new SelectionSortPage(page);

    // Snapshot heights before starting the sort
    const beforeHeights = await pageObj.getBarHeightsPx();
    expect(beforeHeights).toEqual([64 * 5, 25 * 5, 12 * 5, 22 * 5, 11 * 5]);

    // Start sorting
    await pageObj.clickStart();

    // Wait a short time for the sorting animation to begin and confirm DOM updates happen (not all final)
    // The implementation updates DOM after each comparison and after each outer iteration.
    await page.waitForTimeout(1200); // allow at least a couple of animation steps

    const midHeights = await pageObj.getBarHeightsPx();
    // Mid heights should not be identical to the initial heights (some swaps/updates or redraws happen)
    const identical = JSON.stringify(beforeHeights) === JSON.stringify(midHeights);
    expect(identical).toBe(false);

    // Wait sufficiently long for the entire selection sort animation to complete.
    // Estimated runtime: (inner comparisons + outer swaps) * 500ms ~ about 7s for 5 elements; we wait a bit more.
    await page.waitForTimeout(9000);

    // After completion, verify bars are sorted ascending: [11,12,22,25,64] * 5
    const finalHeights = await pageObj.getBarHeightsPx();
    const expectedSorted = [11, 12, 22, 25, 64].map(v => v * 5);
    expect(finalHeights).toEqual(expectedSorted);
  });

  test('Original array in window remains unchanged after sorting (sorting uses a copy)', async ({ page }) => {
    // Purpose: Ensure the implementation copies the original array and does not mutate the global original array.
    const pageObj3 = new SelectionSortPage(page);

    // Read the original array from window before any interactions
    const originalBefore = await pageObj.getOriginalArrayFromWindow();
    expect(originalBefore).toEqual([64, 25, 12, 22, 11]);

    // Start sorting
    await pageObj.clickStart();

    // Wait until sorting completes
    await page.waitForTimeout(9000);

    // Ensure the global window.array is still the same original array (not mutated)
    const originalAfter = await pageObj.getOriginalArrayFromWindow();
    expect(originalAfter).toEqual([64, 25, 12, 22, 11]);
  });

  test('Clicking Start Sorting multiple times does not produce runtime exceptions and results in sorted bars', async ({ page }) => {
    // Purpose: Test edge-case interaction: multiple clicks - verify no uncaught exceptions and final state is sorted.
    const pageObj4 = new SelectionSortPage(page);

    // Click start twice in quick succession to simulate a user clicking multiple times
    await pageObj.clickStart();
    await page.waitForTimeout(100); // slight delay between clicks
    await pageObj.clickStart();

    // Wait for sorting animations to complete (allow ample time for overlapping runs)
    await page.waitForTimeout(10000);

    // Final heights should be sorted ascending
    const finalHeights1 = await pageObj.getBarHeightsPx();
    const expectedSorted1 = [11, 12, 22, 25, 64].map(v => v * 5);
    expect(finalHeights).toEqual(expectedSorted);
  });

  test('Accessibility: Start Sorting button is accessible via role and name', async ({ page }) => {
    // Purpose: Basic accessibility verification - the Start Sorting button can be located by role and name.
    // This helps ensure the control is discoverable by assistive technologies.
    const startButton = page.getByRole('button', { name: /Start Sorting/i });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });
});