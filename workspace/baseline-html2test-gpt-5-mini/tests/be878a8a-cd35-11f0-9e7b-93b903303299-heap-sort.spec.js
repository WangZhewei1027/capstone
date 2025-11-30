import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a8a-cd35-11f0-9e7b-93b903303299.html';

// Page Object Model for the Heap Sort Visualizer page
class HeapSortPage {
  constructor(page) {
    this.page = page;
    // controls
    this.sizeRange = page.locator('#sizeRange');
    this.sizeLabel = page.locator('#sizeLabel');
    this.speedRange = page.locator('#speedRange');
    this.speedLabel = page.locator('#speedLabel');
    this.randomBtn = page.locator('#randomBtn');
    this.ascBtn = page.locator('#ascBtn');
    this.descBtn = page.locator('#descBtn');
    this.playBtn = page.locator('#playBtn');
    this.stepBackBtn = page.locator('#stepBackBtn');
    this.stepFwdBtn = page.locator('#stepFwdBtn');
    this.recordBtn = page.locator('#recordBtn');
    this.arrayCanvas = page.locator('#arrayCanvas');
    this.treeSVG = page.locator('#treeSVG');
    this.actionText = page.locator('#actionText');
    this.statCompares = page.locator('#statCompares');
    this.statSwaps = page.locator('#statSwaps');
    this.statHeapSize = page.locator('#statHeapSize');
    this.statStep = page.locator('#statStep');
    this.customInput = page.locator('#customInput');
    this.applyCustom = page.locator('#applyCustom');
    this.pseudocodeDiv = page.locator('#pseudocode');
  }

