import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccc5541-d5b5-11f0-899c-75bf12e026a9.html';

/**
 * Page Object for the Linear Search Demonstration app.
 * Encapsulates selectors and common interactions used by tests.
 */
class LinearSearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.searchBtn = page.locator('#searchBtn');
    this.arrayDisplay = page.locator('#arrayDisplay');
    this.stepOutput = page.locator('#stepOutput');
    this.resultDisplay = page.locator('#result');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure main controls are present
    await expect(this.searchBtn).toBeVisible();
    await expect(this.arrayInput).toBeVisible();
    await expect(this.targetInput).toBeVisible();
  }

  async setArray(value) {
    await this.arrayInput.fill('');
    if (value !== '') {
      await this.arrayInput.fill(value);
    }
  }

  async setTarget(value) {
    await this.targetInput.fill('');
    if (value !== '') {
      // targetInput is type=number; fill accepts string
      await this.targetInput.fill(String(value));
    }
  }

  async clickSearch() {
    await this.searchBtn.click();
  }

  async getArrayDisplayHTML() {
    return await this.arrayDisplay.innerHTML();
  }

  async getStepOutputText() {
    return await this.stepOutput.innerText();
  }

  async getResultHTML() {
    return await this.resultDisplay.innerHTML();
  }
}

