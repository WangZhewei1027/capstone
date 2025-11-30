import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/262736b1-cd2a-11f0-bee4-a3a342d77f94.html';

// Page Object for the Stack page
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.pushButton = page.getByRole('button', { name: 'Push Element' });
    this.popButton = page.getByRole('button', { name: 'Pop Element' });
    this.stackContainer = page.locator('#stackContainer');
    this.stackItems = page.locator('#stackContainer .stackItem');
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Click "Push Element" and respond to the prompt with value
  // Returns the dialog message object when available (for assertions)
  async push(value, {dismiss = false} = {}) {
    // Prepare to handle the prompt dialog that will appear
    const dialogPromise = this.page.waitForEvent('dialog');
    // Trigger the prompt
    await this.pushButton.click();
    const dialog = await dialogPromise;
    // Ensure we got a prompt
    expect(dialog.type()).toBe('prompt');
    if (dismiss) {
      await dialog.dismiss();
      return { dialog };
    } else {
      // Accept with provided value (can be null, empty string, etc.)
      await dialog.accept(value);
      return { dialog };
    }
  }

  // Click "Pop Element" and capture the alert shown (if any).
  // Returns the dialog (alert) object.
  async pop() {
    const dialogPromise = this.page.waitForEvent('dialog');
    await this.popButton.click();
    const dialog = await dialogPromise;
    // Alert expected
    expect(dialog.type()).toBe('alert');
    await dialog.accept();
    return dialog;
  }

  // Get count of stack items rendered in DOM
  async getItemCount() {
    return await this.stackItems.count();
  }

  // Get texts of all stack items as an array
  async getItemTexts() {
    const count = await this.getItemCount();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push(await this.stackItems.nth(i).innerText());
    }
    return texts;
  }
}

