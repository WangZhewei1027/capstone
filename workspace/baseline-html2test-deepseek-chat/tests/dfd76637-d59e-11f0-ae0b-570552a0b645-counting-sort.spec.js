import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd76637-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Counting Sort Visualization page
class CountingSortPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.startButton = page.locator('button', { hasText: 'Start Sorting' });
    this.prevBtn = page.locator('#prevBtn');
    this.nextBtn = page.locator('#nextBtn');
    this.autoBtn = page.locator('#autoBtn');
    this.resetBtn = page.locator('button', { hasText: 'Reset' });
    this.stepInfo = page.locator('#stepInfo');
    this.inputArrayContainer = page.locator('#inputArray');
    this.countArrayContainer = page.locator('#countArray');
    this.outputArrayContainer = page.locator('#outputArray');
  }

  // Set the input box value
  async setInput(value) {
    await this.arrayInput.fill(value);
  }

  // Click the Start Sorting button
  async startSorting() {
    await this.startButton.click();
  }

  // Click next step
  async clickNext() {
    await this.nextBtn.click();
  }

  // Click previous step
  async clickPrev() {
    await this.prevBtn.click();
  }

  // Click auto play toggle
  async clickAuto() {
    await this.autoBtn.click();
  }

  // Click reset
  async clickReset() {
    await this.resetBtn.click();
  }

  // Retrieve the visible step info text
  async getStepInfoText() {
    return (await this.stepInfo.innerText()).trim();
  }

  // Get count of child elements in input array container
  async getInputArrayItems() {
    return this.inputArrayContainer.locator('.element').allTextContents();
  }

  // Get count array items text
  async getCountArrayItems() {
    return this.countArrayContainer.locator('.element').allTextContents();
  }

  // Get output array items text (empty strings possible)
  async getOutputArrayItems() {
    return this.outputArrayContainer.locator('.element').allTextContents();
  }

  // Get auto button visible text
  async getAutoBtnText() {
    return (await this.autoBtn.textContent()).trim();
  }

  // Disabled states for prev/next
  async isPrevDisabled() {
    return await this.prevBtn.isDisabled();
  }

  async isNextDisabled() {
    return await this.nextBtn.isDisabled();
  }

  // Return number of elements (divs) in a given container
  async countInputElements() {
    return await this.inputArrayContainer.locator('.element').count();
  }

  async countCountElements() {
    return await this.countArrayContainer.locator('.element').count();
  }

  async countOutputElements() {
    return await this.outputArrayContainer.locator('.element').count();
  }
}