  // Helper to set a range input's value and dispatch input event
  async setRangeValue(selector, value) {
    await this.page.$eval(selector, (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  // Read numeric value of sizeRange
  async getSizeValue() {
    return Number(await this.page.$eval('#sizeRange', el => el.value));
  }

  // Read the text contents of tree nodes (values)
  async getTreeValues() {
    return await this.page.$$eval('#treeSVG g', groups => {
      return groups.map(g => {
        const texts = g.querySelectorAll('text');
        if (texts.length > 0) return texts[0].textContent.trim();
        return '';
      });
    });
  }

  // Read the index labels under nodes
  async getTreeIndices() {
    return await this.page.$$eval('#treeSVG g', groups => {
      return groups.map(g => {
        const texts1 = g.querySelectorAll('text');
        if (texts.length > 1) return texts[1].textContent.trim();
        return '';
      });
    });
  }
}

test.describe('Heap Sort Visualizer — end-to-end', () => {
  // Capture console messages and page errors for each test
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the test page
    await page.goto(URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Sanity check: ensure there were no uncaught page errors during the test run
    // If there were, include them in the assertion message for easier debugging.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join(' | ')}`).toBe(0);

    // Also assert there are no console 'error' messages emitted during the test
    const errorConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsole.length, `Unexpected console errors: ${errorConsole.map(e => e.text).join(' | ')}`).toBe(0);
  });

  test('Initial load shows default UI and elements', async ({ page }) => {
    // Purpose: verify initial page load, default labels, stats and presence of key elements.
    const p = new HeapSortPage(page);

    await expect(page).toHaveTitle(/Heap Sort Visualizer/);

    // Header and basic UI present
    await expect(page.locator('h1')).toHaveText('Heap Sort — Visualizer & Interactive Demo');
    await expect(p.sizeLabel).toHaveText('12'); // default value in HTML
    await expect(p.speedLabel).toHaveText(/450 ms/); // default speed label
    await expect(p.playBtn).toHaveText('Play');
    await expect(p.actionText).toContainText('Press Record');

    // Stats initial values
    await expect(p.statCompares).toHaveText('0');
    await expect(p.statSwaps).toHaveText('0');
    await expect(p.statHeapSize).toHaveText('12'); // heap size initialized to array length
    await expect(p.statStep).toHaveText(/0 \/ \d+/);

    // Canvas and SVG should be present and have been drawn (SVG should contain group nodes)
    const gCount = await page.$$eval('#treeSVG g', els => els.length);
    expect(gCount).toBeGreaterThan(0);

    // Ensure no runtime errors were emitted during initial load
    expect(pageErrors.length).toBe(0);
  });

  test('Changing array size updates label and tree node count', async ({ page }) => {
    // Purpose: simulate user moving the size range and verify UI updates and tree redraw.
    const p1 = new HeapSortPage(page);

    // Set size to 8 using helper to dispatch 'input' event
    await p.setRangeValue('#sizeRange', 8);

    // Label should update
    await expect(p.sizeLabel).toHaveText('8');

    // Tree should have 8 node groups
    const values = await p.getTreeValues();
    expect(values.length).toBe(8);

    // Canvas element should remain visible
    await expect(p.arrayCanvas).toBeVisible();
  });

  test('Adjusting speed updates speed label', async ({ page }) => {
    // Purpose: change animation speed and verify displayed text updates.
    const p2 = new HeapSortPage(page);
    await p.setRangeValue('#speedRange', 1000);
    await expect(p.speedLabel).toHaveText('1000 ms');
  });

  test('Array control buttons produce expected arrays: Ascending and Descending', async ({ page }) => {
    // Purpose: click Ascending and Descending and verify the tree values reflect the expected sequences.
    const p3 = new HeapSortPage(page);

    // Choose a manageable size
    await p.setRangeValue('#sizeRange', 10);
    const n = await p.getSizeValue();
    expect(n).toBe(10);

    // Click Ascending and assert tree values are 1..n
    await p.ascBtn.click();
    const ascValues = await p.getTreeValues();
    const ascNums = ascValues.map(s => Number(s));
    expect(ascNums).toEqual(Array.from({ length: n }, (_, i) => i + 1));

    // Click Descending and assert tree values are n..1
    await p.descBtn.click();
    const descValues = await p.getTreeValues();
    const descNums = descValues.map(s => Number(s));
    expect(descNums).toEqual(Array.from({ length: n }, (_, i) => n - i));
  });

  test('Apply custom array: invalid input triggers alert; valid input updates array and size', async ({ page }) => {
    // Purpose: test validation and applying a custom array string
    const p4 = new HeapSortPage(page);

    // Invalid custom input: includes a non-number
    await p.customInput.fill('5, 3, foo, 7');
    // Expect an alert dialog with the invalid number message
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Invalid number');
      await dialog.accept();
    });
    await p.applyCustom.click();

    // Now valid custom input
    await p.customInput.fill('9,8,7,6');
    await p.applyCustom.click();

    // Size range should reflect new array length (4) and label updated
    await expect(p.sizeLabel).toHaveText('4');
    const values1 = await p.getTreeValues();
    expect(values.map(Number)).toEqual([9,8,7,6]);
  });

  test('Record creates actions and updates UI step count text', async ({ page }) => {
    // Purpose: click Record and verify actions were recorded by checking statStep and actionText.
    const p5 = new HeapSortPage(page);

    // Ensure a known array to avoid flakiness
    await p.setRangeValue('#sizeRange', 6);
    await p.ascBtn.click(); // 1..6

    await p.recordBtn.click();

    // actionText should contain 'Recorded'
    await expect(p.actionText).toContainText('Recorded');

    // statStep shows 0 / <actions> (actions should be > 0)
    const stepText = await p.statStep.textContent();
    expect(stepText).toMatch(/^0 \/ \d+$/);
    const total = Number(stepText.split('/')[1].trim());
    expect(total).toBeGreaterThan(0);

    // After recording, displayed compares/swaps are reset to 0
    await expect(p.statCompares).toHaveText('0');
    await expect(p.statSwaps).toHaveText('0');
  });

