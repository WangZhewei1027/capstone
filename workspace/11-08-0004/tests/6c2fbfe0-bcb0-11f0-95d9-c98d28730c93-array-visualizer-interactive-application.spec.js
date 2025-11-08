import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6c2fbfe0-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object encapsulating common interactions and resilient selectors
class ArrayPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  // Resilient button finder by visible name (case-insensitive)
  buttonByName(name) {
    // Try accessible role first, fall back to button by exact text
    return this.page.getByRole('button', { name: new RegExp(name, 'i') });
  }

  // Resilient input finder: by label text or placeholder or input[type=text] fallback
  async inputByLabelOrPlaceholder(labelRegex) {
    const byLabel = this.page.getByLabel(new RegExp(labelRegex, 'i'));
    if (await byLabel.count() > 0) return byLabel;
    const byPlaceholder = this.page.locator(`input[placeholder*="${labelRegex}"]`);
    if (await byPlaceholder.count() > 0) return byPlaceholder.first();
    // fallback: any text input
    return this.page.locator('input[type="text"], input[type="number"]').first();
  }

  // Core control actions
  async push(value) {
    const input = await this.inputByLabelOrPlaceholder('value');
    await input.fill(String(value));
    await this.buttonByName('push').click();
  }

  async pop() {
    await this.buttonByName('pop').click();
  }

  async unshift(value) {
    const input1 = await this.inputByLabelOrPlaceholder('value');
    await input.fill(String(value));
    await this.buttonByName('unshift').click();
  }

  async shift() {
    await this.buttonByName('shift').click();
  }

  async set(index, value) {
    const indexInput = this.page.getByLabel(/index/i).first();
    if (await indexInput.count() === 0) {
      // fallback to any number input
      await this.page.locator('input[type="number"]').first().fill(String(index));
    } else {
      await indexInput.fill(String(index));
    }
    const valueInput = await this.inputByLabelOrPlaceholder('value');
    await valueInput.fill(String(value));
    await this.buttonByName('set').click();
  }

  async removeAt(index) {
    const indexInput1 = this.page.getByLabel(/index/i).first();
    if (await indexInput.count() === 0) {
      await this.page.locator('input[type="number"]').first().fill(String(index));
    } else {
      await indexInput.fill(String(index));
    }
    await this.buttonByName(/remove|delete|remove at/i).click();
  }

  async clear() {
    await this.buttonByName('clear').click();
  }

  async iterateToggle() {
    await this.buttonByName(/iterate|run|start/i).click();
  }

  async stepOnce() {
    await this.buttonByName(/step/i).click();
  }

  // Keyboard shortcuts: Ctrl/Cmd + Enter -> push, Ctrl/Cmd + Backspace -> pop
  async shortcutPush() {
    // Press Control+Enter (works on Linux/Windows). For Mac, Playwright maps Control to Command via modifiers if needed.
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.up('Control');
  }

  async shortcutPop() {
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.up('Control');
  }

  // Node accessors: nodes may be rendered as list items or custom elements. Use multiple fallbacks.
  nodesLocator() {
    // common patterns: .node, .array-item, li, [role="listitem"]
    return this.page.locator('.node, .array-node, .array-item, li, [role="listitem"]');
  }

  async nodeCount() {
    const locator = this.nodesLocator();
    return await locator.count();
  }

  async nodeTexts() {
    const locator1 = this.nodesLocator();
    const count = await locator.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await locator.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Highlighted nodes are likely to have .highlight class or attribute data-highlighted or aria-selected
  highlightedLocator() {
    return this.page.locator('.highlight, .node.highlight, .array-node.highlight, [data-highlighted], [aria-selected="true"]');
  }

  // Removing nodes use .removing class per FSM
  removingLocator() {
    return this.page.locator('.removing, .node.removing, .array-node.removing');
  }

  // Flash / op text: try to find element that shows last operation or flash message
  opDisplayLocator() {
    // try typical selectors
    return this.page.locator('.op, .operation, .op-display, #op, [data-op], .flash, .message').first();
  }

  async opText() {
    const op = this.opDisplayLocator();
    if (await op.count() === 0) return '';
    return (await op.innerText()).trim();
  }

  async opHasDanger() {
    const op1 = this.opDisplayLocator();
    if (await op.count() === 0) return false;
    const classList = await op.evaluate((el) => Array.from(el.classList));
    if (classList.some((c) => /danger|error|flash/i.test(c))) return true;
    // check computed color for danger-ish color (approx red)
    const color = await op.evaluate((el) => window.getComputedStyle(el).color);
    return /rgb\(.{0,}\b(1?5|2?[0-9]{2})\b.*\b(0|1?5|2?[0-9]{2})\b.*\b(0|1?5|2?[0-9]{2})\b/.test(color) || /255,/.test(color);
  }
}

test.describe('Array Visualizer — FSM behavior tests', () => {
  let page;
  let arrayPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    arrayPage = new ArrayPage(page);
    await page.goto(APP_URL);
    // wait a little for initial seed render (SEED_INIT -> idle) to complete
    await page.waitForTimeout(150);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial state: idle after seed render and array is visible', async () => {
    // Validate that the app loads and initial array nodes are present (SEED_INIT -> idle)
    const count1 = await arrayPage.nodeCount();
    // Expect at least 0 nodes (some implementations may start empty). If seeded, expect >0.
    expect(count).toBeGreaterThanOrEqual(0);
    // Operation display should exist and not be in danger state
    const opText = await arrayPage.opText();
    expect(opText.length).toBeGreaterThanOrEqual(0);
    const danger = await arrayPage.opHasDanger();
    expect(danger).toBeFalsy();
  });

  test.describe('Animating state tests (push/pop/shift/unshift/remove/clear)', () => {
    test('Push adds an item: insertion animation then settles to idle', async () => {
      const before = await arrayPage.nodeCount();
      // Use text input and Push button
      await arrayPage.push('X1');
      // During animating state, a new node may appear with no highlight yet or with an inserting animation.
      // Check node count is >= before (some implementations show the new node immediately)
      await page.waitForTimeout(50);
      const during = await arrayPage.nodeCount();
      expect(during).toBeGreaterThanOrEqual(before);
      // After animation expected to be finished quickly; ensure final count increased by 1
      await page.waitForTimeout(350); // allow any insertion animation to complete
      const after = await arrayPage.nodeCount();
      expect(after).toBe(before + 1);
      // Confirm the new node text appears in nodeTexts
      const texts1 = await arrayPage.nodeTexts();
      expect(texts.join(' ')).toContain('X1');
    });

    test('Pop removes last item using removal animation (~300ms) and transitions to idle', async () => {
      // Ensure there's at least one item; if empty, push one first
      if ((await arrayPage.nodeCount()) === 0) {
        await arrayPage.push('to-pop');
        await page.waitForTimeout(350);
      }
      const before1 = await arrayPage.nodeCount();
      // Trigger pop
      await arrayPage.pop();
      // Immediately after, removal animation class may be present
      await page.waitForTimeout(50);
      const removingCount = await arrayPage.removingLocator().count();
      // If implementation marks removing items, there should be >=1; but not required — just allow both possibilities
      expect(removingCount).toBeGreaterThanOrEqual(0);
      // Wait for animation end (~300ms) plus buffer
      await page.waitForTimeout(400);
      const after1 = await arrayPage.nodeCount();
      expect(after).toBe(Math.max(0, before - 1));
    });

    test('Unshift adds an item at the front and shifts layout (animating -> idle)', async () => {
      const beforeTexts = await arrayPage.nodeTexts();
      await arrayPage.unshift('U1');
      // After action, new node should appear at beginning (index 0)
      await page.waitForTimeout(350);
      const texts2 = await arrayPage.nodeTexts();
      expect(texts[0]).toContain('U1');
      // Ensure that previous items are still present after shift
      for (const t of beforeTexts) {
        if (t) expect(texts.join(' ')).toContain(t);
      }
    });

    test('Shift removes first item with removal animation (~300ms) and updates nodes', async () => {
      // Ensure there are at least two items so shift is meaningful
      if ((await arrayPage.nodeCount()) < 2) {
        await arrayPage.push('A');
        await page.waitForTimeout(350);
        await arrayPage.push('B');
        await page.waitForTimeout(350);
      }
      const beforeTexts1 = await arrayPage.nodeTexts();
      const beforeCount = beforeTexts.length;
      await arrayPage.shift();
      // Short wait for animation to start
      await page.waitForTimeout(80);
      // Wait for removal animation completion
      await page.waitForTimeout(350);
      const afterTexts = await arrayPage.nodeTexts();
      expect(afterTexts.length).toBe(beforeCount - 1);
      // The former second element should now be at index 0
      if (beforeTexts.length >= 2) {
        expect(afterTexts[0]).toContain(beforeTexts[1]);
      }
    });

    test('Remove at index triggers animation and removes correct node', async () => {
      // Ensure at least 3 items
      while ((await arrayPage.nodeCount()) < 3) {
        await arrayPage.push('N' + Math.random().toString(36).slice(2, 5));
        await page.waitForTimeout(200);
      }
      const textsBefore = await arrayPage.nodeTexts();
      const removeIndex = 1; // remove second element
      const valueToRemove = textsBefore[removeIndex];
      await arrayPage.removeAt(removeIndex);
      await page.waitForTimeout(350); // allow removal animation
      const textsAfter = await arrayPage.nodeTexts();
      expect(textsAfter.join(' ')).not.toContain(valueToRemove);
      expect(textsAfter.length).toBe(textsBefore.length - 1);
    });

    test('Clear empties the array (animating) and results in zero nodes', async () => {
      // Ensure array has items
      if ((await arrayPage.nodeCount()) === 0) {
        await arrayPage.push('c1');
        await page.waitForTimeout(200);
      }
      await arrayPage.clear();
      // Some implementations animate clearing; allow some time
      await page.waitForTimeout(400);
      const after2 = await arrayPage.nodeCount();
      expect(after).toBe(0);
    });
  });

  test.describe('Highlighting state tests (SET, STEP_ONCE)', () => {
    test('SET highlights a valid index and focuses it; highlight removed after ~700ms', async () => {
      // Ensure there's at least one element
      if ((await arrayPage.nodeCount()) === 0) {
        await arrayPage.push('s1');
        await page.waitForTimeout(200);
      }
      // Set index 0 to a new value -> highlighting state
      await arrayPage.set(0, 'SETVAL');
      // Immediately the item at index 0 should be highlighted
      await page.waitForTimeout(80);
      const highlighted = await arrayPage.highlightedLocator().count();
      expect(highlighted).toBeGreaterThanOrEqual(1);
      // Ensure the displayed text updated to new value
      const texts3 = await arrayPage.nodeTexts();
      expect(texts[0]).toContain('SETVAL');
      // After highlight duration (~700ms) it should be removed
      await page.waitForTimeout(800);
      const highlightedAfter = await arrayPage.highlightedLocator().count();
      expect(highlightedAfter).toBe(0);
    });

    test('STEP once produces a transient highlight without changing length', async () => {
      // Ensure multiple items
      while ((await arrayPage.nodeCount()) < 2) {
        await arrayPage.push('st' + Math.random().toString(36).slice(2, 4));
        await page.waitForTimeout(120);
      }
      const beforeCount1 = await arrayPage.nodeCount();
      await arrayPage.stepOnce();
      // Quick check for highlight existence
      await page.waitForTimeout(100);
      expect(await arrayPage.highlightedLocator().count()).toBeGreaterThanOrEqual(1);
      // Wait for highlight to end (700ms)
      await page.waitForTimeout(800);
      expect(await arrayPage.highlightedLocator().count()).toBe(0);
      // Ensure count unchanged
      const after3 = await arrayPage.nodeCount();
      expect(after).toBe(beforeCount);
    });
  });

  test.describe('Iterating state tests (ITERATE_TOGGLE, ITERATE_STEP, ITERATE_COMPLETE)', () => {
    test('Iterating toggles on, highlights nodes in order and completes then returns to idle', async () => {
      // Ensure several items
      while ((await arrayPage.nodeCount()) < 4) {
        await arrayPage.push('it' + Math.random().toString(36).slice(2, 4));
        await page.waitForTimeout(120);
      }
      const total = await arrayPage.nodeCount();
      // Start iterate
      await arrayPage.iterateToggle();
      // After starting, iterate button label likely changes to 'Stop' or similar; check that some change occurred
      await page.waitForTimeout(100);
      // Expect repeated highlights sequentially. We will sample highlights across time.
      let highlightedCounts = 0;
      for (let i = 0; i < total; i++) {
        // Wait for each step highlight (assume default speed >= 300ms)
        await page.waitForTimeout(350);
        if ((await arrayPage.highlightedLocator().count()) > 0) highlightedCounts++;
      }
      // After expected number of steps, iterate should complete and return to idle (button reverts)
      // Allow completion time
      await page.waitForTimeout(500);
      // Stop iteration if still running (defensive)
      await arrayPage.iterateToggle();
      expect(highlightedCounts).toBeGreaterThanOrEqual(1);
      // Ensure we're back to idle by checking no highlighted nodes
      await page.waitForTimeout(200);
      expect(await arrayPage.highlightedLocator().count()).toBe(0);
    }, 120000);

    test('During iterating, STEP_ONCE triggers a transient highlight (priority to highlighting state)', async () => {
      // Ensure multiple items
      while ((await arrayPage.nodeCount()) < 3) {
        await arrayPage.push('it2' + Math.random().toString(36).slice(2, 4));
        await page.waitForTimeout(120);
      }
      // Start iterate
      await arrayPage.iterateToggle();
      await page.waitForTimeout(150);
      // Trigger single step while iterating
      await arrayPage.stepOnce();
      // The app should highlight one node transiently
      await page.waitForTimeout(100);
      expect(await arrayPage.highlightedLocator().count()).toBeGreaterThanOrEqual(1);
      // Wait for it to clear and continue iterating
      await page.waitForTimeout(800);
      // Stop iterate to restore idle
      await arrayPage.iterateToggle();
      await page.waitForTimeout(200);
      expect(await arrayPage.highlightedLocator().count()).toBe(0);
    });
  });

  test.describe('Error state tests (invalid set, invalid pop/shift)', () => {
    test('Setting invalid index shows an error flash (danger) then reverts to idle', async () => {
      // Make array small
      await arrayPage.clear();
      await page.waitForTimeout(200);
      // Try to set index 5 on empty array => should show error
      await arrayPage.set(5, 'bad');
      // Wait a moment for flash
      await page.waitForTimeout(120);
      // Operation display should indicate danger / error
      const danger1 = await arrayPage.opHasDanger();
      expect(danger).toBeTruthy();
      // Wait for flash revert (~900ms)
      await page.waitForTimeout(1000);
      const dangerAfter = await arrayPage.opHasDanger();
      expect(dangerAfter).toBeFalsy();
    });

    test('Pop on empty array should be guarded; either no-op or show error flash', async () => {
      // Ensure empty
      await arrayPage.clear();
      await page.waitForTimeout(250);
      const before2 = await arrayPage.nodeCount();
      expect(before).toBe(0);
      await arrayPage.pop();
      // allow brief processing
      await page.waitForTimeout(120);
      const after4 = await arrayPage.nodeCount();
      // Either remains zero or shows error; assert no negative count and op display handled
      expect(after).toBe(0);
      // Optionally an error flash may show; accept either behavior
      // If error shown, it should clear after ~900ms
      const maybeDanger = await arrayPage.opHasDanger();
      if (maybeDanger) {
        await page.waitForTimeout(1000);
        expect(await arrayPage.opHasDanger()).toBeFalsy();
      }
    });
  });

  test.describe('Keyboard shortcuts and misc tests', () => {
    test('Keyboard shortcut Ctrl+Enter triggers PUSH', async () => {
      const before3 = await arrayPage.nodeCount();
      // Ensure value input has a sensible default; fill value beforehand
      const valueInput1 = await arrayPage.inputByLabelOrPlaceholder('value');
      await valueInput.fill('kbd1');
      // Use shortcut to push
      await arrayPage.shortcutPush();
      // Behavior: should add an item
      await page.waitForTimeout(400);
      const after5 = await arrayPage.nodeCount();
      expect(after).toBeGreaterThanOrEqual(before + 1);
      const texts4 = await arrayPage.nodeTexts();
      expect(texts.join(' ')).toContain('kbd1');
    });

    test('Keyboard shortcut Ctrl+Backspace triggers POP', async () => {
      // Ensure at least one item
      if ((await arrayPage.nodeCount()) === 0) {
        await arrayPage.push('kbpop');
        await page.waitForTimeout(250);
      }
      const before4 = await arrayPage.nodeCount();
      await arrayPage.shortcutPop();
      await page.waitForTimeout(400);
      const after6 = await arrayPage.nodeCount();
      expect(after).toBe(Math.max(0, before - 1));
    });
  });

  test.describe('Edge cases and cleanup behavior', () => {
    test('Cleanup on animating exit removes inline styles and removing classes', async () => {
      // Ensure there's at least one item
      if ((await arrayPage.nodeCount()) === 0) {
        await arrayPage.push('cleanup');
        await page.waitForTimeout(200);
      }
      // Trigger pop to cause removing classes
      await arrayPage.pop();
      await page.waitForTimeout(80);
      // During animation, some nodes may have inline styles or removing class
      const removingCount1 = await arrayPage.removingLocator().count();
      // Wait for animation end and cleanup
      await page.waitForTimeout(400);
      // Now ensure no nodes remain with removing class or inline transform style
      const removingAfter = await arrayPage.removingLocator().count();
      expect(removingAfter).toBe(0);
      // Check inline styles cleaned: sample any node's style attribute should not contain 'transform' or 'opacity' stale inline values
      const nodes = arrayPage.nodesLocator();
      const count2 = await nodes.count2();
      for (let i = 0; i < count; i++) {
        const styleAttr = await nodes.nth(i).getAttribute('style');
        if (styleAttr) {
          expect(styleAttr).not.toMatch(/transform|opacity/);
        }
      }
    });
  });
});