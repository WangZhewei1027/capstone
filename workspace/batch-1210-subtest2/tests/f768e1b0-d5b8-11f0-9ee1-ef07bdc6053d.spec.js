import { test, expect } from '@playwright/test';

// URL where the HTML is served
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f768e1b0-d5b8-11f0-9ee1-ef07bdc6053d.html';

/**
 * Page Object for the Two Pointers demo.
 * Encapsulates interactions and queries for clarity and reuse.
 */
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.findButton = page.locator('#findPairs');
    this.result = page.locator('#result');

    // containers for console and page error observations
    this.consoleMessages = [];
    this.pageErrors = [];
  }

  // Attach listeners to capture console messages and page errors
  attachErrorObservers() {
    this.page.on('console', (msg) => {
      // store console messages for later assertions
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    this.page.on('pageerror', (err) => {
      // store runtime errors thrown on the page
      this.pageErrors.push(err);
    });
  }

  // Navigate to the app and wait for basic UI to be available
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main controls to be present
    await Promise.all([
      this.arrayInput.waitFor({ state: 'visible' }),
      this.targetInput.waitFor({ state: 'visible' }),
      this.findButton.waitFor({ state: 'visible' }),
      this.result.waitFor({ state: 'visible' })
    ]);
  }

  // Input the array string into the array input
  async setArray(arrayString) {
    await this.arrayInput.fill(arrayString);
  }

  // Input the target value into the target input (string or number)
  async setTarget(targetString) {
    await this.targetInput.fill(String(targetString));
  }

  // Click the Find Pairs button
  async clickFind() {
    await this.findButton.click();
  }

  // Return trimmed result text
  async getResultText() {
    return (await this.result.innerText()).trim();
  }

  // Helpers to access captured logs/errors
  getConsoleErrors() {
    return this.consoleMessages.filter(m => m.type === 'error');
  }

  getAllConsoleMessages() {
    return this.consoleMessages;
  }

  getPageErrors() {
    return this.pageErrors;
  }
}

