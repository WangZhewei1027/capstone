import { test, expect } from '@playwright/test';

test.setTimeout(120000); // Increase timeout to allow the visualization to complete

// Page Object Model for the Quick Sort Visualization page
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.urlRaw = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccc0722-d5b5-11f0-899c-75bf12e026a9.html';
    // encodeURI will safely handle the space in the provided path
    this.url = encodeURI(this.urlRaw);
    this.selectors = {
      input: '#inputArray',
      sortButton: '#sortButton',
      arrayContainer: '#arrayContainer',
      steps: '#steps',
    };
  }

  async go() {
    await this.page.goto(this.url);
    // Wait for main elements to be present
    await Promise.all([
      this.page.waitForSelector(this.selectors.input),
      this.page.waitForSelector(this.selectors.sortButton),
      this.page.waitForSelector(this.selectors.arrayContainer),
      this.page.waitForSelector(this.selectors.steps),
    ]);
  }

  async getInputValue() {
    return await this.page.$eval(this.selectors.input, el => el.value);
  }

  async setInputValue(value) {
    await this.page.fill(this.selectors.input, value);
  }

  async clickSort() {
    await this.page.click(this.selectors.sortButton);
  }

  async isSortButtonDisabled() {
    return await this.page.$eval(this.selectors.sortButton, el => el.disabled);
  }

  async isInputDisabled() {
    return await this.page.$eval(this.selectors.input, el => el.disabled);
  }

  // Returns array of bar text contents in order
  async getBarValues() {
    return await this.page.$$eval(`${this.selectors.arrayContainer} .bar`, bars =>
      bars.map(b => b.textContent.trim())
    );
  }

  async getStepsText() {
    return await this.page.$eval(this.selectors.steps, el => el.textContent);
  }

  // Wait until the steps area contains the exact substring 'Array sorted: ['
  async waitForSortedMarker(timeout = 90000) {
    await this.page.waitForFunction(() => {
      const s = document.getElementById('steps');
      return s && s.textContent.includes('Array sorted: [');
    }, { timeout });
  }
}

