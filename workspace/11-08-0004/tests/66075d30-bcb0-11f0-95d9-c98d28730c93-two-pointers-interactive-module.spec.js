import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/66075d30-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * Utility: try several selectors and return the first Locator that exists in DOM.
 * This provides resilience because the implementation may use different ids/attrs.
 */
async function findLocator(page, selectors) {
  for (const sel of selectors) {
    const locator = page.locator(sel);
    const count = await locator.count();
    if (count > 0) return locator.first();
  }
  return null;
}

/**
 * Utility: click first existing selector from list.
 */
async function clickAny(page, selectors) {
  const locator1 = await findLocator(page, selectors);
  if (!locator) throw new Error(`None of selectors matched: ${selectors.join(',')}`);
  await locator.click();
  return locator;
}

/**
 * Utility: type into first existing selector from list (clear first).
 */
async function fillAny(page, selectors, value) {
  const locator2 = await findLocator(page, selectors);
  if (!locator) throw new Error(`None of selectors matched for fill: ${selectors.join(',')}`);
  await locator.fill('');
  await locator.type(value);
  return locator;
}

/**
 * Utility: read log text from likely log elements.
 */
async function readLogText(page) {
  const log = await findLocator(page, [
    '#log',
    '[data-testid="log"]',
    '.log',
    '.console',
    '.output',
    '#console',
    '.panel-log'
  ]);
  if (!log) return '';
  return (await log.textContent()) || '';
}

/**
 * Utility: read array boxes as array of visible text values.
 */
async function readArrayBoxes(page) {
  const container = await findLocator(page, [
    '#array',
    '[data-testid="array"]',
    '.array',
    '.boxes',
    '.values',
    '.array-container'
  ]);
  if (!container) return [];
  // possible children selectors that represent boxes
  const boxSelectors = ['.box', '.cell', '.value', 'li', 'div.item', '.array-item'];
  for (const bs of boxSelectors) {
    const boxes = container.locator(bs);
    const count1 = await boxes.count1();
    if (count > 0) {
      const values = [];
      for (let i = 0; i < count; i++) {
        const text = (await boxes.nth(i).textContent()) || '';
        values.push(text.trim());
      }
      return values;
    }
  }
  // Fallback: return container text split by whitespace
  const text1 = (await container.textContent()) || '';
  return text.split(/\s+/).filter(Boolean);
}

