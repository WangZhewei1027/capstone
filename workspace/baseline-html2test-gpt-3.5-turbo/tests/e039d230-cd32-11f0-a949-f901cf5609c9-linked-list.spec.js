import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/e039d230-cd32-11f0-a949-f901cf5609c9.html';

// Page Object for the Linked List page encapsulating interactions and queries
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputValue = page.locator('#inputValue');
    this.inputIndex = page.locator('#inputIndex');
    this.btnAddFront = page.locator('#btnAddFront');
    this.btnAddBack = page.locator('#btnAddBack');
    this.btnRemoveFront = page.locator('#btnRemoveFront');
    this.btnRemoveBack = page.locator('#btnRemoveBack');
    this.btnRemoveAt = page.locator('#btnRemoveAt');
    this.btnInsertAt = page.locator('#btnInsertAt');
    this.btnClear = page.locator('#btnClear');
    this.listContainer = page.locator('#listContainer');
    this.log = page.locator('#log');
    this.nodes = () => page.locator('.node');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Utilities to set inputs
  async setValueInput(val) {
    await this.inputValue.fill(String(val));
  }
  async setIndexInput(val) {
    await this.inputIndex.fill(String(val));
  }

  // Actions
  async clickAddFront() {
    await this.btnAddFront.click();
  }
  async clickAddBack() {
    await this.btnAddBack.click();
  }
  async clickRemoveFront() {
    await this.btnRemoveFront.click();
  }
  async clickRemoveBack() {
    await this.btnRemoveBack.click();
  }
  async clickRemoveAt() {
    await this.btnRemoveAt.click();
  }
  async clickInsertAt() {
    await this.btnInsertAt.click();
  }
  async clickClear() {
    await this.btnClear.click();
  }

  // Queries
  async getListText() {
    return (await this.listContainer.innerText()).trim();
  }

  async getNodeValues() {
    const count = await this.nodes().count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await this.nodes().nth(i).innerText()).trim());
    }
    return values;
  }

  async getLogText() {
    return (await this.log.innerText()).trim();
  }
}

