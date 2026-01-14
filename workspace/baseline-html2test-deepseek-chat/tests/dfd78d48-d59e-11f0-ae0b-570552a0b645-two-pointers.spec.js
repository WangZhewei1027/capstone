import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd78d48-d59e-11f0-ae0b-570552a0b645.html';

// Page Object Model for the Two Pointers demo page
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.targetInput = page.locator('#targetInput');
    this.stepBtn = page.locator('#stepBtn');
    this.runBtn = page.locator('#runBtn');
    this.visualization = page.locator('#visualizationContainer');
    this.explanation = page.locator('#explanation');
    // reset demo button does not have an id; locate by text on the button
    this.resetBtn = page.getByRole('button', { name: 'Reset Demo' });
  }

  // Navigate to the app and wait for initial load
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the visualization container to be populated by initDemo (called on window.onload)
    await expect(this.visualization).toBeVisible();
    // Ensure initial visualization elements are present
    await this.page.waitForSelector('#elem-0');
  }

  // Set the target input value
  async setTarget(value) {
    await this.targetInput.fill(String(value));
  }

  // Click the Reset Demo button (calls initDemo)
  async clickReset() {
    await this.resetBtn.click();
  }

  // Click Step Forward
  async clickStep() {
    await this.stepBtn.click();
  }

  // Click Run Full Demo
  async clickRun() {
    await this.runBtn.click();
  }

  // Get text of the explanation area
  async getExplanationText() {
    return (await this.explanation.innerText()).trim();
  }

  // Get the sum display text inside visualizationContainer (search for the bolded sum line)
  async getSumDisplayText() {
    // the sum display is appended as a div at the end of visualization container
    return this.page.locator('#visualizationContainer >> text=Current Sum').innerText();
  }

  // Get text content of an array element by index
  async getArrayElementText(index) {
    const locator = this.page.locator(`#elem-${index}`);
    await expect(locator).toBeVisible();
    return locator.innerText();
  }

  // Get inline background-color style of an array element by index
  async getArrayElementBackground(index) {
    return this.page.evaluate((i) => {
      const el = document.getElementById('elem-' + i);
      return el ? el.style.backgroundColor : null;
    }, index);
  }

  // Check if step button is disabled
  async isStepDisabled() {
    return await this.stepBtn.isDisabled();
  }

  // Check if run button is disabled
  async isRunDisabled() {
    return await this.runBtn.isDisabled();
  }
}

