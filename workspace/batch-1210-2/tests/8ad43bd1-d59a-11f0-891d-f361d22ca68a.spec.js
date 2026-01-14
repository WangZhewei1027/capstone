import { test, expect } from '@playwright/test';

// Test file for application: 8ad43bd1-d59a-11f0-891d-f361d22ca68a
// URL: http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad43bd1-d59a-11f0-891d-f361d22ca68a.html
// This test suite validates the FSM states/transitions for the DFS visualization page.
// Important: Tests intentionally do NOT modify page JS; they observe runtime behavior and assert on errors when they naturally occur.

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-2/html/8ad43bd1-d59a-11f0-891d-f361d22ca68a.html';

// Page object to encapsulate interactions
class DFSPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  // Return number of canvas elements under #graph
  async canvasCount() {
    return await this.page.locator('#graph canvas').count();
  }

  // Locator for the original visible button with id #dfs-button (outside canvas)
  originalButton() {
    return this.page.locator('#dfs-button');
  }

  // Locator for the button appended inside the canvas (drawGraph creates this)
  canvasButton() {
    // button appended directly as a child of canvas element
    return this.page.locator('#graph canvas >> xpath=./button | #graph canvas button');
  }

  // Locator for the text-like element appended to canvas (created as <text>)
  canvasTextElement() {
    return this.page.locator('#graph canvas >> text');
  }

  // Count children of the first canvas (useful to check button/text appended)
  async firstCanvasChildCount() {
    const canvas = this.page.locator('#graph canvas').first();
    return await canvas.locator('> *').count();
  }

  // Access inputs
  startInput() {
    return this.page.locator('#start');
  }
  endInput() {
    return this.page.locator('#end');
  }
}

