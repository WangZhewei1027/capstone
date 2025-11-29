import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-50-37/html/d5468980-ca8b-11f0-bf19-77e409d50591.html';

// Page Object for the Queue Visualizer
class QueuePage {
  constructor(page) {
    this.page = page;
  }

  // Elements
  implSelect() { return this.page.locator('#implSelect'); }
  capacityBox() { return this.page.locator('#capacityBox'); }
  capacityInput() { return this.page.locator('#capacityInput'); }
  valueInput() { return this.page.locator('#valueInput'); }
  enqueueBtn() { return this.page.locator('#enqueueBtn'); }
  dequeueBtn() { return this.page.locator('#dequeueBtn'); }
  peekBtn() { return this.page.locator('#peekBtn'); }
  clearBtn() { return this.page.locator('#clearBtn'); }
  randBtn() { return this.page.locator('#randBtn'); }
  autoBtn() { return this.page.locator('#autoBtn'); }
  slotsContainer() { return this.page.locator('#slotsContainer'); }
  sizeBadge() { return this.page.locator('#sizeBadge'); }
  capBadge() { return this.page.locator('#capBadge'); }
  headIndex() { return this.page.locator('#headIndex'); }
  tailIndex() { return this.page.locator('#tailIndex'); }
  logArea() { return this.page.locator('#logArea'); }
  typeLabel() { return this.page.locator('#typeLabel'); }
  clearLogBtn() { return this.page.locator('#clearLog'); }
  demoFillBtn() { return this.page.locator('#demoFill'); }
  demoEmptyBtn() { return this.page.locator('#demoEmpty'); }

  // Helpers
  async navigate() {
    await this.page.goto(APP_URL);
  }

  async enqueueValue(value) {
    await this.valueInput().fill(value);
    await this.enqueueBtn().click();
  }

  async pressEnterToEnqueue(value) {
    await this.valueInput().fill(value);
    await this.valueInput().press('Enter');
  }

  async waitForLogContains(text, timeout = 5000) {
    await this.page.waitForFunction(
      (sel, expected) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        return el.textContent.includes(expected);
      },
      '#logArea',
      text,
      { timeout }
    );
  }

  async getLogText() {
    return this.logArea().innerText();
  }

  async slotsCount() {
    return this.slotsContainer().locator('.slot').count();
  }

  async getSlotTextAt(index) {
    const slot = this.slotsContainer().locator('.slot').nth(index);
    return slot.innerText();
  }
}

