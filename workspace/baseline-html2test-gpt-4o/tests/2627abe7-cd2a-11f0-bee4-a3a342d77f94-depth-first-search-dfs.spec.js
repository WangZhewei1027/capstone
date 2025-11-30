import { test, expect } from '@playwright/test';

// Test file for: Depth-First Search (DFS) visualization
// Requirements:
// - ES module syntax
// - Tests verify all states and transitions described by the HTML/JS
// - Capture console and page errors (observe and assert)
// - Use page object pattern where appropriate

// Page Object for the DFS page
class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.graphContainer = page.locator('#graph');
    this.startButton = page.locator('button', { hasText: 'Start DFS' });
    this.logContent = page.locator('#logContent');
  }

  // Wait until nodes are created and return their locators
  async waitForNodes(expectedCount = 7) {
    await this.page.waitForSelector(`#node-0`);
    // Ensure all expected node elements exist
    for (let i = 0; i < expectedCount; i++) {
      await this.page.waitForSelector(`#node-${i}`);
    }
  }

  nodeLocator(index) {
    return this.page.locator(`#node-${index}`);
  }

  async getNodesCount() {
    return await this.graphContainer.locator('.node').count();
  }

  async clickStart() {
    await this.startButton.click();
  }

  // Returns the raw innerHTML of the logContent
  async getLogInnerHTML() {
    return await this.logContent.evaluate((el) => el.innerHTML);
  }

  // Returns visited node ids by checking elements with 'visited' class
  async getVisitedNodeIds() {
    const visited = [];
    const nodes = this.page.locator('.node.visited');
    const count = await nodes.count();
    for (let i = 0; i < count; i++) {
      const text = await nodes.nth(i).innerText();
      // Node text is the id as string, convert to number
      visited.push(Number(text.trim()));
    }
    return visited;
  }

  // Click a specific node element
  async clickNode(index) {
    await this.nodeLocator(index).click();
  }
}

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe7-cd2a-11f0-bee4-a3a342d77f94.html';

