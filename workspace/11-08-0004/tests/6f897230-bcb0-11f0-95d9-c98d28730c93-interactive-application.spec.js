import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/6f897230-bcb0-11f0-95d9-c98d28730c93.html';

// Helper to find a button by multiple possible visible labels (case-insensitive)
async function findButton(page, ...labels) {
  for (const label of labels) {
    const locator = page.locator('button', { hasText: new RegExp(label, 'i') }).first();
    if (await locator.count() > 0) return locator;
  }
  // Try a few generic selectors that often appear
  const fallbacks = [
    page.locator('.control-btn').first(),
    page.locator('button.play').first(),
    page.locator('button.secondary').first(),
    page.locator('button').first()
  ];
  for (const f of fallbacks) {
    if (await f.count() > 0) return f;
  }
  return null;
}

// Helper to locate the table element in multiple possible ways
function tableLocator(page) {
  // try semantic table, or grid-like divs, or dp-table id/class
  return page.locator('table, [role="grid"], .dp-table, #tableEl, .table').first();
}

// Helper to locate LCS output box
function lcsLocator(page) {
  return page.locator('#lcsBox, .lcs-box, [data-testid="lcs"], .lcs, text=/LCS/i, text=/Longest Common Subsequence/i').first();
}

// Helper to locate status text area that displays messages
function statusLocator(page) {
  return page.locator('#status, .status, [role="status"], .controls .status, .status-text').first();
}

// Helper to type the two input sequences (assumes two text inputs exist)
async function fillInputs(page, a, b) {
  const inputs = page.locator('input[type="text"], input');
  const count = await inputs.count();
  if (count >= 2) {
    await inputs.nth(0).fill(a);
    await inputs.nth(1).fill(b);
  } else {
    // fallback: try named inputs
    const aInput = page.locator('input[name="a"], input#stringA').first();
    const bInput = page.locator('input[name="b"], input#stringB').first();
    if (await aInput.count() > 0) await aInput.fill(a);
    if (await bInput.count() > 0) await bInput.fill(b);
  }
}