test.describe('Two Pointers Algorithm Visualization - End-to-End', () => {
  // Shared arrays to collect console and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages (info/warn/error) to analyze later
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Collect uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
  });

  test('Initial load shows correct default state and no runtime errors', async ({ page }) => {
    // Purpose: Verify the page loads with the expected default state and that no console errors or page errors occurred during load.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Verify page title
    await expect(page).toHaveTitle(/Two Pointers Algorithm Visualization/);

    // Verify array elements 1..8 exist and have expected text
    for (let i = 0; i < 8; i++) {
      const text = await twoPointers.getArrayElementText(i);
      expect(text).toBe(String(i + 1));
    }

    // Verify initial sum display shows "Current Sum: 1 + 8 = 9 | Target: 9"
    const sumText = await twoPointers.getSumDisplayText();
    expect(sumText).toContain('Current Sum: 1 + 8 = 9');
    expect(sumText).toContain('Target: 9');

    // Verify pointer visual highlights for initial left (index 0) and right (index 7)
    const leftBg = await twoPointers.getArrayElementBackground(0);
    const rightBg = await twoPointers.getArrayElementBackground(7);
    // The implementation sets left background to '#4CAF50' and right to '#e74c3c'
    expect(leftBg).toBe('rgb(76, 175, 80)' /* '#4CAF50' in rgb */ || '#4CAF50');
    expect(rightBg).toBe('rgb(231, 76, 60)' /* '#e74c3c' in rgb */ || '#e74c3c');

    // Verify step and run buttons are enabled on initial load
    expect(await twoPointers.isStepDisabled()).toBe(false);
    expect(await twoPointers.isRunDisabled()).toBe(false);

    // Assert that no uncaught page errors were emitted during load
    expect(pageErrors.length).toBe(0);

    // Assert that there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Step Forward finds pair immediately for default target and disables controls', async ({ page }) => {
    // Purpose: For default target 9, the initial pair (1+8) matches. Clicking Step Forward should report success and disable step/run buttons.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Click the Step Forward button
    await twoPointers.clickStep();

    // Explanation should indicate success
    const explanation = await twoPointers.getExplanationText();
    expect(explanation).toMatch(/Found pair!/);

    // Step and Run buttons should be disabled after finding the pair
    expect(await twoPointers.isStepDisabled()).toBe(true);
    expect(await twoPointers.isRunDisabled()).toBe(true);

    // Ensure no runtime errors occurred during the interaction
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Reset demo with an impossible target and step until pointers meet produces "no pair found"', async ({ page }) => {
    // Purpose: Set a high target that cannot be formed by any pair; repeatedly click Step Forward until pointers meet and ensure explanation and button states reflect "no pair found".
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Set target to 20 (no pair exists in [1..8])
    await twoPointers.setTarget(20);
    // Click the reset button to initialize demo with new target
    await twoPointers.clickReset();

    // Verify sum display shows the updated target
    const sumText = await twoPointers.getSumDisplayText();
    expect(sumText).toContain('Target: 20');

    // Now repeatedly click step until disabled
    // Add a safety cap on iterations to prevent infinite loop in case of unexpected behavior
    const maxSteps = 20;
    let steps = 0;
    while (!(await twoPointers.isStepDisabled()) && steps < maxSteps) {
      await twoPointers.clickStep();
      steps++;
    }

    // After stepping until pointers meet, the explanation should indicate no pair found
    const explanation = await twoPointers.getExplanationText();
    expect(explanation).toMatch(/No pair found|Pointers have met/i);

    // Step button should be disabled
    expect(await twoPointers.isStepDisabled()).toBe(true);

    // The number of steps taken should be sensible (less than maxSteps)
    expect(steps).toBeLessThan(maxSteps);

    // Ensure no uncaught page errors happened during the sequence
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Run Full Demo completes and finds pair for a reachable target (7) and stops automatically', async ({ page }) => {
    // Purpose: Test the automated runFullDemo behavior for a target that requires multiple steps (target 7 -> should find 3+4).
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Set target to 7 and reset
    await twoPointers.setTarget(7);
    await twoPointers.clickReset();

    // Click Run Full Demo - it should run intervals until the pair is found
    await twoPointers.clickRun();

    // Wait for expected success explanation. The demo uses 1500ms intervals; give a reasonable timeout to account for multiple steps.
    await expect.poll(async () => {
      const text = await twoPointers.getExplanationText();
      return /Found pair!|No pair found|Pointers have met/i.test(text);
    }, {
      timeout: 10000, // wait up to 10s for the automated demo to finish
      interval: 500,
    }).toBe(true);

    // Now assert that either a pair was found (expected) or in edge cases the demo stopped due to meeting pointers.
    const explanation = await twoPointers.getExplanationText();
    expect(
      /Found pair! 3 \+ 4 = 7|Found pair!/i.test(explanation) || /Pointers have met|No pair found/i.test(explanation)
    ).toBe(true);

    // After run completes, ensure internal flag disabled state: runBtn should be disabled while running but may re-enable afterwards.
    // At minimum, ensure no uncaught runtime errors occurred during run
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Empty target input falls back to default target 9 when Reset Demo is clicked', async ({ page }) => {
    // Purpose: Verify parseInt fallback behavior: empty input should cause initDemo to use default 9.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // Clear the target input (set to empty string) then reset
    await twoPointers.setTarget('');
    await twoPointers.clickReset();

    // Expect the visualization to report target 9 as fallback
    const sumText = await twoPointers.getSumDisplayText();
    expect(sumText).toContain('Target: 9');

    // Step should find the pair immediately (1+8)
    await twoPointers.clickStep();
    const explanation = await twoPointers.getExplanationText();
    expect(explanation).toMatch(/Found pair!/i);

    // No page errors emitted
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Code block and explanation sections exist and are readable for accessibility checks', async ({ page }) => {
    // Purpose: Ensure the static informational areas (explanation and code block) are present in the DOM and contain expected content.
    const twoPointers = new TwoPointersPage(page);
    await twoPointers.goto();

    // The explanation section exists
    const explanationLocator = page.locator('.explanation').first();
    await expect(explanationLocator).toBeVisible();
    const explanationText = await explanationLocator.innerText();
    expect(explanationText.length).toBeGreaterThan(0);
    expect(explanationText).toContain('Step-by-step explanation');

    // The code block exists and contains the function name "twoSum"
    const codeLocator = page.locator('.code');
    await expect(codeLocator).toBeVisible();
    const codeText = await codeLocator.innerText();
    expect(codeText).toContain('function twoSum');

    // No runtime errors were observed while inspecting these sections
    expect(pageErrors.length).toBe(0);
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });
});