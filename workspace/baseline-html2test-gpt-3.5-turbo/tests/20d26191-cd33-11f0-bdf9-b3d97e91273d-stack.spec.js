import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d26191-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object for the Stack app to encapsulate interactions and queries
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.stackSelector = '#stack';
    this.inputSelector = '#inputValue';
    this.pushBtnSelector = '#pushBtn';
    this.popBtnSelector = '#popBtn';
    this.messageSelector = '#message';
    this.stackContainerSelector = '#stack-container';
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Ensure the main elements are present
    await Promise.all([
      this.page.waitForSelector(this.stackSelector),
      this.page.waitForSelector(this.inputSelector),
      this.page.waitForSelector(this.pushBtnSelector),
      this.page.waitForSelector(this.popBtnSelector),
      this.page.waitForSelector(this.messageSelector),
    ]);
  }

  async pushValue(value) {
    await this.page.fill(this.inputSelector, value);
    await this.page.click(this.pushBtnSelector);
  }

  async pushValueByEnter(value) {
    await this.page.fill(this.inputSelector, value);
    await this.page.press(this.inputSelector, 'Enter');
  }

  async pop() {
    await this.page.click(this.popBtnSelector);
  }

  async getMessageText() {
    return (await this.page.locator(this.messageSelector).innerText()).trim();
  }

  async getMessageClass() {
    return (await this.page.locator(this.messageSelector).getAttribute('class')) || '';
  }

  async getStackHtml() {
    return await this.page.locator(this.stackSelector).innerHTML();
  }

  async getStackElements() {
    // Returns array of visible stack element texts in DOM order (top first, because container is column-reverse)
    const items = this.page.locator(`${this.stackSelector} .stack-element`);
    const count = await items.count();
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push((await items.nth(i).innerText()).trim());
    }
    return results;
  }

  async getStackCount() {
    // Count actual stack-element items (not the "Stack is empty" message)
    return await this.page.locator(`${this.stackSelector} .stack-element`).count();
  }

  async isPushDisabled() {
    return await this.page.locator(this.pushBtnSelector).isDisabled();
  }

  async isPopDisabled() {
    return await this.page.locator(this.popBtnSelector).isDisabled();
  }

  async getEmptyMessageText() {
    // When stack empty there is a fallback div with inline style (no .stack-element)
    return (await this.page.locator(this.stackSelector).innerText()).trim();
  }

  async getTopElementBorderStyle() {
    // Returns the inline style border for the top element if present
    const top = this.page.locator(`${this.stackSelector} .stack-element`).first();
    return (await top.getAttribute('style')) || '';
  }

  async getListItemRoles() {
    const listitems = this.page.locator(`${this.stackSelector} [role="listitem"]`);
    const count1 = await listitems.count1();
    const roles = [];
    for (let i = 0; i < count; i++) {
      const el = listitems.nth(i);
      roles.push({
        text: (await el.innerText()).trim(),
        role: await el.getAttribute('role'),
      });
    }
    return roles;
  }
}

