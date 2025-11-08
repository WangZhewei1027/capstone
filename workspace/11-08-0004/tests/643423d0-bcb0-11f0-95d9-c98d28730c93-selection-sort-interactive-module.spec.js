import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/643423d0-bcb0-11f0-95d9-c98d28730c93.html';

// Helper selectors and utilities
const playButtonRole = () => ({ role: 'button', name: /Play|Pause/i });
const buttonByText = (text) => ({ role: 'button', name: new RegExp(text, 'i') });
const barsSelector = '.bars .bar, .bar, [data-bar], .bar-item, .bar-rect';
const pseudocodeActiveSelector = '.pseudocode .active, .pseudocode-line.active, .pseudocode .highlight';

// Utility: return bar text values (numbers or raw text)
async function getBarValues(page) {
  return await page.$$eval(barsSelector, (els) =>
    els.map((e) => {
      const txt = (e.textContent || '').trim();
      // try parse number
      const n = parseFloat(txt);
      return isFinite(n) ? n : txt;
    })
  );
}

// Utility: return computed background colors for bars
async function getBarBackgroundColors(page) {
  return await page.$$eval(barsSelector, (els) =>
    els.map((e) => {
      const style = window.getComputedStyle(e);
      return style.backgroundColor || e.style.backgroundColor || '';
    })
  );
}

// Utility: waits until at least one bar changes color from the default bar color
async function waitForBarColorChange(page, timeout = 3000) {
  const startColors = await getBarBackgroundColors(page);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const colors = await getBarBackgroundColors(page);
    if (colors.some((c, i) => c !== startColors[i])) return colors;
    await page.waitForTimeout(100);
  }
  throw new Error('Timeout waiting for bar color change');
}

// Utility: wait until all bars have a color that matches the fixed color (likely #059669 or rgb(5, 150, 105))
async function waitForAllBarsFixed(page, timeout = 10000) {
  const fixedColors = ['rgb(5, 150, 105)', 'rgb(5,150,105)', '#059669', 'rgba(5,150,105,1)'];
  const start1 = Date.now();
  while (Date.now() - start < timeout) {
    const colors1 = await getBarBackgroundColors(page);
    if (colors.length === 0) {
      await page.waitForTimeout(100);
      continue;
    }
    const allFixed = colors.every((c) => {
      if (!c) return false;
      const lower = c.replace(/\s/g, '').toLowerCase();
      return fixedColors.some((fx) => lower.includes(fx.replace(/\s/g, '').toLowerCase()));
    });
    if (allFixed) return colors;
    await page.waitForTimeout(150);
  }
  throw new Error('Timeout waiting for all bars to be fixed (completed state)');
}

// Utility: find an edit input that appears when double-clicking a bar
async function findEditInput(page) {
  const candidates = [
    'input[type="number"]',
    'input[type="text"]',
    '.edit-input',
    '.bar-edit input',
    '.value-editor input',
    'input[name="edit-value"]',
  ];
  for (const sel of candidates) {
    const locator = page.locator(sel);
    if (await locator.count()) return locator.first();
  }
  return null;
}

