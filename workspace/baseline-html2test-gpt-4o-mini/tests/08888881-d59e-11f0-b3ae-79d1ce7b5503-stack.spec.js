import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/08888881-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page Object for the Stack application
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#stackInput';
    this.outputSelector = '#stackOutput';
    // Buttons are not given IDs; we locate them by text content
    this.pushButton = 'button:has-text("Push")';
    this.popButton = 'button:has-text("Pop")';
    this.peekButton = 'button:has-text("Peek")';
    this.clearButton = 'button:has-text("Clear Stack")';
    this.heading = 'h1';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for heading to ensure page loaded
    await this.page.waitForSelector(this.heading);
  }

  async getHeadingText() {
    return this.page.textContent(this.heading);
  }

  async getInputValue() {
    return this.page.$eval(this.inputSelector, el => el.value);
  }

  async fillInput(value) {
    await this.page.fill(this.inputSelector, value);
  }

  async clickPush() {
    await this.page.click(this.pushButton);
  }

  async clickPop() {
    await this.page.click(this.popButton);
  }

  async clickPeek() {
    await this.page.click(this.peekButton);
  }

  async clickClear() {
    await this.page.click(this.clearButton);
  }

  async getOutputText() {
    return this.page.$eval(this.outputSelector, el => el.innerText);
  }

  async isButtonVisible(buttonSelector) {
    const handle = await this.page.$(buttonSelector);
    if (!handle) return false;
    return handle.isVisible();
  }
}