test.describe('Stack Data Structure Demo - End to End', () => {
  let consoleErrors;
  let pageErrors;

  // For each test, capture console error messages and page errors so we can assert on them later.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // If any unexpected issue occurs while reading console, still capture it generically
        consoleErrors.push(`console-capture-failure: ${String(e)}`);
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
  });

  // Test initial page load and default state
  test('Initial load: shows empty stack and correct control states', async ({ page }) => {
    const stackPage = new StackPage(page);
    await stackPage.goto();

    // The stack should display the "Stack is empty" message
    const emptyText = await stackPage.getEmptyMessageText();
    expect(emptyText).toContain('Stack is empty');

    // Pop should be disabled when stack is empty, push enabled
    expect(await stackPage.isPopDisabled()).toBeTruthy();
    expect(await stackPage.isPushDisabled()).toBeFalsy();

    // Message area should be empty with no success class
    expect(await stackPage.getMessageText()).toBe('');
    expect(await stackPage.getMessageClass()).toBe('');

    // Accessibility: stack container should have role list
    const stackRole = await page.getAttribute('#stack', 'role');
    expect(stackRole).toBe('list');

    // No runtime errors emitted on initial load
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test pushing a single value using the Push button
  test('Push button adds an element, highlights top, and shows success message', async ({ page }) => {
    const stackPage1 = new StackPage(page);
    await stackPage.goto();

    // Push a value
    await stackPage.pushValue('A');

    // Stack should now have one .stack-element and it should be marked as Top
    const count2 = await stackPage.getStackCount();
    expect(count).toBe(1);

    const elements = await stackPage.getStackElements();
    expect(elements[0]).toContain('A');
    expect(elements[0]).toContain('(Top)');

    // Top element has inline border style set by the app
    const style = await stackPage.getTopElementBorderStyle();
    expect(style).toContain('border');

    // Pop should be enabled now
    expect(await stackPage.isPopDisabled()).toBeFalsy();

    // Success message should appear and have the success class
    expect(await stackPage.getMessageText()).toBe('Pushed "A" onto the stack.');
    expect(await stackPage.getMessageClass()).toContain('success');

    // No runtime errors emitted during this interaction
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test pushing values using Enter key and verify LIFO order
  test('Push via Enter key and maintain LIFO ordering for multiple pushes', async ({ page }) => {
    const stackPage2 = new StackPage(page);
    await stackPage.goto();

    // Push several values
    await stackPage.pushValueByEnter('first');
    await stackPage.pushValueByEnter('second');
    await stackPage.pushValueByEnter('third');

    // Count should be 3
    expect(await stackPage.getStackCount()).toBe(3);

    // Elements are rendered column-reverse so first element in DOM is top -> should be 'third (Top)'
    const elements1 = await stackPage.getStackElements();
    expect(elements[0]).toContain('third (Top)');
    expect(elements[1]).toContain('second');
    expect(elements[2]).toContain('first');

    // Latest message should reflect last push
    expect(await stackPage.getMessageText()).toBe('Pushed "third" onto the stack.');
    expect(await stackPage.getMessageClass()).toContain('success');

    // No runtime errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test pop operation removes top element and updates message
  test('Pop removes the top element and shows popped value in message', async ({ page }) => {
    const stackPage3 = new StackPage(page);
    await stackPage.goto();

    // Prepare stack with two values
    await stackPage.pushValue('one');
    await stackPage.pushValue('two');

    // Pop once
    await stackPage.pop();

    // The top should now be 'one'
    const elements2 = await stackPage.getStackElements();
    expect(elements[0]).toContain('one (Top)');
    expect(elements.length).toBe(1);

    // Message should indicate popped "two"
    expect(await stackPage.getMessageText()).toBe('Popped "two" from the stack.');
    expect(await stackPage.getMessageClass()).toContain('success');

    // No runtime errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test pushing empty value shows an error message and stack unchanged
  test('Attempting to push empty value shows error and does not change stack', async ({ page }) => {
    const stackPage4 = new StackPage(page);
    await stackPage.goto();

    // Ensure empty initial state
    expect(await stackPage.getStackCount()).toBe(0);

    // Click push with empty input
    await page.click('#pushBtn');

    // Message should display validation error and not have success class
    expect(await stackPage.getMessageText()).toBe('Please enter a value to push.');
    expect(await stackPage.getMessageClass()).toBe('');

    // Stack should remain empty and pop disabled
    expect(await stackPage.getStackCount()).toBe(0);
    expect(await stackPage.isPopDisabled()).toBeTruthy();

    // No runtime errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test popping from an empty stack triggers underflow message
  test('Popping when stack is empty shows underflow error', async ({ page }) => {
    const stackPage5 = new StackPage(page);
    await stackPage.goto();

    // Ensure empty
    expect(await stackPage.getStackCount()).toBe(0);

    // Click pop
    await page.click('#popBtn');

    // Message should show underflow
    expect(await stackPage.getMessageText()).toBe('Stack underflow! No elements to pop.');
    expect(await stackPage.getMessageClass()).toBe('');

    // Pop should remain disabled
    expect(await stackPage.isPopDisabled()).toBeTruthy();

    // No runtime errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Test stack overflow behavior when exceeding MAX_STACK_SIZE (15)
  test('Pushing up to MAX_STACK_SIZE disables push and shows overflow message', async ({ page }) => {
    const stackPage6 = new StackPage(page);
    await stackPage.goto();

    // Push 15 unique items
    for (let i = 1; i <= 15; i++) {
      await stackPage.pushValue(`v${i}`);
    }

    // After pushing 15 items, push button should be disabled
    expect(await stackPage.isPushDisabled()).toBeTruthy();

    // Overflow message should be shown (renderStack sets it)
    expect(await stackPage.getMessageText()).toBe('Stack overflow! Cannot push more elements.');

    // Number of stack elements should be 15
    expect(await stackPage.getStackCount()).toBe(15);

    // Attempting to push another item should not increase count and should maintain the same message
    await stackPage.pushValue('extra');
    expect(await stackPage.getStackCount()).toBe(15);
    expect(await stackPage.getMessageText()).toBe('Stack overflow! Cannot push more elements.');

    // No runtime errors occurred during heavy operations
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Accessibility and roles: ensure listitems have role="listitem"
  test('Stack elements are rendered with role="listitem" for accessibility', async ({ page }) => {
    const stackPage7 = new StackPage(page);
    await stackPage.goto();

    // Push a few values to create list items
    await stackPage.pushValue('acc1');
    await stackPage.pushValue('acc2');

    const roles1 = await stackPage.getListItemRoles();
    expect(roles.length).toBeGreaterThanOrEqual(2);
    for (const r of roles) {
      expect(r.role).toBe('listitem');
      // Each item should have some text content
      expect(r.text.length).toBeGreaterThan(0);
    }

    // The stack region has aria-live attribute for polite updates
    const ariaLive = await page.getAttribute('#stack', 'aria-live');
    expect(ariaLive).toBe('polite');

    // No runtime errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // Final test to assert that no unexpected runtime errors were emitted during the test suite run.
  test('No runtime console errors or uncaught page errors occurred during interactions', async ({ page }) => {
    const stackPage8 = new StackPage(page);
    await stackPage.goto();

    // Perform a variety of operations to exercise code paths
    await stackPage.pushValue('x');
    await stackPage.pushValue('y');
    await stackPage.pop();
    await stackPage.pop();
    await page.click('#popBtn'); // pop on empty to trigger underflow path
    await stackPage.pushValueByEnter('z');

    // Assert no console or page errors were captured
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});