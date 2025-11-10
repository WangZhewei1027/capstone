import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/77fada80-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Page Object for the Sliding Window Interactive Module.
 * Includes robust selector fallbacks because the exact HTML IDs/classes may vary.
 */
class SlidingWindowPage {
  constructor(page) {
    this.page = page;
  }

  // Navigate to the page and wait for it to be interactive
  async goto() {
    await this.page.goto(APP_URL);
    // Wait for main app shell to appear
    await Promise.race([
      this.page.locator('.app').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.page.locator('body').waitFor({ state: 'attached', timeout: 3000 }).catch(() => {}),
    ]);
  }

  // Helper to find a locator by multiple possible selectors in priority order
  locatorAny(selectors) {
    for (const s of selectors) {
      const loc = this.page.locator(s);
      if (loc) return loc;
    }
    // return a null-like locator (will error if used) to surface missing selectors
    return this.page.locator('xpath=//non-existing-element');
  }

  // Set the array input - try multiple input selectors and label-based lookups
  async setArray(value) {
    // Try common selectors
    const possible = [
      'input#array-input',
      'input[name="array"]',
      'textarea#array-input',
      'textarea[name="array"]',
      'input[placeholder*="comma"]',
      'input[placeholder*="e.g."]',
      'textarea[placeholder*="e.g."]',
      'input[aria-label*="array"]',
      'textarea[aria-label*="array"]',
    ];
    for (const s of possible) {
      const loc1 = this.page.locator(s).first();
      if (await loc.count() > 0) {
        await loc.fill(value);
        return;
      }
    }
    // Try label text
    const byLabel = this.page.getByLabel(/array/i).first();
    if (await byLabel.count() > 0) {
      await byLabel.fill(value);
      return;
    }
    // As a last resort, try any text input on the page and set it
    const anyInput = this.page.locator('input[type="text"], textarea').first();
    if (await anyInput.count() > 0) {
      await anyInput.fill(value);
      return;
    }
    throw new Error('Array input could not be found');
  }

  async setWindowSize(k) {
    const possible1 = [
      'input#k-input',
      'input[name="k"]',
      'input[aria-label*="window size"]',
      'input[type="number"]',
      'input[placeholder*="window"]',
    ];
    for (const s of possible) {
      const loc2 = this.page.locator(s).first();
      if (await loc.count() > 0) {
        await loc.fill(String(k));
        // blur to trigger change handlers
        await loc.evaluate((el) => el.blur && el.blur());
        return;
      }
    }
    // Try select dropdown with label "Window size"
    const byLabel1 = this.page.getByLabel(/window size|k/i).first();
    if (await byLabel.count() > 0) {
      await byLabel.fill(String(k));
      await byLabel.evaluate((el) => el.blur && el.blur());
      return;
    }
    throw new Error('Window size control could not be found');
  }

  async setAggregation(agg) {
    // agg expected like 'sum', 'avg', 'max', 'min'
    const possibleSelects = [
      'select#agg-select',
      'select[name="agg"]',
      'select[aria-label*="aggregation"]',
      'select',
    ];
    for (const s of possibleSelects) {
      const loc3 = this.page.locator(s).first();
      if (await loc.count() > 0) {
        // try to select by value or label match
        try {
          await loc.selectOption({ value: agg.toLowerCase() });
          return;
        } catch (e) {
          // Try matching by label text
          const option = loc.locator('option', { hasText: new RegExp(agg, 'i') }).first();
          if (await option.count() > 0) {
            const val = await option.getAttribute('value');
            if (val) {
              await loc.selectOption(val);
              return;
            }
          }
        }
      }
    }
    // Try radio/btns with agg text
    const btn = this.page.getByRole('button', { name: new RegExp(agg, 'i') }).first();
    if (await btn.count() > 0) {
      await btn.click();
      return;
    }
    // If nothing else, ignore (some implementations default aggregation)
  }

  async clickApply() {
    const candidates = [
      this.page.getByRole('button', { name: /apply array|apply/i }),
      this.page.getByText(/apply array|apply/i),
      this.page.locator('button#apply-btn'),
      this.page.locator('button[aria-label="apply"]'),
    ];
    for (const c of candidates) {
      if (c && (await c.count()) > 0) {
        await c.first().click();
        return;
      }
    }
    // Try triggering form submit
    await this.page.keyboard.press('Enter');
  }

