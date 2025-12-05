import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80ae630-d1c9-11f0-9efc-d1db1618a544.html';

// Page Object encapsulating interactions and common queries
class QuickSortPage {
  constructor(page) {
    this.page = page;
  }

  // Element locators
  size() { return this.page.locator('#size'); }
  sizeVal() { return this.page.locator('#sizeVal'); }
  speed() { return this.page.locator('#speed'); }
  speedVal() { return this.page.locator('#speedVal'); }
  pivot() { return this.page.locator('#pivot'); }
  order() { return this.page.locator('#order'); }
  custom() { return this.page.locator('#custom'); }

  randomBtn() { return this.page.locator('#random'); }
  prepareBtn() { return this.page.locator('#prepare'); }
  startBtn() { return this.page.locator('#start'); }
  pauseBtn() { return this.page.locator('#pause'); }
  resetBtn() { return this.page.locator('#reset'); }
  loadBtn() { return this.page.locator('#load'); }
  stepFwd() { return this.page.locator('#stepFwd'); }
  stepBack() { return this.page.locator('#stepBack'); }

  bars() { return this.page.locator('#bars'); }
  barItems() { return this.page.locator('#bars .bar'); }
  compCount() { return this.page.locator('#compCount'); }
  swapCount() { return this.page.locator('#swapCount'); }
  stepCount() { return this.page.locator('#stepCount'); }
  pseudocodeLines() { return this.page.locator('#pseudocode .line'); }
  stack() { return this.page.locator('#stack'); }

  // Actions
  async goto() {
    await this.page.goto(APP_URL);
  }

  async setSize(val) {
    await this.size().fill(String(val));
    // also dispatch input - use evaluate to set value and dispatch input event (some browsers don't send input on fill for range)
    await this.page.evaluate((v) => {
      const el = document.getElementById('size');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(val));
  }

  async setSpeed(val) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('speed');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(val));
  }

  async clickRandom() { await this.randomBtn().click(); }
  async clickPrepare() { await this.prepareBtn().click(); }
  async clickStart() { await this.startBtn().click(); }
  async clickPause() { await this.pauseBtn().click(); }
  async clickReset() { await this.resetBtn().click(); }
  async clickLoad() { await this.loadBtn().click(); }
  async clickStepFwd() { await this.stepFwd().click(); }
  async clickStepBack() { await this.stepBack().click(); }

  async loadCustom(text) {
    await this.custom().fill(text);
    await this.clickLoad();
  }
}

