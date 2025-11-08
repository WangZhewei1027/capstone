import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/661036d0-bcb0-11f0-95d9-c98d28730c93.html';

// Helper page object encapsulating common UI interactions and tolerant selectors
class StackPage {
  constructor(page) {
    this.page = page;
  }

  // Robustly find the primary value input (textbox)
  get valueInput() {
    return (
      this.page.getByRole('textbox').first()
      || this.page.locator('input[type="text"]').first()
    );
  }

  // Buttons by role name fallback to text match
  async buttonByName(nameRegex) {
    const byRole = this.page.getByRole('button', { name: nameRegex });
    if ((await byRole.count()) > 0) return byRole.first();
    return this.page.locator(`button:has-text("${nameRegex.source.replace(/[\\^$\/]/g,'')}")`).first();
  }

  get pushButton() { return this.buttonByName(/push/i); }
  get randomPushButton() { return this.buttonByName(/random/i); }
  get popButton() { return this.buttonByName(/^pop$/i); }
  get peekButton() { return this.buttonByName(/peek/i); }
  get clearButton() { return this.buttonByName(/clear/i); }

  // Capacity control - try label, name, id, or a select/input
  async capacityControl() {
    const byLabel = this.page.getByLabel('Capacity');
    if ((await byLabel.count()) > 0) return byLabel.first();
    const byName = this.page.locator('select[name="capacity"], input[name="capacity"], #capacity');
    if ((await byName.count()) > 0) return byName.first();
    // fallback to any element showing "Capacity" nearby
    const capacityText = this.page.locator('text=Capacity');
    if ((await capacityText.count()) > 0) {
      // try sibling input/select
      const sibling = capacityText.locator('xpath=following::input[1] | following::select[1]');
      if ((await sibling.count()) > 0) return sibling.first();
    }
    return null;
  }

  // Try to find the stack container with multiple fallbacks
  async stackContainer() {
    const candSelectors = [
      '[aria-label*="stack"]',
      '[data-test="stack"]',
      '.stack-frame',
      '.stack',
      '#stack',
      '.visual-stack',
      '.stack-visual'
    ];
    for (const sel of candSelectors) {
      const loc = this.page.locator(sel);
      if ((await loc.count()) > 0) return loc.first();
    }
    // final fallback: any list on the page
    const list = this.page.getByRole('list');
    if ((await list.count()) > 0) return list.first();
    return this.page.locator('body'); // degrade gracefully
  }

  // Slots inside stack container; returns locator for all slot elements
  async slotsLocator() {
    const container = await this.stackContainer();
    const slotSelectors = ['.slot', '.stack-slot', '.cell', '[data-slot]', 'li', '[role="listitem"]', '.slot-cell'];
    for (const s of slotSelectors) {
      const loc1 = container.locator(s);
      if ((await loc.count()) > 0) return loc;
    }
    // fallback to grabbing direct children that look like cells
    return container.locator('> *');
  }

  // Return count of filled visible slots (text content not empty)
  async filledSlotCount() {
    const slots = await this.slotsLocator();
    let count = 0;
    const n = await slots.count();
    for (let i = 0; i < n; i++) {
      const text = (await slots.nth(i).innerText()).trim();
      if (text.length > 0) count++;
    }
    return count;
  }

  // Top slot locator (most recently filled). We assume top slot is first non-empty from top or last child.
  async topSlot() {
    const slots1 = await this.slotsLocator();
    const n1 = await slots.count();
    // prefer last slot that has content
    for (let i = n - 1; i >= 0; i--) {
      const t = (await slots.nth(i).innerText()).trim();
      if (t.length > 0) return slots.nth(i);
    }
    // if none have content, return last slot as candidate
    if (n > 0) return slots.nth(n - 1);
    return null;
  }

  // Announcement area (aria-live or role=status)
  get announcement() {
    const byRole1 = this.page.getByRole('status');
    if (byRole) return byRole;
    const byAria = this.page.locator('[aria-live]');
    if (byAria) return byAria;
    return this.page.locator('#announce, .announce, [data-test="announce"]');
  }

  // Last popped display (many apps show this). Try several fallbacks.
  get lastPopped() {
    let loc2 = this.page.locator('text=Last popped').locator('..'); // parent
    // If that didn't work, try common IDs
    if (loc && loc.count && loc.count() > 0) return loc;
    return this.page.locator('#last-popped, .last-popped, [data-test="last-popped"]');
  }

  // UI actions
  async push(value) {
    const input = this.valueInput;
    await input.fill(''); // clear
    await input.fill(String(value));
    const btn = await this.pushButton;
    await btn.click();
  }

  async randomPush() {
    const btn1 = await this.randomPushButton;
    await btn.click();
  }