test.describe('Stack Implementation - end-to-end', () => {
  // Arrays to capture console errors and page errors during each test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page before each test
    await page.goto(APP_URL);
    // Wait for the main heading to ensure the script has been loaded/executed
    await page.waitForSelector('h1');
  });

  test.afterEach(async () => {
    // Assert that no console errors or uncaught page errors occurred during the test.
    // This ensures we observe runtime issues if any arise naturally (we do not fix or patch them).
    expect(consoleErrors, `Expected no console.error messages, but found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Expected no uncaught page errors, but found: ${JSON.stringify(pageErrors.map(e => String(e)))}`).toEqual([]);
  });

  // Test initial load and default state
  test('Initial page load displays title, controls and empty stack output', async ({ page }) => {
    // Purpose: Verify the initial UI elements exist and stack output starts empty
    const stack = new StackPage(page);

    // Verify heading text
    await stack.goto();
    const heading = await stack.getHeadingText();
    expect(heading).toBe('Stack Implementation');

    // Input and buttons exist and are visible
    expect(await page.$('#stackInput')).not.toBeNull();
    expect(await stack.isButtonVisible(stack.pushButton)).toBeTruthy();
    expect(await stack.isButtonVisible(stack.popButton)).toBeTruthy();
    expect(await stack.isButtonVisible(stack.peekButton)).toBeTruthy();
    expect(await stack.isButtonVisible(stack.clearButton)).toBeTruthy();

    // Stack output should be empty initially
    const output = await stack.getOutputText();
    expect(output).toBe('');
  });

  // Test push behavior
  test('Pushing a single value updates the stack output and clears the input', async ({ page }) => {
    // Purpose: Ensure pushing a non-empty value shows up in the output and input is cleared
    const stack1 = new StackPage(page);
    await stack.goto();

    await stack.fillInput('A');
    expect(await stack.getInputValue()).toBe('A');

    await stack.clickPush();

    // After push, input should be cleared and output should show the single value
    expect(await stack.getInputValue()).toBe('');
    expect(await stack.getOutputText()).toBe('A');
  });

  // Test multiple pushes and LIFO pop behavior
  test('Pushing multiple values and popping follows LIFO order', async ({ page }) => {
    // Purpose: Validate that multiple pushes form the correct sequence and pop removes the top item
    const stack2 = new StackPage(page);
    await stack.goto();

    // Push three values
    await stack.fillInput('first');
    await stack.clickPush();
    await stack.fillInput('second');
    await stack.clickPush();
    await stack.fillInput('third');
    await stack.clickPush();

    // Verify the output shows items in insertion order joined by ", "
    expect(await stack.getOutputText()).toBe('first, second, third');

    // Pop once -> should remove 'third'
    await stack.clickPop();
    expect(await stack.getOutputText()).toBe('first, second');

    // Pop twice more -> should become empty
    await stack.clickPop(); // removes 'second'
    expect(await stack.getOutputText()).toBe('first');
    await stack.clickPop(); // removes 'first'
    expect(await stack.getOutputText()).toBe('');
  });

  // Test pop on empty stack (edge case) - no errors, output remains empty
  test('Popping when stack is empty does not throw and output stays empty', async ({ page }) => {
    // Purpose: Ensure clicking Pop on an empty stack does not crash the app and leaves the UI consistent
    const stack3 = new StackPage(page);
    await stack.goto();

    // Ensure stack is empty
    expect(await stack.getOutputText()).toBe('');

    // Clicking Pop should not produce any visible text (implementation returns message but UI shows empty)
    await stack.clickPop();
    // Verify no change and still empty
    expect(await stack.getOutputText()).toBe('');
  });

  // Test peek shows an alert with the top element or 'Stack is empty' if empty
  test('Peek shows an alert with the top element when non-empty, and with "Stack is empty" when empty', async ({ page }) => {
    // Purpose: Verify the Peek button triggers an alert with the correct message in both non-empty and empty cases
    const stack4 = new StackPage(page);
    await stack.goto();

    // Case 1: empty stack -> alert "Stack is empty"
    const dialogs = [];
    page.on('dialog', async dialog => {
      dialogs.push({ message: dialog.message(), type: dialog.type() });
      await dialog.accept();
    });

    await stack.clickPeek();
    // Wait a tick for the dialog handler
    await page.waitForTimeout(50);
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message).toBe('Stack is empty');

    // Clear collected dialogs for next check
    dialogs.length = 0;

    // Case 2: non-empty stack -> alert with top value
    await stack.fillInput('topValue');
    await stack.clickPush();

    await stack.clickPeek();
    await page.waitForTimeout(50);
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].message).toBe('topValue');
  });

  // Test clear stack button
  test('Clear Stack empties the stack and updates the UI', async ({ page }) => {
    // Purpose: Ensure the Clear Stack button resets internal state and the displayed output
    const stack5 = new StackPage(page);
    await stack.goto();

    // Push items
    await stack.fillInput('one');
    await stack.clickPush();
    await stack.fillInput('two');
    await stack.clickPush();

    expect(await stack.getOutputText()).toBe('one, two');

    // Clear the stack
    await stack.clickClear();

    // Output should be empty
    expect(await stack.getOutputText()).toBe('');

    // Popping now should keep it empty and not throw
    await stack.clickPop();
    expect(await stack.getOutputText()).toBe('');
  });

  // Test pushing empty value does nothing (edge case)
  test('Attempting to push an empty value does not change the stack', async ({ page }) => {
    // Purpose: Validate that the app ignores empty input on push
    const stack6 = new StackPage(page);
    await stack.goto();

    // Ensure empty initial state
    expect(await stack.getOutputText()).toBe('');

    // Try pushing empty string
    await stack.fillInput('');
    await stack.clickPush();

    // Output should remain empty
    expect(await stack.getOutputText()).toBe('');

    // Try pushing whitespace - the implementation uses if(value) which treats whitespace as truthy,
    // so pushing whitespace will add it. We check this behavior explicitly.
    await stack.fillInput('   ');
    await stack.clickPush();

    // Expect the output to contain whitespace-only entry trimmed? Implementation does not trim,
    // so it should contain exactly the spaces between commas.
    expect(await stack.getOutputText()).toBe('   ');

    // Clean up
    await stack.clickClear();
    expect(await stack.getOutputText()).toBe('');
  });
});