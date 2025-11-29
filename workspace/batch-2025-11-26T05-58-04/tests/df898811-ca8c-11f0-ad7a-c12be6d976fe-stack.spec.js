import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-58-04/html/df898811-ca8c-11f0-ad7a-c12be6d976fe.html';

// Page Object Model for the Stack page
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.stackDisplay = page.locator('#stackDisplay');
    this.output = page.locator('#output');
    // Buttons identified by onclick attribute per FSM notes
    this.pushBtn = page.locator('button[onclick="push()"]');
    this.popBtn = page.locator('button[onclick="pop()"]');
    this.peekBtn = page.locator('button[onclick="peek()"]');
    this.isEmptyBtn = page.locator('button[onclick="isEmpty()"]');
    this.clearBtn = page.locator('button[onclick="clearStack()"]');
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async setInput(value) {
    // Use fill to simulate user typing
    await this.input.fill(String(value));
    // dispatch input event to simulate user interaction if necessary
    await this.input.evaluate((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
  }

  async clearInput() {
    await this.input.fill('');
    await this.input.evaluate((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
  }

  async clickPush() {
    await this.pushBtn.click();
  }

  async clickPop() {
    await this.popBtn.click();
  }

  async clickPeek() {
    await this.peekBtn.click();
  }

  async clickIsEmpty() {
    await this.isEmptyBtn.click();
  }

  async clickClear() {
    await this.clearBtn.click();
  }

  async getStackText() {
    return (await this.stackDisplay.textContent())?.trim() ?? '';
  }

  async getOutputText() {
    return (await this.output.textContent())?.trim() ?? '';
  }

  async getInputValue() {
    return (await this.input.inputValue()).toString();
  }
}

test.describe('Stack FSM - End-to-end interactions and UI validations', () => {
  // Collect console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // No-op here; specific listeners are attached per-test in order to capture messages
  });

  test('Initial state (idle) - updateStackDisplay runs on page load', async ({ page }) => {
    // This test validates the idle state's onEnter (updateStackDisplay) effect on DOM.
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const stackPage = new StackPage(page);
    await stackPage.goto();

    // On load updateStackDisplay should run and show an empty stack representation
    await expect(stackPage.stackDisplay).toBeVisible();
    const stackText = await stackPage.getStackText();
    expect(stackText).toBe('Stack: []');

    // No output text initially
    const outputText = await stackPage.getOutputText();
    expect(outputText).toBe('');

    // Ensure no runtime page errors occurred during initial load
    expect(pageErrors.length).toBe(0);
    // Ensure no console errors were emitted
    const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test.describe('User input interactions and transitions between idle and has_input', () => {
    test('Filling input triggers has_input-like behavior, clearing returns to idle', async ({ page }) => {
      // This test validates INPUT_FILLED and INPUT_CLEARED transitions by observing DOM/input.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Initially input is empty
      expect(await stackPage.getInputValue()).toBe('');

      // Fill input simulating INPUT_FILLED event
      await stackPage.setInput(42);
      expect(await stackPage.getInputValue()).toBe('42');

      // Clear input simulating INPUT_CLEARED event
      await stackPage.clearInput();
      expect(await stackPage.getInputValue()).toBe('');

      // No runtime errors
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Push / Pop / Peek / isEmpty / Clear actions (FSM transitions and onEnter effects)', () => {
    test('Push valid values, verify push side-effects (stack display, output, input cleared)', async ({ page }) => {
      // This test exercises the pushing state (onEnter -> push()) and verifies UI updates.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Push first value
      await stackPage.setInput(10);
      await stackPage.clickPush();

      expect(await stackPage.getOutputText()).toBe('Pushed: 10');
      expect(await stackPage.getStackText()).toBe('Stack: [10]');
      // Input should be cleared after a successful push
      expect(await stackPage.getInputValue()).toBe('');

      // Push second value
      await stackPage.setInput(20);
      await stackPage.clickPush();

      expect(await stackPage.getOutputText()).toBe('Pushed: 20');
      expect(await stackPage.getStackText()).toBe('Stack: [10, 20]');
      expect(await stackPage.getInputValue()).toBe('');

      // No runtime errors during pushes
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Pop transitions to popping and updates UI correctly; popping from non-empty stack returns last pushed', async ({ page }) => {
      // This test exercises popping from a non-empty stack and verifies the returned value and stack state.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Prepare stack with two values
      await stackPage.setInput(1);
      await stackPage.clickPush();
      await stackPage.setInput(2);
      await stackPage.clickPush();

      // Now pop once - should remove 2
      await stackPage.clickPop();
      expect(await stackPage.getOutputText()).toBe('Popped: 2');
      expect(await stackPage.getStackText()).toBe('Stack: [1]');

      // Pop again - should remove 1
      await stackPage.clickPop();
      expect(await stackPage.getOutputText()).toBe('Popped: 1');
      expect(await stackPage.getStackText()).toBe('Stack: []');

      // No runtime errors during popping
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Pop on empty stack - edge case handling', async ({ page }) => {
      // This test ensures pop() returns 'Stack is empty' message when called on an empty stack.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Ensure stack is clear
      await stackPage.clickClear();
      expect(await stackPage.getStackText()).toBe('Stack: []');

      // Pop on empty
      await stackPage.clickPop();
      // pop() returns 'Stack is empty' and updateStackDisplay still shows empty
      expect(await stackPage.getOutputText()).toBe('Popped: Stack is empty');
      expect(await stackPage.getStackText()).toBe('Stack: []');

      // No runtime errors during pop on empty
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Peek behavior on non-empty and empty stacks', async ({ page }) => {
      // This test validates peek() (peeking state) both when stack has elements and when empty.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Ensure clean state
      await stackPage.clickClear();

      // Peek on empty
      await stackPage.clickPeek();
      expect(await stackPage.getOutputText()).toBe('Peeked: Stack is empty');

      // Push values and peek
      await stackPage.setInput(5);
      await stackPage.clickPush();
      await stackPage.setInput(7);
      await stackPage.clickPush();

      // Peek should show last pushed (7) and not mutate the stack
      await stackPage.clickPeek();
      expect(await stackPage.getOutputText()).toBe('Peeked: 7');
      expect(await stackPage.getStackText()).toBe('Stack: [5, 7]');

      // No runtime errors during peek operations
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('isEmpty action returns correct boolean based on stack contents', async ({ page }) => {
      // This test verifies the checking_empty state and isEmpty() onEnter behavior reflected in #output.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Clear first to ensure empty
      await stackPage.clickClear();
      await stackPage.clickIsEmpty();
      expect(await stackPage.getOutputText()).toBe('Is stack empty? true');

      // Push one item and check again
      await stackPage.setInput(99);
      await stackPage.clickPush();
      await stackPage.clickIsEmpty();
      expect(await stackPage.getOutputText()).toBe('Is stack empty? false');

      // No runtime errors during isEmpty checks
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });

    test('Clear action resets stack and outputs "Stack cleared" (cleared state)', async ({ page }) => {
      // This test validates clearStack() onEnter behavior from cleared state and subsequent ACTION_COMPLETE to idle.
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Put some items on stack
      await stackPage.setInput(3);
      await stackPage.clickPush();
      await stackPage.setInput(4);
      await stackPage.clickPush();

      // Now clear
      await stackPage.clickClear();
      expect(await stackPage.getOutputText()).toBe('Stack cleared');
      expect(await stackPage.getStackText()).toBe('Stack: []');

      // No runtime errors during clear
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Invalid input and error messaging', () => {
    test('Attempt to push with empty/invalid input shows "Enter a valid number"', async ({ page }) => {
      // This test checks the push() path when no input is provided (edge case).
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => consoleMessages.push(msg));
      page.on('pageerror', (err) => pageErrors.push(err));

      const stackPage = new StackPage(page);
      await stackPage.goto();

      // Ensure input is empty and attempt to push
      await stackPage.clearInput();
      await stackPage.clickPush();

      // Should show guidance without changing stack
      expect(await stackPage.getOutputText()).toBe('Enter a valid number');
      expect(await stackPage.getStackText()).toBe('Stack: []');

      // No runtime errors triggered by invalid input handling
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type() === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test('Observe console logs and page errors across interactions - assert there are no uncaught exceptions', async ({ page }) => {
    // This test loads the page and exercises a sequence while specifically collecting console logs
    // and page errors to validate that no uncaught exceptions (ReferenceError, TypeError, etc.) occur.
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => consoleMessages.push(msg));
    page.on('pageerror', (err) => pageErrors.push(err));

    const stackPage = new StackPage(page);
    await stackPage.goto();

    // Quick exercise of main actions to surface runtime issues if any
    await stackPage.setInput(11);
    await stackPage.clickPush();
    await stackPage.clickPeek();
    await stackPage.clickPop();
    await stackPage.clickIsEmpty();
    await stackPage.clickClear();

    // Collect and assert
    // Expect no page-level uncaught exceptions
    expect(pageErrors.length).toBe(0);

    // Ensure console contains no error-level messages
    const consoleErrorMessages = consoleMessages.filter(m => m.type() === 'error');
    expect(consoleErrorMessages.length).toBe(0);

    // Optionally ensure some expected output occurred along the way (sanity)
    expect(await stackPage.getStackText()).toBe('Stack: []');
  });
});