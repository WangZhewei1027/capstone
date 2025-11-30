import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/4c9e5fd1-cd2f-11f0-a735-f5f9b4634e99.html';

// Page Object to encapsulate interactions with the Stack app
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#element');
    this.pushButton = page.getByRole('button', { name: 'Push' });
    this.popButton = page.getByRole('button', { name: 'Pop' });
    this.stackList = page.locator('#stackList');
    this.stackContainer = page.locator('#stackContainer');
    this.heading = page.locator('h1');
  }

  // Navigate to the app page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Push an element using the UI (filling input and clicking Push)
  async push(element) {
    await this.input.fill(element);
    await this.pushButton.click();
  }

  // Click Pop and capture the alert message
  async popAndCaptureAlert() {
    // Prepare to capture the dialog
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.popButton.click(),
    ]);
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Get visible stack items as an array of text content in DOM order
  async getStackItems() {
    const count = await this.stackList.locator('li').count();
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.stackList.locator('li').nth(i).textContent());
    }
    return items;
  }

  // Clear input field value directly (for tests)
  async clearInput() {
    await this.input.fill('');
  }
}

test.describe('Stack App - end-to-end tests', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Setup before each test: create fresh page, navigate, and attach listeners
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console messages for inspection
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
  });

  // Teardown after each test: assert there were no unexpected runtime errors
  test.afterEach(async () => {
    // If there are any uncaught page errors, fail the test and print them
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => e?.message || e).join('; ')}`).toHaveLength(0);
  });

  test('Initial page load shows controls and an empty stack', async ({ page }) => {
    // Purpose: Verify that the page loads with the expected controls and empty stack state
    const stack = new StackPage(page);
    await stack.goto(); // ensure loaded (redundant but explicit)

    // Check main heading exists
    await expect(stack.heading).toBeVisible();
    await expect(stack.heading).toHaveText('Stack Implementation in JavaScript');

    // Input and both buttons should be visible
    await expect(stack.input).toBeVisible();
    await expect(stack.pushButton).toBeVisible();
    await expect(stack.popButton).toBeVisible();

    // Placeholder text should guide the user
    await expect(stack.input).toHaveAttribute('placeholder', 'Enter element');

    // Stack container and list should be present and initially empty
    await expect(stack.stackContainer).toBeVisible();
    const items = await stack.getStackItems();
    expect(items).toEqual([]); // No list items on initial load
  });

  test('Pushing a single element adds it to the stack and clears the input', async ({ page }) => {
    // Purpose: Validate that pushing an element updates the DOM and clears the input field
    const stack = new StackPage(page);
    await stack.goto();

    // Push 'alpha' and verify list contains it
    await stack.push('alpha');

    const itemsAfterPush = await stack.getStackItems();
    expect(itemsAfterPush).toEqual(['alpha']); // with one element, it's shown as the only li

    // Input must be cleared after a successful push
    await expect(stack.input).toHaveValue('');
  });

  test('Pushing multiple elements shows top at the top (LIFO order)', async ({ page }) => {
    // Purpose: Ensure multiple pushes reflect LIFO ordering in the displayed list (top first)
    const stack = new StackPage(page);
    await stack.goto();

    // Push three values in sequence
    await stack.push('first');
    await stack.push('second');
    await stack.push('third');

    // The display reverses the underlying array: top (last pushed) should appear first
    const items = await stack.getStackItems();
    expect(items).toEqual(['third', 'second', 'first']);
  });

  test('Popping returns the top element, shows alert, and updates the DOM', async ({ page }) => {
    // Purpose: Verify pop removes the topmost element, shows the correct alert text, and updates the list
    const stack = new StackPage(page);
    await stack.goto();

    // Prepare stack with two elements
    await stack.push('one');
    await stack.push('two');

    // Pop and capture alert message
    const alertMessage = await stack.popAndCaptureAlert();
    expect(alertMessage).toBe('Popped: two');

    // After popping, the top should now be 'one'
    const itemsAfterPop = await stack.getStackItems();
    expect(itemsAfterPop).toEqual(['one']);
  });

  test('Popping on an empty stack shows "Stack is empty" in the alert and leaves UI empty', async ({ page }) => {
    // Purpose: Test the edge case of popping when the stack has no items
    const stack = new StackPage(page);
    await stack.goto();

    // Ensure stack is empty
    await stack.clearInput();
    const initialItems = await stack.getStackItems();
    expect(initialItems).toEqual([]);

    // Pop from empty stack and assert alert text
    const alertMessage = await stack.popAndCaptureAlert();
    expect(alertMessage).toBe('Popped: Stack is empty');

    // UI must still show an empty list
    const itemsAfterPop = await stack.getStackItems();
    expect(itemsAfterPop).toEqual([]);
  });

  test('Push ignores empty or whitespace-only input', async ({ page }) => {
    // Purpose: Ensure that pushing with empty or whitespace-only input does not modify the stack
    const stack = new StackPage(page);
    await stack.goto();

    // Push a normal item, then attempt to push empty and whitespace-only strings
    await stack.push('val1');
    await stack.push('');            // empty
    await stack.push('   ');         // whitespace-only

    // Only the valid push should have been applied
    const items = await stack.getStackItems();
    expect(items).toEqual(['val1']);
  });

  test('DOM updates correctly after a sequence of pushes and pops', async ({ page }) => {
    // Purpose: Comprehensive data-flow test: multiple pushes and pops leave the correct final state
    const stack = new StackPage(page);
    await stack.goto();

    // Sequence: push A, B, C, pop (expect C), push D, pop (expect D), pop (expect B), pop (expect A)
    await stack.push('A');
    await stack.push('B');
    await stack.push('C');

    let msg = await stack.popAndCaptureAlert();
    expect(msg).toBe('Popped: C');

    await stack.push('D');

    msg = await stack.popAndCaptureAlert();
    expect(msg).toBe('Popped: D');

    msg = await stack.popAndCaptureAlert();
    expect(msg).toBe('Popped: B');

    msg = await stack.popAndCaptureAlert();
    expect(msg).toBe('Popped: A');

    // Now the stack should be empty
    const finalItems = await stack.getStackItems();
    expect(finalItems).toEqual([]);
  });

  test('No unexpected console errors are emitted during normal interactions', async ({ page }) => {
    // Purpose: Interact with the page and assert that no console.error or uncaught exceptions occur
    const stack = new StackPage(page);
    await stack.goto();

    // Perform a set of typical interactions
    await stack.push('x');
    await stack.push('y');
    await stack.popAndCaptureAlert();
    await stack.popAndCaptureAlert();

    // Inspect captured console messages for any errors
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages, `Console errors detected: ${JSON.stringify(errorConsoleMessages)}`).toHaveLength(0);

    // Also verify there were no page errors (this is asserted again in afterEach)
  });
});