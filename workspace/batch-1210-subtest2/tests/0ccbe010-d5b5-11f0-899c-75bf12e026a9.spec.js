import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/0ccbe010-d5b5-11f0-899c-75bf12e026a9.html';

// Page Object for the Priority Queue demo page
class PriorityQueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.selectors = {
      itemInput: '#itemInput',
      priorityInput: '#priorityInput',
      enqueueBtn: '#enqueueBtn',
      dequeueBtn: '#dequeueBtn',
      peekBtn: '#peekBtn',
      queueVisual: '#queueVisual',
      message: '#message',
      dequeuedItem: '#dequeuedItem',
      itemNodes: '.item',
    };
  }

  async navigate() {
    await this.page.goto(BASE_URL, { waitUntil: 'load' });
  }

  async enqueue(item, priority) {
    const p = this.page;
    await p.fill(this.selectors.itemInput, item);
    await p.fill(this.selectors.priorityInput, String(priority));
    await p.click(this.selectors.enqueueBtn);
  }

  async clickDequeue() {
    await this.page.click(this.selectors.dequeueBtn);
  }

  async clickPeek() {
    await this.page.click(this.selectors.peekBtn);
  }

  async getMessageText() {
    return (await this.page.locator(this.selectors.message).innerText()).trim();
  }

  async getDequeuedItemText() {
    return (await this.page.locator(this.selectors.dequeuedItem).innerText()).trim();
  }

  async getQueueVisualText() {
    return (await this.page.locator(this.selectors.queueVisual).innerText()).trim();
  }

  // returns array of { name, prioText } in the visual order
  async getQueueItems() {
    return await this.page.$$eval(this.selectors.itemNodes, nodes =>
      nodes.map(n => {
        const nameNode = n.childNodes && n.childNodes[0] ? n.childNodes[0].nodeValue : '';
        const name = nameNode ? nameNode.trim() : n.textContent.trim();
        const prioEl = n.querySelector('.prio');
        const prioText = prioEl ? prioEl.textContent.trim() : '';
        return { name, prioText };
      })
    );
  }

  async isItemInputFocused() {
    return await this.page.evaluate(() => document.activeElement && document.activeElement.id === 'itemInput');
  }

  async clearInputs() {
    await this.page.fill(this.selectors.itemInput, '');
    await this.page.fill(this.selectors.priorityInput, '');
  }
}

