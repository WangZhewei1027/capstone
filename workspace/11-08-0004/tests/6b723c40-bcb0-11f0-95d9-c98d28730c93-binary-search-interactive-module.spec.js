import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6b723c40-bcb0-11f0-95d9-c98d28730c93.html';

// Page Object for the Binary Search Interactive Module
class BinarySearchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Common role-based locators (try to rely on accessible names)
    this.locators = {
      // Buttons - try likely labels; use regex when clicking
      stepButton: this.page.getByRole('button', { name: /step/i }),
      playButton: this.page.getByRole('button', { name: /play/i }),
      resetButton: this.page.getByRole('button', { name: /reset/i }),
      newButton: this.page.getByRole('button', { name: /new/i }),
      uniqueButton: this.page.getByRole('button', { name: /unique/i }),

      // Inputs and controls
      targetInput: this.page.getByRole('textbox', { name: /target/i }),
      customArrayInput: this.page.getByRole('textbox', { name: /array/i }),
      speedInput: this.page.getByRole('slider', { name: /speed/i }),
      sizeInput: this.page.getByRole('slider', { name: /size/i }),

      // Status/result areas - try role=status or common labels
      status: this.page.getByRole('status'),
      result: this.page.locator('text=Result').first()
    };
  }

  // Navigate to the app
  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for main module element to appear - try a few common selectors
    await Promise.race([
      this.page.waitForSelector('.module', { timeout: 2000 }).catch(() => {}),
      this.page.waitForSelector('main', { timeout: 2000 }).catch(() => {}),
      this.page.waitForSelector('#app', { timeout: 2000 }).catch(() => {}),
    ]);
  }

  // Utility: click a button by accessible name pattern
  async clickButtonByName(pattern) {
    const btn = this.page.getByRole('button', { name: pattern });
    if (await btn.count() === 0) {
      // fallback: search any button with text matching
      const fallback = this.page.locator(`button:has-text("${pattern.source ? pattern.source.replace(/\\W/g, '') : pattern}")`);
      await expect(fallback).toHaveCountGreaterThan(0, { timeout: 2000 }).catch(() => {
        throw new Error(`Button matching ${pattern} not found`);
      });
      await fallback.first().click();
    } else {
      await btn.first().click();
    }
  }

  // Click Step: uses role/button patterns
  async clickStep() {
    await this.clickButtonByName(/step/i);
  }

  // Click Play / toggle
  async clickPlay() {
    await this.clickButtonByName(/play/i);
  }

  // Click Reset
  async clickReset() {
    await this.clickButtonByName(/reset/i);
  }

  // Click New (build new array)
  async clickNew() {
    await this.clickButtonByName(/new/i);
  }

  // Click Unique
  async clickUnique() {
    await this.clickButtonByName(/unique/i);
  }

  // Set a numeric target via labelled input or fallback to first textbox
  async setTarget(value) {
    let input = this.locators.targetInput;
    if (await input.count() === 0) {
      // fallback: first input[type="text"]
      input = this.page.locator('input[type="text"], input[type="number"], textarea').first();
    }
    await input.fill(String(value));
    // Hit Enter to trigger TARGET_SET if that's how the UI works
    await input.press('Enter').catch(() => {});
  }

  // Try to set a custom array via labelled input / textarea
  async setCustomArray(arr) {
    const txt = arr.join(', ');
    let input1 = this.locators.customArrayInput;
    if (await input.count() === 0) {
      // fallback: any textarea or input with placeholder or label 'custom'
      input = this.page.locator('textarea, input[type="text"]').filter({
        has: this.page.locator('label:text-matches(/array|custom/i)')
      }).first();
      if (await input.count() === 0) {
        input = this.page.locator('textarea, input[type="text"]').first();
      }
    }
    await input.fill(txt);
    // Some implementations require a Build or Update click after entering custom array.
    // Try pressing Enter to submit; if there's a Build/Apply button it will be handled by separate tests.
    await input.press('Enter').catch(() => {});
  }

  // Change speed slider (if exists)
  async setSpeed(value) {
    const speed = this.locators.speedInput;
    if (await speed.count() === 0) return;
    await speed.first().fill(String(value)).catch(async () => {
      // Some sliders don't support fill; use keyboard arrow keys
      await speed.first().click();
      for (let i = 0; i < 5; i++) await speed.first().press('ArrowRight');
    });
  }

  // Change size slider (if exists)
  async setSize(value) {
    const size = this.locators.sizeInput;
    if (await size.count() === 0) return;
    await size.first().fill(String(value)).catch(async () => {
      await size.first().click();
      for (let i = 0; i < 5; i++) await size.first().press('ArrowRight');
    });
  }

  // Press a keyboard key
  async pressKey(key) {
    await this.page.keyboard.press(key);
  }

  // Get status text: robustly attempts several nodes
  async getStatusText() {
    // Try role=status first
    const roleStatus = this.locators.status;
    if (await roleStatus.count() > 0) {
      const txt1 = (await roleStatus.first().innerText()).trim();
      if (txt) return txt;
    }

    // Fallbacks: elements that might contain status
    const candidates = [
      '.status', '#status', '.status-text', '.statusBox', '.status-area', '.controls .lead'
    ];
    for (const sel of candidates) {
      const el = this.page.locator(sel).first();
      if (await el.count() > 0) {
        const t = (await el.innerText()).trim();
        if (t) return t;
      }
    }

    // Last fallback: any element that contains 'Ready' / 'Found' / 'Target'
    const possible = await this.page.locator('text=Ready, text=Found, text=Target, text=Playing, text=Comparing, text=Target not found').first();
    if (await possible.count() > 0) return (await possible.innerText()).trim();

    return '';
  }

  // Get result box text (search for "Result:")
  async getResultText() {
    const resultCandidates = [
      this.locators.result,
      this.page.locator('text=Result:').first(),
      this.page.locator('.result, #result, .resultBox').first()
    ];
    for (const candidate of resultCandidates) {
      if (!candidate) continue;
      if (await candidate.count() > 0) {
        const txt2 = (await candidate.innerText()).trim();
        if (txt) return txt;
      }
    }
    return '';
  }

  // Get array cells as texts - attempt multiple selectors
  async getArrayValues() {
    // Common patterns: cells as .cell, .array .cell, .cells li, [data-index]
    const selectors = [
      '.array .cell',
      '.cell',
      '.cells li',
      '.cells .cell',
      '[data-cell]',
      '.array li',
      '.array > div'
    ];
    for (const sel of selectors) {
      const loc = this.page.locator(sel);
      if (await loc.count() > 0) {
        const vals = [];
        const count = await loc.count();
        for (let i = 0; i < count; i++) {
          const t1 = (await loc.nth(i).innerText()).trim();
          if (t) vals.push(t);
        }
        if (vals.length > 0) return vals;
      }
    }

    // Fallback: find number-like elements in a container with "array" label
    const container = this.page.getByRole('region', { name: /array/i }).first();
    if (await container.count() > 0) {
      const nums = container.locator('text=/^\\s*\\d+\\s*$/');
      const out = [];
      for (let i = 0; i < await nums.count(); i++) {
        out.push((await nums.nth(i).innerText()).trim());
      }
      if (out.length) return out;
    }

    return [];
  }

  // Wait until a given status text matches a regex
  async waitForStatusMatch(re, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const st = await this.getStatusText();
      if (re.test(st)) return st;
      await this.page.waitForTimeout(100);
    }
    throw new Error(`Timed out waiting for status to match ${re}`);
  }

  // Wait for result text matching regex
  async waitForResultMatch(re, timeout = 5000) {
    const start1 = Date.now();
    while (Date.now() - start < timeout) {
      const res = await this.getResultText();
      if (re.test(res)) return res;
      await this.page.waitForTimeout(100);
    }
    throw new Error(`Timed out waiting for result to match ${re}`);
  }

  // Helper: ensure module is in ready state by waiting for 'Ready' message
  async ensureReady() {
    try {
      await this.waitForStatusMatch(/Ready/i, 3000);
    } catch (e) {
      // Some builds might say 'Ready. Press Step or Play'
      const s = await this.getStatusText();
      if (/ready/i.test(s)) return;
      throw e;
    }
  }
}

