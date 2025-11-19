import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-18-0016/html/37ec66a0-c49b-11f0-ba2e-1bc0ef57fc8f.html';

test.describe('Bubble Sort Visualization - FSM-driven behavior', () => {
  // Inject instrumentation before the page scripts run so we can observe internal events.
  // We poll for the existence of functions defined by the page and wrap them when available.
  // The wrapper pushes timestamped event objects into window.__events so tests can assert order and timing.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Initialize event store
      window.__events = [];
      // Poll to wrap the functions as soon as they are defined by the page script
      window.__wrapInterval = setInterval(() => {
        // Wrap generateArray
        if (window.generateArray && !window.__generateWrapped) {
          const orig = window.generateArray;
          window.generateArray = function (...args) {
            try {
              window.__events.push({ e: 'GENERATE_CLICKED', t: Date.now() });
            } catch (err) { /* swallow */ }
            return orig.apply(this, args);
          };
          window.__generateWrapped = true;
        }

        // Wrap startSort
        if (window.startSort && !window.__startWrapped) {
          const orig = window.startSort;
          window.startSort = function (...args) {
            try {
              window.__events.push({ e: 'START_CLICKED', t: Date.now() });
            } catch (err) { /* swallow */ }
            return orig.apply(this, args);
          };
          window.__startWrapped = true;
        }

        // Wrap swap to observe SWAP_STARTED and SWAP_COMPLETE (swap returns a Promise)
        if (window.swap && !window.__swapWrapped) {
          const orig = window.swap;
          window.swap = function (i, j) {
            try {
              window.__events.push({ e: 'SWAP_STARTED', t: Date.now(), i, j });
            } catch (err) { /* swallow */ }
            const p = orig.apply(this, [i, j]);
            // Ensure we capture when the swap's visualization timeout resolves
            return p.then((res) => {
              try {
                window.__events.push({ e: 'SWAP_COMPLETE', t: Date.now(), i, j });
              } catch (err) { /* swallow */ }
              return res;
            });
          };
          window.__swapWrapped = true;
        }

        // Wrap bubbleSort to observe SORT_COMPLETE when it finishes
        if (window.bubbleSort && !window.__bubbleWrapped) {
          const orig = window.bubbleSort;
          window.bubbleSort = function (...args) {
            const p = orig.apply(this, args);
            // bubbleSort is async; when the returned promise resolves, we push SORT_COMPLETE
            p.then(() => {
              try {
                window.__events.push({ e: 'SORT_COMPLETE', t: Date.now() });
              } catch (err) { /* swallow */ }
            }).catch(() => {
              // ignore errors for instrumentation
            });
            return p;
          };
          window.__bubbleWrapped = true;
        }

        // If all wrappers applied, stop polling
        if (window.__generateWrapped && window.__startWrapped && window.__swapWrapped && window.__bubbleWrapped) {
          clearInterval(window.__wrapInterval);
          delete window.__wrapInterval;
        }
      }, 10);
    });

    // Navigate to the application after instrumentation is in place
    await page.goto(APP_URL);
    // Wait until the page has created the initial array DOM (onEnter idle should run generateArray on load)
    await page.waitForSelector('#array .bar');
  });

  test.afterEach(async ({ page }) => {
    // Clear events between tests to avoid leakage
    await page.evaluate(() => {
      if (window.__events) window.__events = [];
    });
  });

  test.describe('Idle state (initial page load and generate)', () => {
    test('Initial onEnter (generateArray) produces an array of bars', async ({ page }) => {
      // Validate that the initial array was generated and rendered
      const barCount = await page.$$eval('#array .bar', bars => bars.length);
      // FSM idle.onEnter -> generateArray should have run on load creating arraySize elements (10)
      expect(barCount).toBe(10);

      // Each bar should have a height style set via renderArray
      const heights = await page.$$eval('#array .bar', bars => bars.map(b => b.style.height));
      expect(heights.every(h => typeof h === 'string' && h.endsWith('px'))).toBe(true);

      // Ensure that the initial generateArray call resulted in DOM content (we can't intercept the very first call
      // because the inline script executed before instrumentation wrapped functions) - but presence of bars suffices.
    });

    test('Clicking "Generate New Array" triggers GENERATE_CLICKED and changes the array', async ({ page }) => {
      // Capture heights before generate
      const before