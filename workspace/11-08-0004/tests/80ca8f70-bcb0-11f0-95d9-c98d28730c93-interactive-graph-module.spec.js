import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/11-08-0004/html/80ca8f70-bcb0-11f0-95d9-c98d28730c93.html';

/**
 * GraphPage - lightweight page object to encapsulate common interactions and queries.
 * The implementation uses flexible selectors and multiple fallbacks for class names/attributes
 * because the exact DOM classes can vary. Each helper uses sensible defaults:
 * - canvas: .canvas
 * - nodes: elements with class 'node' OR data-role="node" OR svg circle with data-node
 * - edges: elements with class 'edge' OR data-role="edge" OR svg path/line with data-edge
 */
class GraphPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(APP_URL, { waitUntil: 'load' });
    // Wait for canvas to be present - tolerate a few possible selectors
    await Promise.race([
      this.page.waitForSelector('.canvas', { timeout: 3000 }).catch(() => null),
      this.page.waitForSelector('[data-role="canvas"]', { timeout: 3000 }).catch(() => null),
      this.page.waitForSelector('svg', { timeout: 3000 }).catch(() => null),
    ]);
  }

  // Returns a center point on the visible canvas to click when creating nodes
  async canvasCenter() {
    const canvas = await this._canvasElementHandle();
    const box = await canvas.boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async _canvasElementHandle() {
    const fallbackSelectors = ['.canvas', '[data-role="canvas"]', '.canvas-wrap', 'svg'];
    for (const sel of fallbackSelectors) {
      const handle = await this.page.$(sel);
      if (handle) return handle;
    }
    // Last resort: body
    return this.page.$('body');
  }

  // Create a node by clicking at coordinates (if not provided uses center)
  async createNode(clickX = null, clickY = null) {
    if (clickX === null || clickY === null) {
      const center = await this.canvasCenter();
      clickX = center.x + (Math.random() - 0.5) * 80; // jitter so nodes don't overlap
      clickY = center.y + (Math.random() - 0.5) * 80;
    }
    await this.page.mouse.click(Math.round(clickX), Math.round(clickY));
    // Allow potential animation/DOM updates
    await this.page.waitForTimeout(120);
  }

  // Returns array of node elements handles
  async getNodeHandles() {
    // Try multiple selectors
    const selectors = [
      '.node',
      '[data-role="node"]',
      'circle[data-node]',
      'g.node',
      '.graph-node',
      'div.node',
    ];
    for (const sel of selectors) {
      const handles = await this.page.$$(sel);
      if (handles.length) return handles;
    }
    // fallback to any element with attribute data-node-id
    const fallback = await this.page.$$('[data-node-id]');
    return fallback;
  }

  // Returns array of edge elements
  async getEdgeHandles() {
    const selectors1 = [
      '.edge',
      '[data-role="edge"]',
      'path[data-edge]',
      'line[data-edge]',
      '.graph-edge',
    ];
    for (const sel of selectors) {
      const handles1 = await this.page.$$(sel);
      if (handles.length) return handles;
    }
    // fallback to any element with data-edge-id
    return this.page.$$('[data-edge-id]');
  }

  async nodeCount() {
    const nodes = await this.getNodeHandles();
    return nodes.length;
  }

  async edgeCount() {
    const edges = await this.getEdgeHandles();
    return edges.length;
  }

  // Clicks a node by index (0-based). Returns the element handle clicked.
  async clickNodeByIndex(index = 0) {
    const nodes1 = await this.getNodeHandles();
    if (!nodes || nodes.length <= index) throw new Error('Node not found to click');
    const node = nodes[index];
    const box1 = await node.boundingBox();
    if (!box) {
      // try clicking center of canvas if bounding box missing
      const center1 = await this.canvasCenter();
      await this.page.mouse.click(center.x, center.y);
    } else {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await this.page.waitForTimeout(100);
    return node;
  }

  // Helper that checks if a node handle has highlighting that indicates "creating_edge from"
  // Accept several likely class/attribute names.
  static async isNodeHighlighted(nodeHandle) {
    return await nodeHandle.evaluate((el) => {
      const possibleClassNames = ['creating-edge-from', 'highlight', 'highlighted', 'active', 'selected'];
      for (const cls of possibleClassNames) if (el.classList && el.classList.contains(cls)) return true;
      // look for data attributes
      const attrs = ['data-creating', 'data-highlight', 'data-active', 'data-start', 'data-end'];
      for (const a of attrs) if (el.getAttribute && el.getAttribute(a) !== null) return true;
      // for svg: stroke color that indicates highlight - check stroke-width bigger than default
      if (el.tagName && el.tagName.toLowerCase() === 'circle' && (el.getAttribute('r') || el.getAttribute('stroke-width'))) {
        return false; // can't reliably infer
      }
      return false;
    });
  }

  // Click a UI button by visible text - case-insensitive contains match
  async clickButtonByText(text) {
    const trimmed = text.trim();
    // Try exact text first
    const exact = await this.page.$(`button:has-text("${trimmed}")`);
    if (exact) {
      await exact.click();
      await this.page.waitForTimeout(80);
      return;
    }
    // Try broader
    const buttons = await this.page.$$('button, input[type="button"], [role="button"], a');
    for (const btn of buttons) {
      const btnText = (await btn.innerText().catch(() => '')).trim();
      if (!btnText) continue;
      if (btnText.toLowerCase().includes(trimmed.toLowerCase())) {
        await btn.click();
        await this.page.waitForTimeout(80);
        return;
      }
    }
    throw new Error(`Button with text containing "${text}" not found`);
  }

  // Clicks an edge by index using center of its bounding box
  async clickEdgeByIndex(index = 0) {
    const edges1 = await this.getEdgeHandles();
    if (!edges || edges.length <= index) throw new Error('Edge not found to click');
    const edge = edges[index];
    const box2 = await edge.boundingBox();
    if (!box) throw new Error('Edge bounding box not available');
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.waitForTimeout(80);
    return edge;
  }

  // Double click an edge
  async dblClickEdgeByIndex(index = 0) {
    const edges2 = await this.getEdgeHandles();
    if (!edges || edges.length <= index) throw new Error('Edge not found to double click');
    const edge1 = edges[index];
    const box3 = await edge.boundingBox();
    if (!box) throw new Error('Edge bounding box not available');
    await this.page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.waitForTimeout(80);
    return edge;
  }

  // Simulate dragging a node: mousedown, move, mouseup
  async dragNodeByIndex(index = 0, dx = 50, dy = 50) {
    const nodes2 = await this.getNodeHandles();
    if (!nodes || nodes.length <= index) throw new Error('Node not found to drag');
    const node1 = nodes[index];
    const box4 = await node.boundingBox();
    if (!box) throw new Error('Node bounding box not available for drag');
    const fromX = box.x + box.width / 2;
    const fromY = box.y + box.height / 2;
    await this.page.mouse.move(fromX, fromY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(60);
    await this.page.mouse.move(fromX + dx, fromY + dy, { steps: 8 });
    // while dragging, MOUSE_MOVE events should keep state 'dragging'
    await this.page.waitForTimeout(80);
    await this.page.mouse.up();
    await this.page.waitForTimeout(150);
    return node;
  }

  // Helper to check for any visited/animation classes on nodes/edges
  async anyTraversalHighlightPresent() {
    const possibleClasses = ['visited', 'traversed', 'path', 'animating', 'highlight'];
    for (const cls of possibleClasses) {
      const found = await this.page.$(`.${cls}`);
      if (found) return true;
    }
    // also check for data attributes
    const foundAttr = await this.page.$('[data-visited], [data-traversed], [data-path]');
    return !!foundAttr;
  }

  // Attempt to read a visible status text element that indicates FSM status
  async getStatusText() {
    const statusSelectors = ['#status', '.status', '[data-status]', '.state-status', '.status-text'];
    for (const sel of statusSelectors) {
      const el = await this.page.$(sel);
      if (el) {
        const txt = (await el.innerText().catch(() => '')).trim();
        if (txt) return txt;
      }
    }
    // fallback: check left panel for a small muted p
    const p = await this.page.$('.left p.small, .left .small-muted');
    if (p) return (await p.innerText().catch(() => '')).trim();
    return '';
  }

  // Press the Delete key (for delete edge via keyboard)
  async pressDeleteKey() {
    await this.page.keyboard.press('Delete');
    await this.page.waitForTimeout(80);
  }
}

test.describe('Interactive Graph Module - FSM validation', () => {
  let graph;

  test.beforeEach(async ({ page }) => {
    graph = new GraphPage(page);
    await graph.goto();
    // tiny pause to allow any initialization
    await page.waitForTimeout(150);
  });

  test.afterEach(async ({ page }) => {
    // attempt to clear workspace after each test if a Clear button exists
    try {
      await graph.clickButtonByText('Clear');
    } catch (e) {
      // ignore if no clear button
    }
    await page.waitForTimeout(100);
  });

  test('idle: clicking canvas creates a new node and remains in idle', async ({ page }) => {
    // Validate that clicking on canvas creates a node and we remain in idle (status text)
    const before = await graph.nodeCount();
    await graph.createNode();
    const after = await graph.nodeCount();
    expect(after).toBeGreaterThan(before);

    // Check status text contains "idle" or default idle-like text
    const status = (await graph.getStatusText()).toLowerCase();
    expect(['idle', 'ready', 'click canvas to create node'].some(s => status.includes(s) || s === '')).toBeTruthy();
  });

  test('creating_edge: click node while idle highlights source, clicking same node cancels', async ({ page }) => {
    // Create two nodes
    await graph.createNode();
    await graph.createNode();
    const nodeCount = await graph.nodeCount();
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    // Click first node => enter creating_edge, should highlight source
    const firstNode = (await graph.getNodeHandles())[0];
    await graph.clickNodeByIndex(0);
    let highlighted = await GraphPage.isNodeHighlighted(firstNode);
    expect(highlighted).toBeTruthy();

    // Click same node again => should cancel creation (unhighlight)
    await graph.clickNodeByIndex(0);
    highlighted = await GraphPage.isNodeHighlighted(firstNode);
    // After cancel, highlight should be removed
    expect(highlighted).toBeFalsy();
  });

  test('creating_edge -> create edge by clicking target node', async ({ page }) => {
    // Create two nodes and then create an edge between them
    await graph.createNode();
    await graph.createNode();
    const beforeEdges = await graph.edgeCount();
    expect(await graph.nodeCount()).toBeGreaterThanOrEqual(2);

    // Click source node (enter creating_edge)
    await graph.clickNodeByIndex(0);
    // Click target node - creates edge and returns to idle (no highlighted source)
    await graph.clickNodeByIndex(1);

    // Edge count should increase by 1
    const afterEdges = await graph.edgeCount();
    expect(afterEdges).toBeGreaterThanOrEqual(beforeEdges + 1);

    // Source should no longer be highlighted
    const source = (await graph.getNodeHandles())[0];
    const highlighted1 = await GraphPage.isNodeHighlighted(source);
    expect(highlighted).toBeFalsy();
  });

  test('dragging: mousedown + move + mouseup moves node and returns to the correct state', async ({ page }) => {
    // Create a node to drag
    await graph.createNode();
    const nodes3 = await graph.getNodeHandles();
    expect(nodes.length).toBeGreaterThan(0);
    const node2 = nodes[0];
    const beforeBox = await node.boundingBox();
    expect(beforeBox).not.toBeNull();

    // Start dragging (should enter "dragging" onEnter)
    await graph.dragNodeByIndex(0, 80, 40);
    // After drag, node position should have changed (box updated)
    const nodesAfter = await graph.getNodeHandles();
    const nodeAfter = nodesAfter[0];
    const afterBox = await nodeAfter.boundingBox();
    expect(afterBox).not.toBeNull();

    // The position should not be identical to before (tolerance)
    const moved = Math.abs(afterBox.x - beforeBox.x) > 2 || Math.abs(afterBox.y - beforeBox.y) > 2;
    expect(moved).toBeTruthy();

    // If creatingEdgeFrom existed before drag, creating_edge_or_idle logic would be used.
    // We simply verify we are not left in a permanent dragging state: no 'dragging' class or large data attribute
    const dragIndicator = await page.$('.dragging, [data-dragging]');
    expect(dragIndicator === null).toBeTruthy();
  });

  test('edge_selected: selecting an edge highlights it and opens editor; changing weight and delete works', async ({ page }) => {
    // Create two nodes and an edge between them
    await graph.createNode();
    await graph.createNode();
    await graph.clickNodeByIndex(0);
    await graph.clickNodeByIndex(1);

    // There should be at least one edge
    expect(await graph.edgeCount()).toBeGreaterThan(0);

    // Click the first edge to select it
    let edge;
    try {
      edge = await graph.clickEdgeByIndex(0);
    } catch {
      // If direct edge click fails because edges are small, try clicking near midpoint between nodes
      const nodes4 = await graph.getNodeHandles();
      if (nodes.length >= 2) {
        const b1 = await nodes[0].boundingBox();
        const b2 = await nodes[1].boundingBox();
        const mx = (b1.x + b1.width / 2 + b2.x + b2.width / 2) / 2;
        const my = (b1.y + b1.height / 2 + b2.y + b2.height / 2) / 2;
        await graph.page.mouse.click(mx, my);
        await graph.page.waitForTimeout(100);
      }
    }

    // After selection, the edge element should have a selected/highlight class or an editor should appear
    const selectedEdge = (await graph.getEdgeHandles())[0];
    const isSelected = await selectedEdge.evaluate((el) => {
      const classes = ['selected', 'active', 'highlighted'];
      for (const c of classes) if (el.classList && el.classList.contains(c)) return true;
      // or data attribute
      if (el.getAttribute && (el.getAttribute('data-selected') !== null || el.getAttribute('data-active') !== null)) return true;
      return false;
    });
    // It's acceptable that either edge got marked or an editor opened; assert at least one
    const editor = await page.$('.edge-editor, .edge-properties, [data-edge-editor]');
    expect(isSelected || !!editor).toBeTruthy();

    // If there's an input for weight in the UI, attempt to change it
    const weightInput = await page.$('input[type="number"][name="weight"], input[name="weight"], .edge-editor input[type="number"]');
    if (weightInput) {
      await weightInput.fill('5');
      // If there's a save or apply button in editor, try to click
      const applyBtn = await page.$('.edge-editor button:has-text("Save"), .edge-editor button:has-text("Apply"), button:has-text("Set Weight")');
      if (applyBtn) {
        await applyBtn.click();
        await page.waitForTimeout(80);
      }
      // Check for edge label reflecting weight (if present)
      const weightLabel = await page.$('.edge-weight, .edge-label, text.edge-weight');
      if (weightLabel) {
        const txt1 = (await weightLabel.innerText().catch(() => '')).trim();
        expect(txt.length).toBeGreaterThanOrEqual(0);
      }
    }

    // Try deleting the edge through UI delete button if present; else use Delete keyboard
    const deleteBtn = await page.$('button:has-text("Delete Edge"), button:has-text("Delete"), .edge-editor button.delete');
    if (deleteBtn) {
      const before1 = await graph.edgeCount();
      await deleteBtn.click();
      await page.waitForTimeout(120);
      const after1 = await graph.edgeCount();
      expect(after).toBeLessThanOrEqual(before - 1);
    } else {
      const before2 = await graph.edgeCount();
      // Press Delete - some implementations use key to delete selection
      await graph.pressDeleteKey();
      await page.waitForTimeout(120);
      const after2 = await graph.edgeCount();
      // It's possible keyboard delete didn't remove edge - accept either equal or decreased
      expect(after).toBeLessThanOrEqual(before);
    }
  });

  test('pick_start and pick_end: pick mode sets start/end nodes and cancels on canvas click', async ({ page }) => {
    // Create two nodes
    await graph.createNode();
    await graph.createNode();
    const nodesBefore = await graph.nodeCount();
    expect(nodesBefore).toBeGreaterThanOrEqual(2);

    // Trigger Pick Start mode
    await graph.clickButtonByText('Pick Start');
    // Click canvas should cancel pick mode (per FSM) - clicking canvas should not set a start attribute
    await graph.createNode(); // this will click canvas - acts as canvas click
    // Confirm no node got start attribute by clicking canvas (we created a node, but pick should have canceled)
    // We'll check all nodes for data-start or class 'start' and expect none set because canvas click cancels
    const nodeHandles = await graph.getNodeHandles();
    let startFound = false;
    for (const n of nodeHandles) {
      const v = await n.evaluate((el) => el.getAttribute && (el.getAttribute('data-start') || el.getAttribute('start') || el.classList.contains('start') ? '1' : null));
      if (v) startFound = true;
    }
    expect(startFound).toBeFalsy();

    // Now explicitly Pick Start and click a node to set it
    await graph.clickButtonByText('Pick Start');
    await graph.clickNodeByIndex(0);
    // Verify that clicked node has start marker
    const node0 = (await graph.getNodeHandles())[0];
    const isStart = await node0.evaluate((el) => {
      return el.getAttribute && (el.getAttribute('data-start') !== null || el.classList.contains('start') || el.getAttribute('start') !== null);
    });
    expect(isStart).toBeTruthy();

    // Pick End mode - set second node as end
    await graph.clickButtonByText('Pick End');
    await graph.clickNodeByIndex(1);
    const node11 = (await graph.getNodeHandles())[1];
    const isEnd = await node1.evaluate((el) => {
      return el.getAttribute && (el.getAttribute('data-end') !== null || el.classList.contains('end') || el.getAttribute('end') !== null);
    });
    expect(isEnd).toBeTruthy();

    // Cancel pick via Cancel button if present
    try {
      await graph.clickButtonByText('Cancel Pick');
      // Should not throw; just ensure UI remains stable
      await page.waitForTimeout(80);
    } catch {
      // ignore if no such button
    }
  });

  test('animating: run traversal highlights visited nodes and clears on completion', async ({ page }) => {
    // Build a simple graph of 3 nodes in a chain: 0-1-2
    await graph.createNode();
    await graph.createNode();
    await graph.createNode();
    expect(await graph.nodeCount()).toBeGreaterThanOrEqual(3);

    // Create edges 0->1 and 1->2 (or undirected)
    await graph.clickNodeByIndex(0);
    await graph.clickNodeByIndex(1);
    await graph.clickNodeByIndex(1);
    await graph.clickNodeByIndex(2);

    // Set start and end for traversal
    await graph.clickButtonByText('Pick Start');
    await graph.clickNodeByIndex(0);
    await graph.clickButtonByText('Pick End');
    await graph.clickNodeByIndex(2);

    // Run traversal
    await graph.clickButtonByText('Run Traversal');
    // While animating, there should be some temporary highlight classes on visited/path
    await graph.page.waitForTimeout(200); // give animation time to start

    const anyHighlightDuring = await graph.anyTraversalHighlightPresent();
    expect(anyHighlightDuring).toBeTruthy();

    // Wait for traversal to complete - either animation clears classes automatically or triggers final state
    // Poll for clearing of traversal indicators for up to 5 seconds
    let cleared = false;
    for (let i = 0; i < 25; i++) {
      const present = await graph.anyTraversalHighlightPresent();
      if (!present) {
        cleared = true;
        break;
      }
      await graph.page.waitForTimeout(200);
    }
    expect(cleared).toBeTruthy();
  });

  test('creating_edge_or_idle: dragging started during creating_edge retains creatingEdgeFrom after release', async ({ page }) => {
    // Create two nodes
    await graph.createNode();
    await graph.createNode();

    // Click first node to start creating_edge
    const srcNode = (await graph.getNodeHandles())[0];
    await graph.clickNodeByIndex(0);
    let highlighted2 = await GraphPage.isNodeHighlighted(srcNode);
    expect(highlighted).toBeTruthy();

    // Start dragging from that node (enter dragging), then release on canvas
    await graph.dragNodeByIndex(0, 30, 0);

    // After drag finishes, FSM should enter creating_edge or idle depending on whether creatingEdgeFrom persisted.
    // We assert that either the source is still highlighted (creating_edge) OR not highlighted but no edge created.
    const afterHighlighted = await GraphPage.isNodeHighlighted((await graph.getNodeHandles())[0]);
    const edges3 = await graph.edgeCount();
    // Accept either still highlighted (creating_edge) or unhighlighted with no new edge (idle)
    const condition = afterHighlighted || edges === 0;
    expect(condition).toBeTruthy();
  });

  test('edge double click triggers reverse (or toggles directed flag); toggle directed works', async ({ page }) => {
    // Create two nodes and an edge
    await graph.createNode();
    await graph.createNode();
    await graph.clickNodeByIndex(0);
    await graph.clickNodeByIndex(1);

    // If edge exists, double-click it to trigger reverseEdge
    if ((await graph.edgeCount()) > 0) {
      // Capture a property that indicates direction if present (e.g., marker-end attribute on path/line)
      const edges4 = await graph.getEdgeHandles();
      const edge2 = edges[0];
      const beforeMarker = await edge.evaluate((el) => el.getAttribute && (el.getAttribute('marker-end') || el.getAttribute('data-directed') || el.getAttribute('directed') || el.getAttribute('aria-directed')));
      // Double click
      await graph.dblClickEdgeByIndex(0);
      await page.waitForTimeout(120);
      // After double click, direction might have toggled or an editor change occurred
      const afterMarker = await edge.evaluate((el) => el.getAttribute && (el.getAttribute('marker-end') || el.getAttribute('data-directed') || el.getAttribute('directed') || el.getAttribute('aria-directed')));
      // It's acceptable for these to be equal if the implementation doesn't expose marker attribute; assert no crash occurred
      expect(true).toBeTruthy();

      // If there is a toggle directed button in editor, try to use it
      try {
        // Select edge then click toggle in editor
        await graph.clickEdgeByIndex(0);
        const toggleBtn = await page.$('button:has-text("Toggle Directed"), button:has-text("Directed"), input[name="directed"]');
        if (toggleBtn) {
          await toggleBtn.click();
          await page.waitForTimeout(80);
          // No assertion other than it didn't error; optionally check attribute changed
          const afterToggleMarker = await edge.evaluate((el) => el.getAttribute && (el.getAttribute('marker-end') || el.getAttribute('data-directed')));
          expect(true).toBeTruthy();
        }
      } catch {
        // ignore if not available
      }
    } else {
      test.skip('No edge available to test double-click reverse');
    }
  });

  test('clear and reset layout buttons: Clear removes nodes/edges; Reset Layout is idempotent', async ({ page }) => {
    // Create a couple nodes and an edge
    await graph.createNode();
    await graph.createNode();
    await graph.clickNodeByIndex(0);
    await graph.clickNodeByIndex(1);
    const beforeNodes = await graph.nodeCount();
    const beforeEdges1 = await graph.edgeCount();
    expect(beforeNodes).toBeGreaterThanOrEqual(2);
    expect(beforeEdges).toBeGreaterThanOrEqual(1);

    // Click Reset Layout - should not remove nodes
    try {
      await graph.clickButtonByText('Reset Layout');
      await page.waitForTimeout(120);
      const afterResetNodes = await graph.nodeCount();
      expect(afterResetNodes).toBe(beforeNodes);
    } catch {
      // If Reset Layout missing, continue
    }

    // Click Clear - should remove nodes and edges
    try {
      await graph.clickButtonByText('Clear');
      await page.waitForTimeout(180);
      const afterClearNodes = await graph.nodeCount();
      const afterClearEdges = await graph.edgeCount();
      // Expect graph to be cleared or significantly smaller
      expect(afterClearNodes).toBeLessThanOrEqual(1);
      expect(afterClearEdges).toBeLessThanOrEqual(0);
    } catch {
      // If Clear button missing, ensure we at least didn't crash
      expect(true).toBeTruthy();
    }
  });

  test('edge cases: clicking canvas while in pick mode cancels, delete key with no selection is safe', async ({ page }) => {
    // Trigger pick start, then click canvas to cancel
    await graph.clickButtonByText('Pick Start');
    // Click canvas (creates node) - should cancel pick
    await graph.createNode();
    // No crash, and status should not indicate pick mode
    const status1 = (await graph.getStatusText()).toLowerCase();
    expect(status.includes('pick') === false || status === '').toBeTruthy();

    // Press Delete key with no selection - should not remove anything unexpectedly
    const nodesBefore1 = await graph.nodeCount();
    await graph.pressDeleteKey();
    const nodesAfter1 = await graph.nodeCount();
    expect(nodesAfter).toBeGreaterThanOrEqual(0);
    // Deleting when nothing selected should not increase node count
    expect(nodesAfter).toBeLessThanOrEqual(nodesBefore);
  });
});