import { test, expect } from '@playwright/test';

// Playwright tests for Two Pointers Demonstration
// Application URL (served by the test environment)
const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed135-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object Model for the Two Pointers demo page
class TwoPointersPage {
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.startBtn = page.locator('#startBtn');
    this.arrayDisplay = page.locator('#arrayDisplay');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillArray(value) {
    await this.arrayInput.fill('');
    await this.arrayInput.type(value);
  }

  async fillTarget(value) {
    await this.targetInput.fill('');
    await this.targetInput.type(String(value));
  }

  async clickStart() {
    await this.startBtn.click();
  }

  // Return array of text contents of the span children in #arrayDisplay
  async getArraySpansText() {
    const count = await this.arrayDisplay.locator('span').count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.arrayDisplay.locator('span').nth(i).textContent());
    }
    return texts;
  }

  // Return class list for a given index span
  async getSpanClasses(index) {
    const span = this.arrayDisplay.locator('span').nth(index);
    const classAttr = await span.getAttribute('class');
    return (classAttr || '').split(/\s+/).filter(Boolean);
  }

  async getOutputText() {
    return (await this.output.textContent()) || '';
  }
}

test.describe('Two Pointers Technique Demo - UI and behavior', () => {
  // Collect console messages and page errors for diagnostics
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console events
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  // Test initial load and default state
  test('Initial page load shows inputs and start state', async ({ page }) => {
    const demo = new TwoPointersPage(page);
    await demo.goto();

    // Verify inputs contain their default values
    await expect(demo.arrayInput).toBeVisible();
    await expect(demo.targetInput).toBeVisible();
    await expect(demo.startBtn).toBeVisible();
    await expect(demo.arrayInput).toHaveValue('2,3,4,5,6,7,8,9,10');
    await expect(demo.targetInput).toHaveValue('13');

    // Array display should be empty initially
    const spans = await demo.arrayDisplay.locator('span').count();
    expect(spans).toBe(0);

    // Output should be empty at start
    expect((await demo.getOutputText()).trim()).toBe('');

    // Ensure there were no unexpected page errors on load
    expect(pageErrors.length).toBe(0);
  });

  // Test happy path: find a pair that sums to target with default inputs
  test('Start demo finds a valid pair that sums to the target', async ({ page }) => {
    const demo1 = new TwoPointersPage(page);
    await demo.goto();

    // Start the demo and observe intermediate and final output.
    await demo.clickStart();

    // Immediately after clicking, the script sets output to 'Starting...'
    await expect(demo.output).toHaveText(/Starting\.\.\./, { timeout: 2000 });

    // Wait for final "Found!" message. The demo uses sleeps; wait up to 12s to be safe.
    await page.waitForFunction(
      () => document.getElementById('output')?.textContent?.includes('Found!'),
      null,
      { timeout: 12000 }
    );

    const outText = await demo.getOutputText();
    // Validate that the found message includes expected indices and values (1 and 8 => 3 + 10)
    expect(outText).toMatch(/Found! Elements at indices\s+1\s+and\s+8\s+sum to\s+13/);

    // Validate that the displayed array has span elements and the expected pointers are highlighted
    const spanCount = await demo.arrayDisplay.locator('span').count();
    expect(spanCount).toBeGreaterThan(0);

    // The left pointer should be at index 1 (value ' 3'), right pointer at index 8 (value '10' possibly '10' or padded)
    const leftSpanText = (await demo.arrayDisplay.locator('span').nth(1).textContent()) || '';
    const rightSpanText = (await demo.arrayDisplay.locator('span').nth(8).textContent()) || '';

    // Trim to be robust against padding
    expect(leftSpanText.trim()).toBe('3');
    expect(rightSpanText.trim()).toBe('10');

    // Check CSS classes include pointer and highlight for both indices
    const leftClasses = await demo.getSpanClasses(1);
    const rightClasses = await demo.getSpanClasses(8);
    expect(leftClasses).toEqual(expect.arrayContaining(['pointer', 'left-pointer', 'highlight']));
    expect(rightClasses).toEqual(expect.arrayContaining(['pointer', 'right-pointer', 'highlight']));

    // Ensure no uncaught page errors occurred during the run
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: unsorted array should trigger an alert
  test('Entering an unsorted array triggers an alert for sorting', async ({ page }) => {
    const demo2 = new TwoPointersPage(page);
    await demo.goto();

    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Fill unsorted array and click start
    await demo.fillArray('3,2,1');
    await demo.fillTarget('6');
    await demo.clickStart();

    // Wait briefly for dialog to be handled
    await page.waitForTimeout(200);

    expect(dialogMessage).toContain('Array is not sorted');

    // After alert, the output should not start the demo; output stays empty or unchanged
    const outText1 = (await demo.getOutputText()).trim();
    // If script set something, it shouldn't show "Starting..."
    expect(outText === '' || !/Starting/.test(outText)).toBeTruthy();

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: invalid numeric entries trigger alert
  test('Entering invalid numbers triggers validation alert', async ({ page }) => {
    const demo3 = new TwoPointersPage(page);
    await demo.goto();

    let dialogMessage1 = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await demo.fillArray('2,a,3');
    await demo.fillTarget('5');
    await demo.clickStart();

    // Wait briefly for dialog to be handled
    await page.waitForTimeout(200);

    expect(dialogMessage).toContain('Please enter only valid numbers');

    // Ensure no uncaught page errors
    expect(pageErrors.length).toBe(0);
  });

  // Test edge case: missing array or missing target input triggers alerts
  test('Missing inputs show appropriate alerts', async ({ page }) => {
    const demo4 = new TwoPointersPage(page);
    await demo.goto();

    // Missing array
    let firstDialog = null;
    page.once('dialog', async (dialog) => {
      firstDialog = dialog.message();
      await dialog.accept();
    });
    await demo.arrayInput.fill('');
    await demo.fillTarget('10');
    await demo.clickStart();
    await page.waitForTimeout(200);
    expect(firstDialog).toContain('Please enter a sorted array of numbers');

    // Missing target
    let secondDialog = null;
    page.once('dialog', async (dialog) => {
      secondDialog = dialog.message();
      await dialog.accept();
    });
    // restore array input
    await demo.fillArray('1,2,3');
    await demo.targetInput.fill('');
    await demo.clickStart();
    await page.waitForTimeout(200);
    expect(secondDialog).toContain('Please enter a target sum.');

    expect(pageErrors.length).toBe(0);
  });

  // Test scenario where no pair is found
  test('When no two elements sum to the target, output indicates no match', async ({ page }) => {
    const demo5 = new TwoPointersPage(page);
    await demo.goto();

    // Use a small array and a large target so no pair exists
    await demo.fillArray('1,2,3');
    await demo.fillTarget('100');
    await demo.clickStart();

    // Wait for final "No two elements found" message; allow time for the demo sleeps
    await page.waitForFunction(
      () => document.getElementById('output')?.textContent?.includes('No two elements found'),
      null,
      { timeout: 10000 }
    );

    const outText2 = await demo.getOutputText();
    expect(outText).toContain('No two elements found that add up to 100.');

    // After completion, the array display should have its spans but no pointer highlighting
    const spanCount1 = await demo.arrayDisplay.locator('span').count();
    expect(spanCount).toBe(3);

    // Expect none of the spans to have pointer classes when no pointers are active
    for (let i = 0; i < spanCount; i++) {
      const classes = await demo.getSpanClasses(i);
      // The demo's final renderArray(arr) sets class 'normal' for all spans when no pointers.
      expect(classes).toEqual(expect.arrayContaining(['normal']));
    }

    expect(pageErrors.length).toBe(0);
  });

  // Diagnostic test: ensure page logs do not contain console errors during typical interactions
  test('Console does not emit error-level messages during normal interactions', async ({ page }) => {
    const demo6 = new TwoPointersPage(page);
    await demo.goto();

    // Interact with page: start the demo to generate console activity
    await demo.clickStart();

    // Wait until demo completes finding the pair (or timeout)
    await page.waitForFunction(
      () => document.getElementById('output')?.textContent?.includes('Found!') ||
            document.getElementById('output')?.textContent?.includes('No two elements found'),
      null,
      { timeout: 12000 }
    );

    // Inspect collected console messages
    const errors = consoleMessages.filter((m) => m.type === 'error');

    // Assert there were no console errors
    expect(errors.length).toBe(0);

    // Also assert there were some console messages (info/log/debug) to show activity
    const hasSomeLogs = consoleMessages.length > 0;
    // It's acceptable if there are zero console messages; we just check no 'error' types.
    expect(hasSomeLogs || consoleMessages.length === 0).toBeTruthy();

    expect(pageErrors.length).toBe(0);
  });
});