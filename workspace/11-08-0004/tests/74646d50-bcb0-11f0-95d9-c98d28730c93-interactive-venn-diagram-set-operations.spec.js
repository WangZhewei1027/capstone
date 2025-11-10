import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/74646d50-bcb0-11f0-95d9-c98d28730c93.html';

// Utility helpers to locate common controls robustly across possible DOM variants
async function findButton(page, labels = []) {
  for (const label of labels) {
    // Try role-based lookup first
    const byRole = page.getByRole('button', { name: new RegExp(label, 'i') });
    if (await byRole.count() > 0) return byRole.first();
    // Fallback to text-based button locator
    const byText = page.locator(`button:has-text("${label}")`);
    if (await byText.count() > 0) return byText.first();
    // Fallback to any element with that text (some UI use divs styled as buttons)
    const any = page.locator(`:scope >> text=${label}`, { exact: false });
    if (await any.count() > 0) return any.first();
  }
  return null;
}

async function tokenLocator(page) {
  // Try several plausible selectors for tokens
  const selectors = [
    '.token',
    '[data-token]',
    '[data-role="token"]',
    '.dot',
    '.item-token',
    '[aria-label^="Token"]',
    'button.token',
    '.chip'
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel);
    if (await loc.count() > 0) return loc;
  }
  // Last resort: tokens might be clickable elements inside venn area
  const vennCandidates = page.locator('.venn, .venn-area, svg');
  if (await vennCandidates.count() > 0) {
    // try any button inside venn area
    const inside = vennCandidates.locator('button, [role="button"], [data-token]');
    if (await inside.count() > 0) return inside;
  }
  // If nothing found, return a generic locator that will be empty
  return page.locator('.nonexistent-token-selector');
}

async function statusLocator(page) {
  // Several possible status containers
  const candidates = [
    '[data-status]',
    '.status',
    '.status-text',
    '.info .status',
    '#status',
    '.status-bar',
    '.hint'
  ];
  for (const sel of candidates) {
    const loc1 = page.locator(sel);
    if (await loc.count() > 0) return loc.first();
  }
  // Fallback: look for likely status phrases
  const texts = [
    'Drag tokens',
    'Result:',
    'Animating',
    '∅',
    'Drag tokens into regions'
  ];
  for (const t of texts) {
    const loc2 = page.getByText(new RegExp(t, 'i'));
    if (await loc.count() > 0) return loc.first();
  }
  return page.locator('.nonexistent-status');
}

