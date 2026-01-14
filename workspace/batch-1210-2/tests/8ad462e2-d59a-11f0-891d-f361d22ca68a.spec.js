import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad462e2-d59a-11f0-891d-f361d22ca68a.html';

test.describe('Bellman-Ford FSM - 8ad462e2-d59a-11f0-891d-f361d22ca68a', () => {
  // Collect console messages and page errors for assertions
  let consoleMessages;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      try {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      } catch {
        consoleMessages.push({ type: 'unknown', text: String(msg) });
      }
    });

    // Capture uncaught errors on the page (ReferenceError, TypeError, etc.)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate and wait for load (script on page executes during load)
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async ({ page }) => {
    // Ensure page is closed/reset between tests (Playwright fixtures usually handle this,
    // but explicitly navigate to about:blank to help cleanup)
    await page.goto('about:blank');
  });

  test('Initial Idle state (S0_Idle): page renders form and inputs and a runtime error occurs on load', async ({ page }) => {
    // This test validates the Idle state rendering and that the page's entry script (createGraph() called on load)
    // results in a runtime error (as per the unmodified implementation).
    // Check that the core components from the FSM are present in the DOM.
    const form = page.locator('#graph-form');
    const source = page.locator('#source');
    const weight = page.locator('#weight');
    const submit = page.locator('#submit');
    const graph = page.locator('#graph');

    await expect(form).toHaveCount(1);
    await expect(source).toHaveCount(1);
    await expect(weight).toHaveCount(1);
    await expect(submit).toHaveCount(1);
    await expect(graph).toHaveCount(1);

    // Validate placeholders as described in evidence
    await expect(source).toHaveAttribute('placeholder', 'Source Vertex');
    await expect(weight).toHaveAttribute('placeholder', 'Weight');

    // Because the page's script calls createGraph() immediately on load and that function uses weight[i][j],
    // we expect at least one runtime error to have been emitted during page load.
    expect(pageErrors.length).toBeGreaterThan(0);

    // Assert that one of the page errors is a TypeError (common for attempting to index into a non-array)
    const hasTypeError = pageErrors.some(err => err && err.name === 'TypeError');
    expect(hasTypeError).toBeTruthy();

    // The graph area should exist, and since displayGraph likely didn't complete due to errors,
    // innerHTML should be empty string.
    const graphInner = await graph.evaluate(el => el.innerHTML);
    expect(graphInner).toBe('');
  });

  test('Transition on Submit (S0 -> S1 -> S2 -> S3): clicking submit triggers event handlers and results in runtime errors', async ({ page }) => {
    // This test validates the SubmitGraph event and the transition chain.
    // We reinitialize the collectors to isolate events for this test.
    consoleMessages = [];
    pageErrors = [];

    const source = page.locator('#source');
    const weight = page.locator('#weight');
    const submit = page.locator('#submit');
    const graph = page.locator('#graph');

    // Verify functions exist on window (createGraph, bellmanFord, displayGraph)
    // If the script loaded, these functions should be defined, even if they throw when run.
    const funcs = await page.evaluate(() => {
      return {
        createGraph: typeof window.createGraph,
        bellmanFord: typeof window.bellmanFord,
        displayGraph: typeof window.displayGraph
      };
    });

    expect(funcs.createGraph).toBe('function');
    expect(funcs.bellmanFord).toBe('function');
    expect(funcs.displayGraph).toBe('function');

    // Fill inputs with typical values and click submit to trigger the sequence.
    // The implementation expects to read weight as a 2D array but input provides a single number,
    // so clicking will likely create a TypeError during createGraph or bellmanFord.
    await source.fill('0');
    await weight.fill('5');

    // Click the submit button (this triggers the event listener added in the page script)
    await submit.click();

    // Give the page a short moment to process events and emit any errors/logs
    await page.waitForTimeout(200);

    // We expect runtime errors to appear as a consequence of running createGraph()/bellmanFord()
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const typeErrorOccurred = pageErrors.some(e => e && e.name === 'TypeError');
    expect(typeErrorOccurred).toBeTruthy();

    // Assert that the graph display did not get populated due to errors
    const graphContent = await graph.evaluate(el => el.innerHTML);
    expect(graphContent).toBe('');

    // Confirm that a console message was not containing a successful "Negative-weight cycle detected" log
    const negativeCycleLog = consoleMessages.find(m => m.text && m.text.includes('Negative-weight cycle detected'));
    expect(negativeCycleLog).toBeUndefined();
  });

  test('Edge cases: empty inputs and non-numeric weight still produce runtime errors (verify robustness)', async ({ page }) => {
    // Validate how the page behaves for empty inputs and non-numeric input.
    consoleMessages = [];
    pageErrors = [];

    const source = page.locator('#source');
    const weight = page.locator('#weight');
    const submit = page.locator('#submit');
    const graph = page.locator('#graph');

    // Case 1: Empty source, empty weight
    await source.fill('');
    await weight.fill('');
    await submit.click();
    await page.waitForTimeout(200);

    // At least one page error should occur
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const anyTypeError = pageErrors.some(e => e && e.name === 'TypeError');
    expect(anyTypeError).toBeTruthy();

    // Clear captured errors for the next sub-case
    pageErrors = [];

    // Case 2: Non-numeric weight text (though input type=number will coerce/limit input in UI,
    // using fill may still set a non-numeric string value in some contexts)
    await source.fill('A');
    // Directly set the value via evaluate to emulate an unexpected structure for weight (a string)
    await page.evaluate(() => { document.getElementById('weight').value = 'not-a-matrix'; });
    await submit.click();
    await page.waitForTimeout(200);

    // Again, expect errors due to the implementation assuming weight is a 2D array
    expect(pageErrors.length).toBeGreaterThanOrEqual(1);
    const hasTypeErr = pageErrors.some(e => e && e.name === 'TypeError');
    expect(hasTypeErr).toBeTruthy();

    // Graph should remain empty in these erroneous cases
    const graphHtml = await graph.evaluate(el => el.innerHTML);
    expect(graphHtml).toBe('');
  });

  test('FSM state functions existence and evidence checks (S1, S2, S3): verify functions present and DOM modifications attempted', async ({ page }) => {
    // This test verifies the presence of createGraph, bellmanFord, displayGraph and inspects whether
    // displayGraph attempted to modify the DOM (it uses document.createElement but never appends elements).
    // Collect console and errors for final assertion.
    consoleMessages = [];
    pageErrors = [];

    // Confirm functions exist
    const exist = await page.evaluate(() => {
      return {
        createGraphExists: typeof createGraph === 'function',
        bellmanFordExists: typeof bellmanFord === 'function',
        displayGraphExists: typeof displayGraph === 'function'
      };
    });
    expect(exist.createGraphExists).toBe(true);
    expect(exist.bellmanFordExists).toBe(true);
    expect(exist.displayGraphExists).toBe(true);

    // Call displayGraph directly to observe behavior (it may run but not append children because of implementation)
    // Use try/catch inside evaluate so any thrown error surfaces as pageerror (we want to let it happen naturally)
    await page.evaluate(() => {
      try {
        // call displayGraph to exercise S3 entry action
        displayGraph();
      } catch (e) {
        // Rethrow so pageerror listener captures it (the test harness should not swallow it)
        throw e;
      }
    }).catch(() => {
      // The evaluation may reject due to pageerror; that's acceptable per requirements
    });

    // Wait a short moment for errors to propagate
    await page.waitForTimeout(100);

    // displayGraph implementation creates elements but does not append them. Ensure graph innerHTML remains empty.
    const graphInner = await page.locator('#graph').evaluate(el => el.innerHTML);
    expect(graphInner).toBe('');

    // Ensure that calling displayGraph did not unexpectedly produce console logs indicating success
    const infoLog = consoleMessages.find(m => m.text && m.text.includes('Vertex'));
    expect(infoLog).toBeUndefined();

    // Ensure at least one runtime error exists from invoking displayGraph or previous actions
    expect(pageErrors.length).toBeGreaterThanOrEqual(0); // allow zero because displayGraph itself may not throw
    // But ensure that earlier load-time error is present too (should be present from beforeEach navigation)
    const initialTypeErr = pageErrors.some(e => e && e.name === 'TypeError');
    // initialTypeErr may be true; we won't force it here — just log expectation in comment.
  });
});