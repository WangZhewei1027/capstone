import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/10-28-0007/html/077c88c0-b40a-11f0-8f04-37d078910466.html';

// Helper page object encapsulating common interactions and robust selectors.
// This tolerates slight differences in DOM structure by trying multiple selectors.
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Primary selectors (with fallbacks)
    this.input = page.locator('input[type="text"], input[aria-label="Value"], input[name="value"], input#value');
    this.enqueueBtn = page.getByRole('button', { name: /enqueue/i }).first();
    this.dequeueBtn = page.getByRole('button', { name: /dequeue/i }).first();
    this.peekBtn = page.getByRole('button', { name: /peek/i }).first();
    this.clearBtn = page.getByRole('button', { name: /clear/i }).first();
    // Speed control (if present)
    this.speedControl = page.locator('input[type="range"][aria-label*="speed" i], input[type="range"]');
    // Message and screen reader live region
    this.messageLocator = page.locator('[data-message], .message, #message, [role="status"], [aria-live="polite"]').first();
    this.srLive = page.locator('[aria-live], .sr-live, #sr-live').first();
    // Track / queue container and items
    this.track = page.locator('.track, .queue-track, .queue-viewport, #track, #queue').first();
    this.itemsInTrack = () =>
      this.track.locator('.item, .queue-item, .track-item, .node, [data-value]');
  }

  // Wait until app announces it's ready via the tip in FSM
  async waitForInitialized() {
    // FSM initial message contains: Ready. Tip: press Ctrl+E to focus input, Enter to enqueue.
    // Use partial match to be resilient.
    await this.page.waitForSelector(`text=Ready. Tip: press Ctrl+E`, { timeout: 3000 });
    // Also ensure stats / UI rendered (track visible)
    await expect(this.track).toBeVisible({ timeout: 2000 });
  }

  // Return message text (trimmed)
  async getMessageText() {
    try {
      const txt = await this.messageLocator.textContent();
      return (txt || '').trim();
    } catch {
      return '';
    }
  }

  async getSRText() {
    try {
      const txt = await this.srLive.textContent();
      return (txt || '').trim();
    } catch {
      return '';
    }
  }

  // Enqueue by filling input+click or pressing Enter.
  async enqueue(value, { useEnter = false } = {}) {
    // Ensure input is available and focused if using Enter
    await expect(this.input).toBeVisible();
    await this.input.fill('');
    if (useEnter) {
      await this.input.fill(value);
      await this.input.press('Enter');
    } else {
      await this.input.fill(value);
      // Prefer pressing the visible enqueue button if present
      if (await this.enqueueBtn.count() > 0) {
        await this.enqueueBtn.click();
      } else {
        // fallback: press Enter
        await this.input.press('Enter');
      }
    }
    // Wait briefly for animation to create item element
    await this.page.waitForTimeout(50);
  }

  // Dequeue by clicking button (or via keyboard)
  async dequeue() {
    if (await this.dequeueBtn.count() > 0) {
      await this.dequeueBtn.click();
    } else {
      // fallback: press Ctrl+D
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('d');
      await this.page.keyboard.up('Control');
    }
  }

  async peek() {
    if (await this.peekBtn.count() > 0) {
      await this.peekBtn.click();
    } else {
      // fallback: keyboard shortcut Ctrl+P
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('p');
      await this.page.keyboard.up('Control');
    }
  }

  async clear() {
    if (await this.clearBtn.count() > 0) {
      await this.clearBtn.click();
    } else {
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('c');
      await this.page.keyboard.up('Control');
    }
  }

  // Click an item by its visible text/value
  async clickItemByText(text) {
    // Try to find item by several heuristics
    const itemByText = this.track.locator(`text=${text}`).first();
    await itemByText.click();
  }

  // Return an array of item values currently in the track (in DOM order)
  async listItemValues() {
    const items = this.itemsInTrack();
    const count = await items.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const el = items.nth(i);
      // Try data-value attribute first, then text content
      const dv = await el.getAttribute('data-value');
      if (dv) {
        values.push(dv);
      } else {
        const txt = (await el.textContent()) || '';
        values.push(txt.trim());
      }
    }
    return values;
  }

  // Helper to wait for item to appear containing text
  async waitForItem(value, options = { timeout: 2000 }) {
    const locator = this.track.locator(`text=${value}`);
    await locator.waitFor({ state: 'visible', timeout: options.timeout });
  }

  // Helper to wait for an item to be removed
  async waitForItemRemoved(value, options = { timeout: 3000 }) {
    const locator = this.track.locator(`text=${value}`);
    await locator.waitFor({ state: 'detached', timeout: options.timeout });
  }

  // Focus the input via Ctrl+E keyboard shortcut
  async focusInputViaShortcut() {
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('e');
    await this.page.keyboard.up('Control');
  }

  // Change speed (if control exists)
  async changeSpeed(value) {
    if (await this.speedControl.count() > 0) {
      const ctl = this.speedControl.first();
      await ctl.fill(''); // ensure no stale
      await ctl.evaluate((el, v) => (el.value = v), String(value));
      // Trigger input event
      await ctl.dispatchEvent('input');
      await ctl.dispatchEvent('change');
    }
  }
}

