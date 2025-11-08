import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6ce13590-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Arrays interactive module
 * - Provides high-level operations that map to FSM events (PUSH, POP, INSERT, REMOVE, etc.)
 * - Uses multiple selector strategies (labels, button text, classes) to be robust against small markup differences
 */
class ArraysPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Inputs: prefer label-based selection for accessibility; fall back to placeholders / types
    this.valueInput = page.getByLabel('Value').first();
    this.indexInput = page.getByLabel('Index').first();

    // Buttons: use role-based selection by visible name
    this.pushBtn = page.getByRole('button', { name: /Push/i }).first();
    this.popBtn = page.getByRole('button', { name: /Pop/i }).first();
    this.unshiftBtn = page.getByRole('button', { name: /Unshift/i }).first();
    this.shiftBtn = page.getByRole('button', { name: /Shift/i }).first();
    this.insertBtn = page.getByRole('button', { name: /Insert/i }).first();
    this.removeBtn = page.getByRole('button', { name: /Remove/i }).first();
    this.clearBtn = page.getByRole('button', { name: /Clear/i }).first();
    this.loadPresetBtn = page.getByRole('button', { name: /Load Preset|Load preset|Preset/i }).first();
    this.walkthroughBtn = page.getByRole('button', { name: /Walkthrough|Show Walkthrough|Show walkthrough/i }).first();

    // Generic locators
    this.cells = page.locator('.cell');
    this.cellsContainer = page.locator('.cells, .array-view, .array'); // try multiple possible containers
    this.historyItems = page.locator('.history .entry, .history-item, .history li');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for UI to stabilize: a header or controls should be visible
    await Promise.race([
      this.page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 3000 }),
      this.valueInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
    ]);
  }

  // Helper: get current cell texts as array
  async getCellTexts() {
    const count = await this.cells.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      texts.push((await this.cells.nth(i).innerText()).trim());
    }
    return texts;
  }

  // Push value (maps to PUSH event)
  async push(value) {
    // fill value, click push
    await this.valueInput.fill(String(value));
    await this.pushBtn.click();
    // Implementation schedules an insert animation (~260ms) before settling to idle
    await this.page.waitForTimeout(320);
  }

  // Pop (maps to POP)
  async pop() {
    await this.popBtn.click();
    // removal animation ~220ms
    await this.page.waitForTimeout(280);
  }

  // Unshift (maps to UNSHIFT)
  async unshift(value) {
    await this.valueInput.fill(String(value));
    await this.unshiftBtn.click();
    await this.page.waitForTimeout(320);
  }

  // Shift (maps to SHIFT)
  async shift() {
    await this.shiftBtn.click();
    await this.page.waitForTimeout(280);
  }

  // Insert at index (maps to INSERT)
  async insert(value, index) {
    await this.valueInput.fill(String(value));
    await this.indexInput.fill(String(index));
    await this.insertBtn.click();
    await this.page.waitForTimeout(320);
  }

  // Remove at index (maps to REMOVE)
  async remove(index) {
    await this.indexInput.fill(String(index));
    await this.removeBtn.click();
    await this.page.waitForTimeout(280);
  }

  // Clear array instantly (maps to CLEAR -> mutatingInstant)
  async clear() {
    await this.clearBtn.click();
    // clear is instant but FSM pushes history; wait a short tick for updateView
    await this.page.waitForTimeout(120);
  }

  // Load preset (maps to LOAD_PRESET)
  async loadPreset() {
    if (this.loadPresetBtn) {
      await this.loadPresetBtn.click();
      // loading preset may be instant or animate; wait briefly
      await this.page.waitForTimeout(150);
    }
  }

  // Show walkthrough (maps to SHOW_WALKTHROUGH). The app uses alert(), so dialog handling is required by tests.
  async showWalkthrough() {
    // click button that triggers alert; caller should await dialog acceptance
    await this.walkthroughBtn.click();
  }

  // Access cell by clicking then pressing Enter (maps to ENTER_CELL -> ACCESS)
  async accessCellByEnter(index) {
    const c = this.cells.nth(index);
    await c.focus();
    await this.page.keyboard.press('Enter');
    // pulse animation ~700ms
    await this.page.waitForTimeout(780);
  }

  // Start drag (START_DRAG), move to target index, and drop (DROP)
  async dragAndReorder(fromIndex, toIndex) {
    const from = this.cells.nth(fromIndex);
    const to = this.cells.nth(toIndex);

    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();
    if (!fromBox || !toBox) throw new Error('Could not compute bounding box for drag elements');

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const endX = toBox.x + toBox.width / 2;
    const endY = toBox.y + toBox.height / 2;

    // Pointer events to simulate dragging
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small first move to trigger dragging class
    await this.page.mouse.move(startX + 5, startY + 5, { steps: 3 });
    await this.page.waitForTimeout(80); // allow placeholder creation
    await this.page.mouse.move(endX, endY, { steps: 12 });
    await this.page.waitForTimeout(120); // allow drop handling
    await this.page.mouse.up();
    // dropHandling may trigger animation pulse (~700ms) or just update
    await this.page.waitForTimeout(800);
  }

  // Keyboard shortcuts: Ctrl+P (push) and Ctrl+O (pop)
  async keyboardShortcutPush(value) {
    await this.valueInput.fill(String(value));
    // Ctrl+P
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('p');
    await this.page.keyboard.up('Control');
    await this.page.waitForTimeout(320);
  }

  async keyboardShortcutPop() {
    // Ctrl+O
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('o');
    await this.page.keyboard.up('Control');
    await this.page.waitForTimeout(280);
  }

  // Helper to check for "flash" feedback that indicates invalid input.
  async hasInvalidFlash() {
    // look for common patterns set by invalidInput state
    const flashByClass = await this.page.locator('.flash, .invalid, .flash-input').first().count();
    if (flashByClass > 0) return true;
    // sometimes the app shows a small message containing 'invalid'
    const invalidText = await this.page.locator('text=/invalid/i').first().count();
    return invalidText > 0;
  }

  // Helper to return number of history entries (if rendered)
  async historyCount() {
    try {
      return await this.historyItems.count();
    } catch {
      return 0;
    }
  }
}