test.describe('Priority Queue Demo - FSM states and transitions', () => {
  // Collect console errors and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Attach listeners so we can assert there are no unexpected runtime errors
    page.context()._pq_consoleErrors = [];
    page.context()._pq_pageErrors = [];

    page.on('console', msg => {
      // store console messages for inspection
      const entry = { type: msg.type(), text: msg.text() };
      page.context()._pq_consoleErrors.push(entry);
    });

    page.on('pageerror', err => {
      // store uncaught page errors
      page.context()._pq_pageErrors.push(err);
    });

    // Navigate to the demo page
    const pqPage = new PriorityQueuePage(page);
    await pqPage.navigate();
  });

  test.afterEach(async ({ page }) => {
    // Assert there are no uncaught page errors
    const pageErrors = page.context()._pq_pageErrors || [];
    const consoleMessages = page.context()._pq_consoleErrors || [];

    // Fail if any uncaught exceptions were emitted from the page
    expect(pageErrors.length, `Expected no uncaught page errors, got: ${pageErrors.map(e => String(e)).join(' | ')}`).toBe(0);

    // Fail if any console-level 'error' messages were emitted
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Expected no console.error messages, got: ${errorConsoleMsgs.map(m => m.text).join(' | ')}`).toBe(0);
  });

  test('Initial Idle state: visualization renders as empty', async ({ page }) => {
    // This test validates the S0_Idle state: initial visualization is present.
    const pq = new PriorityQueuePage(page);

    // Initial visual should indicate empty queue as per implementation
    const visualText = await pq.getQueueVisualText();
    expect(visualText).toContain('(empty)');

    // Message and dequeuedItem should be empty initially
    const message = await pq.getMessageText();
    const dequeued = await pq.getDequeuedItemText();
    expect(message).toBe(''); // no initial message
    expect(dequeued).toBe('');
  });

  test('Enqueue valid item -> Item Enqueued state (message, visual update, inputs cleared & focus)', async ({ page }) => {
    // Validates transition S0_Idle -> S1_ItemEnqueued via EnqueueClick
    const pq = new PriorityQueuePage(page);

    // Enqueue an item and check message and visual
    await pq.clearInputs();
    await pq.enqueue('taskA', 5);

    // Verify message content matches FSM evidence
    const msg = await pq.getMessageText();
    expect(msg).toBe('Enqueued "taskA" with priority 5.');

    // Visual should contain the enqueued item with priority span
    const items = await pq.getQueueItems();
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('taskA');
    expect(items[0].prioText).toContain('p:5');

    // Inputs should be cleared and itemInput should be focused per implementation
    const itemInputValue = await page.locator('#itemInput').inputValue();
    const priorityInputValue = await page.locator('#priorityInput').inputValue();
    expect(itemInputValue).toBe('');
    expect(priorityInputValue).toBe('');
    expect(await pq.isItemInputFocused()).toBe(true);
  });

  test('Dequeue on empty queue -> Empty Queue state', async ({ page }) => {
    // Validates S0_Idle -> S3_EmptyQueue via DequeueClick
    const pq = new PriorityQueuePage(page);

    // Ensure queue is empty at start
    const initialVisual = await pq.getQueueVisualText();
    expect(initialVisual).toContain('(empty)');

    // Click dequeue on empty queue
    await pq.clickDequeue();

    // Verify message and dequeuedItem content as evidence of empty behavior
    const msg = await pq.getMessageText();
    const dequeued = await pq.getDequeuedItemText();
    expect(msg).toBe('Queue is empty, nothing to dequeue.');
    expect(dequeued).toBe(''); // nothing dequeued
  });

  test('Peek on empty queue -> Peeked Item state (empty message)', async ({ page }) => {
    // Validates S0_Idle -> S4_PeekedItem via PeekClick when queue empty
    const pq = new PriorityQueuePage(page);

    // Ensure empty
    const visual = await pq.getQueueVisualText();
    expect(visual).toContain('(empty)');

    // Click peek
    await pq.clickPeek();

    // Expect message indicating empty queue
    const message = await pq.getMessageText();
    expect(message).toBe('Queue is empty.');
  });

  test('Enqueue multiple items, verify priority ordering and stability, Peek and Dequeue transitions', async ({ page }) => {
    // This test covers:
    // - S0_Idle -> S1_ItemEnqueued (multiple times)
    // - S1_ItemEnqueued -> S4_PeekedItem (PeekClick)
    // - S1_ItemEnqueued -> S2_ItemDequeued (DequeueClick)
    const pq = new PriorityQueuePage(page);

    // Enqueue three items with priorities where two share priority to test stability
    await pq.clearInputs();
    await pq.enqueue('A', 2); // count 0
    await pq.enqueue('B', 1); // count 1
    await pq.enqueue('C', 1); // count 2 (B should come before C because same priority and earlier enqueue)

    // Visual order should be highest priority first -> lower numeric value is higher priority (1 then 1 then 2)
    const itemsAfterEnqueue = await pq.getQueueItems();
    expect(itemsAfterEnqueue.map(i => i.name)).toEqual(['B', 'C', 'A']);
    expect(itemsAfterEnqueue[0].prioText).toContain('p:1');

    // Peek should show the next to dequeue without removing it
    await pq.clickPeek();
    const peekMsg = await pq.getMessageText();
    expect(peekMsg).toBe('Next to dequeue (peek): "B"');

    // Dequeue should remove the highest priority (B)
    await pq.clickDequeue();
    const dequeuedText = await pq.getDequeuedItemText();
    expect(dequeuedText).toBe('Dequeued item: "B"');

    // Visual should now show remaining items C then A
    const itemsAfterDequeue = await pq.getQueueItems();
    expect(itemsAfterDequeue.map(i => i.name)).toEqual(['C', 'A']);

    // Peek now should show C as next
    await pq.clickPeek();
    const peekMsg2 = await pq.getMessageText();
    expect(peekMsg2).toBe('Next to dequeue (peek): "C"');
  });

  test('Dequeue after enqueue transitions to Item Dequeued and updates visual', async ({ page }) => {
    // Validates S1_ItemEnqueued -> S2_ItemDequeued via DequeueClick
    const pq = new PriorityQueuePage(page);

    // Enqueue a single item then dequeue it
    await pq.clearInputs();
    await pq.enqueue('only', 10);

    // Ensure it's present
    let items = await pq.getQueueItems();
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('only');

    // Dequeue the item
    await pq.clickDequeue();

    // Expect dequeuedItem content
    const dequeued = await pq.getDequeuedItemText();
    expect(dequeued).toBe('Dequeued item: "only"');

    // Visual should indicate empty again
    const visual = await pq.getQueueVisualText();
    expect(visual).toContain('(empty)');
  });

  test('Edge cases: enqueue with empty item and invalid priority produce appropriate error messages', async ({ page }) => {
    // This test covers error scenarios and input validation messages
    const pq = new PriorityQueuePage(page);

    // Attempt to enqueue with empty item (should prompt to enter value)
    await pq.clearInputs();
    await page.fill('#itemInput', '   '); // only whitespace
    await page.fill('#priorityInput', '1');
    await page.click('#enqueueBtn');
    const msgEmptyItem = await pq.getMessageText();
    expect(msgEmptyItem).toBe('Please enter an item value.');

    // Attempt to enqueue with non-numeric priority
    await pq.clearInputs();
    await page.fill('#itemInput', 'X');
    await page.fill('#priorityInput', 'abc'); // invalid priority
    await page.click('#enqueueBtn');
    const msgBadPrio = await pq.getMessageText();
    expect(msgBadPrio).toBe('Please enter a valid numeric priority.');

    // Attempt to enqueue with blank priority
    await pq.clearInputs();
    await page.fill('#itemInput', 'Y');
    await page.fill('#priorityInput', '');
    await page.click('#enqueueBtn');
    const msgBlankPrio = await pq.getMessageText();
    expect(msgBlankPrio).toBe('Please enter a valid numeric priority.');
  });
});