const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:5500/workspace/10-28-0006/html/7c9b3590-b408-11f0-ab52-fbe7249bf639.html';

class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.container = page.locator('#graph-container');
    this.addNodeBtn = page.locator('#add-node');
    this.addEdgeBtn = page.locator('#add-edge');
    this.graphTypeSelect = page.locator('#graph-type');
    this.nodes = page.locator('#graph-container .node');
    this.edges = page.locator('#graph-container .edge');
  }

  async goto() {
    await this.page.goto(BASE_URL, { waitUntil: 'load' });
    await expect(this.container).toBeVisible();
  }

  async setGraphType(type) {
    await this.graphTypeSelect.selectOption(type);
    await expect(this.graphTypeSelect).toHaveValue(type);
  }

  async addNode() {
    const before = await this.nodes.count();
    await this.addNodeBtn.click();
    await expect(this.nodes).toHaveCount(before + 1);
  }

  async addEdge() {
    const before = await this.edges.count();
    await this.addEdgeBtn.click();
    // Edge may or may not be added depending on state; caller will assert accordingly.
    // Wait a short time to allow potential DOM updates (like edge append) to complete.
    await this.page.waitForTimeout(50);
    return before;
  }

  async clickNodeByIndex(index) {
    const count = await this.nodes.count();
    if (index >= count) throw new Error(`Node index ${index} out of range (count=${count})`);
    await this.nodes.nth(index).click();
  }

  async clickContainer() {
    const box = await this.container.boundingBox();
    const x = Math.floor(box.x + 10);
    const y = Math.floor(box.y + 10);
    await this.page.mouse.click(x, y);
  }

  async nodeCount() {
    return await this.nodes.count();
  }

  async edgeCount() {
    return await this.edges.count();
  }

  async lastEdgeLocator() {
    const count = await this.edges.count();
    if (count === 0) throw new Error('No edges present');
    return this.edges.nth(count - 1);
  }

  async getLastEdgeComputedDisplay() {
    const el = await this.lastEdgeLocator();
    return await el.evaluate((node) => window.getComputedStyle(node).display);
  }

  async getEdgeComputedDisplayByIndex(index) {
    return await this.edges.nth(index).evaluate((node) => window.getComputedStyle(node).display);
  }

  // Install a deterministic Math.random sequence so that subsequent calls consume provided values.
  async setRandomSequence(sequence) {
    await this.page.evaluate((seq) => {
      window.__testRandomQueue = seq.slice();
      if (!window.__origRandom) {
        window.__origRandom = Math.random;
      }
      Math.random = function () {
        if (window.__testRandomQueue && window.__testRandomQueue.length) {
          return window.__testRandomQueue.shift();
        }
        // default random fallback if queue empty
        return 0.123456789;
      };
    }, sequence);
  }

  async resetRandom() {
    await this.page.evaluate(() => {
      if (window.__origRandom) {
        Math.random = window.__origRandom;
        delete window.__origRandom;
      }
      if (window.__testRandomQueue) {
        delete window.__testRandomQueue;
      }
    });
  }

  // Utility: perform an action and assert the next dialog message equals expected (then accept).
  async expectNextDialogMessage(action, expectedMessage) {
    const dialogPromise = new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const msg = dialog.message();
        await dialog.accept();
        resolve(msg);
      });
    });
    await action();
    const msg = await dialogPromise;
    expect(msg).toBe(expectedMessage);
  }

  // Utility: ensure no dialog appears during action within a short timeout
  async expectNoDialogDuring(action, timeoutMs = 400) {
    let dialogSeen = false;
    const handler = () => {
      dialogSeen = true;
    };
    this.page.once('dialog', handler);
    await action();
    await this.page.waitForTimeout(timeoutMs);
    this.page.removeListener('dialog', handler);
    expect(dialogSeen).toBe(false);
  }
}

