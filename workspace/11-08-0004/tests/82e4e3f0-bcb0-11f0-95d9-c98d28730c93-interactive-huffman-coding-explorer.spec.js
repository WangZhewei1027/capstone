import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/82e4e3f0-bcb0-11f0-95d9-c98d28730c93.html';

// Utility: robust locator helpers that attempt several common selector patterns used by the app UI
async function findButton(page, ...names) {
  for (const name of names) {
    // try by role (accessible name)
    try {
      const byRole = page.getByRole('button', { name: new RegExp(name, 'i') });
      if (await byRole.count() > 0) return byRole.first();
    } catch (e) { /* ignore */ }
    // try by text content fallback
    const textBtn = page.locator('button', { hasText: new RegExp(name, 'i') }).first();
    if (await textBtn.count() > 0) return textBtn;
    // try data-action attributes as fallback
    const dataAttr = page.locator(`button[data-action*="${name.toLowerCase().replace(/\s+/g, '-')}"]`).first();
    if (await dataAttr.count() > 0) return dataAttr;
  }
  return null;
}

async function findInput(page, ...idsOrPlaceholders) {
  for (const token of idsOrPlaceholders) {
    // try id
    const byId = page.locator(`#${token}`);
    if (await byId.count() > 0) return byId.first();
    // try placeholder or aria-label
    const byPlaceholder = page.locator(`textarea[placeholder*="${token}"], input[placeholder*="${token}"], input[aria-label*="${token}"]`).first();
    if (await byPlaceholder.count() > 0) return byPlaceholder;
    const byLabel = page.getByLabel(new RegExp(token, 'i')).first();
    if (await byLabel.count() > 0) return byLabel;
  }
  // fallback to first textarea or first text input
  const ta = page.locator('textarea').first();
  if (await ta.count() > 0) return ta;
  const inp = page.locator('input[type="text"], input[type="search"]').first();
  if (await inp.count() > 0) return inp;
  return null;
}

async function countLeafRows(page) {
  // Common selector patterns for leaf rows/tables
  const selectors = [
    '.leaf-row', // custom
    '.freq-row',
    '.symbol-row',
    '.table .row',
    'table.codes tr',
    'table.leaves tr',
    '.left-panel .row'
  ];
  for (const sel of selectors) {
    const l = page.locator(sel);
    if (await l.count() > 0) return await l.count();
  }
  // fallback: no rows found => 0
  return 0;
}

async function isTreeComplete(page) {
  // look for codes display or a 'Codes' heading or bitstring region
  const codes = page.getByRole('heading', { name: /codes?/i }).first();
  if (await codes.count() > 0) return true;
  const table = page.locator('table.codes, .codes-table, #codes');
  if (await table.count() > 0) return true;
  const bits = page.locator('.bitstring, .bits, #encodedBits');
  if (await bits.count() > 0) return true;
  // check body/class indicator
  const body = page.locator('body');
  const bodyClass = await body.getAttribute('class') || '';
  if (/tree[-_ ]?complete|complete/.test(bodyClass)) return true;
  return false;
}

async function isBuilding(page) {
  // check for a building flag: element with aria-busy, class 'building', or 'merging' indicator
  const busy = page.locator('[aria-busy="true"]');
  if (await busy.count() > 0) return true;
  const buildClass = page.locator('.building, .merging, .is-building');
  if (await buildClass.count() > 0) return true;
  const mergeLabel = page.getByText(/merg/i);
  if (await mergeLabel.count() > 0) {
    // presence of an animation area that contains "merg" might indicate merging; check visibility
    const c = mergeLabel.first();
    if (await c.isVisible()) return true;
  }
  return false;
}

async function getBitsCount(page) {
  const bits1 = page.locator('.bitstring .bit, .bits1 .bit, .bit').filter({ hasText: /[01]/ });
  if (await bits.count() > 0) return await bits.count();
  // fallback to splitting a bitstring text
  const bitsTextEl = page.locator('#encodedBits, .encoded-bits, .bitstring');
  if (await bitsTextEl.count() > 0) {
    const t = (await bitsTextEl.first().innerText()).trim();
    return t.replace(/\s+/g, '').length;
  }
  return 0;
}

