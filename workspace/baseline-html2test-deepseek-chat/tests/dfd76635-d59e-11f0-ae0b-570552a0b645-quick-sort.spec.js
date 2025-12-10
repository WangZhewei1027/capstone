import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76635-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Quick Sort visualization
class QuickSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Buttons
    this.generateBtn = page.locator('#generateBtn');
    this.startBtn = page.locator('#startBtn');
    this.pauseBtn = page.locator('#pauseBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.stepBtn = page.locator('#stepBtn');

    // Sliders
    this.speedSlider = page.locator('#speedSlider');
    this.sizeSlider = page.locator('#sizeSlider');

    // Stats / counters
    this.stepCount = page.locator('#stepCount');
    this.comparisons = page.locator('#comparisons');
    this.swaps = page.locator('#swaps');
    this.recursions = page.locator('#recursions');

    // Array container and explanation box
    this.arrayContainer = page.locator('#arrayContainer');
    this.explanation = page.locator('#explanation');

    // Title
    this.title = page.locator('h1');
  }

  // Helper to click a provided locator
  async click(locator) {
    await locator.click();
  }

  // Returns number of children bars in array container
  async arrayBarCount() {
    return await this.arrayContainer.locator('.array-element').count();
  }

  // Get raw explanation text
  async explanationText() {
    return (await this.explanation.textContent()) || '';
  }

  // Reads slider values
  async speedValue() {
    return await this.speedSlider.inputValue();
  }
  async sizeValue() {
    return await this.sizeSlider.inputValue();
  }

  // Reads counters
  async stepCounterValue() {
    return await this.stepCount.textContent();
  }
  async comparisonsValue() {
    return await this.comparisons.textContent();
  }
  async swapsValue() {
    return await this.swaps.textContent();
  }
  async recursionsValue() {
    return await this.recursions.textContent();
  }
}

