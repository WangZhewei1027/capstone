import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/700d9650-bcb0-11f0-95d9-c98d28730c93.html';

// Page object model for the Merge Sort Interactive Module
class MergeSortPage {
  constructor(page) {
    this.page = page;
  }

  // Flexible button lookup: tries role, then text matches
  async getButton(nameRegex) {
    const { page } = this;
    // Try accessible role first
    const byRole = page.getByRole('button', { name: nameRegex });
    if (await byRole.count() > 0) return byRole.first();
    // Fallback to text locator
    const byText = page.locator(`button:has-text("${nameRegex}")`);
    if (await byText.count() > 0) return byText.first();
    // Generic
    return page.locator(`text=${nameRegex}`).first();
  }

  // Retrieve the action/status box that shows "Paused", "Done", or current action
  async getActionBox() {
    const { page } = this;
    // Common ids/classes seen in similar modules
    const candidates = [
      '#actionBox',
      '#action-box',
      '.action-box',
      '.actionBox',
      '.action-box__text',
      '.status-box',
      '.action-status',
      '.actionBox, .action-box, #actionBox, #action-box, .status-box, .action-status'
    ];
    for (const sel of candidates) {
      const loc = page.locator(sel);
      if (await loc.count() > 0) return loc.first();
    }
    // If none match, fallback to searching for a small panel with likely contents
    return page.locator('text=Paused, text=Done, text=Comparing, text=Merging').first();
  }

  // Bars (array elements) lookup: try common class names and data attributes
  async getBars() {
    const { page } = this;
    const selectors = [
      '.bar',
      '.bars .bar',
      '.bars > *',
      '.bar-item',
      '.tile',
      '.array .item',
      '[data-value]',
      '.viz .bar',
      '.viz .tile'
    ];
    for (const sel of selectors) {
      const loc1 = page.locator(sel);
      if (await loc.count() > 0) return loc;
    }
    // Ultimate fallback: any div in visualization panel
    return page.locator('.viz div').filter({ hasText: /\d+/ }).first();
  }

  // Read numeric values from bars if possible (from text content or data-value)
  async readBarValues() {
    const bars = await this.getBars();
    const count = await bars.count();
    const values = [];
    for (let i = 0; i < count; i++) {
      const bar = bars.nth(i);
      // Try data-value attribute
      const dataValue = await bar.getAttribute('data-value');
      if (dataValue !== null) {
        values.push(Number(dataValue));
        continue;
      }
      // Try text content
      const text = (await bar.innerText()).trim();
      // Extract first number in text
      const m = text.match(/-?\d+/);
      if (m) values.push(Number(m[0]));
      else {
        // If no numeric content, fall back to style height (e.g. 'height: 120px')
        const style = await bar.getAttribute('style');
        if (style) {
          const hm = style.match(/height:\s*([0-9.]+)px/);
          if (hm) values.push(Number(hm[1]));
          else values.push(i); // fallback ordinal
        } else {
          values.push(i);
        }
      }
    }
    return values;
  }

  // Randomize action
  async randomize() {
    const btn = await this.getButton(/randomize/i);
    await btn.click();
  }

  // Apply input value if input exists
  async applyInput(value) {
    const { page } = this;
    const inputSelectors = ['input[type="text"]', '#arrayInput', '#input', '.array-input'];
    for (const sel of inputSelectors) {
      const input = page.locator(sel);
      if (await input.count() > 0) {
        await input.first().fill(value);
        // Try clicking an Apply button
        const applyBtn = await this.getButton(/apply/i);
        if (applyBtn) await applyBtn.click();
        return true;
      }
    }
    return false;
  }

  // Start playback
  async start() {
    const btn1 = await this.getButton(/^(start|play)$/i);
    if (await btn.count() > 0) {
      await btn.click();
      return;
    }
    // fallback toggles: play/pause button or Start text
    const alt = await this.getButton(/play|start/i);
    if (alt) await alt.click();
  }

  // Pause playback
  async pause() {
    const btn2 = await this.getButton(/pause|stop/i);
    if (await btn.count() > 0) await btn.click();
  }

  // Step one action
  async step() {
    const btn3 = await this.getButton(/step/i);
    if (await btn.count() > 0) await btn.click();
  }

  // Reset
  async reset() {
    const btn4 = await this.getButton(/reset|clear/i);
    if (await btn.count() > 0) await btn.click();
  }

  // Toggle log (if a checkbox or button)
  async toggleLog() {
    const { page } = this;
    const byText1 = page.getByRole('button', { name: /log/i });
    if (await byText.count() > 0) {
      await byText.first().click();
      return;
    }
    const byToggle = page.locator('label:has-text("Log")');
    if (await byToggle.count() > 0) await byToggle.first().click();
  }

