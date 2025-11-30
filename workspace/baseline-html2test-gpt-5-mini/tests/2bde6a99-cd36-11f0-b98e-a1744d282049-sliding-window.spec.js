import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde6a99-cd36-11f0-b98e-a1744d282049.html';

test.describe('Sliding Window Visualizer - End-to-end', () => {
  // Collect console errors and page errors for each test to assert there are none.
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    // Capture console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ type: 'console', text: msg.text() });
      }
    });
    // Capture uncaught page errors
    page.on('pageerror', error => {
      consoleErrors.push({ type: 'pageerror', message: String(error) });
    });

    // Navigate to the app page before each test
    await page.goto(APP_URL);
    // Wait for main root elements to ensure the script executed and DOM initialized
    await expect(page.locator('#arrayRow')).toBeVisible();
    await expect(page.locator('#arrayInput')).toBeVisible();
  });

  test.afterEach(async () => {
    // Assert there were no runtime console errors or page errors during the test.
    // This ensures we observed console/page errors (if any) and they are reported.
    expect(consoleErrors, `Unexpected console/page errors: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
  });

  test.describe('Initial load and default state', () => {
    test('should load with default array, fixed mode, and initial generator state', async ({ page }) => {
      // Verify default input values and controls visibility
      const arrayInput = page.locator('#arrayInput');
      const modeSelect = page.locator('#modeSelect');
      const windowSize = page.locator('#windowSize');
      const smallestControls = page.locator('#smallestControls');
      const arrayCells = page.locator('.array .cell');

      await expect(arrayInput).toHaveValue('2,1,5,2,8,3,1,4');
      await expect(modeSelect).toHaveValue('fixed');
      await expect(windowSize).toBeVisible();
      await expect(smallestControls).toHaveCSS('display', 'none');

      // The app's script runs resetAll at load. The first yielded state for fixed window (k=3)
      // adds the first element (index 0), so current sum should be '2' and indices "[0, 0]".
      await expect(page.locator('#currentSum')).toHaveText('2');
      await expect(page.locator('#indices')).toHaveText('[0, 0]');

      // There should be 8 cells rendered for the default array
      await expect(arrayCells).toHaveCount(8);

      // Status text is set to 'Ready' by resetAll after initialization
      await expect(page.locator('#statusText')).toHaveText('Ready');
    });
  });

  test.describe('Fixed-size mode interactions', () => {
    test('step button advances the generator and updates UI', async ({ page }) => {
      // Click Step to progress one step: from [0,0] -> [0,1] (adds index 1)
      const btnStep = page.locator('#btnStep');
      const currentSum = page.locator('#currentSum');
      const indices = page.locator('#indices');
      const status = page.locator('#statusText');

      // Verify initial precondition
      await expect(currentSum).toHaveText('2');
      await expect(indices).toHaveText('[0, 0]');

      // Step once
      await btnStep.click();

      // After adding index 1 (value 1), currentSum should be 3 and indices [0, 1]
      await expect(currentSum).toHaveText('3');
      await expect(indices).toHaveText('[0, 1]');
      await expect(status).toHaveText(/Added index 1|Checking/);
    });

    test('play button runs the animation to completion and reports best sum', async ({ page }) => {
      // Speed up the animation to avoid long waits
      const speedSelect = page.locator('#speedSelect');
      await speedSelect.selectOption('120');

      const btnPlay = page.locator('#btnPlay');
      const bestFound = page.locator('#bestFound');
      const status1 = page.locator('#statusText');

      // Start playing
      await btnPlay.click();

      // Wait until status becomes 'Completed' which indicates the generator finished.
      await expect(status).toHaveText('Completed', { timeout: 10_000 });

      // For the default array and k=3, the max sum should be 15 at indices [2, 4]
      await expect(bestFound).toContainText('maxSum = 15');
      await expect(bestFound).toContainText('[2, 4]');

      // After completion currentSum is set to the bestSum for fixed mode
      await expect(page.locator('#currentSum')).toHaveText('15');
    });

    test('reset, step multiple times and back returns to previous state', async ({ page }) => {
      const btnReset = page.locator('#btnReset');
      const btnStep1 = page.locator('#btnStep1');
      const btnBack = page.locator('#btnBack');
      const indices1 = page.locator('#indices1');

      // Reset to initial state (also triggers a log)
      await btnReset.click();

      // initial indices should be [0, 0]
      await expect(indices).toHaveText('[0, 0]');

      // Step thrice: after steps indices should move accordingly
      await btnStep.click(); // [0,1]
      await expect(indices).toHaveText('[0, 1]');
      await btnStep.click(); // [0,2]
      await expect(indices).toHaveText('[0, 2]');
      await btnStep.click(); // maybe 'check' state for window complete; indices [0,2] or [1,2] depending on generator stage
      // at least ensure indices reflect a valid pair (left/right)
      const indicesTextBeforeBack = await indices.textContent();
      expect(indicesTextBeforeBack).toMatch(/\[\d+, *-?\d+\]/);

      // Click Back to step back one state
      await btnBack.click();

      // After stepping back indices should have changed from the most recent state
      const indicesTextAfterBack = await indices.textContent();
      expect(indicesTextAfterBack).not.toBeNull();
      expect(indicesTextAfterBack).not.toEqual(''); // something visible

      // We expect stepping back to alter the displayed indices compared to the most recent one
      // (exact values depend on generator state). Ensure there remains a valid indices string.
      expect(indicesTextAfterBack).toMatch(/\[\d+, *-?\d+\]/);
    });

    test('randomize button changes the array and renders new cells', async ({ page }) => {
      const btnRandom = page.locator('#btnRandom');
      const arrayInput1 = page.locator('#arrayInput1');
      const cells = page.locator('.array .cell');
      const log = page.locator('#log');

      // Click Randomize and ensure array input value changes from the default
      await btnRandom.click();

      // The array input should now have a new comma-separated string; ensure it's not empty
      const newArrayValue = await arrayInput.inputValue();
      expect(newArrayValue.length).toBeGreaterThan(0);
      expect(newArrayValue).not.toBe('');

      // Ensure the visual row has at least 5 cells (randomize creates arrays length 5..11)
      await expect(cells).toHaveCountGreaterThan(4);

      // Log should contain the 'Randomized array.' entry
      const logText = await log.textContent();
      expect(logText).toContain('Randomized array.');
    });
  });

  test.describe('Smallest-subarray (variable window) mode', () => {
    test('switching mode toggles controls and initializes smallest generator', async ({ page }) => {
      const modeSelect1 = page.locator('#modeSelect1');
      const fixedControls = page.locator('#fixedControls');
      const smallestControls1 = page.locator('#smallestControls1');
      const currentSum1 = page.locator('#currentSum1');
      const indices2 = page.locator('#indices2');

      // Switch to 'smallest' mode
      await modeSelect.selectOption('smallest');

      // fixed controls hidden, smallest controls visible
      await expect(fixedControls).toHaveCSS('display', 'none');
      await expect(smallestControls).toBeVisible();

      // After resetAll called by mode change, initial smallest generator yields init with currentSum 0
      await expect(currentSum).toHaveText('0');

      // Indices for init state are [0, -1] (renderer displays it because right = -1 is not null)
      await expect(indices).toHaveText('[0, -1]');
    });

    test('play in smallest mode finds minimal-length subarray meeting target', async ({ page }) => {
      const arrayInput2 = page.locator('#arrayInput2');
      const targetInput = page.locator('#targetSum');
      const modeSelect2 = page.locator('#modeSelect2');
      const btnPlay1 = page.locator('#btnPlay1');
      const bestFound1 = page.locator('#bestFound1');
      const status2 = page.locator('#statusText');

      // Set up a deterministic case: array [1,2,3,4], target 6 -> minimal subarray length is 2 at indices [2,3]
      await arrayInput.fill('1,2,3,4');
      // Dispatch change event so the app's listener resets the generator
      await arrayInput.dispatchEvent('change');

      // Switch to smallest mode (this triggers a resetAll)
      await modeSelect.selectOption('smallest');

      // Set target to 6 and dispatch change
      await targetInput.fill('6');
      await targetInput.dispatchEvent('change');

      // Speed up playback, then play to completion
      await page.locator('#speedSelect').selectOption('120');
      await btnPlay.click();

      // Wait for completion
      await expect(status).toHaveText('Completed', { timeout: 8000 });

      // The bestFound text should indicate minLen = 2 and include the expected indices
      const bestText = await bestFound.textContent();
      expect(bestText).toMatch(/minLen\s*=\s*2/);
      expect(bestText).toMatch(/\[2, *3\]/);
    });

    test('pause stops the animation and updates status to Paused', async ({ page }) => {
      // Use a slightly longer example to allow pausing mid-animation
      const modeSelect3 = page.locator('#modeSelect3');
      await modeSelect.selectOption('fixed'); // ensure deterministic starting point
      // speed up
      await page.locator('#speedSelect').selectOption('300');

      const btnPlay2 = page.locator('#btnPlay2');
      const btnPause = page.locator('#btnPause');
      const status3 = page.locator('#statusText');
      const bestBeforePause = page.locator('#bestFound');

      // Start playing
      await btnPlay.click();

      // Wait a short time for it to progress
      await page.waitForTimeout(400);

      // Pause
      await btnPause.click();

      // Status should be 'Paused'
      await expect(status).toHaveText('Paused');

      // Capture bestFound at pause time
      const before = await bestBeforePause.textContent();

      // Wait another short time to ensure nothing else changes while paused
      await page.waitForTimeout(500);

      const after = await bestBeforePause.textContent();
      // The displayed best found should not change while paused
      expect(after).toBe(before);
    });
  });

  test.describe('Accessibility and visual assertions', () => {
    test('array cells display indices and values and highlights update on state change', async ({ page }) => {
      const cells1 = page.locator('.array .cell');
      // Each cell contains a .index element and the numeric value
      const firstCellIndex = cells.locator('.index').first();
      await expect(firstCellIndex).toHaveText('0');

      // Initial highlight should include index 0 (first add)
      const highlighted = page.locator('.array .cell.highlight');
      await expect(highlighted.first()).toBeVisible();

      // Step forward to extend highlight to index 1
      await page.locator('#btnStep').click();
      // Two highlighted cells expected now (indices 0 and 1)
      await expect(page.locator('.array .cell.highlight')).toHaveCountGreaterThanOrEqual(2);
    });
  });
});