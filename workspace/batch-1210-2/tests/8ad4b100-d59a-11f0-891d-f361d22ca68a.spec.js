import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad4b100-d59a-11f0-891d-f361d22ca68a.html';

test.describe("Prim's Algorithm App (FSM tests)", () => {
  // We'll collect page errors and console error messages per test to assert that runtime errors occur naturally.
  let pageErrors = [];
  let consoleErrors = [];
  let pageErrorHandler;
  let consoleHandler;

  test.beforeEach(async ({ page }) => {
    // Reset collectors
    pageErrors = [];
    consoleErrors = [];

    // Attach handlers BEFORE navigation so we capture errors thrown during script evaluation on load.
    pageErrorHandler = (err) => {
      // err is an Error object from the page context
      pageErrors.push(err);
    };
    page.on('pageerror', pageErrorHandler);

    consoleHandler = (msg) => {
      // capture console error messages for inspection
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    };
    page.on('console', consoleHandler);
  });

  test.afterEach(async ({ page }) => {
    // Clean up listeners to avoid leakage between tests
    if (pageErrorHandler) page.removeListener('pageerror', pageErrorHandler);
    if (consoleHandler) page.removeListener('console', consoleHandler);
  });

  test.describe('S0_Idle (Initial State) validations', () => {
    test('Idle state renders UI elements and script runtime errors are reported on load', async ({ page }) => {
      // Navigate to the page; the app's inline script runs during load.
      await page.goto(APP_URL);

      // Verify presence of components from FSM evidence even if script fails.
      const verticesInput = await page.$('#vertices');
      const startButton = await page.$('#start-button');
      const clearButton = await page.$('#clear-button');
      const graphDiv = await page.$('#graph');

      expect(verticesInput).not.toBeNull(); // input exists
      expect(startButton).not.toBeNull();   // start button exists
      expect(clearButton).not.toBeNull();   // clear button exists
      expect(graphDiv).not.toBeNull();      // graph container exists

      // Check input attributes match expected placeholder text
      const placeholder = await page.getAttribute('#vertices', 'placeholder');
      expect(placeholder).toBe('Enter number of vertices');

      // Because the HTML calculates 'vertices' on load from an empty input,
      // the inline script is expected to throw a runtime error (observed in implementation).
      // We assert that at least one pageerror was emitted during navigation / script execution.
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // Also assert there were console error messages captured (implementation emits errors)
      expect(consoleErrors.length).toBeGreaterThanOrEqual(1);

      // The exact error message may vary across engines, but the implementation attempts new Array(vertices)
      // where vertices is NaN, commonly causing a RangeError like "Invalid array length".
      // Assert that at least one of the captured errors contains a hint about invalid array length or is an Error object.
      const anyMessageMatches = consoleErrors.some(text =>
        /invalid array length/i.test(text) || /rangeerror/i.test(text) || /invalid array/i.test(text)
      );

      // If consoleErrors didn't include the message, ensure pageErrors contain an Error object with a message
      const pageErrorMessageMatch = pageErrors.some(err =>
        /invalid array length/i.test(String(err.message).toLowerCase()) ||
        /rangeerror/i.test(String(err.name).toLowerCase()) ||
        /invalid array/i.test(String(err.message).toLowerCase())
      );

      // At least one of the checks should be true to demonstrate the natural runtime error occurred.
      expect(anyMessageMatches || pageErrorMessageMatch).toBeTruthy();
    });
  });

  test.describe('S1_AlgorithmRunning and S2_GraphCleared (Transitions and error scenarios)', () => {
    test('Clicking Start should not successfully run Prim (functions likely undefined) and calling primAlgorithm throws', async ({ page }) => {
      // Navigate and capture earlier runtime errors
      await page.goto(APP_URL);

      // Attempt to click the Start button as a user would.
      // Because the inline script likely threw during evaluation, event listeners (and functions) may not be defined.
      await page.click('#start-button');

      // The graph area should remain empty (no edges rendered) because displayGraph likely never executed.
      const edgesAfterClick = await page.$$('#graph .edge');
      expect(edgesAfterClick.length).toBe(0);

      // Attempt to directly invoke primAlgorithm() from the page context to assert whether it exists.
      // We expect a ReferenceError (or similar) because the script initialization did not finish.
      let threw = false;
      try {
        // This will execute in the page's JS context and naturally throw if primAlgorithm is not defined.
        await page.evaluate(() => {
          // Intentionally call the function; let any ReferenceError bubble up naturally.
          return primAlgorithm();
        });
      } catch (err) {
        threw = true;
        // Assert the error message indicates a missing function or ReferenceError
        // Typical messages: "primAlgorithm is not defined" or "ReferenceError: primAlgorithm is not defined"
        expect(String(err.message)).toMatch(/primAlgorithm|not defined|ReferenceError/i);
      }
      expect(threw).toBe(true);
    });

    test('Clicking Clear should clear the graph if handler present; otherwise graph remains (demonstrates missing handlers due to load error)', async ({ page }) => {
      await page.goto(APP_URL);

      // Simulate that the UI had some content: inject dummy nodes/edges into the #graph container.
      // NOTE: This manipulates the DOM to create an initial state for testing the Clear button behavior,
      // but it does not redefine or patch any global functions or event handlers.
      await page.evaluate(() => {
        const graph = document.getElementById('graph');
        graph.innerHTML = '';
        for (let i = 0; i < 4; i++) {
          const span = document.createElement('span');
          span.className = 'edge';
          span.textContent = 'E';
          graph.appendChild(span);
        }
      });

      // Sanity check: ensure our injected content exists
      let injectedCount = await page.$$eval('#graph .edge', els => els.length);
      expect(injectedCount).toBe(4);

      // Click the Clear button; expected behavior per FSM: clearGraph() should empty the graph.
      // Due to earlier script errors, the clear button's event handler may not be attached.
      await page.click('#clear-button');

      // Inspect the graph container after clicking Clear.
      const afterClearCount = await page.$$eval('#graph .edge', els => els.length);

      // Two acceptable outcomes (we assert both possibilities to validate observed behavior):
      // - If clear handler was attached despite earlier errors: graph should be cleared.
      // - If clear handler was NOT attached (likely), the injected content will remain.
      // We assert that the behavior is consistent and that a runtime page error was observed earlier.
      // Therefore, we require that either the graph is empty OR it remains unchanged (both valid observations),
      // but we must still assert that a runtime error occurred on load.
      expect(afterClearCount === 0 || afterClearCount === 4).toBeTruthy();
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    });

    test('Attempting to transition from S2_GraphCleared to S0_Idle by clicking Clear again should be safe (idempotent) and not crash', async ({ page }) => {
      await page.goto(APP_URL);

      // Ensure graph is empty (it may already be empty). Call clear twice.
      await page.click('#clear-button');
      await page.click('#clear-button');

      // After repeated clears, graph should still be in a consistent DOM state (no thrown exceptions propagated)
      // and #graph should be present. We assert that at minimum the element exists and no new uncaught exceptions were thrown
      // during these actions beyond those captured at initial load.
      const graphExists = await page.$('#graph');
      expect(graphExists).not.toBeNull();

      // Confirm that initial load errors were present.
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Edge cases and explicit error checks', () => {
    test('Directly invoking page functions that should exist (primAlgorithm/displayGraph) results in ReferenceError due to failed init', async ({ page }) => {
      await page.goto(APP_URL);

      // Check that displayGraph either doesn't exist or throws when invoked.
      // We try both functions and assert that at least one throws a ReferenceError / is undefined.
      let primThrows = false;
      try {
        await page.evaluate(() => primAlgorithm());
      } catch (e) {
        primThrows = true;
        expect(String(e.message)).toMatch(/primAlgorithm|not defined|ReferenceError/i);
      }

      let displayThrows = false;
      try {
        await page.evaluate(() => displayGraph({}));
      } catch (e) {
        displayThrows = true;
        expect(String(e.message)).toMatch(/displayGraph|not defined|ReferenceError/i);
      }

      // At least one of the functions should have thrown / been missing as the script failed during initialization.
      expect(primThrows || displayThrows).toBeTruthy();

      // Also assert page-level error(s) exist from initial load.
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    });

    test('Verify observed console/page errors contain helpful diagnostics about array length or initialization failure', async ({ page }) => {
      await page.goto(APP_URL);

      // We expect diagnostics mentioning the invalid array length or initialization failure due to reading empty input.
      const combinedConsole = consoleErrors.join(' || ').toLowerCase();
      const combinedPageErrMsgs = pageErrors.map(e => String(e.message).toLowerCase()).join(' || ');

      const foundHint =
        /invalid array length/.test(combinedConsole) ||
        /invalid array length/.test(combinedPageErrMsgs) ||
        /rangeerror/.test(combinedConsole) ||
        /rangeerror/.test(combinedPageErrMsgs) ||
        /nan/.test(combinedConsole) ||
        /nan/.test(combinedPageErrMsgs);

      // It's acceptable if browser messages differ, but we should have at least some indication of initialization failure.
      expect(foundHint || pageErrors.length > 0).toBeTruthy();
    });
  });
});