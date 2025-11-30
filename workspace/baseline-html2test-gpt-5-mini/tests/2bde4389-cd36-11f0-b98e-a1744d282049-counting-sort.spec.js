import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4389-cd36-11f0-b98e-a1744d282049.html';

test.describe('Counting Sort Visualizer - 2bde4389-cd36-11f0-b98e-a1744d282049', () => {
  // Shared variables to capture console and page errors for each test
  test.beforeEach(async ({ page }) => {
    // Capture console messages and page errors to assert on them in tests
    page.context().consoleMessages = [];
    page.context().pageErrors = [];

    page.on('console', (msg) => {
      // store console text for assertions
      page.context().consoleMessages.push(msg.text());
    });

    page.on('pageerror', (err) => {
      // store page error objects for assertions
      page.context().pageErrors.push(err);
    });

    // Navigate to the app page
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // no-op cleanup; ensures listeners don't persist across tests
  });

  // Helper to read all bar texts from a container
  async function readBarsText(page, selector) {
    return await page.$$eval(`${selector} .bar`, (bars) => bars.map(b => b.textContent.trim()));
  }

  // Helper to count bars under a selector
  async function countBars(page, selector) {
    return await page.$$eval(`${selector} .bar`, bars => bars.length);
  }

  test('initial load shows UI, default values and logs ready message', async ({ page }) => {
    // Verify presence of key UI elements and default states
    const title = await page.locator('h1').textContent();
    expect(title).toContain('Counting Sort');

    // Input has default example value
    const inputValue = await page.locator('#inputArray').inputValue();
    expect(inputValue).toContain('4,3,2,6,1,3,2');

    // Status should be Idle initially
    const status = await page.locator('#status').textContent();
    expect(status).toBe('Idle');

    // Buttons should be visible and enabled
    await expect(page.locator('#btnStart')).toBeVisible();
    await expect(page.locator('#btnStep')).toBeVisible();
    await expect(page.locator('#btnPause')).toBeVisible();
    await expect(page.locator('#btnReset')).toBeVisible();

    // The initial visualization bars should be rendered (input array length 7)
    const inputBarsCount = await countBars(page, '#inputBars');
    expect(inputBarsCount).toBeGreaterThanOrEqual(7);

    // The page logs should include the ready message printed by the script
    // Wait a short time for console logs to be captured
    await page.waitForTimeout(50);
    const consoleMessages = page.context().consoleMessages || [];
    const combined = consoleMessages.join('\n');
    expect(combined).toContain('Ready. Click Start');

    // Assert there were no uncaught page errors during initial load
    const pageErrors = page.context().pageErrors || [];
    expect(pageErrors.length).toBe(0);
  });

  test('Generate (Random) button updates input array to the requested size', async ({ page }) => {
    // Set random size to a small deterministic number for testability
    await page.fill('#randSize', '5');
    // Click Generate
    await page.click('#btnRandom');

    // The input array should update to a string of numbers separated by commas/spaces
    const inputValue1 = await page.locator('#inputArray').inputValue1();
    expect(inputValue).toMatch(/[0-9]/);

    // Validate the count of numbers equals the requested size (5)
    const parts = inputValue.trim().split(/[\s,]+/).filter(Boolean);
    expect(parts.length).toBe(5);
    // Each part should be a non-negative integer
    for (const p of parts) {
      expect(/^\d+$/.test(p)).toBeTruthy();
    }
  });

  test('invalid input triggers an alert with explanatory message', async ({ page }) => {
    // Provide invalid input: negative number should cause alert
    await page.fill('#inputArray', '1, -2, 3');

    // Prepare to capture the dialog that should arise from parseInputArray
    const dialogPromise = page.waitForEvent('dialog');

    // Click Start which triggers parseInputArray and should alert
    await page.click('#btnStart');

    // Verify dialog appears and contains the expected message
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Only non-negative integers allowed');
    await dialog.dismiss();

    // Ensure no uncaught page errors occurred as a result
    const pageErrors1 = page.context().pageErrors1 || [];
    expect(pageErrors.length).toBe(0);
  });

  test('speed slider updates label and influences playback delay label text', async ({ page }) => {
    // Set a specific speed and verify the speedLabel changes accordingly
    await page.fill('#speed', '150');
    // Fire input event to trigger the UI handler
    await page.dispatchEvent('#speed', 'input');
    const speedLabel = await page.locator('#speedLabel').textContent();
    expect(speedLabel).toContain('150 ms');

    // Change again to another value
    await page.fill('#speed', '75');
    await page.dispatchEvent('#speed', 'input');
    const speedLabel2 = await page.locator('#speedLabel').textContent();
    expect(speedLabel2).toContain('75 ms');
  });

  test('Step advances one action and logs the counting action', async ({ page }) => {
    // Provide a small deterministic array
    await page.fill('#inputArray', '2,1,2');
    // Ensure randMax is reasonable
    await page.fill('#randMax', '2');

    // Clear any existing logs
    await page.evaluate(() => { document.getElementById('log').innerHTML = ''; });

    // Click Step (should prepare actions and perform a single step)
    await page.click('#btnStep');

    // After a single step, log should contain at least one entry mentioning "Count value" (counting phase)
    const logText = await page.locator('#log').innerText();
    expect(logText.length).toBeGreaterThan(0);
    expect(logText.toLowerCase()).toContain('count');

    // The status should indicate a step occurred (either Step x / y or Completed)
    const status1 = await page.locator('#status1').textContent();
    expect(status).toMatch(/Step|Completed|Paused|Idle/);

    // The counts visualization should have bars corresponding to indices 0..k (k >= 2)
    const countsCount = await countBars(page, '#countsBars');
    expect(countsCount).toBeGreaterThanOrEqual(3);
  });

  test('Start plays to completion (stable ascending) and produces sorted output', async ({ page }) => {
    // Use the example array from the UI to get stable sorted result
    await page.fill('#inputArray', '4,3,2,6,1,3,2');
    // Ensure we're in stable-asc mode
    await page.selectOption('#mode', 'stable-asc');
    // Make playback fast for the test
    await page.fill('#speed', '50');
    await page.dispatchEvent('#speed', 'input');

    // Click Start to run to completion
    await page.click('#btnStart');

    // Wait until status shows Completed (the app updates status text)
    await page.waitForFunction(() => {
      const s = document.getElementById('status');
      return s && s.textContent === 'Completed';
    }, { timeout: 5000 });

    // Read output bars' text content and convert to numbers
    const outputTexts = await readBarsText(page, '#outputBars');
    const outputNums = outputTexts.map(t => Number(t));

    // Expect the output to be sorted in ascending order (stable)
    const sortedAsc = [...outputNums].sort((a, b) => a - b);
    expect(outputNums).toEqual(sortedAsc);

    // No uncaught page errors should be present
    const pageErrors2 = page.context().pageErrors2 || [];
    expect(pageErrors.length).toBe(0);
  });

  test('Pause stops playback when invoked shortly after Start', async ({ page }) => {
    // Use a larger delay so playback is observable and can be paused
    await page.fill('#inputArray', '4,3,2,6,1,3,2');
    await page.fill('#speed', '1000');
    await page.dispatchEvent('#speed', 'input');

    // Click Start to begin playing
    await page.click('#btnStart');

    // Immediately click Pause
    await page.click('#btnPause');

    // Status should be Paused after clicking pause
    const status2 = await page.locator('#status2').textContent();
    expect(status).toBe('Paused');
  });

  test('Descending non-stable mode produces descending output', async ({ page }) => {
    // Prepare input and set mode to descending non-stable
    await page.fill('#inputArray', '4,3,2,6,1,3,2');
    await page.selectOption('#mode', 'desc-nonstable');
    await page.fill('#speed', '50');
    await page.dispatchEvent('#speed', 'input');

    // Click Start and wait for completion
    await page.click('#btnStart');
    await page.waitForFunction(() => {
      const s1 = document.getElementById('status');
      return s && s.textContent === 'Completed';
    }, { timeout: 5000 });

    // Extract output values
    const outputTexts1 = await readBarsText(page, '#outputBars');
    const outputNums1 = outputTexts.map(t => Number(t));

    // Expect descending sorted order
    const sortedDesc = [...outputNums].sort((a, b) => b - a);
    expect(outputNums).toEqual(sortedDesc);
  });

  test('Reset clears the UI and returns to Idle state', async ({ page }) => {
    // Run the algorithm to produce content
    await page.fill('#inputArray', '2,1,2');
    await page.fill('#speed', '50');
    await page.dispatchEvent('#speed', 'input');
    await page.click('#btnStart');

    // Wait for completion
    await page.waitForFunction(() => {
      const s2 = document.getElementById('status');
      return s && s.textContent === 'Completed';
    }, { timeout: 3000 });

    // Click Reset
    await page.click('#btnReset');

    // Status should be Idle
    const status3 = await page.locator('#status3').textContent();
    expect(status).toBe('Idle');

    // Visual panes should be cleared (no logs and bars reset)
    const logContent = await page.locator('#log').innerText();
    expect(logContent.trim()).toBe('');

    // inputBars and countsBars and outputBars should have been cleared (or empty)
    const inputBarsCount1 = await countBars(page, '#inputBars');
    const countsBarsCount = await countBars(page, '#countsBars');
    const outputBarsCount = await countBars(page, '#outputBars');

    // resetUI empties innerHTML; expect zero bars
    expect(inputBarsCount).toBe(0);
    expect(countsBarsCount).toBe(0);
    expect(outputBarsCount).toBe(0);
  });

  test('keyboard shortcuts: Space toggles start/pause and ArrowRight triggers a step', async ({ page }) => {
    // Prepare small dataset
    await page.fill('#inputArray', '2,1,2');
    await page.fill('#speed', '200');
    await page.dispatchEvent('#speed', 'input');

    // Press ArrowRight to step once (should perform a step)
    await page.keyboard.press('ArrowRight');
    // Small delay to allow handler to execute
    await page.waitForTimeout(100);
    let logText1 = await page.locator('#log').innerText();
    expect(logText.length).toBeGreaterThan(0);

    // Press Space to start (or pause). First press should start playback.
    await page.keyboard.press(' ');
    // Allow some time for status to change to Playing
    await page.waitForTimeout(50);
    const statusNow = await page.locator('#status').textContent();
    // status should be either Playing or Paused depending on timing
    expect(['Playing', 'Paused', 'Completed']).toContain(statusNow);

    // Press Space again to toggle (if it was Playing it should Pause)
    await page.keyboard.press(' ');
    await page.waitForTimeout(50);
    const statusToggled = await page.locator('#status').textContent();
    expect(['Playing', 'Paused', 'Completed']).toContain(statusToggled);
  });
});