// Group related tests
test.describe('Two Pointers Technique - End-to-End (FSM validation)', () => {
  // Shared page-object for each test
  let twoPointers;

  // Setup + attach observers before each test
  test.beforeEach(async ({ page }) => {
    twoPointers = new TwoPointersPage(page);
    twoPointers.attachErrorObservers();
    await twoPointers.goto();
  });

  // Teardown assertions can be done in afterEach if desired
  test.afterEach(async () => {
    // Ensure no unexpected severe page errors were produced across tests by default.
    // Tests that expect errors should perform their own assertions.
    const pageErrors = twoPointers.getPageErrors();
    expect(pageErrors.length).toBe(0);
  });

  test('Initial render (S0_Idle) shows inputs, button and empty result', async () => {
    // Validate presence of UI components and that result is initially empty
    await expect(twoPointers.arrayInput).toBeVisible();
    await expect(twoPointers.targetInput).toBeVisible();
    await expect(twoPointers.findButton).toBeVisible();

    const initialResult = await twoPointers.getResultText();
    // The initial result area is expected to be empty (or whitespace)
    expect(initialResult).toBe('');

    // Validate that the FSM-specified onEnter action "renderPage()" is not present on the global scope
    // We do NOT inject or patch anything; we simply observe the environment
    // If renderPage had been called on load and missing, a ReferenceError would have been captured via pageerror.
    // Here we explicitly assert the function is undefined on window (non-invasive check).
    const renderPageType = await twoPointers.page.evaluate(() => typeof window.renderPage);
    expect(renderPageType).toBe('undefined');

    // Ensure no console errors were emitted during initial render
    expect(twoPointers.getConsoleErrors().length).toBe(0);
  });

  test('Find Pairs - pair exists (Transition: S0_Idle -> S1_PairsFound)', async () => {
    // This validates the positive transition where a pair is found.
    // Use a sorted array where a valid pair exists: [1,2,3,4,6], target 6 -> 2 + 4 = 6
    await twoPointers.setArray('1,2,3,4,6');
    await twoPointers.setTarget(6);

    // Click the button to trigger the algorithm
    await twoPointers.clickFind();

    // Verify the DOM result contains the expected pair text
    const resultText = await twoPointers.getResultText();
    expect(resultText).toContain('Pair found');
    // Expect the specific pair discovered by two-pointer algorithm (2 + 4 = 6)
    expect(resultText).toBe('Pair found: 2 + 4 = 6');

    // No runtime errors expected for normal flow
    expect(twoPointers.getPageErrors().length).toBe(0);
    expect(twoPointers.getConsoleErrors().length).toBe(0);
  });

  test('Find Pairs - no pair found (Transition: S0_Idle -> S2_NoPairsFound)', async () => {
    // This validates the negative transition where no pair exists.
    // Use array [1,2,3,9] and target 8 -> no two numbers sum to 8
    await twoPointers.setArray('1,2,3,9');
    await twoPointers.setTarget(8);

    await twoPointers.clickFind();

    const resultText = await twoPointers.getResultText();
    expect(resultText).toBe('No pairs found.');

    expect(twoPointers.getPageErrors().length).toBe(0);
    expect(twoPointers.getConsoleErrors().length).toBe(0);
  });

  test('Edge case: empty array input should result in "No pairs found."', async () => {
    // Edge: empty array string and valid target
    await twoPointers.setArray('');
    await twoPointers.setTarget(5);

    await twoPointers.clickFind();

    const resultText = await twoPointers.getResultText();
    expect(resultText).toBe('No pairs found.');

    // No runtime errors are expected even if inputs are empty or invalid; the implementation filters NaN
    expect(twoPointers.getPageErrors().length).toBe(0);
  });

  test('Edge case: non-numeric input -> filtered out -> No pairs found', async () => {
    // Input non-numeric tokens; they should be filtered out by map+filter -> resulting array likely empty
    await twoPointers.setArray('a,b,c');
    await twoPointers.setTarget(5);

    await twoPointers.clickFind();

    const resultText = await twoPointers.getResultText();
    expect(resultText).toBe('No pairs found.');

    // Ensure the page didn't throw a runtime error when parsing invalid numbers
    const pageErrors = twoPointers.getPageErrors();
    expect(pageErrors.length).toBe(0);

    // Also ensure there are no console.error messages captured for this flow
    expect(twoPointers.getConsoleErrors().length).toBe(0);
  });

  test('Edge case: single element array should not find a pair', async () => {
    // Single number cannot form a pair
    await twoPointers.setArray('5');
    await twoPointers.setTarget(10);

    await twoPointers.clickFind();

    const resultText = await twoPointers.getResultText();
    expect(resultText).toBe('No pairs found.');

    expect(twoPointers.getPageErrors().length).toBe(0);
  });

  test('Sanity: observe console messages and page errors across interactions', async () => {
    // Perform several actions and then inspect captured console messages and errors
    await twoPointers.setArray('1,2,3,4,6');
    await twoPointers.setTarget(7); // 1 + 6 = 7
    await twoPointers.clickFind();

    await twoPointers.setArray('10,20,30');
    await twoPointers.setTarget(100);
    await twoPointers.clickFind();

    await twoPointers.setArray('');
    await twoPointers.setTarget('');
    await twoPointers.clickFind();

    // No unhandled exceptions expected across these valid interactions
    const pageErrors = twoPointers.getPageErrors();
    expect(pageErrors.length).toBe(0);

    // If any console messages of type 'error' appeared, surface them in assertion failure message
    const consoleErrors = twoPointers.getConsoleErrors();
    expect(consoleErrors.length).toBe(0);
  });

  test('Validate that missing or unexpected global functions (like renderPage) did not cause runtime errors', async () => {
    // The FSM mentions an entry action renderPage() for S0_Idle.
    // The page DOES NOT call renderPage(), and window.renderPage is undefined.
    // Verify that: typeof window.renderPage === "undefined" and no ReferenceError was thrown.
    const renderPageType = await twoPointers.page.evaluate(() => typeof window.renderPage);
    expect(renderPageType).toBe('undefined');

    // Ensure that if renderPage had been invoked without being defined, we'd have captured a pageerror;
    // assert there were none.
    expect(twoPointers.getPageErrors().length).toBe(0);
  });
});