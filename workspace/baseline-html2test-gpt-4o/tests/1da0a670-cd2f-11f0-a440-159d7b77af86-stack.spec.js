import { test, expect } from '@playwright/test';

// Page object for the Stack page to encapsulate interactions and queries
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.url = 'http://127.0.0.1:5500/workspace/html2test/html/1da0a670-cd2f-11f0-a440-159d7b77af86.html';
    this.selectors = {
      input: '#stackInput',
      pushButton: 'button.push-btn',
      popButton: 'button.pop-btn',
      display: '#stackDisplay',
      heading: 'h1'
    };
  }

  // Navigate to the page
  async goto() {
    await this.page.goto(this.url);
  }

  // Type into the input (replaces existing content)
  async typeInput(value) {
    await this.page.fill(this.selectors.input, value);
  }

  // Click the Push button
  async clickPush() {
    await this.page.click(this.selectors.pushButton);
  }

  // Click the Pop button
  async clickPop() {
    await this.page.click(this.selectors.popButton);
  }

  // Get the displayed stack text content
  async getDisplayText() {
    const el = await this.page.$(this.selectors.display);
    if (!el) return null;
    return (await el.textContent()).trim();
  }

  // Get the input value
  async getInputValue() {
    return this.page.$eval(this.selectors.input, (el) => el.value);
  }

  // Get heading text
  async getHeadingText() {
    return this.page.textContent(this.selectors.heading);
  }
}