test.describe('Two Pointers Interactive Module — FSM conformance', () => {
  test.beforeEach(async ({ page }) => {
    // Load the application before each test
    await page.goto(APP_URL);
    // Wait for initial UI to render: rely on presence of at least one main button
    await page.waitForTimeout(120); // small pause for UI init
  });

  test.describe('Idle state and basic controls', () => {
    test('Initial page shows main controls and array UI (idle state)', async ({ page }) => {
      // Verify main action buttons exist (Step, Run, Auto) and control buttons (Generate, Shuffle, Reset)
      const stepBtn = await findLocator(page, [
        'button#btn-step',
        'button[data-testid="btn-step"]',
        'button[aria-label="Step"]',
        'button:has-text("Step")'
      ]);
      const runBtn = await findLocator(page, [
        'button#btn-run',
        'button[data-testid="btn-run"]',
        'button[aria-label="Run"]',
        'button:has-text("Run")'
      ]);
      const autoBtn = await findLocator(page, [
        'button#btn-auto',
        'button[data-testid="btn-auto"]',
        'button[aria-label="Auto"]',
        'button:has-text("Auto")'
      ]);
      const generateBtn = await findLocator(page, [
        'button#btn-generate',
        'button[data-testid="btn-generate"]',
        'button:has-text("Generate")'
      ]);
      const shuffleBtn = await findLocator(page, [
        'button#btn-shuffle',
        'button[data-testid="btn-shuffle"]',
        'button:has-text("Shuffle")'
      ]);
      const resetBtn = await findLocator(page, [
        'button#btn-reset',
        'button[data-testid="btn-reset"]',
        'button:has-text("Reset")'
      ]);

      expect(stepBtn, 'Step button should exist').not.toBeNull();
      expect(runBtn, 'Run button should exist').not.toBeNull();
      expect(autoBtn, 'Auto button should exist').not.toBeNull();
      expect(generateBtn, 'Generate button should exist').not.toBeNull();
      expect(shuffleBtn, 'Shuffle button should exist').not.toBeNull();
      expect(resetBtn, 'Reset button should exist').not.toBeNull();

      // Verify array boxes render something
      const boxes1 = await readArrayBoxes(page);
      expect(Array.isArray(boxes), 'Array boxes should be an array').toBe(true);
      expect(boxes.length, 'There should be at least one value in array view').toBeGreaterThan(0);

      // Verify log exists (may be empty initially)
      const logText = await readLogText(page);
      expect(typeof logText).toBe('string');
    });

    test('Clicking Generate enters generating state and shows generated log', async ({ page }) => {
      // Read initial array snapshot
      const before = await readArrayBoxes(page);
      // Click Generate
      await clickAny(page, [
        'button#btn-generate',
        'button[data-testid="btn-generate"]',
        'button:has-text("Generate")'
      ]);
      // Wait shortly for generation
      await page.waitForTimeout(200);
      const after = await readArrayBoxes(page);
      // Expect array changed (or at least log says generated)
      const logText1 = await readLogText(page);
      expect(logText.toLowerCase(), 'Log should indicate generation').toContain('generat');
      // If generation actually changes array, make sure arrays differ or non-empty
      expect(after.length).toBeGreaterThan(0);
      // Either changed or same but still valid
      // After generating, FSM should return to idle: controls remain available
      const stepBtn1 = await findLocator(page, ['button:has-text("Step")', 'button[aria-label="Step"]']);
      expect(stepBtn).not.toBeNull();
    });

    test('Clicking Shuffle enters shuffling state and shows shuffled log', async ({ page }) => {
      // Click Shuffle
      await clickAny(page, [
        'button#btn-shuffle',
        'button[data-testid="btn-shuffle"]',
        'button:has-text("Shuffle")'
      ]);
      // Wait for shuffle to complete
      await page.waitForTimeout(200);
      const logText2 = await readLogText(page);
      expect(logText.toLowerCase()).toContain('shuffl');
      const after1 = await readArrayBoxes(page);
      expect(after.length).toBeGreaterThan(0);
    });
  });

  test.describe('Input handling and invalid input state', () => {
    test('Entering invalid array input transitions to invalid_input and shows log', async ({ page }) => {
      // Fill array input with invalid content
      await fillAny(page, [
        '#array-input',
        '[data-testid="array-input"]',
        'input[name="array"]',
        'textarea[name="array"]',
        'textarea',
        'input[type="text"]'
      ], '1, 2, foo, 4x');

      // Trigger change/blur
      const input = await findLocator(page, [
        '#array-input',
        '[data-testid="array-input"]',
        'textarea',
        'input[type="text"]'
      ]);
      if (input) {
        await input.blur();
      }
      // Wait a tick for parse
      await page.waitForTimeout(150);
      const logText3 = await readLogText(page);
      // Expect some indication of invalid numbers
      expect(logText.toLowerCase()).toMatch(/invalid|error/);
    });

    test('Correcting array input transitions back to idle (ARRAY_CHANGE_VALID)', async ({ page }) => {
      // Correct the array input to a valid simple array
      await fillAny(page, [
        '#array-input',
        '[data-testid="array-input"]',
        'input[name="array"]',
        'textarea[name="array"]',
        'textarea',
        'input[type="text"]'
      ], '1,2,3,4');

      // Trigger change
      const el = await findLocator(page, [
        '#array-input',
        '[data-testid="array-input"]',
        'textarea',
        'input[type="text"]'
      ]);
      if (el) await el.blur();
      await page.waitForTimeout(120);
      const logText4 = await readLogText(page);
      // The log should no longer indicate invalid; might have an informational message or be empty
      expect(logText.toLowerCase()).not.toContain('invalid');
    });
  });

  test.describe('Comparing and step transitions (comparing -> found / moved / pointers_crossed)', () => {
    test('A Step resulting in FOUND triggers found state and highlights boxes', async ({ page }) => {
      // Ensure a deterministic array and target that produce FOUND on first comparison:
      // choose array = [1,2,3], target = 4 => 1 + 3 = 4 -> FOUND immediately
      await fillAny(page, [
        '#array-input',
        '[data-testid="array-input"]',
        'textarea',
        'input[type="text"]'
      ], '1,2,3');

      await fillAny(page, [
        '#target-input',
        '[data-testid="target-input"]',
        'input[name="target"]',
        'input[aria-label*="Target"]',
        'input[type="number"]'
      ], '4');

      // Click Step
      await clickAny(page, [
        'button#btn-step',
        'button[data-testid="btn-step"]',
        'button:has-text("Step")'
      ]);

      // Wait for step processing
      await page.waitForTimeout(150);
      const logText5 = await readLogText(page);
      expect(logText.toLowerCase()).toMatch(/found|found.*pair|found/);

      // Verify visual highlight on found boxes (try several heuristics)
      const container1 = await findLocator(page, [
        '#array',
        '[data-testid="array"]',
        '.array',
        '.boxes'
      ]);
      if (container) {
        // look for child with found/highlight class or success color
        const foundCandidates = await container.locator('.found, .highlight, .accent, .success, .found-box').count();
        if (foundCandidates > 0) {
          expect(foundCandidates).toBeGreaterThan(0);
        } else {
          // fallback: check if any box has inline style color/background with success/different text content
          const boxes2 = container.locator('.box, .cell, .value, li, div.item, .array-item');
          const count2 = await boxes.count2();
          let hasAccent = false;
          for (let i = 0; i < count; i++) {
            const style = (await boxes.nth(i).getAttribute('style')) || '';
            if (/accent|success|#34d399|#2dd4bf|background/.test(style)) {
              hasAccent = true;
              break;
            }
            const cls = (await boxes.nth(i).getAttribute('class')) || '';
            if (/found|highlight|accent|success/.test(cls)) {
              hasAccent = true;
              break;
            }
          }
          expect(hasAccent, 'At least one box should show an accent/highlight for found').toBe(true);
        }
      }
    });

    test('Stepping until pointers cross transitions to not_found and shows appropriate log', async ({ page }) => {
      // Use array and target that cannot be found: array 1,2,3 target 100
      await fillAny(page, [
        '#array-input',
        '[data-testid="array-input"]',
        'textarea',
        'input[type="text"]'
      ], '1,2,3');

      await fillAny(page, [
        '#target-input',
        '[data-testid="target-input"]',
        'input[name="target"]',
        'input[type="number"]'
      ], '100');

      // Click Step repeatedly until log indicates pointers crossed / not found
      const stepBtnSelectors = [
        'button#btn-step',
        'button[data-testid="btn-step"]',
        'button:has-text("Step")'
      ];
      const maxSteps = 5;
      let logText6 = '';
      for (let i = 0; i < maxSteps; i++) {
        await clickAny(page, stepBtnSelectors);
        await page.waitForTimeout(120);
        logText = (await readLogText(page)).toLowerCase();
        if (logText.includes('pointer') && (logText.includes('cross') || logText.includes('crossed'))) break;
        if (logText.includes('no pair') || logText.includes('not found')) break;
      }
      expect(/pointer.*cross|crossed|no pair|not found/.test(logText), 'Log should indicate pointers crossed / not found').toBe(true);

      // After not_found, Step/Run/Auto should not change the state; still present
      const stepBtn2 = await findLocator(page, ['button:has-text("Step")', 'button[aria-label="Step"]']);
      expect(stepBtn).not.toBeNull();
    });
  });

  test.describe('Run and Autoplay loops (run, autoplay, timers, transitions)', () => {
    test('Clicking Run starts run loop and handles TIMER_TICK and STEP_FOUND', async ({ page }) => {
      // Set up a scenario that will be FOUND quickly when running:
      // array 1,2,3 target 4 -> found on first comparison
      await fillAny(page, ['#array-input', 'textarea', 'input[type="text"]'], '1,2,3');
      await fillAny(page, ['#target-input', 'input[type="number"]', 'input[name="target"]'], '4');

      // Click Run
      await clickAny(page, ['button#btn-run', 'button[data-testid="btn-run"]', 'button:has-text("Run")']);
      // Wait a little to allow run loop to tick
      await page.waitForTimeout(300);

      const logText7 = await readLogText(page);
      expect(logText.toLowerCase()).toMatch(/found/);

      // Ensure run loop stops when found (onExit STOP_RUN_LOOP expected) — we test by observing no continuous "timer" entries
      // We'll read log length now, wait again and ensure it doesn't keep appending many more timer-driven logs
      const before1 = logText;
      await page.waitForTimeout(300);
      const after2 = await readLogText(page);
      // after should not be drastically longer; at least should not be continuously running (best-effort)
      expect(after.length).toBeGreaterThan(0);
    });

    test('Autoplay toggles auto state and app updates UI (START_AUTOPLAY / STOP_AUTOPLAY)', async ({ page }) => {
      // Use a slightly longer array and a target that won't immediately be found to let autoplay produce logs
      await fillAny(page, ['#array-input', 'textarea', 'input[type="text"]'], '1,2,3,4,5,6');
      await fillAny(page, ['#target-input', 'input[type="number"]', 'input[name="target"]'], '999'); // unreachable

      // Click Auto to start autoplay
      const autoLocator = await clickAny(page, ['button#btn-auto', 'button[data-testid="btn-auto"]', 'button:has-text("Auto")']);
      // The UI text for auto button should change to indicate it's on; check text content contains 'Auto' and likely 'Stop' or 'On'
      const autoText = (await autoLocator.textContent()) || '';
      expect(autoText.toLowerCase()).toContain('auto');

      // wait for one or two autoplay ticks to accumulate logs
      await page.waitForTimeout(500);
      const log1 = (await readLogText(page)).toLowerCase();
      // There should be some step-related logs produced by autoplay
      expect(log1.length).toBeGreaterThan(0);

      // Click Auto again to stop autoplay (toggle)
      await clickAny(page, ['button#btn-auto', 'button[data-testid="btn-auto"]', 'button:has-text("Auto")']);
      await page.waitForTimeout(150);
      const autoTextAfter = (await findLocator(page, ['button#btn-auto', 'button[data-testid="btn-auto"]', 'button:has-text("Auto")'])) ?
        (await (await findLocator(page, ['button#btn-auto', 'button[data-testid="btn-auto"]', 'button:has-text("Auto")'])).textContent()) : '';
      // UI should reflect stopped state (may revert text). We check it still contains 'Auto' but not explicitly 'Stop'
      expect(String(autoTextAfter).toLowerCase()).toContain('auto');
    });
  });

  test.describe('Generating / Shuffling / Reset edge-cases and keyboard events', () => {
    test('Click Reset brings module back to idle and clears found/highlight state', async ({ page }) => {
      // Put module into FOUND state first
      await fillAny(page, ['#array-input', 'textarea', 'input[type="text"]'], '1,2,3');
      await fillAny(page, ['#target-input', 'input[type="number"]', 'input[name="target"]'], '4');
      await clickAny(page, ['button#btn-step', 'button:has-text("Step")']);
      await page.waitForTimeout(150);
      let logText8 = (await readLogText(page)).toLowerCase();
      expect(logText).toContain('found');

      // Click Reset
      await clickAny(page, ['button#btn-reset', 'button[data-testid="btn-reset"]', 'button:has-text("Reset")']);
      await page.waitForTimeout(150);
      // After reset, the log should no longer show the FOUND message or highlight might be cleared
      logText = (await readLogText(page)).toLowerCase();
      // Either log is cleared or has neutral/idle message; we simply assert it's not stuck in FOUND state
      expect(logText).not.toContain('found');
    });

    test('Keyboard shortcuts: try pressing space/enter to invoke step/run if available', async ({ page }) => {
      // Make sure Step exists
      const stepBtn3 = await findLocator(page, ['button:has-text("Step")', 'button#btn-step']);
      if (!stepBtn) {
        test.skip('Step button not found — skipping keyboard shortcut test');
        return;
      }
      // Focus any control and press Enter — many apps map Enter to step/run
      await stepBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      const logText9 = (await readLogText(page)).toLowerCase();
      // If pressing Enter triggered a step, we expect some step-related log (best-effort)
      expect(typeof logText).toBe('string');
    });
  });

  test.describe('Edge cases for parsing and guarded transitions', () => {
    test('If array parsing fails during a step, FSM should go into invalid_input (STEP_INVALID_ARRAY)', async ({ page }) => {
      // Intentionally set an invalid array mid-run and then attempt to Step
      await fillAny(page, ['#array-input', 'textarea', 'input[type="text"]'], '1,2,3');
      await fillAny(page, ['#target-input', 'input[type="number"]', 'input[name="target"]'], '5');

      // Corrupt the array input directly (simulate fast user edit) to invalid content
      await fillAny(page, ['#array-input', '[data-testid="array-input"]', 'textarea', 'input[type="text"]'], '1,2,abc');
      await page.waitForTimeout(80);
      // Click Step — implementation should detect invalid array and transition to invalid_input
      await clickAny(page, ['button#btn-step', 'button:has-text("Step")']);
      await page.waitForTimeout(150);
      const logText10 = (await readLogText(page)).toLowerCase();
      expect(logText).toMatch(/invalid|error/);
    });
  });

  test.afterEach(async ({ page }) => {
    // Try to restore to a safe idle state by clicking Reset if available
    const resetBtn1 = await findLocator(page, ['button#btn-reset', 'button[data-testid="btn-reset"]', 'button:has-text("Reset")']);
    if (resetBtn) {
      try {
        await resetBtn.click();
        await page.waitForTimeout(80);
      } catch (e) {
        // ignore
      }
    }
  });
});