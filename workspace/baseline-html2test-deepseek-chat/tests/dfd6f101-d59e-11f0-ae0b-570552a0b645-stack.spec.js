import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd6f101-d59e-11f0-ae0b-570552a0b645.html';

// Page Object for the Stack application
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#elementInput');
    this.pushButton = page.locator('button', { hasText: 'PUSH' });
    this.popButton = page.locator('button', { hasText: 'POP' });
    this.peekButton = page.locator('button', { hasText: 'PEEK' });
    this.clearButton = page.locator('button', { hasText: 'CLEAR' });
    this.stackContainer = page.locator('#stack');
    this.stackInfo = page.locator('#stackInfo');
    this.emptyMessage = page.locator('#emptyMessage');
    this.log = page.locator('#log');
    this.stackElements = () => page.locator('.stack-element');
    this.logEntries = () => page.locator('#log .log-entry');
  }

  async navigate() {
    await this.page.goto(APP_URL);
  }

  // Returns array of text contents of stack elements in DOM order (top-first in display, based on how DOM is built)
  async getStackElementTexts() {
    const count = await this.stackElements().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.stackElements().nth(i).textContent()).trim());
    }
    return texts;
  }

  async getStackInfoText() {
    return (await this.stackInfo.textContent()).trim();
  }

  async getLastLogText() {
    const count = await this.logEntries().count();
    if (count === 0) return '';
    return (await this.logEntries().nth(count - 1).textContent()).trim();
  }

  async pushValue(value) {
    await this.input.fill(value);
    await this.pushButton.click();
  }

  async pop() {
    await this.popButton.click();
  }

  async peek() {
    await this.peekButton.click();
  }

  async clear() {
    await this.clearButton.click();
  }

  async pressEnterInInput(value) {
    await this.input.fill(value);
    await this.input.press('Enter');
  }
}

