import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/6e096b01-d5a0-11f0-8040-510e90b1f3a7.html';

// Page Object for the Stack app to keep tests readable and encapsulate interactions
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.pushValueInput = page.locator('#pushValue');
    this.pushBtn = page.locator('#pushBtn');
    this.popBtn = page.locator('#popBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.stackContainer = page.locator('#stack');
    this.operationResult = page.locator('#operationResult');
    this.stackItems = () => page.locator('#stack .stack-item');
    this.stackBase = page.locator('.stack-base');
  }

  // Pushes a value using the push button
  async pushValue(value) {
    await this.pushValueInput.fill(value);
    await this.pushBtn.click();
  }

  // Press Enter in the input to push
  async pushValueByEnter(value) {
    await this.pushValueInput.fill(value);
    await this.pushValueInput.press('Enter');
  }

  // Click pop
  async pop() {
    await this.popBtn.click();
  }

  // Click peek
  async peek() {
    await this.peekBtn.click();
  }

  // Click clear
  async clear() {
    await this.clearBtn.click();
  }

  // Returns array of trimmed textContents of stack items in DOM order
  async getStackItemsText() {
    const count = await this.stackItems().count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.stackItems().nth(i).textContent()).trim());
    }
    return texts;
  }

  // Returns number of stack items
  async getStackCount() {
    return await this.stackItems().count();
  }

  // Returns the text of the operation result area
  async getOperationResultText() {
    return (await this.operationResult.textContent()).trim();
  }

  // Checks whether pop button is disabled
  async isPopDisabled() {
    return await this.popBtn.getAttribute('disabled') !== null;
  }

  // Checks whether peek button is disabled
  async isPeekDisabled() {
    return await this.peekBtn.getAttribute('disabled') !== null;
  }

  // Returns whether the top stack item has the 'top' class
  async topItemHasTopClass() {
    const count = await this.getStackCount();
    if (count === 0) return false;
    const last = this.stackItems().nth(count - 1);
    const classList = await last.getAttribute('class');
    return classList.split(' ').includes('top');
  }

  // Returns inline style.backgroundColor of top element
  async getTopInlineBackgroundColor() {
    const count = await this.getStackCount();
    if (count === 0) return '';
    return await this.page.evaluate((el) => el.style.backgroundColor, await this.stackItems().nth(count - 1).elementHandle());
  }
}

