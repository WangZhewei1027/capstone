import { test, expect } from '@playwright/test';

// Page object for the Two Pointers demo page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6d0-cd33-11f0-bdf9-b3d97e91273d.html';
    this.inputArray = page.locator('#inputArray');
    this.problemSelect = page.locator('#problemSelect');
    this.targetContainer = page.locator('#targetInputContainer');
    this.targetSum = page.locator('#targetSum');
    this.runBtn = page.locator('#runBtn');
    this.result = page.locator('#result');
  }

  async goto() {
    await this.page.goto(this.url);
    // ensure the initial change event processed
    await this.page.waitForTimeout(50);
  }

  async setArray(text) {
    await this.inputArray.fill(text);
  }

  async selectProblem(value) {
    await this.problemSelect.selectOption({ value });
    // wait a tick for UI to react to change
    await this.page.waitForTimeout(50);
  }

  async setTarget(value) {
    await this.targetSum.fill(String(value));
  }

  async clickRun() {
    await this.runBtn.click();
  }

  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  // Count the number of visualization containers currently in result
  async countVisualizations() {
    return await this.result.locator('.array-visualization').count();
  }

  // Find elements with given pointer classes inside result
  async getPointerElements() {
    const left = this.result.locator('.pointer-left');
    const right = this.result.locator('.pointer-right');
    const both = this.result.locator('.pointer-both');
    return {
      leftCount: await left.count(),
      rightCount: await right.count(),
      bothCount: await both.count(),
    };
  }
}

