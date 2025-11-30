import { test, expect } from '@playwright/test';

test.describe("Dijkstra's Algorithm Demonstration (Application ID: 2627abe9-cd2a-11f0-bee4-a3a342d77f94)", () => {
  // Arrays to collect console error messages and uncaught page errors for each test
  let consoleErrors;
  let pageErrors;

  // URL of the HTML application under test
  const APP_URL =
    'http://127.0.0.1:5500/workspace/html2test/html/2627abe9-cd2a-11f0-bee4-a3a342d77f94.html';

  // Attach listeners before each test to observe console errors and page errors.
  // We intentionally only observe and do not alter the page environment or code.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on('console', (msg) => {
      // Collect only error-level console messages so tests can assert on them
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    page.on('pageerror', (err) => {
      // Collect uncaught exceptions that occur in the page environment
      pageErrors.push(err);
    });

    // Load the page exactly as-is
    await page.goto(APP_URL);
  });

  // Test the initial page load and default computed state
  test('Initial load: graph is rendered and shortest path is computed and displayed', async ({ page }) => {
    // Purpose:
    // - Verify the graph container exists and contains the expected number of node elements
    // - Verify each node element has correct id and inner text
    // - Verify the result text shows the computed shortest path and distance
    // - Verify the correct nodes are visually marked as active (class "active")
    // - Confirm that no runtime console errors or page errors occurred during load

    // Ensure the graph container exists
    const graph = await page.locator('#graph');
    await expect(graph).toBeVisible();

    // There should be 5 node elements created (ids node-0 to node-4)
    const nodes = graph.locator('.node');
    await expect(nodes).toHaveCount(5);

    // Verify each node has the expected id and text content
    for (let i = 0; i < 5; i++) {
      const node = page.locator(`#node-${i}`);
      await expect(node).toBeVisible();
      await expect(node).toHaveText(String(i));
    }

    // The algorithm should compute the shortest path from 0 to 4.
    // Expected path: 0 → 3 → 4 with distance 7
    const result = page.locator('#result');
    await expect(result).toBeVisible();
    await expect(result).toHaveText('Shortest path from 0 to 4: 0 → 3 → 4 with distance 7');

    // Check visual active state: nodes 0,3,4 should have class 'active'; nodes 1 and 2 should not.
    await expect(page.locator('#node-0')).toHaveClass(/active/);
    await expect(page.locator('#node-3')).toHaveClass(/active/);
    await expect(page.locator('#node-4')).toHaveClass(/active/);

    await expect(page.locator('#node-1')).not.toHaveClass(/active/);
    await expect(page.locator('#node-2')).not.toHaveClass(/active/);

    // No console error messages should have been emitted during load
    expect(consoleErrors.length).toBe(0);

    // No uncaught page errors should have occurred
    expect(pageErrors.length).toBe(0);
  });

  // Test that clicking on nodes (interactive-looking elements) does not change computation because no click handlers are present.
  test('Clicking node elements does not alter computed result or active node classes', async ({ page }) => {
    // Purpose:
    // - Attempt user interactions (clicks) on the node elements
    // - Ensure clicks do not change the displayed shortest path or active node classes
    // - Confirm no new runtime errors are produced by clicks

    // Capture the original result text and classes for comparison
    const result = page.locator('#result');
    const originalText = await result.innerText();

    const activeNodesBefore = [
      await page.locator('#node-0').getAttribute('class'),
      await page.locator('#node-1').getAttribute('class'),
      await page.locator('#node-2').getAttribute('class'),
      await page.locator('#node-3').getAttribute('class'),
      await page.locator('#node-4').getAttribute('class'),
    ];

    // Click on node-1 and node-2 which are not part of the shortest path
    await page.locator('#node-1').click();
    await page.locator('#node-2').click();

    // Re-check result text; it should remain unchanged
    const afterText = await result.innerText();
    expect(afterText).toBe(originalText);

    // Re-check classes; they should remain unchanged
    const activeNodesAfter = [
      await page.locator('#node-0').getAttribute('class'),
      await page.locator('#node-1').getAttribute('class'),
      await page.locator('#node-2').getAttribute('class'),
      await page.locator('#node-3').getAttribute('class'),
      await page.locator('#node-4').getAttribute('class'),
    ];
    expect(activeNodesAfter).toEqual(activeNodesBefore);

    // Clicking should not have caused any console errors or page errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Verify that the application has no native form controls (buttons, inputs, selects) and explain this as part of interactive surface detection.
  test('Application contains no form controls (buttons, inputs, selects) and relies on statically-rendered nodes', async ({ page }) => {
    // Purpose:
    // - Identify interactive form controls on the page (there are none in this implementation)
    // - Assert counts are zero to make explicit that the app exposes no inputs/buttons
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const selects = await page.locator('select').count();
    const forms = await page.locator('form').count();
    const textareas = await page.locator('textarea').count();

    expect(buttons).toBe(0);
    expect(inputs).toBe(0);
    expect(selects).toBe(0);
    expect(forms).toBe(0);
    expect(textareas).toBe(0);
  });

  // Accessibility / DOM structure checks and edge case: ensure node labels are accessible via text and nodes are present in DOM order.
  test('Accessibility and DOM structure: nodes expose visible labels and are in expected order', async ({ page }) => {
    // Purpose:
    // - Ensure each node is discoverable via text (helps basic accessibility)
    // - Confirm DOM order corresponds to node ids 0..4
    const nodeTexts = await page.$$eval('#graph .node', (els) => els.map((e) => e.textContent.trim()));
    expect(nodeTexts).toEqual(['0', '1', '2', '3', '4']);
  });

  // Explicit test to assert that no uncaught exceptions or console errors were observed during the test run.
  test('No uncaught page errors or console error messages occurred during user interactions', async () => {
    // Purpose:
    // - Provide a single assertion point that fails if any console 'error' messages or page errors were captured
    expect(consoleErrors.length, `Expected no console.error messages, found: ${consoleErrors.length}`).toBe(0);
    expect(pageErrors.length, `Expected no uncaught page errors, found: ${pageErrors.length}`).toBe(0);
  });
});