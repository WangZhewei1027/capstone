import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0018/html/c52a2060-c49c-11f0-9a85-931f4fec1045.html';

test.describe('Bubble Sort Visualization - FSM validation', () => {
  // Speed up visualization delays and capture global errors early.
  test.beforeEach(async ({ page }) => {
    // Inject before any page script runs: shorten setTimeout so visualization completes quickly
    // and capture any runtime errors.
    await page.addInitScript(() => {
      window.__errors = [];
      window.addEventListener('error', (e) => {
        try { window.__errors.push(e.message || String(e)); } catch (err) {}
      });
      // Make visualization delays small so tests run fast and deterministically
      window.__origSetTimeout = window.setTimeout;
      window.setTimeout = (fn, ms) => window.__origSetTimeout(fn, 10);
    });

    // Navigate to the app
    await page.goto(APP_URL);

    // Wrap drawArray to capture every time the array is redrawn during sorting.
    // This wrapper is installed after initial draw (which occurs on page load),
    // but will capture all subsequent draw calls made by clicking Start.
    await page.evaluate(() => {
      window.__frames = [];
      const origDraw = window.drawArray;
      if (origDraw) {
        window.drawArray = function (arr) {
          try {
            // store a copy of the array values
            window.__frames.push(arr.slice());
          } catch (e) {
            // ignore serialization issues
          }
          return origDraw(arr);
        };
      } else {
        // In case drawArray is not present (shouldn't happen), create a placeholder
        window.drawArray = function (arr) {
          window.__frames.push((arr || []).slice());
        };
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Sanity: no captured runtime errors during the test
    const errors = await page.evaluate(() => window.__errors || []);
    expect(errors.length).toBeLessThanOrEqual(0);
  });

  test.describe('Idle state validations', () => {
    test('idle onEnter: initial array is drawn with correct bars', async ({ page }) => {
      // The initial draw is executed on page load (idle.onEnter -> drawArray)
      // Validate there are 6 bars and their heights correspond to the initial array [5,1,4,2,8,3]
      const bars = page.locator('#array .bar');
      await expect(bars).toHaveCount(6);

      const heights = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#array .bar')).map(b => {
          // bar.style.height is like "100px" for value 5*20
          const h = window.getComputedStyle(b).height;
          return parseInt(h, 10);
        })
      );

      // compute values by dividing heights by 20 to get the original numbers
      const values = heights.map(h => Math.round(h / 20));
      expect(values).toEqual([5, 1, 4, 2, 8, 3]);
    });
  });

  test.describe('Sorting, Comparing, Swapping and Delaying states', () => {
    test('sorting start triggers comparing: bars get .swapping class during comparisons', async ({ page }) => {
      // Click Start to trigger START_CLICKED -> sorting -> comparisons
      await page.click('#sortButton');

      // Wait for the visualization to highlight a pair (.swapping)
      await page.waitForSelector('.bar.swapping', { timeout: 5000 });

      // There should be at least two bars highlighted (adjacent pair)
      const swappingCount = await page.locator('.bar.swapping').count();
      expect(swappingCount).toBeGreaterThanOrEqual(2);

      // Validate that the two swapping elements are adjacent elements in the DOM
      const indices = await page.evaluate(() => {
        const bars = Array.from(document.querySelectorAll('.bar'));
        return bars.map((b, i) => b.classList.contains('swapping') ? i : -1).filter(i => i >= 0);
      });
      expect(indices.length).toBeGreaterThanOrEqual(2);
      // check adjacency for the first two reported swapping bars
      expect(Math.abs(indices[0] - indices[1])).toBe(1);
    });

    test('swapping results in array redraw and highlights are removed after delay (delaying)', async ({ page }) => {
      // Click Start to begin sorting run
      await page.click('#sortButton');

      // Wait for several frames to be captured (drawArray wrapper pushes frames)
      await page.waitForFunction(() => Array.isArray(window.__frames) && window.__frames.length >= 5, null, { timeout: 5000 });

      // Retrieve the captured frames (snapshots of array values after draw calls)
      const frames = await page.evaluate(() => window.__frames.slice());

      // There should be multiple frames recorded during the sorting process
      expect(frames.length).toBeGreaterThanOrEqual(5);

      // Verify that at least one swap occurred between consecutive frames.
      // A swap means two positions in the array have swapped values between frames.
      const hasSwap = (() => {
        for (let k = 1; k < frames.length; k++) {
          const prev = frames[k - 1];
          const curr = frames[k];
          if (!prev || !curr || prev.length !== curr.length) continue;
          // Count positions where values differ
          const diffs = [];
          for (let i = 0; i < prev.length; i++) {
            if (prev[i] !== curr[i]) diffs.push(i);
          }
          // A swap between adjacent elements shows exactly two differing positions
          // and the values are swapped.
          if (diffs.length === 2) {
            const [i, j] = diffs;
            if (i + 1 === j && prev[i] === curr[j] && prev[j] === curr[i]) {
              return true;
            }
          }
        }
        return false;
      })();
      expect(hasSwap).toBeTruthy();

      // Verify that highlights (.swapping) appear and are removed (delaying.onExit -> removeHighlights)
      await page.waitForSelector('.bar.swapping', { timeout: 5000 });
      // After some time (we shortened delays), the swapping class should be removed
      await page.waitForFunction(() => document.querySelectorAll('.bar.swapping').length === 0, null, { timeout: 5000 });
      const remainingSwapping = await page.locator('.bar.swapping').count();
      expect(remainingSwapping).toBe(0);
    });
  });

  test.describe('Done state and edge cases', () => {
    test('done onEnter: final array is sorted ascending after completion', async ({ page }) => {
      // Run the sort and wait for final sorted condition: heights correspond to [1,2,3,4,5,8]
      await page.click('#sortButton');

      // Wait until the DOM reflects the sorted array (values ascending)
      await page.waitForFunction(() => {
        const bars = Array.from(document.querySelectorAll('#array .bar'));
        if (bars.length === 0) return false;
        const values = bars.map(b => Math.round(parseFloat(window.getComputedStyle(b).height) / 20));
        return values.join(',') === '1,2,3,4,5,8';
      }, null, { timeout: 10000 });

      // Confirm final DOM ordering is sorted
      const finalValues = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#array .bar')).map(b => Math.round(parseFloat(window.getComputedStyle(b).height) / 20))
      );
      expect(finalValues).toEqual([1, 2, 3, 4, 5, 8]);
    });

    test('clicking Start while sorting begins another run (START_CLICKED mapping) and does not error', async ({ page }) => {
      // Start first run
      await page.click('#sortButton');

      // Immediately start another run while the first is still processing
      await page.click('#sortButton');

      // Wait for completion by checking the final sorted result
      await page.waitForFunction(() => {
        const bars = Array.from(document.querySelectorAll('#array .bar'));
        if (bars.length === 0) return false;
        const values = bars.map(b => Math.round(parseFloat(window.getComputedStyle(b).height) / 20));
        return values.join(',') === '1,2,3,4,5,8';
      }, null, { timeout: 15000 });

      const finalValues = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#array .bar')).map(b => Math.round(parseFloat(window.getComputedStyle(b).height) / 20))
      );
      expect(finalValues).toEqual([1, 2, 3, 4, 5, 8]);

      // Ensure that no runtime errors were captured during the overlapping runs
      const errors = await page.evaluate(() => window.__errors || []);
      expect(errors.length).toBe(0);
    });

    test('edge case: multiple rapid Start clicks produce stable final state and no uncaught exceptions', async ({ page }) => {
      // Rapidly click Start several times
      for (let i = 0; i < 4; i++) {
        await page.click('#sortButton');
      }

      // Wait until final sorted state appears
      await page.waitForFunction(() => {
        const bars = Array.from(document.querySelectorAll('#array .bar'));
        if (bars.length === 0) return false;
        const values = bars.map(b => Math.round(parseFloat(window.getComputedStyle(b).height) / 20));
        return values.join(',') === '1,2,3,4,5,8';
      }, null, { timeout: 20000 });

      const finalValues = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#array .bar')).map(b => Math.round(parseFloat(window.getComputedStyle(b).height) / 20))
      );
      expect(finalValues).toEqual([1, 2, 3, 4, 5, 8]);

      // Ensure no uncaught errors in the page during the stress clicks
      const errors = await page.evaluate(() => window.__errors || []);
      expect(errors.length).toBe(0);
    });
  });
});