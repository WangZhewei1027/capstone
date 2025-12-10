import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-6/html/2d574302-d1d8-11f0-bbda-359f3f96b638.html';

test.describe('Bellman-Ford Algorithm Visualization (FSM) - 2d574302-d1d8-11f0-bbda-359f3f96b638', () => {
  // Shared state for capturing console and page errors across tests
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    // Initialize collectors
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Collect console messages and errors for later assertions
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      // pageerror provides Error object
      pageErrors.push(err);
    });

    // Navigate to the application page and wait for load
    await page.goto(APP_URL, { waitUntil: 'load' });
    // Give a short moment to allow any asynchronous initialization (if any) to complete
    await page.waitForTimeout(50);
  });

  test.afterEach(async ({ page }) => {
    // Attach console and page error info to the test log in case of failures for debugging
    // (Playwright will show console output if the test fails and we throw informative assertions below)
    // Close page to tear down
    await page.close();
  });

  test('Idle state (S0_Idle): createGraph() ran on load and DOM populated', async ({ page }) => {
    // This test validates the "Idle" initial state:
    // - createGraph() should have executed on page load
    // - #graph should contain node elements and edge elements
    // - #output should be empty before running algorithm
    // - the Run button with onclick attribute should exist

    // Verify the presence of the graph container
    const graph = await page.$('#graph');
    expect(graph).not.toBeNull();

    // There should be numVertices node elements - from the HTML numVertices = 5
    const nodes = await page.$$('.node');
    expect(nodes.length).toBe(5);

    // There should be an edge element for each edge listed in the edges array (8 edges)
    const edges = await page.$$('.edge');
    expect(edges.length).toBe(8);

    // Check sample content: first node and first edge text should match expected structure
    const firstNodeText = await nodes[0].innerText();
    expect(firstNodeText).toContain('Node 0');

    const firstEdgeText = await edges[0].innerText();
    expect(firstEdgeText).toMatch(/Edge from Node \d+ to Node \d+ with weight -?\d+/);

    // Ensure the output area is initially empty (Idle state: no algorithm output yet)
    const output = await page.$('#output');
    expect(output).not.toBeNull();
    const outputText = await output.innerText();
    expect(outputText.trim()).toBe('');

    // Ensure button exists and has the expected onclick handler (evidence of RunAlgorithm event)
    const runButton = await page.$('button[onclick="runBellmanFord()"]');
    expect(runButton).not.toBeNull();
  });

  test('Transition: RunAlgorithm -> Algorithm Running (S0 -> S1) and Output Displayed (S2) - output correctness', async ({ page }) => {
    // This test validates the transitions triggered by clicking the Run button:
    // - Clicking the button should run runBellmanFord()
    // - The output should be populated and contain the expected distances
    // - No negative-weight cycle should be reported for this graph

    const runButton1 = await page.$('button[onclick="runBellmanFord()"]');
    expect(runButton).not.toBeNull();

    // Before click: ensure output is empty
    const outputPre = await page.$('#output');
    expect(await outputPre.innerText()).toBe('');

    // Click the button to trigger runBellmanFord()
    await runButton.click();

    // Wait briefly for synchronous algorithm to complete and DOM to update
    await page.waitForTimeout(50);

    // Verify output area is populated
    const output1 = await page.$('#output1');
    const outputText1 = await output.innerText();
    expect(outputText.length).toBeGreaterThan(0);

    // Expected output lines computed by the algorithm in the page:
    // Vertex Distance from Source (0):
    // Node 0: 0
    // Node 1: -1
    // Node 2: 2
    // Node 3: -2
    // Node 4: 1
    expect(outputText).toContain('Vertex Distance from Source (0):');
    expect(outputText).toContain('Node 0: 0');
    expect(outputText).toContain('Node 1: -1');
    expect(outputText).toContain('Node 2: 2');
    expect(outputText).toContain('Node 3: -2');
    expect(outputText).toContain('Node 4: 1');

    // Ensure that the negative-weight cycle message is NOT present for this graph
    expect(outputText).not.toContain('Negative-weight cycle detected!');

    // Also check the number of lines in the output: header + 5 nodes = 6 lines (allow trailing newline)
    const lines = outputText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(6);
  });

  test('Idempotence and repeated runs: clicking Run multiple times produces consistent output', async ({ page }) => {
    // This test checks edge case behavior:
    // - Clicking the Run button multiple times should not throw errors
    // - Output should match across repeated runs (idempotent for this deterministic input)
    const runButton2 = await page.$('button[onclick="runBellmanFord()"]');
    expect(runButton).not.toBeNull();

    // First run
    await runButton.click();
    await page.waitForTimeout(50);
    const output2 = await page.$('#output2');
    const firstOutputText = await output.innerText();
    expect(firstOutputText).toContain('Node 0: 0');

    // Second run immediately
    await runButton.click();
    await page.waitForTimeout(50);
    const secondOutputText = await output.innerText();

    // Outputs should be identical (algorithm is deterministic)
    expect(secondOutputText).toBe(firstOutputText);

    // Ensure no page-level errors were recorded by running twice
    expect(pageErrors.length).toBe(0);
  });

  test('FSM observability: verify onEnter / entry actions and transitions via DOM evidence', async ({ page }) => {
    // This test attempts to validate FSM semantics using DOM/evidence:
    // - S0 entry action createGraph() evidenced by DOM nodes and edges (already validated in Idle test)
    // - S1 entry action runBellmanFord() evidenced by the onclick attribute and by the immediate changes after click
    // - S2 evidence: document.getElementById("output").innerText = output; -> we assert #output.innerText updated

    // Evidence for S0 (createGraph)
    const nodeCount = (await page.$$('.node')).length;
    expect(nodeCount).toBe(5);

    // Evidence for RunAlgorithm event handler
    const runButton3 = await page.$('button[onclick="runBellmanFord()"]');
    expect(runButton).not.toBeNull();

    // Trigger event to move through S1 -> S2
    await runButton.click();
    await page.waitForTimeout(50);

    // Evidence for S2: #output contains the algorithm output
    const outText = await (await page.$('#output')).innerText();
    expect(outText.trim().length).toBeGreaterThan(0);
    expect(outText).toContain('Vertex Distance from Source (0):');
  });

  test('Console and page error monitoring: no unhandled exceptions or console errors during normal usage', async ({ page }) => {
    // This test ensures that the page did not raise any pageerror events
    // and that there were no console messages of type "error" during the tests above
    // (collectors were set up in beforeEach and have recorded events during navigation and interactions)

    // No page-level uncaught exceptions should have been emitted during load and tests
    expect(pageErrors.length).toBe(0);

    // No console "error" messages emitted by the application in the normal flow
    const errorConsoleMessages = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoleMessages.length).toBe(0);

    // Optional: log console messages for debugging in failed runs
    // (we do not fail based on other console types, but they are captured)
    // Ensure that consoleMessages is an array (basic sanity)
    expect(Array.isArray(consoleMessages)).toBe(true);
  });

  test('Robustness check: validate text contents and structure for nodes and edges (edge case assertions)', async ({ page }) => {
    // This test validates additional structural invariants as edge cases:
    // - All node elements should have the class "node" and text "Node <index>"
    // - All edge elements should have class "edge" and mention "Edge from Node"

    const nodeEls = await page.$$('.node');
    expect(nodeEls.length).toBe(5);

    for (let i = 0; i < nodeEls.length; i++) {
      const txt = await nodeEls[i].innerText();
      // Each node label should include its index (Node 0, Node 1, ...)
      expect(txt).toContain(`Node ${i}`);
    }

    const edgeEls = await page.$$('.edge');
    expect(edgeEls.length).toBe(8);

    // Ensure each edge mentions 'Edge from Node' and contains 'weight'
    for (const edgeEl of edgeEls) {
      const txt1 = await edgeEl.innerText();
      expect(txt).toMatch(/Edge from Node \d+ to Node \d+ with weight -?\d+/);
    }
  });
});