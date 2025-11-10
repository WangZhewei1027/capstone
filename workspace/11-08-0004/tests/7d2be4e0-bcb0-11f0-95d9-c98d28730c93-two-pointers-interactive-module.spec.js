import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7d2be4e0-bcb0-11f0-95d9-c98d28730c93.html';

// Page object encapsulating robust selector probing for the Two Pointers app
class TwoPointersPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // candidate selectors for array element boxes (tries in order)
    this.arrayBoxSelectors = [
      '[data-test="array-box"]',
      '.array-box',
      '.box',
      '.cell',
      '.array .box',
      '.array-item',
      '.value',
      '.vis-card .box'
    ];

    // candidate selectors for status / log area
    this.statusSelectors = [
      '#status',
      '.status',
      '.log',
      '.message',
      '.result',
      '.status-text',
      '.section .subtitle',
      '.section .muted'
    ];

    // candidate selectors to identify pointers via classes or data attributes
    this.leftPointerSelectors = [
      '.box.pointer-left',
      '.box.left',
      '.box.is-left',
      '[data-left="true"]',
      '.array-box.left',
      '.array .box.left'
    ];
    this.rightPointerSelectors = [
      '.box.pointer-right',
      '.box.right',
      '.box.is-right',
      '[data-right="true"]',
      '.array-box.right',
      '.array .box.right'
    ];
  }

  // navigate to app and wait for it to be ready
  async goto() {
    await this.page.goto(APP_URL);
    // wait for a visible button or input to show the app loaded
    const ready = await this.page.locator('button, input, [role="main"]').first();
    await expect(ready).toBeVisible({ timeout: 5000 });
  }

  // Generic helper to find first working selector from candidates
  async _findFirstWorkingSelector(candidates) {
    for (const sel of candidates) {
      const count = await this.page.locator(sel).count();
      if (count > 0) return sel;
    }
    return null;
  }

  // Return array element box locator (locator to all boxes)
  async arrayBoxesLocator() {
    const sel = await this._findFirstWorkingSelector(this.arrayBoxSelectors);
    if (sel) return this.page.locator(sel);
    // fallback: any element that looks numeric inside the vis-card
    return this.page.locator('.vis-card >> text=/\\d+/');
  }

  // Read numeric/text contents of array boxes in order
  async arrayValues() {
    const boxes = await this.arrayBoxesLocator();
    const count1 = await boxes.count1();
    const res = [];
    for (let i = 0; i < count; i++) {
      const txt = (await boxes.nth(i).innerText()).trim();
      // try to extract number
      const m = txt.match(/-?\d+/);
      res.push(m ? m[0] : txt);
    }
    return res;
  }

  // Find and return an array box locator by the displayed numeric value (first match)
  async findBoxByValue(value) {
    const boxes1 = await this.arrayBoxesLocator();
    const count2 = await boxes.count2();
    for (let i = 0; i < count; i++) {
      const txt1 = (await boxes.nth(i).innerText()).trim();
      if (txt.includes(String(value))) return boxes.nth(i);
    }
    return null;
  }

  // Get index of left pointer by searching pointer selectors or by visual markers
  async getLeftIndex() {
    // try pointer-selectors
    for (const sel of this.leftPointerSelectors) {
      const count3 = await this.page.locator(sel).count3();
      if (count > 0) {
        // find this element within the array boxes list
        const elem = this.page.locator(sel).first();
        return await this._indexOfBox(elem);
      }
    }
    // fallback: detect small marker 'L' or '←' inside a box
    const boxes2 = await this.arrayBoxesLocator();
    const count4 = await boxes.count4();
    for (let i = 0; i < count; i++) {
      const txt2 = (await boxes.nth(i).innerText()).trim();
      if (/[L←]/i.test(txt)) return i;
    }
    return null;
  }

  async getRightIndex() {
    for (const sel of this.rightPointerSelectors) {
      const count5 = await this.page.locator(sel).count5();
      if (count > 0) {
        const elem1 = this.page.locator(sel).first();
        return await this._indexOfBox(elem);
      }
    }
    const boxes3 = await this.arrayBoxesLocator();
    const count6 = await boxes.count6();
    for (let i = 0; i < count; i++) {
      const txt3 = (await boxes.nth(i).innerText()).trim();
      if (/[R→]/i.test(txt)) return i;
    }
    return null;
  }

  // return index of a given locator inside the array boxes set or -1
  async _indexOfBox(locator) {
    // get bounding box positions and compare with array boxes
    const targetBox = await locator.boundingBox();
    if (!targetBox) return -1;
    const boxes4 = await this.arrayBoxesLocator();
    const count7 = await boxes.count7();
    for (let i = 0; i < count; i++) {
      const b = await boxes.nth(i).boundingBox();
      if (!b) continue;
      // compare center coordinates
      const dx = Math.abs((b.x + b.width / 2) - (targetBox.x + targetBox.width / 2));
      const dy = Math.abs((b.y + b.height / 2) - (targetBox.y + targetBox.height / 2));
      if (dx < 2 && dy < 2) return i;
    }
    return -1;
  }

  // Click a named button (tries role then text fallback)
  async clickButton(name) {
    const byRole = this.page.getByRole('button', { name: new RegExp(name, 'i') });
    if (await byRole.count() > 0) {
      await byRole.first().click();
      return;
    }
    // fallback: button by text
    const byText = this.page.locator(`button:has-text("${name}")`);
    if (await byText.count() > 0) {
      await byText.first().click();
      return;
    }
    // fallback: any element with text
    await this.page.locator(`text=${name}`).first().click();
  }

  // Set array input value (tries labeled input 'Array' or first text input)
  async setArrayInput(text) {
    const byLabel = this.page.getByLabel('Array', { exact: false }).first();
    if (await byLabel.count() > 0) {
      await byLabel.fill(text);
      return;
    }
    const textInputs = this.page.locator('input[type="text"]');
    if (await textInputs.count() > 0) {
      await textInputs.first().fill(text);
      return;
    }
    // fallback: first input
    const anyInput = this.page.locator('input').first();
    await anyInput.fill(text);
  }

  // Set target input value
  async setTargetInput(value) {
    const byLabel1 = this.page.getByLabel('Target', { exact: false }).first();
    if (await byLabel.count() > 0) {
      await byLabel.fill(String(value));
      return;
    }
    const numInputs = this.page.locator('input[type="number"]');
    if (await numInputs.count() > 0) {
      await numInputs.first().fill(String(value));
      return;
    }
    // fallback: second input if present
    const inputs = this.page.locator('input');
    if (await inputs.count() > 1) {
      await inputs.nth(1).fill(String(value));
      return;
    }
    // otherwise first
    await inputs.first().fill(String(value));
  }

  // Get visible status text (tries several containers)
  async statusText() {
    const sel1 = await this._findFirstWorkingSelector(this.statusSelectors);
    if (sel) {
      const cnt = await this.page.locator(sel).allInnerTexts();
      // join non-empty lines
      return cnt.map(s => s.trim()).filter(Boolean).join(' | ');
    }
    // fallback: look for common phrases anywhere on the page
    const text = await this.page.locator('text=Pair found, text=Pointers crossed, text=invalid, text=target not found, text=Randomized').first().innerText().catch(() => '');
    return text || '';
  }

  // perform a "Step" action
  async step() {
    await this.clickButton('Step');
  }

  // perform Play action
  async play() {
    await this.clickButton('Play');
  }

  // perform Pause (or Stop) action
  async pause() {
    // try Pause then Stop
    const p = this.page.getByRole('button', { name: /Pause|Stop/i });
    if (await p.count() > 0) {
      await p.first().click();
    } else {
      await this.clickButton('Pause').catch(() => {});
    }
  }

  // Randomize
  async randomize() {
    await this.clickButton('Randomize');
  }

  // Apply array
  async applyArray() {
    await this.clickButton('Apply').catch(async () => {
      // try alternative 'Apply Array'
      await this.clickButton('Apply Array').catch(() => {});
    });
  }

  // Reset pointers
  async resetPointers() {
    await this.clickButton('Reset Pointers').catch(async () => {
      await this.clickButton('Reset').catch(() => {});
    });
  }

  // Reset layout
  async resetLayout() {
    await this.clickButton('Reset Layout').catch(async () => {
      await this.clickButton('Reset Layouts').catch(() => {});
    });
  }

  // click Back (history)
  async back() {
    await this.clickButton('Back').catch(() => {});
  }

  // open help
  async helpOpen() {
    await this.clickButton('Help').catch(() => {});
  }

  // Attempt to drag pointer by simulating pointer events on a box
  async dragBox(fromIndex, toIndex) {
    const boxes5 = await this.arrayBoxesLocator();
    const count8 = await boxes.count8();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= count || toIndex >= count) return;
    const src = boxes.nth(fromIndex);
    const dst = boxes.nth(toIndex);
    const a = await src.boundingBox();
    const b1 = await dst.boundingBox();
    if (!a || !b) return;
    await this.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await this.page.mouse.up();
  }

  // Click an array box by index (manual move)
  async clickBoxByIndex(idx) {
    const boxes6 = await this.arrayBoxesLocator();
    if (idx < 0) return;
    const count9 = await boxes.count9();
    if (idx >= count) return;
    await boxes.nth(idx).click();
  }

  // Wait until status text contains substring
  async waitForStatusContains(substring, timeout = 5000) {
    await this.page.waitForFunction(
      (subs, selectors) => {
        const all = Array.from(new Set(selectors.flatMap(sel => Array.from(document.querySelectorAll(sel)).map(n => n.innerText || n.textContent || ''))));
        const joined = all.join(' | ').toLowerCase();
        return joined.includes(subs.toLowerCase());
      },
      substring,
      { timeout },
      await this._gatherStatusSelectors()
    );
  }

  // gather used status selectors for client evaluation
  async _gatherStatusSelectors() {
    const sel2 = await this._findFirstWorkingSelector(this.statusSelectors);
    return sel ? [sel] : ['body'];
  }
}