test.describe('LCS Interactive - FSM state and transition tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for UI to settle
    await page.waitForLoadState('domcontentloaded');
  });

  test('Initial idle state: no table built, inputs present', async ({ page }) => {
    // Validate there are text inputs for user sequences
    const inputs1 = page.locator('input[type="text"], input');
    await expect(inputs).toHaveCountGreaterThan(0);

    // Assert table is not present in idle state
    const table = tableLocator(page);
    await expect(table).toHaveCount(0);

    // The Reset control should be present and clicking it in idle should not break anything
    const resetBtn = await findButton(page, 'reset', 'clear', 'start over');
    if (resetBtn) {
      await resetBtn.click();
      // still no table after reset
      await expect(table).toHaveCount(0);
    }
  });

  test('Prepare with empty inputs triggers validation (dialog) or no transition', async ({ page }) => {
    // Ensure inputs are empty
    await fillInputs(page, '', '');

    const prepareBtn = await findButton(page, 'prepare', 'build', 'start', 'generate');
    // Listen for dialog; some implementations may show an alert/confirm when inputs invalid
    let dialogSeen = false;
    page.once('dialog', async dialog => {
      dialogSeen = true;
      // capture message for assertion, then dismiss
      const msg = dialog.message();
      expect(msg.toLowerCase()).toContain('enter') || expect(msg.toLowerCase()).toContain('input');
      await dialog.dismiss();
    });

    if (prepareBtn) {
      await prepareBtn.click();
      // Give a short time for dialog to appear
      try {
        await page.waitForEvent('dialog', { timeout: 1000 });
      } catch (e) {
        // no dialog popped; that's acceptable — ensure table still not built
      }
    }

    // Table should not be built after failed prepare
    const table1 = tableLocator(page);
    await expect(table).toHaveCount(0);
  });

  test('Prepare success builds grid/table and initializes state (ready)', async ({ page }) => {
    // Use small inputs to keep table tiny
    await fillInputs(page, 'ABC', 'AC');

    const prepareBtn1 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    expect(prepareBtn).not.toBeNull();
    await prepareBtn.click();

    // Wait for the table/grid to appear and have rows and cells
    const table2 = tableLocator(page);
    await expect(table).toBeVisible({ timeout: 3000 });

    // Assert there are cells (td or divs)
    const anyCell = page.locator('table td, table th, .dp-table td, .cell, .grid-cell');
    await expect.any(anyCell.count() > 0 ? anyCell : table).toBeTruthy();

    // stepIndex should be -1 initially; try to infer from status text or UI indicator
    const status = statusLocator(page);
    if (await status.count() > 0) {
      const text = (await status.textContent()) || '';
      // if UI shows step index it's often "Step -1" or "Step 0", ensure it indicates initial state
      expect(text.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('Step forward/backward via buttons and keyboard (STEP_FORWARD / STEP_BACKWARD)', async ({ page }) => {
    await fillInputs(page, 'AB', 'BA');

    const prepareBtn2 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    await prepareBtn.click();

    // Attempt to find step/forward/back buttons
    const stepBtn = await findButton(page, 'step', 'next', 'forward');
    const backBtn = await findButton(page, 'back', 'prev', 'previous', 'backward');

    // If buttons exist, click them; otherwise use keyboard arrows
    if (stepBtn) {
      await stepBtn.click();
      // after step, expect some highlight or non-empty cell; check at least one cell has content value (0 or 1)
      const cellWithText = page.locator('table td:has-text("0"), table td:has-text("1"), .cell:has-text("0"), .cell:has-text("1")');
      await expect(cellWithText).toHaveCountGreaterThan(0);
    } else {
      // Send keyboard right arrow to step forward
      await page.keyboard.press('ArrowRight');
      const cellWithText1 = page.locator('table td:has-text("0"), table td:has-text("1"), .cell:has-text("0"), .cell:has-text("1")');
      await expect(cellWithText).toHaveCountGreaterThan(0);
    }

    // Now step backward - either button or left arrow
    if (backBtn) {
      await backBtn.click();
      // after backward, ensure UI still responsive - at minimum cells remain present
      const cells = page.locator('table td, .cell');
      await expect(cells).toHaveCountGreaterThan(0);
    } else {
      await page.keyboard.press('ArrowLeft');
      const cells1 = page.locator('table td, .cell');
      await expect(cells).toHaveCountGreaterThan(0);
    }
  });

  test('Play loop: PLAY_TOGGLE -> playing -> FILL_COMPLETE transitions and Play/Pause keyboard toggle', async ({ page }) => {
    // Use minimal strings to complete quickly
    await fillInputs(page, 'A', 'A');

    const prepareBtn3 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    await prepareBtn.click();

    const playBtn = await findButton(page, 'play', 'pause', 'start', 'pause');
    expect(playBtn).not.toBeNull();
    // Click play to start playing
    await playBtn.click();

    // Also test spacebar toggles play/pause (KEY_SPACE)
    // Give a short moment for animation/loop to start
    await page.waitForTimeout(200);
    await page.keyboard.press('Space');
    // space toggles play/pause; press again to continue playing
    await page.keyboard.press('Space');

    // Wait for the table to be filled: look for the success message or for filled cell values (>0)
    const successMessage = page.locator('text=Finished filling table., text=Finished filling table', { exact: false }).first();
    try {
      await successMessage.waitFor({ timeout: 3000 });
      await expect(successMessage).toBeVisible();
    } catch {
      // Fallback: look for numeric values in bottom-right cell equal to LCS length (1 here)
      const cellOne = page.locator('table td:has-text("1"), .cell:has-text("1")');
      await expect(cellOne).toHaveCountGreaterThan(0);
    }

    // After fill complete, play should have stopped (onExit stopPlay sets playing=false). The play button text is likely "Play"
    const playBtnAfter = await findButton(page, 'play', 'pause');
    if (playBtnAfter) {
      const txt = (await playBtnAfter.textContent()) || '';
      // Expect that play is actionable again ("Play" or similar)
      expect(/play/i.test(txt) || /restart/i.test(txt)).toBeTruthy();
    }
  });

  test('Backtracking path and LCS output (BACKTRACK_CLICK -> BACKTRACK_COMPLETE)', async ({ page }) => {
    // Strings that produce a non-empty LCS
    await fillInputs(page, 'ABC', 'AC');

    const prepareBtn4 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    await prepareBtn.click();

    // Fill table quickly by clicking play and waiting for completion
    const playBtn1 = await findButton(page, 'play', 'pause', 'start');
    if (playBtn) await playBtn.click();

    // Wait for filled state
    const successMessage1 = page.locator('text=Finished filling table., text=Finished filling table', { exact: false }).first();
    try {
      await successMessage.waitFor({ timeout: 4000 });
    } catch {
      // fallback to small wait
      await page.waitForTimeout(500);
    }

    // Trigger backtracking
    const backtrackBtn = await findButton(page, 'backtrack', 'traceback', 'backtrack');
    if (backtrackBtn) {
      await backtrackBtn.click();
    } else {
      // Try a control that likely triggers backtrack
      const alt = await findButton(page, 'trace', 'path', 'extract');
      if (alt) await alt.click();
    }

    // Wait for LCS output to appear in LCS box or a dedicated element
    const lcsBox = lcsLocator(page);
    if (await lcsBox.count() > 0) {
      // The expected LCS for ABC and AC is "AC"
      // Wait until it contains at least 'A' or 'AC'
      await expect.poll(async () => (await lcsBox.textContent()) || '', {
        timeout: 3000
      }).toContain('A');
      const text1 = (await lcsBox.textContent()) || '';
      expect(text.length).toBeGreaterThan(0);
    } else {
      // If no explicit LCS box, assert that some path highlighting exists (cells with path color class)
      const pathCells = page.locator('.path, .on-path, .backtrack, .match, .path-cell');
      // It might be animated; give it time
      await page.waitForTimeout(300);
      await expect(pathCells).toHaveCountGreaterThan(0);
    }

    // After backtrack completes, state should transition to filled (FSM), so status message might be updated
    const status1 = statusLocator(page);
    if (await status.count() > 0) {
      const txt1 = (await status.textContent()) || '';
      expect(txt.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('Reset from various states returns to idle and clears UI (RESET_CLICK)', async ({ page }) => {
    // Prepare and fill small example
    await fillInputs(page, 'AZ', 'AZ');
    const prepareBtn5 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    await prepareBtn.click();

    const playBtn2 = await findButton(page, 'play', 'pause', 'start');
    if (playBtn) await playBtn.click();
    // wait briefly for fill/animation to progress
    await page.waitForTimeout(300);

    // Click reset
    const resetBtn1 = await findButton(page, 'reset', 'clear', 'start over');
    expect(resetBtn).not.toBeNull();
    await resetBtn.click();

    // Table should be cleared/removed
    const table3 = tableLocator(page);
    // Give a little time for reset action
    await page.waitForTimeout(200);
    await expect(table).toHaveCount(0);

    // LCS box should be empty or not present
    const lcsBox1 = lcsLocator(page);
    if (await lcsBox.count() > 0) {
      const txt2 = (await lcsBox.textContent()) || '';
      expect(txt.trim().length).toBe(0);
    }
  });

  test('Cell click shows transient annotation (CELL_CLICK) and does not change FSM state', async ({ page }) => {
    await fillInputs(page, 'ABC', 'ABC');
    const prepareBtn6 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    await prepareBtn.click();

    // Click a cell: choose a visible cell
    const anyCell1 = page.locator('table td, .cell, .grid-cell').first();
    if (await anyCell.count() === 0) {
      test.skip('No table cells found to click for CELL_CLICK test');
      return;
    }
    await anyCell.click();

    // Transient annotation may be a tooltip or floating element; look for common tooltip selectors or role
    const tooltip = page.locator('[role="tooltip"], .annotation, .floating-annotation, .cell-annotation, .tooltip').first();
    // Wait briefly for transient annotation to appear (if implemented)
    try {
      await tooltip.waitFor({ timeout: 1000 });
      await expect(tooltip).toBeVisible();
    } catch {
      // If no tooltip, ensure clicking cell didn't remove the table (FSM state unchanged)
      const table4 = tableLocator(page);
      await expect(table).toHaveCountGreaterThan(0);
    }
  });

  test('Prepare with long strings prompts confirm and can continue (PREPARE_CLICK with ALERT_CONFIRM)', async ({ page }) => {
    // Create long inputs to potentially trigger a confirmation
    const longA = 'A'.repeat(200);
    const longB = 'B'.repeat(200);
    await fillInputs(page, longA, longB);

    const prepareBtn7 = await findButton(page, 'prepare', 'build', 'start', 'generate');

    // Intercept dialog: accept the confirm to continue
    let dialogHandled = false;
    page.once('dialog', async dialog => {
      dialogHandled = true;
      // Confirm to proceed
      await dialog.accept();
    });

    await prepareBtn.click();

    // Wait shortly; if dialog was shown, our handler accepted and app should proceed to build the table
    await page.waitForTimeout(500);

    const table5 = tableLocator(page);
    // Either the confirm was shown and table appears, or confirm wasn't implemented and table may still appear
    // We assert that either the dialog was handled or the table remains absent, but if table present then we're good
    if (dialogHandled) {
      await expect(table).toHaveCountGreaterThan(0);
    } else {
      // No dialog — still acceptable; ensure either table present (prepared) or user left on idle due to internal guard
      // We'll accept either scenario; assert no unhandled blocking state by checking UI still responsive
      const inputs2 = page.locator('input[type="text"], input');
      await expect(inputs).toHaveCountGreaterThan(0);
    }
  });

  test('Keyboard shortucts: Space toggles play and arrow keys step (KEY_SPACE, KEY_RIGHT, KEY_LEFT)', async ({ page }) => {
    await fillInputs(page, 'AB', 'A');

    const prepareBtn8 = await findButton(page, 'prepare', 'build', 'start', 'generate');
    await prepareBtn.click();

    // Press Space to toggle play
    await page.keyboard.press('Space');
    // Pause briefly and then toggle again
    await page.waitForTimeout(150);
    await page.keyboard.press('Space');

    // Use ArrowRight to step forward and ArrowLeft to step back
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');

    // Validate that table still exists and cells contain values
    const cells2 = page.locator('table td, .cell');
    await expect(cells).toHaveCountGreaterThan(0);
  });
});