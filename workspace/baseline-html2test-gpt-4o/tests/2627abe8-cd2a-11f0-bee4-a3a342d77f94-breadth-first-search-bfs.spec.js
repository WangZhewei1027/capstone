import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/html2test/html/2627abe8-cd2a-11f0-bee4-a3a342d77f94.html';

// Page object for the BFS visualization page
class BFSPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.node = (index) => page.locator(`#node${index}`);
    this.startButton = page.locator('button', { hasText: 'Start BFS' });
    this.graphContainer = page.locator('#graph-container');
  }

  // Click the Start BFS button
  async startBFS() {
    await this.startButton.click();
  }

  // Assert that a node has the 'highlight' class (with optional timeout)
  async waitForNodeHighlight(index, timeout = 2000) {
    await expect(this.node(index)).toHaveClass(/highlight/, { timeout });
  }

  // Assert that a node does NOT have the 'highlight' class
  async expectNodeNotHighlighted(index) {
    const classAttr = await this.node(index).getAttribute('class');
    expect(classAttr).not.toMatch(/highlight/);
  }

  // Return the visible text content of a node
  async nodeText(index) {
    return (await this.node(index).textContent())?.trim();
  }
}

test.describe('Breadth-First Search Visualization - BFS', () => {
  let pageErrors = [];
  let consoleErrors = [];
  let page;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh context & page for each test to isolate listeners
    const context = await browser.newContext();
    page = await context.newPage();

    // Capture page errors (uncaught exceptions)
    pageErrors = [];
    page.on('pageerror', (err) => {
      // Collect any page error objects
      pageErrors.push(err);
    });

    // Capture console messages, filter error-level console messages
    consoleErrors = [];
    page.on('console', (msg) => {
      try {
        if (msg.type() === 'error') {
          consoleErrors.push({
            text: msg.text(),
            location: msg.location ? msg.location() : null,
          });
        }
      } catch (e) {
        // If introspecting the message throws, still capture the raw text
        consoleErrors.push({ text: String(msg), location: null });
      }
    });

    // Navigate to the test page
    await page.goto(APP_URL);
  });

  test.afterEach(async () => {
    // No modifications to the runtime are made; ensure there were no unexpected errors
    // The specific tests will assert pageErrors/consoleErrors presence or absence as needed
  });

  test('Initial load: DOM structure, node labels, and default state are correct', async () => {
    // Purpose: verify that on initial load the graph nodes and controls are present
    const bfs = new BFSPage(page);

    // Verify graph container and levels are visible
    await expect(bfs.graphContainer).toBeVisible();

    // There should be six nodes (A-F) with expected ids and contents
    const expectedLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 0; i < expectedLabels.length; i++) {
      const node = bfs.node(i);
      await expect(node).toBeVisible();
      const text = await bfs.nodeText(i);
      expect(text).toBe(expectedLabels[i]);
      // By default, none should have the highlight class
      await bfs.expectNodeNotHighlighted(i);
    }

    // The Start BFS button should be visible and enabled
    await expect(bfs.startButton).toBeVisible();
    await expect(bfs.startButton).toBeEnabled();

    // Assert that there were no page errors or console errors on initial load
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Start BFS highlights nodes in BFS order (A, B, C, D, E, F)', async () => {
    // Purpose: simulate user clicking the Start BFS button and verify the highlight order and timing
    const bfs = new BFSPage(page);

    // Start BFS
    await bfs.startBFS();

    // The implementation uses timeouts: highlights occur with cumulative delays.
    // We'll wait for each node to obtain the 'highlight' class in the expected sequence.
    // Use cautious timeouts to account for scheduling:
    // A by ~500ms, B by ~1000ms, C by ~1500ms, D by ~2000ms, E by ~2500ms, F by ~3000ms.

    // Wait for A
    await bfs.waitForNodeHighlight(0, 1500); // node A
    // After A is highlighted, B should be next
    await bfs.waitForNodeHighlight(1, 1500); // node B
    // Then C
    await bfs.waitForNodeHighlight(2, 1500); // node C
    // Then D
    await bfs.waitForNodeHighlight(3, 1500); // node D
    // Then E
    await bfs.waitForNodeHighlight(4, 1500); // node E
    // Finally F
    await bfs.waitForNodeHighlight(5, 1500); // node F

    // Verify all nodes have the highlight class at the end
    for (let i = 0; i < 6; i++) {
      const classAttr = await bfs.node(i).getAttribute('class');
      expect(classAttr).toMatch(/highlight/);
    }

    // Ensure no page-level uncaught exceptions or console errors occurred during the run
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Clicking Start BFS multiple times does not throw runtime errors and results in highlighted nodes', async () => {
    // Purpose: test edge-case interaction - user clicking Start BFS multiple times rapidly
    const bfs = new BFSPage(page);

    // Click the button twice in quick succession
    await bfs.startBFS();
    await bfs.startBFS();

    // Wait for highlights to settle. Because timeouts are added twice, highlights will be attempted
    // multiple times but classList.add is idempotent for existing classes.
    // Wait a bit longer to allow queued timeouts from both clicks to run.
    for (let i = 0; i < 6; i++) {
      // Use a generous timeout because multiple animations/timeouts may be queued
      await bfs.waitForNodeHighlight(i, 3000);
    }

    // After both clicks, all nodes should still be highlighted
    for (let i = 0; i < 6; i++) {
      const classAttr = await bfs.node(i).getAttribute('class');
      expect(classAttr).toMatch(/highlight/);
    }

    // Assert there were no uncaught page errors or console errors from multiple activations
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });

  test('Accessibility and visibility checks for nodes and controls', async () => {
    // Purpose: verify that nodes are visible and readable (basic accessibility checks)
    const bfs = new BFSPage(page);

    // Nodes are circular elements with visible text; ensure they are displayed and have non-empty accessible names
    for (let i = 0; i < 6; i++) {
      const node = bfs.node(i);
      await expect(node).toBeVisible();
      const text = await node.textContent();
      expect(typeof text).toBe('string');
      expect(text?.trim().length).toBeGreaterThan(0);
    }

    // The Start BFS button should be keyboard-focusable
    await bfs.startButton.focus();
    await expect(bfs.startButton).toBeFocused();

    // No page errors or console errors from performing focus/visibility checks
    expect(pageErrors.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});