// Tests
test.describe('Queue Visualizer (d5468980-ca8b-11f0-bf19-77e409d50591) - Queue FSM behaviors', () => {
  let pageErrors = [];
  let consoleMessages = [];

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions and inspection
    pageErrors = [];
    consoleMessages = [];

    page.on('console', (msg) => {
      // store console messages for later assertions
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // capture uncaught exceptions on the page
      pageErrors.push(err);
    });

    const qp = new QueuePage(page);
    await qp.navigate();
    // wait for initial ready log to appear to ensure the app has started
    await qp.waitForLogContains('Visualizer ready. Try enqueuing items.');
  });

  test.afterEach(async () => {
    // After each test we assert there are no uncaught JS errors (ReferenceError, SyntaxError, TypeError).
    // If there are pageErrors, we will fail the test and include the error messages in the assertion message.
    if (pageErrors.length > 0) {
      const msgs = pageErrors.map(e => `${e.name}: ${e.message}`).join('\n');
      throw new Error(`Uncaught page errors detected:\n${msgs}`);
    }
  });

  test('initial render -> dynamic_empty state validated', async ({ page }) => {
    // This test validates the initial dynamic empty state rendering and onEnter render behavior.
    const qp = new QueuePage(page);

    // typeLabel should indicate Dynamic Array Queue
    await expect(qp.typeLabel()).toHaveText('Dynamic Array Queue');

    // badges should reflect empty dynamic queue
    await expect(qp.sizeBadge()).toHaveText('0');
    await expect(qp.capBadge()).toHaveText('auto');

    // slots container should show a single empty indicator
    const slots = qp.slotsContainer().locator('.slot');
    await expect(slots).toHaveCount(1);
    await expect(slots.first()).toHaveClass(/empty/);
    await expect(qp.headIndex()).toHaveText('-');
    await expect(qp.tailIndex()).toHaveText('-');

    // Log area contains initial ready message
    await expect(qp.logArea()).toContainText('Visualizer ready. Try enqueuing items.');

    // No uncaught console errors were emitted while loading
    // (pageErrors are checked in afterEach)
  });

  test('enqueue empty value -> error; enqueue non-empty -> dynamic_active; peek and dequeue -> back to empty', async ({ page }) => {
    // This test exercises ENQUEUE_CLICKED, ENQUEUE_FAIL, ENQUEUE_SUCCESS, PEEK_CLICKED, PEEK_SUCCESS, DEQUEUE_CLICKED,
    // DEQUEUE_SUCCESS_TO_EMPTY transitions and validates render/visual feedback and logs.
    const qp = new QueuePage(page);

    // Try enqueue with empty input -> should log an error and not change size
    await qp.valueInput().fill(''); // ensure empty
    await qp.enqueueBtn().click();
    await qp.waitForLogContains('Cannot enqueue empty value');
    await expect(qp.sizeBadge()).toHaveText('0'); // still empty

    // Enqueue valid value 'A'
    await qp.enqueueValue('A');
    await qp.waitForLogContains('Enqueued: A');
    await expect(qp.sizeBadge()).toHaveText('1');

    // Visuals: dynamic queue should show one slot with value 'A' and index 0
    await expect(qp.slotsContainer().locator('.slot')).toHaveCount(1);
    const slotText = await qp.getSlotTextAt(0);
    expect(slotText).toContain('A');
    expect(slotText).toContain('0');

    // Peek should log the value without removing it
    await qp.peekBtn().click();
    await qp.waitForLogContains('Peek: A');
    await expect(qp.sizeBadge()).toHaveText('1');

    // Dequeue should remove the element and return to empty
    await qp.dequeueBtn().click();
    await qp.waitForLogContains('Dequeued: A');
    await expect(qp.sizeBadge()).toHaveText('0');
    // Now slots should again indicate empty
    await expect(qp.slotsContainer().locator('.slot')).toHaveCount(1);
    await expect(qp.slotsContainer().locator('.slot').first()).toHaveClass(/empty/);
  });

  test('random button generates and enqueues; clear and clear log behaviors', async ({ page }) => {
    // This test covers the RAND trigger (ENQUEUE_SUCCESS via randBtn) and CLEAR_CLICKED / CLEAR_LOG_CLICKED
    const qp = new QueuePage(page);

    // Ensure queue is empty first
    await expect(qp.sizeBadge()).toHaveText('0');

    // Click Random to generate and enqueue an item
    await qp.randBtn().click();
    await qp.waitForLogContains('Generated random:');
    // Since randBtn calls enqueueAction, we should also see "Enqueued: <val>" or error if failed
    await qp.waitForLogContains('Enqueued:', 3000);

    // Size should be 1
    await expect(qp.sizeBadge()).toHaveText('1');

    // Clear the queue using Clear button
    await qp.clearBtn().click();
    await qp.waitForLogContains('Queue cleared');
    await expect(qp.sizeBadge()).toHaveText('0');

    // Clear the log and ensure logArea emptied
    await qp.clearLogBtn().click();
    // Wait a moment for innerHTML to be cleared
    await page.waitForTimeout(100);
    const logText = await qp.getLogText();
    expect(logText.trim()).toBe('');
  });

  test('switch to circular implementation and capacity changes; fill and drain demo', async ({ page }) => {
    // This test covers IMPL_CHANGED_CIRCULAR, CAPACITY_CHANGED, DEMO_FILL_CLICKED, DEMO_DRAIN_CLICKED and associated renders.
    const qp = new QueuePage(page);

    // Switch to circular implementation using select
    await qp.implSelect().selectOption('circular');

    // capacityBox should be visible and typeLabel updated
    await expect(qp.capacityBox()).toBeVisible();
    await expect(qp.typeLabel()).toHaveText('Circular Queue');

    // Ensure capBadge reflects initial capacity (default input value is 8)
    await expect(qp.capBadge()).toHaveText(/^\d+$/);

    // Change capacity to 4 via capacity input (CAPACITY_CHANGED)
    await qp.capacityInput().fill('4');
    await qp.capacityInput().press('Enter'); // trigger change event
    // The app listens for 'change' event; pressing Enter might not trigger change; use evaluate to dispatch change
    await page.evaluate(() => {
      const cap = document.getElementById('capacityInput');
      cap.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await qp.waitForLogContains('Circular queue capacity set to 4');

    await expect(qp.capBadge()).toHaveText('4');

    // Fill the circular queue via demoFill (should fill to full capacity)
    await qp.demoFillBtn().click();
    await qp.waitForLogContains('Demo: filled circular queue');
    // Slots count should equal capacity
    const count = await qp.slotsCount();
    expect(count).toBe(4);

    // Trying to enqueue now should fail and log an enqueue failure
    await qp.valueInput().fill('X');
    await qp.enqueueBtn().click();
    // enqueueAction logs 'Enqueue failed: queue is full' when circular full
    await qp.waitForLogContains('Enqueue failed: queue is full');

    // Drain demo: demoEmpty should dequeue all elements
    await qp.demoEmptyBtn().click();
    await qp.waitForLogContains('Demo: drained queue');
    // After drain, slots still show capacity slots but all should be empty markers (—)
    const firstSlotText = await qp.getSlotTextAt(0);
    expect(firstSlotText).toContain('—'); // empty slot symbol for circular
    // head/tail indices should be '-'
    await expect(qp.headIndex()).toHaveText('-');
    await expect(qp.tailIndex()).toHaveText('-');
  });

  test('auto enqueuing starts and stops on full for circular implementation', async ({ page }) => {
    // This test covers AUTO_TOGGLED_START, AUTO_INTERVAL_ENQUEUE_SUCCESS/FAIL and the auto lifecycle actions.
    const qp = new QueuePage(page);

    // Switch to circular and set a small capacity (3) to make auto fill quickly
    await qp.implSelect().selectOption('circular');
    await qp.capacityInput().fill('3');
    await page.evaluate(() => {
      const cap = document.getElementById('capacityInput');
      cap.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await qp.waitForLogContains('Circular queue capacity set to 3');

    // Start Auto enqueuing
    await qp.autoBtn().click();
    await qp.waitForLogContains('Auto enqueuing started', 2000);

    // Auto enqueues at ~700ms intervals. Wait until auto stops due to full queue.
    // The code logs 'Auto stopped: queue is full' on failure and reverts the button text and state.
    await qp.waitForLogContains('Auto stopped: queue is full', 10000);

    // Verify auto button text has been reset to 'Auto' after stopping
    await expect(qp.autoBtn()).toHaveText('Auto');

    // After auto stopped the queue should be full (size equals capacity)
    await expect(qp.sizeBadge()).toHaveText('3');

    // Clean up: ensure no extra intervals left running by clicking Auto if it were still running
    const btnText = await qp.autoBtn().innerText();
    if (btnText.trim() === 'Stop') {
      await qp.autoBtn().click();
    }
  });

  test('keyboard enter enqueues and visual highlight animations applied briefly', async ({ page }) => {
    // This test validates keyboard support (Enter) for ENQUEUE_CLICKED and checks visual highlight/pulse classes briefly applied.
    const qp = new QueuePage(page);

    // Ensure dynamic implementation
    await qp.implSelect().selectOption('dynamic');
    await expect(qp.typeLabel()).toHaveText('Dynamic Array Queue');

    // Use Enter to enqueue 'K'
    await qp.pressEnterToEnqueue('K');

    // Expect log and size updated
    await qp.waitForLogContains('Enqueued: K');
    await expect(qp.sizeBadge()).toHaveText('1');

    // Immediately after enqueue, the last slot should briefly have class 'highlight'
    const lastSlot = qp.slotsContainer().locator('.slot').nth(-1);
    // The highlight class is added synchronously and removed after 700ms, so check it becomes present quickly.
    await expect(lastSlot).toHaveClass(/highlight/);

    // After 900ms the highlight should be removed
    await page.waitForTimeout(900);
    await expect(lastSlot).not.toHaveClass(/highlight/);
  });

  test('dequeue on empty and peek on empty produce error logs and flash behavior', async ({ page }) => {
    // This test presses Dequeue and Peek when queue empty to exercise DEQUEUE_FAIL and PEEK_FAIL transitions and logs.
    const qp = new QueuePage(page);

    // Ensure empty dynamic queue
    await qp.clearBtn().click();
    await qp.waitForLogContains('Queue cleared');

    // Dequeue when empty should log failure
    await qp.dequeueBtn().click();
    await qp.waitForLogContains('Dequeue failed: queue is empty');
    // Peek when empty should log failure
    await qp.peekBtn().click();
    await qp.waitForLogContains('Peek: queue is empty');

    // UI buttons should have had a flash (pulse) class added and removed - we can only check that adding didn't throw and DOM exists
    // Check that the buttons exist and are enabled
    await expect(qp.dequeueBtn()).toBeEnabled();
    await expect(qp.peekBtn()).toBeEnabled();
  });

  test('implementation switching resets queue state (impl_reset_to_empty)', async ({ page }) => {
    // This test ensures switching implementations resets the internal queue rendering to an empty state (impl_reset_to_empty).
    const qp = new QueuePage(page);

    // Enqueue an item in dynamic
    await qp.implSelect().selectOption('dynamic');
    await qp.enqueueValue('Z');
    await qp.waitForLogContains('Enqueued: Z');
    await expect(qp.sizeBadge()).toHaveText('1');

    // Switch to circular -> should create a new empty circular queue and render empty
    await qp.implSelect().selectOption('circular');
    await qp.waitForLogContains('Switched implementation to circular');
    // After switching implementation, size should be 0 for the new queue
    await expect(qp.sizeBadge()).toHaveText('0');
    // Switch back to dynamic -> again size should be 0
    await qp.implSelect().selectOption('dynamic');
    await qp.waitForLogContains('Switched implementation to dynamic');
    await expect(qp.sizeBadge()).toHaveText('0');
  });
});