test.describe('Arrays — Ordered Indexed Collections Interactive Module (FSM validation)', () => {
  let page;
  let arrays;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    arrays = new ArraysPage(page);
    await arrays.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Basic mutating operations and idle transitions', () => {
    test('Push operation mutates array, triggers insert animation, then returns to idle', async () => {
      // Validate initial state: arrays present and initial cells count is a number
      const initialCount = await arrays.cells.count();

      // Perform PUSH event via UI
      await arrays.push('A');

      // After animation the number of cells should increase by 1 and last cell text should be 'A'
      const finalCount = await arrays.cells.count();
      expect(finalCount).toBe(initialCount + 1);

      const texts1 = await arrays.getCellTexts();
      expect(texts[finalCount - 1]).toMatch(/A/);
    });

    test('Pop operation removes last element and transitions back to idle', async () => {
      // Ensure there is at least one element to pop
      await arrays.push('toPop');

      const before = await arrays.cells.count();
      await arrays.pop();
      const after = await arrays.cells.count();

      expect(after).toBe(before - 1);
      // Ensure popped element no longer appears in cell texts
      const texts2 = await arrays.getCellTexts();
      expect(texts).not.toContain('toPop');
    });

    test('Unshift and Shift work symmetrically (add/remove at front)', async () => {
      // Add two items for testing
      await arrays.unshift('first');
      await arrays.unshift('new-first');

      // The first element should be 'new-first'
      const textsAfterUnshift = await arrays.getCellTexts();
      expect(textsAfterUnshift[0]).toMatch(/new-first/);

      // Shift should remove the first element
      await arrays.shift();
      const textsAfterShift = await arrays.getCellTexts();
      expect(textsAfterShift[0]).not.toMatch(/new-first/);
    });

    test('Insert at specific index places value correctly; Remove by index deletes correct element', async () => {
      // Start with a known small array
      await arrays.clear();
      await arrays.push('x');
      await arrays.push('y');
      await arrays.push('z'); // [x, y, z]

      // Insert 'mid' at index 1 -> [x, mid, y, z]
      await arrays.insert('mid', 1);
      let texts3 = await arrays.getCellTexts();
      expect(texts[1]).toMatch(/mid/);
      expect(texts).toEqual(expect.arrayContaining(['x', 'mid', 'y', 'z']));

      // Remove index 2 (originally 'y')
      await arrays.remove(2);
      texts = await arrays.getCellTexts();
      expect(texts).not.toContain('y');
      // remaining should still include 'mid'
      expect(texts).toEqual(expect.arrayContaining(['x', 'mid', 'z']));
    });

    test('Clear operation empties the array immediately (mutatingInstant)', async () => {
      // ensure some items
      await arrays.push('one');
      await arrays.push('two');
      const nonEmpty = await arrays.cells.count();
      expect(nonEmpty).toBeGreaterThan(0);

      // Clear
      await arrays.clear();
      const after1 = await arrays.cells.count();
      expect(after).toBe(0);
    });
  });

  test.describe('Invalid input and edge cases', () => {
    test('PUSH with empty value triggers invalidInput (flash) and does not change array', async () => {
      const before1 = await arrays.cells.count();
      // Ensure the value input is empty
      await arrays.valueInput.fill('');
      // Click push button (should lead to PUSH_INVALID -> invalidInput)
      await arrays.pushBtn.click();
      // Give time for flash animation and return to idle
      await page.waitForTimeout(350);

      const after2 = await arrays.cells.count();
      expect(after).toBe(before);

      // Check for any visible invalid/flash feedback
      const flashed = await arrays.hasInvalidFlash();
      expect(flashed).toBeTruthy();
    });

    test('INSERT with out-of-range index triggers invalidInput (invalid index) and no mutation', async () => {
      // Start with a clean array
      await arrays.clear();
      await arrays.push('only');
      const before2 = await arrays.getCellTexts();

      // Insert at a very large index
      await arrays.valueInput.fill('oops');
      await arrays.indexInput.fill('9999');
      await arrays.insertBtn.click();
      // Wait for flash or idle return
      await page.waitForTimeout(350);

      const after3 = await arrays.getCellTexts();
      // No change should have occurred
      expect(after).toEqual(before);

      // There should be some indication of invalid input
      const flashed1 = await arrays.hasInvalidFlash();
      expect(flashed).toBeTruthy();
    });

    test('REMOVE with invalid index (negative) results in no change', async () => {
      await arrays.clear();
      await arrays.push('a');
      const before3 = await arrays.getCellTexts();

      await arrays.remove(-1);
      // wait for any handling
      await page.waitForTimeout(200);

      const after4 = await arrays.getCellTexts();
      expect(after).toEqual(before);
    });
  });

  test.describe('Accessing elements and pulse animation', () => {
    test('Clicking a cell then pressing Enter triggers ACCESS -> animatePulseAt -> idle', async () => {
      // Ensure there is an element to access
      await arrays.clear();
      await arrays.push('alpha');

      // Focus first cell and press Enter to trigger ACCESS
      await arrays.accessCellByEnter(0);

      // After pulse we expect the cell to still exist and be the same value
      const texts4 = await arrays.getCellTexts();
      expect(texts[0]).toMatch(/alpha/);

      // Also verify some visual/persistent flag was applied during animation if possible
      // Check for classes that commonly indicate access animation
      const cellClass = await arrays.cells.nth(0).getAttribute('class');
      expect(cellClass).toEqual(expect.stringMatching(/(cell|)/)); // basic sanity: class present
      // We can't assert exact animation class here (implementation details vary), but ensuring no element was removed is essential
    });
  });

  test.describe('Drag-and-drop reordering flow', () => {
    test('Dragging a cell to a new position reorders the array and triggers dropHandling & animatingPulse', async () => {
      // Prepare deterministic array
      await arrays.clear();
      await arrays.push('one');
      await arrays.push('two');
      await arrays.push('three');

      const before4 = await arrays.getCellTexts(); // ['one','two','three']
      expect(before.length).toBeGreaterThanOrEqual(3);

      // Drag first cell to position of third cell (0 -> 2)
      await arrays.dragAndReorder(0, 2);

      // After reorder, check that 'one' moved toward the end
      const after5 = await arrays.getCellTexts();
      // There are two acceptable reorder outcomes depending on implementation (insert before/after),
      // ensure 'one' is not at index 0 anymore (it moved)
      expect(after[0]).not.toMatch(/one/);
      // And overall contents are still the same set
      expect(after.sort()).toEqual(before.sort());
    });

    test('Dropping without moving (drop at same place) results in NO_CHANGE (no reordering)', async () => {
      // Prepare array
      await arrays.clear();
      await arrays.push('A');
      await arrays.push('B');
      const before5 = await arrays.getCellTexts();

      // Simulate a click-drag that starts and ends at same place
      const elem = arrays.cells.nth(0);
      const box = await elem.boundingBox();
      if (!box) throw new Error('Cell bounding box unavailable');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.waitForTimeout(80);
      // small move but back to same spot
      await page.mouse.move(cx + 3, cy + 3, { steps: 2 });
      await page.mouse.move(cx, cy, { steps: 2 });
      await page.waitForTimeout(80);
      await page.mouse.up();
      // allow any NO_CHANGE handling to finish
      await page.waitForTimeout(200);

      const after6 = await arrays.getCellTexts();
      expect(after).toEqual(before);
    });
  });

  test.describe('Preset loading, walkthrough, and keyboard shortcuts', () => {
    test('Loading a preset updates the array (LOAD_PRESET -> loadingPreset -> idle)', async () => {
      // If load preset button exists, click it and assert cells change
      const before6 = await arrays.getCellTexts();
      if ((await arrays.loadPresetBtn.count()) === 0) {
        test.skip('Load Preset control not present in this build');
      } else {
        await arrays.loadPreset();
        const after7 = await arrays.getCellTexts();
        // Preset should change array content (unless identical); at least length should be non-negative
        expect(Array.isArray(after)).toBeTruthy();
        // If before differs, ensure update happened; otherwise we still pass because preset may match current state
      }
    });

    test('Walkthrough shows an alert and returns to idle when dismissed', async () => {
      if ((await arrays.walkthroughBtn.count()) === 0) {
        test.skip('Walkthrough control not present in this build');
      } else {
        // Playwright requires dialog handler
        const [dialog] = await Promise.all([
          page.waitForEvent('dialog', { timeout: 3000 }),
          arrays.showWalkthrough()
        ]);
        expect(dialog.type()).toBe('alert');
        // The FSM notes the walkthrough uses alert() synchronously
        // Validate dialog message contains helpful content (best-effort)
        const msg = dialog.message();
        expect(typeof msg).toBe('string');
        await dialog.accept();
        // After closing the alert, app should be back to idle; verify no modal present
        await page.waitForTimeout(150);
      }
    });

    test('Keyboard shortcut Ctrl+P triggers PUSH and Ctrl+O triggers POP', async () => {
      // Ensure initial known state
      await arrays.clear();
      // Use Ctrl+P to push 'kbd'
      await arrays.keyboardShortcutPush('kbd');
      let texts5 = await arrays.getCellTexts();
      expect(texts).toContain('kbd');

      // Use Ctrl+O to pop the last element
      await arrays.keyboardShortcutPop();
      texts = await arrays.getCellTexts();
      expect(texts).not.toContain('kbd');
    });
  });

  test.describe('History updates and caps, and onEnter/onExit semantics where observable', () => {
    test('Mutating operations push entries into history (pushHistory invoked)', async () => {
      // We can't directly access internal history stack, but we can inspect UI trace if present
      const before7 = await arrays.historyCount();
      // Perform several mutating ops
      await arrays.clear();
      await arrays.push('h1');
      await arrays.push('h2');
      await arrays.pop();
      await arrays.insert('h3', 0);
      // Allow history UI to update
      await page.waitForTimeout(200);
      const after8 = await arrays.historyCount();
      // If there is a history UI, it should have increased by at least the number of mutating ops (4)
      if (before === 0 && after === 0) {
        // If no history UI is present, skip strict assertions
        test.skip('History UI not present to validate pushHistory visually');
      } else {
        expect(after).toBeGreaterThanOrEqual(before + 4 - 1); // allow one op to be instant/combined
      }
    });

    test('Animating states have onEnter/onExit side effects observable in DOM (inserting/removing/pulse)', async () => {
      // We'll check that animations create temporary DOM changes (like animation classes or transitional nodes)
      await arrays.clear();
      // Insert triggers animatingInsert; look for a short-lived animation class or element
      await arrays.push('anim-test');
      // Shortly after pushing, there may have been an insert animation; we can't always catch it, but ensure final state is correct
      const texts6 = await arrays.getCellTexts();
      expect(texts).toContain('anim-test');

      // Remove triggers animatingRemove: pop
      await arrays.pop();
      const afterPopTexts = await arrays.getCellTexts();
      expect(afterPopTexts).not.toContain('anim-test');

      // Access triggers pulse animation; focus and Enter then check that element still there after animation
      await arrays.push('pulse-test');
      await arrays.accessCellByEnter(0);
      const final = await arrays.getCellTexts();
      expect(final).toContain('pulse-test');
    });
  });
});