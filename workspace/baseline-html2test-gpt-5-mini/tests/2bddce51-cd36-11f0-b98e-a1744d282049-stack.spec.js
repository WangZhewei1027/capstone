import { test, expect } from '@playwright/test';

// Test file: 2bddce51-cd36-11f0-b98e-a1744d282049-stack.spec.js
// URL under test:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html

// Page Object Model for the Stack Demo page
class StackPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.implSelect = page.locator('#impl');
    this.valueInput = page.locator('#value');
    this.pushBtn = page.locator('#pushBtn');
    this.pushRandom = page.locator('#pushRandom');
    this.popBtn = page.locator('#popBtn');
    this.peekBtn = page.locator('#peekBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.bulkPush = page.locator('#bulkPush');
    this.countInput = page.locator('#count');
    this.sampleBtn = page.locator('#sampleBtn');
    this.reverseBtn = page.locator('#reverseBtn');

    // Meta and visual
    this.sizeEl = page.locator('#size');
    this.topValEl = page.locator('#topVal');
    this.isEmptyEl = page.locator('#isEmpty');
    this.implLabel = page.locator('#implLabel');
    this.codeArea = page.locator('#codeArea');
    this.log = page.locator('#log');
    this.stackVisual = page.locator('#stackVisual');
  }

  // Helpers to read values
  async getSize() {
    return Number((await this.sizeEl.textContent()) || '0');
  }
  async getTop() {
    // returns raw text (may be empty string for empty-string top)
    return (await this.topValEl.textContent());
  }
  async getIsEmpty() {
    const txt = (await this.isEmptyEl.textContent()) || '';
    return txt.trim() === 'true';
  }

  // Get count of array-backed .stack-item elements (works when array implementation active)
  async getArrayItemCount() {
    return await this.page.locator('#stackVisual .stack-item').count();
  }

  // For linked-list mode, count nodes
  async getLinkedNodeCount() {
    return await this.page.locator('#stackVisual .node').count();
  }

  // Get array of visible item values for the current rendering.
  // For array-backed mode, each .stack-item contains a .val with the value.
  async getVisibleValuesArray() {
    // Prefer .stack-item .val if present
    const items = this.page.locator('#stackVisual .stack-item .val');
    const count = await items.count();
    if (count > 0) {
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push((await items.nth(i).textContent()) || '');
      }
      return out;
    }
    // fallback to linked nodes' boxes
    const boxes = this.page.locator('#stackVisual .node .box');
    const n = await boxes.count();
    const out1 = [];
    for (let i = 0; i < n; i++) {
      out.push((await boxes.nth(i).textContent()) || '');
    }
    return out;
  }

  // Actions
  async push(value) {
    await this.valueInput.fill(value);
    await this.pushBtn.click();
  }
  async pushEnter() {
    await this.valueInput.focus();
    await this.page.keyboard.press('Enter');
  }
  async pushRandomClick() {
    await this.pushRandom.click();
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
  async bulkPushCount(count, value = '') {
    await this.countInput.fill(String(count));
    if (value !== '') await this.valueInput.fill(value);
    await this.bulkPush.click();
  }
  async switchImpl(toValue) {
    await this.implSelect.selectOption(toValue);
  }
  async reverse() {
    await this.reverseBtn.click();
  }
  async runSample() {
    await this.sampleBtn.click();
  }
  // Dispatch a keyboard event to trigger keyboard shortcut without causing browser refresh
  async triggerSampleShortcutViaKeydown() {
    await this.page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true });
      window.dispatchEvent(e);
    });
  }

  // Utility to wait until the log contains an entry matching text
  async waitForLogContains(substr, timeout = 5000) {
    await this.page.waitForFunction(
      (sel, s) => {
        const el = document.querySelector(sel);
        return el && el.innerText && el.innerText.indexOf(s) !== -1;
      },
      '#log',
      substr,
      { timeout }
    );
  }

  async getLogText() {
    return (await this.log.textContent()) || '';
  }
}