test.describe('Stack Implementation - E2E', () => {
  // Arrays to collect console errors and uncaught page errors during each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize arrays for this test
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      // Collect the error object/message for assertions later
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // After each test, ensure there were no unexpected console or page errors
    // This asserts the page executed without producing console errors or uncaught exceptions.
    // If the application has runtime errors, these assertions will fail and surface them.
    expect(consoleErrors, `Expected no console.error messages, but found: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Expected no uncaught page errors, but found: ${pageErrors.map(e => String(e)).join('; ')}`).toEqual([]);
  });

  test('Initial page load shows correct default state', async ({ page }) => {
    // Verify initial UI, buttons, and stack base presence
    const stackPage = new StackPage(page);

    // Title and input presence
    await expect(page.locator('h1')).toHaveText('Stack Implementation');
    await expect(stackPage.pushValueInput).toBeVisible();

    // Initially, there should be no stack items (only the base)
    await expect(stackPage.stackBase).toBeVisible();
    expect(await stackPage.getStackCount()).toBe(0);

    // Operation result should be empty
    expect(await stackPage.getOperationResultText()).toBe('');

    // Pop and Peek should be disabled initially
    expect(await stackPage.isPopDisabled()).toBe(true);
    expect(await stackPage.isPeekDisabled()).toBe(true);

    // Push and Clear should be enabled
    await expect(stackPage.pushBtn).toBeEnabled();
    await expect(stackPage.clearBtn).toBeEnabled();
  });

  test('Push adds an item, updates view and enables buttons', async ({ page }) => {
    // Test pushing a single value via the push button
    const stackPage = new StackPage(page);

    await stackPage.pushValue('alpha');

    // After push, the input should be cleared
    await expect(stackPage.pushValueInput).toHaveValue('');

    // Operation result should indicate the pushed value
    expect(await stackPage.getOperationResultText()).toBe('Pushed: alpha');

    // There should be exactly one stack item with the pushed text
    expect(await stackPage.getStackCount()).toBe(1);
    expect(await stackPage.getStackItemsText()).toEqual(['alpha']);

    // Top class should be present on the only item
    expect(await stackPage.topItemHasTopClass()).toBe(true);

    // Pop and Peek should now be enabled
    await expect(stackPage.popBtn).toBeEnabled();
    await expect(stackPage.peekBtn).toBeEnabled();
  });

  test('Push multiple values maintains correct top marking and order', async ({ page }) => {
    // Push three values and validate item count and top marking
    const stackPage = new StackPage(page);

    await stackPage.pushValue('one');
    await stackPage.pushValue('two');
    await stackPage.pushValue('three');

    // There should be three items with expected texts in DOM order
    expect(await stackPage.getStackCount()).toBe(3);
    expect(await stackPage.getStackItemsText()).toEqual(['one', 'two', 'three']);

    // Only the last item should have the 'top' class
    const count = await stackPage.getStackCount();
    for (let i = 0; i < count; i++) {
      const hasTop = await page.locator('#stack .stack-item').nth(i).getAttribute('class').then(c => c.split(' ').includes('top'));
      if (i === count - 1) {
        expect(hasTop).toBe(true);
      } else {
        expect(hasTop).toBe(false);
      }
    }
  });

  test('Pop removes the last pushed value and updates the top', async ({ page }) => {
    // Push two values, pop once, expect last removed and top moves
    const stackPage = new StackPage(page);

    await stackPage.pushValue('first');
    await stackPage.pushValue('second');

    // Pop should remove 'second'
    await stackPage.pop();
    expect(await stackPage.getOperationResultText()).toBe('Popped: second');

    // One item remains and it should be 'first' and have 'top' class
    expect(await stackPage.getStackCount()).toBe(1);
    expect(await stackPage.getStackItemsText()).toEqual(['first']);
    expect(await stackPage.topItemHasTopClass()).toBe(true);

    // After popping to a single element, pop and peek should still be enabled
    await expect(stackPage.popBtn).toBeEnabled();
    await expect(stackPage.peekBtn).toBeEnabled();

    // Pop again to empty the stack
    await stackPage.pop();
    expect(await stackPage.getOperationResultText()).toBe('Popped: first');

    // Now stack should be empty and pop/peek should be disabled
    expect(await stackPage.getStackCount()).toBe(0);
    expect(await stackPage.isPopDisabled()).toBe(true);
    expect(await stackPage.isPeekDisabled()).toBe(true);
  });

  test('Peek shows top element and briefly highlights it', async ({ page }) => {
    // Test the peek operation both functionally and visually (highlighting)
    const stackPage = new StackPage(page);

    await stackPage.pushValue('peek-me');

    // Capture the inline background color before peek (should be empty)
    const beforeColor = await stackPage.getTopInlineBackgroundColor();
    expect(beforeColor).toBe('');

    // Click peek and assert operation result text
    await stackPage.peek();
    expect(await stackPage.getOperationResultText()).toBe('Top element: peek-me');

    // Immediately after clicking, top element should have inline background color set
    const highlightColor = await stackPage.getTopInlineBackgroundColor();

    // The inline style may be normalized; check for either hex or rgb value used in the app
    const acceptableColors = ['#fff2cc', 'rgb(255, 242, 204)'];
    expect(acceptableColors.includes(highlightColor) || highlightColor.length > 0).toBe(true);

    // Wait longer than the 500ms timeout in the app to ensure highlight is cleared
    await page.waitForTimeout(700);
    const afterColor = await stackPage.getTopInlineBackgroundColor();
    expect(afterColor).toBe('');
  });

  test('Clear removes all items and updates buttons and result', async ({ page }) => {
    // Push several items then clear the stack
    const stackPage = new StackPage(page);

    await stackPage.pushValue('a');
    await stackPage.pushValue('b');
    await stackPage.pushValue('c');

    // Ensure items present
    expect(await stackPage.getStackCount()).toBe(3);

    // Click clear
    await stackPage.clear();
    expect(await stackPage.getOperationResultText()).toBe('Stack cleared');

    // There should be no stack items afterward
    expect(await stackPage.getStackCount()).toBe(0);

    // Pop and peek should be disabled after clearing
    expect(await stackPage.isPopDisabled()).toBe(true);
    expect(await stackPage.isPeekDisabled()).toBe(true);
  });

  test('Pressing Enter in the input triggers a push', async ({ page }) => {
    // Verify pressing Enter key on the input triggers a push
    const stackPage = new StackPage(page);

    await stackPage.pushValueByEnter('enter-push');
    expect(await stackPage.getOperationResultText()).toBe('Pushed: enter-push');
    expect(await stackPage.getStackCount()).toBe(1);
    expect(await stackPage.getStackItemsText()).toEqual(['enter-push']);
  });

  test('Clicking push with empty input does not add an item', async ({ page }) => {
    // Ensure that pushing an empty string is ignored
    const stackPage = new StackPage(page);

    // Ensure input is empty
    await stackPage.pushValueInput.fill('');
    await stackPage.pushBtn.click();

    // No new items should be added, operation result should remain empty
    expect(await stackPage.getStackCount()).toBe(0);
    expect(await stackPage.getOperationResultText()).toBe('');
  });

  test('Accessibility and basic UI checks: buttons have accessible names and are visible', async ({ page }) => {
    // Basic accessibility checks: buttons exist and are visible and have text
    const stackPage = new StackPage(page);

    await expect(stackPage.pushBtn).toBeVisible();
    await expect(stackPage.popBtn).toBeVisible();
    await expect(stackPage.peekBtn).toBeVisible();
    await expect(stackPage.clearBtn).toBeVisible();

    await expect(stackPage.pushBtn).toHaveText('Push');
    await expect(stackPage.popBtn).toHaveText('Pop');
    await expect(stackPage.peekBtn).toHaveText('Peek');
    await expect(stackPage.clearBtn).toHaveText('Clear Stack');
  });
});