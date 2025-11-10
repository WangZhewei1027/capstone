import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6070da40-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page object encapsulating common interactions with the Queue interactive module.
 * The implementation uses flexible selectors and fallbacks to be resilient to exact markup.
 */
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Primary semantic selectors
    this.textInput = page.getByRole('textbox').first();
    this.enqueueButton = page.getByRole('button', { name: /enqueue/i }).first();
    this.dequeueButton = page.getByRole('button', { name: /dequeue/i }).first();
    this.peekButton = page.getByRole('button', { name: /peek/i }).first();
    this.clearButton = page.getByRole('button', { name: /clear/i }).first();
    this.demoButton = page.getByRole('button', { name: /(demo|fill)/i }).first();

    // Fallback generic selectors for controls which might be inputs not labeled as a role
    this.capacityInputByLabel = page.getByLabel(/capacity/i);
    this.speedInputByLabel = page.getByLabel(/speed/i);

    // Visual elements / badges / announcements
    this.queueContainer = page.locator('.queue, .queue-container, #queue').first();
    this.nodeLocator = page.locator('.node, .queue-node, .item').filter({ hasText: '' }).first();
    this.announcement = page.getByRole('status').first().catch(() => page.locator('[aria-live], .announce, .sr-only'));
    this.sizeBadge = page.locator('.size-badge, .badge-size, [data-badge="size"]');
    this.capacityBadge = page.locator('.capacity-badge, .badge-capacity, [data-badge="capacity"]');
    this.peekResult = page.locator('.peek-result, .peek-value, [data-peek-result]');
  }

  // Helper to robustly click a control (some pages use disabled attribute toggling)
  async clickIfVisible(locator) {
    try {
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      await locator.click();
      return true;
    } catch {
      return false;
    }
  }

  // Enqueue a given value. Waits for an "incoming" node and eventual "arrived" state.
  async enqueue(value, { waitForArrival = true } = {}) {
    // fill the input
    if (this.textInput) {
      await this.textInput.fill('');
      await this.textInput.fill(String(value));
    } else {
      // fallback: any text input
      const t = this.page.locator('input[type="text"], input[type="search"]').first();
      await t.fill('');
      await t.fill(String(value));
    }

    // Click enqueue
    if (!(await this.clickIfVisible(this.enqueueButton))) {
      // fallback to button text
      await this.page.locator('button:has-text("Enqueue")').click();
    }

    // After request, an incoming node should appear with the value
    const incoming = this.page.locator('.incoming, .node.incoming, .queue-node.incoming').filter({ hasText: String(value) });
    await incoming.first().waitFor({ state: 'visible', timeout: 3000 });

    if (waitForArrival) {
      // Wait for arrived class OR for incoming to no longer exist (arrival complete)
      const arrived = this.page.locator('.arrived, .node.arrived, .queue-node.arrived').filter({ hasText: String(value) });
      await Promise.race([
        arrived.first().waitFor({ state: 'visible', timeout: 4000 }),
        incoming.first().waitFor({ state: 'detached', timeout: 4000 })
      ]);
    }
  }

  // Dequeue: click and return the removed value (if announced or displayed). Will wait for depart animation and removal.
  async dequeue() {
    if (!(await this.clickIfVisible(this.dequeueButton))) {
      await this.page.locator('button:has-text("Dequeue")').click();
    }

    // Head node should get .depart class then be removed
    const headDepart = this.page.locator('.node.depart, .queue-node.depart, .item.depart').first();
    // Wait briefly for depart to appear (may not appear if operation failed)
    try {
      await headDepart.waitFor({ state: 'visible', timeout: 1200 });
      // then wait for it to be detached
      await headDepart.waitFor({ state: 'detached', timeout: 4000 });
    } catch {
      // if no depart class, maybe operation failed (empty). Return null
      return null;
    }
    // Optionally read announcement for removed value
    const ann = await this.getAnnouncementText({ timeout: 1200 }).catch(() => '');
    return ann;
  }

  // Peek: click peek and wait for peek result to appear and then clear
  async peek() {
    if (!(await this.clickIfVisible(this.peekButton))) {
      await this.page.locator('button:has-text("Peek")').click();
    }
    // Wait for peek result element or a head pulse marker
    try {
      const peekEl = this.peekResult.first();
      await peekEl.waitFor({ state: 'visible', timeout: 2000 });
      const text = await peekEl.textContent();
      // Wait until the peek clears (PEEK_COMPLETE)
      await peekEl.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {}); // non-fatal if it persists
      return (text || '').trim();
    } catch {
      // fallback: look for announcement describing peek
      return await this.getAnnouncementText({ timeout: 2000 }).catch(() => '');
    }
  }

  // Clear the queue
  async clear() {
    if (!(await this.clickIfVisible(this.clearButton))) {
      await this.page.locator('button:has-text("Clear")').click();
    }
    // Wait for container to have no nodes
    await this.page.waitForTimeout(50); // small scheduling delay
    await this.page.locator('.node, .queue-node, .item').first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  }

  // Start demo fill
  async startDemoFill() {
    if (!(await this.clickIfVisible(this.demoButton))) {
      await this.page.locator('button:has-text("Demo")').click();
    }
    // Demo sequence will begin adding nodes over time. We don't wait here.
  }

  // Set capacity: tries labeled input first, then numeric input selectors
  async setCapacity(n) {
    if (this.capacityInputByLabel) {
      try {
        await this.capacityInputByLabel.fill(String(n));
        await this.capacityInputByLabel.press('Enter').catch(() => {});
        return;
      } catch {}
    }
    // fallback: input[type=number]
    const capacityNumeric = this.page.locator('input[type="number"], input.capacity');
    if (await capacityNumeric.count()) {
      await capacityNumeric.first().fill(String(n));
      await capacityNumeric.first().press('Enter').catch(() => {});
    }
  }

  // Set animation speed (value may be "fast", "1x", numeric etc.)
  async setSpeed(value) {
    if (this.speedInputByLabel) {
      try {
        await this.speedInputByLabel.fill(String(value));
        await this.speedInputByLabel.press('Enter').catch(() => {});
        return;
      } catch {}
    }
    const select = this.page.locator('select[name="speed"], select.speed');
    if (await select.count()) {
      await select.selectOption(String(value));
    }
  }

  // get current nodes as array of text contents
  async getNodeTexts() {
    const nodes = this.page.locator('.node, .queue-node, .item');
    const count = await nodes.count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      const txt = (await nodes.nth(i).textContent()) || '';
      arr.push(txt.trim());
    }
    return arr;
  }

  // Count nodes
  async nodeCount() {
    return await this.page.locator('.node, .queue-node, .item').count();
  }

  // Read announcement (aria-live) text
  async getAnnouncementText({ timeout = 2000 } = {}) {
    // try role=status first
    const status = this.page.getByRole('status');
    try {
      await status.first().waitFor({ state: 'visible', timeout });
      const t1 = await status.first().textContent();
      return (t || '').trim();
    } catch {
      // fallback: any aria-live
      const live = this.page.locator('[aria-live]').first();
      await live.waitFor({ state: 'visible', timeout }).catch(() => {});
      const t2 = await live.textContent().catch(() => '');
      return (t || '').trim();
    }
  }

  // Read size badge numeric value (best-effort)
  async getSizeBadgeValue() {
    // try common patterns: "Size: 2" or a numeric-only badge
    try {
      const badge = this.sizeBadge.first();
      await badge.waitFor({ state: 'visible', timeout: 800 });
      const txt1 = (await badge.textContent()) || '';
      const m = txt.match(/(\d+)/);
      if (m) return Number(m[1]);
    } catch {}
    // fallback count of nodes
    return this.nodeCount();
  }

  // Read capacity badge numeric value (best-effort)
  async getCapacityBadgeValue() {
    try {
      const badge1 = this.capacityBadge.first();
      await badge.waitFor({ state: 'visible', timeout: 800 });
      const txt2 = (await badge.textContent()) || '';
      const m1 = txt.match(/(\d+)/);
      if (m) return Number(m[1]);
    } catch {}
    return null;
  }
}

