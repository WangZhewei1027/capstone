import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e0a0744-d5a0-11f0-8040-510e90b1f3a7.html';

// Page object to encapsulate interactions with the Binary Search visualization page
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.targetInput = page.locator('#targetValue');
    this.startBtn = page.locator('#startBtn');
    this.nextBtn = page.locator('#nextBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.arrayContainer = page.locator('#arrayContainer');
    this.arrayElements = page.locator('#arrayContainer .array-element');
    this.stepsContainer = page.locator('#stepsContainer');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Read the numeric value currently in the target input
  async getTargetValue() {
    const val = await this.targetInput.inputValue();
    return val;
  }

  // Click the Start Search button
  async clickStart() {
    await this.startBtn.click();
  }

  // Click the Next Step button
  async clickNext() {
    await this.nextBtn.click();
  }

  // Click the Reset button
  async clickReset() {
    await this.resetBtn.click();
  }

  // Set the target input value (replacing existing)
  async setTargetValue(value) {
    await this.targetInput.fill(String(value));
  }

  // Get the number of generated array elements
  async getArrayLength() {
    return await this.arrayElements.count();
  }

  // Get the text content of an array element by index (0-based)
  async getArrayElementText(index) {
    return await this.arrayElements.nth(index).textContent();
  }

  // Get the locator for the array element that has the given numeric text
  getArrayElementByText(text) {
    return this.page.locator('#arrayContainer .array-element', { hasText: String(text) });
  }

  // Get classes of element by index
  async getArrayElementClassList(index) {
    const el = this.arrayElements.nth(index);
    const classAttr = await el.getAttribute('class');
    return classAttr ? classAttr.split(/\s+/) : [];
  }

  // Count step entries displayed
  async getStepCount() {
    return await this.stepsContainer.locator('.step').count();
  }

  // Get the latest step text
  async getLastStepText() {
    const count = await this.getStepCount();
    if (count === 0) return '';
    return await this.stepsContainer.locator('.step').nth(count - 1).textContent();
  }
}

