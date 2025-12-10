import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888d6a4-d59e-11f0-b3ae-79d1ce7b5503.html';

test.describe('Weighted Graph Visualization (0888d6a4-d59e-11f0-b3ae-79d1ce7b5503)', () => {
  // Arrays to collect console messages and page errors for each test run
  let consoleMessages = [];
  let pageErrors = [];

  // Reset and attach listeners before each test, then navigate to the page
  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages emitted by the page
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch (e) {
        // In case msg methods throw, still record minimal info
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture uncaught exceptions from the page
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Go to the application under test
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Give a short pause to ensure any delayed console messages/errors are captured
    await page.waitForTimeout(50);
  });

  test('Initial page load: graph container and header are visible', async ({ page }) => {
    // Purpose: Verify that the main page elements render on initial load
    await expect(page.locator('h1')).toHaveText('Weighted Graph Visualization');
    const graph = page.locator('#graph');
    await expect(graph).toBeVisible();

    // There should be no uncaught page errors on initial load
    expect(pageErrors.length, 'Expected no uncaught exceptions during page load').toBe(0);

    // There should be no console.error messages on initial load
    const errors = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length, 'Expected no console.error messages on initial load').toBe(0);
  });

  test('Nodes are rendered: four nodes with labels A, B, C, D', async ({ page }) => {
    // Purpose: Ensure node elements are created with correct labels and count
    const nodes = await page.$$eval('.node', nodes =>
      nodes.map(n => ({ text: n.textContent.trim(), styleLeft: n.style.left, styleTop: n.style.top }))
    );

    // Expect exactly 4 nodes
    expect(nodes.length).toBe(4);

    // Expect all labels are present
    const labels = nodes.map(n => n.text);
    expect(labels.sort()).toEqual(['A', 'B', 'C', 'D'].sort());

    // Check inline styles for positions were set (left and top should be non-empty)
    for (const n of nodes) {
      expect(n.styleLeft, `Node ${n.text} should have inline left style`).toMatch(/^\d+px$/);
      expect(n.styleTop, `Node ${n.text} should have inline top style`).toMatch(/^\d+px$/);
    }
  });

  test('Nodes positions match declared positions object', async ({ page }) => {
    // Purpose: Validate that each node's inline left/top match the positions specified in the script
    const expectedPositions = {
      A: { left: '100px', top: '50px' },
      B: { left: '250px', top: '150px' },
      C: { left: '250px', top: '50px' },
      D: { left: '400px', top: '150px' }
    };

    const nodesInfo = await page.$$eval('.node', nodes =>
      nodes.map(n => ({ label: n.textContent.trim(), left: n.style.left, top: n.style.top }))
    );

    for (const info of nodesInfo) {
      expect(expectedPositions[info.label], `No expected position for node ${info.label}`).toBeDefined();
      expect(info.left).toBe(expectedPositions[info.label].left);
      expect(info.top).toBe(expectedPositions[info.label].top);
    }
  });

  test('Edges and weight labels are rendered correctly', async ({ page }) => {
    // Purpose: Verify edges and their weight labels exist and match the graph adjacency
    // The implementation draws directed adjacency edges, so we expect 8 .edge elements and 8 <span> labels
    const edgeCount = await page.$$eval('.edge', edges => edges.length);
    expect(edgeCount).toBe(8);

    // Collect all span weight labels inside the graph container
    const weightSpans = await page.$$('#graph > span, #graph span'); // fallback selector to find spans
    // Confirm there are 8 weight label spans
    expect(weightSpans.length).toBeGreaterThanOrEqual(8);

    // Read the text content of weight spans and assert they are in the expected set {1,2,3,5}
    const weights = await page.$$eval('#graph span', spans => spans.map(s => s.textContent.trim()));
    // Filter numeric text only
    const numericWeights = weights.filter(w => /^\d+$/.test(w));
    expect(numericWeights.length).toBeGreaterThanOrEqual(8);

    // Expected multiset: 1 x2, 2 x2, 3 x2, 5 x2 (since edges are duplicated directionally)
    const counts = numericWeights.reduce((acc, w) => {
      acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {});
    expect(counts['1']).toBeGreaterThanOrEqual(2);
    expect(counts['2']).toBeGreaterThanOrEqual(2);
    expect(counts['3']).toBeGreaterThanOrEqual(2);
    expect(counts['5']).toBeGreaterThanOrEqual(2);

    // Ensure every edge element has a width style set (non-zero length) and a transform rotation string
    const edgeStyles = await page.$$eval('.edge', edges =>
      edges.map(e => ({ width: e.style.width, transform: e.style.transform }))
    );
    for (const s of edgeStyles) {
      // width should be set as pixels like '150px' and not empty
      expect(s.width).toMatch(/^\d+(\.\d+)?px$/);
      // transform should include 'rotate('
      expect(s.transform).toMatch(/rotate\(/);
    }
  });

  test('There are no interactive form controls (buttons/inputs) present', async ({ page }) => {
    // Purpose: Confirm that the page contains no interactive form controls (as the implementation is pure visualization)
    const buttonCount = await page.$$eval('button', els => els.length);
    const inputCount = await page.$$eval('input', els => els.length);
    const formCount = await page.$$eval('form', els => els.length);
    const selectCount = await page.$$eval('select', els => els.length);
    expect(buttonCount).toBe(0);
    expect(inputCount).toBe(0);
    expect(formCount).toBe(0);
    expect(selectCount).toBe(0);
  });

  test('Clicking nodes does not change DOM structure or produce console errors', async ({ page }) => {
    // Purpose: Simulate user interactions (clicks) on nodes even though no handlers are expected
    // and assert that the application remains stable (no new console.error or page errors).

    // Capture initial counts
    const initialNodeCount = await page.$$eval('.node', els => els.length);
    const initialEdgeCount = await page.$$eval('.edge', els => els.length);
    const initialSpanCount = await page.$$eval('#graph span', els => els.length);

    // Click each node once
    const nodeLocators = page.locator('.node');
    const count = await nodeLocators.count();
    for (let i = 0; i < count; i++) {
      await nodeLocators.nth(i).click();
    }

    // After clicks, DOM counts should remain unchanged
    const afterNodeCount = await page.$$eval('.node', els => els.length);
    const afterEdgeCount = await page.$$eval('.edge', els => els.length);
    const afterSpanCount = await page.$$eval('#graph span', els => els.length);

    expect(afterNodeCount).toBe(initialNodeCount);
    expect(afterEdgeCount).toBe(initialEdgeCount);
    expect(afterSpanCount).toBe(initialSpanCount);

    // No new page errors should have been emitted
    expect(pageErrors.length, 'Expected no uncaught exceptions after node clicks').toBe(0);

    // No console.error messages should be present
    const errors1 = consoleMessages.filter(m => m.type === 'error');
    expect(errors.length, 'Expected no console.error messages after node clicks').toBe(0);
  });

  test('Edge label positions lie approximately between start and end node coordinates', async ({ page }) => {
    // Purpose: Verify that the weight label spans are positioned roughly between endpoints (as the script places them at the midpoint)
    // Gather node positions and span positions
    const nodePositions = await page.$$eval('.node', nodes =>
      nodes.map(n => ({
        label: n.textContent.trim(),
        left: parseFloat(n.style.left || '0'),
        top: parseFloat(n.style.top || '0')
      }))
    );

    const spans = await page.$$eval('#graph span', spans =>
      spans
        .map(s => ({
          text: s.textContent.trim(),
          left: parseFloat(s.style.left || '0'),
          top: parseFloat(s.style.top || '0')
        }))
        .filter(s => /^\d+$/.test(s.text)) // keep only numeric weight labels
    );

    // For each span, ensure its left and top are within the bounding box of the graph container (0..600, 0..400 roughly)
    for (const sp of spans) {
      expect(sp.left).toBeGreaterThanOrEqual(0);
      expect(sp.left).toBeLessThanOrEqual(600 + 200); // allow generous margin due to absolute positions
      expect(sp.top).toBeGreaterThanOrEqual(0);
      expect(sp.top).toBeLessThanOrEqual(400 + 200);
    }

    // Basic sanity check: at least one span should be near the midpoint between two known nodes (example A and B midpoint)
    const posA = nodePositions.find(n => n.label === 'A');
    const posB = nodePositions.find(n => n.label === 'B');
    if (posA && posB) {
      const midX = (posA.left + posB.left) / 2;
      const midY = (posA.top + posB.top) / 2;
      // Find a span whose position is within 5-15px of this midpoint (there should be a weight '2' near midpoint)
      const closeSpan = spans.find(s => Math.abs(s.left - midX) < 25 && Math.abs(s.top - midY) < 25);
      expect(!!closeSpan, 'Expected at least one weight label near midpoint of A and B').toBe(true);
    }
  });

  test('No uncaught exceptions or console errors were emitted during the entire test session', async ({ page }) => {
    // Purpose: Final assertion that overall there were no page errors or console.error messages observed across test interactions
    // Give a short pause to allow any stray logs to appear
    await page.waitForTimeout(50);

    // Assert no page errors
    expect(pageErrors.length, `Found page errors: ${pageErrors.map(e => String(e)).join(', ')}`).toBe(0);

    // Assert no console.error messages
    const errorConsoleMsgs = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMsgs.length, `Found console.error messages: ${JSON.stringify(errorConsoleMsgs)}`).toBe(0);
  });
});