import { test, expect } from '@playwright/test';

// Page object to encapsulate interactions with the Counting Sort visualization page
class CountingSortPage {
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0741-d5a0-11f0-8040-510e90b1f3a7.html';
    this.selectors = {
      arrayInput: '#array-input',
      generateRandomBtn: '#generate-random',
      sortButton: '#sort-button',
      resetButton: '#reset-button',
      originalArray: '#original-array',
      countArray: '#count-array',
      sortedArray: '#sorted-array',
      stepInfo: '#step-info',
      stepInfoEntries: '#step-info .step-info'
    };
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async setupErrorCollectors() {
    // Collect console error messages and uncaught page errors for assertions.
    const consoleErrors = [];
    const pageErrors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    this.page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    return { consoleErrors, pageErrors };
  }

  async getInputValue() {
    return (await this.page.locator(this.selectors.arrayInput).inputValue()).trim();
  }

  async clickGenerateRandom() {
    await this.page.click(this.selectors.generateRandomBtn);
  }

  async clickSort() {
    await this.page.click(this.selectors.sortButton);
  }

  async clickReset() {
    await this.page.click(this.selectors.resetButton);
  }

  async changeInputValue(value) {
    const input = this.page.locator(this.selectors.arrayInput);
    await input.fill(value);
    // The app listens to 'change' event; dispatch it by blurring the input (or by evaluation)
    await input.evaluate((el) => el.dispatchEvent(new Event('change')));
  }

  // Returns an array of numbers displayed in the original array display
  async getOriginalArrayValues() {
    return await this.page.$$eval(`${this.selectors.originalArray} .array-element`, elems => elems.map(e => e.textContent.trim()));
  }

  // Returns an array of texts in the sorted array display (could contain '?' during sorting)
  async getSortedArrayValues() {
    return await this.page.$$eval(`${this.selectors.sortedArray} .array-element`, elems => elems.map(e => e.textContent.trim()));
  }

  // Returns the numeric values from the count array table (as strings)
  async getCountArrayValues() {
    // value row is the second <tr> in the table under #count-array
    return await this.page.$$eval(`${this.selectors.countArray} table tr:nth-child(2) td`, tds => tds.map(td => td.textContent.trim()));
  }

  async getStepTexts() {
    return await this.page.$$eval(this.selectors.stepInfoEntries, nodes => nodes.map(n => n.textContent.trim()));
  }

  // Wait until a step appears containing the given text
  async waitForStepText(text, timeout = 60000) {
    await this.page.waitForFunction(
      (sel, txt) => {
        const container = document.querySelector(sel);
        if (!container) return false;
        return Array.from(container.querySelectorAll('.step-info')).some(n => n.textContent.includes(txt));
      },
      this.selectors.stepInfo,
      text,
      { timeout }
    );
  }

  // Helper to get the count of elements in original array display
  async getOriginalArrayCount() {
    return await this.page.$$eval(`${this.selectors.originalArray} .array-element`, elems => elems.length);
  }

  async getSortedArrayCount() {
    return await this.page.$$eval(`${this.selectors.sortedArray} .array-element`, elems => elems.length);
  }
}

