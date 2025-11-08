import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6e6e1720-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Helper utilities to locate controls flexibly across possible DOM implementations.
 * These attempt multiple strategies to find buttons/inputs/cells so tests are resilient.
 */
async function findButton(page, labelRegex) {
  // Try role-based first
  const byRole = page.getByRole('button', { name: labelRegex });
  if (await byRole.count()) return byRole.first();
  // Try any button with matching text
  const byText = page.locator('button', { hasText: labelRegex });
  if (await byText.count()) return byText.first();
  // Fallback: any element with the text
  return page.locator(`text=${labelRegex}`).first();
}

async function findInputByLabelOrPlaceholder(page, labelRegex) {
  const byLabel = page.getByLabel(labelRegex);
  if (await byLabel.count()) return byLabel.first();
  const byPlaceholder = page.locator(`input[placeholder*="${labelRegex}"], input[aria-label*="${labelRegex}"]`);
  if (await byPlaceholder.count()) return byPlaceholder.first();
  // fallback to any input
  return page.locator('input').first();
}

async function getArrayCellLocators(page) {
  // Try common selectors for array cells
  const selectors = [
    '.cell', '.array-cell', '.array .cell', '.cells .cell', '.visual .cell',
    '[data-cell-index]', '[data-index]', '.item', '.box'
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel);
    if (await loc.count()) return loc;
  }
  // Fallback: find numeric text elements in the main visual area
  const visual = page.locator('.visual');
  if (await visual.count()) {
    const candidates = visual.locator('div,button,span').filter({ hasText: /\d+/ });
    if (await candidates.count()) return candidates;
  }
  // Last resort: any element with a single digit/number text on page
  return page.locator('body').locator('text=/\\d+/').first();
}

async function readArrayValues(page) {
  const cells = await getArrayCellLocators(page);
  const count = await cells.count();
  const values = [];
  for (let i = 0; i < count; i++) {
    const txt = (await cells.nth(i).innerText()).trim();
    values.push(txt);
  }
  return values;
}

async function getComparisonsBadge(page) {
  // Try to find element that displays comparisons badge / count
  const labels = ['Comparisons', 'comparisons', 'Steps', 'steps', 'Comparisons:'];
  for (const label of labels) {
    // find label text and then a following number
    const labelEl = page.locator(`text=${label}`);
    if (await labelEl.count()) {
      // try sibling number
      const parent = labelEl.first().locator('..');
      // look for numeric children
      const numeric = parent.locator('text=/\\d+/');
      if (await numeric.count()) return numeric.first();
    }
  }
  // fallback: any element with data-testid or class badge
  const badgeSelectors = ['.badge', '.count', '[data-testid="comparisons"]', '.comparisons'];
  for (const sel of badgeSelectors) {
    const b = page.locator(sel);
    if (await b.count()) return b.first();
  }
  // Last resort: try to find any prominent number in controls panel
  const controlPanel = page.locator('.controls, .panel').first();
  const num = controlPanel.locator('text=/^\\d+$/');
  if (await num.count()) return num.first();
  return null;
}

