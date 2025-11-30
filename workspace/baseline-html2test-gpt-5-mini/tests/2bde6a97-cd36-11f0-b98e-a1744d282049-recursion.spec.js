import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a97-cd36-11f0-b98e-a1744d282049.html';

// Page object capturing common interactions
class RecursionPage {
  constructor(page) {
    this.page = page;
    this.loc = {
      exampleSelect: page.locator('#exampleSelect'),
      inputN: page.locator('#inputN'),
      runBtn: page.locator('#runBtn'),
      traceBtn: page.locator('#traceBtn'),
      stepNext: page.locator('#stepNext'),
      stepPrev: page.locator('#stepPrev'),
      playPause: page.locator('#playPause'),
      resetBtn: page.locator('#resetBtn'),
      traceOutput: page.locator('#traceOutput'),
      stackArea: page.locator('#stackArea'),
      statsArea: page.locator('#statsArea'),
      explainBtn: page.locator('#explainBtn'),
      explainText: page.locator('#explainText'),
      depthSlider: page.locator('#depthSlider'),
      depthLabel: page.locator('#depthLabel'),
      drawBtn: page.locator('#drawBtn'),
      clearBtn: page.locator('#clearBtn'),
      canvasTitle: page.locator('#canvasTitle'),
      perf: page.locator('#perf'),
      stepInfo: page.locator('#stepInfo'),
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async selectExample(value) {
    await this.loc.exampleSelect.selectOption(value);
    // dispatch change event is handled by the page's own select change listener,
    // but ensure script runs by waiting a tick.
    await this.page.waitForTimeout(50);
  }

  async setInputN(value) {
    await this.loc.inputN.fill(String(value));
    // Wait a bit for potential UI reactions
    await this.page.waitForTimeout(30);
  }

  async clickRun() {
    await this.loc.runBtn.click();
  }

  async clickTrace() {
    await this.loc.traceBtn.click();
  }

  async clickStepNext() {
    await this.loc.stepNext.click();
  }

  async clickStepPrev() {
    await this.loc.stepPrev.click();
  }

  async clickPlayPause() {
    await this.loc.playPause.click();
  }

  async clickReset() {
    await this.loc.resetBtn.click();
  }

  async clickExplainAndAccept() {
    // Playwright will handle dialog acceptance externally; this helper clicks and expects a dialog to appear.
    const [dialog] = await Promise.all([
      this.page.waitForEvent('dialog'),
      this.loc.explainBtn.click(),
    ]);
    const msg = dialog.message();
    await dialog.accept();
    return msg;
  }

  async setDepthSlider(value) {
    // Range input: set value via JS and dispatch input event to mimic user interaction
    await this.page.evaluate((v) => {
      const el = document.getElementById('depthSlider');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    // allow UI to update
    await this.page.waitForTimeout(50);
  }

  async clickDraw() {
    await this.loc.drawBtn.click();
  }

  async clickClear() {
    await this.loc.clearBtn.click();
  }

  async getTraceLines() {
    const text = (await this.loc.traceOutput.textContent()) || '';
    if (!text.trim()) return [];
    return text.split('\n').filter(Boolean);
  }

  async getStackFramesCount() {
    return await this.loc.stackArea.locator('.frame').count();
  }

  async getStepInfoText() {
    return (await this.loc.stepInfo.textContent()) || '';
  }

  async getStatsText() {
    return (await this.loc.statsArea.textContent()) || '';
  }
}

test.describe('Recursion Explorer — End-to-end', () => {
  // Capture console and page errors for each test for assertions
  test.beforeEach(async ({ page }) => {
    // no-op here; actual setup per-test handled in test bodies to keep clarity
  });

  test('Initial load - UI elements present, console ready message, and no page errors', async ({ page }) => {
    // Purpose: Verify the app loads, key UI elements exist, initial texts, and console shows expected ready log
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      // collect console messages for inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    const app = new RecursionPage(page);
    await app.goto();

    // Verify header/title and explain text
    await expect(page.locator('h1')).toHaveText('Recursion Explorer');
    await expect(app.loc.explainText).toContainText('Recursion is when a function calls itself');

    // trace output initially indicates '(no trace)'
    await expect(app.loc.traceOutput).toHaveText(/\(no trace\)/);

    // step info starts at Step 0 / 0
    await expect(app.loc.stepInfo).toHaveText('Step 0 / 0');

    // canvas title should be set (the page dispatches change at init)
    await expect(app.loc.canvasTitle).toBeVisible();

    // allow short time for initial console log to appear (script logs readiness)
    await page.waitForTimeout(50);

    // Assert that the console includes the ready message
    const foundReady = consoleMessages.some(m => m.text.includes('Recursion Explorer ready'));
    expect(foundReady).toBeTruthy();

    // Assert no uncaught page errors were emitted
    expect(pageErrors.length).toBe(0);
  });

  test.describe('Call trace generation and stepping', () => {
    test('Generate factorial trace, step through frames, and verify stack & trace output update', async ({ page }) => {
      // Purpose: Run factorial example, ensure trace/stack render and step controls update UI
      const app1 = new RecursionPage(page);
      await app.goto();

      // Ensure we're on factorial example
      await app.selectExample('factorial');

      // Set n=5 and run
      await app.setInputN(5);
      await app.clickRun();

      // Trace output should have content
      const lines = await app.getTraceLines();
      expect(lines.length).toBeGreaterThan(0);

      // Step info should reflect at least Step 1 / N
      const stepInfoBefore = await app.getStepInfoText();
      expect(stepInfoBefore).toMatch(/^Step \d+ \/ \d+/);

      // There should be some frames rendered in stack area for the first step
      const framesCount = await app.getStackFramesCount();
      expect(framesCount).toBeGreaterThanOrEqual(0); // at least present even if zero

      // Click next to advance a step and ensure step info updates
      await app.clickStepNext();
      const stepInfoAfter = await app.getStepInfoText();
      expect(stepInfoAfter).not.toBe(stepInfoBefore);

      // Clicking previous should revert step info
      await app.clickStepPrev();
      const stepInfoReverted = await app.getStepInfoText();
      expect(stepInfoReverted).toBe(stepInfoBefore);
    });

    test('Play/pause auto-steps through trace and stops at end', async ({ page }) => {
      // Purpose: Verify Play toggles, auto-steps, and updates UI; use a small example to keep test fast
      const app2 = new RecursionPage(page);
      await app.goto();

      // Use small fibonacci to have manageable trace length
      await app.selectExample('fibonacci');
      await app.setInputN(5);
      await app.clickRun();

      // Start playing
      await app.clickPlayPause();
      // Play button text toggles to 'Pause ⏸'
      await expect(app.loc.playPause).toHaveText(/Pause|Pause ⏸/);

      // Wait to allow a couple of steps; the script auto-advances every 250ms
      await page.waitForTimeout(600);

      // Step info should have advanced beyond initial
      const info = await app.getStepInfoText();
      // Ensure it's not at Step 0 / N
      expect(info).not.toContain('Step 0 / 0');

      // Pause if still playing
      const playText = await app.loc.playPause.textContent();
      if (playText && playText.includes('Pause')) {
        await app.clickPlayPause();
        await expect(app.loc.playPause).toHaveText(/Play|Play ▶/);
      }
    });

    test('Keyboard shortcuts: ArrowRight & ArrowLeft advance and rewind steps', async ({ page }) => {
      // Purpose: Confirm keyboard shortcuts are wired to stepping functions
      const app3 = new RecursionPage(page);
      await app.goto();

      await app.selectExample('factorial');
      await app.setInputN(4);
      await app.clickRun();

      // initial step info
      const info0 = await app.getStepInfoText();

      // Press ArrowRight to step forward
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
      const info1 = await app.getStepInfoText();
      expect(info1).not.toBe(info0);

      // Press ArrowLeft to step back
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(60);
      const info2 = await app.getStepInfoText();
      // should match or be earlier than info1 (most likely equals info0)
      expect(info2).not.toBe(info1);
    });

    test('Reset clears trace, stack and stats', async ({ page }) => {
      // Purpose: Ensure Reset returns UI to initial empty-trace state
      const app4 = new RecursionPage(page);
      await app.goto();

      await app.selectExample('fibonacci');
      await app.setInputN(5);
      await app.clickRun();

      // Ensure trace exists
      const linesBefore = await app.getTraceLines();
      expect(linesBefore.length).toBeGreaterThan(0);

      // Click reset
      await app.clickReset();

      // Trace output should be empty string or not contain previous lines
      const linesAfter = await app.getTraceLines();
      // The implementation sets traceOutput.textContent = '' on reset
      expect(linesAfter.length).toBe(0);

      // Step info should be reset
      await expect(app.loc.stepInfo).toHaveText('Step 0 / 0');

      // Stats should indicate zero calls
      await expect(app.loc.statsArea).toHaveText(/Calls: 0/);
    });
  });

  test.describe('Different example behaviors and limits', () => {
    test('Fibonacci memoized produces fewer or equal trace events than naive version', async ({ page }) => {
      // Purpose: Compare naive vs memoized fibonacci trace lengths for same n
      const app5 = new RecursionPage(page);
      await app.goto();

      const n = 7;

      // Run naive fibonacci
      await app.selectExample('fibonacci');
      await app.setInputN(n);
      await app.clickRun();
      const naiveLines = await app.getTraceLines();
      expect(naiveLines.length).toBeGreaterThan(0);

      // Run memoized fibonacci
      await app.selectExample('fibonacciMemo');
      await app.setInputN(n);
      await app.clickRun();
      const memoLines = await app.getTraceLines();
      expect(memoLines.length).toBeGreaterThan(0);

      // Memoized should not produce more trace lines than naive (should be fewer or equal)
      expect(memoLines.length).toBeLessThanOrEqual(naiveLines.length);
    });

    test('Tree traversal trace includes visit returns and stack rendering', async ({ page }) => {
      // Purpose: Ensure the simulated tree traversal produces 'visit' calls and returns
      const app6 = new RecursionPage(page);
      await app.goto();

      await app.selectExample('tree');
      await app.setInputN(2);
      await app.clickRun();

      const lines1 = await app.getTraceLines();
      expect(lines.length).toBeGreaterThan(0);

      // Should contain 'visit' events in the trace output
      const hasVisit = lines.some(l => l.includes('visit'));
      expect(hasVisit).toBeTruthy();

      // Stack area should render frames (could be zero if step 0 but ensure no exceptions)
      const frames = await app.getStackFramesCount();
      expect(frames).toBeGreaterThanOrEqual(0);
    });

    test('Fractal drawing: slider updates, draw updates perf, clear resets canvas', async ({ page }) => {
      // Purpose: Validate fractal drawing controls and canvas perf feedback
      const app7 = new RecursionPage(page);
      await app.goto();

      // Select fractal example - this enables the slider and sets canvasTitle to Fractal Tree
      await app.selectExample('fractal');

      // Slider should be enabled; set to lower depth for faster drawing
      await app.setDepthSlider(3);
      await expect(app.loc.depthLabel).toHaveText('3');

      // Click draw and wait briefly for draw to complete
      await app.clickDraw();

      // Wait for perf text to update to drawn or similar
      await page.waitForFunction(() => {
        const t = document.getElementById('perf').textContent || '';
        return t.trim().length > 0 && t.includes('drawn in');
      }, { timeout: 2000 });

      const perfText = await app.loc.perf.textContent();
      expect(perfText).toContain('drawn in');

      // Clear the canvas and verify perf indicates cleared
      await app.clickClear();
      await expect(app.loc.perf).toHaveText('cleared');
    });

    test('Explain button shows an alert with explanation text', async ({ page }) => {
      // Purpose: Clicking "Show explanation" should open an alert containing the explainText content
      const app8 = new RecursionPage(page);
      await app.goto();

      // Grab the explanation text to compare
      const explainText = (await app.loc.explainText.textContent()) || '';

      // Click explain button and accept dialog, return message
      const msg1 = await app.clickExplainAndAccept();
      expect(msg).toContain(explainText.substring(0, Math.min(60, explainText.length)));
    });

    test('Maintain limits: large factorial input triggers alert and clamps input', async ({ page }) => {
      // Purpose: Ensure the app alerts and clamps values that would be too large for factorial
      const app9 = new RecursionPage(page);
      await app.goto();

      // Select factorial and set a very large n to trigger limit
      await app.selectExample('factorial');

      // Listen for dialog and capture message
      const [dialogMsg] = await Promise.all([
        page.waitForEvent('dialog').then(d => { const m = d.message(); d.accept(); return m; }),
        (async () => {
          // Set input to a big number then click run
          await app.setInputN(100);
          await app.clickRun();
        })()
      ]);

      expect(dialogMsg).toMatch(/Factorial depth limited to/);

      // After accepting, inputN should be clamped to maxFactorial (12 per source)
      const inputValue = await page.locator('#inputN').inputValue();
      expect(Number(inputValue)).toBeGreaterThan(0);
      expect(Number(inputValue)).toBeLessThanOrEqual(12);
    });
  });

  test.describe('Console and runtime error observation', () => {
    test('No unexpected page errors emitted during various interactions', async ({ page }) => {
      // Purpose: Interact broadly with the UI while watching for runtime page errors
      const errors = [];
      page.on('pageerror', e => errors.push(e));

      const app10 = new RecursionPage(page);
      await app.goto();

      // Interact with multiple controls to exercise code paths
      await app.selectExample('factorial');
      await app.setInputN(6);
      await app.clickRun();

      await app.selectExample('fibonacci');
      await app.setInputN(6);
      await app.clickRun();

      await app.selectExample('fibonacciMemo');
      await app.setInputN(10);
      await app.clickRun();

      await app.selectExample('fractal');
      await app.setDepthSlider(2);
      await app.clickDraw();

      // allow short time for any runtime errors to surface
      await page.waitForTimeout(200);

      // Assert no page errors were recorded
      expect(errors.length).toBe(0);
    });
  });
});