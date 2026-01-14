import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccbe012-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object Model for the Selection Sort demo page
class SelectionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.startBtn = page.locator('#startBtn');
    this.visualization = page.locator('#visualization');
    this.barSelector = '#visualization .bar';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getInputValue() {
    return await this.arrayInput.inputValue();
  }

  async setInputValue(value) {
    await this.arrayInput.fill(value);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async isStartDisabled() {
    return await this.startBtn.isDisabled();
  }

  async isInputDisabled() {
    return await this.arrayInput.isDisabled();
  }

  async getBars() {
    return await this.page.locator(this.barSelector).elementHandles();
  }

  // Returns textual values of bars as numbers in DOM order
  async getBarValues() {
    const bars = this.page.locator(this.barSelector);
    const count = await bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const txt = await bars.nth(i).innerText();
      values.push(Number(txt.trim()));
    }
    return values;
  }

  // Returns whether every bar has class 'sorted'
  async allBarsSorted() {
    const bars = this.page.locator(this.barSelector);
    const count = await bars.count();
    if (count === 0) return false;
    for (let i = 0; i < count; i++) {
      const classes = await bars.nth(i).getAttribute('class');
      if (!classes || !classes.split(/\s+/).includes('sorted')) return false;
    }
    return true;
  }

  // Returns heights of bars as pixel string values
  async getBarHeights() {
    const bars = this.page.locator(this.barSelector);
    const count = await bars.count();
    const heights = [];
    for (let i = 0; i < count; i++) {
      const h = await bars.nth(i).evaluate((el) => getComputedStyle(el).height);
      heights.push(h);
    }
    return heights;
  }
}

