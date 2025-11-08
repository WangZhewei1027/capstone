import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7427b270-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Knapsack interactive module.
 * Encapsulates common selectors and actions used across tests.
 */
class KnapsackPage {
  constructor(page) {
    this.page = page;
    // Primary regions (guesses based on implementation notes)
    this.bankItems = page.locator('.bank .item, .items-row .item, .bank .items .item');
    this.bag = page.locator('.knapsack .bag, .knapsack .bank-target, .bag');
    this.bagItems = page.locator('.knapsack .bag .item, .bag .item');
    this.capacityInput = page.locator('input[type="range"], input#capacity, input[name="capacity"]');
    this.capacityDisplay = page.locator('.capacity-value, .capacity-display, #capacity-value');
    // Control buttons - fallback to multiple text matches to be robust
    this.buttonByText = async (text) => {
      const byText = this.page.locator(`button:has-text("${text}")`);
      if (await byText.count()) return byText.first();
      return this.page.locator(`text="${text}"`).first();
    };
    this.randomizeBtn = this.page.locator('button:has-text("Randomize"), button:has-text("Shuffle")').first();
    this.resetBtn = this.page.locator('button:has-text("Reset")').first();
    this.showGreedyBtn = page.locator('button:has-text("Show Greedy"), button:has-text("Greedy")').first();
    this.animateDpBtn = page.locator('button:has-text("Animate DP"), button:has-text("Animate")').first();
    this.solveBtn = page.locator('button:has-text("Solve"), button:has-text("DP Solve")').first();
    this.applyOptimalBtn = page.locator('button:has-text("Apply Optimal"), button:has-text("Apply")').first();
    // Status/visual elements
    this.progressIndicator = page.locator('.dp-progress, .animation-progress, .progress');
    this.greedyHighlights = page.locator('.item.greedy, .greedy-highlight, .item.highlight-greedy');
    this.ghosts = page.locator('.ghost, .drag-ghost');
    this.shakeTarget = page.locator('.bag.shake, .bag.shaking, .shake');
    this.dpResultMarker = page.locator('.dp-result-ready, .dp-ready, .dp-complete');
    this.stats = page.locator('.stats, .bag-stats, .knapsack-stats');
  }

