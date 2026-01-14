import { test, expect } from '@playwright/test';

// Page object model for the Stack demo page
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#stackInput');
    this.pushBtn = page.locator('#pushBtn');
    this.popBtn = page.locator('#popBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.stackDisplay = page.locator('#stackDisplay');
    this.message = page.locator('#message');
  }

  async push(value) {
    await this.input.fill(value);
    await this.pushBtn.click();
  }

  async pushByEnter(value) {
    await this.input.fill(value);
    await this.input.press('Enter');
  }

  async pop() {
    await this.popBtn.click();
  }

  async peek() {
    await this.peekBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  async getMessageText() {
    return this.message.textContent();
  }

  async getMessageColor() {
    return this.message.evaluate((el) => getComputedStyle(el).color);
  }

  async getStackNodeTexts() {
    // returns array of texts for .stack-node elements in DOM order
    return this.stackDisplay.locator('.stack-node').allTextContents();
  }

  async getStackNodeCount() {
    return this.stackDisplay.locator('.stack-node').count();
  }

  async hasEmptyMessage() {
    // checks for the "Stack is empty" informational element inside stackDisplay
    const txt = (await this.stackDisplay.textContent()) || '';
    return txt.trim().includes('Stack is empty');
  }

  async isPushEnabled() {
    return this.pushBtn.isEnabled();
  }

  async isPopEnabled() {
    return this.popBtn.isEnabled();
  }

  async isPeekEnabled() {
    return this.peekBtn.isEnabled();
  }

  async isClearEnabled() {
    return this.clearBtn.isEnabled();
  }

  async topNodeAriaLabel() {
    // find node with .top class and return its aria-label
    const top = this.stackDisplay.locator('.stack-node.top');
    if (await top.count() === 0) return null;
    return top.getAttribute('aria-label');
  }
}

// The exact URL provided in the requirements (note: includes a space as specified)
const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0ccaa790-d5b5-11f0-899c-75bf12e026a9.html';

// Helper to collect page and console errors for a page instance
async function attachErrorListeners(page) {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    // Collect runtime errors thrown on the page (ReferenceError, TypeError, SyntaxError, etc.)
    pageErrors.push(err);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  return { pageErrors, consoleErrors };
}