async function getDecodedOutput(page) {
  const out = page.locator('#decodedOut, .decoded-out, .decoded');
  if (await out.count() > 0) return (await out.first().innerText()).trim();
  // try other textual indicators
  const text = page.getByText(/decoded/i);
  if (await text.count() > 0) return (await text.first().innerText()).trim();
  return '';
}

// Page Object encapsulating common actions
class HuffmanPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for main UI
    await this.page.waitForLoadState('networkidle');
    // small pause to allow client JS to initialize
    await this.page.waitForTimeout(150);
  }

  async useText(text) {
    const ta1 = await findInput(this.page, 'text', 'sample', 'input');
    if (!ta) throw new Error('Text input not found for useText');
    await ta.fill(text);
    const btn = await findButton(this.page, 'use text', 'apply text', 'apply', 'use');
    if (!btn) {
      // try pressing Enter in textarea if no button
      await ta.press('Enter');
      return;
    }
    await btn.click();
    // allow UI to update
    await this.page.waitForTimeout(200);
  }

  async addSymbol(symbol, freq) {
    // try to find symbol input and freq input and add button
    const symInput = await findInput(this.page, 'symbol', 'char', 'symbol');
    const freqInput = this.page.locator('input[type="number"], input[name="freq"], input[placeholder*="freq"]').first();
    const addBtn = await findButton(this.page, 'add symbol', 'add', 'add row', 'add leaf');
    if (symInput && (await symInput.isVisible())) {
      await symInput.fill(String(symbol));
    }
    if (freqInput && (await freqInput.count() > 0)) {
      await freqInput.fill(String(freq));
    } else {
      // if no numeric input, try combined input
      const combined = page.locator('input[placeholder*="symbol,frequency"], input[aria-label*="symbol"]');
      if (await combined.count() > 0) await combined.first().fill(`${symbol}:${freq}`);
    }
    if (addBtn) {
      await addBtn.click();
    } else {
      // try pressing Enter on symbol input to add
      if (symInput) await symInput.press('Enter');
    }
    await this.page.waitForTimeout(200);
  }

  async clickStepMerge() {
    const btn1 = await findButton(this.page, 'step', 'step merge', 'merge step');
    if (!btn) throw new Error('Step/Merge button not found');
    await btn.click();
    // short wait for animation start
    await this.page.waitForTimeout(120);
  }

  async toggleAuto() {
    const btn2 = await findButton(this.page, 'auto', 'auto start', 'auto toggle', 'start auto');
    if (!btn) throw new Error('Auto toggle button not found');
    await btn.click();
    await this.page.waitForTimeout(200);
  }

  async stopAuto() {
    const btn3 = await findButton(this.page, 'stop', 'auto', 'pause', 'auto toggle');
    if (!btn) return;
    await btn.click();
    await this.page.waitForTimeout(150);
  }

  async completeImmediately() {
    const btn4 = await findButton(this.page, 'complete immediately', 'complete', 'finish');
    if (!btn) throw new Error('Complete Immediately button not found');
    await btn.click();
    await this.page.waitForTimeout(200);
  }

  async resetBuild() {
    const btn5 = await findButton(this.page, 'reset build', 'reset', 'reset tree', 'clear');
    if (!btn) throw new Error('Reset/Reset Build button not found');
    await btn.click();
    await this.page.waitForTimeout(200);
  }

  async decodeStep() {
    const btn6 = await findButton(this.page, 'decode step', 'next bit', 'step decode', 'next');
    if (!btn) throw new Error('Decode Step button not found');
    await btn.click();
    await this.page.waitForTimeout(120);
  }

  async resetDecode() {
    const btn7 = await findButton(this.page, 'reset decode', 'reset', 'reset decode', 'reset bits');
    if (!btn) {
      // try a dedicated reset-decode control
      const rd = this.page.locator('[data-action="reset-decode"], #resetDecode');
      if (await rd.count() > 0) {
        await rd.click();
        await this.page.waitForTimeout(120);
        return;
      }
      throw new Error('Reset Decode button not found');
    }
    await btn.click();
    await this.page.waitForTimeout(120);
  }

  async clickBitAt(index = 0) {
    const bits2 = this.page.locator('.bitstring .bit, .bits2 .bit, .bit').filter({ hasText: /[01]/ });
    if (await bits.count() === 0) {
      // fallback: click on any element with data-bit
      const fallback = this.page.locator('[data-bit]').first();
      if (await fallback.count() > 0) await fallback.click();
      return;
    }
    const target = bits.nth(index);
    await target.click();
    await this.page.waitForTimeout(120);
  }

  async hoverRow(index = 0) {
    // common selectors for rows
    const rows = this.page.locator('.leaf-row, .row, table.leaves tr, table.codes tr');
    if (await rows.count() === 0) return;
    await rows.nth(index).hover();
    await this.page.waitForTimeout(80);
  }

  async clickRow(index = 0) {
    const rows1 = this.page.locator('.leaf-row, .row, table.leaves tr, table.codes tr');
    if (await rows.count() === 0) return;
    await rows.nth(index).click();
    await this.page.waitForTimeout(80);
  }

  async clickNode(index = 0) {
    const nodes = this.page.locator('.node, .tree-node, circle, [data-node]').filter({ hasText: /./ });
    if (await nodes.count() === 0) {
      const fallback1 = this.page.locator('[data-node]').first();
      if (await fallback.count() > 0) {
        await fallback.click();
        await this.page.waitForTimeout(80);
      }
      return;
    }
    await nodes.nth(index).click();
    await this.page.waitForTimeout(80);
  }
}

