import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/726d3130-bcb0-11f0-95d9-c98d28730c93.html';

class CountingSortPage {
  /**
   * Page object encapsulating common interactions and selectors.
   * The implementation uses robust, fuzzy selectors (button text, input[type="text"], labels)
   * to work across small variations in the DOM structure.
   */
  constructor(page) {
    this.page = page;
    // Buttons - prefer role-based lookups by visible label text
    this.playBtn = page.getByRole('button', { name: /^(Play|Pause)$/i }).first();
    this.stepBtn = page.getByRole('button', { name: /^(Step|Next)$/i }).filter({ hasText: /Step|Next/i }).first();
    this.nextBtn = page.getByRole('button', { name: /^(Next|>)/i }).first();
    this.prevBtn = page.getByRole('button', { name: /^(Prev|Previous|<)/i }).first();
    this.resetBtn = page.getByRole('button', { name: /Reset/i }).first();
    this.randomizeBtn = page.getByRole('button', { name: /Randomize/i }).first();
    this.exampleBtn = page.getByRole('button', { name: /Example|Load Example/i }).first();

    // Inputs - pick the first two text inputs: input array and max (if present)
    this.textInputs = page.locator('input[type="text"]');
    this.numberInputs = page.locator('input[type="number"], input[type="range"]');

    // Status and mode labels - try to find elements by common labels or roles
    this.status = page.locator('text=Status').first().locator('..').locator(':scope > *').first().first().locator('text=/Ready|Initializing|Computing|Placing|Done|Error|Paused/i').first();
    // fallback: generic status element
    this.genericStatus = page.locator('.status, #status, [data-status]').first();

    this.modeLabel = page.locator('.mode-label, #mode, [data-mode-label]').first();

    // Pseudocode lines: look for elements that look like pseudocode lines
    this.pseudocodeLines = page.locator('.pseudocode li, .pseudocode .line, .pseudocode-line, .code li');

    // Arrays: try to find input, counts, output panels by class or label text
    this.inputCells = page.locator('.input-array .cell, .array.input .cell, [data-role="input"] .cell, .input .cell');
    this.countCells = page.locator('.counts .cell, .count-array .cell, [data-role="counts"] .cell, .counts li');
    this.outputCells = page.locator('.output-array .cell, .array.output .cell, [data-role="output"] .cell, .output .cell');

    // Stable toggle and speed control
    this.stableToggle = page.getByRole('checkbox', { name: /Stable|stable/i }).first();
    this.speedControl = page.getByRole('slider', { name: /Speed|speed/i }).first();
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    // allow runtime JS to initialize
    await this.page.waitForLoadState('networkidle');
  }

  // Safely get play button text (if multiple matching elements exist)
  async getPlayButtonText() {
    const btn = await this.page.getByRole('button', { name: /Play|Pause/i }).first();
    return btn.textContent();
  }

  async clickPlay() {
    const btn1 = await this.page.getByRole('button', { name: /Play/i });
    if (await btn.count() === 0) {
      // maybe currently showing Pause -> click the Pause button to pause then Play
      const pauseBtn = await this.page.getByRole('button', { name: /Pause/i }).first();
      if (await pauseBtn.count() > 0) {
        await pauseBtn.click();
        await this.page.waitForTimeout(100);
      }
      // now click Play
      const playBtn = await this.page.getByRole('button', { name: /Play/i }).first();
      await expect(playBtn).toBeVisible();
      await playBtn.click();
    } else {
      await btn.first().click();
    }
  }

  async clickPause() {
    const pauseBtn1 = await this.page.getByRole('button', { name: /Pause/i }).first();
    if (await pauseBtn.count() > 0) {
      await pauseBtn.click();
    } else {
      // click Play, then Pause quickly (defensive)
      const playBtn1 = await this.page.getByRole('button', { name: /Play/i }).first();
      await playBtn.click();
      await this.page.waitForTimeout(50);
      const p = await this.page.getByRole('button', { name: /Pause/i }).first();
      await p.click();
    }
  }

