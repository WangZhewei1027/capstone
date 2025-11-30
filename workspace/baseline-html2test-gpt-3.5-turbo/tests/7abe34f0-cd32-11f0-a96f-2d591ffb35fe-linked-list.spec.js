import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abe34f0-cd32-11f0-a96f-2d591ffb35fe.html';

// Page Object to encapsulate interactions with the Linked List demo
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs
    this.valueInput = page.locator('#valueInput');
    this.indexInput = page.locator('#indexInput');
    // Buttons
    this.addHeadBtn = page.locator('#addHeadBtn');
    this.addTailBtn = page.locator('#addTailBtn');
    this.insertAtBtn = page.locator('#insertAtBtn');
    this.deleteHeadBtn = page.locator('#deleteHeadBtn');
    this.deleteTailBtn = page.locator('#deleteTailBtn');
    this.deleteAtBtn = page.locator('#deleteAtBtn');
    this.searchBtn = page.locator('#searchBtn');
    this.clearBtn = page.locator('#clearBtn');
    // Containers
    this.listContainer = page.locator('#listContainer');
    this.output = page.locator('#output');
    this.nodeBoxes = page.locator('#listContainer .node-box');
  }

  // Helpers to read node values into array
  async getNodeValues() {
    // If the list is empty, the container text will be "(Empty List)"
    const containerText = await this.listContainer.textContent();
    if (containerText && containerText.trim() === '(Empty List)') return [];
    const count = await this.nodeBoxes.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push((await this.nodeBoxes.nth(i).textContent()).trim());
    }
    return values;
  }

  async addHead(value) {
    await this.valueInput.fill(value);
    await this.addHeadBtn.click();
  }

  async addTail(value) {
    await this.valueInput.fill(value);
    await this.addTailBtn.click();
  }

  async insertAt(value, index) {
    await this.valueInput.fill(value);
    await this.indexInput.fill(String(index));
    await this.insertAtBtn.click();
  }

  async deleteHead() {
    await this.deleteHeadBtn.click();
  }

  async deleteTail() {
    await this.deleteTailBtn.click();
  }

  async deleteAt(index) {
    await this.indexInput.fill(String(index));
    await this.deleteAtBtn.click();
  }

  async search(value) {
    await this.valueInput.fill(value);
    await this.searchBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  async outputText() {
    return (await this.output.textContent()).trim();
  }
}

