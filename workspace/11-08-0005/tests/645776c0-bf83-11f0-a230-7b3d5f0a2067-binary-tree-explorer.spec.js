import { test, expect } from '@playwright/test';

test.describe('Binary Tree Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/645776c0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should start in idle state with empty tree', async ({ page }) => {
      // Verify initial state
      const treeContainer = page.locator('#tree-container');
      await expect(treeContainer).toBeVisible();
      
      // Check that no nodes are present initially
      const nodes = page.locator('.node');
      await expect(nodes).toHaveCount(0);
      
      // Verify all controls are enabled
      await expect(page.locator('#node-value')).toBeEnabled();
      await expect(page.locator('#add-node')).toBeEnabled();
      await expect(page.locator('#clear-tree')).toBeEnabled();
    });
  });

  test.describe('Adding Nodes', () => {
    test('should add root node successfully', async ({ page }) => {
      // Add root node with value 50
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Verify node is added
      const nodes1 = page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toContainText('50');
      
      // Verify input is cleared
      await expect(page.locator('#node-value')).toHaveValue('');
    });

    test('should add multiple nodes following BST rules', async ({ page }) => {
      // Add nodes: 50, 30, 70, 20, 40, 60, 80
      const values = [50, 30, 70, 20, 40, 60, 80];
      
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100); // Allow animation to complete
      }
      
      // Verify all nodes are added
      const nodes2 = page.locator('.node');
      await expect(nodes).toHaveCount(7);
      
      // Verify BST structure by checking node positions
      const rootNode = nodes.filter({ hasText: '50' });
      await expect(rootNode).toBeVisible();
    });

    test('should handle invalid input gracefully', async ({ page }) => {
      // Try to add empty value
      await page.fill('#node-value', '');
      await page.click('#add-node');
      
      // Verify no node is added
      const nodes3 = page.locator('.node');
      await expect(nodes).toHaveCount(0);
      
      // Try to add non-numeric value
      await page.fill('#node-value', 'abc');
      await page.click('#add-node');
      
      // Verify no node is added
      await expect(nodes).toHaveCount(0);
    });

    test('should handle duplicate values', async ({ page }) => {
      // Add initial node
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Try to add duplicate
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Verify only one node exists
      const nodes4 = page.locator('.node');
      await expect(nodes).toHaveCount(1);
    });
  });

  test.describe('Node Selection', () => {
    test.beforeEach(async ({ page }) => {
      // Add some nodes for testing
      const values1 = [50, 30, 70];
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100);
      }
    });

    test('should select node on click', async ({ page }) => {
      // Click on node with value 30
      const node30 = page.locator('.node').filter({ hasText: '30' });
      await node30.click();
      
      // Verify node is selected (should have selected class)
      await expect(node30).toHaveClass(/selected/);
      
      // Verify remove button is enabled
      await expect(page.locator('#remove-selected')).toBeEnabled();
    });

    test('should deselect node when clicking same node', async ({ page }) => {
      // Select node
      const node301 = page.locator('.node').filter({ hasText: '30' });
      await node30.click();
      await expect(node30).toHaveClass(/selected/);
      
      // Click again to deselect
      await node30.click();
      await expect(node30).not.toHaveClass(/selected/);
      
      // Verify remove button is disabled
      await expect(page.locator('#remove-selected')).toBeDisabled();
    });

    test('should switch selection between nodes', async ({ page }) => {
      // Select first node
      const node302 = page.locator('.node').filter({ hasText: '30' });
      await node30.click();
      await expect(node30).toHaveClass(/selected/);
      
      // Select different node
      const node70 = page.locator('.node').filter({ hasText: '70' });
      await node70.click();
      
      // Verify only new node is selected
      await expect(node30).not.toHaveClass(/selected/);
      await expect(node70).toHaveClass(/selected/);
    });
  });

  test.describe('Removing Nodes', () => {
    test.beforeEach(async ({ page }) => {
      // Add nodes: 50, 30, 70, 20, 40
      const values2 = [50, 30, 70, 20, 40];
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100);
      }
    });

    test('should remove selected leaf node', async ({ page }) => {
      // Select and remove leaf node (20)
      const node20 = page.locator('.node').filter({ hasText: '20' });
      await node20.click();
      await page.click('#remove-selected');
      
      // Verify node is removed
      await expect(node20).not.toBeVisible();
      const nodes5 = page.locator('.node');
      await expect(nodes).toHaveCount(4);
    });

    test('should remove node with one child', async ({ page }) => {
      // Select and remove node with one child (70)
      const node701 = page.locator('.node').filter({ hasText: '70' });
      await node70.click();
      await page.click('#remove-selected');
      
      // Verify node is removed
      await expect(node70).not.toBeVisible();
      const nodes6 = page.locator('.node');
      await expect(nodes).toHaveCount(4);
    });

    test('should remove node with two children', async ({ page }) => {
      // Select and remove node with two children (30)
      const node303 = page.locator('.node').filter({ hasText: '30' });
      await node30.click();
      await page.click('#remove-selected');
      
      // Verify node is removed and tree structure is maintained
      await expect(node30).not.toBeVisible();
      const nodes7 = page.locator('.node');
      await expect(nodes).toHaveCount(4);
    });

    test('should disable remove button when no node selected', async ({ page }) => {
      // Verify remove button is initially disabled
      await expect(page.locator('#remove-selected')).toBeDisabled();
    });
  });

  test.describe('Clear Tree', () => {
    test('should clear all nodes from tree', async ({ page }) => {
      // Add some nodes
      const values3 = [50, 30, 70];
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100);
      }
      
      // Verify nodes exist
      let nodes8 = page.locator('.node');
      await expect(nodes).toHaveCount(3);
      
      // Clear tree
      await page.click('#clear-tree');
      
      // Verify all nodes are removed
      nodes = page.locator('.node');
      await expect(nodes).toHaveCount(0);
    });

    test('should handle clearing empty tree', async ({ page }) => {
      // Click clear on empty tree
      await page.click('#clear-tree');
      
      // Verify no errors and tree remains empty
      const nodes9 = page.locator('.node');
      await expect(nodes).toHaveCount(0);
    });
  });

  test.describe('Tree Traversals', () => {
    test.beforeEach(async ({ page }) => {
      // Build a complete tree: 50, 30, 70, 20, 40, 60, 80
      const values4 = [50, 30, 70, 20, 40, 60, 80];
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100);
      }
    });

    test('should animate inorder traversal', async ({ page }) => {
      // Start inorder traversal
      await page.click('#inorder-btn');
      
      // Verify traversal output appears
      const output = page.locator('#traversal-output');
      await expect(output).toBeVisible();
      
      // Wait for animation to complete
      await page.waitForTimeout(3000);
      
      // Verify correct inorder sequence: 20, 30, 40, 50, 60, 70, 80
      await expect(output).toContainText('20 → 30 → 40 → 50 → 60 → 70 → 80');
    });

    test('should animate preorder traversal', async ({ page }) => {
      // Start preorder traversal
      await page.click('#preorder-btn');
      
      // Verify traversal output appears
      const output1 = page.locator('#traversal-output1');
      await expect(output).toBeVisible();
      
      // Wait for animation to complete
      await page.waitForTimeout(3000);
      
      // Verify correct preorder sequence: 50, 30, 20, 40, 70, 60, 80
      await expect(output).toContainText('50 → 30 → 20 → 40 → 70 → 60 → 80');
    });

    test('should animate postorder traversal', async ({ page }) => {
      // Start postorder traversal
      await page.click('#postorder-btn');
      
      // Verify traversal output appears
      const output2 = page.locator('#traversal-output2');
      await expect(output).toBeVisible();
      
      // Wait for animation to complete
      await page.waitForTimeout(3000);
      
      // Verify correct postorder sequence: 20, 40, 30, 60, 80, 70, 50
      await expect(output).toContainText('20 → 40 → 30 → 60 → 80 → 70 → 50');
    });

    test('should highlight nodes during traversal animation', async ({ page }) => {
      // Start inorder traversal
      await page.click('#inorder-btn');
      
      // Check that nodes get highlighted during animation
      await page.waitForTimeout(500);
      
      // At least one node should have the visiting class during animation
      const visitingNodes = page.locator('.node.visiting');
      await expect(visitingNodes).toHaveCount(1);
    });

    test('should disable controls during animation', async ({ page }) => {
      // Start traversal
      await page.click('#inorder-btn');
      
      // Verify controls are disabled during animation
      await expect(page.locator('#add-node')).toBeDisabled();
      await expect(page.locator('#clear-tree')).toBeDisabled();
      await expect(page.locator('#inorder-btn')).toBeDisabled();
      await expect(page.locator('#preorder-btn')).toBeDisabled();
      await expect(page.locator('#postorder-btn')).toBeDisabled();
      
      // Wait for animation to complete
      await page.waitForTimeout(3000);
      
      // Verify controls are re-enabled
      await expect(page.locator('#add-node')).toBeEnabled();
      await expect(page.locator('#clear-tree')).toBeEnabled();
      await expect(page.locator('#inorder-btn')).toBeEnabled();
    });
  });

  test.describe('State Transitions', () => {
    test('should transition from idle to adding_node and back', async ({ page }) => {
      // Start in idle state
      await expect(page.locator('#add-node')).toBeEnabled();
      
      // Trigger ADD_NODE event
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Should return to idle after node is added
      await expect(page.locator('#add-node')).toBeEnabled();
      const nodes10 = page.locator('.node');
      await expect(nodes).toHaveCount(1);
    });

    test('should transition from idle to node_selected and handle multiple transitions', async ({ page }) => {
      // Add a node first
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Transition to node_selected
      const node = page.locator('.node').first();
      await node.click();
      await expect(node).toHaveClass(/selected/);
      
      // Can transition to removing_node
      await page.click('#remove-selected');
      await expect(node).not.toBeVisible();
      
      // Back in idle state
      await expect(page.locator('#add-node')).toBeEnabled();
    });

    test('should handle animation state transitions', async ({ page }) => {
      // Add nodes
      const values5 = [50, 30, 70];
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100);
      }
      
      // Start traversal (idle -> animating_traversal)
      await page.click('#inorder-btn');
      
      // During animation, controls should be disabled
      await expect(page.locator('#add-node')).toBeDisabled();
      
      // Wait for ANIMATION_COMPLETE
      await page.waitForTimeout(3000);
      
      // Should be back in idle state
      await expect(page.locator('#add-node')).toBeEnabled();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid clicks without breaking state', async ({ page }) => {
      // Add a node
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Rapid clicks on the same node
      const node1 = page.locator('.node1').first();
      await node.click();
      await node.click();
      await node.click();
      
      // Should still be functional
      await expect(page.locator('#add-node')).toBeEnabled();
    });

    test('should handle very large numbers', async ({ page }) => {
      // Add very large number
      await page.fill('#node-value', '999999');
      await page.click('#add-node');
      
      // Verify node is added
      const nodes11 = page.locator('.node');
      await expect(nodes).toHaveCount(1);
      await expect(nodes.first()).toContainText('999999');
    });

    test('should handle negative numbers', async ({ page }) => {
      // Add negative numbers
      await page.fill('#node-value', '-50');
      await page.click('#add-node');
      
      await page.fill('#node-value', '-100');
      await page.click('#add-node');
      
      // Verify nodes are added correctly
      const nodes12 = page.locator('.node');
      await expect(nodes).toHaveCount(2);
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show hover effects on nodes', async ({ page }) => {
      // Add a node
      await page.fill('#node-value', '50');
      await page.click('#add-node');
      
      // Hover over node
      const node2 = page.locator('.node2').first();
      await node.hover();
      
      // Node should be visible and interactive
      await expect(node).toBeVisible();
      await expect(node).toHaveCSS('cursor', 'pointer');
    });

    test('should show tree statistics', async ({ page }) => {
      // Add multiple nodes
      const values6 = [50, 30, 70, 20, 40];
      for (const value of values) {
        await page.fill('#node-value', value.toString());
        await page.click('#add-node');
        await page.waitForTimeout(100);
      }
      
      // Check if statistics are displayed
      const stats = page.locator('.tree-stats');
      await expect(stats).toBeVisible();
      await expect(stats).toContainText('Nodes: 5');
    });
  });
});