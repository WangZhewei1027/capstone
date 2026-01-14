import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76632-d59e-11f0-ae0b-570552a0b645.html';

// Page object model for the Selection Sort page
class SelectionSortPage {
  constructor(page) {
    this.page = page;
    this.generateBtn = page.locator('#generateBtn');
    this.sortBtn = page.locator('#sortBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.arrayContainer = page.locator('#arrayContainer');
    this.stepInfo = page.locator('#stepInfo');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click controls
  async clickGenerate() {
    await this.generateBtn.click();
  }
  async clickStart() {
    await this.sortBtn.click();
  }
  async clickNext() {
    await this.stepBtn.click();
  }
  async clickReset() {
    await this.resetBtn.click();
  }

  // Query helpers
  async getStepInfoText() {
    return (await this.stepInfo.textContent())?.trim() ?? '';
  }

  async getArrayElements() {
    return this.arrayContainer.locator('.array-element');
  }

  async getArrayValues() {
    const nodes = this.arrayContainer.locator('.array-element');
    const count = await nodes.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await nodes.nth(i).textContent())?.trim() ?? '');
    }
    return values.map(v => Number(v));
  }

  async getElementClassList(index) {
    const el = this.page.locator(`#element-${index}`);
    const exists = await el.count();
    if (!exists) return [];
    const classAttr = await el.getAttribute('class');
    return (classAttr || '').split(/\s+/).filter(Boolean);
  }

  async countElementsWithClass(className) {
    return this.arrayContainer.locator(`.array-element.${className}`).count();
  }

  async isButtonDisabled(buttonLocator) {
    return await buttonLocator.getAttribute('disabled') !== null;
  }

  // Step through until sorting is complete (or until max steps to prevent infinite loops)
  async stepToCompletion(maxSteps = 1000) {
    let steps = 0;
    // After starting, stepBtn should be enabled and we proceed by clicking it until disabled
    while (steps < maxSteps) {
      const stepBtnDisabled = await this.isButtonDisabled(this.stepBtn);
      if (stepBtnDisabled) break;
      await this.clickNext();
      steps++;
      // small pause to allow DOM updates (the app updates synchronously, so this is minimal)
      await this.page.waitForTimeout(10);
    }
    return steps;
  }
}

