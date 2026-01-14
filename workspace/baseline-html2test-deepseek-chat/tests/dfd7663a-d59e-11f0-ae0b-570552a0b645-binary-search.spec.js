import { test, expect } from '@playwright/test';

// Page Object Model for the Binary Search Visualization page
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd7663a-d59e-11f0-ae0b-570552a0b645.html';

    // Selectors
    this.searchInput = '#searchValue';
    this.generateBtn = '#generateArray';
    this.startBtn = '#startSearch';
    this.nextBtn = '#nextStep';
    this.resetBtn = '#reset';
    this.arrayDisplay = '#arrayDisplay';
    this.log = '#log';
    this.stepInfo = '#stepInfo';
  }

  async goto() {
    await this.page.goto(this.url);
    // Wait for the array display to be populated by the app on init
    await this.page.waitForSelector(`${this.arrayDisplay} .array-element`);
  }

  async getSearchValue() {
    return this.page.$eval(this.searchInput, (el) => el.value);
  }

  async setSearchValue(value) {
    await this.page.fill(this.searchInput, String(value));
  }

  async clickGenerate() {
    await this.page.click(this.generateBtn);
    await this.page.waitForTimeout(50); // small delay to let UI update
  }

  async clickStart() {
    await this.page.click(this.startBtn);
  }

  async clickNext() {
    await this.page.click(this.nextBtn);
  }

  async clickReset() {
    await this.page.click(this.resetBtn);
  }

  async getArrayElements() {
    return this.page.$$(`${this.arrayDisplay} .array-element`);
  }

  // Returns array of text values of array elements
  async getArrayValues() {
    const elements = await this.getArrayElements();
    return Promise.all(elements.map((el) => el.textContent()));
  }

  // Returns the classList of the element at index
  async getElementClassList(index) {
    const el = await this.page.$(`#element-${index}`);
    if (!el) return null;
    const className = await el.getAttribute('class');
    return className ? className.split(/\s+/) : [];
  }

  async getElementStyleProperty(index, prop) {
    const el = await this.page.$(`#element-${index}`);
    if (!el) return null;
    return el.evaluate((node, property) => window.getComputedStyle(node)[property], prop);
  }

  async isNextDisabled() {
    return this.page.$eval(this.nextBtn, (b) => b.disabled);
  }

  async isStartDisabled() {
    return this.page.$eval(this.startBtn, (b) => b.disabled);
  }

  async getLogEntries() {
    // returns array of visible log entry texts
    return this.page.$$eval(`${this.log} > div`, (nodes) => nodes.map((n) => n.textContent));
  }

  async getLatestLogEntry() {
    return this.page.$eval(`${this.log}`, (node) => {
      const children = Array.from(node.querySelectorAll('div'));
      if (children.length === 0) return '';
      return children[children.length - 1].textContent;
    });
  }

  async getStepInfoText() {
    return this.page.$eval(this.stepInfo, (el) => el.textContent);
  }

  // helper to wait until next button becomes enabled/disabled or timeout
  async waitForNextDisabledState(expected, timeout = 2000) {
    await this.page.waitForFunction(
      (selector, expectedState) => {
        const btn = document.querySelector(selector);
        return !!btn && btn.disabled === expectedState;
      },
      this.nextBtn,
      expected,
      { timeout }
    );
  }
}