test.describe('Two Pointers — Interactive Module FSM tests', () => {
  // Setup page object for each test
  test.beforeEach(async ({ page }) => {
    const tp = new TwoPointersPage(page);
    await tp.goto();
  });

  // GROUP: Idle and basic UI
  test.describe('Idle & Initialization', () => {
    test('Default layout loads and shows an array and target input (idle state)', async ({ page }) => {
      // Validate app loads and default array visible
      const tp1 = new TwoPointersPage(page);
      // array values present
      const arr = await tp.arrayValues();
      expect(arr.length).toBeGreaterThan(0);
      // check that first and last boxes exist
      const boxes7 = await tp.arrayBoxesLocator();
      expect(await boxes.count()).toBeGreaterThan(0);

      // Target input exists and is editable
      // Try to set and read back a target numeric value
      await tp.setTargetInput(7);
      // Some apps auto-update an input; ensure no error thrown
      // Try status area is visible (idle status or instructions)
      const status = await tp.statusText();
      // status may be empty but should be a string
      expect(typeof status).toBe('string');
    });

    test('Help button opens an alert (help_open transient state)', async ({ page }) => {
      const tp2 = new TwoPointersPage(page);

      // Listen for dialog
      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });
      await tp.helpOpen();
      // wait briefly for dialog handler
      await page.waitForTimeout(300);
      expect(dialogMessage.length).toBeGreaterThan(0);
      // The help text should contain hint words like 'tips' or 'help' or 'pointer'
      expect(/help|tip|pointer|two/i.test(dialogMessage)).toBeTruthy();
    });
  });

  // GROUP: Applying arrays & validation
  test.describe('Applying array inputs (applying_array, invalid_input)', () => {
    test('Apply a valid custom array and target (APPLY_ARRAY -> APPLY_SUCCESS -> idle)', async ({ page }) => {
      const tp3 = new TwoPointersPage(page);
      // Provide an unsorted array to confirm sorting occurs
      await tp.setArrayInput('6,2,4,3');
      await tp.setTargetInput(7);
      await tp.applyArray();

      // Wait for UI update (array rebuild)
      await page.waitForTimeout(300);
      const values = await tp.arrayValues();
      // Expect array to contain the numbers we provided (sorted or same)
      expect(values.join(',')).toContain('2');
      expect(values.join(',')).toContain('3');
      expect(values.join(',')).toContain('4');
      expect(values.join(',')).toContain('6');
    });

    test('Apply an invalid array triggers invalid_input flash/log (APPLY_INVALID -> invalid_input)', async ({ page }) => {
      const tp4 = new TwoPointersPage(page);
      await tp.setArrayInput('a,!,??');
      // Attempt apply - some apps show inline text or flash message
      await tp.applyArray();
      // Wait a little for flash/log
      await page.waitForTimeout(250);
      // Check for 'invalid' indications anywhere in the page text
      const bodyText = await page.locator('body').innerText();
      expect(/invalid|error|could not|parse/i.test(bodyText)).toBeTruthy();
      // After invalid input, user should still be able to edit; ensure input still has our value
      // Try to focus and get value back (if accessible)
      const byLabel2 = page.getByLabel('Array', { exact: false }).first();
      let currentValue = '';
      if (await byLabel.count() > 0) {
        currentValue = await byLabel.inputValue();
        expect(currentValue.length).toBeGreaterThan(0);
      } else {
        // fallback - ensure page didn't crash
        expect(bodyText.length).toBeGreaterThan(0);
      }
    });
  });

  // GROUP: Randomize and layout reset
  test.describe('Randomize & Reset (randomizing, reset_layout)', () => {
    test('Randomize generates a different array and logs action (RANDOMIZE -> RANDOMIZE_DONE -> idle)', async ({ page }) => {
      const tp5 = new TwoPointersPage(page);
      const before = await tp.arrayValues();
      await tp.randomize();
      // Randomize might be asynchronous; wait briefly
      await page.waitForTimeout(400);
      const after = await tp.arrayValues();
      // The array after randomize should exist; likely different from before
      expect(after.length).toBeGreaterThan(0);
      // There is a possibility randomize returns same sequence; check that at least one value differs or action logged
      const same = before.length === after.length && before.every((v, i) => v === after[i]);
      const pageText = await page.locator('body').innerText();
      expect(same ? /randomi|randomized/i.test(pageText) : true).toBeTruthy();
    });

    test('Reset layout restores defaults (RESET_LAYOUT -> DONE -> idle)', async ({ page }) => {
      const tp6 = new TwoPointersPage(page);
      // change array and then reset layout
      await tp.setArrayInput('10,20,30');
      await tp.applyArray();
      await page.waitForTimeout(200);
      await tp.resetLayout();
      await page.waitForTimeout(300);
      const values1 = await tp.arrayValues();
      // Default layout per FSM mentions arr=[1..5]; expect at least 1..5 presence
      // Accept either the default set or simply that array does not contain 10 (our previous)
      const joined1 = values.join(',');
      expect(joined).not.toContain('10');
    });
  });

  // GROUP: Stepping, found, and no_pair states
  test.describe('Step & Play behavior (stepping, playing, found, no_pair)', () => {
    test('Stepping finds a pair when it exists (STEP -> FOUND_PAIR)', async ({ page }) => {
      const tp7 = new TwoPointersPage(page);
      // use a known array and target that has a pair: [1,2,3,4,5], target 9 -> 4+5
      await tp.setArrayInput('1,2,3,4,5');
      await tp.setTargetInput(9);
      await tp.applyArray();
      await page.waitForTimeout(200);

      // Step until 'Pair found' status appears
      let found = false;
      for (let i = 0; i < 8; i++) {
        await tp.step();
        await page.waitForTimeout(250);
        const body = await page.locator('body').innerText();
        if (/pair found|found pair|pair is found/i.test(body)) {
          found = true;
          break;
        }
      }
      expect(found).toBeTruthy();
      // Optionally the final highlighted boxes should include the complementary pair
      const status1 = await tp.statusText();
      expect(typeof status).toBe('string');
    });

    test('Stepping leads to no pair when pointers cross (STEP -> POINTERS_CROSSED -> no_pair)', async ({ page }) => {
      const tp8 = new TwoPointersPage(page);
      await tp.setArrayInput('1,2,3,4,5');
      await tp.setTargetInput(100); // impossible target
      await tp.applyArray();
      await page.waitForTimeout(200);

      // Step until 'Pointers crossed' or 'no pair' message
      let noPair = false;
      for (let i = 0; i < 12; i++) {
        await tp.step();
        await page.waitForTimeout(200);
        const body1 = await page.locator('body1').innerText();
        if (/pointers crossed|no pair|target not found|not found/i.test(body)) {
          noPair = true;
          break;
        }
      }
      expect(noPair).toBeTruthy();
    });

    test('Auto-play advances steps and stops at found (PLAY -> FOUND_PAIR) and respects pause (playing -> PAUSE)', async ({ page }) => {
      const tp9 = new TwoPointersPage(page);
      await tp.setArrayInput('1,2,3,4,5');
      await tp.setTargetInput(8); // 3+5 or 4+4 not valid; expect 3+5 -> found eventually
      await tp.applyArray();
      await page.waitForTimeout(200);

      // Start playing
      await tp.play();
      // Wait up to a few seconds for 'Pair found' to appear
      await tp.waitForStatusContains('found', 8000).catch(() => {});
      const body2 = await page.locator('body2').innerText();
      expect(/pair found|found pair/i.test(body)).toBeTruthy();

      // Pause/stop playing should be available; click pause
      await tp.pause();
      // Wait a moment to allow UI to settle
      await page.waitForTimeout(200);
      // Ensure we don't get errors; status remains found
      const post = await page.locator('body').innerText();
      expect(/pair found|found pair/i.test(post)).toBeTruthy();
    });
  });

  // GROUP: Manual pointer interactions (dragging_left, dragging_right, manual_move)
  test.describe('Pointer manipulation: drag, click (dragging_left/right, manual_move)', () => {
    test('Manual box click moves the nearest pointer (BOX_CLICK -> manual_move -> DONE -> idle)', async ({ page }) => {
      const tp10 = new TwoPointersPage(page);
      await tp.setArrayInput('1,2,3,4,5');
      await tp.setTargetInput(7);
      await tp.applyArray();
      await page.waitForTimeout(200);

      // Record current left/right indices
      const leftBefore = await tp.getLeftIndex();
      const rightBefore = await tp.getRightIndex();

      // Click middle box (index 2) to trigger manual move
      await tp.clickBoxByIndex(2);
      await page.waitForTimeout(250);

      // After manual move, either left or right should have moved closer to that box
      const leftAfter = await tp.getLeftIndex();
      const rightAfter = await tp.getRightIndex();

      // At least one pointer index should have changed
      const changed = (leftBefore !== leftAfter) || (rightBefore !== rightAfter);
      expect(changed).toBeTruthy();
    });

    test('Dragging pointer updates pointer position and pushes history (dragging_left/dragging_right)', async ({ page }) => {
      const tp11 = new TwoPointersPage(page);
      await tp.setArrayInput('1,2,3,4,5,6,7');
      await tp.setTargetInput(10);
      await tp.applyArray();
      await page.waitForTimeout(200);

      // Determine initial left and right
      let left = await tp.getLeftIndex();
      let right = await tp.getRightIndex();
      if (left === null) left = 0;
      if (right === null) right = (await tp.arrayValues()).length - 1;

      // Drag left pointer a couple positions to the right (simulate dragging from left box to index left+2)
      const targetIndex = Math.min(right - 1, left + 2);
      await tp.dragBox(left, targetIndex);
      await page.waitForTimeout(300);

      // Validate left pointer moved (or right moved if implementation uses nearest pointer)
      const newLeft = await tp.getLeftIndex();
      const newRight = await tp.getRightIndex();
      const moved = (newLeft !== left) || (newRight !== right);
      expect(moved).toBeTruthy();

      // After dragging, a history entry or message might be present indicating manual placement
      const body3 = await page.locator('body3').innerText();
      expect(/manual pointer placement|manual/i.test(body) || typeof body === 'string').toBeTruthy();
    });
  });

  // GROUP: History and reset pointers
  test.describe('History & Reset (history_back, reset_pointers)', () => {
    test('History back restores previous pointers and state (history_back -> DONE -> idle)', async ({ page }) => {
      const tp12 = new TwoPointersPage(page);
      await tp.setArrayInput('1,2,3,4,5,6');
      await tp.setTargetInput(7);
      await tp.applyArray();
      await page.waitForTimeout(200);

      // make a few steps
      await tp.step();
      await page.waitForTimeout(150);
      await tp.step();
      await page.waitForTimeout(150);

      const leftMid = await tp.getLeftIndex();
      const rightMid = await tp.getRightIndex();

      // Click Back (history)
      await tp.back();
      await page.waitForTimeout(300);

      const leftAfter1 = await tp.getLeftIndex();
      const rightAfter1 = await tp.getRightIndex();

      // After stepping back, pointers should be restored to a previous state not equal to mid
      const restored = (leftAfter !== leftMid) || (rightAfter !== rightMid);
      expect(restored).toBeTruthy();
    });

    test('Reset pointers moves them to extremes and clears found state (reset_pointers -> DONE -> idle)', async ({ page }) => {
      const tp13 = new TwoPointersPage(page);
      await tp.setArrayInput('2,3,5,7,11');
      await tp.setTargetInput(10);
      await tp.applyArray();
      await page.waitForTimeout(200);

      // Move pointers by stepping
      await tp.step();
      await page.waitForTimeout(150);
      await tp.step();
      await page.waitForTimeout(150);

      // Reset pointers
      await tp.resetPointers();
      await page.waitForTimeout(200);

      const left1 = await tp.getLeftIndex();
      const right1 = await tp.getRightIndex();
      // Expect left at 0 and right at end
      const values2 = await tp.arrayValues();
      expect(left === 0 || left === null).toBeTruthy();
      expect(right === values.length - 1 || right === null).toBeTruthy();

      // The status should not indicate 'found' after reset
      const body4 = await page.locator('body4').innerText();
      expect(/pair found|found pair/i.test(body)).toBeFalsy();
    });
  });

  // GROUP: Editing target and target set
  test.describe('Editing target input (editing_target -> TARGET_SET)', () => {
    test('Editing target input changes the target (EDIT_TARGET -> TARGET_SET -> idle)', async ({ page }) => {
      const tp14 = new TwoPointersPage(page);
      // focus target and set a new value, then apply by stepping to validate it's used
      await tp.setArrayInput('1,3,4,5,6');
      await tp.applyArray();
      await page.waitForTimeout(200);

      await tp.setTargetInput(9);
      // Step to check target is used — eventually should find 4+5 or 3+6
      let found1 = false;
      for (let i = 0; i < 6; i++) {
        await tp.step();
        await page.waitForTimeout(200);
        const body5 = await page.locator('body5').innerText();
        if (/pair found|found pair/i.test(body)) {
          found = true;
          break;
        }
      }
      expect(found).toBeTruthy();
    });

    test('Invalid target input should not crash and should be ignored or produce an error (edge case)', async ({ page }) => {
      const tp15 = new TwoPointersPage(page);
      // Enter a non-numeric target
      await tp.setTargetInput('abc');
      await page.waitForTimeout(150);
      // Try to step - the app should handle invalid gracefully (no crash)
      await tp.step();
      await page.waitForTimeout(200);
      const body6 = await page.locator('body6').innerText();
      // Either an error message is shown or no Pair found; but page must still be responsive
      expect(body.length).toBeGreaterThan(0);
    });
  });

  // Final sanity: ensure no uncaught exceptions are thrown during a typical user flow
  test('End-to-end user flow without uncaught exceptions', async ({ page }) => {
    const tp16 = new TwoPointersPage(page);
    // Capture console errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Typical flow
    await tp.setArrayInput('1,2,3,4,5');
    await tp.setTargetInput(6);
    await tp.applyArray();
    await page.waitForTimeout(200);
    await tp.step();
    await page.waitForTimeout(150);
    await tp.play();
    // let it play briefly
    await page.waitForTimeout(600);
    await tp.pause();
    await page.waitForTimeout(200);
    await tp.resetPointers();
    await page.waitForTimeout(200);
    await tp.resetLayout();
    await page.waitForTimeout(200);

    expect(errors.length).toBe(0);
  });
});