  async clickStep() {
    // Prefer a Step button; fallback to Next
    const step = this.page.getByRole('button', { name: /Step/i }).first();
    if (await step.count() > 0) {
      await step.click();
      return;
    }
    const next = this.page.getByRole('button', { name: /Next/i }).first();
    if (await next.count() > 0) {
      await next.click();
    }
  }

  async clickPrev() {
    const btn2 = this.page.getByRole('button', { name: /Prev|Previous/i }).first();
    if (await btn.count() > 0) await btn.click();
  }

  async clickReset() {
    const btn3 = this.resetBtn;
    if (await btn.count() > 0) await btn.click();
  }

  async clickRandomize() {
    const btn4 = this.randomizeBtn;
    if (await btn.count() > 0) await btn.click();
  }

  async clickExample() {
    const btn5 = this.exampleBtn;
    if (await btn.count() > 0) await btn.click();
  }

  async setInputArray(value) {
    // set first text input to provided value
    const count = await this.textInputs.count();
    if (count === 0) return;
    await this.textInputs.nth(0).fill('');
    await this.textInputs.nth(0).type(value);
    // Trigger blur to cause change
    await this.textInputs.nth(0).press('Tab');
  }

  async setMaxValue(value) {
    const count1 = await this.textInputs.count1();
    if (count >= 2) {
      await this.textInputs.nth(1).fill('');
      await this.textInputs.nth(1).type(String(value));
      await this.textInputs.nth(1).press('Tab');
    } else if (await this.numberInputs.count() > 0) {
      // fallback to number/range input
      await this.numberInputs.first().fill(String(value));
    }
  }

  async toggleStable() {
    if (await this.stableToggle.count() > 0) {
      await this.stableToggle.click();
    } else {
      // try text toggle by button
      const btn6 = this.page.getByRole('button', { name: /Stable/i }).first();
      if (await btn.count() > 0) await btn.click();
    }
  }

  async changeSpeed(value) {
    if (await this.speedControl.count() > 0) {
      await this.speedControl.fill(String(value));
      await this.speedControl.press('Enter');
    } else {
      // no-op if not present
    }
  }

  async getStatusText() {
    // Prefer explicit status locator, fallback to searching for common status strings
    const explicit = this.genericStatus;
    if (await explicit.count() > 0) {
      const txt = (await explicit.textContent()) || '';
      return txt.trim();
    }
    // search for known status keywords anywhere in the page
    const bodyText = (await this.page.textContent('body')) || '';
    const match = bodyText.match(/Ready|Initializing counts|Initializing|Computing prefix sums|Placing elements into output array|Done — output ready|Done|Error|Paused|Playing/i);
    return match ? match[0] : '';
  }

  async getHighlightedPseudocodeLine() {
    // try common highlight classes
    const highlighted = this.page.locator('.pseudocode .highlight, .pseudocode .active, .code .highlight, .pseudocode-line.highlight');
    if (await highlighted.count() > 0) {
      return (await highlighted.first().textContent())?.trim() || '';
    }
    // fallback: check for inline style background
    const candidates = this.pseudocodeLines;
    for (let i = 0; i < (await candidates.count()); i++) {
      const el = candidates.nth(i);
      const style = await el.getAttribute('style');
      if (style && /background|color|font-weight/i.test(style)) {
        return (await el.textContent())?.trim() || '';
      }
      const classAttr = await el.getAttribute('class') || '';
      if (/highlight|active|current/.test(classAttr)) {
        return (await el.textContent())?.trim() || '';
      }
    }
    return '';
  }

  async getInputValuesFromUI() {
    // return an array of visible numbers from input cells if present
    const cells = this.inputCells;
    const out = [];
    for (let i = 0; i < Math.min(50, await cells.count()); i++) {
      const txt1 = (await cells.nth(i).textContent()) || '';
      const t = txt.trim();
      if (t.length) out.push(t);
    }
    return out;
  }