test.describe('Binary Search Visualization - 6e0a0744...', () => {
  // Collect console errors and page errors for each test to assert none occur
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test, assert that no console errors or uncaught page errors occurred.
    // This ensures the page JS executed without throwing or logging errors.
    expect(consoleErrors, 'expected no console.error messages').toEqual([]);
    expect(pageErrors, 'expected no uncaught page errors').toEqual([]);
  });

  test('Initial page load shows correct default UI and array visualization', async ({ page }) => {
    // Purpose: Verify initial load default states, controls, and array generation.
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Page title and main headings exist
    await expect(page.locator('h1')).toHaveText('Binary Search Algorithm');

    // Default input value should be '42' per HTML value attribute
    const inputVal = await bs.getTargetValue();
    expect(inputVal).toBe('42');

    // Buttons: Start enabled, Next disabled, Reset enabled
    await expect(bs.startBtn).toBeEnabled();
    await expect(bs.nextBtn).toBeDisabled();
    await expect(bs.resetBtn).toBeEnabled();

    // Array should have 100 elements (1..100)
    const len = await bs.getArrayLength();
    expect(len).toBe(100);

    // Check first and last element values are 1 and 100
    const firstText = (await bs.getArrayElementText(0)).trim();
    const lastText = (await bs.getArrayElementText(99)).trim();
    expect(firstText).toBe('1');
    expect(lastText).toBe('100');

    // Elements divisible by 5 should be opaque (not set to 0.3). Pick 5 and 6.
    const el5 = bs.getArrayElementByText('5');
    const el6 = bs.getArrayElementByText('6');

    // confirm presence
    await expect(el5).toHaveCount(1);
    await expect(el6).toHaveCount(1);

    // read inline style opacity property (6 should be faded 0.3, 5 should not)
    const opacity5 = await el5.evaluate(node => node.style.opacity || '');
    const opacity6 = await el6.evaluate(node => node.style.opacity || '');
    // 5 is divisible by 5 => should not have opacity '0.3'
    expect(opacity5 === '0.3').toBe(false);
    // 6 is not divisible by 5 => should have opacity '0.3'
    expect(opacity6).toBe('0.3');

    // Steps container should be empty initially
    const stepsCount = await bs.getStepCount();
    expect(stepsCount).toBe(0);
  });

  test('Full binary search flow finds target 42 and highlights searched element', async ({ page }) => {
    // Purpose: Start a search with default target 42, step through until found, and verify DOM updates
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Start the search; startSearch triggers one step immediately
    await bs.clickStart();

    // After start, nextBtn should be enabled since the search begins and next steps are possible
    await expect(bs.nextBtn).toBeEnabled();

    // The first step should be appended
    let stepText = await bs.getLastStepText();
    expect(stepText).toContain('Step 1: Searching from index');

    // The first midpoint for array length 100 is index 49 (value 50)
    expect(stepText).toContain('Midpoint: 49 (Value: 50)');

    // The array element at index 49 should have the 'midpoint' class
    const midClassList = await bs.getArrayElementClassList(49);
    expect(midClassList).toEqual(expect.arrayContaining(['array-element', 'midpoint']));

    // Click Next repeatedly until the search reports the target was found and the searched element is highlighted
    // We anticipate 7 steps for target 42 in this array; click until a step contains 'Target found at index 41!'
    let found = false;
    for (let i = 0; i < 10; i++) {
      // After each click, wait a brief moment for DOM updates (the app is synchronous but ensure stability)
      await bs.clickNext();
      stepText = await bs.getLastStepText() || '';

      if (stepText.includes('Target found at index 41')) {
        found = true;
        break;
      }
    }

    expect(found, 'expected the binary search to find target 42 at index 41').toBe(true);

    // Confirm that the element with text '42' has the 'searched' class applied
    const el42 = bs.getArrayElementByText('42');
    await expect(el42).toHaveCount(1);
    const classes42 = await el42.getAttribute('class');
    expect(classes42).toContain('searched');

    // Confirm that no further 'Next Step' is possible (button disabled after found)
    await expect(bs.nextBtn).toBeDisabled();
  });

  test('Reset button clears steps and restores array to initial state', async ({ page }) => {
    // Purpose: Ensure reset returns the UI to the original state after a search
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Start search and perform a couple of steps
    await bs.clickStart();
    await bs.clickNext();
    await bs.clickNext();

    // Ensure there are steps recorded
    const stepsBeforeReset = await bs.getStepCount();
    expect(stepsBeforeReset).toBeGreaterThan(0);

    // Reset the search
    await bs.clickReset();

    // Steps container should be empty and next button disabled
    const stepsAfterReset = await bs.getStepCount();
    expect(stepsAfterReset).toBe(0);
    await expect(bs.nextBtn).toBeDisabled();

    // Array should still have 100 elements and midpoint/searched/highlighted classes should be gone
    const lenAfter = await bs.getArrayLength();
    expect(lenAfter).toBe(100);

    // Check that no elements have 'midpoint' or 'searched' classes
    const hasMidpoint = await page.locator('.array-element.midpoint').count();
    const hasSearched = await page.locator('.array-element.searched').count();
    const hasHighlighted = await page.locator('.array-element.highlighted').count();
    expect(hasMidpoint).toBe(0);
    expect(hasSearched).toBe(0);
    expect(hasHighlighted).toBe(0);
  });

  test('Invalid input shows an alert dialog and does not start search', async ({ page }) => {
    // Purpose: Verify validation behavior when user inputs out-of-range numbers
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Provide an invalid value (0) which is out of allowed range [1,100]
    await bs.setTargetValue(0);

    // Listen for dialog and assert message
    const dialogPromise = page.waitForEvent('dialog');

    // Click start and expect the dialog to appear with expected message
    await bs.clickStart();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a valid number between 1 and 100.');

    // Accept the dialog to continue the test
    await dialog.accept();

    // Ensure no steps were created and nextBtn remains disabled
    const steps = await bs.getStepCount();
    expect(steps).toBe(0);
    await expect(bs.nextBtn).toBeDisabled();
  });

  test('Search progression logs step descriptions and scrolls steps container', async ({ page }) => {
    // Purpose: Ensure each next step appends a description to steps container and that content grows
    const bs = new BinarySearchPage(page);
    await bs.goto();

    // Set a target that is present (e.g., 99) to force a few steps
    await bs.setTargetValue(99);
    await bs.clickStart();

    // Initially there's at least 1 step
    let count = await bs.getStepCount();
    expect(count).toBeGreaterThanOrEqual(1);

    // Click next a few times and verify step count increases
    await bs.clickNext();
    await bs.clickNext();
    const newCount = await bs.getStepCount();
    expect(newCount).toBeGreaterThan(count);

    // The last step text should include the midpoint and "Value:"
    const lastText = await bs.getLastStepText();
    expect(lastText).toMatch(/Midpoint: \d+ \(Value: \d+\)/);

    // Since steps container uses scrollTop update, ensure the container has non-zero scrollHeight
    const scrollHeight = await page.locator('#stepsContainer').evaluate(node => node.scrollHeight);
    expect(scrollHeight).toBeGreaterThan(0);
  });
});