test.describe('Two Pointers Technique Demo (Two Pointers page)', () => {
  let pageErrors;
  let consoleErrors;
  let consoleMessages;

  // Capture console and page errors for each test to assert no unexpected runtime errors occur.
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];
    consoleMessages = [];

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // Listen for console events and collect error messages separately
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    // Assert that no uncaught page errors occurred
    expect(pageErrors, 'No uncaught page errors should have occurred').toEqual([]);
    // Assert that no console.error messages were emitted
    expect(consoleErrors, 'No console.error messages should have been logged').toEqual([]);
  });

  test('Initial page load shows expected default UI and controls', async ({ page }) => {
    // Purpose: Verify page loads and initial UI state is correct.
    const tp = new TwoPointersPage(page);
    await tp.goto();

    // Verify the main controls exist and default selections are set
    await expect(tp.inputArray).toBeVisible();
    await expect(tp.problemSelect).toBeVisible();
    await expect(tp.runBtn).toBeVisible();
    await expect(tp.result).toBeVisible();

    // problemSelect default is "twoSum" in markup; the script triggers change on load
    await expect(tp.problemSelect).toHaveValue('twoSum');

    // Target input container should be visible because problemSelect default is twoSum
    await expect(tp.targetContainer).toBeVisible();

    // Result area should initially be empty or only white-space
    const initialText = await tp.getResultText();
    expect(initialText === '' || /^\s*$/.test(initialText)).toBe(true);

    // No visualization present initially
    const vizCount = await tp.countVisualizations();
    expect(vizCount).toBe(0);
  });

  test('Two Sum: finds pair when present and displays visualization and result summary', async ({ page }) => {
    // Purpose: Test Two Sum flow for a case found on first check (minimal waits)
    const tp1 = new TwoPointersPage(page);
    await tp.goto();

    // Provide input: unsorted intentionally to ensure sorting occurs
    await tp.setArray('4, 1, 2, 3');
    await tp.setTarget(5);
    await tp.selectProblem('twoSum');

    // Run the algorithm
    await tp.clickRun();

    // Expect to see target header and an array visualization
    await expect(tp.result.locator('text=Target sum =')).toBeVisible();

    // Because the pair (1,4) is found on first step, visualization and summary should appear quickly
    // Wait for summary "Numbers:" to appear
    await expect(tp.result.locator('text=Numbers:')).toBeVisible({ timeout: 2000 });

    const resultText = await tp.getResultText();
    // The summary should contain both indices and numbers
    expect(resultText).toContain('Result indices in sorted array:');
    expect(resultText).toContain('Numbers: 1, 4');

    // Verify at least one visualization exists and pointer classes are present
    const vizCount1 = await tp.countVisualizations();
    expect(vizCount).toBeGreaterThanOrEqual(1);

    const pointers = await tp.getPointerElements();
    // Since the found pair will mark left and right possibly on the same visualization element,
    // ensure there is at least some pointer styling present (left/right/both)
    expect(pointers.leftCount + pointers.rightCount + pointers.bothCount).toBeGreaterThanOrEqual(1);
  });

  test('Two Sum: handles no-match case and reports no two numbers found', async ({ page }) => {
    // Purpose: Ensure the UI reports when no pair sums to target.
    const tp2 = new TwoPointersPage(page);
    await tp.goto();

    // Use small array where no pair meets the large target
    await tp.setArray('1, 2, 3');
    await tp.setTarget(100);
    await tp.selectProblem('twoSum');

    // Run and wait for the "No two numbers found" message to appear
    await tp.clickRun();

    // The algorithm will iterate but for a small array should complete in a couple of steps.
    await expect(tp.result.locator('text=No two numbers found that sum to 100.')).toBeVisible({ timeout: 3000 });

    const text = await tp.getResultText();
    expect(text).toContain('No two numbers found that sum to 100.');
  });

  test('Remove Duplicates: toggles problem and hides target input', async ({ page }) => {
    // Purpose: Selecting removeDuplicates should hide the target input container.
    const tp3 = new TwoPointersPage(page);
    await tp.goto();

    // Switch to removeDuplicates problem
    await tp.selectProblem('removeDuplicates');

    // Target input container should be hidden
    await expect(tp.targetContainer).not.toBeVisible();
  });

  test('Remove Duplicates: removes duplicates and shows new length and modified array summary', async ({ page }) => {
    // Purpose: Verify removeDuplicates works and final summary is displayed.
    const tp4 = new TwoPointersPage(page);
    await tp.goto();

    // Use a small array to keep animation time short (2 steps => ~1800ms of sleeps)
    await tp.setArray('1, 1, 2');
    await tp.selectProblem('removeDuplicates');

    // Run the algorithm
    await tp.clickRun();

    // Wait for final summary text indicating new length
    await expect(tp.result.locator('text=New length after removing duplicates:')).toBeVisible({ timeout: 3000 });

    const text1 = await tp.getResultText();
    expect(text).toContain('New length after removing duplicates: 2');
    expect(text).toContain('Modified array (unique elements first): [1, 2]');
  });

  test('Input validation: empty input shows appropriate message', async ({ page }) => {
    // Purpose: Ensure running with no numbers shows validation message.
    const tp5 = new TwoPointersPage(page);
    await tp.goto();

    // Ensure textarea is empty
    await tp.setArray('');
    await tp.selectProblem('twoSum');
    await tp.clickRun();

    // Expect validation message
    await expect(tp.result.locator('text=Please enter at least one valid number.')).toBeVisible();
    const text2 = await tp.getResultText();
    expect(text).toBe('Please enter at least one valid number.');
  });

  test('Input validation: invalid target for twoSum shows appropriate message', async ({ page }) => {
    // Purpose: Ensure non-numeric target is handled gracefully.
    const tp6 = new TwoPointersPage(page);
    await tp.goto();

    await tp.setArray('1, 2, 3');
    await tp.selectProblem('twoSum');

    // Clear target input to make it invalid (empty -> NaN)
    await tp.targetSum.fill('');
    await tp.clickRun();

    await expect(tp.result.locator('text=Please enter a valid target sum.')).toBeVisible();
    const text3 = await tp.getResultText();
    expect(text).toBe('Please enter a valid target sum.');
  });

  test('parseInput robustness: non-numeric tokens are ignored and numeric tokens parsed', async ({ page }) => {
    // Purpose: Verify that parseInput filters invalid tokens and returns valid numbers.
    const tp7 = new TwoPointersPage(page);
    await tp.goto();

    // Input contains non-numeric tokens; expected parsed numbers are 1 and 2
    await tp.setArray('a, 1, , 2, three');
    await tp.selectProblem('twoSum');
    await tp.setTarget(3);
    await tp.clickRun();

    // The sorted numeric array becomes [1,2], which sums to 3 -> should find a pair.
    await expect(tp.result.locator('text=Numbers: 1, 2')).toBeVisible({ timeout: 2000 });

    const text4 = await tp.getResultText();
    expect(text).toContain('Numbers: 1, 2');
  });

  test('Visual highlighting: pointer classes applied correctly in visualization', async ({ page }) => {
    // Purpose: Ensure pointer CSS classes are present in visualization elements.
    const tp8 = new TwoPointersPage(page);
    await tp.goto();

    // Use array that will require a few pointer movements but will find a pair quickly
    await tp.setArray('1, 2, 3, 4');
    await tp.setTarget(6); // 2 + 4 = 6 or 3+3 if present; here should find 2 and 4 eventually
    await tp.selectProblem('twoSum');

    await tp.clickRun();

    // Wait for the final summary to appear (Numbers:)
    await expect(tp.result.locator('text=Numbers:')).toBeVisible({ timeout: 3000 });

    // Check existence of elements with pointer-related classes
    const pointers1 = await tp.getPointerElements();
    expect(pointers.leftCount + pointers.rightCount + pointers.bothCount).toBeGreaterThanOrEqual(1);
  });
});