test.describe('Linked List Visualization & Demo - E2E', () => {
  // Capture console errors and page errors for each test
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen to console events and record error-level messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen to page errors (unhandled exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the app page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Assert that no console errors or page errors occurred during the test
    // Purpose: ensure the page runs without runtime exceptions or console error logs.
    expect(consoleErrors, `Console errors were logged: ${JSON.stringify(consoleErrors)}`).toEqual([]);
    expect(pageErrors, `Page errors occurred: ${pageErrors.map(e => e.toString()).join(', ')}`).toEqual([]);
  });

  test('Initial page load shows header, empty list and welcome output', async ({ page }) => {
    // Purpose: Verify initial state of the application on first load.
    const app = new LinkedListPage(page);

    // Header present
    await expect(page.locator('h1')).toHaveText(/Linked List - Visualization & Demo/);

    // List container should show "(Empty List)" initially
    await expect(app.listContainer).toHaveText('(Empty List)');

    // Output contains welcome message
    const out = await app.outputText();
    expect(out).toMatch(/Welcome! Use the controls above to manipulate the linked list./);

    // No node boxes should exist
    expect(await app.nodeBoxes.count()).toBe(0);

    // Accessibility attributes present on list container
    await expect(app.listContainer).toHaveAttribute('role', 'region');
    await expect(app.listContainer).toHaveAttribute('aria-label', 'Linked list visualization');
  });

  test('Adding nodes to head and tail updates DOM and output correctly', async ({ page }) => {
    // Purpose: Validate addHead and addTail functionality and DOM rendering order.
    const app1 = new LinkedListPage(page);

    // Add 'A' to head -> list: A
    await app.addHead('A');
    expect(await app.outputText()).toBe('Added "A" to head.');
    expect(await app.getNodeValues()).toEqual(['A']);

    // Add 'B' to tail -> list: A, B
    await app.addTail('B');
    expect(await app.outputText()).toBe('Added "B" to tail.');
    expect(await app.getNodeValues()).toEqual(['A', 'B']);

    // Add 'C' to head -> list: C, A, B
    await app.addHead('C');
    expect(await app.outputText()).toBe('Added "C" to head.');
    expect(await app.getNodeValues()).toEqual(['C', 'A', 'B']);

    // Ensure value input was cleared after operations (the implementation clears it)
    await expect(app.valueInput).toHaveValue('');
  });

  test('Insert at index with valid and invalid scenarios', async ({ page }) => {
    // Purpose: Verify insert at index, including validation messages for missing/invalid indices.
    const app2 = new LinkedListPage(page);

    // Setup base list: 1,2
    await app.addTail('1');
    await app.addTail('2');
    expect(await app.getNodeValues()).toEqual(['1', '2']);

    // Trying to insert with empty index should show validation message
    await app.valueInput.fill('X');
    await app.indexInput.fill(''); // explicitly empty
    await app.insertAtBtn.click();
    expect(await app.outputText()).toBe('Please enter a valid index to insert at.');
    // List unchanged
    expect(await app.getNodeValues()).toEqual(['1', '2']);

    // Trying to insert with out-of-bounds index (e.g., 10)
    await app.valueInput.fill('Z');
    await app.indexInput.fill('10');
    await app.insertAtBtn.click();
    expect(await app.outputText()).toMatch(/Index out of bounds\. Enter index between 0 and \d+\./);
    // List unchanged
    expect(await app.getNodeValues()).toEqual(['1', '2']);

    // Valid insert at index 1 -> 1, X, 2
    await app.insertAt('X', 1);
    expect(await app.outputText()).toBe('Inserted "X" at index 1.');
    expect(await app.getNodeValues()).toEqual(['1', 'X', '2']);

    // Insert at index 0 behaves like addHead
    await app.insertAt('H', 0);
    expect(await app.outputText()).toBe('Inserted "H" at index 0.');
    expect(await app.getNodeValues()).toEqual(['H', '1', 'X', '2']);

    // Insert at index equal to length behaves like addTail
    const len = (await app.getNodeValues()).length;
    await app.insertAt('T', len);
    expect(await app.outputText()).toBe(`Inserted "T" at index ${len}.`);
    expect(await app.getNodeValues()).toEqual(['H', '1', 'X', '2', 'T']);
  });

  test('Delete head, tail, and at index with edge cases', async ({ page }) => {
    // Purpose: Validate delete operations and messages when deleting from empty list or invalid indices.
    const app3 = new LinkedListPage(page);

    // Delete head on empty list
    await app.deleteHead();
    expect(await app.outputText()).toBe('List is empty; nothing to delete at head.');
    expect(await app.getNodeValues()).toEqual([]);

    // Delete tail on empty list
    await app.deleteTail();
    expect(await app.outputText()).toBe('List is empty; nothing to delete at tail.');
    expect(await app.getNodeValues()).toEqual([]);

    // Populate list: A, B, C
    await app.addTail('A');
    await app.addTail('B');
    await app.addTail('C');
    expect(await app.getNodeValues()).toEqual(['A', 'B', 'C']);

    // Delete head -> removes 'A'
    await app.deleteHead();
    expect(await app.outputText()).toBe('Deleted head node with value "A".');
    expect(await app.getNodeValues()).toEqual(['B', 'C']);

    // Delete tail -> removes 'C'
    await app.deleteTail();
    expect(await app.outputText()).toBe('Deleted tail node with value "C".');
    expect(await app.getNodeValues()).toEqual(['B']);

    // Delete at with missing index -> validation message
    await app.indexInput.fill('');
    await app.deleteAtBtn.click();
    expect(await app.outputText()).toBe('Please enter a valid index to delete at.');
    expect(await app.getNodeValues()).toEqual(['B']);

    // Delete at with out-of-bounds index
    await app.indexInput.fill('5');
    await app.deleteAtBtn.click();
    expect(await app.outputText()).toMatch(/Index out of bounds\. Enter index between 0 and \d+\./);
    expect(await app.getNodeValues()).toEqual(['B']);

    // Delete at index 0 -> should remove B and become empty
    await app.deleteAt(0);
    expect(await app.outputText()).toBe('Deleted node at index 0 with value "B".');
    expect(await app.getNodeValues()).toEqual([]);

    // After removing last element, both head/tail should be null -> list shows empty
    await expect(app.listContainer).toHaveText('(Empty List)');
  });

  test('Search functionality finds values and handles not-found/empty cases', async ({ page }) => {
    // Purpose: Validate search button behavior for found, not found, and missing input scenarios.
    const app4 = new LinkedListPage(page);

    // Setup list: alpha, beta
    await app.addTail('alpha');
    await app.addTail('beta');
    expect(await app.getNodeValues()).toEqual(['alpha', 'beta']);

    // Search with empty input
    await app.valueInput.fill('');
    await app.searchBtn.click();
    expect(await app.outputText()).toBe('Please enter a value to search.');

    // Search for existing value 'alpha'
    await app.search('alpha');
    expect(await app.outputText()).toBe('Value "alpha" found at index 0.');

    // Search for 'beta'
    await app.search('beta');
    expect(await app.outputText()).toBe('Value "beta" found at index 1.');

    // Search for non-existing value
    await app.search('gamma');
    expect(await app.outputText()).toBe('Value "gamma" not found in linked list.');

    // Ensure value input cleared after each search (implementation clears it)
    await expect(app.valueInput).toHaveValue('');
  });

  test('Clear button empties list and resets inputs with proper output', async ({ page }) => {
    // Purpose: Ensure Clear List resets the linked list and UI elements.
    const app5 = new LinkedListPage(page);

    // Populate list
    await app.addTail('one');
    await app.addTail('two');
    await app.addTail('three');
    expect(await app.getNodeValues()).toEqual(['one', 'two', 'three']);

    // Populate index input to ensure clear resets it
    await app.indexInput.fill('2');

    // Click clear
    await app.clear();
    expect(await app.outputText()).toBe('Cleared the linked list.');
    expect(await app.getNodeValues()).toEqual([]);
    // Check inputs cleared
    await expect(app.valueInput).toHaveValue('');
    await expect(app.indexInput).toHaveValue('');
    // List container shows explicit empty marker
    await expect(app.listContainer).toHaveText('(Empty List)');
  });

  test('Visual checks: node boxes and arrow presence/absence on last node', async ({ page }) => {
    // Purpose: Validate the visual structure: .node-box elements and that the last node does not show arrow
    const app6 = new LinkedListPage(page);

    // Add three nodes
    await app.addTail('n1');
    await app.addTail('n2');
    await app.addTail('n3');

    // There should be three node-box elements
    const boxes = app.nodeBoxes;
    expect(await boxes.count()).toBe(3);

    // Ensure their texts match
    expect(await app.getNodeValues()).toEqual(['n1', 'n2', 'n3']);

    // Verify the last node's arrow element is not displayed (CSS hides it by using .node:last-child .node-box .arrow { display: none; })
    // We'll check that the last .node-box does not contain an element with class 'arrow' or it's not visible.
    const lastNode = app.page.locator('#listContainer .node').nth(2);
    const arrowInLast = lastNode.locator('.node-box .arrow');
    // If arrow element is present it should be hidden; but simpler: assert that arrow count inside last node is 0 or not visible.
    const arrowCount = await arrowInLast.count();
    if (arrowCount === 0) {
      // it's not present in the DOM for the last child - acceptable
      expect(arrowCount).toBe(0);
    } else {
      // If present, it should be hidden (computed display none) - check visibility
      await expect(arrowInLast).not.toBeVisible();
    }
  });

  test('Edge case: inserting non-integer index or negative index handled gracefully', async ({ page }) => {
    // Purpose: Ensure index input validation rejects non-integer and negative inputs.
    const app7 = new LinkedListPage(page);

    await app.addTail('a');
    await app.addTail('b');

    // Non-integer index (e.g., 1.5) should be treated as invalid by getIndexInput => results in null -> validation message
    await app.valueInput.fill('X');
    await app.indexInput.fill('1.5');
    await app.insertAtBtn.click();
    expect(await app.outputText()).toBe('Please enter a valid index to insert at.');
    expect(await app.getNodeValues()).toEqual(['a', 'b']);

    // Negative index
    await app.valueInput.fill('Y');
    await app.indexInput.fill('-1');
    await app.insertAtBtn.click();
    expect(await app.outputText()).toMatch(/Index out of bounds\. Enter index between 0 and \d+\./);
    expect(await app.getNodeValues()).toEqual(['a', 'b']);
  });
});