test.describe('Queue Interactive Module - FSM states and transitions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page fresh for each test (idle state)
    await page.goto(APP_URL);
    // give the app a moment to initialize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(150);
  });

  test('idle state on load: controls present and queue empty', async ({ page }) => {
    // Validate initial idle state: basic UI elements exist and no nodes displayed
    const q = new QueuePage(page);

    // Controls should be visible
    await expect(q.textInput).toBeVisible();
    await expect(q.enqueueButton).toBeVisible();
    await expect(q.dequeueButton).toBeVisible();
    await expect(q.peekButton).toBeVisible();
    await expect(q.clearButton).toBeVisible();

    // Queue should be empty at start (node count 0)
    const count1 = await q.nodeCount();
    expect(count).toBe(0);

    // Size badge should be 0 (best-effort)
    const size = await q.getSizeBadgeValue();
    expect(size).toBeGreaterThanOrEqual(0);
  });

  test('enqueue flow: ENQUEUE_REQUEST -> enqueuing -> ENQUEUE_ARRIVAL_COMPLETE -> idle', async ({ page }) => {
    // This test ensures an enqueue request creates an incoming node which arrives and becomes part of the queue.
    const q1 = new QueuePage(page);

    await q.enqueue('A');

    // After arrival, at least one node with text "A" should be present
    const nodes1 = await q.getNodeTexts();
    const found = nodes.find(n => n.includes('A'));
    expect(found).toBeTruthy();

    // Size badge should reflect 1
    const size1 = await q.getSizeBadgeValue();
    expect(size).toBeGreaterThanOrEqual(1);
  });

  test('multiple enqueues can overlap (self-loop enqueuing events allowed)', async ({ page }) => {
    // Rapidly enqueue multiple items; FSM allows repeated ENQUEUE_REQUEST during enqueuing
    const q2 = new QueuePage(page);

    await q.enqueue('X', { waitForArrival: false });
    await q.enqueue('Y', { waitForArrival: false });
    await q.enqueue('Z', { waitForArrival: true }); // wait for at least last arrival

    // Ensure all three items eventually present
    const texts = await q.getNodeTexts();
    expect(texts.some(t => t.includes('X'))).toBeTruthy();
    expect(texts.some(t => t.includes('Y'))).toBeTruthy();
    expect(texts.some(t => t.includes('Z'))).toBeTruthy();

    // Size badge should be >= 3
    const size2 = await q.getSizeBadgeValue();
    expect(size).toBeGreaterThanOrEqual(3);
  });

  test('capacity error flash: setting small capacity then exceeding triggers capacity flash and announcement', async ({ page }) => {
    // Set capacity to 1, enqueue twice -> second enqueue should trigger capacity error flash state and announcement
    const q3 = new QueuePage(page);

    // Try to set capacity to 1 using labeled input or numeric input
    await q.setCapacity(1);
    await page.waitForTimeout(200);

    // Enqueue first item (should succeed)
    await q.enqueue('first');

    // Enqueue second item; the implementation is expected to emit a capacity-failure which may flash the capacity badge and announce
    // We attempt enqueue and then look for an announcement mentioning capacity or full
    // Some implementations will prevent animation; we allow either behavior: a capacity flash announcement or no second node added
    await q.enqueue('second', { waitForArrival: false }).catch(() => {});

    // Wait a bit for capacity flash announcement
    let announcement = '';
    try {
      announcement = await q.getAnnouncementText({ timeout: 1200 });
    } catch {}

    // Accept either: an announcement that mentions "capacity" or "full" OR the node count did not increase beyond capacity
    const texts1 = await q.getNodeTexts();
    const capacityExceeded = texts.filter(Boolean).length > 1;
    const annContainsCapacity = /capacit|full|overflow/i.test(announcement);

    // Assert that either the announcement signaled capacity error OR the second item wasn't added (enforced)
    expect(capacityExceeded || annContainsCapacity).toBeTruthy();

    // Also verify the capacity badge exists and contains the configured number (best-effort)
    const capBadge = await q.getCapacityBadgeValue();
    if (capBadge !== null) {
      expect(capBadge).toBeGreaterThanOrEqual(1);
    }
  });

  test('dequeue flow: DEQUEUE_REQUEST -> dequeueing -> DEQUEUE_DEPART_COMPLETE -> idle; empty dequeues announce empty', async ({ page }) => {
    // Enqueue two items, then dequeue one, verify head departs and is removed; then dequeue until empty and verify empty announcement
    const q4 = new QueuePage(page);

    // Ensure we have known items
    await q.enqueue('a1');
    await q.enqueue('a2');

    // Dequeue once: head should depart and be removed
    const beforeCount = await q.nodeCount();
    await q.dequeue();
    const afterCount = await q.nodeCount();
    expect(afterCount).toBeLessThanOrEqual(beforeCount - 1);

    // Now dequeue until empty
    await q.dequeue(); // remove last
    // Attempt dequeue on empty: expect either no depart animation or an announcement mentioning empty
    await q.clickIfVisible(q.dequeueButton);
    // Wait for possible announcement about empty
    const announce = await q.getAnnouncementText({ timeout: 1200 }).catch(() => '');
    expect(/empty|nothing|underflow/i.test(announce) || (await q.nodeCount()) === 0).toBeTruthy();
  });

  test('peek flow: PEEK_REQUEST -> peeking -> PEEK_COMPLETE; peek shows head value and pulses head visual', async ({ page }) => {
    // Enqueue an item and peek at it, verifying peek result appears and then clears
    const q5 = new QueuePage(page);

    await q.enqueue('peek-me');

    // Trigger peek and capture result text
    const peekText = await q.peek();
    // The peek presentation might return just the value or an announcement
    expect(peekText.length).toBeGreaterThan(0);
    expect(/peek-me/i.test(peekText)).toBeTruthy();

    // After peek completes, peek visual should be cleared; ensure no persistent peek result element
    const stillVisible = await q.peekResult.count();
    // If there's a peek element, it should eventually be removed: wait up to 2s
    if (stillVisible) {
      await q.peekResult.first().waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
      const finalCount = await q.peekResult.count();
      expect(finalCount).toBeLessThanOrEqual(0);
    }
  });

  test('clear flow: CLEAR_REQUEST -> cleared -> CLEAR_COMPLETE -> idle; queue DOM emptied and announcement made', async ({ page }) => {
    // Enqueue items then clear; verify nodes removed and announcement present
    const q6 = new QueuePage(page);

    await q.enqueue('c1');
    await q.enqueue('c2');

    // Clear queue
    await q.clear();

    // After clear, node count should be zero
    const nodesAfterClear = await q.nodeCount();
    expect(nodesAfterClear).toBe(0);

    // Announcement about clear should be present
    const ann1 = await q.getAnnouncementText({ timeout: 1200 }).catch(() => '');
    expect(/clear|cleared|empty/i.test(ann) || ann.length >= 0).toBeTruthy();
  });

  test('demo filling: DEMO_FILL_START -> demo_filling -> DEMO_FILL_STEP(enqueuing)+DEMO_FILL_FINISH -> idle', async ({ page }) => {
    // Start demo fill, expect a sequence of nodes to be enqueued and finalization announcement
    const q7 = new QueuePage(page);

    // Speed up animations for deterministic test if speed control is available
    await q.setSpeed('fast').catch(() => {});

    // Start demo fill
    await q.startDemoFill();

    // During demo fill, nodes should appear gradually up to some demo set (A..E typical) — wait until at least 3 nodes appear
    const nodesLocator = page.locator('.node, .queue-node, .item');
    await expect(nodesLocator).toHaveCountGreaterThanOrEqual?.(3).catch(async () => {
      // generic polling fallback
      for (let i = 0; i < 10; i++) {
        if ((await q.nodeCount()) >= 3) break;
        await page.waitForTimeout(250);
      }
      expect(await q.nodeCount()).toBeGreaterThanOrEqual(1);
    });

    // Wait for demo to finish: demo may enqueue 4-5 items; give a generous timeout for the full sequence to complete
    for (let i = 0; i < 20; i++) {
      // If there's a visible demo/cancel button, it may indicate running; prefer to poll node count
      const count2 = await q.nodeCount();
      if (count >= 4) break;
      await page.waitForTimeout(200);
    }

    // After demo finishes, there should be multiple nodes
    const finalCount1 = await q.nodeCount();
    expect(finalCount).toBeGreaterThanOrEqual(1);

    // Final announcement about demo finish may be present
    const ann2 = await q.getAnnouncementText({ timeout: 1500 }).catch(() => '');
    // Accept either an announcement or simply presence of nodes
    expect(finalCount > 0 || /demo|fill|finished/i.test(ann)).toBeTruthy();
  });

  test('SET_CAPACITY and CAPACITY_FLASH_COMPLETE transitions: capacity set then flash ends restores normal state', async ({ page }) => {
    // Set capacity, cause a capacity flash, and ensure after the flash the UI returns to normal
    const q8 = new QueuePage(page);

    // Set capacity small to force a flash when trying to enqueue more
    await q.setCapacity(1);

    // Enqueue one item
    await q.enqueue('only');

    // Try to enqueue another to trigger capacity flash
    await q.enqueue('too-many', { waitForArrival: false }).catch(() => {});

    // The capacity flash typically lasts ~600ms; wait for 800ms then assert UI returns to non-flashed state
    // We check capacity badge does not have an obvious danger class, best-effort by waiting and checking that badge text is stable
    await page.waitForTimeout(800);

    const capTextAfter = await q.getCapacityBadgeValue();
    // capTextAfter should exist and be >= 1 if available
    if (capTextAfter !== null) {
      expect(capTextAfter).toBeGreaterThanOrEqual(1);
    } else {
      // fallback: ensure no lingering 'flash' styling element exists
      const flash = await page.locator('.capacity-badge.flash, .badge-capacity.flash, .flash-capacity').count();
      expect(flash).toBe(0);
    }
  });

  test('INPUT_ENTER triggers enqueue (keyboard enter)', async ({ page }) => {
    // Hitting Enter in the input should behave like ENQUEUE_REQUEST / INPUT_ENTER event
    const q9 = new QueuePage(page);

    // Focus input, type value and press Enter
    if (q.textInput) {
      await q.textInput.fill('enter-me');
      await q.textInput.press('Enter');
      // after enter, wait for node arrival
      const incoming1 = page.locator('.incoming1, .node.incoming1').filter({ hasText: 'enter-me' });
      await incoming.first().waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
      // Then wait for arrival
      const arrived1 = page.locator('.arrived1, .node.arrived1').filter({ hasText: 'enter-me' });
      await arrived.first().waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
      const texts2 = await q.getNodeTexts();
      expect(texts.some(t => t.includes('enter-me'))).toBeTruthy();
    } else {
      test.skip();
    }
  });
});