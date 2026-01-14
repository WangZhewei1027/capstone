import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb33-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe('Breadth-First Search (BFS) application - FSM and UI checks', () => {

  // Test: initial page load shows heading and graph container, and there are no interactive inputs/buttons.
  test('Initial page load: header and graph container present; no interactive controls', async ({ page }) => {
    // Capture console messages and page errors emitted during load
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    // Navigate to the app
    await page.goto(APP_URL);

    // Verify header text is present and correct
    const header = page.locator('h1');
    await expect(header).toHaveCount(1);
    await expect(header).toHaveText('Breadth-First Search (BFS)');

    // Verify graph container exists and is visible
    const graph = page.locator('#graph');
    await expect(graph).toHaveCount(1);
    await expect(graph).toBeVisible();

    // Verify there are no input, button, or form interactive elements (the page's script expects an input with id 'startNode' which is missing)
    const inputs = await page.$$('input');
    const buttons = await page.$$('button');
    const forms = await page.$$('form');
    expect(inputs.length).toBe(0);
    expect(buttons.length).toBe(0);
    expect(forms.length).toBe(0);

    // Ensure that the page emitted at least one runtime error (the script tries to access document.getElementById('startNode').value)
    // We don't hard-fix the page; we assert the error occurs naturally.
    // Wait a short moment to allow any late console/pageerror events to arrive
    await page.waitForTimeout(200);
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    // Confirm the error appears related to accessing .value on a null element (typical engines produce messages with 'value' and 'null' or 'Cannot read')
    const errText = pageErrors.map(e => String(e.message)).join(' || ');
    expect(errText.toLowerCase()).toContain('value');
  });

  // Test: The page script throws a TypeError due to missing #startNode element when trying to read .value
  test('Script throws a runtime error when reading startNode.value (missing element)', async ({ page }) => {
    // Attach handler for the page error before navigation to capture it reliably
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Navigate - the error is expected during initial script execution
    await page.goto(APP_URL);

    // Wait for the pageerror event which should be emitted
    const pageError = await pageErrorPromise;
    expect(pageError).toBeTruthy();

    // Assert the error message indicates inability to read .value from a null or undefined element
    const msg = String(pageError.message).toLowerCase();
    // The exact wording varies by engine, so check for core indicators
    expect(msg).toContain('value');
    // It should also mention either 'null' or 'cannot' or 'undefined' to indicate a property access failure
    expect(/null|cannot|undefined/.test(msg)).toBeTruthy();
  });

  // Test: Because the runtime error occurs early, no BFS traversal logs ("Visited: ...") should appear in the console
  test('No BFS traversal console logs are emitted due to early runtime error', async ({ page }) => {
    const consoleMessages1 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

    // Navigate
    await page.goto(APP_URL);

    // Give the page a brief moment to emit any logs
    await page.waitForTimeout(200);

    // Ensure none of the captured console messages contain "Visited:"
    const visitedLogs = consoleMessages.filter(m => m.text.includes('Visited:'));
    expect(visitedLogs.length).toBe(0);
  });

  // Test: Validate that the graph data structure is present in the page context and has the expected nodes and edges
  test('Graph data exists on window and contains expected nodes and edges', async ({ page }) => {
    // Navigate and wait for load (graph is defined before the failing code that reads startNode)
    await page.goto(APP_URL);

    // Extract graph object from page context
    const graphInfo = await page.evaluate(() => {
      // Accessing graph here should be safe because it's declared at the top of the inline script
      return {
        exists: typeof graph !== 'undefined',
        nodes: Array.isArray(graph?.nodes) ? graph.nodes : null,
        edges: Array.isArray(graph?.edges) ? graph.edges : null,
      };
    });

    // Assert graph exists and has expected structure
    expect(graphInfo.exists).toBe(true);
    expect(Array.isArray(graphInfo.nodes)).toBe(true);
    expect(graphInfo.nodes.length).toBe(6);
    expect(graphInfo.nodes).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);

    expect(Array.isArray(graphInfo.edges)).toBe(true);
    expect(graphInfo.edges.length).toBe(6);
    // Basic checks on a few edges
    expect(graphInfo.edges[0]).toEqual(['A', 'B']);
    expect(graphInfo.edges[5]).toEqual(['F', 'A']);
  });

  // Test: Confirm the specific input the script expects (#startNode) is absent and that accessing it would be invalid
  test('startNode input is absent from the DOM', async ({ page }) => {
    await page.goto(APP_URL);

    // Query for element with id startNode
    const startNodeEl = await page.$('#startNode');
    expect(startNodeEl).toBeNull();
  });

  // Test: Ensure the page's heading is accessible (basic accessibility check - presence of H1)
  test('Accessibility: page exposes a single H1 heading', async ({ page }) => {
    await page.goto(APP_URL);

    const h1s = await page.$$('h1');
    expect(h1s.length).toBe(1);

    const h1Text = await page.locator('h1').innerText();
    expect(h1Text.trim()).toBe('Breadth-First Search (BFS)');
  });

});