test.describe('Quick Sort Visualization (DFD76635)', () => {
  let consoleErrors = [];
  let pageErrors = [];

  // Setup before each test: navigate and capture console/page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages (e.g., SyntaxError on script parsing)
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore
      }
    });

    // Capture unhandled page errors (runtime exceptions)
    page.on('pageerror', err => {
      try {
        pageErrors.push(err && err.message ? err.message : String(err));
      } catch (e) {
        // ignore
      }
    });

    // Navigate to the application and wait for load event
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Test initial page load and default DOM state
  test('Initial page load - UI elements present and default values', async ({ page }) => {
    const app = new QuickSortPage(page);

    // Title should be visible and correct
    await expect(app.title).toBeVisible();
    await expect(app.title).toHaveText('Quick Sort Visualization');

    // All control buttons should be present
    await expect(app.generateBtn).toBeVisible();
    await expect(app.startBtn).toBeVisible();
    await expect(app.pauseBtn).toBeVisible();
    await expect(app.resetBtn).toBeVisible();
    await expect(app.stepBtn).toBeVisible();

    // Disabled state of buttons matches HTML defaults
    await expect(app.pauseBtn).toBeDisabled();
    await expect(app.resetBtn).toBeDisabled();
    await expect(app.stepBtn).toBeDisabled();

    // Sliders should exist and have expected default values
    await expect(app.speedSlider).toBeVisible();
    await expect(app.sizeSlider).toBeVisible();
    expect(await app.speedValue()).toBe('5');
    expect(await app.sizeValue()).toBe('15');

    // Counters should start at "0"
    expect((await app.stepCounterValue()).trim()).toBe('0');
    expect((await app.comparisonsValue()).trim()).toBe('0');
    expect((await app.swapsValue()).trim()).toBe('0');
    expect((await app.recursionsValue()).trim()).toBe('0');

    // Explanation should contain the initial guidance text
    const explanation = (await app.explanationText()).trim();
    expect(explanation.length).toBeGreaterThan(0);
    expect(explanation.toLowerCase()).toContain('click "generate new array"'.replace(/"/g, '').split(' ')[0].toLowerCase(),);
  });

  // Test that a script SyntaxError (truncated script) is reported in console/page errors
  test('Page reports script parsing/runtime errors (expect SyntaxError or Unexpected end of input)', async ({ page }) => {
    // We expect that the incomplete/truncated script will produce an error message.
    // Allow some time for console/pageerror events to be emitted
    await page.waitForTimeout(200);

    // There should be at least one console error or page error captured
    const anyConsole = consoleErrors.length > 0;
    const anyPageErr = pageErrors.length > 0;
    expect(anyConsole || anyPageErr).toBeTruthy();

    // Combine messages and assert that at least one indicates a syntax/parse issue
    const combinedMessages = [...consoleErrors, ...pageErrors].join('\n').toLowerCase();

    // Look for common indicators of a truncated JS file / syntax error
    const syntaxKeywords = /syntaxerror|unexpected end|unexpected token/i;
    expect(syntaxKeywords.test(combinedMessages)).toBeTruthy();
  });

  // Interactions: clicking controls should not alter state because script failed to load
  test('Clicking Generate / Start / Pause / Reset / Step should not change visualization due to script error', async ({ page }) => {
    const app = new QuickSortPage(page);

    // Initial bar count (expected to be 0 because renderArray wasn't executed)
    const initialBarCount = await app.arrayBarCount();

    // Click Generate New Array
    await app.click(app.generateBtn);
    await page.waitForTimeout(150); // allow any event handlers to run (if present)

    // Because the script parsing failed, event listeners likely weren't attached.
    // Verify that the array container remains unchanged (no bars added)
    const afterGenerateBarCount = await app.arrayBarCount();
    expect(afterGenerateBarCount).toBe(initialBarCount);

    // Explanation should not have the "New array generated..." message from generateNewArray()
    const explanationAfterGenerate = (await app.explanationText()).trim();
    // The original explanation in HTML remains unchanged; clicking shouldn't have replaced it
    expect(explanationAfterGenerate.length).toBeGreaterThan(0);
    expect(explanationAfterGenerate.toLowerCase()).toContain('click "generate new array"'.replace(/"/g, '').split(' ')[0].toLowerCase()).or.toBeTruthy();

    // Click Start Sorting
    await app.click(app.startBtn);
    await page.waitForTimeout(150);

    // Counters should remain unchanged (since sorting logic didn't run)
    expect((await app.stepCounterValue()).trim()).toBe('0');
    expect((await app.comparisonsValue()).trim()).toBe('0');
    expect((await app.swapsValue()).trim()).toBe('0');
    expect((await app.recursionsValue()).trim()).toBe('0');

    // Click other controls to ensure no exceptions thrown in the test and no DOM changes
    await app.click(app.pauseBtn).catch(() => {});
    await app.click(app.resetBtn).catch(() => {});
    await app.click(app.stepBtn).catch(() => {});
    await page.waitForTimeout(100);

    // Re-assert bar count unchanged
    expect(await app.arrayBarCount()).toBe(initialBarCount);
  });

  // Accessibility and attributes checks
  test('Control elements have accessible labels and expected attributes', async ({ page }) => {
    const app = new QuickSortPage(page);

    // Buttons should have visible text matching their role
    await expect(app.generateBtn).toHaveText('Generate New Array');
    await expect(app.startBtn).toHaveText('Start Sorting');
    await expect(app.pauseBtn).toHaveText('Pause');
    await expect(app.resetBtn).toHaveText('Reset');
    await expect(app.stepBtn).toHaveText('Step Forward');

    // Sliders should expose min/max attributes
    expect(await app.speedSlider.getAttribute('min')).toBe('1');
    expect(await app.speedSlider.getAttribute('max')).toBe('10');
    expect(await app.sizeSlider.getAttribute('min')).toBe('5');
    expect(await app.sizeSlider.getAttribute('max')).toBe('40');

    // Ensure slider values are strings representing numbers
    const speedVal = await app.speedValue();
    const sizeVal = await app.sizeValue();
    expect(Number.isFinite(Number(speedVal))).toBeTruthy();
    expect(Number.isFinite(Number(sizeVal))).toBeTruthy();
  });

  // Edge case: ensure that missing runtime functions produce errors if invoked (we observe page errors)
  test('Attempting to trigger sorting-related actions is not possible due to missing runtime (verify errors captured)', async ({ page }) => {
    const app = new QuickSortPage(page);

    // Clear previously captured errors and attempt actions that would require script to be intact
    consoleErrors = [];
    pageErrors = [];

    // Try to click Start and Step to simulate user trying to run algorithm
    await app.click(app.startBtn);
    await app.click(app.stepBtn);
    await page.waitForTimeout(200);

    // We expect no successful sorting behavior; confirm that we still have at least one console/page error
    const anyErrorAfter = consoleErrors.length > 0 || pageErrors.length > 0;
    expect(anyErrorAfter).toBeTruthy();

    // The error messages should still indicate parsing/runtime issues (robust match)
    const combined = [...consoleErrors, ...pageErrors].join(' ').toLowerCase();
    expect(/syntaxerror|unexpected end|unexpected token|is not a function|cannot read property/i.test(combined)).toBeTruthy();
  });
});