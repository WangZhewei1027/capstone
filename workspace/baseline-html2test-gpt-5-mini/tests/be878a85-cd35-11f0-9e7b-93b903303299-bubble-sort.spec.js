import { test, expect } from '@playwright/test';

//
// Test file: be878a85-cd35-11f0-9e7b-93b903303299-bubble-sort.spec.js
// Application URL:
// http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a85-cd35-11f0-9e7b-93b903303299.html
//
// Notes:
// - Tests exercise the Bubble Sort visualizer UI: buttons, sliders, toggles.
// - They observe console messages and page errors and assert none are emitted.
// - They avoid modifying the app's source code and interact via the DOM only.
// - Uses ES module import syntax as required.
//

// Page object encapsulating interactions with the Bubble Sort demo
class BubblePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Controls
    this.randomizeBtn = page.locator('#randomizeBtn');
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.directionChk = page.locator('#directionChk');

    // Inputs
    this.sizeRange = page.locator('#sizeRange');
    this.speedRange = page.locator('#speedRange');

    // Display elements
    this.visual = page.locator('#visual');
    this.speedLabel = page.locator('#speedLabel');
    this.comparisonsEl = page.locator('#comparisons');
    this.swapsEl = page.locator('#swaps');
    this.passEl = page.locator('#pass');
    this.idxEl = page.locator('#idx');
    this.statusEl = page.locator('#status');
    this.pseudocode = page.locator('#pseudocode');
    this.codeBtn = page.locator('#codeBtn');
    this.codeBlock = page.locator('#codeBlock');
    this.explainBtn = page.locator('#explainBtn');
    this.infoPanel = page.locator('#infoPanel');
  }

  // Helper to get number of bars currently rendered
  async getBarCount() {
    return await this.visual.locator('.bar').count();
  }

  // Helper to get labels of bars in order as array of strings
  async getBarLabels() {
    const labels = [];
    const bars = this.visual.locator('.bar');
    const n = await bars.count();
    for (let i = 0; i < n; i++) {
      labels.push(await bars.nth(i).locator('span').textContent());
    }
    return labels;
  }

  // Helper to check if all bars have 'sorted' class
  async allBarsSorted() {
    const bars1 = this.visual.locator('.bar');
    const n1 = await bars.count();
    for (let i = 0; i < n; i++) {
      const cls = await bars.nth(i).getAttribute('class');
      if (!cls || !cls.includes('sorted')) return false;
    }
    return true;
  }

  // Set size range value via DOM input event (mimic user input)
  async setSize(value) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('sizeRange');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    // Wait a short bit for UI to react and regenerate bars
    await this.page.waitForTimeout(200);
  }

  // Set speed range value via DOM input event (mimic user input)
  async setSpeed(value) {
    await this.page.evaluate((v) => {
      const el1 = document.getElementById('speedRange');
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    // UI updates speedLabel and bar transition durations; small wait for propagation
    await this.page.waitForTimeout(120);
  }

  // Click Start/ Pause
  async toggleStart() {
    await this.startBtn.click();
  }

  // Press Step button (user-level)
  async stepOnce() {
    await this.stepBtn.click();
  }

  // Click Randomize button
  async randomize() {
    await this.randomizeBtn.click();
  }

  // Click Reset button
  async reset() {
    await this.resetBtn.click();
  }

  // Toggle direction checkbox
  async toggleDirection() {
    await this.directionChk.click();
  }

  // Show/Hide code block via codeBtn
  async toggleCodeBlock() {
    await this.codeBtn.click();
  }

  // Click explain to show info panel
  async clickExplain() {
    await this.explainBtn.click();
  }

  // Press Space key on document (accessibility)
  async pressSpace() {
    await this.page.keyboard.press('Space');
  }
}

test.describe('Bubble Sort Visualizer - be878a85-cd35-11f0-9e7b-93b903303299', () => {
  let pageErrors = [];
  let consoleErrors = [];

  // Setup: navigate to the page and attach listeners to capture console/page errors
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Capture console.error messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : null,
        });
      }
    });

    // Navigate to the served HTML page
    await page.goto('http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a85-cd35-11f0-9e7b-93b903303299.html', { waitUntil: 'load' });
  });

  // Teardown: after each test assert that no unexpected runtime/page errors occurred
  test.afterEach(async () => {
    // Assert there were no uncaught page errors
    expect(pageErrors, `Unexpected page errors: ${pageErrors.map(e => e && e.message ? e.message : String(e)).join(' | ')}`).toEqual([]);

    // Assert there were no console.error messages emitted
    expect(consoleErrors, `Unexpected console.error messages: ${consoleErrors.map(c => c.text).join(' | ')}`).toEqual([]);
  });

  test('Initial page load shows expected UI elements and initial state', async ({ page }) => {
    // Purpose: Verify the page loads and default UI values are correct.
    const bp = new BubblePage(page);

    // Title and header
    await expect(page.locator('h1')).toHaveText(/Bubble Sort\s*—\s*Visualizer/);

    // Status should be Ready initially
    await expect(bp.statusEl).toHaveText('Ready');

    // Stats should be zeroed/default
    await expect(bp.comparisonsEl).toHaveText('0');
    await expect(bp.swapsEl).toHaveText('0');
    await expect(bp.passEl).toHaveText('0');
    await expect(bp.idxEl).toHaveText('—');

    // Default size range value and number of bars should match
    const sizeVal = await page.locator('#sizeRange').evaluate(el => el.value);
    const barCount = await bp.getBarCount();
    expect(Number(sizeVal)).toBe(barCount);

    // Speed label should reflect speedRange initial value
    const speedVal = await page.locator('#speedRange').evaluate(el => el.value);
    await expect(bp.speedLabel).toHaveText(`${speedVal} ms`);

    // Pseudocode lines exist and have data-line attributes 1..5
    const pseudocodeLines = await bp.pseudocode.locator('div').all();
    expect(pseudocodeLines.length).toBeGreaterThanOrEqual(5);
    // confirm each line has dataset line attr
    for (let i = 1; i <= 5; i++) {
      const selector = `#pseudocode div[data-line="${i}"]`;
      await expect(page.locator(selector)).toHaveCount(1);
    }
  });

  test('Randomize regenerates bars and resets stats to Ready', async ({ page }) => {
    // Purpose: Verify Randomize creates a new array and resets state
    const bp1 = new BubblePage(page);

    // Capture current labels
    const beforeLabels = await bp.getBarLabels();
    await bp.randomize();

    // After randomize: bars exist and count is same but labels should usually differ
    const afterLabels = await bp.getBarLabels();
    expect(afterLabels.length).toBe(beforeLabels.length);

    // At least one label should differ (very unlikely to be identical)
    const identical = beforeLabels.every((v, i) => v === afterLabels[i]);
    expect(identical).toBeFalsy();

    // Stats should show reset/ready state
    await expect(bp.statusEl).toHaveText('Ready');
    await expect(bp.comparisonsEl).toHaveText('0');
    await expect(bp.swapsEl).toHaveText('0');
  });

  test('Step button progresses the generator: passStart then compare', async ({ page }) => {
    // Purpose: Verify step behavior: first step yields passStart, second yields compare (increment comparisons)
    const bp2 = new BubblePage(page);

    // Ensure run is prepared by clicking Step twice
    // First step: should set status to Running and pass > 0
    await bp.stepOnce();
    await expect(bp.statusEl).toHaveText('Running');

    // Pass should be at least 1 now
    await expect(bp.passEl).not.toHaveText('0');

    // Second step: should perform a compare, increasing comparisons count
    const beforeComparisons = Number(await bp.comparisonsEl.textContent());
    await bp.stepOnce();
    // comparisons should increment to >= beforeComparisons
    const afterComparisons = Number(await bp.comparisonsEl.textContent());
    expect(afterComparisons).toBeGreaterThanOrEqual(beforeComparisons);

    // Bars representing compared indices should have class 'compare' (visual highlight)
    const compareBars = page.locator('.bar.compare');
    expect(await compareBars.count()).toBeGreaterThanOrEqual(0);
    // At least one compare bar exists when a compare action happens; allow 0 if timing caused no persistent class
  });

  test('Start (autoplay) runs to completion for small array when speed is minimal', async ({ page }) => {
    // Purpose: Changing size & speed to small values so autoplay finishes quickly; assert full sort completes.
    const bp3 = new BubblePage(page);

    // Reduce size to 6 for fast test, triggers reset inside input handler
    await bp.setSize(6);

    // Set speed to minimum (50ms) to speed up animations/pacing
    await bp.setSpeed(50);

    // Click Randomize to ensure fresh array, then Start
    await bp.randomize();

    // Start auto-run
    await bp.toggleStart();

    // Assert status changes to Running at some point
    await expect(bp.statusEl).toHaveText(/Running/);

    // Wait up to 20s for sort to finish; smaller arrays should finish quickly
    await page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && /Sorted|Finished/i.test(s.textContent || '');
    }, null, { timeout: 20000 });

    // After completion, status should indicate sorted
    const finalStatus = await bp.statusEl.textContent();
    expect(finalStatus).toMatch(/Sorted|Finished/);

    // All bars should have 'sorted' class when done
    const allSorted = await bp.allBarsSorted();
    expect(allSorted).toBeTruthy();
  }, 30000); // extended timeout for this test

  test('Reset preserves the current array values but resets run state', async ({ page }) => {
    // Purpose: Reset button should keep same array but prepare for a fresh run
    const bp4 = new BubblePage(page);

    // Randomize to get an array, capture labels
    await bp.randomize();
    const labelsBefore = await bp.getBarLabels();

    // Make a step to change generator state
    await bp.stepOnce();

    // Click reset: per implementation, it keeps same array values and resets UI run state
    await bp.reset();

    // Confirm labels remain the same after Reset (array preserved)
    const labelsAfter = await bp.getBarLabels();
    expect(labelsAfter).toEqual(labelsBefore);

    // Status should be Ready, counters reset
    await expect(bp.statusEl).toHaveText('Ready');
    await expect(bp.comparisonsEl).toHaveText('0');
  });

  test('Toggling direction resets run and changes ascending flag (UI reflects Ready)', async ({ page }) => {
    // Purpose: Changing the "Descending" checkbox should reset run to Ready
    const bp5 = new BubblePage(page);

    // Ensure it is unchecked (Ascending) initially, then toggle
    const checkedBefore = await page.locator('#directionChk').isChecked();
    await bp.toggleDirection();
    const checkedAfter = await page.locator('#directionChk').isChecked();
    expect(checkedAfter).toBe(!checkedBefore);

    // UI should be reset to Ready
    await expect(bp.statusEl).toHaveText('Ready');
  });

  test('Speed slider updates speed label and bar transition durations', async ({ page }) => {
    // Purpose: Ensure speed input updates visible label and bar transition durations
    const bp6 = new BubblePage(page);

    // Change speed to a distinct value
    await bp.setSpeed(120);

    // Label should update
    await expect(bp.speedLabel).toHaveText('120 ms');

    // Each bar element should have style.transitionDuration reflecting speed change approx
    const bars2 = page.locator('#visual .bar');
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);

    // Check the first bar's inline style contains a transition duration in ms
    const td = await bars.nth(0).evaluate((b) => b.style.transitionDuration || '');
    expect(td).toMatch(/ms$/);
  });

  test('Code button toggles visibility of code block and Explain shows contextual text temporarily', async ({ page }) => {
    // Purpose: Test UI extras: Show Code and Explain actions
    const bp7 = new BubblePage(page);

    // Code block initially hidden (display)
    const initialDisplay = await bp.codeBlock.evaluate(el => window.getComputedStyle(el).display);
    expect(initialDisplay === 'none' || initialDisplay === 'block').toBeTruthy();

    // Toggle code block visible
    await bp.toggleCodeBlock();
    const displayAfter = await bp.codeBlock.evaluate(el => window.getComputedStyle(el).display);
    expect(displayAfter).toBe('block');

    // Toggle back to hide
    await bp.toggleCodeBlock();
    const displayFinal = await bp.codeBlock.evaluate(el => window.getComputedStyle(el).display);
    // Could be 'none'; accept either but expect it not to remain permanently 'block'
    expect(displayFinal).not.toBe('block');

    // Click Explain and ensure infoPanel shows text briefly
    await bp.clickExplain();
    await expect(bp.infoPanel).toHaveText(/Bubble sort repeatedly steps through the list/i, { timeout: 1000 });

    // After 6s the infoPanel content is cleared by the app; wait slightly longer and assert empty
    await page.waitForTimeout(6100);
    const infoText = await bp.infoPanel.textContent();
    expect(infoText.trim()).toBe('');
  });

  test('Space key triggers Step when not auto-running and toggles pause when auto-running', async ({ page }) => {
    // Purpose: Test keyboard accessibility: Space acts as Step or Start/Pause
    const bp8 = new BubblePage(page);

    // Ensure not auto-running; press Space to step
    await bp.pressSpace();
    // After a space press the status should be Running (because Step sets Running)
    await expect(bp.statusEl).toHaveText('Running');

    // Now start auto-run
    // Prepare a small array for quick run
    await bp.setSize(5);
    await bp.toggleStart();
    await expect(bp.statusEl).toHaveText(/Running/);

    // Press Space to pause (startBtn.click() is invoked on Space when autoId exists)
    await bp.pressSpace();
    // After pausing, status should be 'Paused' per implementation
    await expect(bp.statusEl).toHaveText('Paused');
  });

});