test.describe('Selection Sort Visualization - dfd76632-d59e-11f0-ae0b-570552a0b645', () => {
  // Capture console errors and page errors for each test so we can assert on them
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Collect unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default state: array rendered, controls present, no runtime errors
  test('Initial load: array is rendered, controls present, and default step info shown', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Verify default step info text
    const stepText = await app.getStepInfoText();
    expect(stepText).toBe('Click "Start Sorting" to begin');

    // Verify there are 8 array elements rendered by default
    const elements = await app.getArrayElements();
    expect(await elements.count()).toBe(8);

    // Verify all main controls are visible and enabled by default (generate, start, step, reset)
    await expect(app.generateBtn).toBeVisible();
    await expect(app.generateBtn).toBeEnabled();
    await expect(app.sortBtn).toBeVisible();
    await expect(app.sortBtn).toBeEnabled();
    await expect(app.stepBtn).toBeVisible();
    await expect(app.stepBtn).toBeEnabled();
    await expect(app.resetBtn).toBeVisible();
    await expect(app.resetBtn).toBeEnabled();

    // Ensure there are no console errors or unhandled page errors on initial load
    expect(consoleErrors, `Console errors found: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page errors found: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  // Test generating a new array resets state and produces 8 elements
  test('Generate New Array: resets state and renders new array of 8 elements', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    const beforeValues = await app.getArrayValues();

    // Click generate to produce a new random array
    await app.clickGenerate();

    // After generating, stepInfo should be reset to default text
    const stepText = await app.getStepInfoText();
    expect(stepText).toBe('Click "Start Sorting" to begin');

    // There should still be 8 elements visible
    const elements = await app.getArrayElements();
    expect(await elements.count()).toBe(8);

    const afterValues = await app.getArrayValues();

    // It's possible (though unlikely) that the random array is identical; ensure at least structure is correct
    expect(Array.isArray(afterValues)).toBe(true);
    expect(afterValues.length).toBe(8);

    // If arrays differ, assert at least one value changed (non-flaky expectation)
    const arraysDiffer = beforeValues.some((v, i) => v !== afterValues[i]);
    if (beforeValues.length === afterValues.length && arraysDiffer) {
      expect(afterValues).not.toEqual(beforeValues);
    } else {
      // If they happened to be the same, still assert the UI was reset and there were no errors
      expect(stepText).toBe('Click "Start Sorting" to begin');
    }

    // No console or page errors should have occurred during generate
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Test the step-by-step sorting flow and final sorted result
  test('Start Sorting and step through all steps to completion; final array should be sorted', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Start sorting: this generates steps and advances to first step automatically
    await app.clickStart();

    // After clicking start, the sort button should be disabled while sorting is active
    expect(await app.isButtonDisabled(app.sortBtn)).toBe(true);

    // The stepInfo should reflect that we are on a specific Step X/Y
    let stepInfo = await app.getStepInfoText();
    expect(stepInfo.startsWith('Step ')).toBe(true);

    // Iterate through steps until completion, observing visual changes for certain actions
    // We'll click Next Step repeatedly and assert known behavior for 'New minimum' and 'Swapping' steps
    const maxIterations = 1000;
    let iterations = 0;
    let sawSwap = false;
    let sawNewMin = false;

    // Continue until step button becomes disabled (which indicates complete) or max iterations reached
    while (iterations < maxIterations) {
      stepInfo = await app.getStepInfoText();

      // If this step mentions a new minimum, ensure an element has the current-min class and the text in the stepInfo matches it
      if (stepInfo.includes('New minimum found')) {
        sawNewMin = true;
        const countCurrentMin = await app.countElementsWithClass('current-min');
        expect(Number(countCurrentMin)).toBeGreaterThan(0);
        // Extract the numeric value mentioned in the info string (e.g., "New minimum found: 12 at position 3")
        const match = stepInfo.match(/New minimum found:\s*([0-9-]+)/);
        if (match) {
          const minValueMentioned = Number(match[1]);
          // Find the element that has class current-min and check its text
          const currentMinEls = app.arrayContainer.locator('.array-element.current-min');
          const curCount = await currentMinEls.count();
          if (curCount > 0) {
            const text = (await currentMinEls.nth(0).textContent())?.trim();
            expect(Number(text)).toBe(minValueMentioned);
          }
        }
      }

      // If this step mentions a swap, ensure at least two elements are highlighted with comparing class
      if (stepInfo.includes('Swapping')) {
        sawSwap = true;
        const comparingCount = await app.countElementsWithClass('comparing');
        // On swap step the implementation marks both swapped elements as 'comparing'
        expect(Number(comparingCount)).toBeGreaterThanOrEqual(2);
      }

      // If complete, break loop
      if (stepInfo.includes('Sorting complete!')) {
        break;
      }

      // Click next step and allow the DOM to update
      await app.clickNext();
      await page.waitForTimeout(10);
      iterations++;
    }

    // After stepping through, step button should be disabled (sorting done)
    expect(await app.isButtonDisabled(app.stepBtn)).toBe(true);

    // sort button should be enabled again after completion
    expect(await app.isButtonDisabled(app.sortBtn)).toBe(false);

    // The array values in the DOM should now be fully sorted in ascending order
    const finalValues = await app.getArrayValues();
    const sortedCopy = [...finalValues].sort((a, b) => a - b);
    expect(finalValues).toEqual(sortedCopy);

    // Ensure we observed at least one 'new-min' or 'swap' action during the stepping process (typical for non-sorted arrays)
    expect(sawNewMin || sawSwap).toBe(true);

    // No console or page errors during full sorting process
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  }, { timeout: 120000 }); // allow extended timeout for many steps

  // Test reset behavior: reset should clear highlights and restore default step info
  test('Reset during sorting clears highlights and returns UI to default state', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Start sorting and perform a couple of steps to create highlights
    await app.clickStart();
    await app.clickNext();
    await app.clickNext();

    // At least one of the highlight classes should be present (current-min, comparing, or sorted)
    const anyHighlighted = (await app.countElementsWithClass('current-min')) > 0
      || (await app.countElementsWithClass('comparing')) > 0
      || (await app.countElementsWithClass('sorted')) > 0;

    expect(anyHighlighted).toBe(true);

    // Now click reset and verify highlights are cleared and step info is default
    await app.clickReset();

    const stepTextAfterReset = await app.getStepInfoText();
    expect(stepTextAfterReset).toBe('Click "Start Sorting" to begin');

    // Ensure no elements have highlight classes
    expect(await app.countElementsWithClass('current-min')).toBe(0);
    expect(await app.countElementsWithClass('comparing')).toBe(0);
    // 'sorted' may not be present often, but ensure it's not present right after reset
    expect(await app.countElementsWithClass('sorted')).toBe(0);

    // Controls should be enabled again
    expect(await app.isButtonDisabled(app.sortBtn)).toBe(false);
    expect(await app.isButtonDisabled(app.stepBtn)).toBe(false);

    // No console or page errors during reset
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  // Final sanity check test that explicitly asserts that there were no uncaught runtime errors during a fresh load
  test('No runtime console or page errors on fresh load', async ({ page }) => {
    const app = new SelectionSortPage(page);
    await app.goto();

    // Confirm page rendered
    await expect(app.arrayContainer).toBeVisible();

    // Explicitly assert that both captured console and page errors are empty
    expect(consoleErrors, `Console errors: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page errors: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });
});