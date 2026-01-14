import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0cca8080-d5b5-11f0-899c-75bf12e026a9.html';

/**
 * Page Object for the Linked List demo
 */
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#valueInput');
    this.indexInput = page.locator('#indexInput');
    this.addHeadBtn = page.locator('#addHeadBtn');
    this.addTailBtn = page.locator('#addTailBtn');
    this.addAtIndexBtn = page.locator('#addAtIndexBtn');
    this.removeHeadBtn = page.locator('#removeHeadBtn');
    this.removeTailBtn = page.locator('#removeTailBtn');
    this.removeAtIndexBtn = page.locator('#removeAtIndexBtn');
    this.clearBtn = page.locator('#clearBtn');
    this.linkedListDisplay = page.locator('#linkedListDisplay');
    this.logEl = page.locator('#log');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async addHead(value) {
    await this.valueInput.fill(value);
    await this.addHeadBtn.click();
  }

  async addTail(value) {
    await this.valueInput.fill(value);
    await this.addTailBtn.click();
  }

  async addAtIndex(index, value) {
    await this.valueInput.fill(value);
    await this.indexInput.fill(String(index));
    await this.addAtIndexBtn.click();
  }

  async removeHead() {
    await this.removeHeadBtn.click();
  }

  async removeTail() {
    await this.removeTailBtn.click();
  }

  async removeAtIndex(index) {
    await this.indexInput.fill(String(index));
    await this.removeAtIndexBtn.click();
  }

  async clearList(acceptConfirm = true) {
    // handle confirm popup
    this.page.once('dialog', async dialog => {
      if (acceptConfirm) await dialog.accept();
      else await dialog.dismiss();
    });
    await this.clearBtn.click();
  }

  async getNodeTexts() {
    return await this.linkedListDisplay.locator('.node').allTextContents();
  }

  async getDisplayText() {
    return (await this.linkedListDisplay.innerText()).trim();
  }

  async getLogText() {
    return (await this.logEl.innerText()).trim();
  }
}

