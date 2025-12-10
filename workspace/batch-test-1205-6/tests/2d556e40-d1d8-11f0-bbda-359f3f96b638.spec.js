import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d556e40-d1d8-11f0-bbda-359f3f96b638.html';

// Page Object for the Stack application
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#stackValue';
    this.pushButtonSelector = "button[onclick='pushToStack()']";
    this.popButtonSelector = "button[onclick='popFromStack()']";
    this.stackSelector = '#stack';
    this.itemSelector = '.stack-item';
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async getStackItems() {
    // returns array of text contents of stack DOM items in order
    return this.page.$$eval(this.itemSelector, items => items.map(i => i.textContent));
  }

  async getStackItemCount() {
    return this.page.$$eval(this.itemSelector, items => items.length);
  }

  async getInputValue() {
    return this.page.$eval(this.inputSelector, el => el.value);
  }

  // Push value; if expectDialog is true, will return the dialog message
  async push(value, expectDialog = false) {
    if (value !== null && value !== undefined) {
      await this.page.fill(this.inputSelector, String(value));
    }
    if (expectDialog) {
      const dialogPromise = this.page.waitForEvent('dialog');
      await this.page.click(this.pushButtonSelector);
      const dialog = await dialogPromise;
      const msg = dialog.message();
      await dialog.accept();
      return msg;
    } else {
      await this.page.click(this.pushButtonSelector);
      // wait for any DOM change to settle
      await this.page.waitForTimeout(50);
      return null;
    }
  }

  // Pop value; if expectDialog is true, will return the dialog message
  async pop(expectDialog = false) {
    if (expectDialog) {
      const dialogPromise1 = this.page.waitForEvent('dialog');
      await this.page.click(this.popButtonSelector);
      const dialog1 = await dialogPromise;
      const msg1 = dialog.message();
      await dialog.accept();
      return msg;
    } else {
      await this.page.click(this.popButtonSelector);
      // wait for DOM update
      await this.page.waitForTimeout(50);
      return null;
    }
  }

  // Read the internal JS stack array directly from page context
  async getInternalStackArray() {
    return this.page.evaluate(() => {
      // window.stack exists in the page's script; return its value for assertions
      return Array.isArray(window.stack) ? window.stack.slice() : null;
    });
  }
}