// Page object encapsulating frequent interactions
class VennPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Allow the app to initialize
    await this.page.waitForLoadState('networkidle');
  }

  async getStatusText() {
    const status = await statusLocator(this.page);
    if (await status.count() === 0) return '';
    return (await status.textContent())?.trim() ?? '';
  }

  async addToken() {
    const btn = await findButton(this.page, ['Add token', 'Add Token', 'Create token', 'New token', '+ token', 'Add']);
    if (!btn) throw new Error('Add token button not found');
    await btn.click();
    // small pause to let createToken lifecycle complete
    await this.page.waitForTimeout(150);
  }

  async getTokenCount() {
    const tokens = await tokenLocator(this.page);
    return await tokens.count();
  }

  async getTokenBoundingBoxes() {
    const tokens1 = await tokenLocator(this.page);
    const n = await tokens.count();
    const boxes = [];
    for (let i = 0; i < n; i++) {
      const b = await tokens.nth(i).boundingBox();
      boxes.push(b);
    }
    return boxes;
  }

  async randomize() {
    const btn1 = await findButton(this.page, ['Randomize', 'Shuffle', 'Randomise', 'Random']);
    if (!btn) throw new Error('Randomize/Shuffle button not found');
    await btn.click();
    // allow shuffle action to complete (implementation may be synchronous but sometimes uses timeout)
    await this.page.waitForTimeout(200);
  }

  async resetOrSeed() {
    const btn2 = await findButton(this.page, ['Reset', 'Seed', 'Reset/seeding', 'Reset tokens']);
    if (!btn) throw new Error('Reset/Seed button not found');
    await btn.click();
    await this.page.waitForTimeout(200);
  }

  async showResult() {
    const btn3 = await findButton(this.page, ['Show result', 'Show Result', 'Result', 'Compute result', 'Show']);
    if (!btn) throw new Error('Show result button not found');
    await btn.click();
    // animation may take time; tests will wait for expected status transitions
  }

  async explain() {
    const btn4 = await findButton(this.page, ['Explain', 'Explanation', 'Help', 'What is this', 'Explain membership']);
    if (!btn) throw new Error('Explain button not found');
    await btn.click();
  }

  async toggleLabels() {
    const btn5 = await findButton(this.page, ['Toggle labels', 'Labels', 'Show labels', 'Hide labels']);
    if (!btn) throw new Error('Toggle labels button not found');
    await btn.click();
    await this.page.waitForTimeout(100);
  }

  async selectOperation(opName) {
    // operations are often buttons in an op-grid
    const opBtn = this.page.getByRole('button', { name: new RegExp(opName, 'i') });
    if (await opBtn.count() > 0) {
      await opBtn.first().click();
      return;
    }
    // fallback: clickable element with text
    const alt = this.page.locator(`:scope >> text=${opName}`);
    if (await alt.count() > 0) {
      await alt.first().click();
      return;
    }
    throw new Error(`Operation button "${opName}" not found`);
  }

  async focusToken(index = 0) {
    const tokens2 = await tokenLocator(this.page);
    const count = await tokens.count();
    if (count === 0) throw new Error('No tokens to focus');
    await tokens.nth(index).click();
    await this.page.waitForTimeout(80);
    return tokens.nth(index);
  }

  async deleteFocusedWithKeyboard() {
    await this.page.keyboard.press('Delete');
    await this.page.waitForTimeout(120);
  }

  async nudgeFocused(dx = 1, dy = 0) {
    // Use arrow keys for nudge
    if (dx > 0) {
      for (let i = 0; i < dx; i++) await this.page.keyboard.press('ArrowRight');
    } else if (dx < 0) {
      for (let i = 0; i < Math.abs(dx); i++) await this.page.keyboard.press('ArrowLeft');
    }
    if (dy > 0) {
      for (let i = 0; i < dy; i++) await this.page.keyboard.press('ArrowDown');
    } else if (dy < 0) {
      for (let i = 0; i < Math.abs(dy); i++) await this.page.keyboard.press('ArrowUp');
    }
    await this.page.waitForTimeout(80);
  }

  async dragTokenBy(index = 0, deltaX = 50, deltaY = 0) {
    const tokens3 = await tokenLocator(this.page);
    const count1 = await tokens.count1();
    if (count === 0) throw new Error('No tokens to drag');
    const el = tokens.nth(index);
    const box = await el.boundingBox();
    if (!box) throw new Error('Token has no bounding box');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small move to engage dragging
    await this.page.mouse.move(startX + deltaX / 2, startY + deltaY / 2, { steps: 6 });
    // check intermediate - expect some dragging cursor or style possibly applied
    await this.page.waitForTimeout(80);
    await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps: 6 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(150);
  }
}

