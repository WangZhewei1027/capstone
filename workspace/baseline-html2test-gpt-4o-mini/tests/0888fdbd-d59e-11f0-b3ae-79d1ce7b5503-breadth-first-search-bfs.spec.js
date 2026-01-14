import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/0888fdbd-d59e-11f0-b3ae-79d1ce7b5503.html';

// Page object for the BFS visualization page
class BFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graphSelector = '#graph';
    this.nodeSelector = '#graph .node';
    this.startButton = page.locator('#startBFS');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  nodeLocator(index) {
    return this.page.locator(this.nodeSelector).nth(index);
  }

  // Click the Start BFS button
  async clickStart() {
    await this.startButton.click();
  }

  // Return whether a node has the 'visited' class
  async isVisited(index) {
    const cls = await this.nodeLocator(index).getAttribute('class');
    return typeof cls === 'string' && cls.split(/\s+/).includes('visited');
  }

  // Wait until a node is marked visited (or timeout)
  async waitForVisited(index, timeout = 5000) {
    await this.page.waitForFunction(
      (sel, idx) => {
        const nodes = Array.from(document.querySelectorAll(sel));
        const n = nodes[idx];
        return !!n && n.classList.contains('visited');
      },
      this.nodeSelector,
      index,
      { timeout }
    );
  }

  // Wait until a node no longer has 'visited' class
  async waitForNotVisited(index, timeout = 2000) {
    await this.page.waitForFunction(
      (sel, idx) => {
        const nodes1 = Array.from(document.querySelectorAll(sel));
        const n1 = nodes[idx];
        return !!n && !n.classList.contains('visited');
      },
      this.nodeSelector,
      index,
      { timeout }
    );
  }

  // Count nodes with visited class
  async visitedCount() {
    return this.page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel)).filter(n => n.classList.contains('visited')).length;
    }, this.nodeSelector);
  }

  // Get text content of a node
  async nodeText(index) {
    return this.nodeLocator(index).innerText();
  }
}

test.describe('Breadth-First Search (BFS) Visualization - UI and behavior', () => {
  let consoleMessages;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages and errors for assertions
    page.on('console', msg => {
      const entry = { type: msg.type(), text: msg.text() };
      consoleMessages.push(entry);
      if (msg.type() === 'error') consoleErrors.push(entry);
    });

    page.on('pageerror', err => {
      // pageerror is typically an uncaught exception
      pageErrors.push(err);
    });

    const bfsPage = new BFSPage(page);
    await bfsPage.goto();
  });

  test.afterEach(async ({}, testInfo) => {
    // Attach info to test logs for debugging if something failed
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log('Console messages captured:', consoleMessages);
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors.map(e => (e && e.message) || String(e)));
    }
  });

  test('Initial page load shows a 5x5 grid of nodes and Start button', async ({ page }) => {
    // Purpose: Verify initial DOM structure and default state before any interaction
    const bfsPage1 = new BFSPage(page);

    // Verify the Start BFS button is visible and enabled
    await expect(bfsPage.startButton).toBeVisible();
    await expect(bfsPage.startButton).toBeEnabled();
    await expect(bfsPage.startButton).toHaveText('Start BFS');

    // Verify there are exactly 25 nodes in the grid
    const nodes2 = page.locator(bfsPage.nodeSelector);
    await expect(nodes).toHaveCount(25);

    // Verify nodes are labeled 0..24 and none are visited initially
    for (let i = 0; i < 25; i++) {
      const text = await bfsPage.nodeText(i);
      expect(text).toBe(String(i)); // ensure numbering is correct
      const visited = await bfsPage.isVisited(i);
      expect(visited).toBeFalsy(); // no node should be visited at load
    }

    // Verify no uncaught page errors on initial load
    expect(pageErrors.length).toBe(0);
    // Verify no console errors on initial load
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Start BFS begins visiting nodes in a sequence (verify first few visits)', async ({ page }) => {
    // Purpose: Test the BFS start action and that nodes get the "visited" class over time
    const bfsPage2 = new BFSPage(page);

    // Start BFS
    await bfsPage.clickStart();

    // The implementation visits nodes with a 500ms delay per node.
    // Verify node 0 is visited first (within 1s)
    await bfsPage.waitForVisited(0, 2000);
    expect(await bfsPage.isVisited(0)).toBeTruthy();

    // Verify node 1 is visited soon after (within a couple seconds)
    await bfsPage.waitForVisited(1, 2000);
    expect(await bfsPage.isVisited(1)).toBeTruthy();

    // Verify node 5 (neighbor down from 0) is visited also shortly (within a few seconds)
    await bfsPage.waitForVisited(5, 3000);
    expect(await bfsPage.isVisited(5)).toBeTruthy();

    // Ensure visited count is at least 3 at this point
    const count = await bfsPage.visitedCount();
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify no uncaught page errors or console errors happened while BFS progressed
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Start BFS again resets visited classes and restarts traversal', async ({ page }) => {
    // Purpose: Ensure the Start button resets state and can restart BFS
    const bfsPage3 = new BFSPage(page);

    // Start BFS and wait for a couple of nodes to be visited
    await bfsPage.clickStart();
    await bfsPage.waitForVisited(0, 2000);
    await bfsPage.waitForVisited(1, 2000);
    expect(await bfsPage.isVisited(0)).toBeTruthy();
    expect(await bfsPage.isVisited(1)).toBeTruthy();

    // Click Start BFS again - this should remove 'visited' classes immediately and start a new traversal
    await bfsPage.clickStart();

    // Immediately after clicking, nodes should be reset (no visited class)
    // Wait for node 0 to be not visited (should be removed as part of reset)
    await bfsPage.waitForNotVisited(0, 2000);
    expect(await bfsPage.isVisited(0)).toBeFalsy();

    // After reset, BFS restarts: node 0 should be visited again within a short time
    await bfsPage.waitForVisited(0, 2000);
    expect(await bfsPage.isVisited(0)).toBeTruthy();

    // Confirm there were no uncaught errors during the reset and restart
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Rapid repeated clicks on Start BFS do not cause uncaught exceptions', async ({ page }) => {
    // Purpose: Exercise edge case - pressing Start multiple times quickly
    const bfsPage4 = new BFSPage(page);

    // Rapidly click start multiple times to ensure handler is robust
    await bfsPage.startButton.click();
    await bfsPage.startButton.click();
    await bfsPage.startButton.click();

    // Wait a little while and make sure node 0 becomes visited (indicates BFS ran)
    await bfsPage.waitForVisited(0, 3000);
    expect(await bfsPage.isVisited(0)).toBeTruthy();

    // Ensure there were no uncaught page errors or console errors as a result
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility and visibility checks for interactive elements', async ({ page }) => {
    // Purpose: Basic accessibility/visibility checks
    const bfsPage5 = new BFSPage(page);

    // The Start BFS button should be reachable and have an accessible name
    const button = bfsPage.startButton;
    await expect(button).toBeVisible();
    const role = await button.getAttribute('role');
    // role may be undefined; ensure button has text for accessibility
    const label = await button.textContent();
    expect(typeof label).toBe('string');
    expect(label.trim().length).toBeGreaterThan(0);

    // Ensure each node is focusable via keyboard (they are divs but should be in DOM)
    // We at least check that nodes are present and visible
    const nodes3 = page.locator(bfsPage.nodeSelector);
    await expect(nodes.first()).toBeVisible();
  });
});