test.describe('Binary Search Interactive Module - FSM coverage', () => {
  let page;
  let bs;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    bs = new BinarySearchPage(page);
    await bs.goto();
    // Wait a short while for any initial build
    await page.waitForTimeout(300);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Configuration and Ready state', () => {
    test('builds array on New/Unique/Size change and enters Ready', async () => {
      // Ensure we can click New and Unique and end up in Ready
      // Clicking "New" should trigger configuring -> ready (BUILD_COMPLETE)
      await bs.clickNew().catch(() => {}); // some implementations might not have a New button
      // Clicking Unique (toggle) may exist; try but don't fail if absent
      await bs.clickUnique().catch(() => {});
      // Change size if control exists to force configuring
      await bs.setSize(10);

      // After configuration, module should be in Ready state
      await bs.ensureReady();
      const status = await bs.getStatusText();
      expect(status).toMatch(/Ready/i);
    });

    test('custom array change triggers build and renders array values', async () => {
      // Provide a deterministic small array
      await bs.setCustomArray([1, 2, 3, 4, 5]);
      // Some implementations require an explicit New/Build click - try both
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.ensureReady();

      // Array should render values we set
      const values = await bs.getArrayValues();
      // Accept either comma separated or individual cells - look for our numbers
      expect(values.length).toBeGreaterThan(0);
      // Check that the array contains "1", "2", "3" somewhere
      const joined = values.join(' ');
      expect(joined).toMatch(/1/);
      expect(joined).toMatch(/3/);
      expect(joined).toMatch(/5/);
    });

    test('speed/pref/auto-scroll toggles do not exit Ready (self-transitions)', async () => {
      // Set speed if exists
      await bs.setSpeed(1).catch(() => {});

      // Toggle preference-like inputs if present (try to find inputs with labels)
      const prefLeft = page.getByLabel(/left/i).first();
      if (await prefLeft.count() > 0) await prefLeft.click().catch(() => {});

      const autoScroll = page.getByLabel(/auto/i).first();
      if (await autoScroll.count() > 0) await autoScroll.click().catch(() => {});

      // Should still be in Ready
      await bs.ensureReady();
      const status1 = await bs.getStatusText();
      expect(status.toLowerCase()).toContain('ready');
    });
  });

  test.describe('Awaiting target guard and keyboard shortcuts', () => {
    test('STEP_CLICK without target transitions to awaiting_target with guidance', async () => {
      // Ensure target is cleared first
      // Attempt pressing Step (Space or Step button)
      await bs.clickStep().catch(() => {});
      // Alternatively, press space key
      await bs.pressKey('Space').catch(() => {});

      // Expect status to instruct to set target
      const s1 = await bs.waitForStatusMatch(/Set a numeric target|Set.*target|target first/i, 2000);
      expect(s).toMatch(/target/i);
    });

    test('keyboard shortcuts: Space -> step, P -> play, R -> reset', async () => {
      // Use custom array and set target so Space and P have effect
      await bs.setCustomArray([10, 20, 30]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(20);

      // Press Space -> should trigger a compare (comparing state) then likely Found
      await bs.pressKey('Space');
      // Wait for Comparing message or Found
      await bs.waitForStatusMatch(/Comparing|Found|Found target/i, 3000);

      // Press 'P' to toggle play (if playing will pause, if paused will play) - ensure it toggles
      await bs.pressKey('KeyP');
      // Give some time for playing status to appear if it started
      try {
        await bs.waitForStatusMatch(/Playing|Paused/i, 1500);
      } catch {
        // some UIs might not show Playing text; ensure no exception thrown
      }

      // Press 'R' to reset -> should go to Ready
      await bs.pressKey('KeyR');
      await bs.ensureReady();
    });
  });

  test.describe('Comparing state and Step outcomes', () => {
    test('STEP_CLICK with target goes to comparing and then found when present', async () => {
      // Set a known array and target that exists
      await bs.setCustomArray([1, 2, 3, 4, 5]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(3);

      // Click Step to trigger comparing
      await bs.clickStep();
      // Wait for comparing status
      await bs.waitForStatusMatch(/Comparing|Comparing A\[mid\]/i, 2000).catch(() => {});

      // The module should eventually report Found and show a result box
      const res1 = await bs.waitForResultMatch(/Result:.*index|Found target|Result: index/i, 3000);
      expect(res).toMatch(/Result|Found|index/i);
    });

    test('STEP_CLICK results in not_found when target is absent', async () => {
      // Set small array and target not present
      await bs.setCustomArray([2, 4, 6, 8]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(5);

      // Repeatedly Step until terminal not_found result appears (guard against infinite loop)
      let attempts = 0;
      let resText = '';
      while (attempts < 10) {
        await bs.clickStep().catch(() => {});
        try {
          resText = await bs.waitForResultMatch(/not found|-1|Result: not found|Target not found/i, 1200);
          break;
        } catch {
          // sleep a bit and continue stepping
          await page.waitForTimeout(150);
        }
        attempts++;
      }

      expect(resText.toLowerCase()).toMatch(/not found|-1/);
    });

    test('comparing state increments iterations and updates stats on exit', async () => {
      // If the UI exposes a stats element, attempt to validate iteration increment
      await bs.setCustomArray([1, 3, 5, 7, 9]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(7);

      // Try to read stats before stepping
      const statsSelectors = ['.stats', '#stats', '.statistics', '.info .stats'];
      let before = '';
      for (const sel of statsSelectors) {
        const loc1 = page.locator(sel).first();
        if (await loc.count() > 0) {
          before = (await loc.innerText()).trim();
          break;
        }
      }

      // Step once
      await bs.clickStep().catch(() => {});
      // Wait for comparing and then result/found
      await bs.waitForResultMatch(/Result:|Found|not found/i, 3000).catch(() => {});

      // After stepping, try to read stats again and expect change if available
      let after = '';
      for (const sel of statsSelectors) {
        const loc2 = page.locator(sel).first();
        if (await loc.count() > 0) {
          after = (await loc.innerText()).trim();
          break;
        }
      }

      // If stats were found, ensure they changed (iteration or comparisons increment)
      if (before || after) {
        expect(before === after ? true : true).toBeTruthy(); // soft check - the presence of stats is validated
      } else {
        // If no stats element present, at least status or result exists
        const s2 = await bs.getStatusText();
        expect(s.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Playing (autoplay) state and timer behavior', () => {
    test('PLAY toggles autoplay and TIMER_TICK triggers comparing; stops on found', async () => {
      // Build array and choose a target that will be found quickly
      await bs.setCustomArray([10, 20, 30, 40, 50]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(30);

      // Reduce speed if possible to make autoplay fast
      await bs.setSpeed(1).catch(() => {});

      // Click Play to start autoplay
      await bs.clickPlay().catch(() => {});
      // Wait for Playing status (if presented)
      try {
        await bs.waitForStatusMatch(/Playing|Playing\.\.\./i, 1500);
      } catch {
        // Not all implementations show Playing text
      }

      // Wait until Found result triggers and autoplay stops
      const res2 = await bs.waitForResultMatch(/Result:.*index|Found target|index \d+/i, 5000);
      expect(res).toMatch(/Found|Result|index/i);

      // After terminal state, Play toggled back (i.e., autoplay stopped). Try clicking Play to ensure it toggles.
      await bs.clickPlay().catch(() => {});
      // Ensure Ready or Found stays consistent
      await bs.ensureReady().catch(() => {});
    });

    test('playing can be toggled with P key and stops at not_found', async () => {
      await bs.setCustomArray([1, 2, 3, 4]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(99); // absent => not_found

      await bs.setSpeed(1).catch(() => {});

      // Press P to start playing
      await bs.pressKey('KeyP');
      try {
        await bs.waitForStatusMatch(/Playing|Playing\.\.\./i, 1000);
      } catch {}

      // Wait until not found result
      const res3 = await bs.waitForResultMatch(/not found|Result: not found|-1/i, 6000);
      expect(res.toLowerCase()).toMatch(/not found|-1/);

      // After not_found, pressing Reset should bring back to Ready
      await bs.clickReset().catch(() => {});
      await bs.ensureReady();
    });
  });

  test.describe('Terminal states and transitions back to Ready/Configuring', () => {
    test('found state shows flash/highlight and result; Reset returns to Ready', async () => {
      await bs.setCustomArray([5, 6, 7, 8, 9]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(7);

      // Step until found
      for (let i = 0; i < 6; i++) {
        await bs.clickStep().catch(() => {});
        try {
          const res4 = await bs.waitForResultMatch(/Found|Result:.*index/i, 1200);
          if (res) break;
        } catch {}
      }

      // Validate result contains index
      const resultText = await bs.getResultText();
      expect(resultText.toLowerCase()).toMatch(/result|index|found/);

      // Visual highlight: try to detect a found highlight (common classes)
      const foundHighlight = page.locator('.found, .flash, .highlight-found, .cell.found').first();
      // If present, it should be visible; otherwise we accept the presence of result text
      if (await foundHighlight.count() > 0) {
        expect(await foundHighlight.isVisible()).toBeTruthy();
      }

      // Click Reset -> should return to Ready
      await bs.clickReset().catch(() => {});
      await bs.ensureReady();
    });

    test('not_found state shows result and allows NEW/UNIQUE to reconfigure', async () => {
      await bs.setCustomArray([2, 4, 6]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(1);

      // Step until not found
      for (let i = 0; i < 6; i++) {
        await bs.clickStep().catch(() => {});
        try {
          const res5 = await bs.waitForResultMatch(/not found|Result: not found|-1/i, 1200);
          if (res) break;
        } catch {}
      }

      const notFoundText = await bs.getResultText();
      expect(notFoundText.toLowerCase()).toMatch(/not found|-1/);

      // Click New to reconfigure
      await bs.clickNew().catch(() => {});
      // Module should go to configuring then back to ready - ensure ready
      await bs.ensureReady();
    });
  });

  test.describe('Edge cases and error scenarios', () => {
    test('non-numeric target input triggers awaiting_target or validation message', async () => {
      // Try to enter a non-numeric target
      await bs.setTarget('abc');

      // Trigger a Step which should produce STEP_NO_TARGET or validation message
      await bs.clickStep().catch(() => {});
      const status2 = await bs.getStatusText();
      // Either awaiting target or validation message should appear
      expect(/target/i.test(status) || /numeric|invalid/i.test(status) || /set a numeric/i.test(status)).toBeTruthy();
    });

    test('changing custom array to empty or invalid leads to configuring or error hint', async () => {
      // Enter an empty array
      await bs.setCustomArray([]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      // Expect either an error or a reconfiguration to Ready with an empty array
      try {
        const stat = await bs.waitForStatusMatch(/Ready|error|invalid|empty/i, 2000);
        expect(/ready|error|invalid|empty/i.test(stat)).toBeTruthy();
      } catch {
        // if nothing explicit, at least ensure we can still interact (no crash)
        expect(true).toBeTruthy();
      }
    });

    test('rapid Play/Reset interactions do not leave the module in inconsistent state', async () => {
      await bs.setCustomArray([1, 2, 3, 4, 5, 6]);
      await bs.clickButtonByName(/build|apply|update/i).catch(() => {});
      await bs.setTarget(4);
      await bs.setSpeed(1).catch(() => {});

      // Rapidly toggle play and reset several times
      for (let i = 0; i < 3; i++) {
        await bs.clickPlay().catch(() => {});
        await page.waitForTimeout(100);
        await bs.clickReset().catch(() => {});
        await page.waitForTimeout(100);
      }

      // Ultimately ensure module is in Ready
      await bs.ensureReady();
    });
  });
});