test.describe('Selection Sort Demo - FSM Validation and UI Tests', () => {
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Collect page-level runtime errors and console error messages for observation assertions
    pageErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => {
      // Capture runtime errors (ReferenceError, TypeError, etc.)
      pageErrors.push(String(err && err.message ? err.message : err));
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('S0 Idle: On load, initial input value is present and bars are created from default input', async ({ page }) => {
    // This test validates the Idle state's entry action: initial visualization created on window.onload
    const model = new SelectionSortPage(page);
    await model.goto();

    // Verify the input value matches the embedded default
    const inputVal = await model.getInputValue();
    expect(inputVal).toBe('64,25,12,22,11');

    // Verify bars are present and reflect the default input values
    const values = await model.getBarValues();
    expect(values).toEqual([64, 25, 12, 22, 11]);

    // Verify bar heights correspond to value * 3 px (as implemented)
    const heights = await model.getBarHeights();
    expect(heights.length).toBe(values.length);
    for (let i = 0; i < values.length; i++) {
      // computed height like '192px' for 64*3 etc.
      const expectedPx = `${values[i] * 3}px`;
      expect(heights[i]).toBe(expectedPx);
    }

    // Ensure no runtime page errors were emitted during load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Transition to S2_Error (Invalid input): shows alert and does not change UI controls', async ({ page }) => {
    // This test validates the guard path: if parseInput returns null, an alert is shown and sorting does not start
    const model = new SelectionSortPage(page);
    await model.goto();

    // Replace input with an invalid list containing a non-number
    await model.setInputValue('5, notANumber, 3');

    // Listen for the dialog and accept it; assert its message
    let dialogMessage = null;
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });

    await model.clickStart();

    // The alert should have been shown with the expected error text
    expect(dialogMessage).toBe('Please enter a valid list of numbers separated by commas or spaces.');

    // After the alert, controls should remain enabled (no entry into Sorting state)
    expect(await model.isStartDisabled()).toBe(false);
    expect(await model.isInputDisabled()).toBe(false);

    // Visualization should remain unchanged from the initial load (default bars still present)
    const values = await model.getBarValues();
    expect(values).toEqual([64, 25, 12, 22, 11]);

    // No unexpected runtime errors occurred as a result of invalid input
    expect(pageErrors.length).toBe(0);
  });

  test('Transition to S3_NoInput (Empty input): shows alert asking for at least one number and preserves bars', async ({ page }) => {
    // This test validates the guard path: parsed.length === 0 leads to an alert and aborts sorting
    const model = new SelectionSortPage(page);
    await model.goto();

    // Clear the input completely to simulate no input
    await model.setInputValue('');

    // Capture dialog
    let dialogMessage = null;
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });

    await model.clickStart();

    // The alert should instruct the user to enter at least one number
    expect(dialogMessage).toBe('Please enter at least one number.');

    // Controls remain enabled and visualization remains (the previously loaded bars should still exist)
    expect(await model.isStartDisabled()).toBe(false);
    expect(await model.isInputDisabled()).toBe(false);

    const values = await model.getBarValues();
    // Default bars from initial load should still be present
    expect(values).toEqual([64, 25, 12, 22, 11]);

    // No unexpected runtime errors emitted
    expect(pageErrors.length).toBe(0);
  });

  test('Transition S0 -> S1 (Sorting) and S1 -> S4 (Completed): valid input disables controls during sort and results in sorted bars', async ({ page }) => {
    // This test covers the happy path: valid input triggers sorting, UI disables, and final completed state marks all bars as sorted
    const model = new SelectionSortPage(page);
    await model.goto();

    // Use a shorter input to make the visual sort complete faster in test (keeps behavior identical)
    await model.setInputValue('3,1,2');

    // Prepare to accept any dialogs (none expected) to avoid tests hanging if alerts appear
    page.on('dialog', (d) => d.accept());

    // Start sorting; immediately after clicking, entry actions should disable controls
    await model.clickStart();

    // The start button and input should be disabled while sorting is in progress (S1 entry actions)
    expect(await model.isStartDisabled()).toBe(true);
    expect(await model.isInputDisabled()).toBe(true);

    // Wait until the Start button becomes enabled again, which signals sorting completion (S1 exit actions)
    // Allow generous timeout because the demo uses set sleep durations internally
    await expect(model.startBtn).toBeEnabled({ timeout: 30000 });

    // After sorting completes, controls should be re-enabled
    expect(await model.isStartDisabled()).toBe(false);
    expect(await model.isInputDisabled()).toBe(false);

    // The final state should have all bars marked as 'sorted' (S4_Completed evidence: updateBars(arr, -1, -1, n))
    const allSorted = await model.allBarsSorted();
    expect(allSorted).toBe(true);

    // Verify the final bar values are in ascending order (selection sort final result)
    const finalValues = await model.getBarValues();
    const sortedCopy = [...finalValues].sort((a, b) => a - b);
    expect(finalValues).toEqual(sortedCopy);

    // Ensure bars' heights match their values * 3px as a consistency check
    const heights = await model.getBarHeights();
    for (let i = 0; i < finalValues.length; i++) {
      expect(heights[i]).toBe(`${finalValues[i] * 3}px`);
    }

    // Confirm no runtime errors occurred during sorting
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Observe console and page errors: capture any runtime errors (ReferenceError, SyntaxError, TypeError) if they occur', async ({ page }) => {
    // This test intentionally observes and asserts about runtime and console errors emitted during page load and interactions.
    // It does not modify the page or patch globals; it merely records what happens naturally.
    const model = new SelectionSortPage(page);
    await model.goto();

    // Perform a simple action to exercise event handlers: click Start with valid default input
    // Accept any dialogs if they appear
    page.on('dialog', (d) => d.accept());
    await model.clickStart();

    // Wait for sorting to complete (startBtn re-enabled). Set a generous timeout.
    await expect(model.startBtn).toBeEnabled({ timeout: 30000 });

    // Now assert the collected page errors and console errors.
    // The expectation is that the demo runs without throwing runtime exceptions.
    // If any page errors exist, they should be recognizable JavaScript runtime error messages.
    // We assert zero runtime errors; if there are errors, include them in the failure message for diagnostics.
    if (pageErrors.length > 0) {
      // If there are runtime errors, fail the test and surface them for debugging
      throw new Error(`Runtime page errors were emitted: ${JSON.stringify(pageErrors, null, 2)}`);
    }

    // Similarly ensure no console.error messages were emitted
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors were emitted: ${JSON.stringify(consoleErrors, null, 2)}`);
    }

    // If none occurred, make a passing assertion
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});