test.describe('Linked List Interactive Demo - FSM Validation', () => {

  // Collect console and page errors for each test to assert runtime stability
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages and page errors
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });
  });

  test.describe('Initial State and Visuals (S0_Empty)', () => {
    test('renders "Empty List" on initial load', async ({ page }) => {
      // Arrange
      const p = new LinkedListPage(page);
      await p.goto();

      // Assert the linked list display shows the Empty List placeholder
      await expect(p.linkedListDisplay).toBeVisible();
      const displayText = await p.getDisplayText();
      // The implementation uses a span with "Empty List" text when empty
      expect(displayText).toContain('Empty List');

      // Ensure no runtime page errors or console error messages occurred on load
      expect(pageErrors.length).toBe(0);
      const consoleErrors = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Add Node Operations and Transitions (S0->S1, S1->S1)', () => {

    test('Add at head from empty transitions to Non-Empty and logs action', async ({ page }) => {
      // Validate AddHead transition from empty list - S0_Empty -> S1_NonEmpty
      const p = new LinkedListPage(page);
      await p.goto();

      // Add a head node with value "A"
      await p.addHead('A');

      // After add, list should render a node with text "A"
      const nodes = await p.getNodeTexts();
      expect(nodes).toEqual(['A']);

      // Log should contain the added message (timestamp prefix variable, so check substring)
      const logText = await p.getLogText();
      expect(logText).toContain('Added "A" at head');

      // input should be cleared after operation
      expect(await p.valueInput.inputValue()).toBe('');

      // No uncaught page errors or console.error messages
      expect(pageErrors.length).toBe(0);
      const consoleErrs = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrs.length).toBe(0);
    });

    test('Add at tail from empty transitions to Non-Empty and logs action', async ({ page }) => {
      // Validate AddTail transition from empty list - S0_Empty -> S1_NonEmpty
      const p = new LinkedListPage(page);
      await p.goto();

      await p.addTail('B');

      const nodes = await p.getNodeTexts();
      expect(nodes).toEqual(['B']);

      const logText = await p.getLogText();
      expect(logText).toContain('Added "B" at tail');

      expect(await p.valueInput.inputValue()).toBe('');
      expect(pageErrors.length).toBe(0);
      const consoleErrs = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrs.length).toBe(0);
    });

    test('Add at index in non-empty list inserts at correct position', async ({ page }) => {
      // Build initial list: A, B
      const p = new LinkedListPage(page);
      await p.goto();
      await p.addHead('A');
      await p.addTail('B');

      // Insert "C" at index 1 -> expected order: A, C, B
      await p.addAtIndex(1, 'C');

      const nodes = await p.getNodeTexts();
      expect(nodes).toEqual(['A', 'C', 'B']);

      const logText = await p.getLogText();
      expect(logText).toContain('Added "C" at index 1');

      // Edge-case: add at index 0 should act as addAtHead
      await p.addAtIndex(0, 'X');
      expect(await p.getNodeTexts()).toEqual(['X', 'A', 'C', 'B']);

      // Edge-case: add at index == length should behave as addAtTail
      await p.indexInput.fill('4'); // current length = 4
      await p.valueInput.fill('Y');
      await p.addAtIndexBtn.click();
      expect(await p.getNodeTexts()).toEqual(['X', 'A', 'C', 'B', 'Y']);

      expect(pageErrors.length).toBe(0);
      const consoleErrs = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrs.length).toBe(0);
    });

    test('Add at index with missing value triggers alert', async ({ page }) => {
      // If value is empty, clicking addAtIndex should alert 'Please enter a value'
      const p = new LinkedListPage(page);
      await p.goto();

      // Prepare to capture alert dialog
      const dialogPromise = page.waitForEvent('dialog');
      // leave valueInput empty and click addAtIndex
      await p.indexInput.fill('0');
      await p.addAtIndexBtn.click();
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter a value');
      await dialog.accept();

      // No DOM changes expected
      expect(await p.getDisplayText()).toContain('Empty List');

      expect(pageErrors.length).toBe(0);
    });

    test('Add at index with invalid index (NaN) triggers alert', async ({ page }) => {
      // If index is not a number, should alert 'Please enter a valid index'
      const p = new LinkedListPage(page);
      await p.goto();

      const dialogPromise = page.waitForEvent('dialog');
      await p.valueInput.fill('Z');
      // leave index empty to produce NaN
      await p.addAtIndexBtn.click();

      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter a valid index');
      await dialog.accept();

      // Ensure list remains unchanged
      expect(await p.getDisplayText()).toContain('Empty List');

      expect(pageErrors.length).toBe(0);
    });

    test('Add at index out of bounds triggers alert', async ({ page }) => {
      // If index < 0 or > length -> alert 'Index out of bounds'
      const p = new LinkedListPage(page);
      await p.goto();

      // Seed one node so length > 0
      await p.addHead('One');

      const dialogPromise = page.waitForEvent('dialog');
      await p.valueInput.fill('TooFar');
      // set index to a value > length (length currently 1)
      await p.indexInput.fill('5');
      await p.addAtIndexBtn.click();

      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Index out of bounds');
      await dialog.accept();

      // List should remain unchanged
      const nodes = await p.getNodeTexts();
      expect(nodes).toEqual(['One']);

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Remove Node Operations (S1->S1 Edge Cases)', () => {

    test('Remove head from non-empty removes first node and logs', async ({ page }) => {
      // Build list A -> B -> C then remove head
      const p = new LinkedListPage(page);
      await p.goto();
      await p.addHead('A');
      await p.addTail('B');
      await p.addTail('C');

      // Remove head
      await p.removeHead();

      // Expected list now: B, C
      const nodes = await p.getNodeTexts();
      expect(nodes).toEqual(['B', 'C']);

      const logText = await p.getLogText();
      expect(logText).toContain('Removed "A" from head');

      expect(pageErrors.length).toBe(0);
    });

    test('Remove head on empty list shows alert', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();

      const dialogPromise = page.waitForEvent('dialog');
      await p.removeHead();
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('List is empty - nothing to remove');
      await dialog.accept();

      // Still empty visually
      expect(await p.getDisplayText()).toContain('Empty List');
      expect(pageErrors.length).toBe(0);
    });

    test('Remove tail from non-empty removes last node and logs', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();
      await p.addHead('A');
      await p.addTail('B');
      await p.addTail('C');

      await p.removeTail();

      // Expected: A, B
      expect(await p.getNodeTexts()).toEqual(['A', 'B']);
      expect((await p.getLogText())).toContain('Removed "C" from tail');

      expect(pageErrors.length).toBe(0);
    });

    test('Remove tail on empty list shows alert', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();

      const dialogPromise = page.waitForEvent('dialog');
      await p.removeTail();
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('List is empty - nothing to remove');
      await dialog.accept();

      expect(await p.getDisplayText()).toContain('Empty List');
      expect(pageErrors.length).toBe(0);
    });

    test('Remove at index removes correct node and logs action', async ({ page }) => {
      // Build A, B, C, D and remove index 2 (C)
      const p = new LinkedListPage(page);
      await p.goto();
      await p.addTail('A');
      await p.addTail('B');
      await p.addTail('C');
      await p.addTail('D');

      await p.removeAtIndex(2); // remove 'C'

      expect(await p.getNodeTexts()).toEqual(['A', 'B', 'D']);
      expect((await p.getLogText())).toContain('Removed "C" at index 2');

      expect(pageErrors.length).toBe(0);
    });

    test('Remove at index with NaN shows alert', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();

      const dialogPromise = page.waitForEvent('dialog');
      // leave index empty to produce NaN
      await p.removeAtIndexBtn.click();
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Please enter a valid index');
      await dialog.accept();

      expect(pageErrors.length).toBe(0);
    });

    test('Remove at index out of bounds shows alert', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();

      await p.addHead('OnlyOne');

      const dialogPromise = page.waitForEvent('dialog');
      // request removal at index 5 which is out of bounds
      await p.removeAtIndex(5);
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Index out of bounds or list empty');
      await dialog.accept();

      // List remains unchanged
      expect(await p.getNodeTexts()).toEqual(['OnlyOne']);
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Clear List Operation and Confirm Dialog (S1->S0)', () => {
    test('Clear entire list after confirmation empties list and logs action', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();

      // Seed some nodes
      await p.addHead('A');
      await p.addTail('B');

      // Accept confirmation dialog
      const dialogPromise = page.waitForEvent('dialog');
      await p.clearBtn.click();
      const dialog = await dialogPromise;
      // The clear uses confirm; message should ask about clearing list
      expect(dialog.type()).toBe('confirm');
      // Accept the confirm
      await dialog.accept();

      // After clearing, display should show Empty List and log should reflect the action
      expect(await p.getDisplayText()).toContain('Empty List');
      expect((await p.getLogText())).toContain('Cleared the entire list');

      expect(pageErrors.length).toBe(0);
    });

    test('Canceling clear keeps list intact', async ({ page }) => {
      const p = new LinkedListPage(page);
      await p.goto();
      await p.addHead('KeepMe');

      // When dismissing confirm, list should remain
      const dialogPromise = page.waitForEvent('dialog');
      await p.clearBtn.click();
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();

      // List should still contain the node
      expect(await p.getNodeTexts()).toEqual(['KeepMe']);
      // No 'Cleared the entire list' entry should be present at top of log
      const log = await p.getLogText();
      expect(log).not.toContain('Cleared the entire list');

      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Runtime observations: console & page errors', () => {
    test('No uncaught exceptions or console.error during typical operations', async ({ page }) => {
      // Run a suite of typical operations and assert there are no page errors or console errors
      const p = new LinkedListPage(page);
      await p.goto();

      // Seed and mutate list
      await p.addHead('1');
      await p.addTail('2');
      await p.addAtIndex(1, '1.5');
      await p.removeAtIndex(1);
      await p.removeHead();
      await p.addTail('end');

      // Accept confirm on clear
      page.once('dialog', async dialog => { await dialog.accept(); });
      await p.clearBtn.click();

      // At the end, assert no page errors or console.error messages recorded
      expect(pageErrors.length).toBe(0);
      const consoleErrs = consoleMessages.filter(m => m.type === 'error');
      expect(consoleErrs.length).toBe(0);
    });
  });

});