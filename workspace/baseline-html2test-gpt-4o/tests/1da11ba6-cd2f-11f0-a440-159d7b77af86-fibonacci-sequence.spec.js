import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/1da11ba6-cd2f-11f0-a440-159d7b77af86.html';

// Page Object Model for the Fibonacci app
class FibonacciPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#numberInput');
    this.button = page.locator('button', { hasText: 'Generate' });
    this.output = page.locator('#output');
    this.heading = page.locator('h1');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async enterNumber(value) {
    // Use fill to replace any existing content
    await this.input.fill(String(value));
  }

  async clearInput() {
    await this.input.fill('');
  }

  async clickGenerate() {
    await this.button.click();
  }

  async getOutputText() {
    return (await this.output.textContent())?.trim() ?? '';
  }

  async getHeadingText() {
    return (await this.heading.textContent())?.trim() ?? '';
  }

  async getInputAttributes() {
    return {
      type: await this.input.getAttribute('type'),
      min: await this.input.getAttribute('min'),
      placeholder: await this.input.getAttribute('placeholder'),
      value: await this.input.inputValue(),
    };
  }
}

test.describe('Fibonacci Sequence Generator - end-to-end', () => {
  // Collect runtime errors and console error messages to assert on them after each test.
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // store the Error object for later assertions
      pageErrors.push(err);
    });

    // Capture console messages, specifically log errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test ensure there were no uncaught errors on the page
    // This asserts that the application did not throw unexpected runtime errors
    expect(pageErrors, `Expected no page errors but got: ${pageErrors.map(e => String(e)).join(' | ')}`).toHaveLength(0);
    // And assert there were no console.error messages
    expect(consoleErrors, `Expected no console error messages but got: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial load - default state and accessibility basics', async ({ page }) => {
    // Purpose: verify the page loads, the main elements are present and visible with correct defaults
    const app = new FibonacciPage(page);

    // Heading should be present and correct
    await expect(app.heading).toBeVisible();
    await expect(app.heading).toHaveText('Fibonacci Sequence Generator');

    // Input should be visible, empty, and have attributes type=number and min=1
    const attrs = await app.getInputAttributes();
    expect(attrs.type).toBe('number');
    expect(attrs.min).toBe('1');
    expect(attrs.placeholder).toBe('Enter a number');
    expect(attrs.value).toBe(''); // initial value should be empty

    // Button should be visible and enabled
    await expect(app.button).toBeVisible();
    await expect(app.button).toBeEnabled();

    // Output div should exist and be empty initially
    await expect(app.output).toBeVisible();
    const initialOutput = await app.getOutputText();
    expect(initialOutput).toBe('');
  });

  test('Generate Fibonacci sequence for input = 1', async ({ page }) => {
    // Purpose: entering 1 should produce "Fibonacci Sequence: 0"
    const app = new FibonacciPage(page);
    await app.clearInput();
    await app.enterNumber(1);
    await app.clickGenerate();

    const output = await app.getOutputText();
    expect(output).toBe('Fibonacci Sequence: 0');
  });

  test('Generate Fibonacci sequence for input = 2', async ({ page }) => {
    // Purpose: entering 2 should produce "Fibonacci Sequence: 0, 1"
    const app = new FibonacciPage(page);
    await app.clearInput();
    await app.enterNumber(2);
    await app.clickGenerate();

    const output = await app.getOutputText();
    expect(output).toBe('Fibonacci Sequence: 0, 1');
  });

  test('Generate Fibonacci sequence for input = 5', async ({ page }) => {
    // Purpose: entering 5 should produce the first five Fibonacci numbers
    const app = new FibonacciPage(page);
    await app.clearInput();
    await app.enterNumber(5);
    await app.clickGenerate();

    const output = await app.getOutputText();
    expect(output).toBe('Fibonacci Sequence: 0, 1, 1, 2, 3');
  });

  test('Multiple sequential generations update output correctly', async ({ page }) => {
    // Purpose: verify subsequent generations replace/update the output content
    const app = new FibonacciPage(page);

    await app.clearInput();
    await app.enterNumber(3);
    await app.clickGenerate();
    let output = await app.getOutputText();
    expect(output).toBe('Fibonacci Sequence: 0, 1, 1');

    // Now generate for 6 and ensure output is updated to 6 numbers
    await app.clearInput();
    await app.enterNumber(6);
    await app.clickGenerate();
    output = await app.getOutputText();
    expect(output).toBe('Fibonacci Sequence: 0, 1, 1, 2, 3, 5');
  });

  test('Empty input triggers alert and does not update output', async ({ page }) => {
    // Purpose: when input is empty and Generate is clicked, an alert should appear with appropriate message
    const app = new FibonacciPage(page);

    // Ensure output has some existing content to detect that it remains unchanged on invalid input
    await app.clearInput();
    await app.enterNumber(4);
    await app.clickGenerate();
    const before = await app.getOutputText();
    expect(before).toBe('Fibonacci Sequence: 0, 1, 1, 2');

    // Clear input and click generate to trigger alert
    await app.clearInput();

    // Listen for dialog and assert its message
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickGenerate(),
    ]);
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a positive number');
    await dialog.dismiss();

    // Output should remain unchanged
    const after = await app.getOutputText();
    expect(after).toBe(before);
  });

  test('Zero or negative input triggers alert and does not update output', async ({ page }) => {
    // Purpose: entering 0 or negative numbers should trigger the same alert behavior
    const app = new FibonacciPage(page);

    // Test zero
    await app.clearInput();
    await app.enterNumber(0);
    let dialog = await page.waitForEvent('dialog', { timeout: 2000 }).catch(() => null);
    // We must click the button to trigger dialog; ensure we do that within the dialog wait race
    if (!dialog) {
      // If wait didn't start before, start it properly
      const [dialogObj] = await Promise.all([
        page.waitForEvent('dialog'),
        app.clickGenerate(),
      ]);
      dialog = dialogObj;
    } else {
      // dialog was captured earlier (unlikely), but ensure button clicked
      await app.clickGenerate();
    }
    expect(dialog).not.toBeNull();
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a positive number');
    await dialog.dismiss();

    // Test negative
    await app.clearInput();
    await app.enterNumber(-5);
    const [negDialog] = await Promise.all([
      page.waitForEvent('dialog'),
      app.clickGenerate(),
    ]);
    expect(negDialog.type()).toBe('alert');
    expect(negDialog.message()).toBe('Please enter a positive number');
    await negDialog.dismiss();
  });

  test('Non-integer numeric inputs are parsed and sliced correctly', async ({ page }) => {
    // Purpose: parseInt is used in app; entering decimals should be parsed to integer part
    // e.g., 4.9 should be treated as 4
    const app = new FibonacciPage(page);
    await app.clearInput();
    await app.enterNumber('4.9');
    await app.clickGenerate();

    const output = await app.getOutputText();
    // parseInt('4.9') === 4, so expect first 4 numbers: 0,1,1,2
    expect(output).toBe('Fibonacci Sequence: 0, 1, 1, 2');
  });

  test('Input element attributes and behaviors are maintained after interactions', async ({ page }) => {
    // Purpose: ensure the input retains its attributes (type, min) after using the app multiple times
    const app = new FibonacciPage(page);

    await app.enterNumber(3);
    await app.clickGenerate();
    await app.enterNumber(2);
    await app.clickGenerate();

    const attrs = await app.getInputAttributes();
    expect(attrs.type).toBe('number');
    expect(attrs.min).toBe('1');
  });
});