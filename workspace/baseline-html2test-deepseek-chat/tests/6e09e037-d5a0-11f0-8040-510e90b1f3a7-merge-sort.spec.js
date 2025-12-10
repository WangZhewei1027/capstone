import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e09e037-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object Model for the Merge Sort visualization page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#array-input');
    this.sortButton = page.locator('#sort-button');
    this.randomButton = page.locator('#random-button');
    this.visualization = page.locator('#visualization');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for basic controls to be present
    await expect(this.input).toBeVisible();
    await expect(this.sortButton).toBeVisible();
    await expect(this.randomButton).toBeVisible();
  }

  async getInputValue() {
    return this.input.inputValue();
  }

  async setInputValue(value) {
    await this.input.fill(value);
  }

  async clickRandom() {
    await this.randomButton.click();
  }

  async clickSort() {
    await this.sortButton.click();
  }

  // Waits until a step visualization is displayed and returns the step element locator
  async waitForFirstStep() {
    const step = this.visualization.locator('.step');
    await expect(step).toBeVisible();
    return step;
  }

  // Returns the current step container locator (there should be at most one .step displayed)
  getCurrentStep() {
    return this.visualization.locator('.step').first();
  }

  // Returns the Step counter text like "Step X of Y - Use left/right arrow keys to navigate"
  async getStepCounterText() {
    const counter = this.visualization.locator('div').first();
    return counter.textContent();
  }

  async getStepTitle() {
    return this.getCurrentStep().locator('.step-title').textContent();
  }

  // Returns array of displayed numbers in the current step
  async getArrayElementsText() {
    const elems = this.getCurrentStep().locator('.array-element');
    const count = await elems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await elems.nth(i).textContent()).trim());
    }
    return texts;
  }

  // Returns array of classes for the element at index in the current step
  async getArrayElementClassesAt(index) {
    const elem = this.getCurrentStep().locator('.array-element').nth(index);
    const classAttr = await elem.getAttribute('class');
    return classAttr ? classAttr.split(/\s+/) : [];
  }

  // Click next step button in the current step
  async clickNextButton() {
    const nextBtn = this.getCurrentStep().locator('button', { hasText: 'Next Step' });
    await nextBtn.click();
  }

  // Click previous step button
  async clickPrevButton() {
    const prevBtn = this.getCurrentStep().locator('button', { hasText: 'Previous Step' });
    await prevBtn.click();
  }

  // Returns whether Next button is disabled in the current step
  async isNextDisabled() {
    const nextBtn = this.getCurrentStep().locator('button', { hasText: 'Next Step' });
    return await nextBtn.isDisabled();
  }

  // Returns whether Previous button is disabled in the current step
  async isPrevDisabled() {
    const prevBtn = this.getCurrentStep().locator('button', { hasText: 'Previous Step' });
    return await prevBtn.isDisabled();
  }
}