  async clickPlay() {
    const c = this.page.getByRole('button', { name: /play|pause/i }).first();
    if (await c.count() > 0) {
      await c.click();
      return;
    }
    const alt = this.page.locator('button#play-btn');
    if (await alt.count() > 0) {
      await alt.click();
      return;
    }
    throw new Error('Play button not found');
  }

  async clickNext() {
    const c1 = this.page.getByRole('button', { name: /next|forward|▶/i }).first();
    if (await c.count() > 0) {
      await c.click();
      return;
    }
    const alt1 = this.page.locator('button#next-btn');
    if (await alt.count() > 0) {
      await alt.click();
      return;
    }
    throw new Error('Next button not found');
  }

  async clickPrev() {
    const c2 = this.page.getByRole('button', { name: /prev|previous|back|◀/i }).first();
    if (await c.count() > 0) {
      await c.click();
      return;
    }
    const alt2 = this.page.locator('button#prev-btn');
    if (await alt.count() > 0) {
      await alt.click();
      return;
    }
    throw new Error('Prev button not found');
  }

  async clickReset() {
    const c3 = this.page.getByRole('button', { name: /reset|restart|recompute/i }).first();
    if (await c.count() > 0) {
      await c.click();
      return;
    }
    const alt3 = this.page.locator('button#reset-btn');
    if (await alt.count() > 0) {
      await alt.click();
      return;
    }
    throw new Error('Reset button not found');
  }

  async setSpeed(value) {
    // value expected between 0-100 or some normalized range - try slider or input
    const slider = this.page.locator('input[type="range"]').first();
    if (await slider.count() > 0) {
      // set value attribute
      await slider.fill(String(value));
      await slider.evaluate((el) => el.dispatchEvent(new Event('input')));
      await slider.evaluate((el) => el.dispatchEvent(new Event('change')));
      return;
    }
    // try numeric input
    const num = this.page.locator('input[aria-label*="speed"], input[name="speed"]').first();
    if (await num.count() > 0) {
      await num.fill(String(value));
      await num.evaluate((el) => el.blur && el.blur());
      return;
    }
    // else ignore
  }

  // Try to get a visible overlay element
  async overlayLocator() {
    const selectors = ['.overlay', '#overlay', '.window-overlay', '.select-overlay', '.slider-overlay'];
    for (const s of selectors) {
      const loc4 = this.page.locator(s).first();
      if (await loc.count() > 0) return loc;
    }
    // try an element by role/aria
    const byAria = this.page.locator('[aria-label*="overlay"], [data-role="overlay"]').first();
    if (await byAria.count() > 0) return byAria;
    // fallback: try an element that visually looks like an overlay by searching for element with class 'window'
    const fallback = this.page.locator('.window, .window-highlight').first();
    if (await fallback.count() > 0) return fallback;
    return this.page.locator('xpath=//non-existing-element');
  }

  async isOverlayVisible() {
    const loc5 = await this.overlayLocator();
    if (!loc) return false;
    try {
      return await loc.isVisible();
    } catch {
      return false;
    }
  }

  // Attempt to read current state from data-state attribute on common containers
  async getStateAttribute() {
    const candidates1 = ['#app', '.app', 'body', '#root', '.container'];
    for (const s of candidates) {
      const exists = await this.page.locator(s).count();
      if (exists > 0) {
        const v = await this.page.locator(s).first().getAttribute('data-state');
        if (v) return v;
      }
    }
    // If not found, try a global element
    const any = await this.page.evaluate(() => {
      // try window.__STATE__ or __fsmState__
      // This is a non-invasive attempt to read any attached global state variables
      // (If absent this returns null)
      // eslint-disable-next-line no-undef
      return (window && (window.__STATE__ || window.__fsmState__ || window.appState)) || null;
    });
    return any;
  }

