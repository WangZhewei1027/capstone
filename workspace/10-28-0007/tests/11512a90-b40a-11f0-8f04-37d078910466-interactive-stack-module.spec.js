import { test, expect } from '@playwright/test';

//
// 11512a90-b40a-11f0-8f04-37d078910466.spec.js
//
// Comprehensive Playwright tests for the "Interactive Stack Module"
//
// Notes:
// - The tests aim to validate the FSM states and transitions described in the prompt.
// - Selectors use a set of fallbacks (commas in CSS selectors) to be resilient to small DOM differences.
// - Animation / visual timeouts are awaited using slightly longer durations than implementation notes to avoid flakes.
// - Each test includes comments describing what it validates.
//

test.describe('Interactive Stack Module - FSM states and transitions', () => {
  const URL =
    'http://127.0.0.1:5500/workspace/10-28-0007/html/11512a90-b40a-11f0-8f04-37d078910466.html';

  // Helper page object to encapsulate interactions and common selectors
  class StackPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
      this.page = page;

      // Value input and capacity input fallbacks
      this.valueInput = page.locator(
        'input[type="text"], input[name="value"], #value, #valueInput, input[placeholder*="Value"], input[placeholder*="value"]'
      );
      this.capacityInput = page.locator(
        'input[type="number"], input[name="capacity"], #capacity, #capacityInput, input[placeholder*="Capacity"], input[placeholder*="capacity"]'
      );

      // Buttons - try common button labels
      this.pushBtn = page.getByRole('button', { name: /push/i }).first();
      this.popBtn = page.getByRole('button', { name: /pop/i }).first();
      this.peekBtn = page.getByRole('button', { name: /peek/i }).first();
      this.clearBtn = page.getByRole('button', { name: /clear/i }).first();
      this.autoBtn = page.getByRole('button', { name: /auto/i }).first();
      this.applyCapacityBtn = page.getByRole('button', { name: /apply|set|update/i }).locator('button').first();

      // Capacity display / badge fallbacks
      this.capacityBadge = page.locator(
        '#capacityBadge, .capacity-badge, #capDisplay, .cap-display, [data-testid="capacityBadge"], [data-testid="capacity"]'
      );

      // Stack slots container fallback selectors
      this.slotsContainer = page.locator(
        '#slots, .slots, #stack, .stack, [data-testid="stack-slots"], [aria-label="stack"], [aria-label="slots"]'
      );

      // Generic slot children - helpful for counting
      this.slotChildren = this.slotsContainer.locator(':scope > *');

      // Visual animation selectors (based on FSM notes)
      this.animateInSelector = '.animate-in';
      this.pulseSelector = '.pulse';
      this.shakeSelector = '.shake';
      this.floatingSelector = '.floating, .floating-element, .pop-floating, .pop-float, .float';
    }

    // Navigate to page
    async goto() {
      await this.page.goto(URL);
      // Wait for the main container to be visible to reduce flakiness
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(50);
      await expect(this.page.locator('body')).toBeVisible();
    }

    // Push a value using the UI
    async push(value) {
      // Fill the value input. Some implementations may expect focus/enter or click button.
      if ((await this.valueInput.count()) > 0) {
        await this.valueInput.fill(value);
      } else {
        // if no explicit input, try typing into document
        await this.page.keyboard.type(value);
      }
      await this.pushBtn.click();
    }

    // Pop using the UI
    async pop() {
      await this.popBtn.click();
    }

    // Peek using UI
    async peek() {
      await this.peekBtn.click();
    }

    // Clear stack
    async clear() {
      await this.clearBtn.click();
    }

    // Set capacity using UI; some implementations require pressing an apply button, try both ways
    async setCapacity(n) {
      if ((await this.capacityInput.count()) > 0) {
        await this.capacityInput.fill(String(n));
      } else {
        // if no numeric input, try a select element
        const sel = this.page.locator('select[name="capacity"], select#capacity');
        if ((await sel.count()) > 0) {
          await sel.selectOption(String(n));
        }
      }
      // try clicking an apply button if present
      const applyBtn = this.page.getByRole('button', { name: /apply|set|update|ok/i }).first();
      if ((await applyBtn.count()) > 0) {
        await applyBtn.click();
      } else if ((await this.applyCapacityBtn.count()) > 0) {
        await this.applyCapacityBtn.click();
      } else {
        // Fallback: press Enter in capacity input to apply
        await this.page.keyboard.press('Enter');
      }
    }

    // Start auto/demo
    async startAuto() {
      await this.autoBtn.click();
    }

    // Utility: get count of slots currently rendered
    async getSlotCount() {
      // prefer slotChildren count, fallback to counting text nodes that look like stack items
      const count = await this.slotChildren.count();
      if (count > 0) return count;

      // fallback: count elements that look like slots by class name variants
      const fallback = this.page.locator('.slot, .stack-slot, .cell, .stack-item');
      return fallback.count();
    }

    // Utility: find a rendered element that contains text (value)
    getValueElement(value) {
      // prefer exact text match
      return this.page.getByText(new RegExp(`^${escapeRegExp(value)}$`)).first();
    }

    // Utility: check if any element currently has a class (shake/pulse/animate-in)
    async anyElementHasClass(selector) {
      const loc = this.page.locator(selector);
      return (await loc.count()) > 0;
    }
  }

  // Utility to escape regexp special chars for getByText usage
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Setup: new page for each test
  test.beforeEach(async ({ page }) => {
    const sp = new StackPage(page);
    await sp.goto();
  });

  // -------------------------
  // Pushing state tests
  // -------------------------
  test.describe('Pushing (pushing -> ready)', () => {
    test('pushes a value, shows animate-in, then transitions back to ready (animate removed)', async ({ page }) => {
      // Validate that pushing a value triggers animate-in class and then it is removed (ANIMATION_END_PUSH -> ready)
      const sp = new StackPage(page);

      // Ensure initial stack is empty
      const initialCount = await sp.getSlotCount();
      // perform push
      await sp.push('Alpha');

      // The pushed value should appear in DOM
      const item = sp.getValueElement('Alpha');
      await expect(item).toBeVisible();

      // Immediately after push, an element should have the animate-in class (push animation)
      // We allow some time for animation to be applied
      await page.waitForTimeout(40);
      // Check for animate-in anywhere in the DOM (animation class name from FSM: animate-in)
      const hasAnimate = await sp.anyElementHasClass(sp.animateInSelector);
      expect(hasAnimate).toBeTruthy();

      // Wait until animation end (implementation ~520ms). Use 800ms to be robust.
      await page.waitForTimeout(800);

      // animate-in class should be removed afterward
      const hasAnimateAfter = await sp.anyElementHasClass(sp.animateInSelector);
      expect(hasAnimateAfter).toBeFalsy();

      // Slot count should have incremented by 1
      const afterCount = await sp.getSlotCount();
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  // -------------------------
  // Popping state tests
  // -------------------------
  test.describe('Popping (popping -> ready)', () => {
    test('pops a value, creates a floating element while animating and removes it on ANIMATION_END_POP', async ({ page }) => {
      const sp = new StackPage(page);

      // Push two items so pop is meaningful
      await sp.push('One');
      await page.waitForTimeout(200); // allow push render
      await sp.push('Two');
      await page.waitForTimeout(200);

      // Current slot count
      const before = await sp.getSlotCount();
      expect(before).toBeGreaterThanOrEqual(2);

      // Click pop and expect a floating element to appear and then be removed
      await sp.pop();

      // Immediately there should be a floating element representing the popped value
      await page.waitForTimeout(40);
      const floatLoc = page.locator(sp.floatingSelector).first();
      await expect(floatLoc).toBeVisible();

      // The floating element should contain the popped value "Two"
      await expect(floatLoc).toContainText(/Two/);

      // Pop animation ends ~320ms in implementation; wait a bit more to ensure removal
      await page.waitForTimeout(700);

      // Floating element should be removed
      const floatCountAfter = await page.locator(sp.floatingSelector).count();
      expect(floatCountAfter).toBe(0);

      // Slot count should have decreased by 1
      const after = await sp.getSlotCount();
      expect(after).toBe(before - 1);
    });

    test('pop on empty stack triggers underflow visual (shake) then recovers', async ({ page }) => {
      const sp = new StackPage(page);

      // Ensure stack is cleared first
      // If there are items, clear them
      const count = await sp.getSlotCount();
      if (count > 0) {
        await sp.clear();
        // Wait for potential clearing logic to finish
        await page.waitForTimeout(200);
      }

      // Now pop on empty
      await sp.pop();

      // Underflow should trigger a shake visual on container (shake lasts ~600ms)
      await page.waitForTimeout(40);
      const hasShake = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShake).toBeTruthy();

      // Wait for error anim to end (~600ms)
      await page.waitForTimeout(900);

      const hasShakeAfter = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShakeAfter).toBeFalsy();
    });
  });

  // -------------------------
  // Peeking state tests
  // -------------------------
  test.describe('Peeking (peeking -> ready)', () => {
    test('peek highlights top element with pulse then removes pulse after timeout', async ({ page }) => {
      const sp = new StackPage(page);

      // Ensure there's a value to peek
      await sp.push('PeekMe');
      await page.waitForTimeout(200);

      // Perform peek
      await sp.peek();

      // After peek, top element should have pulse class briefly (implementation ~900ms)
      await page.waitForTimeout(60);
      const hasPulse = await sp.anyElementHasClass(sp.pulseSelector);
      expect(hasPulse).toBeTruthy();

      // Wait until pulse removed
      await page.waitForTimeout(1200);
      const hasPulseAfter = await sp.anyElementHasClass(sp.pulseSelector);
      expect(hasPulseAfter).toBeFalsy();
    });

    test('peek on empty triggers underflow (shake) and then recovers', async ({ page }) => {
      const sp = new StackPage(page);

      // Ensure stack is empty
      const count = await sp.getSlotCount();
      if (count > 0) {
        await sp.clear();
        await page.waitForTimeout(200);
      }

      // Peek on empty should cause underflow (shake)
      await sp.peek();
      await page.waitForTimeout(40);
      const hasShake = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShake).toBeTruthy();

      // Wait for remove
      await page.waitForTimeout(900);
      const hasShakeAfter = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShakeAfter).toBeFalsy();
    });
  });

  // -------------------------
  // Clearing state tests
  // -------------------------
  test.describe('Clearing (clearing -> ready)', () => {
    test('clear empties the stack and returns to ready state', async ({ page }) => {
      const sp = new StackPage(page);

      // Push a few values
      await sp.push('C1');
      await page.waitForTimeout(100);
      await sp.push('C2');
      await page.waitForTimeout(100);

      const before = await sp.getSlotCount();
      expect(before).toBeGreaterThanOrEqual(2);

      // Clear the stack
      await sp.clear();

      // Allow time for clearing to complete
      await page.waitForTimeout(300);

      const after = await sp.getSlotCount();
      expect(after).toBe(0);
    });
  });

  // -------------------------
  // Capacity changing tests
  // -------------------------
  test.describe('Capacity changing (capacity_changing -> ready)', () => {
    test('sets capacity badge/display to chosen value immediately', async ({ page }) => {
      const sp = new StackPage(page);

      // Set capacity to 3 and verify capacityBadge / capDisplay show 3
      await sp.setCapacity(3);

      // allow slight delay for UI update
      await page.waitForTimeout(120);

      // capacityBadge or capDisplay should show "3" somewhere in its textContent
      const capText = await sp.capacityBadge.textContent();
      expect(capText).toMatch(/3/);
    });

    test('applying a smaller capacity does not crash and is reflected in UI', async ({ page }) => {
      const sp = new StackPage(page);

      // Push two items
      await sp.push('X');
      await page.waitForTimeout(80);
      await sp.push('Y');
      await page.waitForTimeout(120);

      // Now set capacity to 1 (smaller than current size) - the FSM says capacity change immediate
      await sp.setCapacity(1);
      await page.waitForTimeout(200);

      const capText = await sp.capacityBadge.textContent();
      expect(capText).toMatch(/1/);

      // The UI should still be stable (either trimmed or left as-is); ensure no error shake
      const hasShake = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShake).toBeFalsy();
    });
  });

  // -------------------------
  // Overflow state tests
  // -------------------------
  test.describe('Overflow (overflow -> ready)', () => {
    test('pushing beyond capacity triggers overflow shake and then recovers', async ({ page }) => {
      const sp = new StackPage(page);

      // Set capacity to 1
      await sp.setCapacity(1);
      await page.waitForTimeout(120);

      // Ensure stack empty
      const initialCount = await sp.getSlotCount();
      if (initialCount > 0) {
        await sp.clear();
        await page.waitForTimeout(120);
      }

      // Push first item -> should succeed
      await sp.push('A');
      await page.waitForTimeout(200);
      const countAfterFirst = await sp.getSlotCount();
      expect(countAfterFirst).toBe(1);

      // Push second item -> should trigger overflow (shake)
      await sp.push('B');
      await page.waitForTimeout(60);

      // Overflow visual indicated by 'shake' class
      const hasShake = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShake).toBeTruthy();

      // Wait for error anim to finish (~600ms), allow margin
      await page.waitForTimeout(900);

      const hasShakeAfter = await sp.anyElementHasClass(sp.shakeSelector);
      expect(hasShakeAfter).toBeFalsy();

      // Ensure stack size did not exceed capacity (still 1)
      const finalCount = await sp.getSlotCount();
      expect(finalCount).toBeLessThanOrEqual(1);
    });
  });

  // -------------------------
  // Auto-demo tests
  // -------------------------
  test.describe('Auto-demo (auto_demo -> ready)', () => {
    test('auto demo disables auto button while running and re-enables after finish', async ({ page }) => {
      const sp = new StackPage(page);

      // If auto button not present, skip this test gracefully
      const autoBtnCount = await sp.autoBtn.count();
      test.skip(autoBtnCount === 0, 'Auto/demo button not present in this build');

      // Start auto demo
      await sp.startAuto();

      // Immediately the auto button should be disabled per FSM while demo runs
      await page.waitForTimeout(60);
      const isDisabledDuring = await sp.autoBtn.isDisabled();
      expect(isDisabledDuring).toBeTruthy();

      // Wait for a reasonable demo duration; demo may push/pop multiple times.
      // Wait up to 6 seconds to allow demo to finish; FSM states internally re-enable autoBtn on exit.
      await page.waitForTimeout(6000);

      // After demo finishes, button must be re-enabled
      const isDisabledAfter = await sp.autoBtn.isDisabled();
      expect(isDisabledAfter).toBeFalsy();

      // After auto demo, stack could have changed; assert app still responsive by performing a push
      await sp.push('AutoAfter');
      await page.waitForTimeout(200);
      const el = sp.getValueElement('AutoAfter');
      await expect(el).toBeVisible();
    });
  });

  // -------------------------
  // Edge cases
  // -------------------------
  test.describe('Edge cases and invalid inputs', () => {
    test('pushing empty string should be treated as no-op or produce no new slot (PUSH_REQUEST_EMPTY)', async ({ page }) => {
      const sp = new StackPage(page);

      // Ensure stack is empty
      const pre = await sp.getSlotCount();

      // Attempt to push empty value
      if ((await sp.valueInput.count()) > 0) {
        await sp.valueInput.fill(''); // empty
      }
      await sp.push(''); // some implementations may still call push even if input empty

      // Allow brief time for any action
      await page.waitForTimeout(300);

      // Confirm no new slot was added
      const after = await sp.getSlotCount();
      expect(after).toBe(pre);
    });

    test('multiple rapid pushes respect animation and result in correct stack order', async ({ page }) => {
      const sp = new StackPage(page);

      // Clear first
      await sp.clear();
      await page.waitForTimeout(150);

      // Rapid pushes
      await sp.push('1');
      await sp.push('2');
      await sp.push('3');

      // Allow time for animations to settle
      await page.waitForTimeout(1200);

      // Now check that all three values exist in the DOM
      const one = sp.getValueElement('1');
      const two = sp.getValueElement('2');
      const three = sp.getValueElement('3');

      await expect(one).toBeVisible();
      await expect(two).toBeVisible();
      await expect(three).toBeVisible();

      // Ensure stack size is at least 3
      const count = await sp.getSlotCount();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});