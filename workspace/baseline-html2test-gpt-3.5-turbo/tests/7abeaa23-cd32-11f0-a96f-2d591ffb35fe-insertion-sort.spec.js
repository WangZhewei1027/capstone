import { test, expect } from '@playwright/test';

// Test file: 7abeaa23-cd32-11f0-a96f-2d591ffb35fe-insertion-sort.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa23-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for the Insertion Sort page to keep tests organized
class InsertionSortPage {
  constructor(page) {
    this.page = page;
    this.input = page.locator('#input-array');
    this.startBtn = page.locator('#start-btn');
    this.speed = page.locator('#speed');
    this.arrayContainer = page.locator('#array-container');
  }

  // Helper to set the speed slider value using evaluate to modify the DOM element directly
  async setSpeed(value) {
    await this.speed.evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, String(value));
  }

  // Helper to start sorting with a given input string and optional speed
  async startSorting(inputStr, speedValue = 50) {
    await this.input.fill(inputStr);
    await this.setSpeed(speedValue);
    await this.startBtn.click();
  }

  // Returns array of numbers displayed in the bars (as strings)
  async getBarTexts() {
    const bars = await this.arrayContainer.locator('.bar').all();
    const texts = [];
    for (const bar of bars) {
      texts.push((await bar.textContent()).trim());
    }
    return texts;
  }

  // Returns true if all bars have the given className
  async allBarsHaveClass(className) {
    const bars1 = this.arrayContainer.locator('.bar');
    const count = await bars.count();
    for (let i = 0; i < count; i++) {
      const has = await bars.nth(i).evaluate((el, cls) => el.classList.contains(cls), className);
      if (!has) return false;
    }
    return count > 0; // return false if no bars
  }

  // Count bars
  async barCount() {
    return this.arrayContainer.locator('.bar').count();
  }
}

test.describe('Insertion Sort Visualization - UI and behavior', () => {
  // Arrays to collect console errors and page errors for assertions
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console messages and page errors to capture runtime problems
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      // err is an Error object representing an uncaught exception in the page
      pageErrors.push(err.message);
    });

    // Navigate to the application page before each test
    await page.goto(APP_URL);
  });

  test('Initial page load shows controls and empty array container', async ({ page }) => {
    // Purpose: verify that the main UI elements are present and initial state is correct
    const p = new InsertionSortPage(page);

    await expect(p.input).toBeVisible();
    await expect(p.startBtn).toBeVisible();
    await expect(p.startBtn).toBeEnabled();
    await expect(p.speed).toBeVisible();
    await expect(p.arrayContainer).toBeVisible();

    // The array container should start empty (no bars)
    const count1 = await p.barCount();
    expect(count).toBe(0);

    // Ensure no console errors or page errors occurred on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Start with empty input triggers an alert', async ({ page }) => {
    // Purpose: verify edge case handling for empty input and that alert appears
    const p1 = new InsertionSortPage(page);

    // Listen for the dialog that should be shown
    const dialogPromise = page.waitForEvent('dialog');

    // Click start with empty input (default)
    await p.startBtn.click();

    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Please enter some numbers');

    // Dismiss the alert
    await dialog.accept();

    // No uncaught page errors expected from this action
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Start with invalid numbers triggers an alert', async ({ page }) => {
    // Purpose: verify validation of input (non-number tokens)
    const p2 = new InsertionSortPage(page);

    await p.input.fill('5, x, 3');

    const dialogPromise1 = page.waitForEvent('dialog');
    await p.startBtn.click();

    const dialog1 = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Please enter only valid numbers');

    await dialog.accept();

    // No uncaught runtime errors should be produced by the validation flow
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Performs insertion sort and updates DOM to sorted order', async ({ page }) => {
    // Purpose: test the full sorting flow, DOM updates, and final visual state
    const p3 = new InsertionSortPage(page);

    // Provide a known array that sorts deterministically
    const input = '5,3,8,6';
    await p.input.fill(input);

    // Speed up animation to finish quickly
    await p.setSpeed(50);

    // Start sorting
    await p.startBtn.click();

    // Immediately after starting sorting, the start button should be disabled
    await expect(p.startBtn).toBeDisabled();

    // Wait until the sorting completes: the app re-enables the start button when done
    await expect(p.startBtn).toBeEnabled({ timeout: 10000 });

    // After sorting completes, bars should be present and reflect sorted values
    const texts1 = await p.getBarTexts();
    // Convert to numbers for reliable comparison
    const nums = texts.map(t => Number(t));
    expect(nums).toEqual([...nums].sort((a, b) => a - b)); // ensure ascending order
    expect(nums).toEqual([3, 5, 6, 8]); // exact sorted result for this input

    // Final visual state: all bars should have the 'insertion' class applied (final coloring)
    const allInsertion = await p.allBarsHaveClass('insertion');
    expect(allInsertion).toBe(true);

    // No uncaught runtime errors during the sort
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('During sorting, bars receive transient highlight classes (compared/highlight/insertion)', async ({ page }) => {
    // Purpose: assert that while animation is running some transient visual classes appear
    const p4 = new InsertionSortPage(page);

    // Use a small array but enough steps to observe intermediate highlights
    await p.input.fill('4,3,2,1');
    // Use medium speed so highlights are observable
    await p.setSpeed(150);

    // Start sorting
    await p.startBtn.click();

    // Confirm sorting started (start button disabled)
    await expect(p.startBtn).toBeDisabled();

    // Wait for any bar to gain 'compared' or 'highlight' or 'insertion' class during the animation.
    // This is a best-effort check: it waits until any of these classes appear, then continues.
    // If none appear in time, the waitForFunction will timeout and the test will fail as that's unexpected.
    await page.waitForFunction(() => {
      return !!(document.querySelector('.bar.compared') ||
                document.querySelector('.bar.highlight') ||
                document.querySelector('.bar.insertion'));
    }, null, { timeout: 3000 });

    // Now wait for the process to finish (start button enabled)
    await expect(p.startBtn).toBeEnabled({ timeout: 10000 });

    // After finishing, confirm sorted order
    const finalTexts = await p.getBarTexts();
    const finalNums = finalTexts.map(t => Number(t));
    expect(finalNums).toEqual([...finalNums].sort((a, b) => a - b));

    // Ensure no uncaught console/page errors happened during the animation
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Start button and inputs are disabled during sort and re-enabled after', async ({ page }) => {
    // Purpose: validate UI is locked during sorting to prevent concurrent operations
    const p5 = new InsertionSortPage(page);

    await p.input.fill('2,1');
    await p.setSpeed(100);
    // Start sorting
    await p.startBtn.click();

    // Immediately the controls should be disabled
    await expect(p.startBtn).toBeDisabled();
    await expect(p.input).toBeDisabled();
    await expect(p.speed).toBeDisabled();

    // Once sorting finishes, controls should be re-enabled
    await expect(p.startBtn).toBeEnabled({ timeout: 10000 });
    await expect(p.input).toBeEnabled();
    await expect(p.speed).toBeEnabled();

    // No runtime errors from toggling disabled states
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test.afterEach(async ({ page }) => {
    // In case there were unexpected runtime errors, fail the test with diagnostics
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      // Provide diagnostic information for debugging in test output
      const messages = [
        ...(consoleErrors.map(e => `Console error: ${e.text} at ${JSON.stringify(e.location)}`)),
        ...(pageErrors.map(e => `Page error: ${e}`))
      ].join('\n');
      // Fail the test explicitly if any runtime errors occurred
      throw new Error(`Runtime errors were captured during the test:\n${messages}`);
    }
    // Otherwise nothing to do; test worker will clean up the page.
  });
});