import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/64fe78b0-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Interactive Array Module
 * Contains resilient selectors and helper actions used across tests.
 */
class ArrayPage {
  constructor(page) {
    this.page = page;

    // Buttons - try accessible role first, fallback to text matching
    this.pushButton = () => this._buttonByName(/push/i);
    this.insertButton = () => this._buttonByName(/insert/i);
    this.popButton = () => this._buttonByName(/pop/i);
    this.removeButton = () => this._buttonByName(/remove/i);
    this.clearButton = () => this._buttonByName(/clear/i);
    this.saveEditButton = () => this._buttonByName(/save|ok/i);
    this.cancelEditButton = () => this._buttonByName(/cancel|close/i);
    this.editButton = () => this._buttonByName(/edit/i);

    // Inputs - try several heuristics
    this.valueInput = () =>
      this.page.locator('input[name="value"], input[placeholder*="Value"], input[aria-label*="value"], input[placeholder*="value"], input[type="text"]').first();
    this.indexInput = () =>
      this.page.locator('input[name="index"], input[placeholder*="Index"], input[aria-label*="index"], input[type="number"]').first();

    // Inspector or selected-area
    this.inspector = () =>
      this.page.locator('.inspector, [data-inspector], .selected-panel, .editor-panel').first();

    // Visual tiles - resilient combined selector
    this.tiles = () =>
      this.page.locator('.visual .tiles .tile, .tiles .tile, .tile, .array-item, [data-tile], li, [role="listitem"]');

    // Any "flash" or error visual feedback
    this.flash = () =>
      this.page.locator('.flash, .invalid, .error, [data-error], .shake').first();
  }

  // Helper that prefers accessible role button and falls back to text content
  _buttonByName(regex) {
    const byRole = this.page.getByRole('button', { name: regex });
    return byRole.count().then((c) => (c > 0 ? byRole : this.page.locator(`button:has-text("${(regex + '').replace(/\/i|\/|\\|\\//g, '')}")`).first()));
  }

  // Wait until app has rendered (visual container present)
  async waitForAppReady() {
    await Promise.all([
      this.page.waitForSelector('.visual, .tiles, .card, .controls', { timeout: 5000 }).catch(() => {}),
      this.page.waitForLoadState('domcontentloaded'),
    ]);
    // small pause to allow initial JS to run
    await this.page.waitForTimeout(120);
  }

  // Count tiles
  async tileCount() {
    const loc = this.tiles();
    return await loc.count();
  }

  // Get text content for tiles as array (trimmed)
  async tileTexts() {
    const loc1 = this.tiles();
    const count = await loc.count();
    const texts = [];
    for (let i = 0; i < count; i++) {
      const t = (await loc.nth(i).innerText()).trim();
      texts.push(t);
    }
    return texts;
  }

  // Click nth tile (0-based)
  async clickTile(index = 0) {
    const loc2 = this.tiles();
    await expect(loc).toHaveCountGreaterThan(0);
    await loc.nth(index).click({ force: true });
  }

  // Push value via controls
  async pushValue(value) {
    const input = this.valueInput();
    await input.fill('');
    if (value !== null && value !== undefined) {
      await input.fill(String(value));
    }
    const btn = await this.pushButton();
    await btn.click({ force: true });
  }

  // Insert value at index
  async insertValueAt(value, index) {
    const v = this.valueInput();
    const i = this.indexInput();
    await v.fill(String(value));
    await i.fill(String(index));
    const btn1 = await this.insertButton();
    await btn.click({ force: true });
  }

  // Pop
  async pop() {
    const btn2 = await this.popButton();
    await btn.click({ force: true });
  }

  // Remove at index
  async removeAt(index) {
    const i1 = this.indexInput();
    await i.fill(String(index));
    const btn3 = await this.removeButton();
    await btn.click({ force: true });
  }

  // Clear
  async clear() {
    const btn4 = await this.clearButton();
    await btn.click({ force: true });
  }

