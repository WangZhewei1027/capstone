import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa594-d59e-11f0-89ab-2f71529652ac.html';

test.describe('Weighted Graph Visualization (7e8aa594-d59e-11f0-89ab-2f71529652ac)', () => {
  // Shared arrays to capture runtime diagnostics
  let pageErrors = [];
  let consoleErrors = [];
  let consoleMessages = [];

  // Helper: return locator for node by its text content (node label)
  const nodeLocator = (page, label) => page.locator('.node', { hasText: label });

  test.beforeEach(async ({ page }) => {
    // Reset diagnostic collectors
    pageErrors = [];
    consoleErrors = [];
    consoleMessages = [];

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (err) => {
      // Collect Error objects (for assertions later)
      pageErrors.push(err);
    });

    // Listen for console messages and store error-level messages separately
    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the target application page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // No teardown required beyond Playwright's automatic cleanup.
    // Diagnostics arrays could be inspected by individual tests as needed.
  });

  test('page loads with expected static content and graph container', async ({ page }) => {
    // Purpose: Verify that the page title, heading and description exist and the graph container is present.
    await expect(page).toHaveTitle(/Weighted Graph Visualization/);

    // Check h1 text
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Weighted Graph Visualization');

    // Check descriptive paragraph
    const para = page.locator('p');
    await expect(para).toHaveText(/Click on a node to show its adjacent nodes with weights\./);

    // Check graph container presence and dimensions (as defined in CSS)
    const graphContainer = page.locator('#graph-container');
    await expect(graphContainer).toBeVisible();

    // Ensure the container has the expected width/height style (from CSS rules)
    const box = await graphContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // CSS defined width:600 height:400 - allow some leeway for rendering differences
      expect(box.width).toBeGreaterThanOrEqual(580);
      expect(box.height).toBeGreaterThanOrEqual(380);
    }
  });

  test('graph renders four nodes with correct labels and positions', async ({ page }) => {
    // Purpose: Verify nodes A, B, C, D are rendered and have the expected positions applied inline.
    const nodes = page.locator('.node');
    await expect(nodes).toHaveCount(4); // Expect exactly four node elements

    // Verify each expected node exists and check its text and style left/top values
    const expectedNodes = {
      A: { x: 100, y: 100 },
      B: { x: 300, y: 100 },
      C: { x: 200, y: 250 },
      D: { x: 400, y: 200 }
    };

    for (const [label, coords] of Object.entries(expectedNodes)) {
      const locator = nodeLocator(page, label);
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();

      // Check inner text is the label
      await expect(locator).toHaveText(label);

      // Evaluate inline style left/top values (should be like "100px", "100px")
      const style = await locator.evaluate((el) => {
        return { left: el.style.left, top: el.style.top };
      });
      // Ensure style strings exist
      expect(style.left).toBeTruthy();
      expect(style.top).toBeTruthy();

      // Parse pixel values and compare to expected coordinates
      const leftPx = parseInt(style.left.replace('px', ''), 10);
      const topPx = parseInt(style.top.replace('px', ''), 10);
      expect(leftPx).toBe(coords.x);
      expect(topPx).toBe(coords.y);

      // Ensure node has visual styles applied (via computed styles)
      const computed = await locator.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          width: cs.width,
          height: cs.height,
          backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius
        };
      });
      expect(computed.width).toBeDefined();
      expect(computed.height).toBeDefined();
      // Should be circular (borderRadius likely "50%")
      expect(computed.borderRadius).toMatch(/50%|15px|0.5/);
      // Background color should not be transparent (the CSS sets #4CAF50)
      expect(computed.backgroundColor).not.toBe('');
    }
  });

  test('edges and weight labels are rendered and include expected weights', async ({ page }) => {
    // Purpose: Validate that edge elements and label elements are present and weights are displayed
    const edges = page.locator('.edge');
    const labels = page.locator('.label');

    // There should be at least the number of unique edges (4) but implementation draws both directions
    await expect(edges.count()).toBeGreaterThanOrEqual(4);
    await expect(labels.count()).toBeGreaterThanOrEqual(4);

    // Collect label texts and ensure all expected weights appear at least once
    const labelTexts = await labels.allTextContents();
    const requiredWeights = ['5', '10', '2', '4'];
    for (const w of requiredWeights) {
      const found = labelTexts.some(txt => txt.trim() === w);
      expect(found).toBeTruthy();
    }

    // Ensure edges have non-zero width (they represent lines between nodes)
    const widths = await edges.evaluateAll((els) => els.map(e => {
      const cs1 = window.getComputedStyle(e);
      // width may be set inline or via style.width
      return parseFloat(cs.width || e.style.width || '0');
    }));
    for (const w of widths) {
      expect(w).toBeGreaterThan(0);
    }
  });

  test('clicking node A triggers an alert with its adjacent edges (weights)', async ({ page }) => {
    // Purpose: Simulate user clicking a node and verify the alert contains the correct data for that node.
    // Prepare to capture the dialog
    let dialogMessage = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept(); // close the alert so test can continue
    });

    // Click node A
    await nodeLocator(page, 'A').click();

    // Wait briefly to ensure dialog handler fired
    await page.waitForTimeout(100);

    // Verify that an alert/dialog was shown and that it contains Node: A and the expected edges
    expect(dialogMessage).not.toBeNull();
    expect(dialogMessage).toContain('Node: A');

    // The payload includes JSON of edges; assert it contains expected edge entries and weights
    expect(dialogMessage).toContain('"B":5');
    expect(dialogMessage).toContain('"C":10');
  });

  test('clicking a non-node area does not trigger an alert', async ({ page }) => {
    // Purpose: Clicking empty space in the graph container should not produce the node alert.
    let dialogCount = 0;
    const dialogHandler = async (dialog) => {
      dialogCount += 1;
      await dialog.dismiss();
    };
    page.on('dialog', dialogHandler);

    // Click near top-left corner inside graph container where no node exists (nodes are at >100px)
    const container = page.locator('#graph-container');
    const box1 = await container.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Choose a point likely empty, e.g., 10,10 relative to container
      await page.mouse.click(box.x + 10, box.y + 10);
      // Give small time for any dialog to appear
      await page.waitForTimeout(200);
      expect(dialogCount).toBe(0);
    }

    page.off('dialog', dialogHandler);
  });

  test('no uncaught page errors or console.error messages on load', async ({ page }) => {
    // Purpose: Ensure the application does not throw uncaught exceptions in the page context during load.
    // We collected pageErrors and consoleErrors in beforeEach; assert none were captured.
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);

    // For visibility of diagnostics if the assertion fails, include consoleMessages length check
    expect(Array.isArray(consoleMessages)).toBeTruthy();
  });

  test('node click dialog content for other nodes contains expected edges (B and D)', async ({ page }) => {
    // Purpose: Verify the app shows correct edges for another node (B).
    let dialogMessage1 = null;
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await nodeLocator(page, 'B').click();
    await page.waitForTimeout(100);

    expect(dialogMessage).not.toBeNull();
    expect(dialogMessage).toContain('Node: B');

    // B has edges to A (5) and D (2)
    expect(dialogMessage).toContain('"A":5');
    expect(dialogMessage).toContain('"D":2');
  });
});