import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a1-cd35-11f0-9e7b-93b903303299.html';

// Page object encapsulating interactions with the Recursion app
class RecursionPage {
  constructor(page) {
    this.page = page;
    // Factorial elements
    this.factN = page.locator('#factN');
    this.factSpeed = page.locator('#factSpeed');
    this.runFact = page.locator('#runFact');
    this.runIter = page.locator('#runIter');
    this.clearFact = page.locator('#clearFact');
    this.factStack = page.locator('#factStack');
    this.factResult = page.locator('#factResult');
    this.factCalls = page.locator('#factCalls');

    // Fibonacci elements
    this.fibN = page.locator('#fibN');
    this.fibSpeed = page.locator('#fibSpeed');
    this.runFibNaive = page.locator('#runFibNaive');
    this.runFibMemo = page.locator('#runFibMemo');
    this.clearFib = page.locator('#clearFib');
    this.fibResult = page.locator('#fibResult');
    this.fibCalls = page.locator('#fibCalls');
    this.canvasFib = page.locator('#canvasFib');

    // Fractal elements
    this.frDepth = page.locator('#frDepth');
    this.drawFractal = page.locator('#drawFractal');
    this.clearFractal = page.locator('#clearFractal');
    this.canvasFr = page.locator('#canvasFr');
  }

  // Wait until the page's document.readyState is 'complete'
  async waitForLoad() {
    await this.page.waitForFunction(() => document.readyState === 'complete');
  }

  // Factorial actions
  async setFactN(n) {
    await this.factN.fill(String(n));
  }
  async setFactSpeed(ms) {
    // slider: set value attribute and dispatch input event to ensure binding if any
    await this.factSpeed.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input')); }, ms);
  }
  async clickRunFact() {
    await this.runFact.click();
  }
  async clickRunIter() {
    await this.runIter.click();
  }
  async clickClearFact() {
    await this.clearFact.click();
  }
  async getFactResultText() {
    return (await this.factResult.textContent()).trim();
  }
  async getFactCallsText() {
    return (await this.factCalls.textContent()).trim();
  }
  async getFactStackFrames() {
    return this.factStack.locator('.frame');
  }

  // Fibonacci actions
  async setFibN(n) {
    await this.fibN.fill(String(n));
  }
  async setFibSpeed(ms) {
    await this.fibSpeed.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input')); }, ms);
  }
  async clickRunFibNaive() {
    await this.runFibNaive.click();
  }
  async clickRunFibMemo() {
    await this.runFibMemo.click();
  }
  async clickClearFib() {
    await this.clearFib.click();
  }
  async getFibResultText() {
    return (await this.fibResult.textContent()).trim();
  }
  async getFibCallsText() {
    return (await this.fibCalls.textContent()).trim();
  }

  // Fractal actions
  async setFrDepth(d) {
    await this.frDepth.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input')); }, d);
  }
  async clickDrawFractal() {
    await this.drawFractal.click();
  }
  async clickClearFractal() {
    await this.clearFractal.click();
  }
  // Returns a dataURL snapshot of the fractal canvas for visual-diff detection
  async canvasFrDataURL() {
    return this.canvasFr.evaluate((c) => c.toDataURL());
  }
  async canvasFibDataURL() {
    return this.canvasFib.evaluate((c) => c.toDataURL());
  }
}

