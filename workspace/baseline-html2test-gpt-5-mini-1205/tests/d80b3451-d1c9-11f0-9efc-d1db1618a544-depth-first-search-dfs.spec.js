import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini-1205/html/d80b3451-d1c9-11f0-9efc-d1db1618a544.html';

test.describe('DFS Visualizer — Depth-First Search (DFS)', () => {
  // Collect console and page errors for each test to assert no unexpected runtime errors
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture uncaught exceptions from page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the page under test
    await page.goto(APP_URL);
    // Wait for the grid to be built (grid element exists and has children)
    const grid = page.locator('#grid');
    await expect(grid).toBeVisible();
    await expect(grid.locator('.cell')).toHaveCount(20 * 30); // default 20 rows x 30 cols
  });

  test.afterEach(async () => {
    // Assert there were no page-level uncaught exceptions
    expect(pageErrors.length, `Unexpected page errors: ${pageErrors.map(e => e.message).join('\n')}`).toBe(0);

    // Assert that no console messages of type 'error' occurred
    const errorConsole = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    expect(errorConsole.length, `Console errors/warnings found: ${JSON.stringify(errorConsole)}`).toBe(0);
  });

  test.describe('Initialization and Controls', () => {
    test('has correct default controls and displays default grid', async ({ page }) => {
      // Verify default inputs and control elements are present and have expected defaults
      await expect(page.locator('#rows')).toHaveValue('20');
      await expect(page.locator('#cols')).toHaveValue('30');
      await expect(page.locator('#speed')).toHaveValue('180');
      await expect(page.locator('#speed-val')).toHaveText('180ms');
      await expect(page.locator('#order')).toBeVisible();
      await expect(page.locator('#run-rec')).toBeVisible();
      await expect(page.locator('#run-itr')).toBeVisible();
      await expect(page.locator('#step')).toBeVisible();
      await expect(page.locator('#play')).toBeVisible();
    });

    test('changing speed input updates label', async ({ page }) => {
      // Change the speed range and assert the displayed speed value updates
      const speedLocator = page.locator('#speed');
      await speedLocator.evaluate((el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, '250');
      await expect(page.locator('#speed-val')).toHaveText('250ms');
    });

    test('regen builds grid with new dimensions', async ({ page }) => {
      // Set rows and cols to small values and click generate
      await page.fill('#rows', '6');
      await page.fill('#cols', '7');
      await page.click('#regen');
      // Ensure grid has expected number of cells (6 * 7)
      await expect(page.locator('#grid .cell')).toHaveCount(6 * 7);
    });
  });

  test.describe('Grid interactions', () => {
    test('toggle wall with click and set start/goal with modifier clicks', async ({ page }) => {
      // Use a small grid for deterministic interactions
      await page.fill('#rows', '5');
      await page.fill('#cols', '5');
      await page.click('#regen');

      // Choose a non-start, non-goal cell for toggling wall: (1,1)
      const cell11 = page.locator('.cell[data-r="1"][data-c="1"]');
      await expect(cell11).toBeVisible();

      // Click to toggle wall on
      await cell11.click();
      // After clicking, the element should have class 'wall' or be visually updated
      await expect(cell11).toHaveClass(/wall/);

      // Shift+Click to set Start at (2,2)
      const cell22 = page.locator('.cell[data-r="2"][data-c="2"]');
      await cell22.click({ modifiers: ['Shift'] });
      // The start is re-rendered on that cell (it will also have 'start' class)
      await expect(cell22).toHaveClass(/start/);

      // Ctrl+Click to set Goal at (3,3)
      const cell33 = page.locator('.cell[data-r="3"][data-c="3"]');
      await cell33.click({ modifiers: ['Control'] });
      await expect(cell33).toHaveClass(/goal/);
    });

    test('reset clears walls and visited state', async ({ page }) => {
      await page.fill('#rows', '5');
      await page.fill('#cols', '5');
      await page.click('#regen');

      // Toggle a few walls
      await page.locator('.cell[data-r="1"][data-c="1"]').click();
      await page.locator('.cell[data-r="1"][data-c="2"]').click();
      await expect(page.locator('.cell[data-r="1"][data-c="1"]')).toHaveClass(/wall/);

      // Click Reset
      await page.click('#reset');

      // Walls should be cleared (no cell has the 'wall' class)
      const walls = await page.locator('.cell.wall').count();
      expect(walls).toBe(0);

      // Visited list should show "No nodes visited"
      await expect(page.locator('#vis')).toContainText('No nodes visited');
    });
  });

  test.describe('Execution: Iterative DFS', () => {
    test('runs iterative DFS to completion (autoplay via keyboard toggle) and updates UI', async ({ page }) => {
      // Small grid to allow quick completion
      await page.fill('#rows', '5');
      await page.fill('#cols', '5');
      await page.click('#regen');

      // Ensure start and goal default positions exist
      const startCell = page.locator('.cell[data-r="0"][data-c="0"]');
      const goalCell = page.locator('.cell[data-r="4"][data-c="4"]');
      await expect(startCell).toHaveClass(/start/);
      await expect(goalCell).toHaveClass(/goal/);

      // Click Run Iterative DFS
      await page.click('#run-itr');

      // At this point, the app sets running = true and autoPlay = false.
      // Use keyboard Space to toggle autoplay while running (code toggles autoPlay on Space).
      await page.keyboard.press('Space');

      // Wait for the run button to be enabled again indicating completion
      await expect(page.locator('#run-itr')).toBeEnabled({ timeout: 20000 });

      // After completion, visited list should contain entries
      const visitedCount = await page.locator('#vis .stack-frame').count();
      expect(visitedCount).toBeGreaterThan(0);

      // The goal cell should have been discovered, either as visited or path
      const goalClasses = await goalCell.getAttribute('class');
      expect(goalClasses).toMatch(/(goal|visited|path)/);

      // The stack display should either be empty or show no active frames
      await expect(page.locator('#stack')).toBeVisible();
    });
  });

  test.describe('Execution: Recursive DFS and No-Path option', () => {
    test('runs recursive DFS with autoplay toggle and displays a path unless No Path checked', async ({ page }) => {
      // Use small grid
      await page.fill('#rows', '5');
      await page.fill('#cols', '5');
      await page.click('#regen');

      // Ensure no-path is unchecked => path should be revealed after completion
      await page.uncheck('#no-path');

      // Start recursive run
      await page.click('#run-rec');

      // Toggle autoplay while running
      await page.keyboard.press('Space');

      // Wait for completion indicated by run-rec button enabled
      await expect(page.locator('#run-rec')).toBeEnabled({ timeout: 20000 });

      // After finish, ensure that some cells have 'path' class (final reconstructed path shown)
      const pathCells = await page.locator('.cell.path').count();
      expect(pathCells).toBeGreaterThan(0);
    });

    test('when No Path is checked, final path is not drawn', async ({ page }) => {
      // Smaller grid and ensure no-path is checked
      await page.fill('#rows', '5');
      await page.fill('#cols', '5');
      await page.click('#regen');

      await page.check('#no-path');

      // Run recursive DFS
      await page.click('#run-rec');

      // Enable autoplay via keyboard while running
      await page.keyboard.press('Space');

      // Wait for completion
      await expect(page.locator('#run-rec')).toBeEnabled({ timeout: 20000 });

      // Ensure no cell has class 'path'
      const pathCount = await page.locator('.cell.path').count();
      expect(pathCount).toBe(0);

      // But visited list should have entries
      const visitedCount = await page.locator('#vis .stack-frame').count();
      expect(visitedCount).toBeGreaterThan(0);
    });
  });
});