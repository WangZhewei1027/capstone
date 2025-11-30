import { test, expect } from '@playwright/test';

// Page Object Model for the Merge Sort page
class MergeSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e03a205a-cd32-11f0-a949-f901cf5609c9.html';
    this.arrayInput = () => this.page.locator('#arrayInput');
    this.startBtn = () => this.page.locator('#startSort');
    this.errorDiv = () => this.page.locator('#error');
    this.visualization = () => this.page.locator('#visualization');
    this.log = () => this.page.locator('#log');
    this.bars = () => this.page.locator('.bar');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Set input value
  async setInput(value) {
    await this.arrayInput().fill(value);
  }

  // Click the start button
  async clickStart() {
    await this.startBtn().click();
  }

  // Get error text
  async getErrorText() {
    return (await this.errorDiv().innerText()).trim();
  }

  // Get log text
  async getLogText() {
    return (await this.log().innerText());
  }

  // Get array of bar texts
  async getBarTexts() {
    return await this.bars().allTextContents();
  }

  // Count number of bars
  async countBars() {
    return await this.bars().count();
  }
}

// Capture console and page errors for each test run
test.describe('Merge Sort Visualization - e03a205a-cd32-11f0-a949-f901cf5609c9', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Collect runtime page errors (uncaught exceptions)
    page.on('pageerror', err => {
      // store the error message for assertions later
      pageErrors.push(err);
    });

    // Collect console messages for inspection
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // Basic sanity: ensure our error and console arrays are at least defined
    expect(Array.isArray(pageErrors)).toBeTruthy();
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  // Test initial page load and default state
  test('should load the page and show initial UI elements', async ({ page }) => {
    const mergePage = new MergeSortPage(page);
    await mergePage.goto();

    // Verify input, button, visualization, and log exist and are visible
    await expect(mergePage.arrayInput()).toBeVisible();
    await expect(mergePage.startBtn()).toBeVisible();
    await expect(mergePage.visualization()).toBeVisible();
    await expect(mergePage.log()).toBeVisible();

    // Input should have the correct placeholder
    await expect(mergePage.arrayInput()).toHaveAttribute('placeholder', 'Enter integers separated by commas');

    // No error message initially
    await expect(mergePage.errorDiv()).toBeEmpty();

    // Visualization should be empty (no bar elements) initially
    const initialBars = await mergePage.countBars();
    expect(initialBars).toBe(0);

    // Log should initially be empty
    const initialLog = await mergePage.getLogText();
    expect(initialLog.trim()).toBe('');

    // No runtime page errors should have been recorded so far
    expect(pageErrors.length).toBe(0);
  });

  // Test empty input handling
  test('should show an error when Start Merge Sort is clicked with empty input', async ({ page }) => {
    const mergePage1 = new MergeSortPage(page);
    await mergePage.goto();

    // Ensure input is empty then click start
    await mergePage.setInput('');
    await mergePage.clickStart();

    // Expect the specific error message for empty input
    await expect(mergePage.errorDiv()).toHaveText('Please enter some numbers separated by commas.');

    // Ensure no bars were created and log remains empty
    expect(await mergePage.countBars()).toBe(0);
    expect((await mergePage.getLogText()).trim()).toBe('');

    // No uncaught page errors should have happened
    expect(pageErrors.length).toBe(0);
  });

  // Test invalid number input handling
  test('should show an error for invalid number tokens in the input', async ({ page }) => {
    const mergePage2 = new MergeSortPage(page);
    await mergePage.goto();

    // Enter invalid token "two"
    await mergePage.setInput('1, two, 3');
    await mergePage.clickStart();

    // Expect invalid number error mentioning the offending token
    await expect(mergePage.errorDiv()).toHaveText('Invalid number: "two"');

    // Ensure no bars were created
    expect(await mergePage.countBars()).toBe(0);

    // No uncaught page errors should have happened
    expect(pageErrors.length).toBe(0);
  });

  // Test input with only separators => no valid numbers
  test('should detect "No valid numbers found." when input contains only separators or blanks', async ({ page }) => {
    const mergePage3 = new MergeSortPage(page);
    await mergePage.goto();

    // Enter only commas and spaces
    await mergePage.setInput(' , ,   , ');
    await mergePage.clickStart();

    // Expect the specific message
    await expect(mergePage.errorDiv()).toHaveText('No valid numbers found.');

    // Ensure no bars were created and log empty
    expect(await mergePage.countBars()).toBe(0);
    expect((await mergePage.getLogText()).trim()).toBe('');

    expect(pageErrors.length).toBe(0);
  });

  // Test the 50+ numbers edge case
  test('should show error for more than 50 numbers input', async ({ page }) => {
    const mergePage4 = new MergeSortPage(page);
    await mergePage.goto();

    // Construct a CSV string of 51 numbers
    const fiftyOne = Array.from({ length: 51 }, (_, i) => i + 1).join(',');
    await mergePage.setInput(fiftyOne);
    await mergePage.clickStart();

    await expect(mergePage.errorDiv()).toHaveText('Please enter 50 or fewer numbers for better visualization.');

    // No bars created
    expect(await mergePage.countBars()).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Comprehensive test: perform a full merge sort and validate DOM updates and final order
  test('should perform merge sort on a small array and update visualization and log accordingly', async ({ page }) => {
    const mergePage5 = new MergeSortPage(page);
    await mergePage.goto();

    // Use a small array to keep the test timely
    await mergePage.setInput('3,1,2');

    // Start sorting
    await mergePage.clickStart();

    // Immediately after clicking start, there should be no error
    await expect(mergePage.errorDiv()).toBeEmpty();

    // Shortly after starting, the visualization should show bars for the initial array
    // createBars(arr) is called before the first delay, so wait up to 1500ms for bars to appear
    await expect.poll(async () => await mergePage.countBars(), { timeout: 1500 }).toBe(3);

    // The log should contain "Starting Merge Sort" soon after
    await expect.poll(async () => await mergePage.getLogText(), { timeout: 2000 }).toContain('Starting Merge Sort');

    // Wait for the algorithm to complete. The implementation uses delays, so allow ample timeout.
    // We poll the #log for the final completion message.
    await expect.poll(async () => await mergePage.getLogText(), {
      timeout: 12000,
      message: 'Timed out waiting for Merge Sort Completed! log entry'
    }).toContain('Merge Sort Completed!');

    // After completion, three bars should remain and represent the sorted sequence 1,2,3
    const finalBars = await mergePage.getBarTexts();
    // bars show the numeric text content; ensure they are in ascending order
    expect(finalBars).toEqual(['1', '2', '3']);

    // The log should contain details about merges and placements
    const logText = await mergePage.getLogText();
    expect(logText).toContain('Merging subarrays');
    expect(logText).toContain('Placed');
    expect(logText).toContain('Merge Sort Completed!');

    // No uncaught page errors should have happened during this interaction
    expect(pageErrors.length).toBe(0);
  });

  // Test that visualization updates (classes) are applied during merges.
  // This test attempts to catch transient class application during the sort.
  test('should apply comparing/merging classes on bars during merge steps (transient check)', async ({ page }) => {
    const mergePage6 = new MergeSortPage(page);
    await mergePage.goto();

    // Use a simple 2-element array so there is a single merge step and predictable timing
    await mergePage.setInput('2,1');

    // Start sorting
    await mergePage.clickStart();

    // Wait for bars to appear
    await expect.poll(async () => await mergePage.countBars(), { timeout: 1500 }).toBe(2);

    // During the merge, createBars is called with highlightIndices and mergeIndices before a delay(500).
    // We'll poll briefly to detect at least one bar with .comparing or .merging class.
    // Because classes are transient, apply a short polling window.
    const sawComparingOrMerging = await expect.poll(async () => {
      const comparing = await page.locator('.bar.comparing').count();
      const merging = await page.locator('.bar.merging').count();
      return (comparing + merging) > 0;
    }, { timeout: 3000 }).toBeTruthy();

    // After completion, ensure sorted order is correct
    await expect.poll(async () => await mergePage.getLogText(), { timeout: 10000 }).toContain('Merge Sort Completed!');
    const finalBars1 = await mergePage.getBarTexts();
    expect(finalBars).toEqual(['1', '2']);

    // Ensure no runtime errors occurred
    expect(pageErrors.length).toBe(0);
  });
});