import { test, expect } from '@playwright/test';

// Test file: 39b64091-d1d5-11f0-b49a-6f458b3a25ef-stack.spec.js
// URL under test:
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-4o-5/html/39b64091-d1d5-11f0-b49a-6f458b3a25ef.html';

// Page Object for the Stack application
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#stackInput');
    this.pushButton = page.locator('button', { hasText: 'Push' });
    this.popButton = page.locator('button', { hasText: 'Pop' });
    this.peekButton = page.locator('button', { hasText: 'Peek' });
    this.error = page.locator('#error');
    this.stackContainer = page.locator('#stackContainer');
    this.stackItems = () => this.stackContainer.locator('.stackItem');
  }

  // Fill the input with text
  async fillInput(value) {
    await this.input.fill(value);
  }

  // Click push button
  async push() {
    await this.pushButton.click();
  }

  // Click pop button
  async pop() {
    await this.popButton.click();
  }

  // Click peek button
  async peek() {
    await this.peekButton.click();
  }

  // Get visible error text
  async getErrorText() {
    return (await this.error.textContent())?.trim() ?? '';
  }

  // Get texts of stack items in DOM order
  async getStackItemsText() {
    const count = await this.stackItems().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.stackItems().nth(i).textContent())?.trim() ?? '');
    }
    return texts;
  }

  // Get number of stack items
  async getStackCount() {
    return this.stackItems().count();
  }

  // Assert that input is empty
  async expectInputEmpty() {
    await expect(this.input).toHaveValue('');
  }
}

test.describe('Stack Implementation - functional and edge-case tests', () => {
  // Collect console errors and page errors for each test run
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Observe console messages and page errors
    page.on('console', msg => {
      // Collect only error-level console messages for inspection
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, assert that no console.error messages or page errors occurred.
    // This verifies the application runs without throwing runtime exceptions in the page context.
    expect(consoleErrors.length, `Unexpected console.error messages: ${JSON.stringify(consoleErrors)}`).toBe(0);
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test('Initial load shows empty stack and no error message', async ({ page }) => {
    // Purpose: Verify the initial default state of the application on page load.
    const stack = new StackPage(page);

    // The input should be visible and empty
    await expect(stack.input).toBeVisible();
    await stack.expectInputEmpty();

    // No error message should be displayed initially
    await expect(stack.error).toBeVisible();
    expect(await stack.getErrorText()).toBe('');

    // Stack container should be empty (no stack item elements)
    expect(await stack.getStackCount()).toBe(0);
  });

  test('Pushing an empty value shows an error and does not modify stack', async ({ page }) => {
    // Purpose: Test edge case where user tries to push an empty string.
    const stack1 = new StackPage(page);

    // Ensure input is empty then click Push
    await stack.fillInput(''); // explicit
    await stack.push();

    // Error message should indicate value required
    expect(await stack.getErrorText()).toBe('Please enter a value to push.');

    // Stack remains empty
    expect(await stack.getStackCount()).toBe(0);
  });

  test('Push single item updates DOM, clears input, and removes error', async ({ page }) => {
    // Purpose: Verify pushing a valid value adds a stack item and clears the input.
    const stack2 = new StackPage(page);

    await stack.fillInput('A');
    await stack.push();

    // After pushing, input should be cleared
    await stack.expectInputEmpty();

    // No error message
    expect(await stack.getErrorText()).toBe('');

    // One item should exist with correct text
    expect(await stack.getStackCount()).toBe(1);
    const items = await stack.getStackItemsText();
    expect(items).toEqual(['A']);
  });

  test('Push multiple items, peek reports top without removing it, and pop removes top', async ({ page }) => {
    // Purpose: Test data flow for multiple pushes, peek, and pop operations.
    const stack3 = new StackPage(page);

    // Push three items in order: one, two, three
    await stack.fillInput('one');
    await stack.push();

    await stack.fillInput('two');
    await stack.push();

    await stack.fillInput('three');
    await stack.push();

    // Verify DOM shows three items in insertion order (bottom -> top)
    expect(await stack.getStackCount()).toBe(3);
    let items1 = await stack.getStackItemsText();
    expect(items).toEqual(['one', 'two', 'three']);

    // Peek should display top item text in the #error area but should NOT remove it
    await stack.peek();
    expect(await stack.getErrorText()).toBe('Top item: three');

    // Stack should remain unchanged after peek
    expect(await stack.getStackCount()).toBe(3);
    items = await stack.getStackItemsText();
    expect(items).toEqual(['one', 'two', 'three']);

    // Pop should remove the top item ('three') and clear any error message
    await stack.pop();
    expect(await stack.getErrorText()).toBe(''); // pop clears error on success

    expect(await stack.getStackCount()).toBe(2);
    items = await stack.getStackItemsText();
    expect(items).toEqual(['one', 'two']);

    // Another peek should now report 'two'
    await stack.peek();
    expect(await stack.getErrorText()).toBe('Top item: two');
  });

  test('Popping from empty stack shows appropriate error and does not throw', async ({ page }) => {
    // Purpose: Ensure popping when stack is empty gives a user-friendly message.
    const stack4 = new StackPage(page);

    // Confirm empty initially
    expect(await stack.getStackCount()).toBe(0);

    // Click Pop
    await stack.pop();

    // Expect error message about empty stack
    expect(await stack.getErrorText()).toBe('Stack is empty, nothing to pop.');

    // Stack remains empty
    expect(await stack.getStackCount()).toBe(0);
  });

  test('Peeking into empty stack shows appropriate error message', async ({ page }) => {
    // Purpose: Ensure peek when empty behaves as designed.
    const stack5 = new StackPage(page);

    // Confirm empty initially
    expect(await stack.getStackCount()).toBe(0);

    // Click Peek
    await stack.peek();

    // Expect error message indicating empty stack
    expect(await stack.getErrorText()).toBe('Stack is empty.');

    // Still empty
    expect(await stack.getStackCount()).toBe(0);
  });

  test('Visual and content verification of stack items (CSS class and content)', async ({ page }) => {
    // Purpose: Check that pushed items use the expected DOM structure and styling class.
    const stack6 = new StackPage(page);

    await stack.fillInput('X');
    await stack.push();

    // There should be exactly one .stackItem element with correct text and class
    const items2 = stack.stackItems();
    await expect(items).toHaveCount(1);
    await expect(items.first()).toHaveClass(/stackItem/);
    await expect(items.first()).toHaveText('X');
  });

  test('Sequence of operations maintains correct stack behavior with interleaved errors', async ({ page }) => {
    // Purpose: Mix valid operations with invalid ones to validate consistent state handling.
    const stack7 = new StackPage(page);

    // Invalid push (empty)
    await stack.fillInput('');
    await stack.push();
    expect(await stack.getErrorText()).toBe('Please enter a value to push.');
    expect(await stack.getStackCount()).toBe(0);

    // Valid push
    await stack.fillInput('alpha');
    await stack.push();
    expect(await stack.getErrorText()).toBe('');
    expect(await stack.getStackCount()).toBe(1);

    // Peek should show top
    await stack.peek();
    expect(await stack.getErrorText()).toBe('Top item: alpha');

    // Push another item
    await stack.fillInput('beta');
    await stack.push();
    expect(await stack.getErrorText()).toBe('');
    expect(await stack.getStackCount()).toBe(2);

    // Pop twice to empty
    await stack.pop();
    await stack.pop();
    expect(await stack.getStackCount()).toBe(0);

    // Pop on empty should show the correct error message
    await stack.pop();
    expect(await stack.getErrorText()).toBe('Stack is empty, nothing to pop.');
  });
});