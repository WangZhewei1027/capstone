import { test, expect } from '@playwright/test';

test.describe('BFS Interactive Learning Module', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/511dbdd0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Graph Building Mode', () => {
    test('should create nodes by clicking on empty canvas', async () => {
      const canvas = await page.locator('#graph-canvas');
      
      // Click to create first node
      await canvas.click({ position: { x: 200, y: 200 } });
      await expect(page.locator('.node')).toHaveCount(1);
      
      // Click to create second node
      await canvas.click({ position: { x: 400, y: 200 } });
      await expect(page.locator('.node')).toHaveCount(2);
      
      // Verify nodes have correct initial state (unvisited - light blue)
      const firstNode = page.locator('.node').first();
      await expect(firstNode).toHaveCSS('background-color', 'rgb(173, 216, 230)');
    });

    test('should select node on click and highlight it', async () => {
      const canvas1 = await page.locator('#graph-canvas1');
      
      // Create a node
      await canvas.click({ position: { x: 200, y: 200 } });
      const node = page.locator('.node').first();
      
      // Click the node to select it
      await node.click();
      
      // Verify node is highlighted
      await expect(node).toHaveClass(/selected/);
      await expect(node).toHaveCSS('box-shadow', /0 0 10px/);
    });

    test('should create edge by dragging between nodes', async () => {
      const canvas2 = await page.locator('#graph-canvas2');
      
      // Create two nodes
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const firstNode1 = page.locator('.node').first();
      const secondNode = page.locator('.node').nth(1);
      
      // Drag from first node to second node
      await firstNode.hover();
      await page.mouse.down();
      
      // Verify edge preview is shown during drag
      await expect(page.locator('.edge-preview')).toBeVisible();
      
      await secondNode.hover();
      await page.mouse.up();
      
      // Verify edge is created
      await expect(page.locator('.edge')).toHaveCount(1);
    });

    test('should delete node on right-click', async () => {
      const canvas3 = await page.locator('#graph-canvas3');
      
      // Create a node
      await canvas.click({ position: { x: 200, y: 200 } });
      await expect(page.locator('.node')).toHaveCount(1);
      
      // Right-click to delete
      const node1 = page.locator('.node1').first();
      await node.click({ button: 'right' });
      
      // Verify node is deleted
      await expect(page.locator('.node')).toHaveCount(0);
    });

    test('should delete edge on right-click', async () => {
      const canvas4 = await page.locator('#graph-canvas4');
      
      // Create two nodes and connect them
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const firstNode2 = page.locator('.node').first();
      const secondNode1 = page.locator('.node').nth(1);
      
      await firstNode.hover();
      await page.mouse.down();
      await secondNode.hover();
      await page.mouse.up();
      
      // Right-click on edge to delete
      const edge = page.locator('.edge').first();
      await edge.click({ button: 'right' });
      
      // Verify edge is deleted
      await expect(page.locator('.edge')).toHaveCount(0);
    });

    test('should set start node on double-click', async () => {
      const canvas5 = await page.locator('#graph-canvas5');
      
      // Create a node
      await canvas.click({ position: { x: 200, y: 200 } });
      const node2 = page.locator('.node2').first();
      
      // Double-click to set as start node
      await node.dblclick();
      
      // Verify node has start node styling (green border)
      await expect(node).toHaveClass(/start-node/);
      await expect(node).toHaveCSS('border-color', 'rgb(0, 128, 0)');
    });

    test('should cancel edge creation when dropping on canvas', async () => {
      const canvas6 = await page.locator('#graph-canvas6');
      
      // Create a node
      await canvas.click({ position: { x: 200, y: 200 } });
      const node3 = page.locator('.node3').first();
      
      // Start dragging from node
      await node.hover();
      await page.mouse.down();
      
      // Drag to empty canvas area
      await page.mouse.move(300, 300);
      await expect(page.locator('.edge-preview')).toBeVisible();
      
      // Drop on canvas
      await page.mouse.up();
      
      // Verify no edge is created and preview is hidden
      await expect(page.locator('.edge')).toHaveCount(0);
      await expect(page.locator('.edge-preview')).not.toBeVisible();
    });
  });

  test.describe('BFS Algorithm Execution', () => {
    test('should not start BFS without a start node', async () => {
      const canvas7 = await page.locator('#graph-canvas7');
      
      // Create nodes without setting start
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      // Try to step forward
      const stepButton = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      
      // Verify error message or no state change
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.node.visiting')).toHaveCount(0);
    });

    test('should initialize BFS when start node exists', async () => {
      const canvas8 = await page.locator('#graph-canvas8');
      
      // Create and set start node
      await canvas.click({ position: { x: 200, y: 200 } });
      const node4 = page.locator('.node4').first();
      await node.dblclick();
      
      // Click step forward
      const stepButton1 = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      
      // Verify BFS initialization
      await expect(page.locator('.queue-display')).toBeVisible();
      await expect(page.locator('.queue-item')).toHaveCount(1);
      await expect(node).toHaveClass(/in-queue/);
    });

    test('should process nodes in breadth-first order', async () => {
      const canvas9 = await page.locator('#graph-canvas9');
      
      // Create a simple graph: A-B-C (linear)
      await canvas.click({ position: { x: 200, y: 200 } }); // Node A
      await canvas.click({ position: { x: 400, y: 200 } }); // Node B
      await canvas.click({ position: { x: 600, y: 200 } }); // Node C
      
      const nodeA = page.locator('.node').nth(0);
      const nodeB = page.locator('.node').nth(1);
      const nodeC = page.locator('.node').nth(2);
      
      // Connect A-B
      await nodeA.hover();
      await page.mouse.down();
      await nodeB.hover();
      await page.mouse.up();
      
      // Connect B-C
      await nodeB.hover();
      await page.mouse.down();
      await nodeC.hover();
      await page.mouse.up();
      
      // Set A as start node
      await nodeA.dblclick();
      
      const stepButton2 = page.locator('button:has-text("Step Forward")');
      
      // Step 1: Initialize
      await stepButton.click();
      await expect(nodeA).toHaveClass(/in-queue/);
      
      // Step 2: Process A
      await stepButton.click();
      await expect(nodeA).toHaveClass(/visiting/);
      await expect(page.locator('.current-depth')).toContainText('0');
      
      // Step 3: A's neighbors explored, B added to queue
      await stepButton.click();
      await expect(nodeA).toHaveClass(/visited/);
      await expect(nodeB).toHaveClass(/in-queue/);
      
      // Step 4: Process B
      await stepButton.click();
      await expect(nodeB).toHaveClass(/visiting/);
      
      // Continue until completion
      await stepButton.click();
      await stepButton.click();
      await stepButton.click();
      
      // Verify all nodes are visited
      await expect(page.locator('.node.visited')).toHaveCount(3);
    });

    test('should handle auto-run mode', async () => {
      const canvas10 = await page.locator('#graph-canvas10');
      
      // Create simple graph
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const nodeA1 = page.locator('.node').first();
      const nodeB1 = page.locator('.node').nth(1);
      
      // Connect nodes
      await nodeA.hover();
      await page.mouse.down();
      await nodeB.hover();
      await page.mouse.up();
      
      // Set start node
      await nodeA.dblclick();
      
      // Enable auto-run
      const autoRunToggle = page.locator('input[type="checkbox"]#auto-run');
      await autoRunToggle.click();
      
      // Wait for completion
      await expect(page.locator('.node.visited')).toHaveCount(2, { timeout: 5000 });
      
      // Verify auto-run stopped
      await expect(autoRunToggle).not.toBeChecked();
    });

    test('should adjust speed with slider', async () => {
      const speedSlider = page.locator('input[type="range"]#speed-slider');
      
      // Verify initial speed
      await expect(speedSlider).toHaveAttribute('value', '1000');
      
      // Change speed
      await speedSlider.fill('500');
      await expect(speedSlider).toHaveAttribute('value', '500');
      
      // Change to maximum speed
      await speedSlider.fill('2000');
      await expect(speedSlider).toHaveAttribute('value', '2000');
    });

    test('should show shortest path when clicking visited node', async () => {
      const canvas11 = await page.locator('#graph-canvas11');
      
      // Create a graph with multiple paths
      await canvas.click({ position: { x: 200, y: 200 } }); // A
      await canvas.click({ position: { x: 400, y: 100 } }); // B
      await canvas.click({ position: { x: 400, y: 300 } }); // C
      await canvas.click({ position: { x: 600, y: 200 } }); // D
      
      const nodes = await page.locator('.node').all();
      
      // Create edges: A-B, A-C, B-D, C-D
      await nodes[0].hover();
      await page.mouse.down();
      await nodes[1].hover();
      await page.mouse.up();
      
      await nodes[0].hover();
      await page.mouse.down();
      await nodes[2].hover();
      await page.mouse.up();
      
      await nodes[1].hover();
      await page.mouse.down();
      await nodes[3].hover();
      await page.mouse.up();
      
      await nodes[2].hover();
      await page.mouse.down();
      await nodes[3].hover();
      await page.mouse.up();
      
      // Set start and run BFS
      await nodes[0].dblclick();
      
      // Run to completion
      const autoRunToggle1 = page.locator('input[type="checkbox"]#auto-run');
      await autoRunToggle.click();
      await expect(page.locator('.node.visited')).toHaveCount(4, { timeout: 5000 });
      
      // Click on node D to show shortest path
      await nodes[3].click();
      
      // Verify path highlighting
      await expect(page.locator('.path-highlight')).toBeVisible();
      await expect(page.locator('.shortest-path-info')).toContainText('Shortest path');
    });
  });

  test.describe('Control Buttons', () => {
    test('should reset traversal state', async () => {
      const canvas12 = await page.locator('#graph-canvas12');
      
      // Create and traverse a graph
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const nodeA2 = page.locator('.node').first();
      await nodeA.dblclick();
      
      // Step through BFS
      const stepButton3 = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      await stepButton.click();
      
      // Verify some nodes are visited
      await expect(page.locator('.node.visited')).toHaveCount(1);
      
      // Click reset
      const resetButton = page.locator('button:has-text("Reset")');
      await resetButton.click();
      
      // Verify all nodes are back to unvisited state
      await expect(page.locator('.node.visited')).toHaveCount(0);
      await expect(page.locator('.node.in-queue')).toHaveCount(0);
      await expect(page.locator('.queue-item')).toHaveCount(0);
      
      // Verify graph structure is preserved
      await expect(page.locator('.node')).toHaveCount(2);
    });

    test('should clear entire graph', async () => {
      const canvas13 = await page.locator('#graph-canvas13');
      
      // Create nodes and edges
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const nodeA3 = page.locator('.node').first();
      const nodeB2 = page.locator('.node').nth(1);
      
      await nodeA.hover();
      await page.mouse.down();
      await nodeB.hover();
      await page.mouse.up();
      
      // Verify graph exists
      await expect(page.locator('.node')).toHaveCount(2);
      await expect(page.locator('.edge')).toHaveCount(1);
      
      // Click clear graph
      const clearButton = page.locator('button:has-text("Clear Graph")');
      await clearButton.click();
      
      // Verify everything is cleared
      await expect(page.locator('.node')).toHaveCount(0);
      await expect(page.locator('.edge')).toHaveCount(0);
      await expect(page.locator('.queue-item')).toHaveCount(0);
    });
  });

  test.describe('Visual Feedback and Animations', () => {
    test('should show queue animations', async () => {
      const canvas14 = await page.locator('#graph-canvas14');
      
      // Create nodes
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const nodeA4 = page.locator('.node').first();
      const nodeB3 = page.locator('.node').nth(1);
      
      // Connect nodes
      await nodeA.hover();
      await page.mouse.down();
      await nodeB.hover();
      await page.mouse.up();
      
      // Set start node
      await nodeA.dblclick();
      
      // Step forward and observe queue
      const stepButton4 = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      
      // Verify queue item appears with animation
      const queueItem = page.locator('.queue-item').first();
      await expect(queueItem).toHaveClass(/fade-in/);
      
      // Step again to see dequeue animation
      await stepButton.click();
      await expect(queueItem).toHaveClass(/slide-out/);
    });

    test('should show edge traversal animation', async () => {
      const canvas15 = await page.locator('#graph-canvas15');
      
      // Create connected nodes
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const nodeA5 = page.locator('.node').first();
      const nodeB4 = page.locator('.node').nth(1);
      
      await nodeA.hover();
      await page.mouse.down();
      await nodeB.hover();
      await page.mouse.up();
      
      await nodeA.dblclick();
      
      // Step through to edge traversal
      const stepButton5 = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      await stepButton.click();
      
      // Verify edge animation
      const edge1 = page.locator('.edge1').first();
      await expect(edge).toHaveClass(/traversing/);
      await expect(page.locator('.edge-particle')).toBeVisible();
    });

    test('should show completion animation', async () => {
      const canvas16 = await page.locator('#graph-canvas16');
      
      // Create single node
      await canvas.click({ position: { x: 200, y: 200 } });
      const node5 = page.locator('.node5').first();
      await node.dblclick();
      
      // Run to completion
      const stepButton6 = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      await stepButton.click();
      
      // Verify completion state
      await expect(page.locator('.completion-message')).toBeVisible();
      await expect(page.locator('.completion-message')).toContainText('BFS Complete');
      await expect(page.locator('.statistics')).toContainText('Nodes visited: 1');
    });
  });

  test.describe('Information Panel', () => {
    test('should display traversal statistics', async () => {
      const canvas17 = await page.locator('#graph-canvas17');
      
      // Create a small graph
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      await canvas.click({ position: { x: 300, y: 350 } });
      
      const nodes1 = await page.locator('.node').all();
      
      // Connect all nodes
      await nodes[0].hover();
      await page.mouse.down();
      await nodes[1].hover();
      await page.mouse.up();
      
      await nodes[0].hover();
      await page.mouse.down();
      await nodes[2].hover();
      await page.mouse.up();
      
      // Set start and run
      await nodes[0].dblclick();
      
      const autoRunToggle2 = page.locator('input[type="checkbox"]#auto-run');
      await autoRunToggle.click();
      
      // Wait for completion
      await expect(page.locator('.node.visited')).toHaveCount(3, { timeout: 5000 });
      
      // Verify statistics
      const stats = page.locator('.statistics');
      await expect(stats).toContainText('Nodes visited: 3');
      await expect(stats).toContainText('Edges traversed: 2');
      await expect(stats).toContainText('Queue size: 0');
    });

    test('should show traversal order', async () => {
      const canvas18 = await page.locator('#graph-canvas18');
      
      // Create nodes
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 400, y: 200 } });
      
      const nodeA6 = page.locator('.node').first();
      const nodeB5 = page.locator('.node').nth(1);
      
      // Connect and set start
      await nodeA.hover();
      await page.mouse.down();
      await nodeB.hover();
      await page.mouse.up();
      
      await nodeA.dblclick();
      
      // Run BFS
      const stepButton7 = page.locator('button:has-text("Step Forward")');
      await stepButton.click();
      await stepButton.click();
      
      // Verify traversal order display
      const traversalOrder = page.locator('.traversal-order');
      await expect(traversalOrder).toContainText('Traversal Order: A');
      
      await stepButton.click();
      await stepButton.click();
      
      await expect(traversalOrder).toContainText('Traversal Order: A → B');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle disconnected graph components', async () => {
      const canvas19 = await page.locator('#graph-canvas19');
      
      // Create two disconnected components
      await canvas.click({ position: { x: 200, y: 200 } }); // Component 1
      await canvas.click({ position: { x: 250, y: 250 } });
      
      await canvas.click({ position: { x: 500, y: 200 } }); // Component 2
      await canvas.click({ position: { x: 550, y: 250 } });
      
      const nodes2 = await page.locator('.node').all();
      
      // Connect within components
      await nodes[0].hover();
      await page.mouse.down();
      await nodes[1].hover();
      await page.mouse.up();
      
      await nodes[2].hover();
      await page.mouse.down();
      await nodes[3].hover();
      await page.mouse.up();
      
      // Set start in first component
      await nodes[0].dblclick();
      
      // Run BFS
      const autoRunToggle3 = page.locator('input[type="checkbox"]#auto-run');
      await autoRunToggle.click();
      
      // Wait for completion
      await page.waitForTimeout(3000);
      
      // Verify only first component is visited
      await expect(page.locator('.node.visited')).toHaveCount(2);
      await expect(nodes[2]).not.toHaveClass(/visited/);
      await expect(nodes[3]).not.toHaveClass(/visited/);
    });

    test('should handle self-loops gracefully', async () => {
      const canvas20 = await page.locator('#graph-canvas20');
      
      // Create a node
      await canvas.click({ position: { x: 300, y: 300 } });
      const node6 = page.locator('.node6').first();
      
      // Try to create self-loop
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(350, 300);
      await page.mouse.move(350, 350);
      await page.mouse.move(300, 350);
      await node.hover();
      await page.mouse.up();
      
      // Verify no self-loop is created or handled appropriately
      const edges = await page.locator('.edge').count();
      expect(edges).toBe(0);
    });

    test('should handle maximum node limit', async () => {
      const canvas21 = await page.locator('#graph-canvas21');
      
      // Try to create many nodes
      for (let i = 0; i < 30; i++) {
        const x = 100 + (i % 10) * 60;
        const y = 100 + Math.floor(i / 10) * 60;
        await canvas.click({ position: { x, y } });
      }
      
      // Verify node limit is enforced (assuming max 25 nodes)
      const nodeCount = await page.locator('.node').count();
      expect(nodeCount).toBeLessThanOrEqual(25);
    });
  });
});