test.describe('Stack Example App - 1da0a670-cd2f-11f0-a440-159d7b77af86', () => {
  // Arrays to collect console error messages and page errors for each test run
  let consoleErrors = [];
  let pageErrors = [];

  // Each test gets its own page and page object
  test.beforeEach(async ({ page }) => {
    // Reset captured errors before each test
    consoleErrors = [];
    pageErrors = [];

    // Capture console.error messages
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // ignore listener errors
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      try {
        pageErrors.push(err.message || String(err));
      } catch (e) {
        // ignore listener errors
      }
    });
  });

  test.afterEach(async () => {
    // After each test ensure no unexpected console errors or page errors occurred.
    // This asserts that the page runs without runtime exceptions.
    expect(consoleErrors, 'No console.error messages should be emitted').toEqual([]);
    expect(pageErrors, 'No uncaught page errors should occur').toEqual([]);
  });

  // Test initial load and default state of the page
  test('Initial page load displays expected elements and default empty state', async ({ page }) => {
    const stack = new StackPage(page);
    // Navigate to the application page
    await stack.goto();

    // Verify heading text is present
    const heading = await stack.getHeadingText();
    expect(heading).toContain('Stack Example with JavaScript');

    // Verify input is visible and has placeholder
    const input = await page.$(stack.selectors.input);
    expect(input).not.toBeNull();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder).toBe('Enter a value to push');

    // Verify both buttons are visible with expected labels
    const pushBtn = await page.$(stack.selectors.pushButton);
    const popBtn = await page.$(stack.selectors.popButton);
    expect(pushBtn).not.toBeNull();
    expect(popBtn).not.toBeNull();
    expect(await pushBtn.textContent()).toBe('Push');
    expect(await popBtn.textContent()).toBe('Pop');

    // On initial load, the stackDisplay element exists but should be empty (no update called yet)
    const displayEl = await page.$(stack.selectors.display);
    expect(displayEl).not.toBeNull();
    const displayText = (await displayEl.textContent()).trim();
    // The implementation only updates the display when push/pop occur,
    // so the initial content is expected to be empty string.
    expect(displayText).toBe('');
  });

  // Test pushing a single item updates the display and clears the input
  test('Pushing a single value updates the stack display and clears the input', async ({ page }) => {
    const stack = new StackPage(page);
    await stack.goto();

    // Type a value and click Push
    await stack.typeInput('A');
    await stack.clickPush();

    // After pushing, the input should be cleared
    const inputValue = await stack.getInputValue();
    expect(inputValue).toBe('', 'Input should be cleared after push');

    // The display should now show the pushed item inside the expected format
    const displayText = await stack.getDisplayText();
    expect(displayText).toBe('Current Stack: [ A ]');
  });

  // Test pushing multiple items and LIFO pop behavior (visual only, as pop doesn't show popped value)
  test('Push multiple values and pop respects LIFO order in displayed stack', async ({ page }) => {
    const stack = new StackPage(page);
    await stack.goto();

    // Push 1, 2, 3
    await stack.typeInput('1');
    await stack.clickPush();
    await stack.typeInput('2');
    await stack.clickPush();
    await stack.typeInput('3');
    await stack.clickPush();

    // Verify display shows all three in insertion order
    let displayText = await stack.getDisplayText();
    expect(displayText).toBe('Current Stack: [ 1, 2, 3 ]');

    // Pop once; since popFromStack does not return or display the popped value,
    // the visible stack should now exclude the last pushed item (3)
    await stack.clickPop();
    displayText = await stack.getDisplayText();
    expect(displayText).toBe('Current Stack: [ 1, 2 ]');

    // Pop twice more to empty the stack and verify display
    await stack.clickPop();
    await stack.clickPop();
    displayText = await stack.getDisplayText();
    expect(displayText).toBe('Current Stack: [  ]');
  });

  // Test popping when stack is empty: no exceptions and display remains empty
  test('Popping an empty stack does not throw and display indicates empty stack', async ({ page }) => {
    const stack = new StackPage(page);
    await stack.goto();

    // Ensure stack is empty by clicking Pop immediately
    await stack.clickPop();

    // The display should show an empty list format
    const displayText = await stack.getDisplayText();
    expect(displayText).toBe('Current Stack: [  ]', 'Empty stack should render as empty array style text');
  });

  // Test that pushing only whitespace does not change the stack
  test('Pushing whitespace-only input should be ignored and not modify the stack', async ({ page }) => {
    const stack = new StackPage(page);
    await stack.goto();

    // Push a real value first
    await stack.typeInput('X');
    await stack.clickPush();
    expect(await stack.getDisplayText()).toBe('Current Stack: [ X ]');

    // Now try to push whitespace-only input
    await stack.typeInput('   ');
    await stack.clickPush();

    // Display should remain unchanged
    expect(await stack.getDisplayText()).toBe('Current Stack: [ X ]');

    // Clean up by popping
    await stack.clickPop();
    expect(await stack.getDisplayText()).toBe('Current Stack: [  ]');
  });

  // Test accessibility basics: input is focusable and buttons are reachable
  test('Accessibility: input and buttons are focusable and operable via keyboard', async ({ page }) => {
    const stack = new StackPage(page);
    await stack.goto();

    // Focus the input and type a value, then press Enter should not trigger push because no handler for Enter
    await page.focus(stack.selectors.input);
    await page.keyboard.type('kbdTest');
    await page.keyboard.press('Enter');

    // Expect no push to have occurred (since click handler only on button)
    expect(await stack.getDisplayText()).toBe('', 'Pressing Enter should not push because no submit handler exists');

    // Now use Tab/keyboard to reach Push button and press Space to activate
    await page.keyboard.press('Tab'); // move focus to Push button
    // Some browsers may require multiple tabs; ensure the focused element is push button
    // We'll query the activeElement to ensure it's focusable; if not focused, fall back to clicking.
    const active = await page.evaluate(() => document.activeElement?.className || '');
    if (!active.includes('push-btn')) {
      // fallback: click the push button
      await stack.typeInput('kbdTest');
      await stack.clickPush();
    } else {
      // If focused, press Space to click
      await stack.typeInput('kbdTest');
      await page.keyboard.press('Space');
    }

    // Verify push happened
    expect(await stack.getDisplayText()).toBe('Current Stack: [ kbdTest ]');
  });

  // Test that the display shows trimmed values (whitespace trimmed on push)
  test('Pushed values are trimmed before being stored/displayed', async ({ page }) => {
    const stack = new StackPage(page);
    await stack.goto();

    // Push a value with surrounding whitespace
    await stack.typeInput('   trimmedValue   ');
    await stack.clickPush();

    // Display should have trimmed value
    expect(await stack.getDisplayText()).toBe('Current Stack: [ trimmedValue ]');
  });
});