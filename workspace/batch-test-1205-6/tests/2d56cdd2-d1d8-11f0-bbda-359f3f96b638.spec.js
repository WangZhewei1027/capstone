import { test, expect } from '@playwright/test';

test.setTimeout(30000);

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d56cdd2-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Quick Sort Visualization FSM (Application ID: 2d56cdd2-d1d8-11f0-bbda-359f3f96b638)', () => {
  // Arrays to collect runtime observations per test
  let consoleMessages;
  let pageErrors;

  // Helper: read bar heights (numbers in px) from the page
  const getBarHeights = async (page) => {
    return await page.$$eval('#array-container .bar', (els) =>
      els.map((e) => {
        const h = window.getComputedStyle(e).height || '0px';
        return parseFloat(h.replace('px', '')) || 0;
      })
    );
  };

  // Helper: check if an array is non-decreasing
  const isNonDecreasing = (arr) => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  };

  // Before each test navigate to the page and attach listeners
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // collect console messages (log, warn, error, etc.)
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', (err) => {
      // collect uncaught exceptions from the page
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Wait for the initial bars to be created by createBars() on load
    await page.waitForSelector('#array-container .bar', { timeout: 5000 });
  });

  // After each test, assert that there were no unexpected page errors unless the test expects them
  test.afterEach(async () => {
    // Default expectation: no uncaught page errors occurred during tests.
    // If a test expects errors it should perform its own assertions; otherwise fail on unexpected errors.
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
  });

  test.describe('S0_Idle (Initial state) validations', () => {
    test('S0_Idle: On load createBars() populates the array container with bars', async ({ page }) => {
      // Validate initial DOM contains bars created by createBars()
      const bars = await page.$$('#array-container .bar');
      // The HTML implementation initially sets array to 7 elements
      expect(bars.length).toBeGreaterThan(0);
      expect(bars.length).toBe(7);

      // Each bar should have a computed height > 0 and have class "bar"
      for (const bar of bars) {
        const className = await bar.getAttribute('class');
        expect(className).toContain('bar');
        const height = await bar.evaluate((el) => parseFloat(getComputedStyle(el).height));
        expect(height).toBeGreaterThan(0);
      }

      // No runtime errors on initial load
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Transitions and runtime behavior', () => {
    test('S0 -> S1: Clicking "Start Quick Sort" begins sorting and DOM bars change', async ({ page }) => {
      // Capture initial heights snapshot
      const initialHeights = await getBarHeights(page);
      expect(initialHeights.length).toBeGreaterThan(0);

      // Click the Start Quick Sort button to trigger startQuickSort()
      await page.click('button[onclick="startQuickSort()"]');

      // Poll for a change in bar heights within a reasonable timeout
      const timeout = 10000;
      const pollInterval = 200;
      const start = Date.now();
      let changed = false;

      while (Date.now() - start < timeout) {
        const heights = await getBarHeights(page);
        // If any height differs from initial snapshot, sorting visual started
        const anyDiff = heights.length !== initialHeights.length ||
          heights.some((h, i) => Math.abs(h - (initialHeights[i] || 0)) > 1e-6);
        if (anyDiff) {
          changed = true;
          break;
        }
        await page.waitForTimeout(pollInterval);
      }

      expect(changed).toBeTruthy();

      // Ensure no uncaught exceptions occurred during the interaction
      expect(pageErrors.length).toBe(0);
    });

    test('S1 -> S2 (Partitioning): Partitioning leads to multiple DOM updates (swaps) during sorting', async ({ page }) => {
      // Create an array of snapshots over time after starting sort to observe multiple distinct states
      const snapshots = [];
      const uniqueSnapshots = new Set();

      // Start sorting
      await page.click('button[onclick="startQuickSort()"]');

      // Collect snapshots for a duration to observe swaps/partitioning changes
      const observationDuration = 8000;
      const interval = 250;
      const endTime = Date.now() + observationDuration;

      while (Date.now() < endTime) {
        const heights1 = await getBarHeights(page);
        const key = heights.join(',');
        snapshots.push(heights);
        uniqueSnapshots.add(key);
        // If we have observed multiple distinct snapshots, we can assume partitioning/swaps occurred
        if (uniqueSnapshots.size >= 3) {
          break;
        }
        await page.waitForTimeout(interval);
      }

      // We expect at least 2 distinct snapshots (initial + at least one swap). Allowing 3 to be more robust.
      expect(uniqueSnapshots.size).toBeGreaterThanOrEqual(2);

      // Also ensure the DOM still contains the same number of bars
      const finalBars = await page.$$('#array-container .bar');
      expect(finalBars.length).toBeGreaterThan(0);

      // No uncaught exceptions during partitioning observation
      expect(pageErrors.length).toBe(0);
    });

    test('S1 -> S0 SortingComplete: Eventually the bars become stable and sorted (non-decreasing heights)', async ({ page }) => {
      // Start sorting
      await page.click('button[onclick="startQuickSort()"]');

      // Wait for stability: sample heights until they remain identical for a consecutive window
      const stabilityWindow = 6; // number of consecutive identical samples to consider stable
      const sampleInterval = 300;
      const maxWait = 20000;
      const start1 = Date.now();

      let lastSnapshot = null;
      let stableCount = 0;
      let finalSnapshot = null;

      while (Date.now() - start < maxWait) {
        const snapshot = await getBarHeights(page);
        const key1 = snapshot.join(',');
        if (lastSnapshot === key) {
          stableCount++;
        } else {
          stableCount = 1;
          lastSnapshot = key;
        }

        if (stableCount >= stabilityWindow) {
          finalSnapshot = snapshot;
          break;
        }
        await page.waitForTimeout(sampleInterval);
      }

      // We expect that sorting completes within the maxWait and we obtain a stable snapshot
      expect(finalSnapshot, 'Sorting did not reach a stable state within the timeout').not.toBeNull();

      // Validate final heights are non-decreasing (bars sorted ascending)
      expect(isNonDecreasing(finalSnapshot)).toBeTruthy();

      // No uncaught exceptions during sorting completion
      expect(pageErrors.length).toBe(0);
    });

    test('Edge case: Clicking "Start Quick Sort" multiple times rapidly should not produce uncaught errors and results in a stable state', async ({ page }) => {
      // Rapidly click start button multiple times
      const buttonSelector = 'button[onclick="startQuickSort()"]';
      for (let i = 0; i < 4; i++) {
        await page.click(buttonSelector);
        // small delay between clicks to simulate user chaos
        await page.waitForTimeout(80);
      }

      // Observe for completion/stability as in previous test
      const stabilityWindow1 = 6;
      const sampleInterval1 = 300;
      const maxWait1 = 25000;
      const start2 = Date.now();

      let lastSnapshot1 = null;
      let stableCount1 = 0;
      let finalSnapshot1 = null;

      while (Date.now() - start < maxWait) {
        const snapshot1 = await getBarHeights(page);
        const key2 = snapshot.join(',');
        if (lastSnapshot === key) {
          stableCount++;
        } else {
          stableCount = 1;
          lastSnapshot = key;
        }

        if (stableCount >= stabilityWindow) {
          finalSnapshot = snapshot;
          break;
        }
        await page.waitForTimeout(sampleInterval);
      }

      expect(finalSnapshot, 'After multiple rapid starts the UI did not stabilize').not.toBeNull();
      expect(isNonDecreasing(finalSnapshot)).toBeTruthy();

      // Ensure no uncaught page errors during this stress interaction
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Console and runtime error observation', () => {
    test('Observe console messages and ensure no unexpected runtime errors were thrown during normal usage', async ({ page }) => {
      // Perform a normal run: click start, wait some time
      await page.click('button[onclick="startQuickSort()"]');

      // Allow some time for messages and potential errors to surface
      await page.waitForTimeout(2000);

      // Validate we captured console messages (there may or may not be any, but we should have observed the stream)
      // We do not assert on specific console contents because the implementation does not log by default.
      expect(Array.isArray(consoleMessages)).toBeTruthy();

      // Assert no page errors (uncaught exceptions)
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('FSM entry/exit action inferences', () => {
    test('Entry action S0_Idle: createBars() should have been called on initial load (evidenced by presence of bars)', async ({ page }) => {
      // Presence of bars at load is evidence that createBars() ran as an entry action for S0_Idle
      const barCount = await page.$$eval('#array-container .bar', (els) => els.length);
      expect(barCount).toBe(7);
      expect(pageErrors.length).toBe(0);
    });

    test('Exit actions for S1_Sorting and S2_Partitioning: createBars() is called repeatedly (evidence by multiple DOM updates)', async ({ page }) => {
      // Start sorting and sample the number of distinct DOM states encountered to infer createBars() calls
      await page.click('button[onclick="startQuickSort()"]');

      const observedKeys = new Set();
      const observationDuration1 = 8000;
      const checkInterval = 200;
      const end = Date.now() + observationDuration;

      while (Date.now() < end) {
        const heights2 = await getBarHeights(page);
        observedKeys.add(heights.join(','));
        if (observedKeys.size >= 3) break;
        await page.waitForTimeout(checkInterval);
      }

      // If we observed multiple distinct DOM states, createBars() must have been invoked several times (exit actions / intermediate updates)
      expect(observedKeys.size).toBeGreaterThanOrEqual(2);
      expect(pageErrors.length).toBe(0);
    });
  });
});