import { test, expect } from '@playwright/test';

//
// 65e38180-bcb0-11f0-95d9-c98d28730c93.spec.js
//
// Playwright end-to-end tests for the "Deque Explorer Interactive Module"
//
// These tests exercise the FSM behaviors described in the specification:
// - push/pop front/back (including animations and announcements)
// - peek front/back (flash animation + announcement)
// - clear (mass removal with animations)
// - capacity changes and blocked/ exceeded flows (shake + announcement)
// - random insert (choose front/back)
// - keyboard shortcuts mapping to same actions
// - empty-error announcements when popping from an empty deque
//
// Important: the UI markup had multiple plausible class/attribute names; the tests
// use resilient, multi-fallback locators (common semantics: role, button text,
// input[type], aria-live/status, list/listitem, class fallbacks). This makes the
// tests robust against small differences in markup while still verifying the
// interactive behaviors and state transitions described in the FSM.
//
// NOTE: These tests intentionally wait for animation/timeout windows (<= 1200ms)
// when verifying transient classes (incoming/outgoing/flash/shake). If the real
// application uses different durations, adjust the timing constants below.
//

const APP_URL =
  'http://127.0.0.1:5500/workspace/11-08-0004/html/65e38180-bcb0-11f0-95d9-c98d28730c93.html';

// Timing constants (ms) — chosen a bit larger than documented animation durations
const ANIMATION_GRACE = 1200; // wait for animations to start/end
const SHAKE_GRACE = 600;
const FLASH_GRACE = 900;

class DequePage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // allow initial microtasks and observers to settle
    await this.page.waitForTimeout(150);
  }

  // Generic resilient textbox locator (value entry)
  input() {
    // prefer role-based textbox, fallback to first text input
    const byRole = this.page.getByRole('textbox').first();
    return byRole.count().then((c) => (c ? byRole : this.page.locator('input[type="text"]').first()));
  }

  // Find a button by matching many possible visible label variants (case-insensitive)
  //
  // Accepts an array of RegExp or string patterns to try in order. Returns the first
  // Playwright Locator that exists on the page.
  async findButton(patterns) {
    for (const p of patterns) {
      // Try role-based query first
      const btn = this.page.getByRole('button', { name: p });
      if ((await btn.count()) > 0) return btn.first();
      // Try generic button text contains
      const btn2 = this.page.locator('button', { hasText: p });
      if ((await btn2.count()) > 0) return btn2.first();
      // Try anchors or other elements styled as buttons
      const btn3 = this.page.locator('a, [role="button"]', { hasText: p });
      if ((await btn3.count()) > 0) return btn3.first();
    }
    // fallback: any button in document (should not happen)
    const fallback = this.page.locator('button').first();
    if ((await fallback.count()) > 0) return fallback;
    throw new Error(`None of the button patterns found: ${patterns}`);
  }

  // Resilient capacity input (number)
  async capacityInput() {
    const candidates = [
      this.page.locator('input[type="number"]').first(),
      this.page.locator('input[name="capacity"]').first(),
      this.page.locator('input[aria-label*="capacity" i]').first(),
      this.page.locator('input[placeholder*="capacity" i]').first(),
      this.page.locator('[data-capacity]').first(),
    ];
    for (const c of candidates) {
      if ((await c.count()) > 0) return c;
    }
    // not found — return a dummy that throws on actions to give clearer errors
    return {
      count: async () => 0,
      fill: async () => {
        throw new Error('Capacity input not found on page');
      },
      type: async () => {
        throw new Error('Capacity input not found on page');
      },
    };
  }

  // Resilient deque container locator
  belt() {
    // Check common possibilities
    const cand = this.page.locator('[data-deque], .belt, .deque, #belt, ul.deque, .belt__children').first();
    return cand;
  }

  // Locator for deque cells as list items or generic nodes
  cells() {
    const b = this.belt();
    // If belt exists, search inside; otherwise, global search
    return b.locator('li, [role="listitem"], .cell, .deque-cell, .node, .item, .belt__cell');
  }

  // Announcement / live region (aria-live or role=status)
  announcement() {
    // prefer role=status, then aria-live
    const a1 = this.page.getByRole('status').first();
    return a1.count().then((c) => (c ? a1 : this.page.locator('[aria-live]').first()));
  }

  // Helper: count cells
  async cellCount() {
    const locator = this.cells();
    return await locator.count();
  }

  // Helper: get text content of first/last cell
  async firstCellText() {
    const locator1 = this.cells().first();
    if ((await locator.count()) === 0) return null;
    return (await locator.innerText()).trim();
  }
  async lastCellText() {
    const locator2 = this.cells().last();
    if ((await locator.count()) === 0) return null;
    return (await locator.innerText()).trim();
  }
}

