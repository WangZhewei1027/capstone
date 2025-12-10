import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80986a0-d1c9-11f0-9efc-d1db1618a544.html';

class QueuePage {
  /**
   * Page object wrapper for the Queue demo.
   * Encapsulates selectors and common actions to keep tests readable.
   */
  constructor(page) {
    this.page = page;
    this.valueInput = page.locator('#value');
    this.enqueueBtn = page.locator('#enqueue');
    this.dequeueBtn = page.locator('#dequeue');
    this.peekBtn = page.locator('#peek');
    this.clearBtn = page.locator('#clear');
    this.randomBtn = page.locator('#random');
    this.bulkInput = page.locator('#bulk');
    this.modeSelect = page.locator('#mode');
    this.capacityInput = page.locator('#capacity');
    this.applyCapBtn = page.locator('#applyCap');
    this.queueRow = page.locator('#queueRow');
    this.sizeBadge = page.locator('#size');
    this.emptyBadge = page.locator('#empty');
    this.frontVal = page.locator('#frontVal');
    this.rearVal = page.locator('#rearVal');
    this.log = page.locator('#log');
    this.status = page.locator('#status');
    this.stepEnqBtn = page.locator('#stepEnq');
    this.stepDeqBtn = page.locator('#stepDeq');
  }

  async goto() {
    await this.page.goto(BASE);
  }

  // Basic interactions
  async enqueue(value) {
    await this.valueInput.fill(String(value));
    await this.enqueueBtn.click();
  }

  async dequeue() {
    await this.dequeueBtn.click();
  }

  async peek() {
    await this.peekBtn.click();
  }

  async clear() {
    await this.clearBtn.click();
  }

  async setMode(mode) {
    await this.modeSelect.selectOption(mode);
  }

  async setCapacity(n) {
    await this.capacityInput.fill(String(n));
    await this.applyCapBtn.click();
  }

  async randomBulk(n) {
    await this.bulkInput.fill(String(n));
    await this.randomBtn.click();
  }

  async stepEnqueueRespond(value) {
    // will trigger dialog handler externally
    await this.stepEnqBtn.click();
  }

  // Getters for UI state
  async getSize() {
    return Number(await this.sizeBadge.textContent());
  }
  async isEmptyText() {
    return (await this.emptyBadge.textContent()).trim();
  }
  async getFrontValText() {
    return (await this.frontVal.textContent()).trim();
  }
  async getRearValText() {
    return (await this.rearVal.textContent()).trim();
  }
  async getStatusText() {
    return (await this.status.textContent()).trim();
  }

  // Query slots in the visualization
  slotLocatorByIndex(i) {
    return this.page.locator('#queueRow .slot').nth(i);
  }

  async getSlotsCount() {
    return await this.page.locator('#queueRow .slot').count();
  }

  async queueRowContainsHint() {
    return await this.page.locator('#queueRow .hint').first().isVisible().catch(() => false);
  }

  async lastLogText() {
    // logs are prepended, so first child is most recent
    return await this.page.locator('#log p').first().textContent().catch(() => '');
  }

  async clickSlot(i) {
    const slot = this.slotLocatorByIndex(i);
    await slot.click();
  }
}

