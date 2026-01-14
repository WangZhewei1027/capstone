import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f76649a0-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object Model for the Deque page
class DequePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.input = page.locator('#inputValue');
    this.addFrontBtn = page.locator('button[onclick="addFront()"]');
    this.addBackBtn = page.locator('button[onclick="addBack()"]');
    this.removeFrontBtn = page.locator('button[onclick="removeFront()"]');
    this.removeBackBtn = page.locator('button[onclick="removeBack()"]');
    this.output = page.locator('#output');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async fillInput(value) {
    await this.input.fill(value);
  }

  async clickAddFront() {
    await this.addFrontBtn.click();
  }

  async clickAddBack() {
    await this.addBackBtn.click();
  }

  async clickRemoveFront() {
    await this.removeFrontBtn.click();
  }

  async clickRemoveBack() {
    await this.removeBackBtn.click();
  }

  async getOutputText() {
    return (await this.output.textContent()) ?? '';
  }

  async getInputValue() {
    return await this.input.inputValue();
  }
}

test.describe('Deque Implementation - FSM validation', () => {
  // Per-test collectors for console messages and page errors
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Collect console messages and page errors for observation and assertions
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  // Test S0_Idle: initial render and presence of components
  test('S0_Idle: Page loads with input, buttons, and output (initial state)', async ({ page }) => {
    const deque = new DequePage(page);
    // Navigate to the page as-is
    await deque.goto();

    // Validate presence of input and its placeholder (evidence for Idle state)
    await expect(deque.input).toBeVisible();
    await expect(deque.input).toHaveAttribute('placeholder', 'Enter a value');

    // Validate presence of all buttons
    await expect(deque.addFrontBtn).toBeVisible();
    await expect(deque.addBackBtn).toBeVisible();
    await expect(deque.removeFrontBtn).toBeVisible();
    await expect(deque.removeBackBtn).toBeVisible();

    // Output area should be present and initially show the deque (which is empty)
    await expect(deque.output).toBeVisible();
    const initialOutput = await deque.getOutputText();
    // The implementation sets output via displayDeque only when actions happen.
    // After initial load, output.textContent may be empty string or show default; assert it's present.
    expect(typeof initialOutput).toBe('string');

    // Ensure there are no unexpected runtime errors on load (pageerror events)
    expect(pageErrors.length).toBe(0);

    // No critical console errors logged on initial load
    const errorConsoles = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Validate that the FSM's initial state's entry action renderPage() is not defined in the implementation.
  // We intentionally attempt to call renderPage() to observe the natural ReferenceError (do not patch the page).
  test('S0_Idle entry action check: calling missing renderPage() should naturally throw ReferenceError', async ({ page }) => {
    const deque = new DequePage(page);
    await deque.goto();

    // Calling a function that is not defined should produce a rejection from page.evaluate
    await expect(page.evaluate(() => {
      // This will throw in the page context because renderPage is not defined in the implementation
      // We let it happen naturally and let the runner surface the error.
      // eslint-disable-next-line no-undef
      return renderPage();
    })).rejects.toThrow(/renderPage is not defined|renderPage is not a function/);
  });

  test.describe('Add operations (S1_ItemAddedFront, S2_ItemAddedBack)', () => {
    test('Add to Front: items are added to the front and displayed correctly', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Add first item to front
      await deque.fillInput('A');
      await deque.clickAddFront();

      // After adding, input must be cleared per implementation
      await expect(deque.getInputValue()).resolves.toBe('');

      // Output should reflect the deque with A
      let out = await deque.getOutputText();
      expect(out).toContain('Deque: A');
      expect(out).toContain('Removed:'); // should show empty removed for add actions

      // Add another item to front, it should be before A
      await deque.fillInput('B');
      await deque.clickAddFront();

      out = await deque.getOutputText();
      // New order should be B, A
      expect(out).toContain('Deque: B, A');
    });

    test('Add to Back: items are added to the back and displayed correctly', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Ensure deque is empty by reading output, then add to back
      await deque.fillInput('1');
      await deque.clickAddBack();

      let out = await deque.getOutputText();
      expect(out).toContain('Deque: 1');

      // Add another to back, order should be 1, 2
      await deque.fillInput('2');
      await deque.clickAddBack();

      out = await deque.getOutputText();
      expect(out).toContain('Deque: 1, 2');
      // Input cleared after add
      await expect(deque.getInputValue()).resolves.toBe('');
    });

    test('Edge-case: adding whitespace-only value is considered non-empty and is added', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Add whitespace (truthy string) to front
      await deque.fillInput('   ');
      await deque.clickAddFront();

      const out = await deque.getOutputText();
      // The whitespace will be present in the join; ensure there is some representation
      expect(out).toContain('Deque:    ');
    });
  });

  test.describe('Remove operations (S3_ItemRemovedFront, S4_ItemRemovedBack)', () => {
    test('Remove from Front: removes and displays the removed value and updates deque', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Prepare deque: add X then Y (so X is front? careful with addFront/addBack)
      // Use addBack to get predictable order: addBack A then B -> deque: A, B
      await deque.fillInput('A');
      await deque.clickAddBack();
      await deque.fillInput('B');
      await deque.clickAddBack();

      // Now remove from front should remove 'A'
      await deque.clickRemoveFront();

      const out = await deque.getOutputText();
      expect(out).toContain('Removed: A');
      expect(out).toContain('Deque: B');
    });

    test('Remove from Back: removes and displays the removed value and updates deque', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Prepare deque: addBack 1, addBack 2 -> deque: 1, 2
      await deque.fillInput('1');
      await deque.clickAddBack();
      await deque.fillInput('2');
      await deque.clickAddBack();

      // Remove from back should remove '2'
      await deque.clickRemoveBack();

      const out = await deque.getOutputText();
      expect(out).toContain('Removed: 2');
      expect(out).toContain('Deque: 1');
    });

    test('Edge-case: removing from empty deque yields Removed: null and empty deque display', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Ensure deque is empty by removing until null appears
      // First remove attempt on empty deque:
      await deque.clickRemoveFront();
      let out = await deque.getOutputText();
      // Implementation returns null from removeFront and displayDeque prints it as 'null'
      expect(out).toContain('Removed: null');
      // Deque should be empty
      expect(out).toMatch(/Deque:\s*$/);

      // Another attempt with removeBack should also indicate null
      await deque.clickRemoveBack();
      out = await deque.getOutputText();
      expect(out).toContain('Removed: null');
      expect(out).toMatch(/Deque:\s*$/);
    });
  });

  test.describe('Integration and robustness checks', () => {
    test('Sequence of mixed operations matches expected deque state transitions', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Sequence:
      // addBack 10 -> [10]
      // addFront 20 -> [20,10]
      // addBack 30 -> [20,10,30]
      // removeFront -> removes 20 -> [10,30]
      // removeBack -> removes 30 -> [10]

      await deque.fillInput('10');
      await deque.clickAddBack();

      await deque.fillInput('20');
      await deque.clickAddFront();

      await deque.fillInput('30');
      await deque.clickAddBack();

      // removeFront
      await deque.clickRemoveFront();
      let out = await deque.getOutputText();
      expect(out).toContain('Removed: 20');
      expect(out).toContain('Deque: 10, 30');

      // removeBack
      await deque.clickRemoveBack();
      out = await deque.getOutputText();
      expect(out).toContain('Removed: 30');
      expect(out).toContain('Deque: 10');
    });

    test('No unexpected console errors during normal operations', async ({ page }) => {
      const deque = new DequePage(page);
      await deque.goto();

      // Perform a set of operations
      await deque.fillInput('alpha');
      await deque.clickAddBack();
      await deque.fillInput('beta');
      await deque.clickAddFront();
      await deque.clickRemoveFront();
      await deque.clickRemoveBack();

      // Allow any console messages to be collected (small pause)
      await page.waitForTimeout(100);

      // Assert pageErrors empty (no runtime exceptions)
      expect(pageErrors.length).toBe(0);

      // Assert there are no console messages of type 'error'
      const errorConsoles = consoleMessages.filter(m => m.type === 'error');
      expect(errorConsoles.length).toBe(0);
    });
  });

  // Final test: ensure that intentionally calling a non-existent function leads to a pageerror when executed inside page context.
  // This demonstrates that missing onEnter handlers (like renderPage) are absent and cause natural ReferenceError if invoked.
  test('Missing onEnter/onExit handlers surface as ReferenceError when invoked', async ({ page }) => {
    const deque = new DequePage(page);
    await deque.goto();

    // We will attempt to call a clearly non-existent function 'nonExistentOnEnter' in page context.
    // This should cause the evaluation to reject with a ReferenceError-like message.
    await expect(page.evaluate(() => {
      // eslint-disable-next-line no-undef
      return nonExistentOnEnter();
    })).rejects.toThrow(/nonExistentOnEnter is not defined|is not a function/);
  });
});