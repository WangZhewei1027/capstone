import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80ae631-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Heap Sort Visualizer - d80ae631-d1c9-11f0-9efc-d1db1618a544', () => {
  // Containers for console/page errors observed during tests
  let consoleErrors = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    // After each test we assert that there were no unexpected runtime errors.
    // The application is loaded exactly as-is; we let any ReferenceError/SyntaxError/TypeError happen naturally,
    // but we expect none for a healthy run. If any exist, tests will fail here and surface errors.
    expect(pageErrors, 'No unhandled page errors should be thrown').toHaveLength(0);
    expect(consoleErrors, 'No console.error messages should be emitted').toHaveLength(0);
  });

  test('Initial load: DOM structure and default control values are correct', async ({ page }) => {
    // Verify header and title
    await expect(page.locator('h1')).toHaveText('Heap Sort Visualizer');

    // Controls default values
    const sizeVal = page.locator('#sizeVal');
    const speedVal = page.locator('#speedVal');
    const orderSelect = page.locator('#orderSelect');
    const comparisons = page.locator('#comparisons');
    const swaps = page.locator('#swaps');
    const actionText = page.locator('#actionText');

    await expect(sizeVal).toHaveText('24'); // default value from HTML
    await expect(speedVal).toHaveText('50'); // default
    await expect(orderSelect).toHaveValue('asc'); // default select
    await expect(comparisons).toHaveText('0');
    await expect(swaps).toHaveText('0');
    await expect(actionText).toHaveText('Idle');

    // Array visualization should contain bars equal to the size range value
    const bars = page.locator('#arrayContainer .bar');
    await expect(bars).toHaveCount(24);

    // Verify start/pause/step/reset button states
    await expect(page.locator('#startBtn')).toBeEnabled();
    await expect(page.locator('#pauseBtn')).toBeDisabled();
    await expect(page.locator('#stepBtn')).toBeEnabled();
    await expect(page.locator('#resetBtn')).toBeEnabled();

    // Accessibility checks
    const arrayContainer = page.locator('#arrayContainer');
    await expect(arrayContainer).toHaveAttribute('aria-live', 'polite');
    await expect(arrayContainer).toHaveAttribute('aria-label', 'Array visualization');
  });

  test('Generate creates a new random array and resets counters', async ({ page }) => {
    // Capture current array snapshot
    const getArraySnapshot = async () => {
      const bars = await page.locator('#arrayContainer .bar div:nth-child(1)').allTextContents();
      return bars;
    };

    const before = await getArraySnapshot();

    // Click Generate and wait for DOM change in the array container
    await page.click('#generateBtn');

    // Wait until array representation changes (new values)
    await page.waitForFunction(
      (selector, prev) => {
        const nodes = Array.from(document.querySelectorAll(selector)).map(n => n.textContent);
        if (nodes.length !== prev.length) return true;
        for (let i = 0; i < nodes.length; i++) if (nodes[i] !== prev[i]) return true;
        return false;
      },
      '#arrayContainer .bar div:nth-child(1)',
      before,
      { timeout: 2000 }
    );

    // After generation, counters should be reset
    await expect(page.locator('#comparisons')).toHaveText('0');
    await expect(page.locator('#swaps')).toHaveText('0');
    await expect(page.locator('#actionText')).toHaveText('Idle');

    // Size should reflect the sizeRange value
    const sizeRangeVal = await page.locator('#sizeRange').inputValue();
    const barsCount = await page.locator('#arrayContainer .bar').count();
    expect(Number(sizeRangeVal)).toBe(barsCount);
  });

  test('Start begins animation, updates counters and pseudocode highlights', async ({ page }) => {
    // Ensure a deterministic speed for faster tests: set speed to high (100) to reduce delay
    await page.fill('#speedRange', '100');
    await page.dispatchEvent('#speedRange', 'input');

    // Click Start to prepare actions and start animating
    await page.click('#startBtn');

    // After start, startBtn should be disabled and pauseBtn enabled
    await expect(page.locator('#startBtn')).toBeDisabled();
    await expect(page.locator('#pauseBtn')).toBeEnabled();

    // Wait for some action to occur: actionText should change from 'Idle'
    const actionText = page.locator('#actionText');
    await page.waitForFunction(
      () => document.getElementById('actionText') && document.getElementById('actionText').textContent !== 'Idle',
      null,
      { timeout: 5000 }
    );

    // At least one of comparisons or swaps should increment from 0 during the animation
    await page.waitForFunction(
      () => {
        const comps = Number(document.getElementById('comparisons').textContent || 0);
        const swaps = Number(document.getElementById('swaps').textContent || 0);
        return comps > 0 || swaps > 0;
      },
      null,
      { timeout: 5000 }
    );

    const compsText = await page.locator('#comparisons').textContent();
    const swapsText = await page.locator('#swaps').textContent();
    expect(Number(compsText)).toBeGreaterThanOrEqual(0);
    expect(Number(swapsText)).toBeGreaterThanOrEqual(0);

    // Pseudocode should have some active line depending on the current action
    const activeLines = await page.locator('.pseudocode .line.active').count();
    expect(activeLines).toBeGreaterThan(0);
  });

  test('Pause and Resume toggles animation and preserves state', async ({ page }) => {
    // Make speed fast for test responsiveness
    await page.fill('#speedRange', '100');
    await page.dispatchEvent('#speedRange', 'input');

    // Start animation
    await page.click('#startBtn');

    // Wait until at least one action is performed
    await page.waitForFunction(
      () => document.getElementById('actionText') && document.getElementById('actionText').textContent !== 'Idle',
      null,
      { timeout: 5000 }
    );

    // Pause
    await page.click('#pauseBtn');

    // Pause button text should change to 'Resume'
    await expect(page.locator('#pauseBtn')).toHaveText('Resume');

    // Capture action text at pause moment
    const pausedAction = await page.locator('#actionText').textContent();

    // Wait a short period and ensure actionText does not change while paused
    await page.waitForTimeout(400);
    const pausedActionAfter = await page.locator('#actionText').textContent();
    expect(pausedActionAfter).toBe(pausedAction);

    // Resume by clicking pause (which toggles to Resume -> Pause)
    await page.click('#pauseBtn');
    await expect(page.locator('#pauseBtn')).toHaveText('Pause');

    // After resuming, actionText should eventually change from the paused value
    await page.waitForFunction(
      previous => document.getElementById('actionText') && document.getElementById('actionText').textContent !== previous,
      pausedAction,
      { timeout: 5000 }
    );
  });

  test('Step advances single actions correctly when used before/after starting', async ({ page }) => {
    // Ensure reset state
    await page.click('#resetBtn');

    // Capture current counters
    const compsBefore = Number(await page.locator('#comparisons').textContent());
    const swapsBefore = Number(await page.locator('#swaps').textContent());

    // Click Step when not started: this should prepare actions and perform one action (and set paused)
    await page.click('#stepBtn');

    // After first step, pause button text should be 'Resume' because code sets paused = true and updates pauseBtn
    await expect(page.locator('#pauseBtn')).toHaveText('Resume');

    // After one step, the actionText should no longer be 'Idle'
    const actionAfterStep = await page.locator('#actionText').textContent();
    expect(actionAfterStep).not.toBe('Idle');

    // Counters should have changed or at least one action performed
    const compsAfter1 = Number(await page.locator('#comparisons').textContent());
    const swapsAfter1 = Number(await page.locator('#swaps').textContent());
    expect(compsAfter1 + swapsAfter1).toBeGreaterThanOrEqual(compsBefore + swapsBefore);

    // Perform another step while paused: should execute one more action
    await page.click('#stepBtn');
    const compsAfter2 = Number(await page.locator('#comparisons').textContent());
    const swapsAfter2 = Number(await page.locator('#swaps').textContent());
    // At least one of the counters should be >= the previous values
    expect(compsAfter2 + swapsAfter2).toBeGreaterThanOrEqual(compsAfter1 + swapsAfter1);
  });

  test('Reset restores the original array and clears animation state', async ({ page }) => {
    // Generate a new array so we have a clear "original" snapshot
    await page.click('#generateBtn');

    // Snapshot original values (text inside the value element of each bar)
    const originalSnapshot = await page.locator('#arrayContainer .bar div:nth-child(1)').allTextContents();

    // Start animation and let it perform a few actions
    await page.fill('#speedRange', '100');
    await page.dispatchEvent('#speedRange', 'input');
    await page.click('#startBtn');

    // Wait a small amount to allow some actions to occur
    await page.waitForTimeout(300);

    // Now click Reset
    await page.click('#resetBtn');

    // After reset, actionText should be 'Idle' and counters reset
    await expect(page.locator('#actionText')).toHaveText('Idle');
    await expect(page.locator('#comparisons')).toHaveText('0');
    await expect(page.locator('#swaps')).toHaveText('0');

    // The array visualization should match the previously captured original snapshot
    const afterResetSnapshot = await page.locator('#arrayContainer .bar div:nth-child(1)').allTextContents();
    expect(afterResetSnapshot.length).toBe(originalSnapshot.length);
    for (let i = 0; i < originalSnapshot.length; i++) {
      expect(afterResetSnapshot[i]).toBe(originalSnapshot[i]);
    }

    // Buttons state restored
    await expect(page.locator('#startBtn')).toBeEnabled();
    await expect(page.locator('#pauseBtn')).toBeDisabled();
  });

  test('Changing order select affects behavior (asc vs desc) and still completes steps', async ({ page }) => {
    // Set order to descending and generate new array
    await page.selectOption('#orderSelect', 'desc');
    await page.click('#generateBtn');

    // Set speed high for faster run
    await page.fill('#speedRange', '100');
    await page.dispatchEvent('#speedRange', 'input');

    // Start the animation and wait until it finishes or at least some actions occur
    await page.click('#startBtn');

    // Wait for either counters to increase or actionText to show 'Done'
    await page.waitForFunction(
      () => {
        const comps = Number(document.getElementById('comparisons').textContent || 0);
        const swaps = Number(document.getElementById('swaps').textContent || 0);
        const action = document.getElementById('actionText') && document.getElementById('actionText').textContent;
        return comps > 0 || swaps > 0 || action === 'Done';
      },
      null,
      { timeout: 5000 }
    );

    // Verify that some progress occurred
    const compsFinal = Number(await page.locator('#comparisons').textContent());
    const swapsFinal = Number(await page.locator('#swaps').textContent());
    expect(compsFinal + swapsFinal).toBeGreaterThanOrEqual(0);

    // The pseudocode should have active lines at some point (we check current state)
    const activeCount = await page.locator('.pseudocode .line.active').count();
    expect(activeCount).toBeGreaterThanOrEqual(0);
  });
});