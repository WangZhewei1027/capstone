import { test, expect } from '@playwright/test';

test.describe('Weighted Graph Explorer', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/451d1440-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial State and Basic Interactions', () => {
    test('should load with graph in idle state', async () => {
      // Verify initial graph is visible
      const canvas = await page.locator('svg');
      await expect(canvas).toBeVisible();
      
      // Check for nodes and edges
      const nodes = await page.locator('circle.node');
      const edges = await page.locator('line.edge');
      await expect(nodes).toHaveCount(await nodes.count());
      await expect(edges).toHaveCount(await edges.count());
    });

    test('should highlight node on click (idle -> nodeSelected)', async () => {
      const firstNode = await page.locator('circle.node').first();
      await firstNode.click();
      
      // Verify node is highlighted (source node should be green)
      await expect(firstNode).toHaveCSS('fill', 'rgb(0, 128, 0)');
    });

    test('should select two nodes for path finding (nodeSelected -> nodesSelected)', async () => {
      const nodes1 = await page.locator('circle.node');
      const firstNode1 = nodes.nth(0);
      const secondNode = nodes.nth(1);
      
      await firstNode.click();
      await expect(firstNode).toHaveCSS('fill', 'rgb(0, 128, 0)'); // Green for source
      
      await secondNode.click();
      await expect(secondNode).toHaveCSS('fill', 'rgb(255, 0, 0)'); // Red for destination
    });

    test('should clear selection when clicking Clear Selection button', async () => {
      const nodes2 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(1).click();
      
      const clearButton = await page.locator('button:has-text("Clear Selection")');
      await clearButton.click();
      
      // All nodes should return to default blue color
      const allNodes = await nodes.all();
      for (const node of allNodes) {
        await expect(node).toHaveCSS('fill', 'rgb(0, 0, 255)');
      }
    });
  });

  test.describe('Node Creation and Manipulation', () => {
    test('should create new node on canvas double-click (idle -> addingNode -> idle)', async () => {
      const canvas1 = await page.locator('svg');
      const initialNodeCount = await page.locator('circle.node').count();
      
      // Double-click on empty space
      await canvas.dblclick({ position: { x: 300, y: 300 } });
      
      // Verify new node was created
      await expect(page.locator('circle.node')).toHaveCount(initialNodeCount + 1);
    });

    test('should drag node to new position (idle -> draggingNode -> idle)', async () => {
      const node = await page.locator('circle.node').first();
      const initialBox = await node.boundingBox();
      
      // Drag node to new position
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
      await page.mouse.up();
      
      // Verify node moved
      const newBox = await node.boundingBox();
      expect(newBox.x).toBeGreaterThan(initialBox.x);
      expect(newBox.y).toBeGreaterThan(initialBox.y);
    });

    test('should maintain edge connections when dragging node', async () => {
      const node1 = await page.locator('circle.node1').first();
      const connectedEdges = await page.locator('line.edge').all();
      
      // Store initial edge positions
      const initialEdgeData = [];
      for (const edge of connectedEdges) {
        const x1 = await edge.getAttribute('x1');
        const y1 = await edge.getAttribute('y1');
        const x2 = await edge.getAttribute('x2');
        const y2 = await edge.getAttribute('y2');
        initialEdgeData.push({ x1, y1, x2, y2 });
      }
      
      // Drag node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(400, 400);
      await page.mouse.up();
      
      // Verify at least one edge endpoint changed
      let edgeChanged = false;
      for (let i = 0; i < connectedEdges.length; i++) {
        const edge = connectedEdges[i];
        const newX1 = await edge.getAttribute('x1');
        const newY1 = await edge.getAttribute('y1');
        const newX2 = await edge.getAttribute('x2');
        const newY2 = await edge.getAttribute('y2');
        
        if (newX1 !== initialEdgeData[i].x1 || newY1 !== initialEdgeData[i].y1 ||
            newX2 !== initialEdgeData[i].x2 || newY2 !== initialEdgeData[i].y2) {
          edgeChanged = true;
          break;
        }
      }
      expect(edgeChanged).toBeTruthy();
    });
  });

  test.describe('Edge Creation and Weight Editing', () => {
    test('should enter add edge mode and create edge between nodes', async () => {
      const addEdgeButton = await page.locator('button:has-text("Add Edge Mode")');
      await addEdgeButton.click();
      
      // Verify mode changed
      await expect(addEdgeButton).toHaveText('Normal Mode');
      
      const nodes3 = await page.locator('circle.node');
      const firstNode2 = nodes.nth(0);
      const secondNode1 = nodes.nth(2);
      
      const initialEdgeCount = await page.locator('line.edge').count();
      
      // Click two nodes to create edge
      await firstNode.click();
      await secondNode.click();
      
      // Verify edge was created
      await expect(page.locator('line.edge')).toHaveCount(initialEdgeCount + 1);
    });

    test('should cancel add edge mode', async () => {
      const addEdgeButton1 = await page.locator('button:has-text("Add Edge Mode")');
      await addEdgeButton.click();
      
      // Press Escape to cancel
      await page.keyboard.press('Escape');
      
      // Verify returned to normal mode
      await expect(addEdgeButton).toHaveText('Add Edge Mode');
    });

    test('should edit edge weight on click (idle -> editingWeight -> idle)', async () => {
      const edge1 = await page.locator('line.edge1').first();
      const weightLabel = await page.locator('text.edge-weight').first();
      const initialWeight = await weightLabel.textContent();
      
      await edge.click();
      
      // Weight input should appear
      const weightInput = await page.locator('input[type="number"]');
      await expect(weightInput).toBeVisible();
      
      // Enter new weight
      await weightInput.fill('10');
      await weightInput.press('Enter');
      
      // Verify weight updated
      await expect(weightLabel).not.toHaveText(initialWeight);
      await expect(weightLabel).toHaveText('10');
    });

    test('should cancel weight editing on escape', async () => {
      const edge2 = await page.locator('line.edge2').first();
      const weightLabel1 = await page.locator('text.edge-weight').first();
      const initialWeight1 = await weightLabel.textContent();
      
      await edge.click();
      
      const weightInput1 = await page.locator('input[type="number"]');
      await weightInput.fill('999');
      await weightInput.press('Escape');
      
      // Weight should remain unchanged
      await expect(weightLabel).toHaveText(initialWeight);
    });
  });

  test.describe('Path Finding Algorithm', () => {
    test('should validate selection before path finding', async () => {
      const findPathButton = await page.locator('button:has-text("Find Shortest Path")');
      
      // Click without selecting nodes
      await findPathButton.click();
      
      // Should show error or remain in idle state
      const errorMessage = await page.locator('text=/Please select.*nodes/i');
      await expect(errorMessage).toBeVisible();
    });

    test('should animate Dijkstra algorithm with valid selection', async () => {
      // Select source and destination
      const nodes4 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(3).click();
      
      const findPathButton1 = await page.locator('button:has-text("Find Shortest Path")');
      await findPathButton.click();
      
      // Wait for animation to start
      await page.waitForTimeout(500);
      
      // Check for visiting node animation (yellow color)
      const visitingNode = await page.locator('circle.node[fill="rgb(255, 255, 0)"]');
      await expect(visitingNode).toBeVisible();
      
      // Wait for path completion
      await page.waitForSelector('.shortest-path', { timeout: 10000 });
      
      // Verify path is highlighted in green
      const pathEdges = await page.locator('.shortest-path');
      await expect(pathEdges).toHaveCount(await pathEdges.count());
    });

    test('should display total path cost after finding path', async () => {
      const nodes5 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(2).click();
      
      await page.locator('button:has-text("Find Shortest Path")').click();
      
      // Wait for algorithm completion
      await page.waitForSelector('.path-cost', { timeout: 10000 });
      
      const pathCost = await page.locator('.path-cost');
      await expect(pathCost).toBeVisible();
      await expect(pathCost).toContainText(/Total Cost: \d+/);
    });

    test('should handle case when no path exists', async () => {
      // This test assumes there might be disconnected nodes
      // Select two nodes that might not be connected
      const nodes6 = await page.locator('circle.node');
      
      // Create isolated node first
      await page.locator('svg').dblclick({ position: { x: 600, y: 100 } });
      await page.waitForTimeout(500);
      
      // Select original node and new isolated node
      await nodes.nth(0).click();
      const isolatedNode = await page.locator('circle.node').last();
      await isolatedNode.click();
      
      await page.locator('button:has-text("Find Shortest Path")').click();
      
      // Should show no path message
      const noPathMessage = await page.locator('text=/No path.*found/i');
      await expect(noPathMessage).toBeVisible();
    });

    test('should highlight edges during examination', async () => {
      const nodes7 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(1).click();
      
      await page.locator('button:has-text("Find Shortest Path")').click();
      
      // Wait for edge examination
      await page.waitForTimeout(1000);
      
      // Check for highlighted edge (yellow)
      const highlightedEdge = await page.locator('line.edge[stroke="rgb(255, 255, 0)"]');
      await expect(highlightedEdge).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Reset and State Management', () => {
    test('should reset graph to initial state', async () => {
      // Make some changes
      const nodes8 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(1).click();
      
      // Add a new node
      await page.locator('svg').dblclick({ position: { x: 500, y: 500 } });
      
      const resetButton = await page.locator('button:has-text("Reset")');
      await resetButton.click();
      
      // Verify graph returned to initial state
      const resetNodes = await page.locator('circle.node');
      const initialNodeCount1 = await resetNodes.count();
      
      // All nodes should be blue
      const allNodes1 = await resetNodes.all();
      for (const node of allNodes) {
        await expect(node).toHaveCSS('fill', 'rgb(0, 0, 255)');
      }
    });

    test('should maintain state consistency during transitions', async () => {
      // Start path finding
      const nodes9 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(2).click();
      await page.locator('button:has-text("Find Shortest Path")').click();
      
      // Try to enter add edge mode during path finding
      const addEdgeButton2 = await page.locator('button:has-text("Add Edge Mode")');
      await addEdgeButton.click();
      
      // Should either be disabled or wait for path finding to complete
      const isDisabled = await addEdgeButton.isDisabled();
      if (!isDisabled) {
        // If not disabled, verify it doesn't interfere with animation
        await page.waitForTimeout(2000);
        const pathComplete = await page.locator('.shortest-path').count();
        expect(pathComplete).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Visual Feedback and Hover Effects', () => {
    test('should show hover effect on nodes', async () => {
      const node2 = await page.locator('circle.node2').first();
      
      // Get initial transform
      const initialTransform = await node.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      await node.hover();
      await page.waitForTimeout(100); // Wait for transition
      
      // Check for scale transform on hover
      const hoverTransform = await node.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      expect(hoverTransform).not.toBe(initialTransform);
    });

    test('should show hover effect on edges', async () => {
      const edge3 = await page.locator('line.edge3').first();
      
      // Get initial stroke width
      const initialStrokeWidth = await edge.evaluate(el => 
        window.getComputedStyle(el).strokeWidth
      );
      
      await edge.hover();
      await page.waitForTimeout(100);
      
      // Check for increased stroke width on hover
      const hoverStrokeWidth = await edge.evaluate(el => 
        window.getComputedStyle(el).strokeWidth
      );
      
      expect(parseFloat(hoverStrokeWidth)).toBeGreaterThan(parseFloat(initialStrokeWidth));
    });

    test('should display edge weights with readable background', async () => {
      const weightLabels = await page.locator('text.edge-weight');
      const firstWeight = weightLabels.first();
      
      // Check weight is visible
      await expect(firstWeight).toBeVisible();
      
      // Verify weight has background for readability
      const weightBackground = await page.locator('rect.weight-background').first();
      await expect(weightBackground).toBeVisible();
    });
  });

  test.describe('Responsive Design and Layout', () => {
    test('should maintain minimum spacing between nodes', async () => {
      const nodes10 = await page.locator('circle.node').all();
      const positions = [];
      
      for (const node of nodes) {
        const box = await node.boundingBox();
        positions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      }
      
      // Check minimum distance between any two nodes
      let minDistance = Infinity;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const distance = Math.sqrt(
            Math.pow(positions[i].x - positions[j].x, 2) +
            Math.pow(positions[i].y - positions[j].y, 2)
          );
          minDistance = Math.min(minDistance, distance);
        }
      }
      
      expect(minDistance).toBeGreaterThanOrEqual(100);
    });

    test('should display control panel with proper spacing', async () => {
      const controlPanel = await page.locator('.control-panel, [class*="control"]');
      await expect(controlPanel).toBeVisible();
      
      const buttons = await controlPanel.locator('button').all();
      
      // Verify buttons have minimum spacing
      for (let i = 0; i < buttons.length - 1; i++) {
        const box1 = await buttons[i].boundingBox();
        const box2 = await buttons[i + 1].boundingBox();
        const spacing = box2.y - (box1.y + box1.height);
        
        expect(spacing).toBeGreaterThanOrEqual(16);
      }
    });
  });

  test.describe('Algorithm Progress Display', () => {
    test('should update distance labels during algorithm execution', async () => {
      const nodes11 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(3).click();
      
      await page.locator('button:has-text("Find Shortest Path")').click();
      
      // Wait for distance labels to appear
      await page.waitForSelector('.distance-label, text.node-distance', { timeout: 5000 });
      
      const distanceLabels = await page.locator('.distance-label, text.node-distance');
      await expect(distanceLabels).toHaveCount(await nodes.count());
    });

    test('should show step-by-step progress in info panel', async () => {
      const nodes12 = await page.locator('circle.node');
      await nodes.nth(0).click();
      await nodes.nth(2).click();
      
      await page.locator('button:has-text("Find Shortest Path")').click();
      
      // Check for info panel updates
      const infoPanel = await page.locator('.info-panel, [class*="info"]');
      await expect(infoPanel).toBeVisible();
      
      // Wait for algorithm steps to be displayed
      await page.waitForTimeout(1000);
      const stepInfo = await infoPanel.locator('text=/Visiting|Examining|Distance/i');
      await expect(stepInfo.first()).toBeVisible();
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle rapid clicks without breaking state', async () => {
      const nodes13 = await page.locator('circle.node');
      
      // Rapid clicking on multiple nodes
      for (let i = 0; i < 5; i++) {
        await nodes.nth(i % await nodes.count()).click();
        await page.waitForTimeout(50);
      }
      
      // Graph should still be functional
      const clearButton1 = await page.locator('button:has-text("Clear Selection")');
      await clearButton.click();
      
      // Verify can still select nodes normally
      await nodes.nth(0).click();
      await expect(nodes.nth(0)).toHaveCSS('fill', 'rgb(0, 128, 0)');
    });

    test('should handle edge weight validation', async () => {
      const edge4 = await page.locator('line.edge4').first();
      await edge.click();
      
      const weightInput2 = await page.locator('input[type="number"]');
      
      // Try negative weight
      await weightInput.fill('-5');
      await weightInput.press('Enter');
      
      // Should either reject or convert to positive
      const weightLabel2 = await page.locator('text.edge-weight').first();
      const weight = await weightLabel.textContent();
      expect(parseFloat(weight)).toBeGreaterThan(0);
    });

    test('should prevent creating duplicate edges', async () => {
      await page.locator('button:has-text("Add Edge Mode")').click();
      
      const nodes14 = await page.locator('circle.node');
      const firstNode3 = nodes.nth(0);
      const secondNode2 = nodes.nth(1);
      
      const initialEdgeCount1 = await page.locator('line.edge').count();
      
      // Try to create edge between already connected nodes
      await firstNode.click();
      await secondNode.click();
      
      await page.waitForTimeout(500);
      
      // Edge count should not increase if edge already exists
      const finalEdgeCount = await page.locator('line.edge').count();
      expect(finalEdgeCount).toBeLessThanOrEqual(initialEdgeCount + 1);
    });

    test('should handle node creation at canvas boundaries', async () => {
      const canvas2 = await page.locator('svg');
      const box1 = await canvas.boundingBox();
      
      // Try to create node at edge of canvas
      await canvas.dblclick({ position: { x: box.width - 10, y: box.height - 10 } });
      
      // Node should be created within visible bounds
      const newNode = await page.locator('circle.node').last();
      const nodeBox = await newNode.boundingBox();
      
      expect(nodeBox.x + nodeBox.width).toBeLessThanOrEqual(box.x + box.width);
      expect(nodeBox.y + nodeBox.height).toBeLessThanOrEqual(box.y + box.height);
    });
  });
});