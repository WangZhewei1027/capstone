import { test, expect } from '@playwright/test';

// Page Object Model for BFS Explorer
class BFSExplorerPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#graph-canvas');
    this.startBFSButton = page.locator('button:has-text("Start BFS")');
    this.stepButton = page.locator('button:has-text("Step")');
    this.autoRunButton = page.locator('button:has-text("Auto-Run")');
    this.resetButton = page.locator('button:has-text("Reset")');
    this.clearGraphButton = page.locator('button:has-text("Clear Graph")');
    this.speedSlider = page.locator('input[type="range"]');
    this.queueDisplay = page.locator('#queue-display');
    this.infoPanel = page.locator('#info-panel');
  }

  async goto() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/4dc85140-bf83-11f0-a230-7b3d5f0a2067.html');
    await this.page.waitForLoadState('networkidle');
  }

  async clickCanvas(x, y) {
    await this.canvas.click({ position: { x, y } });
  }

  async rightClickCanvas(x, y) {
    await this.canvas.click({ position: { x, y }, button: 'right' });
  }

  async getNode(label) {
    return this.page.locator(`.node:has-text("${label}")`);
  }

  async dragFromNodeToNode(fromLabel, toLabel) {
    const fromNode = await this.getNode(fromLabel);
    const toNode = await this.getNode(toLabel);
    await fromNode.dragTo(toNode);
  }

  async dragFromNodeToCanvas(fromLabel, x, y) {
    const fromNode1 = await this.getNode(fromLabel);
    const fromBox = await fromNode.boundingBox();
    await this.page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y);
    await this.page.mouse.up();
  }

  async getNodeCount() {
    return await this.page.locator('.node').count();
  }

  async getEdgeCount() {
    return await this.page.locator('.edge').count();
  }

  async isNodeHighlighted(label) {
    const node = await this.getNode(label);
    const classes = await node.getAttribute('class');
    return classes.includes('highlighted') || classes.includes('selected');
  }

  async getNodeState(label) {
    const node1 = await this.getNode(label);
    const classes1 = await node.getAttribute('class');
    if (classes.includes('visited')) return 'visited';
    if (classes.includes('processing')) return 'processing';
    if (classes.includes('queued')) return 'queued';
    return 'unvisited';
  }

  async isGraphEditingEnabled() {
    const canvasClasses = await this.canvas.getAttribute('class');
    return !canvasClasses.includes('disabled') && !canvasClasses.includes('bfs-mode');
  }

  async getQueueContents() {
    const queueItems = await this.page.locator('#queue-display .queue-item').allTextContents();
    return queueItems;
  }

  async waitForAnimation() {
    await this.page.waitForTimeout(300);
  }
}

test.describe('BFS Explorer - Graph Building Mode', () => {
  let bfsPage;

  test.beforeEach(async ({ page }) => {
    bfsPage = new BFSExplorerPage(page);
    await bfsPage.goto();
  });

  test('should start in idle state with empty canvas', async () => {
    // Verify initial state
    expect(await bfsPage.getNodeCount()).toBe(0);
    expect(await bfsPage.getEdgeCount()).toBe(0);
    expect(await bfsPage.isGraphEditingEnabled()).toBe(true);
  });

  test('should create nodes on canvas click (idle -> addingNode -> idle)', async () => {
    // Click on canvas to create first node
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    
    expect(await bfsPage.getNodeCount()).toBe(1);
    expect(await bfsPage.getNode('A')).toBeVisible();

    // Create second node
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();
    
    expect(await bfsPage.getNodeCount()).toBe(2);
    expect(await bfsPage.getNode('B')).toBeVisible();
  });

  test('should highlight node on click (idle -> nodeSelected)', async () => {
    // Create a node first
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();

    // Click on the node to select it
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.isNodeHighlighted('A')).toBe(true);
  });

  test('should unhighlight node on canvas click (nodeSelected -> idle)', async () => {
    // Create and select a node
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Click on empty canvas to deselect
    await bfsPage.clickCanvas(100, 100);
    await bfsPage.waitForAnimation();

    expect(await bfsPage.isNodeHighlighted('A')).toBe(false);
  });

  test('should create edge by dragging between nodes (nodeSelected -> draggingEdge -> creatingEdge -> idle)', async () => {
    // Create two nodes
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();

    // Drag from A to B to create edge
    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getEdgeCount()).toBe(1);
  });

  test('should cancel edge creation when dragging to canvas (draggingEdge -> idle)', async () => {
    // Create two nodes
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();

    // Start dragging from A but release on canvas
    await bfsPage.dragFromNodeToCanvas('A', 300, 300);
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getEdgeCount()).toBe(0);
  });

  test('should delete node on right-click (idle/nodeSelected -> deletingNode -> idle)', async () => {
    // Create a node
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();

    // Right-click to delete
    await (await bfsPage.getNode('A')).click({ button: 'right' });
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeCount()).toBe(0);
  });

  test('should delete node and its edges', async () => {
    // Create three nodes
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(300, 350);
    await bfsPage.waitForAnimation();

    // Create edges A-B and A-C
    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'C');
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getEdgeCount()).toBe(2);

    // Delete node A
    await (await bfsPage.getNode('A')).click({ button: 'right' });
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeCount()).toBe(2);
    expect(await bfsPage.getEdgeCount()).toBe(0);
  });
});

