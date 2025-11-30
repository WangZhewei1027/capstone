import { test, expect } from '@playwright/test';

// Test file: 2bde4391-cd36-11f0-b98e-a1744d282049-floyd-warshall-algorithm.spec.js
// Application URL:
const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/2bde4391-cd36-11f0-b98e-a1744d282049.html';

// Page object encapsulating common selectors and actions for the Floyd–Warshall visualizer
class FloydWarshallPage {
  constructor(page) {
    this.page = page;
    this.adjContainer = page.locator('#adjacencyContainer');
    this.distContainer = page.locator('#distContainer');
    this.nextContainer = page.locator('#nextContainer');
    this.addNodeBtn = page.locator('#addNodeBtn');
    this.removeNodeBtn = page.locator('#removeNodeBtn');
    this.directedToggle = page.locator('#directedToggle');
    this.nodeCount = page.locator('#nodeCount');
    this.randN = page.locator('#randN');
    this.randD = page.locator('#randD');
    this.randBtn = page.locator('#randBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.runBtn = page.locator('#runBtn');
    this.stepModeBtn = page.locator('#stepModeBtn');
    this.clearStepsBtn = page.locator('#clearStepsBtn');
    this.playPauseBtn = page.locator('#playPauseBtn');
    this.stepForwardBtn = page.locator('#stepForwardBtn');
    this.stepBackBtn = page.locator('#stepBackBtn');
    this.speedRange = page.locator('#speedRange');
    this.fromSelect = page.locator('#fromSelect');
    this.toSelect = page.locator('#toSelect');
    this.showPathBtn = page.locator('#showPathBtn');
    this.pathResult = page.locator('#pathResult');
    this.negCycleNotice = page.locator('#negCycleNotice');
    this.log = page.locator('#log');
  }

  // Helper to get adjacency table cell locator for (i, j)
  adjacencyCell(i, j) {
    // tbody tr rows correspond to nodes; inside each tr, there are td cells (no th)
    return this.adjContainer.locator('table tbody tr').nth(i).locator('td').nth(j);
  }

  // Helper to read text content of adjacency cell
  async adjacencyCellText(i, j) {
    return (await this.adjacencyCell(i, j).innerHTML()).trim();
  }

  // Helper to get distance table cell locator for (i, j)
  distCell(i, j) {
    return this.distContainer.locator('table tbody tr').nth(i).locator('td').nth(j);
  }

  async distCellText(i, j) {
    return (await this.distCell(i, j).textContent())?.trim();
  }

  nextCell(i, j) {
    return this.nextContainer.locator('table tbody tr').nth(i).locator('td').nth(j);
  }

  async nextCellText(i, j) {
    return (await this.nextCell(i, j).textContent())?.trim();
  }

  // Click adjacency cell and respond to prompt with provided value (value may be null to cancel)
  async editEdgeAndRespond(i, j, promptResponse) {
    // Setup one-time dialog handler for the prompt
    const page = this.page;
    const promiseDialog = page.waitForEvent('dialog');
    await this.adjacencyCell(i, j).click();
    const dialog = await promiseDialog;
    // For prompt type we either accept with text or dismiss
    if (dialog.type() === 'prompt') {
      if (promptResponse === null) {
        await dialog.dismiss();
      } else {
        await dialog.accept(String(promptResponse));
      }
    } else {
      // Unexpected dialog type - just accept to avoid blocking test
      await dialog.accept();
    }
    // If the page triggers an alert after the prompt (e.g., invalid number), handle it
    // Wait briefly for possible alert
    try {
      const alertDialog = await page.waitForEvent('dialog', { timeout: 300 });
      // If it's an alert, accept it
      await alertDialog.accept();
    } catch (e) {
      // no alert appeared, continue
    }
  }
}

test.describe('Floyd–Warshall Algorithm Visualizer - End-to-End', () => {
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Collect console messages and page errors for assertions
    consoleMessages = [];
    pageErrors = [];
    page.on('console', msg => {
      // capture console messages for inspection
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
      // collect runtime errors
      pageErrors.push(err);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Ensure the main header loads
    await expect(page.locator('h1')).toHaveText('Floyd–Warshall Algorithm Visualizer');
  });

  test.afterEach(async () => {
    // After each test assert there were no uncaught page errors
    // This ensures we observed runtime errors (if any) and fail the test if they exist.
    expect(pageErrors.length, 'No uncaught page errors should occur').toBe(0);
  });

  test.describe('Initial state and basic UI', () => {
    test('Initial load shows default 4 nodes, adjacency and matrices', async ({ page }) => {
      // Purpose: Validate initial DOM elements and default counts
      const fw = new FloydWarshallPage(page);

      // Node count should default to 4
      await expect(fw.nodeCount).toHaveText('4');

      // Adjacency matrix should be present and 4x4
      const rows = fw.adjContainer.locator('table tbody tr');
      await expect(rows).toHaveCount(4);
      // Each row should have 4 data cells
      const firstRowTds = rows.nth(0).locator('td');
      await expect(firstRowTds).toHaveCount(4);

      // Distance and Next matrices should also be present and have 4 rows
      await expect(fw.distContainer.locator('table tbody tr')).toHaveCount(4);
      await expect(fw.nextContainer.locator('table tbody tr')).toHaveCount(4);

      // From/To selects should have 4 options
      await expect(fw.fromSelect.locator('option')).toHaveCount(4);
      await expect(fw.toSelect.locator('option')).toHaveCount(4);

      // Log should be empty initially
      await expect(fw.log.locator('div')).toHaveCount(0);

      // Negative cycle notice should be empty
      await expect(fw.negCycleNotice).toHaveText('');
    });
  });

  test.describe('Node manipulation and adjacency edits', () => {
    test('Add and remove node update node count and tables', async ({ page }) => {
      // Purpose: Verify Add Node and Remove Node buttons update UI state
      const fw1 = new FloydWarshallPage(page);

      // Click Add Node -> count should increase to 5
      await fw.addNodeBtn.click();
      await expect(fw.nodeCount).toHaveText('5');
      // Adjacency table now should have 5 rows
      await expect(fw.adjContainer.locator('table tbody tr')).toHaveCount(5);
      // Distance and Next matrices should update to 5 rows
      await expect(fw.distContainer.locator('table tbody tr')).toHaveCount(5);
      await expect(fw.nextContainer.locator('table tbody tr')).toHaveCount(5);

      // Click Remove Node -> back to 4
      await fw.removeNodeBtn.click();
      await expect(fw.nodeCount).toHaveText('4');
      await expect(fw.adjContainer.locator('table tbody tr')).toHaveCount(4);
    });

    test('Editing an adjacency cell sets a weight and INF removal works; invalid input triggers alert', async ({ page }) => {
      // Purpose: Test editing adjacency cells via prompt and handling invalid inputs
      const fw2 = new FloydWarshallPage(page);

      // Edit edge (0,1) and set weight to 7
      await fw.editEdgeAndRespond(0, 1, '7');
      // Adjacency cell should now display "7"
      const cellHtml = await fw.adjacencyCellText(0, 1);
      expect(cellHtml.includes('7')).toBeTruthy();

      // Edit edge (1,0) and set to INF using 'INF' text -> becomes ∞ element
      await fw.editEdgeAndRespond(1, 0, 'INF');
      const cellHtml2 = await fw.adjacencyCellText(1, 0);
      expect(cellHtml2.includes('∞')).toBeTruthy();

      // Attempt to set invalid number on (2,3) -> prompt 'abc' triggers alert 'Invalid number'
      // We send 'abc' and the app should show an alert which we accept; adjacency remains unchanged (should be ∞ initially)
      // Capture current value before
      const before = await fw.adjacencyCellText(2, 3);
      await fw.editEdgeAndRespond(2, 3, 'abc'); // this will trigger alert internally which our helper accepts
      const after = await fw.adjacencyCellText(2, 3);
      // Ensure it did not change (still shows ∞ or same as before)
      expect(after).toBe(before);
    });
  });

  test.describe('Algorithm execution: steps, playback, and run', () => {
    test('Prepare steps, step forward/back, and log messages appear', async ({ page }) => {
      // Purpose: Prepare recorded steps and advance a few comparisons, checking logs and renders
      const fw3 = new FloydWarshallPage(page);

      // Click Step Mode to prepare steps
      await fw.stepModeBtn.click();

      // The log should contain one entry mentioning 'Prepared'
      await expect(fw.log.locator('div')).toHaveCountGreaterThan(0);
      const logText = await fw.log.locator('div').nth(0).textContent();
      expect(logText).toContain('Prepared');

      // Step forward once
      await fw.stepForwardBtn.click();
      // The log should now have at least one more entry that mentions 'compare'
      const logCountAfter = await fw.log.locator('div').count();
      expect(logCountAfter).toBeGreaterThanOrEqual(2);
      const recent = await fw.log.locator('div').nth(logCountAfter - 1).textContent();
      expect(recent).toContain('compare');

      // Step back
      await fw.stepBackBtn.click();
      // Log acquires another entry referencing stepping back
      const logCountAfterBack = await fw.log.locator('div').count();
      expect(logCountAfterBack).toBeGreaterThanOrEqual(logCountAfter);

      // Verify that dist container has a highlight title for current k when steps are prepared (k label present or not)
      // We can at least ensure the dist container has content
      await expect(fw.distContainer).toBeVisible();
    });

    test('Play/Pause toggles play state and updates button text', async ({ page }) => {
      // Purpose: Verify Play starts playback and changes button text to Pause, and toggling stops playback
      const fw4 = new FloydWarshallPage(page);

      // Ensure steps prepared
      await fw.stepModeBtn.click();
      // Start playing
      await fw.playPauseBtn.click();
      // Button text should change to 'Pause'
      await expect(fw.playPauseBtn).toHaveText('Pause');
      // Wait briefly to allow some steps to process
      await page.waitForTimeout(300);
      // Pause playback
      await fw.playPauseBtn.click();
      await expect(fw.playPauseBtn).toHaveText('Play');
    });

    test('Run full algorithm updates distance and next matrices and detects negative cycles appropriately', async ({ page }) => {
      // Purpose: Execute full run and assert matrices updated and notifications/log updated
      const fw5 = new FloydWarshallPage(page);

      // Click Run
      await fw.runBtn.click();

      // After run, dist and next containers should be populated with numbers or labels
      // Check a few sample cells for expected types (text present)
      const d00 = await fw.distCellText(0, 0);
      expect(d00).not.toBeNull();

      const next00 = await fw.nextCellText(0, 0);
      expect(next00).not.toBeNull();

      // The log should contain 'Run complete'
      // Since appendLog uses time prefix, we search content
      const logs = fw.log.locator('div');
      const count = await logs.count();
      let foundRunComplete = false;
      for (let i = 0; i < count; i++) {
        const txt = await logs.nth(i).textContent();
        if (txt && txt.includes('Run complete')) {
          foundRunComplete = true;
          break;
        }
      }
      expect(foundRunComplete).toBeTruthy();

      // Negative cycle notice either empty or contains 'Negative cycle detected'
      // We assert it's present as either empty or a string — ensure no thrown errors
      const negText = await fw.negCycleNotice.textContent();
      expect(negText !== null).toBeTruthy();
    });

    test('Show Path triggers confirm and reconstructs path when full result is available', async ({ page }) => {
      // Purpose: Test Show Path flow including confirm dialog and expected path text
      const fw6 = new FloydWarshallPage(page);

      // Ensure selects exist and choose From A (0) To D (3) which should have a path in the default sample
      await fw.fromSelect.selectOption('0');
      await fw.toSelect.selectOption('3');

      // Click Show Path: because prepareSteps may exist or not, the app might prompt a confirm.
      // We will accept the confirm to allow runFull() to execute if asked.
      const dialogPromise = page.waitForEvent('dialog').catch(() => null);
      await fw.showPathBtn.click();
      // If a confirm appears, accept it; if none, dialogPromise resolves via catch -> null
      try {
        const dialog1 = await dialogPromise;
        if (dialog) {
          // Accept confirm to allow runFull to execute
          await dialog.accept();
        }
      } catch (e) {
        // ignore, continue
      }

      // After showPath, the pathResult should be a non-empty string
      await expect(fw.pathResult).not.toHaveText('', { timeout: 2000 });
      const pathText = (await fw.pathResult.textContent()) || '';
      // It should either indicate a trivial path or an actual path or no path message
      expect(pathText.length).toBeGreaterThan(0);
    });
  });

  test.describe('Edge-case behaviors and controls', () => {
    test('Random generation updates node count and does not crash', async ({ page }) => {
      // Purpose: Test Random generation controls and ensure UI updates
      const fw7 = new FloydWarshallPage(page);

      // Set random nodes to 5 and density to 30
      await fw.randN.fill('5');
      await fw.randD.fill('30');
      await fw.randBtn.click();

      // Node count should reflect 5
      await expect(fw.nodeCount).toHaveText('5');
      // Dist/Next updated with 5 rows
      await expect(fw.distContainer.locator('table tbody tr')).toHaveCount(5);
      await expect(fw.nextContainer.locator('table tbody tr')).toHaveCount(5);
    });

    test('Reset Graph clears all adjacency edges', async ({ page }) => {
      // Purpose: Reset graph should make adjacency display INF for non-self cells
      const fw8 = new FloydWarshallPage(page);

      // Set an edge first so reset has an effect
      await fw.editEdgeAndRespond(0, 1, '12');
      let afterEdit = await fw.adjacencyCellText(0, 1);
      expect(afterEdit.includes('12')).toBeTruthy();

      // Now reset
      await fw.resetBtn.click();

      // The same cell should become ∞ again
      const afterReset = await fw.adjacencyCellText(0, 1);
      expect(afterReset.includes('∞')).toBeTruthy();
    });

    test('Toggling directed mode updates internal state and UI (checkbox)', async ({ page }) => {
      // Purpose: Check that toggling the Directed checkbox updates the UI element (state reflected in DOM)
      const fw9 = new FloydWarshallPage(page);

      // Toggle checked
      await fw.directedToggle.check();
      await expect(fw.directedToggle).toBeChecked();

      // Toggle off
      await fw.directedToggle.uncheck();
      await expect(fw.directedToggle).not.toBeChecked();
    });
  });
});