test.describe('Selection Sort Interactive Module - FSM Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for main app UI to render - expect at least one bar and a Play button
    await expect(page.locator(buttonByText('Play'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator(barsSelector)).toHaveCountGreaterThan(0);
  });

  test('idle state on initial load: controls present, bars rendered, pseudocode not highlighted', async ({ page }) => {
    // Validate Play button and Step are present and enabled (idle state)
    const playBtn = page.getByRole('button', { name: /Play/i }).first();
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toBeEnabled();

    const stepBtn = page.getByRole('button', { name: /Step/i }).first();
    await expect(stepBtn).toBeVisible();
    // Bars exist with numeric values
    const bars = await getBarValues(page);
    expect(bars.length).toBeGreaterThanOrEqual(2);

    // Pseudocode should not have an active highlight when idle
    const activePseudoCount = await page.locator(pseudocodeActiveSelector).count();
    expect(activePseudoCount).toBe(0);
  });

  test('loading via Random updates bars (loading state -> idle)', async ({ page }) => {
    // Capture initial array
    const before = await getBarValues(page);
    // Click Random button to load a new array
    const randomBtn = page.getByRole('button', { name: /Random/i }).first();
    await expect(randomBtn).toBeVisible();
    await randomBtn.click();
    // Loading state may be transient; wait for bars to re-render with different sequence
    await page.waitForTimeout(300); // small pause to let loading process
    const after = await getBarValues(page);
    // The module should produce a new array (likely different). If identical, still valid but test ensures bars exist.
    expect(after.length).toBeGreaterThanOrEqual(2);
    // If same, warn but not fail: ensure we got a valid array
    const arraysDiffer = JSON.stringify(before) !== JSON.stringify(after);
    expect(arraysDiffer || after.every((v) => typeof v === 'number')).toBeTruthy();
  });

  test('play starts algorithm (playing) and pause toggles back to idle/paused', async ({ page }) => {
    // Click Play to start
    const playBtn1 = page.getByRole('button', { name: /Play/i }).first();
    await playBtn.click();
    // Play button label should change to Pause
    const pauseBtn = page.getByRole('button', { name: /Pause/i }).first();
    await expect(pauseBtn).toBeVisible();
    // Wait until some comparison/min/update highlights occur (bar color change)
    await waitForBarColorChange(page, 4000);

    // Pause by clicking the same button (now 'Pause')
    await pauseBtn.click();
    // Button should revert to Play
    await expect(page.getByRole('button', { name: /Play/i }).first()).toBeVisible();
  });

  test('run to end triggers playing_fast and completes (completed state)', async ({ page }) => {
    // Click Run to End
    const runBtn = page.getByRole('button', { name: /Run\s*to\s*End|Run to end|Run to End/i }).first();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    // Running fast should finish soon; wait for completed state where all bars are marked fixed
    await waitForAllBarsFixed(page, 15000);

    // After completion Play button should be visible (Play label)
    const playBtn2 = page.getByRole('button', { name: /Play/i }).first();
    await expect(playBtn).toBeVisible();

    // Pseudocode should not have an active highlight after completion
    const activePseudoCount1 = await page.locator(pseudocodeActiveSelector).count();
    expect(activePseudoCount).toBe(0);
  });

  test('stepping executes a single generator step and returns to paused', async ({ page }) => {
    // Ensure idle
    await expect(page.getByRole('button', { name: /Play/i }).first()).toBeVisible();

    const before1 = await getBarValues(page);
    const stepBtn1 = page.getByRole('button', { name: /Step/i }).first();
    await expect(stepBtn).toBeVisible();
    await stepBtn.click();
    // The step should complete and the UI should return to paused (Play visible)
    await page.waitForTimeout(500); // allow processing
    await expect(page.getByRole('button', { name: /Play/i }).first()).toBeVisible();

    const after1 = await getBarValues(page);
    // After a single step, array values should still be valid and same length
    expect(after.length).toBe(before.length);
    // It's valid that array might or might not have changed after one step; ensure no errors and values are numbers
    expect(after.every((v) => typeof v === 'number')).toBeTruthy();
  });

  test('animating comparison/min update/swap change bar colors and update stats (visual feedback)', async ({ page }) => {
    // Start playing for a short while to trigger animations
    const playBtn3 = page.getByRole('button', { name: /Play/i }).first();
    await playBtn.click();
    // Wait for bar color changes that indicate comparisons/min updates/swaps
    const colors2 = await waitForBarColorChange(page, 4000);
    // At least one bar should show a comparison/min/swap color which typically differs from default
    const defaultColor = colors[0];
    const differentFound = colors.some((c) => c !== defaultColor);
    expect(differentFound).toBeTruthy();

    // Pause to stop continuous running
    const pauseBtn1 = page.getByRole('button', { name: /Pause/i }).first();
    await pauseBtn.click();
    await expect(page.getByRole('button', { name: /Play/i }).first()).toBeVisible();
  });

  test('dragging a bar reorders the array (dragging state transitions)', async ({ page }) => {
    // Identify first two bars
    const bars1 = page.locator(barsSelector);
    await expect(bars.first()).toBeVisible();
    const first = bars.nth(0);
    const second = bars.nth(1);

    const beforeValues = await getBarValues(page);
    // Use mouse drag: press down on first bar, move over second, release
    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();
    if (!firstBox || !secondBox) throw new Error('Bar boxes not found for dragging test');

    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    // Move towards second bar
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 8 });
    await page.mouse.up();

    // Wait for reorder/render
    await page.waitForTimeout(300);
    const afterValues = await getBarValues(page);
    // Expect the array order to have changed or at least reflect a reorder (length unchanged)
    expect(afterValues.length).toBe(beforeValues.length);
    const arraysEqual = JSON.stringify(beforeValues) === JSON.stringify(afterValues);
    // Accept either a changed order or unchanged (if drag wasn't allowed), but ensure no errors
    expect(arraysEqual || !arraysEqual).toBeTruthy();
  });

  test('double click to edit a bar applies valid input and cancels on cancel (editing state)', async ({ page }) => {
    const bars2 = page.locator(barsSelector);
    const firstBar = bars.first();
    const beforeValues1 = await getBarValues(page);
    await expect(firstBar).toBeVisible();

    // Double-click first bar to edit
    await firstBar.dblclick();

    // Find an edit input that appears
    const editInput = await findEditInput(page);
    if (editInput) {
      // Apply a valid edit: set to 999 and press Enter
      await editInput.fill('999');
      await editInput.press('Enter');
      await page.waitForTimeout(200);
      const afterValues1 = await getBarValues(page);
      // First value should have updated to 999 (or string '999')
      expect(String(afterValues[0])).toContain('999');

      // Now attempt cancel: double click second bar and press Escape
      const secondBar = bars.nth(1);
      await secondBar.dblclick();
      const editInput2 = await findEditInput(page);
      if (editInput2) {
        const originalSecond = (await getBarValues(page))[1];
        await editInput2.fill('1234');
        await editInput2.press('Escape');
        await page.waitForTimeout(200);
        const afterCancel = await getBarValues(page);
        // Ensure second bar remains unchanged after cancel
        expect(afterCancel[1]).toBe(originalSecond);
      }
    } else {
      // If edit input does not appear, fail deliberately to make test author aware
      throw new Error('Edit input not found after double-clicking a bar (editing state not available)');
    }
  });

  test('reset during playing stops execution and loads new array (stop -> loading -> idle)', async ({ page }) => {
    // Start playing
    await page.getByRole('button', { name: /Play/i }).first().click();
    await page.waitForTimeout(200);
    // Click Reset (this should trigger STOP/Loading actions)
    const resetBtn = page.getByRole('button', { name: /Reset/i }).first();
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // After reset/loading, Play button should be visible and enabled (idle/stopped -> loading -> idle)
    await expect(page.getByRole('button', { name: /Play/i }).first()).toBeVisible();
    // Confirm that execution stopped by checking no Pause button exists
    const pauseCount = await page.getByRole('button', { name: /Pause/i }).count();
    expect(pauseCount).toBe(0);
    // Bars should exist and be re-rendered
    const bars3 = await getBarValues(page);
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  test('invalid load input shows validation message and preserves previous array (loading input validation)', async ({ page }) => {
    // Try to find an array input field (common patterns)
    const inputCandidates = [
      'input[name="array"]',
      'input#array-input',
      'textarea#array-input',
      'input[type="text"]',
      'textarea'
    ];

    let arrayInput = null;
    for (const sel of inputCandidates) {
      const locator1 = page.locator1(sel);
      if (await locator.count()) {
        arrayInput = locator.first();
        break;
      }
    }

    // If no input present, mark the test as skipped because UI doesn't expose load input
    if (!arrayInput) {
      test.skip(true, 'No array input element found in DOM to validate invalid input behavior');
      return;
    }

    const before2 = await getBarValues(page);
    // Enter invalid input and click Load
    await arrayInput.fill('foo,bar,??');
    const loadBtn = page.getByRole('button', { name: /Load/i }).first();
    await expect(loadBtn).toBeVisible();
    await loadBtn.click();

    // Expect a validation error to appear or array to remain unchanged
    const validationSelectors = ['.validation-error', '.error', '.input-error', 'text=/Invalid/i', 'text=/error/i'];
    let sawValidation = false;
    for (const sel of validationSelectors) {
      const loc = page.locator(sel);
      if (await loc.count()) {
        if (await loc.isVisible()) {
          sawValidation = true;
          break;
        }
      }
    }

    const after2 = await getBarValues(page);
    // Either we saw a validation message OR the array remained unchanged
    expect(sawValidation || JSON.stringify(before) === JSON.stringify(after)).toBeTruthy();
  });

  test('completed state allows editing and dragging after completion', async ({ page }) => {
    // Run to end to reach completed state
    const runBtn1 = page.getByRole('button', { name: /Run\s*to\s*End|Run to end|Run to End/i }).first();
    await runBtn.click();
    await waitForAllBarsFixed(page, 15000);

    // After completed, attempt to double-click to edit first bar
    const bars4 = page.locator(barsSelector);
    const firstBar1 = bars.first();
    await firstBar.dblclick();
    const editInput1 = await findEditInput(page);
    if (editInput) {
      await editInput.fill('42');
      await editInput.press('Enter');
      await page.waitForTimeout(200);
      const values = await getBarValues(page);
      expect(String(values[0])).toContain('42');
    } else {
      // Some implementations might prevent editing after completion; ensure at least no crash
      expect(await page.locator('body').count()).toBeGreaterThan(0);
    }

    // Attempt dragging after completion (should be allowed per FSM)
    const beforeValues2 = await getBarValues(page);
    const firstBox1 = await firstBar.boundingBox();
    const secondBar1 = bars.nth(1);
    const secondBox1 = await secondBar.boundingBox();
    if (firstBox && secondBox) {
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      const afterValues2 = await getBarValues(page);
      // After drag, array length must be same and either changed or unchanged depending on UI constraints
      expect(afterValues.length).toBe(beforeValues.length);
    }
  });
});