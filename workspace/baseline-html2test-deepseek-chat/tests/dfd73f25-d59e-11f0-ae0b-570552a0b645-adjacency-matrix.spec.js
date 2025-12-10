import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-deepseek-chat/html/dfd73f25-d59e-11f0-ae0b-570552a0b645.html';

// Helper to attach listeners for console and page errors for a given page.
// Returns references to the captured arrays so tests can assert on them.
function attachErrorListeners(page) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') consoleErrors.push(msg.text());
    else if (type === 'warning') consoleWarnings.push(msg.text());
    else consoleLogs.push({ type, text: msg.text() });
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  return { consoleErrors, consoleWarnings, consoleLogs, pageErrors };
}

test.describe('Adjacency Matrix Visualization (dfd73f25-d59e-11f0-ae0b-570552a0b645)', () => {
  // Use a serial describe to avoid parallel tests interfering with shared server state
  test.describe.serial(() => {
    // Test initial page load and default state
    test('loads the application and shows default matrix and graph state', async ({ page }) => {
      // Attach listeners to capture console and page errors for this test run
      const { consoleErrors, consoleWarnings, consoleLogs, pageErrors } = attachErrorListeners(page);

      // Navigate to the app page
      await page.goto(APP_URL);

      // Basic page sanity checks: title and header present
      await expect(page.locator('h1')).toHaveText('Adjacency Matrix Visualization');

      // Verify the default vertex count input value is "5"
      const vertexCountInput = page.locator('#vertexCount');
      await expect(vertexCountInput).toHaveValue('5');

      // The matrix element should exist
      const matrix = page.locator('#matrix');
      await expect(matrix).toBeVisible();

      // For default vertexCount = 5, the matrix grid has (vertexCount + 1) * (vertexCount + 1) cells (including headers)
      const vertexCount = 5;
      const expectedCellCount = (vertexCount + 1) * (vertexCount + 1);
      const matrixCells = matrix.locator('.matrix-cell');
      await expect(matrixCells).toHaveCount(expectedCellCount);

      // Check that there are 5 vertex elements in the graph display and initially no edge-lines
      const graphDisplay = page.locator('#graphDisplay');
      await expect(graphDisplay.locator('.vertex')).toHaveCount(vertexCount);
      await expect(graphDisplay.locator('.edge-line')).toHaveCount(0);

      // Ensure there were no console errors or page errors during initial load
      expect(consoleErrors.length, `console errors: ${consoleErrors.join('; ')}`).toBe(0);
      expect(pageErrors.length, `page errors: ${pageErrors.join('; ')}`).toBe(0);

      // It's acceptable to have non-error logs/warnings; include them in test diagnostics if present
      if (consoleWarnings.length) {
        console.log('Console warnings during load:', consoleWarnings);
      }
      if (consoleLogs.length) {
        // Keep logs quiet unless debugging
      }
    });

    // Test updating the vertex count via the input and update button
    test('updates matrix size when vertex count is changed and Update clicked', async ({ page }) => {
      const { consoleErrors, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      const vertexCountInput = page.locator('#vertexCount');
      const updateBtn = page.locator('#updateSize');
      const matrix = page.locator('#matrix');
      const graphDisplay = page.locator('#graphDisplay');

      // Change vertex count to 3 and click Update
      await vertexCountInput.fill('3');
      await updateBtn.click();

      // Expect the input value to be clamped/confirmed to 3
      await expect(vertexCountInput).toHaveValue('3');

      // Now expect (3 + 1)^2 matrix cells including headers
      const expectedCells = 16; // (3+1)*(3+1)
      await expect(matrix.locator('.matrix-cell')).toHaveCount(expectedCells);

      // Expect 3 vertices in graph display and no edges initially
      await expect(graphDisplay.locator('.vertex')).toHaveCount(3);
      await expect(graphDisplay.locator('.edge-line')).toHaveCount(0);

      // No console or page errors during this interaction
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    // Test toggling directed/undirected mode updates button text and class and reinitializes matrix
    test('toggle directed/undirected updates button text, active class, and resets matrix', async ({ page }) => {
      const { consoleErrors, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      const toggleDirectedBtn = page.locator('#toggleDirected');
      const matrix = page.locator('#matrix');

      // By default button text is "Toggle Directed/Undirected" (initial label); clicking changes to "Directed"
      await toggleDirectedBtn.click();

      // The implementation sets textContent to 'Directed' or 'Undirected' after toggle
      await expect(toggleDirectedBtn).toHaveText(/Directed|Undirected/);
      // The active class should be present when directed (true)
      const classAttr = await toggleDirectedBtn.getAttribute('class');
      expect(classAttr?.includes('active')).toBe(true);

      // Matrix should have been re-initialized: no edge or weighted classes present
      const anyEdgeCells = await matrix.locator('.edge, .weighted').count();
      expect(anyEdgeCells).toBe(0);

      // Toggle back to undirected to restore default semantics for later tests
      await toggleDirectedBtn.click();
      const classAttrAfter = await toggleDirectedBtn.getAttribute('class');
      // active should be absent now
      expect(classAttrAfter?.includes('active')).toBe(false);

      // No console or page errors observed
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    // Test toggling weighted mode and clicking a cell creates a weighted edge and shows weight labels in the graph visualization
    test('toggle weighted and clicking a matrix cell creates a weighted edge with a visible weight label', async ({ page }) => {
      const { consoleErrors, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      const toggleWeightedBtn = page.locator('#toggleWeighted');
      const matrix = page.locator('#matrix');
      const graphDisplay = page.locator('#graphDisplay');

      // Toggle weighted mode on
      await toggleWeightedBtn.click();
      await expect(toggleWeightedBtn).toHaveText(/Weighted|Unweighted/);
      const toggleClass = await toggleWeightedBtn.getAttribute('class');
      expect(toggleClass?.includes('active')).toBe(true);

      // Click a non-diagonal cell (0,1) to add a weighted edge (undirected by default)
      const cell01 = matrix.locator('[data-row="0"][data-col="1"]');
      await cell01.click();

      // After clicking in weighted mode, the cell should contain a number and have the 'weighted' class
      const cellText = await cell01.textContent();
      expect(cellText).toMatch(/^[1-9]$/); // weight is random between 1 and 9

      const cellClass = await cell01.getAttribute('class');
      expect(cellClass?.includes('weighted')).toBe(true);

      // Because the app uses undirected mode by default, the symmetric cell (1,0) should also show the same weight and class
      const cell10 = matrix.locator('[data-row="1"][data-col="0"]');
      await expect(cell10).toHaveText(cellText);
      const cell10Class = await cell10.getAttribute('class');
      expect(cell10Class?.includes('weighted')).toBe(true);

      // In the graph display, there should be at least one edge-line and at least one weight label (text node with the weight)
      await expect(graphDisplay.locator('.edge-line')).toHaveCountGreaterThan(0);

      // Find a weight label by searching for a text node with the weight value we've observed
      const weightLabelLocator = graphDisplay.locator(`text=${cellText}`);
      await expect(weightLabelLocator).toHaveCountGreaterThan(0);

      // No console or page errors observed
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    // Test toggling edges by clicking cells in undirected mode: toggles presence then absence
    test('clicking a matrix cell toggles an undirected edge on and off', async ({ page }) => {
      const { consoleErrors, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      const matrix = page.locator('#matrix');
      const graphDisplay = page.locator('#graphDisplay');

      // Ensure we are in unweighted mode for deterministic 'edge' class behavior: if toggleWeighted was left active in prior serial tests,
      // toggle it off to return to unweighted. The button text and class indicates current state; attempt to ensure unweighted.
      const toggleWeightedBtn = page.locator('#toggleWeighted');
      const toggleText = await toggleWeightedBtn.textContent();
      if (toggleText?.trim() === 'Weighted') {
        // currently unweighted as initial label; if it's 'Weighted' that indicates active state post-click in previous test
      } else {
        // If active, click to ensure unweighted. We handle both safely.
        await toggleWeightedBtn.click();
      }

      // Click cell (0,1) to create an unweighted edge (value = 1 and class 'edge')
      const cell01 = matrix.locator('[data-row="0"][data-col="1"]');
      await cell01.click();

      await expect(cell01).toHaveText('1');
      let cell01Class = await cell01.getAttribute('class');
      expect(cell01Class?.includes('edge')).toBe(true);

      // Symmetric cell should also be updated in undirected mode
      const cell10 = matrix.locator('[data-row="1"][data-col="0"]');
      await expect(cell10).toHaveText('1');
      let cell10Class = await cell10.getAttribute('class');
      expect(cell10Class?.includes('edge')).toBe(true);

      // There should be at least one edge-line in graph display
      await expect(graphDisplay.locator('.edge-line')).toHaveCountGreaterThan(0);

      // Click the same cell again to remove the edge
      await cell01.click();

      // Both cells should be cleared (no text and no 'edge' class)
      await expect(cell01).toHaveText('');
      cell01Class = await cell01.getAttribute('class');
      expect(cell01Class?.includes('edge')).toBe(false);

      await expect(cell10).toHaveText('');
      cell10Class = await cell10.getAttribute('class');
      expect(cell10Class?.includes('edge')).toBe(false);

      // Graph display should have no edge-lines now
      await expect(graphDisplay.locator('.edge-line')).toHaveCount(0);

      // No console or page errors observed
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    // Test that clicking a diagonal (self-loop) cell does nothing (self-loops are disallowed)
    test('clicking a diagonal matrix cell (self-loop) does not create an edge', async ({ page }) => {
      const { consoleErrors, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      const matrix = page.locator('#matrix');
      const cell00 = matrix.locator('[data-row="0"][data-col="0"]');

      // Click the diagonal cell; implementation should ignore this click
      await cell00.click();

      // The diagonal cell should remain empty and not have edge or weighted classes
      await expect(cell00).toHaveText('');
      const classAttr = await cell00.getAttribute('class');
      expect(classAttr?.includes('edge')).toBe(false);
      expect(classAttr?.includes('weighted')).toBe(false);

      // No console or page errors observed
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    // Test reset button clears all edges and resets the visualizations
    test('reset graph clears all edges and re-renders an empty adjacency matrix', async ({ page }) => {
      const { consoleErrors, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      const matrix = page.locator('#matrix');
      const resetBtn = page.locator('#resetGraph');
      const graphDisplay = page.locator('#graphDisplay');

      // Create an edge first by clicking (0,1)
      const cell01 = matrix.locator('[data-row="0"][data-col="1"]');
      await cell01.click();

      // Confirm an edge exists
      await expect(cell01).toHaveCount(1);
      await expect(cell01).toHaveText(/^[1-9]$|^1$/); // either weighted from previous state or unweighted 1

      // Now click reset
      await resetBtn.click();

      // After reset, there should be no edge or weighted classes anywhere in the matrix
      const anyEdgeOrWeighted = await matrix.locator('.edge, .weighted').count();
      expect(anyEdgeOrWeighted).toBe(0);

      // Graph display should have 0 edge-lines after reset
      await expect(graphDisplay.locator('.edge-line')).toHaveCount(0);

      // No console or page errors observed
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);
    });

    // Aggregate test to ensure no unexpected runtime errors occur throughout typical usage flows
    test('no uncaught console errors or page errors during a sequence of interactions', async ({ page }) => {
      // For this test we purposefully exercise many controls in sequence and assert no uncaught errors are produced.
      const { consoleErrors, consoleWarnings, pageErrors } = attachErrorListeners(page);
      await page.goto(APP_URL);

      // Exercise controls
      await page.locator('#toggleDirected').click();
      await page.locator('#toggleWeighted').click();
      // Click a few cells to create edges
      const matrix = page.locator('#matrix');
      await matrix.locator('[data-row="0"][data-col="1"]').click();
      await matrix.locator('[data-row="1"][data-col="2"]').click();
      // Update size
      await page.locator('#vertexCount').fill('4');
      await page.locator('#updateSize').click();
      // Reset
      await page.locator('#resetGraph').click();

      // After exercising, assert that there were no console errors or uncaught page errors
      expect(consoleErrors.length, `Console errors encountered: ${consoleErrors.join(' | ')}`).toBe(0);
      expect(pageErrors.length, `Page errors encountered: ${pageErrors.join(' | ')}`).toBe(0);

      // Warnings are not considered test failures but we log their presence for awareness
      if (consoleWarnings.length > 0) {
        console.log('Console warnings during sequence:', consoleWarnings.slice(0, 10));
      }
    });
  });
});