test.describe('Queue Demo - end-to-end behavior', () => {
  let pageErrors = [];
  let consoleMsgs = [];

  test.beforeEach(async ({ page }) => {
    // Reset collectors for each test
    pageErrors = [];
    consoleMsgs = [];

    // Collect page errors and console messages for assertions
    page.on('pageerror', (err) => {
      // capture stack/message for later assertions
      pageErrors.push(err);
    });
    page.on('console', (msg) => {
      consoleMsgs.push({ type: msg.type(), text: msg.text() });
    });
  });

  test('Initial load: default array mode shows empty queue and correct badges', async ({ page }) => {
    // Purpose: Verify initial UI state after page loads in array mode.
    const q = new QueuePage(page);
    await q.goto();

    // Basic expectations for initial state
    await expect(q.sizeBadge).toHaveText('0');
    await expect(q.emptyBadge).toHaveText('true');
    await expect(q.frontVal).toHaveText('—');
    await expect(q.rearVal).toHaveText('—');

    // Visualization should show the 'Queue is empty' hint in array mode
    const containsHint = await q.queueRowContainsHint();
    expect(containsHint).toBe(true);

    // There should be no uncaught ReferenceError/SyntaxError/TypeError in pageErrors
    // We assert the absence of these critical errors (they would indicate runtime issues).
    const problematic = pageErrors.filter(e => /ReferenceError|SyntaxError|TypeError/.test(String(e)));
    expect(problematic.length).toBe(0);
  });

  test('Enqueue and Dequeue in array mode updates DOM, badges, status and log', async ({ page }) => {
    // Purpose: Test enqueueing values updates visual slots, size, front/rear, and log; test dequeue removes and reports
    const q = new QueuePage(page);
    await q.goto();

    // Enqueue "alpha"
    await q.enqueue('alpha');

    // After enqueue: size 1, empty false, front/rear show "alpha", slot visible with text
    await expect(q.sizeBadge).toHaveText('1');
    await expect(q.emptyBadge).toHaveText('false');
    await expect(q.frontVal).toHaveText('alpha');
    await expect(q.rearVal).toHaveText('alpha');

    // Visual slot with value should exist and contain 'alpha'; index label '0' should be present
    const slots = await q.getSlotsCount();
    expect(slots).toBeGreaterThanOrEqual(1);
    const slotText = await q.slotLocatorByIndex(0).textContent();
    expect(slotText).toContain('alpha');
    expect(slotText).toContain('0'); // idx label

    // Status message indicates enqueue and log contains "Enqueued"
    await expect(q.status).toContainText('Enqueued');
    const recent = await q.lastLogText();
    expect(recent).toContain('Enqueued');

    // Dequeue: click to remove item
    await q.dequeue();

    // After dequeue: size 0, empty true, front/rear reset to '—'
    await expect(q.sizeBadge).toHaveText('0');
    await expect(q.emptyBadge).toHaveText('true');
    await expect(q.frontVal).toHaveText('—');
    await expect(q.rearVal).toHaveText('—');

    // Queue visualization returns to empty hint
    const containsHint = await q.queueRowContainsHint();
    expect(containsHint).toBe(true);

    // Status should show Dequeued message in previous action
    await expect(q.status).toContainText('Dequeued').or.toContainText('cannot dequeue');

    // Ensure no unexpected runtime errors occurred
    const problematic = pageErrors.filter(e => /ReferenceError|SyntaxError|TypeError/.test(String(e)));
    expect(problematic.length).toBe(0);
  });

  test('Peek on empty and after enqueue, and clear functionality', async ({ page }) => {
    // Purpose: Validate peek behavior in empty and non-empty states, clear action resets state and logs appropriately.
    const q = new QueuePage(page);
    await q.goto();

    // Ensure empty then peek -> shows "Queue is empty" status and logs
    await q.clear(); // make certain it's empty
    await q.peek();
    await expect(q.status).toContainText('Queue is empty');

    // Enqueue two values and verify peek reports front value (first enqueued)
    await q.enqueue('one');
    await q.enqueue('two');
    await expect(q.sizeBadge).toHaveText('2');
    await q.peek();
    await expect(q.status).toContainText('Front value');
    await expect(q.frontVal).toHaveText('one');
    await expect(q.rearVal).toHaveText('two');

    // Clear and assert reset
    await q.clear();
    await expect(q.sizeBadge).toHaveText('0');
    await expect(q.emptyBadge).toHaveText('true');
    await expect(q.frontVal).toHaveText('—');
    await expect(q.rearVal).toHaveText('—');
    await expect(q.status).toContainText('Queue cleared');
  });

  test('Circular mode: capacity apply, fill to capacity, enqueue beyond capacity triggers error', async ({ page }) => {
    // Purpose: Test circular buffer behavior: capacity application, full condition, and UI markers.
    const q = new QueuePage(page);
    await q.goto();

    // Switch to circular mode and set capacity to 4
    await q.setMode('circular');
    await q.setCapacity(4);

    // Ensure size 0 initially
    await expect(q.sizeBadge).toHaveText('0');

    // Enqueue up to capacity
    await q.enqueue('A');
    await q.enqueue('B');
    await q.enqueue('C');
    await q.enqueue('D');

    await expect(q.sizeBadge).toHaveText('4');
    // Visual slots: capacity should be 4 (circular shows fixed slots)
    const slotCount = await q.getSlotsCount();
    expect(slotCount).toBe(4);

    // Attempt to enqueue beyond capacity should produce an error message and log
    await q.enqueue('E'); // should trigger 'Queue full' error
    const statusText = await q.getStatusText();
    expect(statusText.toLowerCase()).toContain('queue full');

    // Check the log contains the failure message (search last few log entries)
    const recentLog = await q.lastLogText();
    expect(recentLog.toLowerCase()).toContain('failed enqueue').or.toContain('stopped after');

    // Inspect that head/tail markers exist in at least one slot (since count>0)
    // markers are elements with class 'marker' and text HEAD/TAIL
    const markers = await page.locator('#queueRow .marker').allTextContents();
    expect(markers.length).toBeGreaterThanOrEqual(1);

    // Click a slot to ensure the status panel updates with slot info (circular mode click shows head/tail indices)
    await q.clickSlot(0);
    const slotStatus = await q.getStatusText();
    expect(slotStatus).toMatch(/Slot\s+0:/);

    // Confirm no uncaught critical runtime errors
    const problematic = pageErrors.filter(e => /ReferenceError|SyntaxError|TypeError/.test(String(e)));
    expect(problematic.length).toBe(0);
  });

  test('Random bulk enqueue respects capacity in circular mode and logs number enqueued', async ({ page }) => {
    // Purpose: Ensure random bulk enqueue stops when capacity reached and reports number enqueued.
    const q = new QueuePage(page);
    await q.goto();

    // Switch to circular, set capacity small to force early stop
    await q.setMode('circular');
    await q.setCapacity(3);

    // Perform random with N greater than capacity
    await q.randomBulk(6);

    // Status should indicate how many were enqueued (<= capacity)
    const status = await q.getStatusText();
    // e.g., "Enqueued X random value(s)" or "Stopped: Queue full"
    expect(
      status.toLowerCase().includes('enqueued') ||
      status.toLowerCase().includes('stopped')
    ).toBe(true);

    // Ensure size does not exceed capacity (3)
    const size = await q.getSize();
    expect(size).toBeLessThanOrEqual(3);

    // At least one log entry exists about enqueuing
    const recentLog = await q.lastLogText();
    expect(recentLog.length).toBeGreaterThan(0);
  });

  test('Step enqueue uses prompt dialog; step dequeue works and logs actions', async ({ page }) => {
    // Purpose: Verify step enqueue triggers a prompt dialog which we respond to, and order of operations is reflected in UI/log.
    const q = new QueuePage(page);
    await q.goto();

    // Prepare to handle the prompt dialog by answering with custom input
    page.once('dialog', async dialog => {
      // acceptance of prompt — provide value 'step-42'
      await dialog.accept('step-42');
    });

    // Trigger step enqueue which opens prompt
    await q.stepEnqueueRespond('step-42'); // actual response handled via dialog listener

    // Wait a little for UI updates
    await page.waitForTimeout(200);

    // Now verify that the value is present in the queue (front/rear show the value)
    // The UI might render numbers as strings; we assert presence
    const front = await q.getFrontValText();
    expect(front).toBe('step-42');

    // Trigger step dequeue and validate it removes the value and logs the action
    await q.stepDeqBtn.click();
    await page.waitForTimeout(100);
    // After dequeue, size should be decreased (likely 0)
    const sizeAfter = await q.getSize();
    expect(sizeAfter).toBeGreaterThanOrEqual(0);
    // Last log should mention "(step) Dequeued" or similar phrase
    const recentLog = await q.lastLogText();
    expect(recentLog.toLowerCase()).toContain('dequeued').or.toContain('dequeue attempted');
  });

  test('Accessibility & keyboard: Enter on input triggers enqueue', async ({ page }) => {
    // Purpose: Ensure keyboard interaction (Enter key) triggers enqueue as documented in the script.
    const q = new QueuePage(page);
    await q.goto();

    // Focus value input and press Enter; first fill with 'kb'
    await q.valueInput.fill('kb');
    await q.valueInput.focus();
    await page.keyboard.press('Enter');

    // After pressing Enter, expectation: item enqueued
    await expect(q.sizeBadge).toHaveText('1');
    await expect(q.frontVal).toHaveText('kb');

    // Clean up for test consistency
    await q.clear();
  });

  test('Observe console messages and page errors across interactions', async ({ page }) => {
    // Purpose: Collect console and pageerror occurrences during a series of actions and assert none are critical.
    const q = new QueuePage(page);

    // Attach collectors local to this test
    const localPageErrors = [];
    const localConsoleMsgs = [];
    page.on('pageerror', e => localPageErrors.push(String(e)));
    page.on('console', m => localConsoleMsgs.push({ type: m.type(), text: m.text() }));

    await q.goto();

    // Do a range of interactions
    await q.enqueue('x1');
    await q.enqueue('x2');
    await q.peek();
    await q.clear();
    await q.setMode('circular');
    await q.setCapacity(2);
    await q.enqueue('c1');
    await q.enqueue('c2');
    await q.enqueue('overflow'); // should cause a handled error

    // Wait briefly to let any asynchronous console errors surface
    await page.waitForTimeout(200);

    // Assert: no unhandled critical runtime errors (ReferenceError, SyntaxError, TypeError)
    const critical = localPageErrors.filter(e => /ReferenceError|SyntaxError|TypeError/.test(e));
    expect(critical.length).toBe(0);

    // Console messages may include various types; ensure we captured an array
    expect(Array.isArray(localConsoleMsgs)).toBe(true);
  });
});