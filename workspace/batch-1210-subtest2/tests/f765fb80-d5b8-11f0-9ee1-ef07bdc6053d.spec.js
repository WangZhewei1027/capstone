import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f765fb80-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page Object for the Linked List page
class LinkedListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.addButton = "button[onclick='addNode()']";
    this.removeButton = "button[onclick='removeNode()']";
    this.listSelector = '#linkedList';
    this.nodeSelector = '.node';
    this.arrowSelector = '.arrow';
  }

  // Navigate to the app and wait for basic load
  async goto() {
    await this.page.goto(APP_URL);
    await this.page.waitForSelector('body');
  }

  // Trigger Add Node. Accepts a string to provide to prompt or null to dismiss prompt.
  async addNode(data) {
    // Listen for dialog and respond
    this.page.once('dialog', async dialog => {
      if (data === null) {
        await dialog.dismiss();
      } else {
        await dialog.accept(String(data));
      }
    });
    await this.page.click(this.addButton);
    // wait a short moment for DOM updates after renderList()
    await this.page.waitForTimeout(100);
  }

  // Trigger Remove Node
  async removeNode() {
    await this.page.click(this.removeButton);
    await this.page.waitForTimeout(100);
  }

  // Get node texts as array
  async getNodeTexts() {
    return await this.page.$$eval(this.nodeSelector, nodes => nodes.map(n => n.textContent));
  }

  // Get count of arrows (connections)
  async getArrowCount() {
    return await this.page.$$eval(this.arrowSelector, arrows => arrows.length);
  }

  // Get the linkedList internal array by evaluating page context
  async getLinkedListArray() {
    return await this.page.evaluate(() => {
      // If linkedList exists in page, call toArray, otherwise return null
      try {
        return (typeof linkedList !== 'undefined' && linkedList.toArray) ? linkedList.toArray() : null;
      } catch (e) {
        return { __error: e.message || String(e) };
      }
    });
  }

  // Get raw HTML of the linkedList container (useful for debugging)
  async getListInnerHTML() {
    return await this.page.$eval(this.listSelector, el => el.innerHTML);
  }
}