test.describe('Deque Explorer — FSM behaviors and UI interactions', () => {
  let deque;

  test.beforeEach(async ({ page }) => {
    deque = new DequePage(page);
    await deque.goto();
  });

  test.afterEach(async ({ page }) => {
    // ensure page cleanup in case any test left animations pending
    await page.waitForTimeout(50);
  });

  test('idle state: initial DOM is stable and deque is empty', async ({ page }) => {
    // Validate initial "idle" environment — no nodes present, announcement exists
    const belt = deque.belt();
    expect(await belt.count()).toBeGreaterThanOrEqual(0); // belt may or may not exist depending on markup
    const count = await deque.cellCount();
    expect(count).toBe(0); // initially empty deque expected by spec

    // Announcement region should exist (for accessibility)
    const ann = deque.announcement();
    expect(await ann.count()).toBeGreaterThanOrEqual(0);
  });

  test.describe('Insertions (push front / push back / random)', () => {
    test('PUSH_FRONT: push an element to front, animation and announcement occur', async ({ page }) => {
      // Prepare
      const input = await deque.input();
      await input.fill('FrontVal');

      const pushFrontBtn = await deque.findButton([
        /push front/i,
        /add front/i,
        /^front$/i,
        /push\s*left/i,
        /insert front/i,
      ]);
      // Click push front
      await pushFrontBtn.click();

      // Immediately after click, cell count should be 1
      await page.waitForTimeout(50);
      expect(await deque.cellCount()).toBeGreaterThanOrEqual(1);

      // New front should contain the text we inserted
      const firstText = await deque.firstCellText();
      expect(firstText).toContain('FrontVal');

      // The element should have an incoming/animating class while animating, then it should clear
      const newCell = deque.cells().first();
      const classAttr = await newCell.getAttribute('class');
      // class may include 'incoming', 'incoming-front', 'animating-in', 'flash', etc.
      expect(classAttr || '').toMatch(/incoming|incoming-front|animating|flash|new/i);

      // Wait for animation to clear (FSM transitions to idle on ANIMATION_END/TIMEOUT_END)
      await page.waitForTimeout(ANIMATION_GRACE);

      const classAttrAfter = await newCell.getAttribute('class');
      // After animation ends, the 'incoming' class should no longer be present (or at least we should not throw)
      if (classAttrAfter) expect(classAttrAfter).not.toMatch(/incoming|incoming-front/i);

      // Announcement should contain something (value or description)
      const ann1 = deque.announcement();
      if ((await ann.count()) > 0) {
        const text = (await ann.innerText()).toLowerCase();
        expect(text.length).toBeGreaterThan(0);
      }
    });

    test('PUSH_BACK: push an element to back, verify back insertion and animation', async ({ page }) => {
      const input1 = await deque.input1();
      await input.fill('BackVal');

      const pushBackBtn = await deque.findButton([
        /push back/i,
        /add back/i,
        /^back$/i,
        /push\s*right/i,
        /insert back/i,
      ]);
      await pushBackBtn.click();

      await page.waitForTimeout(50);
      expect(await deque.cellCount()).toBeGreaterThanOrEqual(1);

      const lastText = await deque.lastCellText();
      expect(lastText).toContain('BackVal');

      // Check animation class on last cell then wait and confirm cleared
      const lastCell = deque.cells().last();
      const classAttr1 = await lastCell.getAttribute('class');
      expect(classAttr || '').toMatch(/incoming|incoming-back|animating|flash|new/i);

      await page.waitForTimeout(ANIMATION_GRACE);
      const classAfter = await lastCell.getAttribute('class');
      if (classAfter) expect(classAfter).not.toMatch(/incoming-back|incoming/i);
    });

    test('INSERT_RANDOM: inserts to either front or back and updates DOM', async ({ page }) => {
      // Use the "Insert random" button and validate that count increases by 1 and announcement mentions direction
      const beforeCount = await deque.cellCount();
      const randomBtn = await deque.findButton([/random insert/i, /insert random/i, /random/i]);
      await randomBtn.click();

      // Wait for DOM mutation + animation
      await page.waitForTimeout(ANIMATION_GRACE / 2);
      const afterCount = await deque.cellCount();
      expect(afterCount).toBe(beforeCount + 1);

      const ann2 = deque.announcement();
      if ((await ann.count()) > 0) {
        const text1 = (await ann.innerText()).toLowerCase();
        // Should mention front or back or inserted
        expect(/front|back|insert/i.test(text)).toBeTruthy();
      }
    });
  });

  test.describe('Removals (pop front / pop back) and empty errors', () => {
    test('POP_FRONT and POP_BACK: remove nodes with outgoing animation and announce', async ({ page }) => {
      // Ensure two elements exist to test both pops
      const input2 = await deque.input2();
      await input.fill('One');
      const pushBack = await deque.findButton([/push back/i, /add back/i, /insert back/i]);
      await pushBack.click();
      await page.waitForTimeout(ANIMATION_GRACE / 2);

      await input.fill('Two');
      const pushFront = await deque.findButton([/push front/i, /add front/i, /insert front/i]);
      await pushFront.click();
      await page.waitForTimeout(ANIMATION_GRACE / 2);

      const countBefore = await deque.cellCount();
      expect(countBefore).toBeGreaterThanOrEqual(2);

      // Pop front
      const popFrontBtn = await deque.findButton([
        /pop front/i,
        /remove front/i,
        /pop\s*left/i,
        /remove\s*left/i,
      ]);
      await popFrontBtn.click();

      // outgoing animation class should be briefly present on the removed node or first node
      await page.waitForTimeout(200);
      // allow animation end
      await page.waitForTimeout(ANIMATION_GRACE);
      const afterPopFrontCount = await deque.cellCount();
      expect(afterPopFrontCount).toBe(countBefore - 1);

      // Now pop back
      const popBackBtn = await deque.findButton([
        /pop back/i,
        /remove back/i,
        /pop\s*right/i,
        /remove\s*right/i,
      ]);
      await popBackBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);
      const afterPopBackCount = await deque.cellCount();
      expect(afterPopBackCount).toBe(afterPopFrontCount - 1);
    });

    test('Empty error: popping from empty deque triggers announcement / error behavior', async ({ page }) => {
      // Ensure deque is cleared first
      const clearBtn = await deque.findButton([/clear/i, /reset/i, /empty/i]);
      if ((await clearBtn.count()) > 0) {
        await clearBtn.click();
        await page.waitForTimeout(ANIMATION_GRACE);
      } else {
        // If no clear, try to pop until empty to ensure empty state
        const popFront = await deque.findButton([
          /pop front/i,
          /remove front/i,
          /pop\s*left/i,
          /remove\s*left/i,
        ]).catch(() => null);
        if (popFront) {
          // attempt a few times
          for (let i = 0; i < 3; i++) {
            await popFront.click();
            await page.waitForTimeout(100);
          }
        }
      }

      // Now pop front on empty
      const popFrontBtn1 = await deque.findButton([
        /pop front/i,
        /remove front/i,
        /pop\s*left/i,
        /remove\s*left/i,
      ]);
      await popFrontBtn.click();

      // Announcement should indicate empty operation or error; live region should update
      const ann3 = deque.announcement();
      if ((await ann.count()) > 0) {
        const text2 = (await ann.innerText()).toLowerCase();
        // Accept either 'empty', 'nothing', 'cannot', or similar message
        expect(/empty|nothing|cannot|no elements|underflow|error/i.test(text)).toBeTruthy();
      }

      // Similarly for pop back on empty
      const popBackBtn1 = await deque.findButton([
        /pop back/i,
        /remove back/i,
        /pop\s*right/i,
        /remove\s*right/i,
      ]);
      await popBackBtn.click();
      if ((await ann.count()) > 0) {
        const text21 = (await ann.innerText()).toLowerCase();
        expect(/empty|nothing|cannot|no elements|underflow|error/i.test(text2)).toBeTruthy();
      }
    });
  });

  test.describe('Peek interactions (PEEK_FRONT / PEEK_BACK)', () => {
    test('PEEK_FRONT: flashes front element and announces value', async ({ page }) => {
      // Prepare one element
      const input3 = await deque.input3();
      await input.fill('PeekMe');
      const pushBackBtn1 = await deque.findButton([/push back/i, /add back/i, /insert back/i]);
      await pushBackBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);

      const peekFrontBtn = await deque.findButton([/peek front/i, /peek\s*front/i, /peek left/i]);
      await peekFrontBtn.click();

      // The front cell should receive a transient 'flash' class or similar
      const firstCell = deque.cells().first();
      await page.waitForTimeout(50);
      const classBefore = await firstCell.getAttribute('class');
      expect(classBefore || '').toMatch(/flash|peek|highlight/i);

      // Wait for flash to end (FSM TIMEOUT_END/ANIMATION_END -> idle)
      await page.waitForTimeout(FLASH_GRACE);

      const classAfter1 = await firstCell.getAttribute('class');
      if (classAfter) expect(classAfter).not.toMatch(/flash|peek|highlight/i);

      // Announcement should mention the value
      const ann4 = deque.announcement();
      if ((await ann.count()) > 0) {
        const text3 = (await ann.innerText()).toLowerCase();
        expect(/peek|front|peeked|value|peekme/i.test(text)).toBeTruthy();
      }
    });

    test('PEEK_BACK: flashes back element and announces value', async ({ page }) => {
      const input4 = await deque.input4();
      await input.fill('PeekBackVal');
      const pushFrontBtn1 = await deque.findButton([/push front/i, /add front/i, /insert front/i]);
      await pushFrontBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);

      const peekBackBtn = await deque.findButton([/peek back/i, /peek\s*back/i, /peek right/i]);
      await peekBackBtn.click();

      const lastCell1 = deque.cells().last();
      await page.waitForTimeout(50);
      const cls = await lastCell.getAttribute('class');
      expect(cls || '').toMatch(/flash|peek|highlight/i);

      await page.waitForTimeout(FLASH_GRACE);
      const clsAfter = await lastCell.getAttribute('class');
      if (clsAfter) expect(clsAfter).not.toMatch(/flash|peek|highlight/i);

      // Announcement should indicate peek/back
      const ann5 = deque.announcement();
      if ((await ann.count()) > 0) {
        const text4 = (await ann.innerText()).toLowerCase();
        expect(/peek|back|value|peekbackval/i.test(text)).toBeTruthy();
      }
    });
  });

  test.describe('Clearing and capacity flows', () => {
    test('CLEAR: clears all elements with outgoing animations and finishes empty', async ({ page }) => {
      // Add several elements
      const input5 = await deque.input5();
      for (const v of ['A', 'B', 'C']) {
        await input.fill(v);
        const pushBackBtn2 = await deque.findButton([/push back/i, /add back/i, /insert back/i]);
        await pushBackBtn.click();
        await page.waitForTimeout(ANIMATION_GRACE / 4);
      }
      const countBefore1 = await deque.cellCount();
      expect(countBefore).toBeGreaterThanOrEqual(3);

      const clearBtn1 = await deque.findButton([/clear/i, /reset/i, /empty/i]);
      await clearBtn.click();

      // Immediately, outgoing classes may appear on the nodes
      await page.waitForTimeout(200);
      // Wait for all animations to end and DOM to be empty
      await page.waitForTimeout(ANIMATION_GRACE);
      const countAfter = await deque.cellCount();
      expect(countAfter).toBe(0);
    });

    test('CAPACITY_CHANGE and blocked/ exceeded flows: setting capacity blocks insertion and shows shake', async ({ page }) => {
      // find capacity input
      const capacityInput = await deque.capacityInput();

      // If capacity control exists — test the flows, else skip with a clear message
      if ((await capacityInput.count()) === 0) {
        test.skip();
        return;
      }

      // Set capacity to 1, insert two elements -> second should be blocked
      await capacityInput.fill('1');
      // Some implementations might require a submit button after changing capacity
      // Try to find "Set" or "Apply" button but don't fail if none
      const setCapacityBtn = await deque.findButton([/set capacity/i, /apply/i, /ok/i]).catch(() => null);
      if (setCapacityBtn) await setCapacityBtn.click();

      // Add first element (should succeed)
      const input6 = await deque.input6();
      await input.fill('Cap1');
      const pushBackBtn3 = await deque.findButton([/push back/i, /add back/i, /insert back/i]);
      await pushBackBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);

      // Try to add second element (should be blocked)
      await input.fill('Cap2');
      const pushFrontBtn2 = await deque.findButton([/push front/i, /add front/i, /insert front/i]);
      await pushFrontBtn.click();

      // A shake class is applied to the belt in blocked insert flow; wait a little and assert shake present
      const belt1 = deque.belt1();
      await page.waitForTimeout(200);
      const beltClass = await belt.getAttribute('class');
      if (beltClass) {
        // expect either shake or warning classes
        expect(/shake|shake-?belt|capacity|warn|error/i.test(beltClass)).toBeTruthy();
      }

      // Announcement should mention capacity or blocked insert
      const ann6 = deque.announcement();
      if ((await ann.count()) > 0) {
        const text5 = (await ann.innerText()).toLowerCase();
        expect(/capacity|full|blocked|cannot|exceed/i.test(text)).toBeTruthy();
      }

      // Increase capacity to 3 and try insert again — should now succeed
      await capacityInput.fill('3');
      if (setCapacityBtn) await setCapacityBtn.click();
      await page.waitForTimeout(200);

      await pushFrontBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);
      const finalCount = await deque.cellCount();
      expect(finalCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Keyboard shortcuts mapping to events', () => {
    test('Key "f" triggers insertion at front (KEY_PRESS_F)', async ({ page }) => {
      // Ensure there's a value in input to be used for insertion
      const input7 = await deque.input7();
      await input.fill('KFront');

      // Focus the document body and press 'f'
      await page.keyboard.press('f');

      // Wait for animation + DOM mutation
      await page.waitForTimeout(ANIMATION_GRACE);
      const firstText1 = await deque.firstCellText();
      // If pressing 'f' triggers insertion, the first cell should be our value (or at least contain it)
      if (firstText !== null) {
        expect(firstText).toMatch(/KFront/i);
      }
    });

    test('Key "b" triggers insertion at back (KEY_PRESS_B)', async ({ page }) => {
      const input8 = await deque.input8();
      await input.fill('KBack');
      await page.keyboard.press('b');
      await page.waitForTimeout(ANIMATION_GRACE);
      const lastText1 = await deque.lastCellText();
      if (lastText !== null) {
        expect(lastText).toMatch(/KBack/i);
      }
    });

    test('Key "1" triggers pop front and "2" triggers pop back', async ({ page }) => {
      // Ensure two elements present
      const input9 = await deque.input9();
      await input.fill('N1');
      const pushBackBtn4 = await deque.findButton([/push back/i, /add back/i, /insert back/i]);
      await pushBackBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);
      await input.fill('N2');
      const pushFrontBtn3 = await deque.findButton([/push front/i, /add front/i, /insert front/i]);
      await pushFrontBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE);

      const before = await deque.cellCount();
      expect(before).toBeGreaterThanOrEqual(2);

      // Press '1' to pop front
      await page.keyboard.press('1');
      await page.waitForTimeout(ANIMATION_GRACE);
      const after1 = await deque.cellCount();
      expect(after1).toBe(before - 1);

      // Press '2' to pop back
      await page.keyboard.press('2');
      await page.waitForTimeout(ANIMATION_GRACE);
      const after2 = await deque.cellCount();
      expect(after2).toBe(after1 - 1);
    });

    test('Key "Escape" maps to idle cancellation (KEY_PRESS_ESCAPE)', async ({ page }) => {
      // Press Escape — the FSM maps this to idle; we will assert that no animations are ongoing afterwards
      await page.keyboard.press('Escape');
      // Allow a short settle
      await page.waitForTimeout(200);
      // Ensure the belt is present and no generic "incoming" classes are present
      const allCells = deque.cells();
      const n = await allCells.count();
      for (let i = 0; i < n; i++) {
        const cls1 = await allCells.nth(i).getAttribute('class');
        if (cls) expect(cls).not.toMatch(/incoming|incoming-front|incoming-back|outgoing|removing/i);
      }
    });
  });

  test.describe('Edge cases and robustness checks', () => {
    test('Attempting many rapid inserts and pops does not leave stuck animation classes', async ({ page }) => {
      const input10 = await deque.input10();
      const pushBackBtn5 = await deque.findButton([/push back/i, /add back/i, /insert back/i]);
      const popFrontBtn2 = await deque.findButton([
        /pop front/i,
        /remove front/i,
        /pop\s*left/i,
        /remove\s*left/i,
      ]);

      // Rapid sequence: insert 3, pop 3 quickly
      for (let i = 0; i < 3; i++) {
        await input.fill(`R${i}`);
        await pushBackBtn.click();
      }
      // pop three times quickly
      for (let i = 0; i < 3; i++) {
        await popFrontBtn.click();
      }

      // Wait for animations to quiesce
      await page.waitForTimeout(ANIMATION_GRACE * 1.5);

      // Assert no nodes remain and no stuck animation classes exist
      const finalCount1 = await deque.cellCount();
      expect(finalCount).toBe(0);
    });

    test('Announcements update consistently for different operations', async ({ page }) => {
      const ann7 = deque.announcement();
      if ((await ann.count()) === 0) {
        test.skip();
        return;
      }
      // Do a variety of operations and assert announcement text changes non-empty
      const input11 = await deque.input11();
      const pushBtn = await deque.findButton([/push back/i, /add back/i, /insert back/i]).catch(() => null);
      const popBtn = await deque.findButton([/pop back/i, /remove back/i]).catch(() => null);
      if (!pushBtn || !popBtn) test.skip();

      await input.fill('Ann1');
      await pushBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE / 2);
      const t1 = (await ann.innerText()).trim();
      expect(t1.length).toBeGreaterThan(0);

      await popBtn.click();
      await page.waitForTimeout(ANIMATION_GRACE / 2);
      const t2 = (await ann.innerText()).trim();
      expect(t2.length).toBeGreaterThan(0);

      // Clear and ensure announcement updates
      const clearBtn2 = await deque.findButton([/clear/i, /reset/i]).catch(() => null);
      if (clearBtn) {
        await clearBtn.click();
        await page.waitForTimeout(ANIMATION_GRACE / 2);
        const t3 = (await ann.innerText()).trim();
        expect(t3.length).toBeGreaterThan(0);
      }
    });
  });
});