test.describe('BFS Explorer - BFS Execution Mode', () => {
  let bfsPage;

  test.beforeEach(async ({ page }) => {
    bfsPage = new BFSExplorerPage(page);
    await bfsPage.goto();

    // Create a simple graph: A-B-C with A-C edge
    await bfsPage.clickCanvas(200, 200); // A
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200); // B
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(300, 350); // C
    await bfsPage.waitForAnimation();

    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('B', 'C');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'C');
    await bfsPage.waitForAnimation();
  });

  test('should enter BFS ready state and disable graph editing (idle -> bfsReady)', async () => {
    expect(await bfsPage.isGraphEditingEnabled()).toBe(true);

    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.isGraphEditingEnabled()).toBe(false);
    expect(await bfsPage.stepButton).toBeDisabled();
    expect(await bfsPage.autoRunButton).toBeDisabled();
  });

  test('should initialize BFS on node click (bfsReady -> bfsInitialized)', async () => {
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();

    // Click node A as starting point
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeState('A')).toBe('queued');
    expect(await bfsPage.stepButton).toBeEnabled();
    expect(await bfsPage.autoRunButton).toBeEnabled();
    
    const queueContents = await bfsPage.getQueueContents();
    expect(queueContents).toContain('A');
  });

  test('should process nodes step by step (bfsInitialized -> bfsProcessing -> bfsWaiting)', async () => {
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Step 1: Process A
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeState('A')).toBe('visited');
    expect(await bfsPage.getNodeState('B')).toBe('queued');
    expect(await bfsPage.getNodeState('C')).toBe('queued');

    // Step 2: Process B
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeState('B')).toBe('visited');

    // Step 3: Process C
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeState('C')).toBe('visited');
  });

  test('should complete BFS and show completion (bfsProcessing -> bfsDone)', async () => {
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Process all nodes
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    // Check if step button is disabled after completion
    expect(await bfsPage.stepButton).toBeDisabled();
    expect(await bfsPage.autoRunButton).toBeDisabled();
    
    // All nodes should be visited
    expect(await bfsPage.getNodeState('A')).toBe('visited');
    expect(await bfsPage.getNodeState('B')).toBe('visited');
    expect(await bfsPage.getNodeState('C')).toBe('visited');
  });

  test('should auto-run BFS (bfsInitialized -> bfsAutoRunning -> bfsAutoProcessing)', async () => {
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Start auto-run
    await bfsPage.autoRunButton.click();
    
    // Wait for auto-run to complete
    await bfsPage.page.waitForTimeout(2000);

    // All nodes should be visited
    expect(await bfsPage.getNodeState('A')).toBe('visited');
    expect(await bfsPage.getNodeState('B')).toBe('visited');
    expect(await bfsPage.getNodeState('C')).toBe('visited');
  });

  test('should pause auto-run on button click (bfsAutoRunning -> bfsWaiting)', async () => {
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Start auto-run
    await bfsPage.autoRunButton.click();
    await bfsPage.page.waitForTimeout(500);

    // Pause auto-run
    await bfsPage.autoRunButton.click();
    await bfsPage.waitForAnimation();

    // Should be able to step manually now
    expect(await bfsPage.stepButton).toBeEnabled();
  });

  test('should reset BFS state (bfsWaiting/bfsDone -> bfsReady)', async () => {
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    // Reset BFS
    await bfsPage.resetButton.click();
    await bfsPage.waitForAnimation();

    // All nodes should be unvisited
    expect(await bfsPage.getNodeState('A')).toBe('unvisited');
    expect(await bfsPage.getNodeState('B')).toBe('unvisited');
    expect(await bfsPage.getNodeState('C')).toBe('unvisited');

    // Should be able to select a new starting node
    expect(await bfsPage.stepButton).toBeDisabled();
  });
});