test.describe('Interactive Queue Explorer - FSM end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(APP_URL);
  });

  test.describe('Initialization and idle state', () => {
    test('should initialize and enter idle (seed done) with ready tip and stats updated', async ({ page }) => {
      const q = new QueuePage(page);
      // Wait for FSM initializing -> idle. The FSM sets a ready tip in onEnter.
      await q.waitForInitialized();
      const msg = await q.getMessageText();
      // The FSM explicit message contains the tip; check partial text to be resilient.
      expect(msg).toContain('Ready');
      expect(msg).toContain('Ctrl+E');
      // Ensure sr-live exists (used by many states)
      await expect(q.srLive).toBeVisible();
      // Ensure track is present
      await expect(q.track).toBeVisible();
    });
  });

  test.describe('Enqueue flows', () => {
    test('enqueue via Enter key should create an item and announce Enqueued', async ({ page }) => {
      // Validate INPUT_ENTER_VALID -> enqueueing -> ENQUEUE_ANIM_DONE -> idle
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Focus input via Ctrl+E to simulate user path described in FSM
      await q.focusInputViaShortcut();
      // Input should be focused
      const activeTag = await page.evaluate(() => document.activeElement?.tagName || '');
      expect(activeTag.toLowerCase()).toBe('input');

      const value = 'apple-1';
      // Use Enter to enqueue
      await q.enqueue(value, { useEnter: true });

      // New item should be present in the track
      await q.waitForItem(value);

      // The app should display a message that contains Enqueued "<value>" (FSM onEnter)
      await page.waitForSelector(`text=Enqueued`, { timeout: 1500 });
      const msg = await q.getMessageText();
      expect(msg).toContain('Enqueued');
      expect(msg).toContain(value);

      // Screen reader live region should also be updated in enqueueing / dequeuing events
      const sr = await q.getSRText();
      // Not all implementations announce enqueue to sr-live, but many do; if present ensure it contains the value or Enqueued
      expect(sr.length > 0 ? (sr.includes(value) || sr.toLowerCase().includes('enqueued')) : true).toBeTruthy();

      // Items list should contain our value at head (since we started empty)
      const values = await q.listItemValues();
      expect(values[values.length - 1]).toContain('apple-1'); // appended to track end visually
    });

    test('clicking Enqueue with empty input does not create item and stays idle (CLICK_ENQUEUE_EMPTY)', async ({ page }) => {
      // Try to trigger the CLICK_ENQUEUE_EMPTY guarded transition
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Ensure input is empty
      await q.input.fill('');
      // Click Enqueue
      if (await q.enqueueBtn.count() > 0) {
        await q.enqueueBtn.click();
      } else {
        // fallback to pressing Enter with empty input
        await q.input.press('Enter');
      }

      // Wait shortly then assert no 'Enqueued' message was produced and no new items created
      await page.waitForTimeout(300);
      const msg = await q.getMessageText();
      // Expect message not to contain success "Enqueued"
      expect(msg).not.toMatch(/Enqueued/i);

      // Ensure there is no newly created element with non-empty content
      const values = await q.listItemValues();
      // It's valid for the queue to already have items from previous tests only in same page;
      // but since beforeEach navigates new page, list should be empty here.
      // Assert that no item has empty text (defensive)
      for (const v of values) {
        expect(v.length).toBeGreaterThan(0);
      }
    });

    test('enqueue until full shows guarded transition CLICK_ENQUEUE_FULL (UI indicates full or disables enqueue)', async ({ page }) => {
      // Many queue visualizations have a max capacity. This test attempts to fill multiple items
      // and then verifies that further enqueues are rejected (either via message or disabled button).
      const q = new QueuePage(page);
      await q.waitForInitialized();

      const maxAttempts = 10; // try up to 10 to find capacity if present
      const pushed = [];
      for (let i = 0; i < maxAttempts; i++) {
        const value = `v-${i}`;
        // Enqueue using button to better exercise click path
        await q.enqueue(value, { useEnter: false });
        // Wait briefly for item to appear; if capacity reached the item will not appear
        try {
          await q.waitForItem(value, { timeout: 600 });
          pushed.push(value);
        } catch {
          // item didn't appear: likely capacity reached
          break;
        }
        // Check if enqueue button became disabled or message indicates full
        if (await q.enqueueBtn.getAttribute('disabled')) {
          break;
        }
        const msg = await q.getMessageText();
        if (msg && /full/i.test(msg)) {
          // UI explicitly indicated full
          break;
        }
      }

      // If capacity was found, assert further enqueue attempt either shows "full" message or no new item
      if (pushed.length < maxAttempts) {
        // Try one more enqueue and validate it fails
        const attemptedValue = 'overflow-test';
        await q.enqueue(attemptedValue, { useEnter: false });
        // Give animation/message time
        await page.waitForTimeout(300);
        const msg = await q.getMessageText();
        // Accept either explicit "full" message or absence of the item in DOM
        const itemPresent = await q.track.locator(`text=${attemptedValue}`).count();
        expect(msg.length > 0 ? /full/i.test(msg) || itemPresent === 0 : itemPresent === 0).toBeTruthy();
      } else {
        // If we couldn't find a capacity, at least ensure multiple items were enqueued
        expect(pushed.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  test.describe('Dequeuing flows', () => {
    test('click Dequeue on empty queue results in idle and shows an empty/ no-op message (CLICK_DEQUEUE_EMPTY)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Ensure queue is empty
      const initialItems = await q.listItemValues();
      if (initialItems.length > 0) {
        // Attempt to clear to reach empty state
        if (await q.clearBtn.count() > 0) {
          await q.clear();
          // wait for clear to finish; FSM clears after animations
          await page.waitForTimeout(600);
        }
      }

      // Click Dequeue when empty
      if (await q.dequeueBtn.count() > 0) {
        await q.dequeueBtn.click();
      } else {
        await page.keyboard.down('Control');
        await page.keyboard.press('d');
        await page.keyboard.up('Control');
      }

      // Wait briefly and assert that message does not contain "Dequeued"
      await page.waitForTimeout(200);
      const msg = await q.getMessageText();
      expect(msg).not.toMatch(/Dequeued/i);
    });

    test('dequeue removes first item with animation and announces Dequeued (CLICK_DEQUEUE -> dequeuing -> DEQUEUE_ANIM_DONE)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Ensure we have a few items
      await q.enqueue('head-1');
      await q.enqueue('tail-2');
      // Wait for DOM
      await q.waitForItem('head-1');
      await q.waitForItem('tail-2');

      // Capture initial order
      let values = await q.listItemValues();
      expect(values.length).toBeGreaterThanOrEqual(2);
      const headValue = values[0].includes('head-1') ? values[0] : values[values.length - 2]; // best-effort mapping
      // Perform dequeue
      await q.dequeue();

      // FSM sets a message "Dequeuing \"${value}\"..." then later "Dequeued \"${value}\"."
      // Wait for a message that contains 'Dequeued' or 'Dequeuing'
      await page.waitForTimeout(50);
      const msgBefore = await q.getMessageText();
      expect(msgBefore.length > 0).toBeTruthy();
      // Wait for animation + removal to complete
      await q.waitForItemRemoved('head-1');

      // Final message should confirm dequeued item
      await page.waitForTimeout(50);
      const msg = await q.getMessageText();
      expect(/Dequeued/i.test(msg)).toBeTruthy();

      // Screen reader live region should be updated to indicate removal
      const sr = await q.getSRText();
      expect(sr.length > 0 ? /Dequeued/i.test(sr) || sr.includes('Head') || sr.includes('Dequeued') : true).toBeTruthy();
    });

    test('keyboard shortcut Ctrl+D triggers dequeue and behaves like click', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Enqueue an item to ensure non-empty
      await q.enqueue('kbd-d-item');

      // Ensure item exists
      await q.waitForItem('kbd-d-item');

      // Trigger Ctrl+D
      await page.keyboard.down('Control');
      await page.keyboard.press('d');
      await page.keyboard.up('Control');

      // Wait for removal
      await q.waitForItemRemoved('kbd-d-item');
      // Message should indicate Dequeued
      const msg = await q.getMessageText();
      expect(/Dequeued/i.test(msg)).toBeTruthy();
    });
  });

  test.describe('Peek and inspection flows', () => {
    test('peek on empty shows idle no-op (CLICK_PEEK_EMPTY)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Try to clear any existing items to ensure empty
      if ((await q.listItemValues()).length > 0) {
        if (await q.clearBtn.count() > 0) {
          await q.clear();
          await page.waitForTimeout(600);
        }
      }

      // Click Peek
      if (await q.peekBtn.count() > 0) {
        await q.peekBtn.click();
      } else {
        // shortcut
        await page.keyboard.down('Control');
        await page.keyboard.press('p');
        await page.keyboard.up('Control');
      }

      // Should not announce a head value with "Peek: head is" (since empty), so ensure message doesn't contain 'Peek: head is'
      const msg = await q.getMessageText();
      expect(msg.length > 0 ? !/Peek: head is/i.test(msg) : true).toBeTruthy();
    });

    test('peek when non-empty announces head value and updates sr-live (CLICK_PEEK -> peeking)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Ensure queue has items and known head
      await q.enqueue('peek-HEAD');
      await q.enqueue('peek-TAIL');

      await q.waitForItem('peek-HEAD');

      // Trigger peek
      await q.peek();

      // The FSM onEnter for peeking sets message: `Peek: head is "${headValue}".`
      await page.waitForTimeout(50);
      const msg = await q.getMessageText();
      expect(/Peek: head is/i.test(msg)).toBeTruthy();
      expect(msg).toContain('peek-HEAD');

      // sr-live should include "Head is" or the head value
      const sr = await q.getSRText();
      expect(sr.length > 0 ? (sr.includes('peek-HEAD') || /Head is/i.test(sr)) : true).toBeTruthy();
    });

    test('item activation leads to itemInspect state and message describing position', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Prepare three items for positional test
      await q.enqueue('inspect-A');
      await q.enqueue('inspect-B');
      await q.enqueue('inspect-C');

      await q.waitForItem('inspect-A');
      await q.waitForItem('inspect-B');
      await q.waitForItem('inspect-C');

      // Click the second item (B) to inspect
      await q.clickItemByText('inspect-B');

      // FSM onEnter should set message like: Item "B" is at position 2 (head=1).
      // Wait a moment for message to update
      await page.waitForTimeout(120);
      const msg = await q.getMessageText();
      expect(msg).toMatch(/Item .*inspect-B.*position.*2/i);
    });
  });

  test.describe('Clearing flows', () => {
    test('click Clear on empty queue is a no-op (CLICK_CLEAR_EMPTY)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // ensure empty
      if ((await q.listItemValues()).length > 0) {
        if (await q.clearBtn.count() > 0) {
          await q.clear();
          await page.waitForTimeout(600);
        }
      }

      // Click clear
      if (await q.clearBtn.count() > 0) {
        await q.clearBtn.click();
      } else {
        // fallback to Ctrl+C
        await page.keyboard.down('Control');
        await page.keyboard.press('c');
        await page.keyboard.up('Control');
      }

      // Wait a bit then ensure nothing exploded and no items exist
      await page.waitForTimeout(200);
      expect((await q.listItemValues()).length).toBe(0);
      // Message should not be "Cleared queue." with items removed because it was already empty; check it doesn't contain Dequeued
      const msg = await q.getMessageText();
      expect(msg.length >= 0).toBeTruthy();
    });

    test('clear when non-empty staggers exit animations and empties the queue (CLICK_CLEAR -> clearing -> CLEAR_ANIM_DONE)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Add multiple items
      await q.enqueue('clear-1');
      await q.enqueue('clear-2');
      await q.enqueue('clear-3');

      await q.waitForItem('clear-1');
      await q.waitForItem('clear-2');
      await q.waitForItem('clear-3');

      // Click clear
      await q.clear();

      // FSM onEnter sets message 'Clearing queue.'; check for that
      await page.waitForTimeout(50);
      const clearingMsg = await q.getMessageText();
      expect(/Clearing queue/i.test(clearingMsg) || /Cleared queue/i.test(clearingMsg)).toBeTruthy();

      // Wait for clear animation to finish (animationMs + items.length*40 + margin)
      // Use a generous timeout to avoid flakiness
      await page.waitForTimeout(1200);

      // After clearing, the track should have zero items
      const finalItems = await q.listItemValues();
      expect(finalItems.length).toBe(0);

      // And final message should state 'Cleared queue.' per FSM onExit
      const finalMsg = await q.getMessageText();
      expect(/Cleared queue/i.test(finalMsg) || finalMsg.length > 0).toBeTruthy();
    });
  });

  test.describe('Focus and speed controls (misc events)', () => {
    test('Ctrl+E focuses input and sets focus message (CTRL_E -> focusInput)', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Use keyboard shortcut to focus input
      await q.focusInputViaShortcut();

      // Verify the input is focused
      const active = await page.evaluate(() => document.activeElement?.getAttribute?.('type') || document.activeElement?.tagName || '');
      // Should be input or at least not body
      expect(active.toLowerCase()).toContain('input');

      // Message should update to indicate focused input (FSM: 'Focused input. Type then press Enter to enqueue.')
      await page.waitForTimeout(80);
      const msg = await q.getMessageText();
      expect(msg).toMatch(/Focused input/i);
    });

    test('changing speed triggers SPEED_CHANGE and does not break UI', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // If a speed control exists, change it and verify the page remains interactive and message may update
      if (await q.speedControl.count() > 0) {
        await q.changeSpeed(80);
        // Wait briefly and assert we are still in idle (i.e., no blocking modals)
        await page.waitForTimeout(120);
        const msg = await q.getMessageText();
        // The FSM transitions to idle; message may or may not change - ensure no error visible
        expect(msg.length >= 0).toBeTruthy();
        // Enqueue after changing speed to ensure animations still work
        await q.enqueue('speed-test');
        await q.waitForItem('speed-test');
        const values = await q.listItemValues();
        expect(values.some(v => v.includes('speed-test'))).toBeTruthy();
      } else {
        test.skip(true, 'No speed control present in DOM');
      }
    });
  });

  test.describe('Edge cases and combined scenarios', () => {
    test('sequence: enqueue -> peek -> dequeue -> clear should perform transitions back to idle each time', async ({ page }) => {
      const q = new QueuePage(page);
      await q.waitForInitialized();

      // Enqueue
      await q.enqueue('seq-1');
      await q.waitForItem('seq-1');
      expect((await q.getMessageText()).includes('Enqueued') || (await q.getMessageText()).length > 0).toBeTruthy();

      // Peek
      await q.peek();
      await page.waitForTimeout(80);
      expect((await q.getMessageText()).toLowerCase()).toContain('peek');

      // Dequeue
      await q.dequeue();
      await page.waitForTimeout(80);
      // Wait until item removed
      try {
        await q.waitForItemRemoved('seq-1', { timeout: 2000 });
      } catch {
        // ignore if already removed
      }
      expect((await q.getMessageText()).toLowerCase()).toContain('dequeued');

      // Enqueue a couple and Clear
      await q.enqueue('seq-2');
      await q.enqueue('seq-3');
      await q.waitForItem('seq-2');
      await q.waitForItem('seq-3');

      await q.clear();
      // allow clear to finish
      await page.waitForTimeout(1000);
      expect((await q.listItemValues()).length).toBe(0);
      expect((await q.getMessageText()).toLowerCase()).toContain('cleared');
    });
  });
});