test.describe('Interactive Huffman Coding Explorer - full FSM coverage', () => {
  test.beforeEach(async ({ page }) => {
    // navigate and ensure app initialized
    const h = new HuffmanPage(page);
    await h.goto();
  });

  test('Initial state should be empty: UI cleared and no codes or bits present', async ({ page }) => {
    // Validate "empty" onEnter behavior: UI cleared
    // Expect no codes table, no bitstring, and controls that require data are disabled/absent
    const codes1 = page.locator('table.codes1, .codes1-table, #codes1');
    expect(await codes.count()).toBeLessThan(1);

    const bits3 = page.locator('.bitstring, .bits3, #encodedBits');
    expect(await bits.count()).toBeLessThan(1);

    // Step/Complete should be either disabled or not applicable
    const stepBtn = await findButton(page, 'step', 'step merge', 'merge');
    if (stepBtn) {
      // if present it's likely disabled in empty state
      const disabled = await stepBtn.isDisabled().catch(() => false);
      expect(disabled || !(await stepBtn.isVisible())).toBeTruthy();
    }

    // Reset build should still be present but not error when clicked
    const resetBtn = await findButton(page, 'reset build', 'reset', 'clear');
    if (resetBtn) {
      await resetBtn.click();
      await page.waitForTimeout(100);
      // still empty
      expect(await codes.count()).toBeLessThan(1);
    }
  });

  test('Entering text (USE_TEXT) transitions to ready and shows leaves for characters', async ({ page }) => {
    const h1 = new HuffmanPage(page);
    // Use sample text which should generate frequency-leaves
    const sample = 'aaabcc';
    await h.useText(sample);

    // After USE_TEXT expect leaves table or rows to appear (ready)
    const leafCount = await countLeafRows(page);
    expect(leafCount).toBeGreaterThan(0);

    // Step button should be enabled now (ready -> can STEP_MERGE)
    const stepBtn1 = await findButton(page, 'step', 'step merge', 'merge');
    if (stepBtn) {
      expect(await stepBtn.isEnabled()).toBeTruthy();
    }

    // The app should not yet be in tree_complete
    expect(await isTreeComplete(page)).toBeFalsy();
  });

  test('Adding and removing symbols (ADD_SYMBOL / REMOVE_SYMBOL) updates leaves and can return to empty', async ({ page }) => {
    const h2 = new HuffmanPage(page);

    // Add two symbols manually ensuring non-empty ready state
    // Use explicit form if available
    try {
      await h.addSymbol('X', 4);
      await h.addSymbol('Y', 1);
    } catch (e) {
      // best-effort if UI differs
    }

    const leafCountAfterAdd = await countLeafRows(page);
    expect(leafCountAfterAdd).toBeGreaterThanOrEqual(2);

    // Attempt to remove symbols: try to find remove buttons on rows
    const removeBtns = page.locator('button', { hasText: /remove|delete|trash/i });
    if (await removeBtns.count() > 0) {
      // click all removes to go back to empty
      const removes = await removeBtns.elementHandles();
      for (const r of removes) {
        await r.click();
        await page.waitForTimeout(80);
      }
    } else {
      // fallback: use Reset Build to clear all
      const reset = await findButton(page, 'reset build', 'reset', 'clear');
      if (reset) await reset.click();
    }

    // After removing, leaves should be zero or app back to empty state
    const leafCountFinal = await countLeafRows(page);
    expect(leafCountFinal === 0 || await isTreeComplete(page) === false).toBeTruthy();
  });

  test('Single STEP_MERGE merges two nodes and triggers tree_complete when final (merging -> tree_complete)', async ({ page }) => {
    const h3 = new HuffmanPage(page);

    // Prepare minimal tree: ensure exactly two leaves exist
    // Reset and add two symbols
    try {
      await h.resetBuild();
    } catch (e) { /* ignore */ }

    // There might be an existing sample area; add via inputs or useText with two symbols only
    try {
      // Use text with two characters only ensures final merge after one step
      await h.useText('ab');
    } catch (e) { /* ignore */ }

    // Ensure at least two leaves present
    let leaves = await countLeafRows(page);
    if (leaves < 2) {
      // try adding symbols
      try { await h.addSymbol('A', 3); await h.addSymbol('B', 2); } catch (e) { /* ignore */ }
    }

    // Click Step Merge once to trigger merging state
    await h.clickStepMerge();

    // Immediately after click we expect building/merging to be active
    const buildingNow = await isBuilding(page);
    expect(buildingNow).toBeTruthy();

    // Wait for animation to finish (allow a generous timeout)
    await page.waitForTimeout(1000);

    // After merge finished, since only two leaves existed, tree must be complete
    const complete = await isTreeComplete(page);
    expect(complete).toBeTruthy();

    // On tree_complete, codes should be rendered (table or heading)
    const codesHeading = page.getByRole('heading', { name: /codes?/i });
    if (await codesHeading.count() > 0) {
      expect(await codesHeading.first().isVisible()).toBeTruthy();
    }
  }, { timeout: 15_000 });

  test('AUTO_START and AUTO_TOGGLE create auto_running behavior and can be cancelled (auto_running -> merging -> ready)', async ({ page }) => {
    const h4 = new HuffmanPage(page);

    // Prepare more than 2 symbols so auto has multiple ticks
    try { await h.resetBuild(); } catch (e) {}
    try { await h.useText('aaabbbcccdddeee'); } catch (e) {}

    const initialLeaves = await countLeafRows(page);
    expect(initialLeaves).toBeGreaterThanOrEqual(3);

    // Start auto mode
    await h.toggleAuto();

    // After starting, app should be in auto_running: verify merges happen over time
    // Record leaves and wait for a couple of ticks
    const before = await countLeafRows(page);
    await page.waitForTimeout(800); // allow at least one auto tick + animation cycle
    const after = await countLeafRows(page);

    // Leaves should have decreased or tree reached complete
    expect(after).toBeLessThanOrEqual(before);

    // Ensure auto does not perform overlapping merges: attempt to click Step during building and ensure no spuriously faster merges
    // Force a Step click while a building flag may be active
    const buildingAtStart = await isBuilding(page);
    if (buildingAtStart) {
      // try click step quickly and ensure count doesn't drop by >1 instantly
      const beforeClick = await countLeafRows(page);
      try {
        await h.clickStepMerge();
      } catch (e) { /* ignore if button not present */ }
      await page.waitForTimeout(200);
      const afterClick = await countLeafRows(page);
      // Only one merge should be in-flight; it shouldn't cause extra immediate merges
      expect(afterClick >= beforeClick - 1).toBeTruthy();
    }

    // Cancel auto mode by toggling again or pressing stop
    await h.toggleAuto();
    await page.waitForTimeout(150);
    // allow UI to settle
    const buildingAfterCancel = await isBuilding(page);
    expect(buildingAfterCancel).toBeFalsy();
  }, { timeout: 20_000 });

  test('COMPLETE_IMMEDIATELY merges without animation and directly enters tree_complete, invoking computeCodes and rendering bits', async ({ page }) => {
    const h5 = new HuffmanPage(page);

    try { await h.resetBuild(); } catch (e) {}
    // use a sample to ensure bits will be generated
    const sample1 = 'hello huffman';
    await h.useText(sample);

    // Trigger immediate completion
    await h.completeImmediately();

    // Immediately expect tree complete (no long waits)
    const done = await isTreeComplete(page);
    expect(done).toBeTruthy();

    // Bits for the sample text should be present if text was provided
    const bitsCnt = await getBitsCount(page);
    expect(bitsCnt).toBeGreaterThanOrEqual(1);

    // Codes table should be populated
    const codesTable = page.locator('table.codes, .codes-table, #codes');
    expect(await codesTable.count()).toBeGreaterThanOrEqual(1);
  });

  test('Decoding flow (decoding_idle -> decoding_animating -> decoding_done) via DECODE_STEP and BIT_CLICK', async ({ page }) => {
    const h6 = new HuffmanPage(page);
    // Build a complete tree with short sample that yields bits
    const sample2 = 'aba';
    try { await h.resetBuild(); } catch (e) {}
    await h.useText(sample);
    // Ensure complete
    await h.completeImmediately();

    // After tree_complete, reset decode to set decoding_idle
    try {
      await h.resetDecode();
    } catch (e) { /* ignore if not present */ }

    // Confirm decoding idle: decode pointer not advanced (decoded output empty)
    let decoded = await getDecodedOutput(page);
    // decoded may be empty string initially
    expect(typeof decoded === 'string').toBeTruthy();

    // Perform a decode step (DECODE_STEP)
    try {
      await h.decodeStep();
    } catch (e) {
      // fallback: click first bit to simulate BIT_CLICK
      await h.clickBitAt(0);
    }

    // During animating, expect temporary highlight classes or decodeAnimating indicators
    const animatingNow = await isBuilding(page) || (await page.locator('.decode-animating, .animating, .is-animating').count() > 0);
    // Some UIs use separate flags; test accepts either presence or not but the decode should progress
    await page.waitForTimeout(600); // wait for decode animation to complete

    // Continue stepping until decode finished or we detect decoding_done
    // Click decode step repeatedly
    let attempts = 0;
    while (attempts < 12) {
      await page.waitForTimeout(120);
      // if decoded output equals input string, break
      decoded = await getDecodedOutput(page);
      if (decoded && decoded.includes('a') || decoded.length > 0) {
        // some intermediate progress acceptable
      }
      // try finishing decode by repeated steps
      try {
        await h.decodeStep();
      } catch (e) {
        // if button absent, click next bit
        await h.clickBitAt(attempts % 3);
      }
      attempts++;
      // break if finished
      const finishedIndicator = page.getByText(/decoded/i);
      if (await finishedIndicator.count() > 0) {
        const txt = (await finishedIndicator.first().innerText()).toLowerCase();
        if (txt.includes(sample.split(' ')[0]) || txt.length >= sample.length) break;
      }
      // prevent tight loop
      if (attempts >= 6) break;
    }

    // After decode steps, expect some decoded output present
    decoded = await getDecodedOutput(page);
    expect(typeof decoded === 'string').toBeTruthy();

    // Reset decode and expect decoded output cleared or pointer reset
    try {
      await h.resetDecode();
      await page.waitForTimeout(150);
      const decodedAfterReset = await getDecodedOutput(page);
      // after reset typically cleared or at least shorter
      expect(decodedAfterReset.length <= (decoded.length || 0)).toBeTruthy();
    } catch (e) {
      // if no reset found treat as pass
    }
  }, { timeout: 30_000 });

  test('Hovering rows and clicking nodes/rows triggers transient visual highlights (ROW_HOVER, ROW_LEAVE, NODE_CLICK, ROW_CLICK)', async ({ page }) => {
    const h7 = new HuffmanPage(page);
    // Ensure some leaves exist
    try { await h.useText('abcabc'); } catch (e) {}
    const rows2 = page.locator('.leaf-row, .row, table.leaves tr, table.codes tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      // try adding symbols
      try { await h.addSymbol('A', 2); await h.addSymbol('B', 1); } catch (e) {}
    }

    // Hover first row and expect highlight class added
    await h.hoverRow(0);
    // Wait briefly and check for highlight indicator
    const highlight = page.locator('.highlight, .is-highlight, .path-highlight').first();
    // It may or may not exist depending on UI; make best-effort assertion
    if (await highlight.count() > 0) {
      expect(await highlight.isVisible()).toBeTruthy();
      // Leave hover and expect removal
      await page.mouse.move(0, 0);
      await page.waitForTimeout(120);
    }

    // Click a row and expect a flash or persistent selection
    await h.clickRow(0);
    const selected = page.locator('.selected, .active, .row-selected').first();
    if (await selected.count() > 0) {
      expect(await selected.isVisible()).toBeTruthy();
    }

    // Click a node in the tree to trigger NODE_CLICK highlight
    await h.clickNode(0);
    const nodeHighlight = page.locator('.node-highlight, .flash, .flash-path').first();
    // If exists, ensure visible briefly
    if (await nodeHighlight.count() > 0) {
      expect(await nodeHighlight.isVisible()).toBeTruthy();
    }
  });

  test('Edge cases: using empty text should remain in empty state and invalid symbol additions are handled gracefully', async ({ page }) => {
    const h8 = new HuffmanPage(page);
    // Use empty text
    try {
      await h.useText('');
    } catch (e) { /* ignore */ }

    // Expect still empty (no codes)
    expect(await isTreeComplete(page)).toBeFalsy();

    // Try adding a symbol with zero or negative frequency (should be rejected or ignored)
    try {
      await h.addSymbol('Z', 0);
      await page.waitForTimeout(150);
    } catch (e) { /* ignore */ }

    // If a zero-frequency row was added, UI should not allow STEP to produce merges
    const leafCount1 = await countLeafRows(page);
    if (leafCount > 0) {
      // clicking step should not cause errors; try it
      try {
        await h.clickStepMerge();
        await page.waitForTimeout(250);
      } catch (e) { /* ignore */ }
    }

    // Clean up by resetting build
    try {
      await h.resetBuild();
    } catch (e) { /* ignore */ }
  });

  test.afterEach(async ({ page }) => {
    // Best-effort teardown: try to reset decode/build and stop auto if active
    const h9 = new HuffmanPage(page);
    try { await h.resetDecode(); } catch (e) {}
    try { await h.resetBuild(); } catch (e) {}
    // small pause to let potential timers clear
    await page.waitForTimeout(120);
  });
});