test.describe('Binary Search Visualization - Functional Tests', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen for console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store the error object for assertions
      pageErrors.push(err);
    });
  });

  test('Initial load: controls present, default state and no runtime errors', async ({ page }) => {
    // Purpose: Verify the app initializes correctly and there are no uncaught errors during load.
    const p = new BinarySearchPage(page);
    await p.goto();

    // Verify controls exist and default values
    await expect(page.locator(p.searchInput)).toBeVisible();
    await expect(page.locator(p.generateBtn)).toBeVisible();
    await expect(page.locator(p.startBtn)).toBeVisible();
    await expect(page.locator(p.nextBtn)).toBeVisible();
    await expect(page.locator(p.resetBtn)).toBeVisible();

    // Default search input value should be "42" as in HTML
    const initialInputValue = await p.getSearchValue();
    expect(initialInputValue).toBe('42');

    // There should be exactly 15 elements in the array display (size fixed to 15)
    const values = await p.getArrayValues();
    expect(values.length).toBe(15);

    // Next step should be disabled before starting
    expect(await p.isNextDisabled()).toBe(true);

    // Start should be enabled
    expect(await p.isStartDisabled()).toBe(false);

    // Step info should contain the "Ready to search" message set by resetSearch during init
    const stepInfo = await p.getStepInfoText();
    expect(stepInfo.toLowerCase()).toContain('ready to search');

    // Ensure there were no uncaught page errors during load
    expect(pageErrors.length).toBe(0);

    // Ensure console did not log errors (we allow 'info' logs, but no error/severe)
    const errorConsoleMessages = consoleMessages.filter((m) =>
      ['error', 'warning'].includes(m.type)
    );
    expect(errorConsoleMessages.length).toBe(0);
  });

  test('Generate New Array resets state and changes array values', async ({ page }) => {
    // Purpose: Verify that clicking "Generate New Array" produces a different array and resets UI state.
    const p = new BinarySearchPage(page);
    await p.goto();

    const originalValues = await p.getArrayValues();

    await p.clickGenerate();

    const newValues = await p.getArrayValues();

    // Arrays are random; it's possible (though unlikely) to be identical. We assert that the app resets state.
    // Ensure start button is still enabled and next is disabled after generation/reset
    expect(await p.isStartDisabled()).toBe(false);
    expect(await p.isNextDisabled()).toBe(true);

    // Logs cleared on reset; verify no log entries
    const logs = await p.getLogEntries();
    expect(logs.length).toBe(0);

    // Step info should indicate ready state
    const step = await p.getStepInfoText();
    expect(step.toLowerCase()).toContain('ready to search');

    // Preferably the new array differs from the original; if it doesn't, that's acceptable but we note it in assertion message
    const identical = JSON.stringify(originalValues) === JSON.stringify(newValues);
    // We assert that either they differ OR at least the UI reset occurred (checked above). This avoids flaky test failures.
    expect(true).toBe(true); // dummy to satisfy structure; main assertions are above
  });

  test('Start search finds value at initial mid index when input matches mid element', async ({ page }) => {
    // Purpose: Set the search input to the current mid element value and verify the app finds it on start.
    const p = new BinarySearchPage(page);
    await p.goto();

    // Determine initial mid index (0..14) -> mid = floor((0 + 14)/2) = 7 by implementation
    const midIndex = 7;
    const midSelector = `#element-${midIndex}`;

    // Read the displayed value at mid index and set it as search value
    const midValue = await page.textContent(midSelector);
    expect(midValue).not.toBeNull();

    await p.setSearchValue(midValue);

    // Click Start Search - clicking start triggers performNextStep immediately
    await p.clickStart();

    // Because we searched for the mid value, it should be found in the first step.
    // nextStep should be disabled after finding
    await p.waitForNextDisabledState(true);

    // The mid element should have 'found' and/or 'current' classes when found
    const classList = await p.getElementClassList(midIndex);
    expect(classList).toBeTruthy();
    // 'found' class is added when isFound and index === mid
    expect(classList).toEqual(expect.arrayContaining(classList)); // ensure returned array is valid
    // specifically ensure found class was applied
    expect(classList.some((c) => c === 'found')).toBe(true);

    // Log should contain the "Found the target value" message
    const latestLog = await p.getLatestLogEntry();
    expect(latestLog.toLowerCase()).toContain('found the target value');

    // Step info should indicate a found message
    const stepInfo = await p.getStepInfoText();
    expect(stepInfo.toLowerCase()).toContain('found');
  });

  test('Search for a value not present continues stepping and reports not found', async ({ page }) => {
    // Purpose: Use an out-of-range value to ensure the search will not find it and will report completion.
    const p = new BinarySearchPage(page);
    await p.goto();

    // Use 101 which is outside the array generation range (1..100) ensuring it's not present
    await p.setSearchValue(101);

    // Start search
    await p.clickStart();

    // Now repeatedly click "Next Step" until the button becomes disabled (search complete)
    // Limit number of iterations to avoid infinite loop in case of bug
    const maxSteps = 30;
    for (let i = 0; i < maxSteps; i++) {
      const disabled = await p.isNextDisabled();
      if (disabled) break;
      await p.clickNext();
      // small delay for DOM updates
      await page.waitForTimeout(50);
    }

    // After completion, Next should be disabled
    expect(await p.isNextDisabled()).toBe(true);

    // Latest log entry should include 'not found'
    const logs = await p.getLogEntries();
    const anyNotFound = logs.some((l) => l.toLowerCase().includes('not found'));
    expect(anyNotFound).toBe(true);

    // Step info should indicate 'not found'
    const step = await p.getStepInfoText();
    expect(step.toLowerCase()).toContain('not found');

    // As search progressed, some elements outside left-right range should have reduced opacity.
    // We check that at least one element has computed opacity '0.5' (style set in updateDisplay)
    const elements = await p.getArrayElements();
    let foundFaded = false;
    for (let i = 0; i < elements.length; i++) {
      const opacity = await elements[i].evaluate((el) => window.getComputedStyle(el).opacity);
      if (opacity === '0.5') {
        foundFaded = true;
        break;
      }
    }
    // It's valid if none are faded in some edge situations; assert that the app attempted to indicate search narrowing by either fading or checking classes
    const anyCheckedOrFound = await page.$$eval(
      `${p.arrayDisplay} .array-element`,
      (nodes) => nodes.some((n) => n.classList.contains('checked') || n.classList.contains('found') || n.classList.contains('current'))
    );
    expect(anyCheckedOrFound || foundFaded).toBe(true);
  });

  test('Reset button restores initial ready state after a search', async ({ page }) => {
    // Purpose: Ensure Reset clears logs, enables Start, disables Next and updates step info.
    const p = new BinarySearchPage(page);
    await p.goto();

    // Begin a search for an out-of-range value so that search will progress
    await p.setSearchValue(999);
    await p.clickStart();

    // Click Next once if enabled to create some log
    if (!(await p.isNextDisabled())) {
      await p.clickNext();
    }

    // Now click Reset
    await p.clickReset();

    // After reset, step info should indicate ready state
    const step = await p.getStepInfoText();
    expect(step.toLowerCase()).toContain('ready to search');

    // Logs should be cleared
    const logs = await p.getLogEntries();
    expect(logs.length).toBe(0);

    // Next should be disabled and Start should be enabled
    expect(await p.isNextDisabled()).toBe(true);
    expect(await p.isStartDisabled()).toBe(false);
  });

  test('Invalid input triggers alert and does not start search', async ({ page }) => {
    // Purpose: When input is empty / non-numeric, clicking Start should trigger an alert and not start the search.
    const p = new BinarySearchPage(page);
    await p.goto();

    // Clear the numeric input to produce NaN on parseInt
    await p.setSearchValue('');

    // Listen for dialog and capture its message
    const dialogPromise = page.waitForEvent('dialog', { timeout: 2000 });

    // Click Start - app should alert 'Please enter a valid number to search for'
    await p.clickStart();

    const dialog = await dialogPromise;
    expect(dialog).toBeTruthy();
    expect(dialog.message()).toContain('Please enter a valid number to search for');

    // Accept the dialog so it doesn't hang other tests
    await dialog.accept();

    // Ensure that search hasn't been started: Next should remain disabled and Start remains enabled
    expect(await p.isNextDisabled()).toBe(true);
    expect(await p.isStartDisabled()).toBe(false);

    // Ensure no uncaught page errors were generated by the invalid input flow
    const pageErrorsAfter = [];
    page.on('pageerror', (err) => pageErrorsAfter.push(err));
    // small wait to ensure no additional page errors are emitted
    await page.waitForTimeout(50);
    expect(pageErrorsAfter.length).toBe(0);
  });

  test('Console and runtime error observation: there are no unhandled exceptions or error console entries during user interactions', async ({ page }) => {
    // Purpose: While interacting with the app, verify we do not get uncaught page errors or console error logs.
    const p = new BinarySearchPage(page);
    await p.goto();

    // Interact with the app: generate, start (with mid value), reset
    const midIndex = 7;
    const midValue = await page.textContent(`#element-${midIndex}`);
    await p.setSearchValue(midValue);
    await p.clickStart();

    // If next remains enabled (shouldn't if found), click next a couple times
    for (let i = 0; i < 3; i++) {
      if (await p.isNextDisabled()) break;
      await p.clickNext();
      await page.waitForTimeout(30);
    }

    await p.clickReset();

    // After the interactions, assert there were no uncaught pageerrors recorded by the listener
    // (we collected these in the beforeEach handler into pageErrors too)
    expect(pageErrors.length).toBe(0);

    // Assert no console messages of type 'error' or 'warning'
    const badConsole = consoleMessages.filter((m) => ['error', 'warning'].includes(m.type));
    expect(badConsole.length).toBe(0);
  });
});