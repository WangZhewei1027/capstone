import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d580650-d1d8-11f0-bbda-359f3f96b638.html';

/**
 * Page Object for the Sliding Window demo page.
 * Encapsulates common interactions and queries against the DOM.
 */
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = '#arrayInput';
    this.windowInput = '#windowSizeInput';
    this.runButton = '#runButton';
    this.resultContainer = '#resultContainer';
    this.windowSelector = '.window';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillArray(value) {
    await this.page.fill(this.arrayInput, value);
  }

  // Use null to clear the input (fill with empty string)
  async setWindowSize(value) {
    if (value === null) {
      await this.page.fill(this.windowInput, '');
    } else {
      await this.page.fill(this.windowInput, String(value));
    }
  }

  async clickRun() {
    await this.page.click(this.runButton);
  }

  async getResultContainerInnerHTML() {
    return await this.page.$eval(this.resultContainer, el => el.innerHTML);
  }

  async getResultContainerText() {
    return await this.page.$eval(this.resultContainer, el => el.innerText);
  }

  async getWindowCount() {
    return await this.page.$$eval(this.windowSelector, nodes => nodes.length);
  }

  async getWindowTexts() {
    return await this.page.$$eval(this.windowSelector, nodes => nodes.map(n => n.innerText));
  }

  // Pre-populate result container (used to verify clearResults behavior)
  async prepopulateResults(html = '<div id="prepop">PREPOP</div>') {
    await this.page.evaluate((selector, html) => {
      document.querySelector(selector).innerHTML = html;
    }, this.resultContainer, html);
  }
}