  // Wait until a desired state string appears in data-state attribute or boolean predicate returns true
  async waitForState(expected, timeout = 4000) {
    // expected can be a string (exact) or a predicate function reading stateStr => boolean
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const state = await this.getStateAttribute();
      if (typeof expected === 'function') {
        if (expected(state)) return state;
      } else {
        if (state && String(state).toLowerCase().includes(String(expected).toLowerCase())) return state;
      }
      await this.page.waitForTimeout(150);
    }
    // return last seen state (may be null)
    return await this.getStateAttribute();
  }

  // Read numerical result (sum/avg/etc) if present
  async getResultText() {
    const candidates2 = [
      '.result-value',
      '#result',
      '.window-result',
      '[data-role="result"]',
      '.result',
      '.value',
    ];
    for (const s of candidates) {
      const loc6 = this.page.locator(s).first();
      if (await loc.count() > 0) {
        try {
          const txt = await loc.textContent();
          if (txt) return txt.trim();
        } catch {}
      }
    }
    // fallback: try narration area
    const narr = this.page.locator('.narration, .message, #message').first();
    if (await narr.count() > 0) return (await narr.textContent())?.trim() ?? '';
    return '';
  }

  // Read operation counts or highlights if present
  async getOpsCountText() {
    const candidates3 = ['.ops-count', '#ops-count', '[data-role="ops"]', '.op-count'];
    for (const s of candidates) {
      const loc7 = this.page.locator(s).first();
      if (await loc.count() > 0) {
        return (await loc.textContent())?.trim() ?? '';
      }
    }
    return '';
  }

  // Read current highlighted window indices if present
  async getWindowIndicesText() {
    const candidates4 = ['.window-indices', '#window-indices', '.indices', '[data-role="indices"]'];
    for (const s of candidates) {
      const loc8 = this.page.locator(s).first();
      if (await loc.count() > 0) {
        return (await loc.textContent())?.trim() ?? '';
      }
    }
    // Try to infer from highlighted array elements
    const highlighted = this.page.locator('.array-item.highlight, .array-item.selected, .item.highlight');
    if (await highlighted.count() > 0) {
      const texts = await highlighted.allTextContents();
      return texts.map((t) => t.trim()).join(', ');
    }
    return '';
  }

  // Drag overlay by offsets (simulate pointer actions)
  async dragOverlayBy(dx = 50, dy = 0) {
    const loc9 = await this.overlayLocator();
    if (!loc) throw new Error('Overlay not found for dragging');
    const box = await loc.boundingBox();
    if (!box) throw new Error('Overlay bounding box not available');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + dx, startY + dy, { steps: 8 });
    await this.page.waitForTimeout(120);
    await this.page.mouse.up();
  }

  // Press key
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }
}

