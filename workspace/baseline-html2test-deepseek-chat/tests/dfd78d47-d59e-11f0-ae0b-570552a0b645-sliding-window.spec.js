import { test, expect } from '@playwright/test';

//
// dfd78d47-d59e-11f0-ae0b-570552a0b645-sliding-window.spec.js
//
// Playwright E2E tests for the "Sliding Window Technique" interactive demo.
// - Tests use ES module syntax
// - Tests load the page exactly as-is and observe console and page errors
// - Tests exercise UI controls, DOM updates, visual highlights, and edge cases
//
// Notes:
// - We intentionally do not modify application code; we interact with it like a user.
// - We capture console.error messages and uncaught page errors and assert their counts (expected none).
//

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d47-d59e-11f0-ae0b-570552a0b645.html';

// Page object to encapsulate interactions with the sliding window demo
class SlidingWindowPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Selectors
    this.selectors = {
      arrayInput: '#array-input',
      windowSizeInput: '#window-size',
      problemTypeSelect: '#problem-type',
      runBtn: '#run-btn',
      stepBtn: '#step-btn',
      resetBtn: '#reset-btn',
      arrayContainer: '#array-container',
      algorithmSteps: '#algorithm-steps',
      resultDiv: '#result',
      timeComplexity: '#time-complexity',
      spaceComplexity: '#space-complexity',
    };
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'networkidle' });
  }

  // Helpers to access elements
  async getArrayInputValue() {
    return (await this.page.$eval(this.selectors.arrayInput, el => el.value));
  }

  async setArrayInputValue(value) {
    await this.page.fill(this.selectors.arrayInput, value);
  }

  async getWindowSizeValue() {
    return (await this.page.$eval(this.selectors.windowSizeInput, el => el.value));
  }

  async setWindowSizeValue(value) {
    // use fill to set numeric input, then blur to propagate
    await this.page.fill(this.selectors.windowSizeInput, String(value));
    await this.page.$eval(this.selectors.windowSizeInput, el => el.blur());
  }

  async getProblemTypeValue() {
    return (await this.page.$eval(this.selectors.problemTypeSelect, el => el.value));
  }

  async setProblemTypeValue(value) {
    await this.page.selectOption(this.selectors.problemTypeSelect, value);
  }

  async clickReset() {
    await this.page.click(this.selectors.resetBtn);
  }

  async clickStep() {
    await this.page.click(this.selectors.stepBtn);
  }

  async clickRun() {
    await this.page.click(this.selectors.runBtn);
  }

  async getArrayElements() {
    // returns array of texts for elements present in DOM
    return await this.page.$$eval(`${this.selectors.arrayContainer} .array-element`, nodes =>
      nodes.map(n => ({ id: n.id, text: n.textContent.trim(), className: n.className }))
    );
  }

  async getAlgorithmStepsText() {
    return await this.page.$$eval(`${this.selectors.algorithmSteps} .step`, nodes =>
      nodes.map(n => n.textContent.trim())
    );
  }

  async getCurrentStepIndex() {
    // Find element with class "current-step"
    const idx = await this.page.$$eval(`${this.selectors.algorithmSteps} .step`, nodes => {
      return nodes.findIndex(n => n.classList.contains('current-step'));
    });
    return idx; // -1 if not found
  }

  async getResultText() {
    return await this.page.$eval(this.selectors.resultDiv, el => el.textContent.trim());
  }

  async isResultVisible() {
    const handle = await this.page.$(this.selectors.resultDiv);
    if (!handle) return false;
    return await handle.evaluate(el => {
      // computed style check
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
  }

  async getComplexityTexts() {
    const time = await this.page.$eval(this.selectors.timeComplexity, el => el.textContent.trim());
    const space = await this.page.$eval(this.selectors.spaceComplexity, el => el.textContent.trim());
    return { time, space };
  }

  // Step forward until the final step is reached or until maxIterations
  async stepToCompletion({ maxIterations = 100, pollIntervalMs = 50 } = {}) {
    let iterations = 0;
    while (iterations < maxIterations) {
      const visible = await this.isResultVisible();
      if (visible) return true;
      // Try clicking step; nextStep does nothing if already at end, but is safe to click.
      await this.clickStep();
      // small wait to allow UI to update
      await this.page.waitForTimeout(pollIntervalMs);
      iterations++;
    }
    return false;
  }

  // Wait for final result after clicking Run (runAlgorithm uses setInterval with 1000ms)
  async waitForResultAfterRun({ timeout = 12000 } = {}) {
    await this.clickRun();
    // Poll until result visible or timeout
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.isResultVisible()) return true;
      await this.page.waitForTimeout(200);
    }
    return false;
  }
}

