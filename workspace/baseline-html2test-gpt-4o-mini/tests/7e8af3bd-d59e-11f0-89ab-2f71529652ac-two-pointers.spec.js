import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8af3bd-d59e-11f0-89ab-2f71529652ac.html';

// Page Object for the Two Pointers application
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.targetInput = page.locator('#targetInput');
    this.findButton = page.locator('#findPairsButton');
    this.resultDiv = page.locator('#resultDiv');
  }

  // Navigate to the application
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  // Fill array input (string like "1,2,3")
  async fillArray(value) {
    await this.arrayInput.fill(value);
  }

  // Fill target input (number or string)
  async fillTarget(value) {
    await this.targetInput.fill(String(value));
  }

  // Click the Find Pairs button
  async clickFind() {
    await this.findButton.click();
  }

  // Retrieve result text
  async getResultText() {
    return (await this.resultDiv.textContent()) ?? '';
  }

  // Helpers to assert visibility / enabled state
  async isFindButtonVisible() {
    return await this.findButton.isVisible();
  }

  async isFindButtonEnabled() {
    return await this.findButton.isEnabled();
  }
}

test.describe('Two Pointers Technique App - Basic UI and behavior', () => {
  // Keep console messages and page errors to assert no unexpected errors occur
  test.beforeEach(async ({ page }) => {
    // Nothing here; each test will attach listeners and navigate using the page object
  });

  test('Initial load: inputs empty, result area blank, button visible and enabled', async ({ page }) => {
    // Capture console messages and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const app = new TwoPointersPage(page);
    await app.goto();

    // Verify inputs exist and are empty by default
    await expect(app.arrayInput).toHaveValue('');
    await expect(app.targetInput).toHaveValue('');

    // Verify result area is empty at load
    await expect(app.resultDiv).toHaveText('', { timeout: 1000 });

    // Verify button is visible and enabled
    expect(await app.isFindButtonVisible()).toBe(true);
    expect(await app.isFindButtonEnabled()).toBe(true);

    // Assert that no console errors or page errors were emitted during load
    const errorConsole = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole, `No console.error should be emitted on page load. Found: ${JSON.stringify(consoleMessages)}`).toBeUndefined();
    expect(pageErrors, `No page errors should be emitted on page load.`).toHaveLength(0);
  });
});

test.describe('Two Pointers Technique App - Functional tests and edge cases', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize arrays to collect console and page errors for each test
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    // Navigate fresh for each test
    const app1 = new TwoPointersPage(page);
    await app.goto();
  });

  // Test: typical case with multiple pairs
  test('Finds multiple pairs in a sorted array', async ({ page }) => {
    // Purpose: Verify correct pairs are found and displayed for a typical sorted input
    const app2 = new TwoPointersPage(page);

    await app.fillArray('1,2,3,4,5');
    await app.fillTarget('6');
    await app.clickFind();

    // Expect two pairs: (1, 5) and (2, 4)
    const result = await app.getResultText();
    expect(result).toBe('Found pairs: (1, 5), (2, 4)');

    // Ensure no runtime errors during the interaction
    const errorConsole1 = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole, `No console.error should be emitted during find operation. Messages: ${JSON.stringify(consoleMessages)}`).toBeUndefined();
    expect(pageErrors, 'No page errors should be emitted during find operation.').toHaveLength(0);
  });

  // Test: no pairs found scenario
  test('Displays "No pairs found." when there are no matching pairs', async ({ page }) => {
    // Purpose: Verify the UI shows correct message when no pairs sum to the target
    const app3 = new TwoPointersPage(page);

    await app.fillArray('1,2,3');
    await app.fillTarget('10');
    await app.clickFind();

    const result1 = await app.getResultText();
    expect(result).toBe('No pairs found.');

    // No errors expected
    const errorConsole2 = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole).toBeUndefined();
    expect(pageErrors).toHaveLength(0);
  });

  // Test: array with duplicate values produces multiple pairs including duplicate pairs
  test('Handles duplicate values and returns multiple pairs including duplicates', async ({ page }) => {
    // Purpose: Ensure duplicates in sorted array are processed and returned as separate pairs when appropriate
    const app4 = new TwoPointersPage(page);

    await app.fillArray('1,1,2,3,4,4');
    await app.fillTarget('5');
    await app.clickFind();

    // As implemented, expected pairs: (1, 4), (1, 4), (2, 3)
    const result2 = await app.getResultText();
    expect(result).toBe('Found pairs: (1, 4), (1, 4), (2, 3)');

    // No runtime errors
    const errorConsole3 = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole).toBeUndefined();
    expect(pageErrors).toHaveLength(0);
  });

  // Edge Case: empty array input (user leaves array input blank)
  test('Empty array input results in "No pairs found."', async ({ page }) => {
    // Purpose: Validate behavior when array input is empty string
    const app5 = new TwoPointersPage(page);

    // Leave array input empty; set a target
    await app.fillArray('');
    await app.fillTarget('5');
    await app.clickFind();

    const result3 = await app.getResultText();
    // Implementation splits '' into [''] -> Number('') => 0? Actually Number('') === 0, but since the actual implementation uses map(Number) on split('') it results in [NaN] only if split yields ['']? In browsers Number('') is 0. However we must not alter behavior; assert what's observed.
    // To be robust to the implementation nuances, accept either "No pairs found." or "Found pairs: " followed by something — but requirement asks to assert expected behavior.
    // Observed expected in this app: No pairs found.
    expect(result).toBe('No pairs found.');

    const errorConsole4 = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole).toBeUndefined();
    expect(pageErrors).toHaveLength(0);
  });

  // Edge Case: non-numeric array entries (e.g., letters)
  test('Non-numeric array entries do not crash the app and produce "No pairs found."', async ({ page }) => {
    // Purpose: Ensure non-numeric inputs are tolerated and do not produce runtime exceptions
    const app6 = new TwoPointersPage(page);

    await app.fillArray('a,b,c');
    await app.fillTarget('5');
    await app.clickFind();

    const result4 = await app.getResultText();
    expect(result).toBe('No pairs found.');

    const errorConsole5 = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole).toBeUndefined();
    expect(pageErrors).toHaveLength(0);
  });

  // Accessibility/interaction test: button click via keyboard (Enter) when focused
  test('Button can be focused and clicked - keyboard interaction (Enter) triggers search', async ({ page }) => {
    // Purpose: Verify keyboard activation of the button triggers the same action as mouse click
    const app7 = new TwoPointersPage(page);

    await app.fillArray('1,2,3,4');
    await app.fillTarget('5');

    // Focus the button and press Enter
    await app.findButton.focus();
    await page.keyboard.press('Enter');

    // Expect pair (1,4) and (2,3)
    const result5 = await app.getResultText();
    // With array 1,2,3,4 and target 5 -> pairs (1,4), (2,3)
    expect(result).toBe('Found pairs: (1, 4), (2, 3)');

    const errorConsole6 = consoleMessages.find(m => m.type === 'error');
    expect(errorConsole).toBeUndefined();
    expect(pageErrors).toHaveLength(0);
  });
});