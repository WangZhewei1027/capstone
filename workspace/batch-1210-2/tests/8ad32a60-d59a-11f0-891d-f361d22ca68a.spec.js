import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad32a60-d59a-11f0-891d-f361d22ca68a.html';

// Page Object for the Weighted Graph app
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async addConnection(source, target, weight) {
    await this.page.fill('#source', String(source));
    await this.page.fill('#target', String(target));
    // If weight is null or undefined, clear the field
    if (weight === null || weight === undefined) {
      await this.page.fill('#weight', '');
    } else {
      await this.page.fill('#weight', String(weight));
    }
    await this.page.click('#add-connection');
  }

  async clearConnections() {
    await this.page.click('#clear-connections');
  }

  async connectionsLength() {
    return await this.page.evaluate(() => {
      // If connections is not defined, return null
      return typeof connections !== 'undefined' ? connections.length : null;
    });
  }

  async graphInnerHTML() {
    return await this.page.$eval('#graph', (el) => el.innerHTML);
  }

  async nodeExists(nodeId) {
    return await this.page.$(`#graph #${nodeId}`) !== null;
  }

  async nodeBackground(nodeId) {
    const el = await this.page.$(`#graph #${nodeId}`);
    if (!el) return null;
    return await el.evaluate((e) => getComputedStyle(e).backgroundColor);
  }
}

