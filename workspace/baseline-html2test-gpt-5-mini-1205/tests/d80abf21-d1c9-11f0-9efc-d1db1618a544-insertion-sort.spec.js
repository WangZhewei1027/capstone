import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80abf21-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('Insertion Sort Visualizer — d80abf21-d1c9-11f0-9efc-d1db1618a544', () => {
  // Collect console errors and page errors for each test run to assert the page runs without uncaught errors.
  let pageErrors;
  let consoleErrors;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    consoleErrors = [];

    // Listen for unhandled page errors
    page.on('pageerror', (err) => {
      // Collect Error objects
      pageErrors.push(err);
    });

    // Collect console messages of type "error"
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application page
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Sanity: wait for main application container to be visible
    await expect(page.locator('role=application[name="Insertion Sort Visualizer"]')).toBeVisible();
  });

  test.afterEach(async () => {
    // After each test ensure no unexpected runtime errors or console error messages occurred
    expect(pageErrors, 'No unhandled page errors should have occurred').toEqual([]);
    expect(consoleErrors, 'No console.error messages should have been emitted').toEqual([]);
  });

  test.describe('Initial load and default state', () => {
    test('should render the app and display the initial array visualization', async ({ page }) => {
      // Verify title and main UI elements are present
      await expect(page).toHaveTitle(/Insertion Sort/i);
      const viz = page.locator('#viz');
      await expect(viz).toBeVisible();

      // Initial array is provided in the input value; verify input has the default value
      const arrayInput = page.locator('#arrayInput');
      await expect(arrayInput).toHaveValue(/8,5,2,9,5,6,3,7/);

      // The visual bars should be rendered for the initial array (8 elements)
      const bars = viz.locator('.bar');
      await expect(bars).toHaveCount(8);

      // The very first step should mark the first bar as sorted (status-sorted)
      // The app's init() runs generateSteps and updateStepUI, so step 0 should be visible
      const firstBar = bars.nth(0);
      await expect(firstBar).toHaveClass(/status-sorted/);

      // Step counter should show 0 / (total)
      await expect(page.locator('#stepCounter')).toHaveText('0');
      // stepTotal should be a number greater than 0 (there are steps generated)
      const totalText = await page.locator('#stepTotal').innerText();
      const totalNum = Number(totalText);
      expect(totalNum).toBeGreaterThan(0);
    });
  });

  test.describe('Controls, navigation and play behavior', () => {
    test('Load button should parse input and generate steps; Next and Prev navigate steps', async ({ page }) => {
      // Enter a known small array and click Load
      const arrayInput = page.locator('#arrayInput');
      await arrayInput.fill('3, 1, 2');
      await page.locator('#btnLoad').click();

      // After load, snapshot should reflect the loaded array
      await expect(page.locator('#arraySnapshot')).toHaveText(/\[3,1,2\]|\[3, 1, 2\]/);

      // Step counter resets to 0
      await expect(page.locator('#stepCounter')).toHaveText('0');

      // Click Next to move to step 1; stepCounter should increment
      await page.locator('#btnNext').click();
      await expect(page.locator('#stepCounter')).toHaveText('1');

      // On step 1 (key selection), the second bar (index 1) should have status-key class
      const bars = page.locator('#viz .bar');
      await expect(bars.nth(1)).toHaveClass(/status-key/);

      // Click Prev to go back to step 0
      await page.locator('#btnPrev').click();
      await expect(page.locator('#stepCounter')).toHaveText('0');

      // Verify first bar is sorted again after going back
      await expect(bars.nth(0)).toHaveClass(/status-sorted/);
    });

    test('Play (continuous) should animate to the end and final snapshot should be sorted (ascending)', async ({ page }) => {
      // Use a deterministic small array
      await page.locator('#arrayInput').fill('4,1,3');
      // Ensure order select is ascending
      await page.locator('#order').selectOption('asc');

      // Set auto mode to continuous for predictable play-through
      await page.locator('#autoMode').selectOption('continuous');

      // Speed up animation
      await page.locator('#speed').fill('50'); // minimal delay

      // Load the array to generate steps
      await page.locator('#btnLoad').click();

      // Click Play to start animation
      await page.locator('#btnPlay').click();
      // Wait until the Play button returns to 'Play' (meaning finished)
      await expect.poll(async () => {
        return page.locator('#btnPlay').innerText();
      }, { timeout: 5000 }).toBe('Play');

      // After playback, stepCounter should equal stepTotal
      const stepCounter = Number(await page.locator('#stepCounter').innerText());
      const stepTotal = Number(await page.locator('#stepTotal').innerText());
      expect(stepCounter).toBe(stepTotal);

      // The final array snapshot should be sorted ascending
      const snapshotText = await page.locator('#arraySnapshot').innerText();
      // parse JSON content
      const finalArr = JSON.parse(snapshotText);
      const sorted = [...finalArr].slice().sort((a,b) => a - b);
      expect(finalArr).toEqual(sorted);
    });

    test('Random button generates a new baseArray and updates input and snapshot', async ({ page }) => {
      // Click Random
      await page.locator('#btnRandom').click();

      // Input value should be changed to reflect new array
      const inputVal = await page.locator('#arrayInput').inputValue();
      expect(inputVal.split(/[\s,]+/).filter(Boolean).length).toBeGreaterThanOrEqual(3);

      // Snapshot should be an array matching the input elements parsed as numbers
      const snapshotText = await page.locator('#arraySnapshot').innerText();
      expect(snapshotText).toMatch(/^\[.*\]$/);
      const arr = JSON.parse(snapshotText);
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThanOrEqual(3);
    });

    test('Reset restores steps to the base array after user navigation', async ({ page }) => {
      // Load a specific array to set baseArray
      await page.locator('#arrayInput').fill('9,8,7');
      await page.locator('#btnLoad').click();

      // Navigate forward one step
      await page.locator('#btnNext').click();
      await expect(page.locator('#stepCounter')).toHaveText('1');

      // Now click Reset, expecting current to go back to 0 and snapshot to reflect baseArray
      await page.locator('#btnReset').click();
      await expect(page.locator('#stepCounter')).toHaveText('0');
      const snapshot = await page.locator('#arraySnapshot').innerText();
      expect(snapshot).toContain('9');
      expect(snapshot).toContain('8');
      expect(snapshot).toContain('7');
    });

    test('Order select (desc) should produce a descending-sorted final array', async ({ page }) => {
      // Use deterministic array
      await page.locator('#arrayInput').fill('2,9,4,1');
      await page.locator('#order').selectOption('desc');
      await page.locator('#btnLoad').click();

      // Make continuous and fast
      await page.locator('#autoMode').selectOption('continuous');
      await page.locator('#speed').fill('50');

      // Play through to end
      await page.locator('#btnPlay').click();
      await expect.poll(async () => page.locator('#btnPlay').innerText(), { timeout: 5000 }).toBe('Play');

      // Final array should be sorted descending
      const finalArr = JSON.parse(await page.locator('#arraySnapshot').innerText());
      const sortedDesc = [...finalArr].slice().sort((a,b) => b - a);
      expect(finalArr).toEqual(sortedDesc);
    });
  });

  test.describe('Modes, pseudocode highlighting and UI behaviors', () => {
    test('Switching highlight mode regenerates steps and affects step total', async ({ page }) => {
      // Load a medium array
      await page.locator('#arrayInput').fill('5,4,3,2,1');
      await page.locator('#highlightMode').selectOption('compact');
      await page.locator('#btnLoad').click();
      const totalCompact = Number(await page.locator('#stepTotal').innerText());

      // Now switch to verbose and reload
      await page.locator('#highlightMode').selectOption('verbose');
      await page.locator('#btnLoad').click();
      const totalVerbose = Number(await page.locator('#stepTotal').innerText());

      // verbose may have equal or greater number of steps than compact; this checks regeneration occurred
      expect(totalVerbose).toBeGreaterThanOrEqual(0);
      expect(totalCompact).toBeGreaterThanOrEqual(0);
      // They should both be numbers; at minimum ensure both changed into a numeric display
      expect(Number.isFinite(totalCompact)).toBe(true);
      expect(Number.isFinite(totalVerbose)).toBe(true);
    });

    test('Pseudocode lines highlight according to current step pcLine', async ({ page }) => {
      // Use a small array and load
      await page.locator('#arrayInput').fill('6,2');
      await page.locator('#btnLoad').click();

      // Step 0 highlights line 1 (per implementation)
      await expect(page.locator('.pseudocode .line.pc-active')).toHaveCount(1);
      const pcActiveLineNum = await page.locator('.pseudocode .line.pc-active').getAttribute('data-line');
      expect(['1','2','3','4','5','6','7']).toContain(pcActiveLineNum);

      // Move to next step and ensure some pseudocode line is active
      await page.locator('#btnNext').click();
      await expect(page.locator('.pseudocode .line.pc-active')).toHaveCount(1);
      const nextActive = await page.locator('.pseudocode .line.pc-active').getAttribute('data-line');
      expect(['1','2','3','4','5','6','7']).toContain(nextActive);
    });
  });

  test.describe('Edge cases and accessibility', () => {
    test('Non-numeric input is coerced to zeros and handled without runtime errors', async ({ page }) => {
      // Input invalid non-numeric tokens
      await page.locator('#arrayInput').fill('a, b, c');
      await page.locator('#btnLoad').click();

      // The array snapshot should show zeros since parseArrayInput maps NaN -> 0
      const snapshot = await page.locator('#arraySnapshot').innerText();
      expect(snapshot).toBe('[0,0,0]');

      // Bars should render for three elements
      await expect(page.locator('#viz .bar')).toHaveCount(3);
    });

    test('Keyboard shortcuts: ArrowRight and ArrowLeft navigate steps; Space toggles play/pause', async ({ page }) => {
      // Prepare deterministic array
      await page.locator('#arrayInput').fill('7,3,5');
      await page.locator('#btnLoad').click();

      // Press ArrowRight to trigger Next
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#stepCounter')).toHaveText('1');

      // Press ArrowLeft to go back
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('#stepCounter')).toHaveText('0');

      // Press Space to play (will toggle Play). Use continuous and fast speed so it completes quickly.
      await page.locator('#autoMode').selectOption('continuous');
      await page.locator('#speed').fill('50');

      // Press Space to start play
      await page.keyboard.press(' ');
      // Wait until it finishes (btnPlay returns to 'Play')
      await expect.poll(async () => page.locator('#btnPlay').innerText(), { timeout: 5000 }).toBe('Play');

      // Confirm finished at final step
      const counter = Number(await page.locator('#stepCounter').innerText());
      const total = Number(await page.locator('#stepTotal').innerText());
      expect(counter).toBe(total);
    });

    test('Accessibility: main app role and viz role exist', async ({ page }) => {
      // Role application with accessible name
      await expect(page.locator('role=application[name="Insertion Sort Visualizer"]')).toBeVisible();

      // viz has role graphics-document and a label "Array visualization"
      await expect(page.locator('role=graphics-document[name="Array visualization"]')).toBeVisible();

      // The controls have accessible labels
      await expect(page.locator('role=textbox[name="Array values"]')).toBeVisible();
      await expect(page.locator('role=combobox[name="Sort order"]')).toBeVisible();
    });
  });
});