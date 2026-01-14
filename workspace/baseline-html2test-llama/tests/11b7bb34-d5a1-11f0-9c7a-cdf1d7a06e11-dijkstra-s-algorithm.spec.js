import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-llama/html/11b7bb34-d5a1-11f0-9c7a-cdf1d7a06e11.html';

test.describe("Dijkstra's Algorithm - Interactive App (11b7bb34-d5a1-11f0-9c7a-cdf1d7a06e11)", () => {

  // Test that the page loads and initial elements are present and in their default state
  test('Initial load: elements present and default state', async ({ page }) => {
    const consoleMessages = [];
    const pageErrors = [];

    // Capture console messages and page errors for inspection
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto(APP_URL);

    // Verify the page title and header are visible
    await expect(page.locator('h1')).toHaveText("Dijkstra's Algorithm");

    // Verify input and buttons exist and are visible
    const graphInput = page.locator('#graph');
    const startButton = page.locator('#start');
    const resultButton = page.locator('#result');
    const graphContainer = page.locator('#graph-container');

    await expect(graphInput).toBeVisible();
    await expect(graphInput).toHaveAttribute('placeholder', 'Enter graph data (adjacency list)');
    await expect(graphInput).toHaveValue(''); // input should be empty by default

    await expect(startButton).toBeVisible();
    await expect(resultButton).toBeVisible();

    // graph-container should be empty on load
    await expect(graphContainer).toBeVisible();
    const containerText = await graphContainer.innerHTML();
    expect(containerText.trim()).toBe('', 'graph-container should start empty');

    // No uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);

    // No unexpected console errors on initial load (we allow informational logs)
    const errorConsoles = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Test edge case: user dismisses the prompt dialogs -> start should return early and leave graph unchanged
  test('Start button: when user cancels prompts, no graph changes occur', async ({ page }) => {
    await page.goto(APP_URL);

    const consoleMessages1 = [];
    const pageErrors1 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    // Dismiss both prompts (simulate user pressing Cancel); the page.start() uses two prompts
    page.on('dialog', async dialog => {
      await dialog.dismiss(); // returns null from prompt
    });

    // Click Start - since prompts are dismissed, start() should return early and not add nodes
    await page.click('#start');

    // Click Result to render graph entries (should remain empty because start was cancelled)
    await page.click('#result');

    // Graph container should remain empty (or contain empty string)
    const containerText1 = await page.locator('#graph-container').innerHTML();
    expect(containerText.trim()).toBe('', 'graph-container should remain empty when prompts are cancelled');

    // No uncaught exceptions should have occurred during cancel flow
    expect(pageErrors.length).toBe(0);

    // There should be no console.error logs
    const errorConsoles1 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Test main happy path: accept prompts, run algorithm, then click Result to see graph output
  test('Start + Result: accepting prompts adds nodes and Result shows graph entries', async ({ page }) => {
    await page.goto(APP_URL);

    const consoleMessages2 = [];
    const pageErrors2 = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => pageErrors.push(err));

    // Respond to the two prompt dialogs: first with 'A' (start), second with 'B' (end)
    let dialogCount = 0;
    page.on('dialog', async dialog => {
      dialogCount += 1;
      if (dialogCount === 1) {
        await dialog.accept('A');
      } else if (dialogCount === 2) {
        await dialog.accept('B');
      } else {
        // If any additional dialogs appear, just dismiss to avoid hanging
        await dialog.dismiss();
      }
    });

    // Click start to run the algorithm with provided prompts
    await page.click('#start');

    // After clicking start, click result to render current graph contents
    await page.click('#result');

    // Give the page a short moment to update the DOM
    await page.waitForTimeout(50);

    // The graph-container should now contain entries for the nodes added ('A' and 'B')
    const containerText2 = await page.locator('#graph-container').innerText();
    // The application prints "<p>{node} -> {graph[node]}\n" for each node. We expect at least the node names to appear.
    expect(containerText).toContain('A ->');
    expect(containerText).toContain('B ->');

    // The program may stringify objects as [object Object] for graph[node]; assert that something is present after arrow
    expect(containerText.match(/A ->\s*/)).not.toBeNull();
    expect(containerText.match(/B ->\s*/)).not.toBeNull();

    // No uncaught errors should happen during normal accept flow
    expect(pageErrors.length).toBe(0);

    // Collect console messages to see if printPath logged anything; it's allowed to log or not
    const logMessages = consoleMessages.filter(m => m.type === 'log').map(m => m.text);
    // printPath logs the path only if it reaches endNode; in this implementation it may not, so we don't assert presence.
    // But ensure there were no console.error messages.
    const errorConsoles2 = consoleMessages.filter(m => m.type === 'error');
    expect(errorConsoles.length).toBe(0);
  });

  // Negative test: directly invoking printPath with a node that doesn't exist should trigger a TypeError in the page context.
  // We observe the pageerror event and also assert that the evaluate call results in an exception.
  test('Calling printPath on undefined node triggers a TypeError (observed as page error)', async ({ page }) => {
    await page.goto(APP_URL);

    const pageErrors3 = [];
    page.on('pageerror', err => pageErrors.push(err));

    // Ensure graph does not contain 'NON_EXISTENT_NODE' to provoke the for...in on undefined inside printPath
    // We set endNode to something else so the base case doesn't return early.
    let caughtError = null;
    try {
      await page.evaluate(() => {
        // Ensure endNode is different from the node we will pass
        endNode = 'SOME_OTHER_NODE';
        // Call printPath with a node that doesn't exist in graph => graph[node] is undefined
        // The function contains: for (let neighbor in graph[node]) { ... } which will throw TypeError
        printPath('NON_EXISTENT_NODE', []);
      });
    } catch (e) {
      // The evaluate will throw because the browser threw an exception; capture it
      caughtError = e;
    }

    // We expect the evaluate to have thrown an error originating from the page
    expect(caughtError).not.toBeNull();
    // The message should mention TypeError in some form (browser message may be included)
    expect(String(caughtError.message)).toMatch(/TypeError|Cannot convert undefined or null to object|Cannot read properties of undefined/i);

    // The pageerror listener should have captured at least one error
    expect(pageErrors.length).toBeGreaterThan(0);

    // Confirm that one of the captured page errors is a TypeError (name property)
    const hasTypeError = pageErrors.some(pe => pe && (pe.name === 'TypeError' || /TypeError/i.test(pe.message)));
    expect(hasTypeError).toBe(true);
  });

});