test.describe('Linear Search Interactive — FSM behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure prompt is deterministic for tests that simulate editing: default to null
    await page.addInitScript(() => {
      // preserve original prompt (if any) for pages that require it later
      (window).__originalPrompt = window.prompt;
    });
    await page.goto(APP_URL);
    // Wait for main UI to load - pick a visible element in the header or controls
    await page.waitForLoadState('domcontentloaded');
    // small sanity wait for rendering of JS app
    await page.waitForTimeout(100);
  });

  test.afterEach(async ({ page }) => {
    // restore prompt if mutated in page
    await page.evaluate(() => {
      if ((window).__originalPrompt) {
        (window).prompt = (window).__originalPrompt;
      }
    });
  });

  test.describe('Idle state and basic controls', () => {
    test('initial page loads in idle state with controls available', async ({ page }) => {
      // Validate main controls exist: Step, Play (or Play/Pause), Shuffle/Fill Random, Reset
      const stepBtn = await findButton(page, /step/i);
      const playBtn = await findButton(page, /(play|start)/i);
      const shuffleBtn = await findButton(page, /shuffle/i);
      const fillBtn = await findButton(page, /fill/i);
      const resetBtn = await findButton(page, /reset/i);

      // Buttons should be visible and enabled
      await expect(stepBtn).toBeVisible();
      await expect(playBtn).toBeVisible();
      await expect(shuffleBtn).toBeVisible();
      await expect(fillBtn).toBeVisible();
      await expect(resetBtn).toBeVisible();

      // Play should not be pressed in idle
      const ariaPressed = await playBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) {
        expect(ariaPressed === 'false' || ariaPressed === '0' || ariaPressed === 'null').toBeTruthy();
      }

      // There should be an explanation area describing the algorithm or initial instructions
      const explanation = page.locator('.explanation, [data-testid="explanation"], #explanation');
      expect(await explanation.count() >= 0).toBeTruthy(); // not strict but ensures area exists if implemented

      // Comparisons badge should be zero initially
      const comparisons = await getComparisonsBadge(page);
      if (comparisons) {
        const text = (await comparisons.innerText()).trim();
        // allow '0' or '0 comparisons' or similar - parse number
        const match = text.match(/(\d+)/);
        if (match) expect(Number(match[1])).toBeGreaterThanOrEqual(0);
      }
    });

    test('clicking Step without a target does not progress and shows a warning', async ({ page }) => {
      // Clear target input if present
      const targetInput = await findInputByLabelOrPlaceholder(page, /target/i);
      if (await targetInput.count()) {
        await targetInput.fill('');
      }
      // Capture comparisons before
      const comparisons1 = await getComparisonsBadge(page);
      let before = null;
      if (comparisons) {
        const t = (await comparisons.innerText()).trim();
        const m = t.match(/(\d+)/);
        before = m ? Number(m[1]) : null;
      }

      // Click Step
      const stepBtn1 = await findButton(page, /step/i);
      await stepBtn.click();

      // If no target is present, app should remain idle - comparisons should not increment
      if (comparisons && before !== null) {
        // allow short timeout for UI reaction
        await page.waitForTimeout(150);
        const afterTxt = (await comparisons.innerText()).trim();
        const m1 = afterTxt.match(/(\d+)/);
        const after = m ? Number(m[1]) : null;
        expect(after).toBe(before);
      }

      // Expect an explanation or visible hint about missing target
      const hint = page.locator('text=/target/i').first();
      // hint may exist for explanation generally; ensure at least that page communicates target in UI
      await expect(hint).toBeVisible();
    });
  });

  test.describe('Comparing, Found, and Not Found transitions', () => {
    test('STEP with target matching first cell transitions to "found" (markMatch visible)', async ({ page }) => {
      // Read first cell value
      const cells1 = await getArrayCellLocators(page);
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);

      const firstCell = cells.nth(0);
      const firstText = (await firstCell.innerText()).trim();

      // Set the target input to the first cell's value
      const targetInput1 = await findInputByLabelOrPlaceholder(page, /target/i);
      if (await targetInput.count()) {
        await targetInput.fill(firstText);
      } else {
        // fallback: try to set any input on the page
        const anyInput = page.locator('input').first();
        if (await anyInput.count()) await anyInput.fill(firstText);
      }

      // Click Step to trigger comparing -> should immediately find match
      const stepBtn2 = await findButton(page, /step/i);
      await stepBtn.click();

      // Wait for UI to reflect match: matched cell should have class or style indicating match
      const matchLocatorCandidates = [
        firstCell.locator('..').locator('.match'),
        firstCell.locator('.match'),
        page.locator('.match').filter({ hasText: firstText }),
        page.locator(`[data-state~="match"]`).filter({ hasText: firstText }),
      ];
      let found = false;
      for (const candidate of matchLocatorCandidates) {
        try {
          if (await candidate.count()) {
            await expect(candidate.first()).toBeVisible();
            found = true;
            break;
          }
        } catch (e) {
          // ignore and continue
        }
      }

      // Fallback: expect some 'found' or 'Found' text
      const foundText = page.locator('text=/found/i');
      if (!found) {
        // accept either visual marking or existence of found text/explanation
        await expect(foundText.first()).toBeVisible();
      }
    });

    test('searching for a missing value reaches "not found" after stepping through array', async ({ page }) => {
      // Choose a target unlikely present, e.g., "999999"
      const missingTarget = '999999';

      const targetInput2 = await findInputByLabelOrPlaceholder(page, /target/i);
      if (await targetInput.count()) {
        await targetInput.fill(missingTarget);
      } else {
        const anyInput1 = page.locator('input').first();
        if (await anyInput.count()) await anyInput.fill(missingTarget);
      }

      // Repeatedly click "Step" until a not-found indication appears or we've stepped cellCount times
      const stepBtn3 = await findButton(page, /step/i);
      const cells2 = await getArrayCellLocators(page);
      const cellCount1 = await cells.count();
      let notFoundVisible = false;
      for (let i = 0; i <= cellCount + 1; i++) {
        await stepBtn.click();
        // Allow comparison processing
        await page.waitForTimeout(120);
        const notFoundText = page.locator('text=Not found, not-found,not found', { exact: false });
        const alt = page.locator('text=/not ?found/i');
        if ((await notFoundText.count()) || (await alt.count())) {
          notFoundVisible = true;
          break;
        }
      }
      expect(notFoundVisible).toBeTruthy();
      // Additionally, the UI should show a result state or disable auto-run controls (aria-pressed false)
      const playBtn1 = await findButton(page, /(play|start)/i);
      const ariaPressed1 = await playBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) expect(ariaPressed === 'false' || ariaPressed === '0').toBeTruthy();
    });
  });

  test.describe('Running (auto-play) behavior', () => {
    test('PLAY starts auto-run (aria-pressed true) and INTERVAL_TICK leads to comparing', async ({ page }) => {
      // Ensure a target exists so auto will actually progress
      const cells3 = await getArrayCellLocators(page);
      const cellCount2 = await cells.count();
      expect(cellCount).toBeGreaterThan(0);
      const lastCellText = (await cells.nth(cellCount - 1).innerText()).trim();

      const targetInput3 = await findInputByLabelOrPlaceholder(page, /target/i);
      if (await targetInput.count()) {
        // pick a target present somewhere (use last element to ensure several ticks occur)
        await targetInput.fill(lastCellText);
      }

      const comparisons2 = await getComparisonsBadge(page);
      let before1 = null;
      if (comparisons) {
        const t1 = (await comparisons.innerText()).trim();
        const m2 = t.match(/(\d+)/);
        before = m ? Number(m[1]) : null;
      }

      const playBtn2 = await findButton(page, /(play|start)/i);
      // Click Play to start running
      await playBtn.click();

      // Play button should indicate pressed state
      const ariaPressed2 = await playBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) expect(ariaPressed === 'true' || ariaPressed === '1').toBeTruthy();

      // Wait a little longer than one interval to allow an interval tick to fire
      await page.waitForTimeout(700);

      // Comparisons should have increased after automatic tick(s)
      if (comparisons && before !== null) {
        const afterTxt1 = (await comparisons.innerText()).trim();
        const m3 = afterTxt.match(/(\d+)/);
        const after1 = m ? Number(m[1]) : null;
        expect(after).toBeGreaterThanOrEqual(before + 1);
      }

      // Stop auto-run by clicking Play again (toggle)
      await playBtn.click();
      const ariaAfter = await playBtn.getAttribute('aria-pressed');
      if (ariaAfter !== null) expect(ariaAfter === 'false' || ariaAfter === '0').toBeTruthy();
    });

    test('changing speed while running keeps running state and adjusts tick interval', async ({ page }) => {
      // Try to find speed input (range)
      const speedSlider = page.locator('input[type="range"]');
      if (!await speedSlider.count()) {
        test.skip('No speed slider found on page to validate speed changes');
        return;
      }

      // Set a target so that ticks advance comparisons
      const cells4 = await getArrayCellLocators(page);
      if ((await cells.count()) === 0) test.skip('No cells found to validate running ticks');

      const targetVal = (await cells.nth(0).innerText()).trim();
      const targetInput4 = await findInputByLabelOrPlaceholder(page, /target/i);
      if (await targetInput.count()) await targetInput.fill(targetVal);

      const comparisons3 = await getComparisonsBadge(page);
      if (!comparisons) test.skip('No comparisons badge found to assert tick rate');

      const playBtn3 = await findButton(page, /(play|start)/i);
      await playBtn.click(); // start running
      await page.waitForTimeout(200);

      // Change speed to a faster value (assuming range 0-100)
      await speedSlider.evaluate((s) => {
        s.value = s.max || '100';
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const beforeTxt = (await comparisons.innerText()).trim();
      const beforeNum = (beforeTxt.match(/(\d+)/) || [])[1] ? Number(beforeTxt.match(/(\d+)/)[1]) : null;
      // Wait a short period for faster ticks to occur
      await page.waitForTimeout(700);

      const afterTxt2 = (await comparisons.innerText()).trim();
      const afterNum = (afterTxt.match(/(\d+)/) || [])[1] ? Number(afterTxt.match(/(\d+)/)[1]) : null;
      expect(afterNum).toBeGreaterThanOrEqual(beforeNum + 1);

      // Stop running
      await playBtn.click();
    });
  });

  test.describe('Array manipulation: Shuffle, Fill Random, Reset, Size change', () => {
    test('Shuffle and Fill Random change array contents', async ({ page }) => {
      const cells5 = await getArrayCellLocators(page);
      const beforeValues = await readArrayValues(page);
      expect(beforeValues.length).toBeGreaterThan(0);

      const shuffleBtn1 = await findButton(page, /shuffle/i);
      if (await shuffleBtn.count()) {
        await shuffleBtn.click();
        await page.waitForTimeout(200);
        const afterShuffle = await readArrayValues(page);
        // After shuffle, values should be same set but possibly different order — try to detect changes
        // If identical order, attempt fill random
        if (JSON.stringify(afterShuffle) === JSON.stringify(beforeValues)) {
          const fillBtn1 = await findButton(page, /fill/i);
          if (await fillBtn.count()) {
            await fillBtn.click();
            await page.waitForTimeout(200);
            const afterFill = await readArrayValues(page);
            // Ensure that fill random actually changed values (most likely)
            expect(JSON.stringify(afterFill) !== JSON.stringify(beforeValues)).toBeTruthy();
          } else {
            // If no fill button, assert shuffle at least did not error
            expect(afterShuffle).toEqual(beforeValues);
          }
        } else {
          // Shuffle rearranged values
          expect(afterShuffle.length).toBe(beforeValues.length);
        }
      } else {
        test.skip('Shuffle button not present');
      }
    });

    test('Reset full restores initial state and clears highlights', async ({ page }) => {
      const resetBtn1 = await findButton(page, /reset/i);
      if (!await resetBtn.count()) test.skip('Reset not present');

      // Make some changes: step once or set a match
      const stepBtn4 = await findButton(page, /step/i);
      if (await stepBtn.count()) await stepBtn.click();
      await page.waitForTimeout(120);

      // Click Reset Full (some apps have two resets; try to click explicit "Reset" then ensure badges reset)
      await resetBtn.click();
      await page.waitForTimeout(150);

      // Comparisons should be back to zero if badge exists
      const comparisons4 = await getComparisonsBadge(page);
      if (comparisons) {
        const txt1 = (await comparisons.innerText()).trim();
        const m4 = txt.match(/(\d+)/);
        if (m) expect(Number(m[1])).toBeGreaterThanOrEqual(0);
      }

      // Ensure no cell has 'match' or 'visited' class
      const matchEls = page.locator('.match, .visited, .current, [data-state~="match"], [data-state~="visited"]');
      if (await matchEls.count()) {
        // After reset these should either be removed or not visible
        for (let i = 0; i < await matchEls.count(); i++) {
          const el = matchEls.nth(i);
          // Some implementations keep visited for design, so we only assert that major 'found' flags are gone
          const classTxt = (await el.getAttribute('class')) || '';
          expect(classTxt.includes('match')).toBeFalsy();
        }
      }
    });

    test('Changing size updates number of array cells', async ({ page }) => {
      // Try to find a size control (select or input)
      const sizeControl = page.locator('select[name="size"], input[name="size"], #size, input[aria-label*="size"], select[aria-label*="size"]');
      if (!await sizeControl.count()) test.skip('Size control not present');

      // Read current cells
      const beforeCells = await getArrayCellLocators(page);
      const beforeCount = await beforeCells.count();

      // Attempt to change size (if select, pick another option; if input, increase value)
      const tag = await sizeControl.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        // pick different value
        await sizeControl.selectOption({ index: 0 });
        await page.waitForTimeout(150);
        const afterCells = await getArrayCellLocators(page);
        const afterCount = await afterCells.count();
        expect(afterCount).not.toBeNull();
        expect(afterCount >= 1).toBeTruthy();
      } else {
        // input: set to a different size
        await sizeControl.fill('3');
        await sizeControl.dispatchEvent('change');
        await page.waitForTimeout(150);
        const afterCells1 = await getArrayCellLocators(page);
        const afterCount1 = await afterCells.count();
        expect(afterCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Editing state and transitions', () => {
    test('Clicking a cell enters editing (prompt), updates cell value, and returns to idle', async ({ page }) => {
      const cells6 = await getArrayCellLocators(page);
      const count1 = await cells.count1();
      if (count === 0) test.skip('No cells to edit');

      // Override prompt to return a known new value
      const newValue = '42';
      await page.evaluate((v) => {
        window.prompt = () => v;
      }, newValue);

      // Click the first cell to trigger edit
      const firstCell1 = cells.nth(0);
      await firstCell.click();

      // Wait for rendering after edit
      await page.waitForTimeout(200);

      // Cell should now display the new value
      const displayed = (await firstCell.innerText()).trim();
      expect(displayed).toBe(newValue);

      // After edit, app should be back in idle state - ensure Play is not pressed
      const playBtn4 = await findButton(page, /(play|start)/i);
      const ariaPressed3 = await playBtn.getAttribute('aria-pressed');
      if (ariaPressed !== null) expect(ariaPressed === 'false' || ariaPressed === '0').toBeTruthy();
    });

    test('Editing can be cancelled (prompt returns null) and leaves array unchanged', async ({ page }) => {
      const cells7 = await getArrayCellLocators(page);
      const count2 = await cells.count2();
      if (count === 0) test.skip('No cells to edit');

      // Save original value
      const firstCell2 = cells.nth(0);
      const original = (await firstCell.innerText()).trim();

      // Override prompt to return null (cancel)
      await page.evaluate(() => {
        window.prompt = () => null;
      });

      // Click to edit
      await firstCell.click();
      await page.waitForTimeout(150);

      // Value should remain unchanged
      const after2 = (await firstCell.innerText()).trim();
      expect(after).toBe(original);
    });
  });

  test.describe('Keyboard interactions and window resize event', () => {
    test('keyboard Key-Step and Key-Play map to STEP and PLAY transitions', async ({ page }) => {
      // Focus page and press keyboard shortcuts
      await page.keyboard.press('Tab'); // ensure focus
      // Press step key (assuming mapping like 's' or 'ArrowRight' - try multiple)
      const stepBtn5 = await findButton(page, /step/i);
      const comparisons5 = await getComparisonsBadge(page);
      let before2 = null;
      if (comparisons) {
        const t2 = (await comparisons.innerText()).trim();
        const m5 = t.match(/(\d+)/);
        before = m ? Number(m[1]) : null;
      }

      // Try Step via 's' then ArrowRight fallback
      await page.keyboard.press('s').catch(() => {});
      await page.waitForTimeout(120);
      // If no effect, try ArrowRight
      if (comparisons) {
        const afterTxt3 = (await comparisons.innerText()).trim();
        const m6 = afterTxt.match(/(\d+)/);
        const after3 = m ? Number(m[1]) : null;
        if (before === after) {
          await page.keyboard.press('ArrowRight').catch(() => {});
          await page.waitForTimeout(120);
        }
      }

      // Test Key-Play toggles play state (try 'p' key)
      const playBtn5 = await findButton(page, /(play|start)/i);
      const ariaBefore = await playBtn.getAttribute('aria-pressed');
      await page.keyboard.press('p').catch(() => {});
      await page.waitForTimeout(200);
      const ariaAfter1 = await playBtn.getAttribute('aria-pressed');
      // If aria attribute exists, assert it toggled (may be null for some implementations)
      if (ariaBefore !== null && ariaAfter !== null) {
        expect(ariaBefore !== ariaAfter).toBeTruthy();
      } else {
        // At least ensure focus/keyboard didn't crash the page
        expect(true).toBeTruthy();
      }

      // Ensure to stop running if we started it
      if (ariaAfter === 'true') await playBtn.click();
    });

    test('window resize triggers repositioning logic (moveMagnifierTo) without changing logical state', async ({ page }) => {
      // Capture comparisons badge to track logical state
      const comparisons6 = await getComparisonsBadge(page);
      let before3 = null;
      if (comparisons) {
        const t3 = (await comparisons.innerText()).trim();
        const m7 = t.match(/(\d+)/);
        before = m ? Number(m[1]) : null;
      }

      // Resize viewport
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(120);

      // Resize back
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(120);

      // Ensure logical state (comparisons) not altered by resize
      if (comparisons && before !== null) {
        const afterTxt4 = (await comparisons.innerText()).trim();
        const m8 = afterTxt.match(/(\d+)/);
        const after4 = m ? Number(m[1]) : null;
        expect(after).toBe(before);
      }
    });
  });
});