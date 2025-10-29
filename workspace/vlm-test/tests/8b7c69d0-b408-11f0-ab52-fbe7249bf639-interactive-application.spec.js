import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0006/html/8b7c69d0-b408-11f0-ab52-fbe7249bf639.html';

class StackPage {
  constructor(page) {
    this.page = page;
    this.input = page.locator('#stackInput');
    this.pushButton = page.locator('#pushButton');
    this.popButton = page.locator('#popButton');
    this.peekButton = page.locator('#peekButton');
    this.stackContainer = page.locator('#stack');
    this.stackItems = page.locator('#stack .item');
    this.message = page.locator('#message');
  }

  async goto() {
    await this.page.goto(BASE_URL);
    // Ensure the core elements are present
    await expect(this.input).toBeVisible();
    await expect(this.pushButton).toBeVisible();
    await expect(this.popButton).toBeVisible();
    await expect(this.peekButton).toBeVisible();
    await expect(this.stackContainer).toBeVisible();
  }

  async setInput(value) {
    await this.input.fill(value);
  }

  async getInputValue() {
    return (await this.input.inputValue());
  }

  async push() {
    await this.pushButton.click();
  }

  async pop() {
    await this.popButton.click();
  }

  async peek() {
    await this.peekButton.click();
  }

  async getItemCount() {
    return await this.stackItems.count();
  }

  async getItemTexts() {
    return await this.stackItems.allTextContents();
  }

  async getTopItemText() {
    const count = await this.getItemCount();
    if (count === 0) return null;
    return await this.stackItems.last().textContent();
  }

  async getMessageText() {
    const text = await this.message.textContent();
    return (text || '').trim();
  }

  async getItemTransformAt(index) {
    const item = this.stackItems.nth(index);
    const styleAttr = await item.getAttribute('style');
    return styleAttr || '';
  }

  async getTransforms() {
    const count = await this.getItemCount();
    const transforms = [];
    for (let i = 0; i < count; i++) {
      transforms.push(await this.getItemTransformAt(i));
    }
    return transforms;
  }

  async isTopItemHighlighted() {
    const count = await this.getItemCount();
    if (count === 0) return false;
    const top = this.stackItems.last();
    // Check for class 'highlight' on top item
    const classAttr = await top.getAttribute('class');
    return !!(classAttr && classAttr.includes('highlight'));
  }

  async anyHighlightedItemExists() {
    // Try both common selectors in case highlight is added differently
    const highlightedItems = this.page.locator('#stack .item.highlight');
    const genericHighlight = this.page.locator('#stack .highlight');
    const countA = await highlightedItems.count();
    const countB = await genericHighlight.count();
    return (countA + countB) > 0;
  }
}

// Helper matchers for messages to be resilient to wording variations
function messageIncludesPoppedForValue(message, value) {
  const lower = (message || '').toLowerCase();
  return (
    lower.includes('popped') && lower.includes(value.toLowerCase())
  ) || (
    lower.includes('pop') && lower.includes(value.toLowerCase())
  ) || (
    lower.includes('removed') && lower.includes(value.toLowerCase())
  );
}

function messageIndicatesEmpty(message) {
  const lower = (message || '').toLowerCase();
  return lower.includes('stack is empty');
}

function messageIncludesPeekForValue(message, value) {
  const lower = (message || '').toLowerCase();
  const valLower = value.toLowerCase();
  return (
    (lower.includes('peek') || lower.includes('top')) &&
    lower.includes(valLower)
  );
}