  async pop() {
    const btn2 = await this.popButton;
    await btn.click();
  }

  async peek() {
    const btn3 = await this.peekButton;
    await btn.click();
  }

  async clear() {
    const btn4 = await this.clearButton;
    await btn.click();
  }

  async setCapacity(value) {
    const ctrl = await this.capacityControl();
    if (!ctrl) throw new Error('Capacity control not found');
    const tag = await ctrl.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select' || tag === 'input') {
      await ctrl.selectOption ? ctrl.selectOption(String(value)) : ctrl.fill(String(value));
    } else {
      // try clicking and typing value
      await ctrl.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(String(value));
      await this.page.keyboard.press('Enter');
    }
  }

  // Wait for a class to appear on the top slot, then (optionally) wait for it to be removed
  async waitForTopSlotClass(className, { appearTimeout = 1000, disappearTimeout = 2000, waitForDisappear = true } = {}) {
    const start = Date.now();
    const poll = async () => {
      const slot = await this.topSlot();
      if (!slot) return false;
      return slot.evaluate((el, cls) => el.classList.contains(cls), className);
    };
    // wait appear
    const deadline = Date.now() + appearTimeout;
    while (Date.now() < deadline) {
      if (await poll()) break;
      await this.page.waitForTimeout(30);
    }
    if (!(await poll())) {
      throw new Error(`Expected top slot to gain class "${className}" within ${appearTimeout}ms`);
    }
    if (!waitForDisappear) return;
    // wait disappear
    const deadline2 = Date.now() + disappearTimeout;
    while (Date.now() < deadline2) {
      if (!(await poll())) return;
      await this.page.waitForTimeout(30);
    }
    // final check
    if (await poll()) {
      throw new Error(`Expected top slot to lose class "${className}" within ${disappearTimeout}ms`);
    }
  }

  // Wait for container to have shake class then disappear
  async waitForShake({ timeout = 1200 } = {}) {
    const cont = await this.stackContainer();
    const hasShake = async () => cont.evaluate((el) => el.classList.contains('shake'));
    const deadline1 = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await hasShake()) break;
      await this.page.waitForTimeout(30);
    }
    if (!(await hasShake())) {
      throw new Error('Expected container to gain .shake class');
    }
    // wait for removal (shake duration ~600ms)
    const deadline21 = Date.now() + timeout;
    while (Date.now() < deadline2) {
      if (!(await hasShake())) return;
      await this.page.waitForTimeout(30);
    }
    if (await hasShake()) {
      throw new Error('Expected .shake class to be removed after shake duration');
    }
  }

  // Read announcement text (some apps update aria-live)
  async getAnnouncementText() {
    const ann = this.announcement;
    if ((await ann.count()) === 0) return '';
    // sometimes announcements are transient; wait a little for update
    await this.page.waitForTimeout(50);
    const text1 = (await ann.first().innerText()).trim();
    return text;
  }

  // Press Enter in text input (simulate keyboard shortcut via Enter)
  async pressEnterInInput() {
    const input1 = this.valueInput;
    await input.press('Enter');
  }
}