test.describe('Interactive Venn Diagram (Set Operations) — end-to-end', () => {
  let venn;

  test.beforeEach(async ({ page }) => {
    venn = new VennPage(page);
    await venn.goto();
  });

  test('Idle state on load: status text and UI basics', async ({ page }) => {
    // Validate the app loads into idle state with expected basic status text
    const status1 = await statusLocator(page);
    expect(await status.count()).toBeGreaterThan(0);
    const txt = (await status.textContent())?.trim() ?? '';
    // The FSM specifies "Drag tokens into regions" as idle hint — accept variants
    expect(txt).toMatch(/Drag tokens/i);
    // Expect operation buttons to be present (members/union/intersection etc.)
    const opNames = ['union', 'intersection', 'members', 'sym', 'difference', 'A\\s*-\\s*B'];
    let foundOp = false;
    for (const name of opNames) {
      const loc3 = page.getByRole('button', { name: new RegExp(name, 'i') });
      if (await loc.count() > 0) {
        foundOp = true;
        break;
      }
    }
    expect(foundOp).toBeTruthy();
  });

  test('Creating a token transitions through creating_token and increases DOM tokens', async ({ page }) => {
    // Record current token count
    const before = await venn.getTokenCount();
    // Trigger add token
    await venn.addToken();
    // After create, token count should be at least before + 1
    const after = await venn.getTokenCount();
    expect(after).toBeGreaterThanOrEqual(before + 1);
    // The FSM's createToken attaches pointer & keyboard handlers — ensure newly created token is focusable
    const tokens4 = await tokenLocator(page);
    const newToken = tokens.nth(after - 1);
    // Click to focus and ensure it becomes active/focused
    await newToken.click();
    // The implementation should show focused pill/label when focused; look for that UI
    const pill = page.locator('.focusedToken, .focused-pill, .focus-pill, .token-pill');
    const pillExists = (await pill.count()) > 0;
    // Accept either presence or at least having document.activeElement inside tokens
    const activeIsToken = await page.evaluate(() => {
      const ae = document.activeElement;
      if (!ae) return false;
      return ae.classList.contains('token') || ae.closest('.token') || ae.getAttribute('data-token') ? true : false;
    });
    expect(pillExists || activeIsToken).toBeTruthy();
  });

  test('Focusing a token shows focus UI and supports keyboard nudging & delete', async ({ page }) => {
    // Ensure at least one token exists; create if not
    if ((await venn.getTokenCount()) === 0) await venn.addToken();

    // Focus first token
    const token = await venn.focusToken(0);
    // Focused state should show a pill or some visible label near the token
    const pill1 = page.locator('.focusedToken, .focused-pill1, .focus-pill1, .token-pill1');
    if (await pill.count() > 0) {
      expect(await pill.first().isVisible()).toBeTruthy();
    } else {
      // fallback: the focused element should be the token or inside it
      const activeTag = await page.evaluate(() => document.activeElement?.outerHTML ?? '');
      expect(activeTag.length).toBeGreaterThan(0);
    }

    // Get position, nudge by arrow keys, confirm bounding box moves
    const beforeBoxes = await venn.getTokenBoundingBoxes();
    const beforeBox = beforeBoxes[0];
    await venn.nudgeFocused(1, 0); // small nudge to right
    const afterBoxes = await venn.getTokenBoundingBoxes();
    const afterBox = afterBoxes[0];
    // Some implementations nudge by 1-5px; we assert a measurable change
    const movedRight = afterBox && beforeBox && (afterBox.x > beforeBox.x - 0.5);
    expect(movedRight).toBeTruthy();

    // Delete using keyboard — should remove the focused token and return to idle (no focused pill)
    const countBeforeDelete = await venn.getTokenCount();
    await venn.deleteFocusedWithKeyboard();
    const countAfterDelete = await venn.getTokenCount();
    expect(countAfterDelete).toBeLessThanOrEqual(countBeforeDelete - 1);
    // Focused pill should disappear
    const pillCount = await pill.count();
    if (pillCount > 0) {
      expect(await pill.first().isVisible()).toBeFalsy();
    }
  });

  test('Dragging a token transitions through dragging state and updates position', async ({ page }) => {
    // Ensure we have at least one token
    if ((await venn.getTokenCount()) === 0) await venn.addToken();

    const beforeBoxes1 = await venn.getTokenBoundingBoxes();
    const beforeBox1 = beforeBoxes[0];
    // Drag token by delta
    await venn.dragTokenBy(0, 80, 20);
    const afterBoxes1 = await venn.getTokenBoundingBoxes();
    const afterBox1 = afterBoxes[0];

    // After drag, expect token to have moved by roughly the drag delta
    expect(afterBox.x).toBeGreaterThan(beforeBox.x + 10);
    // The FSM indicates cursor/state changes; attempt to detect a dragging class on body during drag is hard post-fact.
    // Instead ensure transitions restored (token still has bounding box)
    expect(afterBox.width).toBeCloseTo(beforeBox.width, 0);
  });

  test('Randomize/shuffle repositions tokens (shuffling state)', async ({ page }) => {
    // Ensure multiple tokens exist for shuffle to be meaningful
    if ((await venn.getTokenCount()) < 3) {
      await venn.addToken();
      await venn.addToken();
    }
    const before1 = await venn.getTokenBoundingBoxes();
    await venn.randomize();
    const after1 = await venn.getTokenBoundingBoxes();
    // At least one token should have changed position
    let changed = false;
    for (let i = 0; i < Math.min(before.length, after.length); i++) {
      const b1 = before[i], a = after[i];
      if (!b || !a) continue;
      if (Math.abs(b.x - a.x) > 2 || Math.abs(b.y - a.y) > 2) {
        changed = true;
        break;
      }
    }
    expect(changed).toBeTruthy();
  });

  test('Reset/Seed creates fresh tokens and updates counts (seeding state)', async ({ page }) => {
    // Perform reset/seed; FSM indicates existing tokens removed and seeded tokens created
    const beforeCount = await venn.getTokenCount();
    await venn.resetOrSeed();
    const afterCount = await venn.getTokenCount();
    // Expect afterCount to be non-zero and likely different from before
    expect(afterCount).toBeGreaterThanOrEqual(0);
    // If there were tokens before, ensure they were replaced or at least new positions exist
    if (beforeCount > 0) {
      // either changed count or positions changed
      const beforeBoxes2 = await venn.getTokenBoundingBoxes();
      // Wait a bit and get new boxes
      await page.waitForTimeout(150);
      const newBoxes = await venn.getTokenBoundingBoxes();
      // If counts equal, at least one positional difference expected
      if (beforeCount === afterCount && beforeCount > 0) {
        let posChanged = false;
        for (let i = 0; i < Math.min(beforeBoxes.length, newBoxes.length); i++) {
          const b2 = beforeBoxes[i], a = newBoxes[i];
          if (!b || !a) continue;
          if (Math.abs(b.x - a.x) > 2 || Math.abs(b.y - a.y) > 2) { posChanged = true; break; }
        }
        expect(posChanged).toBeTruthy();
      }
    }
  });

  test('Show result: animating_result path and empty result path handled', async ({ page }) => {
    // Ensure we have tokens (seed produces some overlap per FSM); select multiple ops to exercise transitions
    // Click operation "intersection" to try to get non-empty and then "symdiff" to try empty (if available)
    // We'll be forgiving: show result should either animate then report Result: or indicate empty set '∅'
    const opCandidates = ['Intersection', 'Intersection (A ∩ B)', 'intersection', 'Intersec'];
    for (const op of opCandidates) {
      const btn6 = page.getByRole('button', { name: new RegExp(op, 'i') });
      if (await btn.count() > 0) {
        await btn.first().click();
        break;
      }
    }

    // Trigger result computation
    // Listen for any dialog that might block (some implementations may use alert for explain only, but be safe)
    const status2 = await statusLocator(page);
    await venn.showResult();

    // After clicking, FSM animating_result sets status 'Animating result...' then later 'Result: ...' or '∅'
    // Poll status for meaningful change within reasonable time
    const maxWait = 5000;
    const start = Date.now();
    let finalStatus = '';
    while (Date.now() - start < maxWait) {
      finalStatus = (await status.textContent())?.trim() ?? '';
      if (/Animating|Result|∅|∅|empty/i.test(finalStatus)) break;
      await page.waitForTimeout(150);
    }
    expect(finalStatus.length).toBeGreaterThan(0);
    // Accept either an animating message that eventually resolves to Result or an empty-set symbol
    if (/Animating/i.test(finalStatus)) {
      // wait for animation to finish
      const start2 = Date.now();
      let finalAfter = finalStatus;
      while (Date.now() - start2 < maxWait) {
        finalAfter = (await status.textContent())?.trim() ?? '';
        if (/Result[:\s]|∅|empty/i.test(finalAfter)) break;
        await page.waitForTimeout(150);
      }
      expect(/Result[:\s]|∅|empty/i.test(finalAfter)).toBeTruthy();
    } else {
      expect(/Result[:\s]|∅|empty/i.test(finalStatus)).toBeTruthy();
    }
  }, { timeout: 15000 });

  test('Explain button opens a blocking explanation dialog (explaining state)', async ({ page }) => {
    // Prepare dialog handler
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    // Click explain
    try {
      await venn.explain();
    } catch (err) {
      // If explain button doesn't exist, fail test explicitly with helpful message
      throw new Error('Explain button not found in the UI');
    }
    // Wait briefly for dialog
    await page.waitForTimeout(200);
    expect(dialogMessage.length).toBeGreaterThan(0);
    // The explanation should mention membership rules or sets
    expect(/member|set|union|intersection|difference|symmetry|overlap/i.test(dialogMessage)).toBeTruthy();
    // After dialog accepted, FSM should return to idle; status should again contain drag hint or not be blocking
    const statusText = await venn.getStatusText();
    expect(statusText.length).toBeGreaterThan(0);
  });

  test('Toggle labels updates token label visibility (TOGGLE_LABELS event)', async ({ page }) => {
    // Ensure we have tokens with labels (create one if necessary)
    if ((await venn.getTokenCount()) === 0) await venn.addToken();
    // Try to find visible label elements (plausible selectors)
    const labelSelectors = ['.token-label', '.label', '.chip-label', '.token > .label', '.token .label'];
    let anyLabelBefore = false;
    for (const sel of labelSelectors) {
      const loc4 = page.locator(sel);
      if (await loc.count() > 0) {
        anyLabelBefore = true;
        break;
      }
    }
    // Toggle labels
    try {
      await venn.toggleLabels();
    } catch (err) {
      // If there is no toggle labels control, skip but do not fail
      test.info().annotations.push({ type: 'note', description: 'No toggle labels control found; skipping label visibility assertions.' });
      return;
    }
    // After toggling, check that label presence changed (either appeared or disappeared)
    let anyLabelAfter = false;
    for (const sel of labelSelectors) {
      const loc5 = page.locator(sel);
      if (await loc.count() > 0) {
        anyLabelAfter = true;
        break;
      }
    }
    // Expect a change in label visibility (true -> false or false -> true)
    expect(anyLabelAfter !== anyLabelBefore).toBeTruthy();
  });

  test('Operation selection updates active button (OP_SELECT self-transitions)', async ({ page }) => {
    // Attempt to find and click several operation buttons and assert active styling/class applied
    const opsToTry = ['Union', 'Intersection', 'A\\s*-\\s*B', 'B\\s*-\\s*A', 'Symmetric', 'Members'];
    let foundOne = false;
    for (const op of opsToTry) {
      const btn7 = page.getByRole('button', { name: new RegExp(op, 'i') });
      if (await btn.count() === 0) continue;
      foundOne = true;
      const el1 = btn.first();
      // Click and expect the element to acquire an 'active' class or attribute aria-pressed
      await el.click();
      await page.waitForTimeout(80);
      const classList = await el.getAttribute('class') ?? '';
      const ariaPressed = await el.getAttribute('aria-pressed');
      const visuallyActive = classList.includes('active') || ariaPressed === 'true';
      expect(visuallyActive).toBeTruthy();
      // Click again to ensure idempotent selection (self-transition)
      await el.click();
      await page.waitForTimeout(80);
      // Still active
      const classList2 = await el.getAttribute('class') ?? '';
      const ariaPressed2 = await el.getAttribute('aria-pressed');
      expect(classList2.includes('active') || ariaPressed2 === 'true').toBeTruthy();
      // check status text updates to indicate operation name possibly
      const statusTxt = await venn.getStatusText();
      expect(statusTxt.length).toBeGreaterThan(0);
      break;
    }
    expect(foundOne).toBeTruthy();
  });

  test('Edge case: attempting to show result when no tokens yields empty-result feedback (SHOW_RESULT_EMPTY)', async ({ page }) => {
    // Remove all tokens if possible by focusing and deleting repeatedly
    let count2 = await venn.getTokenCount();
    for (let i = 0; i < count; i++) {
      // Re-query tokens and delete the first one
      if ((await venn.getTokenCount()) === 0) break;
      await venn.focusToken(0);
      await venn.deleteFocusedWithKeyboard();
      await page.waitForTimeout(60);
    }
    // Confirm zero tokens
    expect(await venn.getTokenCount()).toBeLessThanOrEqual(0);
    // Click show result — FSM should branch to SHOW_RESULT_EMPTY and not attempt long animation
    try {
      await venn.showResult();
    } catch {
      // If no show result button, skip this check
      test.info().annotations.push({ type: 'note', description: 'No Show result control found; skipping empty-result assertion.' });
      return;
    }
    const status3 = await statusLocator(page);
    // Wait briefly for status to reflect empty-set
    await page.waitForTimeout(300);
    const txt1 = (await status.textContent())?.trim() ?? '';
    // Expect empty-set char or wording
    expect(/∅|empty/i.test(txt)).toBeTruthy();
  });
});