test.describe('Stack Data Structure Demo - FSM validation', () => {
  // Each test will open a fresh page and attach listeners to capture console/page errors.
  test('Initial state S0_Empty: UI shows empty state and action buttons disabled', async ({ page }) => {
    // Attach listeners to observe any runtime or console errors
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    // Load the application (URL provided exactly as in the requirements)
    await page.goto(APP_URL);

    const stackPage = new StackPage(page);

    // Validate that the stack display shows the empty message
    await expect(stackPage.stackDisplay).toBeVisible();
    expect(await stackPage.hasEmptyMessage()).toBeTruthy();

    // Buttons: Push enabled, Pop/Peek/Clear disabled
    expect(await stackPage.isPushEnabled()).toBeTruthy();
    expect(await stackPage.isPopEnabled()).toBeFalsy();
    expect(await stackPage.isPeekEnabled()).toBeFalsy();
    expect(await stackPage.isClearEnabled()).toBeFalsy();

    // The message area should initially be empty
    const msg = (await stackPage.getMessageText()) || '';
    expect(msg.trim()).toBe('');

    // Assert that no runtime ReferenceError/TypeError/SyntaxError occurred
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    // Also ensure no console.error was logged (helps detect subtle issues)
    expect(consoleErrors.length).toBe(0);
  });

  test('PushEvent: pushing a value transitions S0_Empty -> S1_NonEmpty and updates DOM and message', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Push value "A"
    await stackPage.push('A');

    // Message should reflect the pushed value
    await expect(stackPage.message).toHaveText('Pushed "A" onto the stack.');

    // The message should be styled as a non-error (color set by page script)
    const color = await stackPage.getMessageColor();
    // Basic sanity: color should not equal the error red color (rgb(231, 76, 60))
    expect(color).not.toBe('rgb(231, 76, 60)');

    // Stack display should contain one node with text 'A' and it should be the top
    const nodes = await stackPage.getStackNodeTexts();
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toBe('A');

    const topLabel = await stackPage.topNodeAriaLabel();
    expect(topLabel).toContain('Top of the stack: A');

    // After pushing, Pop/Peek/Clear should be enabled
    expect(await stackPage.isPopEnabled()).toBeTruthy();
    expect(await stackPage.isPeekEnabled()).toBeTruthy();
    expect(await stackPage.isClearEnabled()).toBeTruthy();

    // Input should be cleared and focused (we can at least check it's empty)
    expect(await stackPage.input.inputValue()).toBe('');

    // Verify no critical runtime errors occurred
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('EnterKeyEvent: pressing Enter pushes a value and triggers PushEvent action', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Push first value 'A' using button to establish initial non-empty state
    await stackPage.push('A');

    // Now push 'B' via Enter key
    await stackPage.pushByEnter('B');

    // The stack should now have two nodes; the last .stack-node should be the top 'B'
    const nodes = await stackPage.getStackNodeTexts();
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    // The DOM order preserves insertion; last item should be the top-most value ('B')
    expect(nodes[nodes.length - 1]).toBe('B');

    // Top node aria-label should refer to B
    const topLabel = await stackPage.topNodeAriaLabel();
    expect(topLabel).toContain('Top of the stack: B');

    // Message after Enter push should reflect the pushed value
    await expect(stackPage.message).toHaveText('Pushed "B" onto the stack.');

    // No critical runtime errors
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('PeekEvent: peeking shows top without modifying the stack', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Prepare stack with two items
    await stackPage.push('X');
    await stackPage.push('Y');

    const beforeNodes = await stackPage.getStackNodeTexts();
    const beforeCount = beforeNodes.length;
    const currentTop = beforeNodes[beforeNodes.length - 1];

    // Click peek
    await stackPage.peek();

    // Message indicates the top
    await expect(stackPage.message).toHaveText(`Top of the stack is "${currentTop}".`);

    // Stack should remain unchanged
    const afterNodes = await stackPage.getStackNodeTexts();
    expect(afterNodes.length).toBe(beforeCount);
    expect(afterNodes[afterNodes.length - 1]).toBe(currentTop);

    // No critical runtime errors
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('PopEvent: popping removes top and updates message; eventually returns to S0_Empty', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Push two items
    await stackPage.push('One');
    await stackPage.push('Two');

    // Pop should remove 'Two'
    await stackPage.pop();
    await expect(stackPage.message).toHaveText('Popped "Two" from the stack.');

    // Now top should be 'One'
    const nodesAfterPop = await stackPage.getStackNodeTexts();
    expect(nodesAfterPop[nodesAfterPop.length - 1]).toBe('One');

    // Pop again to remove the last element and return to empty state
    await stackPage.pop();
    await expect(stackPage.message).toHaveText('Popped "One" from the stack.');

    // Stack display should show empty message and action buttons disabled
    expect(await stackPage.hasEmptyMessage()).toBeTruthy();
    expect(await stackPage.isPopEnabled()).toBeFalsy();
    expect(await stackPage.isPeekEnabled()).toBeFalsy();
    expect(await stackPage.isClearEnabled()).toBeFalsy();

    // No critical runtime errors
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('ClearEvent: clearing non-empty stack returns to empty and shows "Stack cleared."', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Push multiple items
    await stackPage.push('Alpha');
    await stackPage.push('Beta');
    await stackPage.push('Gamma');

    // Clear the stack
    await stackPage.clear();

    // Message should indicate cleared
    await expect(stackPage.message).toHaveText('Stack cleared.');

    // Stack display should show empty indicator
    expect(await stackPage.hasEmptyMessage()).toBeTruthy();

    // Buttons should be disabled except Push
    expect(await stackPage.isPopEnabled()).toBeFalsy();
    expect(await stackPage.isPeekEnabled()).toBeFalsy();
    expect(await stackPage.isClearEnabled()).toBeFalsy();

    // No critical runtime errors
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Edge cases: PopEvent and PeekEvent on empty stack produce error messages', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Ensure empty
    expect(await stackPage.hasEmptyMessage()).toBeTruthy();

    // Click pop on empty
    await stackPage.pop();
    await expect(stackPage.message).toHaveText('Stack is empty. Cannot pop.');
    // Error messages are styled with red color (#e74c3c) -> rgb(231, 76, 60)
    const popColor = await stackPage.getMessageColor();
    expect(popColor).toBe('rgb(231, 76, 60)');

    // Click peek on empty
    await stackPage.peek();
    await expect(stackPage.message).toHaveText('Stack is empty. Nothing to peek.');
    const peekColor = await stackPage.getMessageColor();
    expect(peekColor).toBe('rgb(231, 76, 60)');

    // No critical runtime errors (these interactions are expected and handled)
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Verify updateStackDisplay is called implicitly via observable DOM changes on state transitions', async ({ page }) => {
    const { pageErrors, consoleErrors } = await attachErrorListeners(page);

    await page.goto(APP_URL);
    const stackPage = new StackPage(page);

    // Initially empty
    expect(await stackPage.hasEmptyMessage()).toBeTruthy();

    // Push and ensure DOM changed to include .stack-node elements (indicates updateStackDisplay effect)
    await stackPage.push('Element1');
    expect(await stackPage.getStackNodeCount()).toBeGreaterThanOrEqual(1);

    // Clear and ensure DOM shows empty message again
    await stackPage.clear();
    expect(await stackPage.hasEmptyMessage()).toBeTruthy();

    // No critical runtime errors during these transitions
    const criticalErrors = pageErrors.filter(e =>
      ['ReferenceError', 'TypeError', 'SyntaxError'].includes(e.name)
    );
    expect(criticalErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});