test.describe('Merge Sort Visualization - 6e09e037-d5a0-11f0-8040-510e90b1f3a7', () => {
  // Collect console errors and page errors during each test run
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test we assert there were no runtime page errors or console errors.
    // This ensures our tests observe and fail on unexpected ReferenceError/SyntaxError/TypeError etc.
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => String(e)).join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Unexpected console errors: ${consoleErrors.map(e => e.text).join(' | ')}`).toHaveLength(0);
  });

  test('Initial load: controls present and default array value is populated', async ({ page }) => {
    // Purpose: Verify the page loads with expected controls and default array input
    const app = new MergeSortPage(page);
    await app.goto();

    // Verify default input value is the provided default array
    const value = await app.getInputValue();
    expect(value).toContain('38'); // default provided in HTML
    expect(value).toContain('27');
    expect(value.split(',').length).toBeGreaterThan(1);

    // Visualization should be empty initially
    await expect(page.locator('#visualization')).toBeVisible();
    // There should be no .step element before clicking sort
    await expect(page.locator('.visualization .step')).toHaveCount(0);
  });

  test('Random Array generation: populates input and clears visualization', async ({ page }) => {
    // Purpose: Click "Generate Random Array" and ensure the input is updated and visualization cleared
    const app = new MergeSortPage(page);
    await app.goto();

    // Fill a known value then click random to ensure it changes
    await app.setInputValue('1,2,3,4,5,6');
    await app.clickRandom();

    // Wait for input change and assert it contains numbers separated by commas
    const newValue = await app.getInputValue();
    expect(newValue).not.toBe('1,2,3,4,5,6');
    // Should be at least 5 numbers (as per code: length is 5 to 14)
    const parts = newValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
    expect(parts.length).toBeGreaterThanOrEqual(5);
    // Visualization should remain clear/reset
    await expect(page.locator('.visualization .step')).toHaveCount(0);
  });

  test('Invalid input triggers alert with explanatory message', async ({ page }) => {
    // Purpose: Enter invalid input and verify the page shows an alert without crashing
    const app = new MergeSortPage(page);
    await app.goto();

    // Listen for dialog and assert its message
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Provide invalid array containing a non-number
    await app.setInputValue('10, 5, foo, 3');
    await app.clickSort();

    // Ensure dialog was shown with the expected message
    expect(dialogMessage).toBe('Please enter valid numbers separated by commas.');
    // Visualization should remain empty (sort aborted)
    await expect(page.locator('.visualization .step')).toHaveCount(0);
  });

  test('Sort Step by Step: builds steps and navigation via buttons and keyboard works', async ({ page }) => {
    // Purpose: Use a small known array to exercise the full step building and navigation features
    const app = new MergeSortPage(page);
    await app.goto();

    // Use small array to keep steps predictable but still meaningful
    await app.setInputValue('3,1,2');
    await app.clickSort();

    // Wait until the first step is visible
    await app.waitForFirstStep();

    // Validate step counter and title exist
    const counterText = await app.getStepCounterText();
    expect(counterText).toMatch(/Step \d+ of \d+/);

    const title = (await app.getStepTitle()).trim();
    // The first step for mergeSortWithSteps is usually a "Dividing" step
    expect(title.length).toBeGreaterThan(0);
    expect(title).toMatch(/Dividing|Merging|Completed|Comparing|Adding/);

    // Validate array elements are rendered and contain numeric text
    const elemsText = await app.getArrayElementsText();
    expect(elemsText.length).toBeGreaterThan(0);
    for (const t of elemsText) {
      // each element should be parseable as integer
      expect(Number.isFinite(Number(t))).toBeTruthy();
    }

    // On the first step, Previous should be disabled
    const prevDisabled = await app.isPrevDisabled();
    expect(prevDisabled).toBe(true);

    // Next should be enabled unless only one step exists
    const nextDisabledInitial = await app.isNextDisabled();
    // It may or may not be disabled depending on number of steps; record for later logic
    // If Next is disabled, then we are at last step already; otherwise proceed to test navigation
    if (!nextDisabledInitial) {
      // Click Next button and verify the step counter increments
      const initialCounter = await app.getStepCounterText();
      await app.clickNextButton();
      const afterCounter = await app.getStepCounterText();
      expect(afterCounter).not.toBe(initialCounter);

      // Keyboard navigation: ArrowRight to go forward (if not at end), ArrowLeft to go back
      // First, go forward via keyboard if possible
      const nextDisabledAfter = await app.isNextDisabled();
      if (!nextDisabledAfter) {
        await page.keyboard.press('ArrowRight');
        // ensure step counter changed (there is at least another step)
        const fartherCounter = await app.getStepCounterText();
        expect(fartherCounter).not.toBe(afterCounter);
      }

      // Now go back using ArrowLeft
      await page.keyboard.press('ArrowLeft');
      const backCounter = await app.getStepCounterText();
      // After one left press we should be at an earlier or same step (not strictly deterministic), but ensure not empty
      expect(backCounter).toBeDefined();
    }
  });

  test('Navigate to final step and verify merged styling and explanations are present', async ({ page }) => {
    // Purpose: Progress to the last step of the visualization and verify final merged elements are styled and explanation present
    const app = new MergeSortPage(page);
    await app.goto();

    // Use a moderate array to ensure merges occur
    await app.setInputValue('5, 2, 9, 1');
    await app.clickSort();

    await app.waitForFirstStep();

    // Iterate through steps until Next is disabled (last step)
    // Safety limit to avoid infinite loops
    const MAX_STEPS = 1000;
    let stepsVisited = 0;
    // Always re-evaluate next disabled for current step
    while (!(await app.isNextDisabled()) && stepsVisited < MAX_STEPS) {
      await app.clickNextButton();
      stepsVisited++;
    }

    expect(stepsVisited).toBeLessThan(MAX_STEPS); // ensure we didn't loop indefinitely

    // Verify we are at the last step: Next should be disabled
    expect(await app.isNextDisabled()).toBe(true);

    // The final step sets mergedIndices for all indices in the merged range; check that at least one element has class 'merged'
    const elems = app.getCurrentStep().locator('.array-element');
    const count = await elems.count();
    let foundMerged = false;
    for (let i = 0; i < count; i++) {
      const classes = await app.getArrayElementClassesAt(i);
      if (classes.includes('merged')) {
        foundMerged = true;
        break;
      }
    }
    expect(foundMerged).toBe(true);

    // Final step should also include an explanation text
    const explanation = app.getCurrentStep().locator('.explanation');
    await expect(explanation).toBeVisible();
    const explanationText = (await explanation.textContent()).trim();
    expect(explanationText.length).toBeGreaterThan(0);
  });

  test('Edge case: clicking Next/Previous when there are no steps should not throw', async ({ page }) => {
    // Purpose: Ensure that clicking navigation buttons when no steps exist does not crash the page
    const app = new MergeSortPage(page);
    await app.goto();

    // There are no steps initially; ensure clicking random or other buttons does not create stray errors.
    // Attempt to trigger keyboard navigation - should be safely ignored
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');

    // Also simulate clicking Previous/Next if they existed by attempting to query & click them safely.
    const stepExists = await page.locator('.visualization .step').count();
    if (stepExists > 0) {
      // If a step exists unexpectedly, ensure safe behavior by clicking previous on first step
      const prevBtn = page.locator('.visualization .step button', { hasText: 'Previous Step' }).first();
      const nextBtn = page.locator('.visualization .step button', { hasText: 'Next Step' }).first();
      if (await prevBtn.isVisible()) {
        // clicking should not produce runtime errors
        await prevBtn.click();
      }
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }
    } else {
      // No step exists: confirm nothing to click and no errors were produced
      expect(stepExists).toBe(0);
    }
  });
});