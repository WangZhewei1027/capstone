import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4384-cd36-11f0-b98e-a1744d282049.html';

test.describe('Selection Sort Visualizer (2bde4384-cd36-11f0-b98e-a1744d282049)', () => {
  // Collect console messages and page errors for each test to assert there are none
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console messages and page errors
    page.on('console', msg => {
      // Collect only console messages with type 'error' for assertions
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    page.on('pageerror', err => {
      // Collect uncaught exceptions that bubble up to the page
      pageErrors.push(err);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);

    // Wait for the application container to be present
    await page.waitForSelector('.app[role="application"]');
  });

  test.afterEach(async () => {
    // Ensure no console errors or page errors occurred during the test
    // This validates that the page ran without uncaught exceptions
    expect(consoleErrors.length, `Console error messages: ${consoleErrors.map(e => e.text).join(' | ')}`).toBe(0);
    expect(pageErrors.length, `Page errors: ${pageErrors.map(e => (e && e.message) || String(e)).join(' | ')}`).toBe(0);
  });

  test('Initial page load shows default controls and ready state', async ({ page }) => {
    // Verify key controls exist and their default states / values
    const sizeVal = await page.$eval('#size', el => el.value);
    const speedVal = await page.$eval('#speed', el => el.value);
    const statusText = await page.$eval('#status', el => el.textContent.trim());
    const compCount = await page.$eval('#compCount', el => el.textContent.trim());
    const swapCount = await page.$eval('#swapCount', el => el.textContent.trim());
    const timeText = await page.$eval('#timeCount', el => el.textContent.trim());

    expect(sizeVal).toBe('30'); // default size as per HTML
    expect(speedVal).toBe('150'); // default speed as per HTML
    expect(statusText).toBe('Ready');
    expect(compCount).toBe('0');
    expect(swapCount).toBe('0');
    expect(timeText).toContain('0.0'); // time starts at 0.0s

    // Buttons: start enabled, pause disabled initially
    const startDisabled = await page.$eval('#startBtn', el => el.disabled);
    const pauseDisabled = await page.$eval('#pauseBtn', el => el.disabled);
    const stepDisabled = await page.$eval('#stepBtn', el => el.disabled);
    const resetDisabled = await page.$eval('#resetBtn', el => el.disabled);

    expect(startDisabled).toBe(false);
    expect(pauseDisabled).toBe(true);
    expect(stepDisabled).toBe(false);
    expect(resetDisabled).toBe(false);

    // Bars should render equal to default size (30)
    const barsCount = await page.$$eval('#bars .bar', els => els.length);
    expect(barsCount).toBe(30);
  });

  test('Randomize and Reverse buttons update bars and size', async ({ page }) => {
    // Click randomize and validate number of bars equals size slider
    await page.click('#randomBtn');
    const sizeAfter = await page.$eval('#size', el => Number(el.value));
    const barsCountAfter = await page.$$eval('#bars .bar', els => els.length);
    expect(barsCountAfter).toBe(sizeAfter);

    // Click reverse and validate descending sequence is applied (first bar should be largest label)
    await page.click('#reverseBtn');
    // After reverse, size remains same; first bar label should be size (descending from n to 1)
    const firstBarText = await page.$eval('#bars .bar .val', el => el.textContent.trim());
    // reverseBtn creates array [n, n-1, ..., 1]
    expect(Number(firstBarText)).toBe(sizeAfter);
  });

  test('Apply example via Example button populates the array input and bars', async ({ page }) => {
    // Click example (explainBtn) and confirm input and bars reflect the example array
    await page.click('#explainBtn');

    const arrayInputValue = await page.$eval('#arrayInput', el => el.value);
    expect(arrayInputValue).toBe('64,25,12,22,11');

    const barValues = await page.$$eval('#bars .bar .val', els => els.map(e => e.textContent.trim()));
    expect(barValues).toEqual(['64', '25', '12', '22', '11']);
    const barsCount1 = await page.$$eval('#bars .bar', els => els.length);
    expect(barsCount).toBe(5);
  });

  test('Apply custom array input updates bars and slider, and rejects invalid input', async ({ page }) => {
    // Valid input case
    await page.fill('#arrayInput', '5,3,8,1');
    await page.click('#applyArray');

    // Slider (#size) should update to 4
    const sizeVal1 = await page.$eval('#size', el => el.value);
    expect(sizeVal).toBe('4');

    // Bars should reflect the entered values in order
    const barValues1 = await page.$$eval('#bars .bar .val', els => els.map(e => e.textContent.trim()));
    expect(barValues).toEqual(['5', '3', '8', '1']);

    // Invalid input case: non-numeric value should trigger an alert
    // Listen for the dialog and capture its message
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Fill invalid input and click apply
    await page.fill('#arrayInput', 'a,2');
    await page.click('#applyArray');

    // dialog should have appeared with "Invalid number: a"
    expect(dialogMessage).not.toBeNull();
    expect(dialogMessage).toContain('Invalid number');

    // Not enough numbers case should also show an alert
    dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.fill('#arrayInput', '42'); // single number only
    await page.click('#applyArray');

    expect(dialogMessage).not.toBeNull();
    expect(dialogMessage).toContain('Enter at least two numbers');
  });

  test('Start sorting a small array (auto mode) completes and updates counters and status', async ({ page }) => {
    // Prepare a small array for quick sorting and set speed to minimum to speed up animation
    await page.fill('#arrayInput', '3,1,2');
    await page.click('#applyArray');

    // Set speed to a very small delay to accelerate sort
    await page.evaluate(() => {
      const speedInput = document.getElementById('speed');
      speedInput.value = '10';
      speedInput.dispatchEvent(new Event('input'));
    });

    // Start the algorithm
    await page.click('#startBtn');

    // Wait until the status becomes 'Finished' or 'Stopped' (if something forced a stop)
    await page.waitForFunction(() => {
      const s = document.getElementById('status').textContent.trim();
      return s === 'Finished' || s === 'Stopped';
    }, { timeout: 10000 });

    // Verify status is Finished (algorithm should complete)
    const finalStatus = await page.$eval('#status', el => el.textContent.trim());
    expect(finalStatus).toBe('Finished');

    // Counters should reflect some comparisons and possibly swaps
    const compCount1 = Number(await page.$eval('#compCount1', el => el.textContent.trim()));
    const swapCount1 = Number(await page.$eval('#swapCount1', el => el.textContent.trim()));

    expect(compCount).toBeGreaterThanOrEqual(1);
    expect(swapCount).toBeGreaterThanOrEqual(0);

    // Bars should be in sorted ascending order
    const barValues2 = await page.$$eval('#bars .bar .val', els => els.map(e => Number(e.textContent.trim())));
    // Check that each element is <= next element
    for (let i = 0; i < barValues.length - 1; i++) {
      expect(barValues[i]).toBeLessThanOrEqual(barValues[i + 1]);
    }

    // Start button should be re-enabled after completion
    const startDisabled1 = await page.$eval('#startBtn', el => el.disabled);
    expect(startDisabled).toBe(false);
  });

  test('Pause and resume functionality toggles status and button text', async ({ page }) => {
    // Use a slightly larger array to ensure there is something to pause
    await page.fill('#arrayInput', '8,7,6,5,4,3,2,1');
    await page.click('#applyArray');

    // Speed down to accelerate; still allow us to pause
    await page.evaluate(() => {
      const speedInput1 = document.getElementById('speed');
      speedInput.value = '20';
      speedInput.dispatchEvent(new Event('input'));
    });

    // Start the sort and wait until the status becomes 'Running'
    await page.click('#startBtn');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Running', { timeout: 2000 });

    // Click pause and verify status changes to 'Paused' and button text changes to 'Resume'
    await page.click('#pauseBtn');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Paused', { timeout: 2000 });

    const pauseText = await page.$eval('#pauseBtn', el => el.textContent.trim());
    expect(pauseText).toBe('Resume');

    // Resume and verify status returns to 'Running' (button text back to 'Pause')
    await page.click('#pauseBtn');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Running', { timeout: 2000 });

    const pauseTextAfter = await page.$eval('#pauseBtn', el => el.textContent.trim());
    expect(pauseTextAfter).toBe('Pause');

    // Stop the run using Reset to ensure the test environment is clean
    await page.click('#resetBtn');
    const statusAfterReset = await page.$eval('#status', el => el.textContent.trim());
    expect(statusAfterReset).toBe('Ready');
  });

  test('Stepping mode: start in step mode and advance with Step button until complete', async ({ page }) => {
    // Use a known small example to make stepping deterministic
    await page.fill('#arrayInput', '4,3,2,1');
    await page.click('#applyArray');

    // Speed set small but stepping mode will override with event-driven progression
    await page.evaluate(() => {
      const speedInput2 = document.getElementById('speed');
      speedInput.value = '10';
      speedInput.dispatchEvent(new Event('input'));
    });

    // Start in stepping mode by clicking Step when not running
    await page.click('#stepBtn');

    // The UI should enter paused step mode at first wait; wait for the status to include 'Paused (step mode)'
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('Paused (step mode)'), { timeout: 2000 });

    // Now sequentially trigger run-step by clicking Step multiple times.
    // We'll allow up to 200 steps (more than enough for 4 elements). After each click, allow small delay.
    for (let k = 0; k < 100; k++) {
      const status = await page.$eval('#status', el => el.textContent.trim());
      if (status === 'Finished') break;
      await page.click('#stepBtn');
      // Small pause to let the algorithm process one step
      await page.waitForTimeout(30);
    }

    // Ensure the algorithm finishes
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Finished', { timeout: 5000 });

    const finalStatus1 = await page.$eval('#status', el => el.textContent.trim());
    expect(finalStatus).toBe('Finished');
  });

  test('Keyboard shortcuts: "r" randomizes and Space toggles start/pause', async ({ page }) => {
    // Record initial bar count
    const initialBars = await page.$$eval('#bars .bar', els => els.length);

    // Press 'r' to randomize; this should change the bars content (but preserve count)
    await page.keyboard.press('r');
    // Allow any handlers to run
    await page.waitForTimeout(100);
    const afterRandomBars = await page.$$eval('#bars .bar', els => els.length);
    expect(afterRandomBars).toBe(initialBars); // size preserved

    // Test space toggles start/pause:
    // First ensure a small array for quick start/stop
    await page.fill('#arrayInput', '3,2,1');
    await page.click('#applyArray');
    // Set speed low for quick run
    await page.evaluate(() => {
      const speedInput3 = document.getElementById('speed');
      speedInput.value = '10';
      speedInput.dispatchEvent(new Event('input'));
    });

    // Press Space to start (triggers startBtn click)
    await page.keyboard.press(' ');
    // Wait for Running status
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Running', { timeout: 2000 });

    // Press Space to pause
    await page.keyboard.press(' ');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Paused', { timeout: 2000 });

    // Clean up: reset the visualization
    await page.click('#resetBtn');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Ready', { timeout: 2000 });
  });
});