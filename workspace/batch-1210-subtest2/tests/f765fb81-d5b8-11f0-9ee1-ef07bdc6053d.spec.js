import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f765fb81-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Stack page to encapsulate interactions and queries
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#element');
    this.pushButton = page.locator('button[onclick="pushElement()"]');
    this.popButton = page.locator('button[onclick="popElement()"]');
    this.message = page.locator('#message');
    this.stackDisplay = page.locator('#stackDisplay');
  }

  // Navigate to the app URL
  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill the input with value (replaces existing text)
  async fillElement(value) {
    await this.input.fill(value);
  }

  // Click Push button
  async clickPush() {
    await this.pushButton.click();
  }

  // Click Pop button
  async clickPop() {
    await this.popButton.click();
  }

  // Get visible message text
  async getMessageText() {
    return (await this.message.innerText()).trim();
  }

  // Get stack display innerHTML (we check for markup like <br> and content)
  async getStackDisplayHTML() {
    return (await this.stackDisplay.evaluate((el) => el.innerHTML)).trim();
  }

  // Get stack display text content (without html tags)
  async getStackDisplayText() {
    return (await this.stackDisplay.innerText()).trim();
  }

  // Assert input is empty
  async expectInputEmpty() {
    const val = await this.input.inputValue();
    expect(val).toBe('');
  }
}