test.describe('Stack Data Structure Visualization - UI and Behavior', () => {
  // Collect console errors and page errors to assert none occurred during tests
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages of type 'error'
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen for uncaught exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async () => {
    // Assert that there were no uncaught page errors or console error messages.
    // Tests will fail if any runtime errors (ReferenceError/SyntaxError/TypeError) happened in the page.
    expect(consoleErrors, `Console errors occurred: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    expect(pageErrors, `Page errors occurred: ${pageErrors.map(e => e.toString()).join('\n')}`).toEqual([]);
  });

  test('Initial load shows empty stack before demo initialization and then demo populates stack', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Navigate to the app
    await stackPage.navigate();

    // Immediately after load, before the demo timeout runs, the UI should indicate empty stack
    // Purpose: Verify the initial state and the "empty" messaging is present synchronously on load
    await expect(stackPage.stackInfo).toHaveText('Stack is empty');
    await expect(stackPage.emptyMessage).toBeVisible();

    // Wait for the demo initialization (the page uses a setTimeout to populate demo data after ~1s)
    // Purpose: Ensure the asynchronous demo initialization completes and UI updates accordingly
    await page.waitForSelector('text=Demo stack initialized with A, B, C', { timeout: 2500 });

    // After demo initialization, verify stack info updates to show 3 elements and top 'C'
    await expect(stackPage.stackInfo).toHaveText(/Stack Size: 3 \| Top: C/);

    // Verify DOM contains three stack elements (display order per implementation is: C, B, A)
    const elements = await stackPage.getStackElementTexts();
    expect(elements.length).toBe(3);
    // The DOM order (based on updateStackDisplay) should be ['C', 'B', 'A']
    expect(elements).toEqual(['C', 'B', 'A']);

    // Verify the log contains the demo initialization message as the most recent log
    const lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Demo stack initialized with A, B, C');
  });

  test('Push operation: push values via button and via Enter key, and handle empty value', async ({ page }) => {
    const stackPage = new StackPage(page);
    await stackPage.navigate();

    // Wait for demo initialization to complete to get predictable starting state
    await page.waitForSelector('text=Demo stack initialized with A, B, C', { timeout: 2500 });

    // Clear the stack to start fresh for push tests
    await stackPage.clear();
    // Wait for UI to update: empty message should be visible and stackInfo should reflect empty stack
    await expect(stackPage.stackInfo).toHaveText('Stack is empty');
    await expect(stackPage.emptyMessage).toBeVisible();

    // Attempt to push empty value - should log an error message and NOT change stack
    // Purpose: Validate input validation for empty push
    await stackPage.input.fill('   '); // whitespace only
    await stackPage.pushButton.click();
    let lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Cannot push empty value!');

    // Push values via button
    await stackPage.pushValue('X');
    await expect(stackPage.stackInfo).toHaveText(/Stack Size: 1 \| Top: X/);
    await expect(stackPage.emptyMessage).toBeHidden();
    let elements = await stackPage.getStackElementTexts();
    expect(elements[0]).toBe('X');

    // Push additional values via Enter key (test keyboard integration)
    await stackPage.pressEnterInInput('Y');
    // After Enter push, top should be Y and size 2
    await expect(stackPage.stackInfo).toHaveText(/Stack Size: 2 \| Top: Y/);
    elements = await stackPage.getStackElementTexts();
    expect(elements[0]).toBe('Y');
    expect(elements.length).toBe(2);

    // Verify logs for push operations contain the pushed values
    lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Pushed "Y" onto the stack');

    // Push until overflow (maximum 6 elements). Start by clearing and pushing exactly 6 then attempt 7th
    await stackPage.clear();
    await expect(stackPage.stackInfo).toHaveText('Stack is empty');

    // Push 6 elements
    for (let i = 1; i <= 6; i++) {
      await stackPage.pushValue(String(i));
    }
    await expect(stackPage.stackInfo).toHaveText(/Stack Size: 6 \| Top: 6/);

    // Attempt to push 7th element -> should log overflow and not increase count
    await stackPage.pushValue('7');
    lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Stack overflow! Maximum size reached (6 elements).');
    // Confirm still 6 elements
    elements = await stackPage.getStackElementTexts();
    expect(elements.length).toBe(6);
  });

  test('Pop operation: pops last pushed element, triggers pop animation, and handles underflow', async ({ page }) => {
    const stackPage = new StackPage(page);
    await stackPage.navigate();

    // Wait for demo to ensure consistent starting stack
    await page.waitForSelector('text=Demo stack initialized with A, B, C', { timeout: 2500 });

    // After demo, stack contains ['A','B','C'] displayed as ['C','B','A'] in DOM
    await expect(stackPage.stackInfo).toHaveText(/Stack Size: 3 \| Top: C/);

    // Capture count before pop
    let beforeCount = await stackPage.stackElements().count();

    // Click pop - expected behavior per implementation:
    // - The code actually pops the last value of the internal array (C)
    // - It adds 'pop' class to the DOM element that is currently :last-child (which is 'A', due to rendering order)
    // - Then after 500ms it calls updateStackDisplay to rebuild DOM for the new stack
    // So we assert:
    //  1) Log includes 'Popped "C" from the stack'
    //  2) Some element will receive 'pop' class briefly
    //  3) After timeout, the count decreases by 1 and stackInfo updates

    // Perform pop
    await stackPage.pop();

    // Immediately after pop, check the latest log mentions the popped value "C"
    let lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Popped "C" from the stack');

    // Check that some element gains the 'pop' class (animation)
    // We check within a short timeframe before updateStackDisplay runs (500ms)
    const popClassElement = page.locator('.stack-element.pop');
    await expect(popClassElement).toHaveCount(1);

    // Wait for the update to finish (slightly longer than the pop animation)
    await page.waitForTimeout(650);

    // After animation and update, stack size should reduce by 1
    const afterCount = await stackPage.stackElements().count();
    expect(afterCount).toBe(beforeCount - 1);

    // Now clear the stack to test underflow
    await stackPage.clear();
    await expect(stackPage.stackInfo).toHaveText('Stack is empty');

    // Attempt to pop from empty -> should log underflow message
    await stackPage.pop();
    lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Stack underflow! Cannot pop from empty stack.');
  });

  test('Peek operation: logs top element and visually highlights top element (implementation-specific behavior)', async ({ page }) => {
    const stackPage = new StackPage(page);
    await stackPage.navigate();

    // Ensure demo initialization completed
    await page.waitForSelector('text=Demo stack initialized with A, B, C', { timeout: 2500 });

    // At this point stack should have A, B, C (top C)
    await expect(stackPage.stackInfo).toHaveText(/Stack Size: 3 \| Top: C/);

    // Capture the element that will be targeted by peek: implementation highlights '.stack-element:last-child'
    // Based on DOM order this will be the bottom-most element 'A', but log will say top is 'C' - test should assert both behaviors
    const lastElementLocator = page.locator('.stack-element:last-child');
    const initialStyle = await lastElementLocator.evaluate(el => el.style.background || '');

    // Call peek
    await stackPage.peek();

    // The log should mention the top element 'C'
    const lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Top element is "C"');

    // Immediately after peek, the implementation changes inline style.background to highlight color
    // Check that the inline background changed to include '#ff6b6b' (the highlight gradient)
    await expect(lastElementLocator).toHaveJSProperty('style');
    const afterPeekStyle = await lastElementLocator.evaluate(el => el.style.background);
    expect(afterPeekStyle).toContain('ff6b6b');

    // After 800ms the style should revert to the original inline style (likely empty string)
    await page.waitForTimeout(900);
    const finalStyle = await lastElementLocator.evaluate(el => el.style.background || '');
    expect(finalStyle).toBe(initialStyle);
  });

  test('Clear operation: clears stack and logs appropriate messages; repeated clear reports already empty', async ({ page }) => {
    const stackPage = new StackPage(page);
    await stackPage.navigate();

    // Wait for demo init
    await page.waitForSelector('text=Demo stack initialized with A, B, C', { timeout: 2500 });

    // Clear the stack and verify it becomes empty
    await stackPage.clear();
    await expect(stackPage.stackInfo).toHaveText('Stack is empty');
    await expect(stackPage.emptyMessage).toBeVisible();
    let lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Cleared the entire stack');

    // Clearing again should report that the stack is already empty
    await stackPage.clear();
    lastLog = await stackPage.getLastLogText();
    expect(lastLog).toContain('Stack is already empty.');
  });

  test('Operation log accumulates entries and scrolls appropriately', async ({ page }) => {
    const stackPage = new StackPage(page);
    await stackPage.navigate();

    // Wait for demo initialization
    await page.waitForSelector('text=Demo stack initialized with A, B, C', { timeout: 2500 });

    // Clear stack and perform a series of operations to generate multiple log entries
    await stackPage.clear();
    await stackPage.pushValue('Alpha');
    await stackPage.pushValue('Beta');
    await stackPage.pop();
    await stackPage.peek();
    await stackPage.pushValue('Gamma');

    // Ensure at least 5 log entries exist
    const count = await stackPage.logEntries().count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Verify the most recent entry corresponds to the last action 'Pushed "Gamma" onto the stack'
    const recent = await stackPage.getLastLogText();
    expect(recent).toContain('Pushed "Gamma" onto the stack');

    // Verify the operation-log container exists and has overflow-y set by CSS; we can't read computed CSS reliably across environments,
    // but we can ensure the log element is visible and holds the expected number of child log entries.
    await expect(stackPage.log).toBeVisible();
  });
});