test.describe('BFS Explorer - Clear Graph', () => {
  let bfsPage;

  test.beforeEach(async ({ page }) => {
    bfsPage = new BFSExplorerPage(page);
    await bfsPage.goto();
  });

  test('should clear entire graph (any state -> clearingGraph -> idle)', async () => {
    // Create a graph
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeCount()).toBe(2);
    expect(await bfsPage.getEdgeCount()).toBe(1);

    // Clear graph
    await bfsPage.clearGraphButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeCount()).toBe(0);
    expect(await bfsPage.getEdgeCount()).toBe(0);
    expect(await bfsPage.isGraphEditingEnabled()).toBe(true);
  });

  test('should clear graph during BFS execution', async () => {
    // Create a graph and start BFS
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();

    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    // Clear graph during BFS
    await bfsPage.clearGraphButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeCount()).toBe(0);
    expect(await bfsPage.getEdgeCount()).toBe(0);
    expect(await bfsPage.isGraphEditingEnabled()).toBe(true);
  });
});

test.describe('BFS Explorer - Edge Cases and Complex Scenarios', () => {
  let bfsPage;

  test.beforeEach(async ({ page }) => {
    bfsPage = new BFSExplorerPage(page);
    await bfsPage.goto();
  });

  test('should handle disconnected graph components', async () => {
    // Create two disconnected components
    // Component 1: A-B
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(300, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();

    // Component 2: C-D
    await bfsPage.clickCanvas(500, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(600, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('C', 'D');
    await bfsPage.waitForAnimation();

    // Start BFS from A
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Process all reachable nodes
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    // A and B should be visited, C and D should remain unvisited
    expect(await bfsPage.getNodeState('A')).toBe('visited');
    expect(await bfsPage.getNodeState('B')).toBe('visited');
    expect(await bfsPage.getNodeState('C')).toBe('unvisited');
    expect(await bfsPage.getNodeState('D')).toBe('unvisited');
  });

  test('should handle self-loops correctly', async () => {
    // Create a node with self-loop
    await bfsPage.clickCanvas(300, 300);
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'A');
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getEdgeCount()).toBe(1);

    // Run BFS
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    expect(await bfsPage.getNodeState('A')).toBe('visited');
  });

  test('should handle speed slider during auto-run', async () => {
    // Create a larger graph
    for (let i = 0; i < 5; i++) {
      await bfsPage.clickCanvas(200 + i * 100, 200);
      await bfsPage.waitForAnimation();
    }

    // Create edges in a line
    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('B', 'C');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('C', 'D');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('D', 'E');
    await bfsPage.waitForAnimation();

    // Start BFS auto-run
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Change speed during auto-run
    await bfsPage.speedSlider.fill('10');
    await bfsPage.autoRunButton.click();
    await bfsPage.page.waitForTimeout(500);
    
    await bfsPage.speedSlider.fill('90');
    await bfsPage.page.waitForTimeout(1000);

    // Should process some nodes
    const visitedCount = await bfsPage.page.locator('.node.visited').count();
    expect(visitedCount).toBeGreaterThan(0);
  });

  test('should maintain queue order correctly', async () => {
    // Create a graph where A connects to B, C, D
    await bfsPage.clickCanvas(300, 200); // A
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(200, 350); // B
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(300, 350); // C
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 350); // D
    await bfsPage.waitForAnimation();

    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'C');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'D');
    await bfsPage.waitForAnimation();

    // Start BFS from A
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Process A
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    // Queue should contain B, C, D in order
    const queueContents1 = await bfsPage.getQueueContents();
    expect(queueContents.length).toBe(3);
    expect(queueContents[0]).toBe('B');
    expect(queueContents[1]).toBe('C');
    expect(queueContents[2]).toBe('D');
  });

  test('should handle rapid clicking without breaking state machine', async () => {
    // Create nodes rapidly
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.clickCanvas(300, 200);
    await bfsPage.clickCanvas(400, 200);
    
    await bfsPage.waitForAnimation();
    expect(await bfsPage.getNodeCount()).toBe(3);

    // Rapid state transitions
    await bfsPage.startBFSButton.click();
    await bfsPage.resetButton.click();
    await bfsPage.startBFSButton.click();
    
    await bfsPage.waitForAnimation();
    expect(await bfsPage.isGraphEditingEnabled()).toBe(false);
  });
});

