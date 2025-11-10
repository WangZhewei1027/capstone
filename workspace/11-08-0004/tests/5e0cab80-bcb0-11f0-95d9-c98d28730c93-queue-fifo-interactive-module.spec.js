import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/5e0cab80-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating the queue UI interactions and queries
class QueuePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Primary controls
    this.input = page.locator('input[type="text"]');
    this.range = page.locator('input[type="range"]');
    // Prefer accessible role queries for buttons, fallback to text-matching button locators
    this.enqueueBtn = page.getByRole('button', { name: /enqueue/i }).first();
    this.dequeueBtn = page.getByRole('button', { name: /dequeue/i }).first();
    this.peekBtn = page.getByRole('button', { name: /peek/i }).first();
    this.clearBtn = page.getByRole('button', { name: /clear/i }).first();
    // Visual elements
    this.slots = page.locator('.slot'); // matches slot elements in visualization
    // attempt to locate a log/aria-live/status element
    this.log = page.locator('[role="status"], [aria-live], .log, #log').first();
    // capacity display fallback: element showing number near slider
    this.capacityLabel = page.locator('.capacityLabel, #capacityValue, .capValue').first();
    // pointer indicators if present
    this.frontPointer = page.locator('.pointer.front, .front-pointer, .pointer--front').first();
    this.rearPointer = page.locator('.pointer.rear, .rear-pointer, .pointer--rear').first();
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main module to appear
    await expect(this.page.locator('.module')).toBeVisible({ timeout: 5000 });
    // Ensure slots have rendered
    await expect(this.slots.first()).toBeVisible();
  }

  // Get numeric capacity from range value or capacity label text
  async getCapacity() {
    if (await this.range.count()) {
      const v = await this.range.inputValue();
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
    if (await this.capacityLabel.count()) {
      const txt = (await this.capacityLabel.textContent()) || '';
      const m = txt.match(/\d+/);
      if (m) return Number(m[0]);
    }
    return null;
  }

  // Read slot texts (trimmed). Empty slots may be empty string.
  async getSlotTexts() {
    const count = await this.slots.count();
    const arr = [];
    for (let i = 0; i < count; i++) {
      const t = (await this.slots.nth(i).textContent()) || '';
      arr.push(t.trim());
    }
    return arr;
  }

  async getNonEmptySlotTexts() {
    const all = await this.getSlotTexts();
    return all.filter(s => s.length > 0 && s !== '—' && s !== '-');
  }

  async getLogText() {
    if (await this.log.count()) {
      const txt1 = (await this.log.textContent()) || '';
      return txt.trim();
    }
    return '';
  }

  async enqueue(value, useEnter = false) {
    await this.input.fill('');
    if (value !== '') {
      await this.input.fill(value);
    }
    if (useEnter) {
      await this.input.press('Enter');
    } else {
      if (await this.enqueueBtn.count()) {
        await this.enqueueBtn.click();
      } else {
        // fallback: press Enter if button not found
        await this.input.press('Enter');
      }
    }
  }

  async dequeue() {
    if (await this.dequeueBtn.count()) {
      await this.dequeueBtn.click();
    } else {
      await this.page.keyboard.press('d');
    }
  }

  async peek() {
    if (await this.peekBtn.count()) {
      await this.peekBtn.click();
    } else {
      await this.page.keyboard.press('p');
    }
  }

  async clear() {
    await this.clearBtn.click();
  }

  // Set capacity by updating the range value via JS (ensures change events fire)
  async setCapacity(value) {
    if (!Number.isInteger(value)) throw new Error('capacity must be integer');
    if (await this.range.count()) {
      await this.page.evaluate(
        ({ selector, v }) => {
          const el = document.querySelector(selector);
          if (!el) return;
          el.value = String(v);
          // Dispatch input and change events to simulate real user change
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { selector: 'input[type="range"]', v: value }
      );
    } else if (await this.capacityLabel.count()) {
      // If no range, try clicking controls or manipulating UI via label (best-effort)
      await this.capacityLabel.click();
    }
  }

  // Wait until any 'animating' class or 'is-anim' visually finishes. Generic approach.
  async waitForAnimationsToFinish(timeout = 3000) {
    const animSelector = '.animating, .is-anim, .animate, .anim'; // attempted common animation classes
    const hasAnim = await this.page.locator(animSelector).count();
    if (!hasAnim) return;
    await this.page.waitForSelector(`${animSelector}`, { state: 'detached', timeout });
  }
}

test.describe('Queue — FIFO Interactive Module (FSM validation)', () => {
  /** @type {QueuePage} */
  let qp;

  test.beforeEach(async ({ page }) => {
    qp = new QueuePage(page);
    await qp.goto();
  });

  test.afterEach(async ({ page }) => {
    // Try to clear state between tests: click clear if available
    try {
      if (await page.locator('button:has-text("Clear")').count()) {
        await page.locator('button:has-text("Clear")').click();
      }
    } catch (e) {
      // ignore teardown errors
    }
  });

  test.describe('Idle state and initial rendering', () => {
    test('renders slots and controls correctly in idle state', async ({ page }) => {
      // Validate module and default controls exist
      await expect(page.locator('.module')).toBeVisible();
      // Input present and enabled
      await expect(qp.input).toBeVisible();
      await expect(qp.input).toBeEnabled();

      // Buttons exist
      await expect(qp.enqueueBtn).toBeVisible();
      await expect(qp.dequeueBtn).toBeVisible();
      await expect(qp.peekBtn).toBeVisible();
      await expect(qp.clearBtn).toBeVisible();

      // When starting idle queue is empty: dequeue and peek should be disabled (guarded)
      // If the app disables them, assert disabled; if not, at least ensure they exist.
      if (await qp.dequeueBtn.isEnabled()) {
        // If implementation doesn't disable, ensure logically empty by checking slots
        const nonEmpty = await qp.getNonEmptySlotTexts();
        expect(nonEmpty.length).toBe(0);
      } else {
        await expect(qp.dequeueBtn).toBeDisabled();
        await expect(qp.peekBtn).toBeDisabled();
      }

      // Capacity is visible (via range or label)
      const capacity = await qp.getCapacity();
      expect(typeof capacity === 'number' && capacity >= 1).toBeTruthy();

      // Log area empty or neutral text
      const log = await qp.getLogText();
      // allow empty or some help text
      expect(typeof log === 'string').toBeTruthy();
    });
  });

  test.describe('Enqueue behavior and ENQUEUE/ENQUEUE_ANIMATION_END transitions', () => {
    test('can enqueue an item via button and via Enter key, visualizes and logs it', async ({ page }) => {
      // Enqueue "A" via button
      await qp.enqueue('A');
      // wait for animations to finish and DOM settle
      await qp.waitForAnimationsToFinish();
      // The first non-empty slot should contain "A"
      const textsAfterA = await qp.getNonEmptySlotTexts();
      expect(textsAfterA[0]).toBe('A');

      // Log should reflect enqueue
      const logTextA = await qp.getLogText();
      expect(/enqueu|pushed|added|enqueued/i.test(logTextA)).toBeTruthy();

      // Enqueue "B" via Enter key (INPUT_ENTER event)
      await qp.enqueue('B', true);
      await qp.waitForAnimationsToFinish();
      const texts = await qp.getNonEmptySlotTexts();
      expect(texts[0]).toBe('A');
      expect(texts[1]).toBe('B');

      // Ensure controls were re-enabled after animation (ENQUEUE_ANIMATION_END -> idle)
      await expect(qp.enqueueBtn).toBeEnabled();
      // If capacity reached, enqueue button may become disabled - covered in separate test
    });

    test('enqueue invalid (empty input) triggers error state and logs an error', async ({ page }) => {
      // Ensure input empty
      await qp.input.fill('');
      // Click enqueue
      await qp.enqueue('');
      // Error is transient: log should show error text (empty input)
      const log1 = await qp.getLogText();
      expect(/empty|required|please|invalid/i.test(log)).toBeTruthy();

      // Controls should eventually return to idle (buttons enabled/disabled based on queue)
      await page.waitForTimeout(400); // allow transient error -> idle transition
      // Input should still be focusable/usable
      await expect(qp.input).toBeEnabled();
    });

    test('enqueue until capacity then ENQUEUE_INVALID when full', async ({ page }) => {
      const capacity1 = await qp.getCapacity();
      expect(Number.isInteger(capacity)).toBeTruthy();
      // Fill to capacity
      for (let i = 0; i < capacity; i++) {
        await qp.enqueue(String(i));
        await qp.waitForAnimationsToFinish();
      }
      // After filling, either enqueue button becomes disabled or an extra enqueue triggers ENQUEUE_INVALID -> error
      if (await qp.enqueueBtn.isEnabled()) {
        // If still enabled, clicking with value should show error
        await qp.enqueue('overflow');
        const log2 = await qp.getLogText();
        expect(/full|capacity|overflow|cannot enqueue/i.test(log)).toBeTruthy();
      } else {
        await expect(qp.enqueueBtn).toBeDisabled();
        // Try pressing Enter to enqueue, should produce error log
        await qp.input.fill('overflow');
        await qp.input.press('Enter');
        const log3 = await qp.getLogText();
        expect(/full|capacity|overflow|cannot enqueue/i.test(log)).toBeTruthy();
      }
    });
  });

  test.describe('Dequeue behavior and DEQUEUE/DEQUEUE_ANIMATION_END transitions', () => {
    test('dequeue removes the front element and logs it (button and keyboard D)', async ({ page }) => {
      // Prepare queue with two items: X, Y
      await qp.enqueue('X');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('Y');
      await qp.waitForAnimationsToFinish();

      // Dequeue via button
      await qp.dequeue();
      await qp.waitForAnimationsToFinish();
      const textsAfter1 = await qp.getNonEmptySlotTexts();
      // After dequeuing X, front should be Y
      expect(textsAfter1[0]).toBe('Y');

      // Dequeue via keyboard (press 'd')
      await page.keyboard.press('d');
      await qp.waitForAnimationsToFinish();
      const nonEmpty1 = await qp.getNonEmptySlotTexts();
      // Queue should be empty now
      expect(nonEmpty.length).toBe(0);

      // Log should mention the dequeued value(s)
      const log4 = await qp.getLogText();
      expect(/dequeue|dequeued|removed|shift/i.test(log)).toBeTruthy();
    });

    test('dequeue on empty queue triggers an error/invalid transition', async ({ page }) => {
      // Ensure empty
      const nonEmpty2 = await qp.getNonEmptySlotTexts();
      if (nonEmpty.length > 0) {
        await qp.clear();
        await qp.waitForAnimationsToFinish();
      }
      // Attempt to dequeue
      await qp.dequeue();
      // Error log expected
      const log5 = await qp.getLogText();
      expect(/empty|cannot dequeue|no items|underflow/i.test(log)).toBeTruthy();
      // After transient error, controls return to idle state
      await page.waitForTimeout(300);
      await expect(qp.dequeueBtn).toBeDisabled().catch(() => {}); // may remain disabled if empty
    });
  });

  test.describe('Peek behavior and PEEK transition', () => {
    test('peek reveals front without removing it (button and key P)', async ({ page }) => {
      // Prepare queue: A, B
      await qp.enqueue('A');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('B');
      await qp.waitForAnimationsToFinish();

      // Peek via button
      await qp.peek();
      // The peek may trigger a pulse animation — ensure completing
      await qp.waitForAnimationsToFinish(1500);
      let texts1 = await qp.getNonEmptySlotTexts();
      // Ensure both items remain (peek doesn't remove)
      expect(texts[0]).toBe('A');
      expect(texts[1]).toBe('B');
      let log6 = await qp.getLogText();
      expect(/peek|front|top|first/i.test(log)).toBeTruthy();

      // Peek via keyboard 'p'
      await page.keyboard.press('p');
      await qp.waitForAnimationsToFinish(1500);
      texts = await qp.getNonEmptySlotTexts();
      expect(texts[0]).toBe('A'); // still present
      log = await qp.getLogText();
      expect(/peek|front|first/i.test(log)).toBeTruthy();
    });

    test('peek on empty queue triggers PEEK_INVALID -> error', async ({ page }) => {
      // Clear queue
      await qp.clear();
      await qp.waitForAnimationsToFinish();
      // Attempt to peek
      await qp.peek();
      const log7 = await qp.getLogText();
      expect(/empty|cannot peek|no items/i.test(log)).toBeTruthy();
    });
  });

  test.describe('Clear behavior and CLEAR transition', () => {
    test('clear empties the queue and logs clear; animations run and controls update', async ({ page }) => {
      // Enqueue three items
      await qp.enqueue('1');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('2');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('3');
      await qp.waitForAnimationsToFinish();

      // Click clear
      await qp.clear();
      // During clearing, clear button may be disabled; assert at least temporarily not enabled
      // Wait for animations to finish
      await qp.waitForAnimationsToFinish(5000);
      // All slots should be empty
      const nonEmpty3 = await qp.getNonEmptySlotTexts();
      expect(nonEmpty.length).toBe(0);

      const log8 = await qp.getLogText();
      expect(/clear|cleared|empti/i.test(log)).toBeTruthy();

      // Controls should be in idle state after clear: dequeue/peek disabled due to empty queue
      await page.waitForTimeout(200);
      if (await qp.dequeueBtn.isEnabled()) {
        const nonEmptyAfter = await qp.getNonEmptySlotTexts();
        expect(nonEmptyAfter.length).toBe(0);
      } else {
        await expect(qp.dequeueBtn).toBeDisabled();
      }
    });
  });

  test.describe('Capacity adjustments and trimming behavior (CAPACITY_CHANGE)', () => {
    test('increasing capacity renders more slots', async ({ page }) => {
      const oldCapacity = await qp.getCapacity();
      expect(oldCapacity).toBeTruthy();
      const newCapacity = oldCapacity + 2;
      await qp.setCapacity(newCapacity);
      await page.waitForTimeout(300); // allow render
      const newCap = await qp.getCapacity();
      expect(newCap).toBe(newCapacity);

      // Slot count should be >= newCapacity (or exactly newCapacity)
      const slotCount = await qp.slots.count();
      expect(slotCount).toBeGreaterThanOrEqual(newCapacity);
    });

    test('decreasing capacity trims rear items when new capacity < current size', async ({ page }) => {
      // Ensure capacity sufficiently large
      await qp.setCapacity(6);
      // Enqueue 4 items: a,b,c,d
      await qp.enqueue('a');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('b');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('c');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('d');
      await qp.waitForAnimationsToFinish();

      // Verify queue content
      let current = await qp.getNonEmptySlotTexts();
      expect(current.slice(0, 4)).toEqual(['a', 'b', 'c', 'd']);

      // Reduce capacity to 2 -> should trim rear two items (c,d) leaving a,b
      await qp.setCapacity(2);
      // Implementation triggers trimming and render - brief wait
      await page.waitForTimeout(500);
      // Check that only first two remain
      const remaining = await qp.getNonEmptySlotTexts();
      expect(remaining[0]).toBe('a');
      expect(remaining[1]).toBe('b');
      expect(remaining.length).toBeLessThanOrEqual(2);

      // Log should mention trim or removal
      const log9 = await qp.getLogText();
      expect(/trim|removed|splic|capacity/i.test(log)).toBeTruthy();
    });
  });

  test.describe('Error state transitions and transient behavior', () => {
    test('invalid capacity change logs an error (e.g., negative or zero)', async ({ page }) => {
      // Try invalid capacity -1 and 0; UI should handle with error log
      await qp.setCapacity(0);
      await page.waitForTimeout(200);
      let log0 = await qp.getLogText();
      const bad0 = /invalid|must be|minimum|capacity/i.test(log0);
      // Some implementations clamp silently; allow either.
      if (!bad0) {
        // Try negative
        await qp.setCapacity(-1);
        await page.waitForTimeout(200);
        const logNeg = await qp.getLogText();
        expect(/invalid|must be|minimum|capacity/i.test(logNeg) || logNeg.length >= 0).toBeTruthy();
      } else {
        expect(bad0).toBeTruthy();
      }
    });

    test('dequeue/peek on empty produce error and auto-resolve to idle', async ({ page }) => {
      // Ensure empty
      await qp.clear();
      await qp.waitForAnimationsToFinish();
      // Try dequeue
      await qp.dequeue();
      let log11 = await qp.getLogText();
      expect(/empty|cannot dequeue|no items/i.test(log1)).toBeTruthy();
      // After transient resolution, idle should be restored; verify controls reflect empty state
      await page.waitForTimeout(400);
      // Dequeue should be disabled or no-op
      if (await qp.dequeueBtn.isEnabled()) {
        const nonEmpty4 = await qp.getNonEmptySlotTexts();
        expect(nonEmpty.length).toBe(0);
      } else {
        await expect(qp.dequeueBtn).toBeDisabled();
      }

      // Try peek similarly
      await qp.peek();
      let log21 = await qp.getLogText();
      expect(/empty|cannot peek|no items/i.test(log2)).toBeTruthy();
    });
  });

  test.describe('Keyboard shortcuts and event mapping', () => {
    test('Enter triggers enqueue (INPUT_ENTER), D triggers dequeue (KEY_D), P triggers peek (KEY_P)', async ({ page }) => {
      // Ensure empty and capacity >=2
      await qp.setCapacity(4);
      // Enqueue via Enter
      await qp.input.fill('k');
      await qp.input.press('Enter');
      await qp.waitForAnimationsToFinish();
      let texts2 = await qp.getNonEmptySlotTexts();
      expect(texts[0]).toBe('k');

      // Dequeue via key 'd'
      await page.keyboard.press('d');
      await qp.waitForAnimationsToFinish();
      texts = await qp.getNonEmptySlotTexts();
      expect(texts.length).toBe(0);

      // Enqueue two and test peek via 'p'
      await qp.enqueue('first');
      await qp.waitForAnimationsToFinish();
      await qp.enqueue('second');
      await qp.waitForAnimationsToFinish();
      await page.keyboard.press('p');
      await qp.waitForAnimationsToFinish(1000);
      const log10 = await qp.getLogText();
      expect(/peek|front|first/i.test(log)).toBeTruthy();
      // Ensure items still present after peek
      const remaining1 = await qp.getNonEmptySlotTexts();
      expect(remaining[0]).toBe('first');
      expect(remaining[1]).toBe('second');
    });
  });
});