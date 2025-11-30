import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c1-cd33-11f0-bdf9-b3d97e91273d.html';

test.describe('Depth-First Search (DFS) Visualization - 20d2d6c1-cd33-11f0-bdf9-b3d97e91273d', () => {
  // Keep console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Setup and teardown: each test opens a new page and collects console/errors
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto(APP_URL);
    // Ensure page loaded
    await expect(page).toHaveTitle(/Depth-First Search/);
  });

  test.afterEach(async () => {
    // Nothing special to teardown; arrays are reset in beforeEach for next test
  });

  test('should load initial UI elements and render graph (nodes and edges)', async ({ page }) => {
    // Purpose: Verify initial page load, presence of interactive controls, SVG, and initial log message.

    // Header exists
    await expect(page.locator('h1')).toHaveText(/Depth-First Search \(DFS\) Visualization/);

    // Controls: start input and buttons are present and visible
    const startInput = page.locator('#start-node');
    const startBtn = page.locator('#start-btn');
    const resetBtn = page.locator('#reset-btn');

    await expect(startInput).toBeVisible();
    await expect(startBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();

    // Default value for start input is "0"
    await expect(startInput).toHaveValue('0');

    // SVG graph exists and has role/aria-label
    const svg = page.locator('svg#graph');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg).toHaveAttribute('aria-label', /Graph visualization/);

    // There should be 7 node circles and 7 edge lines drawn
    const nodes = page.locator('svg#graph circle.node');
    const edges = page.locator('svg#graph line.edge');

    await expect(nodes).toHaveCount(7);
    await expect(edges).toHaveCount(7);

    // Each node has an accessible aria-label of form "Node N"
    for (let i = 0; i < 7; i++) {
      await expect(page.locator(`svg#graph circle[aria-label="Node ${i}"]`)).toBeVisible();
    }

    // The initial log contains the starting instruction message
    const log = page.locator('#log');
    await expect(log).toContainText("Enter a start node and click 'Start DFS' to begin.");

    // Assert that there were no uncaught JS errors on initial load
    expect(pageErrors.length).toBe(0);

    // Save a quick snapshot of console info messages exist (the app writes logs into #log via DOM, not console),
    // but make sure we did capture some console messages (could be none). We won't force any console error expectation here.
  });

  test('should run full DFS from default start node and highlight nodes and edges correctly', async ({ page }) => {
    // Purpose: Start DFS from node 0 and assert nodes/edges highlight and logs reflect traversal order and completion.

    const log1 = page.locator('#log1');
    const startBtn1 = page.locator('#start-btn');

    // Click Start DFS
    await startBtn.click();

    // Wait for completion message (the animation uses delays; give generous timeout)
    await expect(log.locator('text=DFS Complete.')).toHaveCount(1, { timeout: 20000 });

    // After completion, all 7 nodes should have class 'visited' applied
    const visitedNodes = page.locator('svg#graph circle.node.visited');
    await expect(visitedNodes).toHaveCount(7);

    // Edges: algorithm will traverse 6 of the 7 edges (2->5 is expected to be skipped because 5 already visited)
    const visitedEdges = page.locator('svg#graph line.edge.visited');
    await expect(visitedEdges).toHaveCount(6);

    // Verify specific log entries exist indicating traversal and start
    await expect(log).toContainText('Starting DFS from node 0');
    await expect(log).toContainText('Visiting node 0');
    await expect(log).toContainText('Traversing edge 0 → 1');
    await expect(log).toContainText('Traversing edge 0 → 2');

    // Double-check there are no uncaught exceptions produced during the run
    expect(pageErrors.length).toBe(0);

    // Also ensure that the final log shows the complete notice and is visually present
    const lastLogEntry = await log.locator('div').last().innerText();
    expect(lastLogEntry).toContain('DFS Complete.');
  });

  test('should show alert when clicking Reset while DFS animation is running', async ({ page }) => {
    // Purpose: Ensure the Reset button alerts the user if a DFS is currently animating.

    const startBtn2 = page.locator('#start-btn');
    const resetBtn1 = page.locator('#reset-btn');

    // Prepare to capture the dialog that should appear when clicking reset while animating
    let dialogMessage = null;
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept(); // close the alert
    });

    // Start the DFS and immediately attempt to click Reset
    await startBtn.click();

    // small pause to ensure the start handler has set animating = true (handler is synchronous up to the first await)
    await page.waitForTimeout(10);

    // Click reset while animating; the page should produce an alert dialog
    await resetBtn.click();

    // Give a short time for dialog handler to fire
    await page.waitForTimeout(200);

    // Assert the dialog was shown with the exact expected message
    expect(dialogMessage).toBe('Wait for current DFS to finish or refresh the page.');

    // Wait for DFS to finish so subsequent tests start from a stable state (timeout generous)
    await expect(page.locator('#log').locator('text=DFS Complete.')).toHaveCount(1, { timeout: 20000 });
  });

  test('should reset graph state after completion and remove visited highlights', async ({ page }) => {
    // Purpose: After a full DFS run, Reset should clear visited highlights and append "Reset graph." in the log.

    const startBtn3 = page.locator('#start-btn');
    const resetBtn2 = page.locator('#reset-btn');
    const log2 = page.locator('#log2');

    // Start and wait for completion
    await startBtn.click();
    await expect(log.locator('text=DFS Complete.')).toHaveCount(1, { timeout: 20000 });

    // Verify visited nodes exist before reset
    await expect(page.locator('svg#graph circle.node.visited')).toHaveCount(7);

    // Click Reset when not animating (should not trigger alert)
    await resetBtn.click();

    // The log should contain "Reset graph."
    await expect(log).toContainText('Reset graph.');

    // After reset, no node should have 'visited' or 'current' classes
    await expect(page.locator('svg#graph circle.node.visited')).toHaveCount(0);
    await expect(page.locator('svg#graph circle.node.current')).toHaveCount(0);

    // Also edges should not have 'visited' class
    await expect(page.locator('svg#graph line.edge.visited')).toHaveCount(0);

    // No uncaught JS errors on reset
    expect(pageErrors.length).toBe(0);
  });

  test('should normalize invalid start node input on change (input validation)', async ({ page }) => {
    // Purpose: Ensure the start input change handler normalizes values outside 0-6 back to 0.

    const startInput1 = page.locator('#start-node');

    // Fill an out-of-range value and then move focus away to trigger the 'change' listener
    await startInput.fill('9');
    // Blur the input to force change event by clicking body
    await page.locator('body').click();

    // The change handler sets invalid values back to 0
    await expect(startInput).toHaveValue('0');

    // Try a negative value
    await startInput.fill('-5');
    await page.locator('body').click();
    await expect(startInput).toHaveValue('0');

    // Try a non-numeric value (will be reset to 0)
    await startInput.fill('abc');
    await page.locator('body').click();
    await expect(startInput).toHaveValue('0');

    // Ensure no JS errors occurred during these interactions
    expect(pageErrors.length).toBe(0);
  });

  test('accessibility checks: log aria-live and nodes have titles and aria-labels', async ({ page }) => {
    // Purpose: Basic accessibility verifications for role/aria attributes.

    // The log region should have role=log and aria-live attribute
    const log3 = page.locator('#log3');
    await expect(log).toHaveAttribute('role', 'log');
    // aria-live exists and is polite
    await expect(log).toHaveAttribute('aria-live', 'polite');

    // Each node circle includes a title attribute and an aria-label
    for (let i = 0; i < 7; i++) {
      const node = page.locator(`svg#graph circle[aria-label="Node ${i}"]`);
      await expect(node).toHaveAttribute('title', `Node ${i}`);
      await expect(node).toHaveAttribute('aria-label', `Node ${i}`);
      // Nodes should be keyboard focusable via tabindex attribute
      await expect(node).toHaveAttribute('tabindex', '0');
    }

    // No uncaught page errors during accessibility checks
    expect(pageErrors.length).toBe(0);
  });
});