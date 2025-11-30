import { test, expect } from '@playwright/test';

const APP_URL =
  'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/7abeaa32-cd32-11f0-a96f-2d591ffb35fe.html';

test.describe('Topological Sort Demo (Application ID: 7abeaa32-cd32-11f0-a96f-2d591ffb35fe)', () => {
  // Navigate to the page before each test and attach listeners to capture console messages and page errors.
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  // Helper: attach listeners to capture console messages and page errors for assertions.
  async function attachErrorCollectors(page) {
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    return { consoleMessages, pageErrors };
  }

  test('Initial load: textarea has sample input, UI elements present and outputs empty', async ({ page }) => {
    // Purpose: Verify initial page state and that the sample DAG is pre-populated.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    // Check textarea is present and contains the sample input
    const textarea = page.locator('#graphInput');
    await expect(textarea).toBeVisible();

    const value = await textarea.inputValue();
    // The sample input should include these example edges (verify substrings)
    await expect(value).toContain('5 2');
    await expect(value).toContain('3 1');

    // Run button should be present
    const runBtn = page.locator('#runBtn');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toHaveText('Run Topological Sort');

    // On initial load, topo order output should be empty
    const topoOrder = page.locator('#topoOrder');
    await expect(topoOrder).toBeVisible();
    await expect(topoOrder).toHaveText('', { timeout: 1000 });

    // Steps and graph area should be present but empty
    const steps = page.locator('#steps');
    await expect(steps).toBeVisible();
    await expect(steps.locator('.topo-step')).toHaveCount(0);

    const graphContainer = page.locator('#graph');
    await expect(graphContainer).toBeVisible();
    // No SVG should be present until running the algorithm
    await expect(graphContainer.locator('svg')).toHaveCount(0);

    // Assert that no uncaught page errors or console errors have occurred during load
    const errorConsoleMessages = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Running topological sort with sample input produces expected order, steps and graph', async ({ page }) => {
    // Purpose: Verify clicking the Run button executes Kahn\'s algorithm and updates the DOM and SVG.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    const runBtn1 = page.locator('#runBtn1');
    await expect(runBtn).toBeVisible();

    // Click the Run button to execute topological sort
    await runBtn.click();

    // Verify the topo order is displayed and matches the deterministic result for the sample input
    const topoOrder1 = page.locator('#topoOrder1');
    await expect(topoOrder).toBeVisible();

    // Expected order computed from the provided algorithm and sample graph:
    // Deterministic queue sorting yields: 4,5,0,2,3,1
    await expect(topoOrder).toHaveText('4 → 5 → 0 → 2 → 3 → 1');

    // Verify that step entries are rendered: there should be at least one '.topo-step' per algorithm event.
    const stepLocators = page.locator('#steps .topo-step');
    await expect(stepLocators).toHaveCountGreaterThan(0);

    // Specifically, there should be exactly one "Step X: Remove node ..." per node.
    // Count the '.topo-step' elements whose text starts with "Step"
    const stepCount = await page.$$eval('#steps .topo-step', (nodes) =>
      nodes.reduce((acc, el) => (el.textContent.trim().startsWith('Step') ? acc + 1 : acc), 0)
    );
    // There are 6 nodes in the sample graph, so expect 6 "Step" entries.
    expect(stepCount).toBe(6);

    // Verify the first Step mentions removing node '4' (based on deterministic ordering)
    const firstStepText = await page.locator('#steps .topo-step').first().textContent();
    expect(firstStepText).toContain("Step 1");
    expect(firstStepText).toContain("Remove node");

    // Verify that an SVG is appended to the graph container and that nodes are drawn
    const svg = page.locator('#graph svg');
    await expect(svg).toHaveCount(1);

    // The SVG should contain a <g class="node"> group for each node in the graph (6 nodes).
    const nodeGroups = svg.locator('g.node');
    await expect(nodeGroups).toHaveCount(6);

    // Each node group should contain a circle and text with the node label
    const circles = svg.locator('g.node circle');
    await expect(circles).toHaveCount(6);
    const texts = svg.locator('g.node text');
    await expect(texts).toHaveCount(6);

    // Spot-check that one of the node text labels is present (e.g., '5')
    const textContents = await svg.locator('g.node text').allTextContents();
    expect(textContents).toContain('5');
    expect(textContents).toContain('1');

    // Confirm there are edge paths drawn (there should be at least as many paths as edges)
    const edgePaths = svg.locator('path');
    // There will be path elements for edges and also possibly for arrow marker path - ensure at least 6 edge path instances present besides defs path.
    const totalPaths = await edgePaths.count();
    expect(totalPaths).toBeGreaterThanOrEqual(6);

    // Ensure no console errors or uncaught page errors occurred during the run
    const errorConsoleMessages1 = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Invalid input format shows user-facing error and prevents running algorithm', async ({ page }) => {
    // Purpose: Provide malformed input and verify the UI shows a helpful error message and no graph/steps are produced.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    const textarea1 = page.locator('#graphInput');
    await textarea.fill('invalidline'); // line with only one token (invalid)

    const runBtn2 = page.locator('#runBtn2');
    await runBtn.click();

    // The #error element should display an error message about invalid edge line
    const errorElem = page.locator('#error');
    await expect(errorElem).toBeVisible();
    await expect(errorElem).toHaveText(/Invalid edge line/, { timeout: 1000 });

    // No topo order should be displayed
    const topoOrder2 = page.locator('#topoOrder2');
    await expect(topoOrder).toHaveText('', { timeout: 1000 });

    // Steps and graph should remain empty
    await expect(page.locator('#steps .topo-step')).toHaveCount(0);
    await expect(page.locator('#graph svg')).toHaveCount(0);

    // Ensure no uncaught runtime page errors occurred (the error is user-facing, thrown and caught in UI)
    const errorConsoleMessages2 = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Cycle detection: algorithm reports cycle and does not produce order', async ({ page }) => {
    // Purpose: Provide a cyclic graph and verify that the application detects the cycle and informs the user.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    const textarea2 = page.locator('#graphInput');
    await textarea.fill('A B\nB A'); // simple 2-node cycle

    const runBtn3 = page.locator('#runBtn3');
    await runBtn.click();

    // The #error element should display the cycle detection message
    const errorElem1 = page.locator('#error');
    await expect(errorElem).toBeVisible();
    await expect(errorElem).toHaveText('Cycle detected in the graph. Topological sort not possible.');

    // No topo order should be displayed when a cycle exists
    const topoOrder3 = page.locator('#topoOrder3');
    await expect(topoOrder).toHaveText('', { timeout: 1000 });

    // Steps should be empty (algorithm aborted)
    await expect(page.locator('#steps .topo-step')).toHaveCount(0);

    // No SVG should be rendered for the cyclic input
    await expect(page.locator('#graph svg')).toHaveCount(0);

    // Ensure no console errors or uncaught page errors happened as a result of processing the input
    const errorConsoleMessages3 = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility and content checks: labels, instructions and small help text present', async ({ page }) => {
    // Purpose: Ensure important UI text and labels are present for discoverability/accessibility.
    const { consoleMessages, pageErrors } = await attachErrorCollectors(page);

    // Check that label for textarea exists and is associated via 'for'
    const label = page.locator('label[for="graphInput"]');
    await expect(label).toHaveText(/Enter Directed Acyclic Graph/i);

    // Check that the small help text exists and mentions the format
    await expect(page.locator('#inputArea small')).toContainText('Each line defines a directed edge');

    // Check that the error element exists and is visually distinct (has id #error)
    await expect(page.locator('#error')).toBeVisible();

    // Ensure no runtime errors surfaced during these checks
    const errorConsoleMessages4 = consoleMessages.filter((m) => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});