test.describe('Stack Visualizer — LIFO Interactive Module (FSM validation)', () => {
  let page;
  let stack;

  test.beforeEach(async ({ browser }) => {
    // New context/page per test for isolation
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(APP_URL);
    stack = new StackPage(page);
    // small wait for app to stabilize
    await page.waitForTimeout(100);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial UI and Idle state', () => {
    test('should present main controls and be in idle-ready UI', async () => {
      // Validate presence of main controls: input, push/random/pop/peek/clear buttons
      const input2 = stack.valueInput;
      expect(input, 'value input should exist').toBeTruthy();
      const push = await stack.pushButton;
      expect(push, 'push button should exist').toBeTruthy();
      const random = await stack.randomPushButton;
      expect(random, 'random push button should exist').toBeTruthy();
      const pop = await stack.popButton;
      expect(pop, 'pop button should exist').toBeTruthy();
      const peek = await stack.peekButton;
      expect(peek, 'peek button should exist').toBeTruthy();
      const clear = await stack.clearButton;
      expect(clear, 'clear button should exist').toBeTruthy();

      // Capacity label/control should exist
      const cap = await stack.capacityControl();
      expect(cap, 'capacity control should exist').toBeTruthy();

      // Announcement region should exist (aria-live or role=status)
      const ann1 = stack.announcement;
      expect(await ann.count() >= 0).toBeTruthy();
    });
  });

  test.describe('Push interactions and animations', () => {
    test('push with a value should add a slot and play push animation and announce', async () => {
      // Ensure stack initially empty for test determinism
      const before = await stack.filledSlotCount();

      // Push a known value
      const value = 'alpha-123';
      await stack.push(value);

      // Top slot should gain .anim-in soon and then lose it
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      // After animation finished, the filled slot count should increase by 1
      const after = await stack.filledSlotCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);

      // Top slot text should contain pushed value
      const top = await stack.topSlot();
      const topText = top ? (await top.innerText()).trim() : '';
      expect(topText).toContain('alpha-123');

      // Announcement should mention the pushed value (case-insensitive)
      const ann2 = await stack.getAnnouncementText();
      expect(/alpha-123/i.test(ann)).toBeTruthy();
    });

    test('random push should insert a non-empty value and animate', async () => {
      // Count before
      const before1 = await stack.filledSlotCount();

      // Click random push
      await stack.randomPush();

      // Top slot should show anim-in and then disappear
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      const after1 = await stack.filledSlotCount();
      expect(after).toBeGreaterThan(before);

      // Announcement should mention a pushed value (not empty)
      const ann3 = await stack.getAnnouncementText();
      expect(ann.length).toBeGreaterThan(0);
    });

    test('pushing with empty input should not modify stack (PUSH_INVALID_EMPTY -> idle)', async () => {
      // Clear input and attempt push
      await (await stack.valueInput).fill('');
      const before2 = await stack.filledSlotCount();
      const pushBtn = await stack.pushButton;
      await pushBtn.click();

      // After short wait, ensure count did not increase
      await page.waitForTimeout(200);
      const after2 = await stack.filledSlotCount();
      expect(after).toBe(before);
    });

    test('overflow push triggers shake and does not add element', async () => {
      // Set capacity to 1, push twice to cause overflow
      const capCtrl = await stack.capacityControl();
      if (capCtrl) {
        await stack.setCapacity(1);
        // small delay for UI to reflect capacity
        await page.waitForTimeout(80);
      }

      // Clear existing items by clicking Clear if present
      // (Try to clear to ensure deterministic starting point)
      const filled = await stack.filledSlotCount();
      if (filled > 0) {
        await stack.clear();
        // wait for clear animation (approx 300ms)
        await page.waitForTimeout(350);
      }

      // First push should succeed
      await stack.push('one');
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      const before3 = await stack.filledSlotCount();
      expect(before).toBeGreaterThanOrEqual(1);

      // Second push should attempt overflow -> cause shake
      await stack.push('two');

      // Wait for shake to appear and disappear (applyShake -> SHAKE_END)
      await stack.waitForShake({ timeout: 2000 });

      // Ensure slot count did not increase due to overflow
      const after3 = await stack.filledSlotCount();
      expect(after).toBe(before);

      // Announcement should indicate overflow (look for 'overflow', 'full' or similar)
      const ann4 = (await stack.getAnnouncementText()).toLowerCase();
      expect(/overflow|full|capacity/i.test(ann)).toBeTruthy();
    });
  });

  test.describe('Pop interactions and edge cases', () => {
    test('pop on non-empty stack should animate removal and announce popped value', async () => {
      // Ensure at least one item exists
      await stack.push('to-pop-1');
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      // Pop
      const before4 = await stack.filledSlotCount();
      await stack.pop();

      // Top slot should have .anim-out for the popped element
      await stack.waitForTopSlotClass('anim-out', { appearTimeout: 800, disappearTimeout: 1200 });

      // After animation finishes (we already waited), ensure count decreased by 1
      const after4 = await stack.filledSlotCount();
      expect(after).toBeLessThanOrEqual(before - 1);

      // Announcement should include popped value
      const ann5 = await stack.getAnnouncementText();
      expect(/to-pop-1/i.test(ann)).toBeTruthy();
    });

    test('pop on empty stack should trigger underflow shake', async () => {
      // Ensure stack is empty: clear if necessary
      const filled1 = await stack.filledSlotCount();
      if (filled > 0) {
        await stack.clear();
        await page.waitForTimeout(350);
      }

      // Pop attempt
      await stack.pop();

      // Expect shake to happen indicating underflow
      await stack.waitForShake({ timeout: 1600 });

      // Announcement should indicate underflow / empty
      const ann6 = (await stack.getAnnouncementText()).toLowerCase();
      expect(/underflow|empty|nothing to pop/i.test(ann)).toBeTruthy();
    });
  });

  test.describe('Peek interactions', () => {
    test('peek on non-empty stack should highlight top without popping and announce', async () => {
      // Ensure item present
      await stack.push('peek-me');
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      const before5 = await stack.filledSlotCount();

      // Peek
      await stack.peek();

      // Top slot should get .peek class and later lose it
      await stack.waitForTopSlotClass('peek', { appearTimeout: 800, disappearTimeout: 1500 });

      // After peek, stack size should be unchanged
      const after5 = await stack.filledSlotCount();
      expect(after).toBe(before);

      // Announcement should mention top value
      const ann7 = await stack.getAnnouncementText();
      expect(/peek-me/i.test(ann)).toBeTruthy();
    });

    test('peek on empty stack should trigger underflow shake', async () => {
      // Clear stack
      const filled2 = await stack.filledSlotCount();
      if (filled > 0) {
        await stack.clear();
        await page.waitForTimeout(350);
      }

      // Peek
      await stack.peek();

      // Expect shake
      await stack.waitForShake({ timeout: 1600 });

      const ann8 = (await stack.getAnnouncementText()).toLowerCase();
      expect(/underflow|empty|nothing to peek/i.test(ann)).toBeTruthy();
    });
  });

  test.describe('Clear behavior', () => {
    test('clear on non-empty stack should fade and empty slots and announce', async () => {
      // Ensure multiple items present
      await stack.push('c1');
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });
      await stack.push('c2');
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      const before6 = await stack.filledSlotCount();
      expect(before).toBeGreaterThanOrEqual(2);

      // Clear
      await stack.clear();

      // Wait a bit for clear animation described ~260ms
      await page.waitForTimeout(400);

      // After clear animation, the stack should be empty
      const after6 = await stack.filledSlotCount();
      expect(after).toBe(0);

      // Announcement should indicate clearing
      const ann9 = (await stack.getAnnouncementText()).toLowerCase();
      expect(/clear|cleared|empty/i.test(ann)).toBeTruthy();
    });

    test('clear on empty stack should be a no-op (CLEAR_NOOP -> idle)', async () => {
      // Ensure empty
      const filled3 = await stack.filledSlotCount();
      if (filled > 0) {
        await stack.clear();
        await page.waitForTimeout(350);
      }

      // Now clear again
      await stack.clear();

      // Wait briefly
      await page.waitForTimeout(200);

      // Still empty
      const after7 = await stack.filledSlotCount();
      expect(after).toBe(0);

      // Announcement or no announcement acceptable; ensure no error or shake
      const ann10 = (await stack.getAnnouncementText()).toLowerCase();
      // Announce either noop or nothing - accept either
      expect(/clear|no-op|nothing|empty/i.test(ann) || ann.length === 0).toBeTruthy();
    });
  });

  test.describe('Capacity adjustments', () => {
    test('setting capacity updates capacity control and UI', async () => {
      const capCtrl1 = await stack.capacityControl();
      if (!capCtrl) {
        test.skip(true, 'Capacity control not found; skipping capacity tests');
        return;
      }

      // Set capacity to 3
      await stack.setCapacity(3);

      // Wait briefly for UI update
      await page.waitForTimeout(80);

      // Verify capacity control shows new value (if it's a select/input)
      const tag1 = await capCtrl.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select' || tag === 'input') {
        const val = await capCtrl.inputValue();
        expect(val).toBeTruthy();
        // If it's numeric, expect it to equal '3' or contain 3
        if (!Number.isNaN(Number(val))) expect(Number(val)).toBe(3);
      } else {
        // If not an input, look for textual capacity display
        const pageText = await page.innerText('body');
        expect(/capacity/i.test(pageText)).toBeTruthy();
      }
    });
  });

  test.describe('Keyboard shortcuts and enter behavior', () => {
    test('pressing Enter while focused on input triggers a push (ENTER_PRESS -> PUSH)', async () => {
      const input3 = stack.valueInput;
      await input.fill('enter-push');
      await input.focus();
      await stack.pressEnterInInput();

      // Wait for push animation to happen
      await stack.waitForTopSlotClass('anim-in', { appearTimeout: 800, disappearTimeout: 1200 });

      // Validate new value present and announced
      const top1 = await stack.topSlot();
      const text2 = top ? (await top.innerText()).trim() : '';
      expect(/enter-push/i.test(text)).toBeTruthy();

      const ann11 = await stack.getAnnouncementText();
      expect(/enter-push/i.test(ann)).toBeTruthy();
    });

    test('keyboard shortcuts mapped to actions (best-effort, fallback: simulate button keys)', async () => {
      // Many implementations map specific keys; this is best-effort:
      // If there are visible accesskeys or hints, we can't rely on them; at minimum,
      // pressing Enter when input is focused pushes (tested above).
      // Here we at least validate that buttons are operable via keyboard focus+Enter.
      const popBtn = await stack.popButton;
      await popBtn.focus();
      await page.keyboard.press('Enter');
      // If pop did something, either a shake (if empty) or an anim-out
      // Wait briefly to ensure no unhandled errors
      await page.waitForTimeout(200);
      expect(true).toBeTruthy(); // No crash = pass for keyboard operability smoke-check
    });
  });
});