// Tests
test.describe('Sliding Window Interactive Module - FSM validation', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new SlidingWindowPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('State: no_data and computing (initialization & edge cases)', () => {
    test('no_data when array empty or k > length -> overlay hidden and no-windows UI', async () => {
      // Ensure empty input triggers no_data
      // Clear or set array to empty
      try {
        await app.setArray('');
      } catch {
        // if input not found, we continue to use UI as-is
      }
      // Set k to 3 to provoke no windows (if array empty)
      try {
        await app.setWindowSize(3);
      } catch {}
      // Click apply to trigger computing
      await app.clickApply();

      // Wait a short time for computing to finish and no_data to establish
      const observedState = await app.waitForState((s) => {
        if (!s) return false;
        return /no[_-]?data|noData|no-data|no windows|no_windows/i.test(String(s));
      }, 1500);

      // If the implementation sets data-state, assert it indicates no_data (best-effort)
      if (observedState) {
        expect(String(observedState).toLowerCase()).toContain('no');
      } else {
        // Fallback: check for visible "no windows"/message text or overlay hidden
        const possibleMsg = page.getByText(/no valid windows|no windows|no data|nothing to show/i).first();
        if ((await possibleMsg.count()) > 0) {
          expect(await possibleMsg.isVisible()).toBeTruthy();
        } else {
          // Check overlay hidden if overlay exists
          const overlayVisible = await app.isOverlayVisible();
          expect(overlayVisible).toBeFalsy();
        }
      }
    });

    test('computing -> ready when a valid array is applied; UI updated with first window', async () => {
      // Provide valid array and window size, aggregation sum
      await app.setArray('1,2,3,4,5');
      await app.setWindowSize(3);
      await app.setAggregation('sum');

      // Click apply -> computing should happen then ready
      await app.clickApply();

      // If the app uses data-state attribute, wait for computing then ready
      const stateAfter = await app.waitForState((s) => {
        if (!s) return false;
        return /ready|computing|no[_-]?data/i.test(String(s));
      }, 2500);

      // Assert we reached ready (or at least not no_data)
      const readyState = await app.waitForState('ready', 3000);

      // If readyState found: good
      if (readyState && String(readyState).toLowerCase().includes('ready')) {
        expect(String(readyState).toLowerCase()).toContain('ready');
      } else {
        // fallback checks: overlay visible and result displayed (sum of first 3 elements = 6)
        const overlayVisible1 = await app.isOverlayVisible();
        expect(overlayVisible).toBeTruthy();

        const resultText = await app.getResultText();
        // Allow result text to include 6 somewhere
        expect(resultText).toMatch(/6|6\.0/);
      }

      // Check window indices/narration indicates [0..2] or first window
      const indices = await app.getWindowIndicesText();
      if (indices) {
        expect(indices.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('State: ready -> sliding (manual step) and transitions via next/prev/keys', () => {
    test('CLICK_NEXT and KEY_RIGHT produce sliding and then ready; UI updates result and ops count', async () => {
      await app.setArray('2,1,3,4');
      await app.setWindowSize(2);
      await app.setAggregation('sum');
      await app.clickApply();

      // Ensure ready (best-effort)
      await app.waitForState('ready', 2000);

      // Read initial result (sum of first 2: 3)
      const initial = await app.getResultText();

      // Click Next to slide forward by 1
      await app.clickNext();

      // Wait for sliding to complete (SLIDE_DONE -> ready)
      await app.waitForState('ready', 2500);

      const after = await app.getResultText();
      // Expect change from initial (3) to next window (1+3=4)
      expect(after).not.toBe(initial);
      expect(after).toMatch(/4|4\.0/);

      // Press keyboard right arrow to slide again
      await app.pressKey('ArrowRight');

      await app.waitForState('ready', 2500);
      const after2 = await app.getResultText();
      // Next window sum (3+4=7)
      expect(after2).toMatch(/7|7\.0/);

      // Check ops count text present or changed
      const ops = await app.getOpsCountText();
      if (ops) {
        // Expect some numeric or descriptive content
        expect(ops.length).toBeGreaterThan(0);
      }
    });

    test('CLICK_PREV and KEY_LEFT slide backward and update UI', async () => {
      await app.setArray('5,6,7,8');
      await app.setWindowSize(2);
      await app.setAggregation('sum');
      await app.clickApply();

      await app.waitForState('ready', 2000);

      // Move forward once to be able to go prev
      await app.clickNext();
      await app.waitForState('ready', 2000);

      const mid = await app.getResultText();

      // Now click Prev
      await app.clickPrev();
      await app.waitForState('ready', 2000);
      const back = await app.getResultText();
      // Expect we returned to initial window (5+6=11)
      expect(back).not.toBe(mid);
      expect(back).toMatch(/11|11\.0/);

      // Press Key Left to ensure keyboard prev also works
      await app.pressKey('ArrowLeft');
      await app.waitForState('ready', 2000);
      const afterLeft = await app.getResultText();
      // Since we were at first window, prev may stay or wrap; at least result text present
      expect(afterLeft.length).toBeGreaterThan(0);
    });
  });

  test.describe('State: playing -> sliding via TIMER_TICK and stopPlay', () => {
    test('CLICK_PLAY starts autoplay (playing), TIMER_TICK triggers sliding; clicking again stops play', async () => {
      await app.setArray('1,2,3,4');
      await app.setWindowSize(2);
      await app.setAggregation('sum');
      await app.clickApply();

      // Speed up timer if possible
      await app.setSpeed(10);

      // Ensure ready
      await app.waitForState('ready', 2000);

      const initial1 = await app.getResultText();

      // Start play
      await app.clickPlay();

      // Wait a short time for autoplay to perform at least one tick and sliding
      await page.waitForTimeout(600); // small wait - speed set low above

      // Reading result after autoplay tick
      const after1 = await app.getResultText();
      // Expect change from initial
      expect(after).not.toBe(initial);

      // Stop play (click play toggles)
      await app.clickPlay();

      // Wait for ready (stopPlay)
      await app.waitForState('ready', 2000);

      // Ensure that no further automatic changes happen after stopping
      const snapshot = await app.getResultText();
      await page.waitForTimeout(500);
      const snapshot2 = await app.getResultText();
      expect(snapshot2).toBe(snapshot);
    });
  });

  test.describe('State: dragging -> POINTER_UP (adjacent -> sliding) and (jump -> computing)', () => {
    test('Small drag snaps to adjacent index -> triggers sliding (incremental update)', async () => {
      await app.setArray('1,2,3,4,5');
      await app.setWindowSize(3);
      await app.setAggregation('sum');
      await app.clickApply();
      await app.waitForState('ready', 2000);

      const before = await app.getResultText();

      // Drag overlay slightly to simulate adjacent snap
      try {
        await app.dragOverlayBy(40, 0); // small dx -> adjacent
      } catch (e) {
        test.skip('Overlay drag not supported in this build: ' + e.message);
        return;
      }

      // After drag, sliding should occur and return to ready
      await app.waitForState('ready', 2500);
      const after21 = await app.getResultText();

      expect(after).not.toBe(before);
      // For incremental sum, change should be minimal: e.g., 1+2+3 -> 2+3+4
    });

    test('Large drag jump snaps with jump >1 -> triggers recompute (computing -> ready)', async () => {
      await app.setArray('10,20,30,40,50,60,70');
      await app.setWindowSize(2);
      await app.setAggregation('max'); // using max often forces recompute in many implementations
      await app.clickApply();
      await app.waitForState('ready', 2000);

      // Drag overlay far to simulate jump
      try {
        await app.dragOverlayBy(300, 0); // large dx -> jump
      } catch (e) {
        test.skip('Overlay drag not supported in this build: ' + e.message);
        return;
      }

      // Wait for computing/recompute; try to detect computing state or indication
      const observed = await app.waitForState((s) => {
        if (!s) return false;
        return /computing|recomputing|comput(e|ing)/i.test(String(s));
      }, 3500);

      // If computing state found, great. Otherwise look for evidence of recompute via narration
      if (observed) {
        expect(String(observed).toLowerCase()).toMatch(/comput/);
      } else {
        const msg = await app.getResultText();
        expect(msg.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('State: change parameters (CHANGE_WINDOW_SIZE, CHANGE_AGG, APPLY_ARRAY) and reset', () => {
    test('Changing window size while ready triggers computing and recompute to ready', async () => {
      await app.setArray('1,2,3,4,5');
      await app.setWindowSize(2);
      await app.setAggregation('sum');
      await app.clickApply();

      await app.waitForState('ready', 2000);

      // Change window size to 4 -> triggers computing
      await app.setWindowSize(4);
      // Some implementations auto-recompute on change; others require click apply
      // Try both: click apply to be safe
      await app.clickApply();

      // Wait for computing -> ready
      const s = await app.waitForState('ready', 3000);
      if (s && String(s).toLowerCase().includes('ready')) {
        expect(String(s).toLowerCase()).toContain('ready');
      } else {
        // fallback: result should reflect window size 4 (sum of first 4 = 10)
        const res = await app.getResultText();
        expect(res).toMatch(/10|10\.0/);
      }
    });

    test('CLICK_RESET triggers computing (recompute initial) and UI resets to first window', async () => {
      await app.setArray('3,1,4,1,5');
      await app.setWindowSize(2);
      await app.setAggregation('sum');
      await app.clickApply();

      await app.waitForState('ready', 2000);
      // Move forward
      await app.clickNext();
      await app.waitForState('ready', 2000);
      const moved = await app.getResultText();

      // Reset
      await app.clickReset();

      // Expect computing then ready and reset to initial window (3+1=4)
      await app.waitForState('ready', 3000);
      const afterReset = await app.getResultText();
      expect(afterReset).not.toBe(moved);
      expect(afterReset).toMatch(/4|4\.0/);
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('Changing aggregation to a non-incremental op (e.g., max) causes recomputeWindow on sliding', async () => {
      await app.setArray('1,5,2,9,3');
      await app.setWindowSize(2);
      await app.setAggregation('max');
      await app.clickApply();

      await app.waitForState('ready', 2000);

      const before1 = await app.getResultText();

      // Slide next - for max this often triggers recompute instead of O(1) incremental
      await app.clickNext();

      // Wait for computing or ready
      const s1 = await app.waitForState((st) => {
        if (!st) return false;
        return /computing|ready/i.test(String(st));
      }, 3500);

      // At minimum, we should arrive at ready and have a valid result
      await app.waitForState('ready', 3000);
      const after3 = await app.getResultText();
      expect(after.length).toBeGreaterThan(0);
      expect(after).not.toBeUndefined();
    });

    test('Applying array with whitespace, different separators is handled', async () => {
      // some UIs accept spaces or semicolons
      await app.setArray(' 1  , 2 ; 3 |4 ');
      await app.setWindowSize(2);
      await app.setAggregation('sum');
      await app.clickApply();

      await app.waitForState('ready', 3000);

      const res1 = await app.getResultText();
      // Expect some numeric result
      expect(res.length).toBeGreaterThan(0);
      expect(res).toMatch(/\d+/);
    });
  });
});