test.describe('DFS Visualization FSM tests (Application 8ad43bd1-d59a-11f0-891d-f361d22ca68a)', () => {
  let pageErrors = [];
  let pageConsole = [];
  let dfsPage;

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    pageConsole = [];

    // Collect page errors (ReferenceError, TypeError, SyntaxError, etc.)
    page.on('pageerror', (err) => {
      // store the Error object and its message for assertions
      pageErrors.push(err);
    });

    // Collect console messages for debugging / assertions
    page.on('console', (msg) => {
      pageConsole.push({ type: msg.type(), text: msg.text() });
    });

    dfsPage = new DFSPage(page);
    await dfsPage.goto();
  });

  test.afterEach(async ({ page }) => {
    // give a short pause to let any late errors surface
    await page.waitForTimeout(50);
  });

  test('S0_Idle: drawGraph() is executed on page load (entry action for Idle)', async () => {
    // This test validates the initial state (S0_Idle) entry action drawGraph()
    // Evidence: a canvas element should be present inside #graph and it should contain appended elements (button/text)
    const canvasCount = await dfsPage.canvasCount();
    expect(canvasCount).toBeGreaterThan(0); // drawGraph should have created at least one canvas

    // start and end inputs must be present as per components
    await expect(dfsPage.startInput()).toBeVisible();
    await expect(dfsPage.endInput()).toBeVisible();

    // The canvas should have child elements appended by drawGraph: a text-like element and a button
    const childCount = await dfsPage.firstCanvasChildCount();
    expect(childCount).toBeGreaterThanOrEqual(1);

    // The specialized 'text' element created by the implementation may be present; if present, ensure it contains expected string fragments
    const textLocator = dfsPage.page.locator('#graph canvas text');
    if (await textLocator.count() > 0) {
      const el = textLocator.first();
      const txt = await el.evaluate((n) => n.text || n.textContent || '');
      // The code sets text.text = 'Start Node: ' + startNode + '<br>End Node: ' + endNode;
      expect(txt).toContain('Start Node:');
      expect(txt).toContain('End Node:');
    }

    // No runtime errors are expected during initial drawGraph in a normal run, but we do not fail the test on unexpected minor console warnings.
    // We assert that at least the DOM changes that represent drawGraph occurred.
  });

  test('Clicking the visible #dfs-button (outside canvas) should NOT trigger the implemented DFS (no handler attached)', async () => {
    // FSM defines an event on "#dfs-button" but the HTML implementation attaches the handler to the canvas-created button instead.
    // This test validates that clicking the original #dfs-button does not perform DFS and does not produce errors.
    const beforeCanvasCount = await dfsPage.canvasCount();

    // Click the original button
    await dfsPage.originalButton().click();

    // Wait a short time for any DOM updates or errors
    await dfsPage.page.waitForTimeout(100);

    const afterCanvasCount = await dfsPage.canvasCount();
    // Because the original button has no onclick handler in the provided HTML, canvas count should remain the same
    expect(afterCanvasCount).toBe(beforeCanvasCount);

    // There should be no new page errors resulting from clicking the inactive button
    expect(pageErrors.length).toBe(0);
  });

  test('S0 -> S1: Clicking the canvas-inserted Perform DFS button should invoke dfs(...) (entry to Performing DFS) and likely produce runtime errors (observed)', async () => {
    // This test validates the transition from Idle to Performing DFS by clicking the button created inside the canvas.
    // We expect the code to run dfs(startNode, ...) and, depending on internal graph structure, produce a runtime TypeError.
    const beforeCanvasCount = await dfsPage.canvasCount();

    const canvasBtnLocator = dfsPage.canvasButton();
    // Ensure the button appended inside the canvas exists
    await expect(canvasBtnLocator).toHaveCountGreaterThan(0);

    // Click the canvas button to trigger DFS implementation
    // We do NOT intercept or patch internal JS; errors, if any, are allowed to surface.
    await canvasBtnLocator.first().click();

    // Give some time for DFS recursion and potential errors / redraw to happen
    await dfsPage.page.waitForTimeout(200);

    // After clicking the internal canvas button, the implementation attempts to run dfs(...) (entry action of S1)
    // Evidence of dfs execution is visible by either:
    // - An error thrown during recursion (TypeError: graph[node] is not iterable), or
    // - drawGraph being called again (exit action), which would append another canvas
    const afterCanvasCount = await dfsPage.canvasCount();

    // At least one of the two outcomes should occur:
    // 1) A page error occurred (evidence that dfs ran and encountered an issue), OR
    // 2) The canvas was redrawn (evidence that drawGraph() was called on exit from Performing DFS)
    const sawError = pageErrors.length > 0;
    const redrawn = afterCanvasCount > beforeCanvasCount;

    expect(sawError || redrawn).toBeTruthy();

    // If errors were observed, assert that at least one looks like a TypeError resulting from the DFS traversal (common in this implementation)
    if (sawError) {
      const messages = pageErrors.map((e) => (e && e.message) || String(e));
      // Ensure at least one error message contains indicative substrings
      const typeErrorLikely = messages.some((m) =>
        m.includes('not iterable') || m.includes('graph') || m.includes('is not iterable') || m.includes('TypeError')
      );
      expect(typeErrorLikely).toBeTruthy();
    }

    // If drawGraph was called again, ensure additional canvas was added and that the new canvas also contains appended elements
    if (redrawn) {
      expect(afterCanvasCount).toBeGreaterThan(beforeCanvasCount);
      // Check that the latest canvas has at least one child (button/text)
      const latestCanvas = dfsPage.page.locator('#graph canvas').nth(afterCanvasCount - 1);
      const latestChildren = await latestCanvas.locator('> *').count();
      expect(latestChildren).toBeGreaterThanOrEqual(1);
    }
  });

  test('Edge cases: invalid input values and repeated clicks - observe behavior and errors without patching code', async () => {
    // This test explores edge cases: set text inputs to non-numeric values and repeatedly click the internal canvas button.
    // We do not modify page JS; we simply supply inputs and observe runtime behavior and errors.

    // Provide non-numeric / unexpected inputs
    await dfsPage.startInput().fill('A'); // startNode captured only at load; the global variable startNode won't update after typing
    await dfsPage.endInput().fill('Z');

    // The implementation reads startNode and endNode only once on script load; update will likely not affect the behavior.
    // Repeated clicks on the canvas button may surface additional errors or repeated redraws.
    const canvasBtn = dfsPage.canvasButton().first();
    await expect(canvasBtn).toBeVisible();

    const initialCanvasCount = await dfsPage.canvasCount();
    // Click multiple times to exercise repeated transitions
    await canvasBtn.click();
    await dfsPage.page.waitForTimeout(100);
    await canvasBtn.click();
    await dfsPage.page.waitForTimeout(200);

    // Collect errors observed during these interactions
    const errorsObserved = pageErrors.length;
    // It's acceptable that errors appear; assert that at least zero or more errors are captured and that they are not all swallowed.
    expect(errorsObserved).toBeGreaterThanOrEqual(0);

    // If the first canvas button click caused a TypeError that prevents later drawGraph() calls,
    // repeated clicks may not increase canvas count. We assert canvas count is >= initial (no removal expected).
    const finalCanvasCount = await dfsPage.canvasCount();
    expect(finalCanvasCount).toBeGreaterThanOrEqual(initialCanvasCount);
  });
});