test.describe('Stack Implementation - FSM Validation and UI behavior', () => {
  // Collect console messages and page errors for each test run
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.afterEach(async ({ page }) => {
    // After each test ensure no unexpected JS runtime errors occurred.
    // Tests that expect alerts/dialogs will explicitly validate those dialogs.
    // Here we assert that there were no page errors (ReferenceError / TypeError / SyntaxError, etc.)
    expect(pageErrors.length).toBe(0);

    // Also assert there are no console.error messages emitted by the page
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
  });

  test('Initial state S0_Empty: Stack is Empty on load and renderStack() entry action reflected in DOM', async ({ page }) => {
    // Validate the initial state S0_Empty: no items in #stack and internal stack length === 0
    const stackPage = new StackPage(page);
    await stackPage.goto();

    // Verify DOM: no .stack-item elements
    const count = await stackPage.getStackItemCount();
    expect(count).toBe(0);

    // Verify innerHTML is empty string or whitespace (renderStack clears stackDiv.innerHTML)
    const stackInnerHTML = await page.$eval('#stack', el => el.innerHTML);
    expect(stackInnerHTML.trim()).toBe('');

    // Verify internal JS stack variable evidence: stack.length === 0
    const internal = await stackPage.getInternalStackArray();
    expect(Array.isArray(internal)).toBe(true);
    expect(internal.length).toBe(0);
  });

  test('PushEvent from S0_Empty -> S1_NonEmpty: pushing a value adds an item, clears input, and updates internal stack', async ({ page }) => {
    // This test validates the Push transition from empty to non-empty.
    const stackPage1 = new StackPage(page);
    await stackPage.goto();

    // Push a value (42)
    await stackPage.push('42');

    // After push, there should be one stack item with text '42'
    const items = await stackPage.getStackItems();
    expect(items.length).toBe(1);
    expect(items[0]).toBe('42');

    // Input should be cleared after successful push
    const inputVal = await stackPage.getInputValue();
    expect(inputVal).toBe('');

    // Internal stack array should reflect the pushed value
    const internal1 = await stackPage.getInternalStackArray();
    expect(internal).toEqual(['42']);
  });

  test('S1_NonEmpty -> S1_NonEmpty: multiple PushEvent lead to additional items and correct order', async ({ page }) => {
    // Validate pushing multiple items when non-empty keeps stack non-empty and appends items
    const stackPage2 = new StackPage(page);
    await stackPage.goto();

    // Push 1 then 2 then 3
    await stackPage.push('1');
    await stackPage.push('2');
    await stackPage.push('3');

    // Expect 3 items in DOM in the same order they were pushed (renderStack uses forEach append)
    const items1 = await stackPage.getStackItems();
    expect(items.length).toBe(3);
    expect(items).toEqual(['1', '2', '3']);

    // Internal stack should match
    const internal2 = await stackPage.getInternalStackArray();
    expect(internal).toEqual(['1', '2', '3']);

    // Visual feedback: items should have class 'stack-item'
    const classChecks = await page.$$eval('.stack-item', els => els.map(e => e.className));
    expect(classChecks.every(c => c.includes('stack-item'))).toBe(true);
  });

  test('S1_NonEmpty PopEvent reduces items (LIFO) and updates internal stack - NonEmpty -> NonEmpty', async ({ page }) => {
    // Validate pop removes last pushed item (LIFO) when multiple items remain
    const stackPage3 = new StackPage(page);
    await stackPage.goto();

    // Seed with two items
    await stackPage.push('A');
    await stackPage.push('B');

    // Pop once - should remove 'B' and leave 'A'
    await stackPage.pop();

    const itemsAfterPop = await stackPage.getStackItems();
    expect(itemsAfterPop.length).toBe(1);
    expect(itemsAfterPop[0]).toBe('A');

    const internal3 = await stackPage.getInternalStackArray();
    expect(internal).toEqual(['A']);
  });

  test('S1_NonEmpty PopEvent leading to S0_Empty: popping last item empties the stack', async ({ page }) => {
    // Validate popping the last item transitions to empty state
    const stackPage4 = new StackPage(page);
    await stackPage.goto();

    // Seed with one item
    await stackPage.push('only');

    // Pop once - should remove the last item and stack becomes empty
    await stackPage.pop();

    const itemsAfter = await stackPage.getStackItems();
    expect(itemsAfter.length).toBe(0);

    const internal4 = await stackPage.getInternalStackArray();
    expect(internal.length).toBe(0);

    // Ensure DOM innerHTML cleared
    const stackInner = await page.$eval('#stack', el => el.innerHTML);
    expect(stackInner.trim()).toBe('');
  });

  test('Edge case: PopEvent on S0_Empty triggers alert dialog "Stack is empty! Nothing to pop."', async ({ page }) => {
    // Validate behavior when popping an empty stack - should raise an alert with expected message
    const stackPage5 = new StackPage(page);
    await stackPage.goto();

    // Ensure stack is empty to start
    const initialCount = await stackPage.getStackItemCount();
    expect(initialCount).toBe(0);

    // Pop and expect dialog
    const dialogMsg = await stackPage.pop(true);
    expect(dialogMsg).toBe('Stack is empty! Nothing to pop.');

    // After dialog accepted, stack remains empty
    const afterCount = await stackPage.getStackItemCount();
    expect(afterCount).toBe(0);

    // Internal stack remains an empty array
    const internal5 = await stackPage.getInternalStackArray();
    expect(internal.length).toBe(0);
  });

  test('Edge case: PushEvent with empty input shows alert "Please enter a value to push onto the stack."', async ({ page }) => {
    // Validate pushing without providing a value triggers an alert and does not modify stack
    const stackPage6 = new StackPage(page);
    await stackPage.goto();

    // Ensure input is empty
    await page.fill('#stackValue', '');
    const beforeCount = await stackPage.getStackItemCount();
    expect(beforeCount).toBe(0);

    // Click push and expect dialog message
    const dialogMsg1 = await stackPage.push('', true);
    expect(dialogMsg).toBe('Please enter a value to push onto the stack.');

    // Stack should still be empty after the attempted push
    const afterCount1 = await stackPage.getStackItemCount();
    expect(afterCount).toBe(0);

    // Internal stack should be unchanged
    const internal6 = await stackPage.getInternalStackArray();
    expect(internal.length).toBe(0);
  });

  test('Sanity: verify there are no console errors or page errors throughout typical interactions', async ({ page }) => {
    // This test performs a typical sequence of interactions and then asserts there were no JS runtime errors or console.error calls.
    const stackPage7 = new StackPage(page);
    await stackPage.goto();

    // Perform a sequence: push, push, pop, push, pop, pop
    await stackPage.push('10');
    await stackPage.push('20');
    await stackPage.pop();
    await stackPage.push('30');
    await stackPage.pop();
    await stackPage.pop(); // should now be empty

    // Validate final internal state
    const internal7 = await stackPage.getInternalStackArray();
    expect(Array.isArray(internal)).toBe(true);
    expect(internal.length).toBe(0);

    // The afterEach hook will assert pageErrors.length === 0 and no console.error messages,
    // but include an explicit check here as well to provide clearer test failure reasons.
    // consoleMessages and pageErrors are collected in beforeEach via listeners.
    const consoleErrors1 = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});