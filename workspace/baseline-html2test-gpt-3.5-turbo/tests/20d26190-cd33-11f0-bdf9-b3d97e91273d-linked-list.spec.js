import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d26190-cd33-11f0-bdf9-b3d97e91273d.html';

// Page Object model to encapsulate interactions with the Linked List demo
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      insertValue: '#insertValue',
      removeValue: '#removeValue',
      insertHeadBtn: '#insertHead',
      insertTailBtn: '#insertTail',
      removeNodeBtn: '#removeNode',
      clearListBtn: '#clearList',
      linkedListVisual: '#linkedListVisual',
      output: '#output',
      node: '.node',
      arrow: '.arrow'
    };
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
  }

  async insertHead(value) {
    await this.page.fill(this.selectors.insertValue, value);
    // attach dialog handler in caller if expecting alerts
    await this.page.click(this.selectors.insertHeadBtn);
  }

  async insertTail(value) {
    await this.page.fill(this.selectors.insertValue, value);
    await this.page.click(this.selectors.insertTailBtn);
  }

  async clickInsertHeadEmpty() {
    await this.page.fill(this.selectors.insertValue, '');
    await this.page.click(this.selectors.insertHeadBtn);
  }

  async remove(value) {
    await this.page.fill(this.selectors.removeValue, value);
    await this.page.click(this.selectors.removeNodeBtn);
  }

  async clickRemoveEmpty() {
    await this.page.fill(this.selectors.removeValue, '');
    await this.page.click(this.selectors.removeNodeBtn);
  }

  async clearList() {
    await this.page.click(this.selectors.clearListBtn);
  }

  async getOutputText() {
    return (await this.page.locator(this.selectors.output).innerText()).trim();
  }

  async getVisualText() {
    return (await this.page.locator(this.selectors.linkedListVisual).innerText()).trim();
  }

  async getNodes() {
    return await this.page.$$eval(this.selectors.node, nodes => nodes.map(n => n.textContent.trim()));
  }

  async getArrowCount() {
    return await this.page.$$eval(this.selectors.arrow, arrows => arrows.length);
  }

  async getInsertValue() {
    return await this.page.inputValue(this.selectors.insertValue);
  }

  async getRemoveValue() {
    return await this.page.inputValue(this.selectors.removeValue);
  }

  async getActiveElementId() {
    return await this.page.evaluate(() => document.activeElement ? document.activeElement.id : null);
  }

  // helper to ensure DOM is stable for assertions
  async waitForRender() {
    await this.page.waitForTimeout(50);
  }
}