test.describe('Stack Implementation (FSM) - f765fb81-d5b8-11f0-9ee1-ef07bdc6053d', () => {
  // Collect console and page errors for each test to observe runtime issues naturally.
  let consoleErrors;
  let consoleMessages;
  let pageErrors;
  let consoleHandler;
  let pageErrorHandler;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleMessages = [];
    pageErrors = [];

    // Handler for console events - collect all messages, but track 'error' type specially
    consoleHandler = (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text });
      if (type === 'error') {
        consoleErrors.push(text);
      }
    };
    page.on('console', consoleHandler);

    // Handler for unhandled page errors
    pageErrorHandler = (err) => {
      pageErrors.push(err);
    };
    page.on('pageerror', pageErrorHandler);

    // Navigate to the app for each test
    const stackPage = new StackPage(page);
    await stackPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // Remove listeners to avoid leaking between tests
    if (consoleHandler) page.off('console', consoleHandler);
    if (pageErrorHandler) page.off('pageerror', pageErrorHandler);

    // Assert that no console 'error' messages were emitted
    // and no uncaught page errors happened.
    // This validates that the page ran without throwing runtime errors such as ReferenceError/SyntaxError/TypeError.
    expect(consoleErrors, `Console errors were emitted: ${JSON.stringify(consoleErrors)}`).toHaveLength(0);
    expect(pageErrors, `Page errors were emitted: ${pageErrors.map(e => e.message).join('; ')}`).toHaveLength(0);
  });

  // Validate Idle state: initial render of the page (S0_Idle)
  test('Idle state: initial render shows input, buttons, message and stackDisplay (S0_Idle)', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Verify input exists and has placeholder
    await expect(stackPage.input).toBeVisible();
    expect(await stackPage.input.getAttribute('placeholder')).toBe('Enter element');

    // Verify Push and Pop buttons exist
    await expect(stackPage.pushButton).toBeVisible();
    await expect(stackPage.popButton).toBeVisible();
    expect(await stackPage.pushButton.innerText()).toBe('Push');
    expect(await stackPage.popButton.innerText()).toBe('Pop');

    // On initial load, the implementation does not call displayStack, so stackDisplay may be empty.
    // Verify message is empty and stackDisplay is either empty or not containing 'Current Stack'
    const messageText = await stackPage.getMessageText();
    expect(messageText).toBe('');

    const stackHTML = await stackPage.getStackDisplayHTML();
    // It is acceptable for the stackDisplay to be empty initially. Ensure it doesn't mistakenly show content.
    expect(['', 'Current Stack: <br>Empty', 'Current Stack: <br>']).toContain(stackHTML);
  });

  // Test pushing a single element transitions from Idle to ElementPushed (S0 -> S1)
  test('Push event (S0_Idle -> S1_ElementPushed): push a single element and verify stack display and input cleared', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Fill element and click Push
    await stackPage.fillElement('element1');
    await stackPage.clickPush();

    // After push, input should be cleared
    await stackPage.expectInputEmpty();

    // Message should not indicate an error; it remains empty
    expect(await stackPage.getMessageText()).toBe('');

    // Stack display should show the pushed element
    const html = await stackPage.getStackDisplayHTML();
    expect(html).toContain('Current Stack: <br>');
    expect(html).toContain('element1');
    // Ensure exact order/format includes element1 as a standalone line
    expect(html.split('<br>').map(s => s.trim()).some(s => s === 'element1')).toBeTruthy();
  });

  // Test multiple pushes (S1 -> S1) and verify stacking order
  test('Multiple Pushes (S1_ElementPushed -> S1_ElementPushed): push multiple elements and verify order', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Push a sequence of elements: element1, element2, element3
    await stackPage.fillElement('element1');
    await stackPage.clickPush();

    await stackPage.fillElement('element2');
    await stackPage.clickPush();

    await stackPage.fillElement('element3');
    await stackPage.clickPush();

    // Validate stack display shows all three elements in the expected insertion order
    const html = await stackPage.getStackDisplayHTML();
    // Expect the header and all three elements present
    expect(html).toContain('Current Stack: <br>');
    expect(html).toContain('element1');
    expect(html).toContain('element2');
    expect(html).toContain('element3');

    // Verify order: element1 before element2 before element3 in the HTML string
    const idx1 = html.indexOf('element1');
    const idx2 = html.indexOf('element2');
    const idx3 = html.indexOf('element3');
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThan(idx1);
    expect(idx3).toBeGreaterThan(idx2);
  });

  // Test popping from non-empty stack: ensure LIFO removal and message (S1 -> S1)
  test('Pop event from non-empty stack (S1_ElementPushed -> S1_ElementPushed): LIFO removal and updated display', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Prepare stack with three items
    await stackPage.fillElement('element1');
    await stackPage.clickPush();

    await stackPage.fillElement('element2');
    await stackPage.clickPush();

    await stackPage.fillElement('element3');
    await stackPage.clickPush();

    // Now pop once - should remove the last pushed element (element3)
    await stackPage.clickPop();

    // Message should indicate the removed element (implementation uses last-pushed removal)
    const message = await stackPage.getMessageText();
    expect(message).toBe('Removed: element3');

    // Stack display should now contain element1 and element2 only
    const html = await stackPage.getStackDisplayHTML();
    expect(html).toContain('element1');
    expect(html).toContain('element2');
    expect(html).not.toContain('element3');
  });

  // Test popping from empty stack (S0_Idle -> S2_StackEmpty)
  test('Pop event from empty stack (S0_Idle -> S2_StackEmpty): show "Stack is empty! Nothing to pop."', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Ensure starting fresh with an empty stack by reloading (beforeEach already loaded fresh)
    // Click Pop with no elements pushed
    await stackPage.clickPop();

    // Message should indicate stack is empty
    const message = await stackPage.getMessageText();
    expect(message).toBe('Stack is empty! Nothing to pop.');

    // Stack display should remain empty or indicate Empty if displayStack was ever called
    const html = await stackPage.getStackDisplayHTML();
    // Accept either empty or a "Current Stack" message indicating Empty
    expect(['', 'Current Stack: <br>Empty', 'Current Stack: <br>']).toContain(html);
  });

  // Edge case: Attempt to push with empty input should display validation message and not alter stack
  test('Edge case: push with empty input shows validation and does not change stack', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Ensure input is empty
    await stackPage.fillElement('');
    await stackPage.clickPush();

    // Expect validation message
    const msg = await stackPage.getMessageText();
    expect(msg).toBe('Please enter an element.');

    // Stack should remain unchanged (empty)
    const html = await stackPage.getStackDisplayHTML();
    expect(['', 'Current Stack: <br>Empty', 'Current Stack: <br>']).toContain(html);
  });

  // Additional scenario: push then pop repeatedly to test repeated transitions and stability
  test('Repeated push and pop sequence maintains correct stack and messages (stability test)', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Push A, B
    await stackPage.fillElement('A');
    await stackPage.clickPush();
    await stackPage.fillElement('B');
    await stackPage.clickPush();

    // Pop (should remove B)
    await stackPage.clickPop();
    let msg = await stackPage.getMessageText();
    expect(msg).toBe('Removed: B');

    // Push C
    await stackPage.fillElement('C');
    await stackPage.clickPush();

    // Current stack should be A then C
    const html = await stackPage.getStackDisplayHTML();
    // Ensure A and C present and B absent
    expect(html).toContain('A');
    expect(html).toContain('C');
    expect(html).not.toContain('B');
  });

  // Validate that the DOM elements use expected attributes as described by the FSM components
  test('DOM components presence and attributes match FSM component definitions', async ({ page }) => {
    const stackPage = new StackPage(page);

    // Input has correct id and placeholder
    expect(await stackPage.input.getAttribute('id')).toBe('element');
    expect(await stackPage.input.getAttribute('placeholder')).toBe('Enter element');

    // Buttons have expected onclick attributes per the implementation
    expect(await stackPage.pushButton.getAttribute('onclick')).toBe('pushElement()');
    expect(await stackPage.popButton.getAttribute('onclick')).toBe('popElement()');

    // message and stackDisplay exist
    await expect(stackPage.message).toBeVisible();
    await expect(stackPage.stackDisplay).toBeVisible();
  });
});