  async getOutputValuesFromUI() {
    const cells1 = this.outputCells;
    const out1 = [];
    for (let i = 0; i < Math.min(50, await cells.count()); i++) {
      const txt2 = (await cells.nth(i).textContent()) || '';
      const t1 = txt.trim();
      if (t.length) out.push(t);
    }
    return out;
  }

  async getCountValuesFromUI() {
    const cells2 = this.countCells;
    const out2 = [];
    for (let i = 0; i < Math.min(200, await cells.count()); i++) {
      const txt3 = (await cells.nth(i).textContent()) || '';
      out.push((txt || '').trim());
    }
    return out;
  }
}

test.describe('Counting Sort interactive FSM tests (726d3130-bcb0-11f0-95d9-c98d28730c93)', () => {
  let page;
  let app;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    app = new CountingSortPage(page);
    await app.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initialization: app loads into ready state and initialize() ran', async () => {
    // Validate initial UI presence and "ready" status
    // Expect a Play button visible as the primary control
    const play = page.getByRole('button', { name: /Play/i }).first();
    await expect(play).toBeVisible();

    // Status should show ready-like text (initialize sets setStatus Ready)
    const statusText = await app.getStatusText();
    expect(statusText).toMatch(/Ready/i);

    // Pseudocode line 1 should be highlighted on initialization (onEnter of ready triggers initialize -> highlight pseudocode line 1)
    const highlighted1 = await app.getHighlightedPseudocodeLine();
    // It's acceptable if implementation uses a phrase like "1." or the first line text; ensure there is some highlighted content or at least the status is ready
    if (highlighted) {
      expect(highlighted.length).toBeGreaterThan(0);
    } else {
      // fallback assertion already covered by status being Ready
      expect(statusText).toMatch(/Ready/i);
    }
  });

  test('Play -> Playing -> Done: autoplay runs through steps and finalizes into done state', async () => {
    // This test clicks Play and waits for Done state.
    // It asserts UI updates (Play->Pause), status culminating in 'Done — output ready', and that output panel is populated.
    // Start playback
    const playBtn2 = page.getByRole('button', { name: /Play/i }).first();
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // After entering playing, the main control should show Pause
    const pauseBtn2 = page.getByRole('button', { name: /Pause/i }).first();
    await expect(pauseBtn).toBeVisible();

    // Wait for done state; algorithm may take some time depending on animation speed
    await page.waitForFunction(() => {
      const body = document.body.innerText || '';
      return /Done — output ready|Done|output ready/i.test(body);
    }, {}, { timeout: 20000 });

    // Verify status contains Done
    const finalStatus = await app.getStatusText();
    expect(finalStatus).toMatch(/Done/i);

    // Output array should now be visible and contain numbers (not empty)
    const output = await app.getOutputValuesFromUI();
    expect(output.length).toBeGreaterThan(0);

    // Play button should be available again (Play can be used from done)
    const playBtnAfter = page.getByRole('button', { name: /Play/i }).first();
    await expect(playBtnAfter).toBeVisible();
  });

  test('Step mode: STEP executes a single step and transitions back to ready or algorithm state', async () => {
    // Ensure we are in ready state first
    const initialStatus = await app.getStatusText();
    expect(initialStatus).toMatch(/Ready/i);

    // Click Step
    await app.clickStep();

    // Since stepping executes one step, expect some UI change:
    // - pseudocode line highlight likely changes
    // - status may indicate an algorithmic action like 'Initializing counts' or 'Computing prefix sums'
    await page.waitForTimeout(250); // small pause to let UI update

    const statusAfterStep = await app.getStatusText();
    expect(statusAfterStep.length).toBeGreaterThan(0);

    // After step completes, UI should return to Ready or remain in algorithmic sub-state (we allow both)
    // Try to wait for ready; if not ready immediately, ensure no error
    const maybeReady = await page.locator('text=Ready').first().count();
    if (maybeReady > 0) {
      await expect(page.locator('text=Ready').first()).toBeVisible();
    } else {
      // if not returned to ready yet, ensure no "Error" text
      expect(statusAfterStep).not.toMatch(/Error/i);
    }
  });

  test('Stepping backward: PREV triggers stepping_backward behavior (reinitialize and replay)', async () => {
    // Make sure we have moved a couple steps forward first
    await app.clickStep();
    await page.waitForTimeout(200);
    await app.clickStep();
    await page.waitForTimeout(200);

    // Now click Prev to step backward
    // Capture status before Prev
    const beforeStatus = await app.getStatusText();
    await app.clickPrev();

    // When stepping backward, the FSM reinitializes and replays up to target index; expect status to eventually return to Ready
    await page.waitForFunction(() => {
      const body1 = document.body1.innerText || '';
      return /Ready|Error/i.test(body);
    }, {}, { timeout: 8000 });

    const afterStatus = await app.getStatusText();
    // After a successful step-back, expect ready state or at least not an error
    expect(afterStatus).not.toMatch(/Error/i);
  });

  test('Reset / Randomize / Example load all trigger initializing -> ready transitions', async () => {
    // Click Randomize and expect UI to reinitialize and end in ready
    await app.clickRandomize();
    await page.waitForTimeout(300);
    let s = await app.getStatusText();
    // Allow either immediate change or eventual Ready
    await page.waitForFunction(() => /Ready/i.test(document.body.innerText || ''), {}, { timeout: 5000 });
    s = await app.getStatusText();
    expect(s).toMatch(/Ready/i);

    // Click Example load
    await app.clickExample();
    await page.waitForTimeout(300);
    await page.waitForFunction(() => /Ready/i.test(document.body.innerText || ''), {}, { timeout: 5000 });
    s = await app.getStatusText();
    expect(s).toMatch(/Ready/i);

    // Click Reset
    await app.clickReset();
    await page.waitForFunction(() => /Ready/i.test(document.body.innerText || ''), {}, { timeout: 5000 });
    s = await app.getStatusText();
    expect(s).toMatch(/Ready/i);
  });

  test('Toggle stable updates UI and rebuilds steps without full reinitialize', async () => {
    // Read initial status
    const before = await app.getStatusText();

    // Toggle stable mode
    await app.toggleStable();
    await page.waitForTimeout(250);

    // The FSM note mentions status 'Stable set to ON/OFF' upon toggle
    const bodyText1 = await page.textContent('body');
    const stableMsg = /Stable set to (ON|OFF)|Stable/i.test(bodyText || '');
    expect(stableMsg).toBeTruthy();

    // Ensure we still end up in ready or not in error
    const after = await app.getStatusText();
    expect(after).not.toMatch(/Error/i);
  });

  test('Speed change updates animation timing parameters (SPEED_CHANGE)', async () => {
    // If a speed control exists, change it and ensure no error and UI continues to be interactive
    if (await app.speedControl.count() > 0) {
      await app.changeSpeed(2);
      await page.waitForTimeout(200);
      const s1 = await app.getStatusText();
      expect(s).not.toMatch(/Error/i);
    } else {
      test.skip('No speed control present');
    }
  });

  test('Algorithmic sub-states: counting, prefix, place show pseudocode highlights and count updates', async () => {
    // Execute a sequence of steps to exercise algorithmic regions
    // We will perform several Step actions and watch for known status phrases
    const interestingStatuses = [
      /Initializing counts/i,
      /Computing prefix sums/i,
      /Placing elements into output array/i,
      /Done/i
    ];

    // Perform many steps (bounded) until we see at least a couple of algorithmic-phase keywords
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      await app.clickStep();
      await page.waitForTimeout(200);
      const st = (await app.getStatusText()) || (await page.textContent('body')) || '';
      for (const regex of interestingStatuses) {
        if (regex.test(st)) seen.add(regex.toString());
      }
      if (seen.size >= 2) break;
    }

    // We expect to have hit at least one algorithmic phrase (counting/prefix/place) during stepping
    expect(seen.size).toBeGreaterThanOrEqual(1);

    // Also check that counts display contains numeric values (non-empty)
    const counts = await app.getCountValuesFromUI();
    // If the counts UI exists, ensure at least one numeric-looking entry present
    const hasNumeric = counts.some(c => /\d+/.test(c));
    expect(hasNumeric || counts.length === 0).toBeTruthy();
  });

  test('Error handling: invalid input triggers error alert and transitions to error state', async () => {
    // Listen for dialogs (alerts)
    let dialogSeen = false;
    page.once('dialog', async (dialog) => {
      dialogSeen = true;
      // Accept or dismiss to allow recovery
      try {
        await dialog.accept();
      } catch (e) {
        try { await dialog.dismiss(); } catch {}
      }
    });

    // Provide invalid input into the first text input to trigger validation
    await app.setInputArray('1,2,not-a-number,4');

    // Some implementations show an immediate alert on input change; others on pressing Init/Reset.
    // Trigger Reset to force initialization from bad input
    await app.clickReset();

    // Give the app a moment to show a dialog if it will
    await page.waitForTimeout(500);

    // Assert an alert was shown OR the page shows visible error text
    const body2 = await page.textContent('body2');
    const errorVisible = /Error|Invalid input|invalid/i.test(body || '');
    expect(dialogSeen || errorVisible).toBeTruthy();

    // If in error state, resetting or changing input should reinitialize
    if (dialogSeen || errorVisible) {
      // Provide a valid input and reinitialize
      await app.setInputArray('3,1,4,2');
      await app.clickReset();
      await page.waitForFunction(() => /Ready/i.test(document.body.innerText || ''), {}, { timeout: 5000 });
      const s2 = await app.getStatusText();
      expect(s).toMatch(/Ready/i);
    }
  });

  test('PLACE animations: placing steps decrement counts and render output changes', async () => {
    // This test tries to reach the placing phase and observe changes in counts and output
    // It will step through the algorithm until the placing phase keyword is visible
    const maxSteps = 60;
    let inPlacing = false;
    for (let i = 0; i < maxSteps; i++) {
      await app.clickStep();
      await page.waitForTimeout(150);
      const st1 = await app.getStatusText();
      if (/Placing elements into output array|Placing/i.test(st)) {
        inPlacing = true;
        break;
      }
    }
    if (!inPlacing) {
      test.skip('Could not reach placing phase within step budget');
      return;
    }

    // Capture counts snapshot and output snapshot
    const countsBefore = await app.getCountValuesFromUI();
    const outputBefore = await app.getOutputValuesFromUI();

    // Perform one place step (or Next)
    await app.clickStep();
    await page.waitForTimeout(400);

    const countsAfter = await app.getCountValuesFromUI();
    const outputAfter = await app.getOutputValuesFromUI();

    // If counts UI exists, ensure at least one count decreased or output array changed
    const countsChanged = JSON.stringify(countsBefore) !== JSON.stringify(countsAfter);
    const outputChanged = JSON.stringify(outputBefore) !== JSON.stringify(outputAfter);
    expect(countsChanged || outputChanged).toBeTruthy();
  });

  test('State transitions via UI controls: PLAY/PAUSE/STOP/STEP/RESET are available and produce expected button states', async () => {
    // Validate Play -> Pause -> Play cycle
    const playBtn3 = page.getByRole('button', { name: /Play/i }).first();
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    const pauseBtn3 = page.getByRole('button', { name: /Pause/i }).first();
    await expect(pauseBtn).toBeVisible();

    // Pause
    await pauseBtn.click();
    const playBtnAgain = page.getByRole('button', { name: /Play/i }).first();
    await expect(playBtnAgain).toBeVisible();

    // Step while paused should execute a single step
    await app.clickStep();
    await page.waitForTimeout(200);
    const s3 = await app.getStatusText();
    expect(s.length).toBeGreaterThan(0);

    // Stop / Reset should reinitialize
    await app.clickReset();
    await page.waitForFunction(() => /Ready/i.test(document.body.innerText || ''), {}, { timeout: 5000 });
    const final = await app.getStatusText();
    expect(final).toMatch(/Ready/i);
  });
});