test.describe('Linked List Demo - UI interactions and state transitions', () => {
  // collect console errors and page errors for each test and assert none occur
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages of type "error"
    page.on('console', msg => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // If inspection fails, record generic message
        consoleErrors.push(String(msg));
      }
    });

    // Listen for unhandled exceptions on the page
    page.on('pageerror', err => {
      pageErrors.push(err.message || String(err));
    });
  });

  test.afterEach(async () => {
    // After each test, assert that no console errors or page errors were emitted
    expect(consoleErrors, `Unexpected console.error messages: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('Initial page load shows empty list and correct static elements', async ({ page }) => {
    // Purpose: Verify initial render shows an empty list and that key UI elements exist
    const app = new LinkedListPage(page);
    await app.goto();

    // Ensure page title and headings are present
    await expect(page.locator('h1')).toHaveText(/Singly Linked List Demo/);

    // The visual representation and the textual output should both indicate "(empty)"
    const visual = await app.getVisualText();
    const output = await app.getOutputText();
    expect(visual).toBe('(empty)');
    expect(output).toBe('(empty)');

    // Accessibility attributes on output should be present and correct
    const outputLocator = page.locator('#output');
    await expect(outputLocator).toHaveAttribute('aria-live', 'polite');
    await expect(outputLocator).toHaveAttribute('aria-atomic', 'true');

    // Buttons and inputs are visible
    await expect(page.locator('#insertValue')).toBeVisible();
    await expect(page.locator('#removeValue')).toBeVisible();
    await expect(page.locator('#insertHead')).toBeVisible();
    await expect(page.locator('#insertTail')).toBeVisible();
    await expect(page.locator('#removeNode')).toBeVisible();
    await expect(page.locator('#clearList')).toBeVisible();
  });

  test('Insert at head updates nodes order, clears input, and focuses insert input', async ({ page }) => {
    // Purpose: Test inserting at the head multiple times and validate DOM update and focus behavior
    const app1 = new LinkedListPage(page);
    await app.goto();

    // Insert "A" at head
    await app.insertHead('A');
    await app.waitForRender();

    let nodes = await app.getNodes();
    expect(nodes).toEqual(['A']);
    expect(await app.getOutputText()).toBe('A');

    // Insert "B" at head -> new head should be B, then A
    await app.insertHead('B');
    await app.waitForRender();

    nodes = await app.getNodes();
    expect(nodes).toEqual(['B', 'A']);
    expect(await app.getOutputText()).toBe('B -> A');

    // Verify arrows equal nodes - 1
    const arrowCount = await app.getArrowCount();
    expect(arrowCount).toBe(nodes.length - 1);

    // After insertion the input should be cleared and focused
    expect(await app.getInsertValue()).toBe('');
    expect(await app.getActiveElementId()).toBe('insertValue');
  });

  test('Insert at tail appends nodes and respects order', async ({ page }) => {
    // Purpose: Validate tail insertion produces appended order
    const app2 = new LinkedListPage(page);
    await app.goto();

    // Ensure list is cleared first by using clear action and accepting confirm
    page.once('dialog', async dialog => {
      // expect a confirm dialog and accept it
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await app.clearList();
    await app.waitForRender();

    // Insert 1, then 2 at tail => 1 -> 2
    await app.insertTail('1');
    await app.insertTail('2');
    await app.waitForRender();

    const nodes1 = await app.getNodes();
    expect(nodes).toEqual(['1', '2']);
    expect(await app.getOutputText()).toBe('1 -> 2');
    expect(await app.getArrowCount()).toBe(1);
  });

  test('Removing nodes: remove middle, head, tail; non-existent remove shows alert', async ({ page }) => {
    // Purpose: Test removal behavior for different positions and handle not-found alerts
    const app3 = new LinkedListPage(page);
    await app.goto();

    // Build a list: X -> Y -> Z
    await app.insertTail('X');
    await app.insertTail('Y');
    await app.insertTail('Z');
    await app.waitForRender();
    expect(await app.getNodes()).toEqual(['X', 'Y', 'Z']);

    // Remove middle node "Y" - no alert expected
    await app.remove('Y');
    await app.waitForRender();
    expect(await app.getNodes()).toEqual(['X', 'Z']);
    expect(await app.getOutputText()).toBe('X -> Z');

    // Remove head "X"
    await app.remove('X');
    await app.waitForRender();
    expect(await app.getNodes()).toEqual(['Z']);
    expect(await app.getOutputText()).toBe('Z');

    // Remove tail "Z"
    await app.remove('Z');
    await app.waitForRender();
    expect(await app.getNodes()).toEqual([]);
    expect(await app.getOutputText()).toBe('(empty)');
    expect(await app.getVisualText()).toBe('(empty)');

    // Attempt to remove a non-existent value should show an alert with the correct message
    // Prepare the list again with a single element for clarity
    await app.insertTail('A');
    await app.waitForRender();
    // Attempt removing "Q" which does not exist
    const dialogPromise = page.waitForEvent('dialog');
    await app.remove('Q');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Value "Q" not found in the list.');
    await dialog.accept();
    // Ensure list remained unchanged
    expect(await app.getNodes()).toEqual(['A']);
  });

  test('Removing with empty input triggers alert and focuses remove input', async ({ page }) => {
    // Purpose: Validate validation handling when remove is clicked with empty input
    const app4 = new LinkedListPage(page);
    await app.goto();

    // Ensure removeValue is empty
    await page.fill('#removeValue', '');
    const dialogPromise1 = page.waitForEvent('dialog');
    await app.clickRemoveEmpty();
    const dialog1 = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a value to remove.');
    await dialog.accept();

    // Focus should be on remove input after the alert
    expect(await app.getActiveElementId()).toBe('removeValue');
  });

  test('Insert with empty input triggers alert and focuses insert input', async ({ page }) => {
    // Purpose: Validate validation handling when insert is clicked with empty input
    const app5 = new LinkedListPage(page);
    await app.goto();

    const dialogPromise2 = page.waitForEvent('dialog');
    await app.clickInsertHeadEmpty();
    const dialog2 = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a value to insert.');
    await dialog.accept();

    // Focus should be on insert input after the alert
    expect(await app.getActiveElementId()).toBe('insertValue');
  });

  test('Clear list confirm: cancel keeps list, accept clears list', async ({ page }) => {
    // Purpose: Ensure the clear list button respects confirm dialog choices
    const app6 = new LinkedListPage(page);
    await app.goto();

    // Prepare list with two items
    await app.insertTail('P');
    await app.insertTail('Q');
    await app.waitForRender();
    expect(await app.getNodes()).toEqual(['P', 'Q']);

    // Click clear and dismiss (cancel) the confirm -> list should remain
    const dialogPromise1 = page.waitForEvent('dialog');
    await app.clearList();
    const dialog1 = await dialogPromise1;
    expect(dialog1.type()).toBe('confirm');
    // Dismiss to cancel clearing
    await dialog1.dismiss();
    await app.waitForRender();
    expect(await app.getNodes()).toEqual(['P', 'Q']);
    expect(await app.getOutputText()).toBe('P -> Q');

    // Click clear again and accept the confirm -> list should be cleared
    const dialogPromise2 = page.waitForEvent('dialog');
    await app.clearList();
    const dialog2 = await dialogPromise2;
    expect(dialog2.type()).toBe('confirm');
    await dialog2.accept();
    await app.waitForRender();
    expect(await app.getNodes()).toEqual([]);
    expect(await app.getOutputText()).toBe('(empty)');
    expect(await app.getVisualText()).toBe('(empty)');
  });
});