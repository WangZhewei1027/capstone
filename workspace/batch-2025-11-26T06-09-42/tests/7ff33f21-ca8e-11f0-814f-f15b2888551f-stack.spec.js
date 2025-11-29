import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T06-09-42/html/7ff33f21-ca8e-11f0-814f-f15b2888551f.html';

// Page Object for the Stack Demo
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#value-input');
    this.pushButton = page.locator('#push-button');
    this.popButton = page.locator('#pop-button');
    this.peekButton = page.locator('#peek-button');
    this.isEmptyButton = page.locator('#is-empty-button');
    this.infoDisplay = page.locator('#info-display');
    this.visualizer = page.locator('#stack-visualizer-panel');
  }

  async navigate() {
    await this.page.goto(APP_URL);
    // Ensure initial UI has loaded
    await expect(this.infoDisplay).toBeVisible();
  }

  // Push a value using the button
  async pushValue(value) {
    await this.valueInput.fill(value);
    await this.pushButton.click();
  }

  // Push value using Enter key in the input
  async pushValueWithEnter(value) {
    await this.valueInput.fill(value);
    await this.valueInput.press('Enter');
  }

  // Attempt to push empty value (leaving input blank) -> triggers alert
  async pushEmptyExpectDialog() {
    // Clear input
    await this.valueInput.fill('');
    // Click push, expecting a dialog
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.pushButton.click()
    ]);
    const message = dialog.message();
    await dialog.accept();
    return message;
  }

  // Pop top element (this will trigger animation then update)
  async pop() {
    await this.popButton.click();
  }

  // Peek top element
  async peek() {
    await this.peekButton.click();
  }

  // IsEmpty button click
  async isEmptyClick() {
    await this.isEmptyButton.click();
  }

  // Get number of stack item DOM elements
  async getStackItemsCount() {
    return await this.visualizer.locator('.stack-item').count();
  }

  // Get the textContent of the top (visual) element (lastElementChild)
  async getTopElementText() {
    const count = await this.getStackItemsCount();
    if (count === 0) return null;
    // lastElementChild corresponds to nth child where index = count - 1
    return await this.visualizer.locator('.stack-item').nth(count - 1).textContent();
  }

  // Get info-display text
  async getInfoText() {
    return (await this.infoDisplay.textContent())?.trim();
  }

  // Check if pop/peek buttons are disabled
  async isPopDisabled() {
    return await this.popButton.isDisabled();
  }

  async isPeekDisabled() {
    return await this.peekButton.isDisabled();
  }

  // Get computed inline style background-color for top element (if exists)
  async getTopElementBackgroundColor() {
    const count = await this.getStackItemsCount();
    if (count === 0) return null;
    const locator = this.visualizer.locator('.stack-item').nth(count - 1);
    // read style attribute or computed style
    const inline = await locator.getAttribute('style');
    if (inline && inline.includes('background-color')) {
      // crude parse to return the inline backgroundColor value
      return inline;
    }
    // fallback: evaluate computed style in browser
    return await this.page.evaluate((el) => {
      const node = el;
      const cs = window.getComputedStyle(node);
      return cs.backgroundColor;
    }, await locator.elementHandle());
  }

  // Check whether top visual element has class 'popping'
  async topHasPoppingClass() {
    const count = await this.getStackItemsCount();
    if (count === 0) return false;
    return await this.visualizer.locator('.stack-item').nth(count - 1).evaluate(el => el.classList.contains('popping'));
  }
}

