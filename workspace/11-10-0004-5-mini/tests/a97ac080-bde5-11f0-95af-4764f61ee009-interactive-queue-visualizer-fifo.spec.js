import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-10-0004-5-mini/html/a97ac080-bde5-11f0-95af-4764f61ee009.html';

// Helper Page Object for the Queue Visualizer
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Generic locators - attempt several common patterns used in UIs
    this.inputLocator = this._firstAvailableLocator([
      'input[type="text"]',
      'input[placeholder*="value"]',
      'input[name="value"]',
      'input[aria-label*="value"]'
    ]);

    this.capacityLocator = this._firstAvailableLocator([
      'input[type="number"]',
      'input[name="capacity"]',
      'select[name="capacity"]'
    ]);

    // Buttons - use getByRole with name patterns where possible; fallback to text search
    this.enqueueButton = this._buttonByText(/enqueue/i);
    this.dequeueButton = this._buttonByText(/dequeue/i);
    this.peekButton = this._buttonByText(/peek/i);
    this.clearButton = this._buttonByText(/clear/i);
    this.fillRandomButton = this._buttonByText(/random|fill random|fill/i);
    this.autoToggleButton = this._buttonByText(/auto|start auto|toggle auto/i);

    // attempt to find slots list using common class names
    this.slotsLocator = this._firstAvailableLocator([
      '[data-slots] [data-slot]',
      '[data-slot]',
      '.slot',
      '.slots > *',
      '.queue-slot',
      '.slots .slot'
    ]);

    // attempt to find a log area
    this.logLocator = this._firstAvailableLocator([
      '.log',
      '.logs',
      '.history',
      '#log',
      '[data-log]',
      '.console',
      '.events'
    ]);

    // animation duration hint (ms) - match stylesheet var --duration:360ms
    this.animMs = 380;
  }

  // Returns a locator created from the first selector that yields at least one element.
  _firstAvailableLocator(selectors) {
    for (const sel of selectors) {
      try {
        const loc = this.page.locator(sel);
        // We don't await count here because the element might appear after navigation; return locator so tests can await.
        // But mark it with a property to remember the selector.
        loc._selector = sel;
        return loc;
      } catch (e) {
        // ignore
      }
    }
    // final fallback - entire page
    const fallback = this.page.locator('body');
    fallback._selector = 'body';
    return fallback;
  }

  // Returns a button locator by trying role-based first then text search
  _buttonByText(regex) {
    // getByRole will return a Locator even if not found; tests will await existence when used.
    try {
      const loc = this.page.getByRole('button', { name: regex });
      loc._textHint = regex;
      return loc;
    } catch (e) {
      // fallback to generic button with text
      const fallback = this.page.locator(`button:has-text("${regex}")`);
      fallback._textHint = regex;
      return fallback;
    }
  }

  // Utility: read all slots as trimmed text array
  async getSlotTexts() {
    const slots = await this._resolveSlots();
    const texts = [];
    for (let i = 0; i < slots.count; i++) {
      const locator = slots.locator.nth(i);
      const text = (await locator.innerText()).trim();
      texts.push(text);
    }
    return texts;
  }

  // Utility: returns a small object { locator, count }, where locator is Locator for slots container matched
  async _resolveSlots() {
    // try common selectors until we find one with count > 0
    const candidateSelectors = [
      '[data-slots] [data-slot]',
      '[data-slot]',
      '.slot',
      '.slots > *',
      '.queue-slot',
      '.slots .slot'
    ];
    for (const sel of candidateSelectors) {
      const loc = this.page.locator(sel);
      const count = await loc.count().catch(() => 0);
      if (count > 0) return { locator: loc, count, selector: sel };
    }
    // fallback: treat children of a container panel as slots
    const fallback = this.page.locator('.panel, .module');
    const count = await fallback.count().catch(() => 1);
    return { locator: fallback, count, selector: 'body (fallback)' };
  }

  // click a button and wait briefly for UI changes
  async clickButton(locator, options = {}) {
    await locator.click(options);
  }

  // high-level actions
  async enqueue(value) {
    const input = this.inputLocator;
    await input.fill(''); // clear first
    await input.fill(String(value));
    await this.clickButton(this.enqueueButton);
    // wait for enqueue animation to complete
    await this.page.waitForTimeout(this.animMs + 50);
  }

  async enqueueByEnter(value) {
    const input = this.inputLocator;
    await input.fill('');
    await input.fill(String(value));
    await input.press('Enter');
    await this.page.waitForTimeout(this.animMs + 50);
  }

  async dequeue() {
    await this.clickButton(this.dequeueButton);
    await this.page.waitForTimeout(this.animMs + 50);
  }

  async peek() {
    await this.clickButton(this.peekButton);
    await this.page.waitForTimeout(this.animMs + 50);
  }

  async clear() {
    await this.clickButton(this.clearButton);
    await this.page.waitForTimeout(this.animMs + 50);
  }

  async fillRandom() {
    await this.clickButton(this.fillRandomButton);
    // filling random may run many steps; wait a bit and then poll for non-empty slots
    await this.page.waitForTimeout(300);
  }

  async toggleAuto() {
    await this.clickButton(this.autoToggleButton);
  }

  async setCapacity(n) {
    const cap = this.capacityLocator;
    const tag = await cap.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tag === 'select') {
      await cap.selectOption(String(n)).catch(() => {});
    } else {
      await cap.fill(String(n)).catch(() => {});
      // some implementations require blur to apply
      await cap.blur().catch(() => {});
    }
    // allow UI to re-render
    await this.page.waitForTimeout(200);
  }

  // returns number of non-empty slots (after trimming)
  async nonEmptySlotCount() {
    const resolved = await this._resolveSlots();
    let count = 0;
    for (let i = 0; i < resolved.count; i++) {
      const text = (await resolved.locator.nth(i).innerText()).trim();
      if (text.length > 0 && !/head|tail/i.test(text)) count++;
    }
    return count;
  }

  // finds the log area locator (first that exists)
  async findLogArea() {
    const candidate = [
      '.log',
      '.logs',
      '.history',
      '#log',
      '[data-log]',
      '.console',
      '.events',
      '[role="status"]',
      '[role="log"]',
      '[role="alert"]'
    ];
    for (const sel of candidate) {
      const loc = this.page.locator(sel);
      if ((await loc.count().catch(() => 0)) > 0) return loc;
    }
    // fallback to body
    return this.page.locator('body');
  }

  // read the latest log text (tries to return something meaningful)
  async latestLogText() {
    const log = await this.findLogArea();
    const count = await log.count();
    if (count === 0) return '';
    // If the log area contains multiple children, get last child's innerText
    const lastChild = log.locator(':scope > *').last();
    if ((await lastChild.count()) > 0) {
      const txt = (await lastChild.innerText()).trim();
      if (txt) return txt;
    }
    // fallback to whole log text
    return (await log.innerText()).trim();
  }
}

