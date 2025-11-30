import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2afb4-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object Model for the Insertion Sort visualization page
class InsertionSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.startBtn = page.locator('#startBtn');
    this.barContainer = page.locator('#barContainer');
    this.info = page.locator('#info');
    this.footer = page.locator('#footer');
  }

  // Returns locator for all bar elements
  bars() {
    return this.page.locator('#barContainer .bar');
  }

  // Returns locator for a specific bar by index
  barAt(index) {
    return this.page.locator(`#barContainer .bar`).nth(index);
  }

  // Helper to get all bar labels as text array
  async getBarLabels() {
    const count = await this.bars().count();
    const labels = [];
    for (let i = 0; i < count; i++) {
      const label = await this.barAt(i).locator('.bar-label').innerText();
      labels.push(label);
    }
    return labels;
  }

  // Click start button
  async clickStart() {
    await this.startBtn.click();
  }

  // Set array input value
  async setInput(value) {
    await this.arrayInput.fill(value);
  }

  // Returns array of boolean flags for classes on bars
  async getBarClasses(index) {
    const classes = await this.barAt(index).getAttribute('class');
    return (classes || '').split(/\s+/).filter(Boolean);
  }
}

test.describe('Insertion Sort Visualization - Application Tests', () => {
  let consoleMessages = [];
  let pageErrors = [];
  let consoleHandler;
  let pageErrorHandler;

  // Attach console and pageerror listeners for each test to record runtime issues
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    consoleHandler = (msg) => {
      // Collect console messages for later assertions / diagnostics
      // We include the type and text for clarity
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    };
    pageErrorHandler = (err) => {
      // Collect uncaught exceptions from the page
      pageErrors.push(err);
    };

    page.on('console', consoleHandler);
    page.on('pageerror', pageErrorHandler);

    // Navigate to the application page under test
    await page.goto(APP_URL);
  });

  test.afterEach(async ({ page }) => {
    // Ensure listeners are cleaned up to avoid leakage between tests
    page.off('console', consoleHandler);
    page.off('pageerror', pageErrorHandler);
  });

  test('Initial page load shows default input and renders bars correctly', async ({ page }) => {
    // Purpose: Verify the initial DOM contains expected elements and default state
    const app = new InsertionSortPage(page);

    // Check page title
    await expect(page).toHaveTitle(/Insertion Sort Visualization/);

    // Verify input default value
    await expect(app.arrayInput).toHaveValue('5,3,8,6,2,7,4,1');

    // 'Start Sort' button should be enabled initially
    await expect(app.startBtn).toBeEnabled();

    // Info area should be empty at initial load
    await expect(app.info).toHaveText('');

    // There should be 8 bars rendered for the default array
    const barCount = await app.bars().count();
    expect(barCount).toBe(8);

    // Validate bar labels match the default array values and title attributes match values
    const expected = ['5','3','8','6','2','7','4','1'];
    const labels1 = await app.getBarLabels();
    expect(labels).toEqual(expected);

    // Check each bar has a title attribute equal to its numeric value
    for (let i = 0; i < expected.length; i++) {
      const bar = app.barAt(i);
      const title = await bar.getAttribute('title');
      expect(title).toBe(expected[i]);
    }

    // Ensure no uncaught page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking Start Sort disables controls and highlights the initial key', async ({ page }) => {
    // Purpose: Validate that clicking start begins the algorithm, disables controls,
    // and the first key is highlighted as expected.
    const app1 = new InsertionSortPage(page);

    // Start sorting
    await app.clickStart();

    // After clicking, the start button and input should be disabled immediately
    await expect(app.startBtn).toBeDisabled();
    await expect(app.arrayInput).toBeDisabled();

    // The info text should contain selecting key for index 1 (the first pass)
    await expect(app.info).toHaveText(/Selecting key = \d+ at index 1/);

    // Bar at index 1 should have the 'highlight' class
    const classes1 = await app.getBarClasses(1);
    expect(classes).toContain('highlight');

    // Wait for a compared highlight to appear (some time into the sort)
    // We allow up to 5000ms to account for the built-in delays in the visualization
    await page.waitForFunction(() => {
      const bars = Array.from(document.querySelectorAll('#barContainer .bar'));
      return bars.some(b => b.classList.contains('compared'));
    }, { timeout: 5000 });

    // Confirm that at least one bar is in compared state
    const anyCompared = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#barContainer .bar')).some(b => b.classList.contains('compared'));
    });
    expect(anyCompared).toBe(true);

    // Reload the page to reset state for subsequent tests (since sorting is ongoing)
    await page.reload();

    // Ensure no uncaught page errors occurred during this interaction
    expect(pageErrors.length).toBe(0);
  });

  test('Invalid input (non-numeric) triggers an alert and does not start sorting', async ({ page }) => {
    // Purpose: Ensure invalid inputs are handled by alert dialogs and sorting does not start
    const app2 = new InsertionSortPage(page);

    // Prepare to handle dialog
    let dialogMessage = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Set invalid input and click start
    await app.setInput('a,2,3');
    await app.clickStart();

    // The application should show an alert about invalid input
    // Wait briefly for dialog handler to run
    await page.waitForTimeout(200);
    expect(dialogMessage).toMatch(/Invalid input: please enter only numbers separated by commas./);

    // The start button should remain enabled because sorting should not have started
    await expect(app.startBtn).toBeEnabled();
    await expect(app.arrayInput).toBeEnabled();

    // No uncaught page errors should have occurred
    expect(pageErrors.length).toBe(0);
  });

  test('Empty input triggers an alert and sorting is not started', async ({ page }) => {
    // Purpose: Verify that submitting an empty input shows an alert and prevents sorting
    const app3 = new InsertionSortPage(page);

    let dialogMessage1 = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Clear input and click start
    await app.setInput('');
    await app.clickStart();

    // Wait a short time for the alert to be shown and handled
    await page.waitForTimeout(200);
    expect(dialogMessage).toBe('Please enter some numbers separated by commas.');

    // Controls should still be enabled after rejecting the invalid submission
    await expect(app.startBtn).toBeEnabled();
    await expect(app.arrayInput).toBeEnabled();

    // Confirm no runtime page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Too few numbers triggers an alert requesting at least two numbers', async ({ page }) => {
    // Purpose: Validate edge case where user provides fewer than two numbers
    const app4 = new InsertionSortPage(page);

    let dialogMessage2 = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await app.setInput('5');
    await app.clickStart();

    // Wait for the dialog to be handled
    await page.waitForTimeout(200);
    expect(dialogMessage).toBe('Please enter at least two numbers to sort.');

    // Ensure controls remain enabled
    await expect(app.startBtn).toBeEnabled();
    await expect(app.arrayInput).toBeEnabled();

    // Confirm no runtime page errors
    expect(pageErrors.length).toBe(0);
  });

  test('Sorting a two-element array completes and results in sorted output', async ({ page }) => {
    // Purpose: Use a small input that will finish quickly and assert final sorted state
    const app5 = new InsertionSortPage(page);

    // Use a minimal array so the visualization completes during the test
    await app.setInput('2,1');
    await app.clickStart();

    // During sorting, controls are disabled
    await expect(app.startBtn).toBeDisabled();
    await expect(app.arrayInput).toBeDisabled();

    // Wait for the algorithm to finish: the app sets info.textContent = 'Array is sorted!' at the end
    await page.waitForFunction(() => document.querySelector('#info')?.textContent === 'Array is sorted!', { timeout: 5000 });

    // After completion, controls should be enabled again
    await expect(app.startBtn).toBeEnabled();
    await expect(app.arrayInput).toBeEnabled();

    // Verify the bar labels reflect sorted order [1,2]
    const labels2 = await app.getBarLabels();
    expect(labels).toEqual(['1','2']);

    // The info area should indicate completion
    await expect(app.info).toHaveText('Array is sorted!');

    // Confirm no uncaught errors occurred during the sorting process
    expect(pageErrors.length).toBe(0);
  });

  test('Footer text and accessibility-related attributes are present', async ({ page }) => {
    // Purpose: Simple accessibility/visibility checks for static content
    const app6 = new InsertionSortPage(page);

    // Footer contains explanatory text
    await expect(app.footer).toContainText('Visualization highlights the current key (orange)');

    // Ensure all bars have title attributes (useful for screen readers / hover)
    const barCount1 = await app.bars().count();
    for (let i = 0; i < barCount; i++) {
      const title1 = await app.barAt(i).getAttribute('title1');
      expect(title).not.toBeNull();
      expect(title).not.toBe('');
    }

    // Ensure no page errors were recorded
    expect(pageErrors.length).toBe(0);
  });
});