test.describe('Sliding Window Technique Demo - FSM validation', () => {
  /** Arrays to collect console errors and page errors that occur during tests */
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collections
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Collect unhandled page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', err => {
      // store the stringified error for assertions/logging
      pageErrors.push(err && err.stack ? err.stack.toString() : String(err));
    });
  });

  test.afterEach(async () => {
    // After each test ensure that there were no uncaught page errors or console.error messages.
    // Per instructions we observe console logs and page errors and let them occur naturally.
    // Here we assert that none occurred for this known-good implementation.
    expect(pageErrors, `No uncaught page errors expected, saw: ${pageErrors.join('\n')}`).toHaveLength(0);
    expect(consoleErrors, `No console.error messages expected, saw: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test.describe('Initial render (S0_Idle) and basic DOM checks', () => {
    test('Initial page elements are rendered and in expected Idle state', async ({ page }) => {
      // Validate S0 Idle entry_actions -> renderPage() is represented by presence of inputs/button
      const app = new SlidingWindowPage(page);
      await app.goto();

      // Check that the array input is present and has the expected placeholder
      const arrayPlaceholder = await page.getAttribute('#arrayInput', 'placeholder');
      expect(arrayPlaceholder).toBe('e.g., 1,2,3,4,5');

      // Check that the window size input exists and has min attribute 1
      const windowMin = await page.getAttribute('#windowSizeInput', 'min');
      expect(windowMin).toBe('1');

      // Check that the run button exists and has expected label
      const runText = await page.textContent('#runButton');
      expect(runText).toBe('Run Sliding Window');

      // Result container should exist and be empty on initial load
      const resultInner = await app.getResultContainerInnerHTML();
      expect(resultInner).toBe('');
    });
  });

  test.describe('Transitions and state behaviors', () => {
    test('S0 -> S1 (Processing): clicking Run clears previous results and processes the array', async ({ page }) => {
      // This test validates the transition from Idle to Processing:
      // - clearResults() should remove any prepopulated content
      // - calculateSlidingWindow() should append result .window divs
      const app1 = new SlidingWindowPage(page);
      await app.goto();

      // Prepopulate result container to test that it gets cleared
      await app.prepopulateResults('<div id="ghost">SHOULD_BE_CLEARED</div>');
      expect(await app.getResultContainerInnerHTML()).toContain('SHOULD_BE_CLEARED');

      // Provide inputs and run
      await app.fillArray('1,2,3,4,5');
      await app.setWindowSize(2);
      await app.clickRun();

      // ensure previous content removed and new windows appended
      const innerAfter = await app.getResultContainerInnerHTML();
      expect(innerAfter).not.toContain('SHOULD_BE_CLEARED');

      // Expect number of windows = n - k + 1 => 5 - 2 + 1 = 4
      const windowCount = await app.getWindowCount();
      expect(windowCount).toBe(4);

      // Check the content of the first window to ensure correct calculation
      const texts = await app.getWindowTexts();
      expect(texts[0]).toBe('Window: [1, 2], Sum: 3');
    });

    test('S1 -> S2 (Error): window size larger than array yields error message', async ({ page }) => {
      // This test checks the guard that leads to the Error state:
      // Guard: array.length < windowSize -> display error message in resultContainer
      const app2 = new SlidingWindowPage(page);
      await app.goto();

      await app.fillArray('1,2,3');
      await app.setWindowSize(5);
      await app.clickRun();

      const containerText = await app.getResultContainerText();
      expect(containerText).toBe('Window size cannot be larger than the array length.');

      // Ensure no .window elements were appended
      const windowCount1 = await app.getWindowCount();
      expect(windowCount).toBe(0);
    });

    test('S1 -> S3 (Result): window size equal to array length displays single result', async ({ page }) => {
      // This test validates that when array.length >= windowSize the displayResults action occurs
      const app3 = new SlidingWindowPage(page);
      await app.goto();

      await app.fillArray('10,20,30');
      await app.setWindowSize(3);
      await app.clickRun();

      // Expect exactly one window because windowSize == array length
      const windowCount2 = await app.getWindowCount();
      expect(windowCount).toBe(1);

      // Validate the resulting content
      const texts1 = await app.getWindowTexts();
      expect(texts[0]).toBe('Window: [10, 20, 30], Sum: 60');
    });

    test('Multiple runs clear previous results each time', async ({ page }) => {
      // Validate clearResults() executes on each run - previous runs should not accumulate
      const app4 = new SlidingWindowPage(page);
      await app.goto();

      await app.fillArray('1,2,3');
      await app.setWindowSize(1);
      await app.clickRun();

      let count = await app.getWindowCount();
      expect(count).toBe(3); // 3 windows of size 1

      // Now change window size and run again; previous results must be cleared and replaced
      await app.setWindowSize(2);
      await app.clickRun();

      count = await app.getWindowCount();
      expect(count).toBe(2); // 2 windows of size 2

      // Confirm none of the earlier single-element windows remain by checking text content
      const texts2 = await app.getWindowTexts();
      expect(texts[0]).toContain('Window: [1, 2]');
      expect(texts.some(t => t.includes('Window: [1]'))).toBe(false);
    });
  });

  test.describe('Edge cases and robustness', () => {
    test('Non-numeric array values produce NaN sums but still create windows (edge case)', async ({ page }) => {
      // This test demonstrates how the implementation behaves if non-numeric tokens are provided.
      // parseInt on non-numeric strings yields NaN; sums will therefore be NaN.
      const app5 = new SlidingWindowPage(page);
      await app.goto();

      await app.fillArray('a,b,c');
      await app.setWindowSize(2);
      await app.clickRun();

      // There should be 2 windows (3 - 2 + 1)
      const windowCount3 = await app.getWindowCount();
      expect(windowCount).toBe(2);

      // Each window's Sum part should contain 'NaN' because parseInt('a') -> NaN
      const texts3 = await app.getWindowTexts();
      expect(texts.length).toBe(2);
      expect(texts[0]).toContain('Sum: NaN');
      expect(texts[1]).toContain('Sum: NaN');
    });

    test('Empty window size input results in no results and no uncaught errors (edge case)', async ({ page }) => {
      // If window size is left empty, parseInt on empty string yields NaN.
      // The implementation's comparisons and loops will cause no windows to be appended.
      const app6 = new SlidingWindowPage(page);
      await app.goto();

      await app.fillArray('1,2,3');
      await app.setWindowSize(null); // leave window input empty
      await app.clickRun();

      // No error message expected and no windows appended
      const containerText1 = await app.getResultContainerText();
      expect(containerText).toBe(''); // empty string expected

      const windowCount4 = await app.getWindowCount();
      expect(windowCount).toBe(0);
    });
  });
});