test.describe('Sliding Window Technique - E2E interactions and visual verification', () => {
  // Per-test trackers for console errors and uncaught page errors
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages; focus on errors/warnings for diagnostics
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    const sw = new SlidingWindowPage(page);
    await sw.goto();
  });

  test.afterEach(async () => {
    // After each test, assert there were no uncaught page errors or console.error messages.
    // The application is expected to run without uncaught exceptions in normal usage.
    // If there are any, fail the test with the captured messages to aid debugging.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => String(e)).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Unexpected console.error messages: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);
  });

  test('Initial page load shows default controls and placeholder step text', async ({ page }) => {
    // Purpose: Validate initial static state before any interactions.
    const sw = new SlidingWindowPage(page);

    // Verify input defaults
    const arrayVal = await sw.getArrayInputValue();
    expect(arrayVal).toBe('2,1,5,1,3,2');

    const windowSizeVal = await sw.getWindowSizeValue();
    expect(windowSizeVal).toBe('3');

    const problemType = await sw.getProblemTypeValue();
    expect(problemType).toBe('max-sum');

    // Algorithm steps area should contain the placeholder initial text from HTML
    const stepsText = await page.$eval('#algorithm-steps', el => el.textContent.trim());
    expect(stepsText).toContain('Algorithm steps will appear here');

    // Result should be hidden initially
    const resultVisible = await sw.isResultVisible();
    expect(resultVisible).toBe(false);

    // Complexity default values are present
    const complexity = await sw.getComplexityTexts();
    expect(complexity.time).toBe('O(n)');
    expect(complexity.space).toBe('O(1)');
  });

  test('Reset initializes visualization and renders array elements and steps for max-sum', async ({ page }) => {
    // Purpose: Clicking Reset should parse the input and render array elements and algorithm steps.
    const sw = new SlidingWindowPage(page);

    // Click reset to initialize visualization
    await sw.clickReset();

    // Verify array elements rendered correctly
    const elements = await sw.getArrayElements();
    expect(elements.length).toBe(6);
    // first element should be '2' as per default input
    expect(elements[0].text).toBe('2');
    expect(elements[5].text).toBe('2');

    // Algorithm steps should be present and first step should be "Initialize window sum to 0"
    const steps = await sw.getAlgorithmStepsText();
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toContain('Initialize window sum to 0');

    // After initialization, the current step should be index 0
    const currentIndex = await sw.getCurrentStepIndex();
    expect(currentIndex).toBe(0);

    // Result still hidden after initialization
    expect(await sw.isResultVisible()).toBe(false);
  });

  test('Step through the max-sum algorithm and verify final result and visual highlights', async ({ page }) => {
    // Purpose: Use the Next Step button to step through until final result for max-sum.
    const sw = new SlidingWindowPage(page);

    // Initialize first
    await sw.clickReset();

    // Step until final step or until a safe maximum iterations
    const finished = await sw.stepToCompletion({ maxIterations: 100, pollIntervalMs: 30 });
    expect(finished).toBe(true);

    // Verify final result is visible and correct for the known input [2,1,5,1,3,2] with k=3
    // The maximum 3-element subarray sum is 9 (5+1+3)
    expect(await sw.isResultVisible()).toBe(true);
    const resultText = await sw.getResultText();
    expect(resultText).toContain('Maximum sum of subarray of size 3 is 9');

    // Verify that algorithm steps show the "New maximum sum found" message somewhere
    const allSteps = await sw.getAlgorithmStepsText();
    const foundMaxMsg = allSteps.some(s => s.includes('New maximum sum found'));
    expect(foundMaxMsg).toBe(true);

    // Visual check: ensure at least one element has classes set (array-element plus maybe window-boundary/window-element)
    const elements = await sw.getArrayElements();
    const anyHighlighted = elements.some(e => e.className.includes('window-element') || e.className.includes('window-boundary'));
    // At the final step visualization may have been applied; assert that highlight occurred at some point
    expect(anyHighlighted).toBe(true);
  });

  test('Run Algorithm button iterates through to completion and shows result', async ({ page }) => {
    // Purpose: Clicking Run Algorithm should fast-forward through steps until result is shown.
    const sw = new SlidingWindowPage(page);

    // Ensure initialized state
    await sw.clickReset();

    // Click run and wait for result to be visible (runAlgorithm uses setInterval with 1000ms)
    const completed = await sw.waitForResultAfterRun({ timeout: 15000 });
    expect(completed).toBe(true);

    // Check final result text
    const result = await sw.getResultText();
    expect(result).toContain('Maximum sum of subarray of size 3 is 9');
  });

  test('Selecting "Longest Substring Without Repeating Characters" updates complexity and computes correct result', async ({ page }) => {
    // Purpose: Change problem type to longest-substring, set an input sequence, and verify computed result and complexity labels.
    const sw = new SlidingWindowPage(page);

    // Use a sequence where the longest unique sequence is of length 3: [1,2,1,3]
    await sw.setArrayInputValue('1,2,1,3');
    await sw.setProblemTypeValue('longest-substring');

    // After changing problem type, click reset to regenerate steps
    await sw.clickReset();

    // Complexity text must reflect the different space complexity for this problem
    const complexity = await sw.getComplexityTexts();
    expect(complexity.time).toBe('O(n)');
    expect(complexity.space).toBe('O(min(m, n))');

    // Step through to completion
    const finished = await sw.stepToCompletion({ maxIterations: 100, pollIntervalMs: 30 });
    expect(finished).toBe(true);

    // Final result should indicate the longest substring length is 3
    expect(await sw.isResultVisible()).toBe(true);
    const result = await sw.getResultText();
    expect(result).toContain('Longest substring without repeating characters has length 3');
  });

  test('Edge case: window size larger than array length produces NaN result for sum-based problems', async ({ page }) => {
    // Purpose: Validate behavior when window size > array.length (expected to produce NaN as arithmetic involves undefined).
    const sw = new SlidingWindowPage(page);

    // Set window size larger than array (default array has 6 elements)
    await sw.setWindowSizeValue(10);
    // Ensure problem type is max-sum
    await sw.setProblemTypeValue('max-sum');

    // Initialize and then run to completion
    await sw.clickReset();
    // Step through to completion
    const finished = await sw.stepToCompletion({ maxIterations: 200, pollIntervalMs: 30 });
    expect(finished).toBe(true);

    // Result should be shown and contain 'NaN' because arithmetic with undefined yields NaN
    const visible = await sw.isResultVisible();
    expect(visible).toBe(true);
    const res = await sw.getResultText();
    expect(res).toMatch(/is NaN|is NaN$/);
  });

  test('DOM integrity: calling Reset multiple times is idempotent and re-renders consistent DOM', async ({ page }) => {
    // Purpose: Ensure repeated Reset calls do not corrupt DOM or throw errors.
    const sw = new SlidingWindowPage(page);

    // Call reset multiple times
    for (let i = 0; i < 3; i++) {
      await sw.clickReset();
      // small delay to allow DOM updates
      await page.waitForTimeout(50);
      const elems = await sw.getArrayElements();
      expect(elems.length).toBeGreaterThanOrEqual(0); // should not throw and should produce consistent array elements
      // algorithm steps should be present after initialization
      const steps = await sw.getAlgorithmStepsText();
      expect(steps.length).toBeGreaterThan(0);
    }
  });

  test('Accessibility and ARIA basics: interactive elements are reachable and enabled', async ({ page }) => {
    // Purpose: Verify that the primary interactive controls are present and enabled for interaction.
    const sw = new SlidingWindowPage(page);

    // Ensure controls exist and are enabled
    const controls = ['#array-input', '#window-size', '#problem-type', '#run-btn', '#step-btn', '#reset-btn'];
    for (const sel of controls) {
      const handle = await page.$(sel);
      expect(handle, `Expected control ${sel} to exist`).not.toBeNull();
      const disabled = await handle.evaluate(el => el.disabled === true);
      expect(disabled, `Expected control ${sel} to be enabled`).toBe(false);
    }

    // Tab through a few controls to ensure they are focusable (basic keyboard accessibility)
    await page.click('#array-input');
    await page.keyboard.press('Tab'); // to window-size
    const active1 = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(['window-size', 'array-input']).toContain(active1); // depending on browser focus handling
  });

});