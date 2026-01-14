import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2 /html/0cccca72-d5b5-11f0-899c-75bf12e026a9.html';

// Page object model for the Topological Sort page
class TopoPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.inputSelector = '#graphInput';
    this.runBtnSelector = '#runBtn';
    this.outputSelector = '#output';
    this.errorSelector = '#error';
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async getInputValue() {
    return this.page.locator(this.inputSelector).inputValue();
  }

  async setInputValue(value) {
    await this.page.fill(this.inputSelector, value);
  }

  async clickRun() {
    await Promise.all([
      this.page.waitForTimeout(10), // small delay to allow handlers to settle
      this.page.click(this.runBtnSelector)
    ]);
  }

  async getOutputText() {
    return this.page.locator(this.outputSelector).innerText();
  }

  async getErrorText() {
    return this.page.locator(this.errorSelector).innerText();
  }

  async isRunButtonVisible() {
    return this.page.locator(this.runBtnSelector).isVisible();
  }
}

test.describe('Topological Sort Visualization - FSM validation', () => {
  let consoleMessages = [];
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages for inspection
    page.on('console', msg => {
      // Collect all console messages (info, error, warn ...)
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    // Capture unhandled page errors
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application page exactly as specified
    const topo = new TopoPage(page);
    await topo.goto();
  });

  test.afterEach(async ({ page }) => {
    // After each test, assert there were no unexpected runtime errors (ReferenceError, SyntaxError, TypeError)
    // If the page produced any page errors, fail the test and include them for debugging
    if (pageErrors.length > 0) {
      // Expose first few errors in the assertion message for easier debugging
      const messages = pageErrors.map(e => e.message).slice(0, 5).join('\n---\n');
      // Use a failing assertion with details
      expect(pageErrors.length, `Unexpected page errors:\n${messages}`).toBe(0);
    }

    // Also assert there are no console messages of type 'error'
    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    if (consoleErrors.length > 0) {
      const msgs = consoleErrors.map(c => `${c.type}: ${c.text}`).slice(0, 5).join('\n---\n');
      expect(consoleErrors.length, `Unexpected console errors/warnings:\n${msgs}`).toBe(0);
    }
  });

  test('S0_Idle: Page initial state - Idle', async ({ page }) => {
    // Validate initial Idle state UI and evidence
    // - run button is present
    // - textarea contains the example graph
    // - output and error divs are empty
    const topo = new TopoPage(page);

    // run button visible
    expect(await topo.isRunButtonVisible()).toBe(true);

    // input contains initial sample graph (evidence from FSM)
    const inputVal = await topo.getInputValue();
    expect(inputVal).toContain('5 -> 0,2');
    expect(inputVal).toContain('4 -> 0,1');

    // output and error should be empty initially
    const out = await topo.getOutputText();
    const err = await topo.getErrorText();
    expect(out.trim()).toBe('');
    expect(err.trim()).toBe('');
  });

  test.describe('Transitions from S0_Idle and S1_InputReceived', () => {
    test('S1 -> S3: Successful topological sort displays ordering', async ({ page }) => {
      // This test validates:
      // - Clicking Run parses the input graph (S0 -> S1)
      // - The algorithm finds a topological order and displays it (S1 -> S3)
      // It also checks the exact ordering produced by the implementation for the provided default graph.
      const topo = new TopoPage(page);

      // Ensure starting from default input
      const initialInput = await topo.getInputValue();
      expect(initialInput).toBeTruthy();

      // Click the Run button to trigger parsing and algorithm
      await topo.clickRun();

      // After running, expect no error message
      const errorText = (await topo.getErrorText()).trim();
      expect(errorText).toBe('', 'No error should be shown for a valid DAG');

      // Output should show the Topological Order text
      const outputText = (await topo.getOutputText()).trim();
      expect(outputText).toContain('Topological Order:');

      // The algorithm implemented in the page (DFS with the specific insertion order) produces:
      // Expected order for the sample input: 4 → 5 → 2 → 3 → 1 → 0
      // Assert exact join string appears in the output
      expect(outputText).toContain('4 → 5 → 2 → 3 → 1 → 0');
    });

    test('S1 -> S2: Cycle detection displays error and cycle path', async ({ page }) => {
      // This test validates:
      // - Providing a cyclic graph triggers cycle detection (S1 -> S2)
      // - Error div displays cycle detection message
      // - Output shows the cycle path
      const topo = new TopoPage(page);

      // Input a cyclic graph A -> B -> C -> A
      const cycleInput = 'A -> B\nB -> C\nC -> A\n';
      await topo.setInputValue(cycleInput);

      // Click run to trigger detection
      await topo.clickRun();

      // Error should indicate cycle detection
      const errorText = (await topo.getErrorText()).trim();
      expect(errorText).toBe('Cycle detected! Topological sort not possible.');

      // Output should present a Cycle path (non-empty)
      const outputText = (await topo.getOutputText()).trim();
      expect(outputText).toContain('Cycle path:');

      // Validate that the cycle path contains the nodes A, B, C in some rotated order
      // We expect the cycleNodes join to include 'A' and 'B' and 'C'
      expect(outputText).toMatch(/A/);
      expect(outputText).toMatch(/B/);
      expect(outputText).toMatch(/C/);
    });

    test('S1 -> S5: Empty graph input shows appropriate error', async ({ page }) => {
      // This test validates:
      // - Providing an empty or whitespace-only input triggers the Empty Graph state (S5)
      // - Error div shows 'Graph is empty or invalid format.'
      const topo = new TopoPage(page);

      await topo.setInputValue('   \n   \n'); // whitespace only
      await topo.clickRun();

      const errorText = (await topo.getErrorText()).trim();
      expect(errorText).toBe('Graph is empty or invalid format.');

      // Output should remain empty
      const outputText = (await topo.getOutputText()).trim();
      expect(outputText).toBe('');
    });

    test('Repeated runs: ensure UI clears previous output and errors between runs', async ({ page }) => {
      // This test validates:
      // - Clicking Run multiple times resets output/error each run (confirming entry/exit actions like clearing UI)
      const topo = new TopoPage(page);

      // First, run valid graph (default) to produce Topological Order
      await topo.clickRun();
      const firstOutput = (await topo.getOutputText()).trim();
      expect(firstOutput).toContain('Topological Order:');

      // Now set input to a cyclic graph and run again
      await topo.setInputValue('1 -> 2\n2 -> 1\n');
      await topo.clickRun();

      // Expect that previous output is cleared and new error is present
      const errorAfter = (await topo.getErrorText()).trim();
      expect(errorAfter).toBe('Cycle detected! Topological sort not possible.');
      const outputAfter = (await topo.getOutputText()).trim();
      expect(outputAfter).toContain('Cycle path:');
    });

    test('S1 -> S4: Attempt to detect parsing errors - verify parser resilience', async ({ page }) => {
      // The application wraps parsing in try/catch and sets errorDiv to 'Error parsing graph input.' on exception (S4).
      // The parser implementation is robust and not expected to throw for malformed lines; this test verifies that
      // malformed but non-exception-causing lines do not trigger the parsing error and are handled gracefully.
      // If a parsing exception were to occur, it would surface as an 'Error parsing graph input.' message.

      const topo = new TopoPage(page);

      // Provide a variety of odd inputs that are syntactically odd but should not throw
      const oddInput = `
        -> orphan
        node1 -> 
        node2 -> node3, , node4
        node5 -> node6
        , ,
      `;
      await topo.setInputValue(oddInput);
      await topo.clickRun();

      // The parser should not throw; therefore the parsing error message should NOT appear.
      const errorText = (await topo.getErrorText()).trim();
      expect(errorText).not.toBe('Error parsing graph input.');

      // Either we have an empty-graph error or a topological order/cycle depending on how lines parsed.
      // If graph turned out empty, the empty-graph message will show; otherwise either topological order or cycle.
      const validEmptyMsg = 'Graph is empty or invalid format.';
      const parsingErrMsg = 'Error parsing graph input.';

      // Ensure we didn't hit the explicit parsing error message.
      expect(errorText).not.toBe(parsingErrMsg);

      // At minimum, the UI should be consistent: if no graph was parsed, the empty graph message is shown
      // Otherwise some result (either Topological Order or cycle) should be present in output or error.
      const outputText = (await topo.getOutputText()).trim();
      if (errorText === validEmptyMsg) {
        expect(outputText).toBe('');
      } else {
        // Either a topological order was displayed or a cycle was detected; ensure one of those messages exists
        expect(outputText.length + errorText.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Console and runtime observation', () => {
    test('Observe console logs and ensure no unexpected runtime exceptions', async ({ page }) => {
      // This test demonstrates that we listen to console and page errors and assert they are not present.
      // It is largely redundant with afterEach checks but provides an explicit test that monitors runtime issues.
      const topo = new TopoPage(page);

      // Perform a few interactions
      await topo.clickRun();
      await topo.setInputValue('X -> Y\nY -> Z\n');
      await topo.clickRun();

      // Inspect collected console messages (stored in the outer scope arrays via listeners)
      // Ensure there were zero page errors captured
      expect(pageErrors.length).toBe(0);

      // Ensure there are no console errors (we allow general logs)
      const errorConsoles = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
      expect(errorConsoles.length).toBe(0);
    });
  });
});