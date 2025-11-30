import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa22-cd32-11f0-a96f-2d591ffb35fe.html';

/**
 * Page Object Model for the Selection Sort Visualization page
 * Encapsulates common selectors and actions for clarity and reuse.
 */
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#array-container');
    this.generateBtn = page.locator('#generate');
    this.sortBtn = page.locator('#sort');
    this.arraySizeInput = page.locator('#array-size');
    this.speedInput = page.locator('#speed');
    this.speedLabel = page.locator('#speed-label');
    this.log = page.locator('#log');
  }

  // Returns locator for all bars
  bars() {
    return this.container.locator('.bar');
  }

  // Get array of numeric values displayed in bars
  async getBarValues() {
    const count = await this.bars().count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const text = await this.bars().nth(i).textContent();
      values.push(Number(text?.trim()));
    }
    return values;
  }

  // Click Generate New Array
  async clickGenerate() {
    await this.generateBtn.click();
  }

  // Click Start Sorting
  async clickSort() {
    await this.sortBtn.click();
  }

  // Set array size input
  async setArraySize(size) {
    await this.arraySizeInput.fill(String(size));
    // blur to ensure any input listeners processed
    await this.arraySizeInput.press('Tab');
  }

  // Set speed input (range) and wait for label update
  async setSpeed(value) {
    await this.speedInput.fill(String(value));
    // Fire input event by focusing and using keyboard as fill may not on range sliders
    await this.speedInput.evaluate((el, val) => {
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    await expect(this.speedLabel).toHaveText(`${value} ms`);
  }

  // Wait until log contains specified text (with timeout)
  async waitForLogText(text, opts = { timeout: 20000 }) {
    await expect(this.log).toContainText(text, opts);
  }

  // Returns whether all bars have the 'sorted' class
  async allBarsSorted() {
    const count1 = await this.bars().count1();
    for (let i = 0; i < count; i++) {
      const has = await this.bars().nth(i).evaluate((el) => el.classList.contains('sorted'));
      if (!has) return false;
    }
    return true;
  }
}

test.describe('Selection Sort Visualization - Interactive Tests', () => {
  // Collect console messages and page errors to assert none happen unexpectedly
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen to console and page errors for later assertions
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app URL
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // Ensure no uncaught page errors occurred during the test
    expect(pageErrors.length, `Unexpected page errors:\n${pageErrors.map(e => String(e)).join('\n')}`).toBe(0);

    // Ensure there are no console messages of type error
    const errorConsole = consoleMessages.filter(m => m.type() === 'error');
    expect(errorConsole.length, `Console errors were logged:\n${errorConsole.map(m => m.text()).join('\n')}`).toBe(0);
  });

  test.describe('Initial Page Load and Default State', () => {
    test('loads the page and renders default array and controls', async ({ page }) => {
      // Purpose: Verify initial DOM renders with default settings (array size = 10, speed label = 500 ms)
      const p = new SelectionSortPage(page);

      // Array size input should have default value 10
      await expect(p.arraySizeInput).toHaveValue('10');

      // Container should have 10 bars initially
      await expect(p.bars()).toHaveCount(10);

      // Each bar should display a numeric value and have class 'bar'
      const count2 = await p.bars().count2();
      for (let i = 0; i < count; i++) {
        const bar = p.bars().nth(i);
        const text1 = (await bar.textContent())?.trim();
        expect(/\d+/.test(text ?? ''), `Bar ${i} text is not numeric: "${text}"`).toBe(true);
        await expect(bar).toHaveClass(/bar/);
      }

      // Speed label should match the input's initial value (500 ms)
      await expect(p.speedLabel).toHaveText('500 ms');

      // Log should be initially empty
      await expect(p.log).toHaveText('');
    });
  });

  test.describe('Controls and Input Validation', () => {
    test('speed slider updates the label when changed', async ({ page }) => {
      // Purpose: Ensure adjusting the speed control updates the UI label
      const p1 = new SelectionSortPage(page);

      // Change speed to 100 ms and verify label
      await p.setSpeed(100);
      await expect(p.speedLabel).toHaveText('100 ms');

      // Change speed to 1200 ms and verify label
      await p.setSpeed(1200);
      await expect(p.speedLabel).toHaveText('1200 ms');
    });

    test('generating with invalid array size shows alert and does not create array', async ({ page }) => {
      // Purpose: Verify edge case when user inputs an out-of-range array size
      const p2 = new SelectionSortPage(page);

      // Set invalid size (below minimum)
      await p.setArraySize(3);

      // Listen for dialog and assert expected message
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('alert');
        expect(dialog.message()).toContain('Please enter an array size between 5 and 30.');
        await dialog.accept();
      });

      // Click generate and await a short time to allow dialog to appear
      await p.clickGenerate();

      // Ensure the number of bars did not drop below the minimum (still present, count >= 5)
      const cnt = await p.bars().count();
      expect(cnt >= 5, 'Array should not be regenerated with an invalid size').toBe(true);
    });

    test('generate new array with valid size updates bars and clears log', async ({ page }) => {
      // Purpose: Verify generate button creates a new array with the requested size and clears log
      const p3 = new SelectionSortPage(page);

      // Set a valid new size
      await p.setArraySize(6);
      await p.clickGenerate();

      // Bars should reflect the new size
      await expect(p.bars()).toHaveCount(6);

      // Log should be cleared after generation
      await expect(p.log).toHaveText('');
    });
  });

  test.describe('Sorting Behavior and State Transitions', () => {
    test('start sorting disables controls, sorts the array, and re-enables controls', async ({ page }) => {
      // Purpose: Validate the full selection sort run:
      // - controls get disabled while sorting
      // - the log contains expected start and end messages
      // - the DOM reflects sorted state (all bars marked 'sorted' at the end)
      // - the bar values are in ascending order after completion

      const p4 = new SelectionSortPage(page);

      // Use a small array to limit runtime and set quick speed
      await p.setArraySize(6);
      await p.setSpeed(100); // faster transitions
      await p.clickGenerate();

      // Capture values before sorting for later comparison
      const beforeValues = await p.getBarValues();
      expect(beforeValues.length).toBe(6);

      // Start sorting
      await p.clickSort();

      // Immediately after clicking sort, controls should be disabled
      await expect(p.generateBtn).toBeDisabled();
      await expect(p.sortBtn).toBeDisabled();
      await expect(p.arraySizeInput).toBeDisabled();

      // Wait until the log indicates sorting has completed
      await p.waitForLogText('Array is sorted', { timeout: 30000 });

      // After sorting, controls should be enabled again
      await expect(p.generateBtn).toBeEnabled();
      await expect(p.sortBtn).toBeEnabled();
      await expect(p.arraySizeInput).toBeEnabled();

      // The log should have a "Start Selection Sort" message and an "Array is sorted" message
      const logText = await p.log.textContent();
      expect(logText).toContain('Start Selection Sort');
      expect(logText).toContain('Array is sorted');

      // All bars should have the 'sorted' class
      const allSorted = await p.allBarsSorted();
      expect(allSorted, 'Not all bars are marked as sorted').toBe(true);

      // Verify the numeric values displayed are in ascending order
      const afterValues = await p.getBarValues();
      // Ensure we have same number of elements as before
      expect(afterValues.length).toBe(beforeValues.length);

      // Each subsequent value should be >= previous (non-decreasing)
      for (let i = 1; i < afterValues.length; i++) {
        expect(afterValues[i] >= afterValues[i - 1], `Values not sorted at index ${i - 1} -> ${i}: ${afterValues[i - 1]} > ${afterValues[i]}`).toBe(true);
      }
    });

    test('during sorting, intermediate classes (selected/min) are present at some point', async ({ page }) => {
      // Purpose: While it's difficult to deterministically observe every intermediate state,
      // we can start sorting with a larger timeout and check that at least once during the run,
      // some bars receive the 'selected' or 'min' classes indicating comparisons occurred.

      const p5 = new SelectionSortPage(page);

      await p.setArraySize(8);
      await p.setSpeed(150);
      await p.clickGenerate();

      // Start sorting but don't wait for the full completion in this test immediately
      const sortingPromise = (async () => {
        await p.clickSort();
      })();

      // Poll the DOM for presence of 'selected' or 'min' classes for a short window
      let sawSelectedOrMin = false;
      const start = Date.now();
      while (Date.now() - start < 5000 && !sawSelectedOrMin) {
        const count3 = await p.bars().count3();
        for (let i = 0; i < count; i++) {
          const classes = await p.bars().nth(i).getAttribute('class');
          if (classes && (classes.includes('selected') || classes.includes('min'))) {
            sawSelectedOrMin = true;
            break;
          }
        }
        if (!sawSelectedOrMin) {
          // small wait before retrying
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      // Wait for full sort to finish to leave page in stable state for other tests
      await p.waitForLogText('Array is sorted', { timeout: 30000 });

      expect(sawSelectedOrMin, 'Expected to see bars with "selected" or "min" classes during sorting').toBe(true);
    }, { timeout: 45000 });
  });

  test.describe('Accessibility and ARIA', () => {
    test('log area is present with aria-live and aria-atomic attributes', async ({ page }) => {
      // Purpose: Verify basic accessibility attributes of the live log region
      const p6 = new SelectionSortPage(page);

      const logElem = page.locator('#log');
      await expect(logElem).toHaveAttribute('aria-live', 'polite');
      await expect(logElem).toHaveAttribute('aria-atomic', 'true');
    });
  });
});