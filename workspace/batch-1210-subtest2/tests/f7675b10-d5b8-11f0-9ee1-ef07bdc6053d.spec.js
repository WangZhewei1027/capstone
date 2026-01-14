import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7675b10-d5b8-11f0-9ee1-ef07bdc6053d.html';

// Page object for the Priority Queue Demo page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.elementSelector = '#element';
    this.prioritySelector = '#priority';
    this.addButtonSelector = "button[onclick='addElement()']";
    this.removeButtonSelector = "button[onclick='removeElement()']";
    this.queueSelector = '#queue';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Fill inputs and click Add
  async addElement(element, priority) {
    await this.page.fill(this.elementSelector, String(element));
    await this.page.fill(this.prioritySelector, String(priority));
    await Promise.all([
      this.page.waitForTimeout(50), // small pause to ensure values set (UI is simple)
      this.page.click(this.addButtonSelector)
    ]);
  }

  // Click Remove button
  async removeElement() {
    await this.page.click(this.removeButtonSelector);
  }

  // Return number of node elements currently rendered
  async getNodeCount() {
    return await this.page.$$eval(`${this.queueSelector} .node`, nodes => nodes.length);
  }

  // Return array of node innerText values in order
  async getNodeTexts() {
    return await this.page.$$eval(`${this.queueSelector} .node`, nodes => nodes.map(n => n.innerText));
  }

  // Convenience: check if queue is empty via DOM
  async isEmptyFromDOM() {
    const count = await this.getNodeCount();
    return count === 0;
  }

  // Read current input values
  async getInputValues() {
    return await this.page.evaluate((elSel, prSel) => {
      return {
        element: document.querySelector(elSel).value,
        priority: document.querySelector(prSel).value
      };
    }, this.elementSelector, this.prioritySelector);
  }
}