test.describe('Quick Sort Visualization - FSM state and transition tests', () => {
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    // Collect page errors and console errors to observe runtime problems naturally
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', err => {
      // capture uncaught exceptions (ReferenceError, TypeError, etc.)
      pageErrors.push(String(err && err.message ? err.message : err));
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  // Test the initial Idle state (S0_Idle)
  test('Initial render (S0_Idle): should render default array and UI elements', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.go();

    // Verify input default value matches FSM's initial array representation
    const inputVal = await qs.getInputValue();
    expect(inputVal).toBe('8,3,7,4,9,2,6,5');

    // Verify arrayContainer rendered 8 bars corresponding to the default array
    const bars = await qs.getBarValues();
    expect(bars.length).toBe(8);
    expect(bars).toEqual(['8','3','7','4','9','2','6','5']);

    // Steps container should be present and initially contain whatever initial render logs (likely empty)
    const stepsText = await qs.getStepsText();
    // The initial script does not add a step on load beyond renderArray, so steps should be empty or whitespace
    expect(typeof stepsText).toBe('string');

    // Sort button should be enabled initially
    const sortDisabled = await qs.isSortButtonDisabled();
    expect(sortDisabled).toBe(false);

    // No uncaught page errors or console errors should have occurred during initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Test the transition from Idle to Sorting when clicking the Sort button (S0_Idle -> S1_Sorting)
  test('Sort button click starts sorting (S0 -> S1): disables inputs and logs start', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.go();

    // Prepare to observe dialog events just in case (should not occur for valid input)
    let dialogSeen = null;
    page.on('dialog', dialog => {
      dialogSeen = dialog.message();
      dialog.accept();
    });

    // Click sort and immediately check onExit/onEnter actions:
    // - steps.textContent = '' (the code clears steps before logging)
    // - sortButton.disabled = true and input.disabled = true
    await qs.clickSort();

    // Immediately after click, the UI should disable input and button while sorting runs
    const sortDisabled = await qs.isSortButtonDisabled();
    const inputDisabled = await qs.isInputDisabled();
    expect(sortDisabled).toBe(true);
    expect(inputDisabled).toBe(true);

    // The steps area should contain the 'Starting Quick Sort...' entry after clearing
    // Wait briefly to allow the initial logStep to happen
    await page.waitForFunction(() => {
      const s = document.getElementById('steps');
      return s && s.textContent.includes('Starting Quick Sort');
    }, { timeout: 5000 });

    const stepsText = await qs.getStepsText();
    expect(stepsText).toContain('Starting Quick Sort');

    // There should be no alert/dialog for the valid default input
    expect(dialogSeen).toBeNull();

    // Note: do not wait for full sort in this test; the next test will validate completion
    // Ensure no unhandled runtime errors occurred up to this point
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Full end-to-end sorting completion test (S1_Sorting -> S2_Sorted)
  test('Full sort completes (S1 -> S2): final sorted array displayed and UI re-enabled', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.go();

    // Click sort to begin visualization
    await qs.clickSort();

    // Immediately verify inputs disabled (onExit actions of Sorting will be executed later when done)
    expect(await qs.isSortButtonDisabled()).toBe(true);
    expect(await qs.isInputDisabled()).toBe(true);

    // Wait for the final log 'Array sorted:' indicating transition to S2_Sorted
    await qs.waitForSortedMarker(100000); // allow ample time for full sort

    // After completion the script re-enables the UI
    // Give a small delay to allow final UI enablement to happen
    await page.waitForFunction(() => {
      const btn = document.getElementById('sortButton');
      const inp = document.getElementById('inputArray');
      return btn && inp && !btn.disabled && !inp.disabled;
    }, { timeout: 5000 });

    const finalSteps = await qs.getStepsText();
    expect(finalSteps).toContain('Array sorted: [');
    // Verify final array shown in steps matches the sorted numeric order
    // The expected sorted array from initial values [8,3,7,4,9,2,6,5] is [2,3,4,5,6,7,8,9]
    expect(finalSteps).toContain('Array sorted: [2, 3, 4, 5, 6, 7, 8, 9]');

    // Verify visual array (bars) are in sorted order
    const barsAfter = await qs.getBarValues();
    expect(barsAfter).toEqual(['2','3','4','5','6','7','8','9']);

    // Verify UI re-enabled (exit_actions for S1_Sorting)
    expect(await qs.isSortButtonDisabled()).toBe(false);
    expect(await qs.isInputDisabled()).toBe(false);

    // Check that there were no uncaught page errors or console errors during the full run
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: Empty input should trigger the alert and not start sorting
  test('Edge case: empty input shows alert and does not start sorting', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.go();

    // Capture dialog text
    let dialogText = null;
    page.once('dialog', dlg => {
      dialogText = dlg.message();
      dlg.accept();
    });

    // Clear the input and click sort
    await qs.setInputValue('');
    await qs.clickSort();

    // Expect alert about empty input
    await page.waitForTimeout(200); // allow dialog handler to fire
    expect(dialogText).toBe('Please enter some numbers separated by commas.');

    // Ensure sorting did NOT start: sort button should remain enabled and steps should not contain 'Starting Quick Sort...'
    expect(await qs.isSortButtonDisabled()).toBe(false);
    expect(await qs.isInputDisabled()).toBe(false);

    const stepsText = await qs.getStepsText();
    expect(stepsText).not.toContain('Starting Quick Sort');

    // No uncaught runtime errors should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Edge case: invalid input (non-numeric) shows alert and prevents sorting
  test('Edge case: invalid input shows alert and prevents sorting', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.go();

    // Capture dialog text
    let dialogText = null;
    page.once('dialog', dlg => {
      dialogText = dlg.message();
      dlg.accept();
    });

    // Set invalid input and click sort
    await qs.setInputValue('1, 2, abc, 4');
    await qs.clickSort();

    // Expect alert about invalid input
    await page.waitForTimeout(200);
    expect(dialogText).toBe('Invalid input detected. Please enter only numbers separated by commas.');

    // Ensure sorting did NOT start
    expect(await qs.isSortButtonDisabled()).toBe(false);
    expect(await qs.isInputDisabled()).toBe(false);

    const stepsText = await qs.getStepsText();
    expect(stepsText).not.toContain('Starting Quick Sort');

    // No uncaught runtime errors should have occurred
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  // Inspect console & page errors more broadly: capture any ReferenceError/SyntaxError/TypeError if they appear
  test('Runtime: observe console and page errors (report any ReferenceError/SyntaxError/TypeError)', async ({ page }) => {
    const qs = new QuickSortPage(page);
    await qs.go();

    // Start arrays to collect
    const observedPageErrors = [];
    const observedConsoleErrors = [];

    page.on('pageerror', err => {
      observedPageErrors.push(String(err && err.message ? err.message : err));
    });
    page.on('console', msg => {
      if (msg.type() === 'error') observedConsoleErrors.push(msg.text());
    });

    // Trigger one complete run to maximize chance of surfacing runtime errors if any
    await qs.clickSort();
    await qs.waitForSortedMarker(100000);

    // Consolidate captured errors
    // We assert that no unexpected error types are present.
    // If any errors occurred they should be captured; we test that none of them are SyntaxError/ReferenceError/TypeError
    // This follows the instruction to observe and assert on runtime errors as they naturally occur.
    const combined = observedPageErrors.concat(observedConsoleErrors);

    // If errors exist, they should be string messages; assert they do not indicate SyntaxError/ReferenceError/TypeError
    for (const errMsg of combined) {
      expect(typeof errMsg).toBe('string');
      // Fail the test if we detect a SyntaxError/ReferenceError/TypeError in the captured messages
      const lower = errMsg.toLowerCase();
      expect(lower).not.toContain('syntaxerror');
      expect(lower).not.toContain('referenceerror');
      expect(lower).not.toContain('typeerror');
    }

    // Also assert that by default no page errors or console errors were captured
    expect(observedPageErrors.length).toBe(0);
    expect(observedConsoleErrors.length).toBe(0);
  });
});