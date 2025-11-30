import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abed134-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object for the Sliding Window app
class SlidingWindowPage {
  constructor(page) {
    this.page = page;
    this.arrayInput = page.locator('#arrayInput');
    this.windowSizeInput = page.locator('#windowSize');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.arrayContainer = page.locator('#arrayContainer');
    this.info = page.locator('#info');
    this.elemSelector = '.elem';
  }

  // Helpers to interact with the UI
  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async setArrayInput(value) {
    await this.arrayInput.fill(value);
  }

  async setWindowSize(value) {
    await this.windowSizeInput.fill(String(value));
  }

  async getInfoText() {
    return this.info.textContent();
  }

  async getArrayElements() {
    return this.page.locator(this.elemSelector);
  }

  async getArrayValues() {
    const elems = this.getArrayElements();
    const count = await elems.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await elems.nth(i).textContent()).trim());
    }
    return texts;
  }

  async getElementClasses(index) {
    return (await this.getArrayElements().nth(index).getAttribute('class')) || '';
  }

  async isButtonDisabled(locator) {
    return await locator.isDisabled();
  }

  async isInputDisabled(locator) {
    return await locator.isDisabled();
  }
}

test.describe('Sliding Window Visualization - End-to-End', () => {
  let page;
  let app;
  let consoleErrors;
  let pageErrors;

  // Setup a fresh page for each test, and capture console/page errors
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    app = new SlidingWindowPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    // Ensure page is closed after each test
    await page.close();
  });

  // Test initial page load and default state
  test('Initial page load shows correct default state and controls', async () => {
    // Verify title visible via info text and header elements
    await expect(page.locator('h1')).toHaveText('Sliding Window Technique Visualization');

    // Default input values
    await expect(app.arrayInput).toHaveValue('2,1,5,2,3,2');
    await expect(app.windowSizeInput).toHaveValue('3');

    // Buttons default states
    expect(await app.isButtonDisabled(app.startBtn)).toBe(false);
    expect(await app.isButtonDisabled(app.stepBtn)).toBe(true);
    expect(await app.isButtonDisabled(app.resetBtn)).toBe(true);

    // Info message default
    await expect(app.info).toHaveText('Click "Start" to begin the sliding window demonstration.');

    // Array container should be initially empty (initial render creates no elems)
    const elemsCount = await app.getArrayElements().count();
    expect(elemsCount).toBe(0);

    // Assert that no console errors or page errors occurred during load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test the Start button and initial render of the sliding window
  test('Clicking Start validates inputs, disables inputs, and renders initial window', async () => {
    // Click Start
    await app.clickStart();

    // Start should be disabled; step and reset enabled
    expect(await app.isButtonDisabled(app.startBtn)).toBe(true);
    expect(await app.isButtonDisabled(app.stepBtn)).toBe(false);
    expect(await app.isButtonDisabled(app.resetBtn)).toBe(false);

    // Inputs should be disabled during sliding
    expect(await app.isInputDisabled(app.arrayInput)).toBe(true);
    expect(await app.isInputDisabled(app.windowSizeInput)).toBe(true);

    // Array should render 6 elements for default array
    const elems1 = app.getArrayElements();
    await expect(elems).toHaveCount(6);

    // First window should highlight indices 0..2 with class 'window'
    for (let i = 0; i < 3; i++) {
      const classes = await app.getElementClasses(i);
      expect(classes.split(' ').includes('window')).toBeTruthy();
      expect(classes.split(' ').includes('current')).toBeFalsy();
    }

    // Elements outside the window should not have 'window' or 'current'
    for (let i = 3; i < 6; i++) {
      const classes1 = await app.getElementClasses(i);
      expect(classes).toBe('elem');
    }

    // Info message should indicate sliding started with size k = 3
    const infoText = await app.getInfoText();
    expect(infoText).toContain('Sliding the window of size 3');

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test stepping through windows and verifying maxima and state transitions
  test('Stepping through windows highlights maxima and completes correctly', async () => {
    // Start the sliding
    await app.clickStart();

    // Prepare expected maxima for the default array [2,1,5,2,3,2] with k=3
    const expectedMaxes = [5, 5, 5, 3];
    const observedMaxes = [];

    // There are 4 windows; click Next Step 4 times
    for (let step = 0; step < expectedMaxes.length; step++) {
      // Click Next Step
      await app.clickStep();

      // After clicking, one element should have 'current' class (the max in the window)
      const elems2 = app.getArrayElements();
      const count1 = await elems.count1();

      let foundCurrent = false;
      let currentValue = null;

      for (let i = 0; i < count; i++) {
        const classes2 = (await elems.nth(i).getAttribute('class')) || '';
        const text = (await elems.nth(i).textContent()).trim();
        if (classes.split(' ').includes('current')) {
          foundCurrent = true;
          currentValue = Number(text);
          // The current element should not also have 'window' class (renderArray removes it)
          expect(classes.split(' ').includes('window')).toBeFalsy();
        }
      }

      expect(foundCurrent).toBeTruthy();
      observedMaxes.push(currentValue);

      // Info text should reflect the maximum value for this window
      const infoText1 = await app.getInfoText();
      expect(infoText).toContain(`Maximum: ${currentValue}`);
    }

    // After final step, the Next Step button should be disabled and info should show completion message
    expect(await app.isButtonDisabled(app.stepBtn)).toBe(true);
    const finalInfo = await app.getInfoText();
    expect(finalInfo).toContain('Sliding complete! Maximums for each window:');
    expect(finalInfo).toContain(`[${expectedMaxes.join(', ')}]`);

    // The computed maxima should match expected
    expect(observedMaxes).toEqual(expectedMaxes);

    // Reset and ensure controls are still disabled/enabled appropriately before reset
    expect(await app.isButtonDisabled(app.resetBtn)).toBe(false);

    // No console/page errors occurred during stepping
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test Reset behavior after running
  test('Reset restores the UI to initial state', async () => {
    // Start and take one step to change state
    await app.clickStart();
    await app.clickStep();

    // Now click Reset
    await app.clickReset();

    // Buttons and inputs should be reset to default states
    expect(await app.isButtonDisabled(app.startBtn)).toBe(false);
    expect(await app.isButtonDisabled(app.stepBtn)).toBe(true);
    expect(await app.isButtonDisabled(app.resetBtn)).toBe(true);

    expect(await app.isInputDisabled(app.arrayInput)).toBe(false);
    expect(await app.isInputDisabled(app.windowSizeInput)).toBe(false);

    // Info message should be the initial prompt again
    await expect(app.info).toHaveText('Click "Start" to begin the sliding window demonstration.');

    // Array container should be empty
    await expect(app.getArrayElements()).toHaveCount(0);

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test input validation edge cases and their alert dialogs
  test.describe('Input validation and alerts', () => {
    test('Empty array input shows an alert and prevents start', async () => {
      // Listen for dialog
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        // Clear array input and click Start
        app.setArrayInput(''),
        app.clickStart()
      ]);

      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Array input cannot be empty.');
      await dialog.accept();

      // Ensure no state change: Start remains enabled
      expect(await app.isButtonDisabled(app.startBtn)).toBe(false);
    });

    test('Non-numeric array entries show an alert', async () => {
      // Put invalid array and click Start
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.setArrayInput('1, 2, x, 4'),
        app.clickStart()
      ]);

      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Array must contain only numbers separated by commas.');
      await dialog.accept();

      // Start should still be enabled
      expect(await app.isButtonDisabled(app.startBtn)).toBe(false);
    });

    test('Window size k less than 1 shows an alert', async () => {
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.setWindowSize('0'),
        app.clickStart()
      ]);

      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Window size k must be a positive integer.');
      await dialog.accept();

      // Start should continue to be enabled
      expect(await app.isButtonDisabled(app.startBtn)).toBe(false);
    });

    test('Window size k greater than array length shows an alert', async () => {
      // Default array has length 6; set k to 10
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog'),
        app.setWindowSize('10'),
        app.clickStart()
      ]);

      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Window size k cannot be greater than the array length.');
      await dialog.accept();

      // Start should still be enabled
      expect(await app.isButtonDisabled(app.startBtn)).toBe(false);
    });
  });

  // A light accessibility & attribute check
  test('Accessibility checks: inputs and buttons have expected attributes', async () => {
    // Check that numeric input has min and max attributes
    const minAttr = await app.windowSizeInput.getAttribute('min');
    const maxAttr = await app.windowSizeInput.getAttribute('max');
    expect(minAttr).toBe('1');
    expect(maxAttr).toBe('20');

    // Buttons have the expected labels
    await expect(app.startBtn).toHaveText('Start');
    await expect(app.stepBtn).toHaveText('Next Step');
    await expect(app.resetBtn).toHaveText('Reset');

    // No console/page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});