test.describe('Priority Queue Demo - FSM tests', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let page;
  let pq;

  test.beforeEach(async ({ browser }) => {
    // Create a new context/page for each test to isolate state
    const context = await browser.newContext();
    page = await context.newPage();

    // Capture page errors (uncaught exceptions)
    pageErrors = [];
    page.on('pageerror', err => {
      // store stringified error for assertions and debugging
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Capture console errors
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    pq = new PriorityQueuePage(page);
    await pq.goto();
  });

  test.afterEach(async () => {
    // Validate no unexpected runtime errors occurred during the test
    // We assert zero uncaught page errors and zero console 'error' messages.
    // The application is expected to run without runtime ReferenceError/SyntaxError/TypeError in normal operation.
    expect(pageErrors, `Uncaught page errors found: ${pageErrors.join(' | ')}`).toHaveLength(0);
    expect(consoleErrors, `Console.error messages found: ${consoleErrors.join(' | ')}`).toHaveLength(0);
    await page.context().close();
  });

  test('Initial state S0_Empty: Queue is empty on load and shows no nodes', async () => {
    // Verify initial empty state: #queue has no .node elements
    const nodeCount = await pq.getNodeCount();
    expect(nodeCount).toBe(0);
    const isEmpty = await pq.isEmptyFromDOM();
    expect(isEmpty).toBe(true);

    // Verify the input placeholders are present as expected
    const inputValues = await pq.getInputValues();
    // Inputs should be empty strings initially
    expect(inputValues.element).toBe('');
    expect(inputValues.priority).toBe('');
  });

  test('S0_Empty -> S1_NonEmpty: Add a single element transitions to Non-Empty and renders node', async () => {
    // This test validates enqueue(element, priority) and render() on entry to S1_NonEmpty
    await pq.addElement('10', 5);

    // After adding, the queue should have exactly one node with expected text
    const nodeCount = await pq.getNodeCount();
    expect(nodeCount).toBe(1);

    const texts = await pq.getNodeTexts();
    expect(texts[0]).toContain('Element: 10');
    expect(texts[0]).toContain('Priority: 5');

    // Inputs should be cleared after successful add
    const inputs = await pq.getInputValues();
    expect(inputs.element).toBe('');
    expect(inputs.priority).toBe('');
  });

  test('S1_NonEmpty -> S1_NonEmpty: Adding multiple elements keeps the queue sorted by priority', async () => {
    // Add three elements with different priorities
    await pq.addElement('A', 10);
    await pq.addElement('B', 2);
    await pq.addElement('C', 5);

    // The queue should display nodes sorted by ascending priority (lower number = higher priority)
    const texts = await pq.getNodeTexts();
    // Expect order: B (2), C (5), A (10)
    expect(texts.length).toBe(3);
    expect(texts[0]).toContain('Element: B');
    expect(texts[0]).toContain('Priority: 2');
    expect(texts[1]).toContain('Element: C');
    expect(texts[1]).toContain('Priority: 5');
    expect(texts[2]).toContain('Element: A');
    expect(texts[2]).toContain('Priority: 10');
  });

  test('S1_NonEmpty -> S1_NonEmpty then S1_NonEmpty -> S0_Empty: Remove highest priority updates queue and can empty it', async () => {
    // Add two elements
    await pq.addElement('X', 3);
    await pq.addElement('Y', 1);

    // Current order should be Y (1), X (3)
    let texts = await pq.getNodeTexts();
    expect(texts[0]).toContain('Element: Y');
    expect(texts[1]).toContain('Element: X');

    // Remove highest priority (Y)
    await pq.removeElement();

    // After removal, only X should remain
    texts = await pq.getNodeTexts();
    expect(texts.length).toBe(1);
    expect(texts[0]).toContain('Element: X');

    // Remove again to transition to empty
    await pq.removeElement();

    // Queue should be empty now
    const nodeCountAfter = await pq.getNodeCount();
    expect(nodeCountAfter).toBe(0);
    const isEmpty = await pq.isEmptyFromDOM();
    expect(isEmpty).toBe(true);
  });

  test('Edge case: Adding invalid input shows alert and does not modify queue', async () => {
    // Prepare to capture dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Attempt to add with empty element and empty priority
    await page.click(pq.addButtonSelector);

    // The app should have shown an alert asking for valid input
    expect(dialogMessage).toBe('Please enter a valid element and priority.');

    // Queue should remain empty
    const nodeCount = await pq.getNodeCount();
    expect(nodeCount).toBe(0);
  });

  test('Edge case: Removing from empty queue triggers alert and leaves queue empty', async () => {
    // Ensure queue is empty
    const initialCount = await pq.getNodeCount();
    expect(initialCount).toBe(0);

    // Capture dialog from removeElement
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click remove when queue is empty
    await pq.removeElement();

    // The implementation shows alert("Queue is empty!") when dequeue on empty
    expect(dialogMessage).toBe('Queue is empty!');

    // Still empty
    const nodeCount = await pq.getNodeCount();
    expect(nodeCount).toBe(0);
  });

  test('DOM rendering sanity: nodes have expected CSS class and structure after multiple operations', async () => {
    // Add several elements
    await pq.addElement('1', 9);
    await pq.addElement('2', 4);
    await pq.addElement('3', 7);

    // Verify that each node has class "node" and contains expected text fragments
    const nodes = await page.$$(`${pq.queueSelector} .node`);
    expect(nodes.length).toBe(3);

    for (let i = 0; i < nodes.length; i++) {
      const className = await nodes[i].getAttribute('class');
      expect(className).toBe('node');

      const innerText = await nodes[i].innerText();
      expect(innerText).toMatch(/Element: \d+/);
      expect(innerText).toMatch(/Priority: \d+/);
    }

    // Remove all items one by one and ensure DOM updates each time
    await pq.removeElement(); // removes highest priority (2 with priority 4)
    let countAfterOneRemove = await pq.getNodeCount();
    expect(countAfterOneRemove).toBe(2);

    await pq.removeElement();
    let countAfterTwoRemoves = await pq.getNodeCount();
    expect(countAfterTwoRemoves).toBe(1);

    await pq.removeElement();
    let countAfterThreeRemoves = await pq.getNodeCount();
    expect(countAfterThreeRemoves).toBe(0);
  });
});