test.describe('Counting Sort Visualization - dfd76637-d59e-11f0-ae0b-570552a0b645', () => {
  let consoleErrors;
  let pageErrors;

  // Each test will create its own page and attach listeners to collect console and page errors
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages (type === 'error')
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // If anything unexpected happens while reading console message, capture it.
        consoleErrors.push(`Failed to read console message: ${String(e)}`);
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', exception => {
      pageErrors.push(String(exception && exception.message ? exception.message : exception));
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  // Ensure no uncaught exceptions or console errors happened during a test scenario
  test.afterEach(async () => {
    // Assert no uncaught page errors occurred during the test
    expect(pageErrors, `Unexpected page errors: ${JSON.stringify(pageErrors)}`).toEqual([]);
    // Assert no console.error messages were logged during the test
    expect(consoleErrors, `Unexpected console error messages: ${JSON.stringify(consoleErrors)}`).toEqual([]);
  });

  test('Initial load shows "Initialize Count Array" step and expected containers', async ({ page }) => {
    // Purpose: Verify that after page load the visualization initializes with the first step and renders arrays.
    const app = new CountingSortPage(page);

    // The page auto-initializes via window.onload invoking initializeSort().
    const stepText = await app.getStepInfoText();
    expect(stepText).toContain('Step 1/');
    expect(stepText).toContain('Initialize Count Array');

    // Input array should reflect default input "4,2,2,8,3,3,1" -> 7 elements
    const inputItems = await app.getInputArrayItems();
    expect(inputItems.length).toBe(7);
    expect(inputItems).toEqual(['4', '2', '2', '8', '3', '3', '1']);

    // Count array should be of size max+1 where max=8 => 9 elements and all zeros at initialization step
    const countItems = await app.getCountArrayItems();
    expect(countItems.length).toBe(9);
    for (const c of countItems) {
      expect(c).toBe('0');
    }

    // Output array should be empty at initialization step (no elements rendered)
    const outputCount = await app.countOutputElements();
    expect(outputCount).toBe(0);

    // Prev is disabled on first step, Next should be enabled if more steps exist
    expect(await app.isPrevDisabled()).toBe(true);
    expect(await app.isNextDisabled()).toBe(false);
  });

  test('Clicking Next advances to "Count Occurrences" and updates count array', async ({ page }) => {
    // Purpose: Ensure Next button increments the visualization step and that counts change accordingly.
    const app = new CountingSortPage(page);

    // Click next to go to first "Count Occurrences" step
    await app.clickNext();

    // Validate step info updated
    const stepText = await app.getStepInfoText();
    expect(stepText).toContain('Count Occurrences');

    // Count array should now reflect at least one non-zero count (some values counted)
    const countItems = await app.getCountArrayItems();
    // There should still be 9 elements for default input
    expect(countItems.length).toBe(9);
    const numericCounts = countItems.map(s => s === '' ? NaN : parseInt(s, 10));
    // At least one count should be > 0
    const hasPositive = numericCounts.some(n => Number.isFinite(n) && n > 0);
    expect(hasPositive).toBe(true);

    // Prev should now be enabled (we moved away from step 0)
    expect(await app.isPrevDisabled()).toBe(false);
  });

  test('Auto Play toggles between Play and Pause states', async ({ page }) => {
    // Purpose: Verify the Auto Play button toggles to 'Pause' when started and back to 'Auto Play' when toggled off.
    const app = new CountingSortPage(page);

    // Initially the autoBtn should read "Auto Play"
    expect(await app.getAutoBtnText()).toBe('Auto Play');

    // Click Auto Play to start autoplay -> button text should change to 'Pause'
    await app.clickAuto();
    // Give small time for UI update (toggleAutoPlay calls updateVisualization synchronously)
    await page.waitForTimeout(50);
    expect(await app.getAutoBtnText()).toBe('Pause');

    // Click Auto Play again to pause -> text should return to 'Auto Play'
    await app.clickAuto();
    await page.waitForTimeout(50);
    expect(await app.getAutoBtnText()).toBe('Auto Play');
  });

  test('Reset clears visualization and disables control buttons', async ({ page }) => {
    // Purpose: Ensure Reset clears rendered arrays and disables prev/next controls.
    const app = new CountingSortPage(page);

    // Move forward a step to change state
    await app.clickNext();
    expect(await app.isPrevDisabled()).toBe(false);

    // Click Reset
    await app.clickReset();

    // Step info should be reset to instructions
    const stepText = await app.getStepInfoText();
    expect(stepText).toContain('Enter numbers and click "Start Sorting" to begin the visualization.');

    // All containers should be empty
    expect(await app.countInputElements()).toBe(0);
    expect(await app.countCountElements()).toBe(0);
    expect(await app.countOutputElements()).toBe(0);

    // Prev and Next should be disabled after reset
    expect(await app.isPrevDisabled()).toBe(true);
    expect(await app.isNextDisabled()).toBe(true);

    // Auto button label should be 'Auto Play'
    expect(await app.getAutoBtnText()).toBe('Auto Play');
  });

  test('Start Sorting with new valid input updates arrays correctly', async ({ page }) => {
    // Purpose: Replace input with a simple new array and confirm visualization is reinitialized for new data.
    const app = new CountingSortPage(page);

    // Set input to a new small array: "1,0,2"
    await app.setInput('1,0,2');
    await app.startSorting();

    // After starting, step should be 'Initialize Count Array' for the new input
    const stepText = await app.getStepInfoText();
    expect(stepText).toContain('Initialize Count Array');

    // Input array should render 3 elements
    const inputItems = await app.getInputArrayItems();
    expect(inputItems.length).toBe(3);
    expect(inputItems).toEqual(['1', '0', '2']);

    // Count array length should be max+1 where max=2 => 3 elements
    const countItems = await app.getCountArrayItems();
    expect(countItems.length).toBe(3);
    for (const c of countItems) {
      // At initialization step counts should be '0'
      expect(c).toBe('0');
    }

    // Prev disabled on first step
    expect(await app.isPrevDisabled()).toBe(true);
  });

  test('Starting sorting with invalid or empty input triggers an alert dialog', async ({ page }) => {
    // Purpose: Verify that when the user provides no valid non-negative integers an alert is shown.
    const app = new CountingSortPage(page);

    // Prepare to capture the dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Set input to an invalid string so that numbers.length === 0
    await app.setInput('');
    await app.startSorting();

    // Ensure a dialog was shown with the expected alert message
    expect(dialogMessage).toBe('Please enter valid non-negative integers');

    // After dismissing the alert, visualization should remain in the default reset state (no arrays)
    expect(await app.countInputElements()).toBe(0);
    expect(await app.countCountElements()).toBe(0);
    expect(await app.countOutputElements()).toBe(0);
  });

  test('Full navigation through steps: Next until end then Prev until start', async ({ page }) => {
    // Purpose: Iterate forward through all steps using Next and then back to the start using Prev to verify enabling/disabling.
    const app = new CountingSortPage(page);

    // Determine how many steps exist by advancing until Next becomes disabled
    let stepsAdvanced = 0;
    while (!(await app.isNextDisabled())) {
      await app.clickNext();
      stepsAdvanced++;
      // Small wait to allow UI updates to complete
      await page.waitForTimeout(20);
      // Safety: prevent infinite loop; there should be a finite number of steps
      if (stepsAdvanced > 100) break;
    }

    // Now Next should be disabled at final step
    expect(await app.isNextDisabled()).toBe(true);
    expect(stepsAdvanced).toBeGreaterThan(0);

    // Now go backward until Prev becomes disabled (we reach the first step)
    let stepsBack = 0;
    while (!(await app.isPrevDisabled())) {
      await app.clickPrev();
      stepsBack++;
      await page.waitForTimeout(20);
      if (stepsBack > 100) break;
    }

    // Should have returned to the initial step
    expect(await app.isPrevDisabled()).toBe(true);
    // Number of steps back should equal number of steps advanced
    expect(stepsBack).toBe(stepsAdvanced);
  });

  test('No uncaught exceptions or console.error messages on page load and interactions', async ({ page }) => {
    // Purpose: Explicit test to verify that the page did not produce errors in console or uncaught exceptions during interaction.
    // This test performs a couple of interactions and then validates the collected arrays (attached in beforeEach/afterEach).

    const app = new CountingSortPage(page);

    // Perform a couple interactions
    await app.clickNext();
    await app.clickAuto();
    // Pause autoplay quickly
    await page.waitForTimeout(50);
    await app.clickAuto();
    await app.clickReset();

    // The afterEach hook will assert that pageErrors and consoleErrors arrays are empty.
    // To make the intent explicit here, also assert the app still shows reset message
    const stepText = await app.getStepInfoText();
    expect(stepText).toContain('Enter numbers and click "Start Sorting" to begin the visualization.');
  });
});