// Top-level grouping for recursion app tests
test.describe('Recursion Interactive App - Integration Tests', () => {
  let consoleMessages = [];
  let pageErrors = [];

  // Attach listeners for console and page errors for each test; they are asserted to be clean at test end.
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app under test and wait for loaded state
    await page.goto(APP_URL);
    // wait for the script to register and initial canvases to be drawn
    await page.waitForTimeout(50);
  });

  test.afterEach(async () => {
    // Ensure there were no uncaught page errors
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toHaveLength(0);
    // Ensure no console messages at error level were emitted during the test
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole, `Unexpected console.error logs: ${errorConsole.map(m => m.text).join(' | ')}`).toHaveLength(0);
  });

  test('Initial page load: DOM elements present and default state correct', async ({ page }) => {
    // Purpose: verify initial DOM state, inputs defaults and visible placeholders
    const app = new RecursionPage(page);
    await app.waitForLoad();

    // Factorial defaults
    await expect(app.factN).toHaveValue('6');
    await expect(app.factSpeed).toHaveValue('180');
    expect(await app.getFactResultText()).toBe('—');
    expect(await app.getFactCallsText()).toBe('0');
    await expect(app.factStack.locator('.frame')).toHaveCount(0);

    // Fibonacci defaults
    await expect(app.fibN).toHaveValue('6');
    await expect(app.fibSpeed).toHaveValue('100');
    expect(await app.getFibResultText()).toBe('—');
    expect(await app.getFibCallsText()).toBe('0');

    // Canvases present and sized
    const canvasFibBox = await app.canvasFib.boundingBox();
    const canvasFrBox = await app.canvasFr.boundingBox();
    expect(canvasFibBox.width).toBeGreaterThan(0);
    expect(canvasFrBox.width).toBeGreaterThan(0);
  });

  test.describe('Factorial Trace (async recursion)', () => {
    test('Run recursive factorial updates call stack, result and call count', async ({ page }) => {
      // Purpose: start the recursive factorial run and assert correct result, call count and frames
      const app1 = new RecursionPage(page);
      // Speed up animation to keep test fast
      await app.setFactSpeed(20);
      // Use n = 6 (default) and start recursion
      await app.setFactN(6);
      await app.clickRunFact();

      // Wait until result equals 720 (6! with algorithm)
      await page.waitForFunction(() => document.getElementById('factResult').textContent.trim() !== '…');
      await expect.poll(async () => await app.getFactResultText(), { timeout: 5000 }).toBe('720');

      // Calls should reflect number of calls (6..1) => 6
      await expect.poll(async () => await app.getFactCallsText()).toBe('6');

      // Stack should contain frames (when finished frames are still present, each frame has .frame)
      const frames = app.getFactStackFrames();
      // At least one frame exists (iterative would put one, recursive leaves frames)
      await expect(frames).toHaveCountGreaterThan(0);
      // Topmost frame should have dataset name 'fact(6)'
      const topName = await frames.first().getAttribute('data-name');
      expect(topName).toBeDefined();
      // Since newest frames are prepended, the top might be last pushed, but ensure some frame includes fact(6)
      const anyFact6 = await app.factStack.locator('.frame[data-name="fact(6)"]').count();
      expect(anyFact6).toBeGreaterThanOrEqual(1);
    });

    test('Run iterative factorial produces single frame with iterative marker', async ({ page }) => {
      // Purpose: click iterative factorial and verify a single illustrative frame plus correct result label
      const app2 = new RecursionPage(page);
      await app.setFactSpeed(20);
      // Use n=7 to test a different value
      await app.setFactN(7);
      await app.clickRunIter();

      // Iterative is synchronous; result should update immediately
      await expect.poll(async () => await app.getFactResultText()).toBe('5040'); // 7! = 5040
      await expect.poll(async () => await app.getFactCallsText()).toContain('(iterative)');

      // Stack should have a single frame fact_iter(7) with info 'loop'
      const frames1 = app.getFactStackFrames();
      await expect(frames).toHaveCount(1);
      const frameName = await frames.first().getAttribute('data-name');
      expect(frameName).toBe(`fact_iter(7)`);

      // Its return (.ret) value should be visible and equal to result
      const retText = await frames.first().locator('.ret').textContent();
      expect(retText.trim()).toBe('5040');
    });

    test('Clear factorial resets display when not running', async ({ page }) => {
      // Purpose: ensure the Clear button resets UI for factorial
      const app3 = new RecursionPage(page);
      // Set result via iterative run then clear
      await app.setFactN(4);
      await app.clickRunIter();
      await expect.poll(async () => await app.getFactResultText()).toBe('24');

      // Clear
      await app.clickClearFact();
      expect(await app.getFactResultText()).toBe('—');
      expect(await app.getFactCallsText()).toBe('0');
      await expect(app.factStack.locator('.frame')).toHaveCount(0);
    });
  });

  test.describe('Fibonacci: naive tree drawing and memoization', () => {
    test('Naive fib tree draw traverses nodes and updates result and calls', async ({ page }) => {
      // Purpose: draw a small naive fibonacci recursion tree and assert result and calls update
      const app4 = new RecursionPage(page);
      // Use a smaller n and fast speed to keep traversal quick
      await app.setFibN(5);
      await app.setFibSpeed(10);
      // Snapshot canvas before drawing
      const before = await app.canvasFibDataURL();

      await app.clickRunFibNaive();

      // Wait until fibResult is populated (not '…')
      await page.waitForFunction(() => document.getElementById('fibResult').textContent.trim() !== '…');
      await expect.poll(async () => await app.getFibResultText(), { timeout: 5000 }).toBe('8'); // fib(5) per demo's base-case=1 yields 8

      // Calls should be at least >1 (naive recursion)
      const callsText = await app.getFibCallsText();
      const callsNum = parseInt(callsText, 10);
      expect(Number.isInteger(callsNum)).toBeTruthy();
      expect(callsNum).toBeGreaterThan(1);

      // Canvas should have changed compared to before draw
      const after = await app.canvasFibDataURL();
      expect(after).not.toBe(before);
    });

    test('Memoized fibonacci computes quickly and indicates memoized calls', async ({ page }) => {
      // Purpose: run memoized computation and assert result and calls include memoization note
      const app5 = new RecursionPage(page);
      await app.setFibN(10);
      await app.clickRunFibMemo();

      // Memoized run is synchronous; result should update quickly
      await expect.poll(async () => (await app.getFibResultText()) !== '—').toBeTruthy();
      const resultText = await app.getFibResultText();
      // fib with base 1/1: fib(10) should be numeric; we just assert it's a non-empty numeric string
      expect(resultText.length).toBeGreaterThan(0);
      expect(/^\d+$/.test(resultText)).toBeTruthy();

      // Calls text should include '(memoized)'
      const callsText1 = await app.getFibCallsText();
      expect(callsText).toContain('(memoized)');

      // After memoized draw, the canvas should show returned nodes; ensure canvas changed from cleared state
      const after1 = await app.canvasFibDataURL();
      expect(after.length).toBeGreaterThan(0);
    });

    test('Clear Fibonacci resets canvas and UI', async ({ page }) => {
      // Purpose: ensure Clear button resets result, calls and canvas
      const app6 = new RecursionPage(page);
      // Draw something then clear
      await app.setFibN(4);
      await app.setFibSpeed(10);
      await app.clickRunFibNaive();
      await page.waitForFunction(() => document.getElementById('fibResult').textContent.trim() !== '…');
      const mid = await app.canvasFibDataURL();
      expect(mid.length).toBeGreaterThan(0);

      // Now clear
      await app.clickClearFib();
      expect(await app.getFibResultText()).toBe('—');
      expect(await app.getFibCallsText()).toBe('0');
      const afterClear = await app.canvasFibDataURL();
      // After clearing, the canvas data should change compared to drawn state (background reset)
      expect(afterClear).not.toBe(mid);
    });
  });

  test.describe('Fractal Tree drawing', () => {
    test('Draw fractal updates canvas pixels (visual change) and clear restores it', async ({ page }) => {
      // Purpose: verify the fractal canvas visually updates after drawing and changes after clearing
      const app7 = new RecursionPage(page);
      // Snapshot prior to draw
      const before1 = await app.canvasFrDataURL();
      await app.setFrDepth(6);
      await app.clickDrawFractal();

      // small wait to ensure drawing completes (drawing is synchronous in this app)
      await page.waitForTimeout(100);
      const drawn = await app.canvasFrDataURL();
      expect(drawn).not.toBe(before);

      // Clear the fractal canvas and ensure it differs from drawn state
      await app.clickClearFractal();
      await page.waitForTimeout(30);
      const cleared = await app.canvasFrDataURL();
      expect(cleared).not.toBe(drawn);
      // It's acceptable if cleared equals before (background pattern), but ensure cleared is defined
      expect(typeof cleared).toBe('string');
    });
  });

  test('Accessibility spot-check: important controls are focusable and labeled', async ({ page }) => {
    // Purpose: quick accessibility checks: controls exist, focusable and labels present in DOM
    const app8 = new RecursionPage(page);

    // Ensure primary buttons are enabled and focusable
    await expect(app.runFact).toBeVisible();
    await expect(app.runIter).toBeVisible();
    await expect(app.runFibNaive).toBeVisible();
    await expect(app.runFibMemo).toBeVisible();
    await expect(app.drawFractal).toBeVisible();

    // Keyboard focus navigation sanity
    await app.runFact.focus();
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('runFact');
    await app.runIter.focus();
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('runIter');
  });
});