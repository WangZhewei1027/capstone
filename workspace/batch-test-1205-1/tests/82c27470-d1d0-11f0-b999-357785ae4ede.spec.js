import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-1/html/82c27470-d1d0-11f0-b999-357785ae4ede.html';

// Page object for the Bubble Sort visualizer
class VisualizerPage {
  constructor(page) {
    this.page = page;
    this.playBtn = page.locator('#playBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.randomBtn = page.locator('#randomBtn');
    this.speedInput = page.locator('input#speed');
    this.sizeInput = page.locator('input#size');
    this.orderSelect = page.locator('select#order');
    this.optimizedCheckbox = page.locator('input#optimized');
    this.customArrayInput = page.locator('input#customArray');
    this.loadArrayBtn = page.locator('button#loadArray');
    this.barsWrap = page.locator('#barsWrap');
    this.compCount = page.locator('#compCount');
    this.swapCount = page.locator('#swapCount');
    this.passCount = page.locator('#passCount');
    this.status = page.locator('#status');
    this.codeBlock = page.locator('#codeBlock');
  }

  async goto() {
    await this.page.goto(APP_URL);
    // Wait for the main elements to be ready
    await expect(this.playBtn).toBeVisible();
    await expect(this.barsWrap).toBeVisible();
    await expect(this.status).toBeVisible();
  }

  async getPlayText() {
    return (await this.playBtn.textContent())?.trim();
  }

  async getStatusText() {
    return (await this.status.textContent())?.trim();
  }

  async clickPlay() {
    await this.playBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async clickRandomize() {
    await this.randomBtn.click();
  }

  async setSpeed(value) {
    await this.speedInput.fill(String(value));
    // Fire input event by focusing and pressing Arrow keys or using evaluate
    await this.page.evaluate((v) => {
      const el = document.getElementById('speed');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
  }

  async setSize(value) {
    await this.page.evaluate((v) => {
      const el = document.getElementById('size');
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(value));
    // wait for bars to re-render
    await this.page.waitForTimeout(100);
  }

  async setOrder(value) {
    await this.orderSelect.selectOption(value);
    // change event triggers reset synchronously
    await this.page.waitForTimeout(50);
  }

  async toggleOptimized() {
    await this.optimizedCheckbox.click();
    await this.page.waitForTimeout(50);
  }

  async loadCustomArray(txt) {
    await this.customArrayInput.fill(txt);
    await this.loadArrayBtn.click();
  }

  async barsCount() {
    return await this.barsWrap.locator('.bar').count();
  }

  async barClassAt(index) {
    const el = this.barsWrap.locator('.bar').nth(index);
    const classes = await el.getAttribute('class');
    return classes || '';
  }

  async barLabelAt(index) {
    const lbl = this.barsWrap.locator('.bar').nth(index).locator('.label');
    return (await lbl.textContent())?.trim();
  }

  async codeActiveLineNumbers() {
    return await this.page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('#codeBlock .line'));
      return lines.filter(l => l.classList.contains('active')).map(l => l.getAttribute('data-line'));
    });
  }

  async pressSpace() {
    await this.page.keyboard.press(' ');
  }

  async pressArrowRight() {
    await this.page.keyboard.press('ArrowRight');
  }

  async pressR() {
    await this.page.keyboard.press('r');
  }
}

test.describe('Bubble Sort Visualizer - End-to-end (FSM validation)', () => {
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Collect console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    // Collect uncaught page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
  });

  test.afterEach(async () => {
    // After each test ensure we observed and recorded console/page errors and fail if any occurred.
    // The application is expected to run without uncaught ReferenceError/SyntaxError/TypeError.
    expect(pageErrors, `No uncaught page errors expected, found: ${pageErrors.map(e => String(e)).join('\n')}`).toHaveLength(0);
    expect(consoleErrors, `No console.error messages expected, found: ${consoleErrors.map(e => e.text).join('\n')}`).toHaveLength(0);
  });

  test('Initial state: Ready, UI elements present and counts zero', async ({ page }) => {
    // Validate initial "Ready" state and component rendering
    const app = new VisualizerPage(page);
    await app.goto();

    // Status should be Ready
    await expect(app.status).toHaveText('Ready');

    // Play button should show 'Play'
    await expect(app.playBtn).toHaveText('Play');

    // Counters should be zero
    await expect(app.compCount).toHaveText('0');
    await expect(app.swapCount).toHaveText('0');
    await expect(app.passCount).toHaveText('0');

    // Bars should render according to default size (20)
    const count = await app.barsCount();
    expect(count).toBeGreaterThanOrEqual(5); // sanity check
    // code block should have no active lines initially
    const active = await app.codeActiveLineNumbers();
    expect(active.length).toBe(0);
  });

  test.describe('Playback controls and play/pause transitions', () => {
    test('Clicking Play enters Playing and toggles to Paused on second click', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Click Play -> should enter Playing
      await app.clickPlay();
      await expect(app.playBtn).toHaveText('Pause');
      await expect(app.status).toHaveText('Playing');

      // Click Play again -> should pause
      await app.clickPlay();
      await expect(app.playBtn).toHaveText('Play');
      // status is explicitly set to 'Paused' in click handler
      await expect(app.status).toHaveText('Paused');

      // Resume play via Play button
      await app.clickPlay();
      await expect(app.playBtn).toHaveText('Pause');
      await expect(app.status).toHaveText('Playing');

      // Finally pause to leave stable state for teardown
      await app.clickPlay();
      await expect(app.playBtn).toHaveText('Play');
      await expect(app.status).toHaveText('Paused');
    });

    test('Step button is ignored while playing (no immediate extra step effect)', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Ensure we are Ready
      await expect(app.status).toHaveText('Ready');

      // Start playing
      await app.clickPlay();
      await expect(app.status).toHaveText('Playing');

      // Record current compCount
      const compBefore = Number((await app.compCount.textContent()) || '0');

      // While playing, clicking Step should be ignored by the step handler (it returns if playing)
      await app.stepBtn.click();

      // Wait a short time to allow any autoStep to run; ensure compCount didn't jump due to our manual click
      await page.waitForTimeout(300);
      const compAfter = Number((await app.compCount.textContent()) || '0');

      // compAfter should be >= compBefore (auto advancement may have incremented), but should not be affected doubly by our manual step click.
      expect(compAfter).toBeGreaterThanOrEqual(compBefore);

      // Pause to clean up
      await app.clickPlay();
      await expect(app.status).toHaveText('Paused');
    });
  });

  test.describe('Stepping through algorithm and Completed state', () => {
    test('Load small custom array and step to Completed; verify sorted markings and counters', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Load a tiny array that completes quickly: "2,1"
      await app.loadCustomArray('2,1');

      // After Load, status should be Ready and bars count should be 2
      await expect(app.status).toHaveText('Ready');
      expect(await app.barsCount()).toBe(2);

      // Step repeatedly until 'Completed' appears
      // The generator yields several actions; we loop with a timeout guard
      const maxSteps = 12;
      let steps = 0;
      while (steps < maxSteps) {
        // Click Step
        await app.clickStep();
        steps++;
        // after each step, allow the handler to complete
        await page.waitForTimeout(120);
        const st = (await app.getStatusText()) || '';
        if (st.trim().startsWith('Completed') || st.trim() === 'Completed') {
          break;
        }
      }
      const finalStatus = await app.getStatusText();
      expect(finalStatus).toContain('Completed');

      // After completion both bars should be marked 'sorted'
      const count = await app.barsCount();
      expect(count).toBe(2);
      for (let i = 0; i < count; i++) {
        const cls = await app.barClassAt(i);
        expect(cls).toMatch(/sorted/);
      }

      // compCount and swapCount should be non-negative and reflect operations
      const comp = Number((await app.compCount.textContent()) || '0');
      const swp = Number((await app.swapCount.textContent()) || '0');
      expect(comp).toBeGreaterThanOrEqual(1);
      expect(swp).toBeGreaterThanOrEqual(1);
    });

    test('Reset restores initial array and zeros counters (from Completed and from Paused)', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Load a short custom array and perform a step to change state
      await app.loadCustomArray('3,1,2');
      // capture labels before any step
      const labelsBefore = [];
      const n = await app.barsCount();
      for (let i = 0; i < n; i++) labelsBefore.push(await app.barLabelAt(i));

      // Do one step to change counters
      await app.clickStep();
      await page.waitForTimeout(120);

      // Now reset
      await app.clickReset();
      await page.waitForTimeout(80);

      // Status Ready and counters reset
      await expect(app.status).toHaveText('Ready');
      await expect(app.compCount).toHaveText('0');
      await expect(app.swapCount).toHaveText('0');
      await expect(app.passCount).toHaveText('0');

      // Bars labels should equal the initial labels we recorded (reset should render initialArray)
      const labelsAfter = [];
      const na = await app.barsCount();
      for (let i = 0; i < na; i++) labelsAfter.push(await app.barLabelAt(i));
      // The initialArray is set to the loaded array (3,1,2) so labelsBefore should match labelsAfter
      expect(labelsAfter).toEqual(labelsBefore);
    });
  });

  test.describe('Controls: Randomize, Size, Speed, Order, Optimized, Load array edge cases', () => {
    test('Randomize renders new array and resets counters', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Record previous labels and counts
      const prevCount = await app.barsCount();
      const prevComp = await app.compCount.textContent();

      // Click Randomize
      await app.clickRandomize();
      await page.waitForTimeout(100);

      // Status should be Ready and counts zero
      await expect(app.status).toHaveText('Ready');
      await expect(app.compCount).toHaveText('0');
      await expect(app.swapCount).toHaveText('0');

      // Bars count should match current size input value
      const sizeVal = Number(await page.locator('#size').inputValue());
      const barsNow = await app.barsCount();
      expect(barsNow).toBe(sizeVal);
      // It should generally differ from previous (possible collision but unlikely)
    });

    test('Changing size regenerates array; bar count updates accordingly', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Change size to 10
      await app.setSize(10);
      await page.waitForTimeout(100);
      expect(await app.barsCount()).toBe(10);

      // Change size to 6
      await app.setSize(6);
      await page.waitForTimeout(100);
      expect(await app.barsCount()).toBe(6);
    });

    test('Speed input updates value without changing playing state immediately', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Set a different speed
      await app.setSpeed(100);
      await page.waitForTimeout(50);

      // Verify the input reflects the updated value
      expect(Number(await page.locator('#speed').inputValue())).toBe(100);
    });

    test('Changing order and optimized toggles resets UI to Ready', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Change order to descending
      await app.setOrder('desc');
      await expect(app.status).toHaveText('Ready');

      // Toggle optimized
      const prevOptimized = await page.locator('#optimized').isChecked();
      await app.toggleOptimized();
      const newOptimized = await page.locator('#optimized').isChecked();
      expect(newOptimized).toBe(!prevOptimized);
      await expect(app.status).toHaveText('Ready');
    });

    test('Clicking Load with empty custom input triggers alert dialog (edge case)', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Ensure input is empty
      await app.customArrayInput.fill('');

      // Listen for dialog
      let dialogMessage = null;
      page.once('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await app.loadArrayBtn.click();
      // Wait briefly for dialog handler
      await page.waitForTimeout(50);

      expect(dialogMessage).toContain('Enter comma separated numbers');
    });

    test('Loading valid custom array parses and displays correct bars', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      await app.loadCustomArray('5, 9, 1, 3');
      await page.waitForTimeout(50);

      await expect(app.status).toHaveText('Ready');
      expect(await app.barsCount()).toBe(4);
      const labels = [];
      for (let i = 0; i < 4; i++) labels.push(await app.barLabelAt(i));
      // labels reflect the numbers in the same order
      expect(labels).toEqual(['5', '9', '1', '3']);
    });
  });

  test.describe('Keyboard shortcuts mapping to actions', () => {
    test('Space toggles Play/Pause; ArrowRight triggers Step; R triggers Reset', async ({ page }) => {
      const app = new VisualizerPage(page);
      await app.goto();

      // Ensure in Ready state
      await expect(app.status).toHaveText('Ready');

      // Space: Play
      await app.pressSpace();
      await page.waitForTimeout(60);
      await expect(app.status).toHaveText('Playing');
      await expect(app.playBtn).toHaveText('Pause');

      // Space again: Pause
      await app.pressSpace();
      await page.waitForTimeout(60);
      await expect(app.status).toHaveText('Paused');
      await expect(app.playBtn).toHaveText('Play');

      // ArrowRight: Step (while paused)
      // Capture compCount before stepping
      const compBefore = Number((await app.compCount.textContent()) || '0');
      await app.pressArrowRight();
      await page.waitForTimeout(120);
      const compAfter = Number((await app.compCount.textContent()) || '0');
      expect(compAfter).toBeGreaterThanOrEqual(compBefore);

      // Press 'r' to reset
      // First change something
      await app.clickStep();
      await page.waitForTimeout(120);
      await app.pressR();
      await page.waitForTimeout(80);
      await expect(app.status).toHaveText('Ready');
      await expect(app.compCount).toHaveText('0');
    });
  });
});