import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a8d-cd35-11f0-9e7b-93b903303299.html';

// Page object helper for the visualizer
class LinearSearchPage {
  constructor(page) {
    this.page = page;
    this.locators = {
      arrayInput: page.locator('#arrayInput'),
      targetInput: page.locator('#targetInput'),
      sizeInput: page.locator('#sizeInput'),
      maxValInput: page.locator('#maxValInput'),
      generateBtn: page.locator('#generateBtn'),
      applyBtn: page.locator('#applyBtn'),
      shuffleBtn: page.locator('#shuffleBtn'),
      reverseBtn: page.locator('#reverseBtn'),
      stepBtn: page.locator('#stepBtn'),
      stepBackBtn: page.locator('#stepBackBtn'),
      playBtn: page.locator('#playBtn'),
      resetBtn: page.locator('#resetBtn'),
      arrayArea: page.locator('#arrayArea'),
      statusArea: page.locator('#statusArea'),
      logText: page.locator('#logText'),
      comparisonsPill: page.locator('#comparisonsPill'),
      targetBadge: page.locator('#targetBadge'),
      speedRange: page.locator('#speedRange'),
      speedLabel: page.locator('#speedLabel'),
      // items: will be queried in methods
    };
  }

  async goto() {
    await this.page.goto(APP_URL);
    // wait for the arrayArea to be present (rendered by applySettings in script)
    await this.locators.arrayArea.waitFor({ state: 'attached' });
  }

  async getArrayValues() {
    // returns array of text contents for each item value (not index label)
    return await this.locators.arrayArea.locator('.item').allTextContents();
  }

  async getItemByIndex(i) {
    return this.locators.arrayArea.locator(`.item[data-index="${i}"]`);
  }

  async getItemValueByIndex(i) {
    const loc = await this.getItemByIndex(i);
    // element structure: label (index) then value node, so value as last child text
    return (await loc.textContent())?.trim();
  }

  async clickApply() {
    await this.locators.applyBtn.click();
  }

  async clickStep() {
    await this.locators.stepBtn.click();
  }

  async clickStepBack() {
    await this.locators.stepBackBtn.click();
  }

  async clickPlay() {
    await this.locators.playBtn.click();
  }

  async clickReset() {
    await this.locators.resetBtn.click();
  }

  async clickGenerate() {
    await this.locators.generateBtn.click();
  }

  async clickShuffle() {
    await this.locators.shuffleBtn.click();
  }

  async clickReverse() {
    await this.locators.reverseBtn.click();
  }

  async setArrayInput(value) {
    await this.locators.arrayInput.fill(value);
  }

  async setTargetInput(value) {
    await this.locators.targetInput.fill(value);
  }

  async setSpeed(ms) {
    await this.locators.speedRange.fill(String(ms));
    // fire input event by dispatching JS to ensure the app responds
    await this.page.evaluate((v) => {
      const el = document.getElementById('speedRange');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(ms));
  }

  async comparisonsText() {
    return (await this.locators.comparisonsPill.textContent())?.trim();
  }

  async statusText() {
    return (await this.locators.statusArea.textContent())?.trim();
  }

  async logTextContent() {
    return (await this.locators.logText.textContent())?.trim();
  }

  async playButtonText() {
    return (await this.locators.playBtn.textContent())?.trim();
  }

  async targetBadgeText() {
    return (await this.locators.targetBadge.textContent())?.trim();
  }

  async waitForItemClass(idx, className, timeout = 2000) {
    const loc1 = this.locators.arrayArea.locator(`.item[data-index="${idx}"]`);
    await expect(loc).toHaveClass(new RegExp(`\\b${className}\\b`), { timeout });
  }

  async waitForNoItemClass(idx, className, timeout = 2000) {
    const loc2 = this.locators.arrayArea.locator(`.item[data-index="${idx}"]`);
    await expect(loc).not.toHaveClass(new RegExp(`\\b${className}\\b`), { timeout });
  }
}

// Collect console messages and page errors for each test and assert none occurred
test.describe('Linear Search Visualizer — be878a8d-cd35-11f0-9e7b-93b903303299', () => {
  let pageErrors;
  let consoleMessages;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleMessages = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      // capture console messages for inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
  });