test.describe('Stack Example - end-to-end tests', () => {
  let pageErrors = [];
  let consoleMessages = [];

  // Setup before each test: navigate and attach listeners to capture console and page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      // Collect detailed error message for assertions or debugging
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  // Tear down: no special teardown required as Playwright pages are isolated per test
  test.afterEach(async () => {
    // Intentionally left blank; listeners are attached to the page which is disposed by Playwright
  });

  test('Initial page load shows correct title and empty stack', async ({ page }) => {
    // Verify the page title and static content; also verify stack container is empty initially
    const stackPage = new StackPage(page);

    // Title check
    await expect(page).toHaveTitle(/Stack Example/);

    // Header and descriptive text exist
    await expect(page.getByRole('heading', { name: 'Stack Example' })).toBeVisible();
    await expect(page.locator('p')).toContainText('This page demonstrates a simple stack implementation');

    // Stack container should exist and have no items initially
    await expect(stackPage.stackContainer).toBeVisible();
    const initialCount = await stackPage.getItemCount();
    expect(initialCount).toBe(0);

    // Ensure no uncaught runtime errors were captured on page load
    expect(pageErrors).toHaveLength(0);
  });

  test('Pushing a single item via prompt adds it to the DOM', async ({ page }) => {
    // Test that pushing one item updates the DOM with the expected text and index
    const stackPage = new StackPage(page);

    // Push the value 'Alpha'
    const { dialog } = await stackPage.push('Alpha');

    // The prompt dialog should have no default message in this implementation, but ensure it was shown
    expect(dialog.type()).toBe('prompt');

    // After pushing, the stack container should have one item with the expected content
    await expect(stackPage.stackItems).toHaveCount(1);
    const texts = await stackPage.getItemTexts();
    expect(texts[0]).toBe('Item Alpha (Index 0)');

    // No page errors expected as a result of this operation
    expect(pageErrors).toHaveLength(0);
  });

  test('Pushing multiple items maintains correct indexing and order', async ({ page }) => {
    // Push two items and verify both are present and correctly indexed
    const stackPage = new StackPage(page);

    await stackPage.push('first');
    await stackPage.push('second');

    // Two items expected
    await expect(stackPage.stackItems).toHaveCount(2);

    // Verify their texts and indices
    const texts = await stackPage.getItemTexts();
    expect(texts[0]).toBe('Item first (Index 0)');
    expect(texts[1]).toBe('Item second (Index 1)');

    // No uncaught errors
    expect(pageErrors).toHaveLength(0);
  });

  test('Popping returns last pushed item and updates DOM (LIFO behavior)', async ({ page }) => {
    // Push two items, pop once, verify popped alert text and remaining DOM state
    const stackPage = new StackPage(page);

    await stackPage.push('one');
    await stackPage.push('two');

    // Pop should alert 'Popped Item: two'
    const popDialogPromise = page.waitForEvent('dialog');
    await stackPage.popButton.click();
    const popDialog = await popDialogPromise;
    expect(popDialog.type()).toBe('alert');
    expect(popDialog.message()).toBe('Popped Item: two');
    await popDialog.accept();

    // After popping, only 'one' should remain in the DOM
    await expect(stackPage.stackItems).toHaveCount(1);
    const texts = await stackPage.getItemTexts();
    expect(texts[0]).toBe('Item one (Index 0)');

    // No uncaught errors
    expect(pageErrors).toHaveLength(0);
  });

  test('Popping from an empty stack triggers "Stack is empty!" alert', async ({ page }) => {
    // Ensure stack is empty, then click Pop and verify the alert message
    const stackPage = new StackPage(page);

    // Confirm empty initially
    const initialCount = await stackPage.getItemCount();
    expect(initialCount).toBe(0);

    // Pop should show 'Stack is empty!'
    const dialogPromise = page.waitForEvent('dialog');
    await stackPage.popButton.click();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Stack is empty!');
    await dialog.accept();

    // Still empty after the operation
    await expect(stackPage.stackItems).toHaveCount(0);

    // No uncaught errors
    expect(pageErrors).toHaveLength(0);
  });

  test('Canceling the prompt does not add an item to the stack', async ({ page }) => {
    // Simulate the user canceling the prompt (dismiss) and assert no item added
    const stackPage = new StackPage(page);

    // Ensure empty baseline
    await expect(stackPage.stackItems).toHaveCount(0);

    // Trigger push and dismiss the prompt
    const dialogPromise = page.waitForEvent('dialog');
    await stackPage.pushButton.click();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    // Simulate user clicking "Cancel"
    await dialog.dismiss();

    // No new items should be added after dismiss
    await expect(stackPage.stackItems).toHaveCount(0);

    // No uncaught errors
    expect(pageErrors).toHaveLength(0);
  });

  test('Providing only whitespace to prompt does not add an item', async ({ page }) => {
    // Provide whitespace string to prompt and assert that trim prevents adding empty values
    const stackPage = new StackPage(page);

    // Ensure empty baseline
    await expect(stackPage.stackItems).toHaveCount(0);

    // Accept prompt with whitespace
    const dialogPromise = page.waitForEvent('dialog');
    await stackPage.pushButton.click();
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('    '); // whitespace only

    // No new items should be added
    await expect(stackPage.stackItems).toHaveCount(0);

    // No uncaught errors
    expect(pageErrors).toHaveLength(0);
  });

  test('No uncaught runtime errors are logged to the page during interactions', async ({ page }) => {
    // Perform a set of interactions and then assert there are no captured page errors
    const stackPage = new StackPage(page);

    // Interactions
    await stackPage.push('X');
    await stackPage.push('Y');

    // Pop once
    const popDialogPromise = page.waitForEvent('dialog');
    await stackPage.popButton.click();
    const popDialog = await popDialogPromise;
    expect(popDialog.type()).toBe('alert');
    await popDialog.accept();

    // Interact with prompt and dismiss
    const dialogPromise = page.waitForEvent('dialog');
    await stackPage.pushButton.click();
    const promptDialog = await dialogPromise;
    expect(promptDialog.type()).toBe('prompt');
    await promptDialog.dismiss();

    // After all interactions, assert there were no uncaught page errors
    expect(pageErrors.length).toBe(0);

    // Additionally assert that console did not log fatal errors (search for 'error' or 'exception' types)
    const fatalConsole = consoleMessages.find(m => m.type === 'error');
    expect(fatalConsole).toBeUndefined();
  });
});