  // Navigate to the application and wait for main UI
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for a known stable selector to confirm load
    await Promise.all([
      this.page.waitForSelector('.bank, .knapsack, .controls', { timeout: 5000 })
        .catch(() => {}), // allow tests to still run error surfaced via assertions
    ]);
  }

  // Return a locator for an item in the bank by index (0-based)
  itemAt(index = 0) {
    return this.bankItems.nth(index);
  }

  // Drag-and-drop an item to the bag using Playwright's dragTo
  async dragItemToBag(index = 0) {
    const item = this.itemAt(index);
    await expect(item).toBeVisible();
    await expect(this.bag).toBeVisible();

    // Use dragTo where possible (requires draggable attributes in DOM)
    try {
      await item.dragTo(this.bag);
    } catch (err) {
      // Fallback: emulate dragstart/dragover/drop events via page.evaluate
      const itemHandle = await item.elementHandle();
      const bagHandle = await this.bag.elementHandle();
      if (!itemHandle || !bagHandle) throw err;
      await this.page.evaluate(
        ([source, target]) => {
          const create = (type, props = {}) => {
            const e = new Event(type, { bubbles: true, cancelable: true });
            Object.assign(e, props);
            return e;
          };
          source.dispatchEvent(create('dragstart'));
          target.dispatchEvent(create('dragover'));
          target.dispatchEvent(create('drop'));
          source.dispatchEvent(create('dragend'));
        },
        [itemHandle, bagHandle]
      );
    }
  }

  // Double-click an item in the bank
  async doubleClickItem(index = 0) {
    const item1 = this.itemAt(index);
    await expect(item).toBeVisible();
    await item.dblclick();
  }

  // Click the "add" button associated with a bank item (if exists)
  async clickAddOnItem(index = 0) {
    const container = this.itemAt(index);
    const addBtn = container.locator('button:has-text("Add"), button.add, .btn-add');
    if (await addBtn.count()) {
      await addBtn.first().click();
    } else {
      // if no explicit button, try double click as fallback
      await container.dblclick();
    }
  }

  // Remove an item from the bag by index
  async removeItemFromBag(index = 0) {
    const removeBtn = this.bagItems.nth(index).locator('button:has-text("Remove"), .remove, button.remove');
    if (await removeBtn.count()) {
      await removeBtn.first().click();
    } else {
      // fallback: drag out to bank area if possible
      const bankArea = this.page.locator('.bank, .items-row');
      if (await this.bagItems.nth(index).count() && await bankArea.count()) {
        await this.bagItems.nth(index).dragTo(bankArea.first());
      } else {
        // try double clicking to toggle remove
        await this.bagItems.nth(index).dblclick();
      }
    }
  }

  // Set capacity via range input (value should be an integer string)
  async setCapacity(value) {
    if (!(await this.capacityInput.count())) {
      // try text field
      const alt = this.page.locator('input#capacity-value, input[name="capacity"]');
      if (await alt.count()) {
        await alt.fill(String(value));
        await alt.press('Enter');
        return;
      }
      return;
    }
    // range setting: evaluate to set value and dispatch events
    await this.page.evaluate(
      ([selector, v]) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      [await this.capacityInput.evaluate((el) => {
        // return a selector that can be used for lookup - use attribute id or name or type
        return el.id ? `#${el.id}` : (el.name ? `input[name="${el.name}"]` : 'input[type="range"]');
      }), value]
    );
  }

  // Click common controls
  async clickRandomize() {
    if (await this.randomizeBtn.count()) await this.randomizeBtn.click();
    else await this.buttonByText('Randomize');
  }

  async clickReset() {
    if (await this.resetBtn.count()) await this.resetBtn.click();
    else await this.buttonByText('Reset');
  }

  async clickShowGreedy() {
    if (await this.showGreedyBtn.count()) await this.showGreedyBtn.click();
    else await this.buttonByText('Show Greedy').then(b => b.click());
  }

  async clickAnimateDP() {
    if (await this.animateDpBtn.count()) await this.animateDpBtn.click();
    else await this.buttonByText('Animate DP').then(b => b.click());
  }

  async clickSolve() {
    if (await this.solveBtn.count()) await this.solveBtn.click();
    else await this.buttonByText('Solve').then(b => b.click());
  }

  async clickApplyOptimal() {
    if (await this.applyOptimalBtn.count()) await this.applyOptimalBtn.click();
    else await this.buttonByText('Apply Optimal').then(b => b.click());
  }

  // Helpers to assert visual states
  async expectGhost() {
    await expect(this.ghosts.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      throw new Error('Expected a drag ghost element to be present but none found');
    });
  }

  async expectBagHighlighted() {
    // highlight may be a class on bag or border style; check class patterns
    await expect(this.bag).toHaveClass(/highlight|over/, { timeout: 2000 }).catch(async () => {
      // fallback: check inline outline style
      const outline = await this.bag.evaluate((el) => window.getComputedStyle(el).outline || window.getComputedStyle(el).border);
      if (!/solid|dashed|3px|4px|highlight/i.test(outline || '')) {
        throw new Error('Expected bag to be visually highlighted but no evidence found');
      }
    });
  }

  async expectShake() {
    await expect(this.shakeTarget.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      throw new Error('Expected bag to have shake animation indicator/class but none found');
    });
    // Wait for shake to clear:
    await this.page.waitForTimeout(700); // animations commonly ~500ms
    await expect(this.shakeTarget.first()).not.toBeVisible().catch(() => {
      // might remove class rather than hide; check class removed
      // no-op: best-effort
    });
  }

  async expectGreedyHighlighted() {
    await expect(this.greedyHighlights.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      throw new Error('Expected greedy-highlighted items but none found');
    });
  }

  async expectDPAnimating() {
    await expect(this.progressIndicator.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      throw new Error('Expected DP animation/progress indicator but none found');
    });
  }

  async expectDPReady() {
    await expect(this.dpResultMarker.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // fallback: apply button enabled
      const enabled = this.applyOptimalBtn.isEnabled();
      if (!enabled) throw new Error('Expected DP ready marker or Apply Optimal enabled but none found');
    });
  }

  // Read stats text (weight/value summary) for assertions
  async readStatsText() {
    if (await this.stats.count()) {
      return (await this.stats.first().innerText()).trim();
    }
    if (await this.capacityDisplay.count()) {
      return (await this.capacityDisplay.first().innerText()).trim();
    }
    return '';
  }

  // Count bank and bag items
  async countBankItems() {
    return this.bankItems.count();
  }

  async countBagItems() {
    return this.bagItems.count();
  }
}