test.describe('Linked List Visualization - States & Transitions', () => {
  let page;
  let linkedListPage;
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context and page so tests are isolated
    const context = await browser.newContext();
    page = await context.newPage();

    // Collect console messages and page errors for inspection
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', error => {
      // pageerror captures uncaught exceptions from the page
      pageErrors.push({ message: error.message, stack: error.stack });
    });

    linkedListPage = new LinkedListPage(page);
    await linkedListPage.goto();
  });

  test.afterEach(async () => {
    // Assert there were no unexpected runtime errors on the page
    // If any page errors occurred, fail with diagnostic information
    expect(pageErrors).toEqual([], `Expected no uncaught page errors, but found: ${JSON.stringify(pageErrors, null, 2)}`);
    // Also assert there were no console messages of severity 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    expect(consoleErrors).toEqual([], `Expected no console.error messages, but found: ${JSON.stringify(consoleErrors, null, 2)}`);

    // Close the page's context to clean up
    await page.context().close();
  });

  // Initial state validation - S0_Idle
  test('S0_Idle: Initial render should show empty linked list (renderList called on entry)', async () => {
    // Verify DOM: no nodes present
    const nodes = await linkedListPage.getNodeTexts();
    expect(nodes).toEqual([], 'Expected no .node elements on initial render (idle state).');

    // Verify internal model: linkedList exists and is empty array
    const arr = await linkedListPage.getLinkedListArray();
    expect(arr).toEqual([], 'Expected linkedList.toArray() to return an empty array on initial load.');
  });

  // Transition: AddNode from idle -> S1_NodeAdded
  test('Transition AddNode: clicking Add Node adds a single node and updates DOM and model', async () => {
    // Simulate user entering "A" in the prompt
    await linkedListPage.addNode('A');

    // After adding, there should be one node with text "A"
    const nodes = await linkedListPage.getNodeTexts();
    expect(nodes.length).toBe(1);
    expect(nodes[0].trim()).toBe('A');

    // No arrows for single node
    const arrows = await linkedListPage.getArrowCount();
    expect(arrows).toBe(0);

    // Verify internal linkedList model reflects the added node
    const arr = await linkedListPage.getLinkedListArray();
    expect(arr).toEqual(['A']);
  });

  // Transition: AddNode from S1_NodeAdded -> S1_NodeAdded (add second node)
  test('S1_NodeAdded -> S1_NodeAdded: adding a second node appends to the list and shows an arrow', async () => {
    // Add first node
    await linkedListPage.addNode('first');
    // Add second node
    await linkedListPage.addNode('second');

    const nodes = await linkedListPage.getNodeTexts();
    expect(nodes.length).toBe(2);
    expect(nodes[0].trim()).toBe('first');
    expect(nodes[1].trim()).toBe('second');

    // There should be one arrow between two nodes
    const arrows = await linkedListPage.getArrowCount();
    expect(arrows).toBe(1);

    // Check arrow image src to ensure arrow graphic inserted
    const listInner = await linkedListPage.getListInnerHTML();
    expect(listInner).toContain('data:image/png;base64');

    // Validate internal model order
    const arr = await linkedListPage.getLinkedListArray();
    expect(arr).toEqual(['first', 'second']);
  });

  // Transition: RemoveNode from S1_NodeAdded -> S2_NodeRemoved
  test('S1_NodeAdded -> S2_NodeRemoved: removing a node removes last node and updates DOM and model', async () => {
    // Prepare list with three nodes
    await linkedListPage.addNode('n1');
    await linkedListPage.addNode('n2');
    await linkedListPage.addNode('n3');

    // Remove last node (should remove 'n3')
    await linkedListPage.removeNode();

    const nodes = await linkedListPage.getNodeTexts();
    expect(nodes.length).toBe(2);
    expect(nodes).toEqual(['n1', 'n2']);

    // Arrow count should be nodes-1
    const arrows = await linkedListPage.getArrowCount();
    expect(arrows).toBe(1);

    // Internal model should reflect removal
    const arr = await linkedListPage.getLinkedListArray();
    expect(arr).toEqual(['n1', 'n2']);
  });

  // Transition: RemoveNode from S2_NodeRemoved -> S2_NodeRemoved (remove repeatedly until empty)
  test('S2_NodeRemoved -> S2_NodeRemoved: repeatedly removing nodes until list is empty behaves gracefully', async () => {
    // Add two nodes then remove three times (final remove on empty)
    await linkedListPage.addNode('alpha');
    await linkedListPage.addNode('beta');

    // Remove 1 -> leaves 'alpha'
    await linkedListPage.removeNode();
    let nodes = await linkedListPage.getNodeTexts();
    expect(nodes).toEqual(['alpha']);

    // Remove 2 -> leaves empty
    await linkedListPage.removeNode();
    nodes = await linkedListPage.getNodeTexts();
    expect(nodes).toEqual([]);

    // Remove 3 -> already empty; should not throw and remain empty
    await linkedListPage.removeNode();
    nodes = await linkedListPage.getNodeTexts();
    expect(nodes).toEqual([]);

    // Internal model should be empty array
    const arr = await linkedListPage.getLinkedListArray();
    expect(arr).toEqual([]);
  });

  // Edge case: User cancels prompt when adding node
  test('Edge case: canceling the addNode prompt should not add a node (no-op)', async () => {
    // Ensure empty to start
    const before = await linkedListPage.getNodeTexts();
    expect(before).toEqual([]);

    // Trigger add but dismiss prompt
    await linkedListPage.addNode(null);

    // Should remain empty and not throw
    const after = await linkedListPage.getNodeTexts();
    expect(after).toEqual([]);

    // Internal model unchanged
    const arr = await linkedListPage.getLinkedListArray();
    expect(arr).toEqual([]);
  });

  // Edge case: adding nodes with unusual data (empty string, long string)
  test('Edge case: adding empty string or long string values are handled and rendered', async () => {
    // Add empty string - prompt accepted with empty string
    await linkedListPage.addNode('');
    let nodes = await linkedListPage.getNodeTexts();
    // The implementation checks "if (nodeData)" so empty string should NOT add a node
    // Validate that behavior: no new node should be added
    expect(nodes).toEqual([]);

    // Add a long string
    const longStr = 'x'.repeat(1000);
    await linkedListPage.addNode(longStr);
    nodes = await linkedListPage.getNodeTexts();
    // long string should be added
    expect(nodes.length).toBe(1);
    expect(nodes[0]).toBe(longStr);

    // Clean up: remove the long node
    await linkedListPage.removeNode();
    const finalNodes = await linkedListPage.getNodeTexts();
    expect(finalNodes).toEqual([]);
  });

  // Diagnostic test: ensure renderList is being invoked indirectly by checking DOM updates after operations
  test('renderList invocation reflected by DOM changes after add/remove operations', async () => {
    // Initially empty
    let beforeHTML = await linkedListPage.getListInnerHTML();
    expect(beforeHTML.trim()).toBe('', 'Expected initial linkedList container to be empty.');

    // Add node should change innerHTML
    await linkedListPage.addNode('diag1');
    const afterAddHTML = await linkedListPage.getListInnerHTML();
    expect(afterAddHTML.trim()).not.toBe('', 'Expected linkedList container to update after addNode (renderList).');

    // Remove node should clear innerHTML back to empty
    await linkedListPage.removeNode();
    const afterRemoveHTML = await linkedListPage.getListInnerHTML();
    expect(afterRemoveHTML.trim()).toBe('', 'Expected linkedList container to be empty after removing last node (renderList).');
  });
});