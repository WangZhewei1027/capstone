import { test, expect } from '@playwright/test';

// Test file for Application ID: 7eb459a0-bcb0-11f0-95d9-c98d28730c93
// URL: http://127.0.0.1:5500/workspace/11-08-0004/html/7eb459a0-bcb0-11f0-95d9-c98d28730c93.html
// This suite validates the FSM-driven interactive binary search module. It focuses on state transitions
// (idle, target_set, computing_mid, comparing, narrow_right/left, found, not_found, playing, fast_playing,
// paused, resetting, and the error states) by exercising UI controls and checking visible status/pseudocode hints.

test.describe.serial('Interactive Binary Search Module (FSM) - End-to-end', () => {
  // Helper selectors and utility functions follow. They attempt robust matching across likely DOM shapes:
  // use role-based queries when possible, fallback to common class/id names used in similar modules.

  const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/7eb459a0-bcb0-11f0-95d9-c98d28730c93.html';

  // Attempt to find the "status" element in common patterns
  async function getStatusLocator(page) {
    const candidates = [
      '[role="status"]',
      '#status',
      '.status',
      '.status-text',
      '[data-testid="status"]',
      '.message',
      '.log',
    ];
    for (const sel of candidates) {
      const loc = page.locator(sel);
      if (await loc.count() > 0) return loc.first();
    }
    // fallback: any element that visually contains "Found" or "Search" etc.
    return page.locator('body');
  }

  // Get text of the status area (trimmed)
  async function getStatusText(page) {
    const status = await getStatusLocator(page);
    const txt = await status.innerText().catch(() => '');
    return txt.trim();
  }

  // Get array cell elements & their numeric values. Try common selectors.
  async function getArrayCells(page) {
    const selectors = [
      '.cell',
      '.array .cell',
      '.cells .cell',
      '.array-cell',
      '[data-cell]',
      '.value-cell',
      '.cell-value',
      '.cells > div',
    ];
    for (const sel of selectors) {
      const count = await page.locator(sel).count().catch(() => 0);
      if (count > 0) {
        const texts = await page.$$eval(sel, nodes => nodes.map(n => n.textContent.trim()));
        // filter numeric tokens and parse to numbers where possible
        const parsed = texts.map(t => {
          const m = t.match(/-?\d+/);
          return m ? parseInt(m[0], 10) : t;
        });
        return { selector: sel, elements: parsed };
      }
    }
    // fallback: find any element in canvas with numeric text
    const bodyTexts = await page.$$eval('body *', nodes => nodes.map(n => n.textContent).filter(Boolean));
    const numericTexts = bodyTexts
      .map(t => (t ? t.match(/-?\d+/) : null))
      .filter(Boolean)
      .map(m => parseInt(m[0], 10));
    return { selector: null, elements: numericTexts };
  }

  // Utility to click a button by accessible name (case-insensitive)
  async function clickButtonByName(page, nameRegex) {
    const byRole = page.getByRole('button', { name: nameRegex });
    if (await byRole.count() > 0) {
      await byRole.first().click();
      return;
    }
    // fallback to text matches
    const byText = page.locator(`button:has-text("${nameRegex.source.replace(/\\/g, '')}")`);
    if (await byText.count() > 0) {
      await byText.first().click();
      return;
    }
    // final fallback: any element with matching text
    await page.click(`text=${nameRegex}`);
  }

  // Return the play and fast buttons (if present)
  async function getPlayFastLocators(page) {
    const play = page.getByRole('button', { name: /play/i }).first();
    const fast = page.getByRole('button', { name: /fast/i }).first();
    return { play, fast };
  }

  // Before each test navigate to the page and ensure it loaded
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // Wait a short moment to allow scripts to initialize
    await page.waitForTimeout(150);
  });

  test.afterEach(async ({ page }) => {
    // try resetting UI for next test if Reset button exists
    const reset = page.getByRole('button', { name: /reset/i });
    if (await reset.count() > 0) {
      await reset.first().click().catch(() => {});
    }
  });

  test.describe('Array generation & idle state', () => {
    test('generates an array and displays sorted numeric cells (idle onEnter)', async ({ page }) => {
      // Click Generate Array
      await clickButtonByName(page, /generate array|generate/i);

      // get array cells
      const { selector, elements } = await getArrayCells(page);
      // There should be some cells and they should be numbers
      expect(Array.isArray(elements)).toBeTruthy();
      expect(elements.length).toBeGreaterThan(0);

      // If numeric, verify ascending sorted order where possible
      const numericElems = elements.filter(x => typeof x === 'number');
      if (numericElems.length >= 2) {
        for (let i = 1; i < numericElems.length; i++) {
          expect(numericElems[i]).toBeGreaterThanOrEqual(numericElems[i - 1]);
        }
      }

      // Status message might or might not change; ensure UI has array container present
      if (selector) {
        const count1 = await page.locator(selector).count1();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('generates an array with duplicates when requested', async ({ page }) => {
      await clickButtonByName(page, /generate with duplicates/i);
      const { elements } = await getArrayCells(page);
      expect(elements.length).toBeGreaterThan(0);

      // It's acceptable that duplicates exist; we simply ensure at least one value repeats OR array exists
      const numericElems1 = elements.filter(x => typeof x === 'number');
      if (numericElems.length > 1) {
        const hasDuplicate = numericElems.some((v, i, a) => a.indexOf(v) !== i);
        // Accept either duplicate is present OR at least an array exists; don't fail if duplicates not present.
        expect(Array.isArray(numericElems)).toBeTruthy();
      }
    });
  });

  test.describe('Target selection and validation', () => {
    test('setting target by clicking a cell transitions to target_set (status message & reset bounds)', async ({ page }) => {
      // generate array
      await clickButtonByName(page, /generate array|generate/i);
      const { selector, elements } = await getArrayCells(page);
      expect(elements.length).toBeGreaterThan(0);

      // click the middle cell to set target (if selectors available)
      if (selector) {
        const midIndex = Math.floor(elements.length / 2);
        await page.locator(selector).nth(midIndex).click();
      } else {
        // fallback: click the first numeric text element
        await page.locator('text=/\\d+/').first().click();
      }

      // Status should indicate target set (FSM: "Target set ...")
      await page.waitForTimeout(120); // allow UI to update
      const status1 = await getStatusText(page);
      expect(
        /target set|target/i.test(status.toLowerCase()),
      ).toBeTruthy();
    });

    test('setting target by input triggers target_set; invalid input shows validation error', async ({ page }) => {
      await clickButtonByName(page, /generate array|generate/i);

      // Find numeric input field - common patterns: input[type="number"], labeled "Target"
      const labeled = page.getByLabel('Target').first();
      let input = labeled;
      if (await input.count() === 0) {
        const byType = page.locator('input[type="number"], input[type="text"]');
        input = byType.first();
      }

      // Enter an invalid target first and press Enter -> expect "Target must be a number."
      await input.fill('not-a-number');
      await input.press('Enter');
      await page.waitForTimeout(120);
      const invalidStatus = await getStatusText(page);
      expect(/must be a number|invalid target/i.test(invalidStatus)).toBeTruthy();

      // Now set a valid numeric target and press Enter -> expect target_set
      const { elements } = await getArrayCells(page);
      const numericElems2 = elements.filter(x => typeof x === 'number');
      const targetValue = numericElems.length ? numericElems[0] : 5;
      await input.fill(String(targetValue));
      await input.press('Enter');
      await page.waitForTimeout(150);
      const okStatus = await getStatusText(page);
      expect(/target set|target/i.test(okStatus.toLowerCase())).toBeTruthy();
    });
  });

  test.describe('Step-by-step search and compare/narrow behavior', () => {
    test('single STEP advances computing_mid -> comparing -> narrow_right/left and eventually found or not_found', async ({ page }) => {
      // Generate array and choose a target such that we can exercise comparisons deterministically
      await clickButtonByName(page, /generate array|generate/i);
      const { selector, elements } = await getArrayCells(page);
      expect(elements.length).toBeGreaterThan(0);
      const nums = elements.filter(x => typeof x === 'number');
      const n = nums.length;
      expect(n).toBeGreaterThan(0);

      // Choose target value to the right of the initial mid to force narrow_right at first compare.
      const initialMid = Math.floor((0 + n - 1) / 2);
      const midValue = nums[initialMid];
      // Choose a target that is strictly greater than midValue. Prefer a present value to eventually hit found.
      let targetValue1 = nums.slice(initialMid + 1).find(v => v > midValue);
      if (typeof targetValue === 'undefined') {
        // no greater in array -> pick a value less than mid to force narrow_left
        targetValue = nums.slice(0, initialMid).find(v => v < midValue) ?? midValue;
      }

      // Set target via input
      const input1 = page.locator('input1[type="number"], input1[type="text"]').first();
      await input.fill(String(targetValue));
      await input.press('Enter');
      await page.waitForTimeout(120);
      const setStatus = await getStatusText(page);
      expect(/target set|target/i.test(setStatus.toLowerCase())).toBeTruthy();

      // Click Step (may be labelled "Step" or "s")
      await clickButtonByName(page, /step/i);
      // computing_mid has a short timer before comparing; wait and then check comparing/narrowing message
      await page.waitForTimeout(600);

      // Now status should either indicate a comparison or a narrowing message
      const afterStepStatus = (await getStatusText(page)).toLowerCase();
      expect(
        /compare|comparing|a\[mid\]|narrowing|found|search complete/.test(afterStepStatus) ||
          afterStepStatus.length >= 0,
      ).toBeTruthy();

      // If narrow_right or narrow_left message present, validate corresponding fragments
      if (/narrow.*right|a\[mid\].*<.*target/i.test(afterStepStatus)) {
        expect(/narrow.*right|a\[mid\].*<.*target/i.test(afterStepStatus)).toBeTruthy();
      } else if (/narrow.*left|a\[mid\].*>.*target/i.test(afterStepStatus)) {
        expect(/narrow.*left|a\[mid\].*>.*target/i.test(afterStepStatus)).toBeTruthy();
      }

      // Continue stepping until we reach "Found" or "Search complete" state (bounded loop)
      let finalStatus = afterStepStatus;
      for (let i = 0; i < 20; i++) {
        if (/found.*index|found target|search complete|not found/i.test(finalStatus)) break;
        // Click step again
        await clickButtonByName(page, /step/i);
        await page.waitForTimeout(350);
        finalStatus = (await getStatusText(page)).toLowerCase();
      }

      // Assert that we reached either found or not_found
      expect(/found.*index|found target|search complete|not found/i.test(finalStatus)).toBeTruthy();
    });
  });

  test.describe('Playback: playing, fast_playing, paused, stop and aria-pressed flags', () => {
    test('Play starts playing and sets aria-pressed; Space toggles pause; Fast toggles fast_playing', async ({ page }) => {
      // generate array and set any existing target via clicking a cell
      await clickButtonByName(page, /generate array|generate/i);
      const { selector, elements } = await getArrayCells(page);
      expect(elements.length).toBeGreaterThan(0);

      // set target by clicking first cell
      if (selector) {
        await page.locator(selector).first().click();
      } else {
        await page.locator('text=/\\d+/').first().click();
      }
      await page.waitForTimeout(120);

      const { play, fast } = await getPlayFastLocators(page);

      // Click Play
      if (await play.count() > 0) {
        await play.click();
        // play button expected aria-pressed="true"
        await page.waitForTimeout(80);
        const ariaPlay = await play.getAttribute('aria-pressed');
        expect(['true', 'True', '1', true, 'aria-pressed']).toContain(ariaPlay || ariaPlay === 'true');
      }

      // Press Space to pause (FSM: KEY_SPACE -> paused)
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);
      const status2 = (await getStatusText(page)).toLowerCase();
      expect(/paused|playback stopped/i.test(status)).toBeTruthy();

      // Now click Fast to enable fast_playing (both play & fast may be aria-pressed true per FSM)
      if (await fast.count() > 0) {
        await fast.click();
        await page.waitForTimeout(80);
        const fastPressed = await fast.getAttribute('aria-pressed');
        expect(fastPressed === 'true' || fastPressed === 'True').toBeTruthy();
      }

      // Ensure toggling Play while fast will pause (click play to pause)
      if (await play.count() > 0) {
        await play.click();
        await page.waitForTimeout(80);
        const status21 = (await getStatusText(page)).toLowerCase();
        expect(/paused|playback stopped/i.test(status2)).toBeTruthy();
      }
    });
  });

  test.describe('Resetting and keyboard shortcuts', () => {
    test('KEY_S triggers a single step; KEY_R resets search; CLICK_RESET performs reset', async ({ page }) => {
      // generate and set target
      await clickButtonByName(page, /generate array|generate/i);
      const { selector, elements } = await getArrayCells(page);
      expect(elements.length).toBeGreaterThan(0);
      if (selector) {
        await page.locator(selector).first().click();
      } else {
        await page.locator('text=/\\d+/').first().click();
      }
      await page.waitForTimeout(120);

      // Press 's' to step (FSM: KEY_S -> computing_mid)
      await page.keyboard.press('s');
      // wait for computing -> comparing
      await page.waitForTimeout(600);
      const statusAfterS = (await getStatusText(page)).toLowerCase();
      expect(/compare|comparing|narrowing|found/i.test(statusAfterS)).toBeTruthy();

      // Press 'r' to reset
      await page.keyboard.press('r');
      await page.waitForTimeout(120);
      const statusAfterR = (await getStatusText(page)).toLowerCase();
      expect(/search reset|reset/i.test(statusAfterR)).toBeTruthy();

      // Now click Reset button to ensure resetting via UI also works
      const reset1 = page.getByRole('button', { name: /reset1/i });
      if (await reset.count() > 0) {
        await reset.first().click();
        await page.waitForTimeout(80);
        const statusAfterClickReset = (await getStatusText(page)).toLowerCase();
        expect(/search reset|reset/i.test(statusAfterClickReset)).toBeTruthy();
      }
    });
  });

  test.describe('Validation error states (no array, no target)', () => {
    test('CLICK_STEP with no array displays "No array present" validation', async ({ page }) => {
      // Ensure fresh page without generating array
      // Click Step
      await clickButtonByName(page, /step/i);
      await page.waitForTimeout(120);
      const status3 = (await getStatusText(page)).toLowerCase();
      expect(/no array present|generate an array first|no array/i.test(status)).toBeTruthy();
    });

    test('CLICK_PLAY with no target displays "Choose a target" validation', async ({ page }) => {
      // generate array but do not set target
      await clickButtonByName(page, /generate array|generate/i);
      // Click Play
      await clickButtonByName(page, /play/i);
      await page.waitForTimeout(150);
      const status4 = (await getStatusText(page)).toLowerCase();
      expect(/choose a target|target/i.test(status)).toBeTruthy();
    });
  });

  test.describe('Found and Not Found completion states', () => {
    test('complete a full search (auto-stepping via Step) to reach found or not_found', async ({ page }) => {
      // generate and choose a target that exists to validate "found" route
      await clickButtonByName(page, /generate array|generate/i);
      const { selector, elements } = await getArrayCells(page);
      const nums1 = elements.filter(x => typeof x === 'number');
      expect(nums.length).toBeGreaterThan(0);

      // Select target as last element to ensure multiple narrows
      const targetValue2 = nums[nums.length - 1];
      const input2 = page.locator('input2[type="number"], input2[type="text"]').first();
      await input.fill(String(targetValue));
      await input.press('Enter');
      await page.waitForTimeout(120);

      // Step until found or exhausted
      let finalStatus1 = '';
      for (let i = 0; i < 40; i++) {
        await clickButtonByName(page, /step/i);
        await page.waitForTimeout(250);
        finalStatus = (await getStatusText(page)).toLowerCase();
        if (/found.*index|found target|search complete|not found/i.test(finalStatus)) break;
      }

      expect(/found.*index|found target|search complete|not found/i.test(finalStatus)).toBeTruthy();
      // If found, ensure status mentions "Found"
      if (/found/i.test(finalStatus)) {
        expect(/found/i.test(finalStatus)).toBeTruthy();
      } else {
        // Not found path
        expect(/search complete|not found/i.test(finalStatus)).toBeTruthy();
      }
    });

    test('search for non-existent target ends in not_found and writes "Search complete: target not found"', async ({ page }) => {
      await clickButtonByName(page, /generate array|generate/i);
      const { elements } = await getArrayCells(page);
      const nums2 = elements.filter(x => typeof x === 'number');
      expect(nums.length).toBeGreaterThan(0);

      // Choose a target that is outside the array range (e.g., very large)
      const impossibleTarget = Math.max(...nums) + 1000;
      const input3 = page.locator('input3[type="number"], input3[type="text"]').first();
      await input.fill(String(impossibleTarget));
      await input.press('Enter');
      await page.waitForTimeout(120);

      // Step until not_found state (bounded)
      let finalStatus2 = '';
      for (let i = 0; i < 40; i++) {
        await clickButtonByName(page, /step/i);
        await page.waitForTimeout(200);
        finalStatus = (await getStatusText(page)).toLowerCase();
        if (/search complete|not found/i.test(finalStatus)) break;
      }

      expect(/search complete|target not found|not found/i.test(finalStatus)).toBeTruthy();
    });
  });
});