test.describe('BFS Explorer - Visual Feedback and Animations', () => {
  let bfsPage;

  test.beforeEach(async ({ page }) => {
    bfsPage = new BFSExplorerPage(page);
    await bfsPage.goto();
  });

  test('should show edge preview during drag', async () => {
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();

    const nodeA = await bfsPage.getNode('A');
    const box = await nodeA.boundingBox();
    
    // Start dragging
    await bfsPage.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await bfsPage.page.mouse.down();
    await bfsPage.page.mouse.move(300, 200);

    // Edge preview should be visible
    const edgePreview = await bfsPage.page.locator('.edge-preview').isVisible();
    expect(edgePreview).toBe(true);

    await bfsPage.page.mouse.up();
  });

  test('should highlight traversed edges during BFS', async () => {
    // Create a triangle graph
    await bfsPage.clickCanvas(300, 150);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(200, 300);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 300);
    await bfsPage.waitForAnimation();

    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('A', 'C');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('B', 'C');
    await bfsPage.waitForAnimation();

    // Start BFS
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();
    await bfsPage.stepButton.click();
    await bfsPage.waitForAnimation();

    // Check if edges from A are highlighted
    const highlightedEdges = await bfsPage.page.locator('.edge.traversed').count();
    expect(highlightedEdges).toBeGreaterThan(0);
  });

  test('should show distance labels on visited nodes', async () => {
    // Create a path graph
    await bfsPage.clickCanvas(200, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(300, 200);
    await bfsPage.waitForAnimation();
    await bfsPage.clickCanvas(400, 200);
    await bfsPage.waitForAnimation();

    await bfsPage.dragFromNodeToNode('A', 'B');
    await bfsPage.waitForAnimation();
    await bfsPage.dragFromNodeToNode('B', 'C');
    await bfsPage.waitForAnimation();

    // Run BFS
    await bfsPage.startBFSButton.click();
    await bfsPage.waitForAnimation();
    await (await bfsPage.getNode('A')).click();
    await bfsPage.waitForAnimation();

    // Process all nodes
    for (let i = 0; i < 3; i++) {
      await bfsPage.stepButton.click();
      await bfsPage.waitForAnimation();
    }

    // Check distance labels
    const nodeADistance = await bfsPage.page.locator('.node:has-text("A") .distance-label').textContent();
    const nodeBDistance = await bfsPage.page.locator('.node:has-text("B") .distance-label').textContent();
    const nodeCDistance = await bfsPage.page.locator('.node:has-text("C") .distance-label').textContent();

    expect(nodeADistance).toBe('0');
    expect(nodeBDistance).toBe('1');
    expect(nodeCDistance).toBe('2');
  });
});