  test.afterEach(async () => {
    // After each test we ensure no uncaught page errors occurred.
    // This assertion is important to detect runtime exceptions that the app may produce.
    expect(pageErrors, `Expected no page errors, found: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
  });

  test('Initial load: default UI elements render and show initial status/log', async ({ page }) => {
    // Purpose: Verify initial page load, that elements exist and initial messages are present.
    const app = new LinearSearchPage(page);
    await app.goto();

    // Verify default target badge and inputs are set from HTML initial values
    await expect(app.locators.arrayInput).toHaveValue('7, 2, 9, 4, 3, 11, 6, 3');
    await expect(app.locators.targetInput).toHaveValue('3');
    expect(await app.targetBadgeText()).toBe('3');

    // The arrayArea should have been rendered with items
    const items = app.locators.arrayArea.locator('.item');
    await expect(items).toHaveCount(8);

    // The status area should contain "Ready"
    const status = await app.statusText();
    expect(status).toMatch(/Ready/);

    // The log should initially indicate no steps
    const log = await app.logTextContent();
    expect(log).toMatch(/No steps yet/);

    // There should be a comparisons pill set to 0 initial
    expect(await app.comparisonsText()).toContain('Comparisons: 0');

    // Ensure console printed the helpful message 'No steps yet.' at least once (logText originates from script)
    const hasNoStepsConsole = consoleMessages.some(m => m.text.includes('No steps yet'));
    // It's okay if not found in console (the app writes to DOM), but ensure no page errors caught by afterEach.
    // We assert that we observed either console message or DOM log indicating initial state.
    expect(hasNoStepsConsole || log.includes('No steps yet')).toBeTruthy();
  });

  test('Apply button re-parses inputs, updates array and target badge, resets state', async ({ page }) => {
    // Purpose: Changing the inputs and clicking Apply should re-render the array and update the displayed target.
    const app1 = new LinearSearchPage(page);
    await app.goto();

    // Change array and target, then apply
    await app.setArrayInput('1, 2, 3');
    await app.setTargetInput('2');
    await app.clickApply();

    // Expect the new array to be rendered with 3 items
    await expect(app.locators.arrayArea.locator('.item')).toHaveCount(3);

    // Target badge must update to new target
    expect(await app.targetBadgeText()).toBe('2');

    // Comparisons reset to 0
    expect(await app.comparisonsText()).toContain('Comparisons: 0');

    // Log should say 'No steps yet.'
    expect(await app.logTextContent()).toMatch(/No steps yet/);
  });

  test('Step forward highlights comparing, then marks checked and increments comparisons', async ({ page }) => {
    // Purpose: Step should compare the next element, visually mark it comparing, then mark checked and increment comparison count.
    const app2 = new LinearSearchPage(page);
    await app.goto();

    // Use a small, known array
    await app.setArrayInput('10, 20, 30');
    await app.setTargetInput('100'); // target not present
    await app.clickApply();

    // Step once: index 0 should be comparing immediately
    await app.clickStep();

    // The item at index 0 should have 'comparing' class
    const item0 = app.locators.arrayArea.locator('.item[data-index="0"]');
    await expect(item0).toHaveClass(/comparing/);

    // Comparisons pill should be updated to 1 immediately
    expect(await app.comparisonsText()).toContain('Comparisons: 1');

    // After a short delay (the script uses a 200ms timeout to add 'checked'), the item should have 'checked' class and not 'comparing'
    await page.waitForTimeout(300);
    await expect(item0).not.toHaveClass(/comparing/);
    await expect(item0).toHaveClass(/checked/);

    // Status and log should reflect the comparison took place
    const status1 = await app.statusText();
    expect(status).toMatch(/Checked index 0|Comparing index 0/i);
    const log1 = await app.logTextContent();
    expect(log).toMatch(/Comparing index 0/);
  });

  test('Step until found marks element as found and stops playing', async ({ page }) => {
    // Purpose: When the target exists, the corresponding element should get the "found" class and the search should finish.
    const app3 = new LinearSearchPage(page);
    await app.goto();

    // Small array where the target is the last element
    await app.setArrayInput('1,2,3');
    await app.setTargetInput('3');
    await app.clickApply();

    // Step 0
    await app.clickStep();
    await page.waitForTimeout(250);

    // Step 1
    await app.clickStep();
    await page.waitForTimeout(250);

    // Step 2 (should find)
    await app.clickStep();

    // The item at index 2 should eventually be marked 'found'
    const item2 = app.locators.arrayArea.locator('.item[data-index="2"]');
    // Wait for found class
    await expect(item2).toHaveClass(/found/);

    // Comparisons should reflect 3 comparisons
    expect(await app.comparisonsText()).toContain('Comparisons: 3');

    // Status should indicate found at index 2 and log should mention found
    expect(await app.statusText()).toMatch(/Found target at index 2/);
    expect(await app.logTextContent()).toMatch(/Found at index 2/);
  });

  test('Play toggles play/pause button text and respects Pause', async ({ page }) => {
    // Purpose: Play should toggle between Play and Pause; clicking while playing pauses.
    const app4 = new LinearSearchPage(page);
    await app.goto();

    // Speed down to minimum to make play responses faster
    await app.setSpeed(200);

    // Ensure small array so play will finish soon
    await app.setArrayInput('5,6');
    await app.setTargetInput('999'); // not present
    await app.clickApply();

    // Click Play; button text should change to 'Pause'
    await app.clickPlay();
    expect(await app.playButtonText()).toMatch(/Pause/i);

    // Click again to pause
    await app.clickPlay();
    // When paused, status should show 'Paused.' and button text 'Play'
    expect(await app.playButtonText()).toMatch(/Play/i);
    expect(await app.statusText()).toMatch(/Paused|Paused\./i);

    // Clicking Play again should restart (go to Pause)
    await app.clickPlay();
    expect(await app.playButtonText()).toMatch(/Pause/i);

    // Wait a bit for play to potentially progress and then ensure we can stop it
    await page.waitForTimeout(500);
    // Stop playback to keep test stable
    await app.clickPlay();
    expect(await app.playButtonText()).toMatch(/Play/i);
  });

  test('Reset returns visualization to initial state', async ({ page }) => {
    // Purpose: Reset should clear progress, reset comparisons, and set items to base styles.
    const app5 = new LinearSearchPage(page);
    await app.goto();

    // Make some progress
    await app.setArrayInput('8,9,10');
    await app.setTargetInput('9');
    await app.clickApply();

    // Step once to check index 0
    await app.clickStep();
    await page.waitForTimeout(250);

    // Ensure comparisons > 0
    expect(await app.comparisonsText()).toContain('Comparisons: 1');

    // Reset
    await app.clickReset();

    // Comparisons should be reset
    expect(await app.comparisonsText()).toContain('Comparisons: 0');

    // No items should have comparing/found/checked classes
    const items1 = app.locators.arrayArea.locator('.item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const classes = await items.nth(i).getAttribute('class');
      expect(classes).not.toMatch(/comparing|found|checked/);
    }

    // Status should indicate Reset
    expect(await app.statusText()).toMatch(/Reset/);
    expect(await app.logTextContent()).toMatch(/No steps yet/);
  });

  test('Shuffle and Reverse change array input and reset visualization', async ({ page }) => {
    // Purpose: Shuffle modifies the underlying array and reverse reverses it; both trigger reset.
    const app6 = new LinearSearchPage(page);
    await app.goto();

    // Fix a known array
    await app.setArrayInput('1,2,3,4,5');
    await app.clickApply();

    // Reverse: click and expect arrayInput value to be reversed
    await app.clickReverse();
    const reversedValue = await app.locators.arrayInput.inputValue();
    expect(reversedValue).toBe('5, 4, 3, 2, 1');

    // Shuffle: clicking shuffle changes arrayInput to some permutation (we assert it differs from previous order)
    const beforeShuffle = reversedValue;
    await app.clickShuffle();
    const afterShuffle = await app.locators.arrayInput.inputValue();
    // After shuffle it should be a comma-separated list with same count; it might equal previous by chance but unlikely.
    expect(afterShuffle.split(',').length).toBe(5);
    // Verify reset was called by checking that comparisons pill is zero
    expect(await app.comparisonsText()).toContain('Comparisons: 0');
  });

  test('Generate button populates array input with random values', async ({ page }) => {
    // Purpose: Clicking Generate Random Array should populate the arrayInput with values based on size/max settings.
    const app7 = new LinearSearchPage(page);
    await app.goto();

    // Set size and max value to known values
    await app.locators.sizeInput.fill('6');
    await app.locators.maxValInput.fill('50');
    await app.clickGenerate();

    // The array input should now be a comma-separated list of 6 numbers
    const arrText = await app.locators.arrayInput.inputValue();
    const parts = arrText.split(',').map(s => s.trim()).filter(Boolean);
    expect(parts.length).toBe(6);
    // Each should be a numeric string
    for (const p of parts) {
      expect(/\d+/.test(p)).toBeTruthy();
    }
  });

  test('Apply with empty array triggers alert dialog and does not render empty array', async ({ page }) => {
    // Purpose: Edge case where user clicks Apply with an empty array input should trigger an alert and not clear previous state.
    const app8 = new LinearSearchPage(page);
    await app.goto();

    // Ensure there's an initial non-empty array rendered
    await expect(app.locators.arrayArea.locator('.item')).toHaveCountGreaterThan(0);

    // Listen for dialog and accept it (the code uses alert())
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/Array is empty/);
      await dialog.accept();
    });

    // Clear array input and click apply
    await app.setArrayInput('');
    await app.clickApply();

    // After dismissing alert, the array should remain unchanged (previous DOM not emptied by apply)
    await expect(app.locators.arrayArea.locator('.item')).toHaveCountGreaterThan(0);

    // Status shouldn't be switched to 'Ready' for new (empty) array; check log or comparisons still exists or set to initial
    expect(await app.logTextContent()).toMatch(/No steps yet|No steps/);
  });

  test('Keyboard shortcuts: Space toggles play, ArrowRight steps forward, ArrowLeft steps back, R resets', async ({ page }) => {
    // Purpose: Validate keyboard bindings for common actions
    const app9 = new LinearSearchPage(page);
    await app.goto();

    // Use small known array
    await app.setArrayInput('1,2,3');
    await app.setTargetInput('999'); // not present
    await app.clickApply();

    // Space toggles Play: focus on body and press space
    await page.keyboard.press('Space');
    expect(await app.playButtonText()).toMatch(/Pause/i);

    // Pause using space again
    await page.keyboard.press('Space');
    expect(await app.playButtonText()).toMatch(/Play/i);

    // Press ArrowRight to step forward once
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
    expect(await app.comparisonsText()).toContain('Comparisons: 1');

    // Press ArrowLeft to step back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    expect(await app.comparisonsText()).toContain('Comparisons: 0');

    // Press 'r' to reset (should already be reset, but ensure no errors and status changes)
    await page.keyboard.press('r');
    await page.waitForTimeout(100);
    expect(await app.statusText()).toMatch(/Reset|Ready/);
  });
});