  // Start editing selected item: tries clicking an edit button in inspector, otherwise double-click tile
  async startEdit(index = 0) {
    const editBtn = await this.editButton();
    if ((await editBtn.count()) > 0) {
      await editBtn.click({ force: true });
      return;
    }
    // fallback: double click the tile
    await this.tiles().nth(index).dblclick({ force: true });
  }

  // Save edit by filling inspector input and hitting Save or Enter
  async saveEdit(newValue) {
    const v1 = this.valueInput();
    await v.fill(String(newValue));
    const saveBtn = await this.saveEditButton();
    if ((await saveBtn.count()) > 0) {
      await saveBtn.click({ force: true });
    } else {
      // press Enter inside input
      await v.press('Enter');
    }
  }

  // Cancel edit
  async cancelEdit() {
    const cancelBtn = await this.cancelEditButton();
    if ((await cancelBtn.count()) > 0) {
      await cancelBtn.click({ force: true });
    } else {
      const v2 = this.valueInput();
      await v.press('Escape');
    }
  }

  // Drag tile a -> b
  async dragTile(fromIndex, toIndex) {
    const src = this.tiles().nth(fromIndex);
    const dst = this.tiles().nth(toIndex);
    // Use Playwright's dragAndDrop API for reliability
    await src.dragTo(dst);
    // small wait for potential animation
    await this.page.waitForTimeout(120);
  }

  // Detect visible error/flash indicator
  async hasFlash() {
    const f = this.flash();
    return (await f.count()) > 0 && (await f.isVisible().catch(() => false));
  }

  // Wait for flash to clear (error state exits)
  async waitForFlashClear(timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!(await this.hasFlash())) return true;
      await this.page.waitForTimeout(80);
    }
    return !(await this.hasFlash());
  }
}

