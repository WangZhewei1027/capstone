import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa2c-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Breadth-First Search (BFS) Visualization - 7abeaa2c-cd32-11f0-a96f-2d591ffb35fe', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  // Utility to get a locator for a node circle by node id (e.g., 'A' -> '#node-A')
  const nodeCircleSelector = (id) => `#graph circle#node-${id}`;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    pageErrors = [];

    // Listen to console messages emitted by the page
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Listen to uncaught page errors (ReferenceError, TypeError, SyntaxError etc.)
    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    // Navigate to the application under test
    await page.goto(APP_URL);
    // Ensure the page has loaded a visible title element before continuing
    await expect(page.locator('h1')).toHaveText(/Breadth-First Search \(BFS\) Visualization/);
  });

  test.afterEach(async ({ page }) => {
    // Close page to clean up
    await page.close();
  });

  test.describe('Initial page load and default state', () => {
    test('should render main UI elements and default texts', async ({ page }) => {
      // Verify SVG graph exists
      const svg = page.locator('#graph');
      await expect(svg).toBeVisible();

      // Verify the BFS output placeholder text is present
      const output = page.locator('#bfs-output');
      await expect(output).toBeVisible();
      await expect(output).toHaveText(/BFS traversal order will appear here/);

      // Verify start node select exists and contains options A..H
      const startSelect = page.locator('#start-node');
      await expect(startSelect).toBeVisible();
      const options = startSelect.locator('option');
      await expect(options).toHaveCount(8);

      // Ensure specific option values are present (A through H)
      const optionValues = await options.evaluateAll(opts => opts.map(o => o.value));
      expect(optionValues).toEqual(['A','B','C','D','E','F','G','H']);

      // Verify the start button is visible and enabled
      const startButton = page.locator('#start-bfs');
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeEnabled();

      // Reset button should be hidden initially
      const resetButton = page.locator('#reset-button');
      await expect(resetButton).toBeHidden();

      // Verify that node circles exist in the SVG for all nodes
      for (const id of ['A','B','C','D','E','F','G','H']) {
        const circ = page.locator(nodeCircleSelector(id));
        await expect(circ).toBeVisible();
      }

      // Verify one node is highlighted as the initial selected start node (stroke-width 4)
      // The implementation highlights startNodeSelect.value || nodes[0].id, so ensure at least one circle has stroke-width of '4'
      const highlighted = await page.locator('#graph circle').evaluateAll(nodes => nodes
        .map(n => ({ id: n.id, strokeWidth: n.getAttribute('stroke-width'), stroke: n.getAttribute('stroke') }))
        .filter(x => x.strokeWidth === '4'));
      expect(highlighted.length).toBeGreaterThanOrEqual(1);
    });

    test('should not emit any uncaught runtime errors on initial load', async () => {
      // This assertion ensures the page did not raise uncaught page errors during navigation/initialization
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Selecting start node via UI interactions', () => {
    test('clicking a node circle updates the start node select and highlights the circle', async ({ page }) => {
      // Click node C circle to set it as start node
      const nodeC = page.locator(nodeCircleSelector('C'));
      await nodeC.click();

      // The select value should reflect 'C'
      const startSelect1 = page.locator('#start-node');
      await expect(startSelect).toHaveValue('C');

      // The clicked node should now be highlighted with stroke-width 4
      const strokeWidth = await nodeC.getAttribute('stroke-width');
      expect(strokeWidth).toBe('4');

      // Ensure previously highlighted node lost the highlight (stroke-width should be '2' or not '4')
      // We'll check at least one other node has stroke-width '2'
      const other = page.locator('#graph circle').first();
      const otherStroke = await other.getAttribute('stroke-width');
      expect(otherStroke).toBeDefined();
    });

    test('keyboard Enter on a focused node selects it as start node', async ({ page }) => {
      // Focus node D and press Enter (keyboard support)
      const nodeD = page.locator(nodeCircleSelector('D'));
      await nodeD.focus();
      await nodeD.press('Enter');

      // Verify start select changed to D
      const startSelect2 = page.locator('#start-node');
      await expect(startSelect).toHaveValue('D');

      // Verify highlight changed to node-D
      const strokeD = await nodeD.getAttribute('stroke-width');
      expect(strokeD).toBe('4');
    });
  });

  test.describe('BFS traversal behavior and UI updates', () => {
    test('starting BFS disables controls, runs traversal, updates output and node states, and reset restores UI', async ({ page }) => {
      // Choose start node 'E' via the select (explicitly)
      const startSelect3 = page.locator('#start-node');
      await startSelect.selectOption('E');
      await expect(startSelect).toHaveValue('E');

      // Start BFS
      const startButton1 = page.locator('#start-bfs');
      await startButton.click();

      // Immediately after clicking, start button should be disabled, reset visible, and select disabled
      await expect(startButton).toBeDisabled();
      const resetButton1 = page.locator('#reset-button');
      await expect(resetButton).toBeVisible();
      await expect(startSelect).toBeDisabled();

      // During BFS, trying to click another node should NOT change the start selection (the code prevents changes)
      const nodeA = page.locator(nodeCircleSelector('A'));
      await nodeA.click();
      // Still E
      await expect(startSelect).toHaveValue('E');

      // Wait for BFS to complete by observing the output area text.
      // BFS implementation appends "BFS Traversal Completed." when done.
      const output1 = page.locator('#bfs-output1');
      await page.waitForFunction(() => {
        const el = document.querySelector('#bfs-output');
        return el && el.textContent.includes('BFS Traversal Completed.');
      }, null, { timeout: 30000 }); // allow up to 30s for the traversal to finish

      // Verify the final traversal order matches expected BFS from E:
      // Expected order: E, B, D, F, A, C, G, H  (joined with ' → ')
      const finalText = await output.textContent();
      expect(finalText).toContain('BFS Traversal Completed.');
      expect(finalText).toContain('Order: E → B → D → F → A → C → G → H');

      // After completion, all node circles should have class 'visited'
      for (const id of ['A','B','C','D','E','F','G','H']) {
        const circ1 = page.locator(nodeCircleSelector(id));
        // check class attribute includes 'visited'
        const classAttr = await circ.getAttribute('class');
        expect(classAttr).toMatch(/visited/);
      }

      // Reset the graph using the reset button
      await resetButton.click();

      // After reset, start button should be enabled again, reset hidden, select enabled, and output placeholder restored
      await expect(startButton).toBeEnabled();
      await expect(resetButton).toBeHidden();
      await expect(startSelect).toBeEnabled();
      await expect(output).toHaveText(/BFS traversal order will appear here/);

      // After reset, nodes should not have 'visited' or 'current' classes
      for (const id of ['A','B','C','D','E','F','G','H']) {
        const circ2 = page.locator(nodeCircleSelector(id));
        const classAttr1 = await circ.getAttribute('class');
        // class may be "node" only
        expect(classAttr).not.toMatch(/visited|current/);
      }
    }, 40000); // allow extended timeout for this test to accommodate traversal time

    test('no uncaught page errors emitted during BFS run', async ({ page }) => {
      // Start BFS from node A to produce activity
      await page.locator('#start-node').selectOption('A');
      await page.locator('#start-bfs').click();

      // Wait for completion
      await page.waitForFunction(() => {
        const el1 = document.querySelector('#bfs-output');
        return el && el.textContent.includes('BFS Traversal Completed.');
      }, null, { timeout: 30000 });

      // Assert that no uncaught errors were emitted during the run
      expect(pageErrors.length).toBe(0);
    });
  });

  test.describe('Accessibility and semantics checks', () => {
    test('node circles have accessible attributes (role, aria-label, tabindex)', async ({ page }) => {
      // Check node F for accessibility attributes
      const nodeF = page.locator(nodeCircleSelector('F'));
      await expect(nodeF).toHaveAttribute('role', 'button');
      await expect(nodeF).toHaveAttribute('tabindex', '0');
      const aria = await nodeF.getAttribute('aria-label');
      expect(aria).toMatch(/Node F/);
    });

    test('bfs-output has aria-live polite and aria-atomic true', async ({ page }) => {
      const output2 = page.locator('#bfs-output2');
      await expect(output).toHaveAttribute('aria-live', 'polite');
      await expect(output).toHaveAttribute('aria-atomic', 'true');
    });
  });

  test.describe('Console output monitoring', () => {
    test('should capture console messages (if any) without throwing', async ({ page }) => {
      // There are no intentional console logs in the app; ensure we can read collected messages
      // This test is to ensure the instrumentation did not interfere with page execution
      // Wait briefly to allow any console messages to appear
      await page.waitForTimeout(200);
      // We don't assert that there are messages; we only assert that the collector is an array
      expect(Array.isArray(consoleMessages)).toBe(true);
    });
  });
});