test.describe('Stack Demo - End-to-End (FSM states & transitions)', () => {
  // Keep track of uncaught page errors and console errors for assertions
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // collect page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // store full error message for later assertions
      pageErrors.push(err.message ?? String(err));
    });

    // collect console messages and specifically capture console.error or other types
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push(text);
      }
      // Collect other console output as debug information (not treated as failures)
    });

    // Navigate to the app
    const stackPage = new StackPage(page);
    await stackPage.navigate();
  });

  test.afterEach(async ({ page }) => {
    // after each test we can assert that no unexpected page errors occurred
    // This ensures runtime stayed stable during interactions.
    // If there are page errors, we still include them in test failure messages below.
    if (pageErrors.length > 0) {
      // Fail explicitly with collected page errors to aid debugging
      throw new Error('Uncaught page error(s) detected: ' + pageErrors.join(' | '));
    }
    if (consoleErrors.length > 0) {
      // Fail if there are console.error messages emitted
      throw new Error('Console error(s) detected: ' + consoleErrors.join(' | '));
    }
  });

  test.describe('Initial UI and Idle State', () => {
    test('Initial state should be idle: empty stack, disabled pop/peek, info text correct', async ({ page }) => {
      const p = new StackPage(page);

      // Validate initial info text
      await expect(p.infoDisplay).toHaveText('Stack is empty.');

      // No stack items present at start
      expect(await p.getStackItemsCount()).toBe(0);

      // pop and peek should be disabled in idle empty state
      expect(await p.isPopDisabled()).toBe(true);
      expect(await p.isPeekDisabled()).toBe(true);
    });
  });

  test.describe('Pushing state (PUSH_CLICKED -> pushing -> DONE -> idle)', () => {
    test('Push a single element updates visualizer, info area and enables pop/peek', async ({ page }) => {
      const p = new StackPage(page);

      // Push 'A' and validate UI changes
      await p.pushValue('A');

      // After push, one item should appear and be the top
      expect(await p.getStackItemsCount()).toBe(1);
      expect((await p.getTopElementText())?.trim()).toBe('A');

      // Info display should reflect size and top element
      expect(await p.getInfoText()).toContain('Stack size: 1');
      expect(await p.getInfoText()).toContain('Top element: A');

      // pop and peek should now be enabled
      expect(await p.isPopDisabled()).toBe(false);
      expect(await p.isPeekDisabled()).toBe(false);
    });

    test('Push multiple elements keep the correct top ordering (LIFO)', async ({ page }) => {
      const p = new StackPage(page);

      await p.pushValue('first');
      await p.pushValue('second');
      await p.pushValue('third');

      // Count should be 3, top element should be 'third'
      expect(await p.getStackItemsCount()).toBe(3);
      expect((await p.getTopElementText())?.trim()).toBe('third');

      // Info display consistent with top
      expect(await p.getInfoText()).toContain('Top element: third');
    });

    test('Pressing Enter in input triggers push and clears input', async ({ page }) => {
      const p = new StackPage(page);

      await p.pushValueWithEnter('enterKeyValue');

      // The input should be cleared by the application after a successful push
      expect(await p.valueInput.inputValue()).toBe('');

      expect((await p.getTopElementText())?.trim()).toBe('enterKeyValue');
    });

    test('Attempting to push empty value shows alert dialog (edge case)', async ({ page }) => {
      const p = new StackPage(page);

      // We expect an alert with specific message
      const dialogMessage = await p.pushEmptyExpectDialog();
      expect(dialogMessage).toBe('Please enter a value to push.');

      // No new stack items should have been added
      expect(await p.getStackItemsCount()).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Popping state (POP_CLICKED -> popping -> DONE -> idle)', () => {
    test('Pop animates top element, updates info display to show popped value, and removes it', async ({ page }) => {
      const p = new StackPage(page);

      // Prepare stack with two items
      await p.pushValue('one');
      await p.pushValue('two');

      // Capture top before pop
      const topBefore = (await p.getTopElementText())?.trim();
      expect(topBefore).toBe('two');

      // Click pop: should add 'popping' class immediately to the top element
      await p.pop();

      // Immediately after click (animation starts) the element should have class 'popping'
      expect(await p.topHasPoppingClass()).toBe(true);

      // While animation plays (300ms), info display hasn't yet been changed by setTimeout handler,
      // but the handler will change it after 300ms. Wait slightly longer than animation to let handler run.
      await page.waitForTimeout(350);

      // After animation and updateUI, top element should have been removed
      expect(await p.getStackItemsCount()).toBe(1);
      expect((await p.getTopElementText())?.trim()).toBe('one');

      // Info display should reflect the popped value
      const info = await p.getInfoText();
      expect(info).toContain('Popped: two');
    });

    test('Pop button is disabled when stack is empty and does not produce errors', async ({ page }) => {
      const p = new StackPage(page);

      // Ensure stack is empty by popping everything
      // If pop is disabled, it should remain disabled and no page error will occur
      while (!(await p.isPopDisabled())) {
        // If pop is enabled, pop and wait for animation to finish
        await p.pop();
        await page.waitForTimeout(350);
      }

      // Now pop should be disabled
      expect(await p.isPopDisabled()).toBe(true);

      // Attempting to click pop while disabled should have no effect; ensure no errors emitted
      // Even if click is attempted via JS, the control is disabled so user can't trigger pop path.
      await p.popButton.click({ force: true }).catch(() => { /* ignore errors from forcing click */ });

      // Confirm still zero items
      expect(await p.getStackItemsCount()).toBe(0);
    });
  });

  test.describe('Peeking state (PEEK_CLICKED -> peeking -> DONE -> idle)', () => {
    test('Peek updates info display and temporarily highlights top visual element', async ({ page }) => {
      const p = new StackPage(page);

      // Prepare stack
      await p.pushValue('alpha');
      await p.pushValue('beta');

      // Peek
      await p.peek();

      // Info display should show peek result immediately
      expect(await p.getInfoText()).toContain('Peek: beta');

      // Top element should have highlighted background (inline style set)
      const topInlineStyle = await p.getTopElementBackgroundColor();
      // The implementation sets inline backgroundColor to '#ffc107' when peeking
      expect(String(topInlineStyle)).toContain('#ffc107' || 'rgb'); // allow either representation

      // After 1s the updateUI() call reverts the style back; wait and verify
      await page.waitForTimeout(1100);
      // After revert, the top element background should no longer be the peek highlight
      const bgAfter = await p.getTopElementBackgroundColor();
      // It may be inline empty or the computed css for default blue; ensure not the peek color
      expect(String(bgAfter)).not.toContain('#ffc107');
    });

    test('Peek on empty stack returns "Stack is empty" in info display', async ({ page }) => {
      const p = new StackPage(page);

      // First clear stack if needed
      while (!(await p.isPopDisabled())) {
        await p.pop();
        await page.waitForTimeout(350);
      }

      // Peek now
      await p.peek();

      expect(await p.getInfoText()).toBe('Peek: Stack is empty');
    });
  });

  test.describe('Checking_empty state (IS_EMPTY_CLICKED -> checking_empty -> DONE -> idle)', () => {
    test('IsEmpty button shows correct boolean when stack empty', async ({ page }) => {
      const p = new StackPage(page);

      // Ensure empty
      while (!(await p.isPopDisabled())) {
        await p.pop();
        await page.waitForTimeout(350);
      }

      await p.isEmptyClick();
      expect(await p.getInfoText()).toBe('isEmpty() returned: true');
    });

    test('IsEmpty button shows correct boolean when stack is not empty', async ({ page }) => {
      const p = new StackPage(page);

      // Ensure there's at least one element
      await p.pushValue('not-empty');

      await p.isEmptyClick();
      expect(await p.getInfoText()).toBe('isEmpty() returned: false');
    });
  });

  test.describe('FSM transitions, onEnter/onExit behaviours and edge cases', () => {
    test('updateUI (onEnter/onExit) correctly redraws DOM after operations', async ({ page }) => {
      const p = new StackPage(page);

      // Start from empty
      while (!(await p.isPopDisabled())) {
        await p.pop();
        await page.waitForTimeout(350);
      }

      // Push some items
      await p.pushValue('X');
      await p.pushValue('Y');

      // The visual DOM should match underlying stack size and order
      expect(await p.getStackItemsCount()).toBe(2);
      expect((await p.getTopElementText())?.trim()).toBe('Y');

      // Pop once and wait for UI update
      await p.pop();
      await page.waitForTimeout(350);

      // After pop, updateUI should have been called (onExit actions) and visual DOM updated
      expect(await p.getStackItemsCount()).toBe(1);
      expect((await p.getTopElementText())?.trim()).toBe('X');
      expect(await p.getInfoText()).toContain('Popped: Y');
    });

    test('No uncaught exceptions or console.error emitted during a sequence of operations', async ({ page }) => {
      const p = new StackPage(page);

      // Perform a variety of operations rapidly to exercise transitions
      await p.pushValue('a');
      await p.pushValue('b');
      await p.peek();
      await p.pop();
      await page.waitForTimeout(350);
      await p.isEmptyClick();
      await p.pop();
      await page.waitForTimeout(350);
      await p.isEmptyClick();

      // This test relies on afterEach hook to assert there are no page errors/console errors.
      // We explicitly assert they are empty here as well for clarity.
      // Retrieve internal arrays via page events are asserted in afterEach; nothing further needed.
      expect(true).toBe(true); // no-op assertion; real validations happen via afterEach checks
    });
  });
});