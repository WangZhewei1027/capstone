import { test, expect } from '@playwright/test';

test.describe('Two Pointers — Interactive Visualizer (be87d8a4... Two Pointers)', () => {
  const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be87d8a4-cd35-11f0-9e7b-93b903303299.html';

  // Helper: common selectors used across tests
  const selectors = {
    problemSelect: '#problem',
    arrayInput: '#array',
    targetInput: '#target',
    startBtn: '#start',
    pauseBtn: '#pause',
    stepBtn: '#step',
    resetBtn: '#reset',
    randomBtn: '#random',
    clearBtn: '#clear-array',
    ex1Btn: '#ex1',
    ex2Btn: '#ex2',
    ex3Btn: '#ex3',
    sortBtn: '#sort-array',
    shuffleBtn: '#shuffle-array',
    speedRange: '#speed',
    speedLabel: '#speed-label',
    arrayVis: '#array-vis',
    log: '#log',
    pseudocode: '#pseudocode',
    problemTitle: '#problem-title',
    infoExtra: '#info-extra'
  };

  // Attach listeners and open page for each test to keep isolation
  test.beforeEach(async ({ page }) => {
    // collect console errors and page errors for assertions
    page.context()._consoleErrors = [];
    page.context()._pageErrors = [];

    page.on('console', msg => {
      // capture only error-level console messages for later assertions
      if (msg.type() === 'error') {
        page.context()._consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      page.context()._pageErrors.push(err.message);
    });

    await page.goto(URL);
    // ensure initial rendering and scripts have had a short time to run
    await page.waitForTimeout(100);
  });

  test.afterEach(async ({ page }) => {
    // Sanity: assert no unexpected runtime errors were emitted to console or page
    const consoleErrors = page.context()._consoleErrors || [];
    const pageErrors = page.context()._pageErrors || [];
    // It's valid for some tests to trigger alerts/dialogs; but we expect no uncaught exceptions
    expect(consoleErrors, `Unexpected console.error messages: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('Initial load: UI elements present and default problem is Pair Sum', async ({ page }) => {
    // Verify header and initial UI state
    await expect(page.locator('h1')).toHaveText('Two Pointers — Interactive Visualizations');

    // Default problem select value and title
    const problemVal = await page.$eval(selectors.problemSelect, el => el.value);
    expect(problemVal).toBe('pair');
    await expect(page.locator(selectors.problemTitle)).toHaveText('Pair Sum (sorted array)');

    // Array visual shows empty hint
    await expect(page.locator(selectors.arrayVis)).toContainText('Array is empty');

    // Log should indicate problem changed during initialization
    await expect(page.locator(selectors.log)).toContainText('Problem changed. Enter inputs and press Start.');

    // Pseudocode should be empty initially (changed by problem change then cleared); ensure it's present (may be empty)
    await expect(page.locator(selectors.pseudocode)).toBeVisible();
  });

  test('Invalid array input triggers alert and does not start', async ({ page }) => {
    // Enter invalid array text and click Start -> should show alert with specific message
    await page.fill(selectors.arrayInput, 'a b c');
    // Intercept dialog
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await page.click(selectors.startBtn);
    // Wait a bit for dialog to be handled
    await page.waitForTimeout(200);

    expect(dialogMessage).toBe('Invalid array input — use only numbers separated by spaces or commas.');

    // Ensure log has not started playback
    await expect(page.locator(selectors.log)).not.toContainText('Starting playback...');

    // Ensure no uncaught runtime errors (checked in afterEach)
  });

  test('Clear button empties inputs, updates view and logs', async ({ page }) => {
    // Pre-fill array and target so clear has effect
    await page.fill(selectors.arrayInput, '1 2 3');
    await page.fill(selectors.targetInput, '5');

    await page.click(selectors.clearBtn);
    // Wait for UI update
    await page.waitForTimeout(100);

    // Inputs should be cleared
    const arrVal = await page.$eval(selectors.arrayInput, el => el.value);
    const targetVal = await page.$eval(selectors.targetInput, el => el.value);
    expect(arrVal).toBe('');
    expect(targetVal).toBe('');

    // Visual should indicate empty array
    await expect(page.locator(selectors.arrayVis)).toContainText('Array is empty');

    // Log should include 'Cleared array.'
    await expect(page.locator(selectors.log)).toContainText('Cleared array.');
  });

  test('Sort and Shuffle buttons update array and log appropriately', async ({ page }) => {
    // Set an unsorted array
    await page.fill(selectors.arrayInput, '3 1 2');
    await page.click(selectors.sortBtn);
    await page.waitForTimeout(100); // allow logging/render

    // Sorted value expected
    const sorted = await page.$eval(selectors.arrayInput, el => el.value);
    expect(sorted.split(/\s+/).map(Number)).toEqual([1, 2, 3]);
    await expect(page.locator(selectors.log)).toContainText('Array sorted.');

    // Now shuffle - we expect a log message "Array shuffled." and array value to update
    await page.click(selectors.shuffleBtn);
    await page.waitForTimeout(100);
    await expect(page.locator(selectors.log)).toContainText('Array shuffled.');
    // Ensure array input still contains three numbers after shuffle
    const postShuffle = await page.$eval(selectors.arrayInput, el => el.value);
    expect(postShuffle.trim().split(/[\s,]+/).length).toBe(3);
  });

  test('Pair Sum example (ex3) plays and highlights found pair', async ({ page }) => {
    // Speed up playback for test
    await page.fill(selectors.speedRange, '50');
    await page.click(selectors.ex3Btn); // loads example array and target
    await page.waitForTimeout(100);

    // Confirm inputs set correctly
    const arrVal1 = await page.$eval(selectors.arrayInput, el => el.value);
    const targetVal1 = await page.$eval(selectors.targetInput, el => el.value);
    expect(arrVal).toContain('1 2 3 4 5 6 7 8');
    expect(targetVal).toBe('11');

    // Intercept any confirm dialogs that might appear (prepare may ask to sort)
    page.on('dialog', async dialog => {
      // allow confirm to auto-accept (OK=sort) so that normal flow continues
      await dialog.accept();
    });

    // Start playback
    await page.click(selectors.startBtn);

    // Wait until a "found" log appears (generateStepsPairSum logs "found a[")
    await page.waitForFunction(() => {
      const el = document.getElementById('log');
      return el && /found a\[\d+\] \+ a\[\d+\]/i.test(el.innerText);
    }, null, { timeout: 5000 });

    // Ensure at least two bars have the 'found' visual class applied
    const foundBars = await page.$$eval('#array-vis .bar.found', els => els.length);
    expect(foundBars).toBeGreaterThanOrEqual(2);

    // Finalize: expect playback finished message
    await page.waitForFunction(() => {
      const el1 = document.getElementById('log');
      return el && /Playback finished\./i.test(el.innerText);
    }, null, { timeout: 3000 });
  });

  test('Remove Duplicates example (ex1) runs and reports new length', async ({ page }) => {
    // Use example 1 which sets problem to 'remove' and a sample sorted array with duplicates
    await page.click(selectors.ex1Btn);
    // Speed up and start
    await page.fill(selectors.speedRange, '50');

    // There should be no target input shown for 'remove'
    await expect(page.locator(selectors.infoExtra)).toContainText('Requires sorted array');

    // Start and wait for final "new length" message in the logs
    await page.click(selectors.startBtn);

    // Wait for "new length" message
    await page.waitForFunction(() => {
      const el2 = document.getElementById('log');
      return el && /new length = \d+/i.test(el.innerText);
    }, null, { timeout: 5000 });

    // Pseudocode area should indicate Remove duplicates
    await expect(page.locator(selectors.pseudocode)).toContainText('Remove duplicates (sorted array)');
  });

  test('Container With Most Water example (ex2) finds max area and logs best', async ({ page }) => {
    // Use container example
    await page.click(selectors.ex2Btn);
    await page.fill(selectors.speedRange, '50');

    // Start playback
    await page.click(selectors.startBtn);

    // Wait for 'new best=' or final done message
    await page.waitForFunction(() => {
      const el3 = document.getElementById('log');
      return el && (/new best=/i.test(el.innerText) || /max area = /i.test(el.innerText));
    }, null, { timeout: 5000 });

    // Verify that pseudocode shows the container approach
    await expect(page.locator(selectors.pseudocode)).toContainText('Container With Most Water');

    // Also ensure that 'done. max area' appears in the logs
    await page.waitForFunction(() => {
      const el4 = document.getElementById('log');
      return el && /done\. max area = /i.test(el.innerText);
    }, null, { timeout: 3000 });
  });

  test('Manual step and reset behavior for Pair Sum', async ({ page }) => {
    // Prepare a simple pair-sum case manually
    await page.fill(selectors.arrayInput, '1 3 5 7 9');
    await page.fill(selectors.targetInput, '12'); // 5+7
    // Ensure array is sorted — click sort to avoid confirm dialogs
    await page.click(selectors.sortBtn);
    await page.waitForTimeout(50);

    // Click Step to run one step at a time
    await page.click(selectors.stepBtn);

    // After one step, log should have at least one entry and visual should show pointers
    await expect(page.locator(selectors.log)).toContainText('start left=0, right=');

    // Step repeatedly until completion
    for (let i = 0; i < 10; i++) {
      await page.click(selectors.stepBtn);
      await page.waitForTimeout(50);
    }

    // Eventually we should see either 'found' or 'No more steps.' in the log
    const logText = await page.$eval(selectors.log, el => el.innerText);
    expect(/found a\[\d+\] \+ a\[\d+\]|No more steps\.|Done\./i.test(logText)).toBeTruthy();

    // Now click Reset to re-render initial array and clear steps
    await page.click(selectors.resetBtn);
    await page.waitForTimeout(100);
    await expect(page.locator(selectors.log)).toContainText('Reset. Steps cleared. Press Start to run again.');
    // Visual should be back to showing the full array
    const barsCount = await page.$$eval('#array-vis .bar', els => els.length);
    expect(barsCount).toBeGreaterThanOrEqual(5);
  });

  test('Speed slider updates displayed label', async ({ page }) => {
    // Change speed slider and verify label text updates
    await page.fill(selectors.speedRange, '150');
    // Trigger input event manually to update the label (script listens for 'input')
    await page.$eval(selectors.speedRange, el => el.dispatchEvent(new Event('input')));
    await expect(page.locator(selectors.speedLabel)).toHaveText('150ms');
  });

  test('Ensure problem switch updates UI visibility and resets state', async ({ page }) => {
    // Switch to 'remove' via select and verify UI adjustments
    await page.selectOption(selectors.problemSelect, 'remove');
    await page.waitForTimeout(100);
    await expect(page.locator(selectors.infoExtra)).toContainText('Requires sorted array');
    // The pseudocode area should be reset
    const pcText = await page.$eval(selectors.pseudocode, el => el.textContent.trim());
    expect(pcText).toBe('');
    // Log should instruct entering inputs
    await expect(page.locator(selectors.log)).toContainText('Problem changed. Enter inputs and press Start.');
  });
});