test.describe('Weighted Graph FSM - states and transitions', () => {
  // Each test gets a fresh page
  test.beforeEach(async ({ page }) => {
    // Silence Playwright's default console logging for cleaner test output if needed.
    // We still capture console and pageerror events explicitly in tests.
  });

  test('S0_Idle (Initial state) - page renders inputs, buttons and empty graph', async ({ page }) => {
    // Validate initial Idle state elements are present and that no runtime errors occur on load.
    const gp = new GraphPage(page);
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await gp.goto();

    // Verify input fields and buttons are present
    await expect(page.locator('#source')).toBeVisible();
    await expect(page.locator('#target')).toBeVisible();
    await expect(page.locator('#weight')).toBeVisible();
    await expect(page.locator('#add-connection')).toBeVisible();
    await expect(page.locator('#clear-connections')).toBeVisible();
    await expect(page.locator('#graph')).toBeVisible();

    // Verify the graph is empty initially and connections array (global) is empty
    const inner = await gp.graphInnerHTML();
    expect(inner).toBe('', 'Graph should be empty on initial render');

    const connectionsLen = await gp.connectionsLength();
    // connections should be defined and empty by initial script
    expect(connectionsLen).toBe(0);

    // There should be no page runtime errors on initial load
    expect(pageErrors.length).toBe(0);
    // Console may have messages but should not include uncaught exceptions
    const errorsInConsole = consoleMessages.filter(m => m.type === 'error');
    expect(errorsInConsole.length).toBe(0);
  });

  test('S0 -> S1 (AddConnection) - valid add should update connections and create node, but runtime error is expected from displayGraph', async ({ page }) => {
    // This test validates the AddConnection transition:
    // - inputs are read and a connection pushed
    // - displayGraph() is invoked and (based on the current implementation) will likely throw a TypeError
    // - We assert connections length and presence of created node in the DOM
    // - We also assert that a pageerror occurred and contains indicative text
    const gp = new GraphPage(page);

    await gp.goto();

    // Prepare to capture the first page error triggered by displayGraph
    const pageErrorPromise = page.waitForEvent('pageerror');

    // Perform the action: add a valid connection
    // Using strings to match how the implementation uses .value
    const sourceValue = '1';
    const targetValue = '2';
    const weightValue = '10';

    // Trigger the action that is expected to cause a runtime exception inside displayGraph
    await gp.addConnection(sourceValue, targetValue, weightValue);

    // Wait for the pageerror event that is expected due to the buggy displayGraph implementation.
    // If it doesn't occur within a short timeframe, the test will fail (the FSM expected displayGraph to run).
    const pageError = await pageErrorPromise;

    // Assert that an error was indeed thrown
    expect(pageError).toBeTruthy();
    const msg = pageError.message || String(pageError);
    // The implementation attempts to access .textContent on a null element (weightElementElement)
    // Different engines/generators can produce slightly different error messages; check for key substrings.
    expect(
      msg.includes('Cannot set') ||
      msg.includes('Cannot read') ||
      msg.includes('null') ||
      msg.includes('reading') ||
      msg.includes('textContent')
    ).toBeTruthy();

    // Despite the runtime error inside displayGraph, the connections.push happens before displayGraph call.
    // Verify the connections global was updated.
    const connectionsLen = await gp.connectionsLength();
    expect(connectionsLen).toBe(1);

    // The graph's innerHTML is populated with a node div for the source key before the failing code executes.
    const inner = await gp.graphInnerHTML();
    // It should contain an element with id equal to the source value (graph[source] was set)
    expect(inner).toContain(`id="${sourceValue}"`);

    // The node element should exist in the DOM
    const nodeExists = await gp.nodeExists(sourceValue);
    expect(nodeExists).toBeTruthy();

    // Because the subsequent DOM manipulations for weight likely failed, the target node background may not have been set.
    // We do not assert a specific background color here because the error interrupts the rest of displayGraph.
  });

  test('S0 -> S1 (AddConnection) edge case - empty weight should not add connection and should not trigger displayGraph', async ({ page }) => {
    // This test validates that providing an empty weight prevents the transition to ConnectionAdded:
    // - no connection is pushed
    // - displayGraph is NOT invoked (no pageerror)
    const gp = new GraphPage(page);

    await gp.goto();

    // Listen for pageerror but do not expect one
    let pageErrorOccured = false;
    page.on('pageerror', () => {
      pageErrorOccured = true;
    });

    // Ensure inputs are empty (weight empty is the edge case)
    await gp.addConnection('3', '4', ''); // weight intentionally empty

    // Give a short time for any asynchronous errors to surface (if any)
    await page.waitForTimeout(250);

    // connections should still be zero because weight was empty and the if condition blocks pushing
    const connectionsLen = await gp.connectionsLength();
    expect(connectionsLen).toBe(0);

    // Graph should remain empty
    const inner = await gp.graphInnerHTML();
    expect(inner).toBe('', 'Graph should remain empty when weight is empty');

    // No page runtime error should have occurred in this edge case
    expect(pageErrorOccured).toBeFalsy();
  });

  test('S1 -> S2 (ClearConnections) - after adding, clearing should reset graph and connections and displayGraph should run safely when no connections exist', async ({ page }) => {
    // This test validates ClearConnections transition:
    // - after at least one successful add (we will add one but handle the expected error),
    // - clicking clear should reset graph and connections
    // - displayGraph will be called but with empty connections array; in this case it should not throw
    const gp = new GraphPage(page);

    await gp.goto();

    // Add a connection that will cause a displayGraph error (we expect the error, but the connections array will be updated)
    // Capture and ignore the first pageerror from adding (we will assert it occurred)
    const firstErrorPromise = page.waitForEvent('pageerror');
    await gp.addConnection('5', '6', '7');
    const firstError = await firstErrorPromise;
    expect(firstError).toBeTruthy();

    // Confirm connection was added
    let connectionsLen = await gp.connectionsLength();
    expect(connectionsLen).toBe(1);

    // Now prepare to clear connections. Because displayGraph may run without error when connections is empty,
    // we will monitor for any pageerror and fail if one appears.
    let pageErrorDuringClear = null;
    const onPageError = (e) => { pageErrorDuringClear = e; };
    page.on('pageerror', onPageError);

    // Perform clear action
    await gp.clearConnections();

    // Brief delay to let any potential errors surface
    await page.waitForTimeout(200);

    // After clearing, connections should be empty
    connectionsLen = await gp.connectionsLength();
    expect(connectionsLen).toBe(0);

    // Graph innerHTML should be empty after clearing
    const inner = await gp.graphInnerHTML();
    expect(inner).toBe('', 'Graph should be empty after clearing connections');

    // The clear path should not produce a runtime error; assert none occurred
    expect(pageErrorDuringClear).toBeNull();

    // Clean up listener
    page.off('pageerror', onPageError);
  });

  test('S2 (ConnectionsCleared) - calling clear when already clear should be a no-op and should not throw', async ({ page }) => {
    // Validate idempotent behavior of ClearConnections when graph is already empty.
    const gp = new GraphPage(page);

    await gp.goto();

    // Ensure initial state is empty
    let connectionsLen = await gp.connectionsLength();
    expect(connectionsLen).toBe(0);

    // Listen for page errors
    let pageError = null;
    const onPageError = (e) => { pageError = e; };
    page.on('pageerror', onPageError);

    // Click clear again
    await gp.clearConnections();

    // Wait shortly
    await page.waitForTimeout(150);

    // No change expected and no error
    connectionsLen = await gp.connectionsLength();
    expect(connectionsLen).toBe(0);

    expect(pageError).toBeNull();

    page.off('pageerror', onPageError);
  });
});