test.describe('Graph Exploration FSM - Interactive Application', () => {
  test.describe.configure({ mode: 'serial' }); // Ensure isolation within our setup; each test uses fresh page via Playwright

  test.beforeEach(async ({ page }) => {
    const app = new GraphPage(page);
    await app.goto();
    // Ensure starting conditions: Undirected is default per HTML; verify.
    await expect(app.graphTypeSelect).toHaveValue('undirected');
  });

  test.afterEach(async ({ page }) => {
    const app = new GraphPage(page);
    await app.resetRandom();
  });

  test('Initial idle state: controls visible, no nodes or edges', async ({ page }) => {
    // Validate READY onEnter by ensuring UI is interactive and empty graph
    const app = new GraphPage(page);
    await expect(app.addNodeBtn).toBeVisible();
    await expect(app.addEdgeBtn).toBeVisible();
    await expect(app.graphTypeSelect).toBeVisible();
    await expect(app.nodes).toHaveCount(0);
    await expect(app.edges).toHaveCount(0);
  });

  test('CLICK_ADD_EDGE in idle with zero nodes -> edge_add_blocked_alert -> alert -> idle (no edges added)', async ({ page }) => {
    const app = new GraphPage(page);
    // Install dialog expectation before clicking "Add Edge"
    await app.expectNextDialogMessage(async () => {
      await app.addEdgeBtn.click();
    }, 'Add at least two nodes first!');
    await expect(app.edges).toHaveCount(0);
  });

  test('CLICK_ADD_NODE -> adding_node (CREATE_NODE_ELEMENT) -> NODE_CREATED -> idle; Clicking node shows alert', async ({ page }) => {
    const app = new GraphPage(page);
    // Add first node, verify DOM
    await app.addNode();
    await expect(app.nodes).toHaveCount(1);
    await expect(app.nodes.nth(0)).toHaveText('0');

    // Clicking the node triggers showing_node_alert (SHOW_ALERT_NODE_CLICKED) then ALERT_DISMISSED -> idle
    await app.expectNextDialogMessage(async () => {
      await app.clickNodeByIndex(0);
    }, 'Node 0 clicked!');
    // Still 1 node, no edges
    await expect(app.nodes).toHaveCount(1);
    await expect(app.edges).toHaveCount(0);
  });

  test('CLICK_ADD_EDGE in idle with one node -> edge_add_blocked_alert -> alert -> idle (no edges added)', async ({ page }) => {
    const app = new GraphPage(page);
    // Ensure exactly one node exists
    await app.addNode();
    await expect(app.nodes).toHaveCount(1);

    await app.expectNextDialogMessage(async () => {
      await app.addEdgeBtn.click();
    }, 'Add at least two nodes first!');
    await expect(app.edges).toHaveCount(0);
  });

  test('Undirected: EDGE_CREATED_HIDDEN -> APPEND_EDGE_HIDDEN (edge appended with display:none) then EDGE_APPENDED -> idle', async ({ page }) => {
    const app = new GraphPage(page);
    // Ensure two nodes exist
    await app.addNode(); // node 0
    await app.addNode(); // node 1
    await expect(app.nodes).toHaveCount(2);

    // Ensure graph type is undirected and a non-self edge is selected deterministically
    await app.setGraphType('undirected');
    // For length 2, Math.floor(r*2): r=0.1 -> 0, r=0.6 -> 1
    await app.setRandomSequence([0.1, 0.6]);

    const beforeCount = await app.edgeCount();
    await app.addEdgeBtn.click();
    // After APPEND_EDGE_HIDDEN, one edge appended
    await expect(app.edges).toHaveCount(beforeCount + 1);
    const display = await app.getLastEdgeComputedDisplay();
    expect(display).toBe('none'); // hidden edge

    // Verify we returned to idle and can interact further (e.g., add another node)
    await app.addNode();
    await expect(app.nodes).toHaveCount(3);
  });

  test('Directed: EDGE_CREATED_VISIBLE -> APPEND_EDGE_VISIBLE (edge appended with display:block) then EDGE_APPENDED -> idle', async ({ page }) => {
    const app = new GraphPage(page);
    // Prepare two nodes
    await app.addNode(); // 0
    await app.addNode(); // 1

    await app.setGraphType('directed');
    await expect(app.graphTypeSelect).toHaveValue('directed');

    // Non-self selection again: 0 -> 1
    await app.setRandomSequence([0.2, 0.8]);
    const prev = await app.edgeCount();
    await app.addEdgeBtn.click();
    await expect(app.edges).toHaveCount(prev + 1);
    const display = await app.getLastEdgeComputedDisplay();
    expect(display).toBe('block'); // visible edge in directed mode
  });

  test('SELF_LOOP_SELECTED -> edge_add_aborted (ABORT_EDGE_CREATION) -> DONE -> idle (no new edge, no alert)', async ({ page }) => {
    const app = new GraphPage(page);
    // Ensure at least one node exists to allow self-loop selection logic to run
    await app.addNode(); // 0
    await app.addNode(); // 1

    // Force start == end via identical random values for Math.floor(random * 2)
    await app.setRandomSequence([0.1, 0.1]); // both map to index 0
    const before = await app.edgeCount();

    // Ensure no alert is shown during self-loop abort
    await app.expectNoDialogDuring(async () => {
      await app.addEdgeBtn.click();
    });

    await expect(app.edges).toHaveCount(before); // no edge added

    // We are back to idle; sanity check by adding an edge normally after abort
    await app.setRandomSequence([0.2, 0.8]); // 0 -> 1
    await app.setGraphType('directed');
    await app.addEdgeBtn.click();
    await expect(app.edges).toHaveCount(before + 1);
  });

  test('CHANGE_GRAPH_TYPE has no immediate DOM side effects; affects subsequent edge visibility only', async ({ page }) => {
    const app = new GraphPage(page);
    // Prepare two nodes and one hidden edge in undirected mode
    await app.addNode();
    await app.addNode();
    await app.setGraphType('undirected');
    await app.setRandomSequence([0.1, 0.6]); // 0 -> 1
    await app.addEdgeBtn.click();
    const countAfterFirstEdge = await app.edgeCount();
    const firstEdgeDisplay = await app.getEdgeComputedDisplayByIndex(countAfterFirstEdge - 1);
    expect(firstEdgeDisplay).toBe('none');

    // Change graph type to directed; expect no changes to existing edges
    await app.setGraphType('directed');
    // Existing edge should remain hidden
    const stillHidden = await app.getEdgeComputedDisplayByIndex(countAfterFirstEdge - 1);
    expect(stillHidden).toBe('none');

    // Subsequent edge should be visible due to directed selection
    await app.setRandomSequence([0.2, 0.8]); // 0 -> 1
    await app.addEdgeBtn.click();
    await expect(app.edges).toHaveCount(countAfterFirstEdge + 1);
    const newEdgeDisplay = await app.getLastEdgeComputedDisplay();
    expect(newEdgeDisplay).toBe('block');
  });

  test('Clicking on the graph container does nothing (no alerts, no state change)', async ({ page }) => {
    const app = new GraphPage(page);
    // Add a node to ensure click handler with stopPropagation does not affect container click
    await app.addNode();
    const beforeNodes = await app.nodeCount();
    const beforeEdges = await app.edgeCount();

    await app.expectNoDialogDuring(async () => {
      await app.clickContainer();
    });

    await expect(app.nodes).toHaveCount(beforeNodes);
    await expect(app.edges).toHaveCount(beforeEdges);
  });

  test('After edges exist, adding more edges still appends correctly (no misindexing), using deterministic selection', async ({ page }) => {
    const app = new GraphPage(page);
    // Create two nodes
    await app.addNode(); // 0
    await app.addNode(); // 1

    // Create an initial edge to populate container children with an edge element after nodes
    await app.setGraphType('directed');
    await app.setRandomSequence([0.2, 0.8]); // 0 -> 1
    await app.addEdgeBtn.click();
    await expect(app.edges).toHaveCount(1);

    // Now add another edge; due to container.children indexing caveat, ensure indices are still nodes (0 and 1)
    await app.setRandomSequence([0.2, 0.8]); // 0 -> 1
    const before = await app.edgeCount();
    await app.addEdgeBtn.click();
    await expect(app.edges).toHaveCount(before + 1);
    const lastDisplay = await app.getLastEdgeComputedDisplay();
    expect(lastDisplay).toBe('block'); // directed => visible

    // Add a third edge in undirected mode to ensure hidden edges append correctly even after edges exist
    await app.setGraphType('undirected');
    await app.setRandomSequence([0.1, 0.6]); // 0 -> 1
    const beforeThird = await app.edgeCount();
    await app.addEdgeBtn.click();
    await expect(app.edges).toHaveCount(beforeThird + 1);
    const lastHiddenDisplay = await app.getLastEdgeComputedDisplay();
    expect(lastHiddenDisplay).toBe('none');
  });

  test('Node click handler uses event.stopPropagation: clicking node only shows node alert once, not container alerts', async ({ page }) => {
    const app = new GraphPage(page);
    await app.addNode(); // 0

    // Expect node alert
    await app.expectNextDialogMessage(async () => {
      await app.clickNodeByIndex(0);
    }, 'Node 0 clicked!');

    // Clicking node should not trigger any additional dialogs via bubbling (container has no handlers)
    await app.expectNoDialogDuring(async () => {
      // No action beyond clicking container afterwards; ensure still no dialog
      await app.clickContainer();
    });
  });
});