test.describe('Interactive Application - Stack FSM', () => {
  let sp;

  test.beforeEach(async ({ page }) => {
    sp = new StackPage(page);
    await sp.goto();
  });

  test.afterEach(async ({ page }) => {
    // Teardown: close the page to ensure clean state
    await page.close();
  });

  test.describe('Idle state and structure', () => {
    test('Initial idle state: empty stack, empty message, controls enabled', async () => {
      // Validate initial DOM and control availability
      await expect(sp.input).toBeEnabled();
      await expect(sp.pushButton).toBeEnabled();
      await expect(sp.popButton).toBeEnabled();
      await expect(sp.peekButton).toBeEnabled();

      const count = await sp.getItemCount();
      expect(count).toBe(0);

      const messageText = await sp.getMessageText();
      expect(messageText).toBe('');

      const inputVal = await sp.getInputValue();
      expect(inputVal).toBe('');
    });
  });

  test.describe('PUSH events and transitions', () => {
    test('PUSH_CLICK_EMPTY with empty input: remains idle, no visual change', async () => {
      const beforeCount = await sp.getItemCount();
      await sp.push();

      const afterCount = await sp.getItemCount();
      expect(afterCount).toBe(beforeCount);

      const messageText = await sp.getMessageText();
      // Should not show empty-stack message for push; remain idle
      expect(messageIndicatesEmpty(messageText)).toBe(false);

      // State stays interactive – push valid value immediately
      await sp.setInput('A');
      await sp.push();
      expect(await sp.getItemCount()).toBe(beforeCount + 1);
      expect(await sp.getTopItemText()).toBe('A');
    });

    test('PUSH_CLICK_EMPTY with whitespace-only input: trimmed to empty, no push occurs', async () => {
      await sp.setInput('     ');
      await sp.push();

      // No items should be added
      expect(await sp.getItemCount()).toBe(0);

      // Input should remain as entered when empty push (no clear on empty)
      expect(await sp.getInputValue()).toBe('     ');

      // Message should not be "Stack is empty!" due to push empty
      const messageText = await sp.getMessageText();
      expect(messageIndicatesEmpty(messageText)).toBe(false);
    });

    test('PUSH_CLICK_VALID: updates visual, clears input, returns to idle; stacking positions are correct', async () => {
      await sp.setInput('  Alpha  ');
      await sp.push();

      // Assert item added and input cleared (onEnter: CLEAR_INPUT)
      expect(await sp.getItemCount()).toBe(1);
      expect(await sp.getTopItemText()).toBe('Alpha');
      expect(await sp.getInputValue()).toBe('');

      // Immediate second push to validate transition back to idle
      await sp.setInput('Beta');
      await sp.push();

      expect(await sp.getItemCount()).toBe(2);
      const texts = await sp.getItemTexts();
      // Items are appended in array order: ['Alpha', 'Beta']
      expect(texts).toEqual(['Alpha', 'Beta']);

      // Verify transforms (onEnter updates visual with translateY)
      const transforms = await sp.getTransforms();
      // Alpha should have translateY(40px), Beta translateY(0px)
      expect(transforms[0]).toContain('translateY(40px)');
      expect(transforms[1]).toContain('translateY(0px)');
    });
  });

  test.describe('POP events and transitions', () => {
    test('POP_CLICK_EMPTY on empty stack: sets empty feedback message and returns idle', async () => {
      // Ensure stack empty
      expect(await sp.getItemCount()).toBe(0);

      await sp.pop();

      const messageText = await sp.getMessageText();
      expect(messageIndicatesEmpty(messageText)).toBe(true);

      // Buttons remain interactive; push after empty feedback
      await sp.setInput('X');
      await sp.push();
      expect(await sp.getItemCount()).toBe(1);
      expect(await sp.getTopItemText()).toBe('X');
    });

    test('POP_CLICK_NON_EMPTY: updates visual, sets popped message, transitions back to idle', async () => {
      // Setup: push two items
      await sp.setInput('One');
      await sp.push();
      await sp.setInput('Two');
      await sp.push();

      expect(await sp.getItemCount()).toBe(2);

      await sp.pop();

      // Assert visual update: top popped, stack size reduced
      expect(await sp.getItemCount()).toBe(1);
      expect(await sp.getTopItemText()).toBe('One');

      // onEnter: SET_MESSAGE_POPPED
      const msg1 = await sp.getMessageText();
      expect(messageIncludesPoppedForValue(msg1, 'Two')).toBe(true);

      // Pop again to empty
      await sp.pop();
      expect(await sp.getItemCount()).toBe(0);
      const msg2 = await sp.getMessageText();
      expect(messageIncludesPoppedForValue(msg2, 'One')).toBe(true);

      // Next pop should trigger empty feedback
      await sp.pop();
      const msg3 = await sp.getMessageText();
      expect(messageIndicatesEmpty(msg3)).toBe(true);
    });

    test('POP updates transforms correctly after removing top item', async () => {
      // Push three items: A, B, C
      await sp.setInput('A');
      await sp.push();
      await sp.setInput('B');
      await sp.push();
      await sp.setInput('C');
      await sp.push();

      expect(await sp.getItemCount()).toBe(3);

      let transforms = await sp.getTransforms();
      // Expected: A -> 80px, B -> 40px, C -> 0px
      expect(transforms[0]).toContain('translateY(80px)');
      expect(transforms[1]).toContain('translateY(40px)');
      expect(transforms[2]).toContain('translateY(0px)');

      await sp.pop(); // remove C

      transforms = await sp.getTransforms();
      // After pop: A -> 40px, B -> 0px
      expect(transforms[0]).toContain('translateY(40px)');
      expect(transforms[1]).toContain('translateY(0px)');
    });
  });

  test.describe('PEEK events and transitions', () => {
    test('PEEK_CLICK_EMPTY on empty stack: sets empty feedback message; no highlight added', async () => {
      // Ensure empty
      expect(await sp.getItemCount()).toBe(0);

      await sp.peek();

      const msg = await sp.getMessageText();
      expect(messageIndicatesEmpty(msg)).toBe(true);

      // No highlighted items should exist
      expect(await sp.anyHighlightedItemExists()).toBe(false);
    });

    test('PEEK_CLICK_NON_EMPTY: sets peek message, adds highlight, removes it after timeout (onExit)', async () => {
      // Setup stack: X, Y
      await sp.setInput('X');
      await sp.push();
      await sp.setInput('Y');
      await sp.push();

      // Peek should highlight top and set message
      await sp.peek();

      const msg = await sp.getMessageText();
      expect(messageIncludesPeekForValue(msg, 'Y')).toBe(true);

      // Highlight present on top item
      expect(await sp.isTopItemHighlighted()).toBe(true);

      // Wait for PEEK_HIGHLIGHT_TIMEOUT (~1s) to remove highlight
      await sp.page.waitForTimeout(1200);

      // Highlight removed (onExit: REMOVE_HIGHLIGHT)
      expect(await sp.anyHighlightedItemExists()).toBe(false);

      // Stack remains unchanged
      expect(await sp.getItemCount()).toBe(2);
      expect(await sp.getTopItemText()).toBe('Y');
    });

    test('Buttons remain interactive during peek highlight; transitions remain correct', async () => {
      // Setup
      await sp.setInput('A');
      await sp.push();
      await sp.setInput('B');
      await sp.push();

      // Trigger peek highlight
      await sp.peek();

      // Immediately push while highlight is active
      await sp.setInput('C');
      await sp.push();

      // Push should succeed; new top item is 'C'
      expect(await sp.getItemCount()).toBe(3);
      expect(await sp.getTopItemText()).toBe('C');

      // Highlight should eventually be removed across all items
      await sp.page.waitForTimeout(1200);
      expect(await sp.anyHighlightedItemExists()).toBe(false);

      // Pop should work immediately (idle after peek timeout)
      await sp.pop();
      expect(await sp.getItemCount()).toBe(2);
      expect(await sp.getTopItemText()).toBe('B');

      const msg = await sp.getMessageText();
      expect(messageIncludesPoppedForValue(msg, 'C')).toBe(true);
    });
  });

  test.describe('Edge cases', () => {
    test('Pushing trimmed value stores trimmed text and clears input', async () => {
      await sp.setInput('   Hello World   ');
      await sp.push();

      expect(await sp.getTopItemText()).toBe('Hello World');
      expect(await sp.getInputValue()).toBe('');
    });

    test('Rapid sequence of operations exercises all transitions without disabling buttons', async () => {
      // Start empty: POP triggers empty_feedback
      await sp.pop();
      expect(messageIndicatesEmpty(await sp.getMessageText())).toBe(true);
      await expect(sp.popButton).toBeEnabled();

      // PUSH valid: pushing -> idle
      await sp.setInput('First');
      await sp.push();
      expect(await sp.getItemCount()).toBe(1);

      // PEEK non-empty: peek_highlighting -> idle after timeout
      await sp.peek();
      expect(await sp.isTopItemHighlighted()).toBe(true);
      await expect(sp.peekButton).toBeEnabled();

      // While highlight active, attempt another peek and push/pop
      await sp.peek(); // should re-apply highlight on current top
      await sp.setInput('Second');
      await sp.push();
      expect(await sp.getItemCount()).toBe(2);
      expect(await sp.getTopItemText()).toBe('Second');

      await sp.pop();
      expect(messageIncludesPoppedForValue(await sp.getMessageText(), 'Second')).toBe(true);
      expect(await sp.getItemCount()).toBe(1);

      // Allow any highlight to timeout
      await sp.page.waitForTimeout(1200);
      expect(await sp.anyHighlightedItemExists()).toBe(false);

      // Final peek on single-item stack
      await sp.peek();
      const msg = await sp.getMessageText();
      expect(messageIncludesPeekForValue(msg, 'First')).toBe(true);
      await sp.page.waitForTimeout(1200);
      expect(await sp.anyHighlightedItemExists()).toBe(false);
    });
  });
});