test.describe('Counting Sort Visualization - Application Tests', () => {
  // Test: initial page load and default state
  test('Initial load displays default array and UI elements correctly', async ({ page }) => {
    const app = new CountingSortPage(page);
    const { consoleErrors, pageErrors } = await app.setupErrorCollectors();

    await app.goto();

    // Verify input contains the default sample array value
    const inputValue = await app.getInputValue();
    expect(inputValue).toBe('4,2,2,8,3,3,1');

    // Verify the original array display was built from the input and number of elements matches
    const originalValues = await app.getOriginalArrayValues();
    expect(originalValues).toEqual(['4','2','2','8','3','3','1']);
    expect(await app.getOriginalArrayCount()).toBe(7);

    // Count array area should include the header but initial table should be minimal (constructed via displayOriginalArray)
    const countAreaExists = await page.isVisible('#count-array h3');
    expect(countAreaExists).toBeTruthy();

    // Sorted array should be empty on initial load
    expect(await app.getSortedArrayCount()).toBe(0);

    // No step info entries at initial load
    const steps = await app.getStepTexts();
    expect(steps.length).toBe(0);

    // Assert that no console errors or page errors occurred during load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test: Generate Random Array updates input and original array display
  test('Generate Random Array updates the input value and original array display', async ({ page }) => {
    const app = new CountingSortPage(page);
    const { consoleErrors, pageErrors } = await app.setupErrorCollectors();

    await app.goto();

    const beforeValue = await app.getInputValue();
    await app.clickGenerateRandom();

    // After clicking generate, input should change to new CSV of numbers
    const afterValue = await app.getInputValue();
    expect(afterValue).not.toBe(beforeValue);

    // Ensure the input contains at least one comma or single number and extracts to numeric elements
    const originalValues = await app.getOriginalArrayValues();
    expect(originalValues.length).toBeGreaterThan(0);

    // All original display children should be numeric strings
    for (const v of originalValues) {
      expect(v).toMatch(/^\d+$/);
    }

    // No console or uncaught page errors should have occurred during generation
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test: Reset button resets the visualization display without changing the input
  test('Reset button clears outputs and re-displays original array from input', async ({ page }) => {
    const app = new CountingSortPage(page);
    const { consoleErrors, pageErrors } = await app.setupErrorCollectors();

    await app.goto();

    // Change the input to a custom value and dispatch change
    await app.changeInputValue('5,1,9');
    const inputVal = await app.getInputValue();
    expect(inputVal).toBe('5,1,9');

    // DisplayOriginalArray should have shown these values
    let originalValues = await app.getOriginalArrayValues();
    expect(originalValues).toEqual(['5','1','9']);

    // Mutate the DOM by clicking generate random to ensure reset later restores from input
    await app.clickGenerateRandom();
    const mutatedVals = await app.getOriginalArrayValues();
    expect(mutatedVals.length).toBeGreaterThanOrEqual(1);

    // Click reset - in implementation reset calls displayOriginalArray which uses the input value
    await app.clickReset();

    // After reset the original array should match the explicit input of '5,1,9'
    originalValues = await app.getOriginalArrayValues();
    expect(originalValues).toEqual(['5','1','9']);

    // Sorted and step areas should be cleared after reset
    const sortedCount = await app.getSortedArrayCount();
    expect(sortedCount).toBe(0);
    const steps = await app.getStepTexts();
    expect(steps.length).toBe(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test: Sorting process executes and results in a properly sorted output (this can be long; allow extra timeout)
  test('Sort button performs counting sort and produces a sorted array with steps', async ({ page }) => {
    test.setTimeout(60000); // allow up to 60s for the animation-driven sorting to finish

    const app = new CountingSortPage(page);
    const { consoleErrors, pageErrors } = await app.setupErrorCollectors();

    await app.goto();

    // Read the original numeric array to compute expected sorted result
    const originalStrings = await app.getOriginalArrayValues();
    const originalNumbers = originalStrings.map(s => Number(s));

    // Start sorting
    await app.clickSort();

    // Wait for the "Sorting completed!" step to appear
    await app.waitForStepText('Sorting completed!', 60000);

    // After completion, the sorted-array display should be fully populated
    const sortedDisplayTexts = await app.getSortedArrayValues();
    // Ensure count matches
    expect(sortedDisplayTexts.length).toBe(originalNumbers.length);

    // Convert display to numbers
    const displayedNumbers = sortedDisplayTexts.map(s => {
      // some browsers might include zero-width spaces; trim and parse
      const t = s.replace(/\s/g, '');
      return Number(t);
    });

    // Compute expected counting-sort result (stable sort of originalNumbers ascending)
    const expectedSorted = [...originalNumbers].sort((a, b) => a - b);

    expect(displayedNumbers).toEqual(expectedSorted);

    // The step info area should contain at least step entries for major steps
    const steps = await app.getStepTexts();
    // It should include messages for Step 1, Step 3, Step 4, Step 5 and "Sorting completed!"
    const hasStep1 = steps.some(s => s.includes('Step 1'));
    const hasStep3 = steps.some(s => s.includes('Step 3'));
    const hasStep4 = steps.some(s => s.includes('Step 4'));
    const hasStep5 = steps.some(s => s.includes('Step 5'));
    const hasCompleted = steps.some(s => s.includes('Sorting completed'));
    expect(hasStep1).toBeTruthy();
    expect(hasStep3).toBeTruthy();
    expect(hasStep4).toBeTruthy();
    expect(hasStep5).toBeTruthy();
    expect(hasCompleted).toBeTruthy();

    // Verify count array DOM exists and contains numeric cells (at least header + count row)
    const countCells = await app.getCountArrayValues();
    // First cell in that list is likely the 'Count' header cell which may be non-numeric; ensure rest are numeric
    if (countCells.length > 1) {
      for (let i = 1; i < countCells.length; i++) {
        expect(countCells[i]).toMatch(/^\d+$/);
      }
    }

    // No uncaught console or page errors occurred during the sorting run
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test: Edge case - non-numeric input values are filtered out; only numeric ones are displayed
  test('Non-numeric input values are ignored and do not cause runtime errors', async ({ page }) => {
    const app = new CountingSortPage(page);
    const { consoleErrors, pageErrors } = await app.setupErrorCollectors();

    await app.goto();

    // Provide a mixed input that includes non-numeric tokens and NaN-causing items
    await app.changeInputValue('a, ,3,foo,7,NaN,5');

    // displayOriginalArray filters out NaN values; expect only numeric tokens to appear
    const originalValues = await app.getOriginalArrayValues();
    // Should only show 3,7,5 in that order
    expect(originalValues).toEqual(['3','7','5']);

    // Attempt to sort this filtered array to ensure no exceptions occur
    await app.clickSort();

    // Wait for completion (smaller array, should finish quicker)
    await app.waitForStepText('Sorting completed!', 30000);

    // After completion, sorted display should show numeric sorted values
    const sortedDisplay = await app.getSortedArrayValues();
    const displayedNumbers = sortedDisplay.map(s => Number(s.replace(/\s/g,'')));
    expect(displayedNumbers).toEqual([3,5,7].sort((a,b)=>a-b));

    // Assert that no console errors or page errors happened during this flow
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});