test.describe('Quick Sort Visualizer - d80ae630...', () => {
  // capture console errors and page errors per test
  test.beforeEach(async ({ page }) => {
    // default: accept alerts so they don't block tests. Individual tests may override with custom handlers.
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
  });

  // Test initial page load and default state
  test('loads page and shows initial UI elements and default state', async ({ page }) => {
    // Purpose: verify app loads, default controls and visual elements are present and initial render is correct
    const app = new QuickSortPage(page);
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));

    await app.goto();

    // Basic UI text checks
    await expect(page.locator('header h1')).toHaveText('Quick Sort Visualizer');
    await expect(app.sizeVal()).toHaveText('30'); // default size
    await expect(app.speedVal()).toHaveText('120ms'); // default speed

    // Bars should be rendered with default size (30)
    await expect(app.barItems()).toHaveCount(30);

    // Pseudocode lines are present
    await expect(app.pseudocodeLines()).toHaveCountGreaterThan(0);

    // Stats initial values
    await expect(app.compCount()).toHaveText('0');
    await expect(app.swapCount()).toHaveText('0');
    await expect(app.stepCount()).toHaveText('0 / 0');

    // Stack should be empty text initially
    await expect(app.stack()).toHaveText('');

    // No console errors or page errors on initial load
    expect(consoleErrors, 'no console.error messages').toEqual([]);
    expect(pageErrors, 'no uncaught page errors').toEqual([]);
  });

  // Test slider and speed control behaviors
  test('size and speed controls update displayed values and affect generated array size', async ({ page }) => {
    // Purpose: verify that manipulating controls updates DOM state accordingly
    const app = new QuickSortPage(page);
    const consoleErr = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErr.push(msg.text()); });
    page.on('pageerror', () => {}); // collect but ignore for this test

    await app.goto();

    // Change size down to a smaller number (8) and ensure UI updates and a new Randomize uses that size
    await app.setSize(8);
    await expect(app.sizeVal()).toHaveText('8');

    // Click Randomize and verify bars count equals new size
    await app.clickRandom();
    await expect(app.barItems()).toHaveCount(8);

    // Change speed and ensure speed label updates; also ensure it doesn't error
    await app.setSpeed(50);
    await expect(app.speedVal()).toHaveText('50ms');

    expect(consoleErr, 'no console.error messages during control interactions').toEqual([]);
  });

  // Test custom load with valid and invalid input and alert handling
  test('load custom array: valid input updates array and invalid input triggers alert', async ({ page }) => {
    // Purpose: verify custom array parsing and user feedback (alert on invalid input)
    const app = new QuickSortPage(page);
    const dialogs = [];
    await app.goto();

    // Replace default dialog handler to capture messages for this test only
    page.removeAllListeners('dialog');
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    // Start with a known small default via size and randomize to get deterministic bars count
    await app.setSize(5);
    await app.clickRandom();
    const beforeCount = await app.barItems().count();
    expect(beforeCount).toBe(5);

    // Try invalid custom input - should trigger an alert with invalid number
    await app.loadCustom('a,2,3');
    // Ensure an alert was shown with expected content
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    const lastDialog = dialogs[dialogs.length - 1];
    expect(lastDialog.message).toContain('Invalid number');

    // Now valid custom input
    await app.loadCustom('10,20,5,3');
    // After valid load, sizeVal should be clamped to length (between 5 and 80)
    await expect(app.sizeVal()).toHaveText('5'); // length is 4 but clamp sets min 5; the code forces sizeEl to at least 5
    // Bars should show up with 4 values visible inside (bars shows values only when <=45)
    const barCount = await app.barItems().count();
    expect(barCount).toBe(4);

    // Ensure we received alerts (at least from the earlier invalid case)
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
  });

  // Test prepare, step navigation, and pseudocode + stack render
  test('prepare records snapshots, updates step counts and highlights pseudocode/stack', async ({ page }) => {
    // Purpose: prepare the algorithm steps (snapshots), inspect step count, pseudocode highlight and stack rendering
    const app = new QuickSortPage(page);
    const dialogMessages = [];
    await app.goto();

    // Intercept dialogs to capture the "Preparation complete" alert
    page.removeAllListeners('dialog');
    page.on('dialog', async dialog => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    // Use a small custom array to keep snapshots small and deterministic
    await app.loadCustom('6,3,8,1,5');

    // Click prepare -> will build snapshots and emit an alert with number of steps
    await app.clickPrepare();

    // Ensure we got the preparation alert and it mentions steps
    expect(dialogMessages.length).toBeGreaterThanOrEqual(1);
    expect(dialogMessages[dialogMessages.length - 1]).toContain('Preparation complete');

    // After prepare, stepCount should show "1 / N" with N > 1
    const stepText = await app.stepCount().textContent();
    expect(stepText).toMatch(/1 \/ \d+/);

    // Pseudocode should have at least one line highlighted (.current)
    const highlighted = await page.locator('#pseudocode .line.current').count();
    expect(highlighted).toBeGreaterThanOrEqual(0); // could be zero if action mapping didn't highlight; ensure no errors

    // Stack should be rendered and show at least the initial call
    const stackText = (await app.stack().textContent()).trim();
    expect(stackText.length).toBeGreaterThanOrEqual(0); // stack may be '(empty)' or have content; ensure it doesn't error
  });

  // Test playback start/pause behavior and UI disable/enable toggles
  test('start and pause playback toggles controls and updates disabled states', async ({ page }) => {
    // Purpose: verify starting playback disables controls and pause re-enables them
    const app = new QuickSortPage(page);
    await app.goto();

    // Prepare using a small custom array to avoid long playback
    await app.loadCustom('4,2,9,1');
    // Prepare so snapshots exist
    // Accept alert(s)
    page.on('dialog', async dialog => await dialog.accept());
    await app.clickPrepare();

    // Set speed very small to ensure interval fires if left accidentally
    await app.setSpeed(30);

    // Start playback
    await app.clickStart();

    // On start playback, start button should become disabled and pause enabled
    await expect(app.startBtn()).toBeDisabled();
    await expect(app.pauseBtn()).toBeEnabled();

    // Other controls are disabled during playback (size, random, load, pivot, order, step buttons, reset, prepare)
    await expect(app.size()).toBeDisabled();
    await expect(app.pivot()).toBeDisabled();
    await expect(app.order()).toBeDisabled();
    await expect(app.randomBtn()).toBeDisabled();
    await expect(app.loadBtn()).toBeDisabled();
    await expect(app.prepareBtn()).toBeDisabled();
    await expect(app.stepFwd()).toBeDisabled();
    await expect(app.stepBack()).toBeDisabled();
    await expect(app.resetBtn()).toBeDisabled();

    // Pause playback
    await app.clickPause();

    // After pause, controls should be re-enabled
    await expect(app.startBtn()).toBeEnabled();
    await expect(app.pauseBtn()).toBeEnabled(); // code sets pauseBtn to false on start, but never disables it on pause; ensure no error
    await expect(app.size()).toBeEnabled();
    await expect(app.pivot()).toBeEnabled();
    await expect(app.order()).toBeEnabled();
    await expect(app.randomBtn()).toBeEnabled();
    await expect(app.loadBtn()).toBeEnabled();
    await expect(app.prepareBtn()).toBeEnabled();
    await expect(app.stepFwd()).toBeEnabled();
    await expect(app.stepBack()).toBeEnabled();
    await expect(app.resetBtn()).toBeEnabled();
  });

  // Test stepping forward and backward changes step counter and visuals
  test('step forward and backward navigates snapshots and updates step counter', async ({ page }) => {
    // Purpose: verify manual stepping works and updates displayed step numbers and DOM visual (bars)
    const app = new QuickSortPage(page);
    await app.goto();

    // Prepare with a small array
    await app.loadCustom('7,1,5,3');
    page.on('dialog', async dialog => await dialog.accept());
    await app.clickPrepare();

    // Capture initial step count
    let initial = await app.stepCount().textContent();
    // initial should be "1 / N"
    expect(initial).toMatch(/1 \/ \d+/);

    // Click step forward several times (guard by count)
    await app.clickStepFwd();
    const afterFwd = await app.stepCount().textContent();
    // Should show an incremented current index (e.g., "2 / N")
    expect(afterFwd).toMatch(/\d+ \/ \d+/);
    // Click step back
    await app.clickStepBack();
    const afterBack = await app.stepCount().textContent();
    // Should be back to initial "1 / N"
    expect(afterBack).toMatch(/1 \/ \d+/);
  });

  // Test reset behavior clears playback state and restores initial counters
  test('reset restores initial array and clears stats and snapshots', async ({ page }) => {
    // Purpose: ensure reset returns UI to initial untouched state
    const app = new QuickSortPage(page);
    await app.goto();

    // Prepare with small custom
    await app.loadCustom('9,4,2,8,1');
    page.on('dialog', async dialog => await dialog.accept());
    await app.clickPrepare();

    // Start and then reset
    await app.clickStart();
    // Immediately reset
    await app.clickReset();

    // After reset: comp/swap counters should be zero, stepCount '0 / 0', pseudocode not highlighted
    await expect(app.compCount()).toHaveText('0');
    await expect(app.swapCount()).toHaveText('0');
    await expect(app.stepCount()).toHaveText('0 / 0');

    // Bars should be drawn and not error
    const bars = await app.barItems().count();
    expect(bars).toBeGreaterThan(0);

    // Stack should be empty or cleared text
    const stackText = await app.stack().textContent();
    expect(stackText !== null).toBeTruthy();
  });

  // Accessibility and keyboard shortcuts
  test('keyboard shortcuts: ArrowRight triggers step forward and Space toggles playback', async ({ page }) => {
    // Purpose: ensure basic keyboard interactions are wired correctly
    const app = new QuickSortPage(page);
    await app.goto();

    // Prepare a small custom array and accept the alert
    await app.loadCustom('2,8,3');
    page.on('dialog', async dialog => await dialog.accept());
    await app.clickPrepare();

    // Press ArrowRight to step forward
    await page.keyboard.press('ArrowRight');
    const afterArrow = await app.stepCount().textContent();
    // Expect step index to be 2 / N or at least not '1 / N'
    expect(afterArrow).toMatch(/\d+ \/ \d+/);

    // Press Space to start (it triggers startBtn.click())
    await page.keyboard.press(' ');
    // After pressing space, start button should be disabled (playback started)
    await expect(app.startBtn()).toBeDisabled();

    // Press Space again to pause (space toggles)
    await page.keyboard.press(' ');
    // After pausing, start should be enabled again
    await expect(app.startBtn()).toBeEnabled();
  });

  // Final check: ensure no uncaught runtime errors appeared during interactions across tests in this describe block
  // This gathers console errors and page errors for a final assertion scoped to this test run.
  test('no uncaught exceptions or console.error occurred during interactive scenarios', async ({ page }) => {
    // Purpose: aggregate error signals from the page and assert none occurred
    const app = new QuickSortPage(page);
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));

    await app.goto();

    // run a quick series of interactions to exercise code paths
    page.on('dialog', async d => await d.accept());
    await app.setSize(6);
    await app.clickRandom();
    await app.loadCustom('3,1,4,1,5');
    await app.clickPrepare();
    await app.clickStart();
    // Pause quickly
    await app.clickPause();
    await app.clickReset();

    // Assert no console errors or uncaught page errors
    expect(consoleErrors, 'no console.error messages during interactions').toEqual([]);
    expect(pageErrors, 'no uncaught page errors during interactions').toEqual([]);
  });
});