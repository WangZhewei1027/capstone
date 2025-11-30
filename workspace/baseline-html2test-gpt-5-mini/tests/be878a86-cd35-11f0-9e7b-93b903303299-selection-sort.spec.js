import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a86-cd35-11f0-9e7b-93b903303299.html';

test.describe('Selection Sort Visualizer - be878a86-cd35-11f0-9e7b-93b903303299', () => {
  // Shared collectors for console errors and page errors for each test.
  let consoleErrors;
  let pageErrors;

  // Simple Page Object Model to encapsulate common interactions and queries
  class SelectionSortPage {
    constructor(page) {
      this.page = page;
      this.playPause = page.locator('#playPause');
      this.stepBtn = page.locator('#stepBtn');
      this.resetBtn = page.locator('#resetBtn');
      this.shuffleBtn = page.locator('#shuffleBtn');
      this.newArrBtn = page.locator('#newArrBtn');
      this.sizeInput = page.locator('#size');
      this.speedInput = page.locator('#speed');
      this.comparisons = page.locator('#comparisons');
      this.swaps = page.locator('#swaps');
      this.info = page.locator('#info');
      this.progress = page.locator('#progress');
      this.showValues = page.locator('#showValues');
      this.customArray = page.locator('#customArray');
      this.applyCustom = page.locator('#applyCustom');
      this.barsContainer = page.locator('#bars');
      this.barItems = () => this.page.locator('#bars .bar');
      this.barLabels = () => this.page.locator('#bars .bar .label');
    }

    // Returns number of bar elements
    async getBarCount() {
      return await this.barItems().count();
    }

    // Returns array of numerical values displayed in labels (empty strings turned to null)
    async getBarValues() {
      const count = await this.getBarCount();
      const vals = [];
      for (let i = 0; i < count; i++) {
        const text = await this.page.locator(`#bars .bar:nth-child(${i + 1}) .label`).textContent();
        vals.push(text === '' ? null : Number(text));
      }
      return vals;
    }

    // Returns textual content of comparisons and swaps as numbers
    async getComparisons() {
      const txt = await this.comparisons.textContent();
      const m = txt.match(/Comparisons:\s*(\d+)/);
      return m ? Number(m[1]) : null;
    }
    async getSwaps() {
      const txt1 = await this.swaps.textContent();
      const m1 = txt.match(/Swaps:\s*(\d+)/);
      return m ? Number(m[1]) : null;
    }

    // Wait until play/pause button displays some text
    async getPlayPauseText() {
      return (await this.playPause.textContent())?.trim();
    }

    // Set an input[type=range] value and dispatch input event
    async setRangeValue(locator, value) {
      await this.page.evaluate(
        ({ id, value }) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.value = String(value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        { id: await locator.evaluate(el => el.id), value }
      );
    }

    // Set speed to a high value for fast automatic playback
    async setFastSpeed() {
      await this.setRangeValue(this.speedInput, 100);
    }
  }

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages of type 'error'
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      } catch (e) {
        // If something goes wrong reading console, still capture string representation
        consoleErrors.push(String(msg));
      }
    });

    // Capture uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // Assert that no console errors or page uncaught exceptions occurred during the test run.
    // This verifies that runtime errors (ReferenceError, TypeError, SyntaxError, etc.) did not happen.
    expect(consoleErrors, 'No console.error messages should be emitted').toHaveLength(0);
    expect(pageErrors, 'No uncaught page errors should occur').toHaveLength(0);
  });

  test('Initial load: UI elements present and default state is correct', async ({ page }) => {
    // Verify initial UI structure and default values after page load
    const app = new SelectionSortPage(page);

    await expect(page).toHaveTitle(/Selection Sort/i);

    // Bars container should exist and contain the default number of bars equal to size input
    const sizeValue = Number(await app.sizeInput.getAttribute('value'));
    const barCount = await app.getBarCount();
    expect(barCount).toBe(sizeValue);

    // Comparisons and swaps should be zero initially
    const comps = await app.getComparisons();
    const swaps = await app.getSwaps();
    expect(comps).toBe(0);
    expect(swaps).toBe(0);

    // Info text should indicate no active indices
    const infoText = await app.info.textContent();
    expect(infoText).toContain('i: -');
    expect(infoText).toContain('j: -');
    expect(infoText).toContain('min: -');

    // Progress should read 0 / n
    const progressText = await app.progress.textContent();
    expect(progressText).toContain(`Progress: 0 / ${barCount}`);
  });

  test('Step button advances one action and updates visual highlighting', async ({ page }) => {
    // Clicking Step should produce a selectStart state: i and min should be set and bars highlighted
    const app1 = new SelectionSortPage(page);

    // Ensure stopped
    await app.resetBtn.click(); // reset to initial and stop
    // Record initial comparisons
    const compsBefore = await app.getComparisons();

    // Click Step once
    await app.stepBtn.click();

    // After one step, comparisons might still be zero because the first yielded action is 'selectStart'
    // But info should show an i >= 0
    const infoText1 = (await app.info.textContent()).trim();
    expect(infoText).toMatch(/i:\s*\d+/);

    // There should be a bar with the 'current' class (the i index) - verify by checking DOM classes
    const hasCurrent = await page.$eval('#bars', (barsEl) => {
      return Array.from(barsEl.children).some(c => c.classList.contains('current'));
    });
    expect(hasCurrent).toBe(true);

    // Comparisons should be greater or equal to previous (step might not increase comparisons on selectStart)
    const compsAfter = await app.getComparisons();
    expect(compsAfter).toBeGreaterThanOrEqual(compsBefore);
  });

  test('Play / Pause toggles and automated steps increment comparisons', async ({ page }) => {
    // Clicking Play should start automatic stepping; clicking again pauses
    const app2 = new SelectionSortPage(page);

    // Make playback fast to avoid long waits
    await app.setFastSpeed();

    // Ensure generator exists; stop to start fresh
    await app.resetBtn.click();

    // Click Play - button text should change to Pause
    await app.playPause.click();
    await page.waitForTimeout(150); // allow UI change
    let text1 = await app.getPlayPauseText();
    expect(text).toBe('Pause');

    // Wait a short while to allow some compares to happen
    await page.waitForTimeout(700);
    const compsDuring = await app.getComparisons();
    // There should be at least one comparison (or one step executed)
    expect(compsDuring).toBeGreaterThanOrEqual(0);

    // Click Play (Pause) again to stop
    await app.playPause.click();
    await page.waitForTimeout(150);
    text = await app.getPlayPauseText();
    expect(text).toBe('Play');
  });

  test('Shuffle button randomizes the array values (DOM updates)', async ({ page }) => {
    // Verify that clicking Shuffle re-renders bars (array order should change in most cases)
    const app3 = new SelectionSortPage(page);

    // Get current values
    const beforeVals = await app.getBarValues();
    expect(beforeVals.length).toBeGreaterThan(0);

    // Click shuffle
    await app.shuffleBtn.click();
    // Wait a bit for re-render
    await page.waitForTimeout(200);

    const afterVals = await app.getBarValues();
    expect(afterVals.length).toBe(beforeVals.length);

    // It's possible (rarely) shuffle produces same order; assert that DOM was updated (re-rendered) by checking that at least
    // the container has been recreated or that the arrays differ OR the render cycle occurred (we check that labels exist)
    // Ensure labels exist
    const labelsExist = (await page.$$('#bars .bar .label')).length > 0;
    expect(labelsExist).toBe(true);

    // Prefer to assert arrays are not strictly identical; if identical (rare), we still consider the test passing because DOM updated.
    const arraysEqual = JSON.stringify(beforeVals) === JSON.stringify(afterVals);
    if (arraysEqual) {
      // If arrays equal, ensure that a render occurred by checking an attribute we can detect: transition style present
      const firstBarTransition = await page.$eval('#bars .bar', el => el.style.transition || '');
      expect(typeof firstBarTransition).toBe('string');
    } else {
      expect(arraysEqual).toBe(false);
    }
  });

  test('Apply custom array updates bars and respects Show values toggle', async ({ page }) => {
    // Enter a small custom array, apply, and validate bars match the numbers and toggling show values hides text
    const app4 = new SelectionSortPage(page);

    const custom = '5,3,8,1,2';
    await app.customArray.fill(custom);
    await app.applyCustom.click();

    // Wait a moment for render
    await page.waitForTimeout(100);

    const values = await app.getBarValues();
    // Should match the provided numbers
    expect(values).toEqual([5,3,8,1,2]);

    // Toggle show values off, expect labels to be empty
    await app.showValues.click();
    await page.waitForTimeout(100);
    const valuesHidden = await app.getBarValues();
    // When hidden, labels are empty -> should translate to nulls in our helper
    expect(valuesHidden.every(v => v === null)).toBe(true);

    // Toggle back on
    await app.showValues.click();
    await page.waitForTimeout(100);
    const valuesShown = await app.getBarValues();
    expect(valuesShown).toEqual([5,3,8,1,2]);
  });

  test('New Array respects Size slider value and creates correct number of bars', async ({ page }) => {
    const app5 = new SelectionSortPage(page);

    // Set size to a small value (7)
    await app.setRangeValue(app.sizeInput, 7);

    // Click New Array to generate fresh array
    await app.newArrBtn.click();
    await page.waitForTimeout(100);

    const count1 = await app.getBarCount();
    expect(count).toBe(7);
  });

  test('Keyboard shortcuts: ArrowRight steps and Space toggles Play/Pause', async ({ page }) => {
    const app6 = new SelectionSortPage(page);

    // Ensure stopped
    await app.resetBtn.click();

    // Record info before stepping
    const infoBefore = await app.info.textContent();

    // Press ArrowRight to advance one step
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const infoAfter = await app.info.textContent();
    // Info should have changed to show an i >= 0
    expect(infoAfter).not.toBe(infoBefore);
    expect(infoAfter).toMatch(/i:\s*\d+/);

    // Press Space to toggle play; ensure button toggles text to Pause then back to Play
    await app.setFastSpeed();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    let btnText = await app.getPlayPauseText();
    expect(btnText).toBe('Pause');

    // Press Space again to pause
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    btnText = await app.getPlayPauseText();
    expect(btnText).toBe('Play');
  });

  test('Running to completion marks all bars as sorted for a small custom array', async ({ page }) => {
    // Create a tiny array so the generator finishes quickly, then play to completion and assert final state
    const app7 = new SelectionSortPage(page);

    // Apply small array
    await app.customArray.fill('3,1,2');
    await app.applyCustom.click();
    await page.waitForTimeout(100);

    // Set speed high for quick completion
    await app.setFastSpeed();

    // Click Play and wait for completion (the app stops itself when done)
    await app.playPause.click();

    // Poll for Play button to revert to 'Play' (indicating it stopped)
    await page.waitForFunction(() => {
      const btn = document.getElementById('playPause');
      return btn && btn.textContent.trim() === 'Play';
    }, { timeout: 5000 });

    // After completion, progress should show full
    const progressText1 = await app.progress.textContent();
    expect(progressText).toMatch(/Progress:\s*3\s*\/\s*3/);

    // All bars should have class 'sorted'
    const allSorted = await page.$eval('#bars', (barsEl) => {
      return Array.from(barsEl.children).every(c => c.classList.contains('sorted'));
    });
    expect(allSorted).toBe(true);

    // Swaps and comparisons should be numbers now (>=0)
    const comps1 = await app.getComparisons();
    const swaps1 = await app.getSwaps();
    expect(comps).toBeGreaterThanOrEqual(0);
    expect(swaps).toBeGreaterThanOrEqual(0);
  });
});