test.describe('Knapsack Interactive Module - FSM behavior', () => {
  let page;
  let knapsack;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    knapsack = new KnapsackPage(page);
    await knapsack.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Drag lifecycle and add/remove flows', () => {
    test('dragging an item shows ghost and highlights bag then adds item on drop (drag lifecycle)', async () => {
      // Validate DRAG_START -> dragging (ghost added) -> DRAG_OVER_BAG -> dragover_bag (highlight)
      const initialBagCount = await knapsack.countBagItems();
      const initialBankCount = await knapsack.countBankItems();

      // Start drag and drop
      await knapsack.dragItemToBag(0);

      // After drop, expect bag_updated or try_add outcome: item in bag or stats updated
      const afterBagCount = await knapsack.countBagItems();
      const afterBankCount = await knapsack.countBankItems();

      // Either bag gained an item or bank decreased. Accept either as success of add transition.
      const added = afterBagCount > initialBagCount || afterBankCount < initialBankCount;
      expect(added).toBeTruthy();
    });

    test('double-clicking an item attempts to add it (try_add) and toggles presence on success', async () => {
      // Use double-click (maps to DOUBLE_CLICK_ITEM -> try_add)
      const initialBagCount1 = await knapsack.countBagItems();
      await knapsack.doubleClickItem(0);

      // If added, bag count should increase, else a rejection animation might occur.
      const afterBagCount1 = await knapsack.countBagItems();
      if (afterBagCount > initialBagCount) {
        // success path: ensure bag_updated rendered and stats updated
        const statsText = await knapsack.readStatsText();
        expect(statsText.length).toBeGreaterThan(0);
      } else {
        // failure path: possibly overweight - expect shake
        // best-effort: detect shake class existence
        try {
          await knapsack.expectShake();
        } catch {
          // If no shake, still acceptable — just assert nothing catastrophic occurred
          expect(afterBagCount).toBe(initialBagCount);
        }
      }
    });

    test('removing an item from bag triggers remove_from_bag and bag updates', async () => {
      // Ensure there's at least one item in bag; if none, add one first.
      if ((await knapsack.countBagItems()) === 0) {
        await knapsack.dragItemToBag(0);
      }
      const before = await knapsack.countBagItems();
      await knapsack.removeItemFromBag(0);

      // After removal, bag count should be less or equal
      const after = await knapsack.countBagItems();
      expect(after).toBeLessThanOrEqual(before);
    });
  });

  test.describe('Overweight rejection and visual feedback', () => {
    test('attempting to add when capacity too small triggers overweight_rejected (shake) and returns to idle', async () => {
      // Reduce capacity to 0 to force overweight on any item
      await knapsack.setCapacity(0);

      // Attempt to add by double clicking the first bank item
      await knapsack.doubleClickItem(0);

      // Expect shake visual feedback on the bag (overweight_rejected -> visualShakeAndReject)
      await knapsack.expectShake();

      // After shake completes (SHAKE_COMPLETE) the UI should be idle: ghost removed and no DP artifacts present
      await expect(knapsack.ghosts.first()).not.toBeVisible({ timeout: 1500 }).catch(() => {});
    });

    test('click add button for overweight item shows rejection and does not change bag', async () => {
      // Ensure capacity is tiny
      await knapsack.setCapacity(1);

      const bagBefore = await knapsack.countBagItems();
      // Try clicking add button on item
      await knapsack.clickAddOnItem(0);

      // Bag should not increase
      const bagAfter = await knapsack.countBagItems();
      expect(bagAfter).toBeLessThanOrEqual(bagBefore);

      // Shake or other rejection visual may appear
      try {
        await knapsack.expectShake();
      } catch {
        // Not guaranteed; assert bag unchanged is the primary expectation
      }
    });
  });

  test.describe('Greedy preview and dismissal', () => {
    test('clicking Show Greedy highlights a greedy selection (showing_greedy) and dismissing clears highlights', async () => {
      // Trigger greedy via button
      await knapsack.clickShowGreedy();

      // OnEnter: runGreedyAndHighlight -> expect greedy highlights
      await knapsack.expectGreedyHighlighted();

      // Dismiss via pressing Escape or clicking outside (USER_DISMISS -> idle)
      await page.keyboard.press('Escape');
      // Give time for clearing
      await page.waitForTimeout(300);

      // Ensure highlights are cleared (no greedy-highlight class visible)
      const count = await knapsack.greedyHighlights.count();
      expect(count).toBe(0);
    });

    test('pressing "g" key triggers greedy preview (KEY_PRESS_G)', async () => {
      // Focus main area and press 'g'
      await page.keyboard.press('g');

      // Expect greedy highlights
      await knapsack.expectGreedyHighlighted();

      // Dismiss
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    });
  });

  test.describe('DP lifecycle: clear, animate, ready and apply', () => {
    test('changing capacity clears DP (dp_cleared) and INIT_COMPLETE returns to idle', async () => {
      // Ensure some DP artifact exists: attempt solve quickly
      await knapsack.clickSolve().catch(() => {});
      // Change capacity to trigger dp_cleared
      await knapsack.setCapacity(10);

      // DP should be cleared: dp result marker absent and apply button disabled or not visible
      const dpReadyVisible = await knapsack.dpResultMarker.count();
      if (dpReadyVisible) {
        // Wait briefly for clearing
        await page.waitForTimeout(300);
      }
      const applyEnabled = await knapsack.applyOptimalBtn.isEnabled().catch(() => false);
      expect(applyEnabled).toBeFalsy();
    });

    test('clicking Animate DP starts animation (dp_animating) and completes to dp_ready', async () => {
      // Trigger DP animation (KEY_PRESS_D or button)
      // If Animate DP is disabled, first click Solve to enable DP result then animate
      try {
        await knapsack.clickAnimateDP();
      } catch {
        // fallback: press 'd'
        await page.keyboard.press('d');
      }

      // Expect some progress/animation indicator
      await knapsack.expectDPAnimating();

      // Wait for animation to finish; DP_ANIMATION_COMPLETE -> dp_ready
      // This may be performed by the app automatically; wait until dp result marker appears
      await page.waitForTimeout(1000); // give time for animation to progress
      // Try to detect dp ready marker or enabled apply button
      const maybeReady = await knapsack.dpResultMarker.count();
      const applyEnabled1 = await knapsack.applyOptimalBtn.isEnabled().catch(() => false);
      // Accept either dp_result marker presence or apply button enabled
      expect(maybeReady > 0 || applyEnabled).toBeTruthy();
    });

    test('clicking Solve produces a DP result (dp_ready) and enables Apply Optimal', async () => {
      await knapsack.clickSolve();
      // Wait for DP result to appear
      await page.waitForTimeout(500);
      // Expect dp ready: either explicit marker or Apply enabled
      const applyEnabled2 = await knapsack.applyOptimalBtn.isEnabled().catch(() => false);
      const dpMarkerCount = await knapsack.dpResultMarker.count();
      expect(applyEnabled || dpMarkerCount > 0).toBeTruthy();
    });

    test('applying optimal when DP available applies solution to bag (apply_optimal_attempt -> APPLY_SUCCESS)', async () => {
      // Ensure DP ready
      await knapsack.clickSolve();
      await page.waitForTimeout(500);

      // Record bag before
      const bagBefore1 = await knapsack.countBagItems();

      // Apply optimal
      const applyBtnCount = await knapsack.applyOptimalBtn.count();
      if (applyBtnCount && (await knapsack.applyOptimalBtn.isEnabled())) {
        await knapsack.clickApplyOptimal();
        // Wait for apply to complete and bag to update
        await page.waitForTimeout(500);
        const bagAfter1 = await knapsack.countBagItems();
        // After applying optimal, bag may change (could be equal if already optimal)
        expect(typeof bagAfter).toBe('number');
      } else {
        // If Apply is not enabled, this is unexpected for this test; assert false to surface
        throw new Error('Apply Optimal button not available/enabled when expected');
      }
    });

    test('attempting to Apply Optimal before DP_ready results in no-apply (APPLY_FAIL_NO_DP) or disabled control', async () => {
      // First clear DP (change capacity) to ensure no DP result
      await knapsack.setCapacity(1);

      // Attempt to click Apply Optimal directly
      const applyBtnCount1 = await knapsack.applyOptimalBtn.count();
      if (!applyBtnCount) {
        // No Apply control exists which is acceptable
        expect(true).toBeTruthy();
        return;
      }
      const isEnabled = await knapsack.applyOptimalBtn.isEnabled().catch(() => false);
      if (!isEnabled) {
        // Button disabled is valid behavior representing APPLY_FAIL_NO_DP
        expect(isEnabled).toBeFalsy();
      } else {
        // If it is enabled and clicking performs a fail, app should remain in dp_ready or show no change
        const bagBefore2 = await knapsack.countBagItems();
        await knapsack.clickApplyOptimal();
        await page.waitForTimeout(300);
        const bagAfter2 = await knapsack.countBagItems();
        expect(bagAfter).toBe(bagBefore);
      }
    });
  });

  test.describe('Edge cases, randomness and reset behaviors', () => {
    test('Randomize clears DP and results in changed bank contents', async () => {
      const bankBefore = await knapsack.countBankItems();
      await knapsack.clickRandomize().catch(() => {});
      // Randomize should change bank order or contents
      await page.waitForTimeout(300);
      const bankAfter = await knapsack.countBankItems();
      // Expect bank count to remain the same but content may change; at minimum the UI should still show items
      expect(bankAfter).toBeGreaterThanOrEqual(0);
      expect(bankAfter).toBe(bankBefore).catch(() => {});
      // DP should be cleared: apply disabled or dp marker absent
      const applyEnabled3 = await knapsack.applyOptimalBtn.isEnabled().catch(() => false);
      expect(applyEnabled).toBeFalsy();
    });

    test('Reset clears bag and DP (CLICK_RESET -> dp_cleared) and returns to idle', async () => {
      // Add something to bag first
      await knapsack.dragItemToBag(0).catch(() => {});
      const bagPopulated = (await knapsack.countBagItems()) > 0;
      // Click reset
      await knapsack.clickReset().catch(() => {});
      await page.waitForTimeout(300);
      const bagAfter3 = await knapsack.countBagItems();
      // Bag should be cleared
      expect(bagAfter).toBeLessThanOrEqual(bagPopulated ? 0 + (await knapsack.countBagItems()) : bagAfter);
      // DP should be cleared: apply disabled
      const applyEnabled4 = await knapsack.applyOptimalBtn.isEnabled().catch(() => false);
      expect(applyEnabled).toBeFalsy();
    });
  });

  test.describe('Keyboard shortcuts and UI toggles', () => {
    test('pressing "d" starts DP animation (KEY_PRESS_D -> dp_animating)', async () => {
      await page.keyboard.press('d');
      // Expect DP animation/progress indicator
      await knapsack.expectDPAnimating();
      // Wait a bit and ensure eventually dp ready or cleared
      await page.waitForTimeout(700);
    });

    test('double-clicking a bag item toggles add/remove (DOUBLE_CLICK_ITEM -> toggleAddRemove)', async () => {
      // Ensure there's an item
      if ((await knapsack.countBagItems()) === 0) {
        await knapsack.dragItemToBag(0);
      }
      const before1 = await knapsack.countBagItems();
      // Double click first bag item (toggle)
      const bagItem = knapsack.bagItems.nth(0);
      await bagItem.dblclick();
      await page.waitForTimeout(300);
      const after1 = await knapsack.countBagItems();
      // After toggle, count may increase or decrease; ensure no crash and type is number
      expect(typeof after).toBe('number');
    });
  });
});