test.describe('Stack Demo — End-to-end behavior and UI validation', () => {
  // arrays to capture console messages and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Silence Playwright default waiting for 1000ms logs; we will capture explicitly.
  });

  test('Initial load: default state, visual and meta are correct', async ({ page }) => {
    // Capture console and page errors
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    const url = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html';
    await page.goto(url, { waitUntil: 'load' });

    const stack = new StackPage(page);

    // The script initializes with A, B, C (3 items). Verify meta reflects that.
    await expect(stack.sizeEl).toHaveText('3');
    await expect(stack.topValEl).toHaveText('C');
    await expect(stack.isEmptyEl).toHaveText('false');

    // Verify array-backed rendering: three .stack-item elements and top has class 'top'
    const itemCount = await stack.getArrayItemCount();
    expect(itemCount).toBe(3);

    // The code area should show ArrayStack implementation on load
    await expect(stack.codeArea).toContainText('class ArrayStack');

    // The operation log should contain initialization message
    await stack.waitForLogContains('Initialized with A, B, C');

    // Assert that there are no uncaught page errors
    expect(pageErrors.length, 'No page errors on initial load').toBe(0);

    // Assert no console 'error' messages emitted
    const hasConsoleError = consoleMessages.some(m => m.type === 'error');
    expect(hasConsoleError, 'No console.error messages on initial load').toBe(false);
  });

  test('Push a value, push empty string via Enter, and push random — DOM and meta update accordingly', async ({ page }) => {
    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    const stack1 = new StackPage(page);

    // Push a deterministic value
    await stack.push('Hello');
    await expect(stack.sizeEl).toHaveText('4'); // was 3 -> now 4
    // top value text should be Hello
    await expect(stack.topValEl).toHaveText('Hello');
    // the top .stack-item should contain .val text 'Hello'
    await expect(page.locator('#stackVisual .stack-item.top .val')).toHaveText('Hello');

    // Push empty string by focusing input and pressing Enter
    // First clear the input to ensure empty
    await stack.valueInput.fill('');
    await stack.pushEnter();
    // Now size should be 5 and topValEl text content will be empty string (rendered as empty)
    await expect(stack.sizeEl).toHaveText('5');
    const topRaw = await stack.getTop();
    // topRaw should be an empty string (not the dash)
    expect(topRaw === '' || topRaw === null ? true : false).toBe(true);

    // Push random value
    await stack.pushRandomClick();
    // size increments by 1 -> 6
    await expect(stack.sizeEl).toHaveText('6');

    // Ensure no page errors occurred during these operations
    expect(pageErrors.length, 'No page errors during push operations').toBe(0);

    // Ensure console did not produce an 'error' level message
    expect(consoleMessages.some(m => m.type === 'error')).toBe(false);

    // The log should contain PUSH entries (we check for 'PUSH:' text)
    await stack.waitForLogContains('PUSH:');
  });

  test('Pop and Peek behavior and logs, including popping empty stack case', async ({ page }) => {
    const pageErrors2 = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    const stack2 = new StackPage(page);

    // Ensure we start known (initialized with A,B,C)
    await expect(stack.sizeEl).toHaveText('3');

    // Peek should log and not change size
    await stack.peek();
    await stack.waitForLogContains('PEEK:');
    await expect(stack.sizeEl).toHaveText('3');

    // Pop should remove top (C) => size 2, top becomes B
    await stack.pop();
    await expect(stack.sizeEl).toHaveText('2');
    await expect(stack.topValEl).toHaveText('B');
    await stack.waitForLogContains('POP:');

    // Clear then attempt pop to exercise 'pop empty' branch and log
    await stack.clear();
    await expect(stack.sizeEl).toHaveText('0');
    // pop on empty
    await stack.pop();
    // log should contain 'POP: stack empty'
    await stack.waitForLogContains('POP: stack empty');

    // Confirm no uncaught page errors
    expect(pageErrors.length, 'No page errors during pop/peek tests').toBe(0);
  });

  test('Bulk push and clear operations update visuals and meta correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    const stack3 = new StackPage(page);

    // Clear to start from empty for determinism
    await stack.clear();
    await expect(stack.sizeEl).toHaveText('0');
    await expect(stack.topValEl).toHaveText('—');

    // Bulk push 3 items with value 'X'
    await stack.bulkPushCount(3, 'X');
    await expect(stack.sizeEl).toHaveText('3');

    // Top value should reflect the third item (X #3)
    await expect(stack.topValEl).toHaveText('X #3');

    // The visible array values (bottom->top ordering of rendered elements)
    const values = await stack.getVisibleValuesArray();
    // Since rendered in column-reverse but getVisibleValuesArray reads in DOM order,
    // we expect three values including X #1, X #2, X #3 present
    expect(values.join('|')).toContain('X #1');
    expect(values.join('|')).toContain('X #2');
    expect(values.join('|')).toContain('X #3');

    // Clear again and confirm visual items removed
    await stack.clear();
    await expect(stack.sizeEl).toHaveText('0');
    const afterClearCount = await stack.getArrayItemCount();
    expect(afterClearCount).toBe(0);
  });

  test('Switching implementation preserves data and updates code & visual representation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    const stack4 = new StackPage(page);

    // Ensure array-backed initial state has 3 items
    await expect(stack.sizeEl).toHaveText('3');

    // Switch to linked implementation
    await stack.switchImpl('linked');

    // Impl label and code area should update
    await expect(stack.implLabel).toHaveText('Linked-list');
    await expect(stack.codeArea).toContainText('class LinkedStack');

    // Linked-list rendering should contain .node elements
    await page.waitForSelector('#stackVisual .node');
    const nodeCount = await stack.getLinkedNodeCount();
    // It should reflect the same count as meta size
    const metaSize = await stack.getSize();
    expect(nodeCount).toBe(metaSize);

    // Switch back to array and confirm .stack-item nodes exist again
    await stack.switchImpl('array');
    await page.waitForSelector('#stackVisual .stack-item');
    const arrCount = await stack.getArrayItemCount();
    expect(arrCount).toBe(await stack.getSize());
  });

  test('Reverse operation flips the order of the stack', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    const stack5 = new StackPage(page);

    // Clear and push a known sequence: A, B, C (bottom->top)
    await stack.clear();
    await stack.push('A');
    await stack.push('B');
    await stack.push('C');
    await expect(stack.sizeEl).toHaveText('3');

    // Capture current visible values bottom->top via visible array
    let before = await stack.getVisibleValuesArray(); // should contain A, B, C
    // Confirm ordering contains A then B then C (some forms may include indices etc, but values should be present in order)
    expect(before[0]).toBe('A');
    expect(before[before.length - 1]).toBe('C');

    // Reverse the stack
    await stack.reverse();

    // After reverse, top should become A (was bottom)
    await expect(stack.topValEl).toHaveText('A');

    // Visible sequence should be reversed: previously bottom->top A,B,C now should be C,B,A bottom->top
    const after = await stack.getVisibleValuesArray();
    // Top element (last in array) should now be 'A'
    expect(after[after.length - 1]).toBe('A');
    // Bottom element should now be 'C'
    expect(after[0]).toBe('C');
  });

  test('Sample sequence via button and keyboard shortcut triggers operations and logs', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    const stack6 = new StackPage(page);

    // Run sample via button and wait for completion log
    await stack.runSample();
    await stack.waitForLogContains('SAMPLE: done', 12000); // give it some time since sample sequence has delays

    // Now trigger sample via synthetic keyboard event (dispatch keydown) to avoid browser reload
    // This uses evaluate to dispatch a KeyboardEvent. The app listens for keydown with ctrlKey and key 'r'/'R'.
    await stack.triggerSampleShortcutViaKeydown();
    await stack.waitForLogContains('SAMPLE: running demo sequence', 12000);
    await stack.waitForLogContains('SAMPLE: done', 12000);

    // Ensure final log contains 'SAMPLE: done'
    const logText = await stack.getLogText();
    expect(logText).toContain('SAMPLE: done');
  });

  test('Accessibility & ARIA basics: application role and live regions present', async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bddce51-cd36-11f0-b98e-a1744d282049.html');

    // The root app has role application
    await expect(page.locator('.app')).toHaveAttribute('role', 'application');

    // The stack-area and log have aria-live attributes
    await expect(page.locator('#stackArea')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#log')).toHaveAttribute('aria-live', 'polite');

    // Implementation select has a title for screen-readers
    await expect(page.locator('#impl')).toHaveAttribute('title', 'Choose stack implementation');
  });
});