test.describe('Depth-First Search Visualization - DFS', () => {
  // Common captured console and page errors for each test
  let consoleErrors;
  let pageErrors;

  // beforeEach sets up listeners to capture console and page errors,
  // then navigates to the app and prepares the page object.
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    // Capture console messages (we will record those of type 'error')
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location ? msg.location() : null,
        });
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        stack: error.stack,
      });
    });

    // Navigate to the application
    await page.goto(APP_URL);
  });

  // Test initial page load and default state
  test('Initial page load: DOM structure and default state are correct', async ({ page }) => {
    const graphPage = new GraphPage(page);

    // Ensure nodes are created
    await graphPage.waitForNodes(7);

    // There should be 7 nodes (0..6)
    const nodeCount = await graphPage.getNodesCount();
    expect(nodeCount).toBe(7);

    // None of the nodes should have the 'visited' class initially
    for (let i = 0; i < 7; i++) {
      const hasVisited = await graphPage.nodeLocator(i).evaluate((el) =>
        el.classList.contains('visited')
      );
      expect(hasVisited).toBe(false);
    }

    // The logContent should be empty at initial load
    const initialLog = await graphPage.getLogInnerHTML();
    expect(initialLog).toBe('');

    // Ensure the Start DFS button is visible and enabled
    await expect(graphPage.startButton).toBeVisible();
    await expect(graphPage.startButton).toBeEnabled();

    // Ensure that no console 'error' messages or page errors occurred during initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test starting the DFS triggers traversal and DOM updates
  test('Clicking "Start DFS" performs full traversal, updates node classes and log in correct order', async ({ page }) => {
    const graphPage = new GraphPage(page);
    await graphPage.waitForNodes(7);

    // Click the Start DFS button to begin traversal
    await graphPage.clickStart();

    // After traversal, every node 0..6 should have class 'visited'
    const visitedNodeIds = await graphPage.getVisitedNodeIds();
    // Sort visitedNodeIds because DOM order of elements with .visited may not be numeric order
    visitedNodeIds.sort((a, b) => a - b);
    expect(visitedNodeIds).toEqual([0, 1, 2, 3, 4, 5, 6]);

    // The logContent innerHTML should reflect the DFS order visited by the provided algorithm.
    // Based on the graph and DFS implementation, expected order: 0,1,3,4,2,5,6
    const expectedLog = [
      'Visited node: 0',
      'Visited node: 1',
      'Visited node: 3',
      'Visited node: 4',
      'Visited node: 2',
      'Visited node: 5',
      'Visited node: 6',
    ]
      .map((line) => `${line}<br>`)
      .join('');

    const actualLog = await graphPage.getLogInnerHTML();
    expect(actualLog).toBe(expectedLog);

    // Also verify each node element individually has 'visited' class
    for (let i = 0; i < 7; i++) {
      const hasVisited = await graphPage.nodeLocator(i).evaluate((el) =>
        el.classList.contains('visited')
      );
      expect(hasVisited, `node-${i} should have class 'visited'`).toBe(true);
    }

    // No console errors or page errors should have occurred while performing DFS
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test repeated interactions (edge case): clicking Start DFS multiple times
  test('Clicking "Start DFS" multiple times resets the log but nodes remain visited', async ({ page }) => {
    const graphPage = new GraphPage(page);
    await graphPage.waitForNodes(7);

    // First click
    await graphPage.clickStart();
    const firstLog = await graphPage.getLogInnerHTML();
    expect(firstLog).not.toBe('');

    // Second click should reset logContent.innerHTML (the code sets logContent.innerHTML = '')
    // and then append same visited messages again. Final expected log equals expectedLog.
    await graphPage.clickStart();
    const expectedLog = [
      'Visited node: 0',
      'Visited node: 1',
      'Visited node: 3',
      'Visited node: 4',
      'Visited node: 2',
      'Visited node: 5',
      'Visited node: 6',
    ]
      .map((line) => `${line}<br>`)
      .join('');
    const secondLog = await graphPage.getLogInnerHTML();
    expect(secondLog).toBe(expectedLog);

    // Nodes should still be visited after the second click
    const visitedNodeIds = await graphPage.getVisitedNodeIds();
    visitedNodeIds.sort((a, b) => a - b);
    expect(visitedNodeIds).toEqual([0, 1, 2, 3, 4, 5, 6]);

    // Ensure no console errors or page errors occurred during repeated interactions
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that clicking an individual node does not modify traversal state (no click handlers are defined)
  test('Clicking an individual node does not trigger traversal or modify visited state by itself', async ({ page }) => {
    const graphPage = new GraphPage(page);
    await graphPage.waitForNodes(7);

    // Click node 3 directly (there is no click handler defined for nodes)
    await graphPage.clickNode(3);

    // After clicking a node, since there is no event handler, nothing should change:
    // - No nodes should have 'visited' class
    // - The log should remain empty
    for (let i = 0; i < 7; i++) {
      const hasVisited = await graphPage.nodeLocator(i).evaluate((el) =>
        el.classList.contains('visited')
      );
      expect(hasVisited, `node-${i} should NOT have class 'visited' after clicking an individual node`).toBe(false);
    }

    const logAfterClick = await graphPage.getLogInnerHTML();
    expect(logAfterClick).toBe('');

    // No console errors or page errors should be emitted as a result of clicking nodes
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  // Test that we observe and report any console/page errors during load and interactions.
  // This test is explicitly to assert there are no unexpected runtime errors.
  test('Observe console and page errors during load and interactions (should be none)', async ({ page }) => {
    const graphPage = new GraphPage(page);
    await graphPage.waitForNodes(7);

    // Interact with the page: start DFS
    await graphPage.clickStart();

    // Interact further: click Start DFS again
    await graphPage.clickStart();

    // After interactions, assert there are no console error messages captured
    expect(consoleErrors.length, `Console errors captured: ${JSON.stringify(consoleErrors)}`).toBe(0);

    // And assert there are no uncaught page errors
    expect(pageErrors.length, `Page errors captured: ${JSON.stringify(pageErrors)}`).toBe(0);
  });
});