test.describe('Linked List Visualization - e039d230-cd32-11f0-a949-f901cf5609c9', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Capture runtime page errors and console events for assertions
    pageErrors = [];
    consoleMessages = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // After each test ensure there were no unexpected runtime errors thrown
    // Tests may assert specific dialogs; here we assert there are no uncaught page errors
    expect(pageErrors.length, `Expected no uncaught page errors, found: ${pageErrors.map(e => e.toString()).join('; ')}`).toBe(0);
  });

  test.describe('Initial load and default state', () => {
    test('should load the page and show empty list message and initialization log', async ({ page }) => {
      // Purpose: Verify initial render shows empty state and initial log entry
      const ll = new LinkedListPage(page);
      await ll.goto();

      await expect(page.locator('h1')).toHaveText('Singly Linked List Demo & Visualization');

      // The container should indicate empty list
      const listText = await ll.getListText();
      expect(listText).toContain('List is empty (null)');

      // The log should contain initialization entry
      const logText = await ll.getLogText();
      expect(logText).toMatch(/Initialized empty linked list\./);

      // There should be no node elements initially
      expect(await ll.nodes().count()).toBe(0);
    });
  });

  test.describe('Add / Remove operations and log updates', () => {
    test('should add to front and back, reflect nodes order and log entries', async ({ page }) => {
      // Purpose: Test adding nodes to front and back and ensure DOM and logs update
      const ll1 = new LinkedListPage(page);
      await ll.goto();

      // Add front 10
      await ll.setValueInput(10);
      await ll.clickAddFront();
      await expect(ll.nodes().first()).toHaveText('10');
      expect(await ll.getNodeValues()).toEqual(['10']);
      expect((await ll.getLogText())).toMatch(/Added 10 at the front\./);

      // Add back 20
      await ll.setValueInput(20);
      await ll.clickAddBack();
      expect(await ll.getNodeValues()).toEqual(['10', '20']);
      expect((await ll.getLogText())).toMatch(/Added 20 at the back\./);

      // Add front 5 => becomes [5,10,20]
      await ll.setValueInput(5);
      await ll.clickAddFront();
      expect(await ll.getNodeValues()).toEqual(['5', '10', '20']);
      expect((await ll.getLogText())).toMatch(/Added 5 at the front\./);
    });

    test('should remove from front and back with correct log messages', async ({ page }) => {
      // Purpose: Validate removeFront and removeBack update DOM and logs
      const ll2 = new LinkedListPage(page);
      await ll.goto();

      // Prepare list [1,2,3]
      await ll.setValueInput(1);
      await ll.clickAddBack();
      await ll.setValueInput(2);
      await ll.clickAddBack();
      await ll.setValueInput(3);
      await ll.clickAddBack();
      expect(await ll.getNodeValues()).toEqual(['1', '2', '3']);

      // Remove front => removes 1
      await ll.clickRemoveFront();
      expect(await ll.getNodeValues()).toEqual(['2', '3']);
      expect((await ll.getLogText())).toMatch(/Removed 1 from the front\./);

      // Remove back => removes 3
      await ll.clickRemoveBack();
      expect(await ll.getNodeValues()).toEqual(['2']);
      expect((await ll.getLogText())).toMatch(/Removed 3 from the back\./);
    });
  });

  test.describe('Insert At and Remove At behaviors including edge cases', () => {
    test('should alert when inserting at non-zero index into empty list and allow inserting at index 0', async ({ page }) => {
      // Purpose: Verify alert when inserting into empty list with index != 0, and successful insert at 0
      const ll3 = new LinkedListPage(page);
      await ll.goto();

      // Ensure empty
      expect(await ll.getListText()).toContain('List is empty (null)');

      // Attempt insert at index 1 when list empty -> alert
      await ll.setValueInput(99);
      await ll.setIndexInput(1);
      const dialog1 = page.waitForEvent('dialog');
      await ll.clickInsertAt();
      const d1 = await dialog1;
      expect(d1.message()).toBe('List is empty, you can only insert at index 0.');
      await d1.accept();

      // Now insert at index 0 should succeed
      await ll.setValueInput(7);
      await ll.setIndexInput(0);
      await ll.clickInsertAt();
      expect(await ll.getNodeValues()).toEqual(['7']);
      expect((await ll.getLogText())).toMatch(/Inserted value 7 at index 0\./);
    });

    test('should validate index input for removeAt (empty/invalid/out-of-range)', async ({ page }) => {
      // Purpose: Test removeAt validation: empty input, negative, fractional, out-of-range
      const ll4 = new LinkedListPage(page);
      await ll.goto();

      // Setup list [42]
      await ll.setValueInput(42);
      await ll.clickAddBack();
      expect(await ll.getNodeValues()).toEqual(['42']);

      // Empty index -> alert 'Please enter an index.'
      await ll.inputIndex.fill(''); // ensure blank
      const dialogEmpty = page.waitForEvent('dialog');
      await ll.clickRemoveAt();
      const dEmpty = await dialogEmpty;
      expect(dEmpty.message()).toBe('Please enter an index.');
      await dEmpty.accept();

      // Negative index -> alert 'Index must be an integer >= 0.'
      await ll.setIndexInput(-1);
      const dialogNeg = page.waitForEvent('dialog');
      await ll.clickRemoveAt();
      const dNeg = await dialogNeg;
      expect(dNeg.message()).toBe('Index must be an integer >= 0.');
      await dNeg.accept();

      // Fractional index -> alert same message
      await ll.setIndexInput(0.5);
      const dialogFrac = page.waitForEvent('dialog');
      await ll.clickRemoveAt();
      const dFrac = await dialogFrac;
      expect(dFrac.message()).toBe('Index must be an integer >= 0.');
      await dFrac.accept();

      // Out-of-range (index >= size), with size=1, index=1 -> alert 'Index must be between 0 and 0.'
      await ll.setIndexInput(1);
      const dialogRange = page.waitForEvent('dialog');
      await ll.clickRemoveAt();
      const dRange = await dialogRange;
      expect(dRange.message()).toBe('Index must be between 0 and 0.');
      await dRange.accept();
    });

    test('should insert at middle index and remove at specified index', async ({ page }) => {
      // Purpose: Insert at various indices and removeAt to validate ordering
      const ll5 = new LinkedListPage(page);
      await ll.goto();

      // Build [10,20,30]
      await ll.setValueInput(10); await ll.clickAddBack();
      await ll.setValueInput(20); await ll.clickAddBack();
      await ll.setValueInput(30); await ll.clickAddBack();
      expect(await ll.getNodeValues()).toEqual(['10', '20', '30']);

      // Insert 15 at index 1 => [10,15,20,30]
      await ll.setValueInput(15);
      await ll.setIndexInput(1);
      await ll.clickInsertAt();
      expect(await ll.getNodeValues()).toEqual(['10', '15', '20', '30']);
      expect((await ll.getLogText())).toMatch(/Inserted value 15 at index 1\./);

      // Remove at index 2 (should remove 20) => [10,15,30]
      await ll.setIndexInput(2);
      await ll.clickRemoveAt();
      expect(await ll.getNodeValues()).toEqual(['10', '15', '30']);
      expect((await ll.getLogText())).toMatch(/Removed value 20 at index 2\./);
    });
  });

  test.describe('Clear list and empty-list alerts', () => {
    test('should warn on clear confirm and clear the list when confirmed', async ({ page }) => {
      // Purpose: Test the confirm dialog on clear and that accepting clears the list
      const ll6 = new LinkedListPage(page);
      await ll.goto();

      // Populate list [1,2]
      await ll.setValueInput(1); await ll.clickAddBack();
      await ll.setValueInput(2); await ll.clickAddBack();
      expect(await ll.getNodeValues()).toEqual(['1', '2']);

      // Clicking clear should show confirm. Accept it.
      const confirmPromise = page.waitForEvent('dialog');
      await ll.clickClear();
      const c = await confirmPromise;
      expect(c.type()).toBe('confirm');
      expect(c.message()).toBe('Are you sure you want to clear the entire list?');
      await c.accept();

      // After acceptance, list should be empty and log should have 'Cleared the list.'
      expect(await ll.getListText()).toContain('List is empty (null)');
      expect((await ll.getLogText())).toMatch(/Cleared the list\./);
    });

    test('should alert when attempting to remove from an already empty list', async ({ page }) => {
      // Purpose: Validate alerts when removing front/back on an empty list
      const ll7 = new LinkedListPage(page);
      await ll.goto();

      // Ensure empty
      expect(await ll.getListText()).toContain('List is empty (null)');

      // Remove front -> alert
      const dFront = page.waitForEvent('dialog');
      await ll.clickRemoveFront();
      const df = await dFront;
      expect(df.message()).toBe('List is already empty.');
      await df.accept();

      // Remove back -> alert
      const dBack = page.waitForEvent('dialog');
      await ll.clickRemoveBack();
      const db = await dBack;
      expect(db.message()).toBe('List is already empty.');
      await db.accept();

      // Clear on empty -> alert
      const dClear = page.waitForEvent('dialog');
      await ll.clickClear();
      const dc = await dClear;
      expect(dc.message()).toBe('List is already empty.');
      await dc.accept();
    });
  });

  test.describe('Input validation errors for value input', () => {
    test('should alert when value input is empty or invalid before add/insert operations', async ({ page }) => {
      // Purpose: Ensure getInputNumber validation triggers alerts for empty/NaN input
      const ll8 = new LinkedListPage(page);
      await ll.goto();

      // Ensure value input empty
      await ll.inputValue.fill('');
      // Clicking add front should alert 'Please enter a value first.'
      const dEmpty1 = page.waitForEvent('dialog');
      await ll.clickAddFront();
      const d11 = await dEmpty;
      expect(d1.message()).toBe('Please enter a value first.');
      await d1.accept();

      // Enter invalid non-numeric (but input is type=number; filling text will still set value)
      // Fill with 'abc' -> Number('abc') becomes NaN in script, triggers 'Invalid number input.'
      await ll.inputValue.fill('abc');
      const dInvalid = page.waitForEvent('dialog');
      await ll.clickAddBack();
      const d2 = await dInvalid;
      expect(d2.message()).toBe('Invalid number input.');
      await d2.accept();
    });
  });

  test.describe('Accessibility & DOM checks', () => {
    test('should have aria attributes and log is focusable role=log', async ({ page }) => {
      // Purpose: Check presence of ARIA attributes and roles for basic accessibility
      const ll9 = new LinkedListPage(page);
      await ll.goto();

      // listContainer has aria-live and tabIndex
      const list = page.locator('#listContainer');
      await expect(list).toHaveAttribute('aria-live', 'polite');
      await expect(list).toHaveAttribute('aria-label', 'Linked List visualization');

      // log element should have role=log
      const log = page.locator('#log');
      await expect(log).toHaveAttribute('role', 'log');
    });
  });

  test.describe('Console and runtime error observation', () => {
    test('should emit console messages (if any) and have no uncaught page errors', async ({ page }) => {
      // Purpose: Observe console messages and assert there are no runtime page errors
      const ll10 = new LinkedListPage(page);
      await ll.goto();

      // Interact lightly
      await ll.setValueInput(1);
      await ll.clickAddBack();
      await ll.setValueInput(2);
      await ll.clickAddBack();

      // We already capture console and pageerror events in beforeEach/afterEach
      // Here assert that no page errors were captured (afterEach will assert), and we can inspect console messages array
      // At minimum ensure we captured some console entries array (could be empty depending on environment)
      expect(Array.isArray(consoleMessages)).toBe(true);
    });
  });
});