test.describe('Linear Search Demonstration - FSM states and transitions', () => {
  // Collect console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages
    page.on('console', (msg) => {
      // store text and severity for debugging assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Collect runtime page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test the Idle state (S0_Idle) - initial page load and displayArray entry action
  test('Initial Idle state displays parsed default array without highlights', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Verify initial display was populated by the script's initial displayArray call
    const html = await app.getArrayDisplayHTML();
    // Should include the Array label and the numeric values from default value "4, 2, 7, 1, 3"
    expect(html).toContain('Array:');
    expect(html).toContain('4');
    expect(html).toContain('2');
    expect(html).toContain('7');
    expect(html).toContain('1');
    expect(html).toContain('3');

    // There should be no highlighted element initially (no span.highlight present)
    expect(html).not.toContain('span class="highlight"');

    // Step output and result should be empty at idle
    await expect(app.stepOutput).toBeEmpty();
    await expect(app.resultDisplay).toBeEmpty();

    // Ensure no runtime page errors happened on load
    expect(pageErrors.length).toBe(0);
  });

  // Test Searching transition (S0_Idle -> S1_Searching -> S2_ResultFound)
  test('Searching with a present target goes through Searching and ends in Result Found (S2_ResultFound)', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Prepare to monitor that dialogs do NOT appear unexpectedly
    page.once('dialog', async (dialog) => {
      // If any dialog appears, fail the test by rejecting it after capturing message
      // But still accept to let page continue
      const msg = dialog.message();
      await dialog.accept();
      throw new Error(`Unexpected dialog during positive search test: ${msg}`);
    });

    // Set target that is in the default array (7 at index 2)
    await app.setTarget(7);

    // Click search and immediately assert on-entry behaviors:
    // - Button is disabled while searching
    // - result and step output were cleared at beginning of search
    const clickPromise = app.clickSearch();

    // Immediately after click the click handler sets disabled = true
    await expect(app.searchBtn).toBeDisabled();

    // The Searching state's entry actions clear result and step output and display the array
    // Immediately after clicking, result should be empty (textContent cleared)
    await expect(app.resultDisplay).toBeEmpty();
    await expect(app.stepOutput).toBeEmpty();

    // Now wait for the final "found" result to appear.
    // The app highlights current index as it checks; final result will contain "found at index"
    await expect(app.resultDisplay).toContainText('found at index', { timeout: 10000 });

    // Ensure the correct found message contains the target and index 2
    const resultHTML = await app.getResultHTML();
    expect(resultHTML).toContain('Element');
    expect(resultHTML).toContain('<strong>7</strong>');
    expect(resultHTML).toContain('<strong>2</strong>');

    // The step output should include the "Found target" step
    const steps = await app.getStepOutputText();
    expect(steps).toContain('Found target 7 at index 2');

    // After search completes, search button should be re-enabled
    await expect(app.searchBtn).toBeEnabled();

    // Ensure no runtime page errors occurred during this interaction
    expect(pageErrors.length).toBe(0);
  });

  // Test Searching transition resulting in Result Not Found (S3_ResultNotFound)
  test('Searching with an absent target ends in Result Not Found (S3_ResultNotFound)', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Use a target that's not in the array
    await app.setTarget(999);

    // Click search
    await app.clickSearch();

    // Button should be disabled while searching
    await expect(app.searchBtn).toBeDisabled();

    // Wait for the final not found message
    await expect(app.resultDisplay).toContainText('not found', { timeout: 15000 });

    const resultHTML = await app.getResultHTML();
    expect(resultHTML).toContain('Element');
    expect(resultHTML).toContain('<strong>999</strong>');
    expect(resultHTML).toContain('not found in the array');

    // Step output should include a final message indicating not found
    const steps = await app.getStepOutputText();
    expect(steps).toContain('not found in array');

    // After completion, button should be enabled again
    await expect(app.searchBtn).toBeEnabled();

    // Ensure no runtime page errors occurred during this interaction
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: Empty array input -> alert (error scenario)
  test('Edge case: empty array input triggers an alert and prevents search', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Set array input to empty to trigger validation
    await app.setArray('');

    // Ensure a dialog appears with the expected message
    const dialogPromise = page.waitForEvent('dialog');
    // Set a valid target so the failure is due to empty array only
    await app.setTarget(1);
    await app.clickSearch();

    const dialog = await dialogPromise;
    const msg = dialog.message();
    // Accept the dialog to let the page continue
    await dialog.accept();

    expect(msg).toBe('Please enter a valid array of numbers separated by commas.');

    // Because validation occurs before disabling the search button, it should remain enabled
    await expect(app.searchBtn).toBeEnabled();

    // No page errors should have been thrown
    expect(pageErrors.length).toBe(0);
  });

  // Edge case: Invalid target input -> alert (error scenario)
  test('Edge case: missing/invalid target triggers an alert and prevents search', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Ensure array input is valid
    await app.setArray('4,2,7');

    // Leave target blank to trigger validation
    await app.setTarget('');

    const dialogPromise = page.waitForEvent('dialog');
    await app.clickSearch();

    const dialog = await dialogPromise;
    const msg = dialog.message();
    await dialog.accept();

    expect(msg).toBe('Please enter a valid target number.');

    // Button should remain enabled
    await expect(app.searchBtn).toBeEnabled();

    // No runtime errors were thrown during validation
    expect(pageErrors.length).toBe(0);
  });

  // Validate some of the onEntry/onExit behaviours via DOM observations for S1_Searching
  test('S1_Searching entry actions clear displays then show array without highlights, then show highlights during checks', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Set a target that will be found (7) to observe changes during searching
    await app.setTarget(7);

    // Click search and immediately check that result and stepOutput were cleared
    await app.clickSearch();

    // Immediately after clicking, result and step output should be empty due to entry actions
    await expect(app.resultDisplay).toBeEmpty();
    await expect(app.stepOutput).toBeEmpty();

    // Array display should show array (displayArray(arr, -1) results in no highlight initially)
    // Wait a short time to let the first displayArray(arr, -1) call complete
    await page.waitForTimeout(50);
    const initialArrayHTML = await app.getArrayDisplayHTML();
    expect(initialArrayHTML).toContain('Array:');

    // During the search, the app highlights current index. Wait until we see a highlight span appear.
    // Use a reasonably generous timeout because of the built-in sleep delays.
    await expect(app.arrayDisplay.locator('span.highlight')).toHaveCount(1, { timeout: 10000 });

    // After completion, ensure the final result was displayed
    await expect(app.resultDisplay).toContainText('found at index', { timeout: 10000 });

    // No runtime errors
    expect(pageErrors.length).toBe(0);
  });

  // Monitoring the console and page errors during a standard search
  test('Console and page error monitoring during typical operations', async ({ page }) => {
    const app = new LinearSearchPage(page);
    await app.goto();

    // Clear any previously recorded messages
    // Note: consoleMessages and pageErrors are re-initialized in beforeEach

    // Perform a normal search
    await app.setTarget(7);
    await app.clickSearch();

    // Wait for completion
    await expect(app.resultDisplay).toContainText('found at index', { timeout: 10000 });

    // Assert that no uncaught page errors were recorded
    expect(pageErrors.length).toBe(0);

    // Console may have messages; ensure none are critical errors (type 'error')
    const errorConsoles = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });
});