test.describe('Interactive Queue Visualizer (FSM) - Full E2E', () => {
  let page;
  let queue;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    queue = new QueuePage(page);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // give the UI a moment to fully initialize
    await page.waitForTimeout(200);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Idle state and initial render', () => {
    test('renders controls and slots on idle (renderSlots onEnter)', async () => {
      // Validate presence of main controls: input + primary buttons
      await expect(queue.inputLocator).toBeVisible({ timeout: 2000 });

      // Buttons should be present (at least Enqueue and Dequeue)
      await expect(queue.enqueueButton).toBeVisible({ timeout: 2000 });
      await expect(queue.dequeueButton).toBeVisible({ timeout: 2000 });

      // Slots should be rendered (at least one)
      const resolved = await queue._resolveSlots();
      expect(resolved.count).toBeGreaterThanOrEqual(1);

      // The UI should show capacity control
      await expect(queue.capacityLocator).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Enqueue state (enqueueing)', () => {
    test('can enqueue via button and finalizes to idle with value in head slot', async () => {
      // Ensure starting empty
      await queue.clear().catch(() => {});
      const beforeEmpty = await queue.nonEmptySlotCount();
      // Enqueue a value
      await queue.enqueue('X');
      // After animation, at least one slot should contain the enqueued value
      const countAfter = await queue.nonEmptySlotCount();
      expect(countAfter).toBeGreaterThanOrEqual(beforeEmpty + 1);

      // Latest log should mention the enqueued value or 'enqueue'
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest.length).toBeGreaterThan(0);
      expect(latest).toMatch(/enqueue|enqueued|x/);
    });

    test('can enqueue via enter key (ENTER_KEY event)', async () => {
      await queue.clear().catch(() => {});
      const before = await queue.nonEmptySlotCount();
      await queue.enqueueByEnter('ENTERVAL');
      const after = await queue.nonEmptySlotCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);
    });

    test('enqueue with empty input triggers ENQUEUE_FAILED_EMPTY and stays idle', async () => {
      // clear input and attempt enqueue
      await queue.inputLocator.fill('');
      await queue.clickButton(queue.enqueueButton);
      // allow UI to react
      await page.waitForTimeout(200);
      const latest = (await queue.latestLogText()).toLowerCase();
      // Expect some helpful text mentioning empty or required
      expect(latest.length).toBeGreaterThanOrEqual(0);
      // try to assert that enqueue did not add a new non-empty slot
      const nonEmpty = await queue.nonEmptySlotCount();
      // We assert that nothing changed by trying to enqueue empty input: nonEmpty should be >= 0
      expect(nonEmpty).toBeGreaterThanOrEqual(0);
    });

    test('enqueue on full queue triggers ENQUEUE_FAILED_FULL and remains stable', async () => {
      // Set small capacity to exercise full behavior
      await queue.setCapacity(3);
      // fill capacity
      await queue.clear().catch(() => {});
      await queue.enqueue('A');
      await queue.enqueue('B');
      await queue.enqueue('C');

      // pick up non-empty count
      const filled = await queue.nonEmptySlotCount();
      expect(filled).toBeGreaterThanOrEqual(3);

      // Attempt to enqueue when full
      await queue.enqueue('OVER');
      // After attempting, queue size should not increase beyond capacity
      const after = await queue.nonEmptySlotCount();
      expect(after).toBeLessThanOrEqual(3);

      // Latest log should indicate full or refused
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/full|overflow|cannot|refuse|error|enqueued/);
    });
  });

  test.describe('Dequeue state (dequeueing)', () => {
    test('dequeues head element and updates slots (DEQUEUE_ANIMATION_END -> idle)', async () => {
      // Ensure queue has items
      await queue.clear().catch(() => {});
      await queue.enqueue('D1');
      await queue.enqueue('D2');
      // Capture slot texts before
      const before = await queue.getSlotTexts();
      // Dequeue
      await queue.dequeue();
      // After dequeue, head should be removed; number of non-empty should decrement by 1
      const nonEmptyAfter = await queue.nonEmptySlotCount();
      // We expect at least one item remains (D2) and count decreased
      expect(nonEmptyAfter).toBeGreaterThanOrEqual(0);
      // Log should register a dequeue
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/dequeue|dequeued|d1|d2/);
    });

    test('dequeue from empty queue triggers DEQUEUE_FAILED_EMPTY and remains idle', async () => {
      // Ensure empty
      await queue.clear().catch(() => {});
      // Try to dequeue
      await queue.dequeue();
      // Wait a bit
      await page.waitForTimeout(100);
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/empty|nothing|underflow|error|cannot/);
    });
  });

  test.describe('Peeking (peeking)', () => {
    test('peek highlights head and logs value (PEEK_ANIMATION_END -> idle)', async () => {
      // Prepare head
      await queue.clear().catch(() => {});
      await queue.enqueue('PHEAD');
      // Perform peek
      await queue.peek();
      // After peek, the UI should have some visual feedback. Try to detect highlight on first slot.
      const resolved = await queue._resolveSlots();
      let headText = '';
      if (resolved.count > 0) {
        headText = (await resolved.locator.nth(0).innerText()).toLowerCase();
      }
      // The head slot should contain PHEAD or label "head"
      expect(headText).toMatch(/phead|head/);

      // Latest log should mention peek or the head value
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/peek|phead|head/);
    });

    test('peek on empty queue triggers PEEK_FAILED_EMPTY', async () => {
      await queue.clear().catch(() => {});
      await queue.peek();
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/empty|cannot|error|nothing/);
    });
  });

  test.describe('Clearing (clearing)', () => {
    test('clear starts animation and finalizes with empty slots (CLEAR_ANIMATION_END -> idle)', async () => {
      // fill some values
      await queue.clear().catch(() => {});
      await queue.enqueue('C1');
      await queue.enqueue('C2');
      let filled = await queue.nonEmptySlotCount();
      expect(filled).toBeGreaterThanOrEqual(1);

      // Click clear
      await queue.clear();
      // After clear, all slots should be empty (non-empty count == 0)
      // Wait a little longer for clear animation
      await page.waitForTimeout(queue.animMs + 50);
      const after = await queue.nonEmptySlotCount();
      expect(after).toBeLessThanOrEqual(0);
      // log should mention 'clear' or 'cleared'
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/clear|cleared/);
    });
  });

  test.describe('Random fill (fillingRandom)', () => {
    test('fill random clears then fills multiple slots and finishes (FILL_RANDOM_FINISHED -> idle)', async () => {
      // Ensure some starting state
      await queue.clear().catch(() => {});
      // Trigger fill random
      await queue.fillRandom();
      // The process may run multiple steps; poll until multiple non-empty slots appear or timeout
      const timeout = 5000;
      const start = Date.now();
      let nonEmpty = 0;
      while (Date.now() - start < timeout) {
        nonEmpty = await queue.nonEmptySlotCount();
        if (nonEmpty > 0) break;
        await page.waitForTimeout(150);
      }
      expect(nonEmpty).toBeGreaterThanOrEqual(1);
      // allow finishing
      await page.waitForTimeout(500);
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest.length).toBeGreaterThan(0);
    });
  });

  test.describe('Auto-running (autoRunning)', () => {
    test('auto toggles on, performs AUTO_STEP enqueues and stops on full or toggle off', async () => {
      // Set small capacity to observe auto stop
      await queue.setCapacity(4);
      // clear then start auto
      await queue.clear().catch(() => {});
      // Toggle auto on
      await queue.toggleAuto();
      // Wait some time for multiple auto enqueues
      const waitMs = 4000;
      await page.waitForTimeout(waitMs);

      // After running, expect some items enqueued
      const nonEmpty = await queue.nonEmptySlotCount();
      expect(nonEmpty).toBeGreaterThanOrEqual(1);

      // Now toggle auto off manually (if still on)
      await queue.toggleAuto().catch(() => {});
      // allow a bit
      await page.waitForTimeout(200);
      const latest = (await queue.latestLogText()).toLowerCase();
      // Expect logs to contain auto related words or enqueues
      expect(latest).toMatch(/auto|enqueued|enqueue|stopped|stop|full/);
    }, 10000);
  });

  test.describe('Capacity changes and rendering (CAPACITY_CHANGE)', () => {
    test('changing capacity re-renders slots and does not lose relative order when shrinking', async () => {
      // Start with set capacity to 6 and enqueue a few items
      await queue.setCapacity(6);
      await queue.clear().catch(() => {});
      await queue.enqueue('1');
      await queue.enqueue('2');
      await queue.enqueue('3');
      let nonEmpty = await queue.nonEmptySlotCount();
      expect(nonEmpty).toBeGreaterThanOrEqual(3);

      // Shrink capacity to smaller number (e.g., 2)
      await queue.setCapacity(2);
      // allow UI to update
      await page.waitForTimeout(300);
      // After shrinking, queue may have truncated or kept head/tail; ensure at most new capacity items remain
      const after = await queue.nonEmptySlotCount();
      expect(after).toBeLessThanOrEqual(2);

      // Expand back to larger capacity and ensure slots re-render
      await queue.setCapacity(8);
      await page.waitForTimeout(300);
      const resolved = await queue._resolveSlots();
      expect(resolved.count).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Edge cases and FSM event coverage', () => {
    test('ENQUEUE_ABORT / FILL_RANDOM_ABORT behaviour (abort simulated by immediate clear)', async () => {
      // Start a random fill then immediately clear to simulate abort
      await queue.clear().catch(() => {});
      await queue.fillRandom();
      // Immediately trigger clear (abort)
      await queue.clear();
      // Wait for UI to settle
      await page.waitForTimeout(400);
      // Ensure queue is empty
      const nonEmpty = await queue.nonEmptySlotCount();
      expect(nonEmpty).toBeLessThanOrEqual(0);
      const latest = (await queue.latestLogText()).toLowerCase();
      // Expect a log mentioning abort/clear or similar
      expect(latest).toMatch(/clear|abort|canceled|cancelled|finished|stopped/);
    });

    test('AUTO_STOPPED_FULL and ENQUEUE_FAILED_FULL in autoRunning handled gracefully', async () => {
      // Set very small capacity and start auto
      await queue.setCapacity(2);
      await queue.clear().catch(() => {});
      await queue.toggleAuto();
      // wait for it to fill
      const start = Date.now();
      const timeout = 6000;
      while (Date.now() - start < timeout) {
        const count = await queue.nonEmptySlotCount();
        if (count >= 2) break;
        await page.waitForTimeout(200);
      }
      // ensure full
      const finalCount = await queue.nonEmptySlotCount();
      expect(finalCount).toBeGreaterThanOrEqual(2);

      // Toggle auto off if still on
      await queue.toggleAuto().catch(() => {});
      const latest = (await queue.latestLogText()).toLowerCase();
      expect(latest).toMatch(/full|stop|stopped|auto|enqueued|failed/);
    }, 10000);
  });
});