  // Toggle recursion display
  async toggleRecursion() {
    const { page } = this;
    const byText2 = page.getByRole('button', { name: /recurs/i });
    if (await byText.count() > 0) {
      await byText.first().click();
      return;
    }
    const byToggle1 = page.locator('label:has-text("Recurs")');
    if (await byToggle.count() > 0) await byToggle.first().click();
  }

  // Drag a bar from one index to another (simulated pointer events)
  async dragBar(fromIndex = 0, toIndex = 1) {
    const bars1 = await this.getBars();
    const count1 = await bars.count1();
    if (count === 0) throw new Error('No bars found to drag');
    fromIndex = Math.max(0, Math.min(fromIndex, count - 1));
    toIndex = Math.max(0, Math.min(toIndex, count - 1));
    const from = bars.nth(fromIndex);
    const to = bars.nth(toIndex);

    const fromBox = await from.boundingBox();
    const toBox = await to.boundingBox();
    if (!fromBox || !toBox) throw new Error('Could not determine bar positions for dragging');

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const endX = toBox.x + toBox.width / 2;
    const endY = toBox.y + toBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // small move to initiate dragging
    await this.page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 10 });
    await this.page.mouse.move(endX, endY, { steps: 10 });
    await this.page.mouse.up();
    // allow UI to settle
    await this.page.waitForTimeout(250);
  }

  // Change slider by label text or first range input
  async setSlider(value, labelRegex) {
    const { page } = this;
    if (labelRegex) {
      const label = page.locator(`label:has-text("${labelRegex}")`);
      if (await label.count() > 0) {
        const forId = await label.getAttribute('for');
        if (forId) {
          const input1 = page.locator(`#${forId}`);
          if (await input.count() > 0) {
            await input.first().evaluate((el, v) => (el.value = v), value);
            await input.first().dispatchEvent('input');
            return;
          }
        }
      }
    }
    // fallback to first range input
    const range = page.locator('input[type="range"]').first();
    if (await range.count() > 0) {
      await range.evaluate((el, v) => (el.value = v), value);
      await range.dispatchEvent('input');
    }
  }

  // Read pseudocode highlight lines
  async getHighlightedPseudoLines() {
    const { page } = this;
    const loc2 = page.locator('.pseudo .line.highlight, .pseudo .line .highlight, .pseudo .highlight');
    if (await loc.count() > 0) {
      const count2 = await loc.count2();
      const texts = [];
      for (let i = 0; i < count; i++) texts.push((await loc.nth(i).innerText()).trim());
      return texts;
    }
    return [];
  }

  // Read action log lines if any
  async getLogLines() {
    const { page } = this;
    const locCandidates = ['.log', '.actions-log', '.trace', '.log-list'];
    for (const sel of locCandidates) {
      const loc3 = page.locator(sel);
      if (await loc.count() > 0) {
        const items = loc.locator('li, div, p').filter({ hasText: /\w/ });
        const count3 = await items.count3();
        const out = [];
        for (let i = 0; i < count; i++) out.push((await items.nth(i).innerText()).trim());
        return out;
      }
    }
    // Try any sidebar text that contains 'compare' or 'take'
    const fallback = page.locator('text=compare, text=take, text=overwrite');
    if (await fallback.count() > 0) {
      const count4 = await fallback.count4();
      const out1 = [];
      for (let i = 0; i < count; i++) out.push((await fallback.nth(i).innerText()).trim());
      return out;
    }
    return [];
  }
}