test.describe('Interactive Array Module (FSM) - 64fe78b0-bcb0-11f0-95d9-c98d28730c93', () => {
  let page;
  let array;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    array = new ArrayPage(page);
    await page.goto(APP_URL);
    await array.waitForAppReady();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('idle state renders controls and visual array (initial renderIdleUI)', async () => {
    // Validate main UI pieces exist: controls and visual tiles/container
    await expect(page.locator('.controls, .card .controls')).toHaveCountGreaterThan(0);
    await expect(page.locator('.visual, .tiles')).toHaveCountGreaterThan(0);

    // Buttons exist
    const btns = [
      array.pushButton(),
      array.insertButton(),
      array.popButton(),
      array.removeButton(),
      array.clearButton(),
    ];
    for (const b of btns) {
      await expect(b).toBeTruthy();
    }

    // Tile container present (could be empty or with items)
    const tileCount = await array.tileCount();
    // Idle should not crash; count may be 0 or more
    expect(tileCount).toBeGreaterThanOrEqual(0);
  });

  test('selecting a tile transitions to selected state and shows inspector (CLICK_TILE -> selected)', async () => {
    // Make sure there's at least one tile to select; if none, push one
    if ((await array.tileCount()) === 0) {
      await array.pushValue('100');
      await page.waitForTimeout(120);
      await expect(array.tileCount()).toBeGreaterThan(0);
    }

    // Click first tile
    await array.clickTile(0);

    // onEnter selected should reveal an inspector or highlight; check for inspector or a selected class
    const inspectorExists = (await array.inspector().count()) > 0 && (await array.inspector().isVisible().catch(() => false));
    const highlighted = await page.locator('.tile.selected, .tile.is-selected, [data-selected="true"]').first().isVisible().catch(() => false);

    expect(inspectorExists || highlighted).toBeTruthy();
  });

  test('editing flow: START_EDIT -> editing, SAVE_EDIT -> animating -> selected (edit tile value)', async () => {
    // Ensure at least one item
    if ((await array.tileCount()) === 0) {
      await array.pushValue('7');
      await page.waitForTimeout(120);
    }

    const beforeTexts = await array.tileTexts();
    const original = beforeTexts[0] ?? '';

    // Start editing first tile
    await array.clickTile(0);
    await array.startEdit(0);

    // onEnter editing: inspector controls and focused input should be visible
    const inspector = array.inspector();
    await expect(inspector).toBeTruthy();

    const editInput = array.valueInput();
    await expect(editInput).toBeTruthy();

    // Save edited value
    const newValue = (original === '999') ? '123' : (original + '-edited' || 'edited');
    await array.saveEdit(newValue);

    // After save, animating should have updated DOM: wait a short time for mutation/animation
    await page.waitForTimeout(220);
    const afterTexts = await array.tileTexts();
    expect(afterTexts[0]).toContain(String(newValue));
  });

  test('push valid adds tile and animates (CLICK_PUSH_VALID -> animating)', async () => {
    const before = await array.tileCount();
    await array.valueInput().fill('42');
    const push = await array.pushButton();
    await push.click({ force: true });

    // Wait for "animation" period to settle
    await page.waitForTimeout(220);

    const after = await array.tileCount();
    expect(after).toBe(before + 1);

    const texts1 = await array.tileTexts();
    expect(texts).toContainEqual(expect.stringContaining('42'));
  });

  test('push invalid (empty) triggers error feedback and does not mutate array (CLICK_PUSH_INVALID -> error)', async () => {
    const before1 = await array.tileCount();
    // Ensure input empty
    await array.valueInput().fill('');
    const push1 = await array.pushButton();
    await push.click({ force: true });

    // Error should produce flash/invalid feedback
    const hasFlash = await array.hasFlash();
    expect(hasFlash).toBeTruthy();

    // No mutation occurred
    const after1 = await array.tileCount();
    expect(after).toBe(before);

    // After transient error, FSM should return to idle or previous selected state; wait for flash to clear
    const cleared = await array.waitForFlashClear(2000);
    expect(cleared).toBeTruthy();
  });

  test('insert valid inserts item at index (CLICK_INSERT_VALID -> animating)', async () => {
    // Ensure array has 2 items minimum
    while ((await array.tileCount()) < 2) {
      await array.pushValue(String(Math.floor(Math.random() * 1000)));
      await page.waitForTimeout(80);
    }

    const beforeTexts1 = await array.tileTexts();
    const beforeCount = beforeTexts.length;

    // Insert at index 1
    await array.insertValueAt('insert-me', 1);
    await page.waitForTimeout(220);

    const afterTexts1 = await array.tileTexts();
    expect(afterTexts.length).toBe(beforeCount + 1);
    // Verify new item appears at index 1 (or at least present)
    expect(afterTexts).toContainEqual(expect.stringContaining('insert-me'));
  });

  test('insert invalid index triggers error and no change (CLICK_INSERT_INVALID_INDEX -> error)', async () => {
    const before2 = await array.tileCount();
    // Intentionally large invalid index
    await array.valueInput().fill('x');
    await array.indexInput().fill('9999');
    const insertBtn = await array.insertButton();
    await insertBtn.click({ force: true });

    // Expect flash/error
    const hasFlash1 = await array.hasFlash1();
    expect(hasFlash).toBeTruthy();

    // No change
    const after2 = await array.tileCount();
    expect(after).toBe(before);

    await array.waitForFlashClear(2000);
  });

  test('insert invalid value triggers error and no change (CLICK_INSERT_INVALID_VALUE -> error)', async () => {
    const before3 = await array.tileCount();
    // Provide empty value but valid index
    await array.valueInput().fill('');
    await array.indexInput().fill('0');
    const insertBtn1 = await array.insertButton();
    await insertBtn.click({ force: true });

    expect(await array.hasFlash()).toBeTruthy();
    const after3 = await array.tileCount();
    expect(after).toBe(before);
    await array.waitForFlashClear(2000);
  });

  test('pop valid removes last item (CLICK_POP_VALID -> animating)', async () => {
    // Ensure at least one item
    if ((await array.tileCount()) === 0) {
      await array.pushValue('to-pop');
      await page.waitForTimeout(120);
    }

    const beforeTexts2 = await array.tileTexts();
    const beforeCount1 = beforeTexts.length;
    const lastVal = beforeTexts[beforeCount - 1];

    const popBtn = await array.popButton();
    await popBtn.click({ force: true });

    await page.waitForTimeout(220);
    const afterTexts2 = await array.tileTexts();
    expect(afterTexts.length).toBe(beforeCount - 1);
    // Last value should have been removed
    expect(afterTexts).not.toContainEqual(expect.stringContaining(lastVal));
  });

  test('pop empty triggers error and no change (CLICK_POP_EMPTY -> error)', async () => {
    // Make sure array is empty: clear if possible
    // If clear button exists, click repeatedly; otherwise pop until empty
    try {
      const clearBtn = await array.clearButton();
      await clearBtn.click({ force: true });
      await page.waitForTimeout(120);
    } catch (e) {
      // fallback: pop until empty
      while ((await array.tileCount()) > 0) {
        const p = await array.popButton();
        await p.click({ force: true });
        await page.waitForTimeout(80);
      }
    }

    expect(await array.tileCount()).toBe(0);

    // Attempt to pop when empty
    const popBtn1 = await array.popButton();
    await popBtn.click({ force: true });

    // Should show flash/error and remain empty
    expect(await array.hasFlash()).toBeTruthy();
    expect(await array.tileCount()).toBe(0);
    await array.waitForFlashClear(2000);
  });

  test('remove valid removes the item at given index (CLICK_REMOVE_VALID -> animating)', async () => {
    // Ensure at least 3 items
    while ((await array.tileCount()) < 3) {
      await array.pushValue(String(Math.floor(Math.random() * 100)));
      await page.waitForTimeout(80);
    }

    const beforeTexts3 = await array.tileTexts();
    const beforeCount2 = beforeTexts.length;
    const removeIndex = 1;
    const toRemove = beforeTexts[removeIndex];

    await array.removeAt(removeIndex);
    await page.waitForTimeout(220);
    const afterTexts3 = await array.tileTexts();
    expect(afterTexts.length).toBe(beforeCount - 1);
    expect(afterTexts).not.toContainEqual(expect.stringContaining(toRemove));
  });

  test('remove invalid index triggers error and does not change (CLICK_REMOVE_INVALID -> error)', async () => {
    const before4 = await array.tileCount();
    await array.indexInput().fill('9999');
    const removeBtn = await array.removeButton();
    await removeBtn.click({ force: true });

    expect(await array.hasFlash()).toBeTruthy();
    const after4 = await array.tileCount();
    expect(after).toBe(before);
    await array.waitForFlashClear(2000);
  });

  test('clear valid empties the array (CLICK_CLEAR_VALID -> animating)', async () => {
    // Ensure non-empty
    if ((await array.tileCount()) === 0) {
      await array.pushValue('a');
      await array.pushValue('b');
      await page.waitForTimeout(120);
    }

    const clearBtn1 = await array.clearButton();
    await clearBtn.click({ force: true });

    await page.waitForTimeout(220);
    expect(await array.tileCount()).toBe(0);
  });

  test('clear empty triggers error and no change (CLICK_CLEAR_EMPTY -> error)', async () => {
    // Ensure empty
    const clearBtn2 = await array.clearButton();
    await clearBtn.click({ force: true });
    await page.waitForTimeout(120);

    // Now clear again when empty
    await clearBtn.click({ force: true });

    expect(await array.hasFlash()).toBeTruthy();
    expect(await array.tileCount()).toBe(0);
    await array.waitForFlashClear(2000);
  });

  test('dragging tiles swaps items (START_DRAG -> dragging -> DROP_ON_TILE_VALID -> animating)', async () => {
    // Ensure at least two items for swapping
    while ((await array.tileCount()) < 2) {
      await array.pushValue(String(Math.floor(Math.random() * 100)));
      await page.waitForTimeout(80);
    }

    const before5 = await array.tileTexts();
    const first = before[0];
    const second = before[1];

    // Drag first to second position
    await array.dragTile(0, 1);
    await page.waitForTimeout(220);

    const after5 = await array.tileTexts();

    // Check that the two items swapped positions (order change)
    const swapped = after[0] === second && after[1] === first;
    // Accept either swap or move depending on impl, so ensure order changed and both values present
    expect(after).toContainEqual(expect.stringContaining(first));
    expect(after).toContainEqual(expect.stringContaining(second));
    expect(swapped || (after.join() !== before.join())).toBeTruthy();
  });

  test('error state exits back to idle or selected after timeout/dismiss (error transient)', async () => {
    // Trigger an obvious error - insert invalid index
    await array.valueInput().fill('y');
    await array.indexInput().fill('9999');
    const insertBtn2 = await array.insertButton();
    await insertBtn.click({ force: true });

    expect(await array.hasFlash()).toBeTruthy();

    // Wait for FSM's error timeout/clear behavior
    const cleared1 = await array.waitForFlashClear(3000);
    expect(cleared).toBeTruthy();

    // After clearing, UI should still be responsive: try clicking a tile if present or push a value
    if ((await array.tileCount()) > 0) {
      await array.clickTile(0);
      // inspector or selection highlight should be available
      const inspectorExists1 = (await array.inspector().count()) > 0 && (await array.inspector().isVisible().catch(() => false));
      const highlighted1 = await page.locator('.tile.selected, .tile.is-selected, [data-selected="true"]').first().isVisible().catch(() => false);
      expect(inspectorExists || highlighted).toBeTruthy();
    } else {
      // Try a push to ensure idle works
      await array.pushValue('after-error');
      await page.waitForTimeout(120);
      expect(await array.tileCount()).toBeGreaterThan(0);
    }
  });

  test('keyboard interactions in editing trigger save/cancel (KEY_ENTER_IN_EDIT, KEY_ESCAPE_IN_EDIT)', async () => {
    // Ensure an item exists
    if ((await array.tileCount()) === 0) {
      await array.pushValue('k1');
      await page.waitForTimeout(80);
    }

    // Select and start editing
    await array.clickTile(0);
    await array.startEdit(0);

    // Fill new value and press Enter
    const editInput1 = array.valueInput();
    await editInput.fill('via-enter');
    await editInput.press('Enter');

    await page.waitForTimeout(220);
    const textsAfterEnter = await array.tileTexts();
    expect(textsAfterEnter[0]).toContain('via-enter');

    // Start edit again and press Escape to cancel
    await array.startEdit(0);
    await editInput.fill('will-cancel');
    await editInput.press('Escape');

    // Value should remain 'via-enter'
    await page.waitForTimeout(120);
    const textsAfterEscape = await array.tileTexts();
    expect(textsAfterEscape[0]).toContain('via-enter');
  });

  test('keyboard arrow nav selects items (KEY_ARROW_NAV -> selected)', async () => {
    // Need at least two items to navigate
    while ((await array.tileCount()) < 2) {
      await array.pushValue(String(Math.floor(Math.random() * 100)));
      await page.waitForTimeout(80);
    }

    // Focus first tile and press ArrowDown or ArrowRight to move selection
    const firstTile = array.tiles().nth(0);
    await firstTile.focus();
    // Press ArrowRight to navigate
    await firstTile.press('ArrowRight');
    await page.waitForTimeout(120);

    // Expect some selected highlight or inspector change
    const highlighted2 = await page.locator('.tile.selected, .tile.is-selected, [data-selected="true"]').first().isVisible().catch(() => false);
    expect(highlighted).toBeTruthy();
  });
});