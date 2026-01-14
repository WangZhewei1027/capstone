import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd7663e-d59e-11f0-ae0b-570552a0b645.html';

test.describe('Bellman-Ford Algorithm Visualization (dfd7663e-d59e-11f0-ae0b-570552a0b645)', () => {
  // Arrays to capture console error messages and page errors for each test
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for uncaught exceptions on the page
    page.on('pageerror', (err) => {
      pageErrors.push(err && err.message ? err.message : String(err));
    });

    // Navigate to the application page (load as-is, no modifications)
    await page.goto(APP_URL);
    // Ensure the page has loaded the main elements before continuing
    await expect(page.locator('h1')).toHaveText('Bellman-Ford Algorithm Visualization');
  });

  test.afterEach(async () => {
    // After each test we assert that no console errors or page errors occurred.
    // This verifies that the application executed without throwing unexpected runtime errors.
    expect(consoleErrors, `Console errors were logged: ${consoleErrors.join('\n')}`).toEqual([]);
    expect(pageErrors, `Page errors were thrown: ${pageErrors.join('\n')}`).toEqual([]);
  });

  test('Initial load: UI components and default state are present', async ({ page }) => {
    // Verify main headings and informational text on initial load
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Bellman-Ford Algorithm Visualization');

    // The step info should guide the user to click Next Step
    const stepInfo = page.locator('#stepInfo');
    await expect(stepInfo).toBeVisible();
    await expect(stepInfo).toContainText('Click "Next Step" to start the algorithm execution.');

    // All control buttons and select should be visible and enabled initially
    await expect(page.locator('#stepBtn')).toBeVisible();
    await expect(page.locator('#runBtn')).toBeVisible();
    await expect(page.locator('#resetBtn')).toBeVisible();
    await expect(page.locator('#randomGraphBtn')).toBeVisible();
    await expect(page.locator('#graphSelect')).toBeVisible();

    // Canvas should exist and have expected dimensions
    const canvas = page.locator('#graphCanvas');
    await expect(canvas).toBeVisible();
    // Check attributes of the canvas element
    await expect(canvas).toHaveAttribute('width', '500');
    await expect(canvas).toHaveAttribute('height', '400');

    // Distance table should initialize with one row per default node (default graph has 5 nodes)
    const rows = page.locator('#distanceTableBody tr');
    await expect(rows).toHaveCount(5);

    // Check initial distance values (source 0 should be 0, others ∞)
    const firstRowCells = page.locator('#distanceTableBody tr').first().locator('td');
    await expect(firstRowCells.nth(0)).toHaveText('0'); // vertex id
    await expect(firstRowCells.nth(1)).toHaveText('0'); // distance for source is 0
    await expect(firstRowCells.nth(2)).toHaveText('-'); // previous is '-'
  });

  test('Clicking "Next Step" progresses algorithm initialization and relaxation rounds (no negative cycle)', async ({ page }) => {
    // This test validates the normal flow for the default "simple" graph (no negative cycle).
    const stepBtn = page.locator('#stepBtn');
    const algorithmSteps = page.locator('#algorithmSteps');
    const stepInfo = page.locator('#stepInfo');

    // 1) First click should initialize distances (step 1)
    await stepBtn.click();
    await expect(algorithmSteps).toContainText('Step 1: Initialize distances');
    await expect(stepInfo).toContainText('Initialization complete.');

    // 2) Perform the relaxation rounds until completion.
    // For the default graph of 5 nodes, maxSteps = 4, and we need to:
    // - call step once for initialization (done)
    // - call nextStep maxSteps (4) times for relaxation rounds
    // - call nextStep once more to trigger final negative cycle check
    const totalRelaxationCalls = 4; // for 5 nodes
    for (let i = 0; i < totalRelaxationCalls; i++) {
      await stepBtn.click();
      // After each relaxation round we expect the algorithmSteps to have an entry for that round
      // We can't rely on exact distances for all steps, but we can assert that a Step N entry appears.
      await expect(algorithmSteps).toContainText(`Step ${2 + i}:`); // Step numbering in algorithmSteps increments
    }

    // Final call to check for negative cycles / finalization
    await stepBtn.click();

    // Final step info should indicate completion without negative cycles
    await expect(stepInfo).toContainText('Algorithm completed successfully. No negative cycles detected.');
    await expect(algorithmSteps).toContainText('Final step: No negative cycles detected. Algorithm complete.');

    // After algorithm completion, distance table should show finite values for reachable nodes.
    const rows = page.locator('#distanceTableBody tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const distanceText = await rows.nth(i).locator('td').nth(1).innerText();
      // distances should not be empty; either a number or '∞'
      expect(distanceText.length).toBeGreaterThan(0);
    }
  });

  test('Selecting "Graph with Negative Cycle" detects negative cycle after steps', async ({ page }) => {
    // This test selects the "cycle" graph which creates a negative cycle and verifies detection.
    const graphSelect = page.locator('#graphSelect');
    const stepBtn = page.locator('#stepBtn');
    const stepInfo = page.locator('#stepInfo');
    const algorithmSteps = page.locator('#algorithmSteps');

    // Select the 'cycle' graph option
    await graphSelect.selectOption('cycle');

    // Verify the distance table now matches the number of nodes (5 nodes for this graph)
    await expect(page.locator('#distanceTableBody tr')).toHaveCount(5);

    // We need to run the sequence of steps to reach the negative cycle check.
    // As described by the implementation:
    // - 1 click: initialization
    // - maxSteps clicks: relaxation rounds (for 5 nodes maxSteps = 4)
    // - 1 click: negative cycle detection check
    // Total clicks = maxSteps + 2 = 6
    const clicksNeeded = 6;
    for (let i = 0; i < clicksNeeded; i++) {
      await stepBtn.click();
    }

    // After completing, the stepInfo should contain "Negative cycle detected!"
    await expect(stepInfo).toContainText('Negative cycle detected');

    // algorithmSteps should also include a paragraph with negative cycle message
    await expect(algorithmSteps).toContainText('Negative cycle detected');

    // The stepInfo element should include the negative-cycle class span as per implementation
    const negativeSpan = page.locator('#stepInfo .negative-cycle');
    await expect(negativeSpan).toBeVisible();
    await expect(negativeSpan).toContainText('Negative cycle detected');
  });

  test('Run/Pause button toggles running state text appropriately', async ({ page }) => {
    // This test ensures that toggling Run/Pause updates button text and does not throw errors
    const runBtn = page.locator('#runBtn');

    // Initial state should say "Run Algorithm"
    await expect(runBtn).toHaveText('Run Algorithm');

    // Click to start running - should change text to 'Pause'
    await runBtn.click();
    await expect(runBtn).toHaveText('Pause');

    // Immediately click again to pause - should change back to 'Run Algorithm'
    await runBtn.click();
    await expect(runBtn).toHaveText('Run Algorithm');
  });

  test('Generate Random Graph creates a 6-node graph and Reset restores initial distances', async ({ page }) => {
    // This test checks the "Generate Random Graph" functionality and that Reset behaves correctly.
    const randomGraphBtn = page.locator('#randomGraphBtn');
    const resetBtn = page.locator('#resetBtn');
    const stepBtn = page.locator('#stepBtn');

    // Generate a random graph (implementation uses 6 nodes)
    await randomGraphBtn.click();

    // Distance table should now have 6 rows (6 nodes)
    await expect(page.locator('#distanceTableBody tr')).toHaveCount(6);

    // Make a change by performing a step (initialization)
    await stepBtn.click();
    await expect(page.locator('#algorithmSteps')).toContainText('Step 1: Initialize distances');

    // Now click Reset to restore algorithm state
    await resetBtn.click();
    await expect(page.locator('#stepInfo')).toContainText('Algorithm reset. Ready to start from source node 0.');

    // After reset, distance table should show source = 0 and others = ∞
    const rows = page.locator('#distanceTableBody tr');
    const count = await rows.count();
    expect(count).toBe(6); // still 6 nodes after reset

    // Verify first row is source=0 with distance 0
    await expect(rows.nth(0).locator('td').nth(0)).toHaveText('0');
    await expect(rows.nth(0).locator('td').nth(1)).toHaveText('0');

    // Verify at least one other node shows ∞ after reset
    if (count > 1) {
      await expect(rows.nth(1).locator('td').nth(1)).toHaveText('∞');
    }
  });
});