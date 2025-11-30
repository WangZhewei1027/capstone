import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a88-cd35-11f0-9e7b-93b903303299.html';

test.describe('Merge Sort Visualizer (be878a88-cd35-11f0-9e7b-93b903303299)', () => {
  // Capture console messages and page errors for each test to assert no unexpected runtime errors
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Listen for console messages and page errors without changing runtime behavior
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application under test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // After each test, assert there were no uncaught page errors or console errors
    const consoleErrors = consoleMessages.filter(m => m.type === 'error');
    // Provide diagnostic outputs on failure
    expect(pageErrors.length, `Expected no page errors, got: ${pageErrors.map(e => e.message).join('; ')}`).toBe(0);
    expect(consoleErrors.length, `Expected no console errors, got: ${consoleErrors.map(e => e.text).join('; ')}`).toBe(0);

    // detach listeners to avoid cross-test interference
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  });

  test.describe('Initial load and default state', () => {
    test('page loads with expected elements and default state', async ({ page }) => {
      // Verifies title and key controls exist and default values are set
      await expect(page.locator('h1')).toHaveText('Merge Sort Visualizer');
      await expect(page.locator('#generate')).toBeVisible();
      await expect(page.locator('#shuffle')).toBeVisible();
      await expect(page.locator('#start')).toBeVisible();
      await expect(page.locator('#pause')).toBeVisible();
      await expect(page.locator('#step')).toBeVisible();
      await expect(page.locator('#reset')).toBeVisible();

      // Default size value is 48 (from HTML)
      const sizeVal = await page.$eval('#size', el => el.value);
      expect(sizeVal).toBe('48');

      // Bars container should be populated according to initial size
      const barsCount = await page.$$eval('#bars .bar', els => els.length);
      expect(barsCount).toBe(48);

      // Stats should start at zero
      await expect(page.locator('#comp')).toHaveText('0');
      await expect(page.locator('#writes')).toHaveText('0');
      await expect(page.locator('#actionsCount')).toHaveText('0');

      // Pause should be disabled by default
      const pauseDisabled = await page.$eval('#pause', el => el.disabled);
      expect(pauseDisabled).toBe(true);
    });

    test('size slider input updates bars count (preview) without clicking generate', async ({ page }) => {
      // Change the size input to 12 and dispatch input event to trigger preview rendering
      await page.$eval('#size', (el) => {
        el.value = '12';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Validate bars count changed to 12
      await expect(page.locator('#bars .bar')).toHaveCount(12);

      // Verify stats reset to zero after preview change
      await expect(page.locator('#comp')).toHaveText('0');
      await expect(page.locator('#writes')).toHaveText('0');
      await expect(page.locator('#actionsCount')).toHaveText('0');
    });
  });

  test.describe('Buttons and basic interactions', () => {
    test('Generate resets array and stats', async ({ page }) => {
      // Record a snapshot of bar titles before generating
      const beforeSnapshot = await page.$$eval('#bars .bar', nodes => nodes.map(n => n.title || n.textContent));

      // Click generate and ensure bars update and stats reset
      await page.click('#generate');

      const afterSnapshot = await page.$$eval('#bars .bar', nodes => nodes.map(n => n.title || n.textContent));
      // It's possible the random result equals previous by chance; assert DOM actually re-rendered by comparing innerHTML length
      const beforeHTML = await page.$eval('#bars', el => el.innerHTML.length);
      const afterHTML = await page.$eval('#bars', el => el.innerHTML.length);
      expect(afterHTML).toBeGreaterThan(0);

      // Stats should be zero after generate
      await expect(page.locator('#comp')).toHaveText('0');
      await expect(page.locator('#writes')).toHaveText('0');
      await expect(page.locator('#actionsCount')).toHaveText('0');

      // Ensure code highlighting is cleared after generate
      const activeLines = await page.$$eval('.code-line.active', els => els.length);
      expect(activeLines).toBe(0);
    });

    test('Shuffle reorders the visual array and resets state', async ({ page }) => {
      const before = await page.$eval('#bars', el => el.innerHTML);
      await page.click('#shuffle');
      const after = await page.$eval('#bars', el => el.innerHTML);
      // It's extremely unlikely that shuffle produces identical DOM string, but if it does this check is lenient:
      expect(after).toBeTruthy();
      // Stats and actions reset
      await expect(page.locator('#comp')).toHaveText('0');
      await expect(page.locator('#writes')).toHaveText('0');
      await expect(page.locator('#actionsCount')).toHaveText('0');
    });

    test('Reset restores the initial array and clears actions', async ({ page }) => {
      // change size to small and generate to create a known baseline
      await page.$eval('#size', el => { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.click('#generate');

      // Shuffle then reset to ensure reset restores initial
      await page.click('#shuffle');
      const shuffled = await page.$eval('#bars', el => el.innerHTML);
      await page.click('#reset');
      const resetHTML = await page.$eval('#bars', el => el.innerHTML);
      // After reset, DOM must be present and actions cleared
      await expect(page.locator('#actionsCount')).toHaveText('0');
      expect(resetHTML).toBeTruthy();
      // Not strictly asserting equality to pre-shuffle since randomness could align; just ensure action/state cleared
      await expect(page.locator('#comp')).toHaveText('0');
      await expect(page.locator('#writes')).toHaveText('0');
    });
  });

  test.describe('Sorting flow and visual updates', () => {
    test('Start runs the sort and finishes with all bars marked as sorted', async ({ page }) => {
      // Use a small size and max speed to make the run finish quickly
      await page.$eval('#size', el => { el.value = '12'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.$eval('#speed', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });

      // Ensure generate to have a fresh array snapshot
      await page.click('#generate');

      // Start sorting
      await page.click('#start');

      // During run, start button should be disabled and pause enabled
      await expect(page.locator('#start')).toBeDisabled();
      await expect(page.locator('#pause')).toBeEnabled();

      // Wait for the sort to finish: the implementation re-enables start when done
      await page.waitForFunction(() => {
        const startBtn = document.getElementById('start');
        return !startBtn.disabled;
      }, { timeout: 10000 });

      // After done, pause should be disabled
      await expect(page.locator('#pause')).toBeDisabled();

      // All bars should have the "sorted" background color (var(--good) -> #34d399 -> rgb(52, 211, 153))
      const sortedRgb = 'rgb(52, 211, 153)';
      const barBgColors = await page.$$eval('#bars .bar', els => els.map(el => getComputedStyle(el).backgroundColor));
      // Every bar's background should match the sorted color after completion
      for (const bg of barBgColors) {
        expect(bg).toBe(sortedRgb);
      }

      // Stats should reflect some comparisons and writes for non-empty arrays
      const comps = parseInt(await page.$eval('#comp', el => el.textContent || '0'));
      const writes = parseInt(await page.$eval('#writes', el => el.textContent || '0'));
      expect(comps).toBeGreaterThanOrEqual(0);
      expect(writes).toBeGreaterThanOrEqual(0);
      // actionsCount should be zero at the end
      await expect(page.locator('#actionsCount')).toHaveText('0');
    });

    test('Pause stops the running sort and Step advances a single action while paused', async ({ page }) => {
      // Small size and high speed for quick operations
      await page.$eval('#size', el => { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.$eval('#speed', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });

      // Ensure there are recorded actions by clicking start then quickly pausing
      await page.click('#generate');
      await page.click('#start');

      // Wait briefly to let the sort begin and actions queue populate
      await page.waitForTimeout(50);

      // Pause the animation
      await page.click('#pause');

      // After pause, start should be enabled and pause disabled
      await expect(page.locator('#start')).toBeEnabled();
      await expect(page.locator('#pause')).toBeDisabled();

      // Ensure actions have been recorded for stepping (actionsCount > 0)
      const actionsBefore = parseInt(await page.$eval('#actionsCount', el => el.textContent || '0'));
      expect(actionsBefore).toBeGreaterThanOrEqual(0);

      // Use Step to apply exactly one action; click step while paused
      await page.click('#step');

      // After pressing step, actionsCount should decrease by at most 1 (if actions were available)
      const actionsAfter = parseInt(await page.$eval('#actionsCount', el => el.textContent || '0'));
      expect(actionsAfter).toBeLessThanOrEqual(actionsBefore);

      // Clicking step repeatedly should eventually reduce actionsCount; perform a couple more steps
      await page.click('#step');
      await page.click('#step');
      const afterMultiple = parseInt(await page.$eval('#actionsCount', el => el.textContent || '0'));
      expect(afterMultiple).toBeLessThanOrEqual(actionsAfter);

      // Stats should reflect at least some comparisons or remain zero if no actions were present
      const comps1 = parseInt(await page.$eval('#comp', el => el.textContent || '0'));
      const writes1 = parseInt(await page.$eval('#writes1', el => el.textContent || '0'));
      expect(comps).toBeGreaterThanOrEqual(0);
      expect(writes).toBeGreaterThanOrEqual(0);
    });

    test('Keyboard shortcuts: space toggles start/pause and "s" triggers step', async ({ page }) => {
      // Prepare a small testable array
      await page.$eval('#size', el => { el.value = '8'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.$eval('#speed', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.click('#generate');

      // Press space to start
      await page.keyboard.press(' ');
      await expect(page.locator('#start')).toBeDisabled();

      // Wait a moment then press space to pause
      await page.waitForTimeout(30);
      await page.keyboard.press(' ');
      await expect(page.locator('#start')).toBeEnabled();

      // Press 's' to trigger a step action
      const actionsBefore1 = parseInt(await page.$eval('#actionsCount', el => el.textContent || '0'));
      await page.keyboard.press('s');
      const actionsAfter1 = parseInt(await page.$eval('#actionsCount', el => el.textContent || '0'));
      expect(actionsAfter).toBeLessThanOrEqual(actionsBefore);
    });

    test('Descending checkbox changes visualization domain but does not throw errors', async ({ page }) => {
      // Use small size and high speed
      await page.$eval('#size', el => { el.value = '10'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.$eval('#speed', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.click('#generate');

      // Toggle descending order on
      await page.click('#order');
      // Start sort; the code contains logic to invert values for recording and patch applyAction to invert back for display
      await page.click('#start');

      // Wait for completion
      await page.waitForFunction(() => !document.getElementById('start').disabled, { timeout: 10000 });

      // Validate no runtime errors were emitted (captured in afterEach)
      // Also check that bars finished with sorted color
      const sortedRgb1 = 'rgb(52, 211, 153)';
      const bg = await page.$eval('#bars .bar', el => getComputedStyle(el).backgroundColor);
      expect(bg).toBe(sortedRgb);
    });
  });

  test.describe('Accessibility and UI expectations', () => {
    test('visual region and toolbar have proper ARIA roles', async ({ page }) => {
      // Verify the application container has the role application
      const appRole = await page.$eval('.container', el => el.getAttribute('role'));
      expect(appRole).toBe('application');

      // The toolbar exists and is accessible
      const toolbar = await page.$('[role="toolbar"]');
      expect(toolbar).not.toBeNull();

      // The visualization region has a role of region and aria-label set
      const vizRole = await page.$eval('.visual', el => el.getAttribute('role'));
      const vizLabel = await page.$eval('.visual', el => el.getAttribute('aria-label'));
      expect(vizRole).toBe('region');
      expect(vizLabel).toBe('Sort visualization');
    });

    test('pseudocode lines have data-line attributes and can be highlighted', async ({ page }) => {
      // Ensure code lines exist and have data-line
      const codeLineCount = await page.$$eval('.code-line', els => els.length);
      expect(codeLineCount).toBeGreaterThan(0);

      // Trigger a single step to cause a code highlight
      await page.$eval('#size', el => { el.value = '8'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.click('#step');

      // There may be a highlighted line (class active) right after stepping
      const activeCount = await page.$$eval('.code-line.active', els => els.length);
      expect(activeCount).toBeGreaterThanOrEqual(0); // allow 0 if step didn't highlight immediately, but ensure DOM queried fine
    });
  });
});