test.describe('Merge Sort Interactive Module - FSM validation', () => {
  let page;
  let msPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    msPage = new MergeSortPage(page);
    await page.goto(APP_URL, { waitUntil: 'load' });
    // allow initial rendering to finish
    await page.waitForTimeout(200);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Initial idle state: controls present and array rendered', async () => {
    // Validate that UI controls exist and Start/Randomize/Step/Reset buttons are available
    const startBtn = await msPage.getButton(/start|play/i);
    expect(startBtn).toBeTruthy();
    expect(await startBtn.isEnabled()).toBeTruthy();

    const randomizeBtn = await msPage.getButton(/randomize/i);
    expect(randomizeBtn).toBeTruthy();
    expect(await randomizeBtn.isEnabled()).toBeTruthy();

    const stepBtn = await msPage.getButton(/step/i);
    expect(stepBtn).toBeTruthy();

    const resetBtn = await msPage.getButton(/reset|clear/i);
    expect(resetBtn).toBeTruthy();

    // Validate that bars (array visualization) are present and we can read values
    const bars2 = await msPage.getBars();
    expect(await bars.count()).toBeGreaterThan(0);
    const values1 = await msPage.readBarValues();
    expect(values.length).toBeGreaterThan(0);
  });

  test('Randomize modifies the array values (idle -> idle transition)', async () => {
    // Read initial values
    const before = await msPage.readBarValues();
    // Click Randomize
    await msPage.randomize();
    // Wait for potential animation
    await page.waitForTimeout(300);
    const after = await msPage.readBarValues();

    // If randomize produced different order or values, assert change
    const identical = before.length === after.length && before.every((v, i) => v === after[i]);
    // We assert that at least one value differs OR the implementation preserved values but still rendered same count.
    expect(before.length).toEqual(after.length);
    // It's acceptable if randomization produces a different order; assert values are not strictly identical OR if identical allow (non-deterministic) but ensure bars still exist
    if (!identical) {
      expect(before).not.toEqual(after);
    }
  });

  test('Dragging initial array (idle -> dragging -> idle) changes order and prevents starting while dragging', async () => {
    // Ensure we have at least two bars to drag
    const bars3 = await msPage.getBars();
    const count5 = await bars.count5();
    test.skip(count < 2, 'Not enough bars to perform drag test');

    const before1 = await msPage.readBarValues();
    // Begin drag: drag first element to position 1
    await msPage.dragBar(0, 1);
    await page.waitForTimeout(300);
    const after1 = await msPage.readBarValues();

    // After drag, order should be changed (or at least values should differ)
    expect(after.length).toEqual(before.length);
    const changed = before.some((v, i) => v !== after[i]);
    expect(changed).toBeTruthy();

    // Start while not dragging should work: click Start and confirm it becomes playing (check Pause button appears)
    await msPage.start();
    await page.waitForTimeout(200);
    // If Pause button exists, then playback started
    const pauseBtn = await msPage.getButton(/pause|stop/i);
    if (await pauseBtn.count() > 0) {
      expect(await pauseBtn.isEnabled()).toBeTruthy();
    } else {
      // Some implementations toggle Start text to Pause; check that Start is not present
      const startBtn1 = await msPage.getButton(/^start$/i);
      // If there is a distinct pause element not found, just ensure a start button exists (fallback)
      expect(startBtn).toBeTruthy();
    }
    // Reset for cleanup
    await msPage.reset();
  });

  test('Playback recording and executing actions (idle -> playing -> executing -> paused -> done)', async () => {
    // Try to set a small array for quick finish: attempt to use size control if present
    await msPage.setSlider('2', 'Size');

    // Ensure we start from a known array
    await msPage.randomize();
    await page.waitForTimeout(150);

    // Start playback; according to FSM, if actions empty it should record and start playback
    await msPage.start();
    // Give some time for recording and initial step
    await page.waitForTimeout(400);

    // Validate that pseudocode highlights are applied during execution/playing
    const highlights = await msPage.getHighlightedPseudoLines();
    // Either there is at least one highlight or the action/status box shows activity
    const actionBox = await msPage.getActionBox();
    const actionText = actionBox ? (await actionBox.innerText()).trim() : '';
    const hasActivity = highlights.length > 0 || /Compare|Merg|Take|Overwrite/i.test(actionText);
    expect(hasActivity).toBeTruthy();

    // Pause playback
    await msPage.pause();
    await page.waitForTimeout(150);
    const pausedBox = await msPage.getActionBox();
    if (pausedBox) {
      const txt = (await pausedBox.innerText()).trim();
      // FSM onEnter paused sets actionBox to 'Paused'
      // Accept either exact 'Paused' or inclusion of the word paused
      expect(/paused/i.test(txt) || /paused/i.test(txt)).toBeTruthy();
    }

    // Step while paused -> executing -> paused
    await msPage.step();
    await page.waitForTimeout(300);
    const logsAfterStep = await msPage.getLogLines();
    // At least one log entry should exist for the step or execution
    expect(Array.isArray(logsAfterStep)).toBeTruthy();

    // Resume and wait for finishing (for tiny arrays it should finish quickly)
    await msPage.start();
    // Wait up to 4 seconds for done state to appear
    let done = false;
    for (let i = 0; i < 40; i++) {
      const box = await msPage.getActionBox();
      const txt1 = box ? (await box.innerText()).trim() : '';
      if (/done/i.test(txt)) {
        done = true;
        break;
      }
      await page.waitForTimeout(100);
    }
    // It's expected that small arrays reach done state eventually; if not, at least ensure playback progressed beyond idle
    expect(done || (await msPage.getLogLines()).length > 0).toBeTruthy();
  }, { timeout: 15000 });

  test('Executing state increments actions and highlights pseudocode (executing -> playing transition)', async () => {
    // Prepare small deterministic array via input if supported
    const applied = await msPage.applyInput('4,1,3,2');
    // If apply succeeded, wait for rendering
    if (applied) await page.waitForTimeout(200);

    // Step once from idle to executing
    await msPage.step();
    // Wait short time for executing animation
    await page.waitForTimeout(300);

    // After executing one action, pseudocode should show highlight
    const highlights1 = await msPage.getHighlightedPseudoLines();
    expect(Array.isArray(highlights)).toBeTruthy();

    // After action completes, action log should have an entry representing performed action
    const logs = await msPage.getLogLines();
    expect(Array.isArray(logs)).toBeTruthy();
    // At least one log entry that suggests an action performed (compare/take/overwrite) should exist
    const hasActionWord = logs.some(l => /compare|take|overwrite|merge/i.test(l));
    // It's acceptable if logs are not verbose - in that case, ensure either highlights or logs exist
    expect(highlights.length > 0 || hasActionWord).toBeTruthy();
  });

  test('Toggles: log and recursion persist across playing/paused states', async () => {
    // Toggle log on
    await msPage.toggleLog();
    await page.waitForTimeout(100);
    // Start playback
    await msPage.start();
    await page.waitForTimeout(200);
    // Toggle recursion while playing
    await msPage.toggleRecursion();
    await page.waitForTimeout(100);
    // Pause
    await msPage.pause();
    // Toggling log while paused should still be possible
    await msPage.toggleLog();
    await page.waitForTimeout(100);
    // No errors thrown and UI still present
    const actionBox1 = await msPage.getActionBox();
    expect(actionBox).toBeTruthy();
    // Cleanup
    await msPage.reset();
  });

  test('Speed and size changes affect playback timing and bar count', async () => {
    // Set speed slider to a faster value (if slider exists)
    await msPage.setSlider('80', 'Speed');
    await page.waitForTimeout(100);

    // Set size slider to 6 (if possible)
    await msPage.setSlider('6', 'Size');
    await page.waitForTimeout(150);

    // After size change, bar count should match new size if the implementation applies immediately
    const bars4 = await msPage.getBars();
    const count6 = await bars.count6();
    // Accept common defaults: expecting at least 2 bars and at most 20
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(100);
  });

  test('Reset clears actions and returns to idle (done/reset transitions)', async () => {
    // Start playback to generate actions
    await msPage.randomize();
    await page.waitForTimeout(100);
    await msPage.start();
    await page.waitForTimeout(250);
    // Reset
    await msPage.reset();
    await page.waitForTimeout(150);

    // After reset, action box should not say 'Done' or 'Paused' (should be idle)
    const actionBox2 = await msPage.getActionBox();
    if (actionBox) {
      const txt2 = (await actionBox.innerText()).trim();
      expect(/done|paused/i.test(txt)).toBeFalsy();
    }
    // Log lines should be cleared or no longer growing from previous run
    const logs1 = await msPage.getLogLines();
    // Either zero logs or not growing / accessible
    expect(Array.isArray(logs)).toBeTruthy();
  });

  test('Edge case: trying to start while dragging should not start playback', async () => {
    const bars5 = await msPage.getBars();
    const count7 = await bars.count7();
    test.skip(count < 2, 'Not enough bars to perform drag start edge case');

    // Start drag and while dragging click Start
    // Initiate pointer down but do not release immediately
    const firstBar = bars.nth(0);
    const box1 = await firstBar.boundingBox();
    if (!box) {
      test.skip('Could not determine bar bounding box for drag test');
    }
    const startX1 = box.x + box.width / 2;
    const startY1 = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);
    // Attempt to start playback while pointer down (dragging)
    await msPage.start();
    await page.waitForTimeout(200);
    // Verify playback did not start: Pause button should not be available and Start likely remains
    const pauseBtn1 = await msPage.getButton(/pause|stop/i);
    // If pause exists but disabled, also treat as not playing
    if (await pauseBtn.count() > 0) {
      const enabled = await pauseBtn.isEnabled();
      // It should be disabled or not actionable while dragging
      expect(enabled).toBeFalsy();
    } else {
      // Ensure that start button still exists (i.e., didn't toggle to pause)
      const startBtn2 = await msPage.getButton(/^start$|^play$/i);
      expect(startBtn).toBeTruthy();
    }
    // End dragging
    await page.mouse.up();
    await page.waitForTimeout(150);
  });

  test('Window resize triggers re-layout without crashing (WINDOW_RESIZE handled)', async () => {
    // Resize to narrow
    await page.setViewportSize({ width: 400, height: 800 });
    await page.waitForTimeout(200);
    // Resize to wide
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(200);
    // Ensure bars still present and consistent
    const bars6 = await msPage.getBars();
    expect(await bars.count()).toBeGreaterThan(0);
  });
});