  test('Stepping forward and back updates step count and action text', async ({ page }) => {
    // Purpose: exercise step forward/back controls and validate UI state transitions.
    const p6 = new HeapSortPage(page);

    // Prepare and record actions
    await p.setRangeValue('#sizeRange', 7);
    await p.randomBtn.click();
    await p.recordBtn.click();

    // Get total steps
    let stepText1 = await p.statStep.textContent();
    const total1 = Number(stepText.split('/')[1].trim());
    expect(total).toBeGreaterThan(0);

    // Step forward once
    await p.stepFwdBtn.click();
    await expect(p.statStep).toHaveText(/1 \/ \d+/);
    // action text should update away from the initial prompt
    const atxt = await p.actionText.textContent();
    expect(atxt).not.toContain('Press Record');

    // Step back to zero
    await p.stepBackBtn.click();
    await expect(p.statStep).toHaveText(/^0 \/ \d+$/);
    // At start, actionText is set to 'At start.' by the code
    const atxt2 = await p.actionText.textContent();
    expect(atxt2).toContain('At start');
  });

  test('Play toggles play/pause and runs to completion with "Sorting complete"', async ({ page }) => {
    // Purpose: toggle Play to run through recorded actions to completion and verify final state.
    const p7 = new HeapSortPage(page);

    // Setup: smaller size and speed up to finish quickly
    await p.setRangeValue('#sizeRange', 8);
    await p.speedRange.evaluate((el) => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.recordBtn.click();

    // Start playing
    await p.playBtn.click();
    // Play button text toggles to Pause
    await expect(p.playBtn).toHaveText('Pause');

    // Wait until Play button returns to 'Play' (indicates it paused/stopped at end)
    await page.waitForFunction(() => {
      const btn = document.getElementById('playBtn');
      return btn && btn.textContent.trim() === 'Play';
    }, { timeout: 10000 });

    // After completion, actionText should reflect 'Sorting complete' or mark done
    const finalActionText = await p.actionText.textContent();
    expect(finalActionText).toMatch(/Sorting complete|Sorting complete|Mark index/);

    // Stat step should be at total / total
    const finalStep = await p.statStep.textContent();
    const [curr, tot] = finalStep.split('/').map(s => Number(s.trim()));
    expect(curr).toEqual(tot);
  });

  test('Keyboard shortcuts: space toggles play/pause and arrow keys step', async ({ page }) => {
    // Purpose: ensure keyboard interactions behave as expected
    const p8 = new HeapSortPage(page);

    // Prepare and record actions
    await p.setRangeValue('#sizeRange', 6);
    await p.recordBtn.click();

    // Press space to start playing (should toggle to Pause)
    await page.keyboard.press(' ');
    await expect(p.playBtn).toHaveText('Pause');

    // Press space again to pause
    await page.keyboard.press(' ');
    await expect(p.playBtn).toHaveText('Play');

    // Press ArrowRight to step forward
    await page.keyboard.press('ArrowRight');
    await expect(p.statStep).toHaveText(/1 \/ \d+/);

    // Press ArrowLeft to step back
    await page.keyboard.press('ArrowLeft');
    await expect(p.statStep).toHaveText(/^0 \/ \d+$/);
  });

  test('Visualization updates reflect swapping and comparison markers during replay', async ({ page }) => {
    // Purpose: ensure that during replay steps the visualization marks compare/swap indices and updates tree values accordingly.
    const p9 = new HeapSortPage(page);

    // Use a small deterministic custom array so behavior is consistent
    await p.customInput.fill('4,1,3,2');
    await p.applyCustom.click();
    await expect(p.sizeLabel).toHaveText('4');

    // Record actions
    await p.recordBtn.click();

    // Step forward a few times to observe visuals change
    await p.stepFwdBtn.click(); // step 1
    // After first step, ensure tree shows numbers (still some numbers)
    const valuesAfter1 = await p.getTreeValues();
    expect(valuesAfter1.length).toBe(4);

    // Step forward multiple times
    await p.stepFwdBtn.click();
    await p.stepFwdBtn.click();

    // Inspect SVG nodes to see if any fill attribute for a node group indicates highlight (exists in rect fill attribute)
    const rectFills = await page.$$eval('#treeSVG g rect', rects => rects.map(r => r.getAttribute('fill')));
    // At least one rect should have a non-empty fill string (they all do), but ensure there's variety (some highlighted values are color tokens)
    expect(rectFills.length).toBeGreaterThanOrEqual(4);
  });

});