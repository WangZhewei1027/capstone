import { test, expect } from '@playwright/test';

test.describe('Linked List Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/61ae28b0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Empty State', () => {
    test('should display empty state message initially', async ({ page }) => {
      const emptyMessage = page.locator('.empty-message');
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText('List is empty');
    });

    test('should show status as Ready when empty', async ({ page }) => {
      const status = page.locator('.status');
      await expect(status).toContainText('Ready');
    });

    test('should keep empty state when searching in empty list', async ({ page }) => {
      await page.fill('#nodeValue', 'test');
      await page.click('button:has-text("Search")');
      await expect(page.locator('.empty-message')).toBeVisible();
    });

    test('should keep empty state when stepping forward in empty list', async ({ page }) => {
      await page.click('button:has-text("Step →")');
      await expect(page.locator('.empty-message')).toBeVisible();
    });

    test('should keep empty state when clearing empty list', async ({ page }) => {
      await page.click('button:has-text("Clear All")');
      await expect(page.locator('.empty-message')).toBeVisible();
    });
  });

  test.describe('Adding Nodes', () => {
    test('should add node to head and transition from empty to ready state', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      
      // Verify empty message is gone
      await expect(page.locator('.empty-message')).not.toBeVisible();
      
      // Verify node is added
      const node = page.locator('.node').first();
      await expect(node).toBeVisible();
      await expect(node.locator('.node-value')).toContainText('10');
      
      // Verify head label
      await expect(node.locator('.node-label')).toContainText('HEAD');
    });

    test('should add node to tail', async ({ page }) => {
      // Add first node
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      
      // Add second node to tail
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      
      // Verify both nodes exist
      const nodes = page.locator('.node');
      await expect(nodes).toHaveCount(2);
      
      // Verify tail label
      const tailNode = nodes.last();
      await expect(tailNode.locator('.node-label')).toContainText('TAIL');
      await expect(tailNode.locator('.node-value')).toContainText('20');
    });

    test('should handle empty input when adding', async ({ page }) => {
      await page.click('button:has-text("Add to Head")');
      
      // Should remain in empty state
      await expect(page.locator('.empty-message')).toBeVisible();
    });

    test('should animate node addition', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      
      // Check for animation class during addition
      const nodePromise = page.waitForSelector('.node.adding', { state: 'attached' });
      await page.click('button:has-text("Add to Head")');
      await nodePromise;
      
      // Animation should complete
      await expect(page.locator('.node.adding')).not.toBeVisible({ timeout: 1000 });
    });

    test('should update status during add operation', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      
      const status1 = page.locator('.status1');
      await expect(status).toContainText('Added node with value: 10');
      
      // Status should reset after 3 seconds
      await page.waitForTimeout(3100);
      await expect(status).toContainText('Ready');
    });
  });

  test.describe('Deleting Nodes', () => {
    test.beforeEach(async ({ page }) => {
      // Add some nodes first
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      await page.fill('#nodeValue', '30');
      await page.click('button:has-text("Add to Tail")');
    });

    test('should delete node on click', async ({ page }) => {
      const nodes1 = page.locator('.node');
      await expect(nodes).toHaveCount(3);
      
      // Click delete button on middle node
      await nodes.nth(1).locator('.delete-btn').click();
      
      // Wait for animation
      await page.waitForTimeout(500);
      
      // Should have 2 nodes now
      await expect(nodes).toHaveCount(2);
      
      // Verify correct node was deleted
      await expect(nodes.first().locator('.node-value')).toContainText('10');
      await expect(nodes.last().locator('.node-value')).toContainText('30');
    });

    test('should animate node removal', async ({ page }) => {
      const nodeToDelete = page.locator('.node').nth(1);
      
      // Check for animation class during deletion
      const animationPromise = page.waitForSelector('.node.deleting', { state: 'attached' });
      await nodeToDelete.locator('.delete-btn').click();
      await animationPromise;
    });

    test('should transition to empty state when deleting last node', async ({ page }) => {
      // Delete all nodes
      for (let i = 0; i < 3; i++) {
        await page.locator('.node').first().locator('.delete-btn').click();
        await page.waitForTimeout(500);
      }
      
      // Should show empty message
      await expect(page.locator('.empty-message')).toBeVisible();
    });

    test('should update labels after deletion', async ({ page }) => {
      // Delete head node
      await page.locator('.node').first().locator('.delete-btn').click();
      await page.waitForTimeout(500);
      
      // New head should have HEAD label
      const newHead = page.locator('.node').first();
      await expect(newHead.locator('.node-label')).toContainText('HEAD');
    });
  });

  test.describe('Searching', () => {
    test.beforeEach(async ({ page }) => {
      // Add test nodes
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Tail")');
    });

    test('should highlight found nodes', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Search")');
      
      // Should highlight matching nodes
      const foundNodes = page.locator('.node.found');
      await expect(foundNodes).toHaveCount(2);
    });

    test('should show search results status', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Search")');
      
      const status2 = page.locator('.status2');
      await expect(status).toContainText('Found 2 node(s) with value: 10');
    });

    test('should handle not found case', async ({ page }) => {
      await page.fill('#nodeValue', '99');
      await page.click('button:has-text("Search")');
      
      const status3 = page.locator('.status3');
      await expect(status).toContainText('No nodes found with value: 99');
      
      // No nodes should be highlighted
      await expect(page.locator('.node.found')).toHaveCount(0);
    });

    test('should clear highlights after timeout', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Search")');
      
      // Verify highlights exist
      await expect(page.locator('.node.found')).toHaveCount(2);
      
      // Wait for timeout (3 seconds)
      await page.waitForTimeout(3100);
      
      // Highlights should be cleared
      await expect(page.locator('.node.found')).toHaveCount(0);
    });

    test('should handle empty search input', async ({ page }) => {
      await page.fill('#nodeValue', '');
      await page.click('button:has-text("Search")');
      
      // Should not highlight any nodes
      await expect(page.locator('.node.found')).toHaveCount(0);
    });

    test('should allow operations during search results display', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Search")');
      
      // Should be able to add node while showing results
      await page.fill('#nodeValue', '40');
      await page.click('button:has-text("Add to Tail")');
      
      // Highlights should be cleared
      await expect(page.locator('.node.found')).toHaveCount(0);
      
      // New node should be added
      await expect(page.locator('.node')).toHaveCount(4);
    });
  });

  test.describe('Traversal', () => {
    test.beforeEach(async ({ page }) => {
      // Add test nodes
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      await page.fill('#nodeValue', '30');
      await page.click('button:has-text("Add to Tail")');
    });

    test('should traverse through nodes', async ({ page }) => {
      // First step
      await page.click('button:has-text("Step →")');
      await expect(page.locator('.node').first()).toHaveClass(/current/);
      
      // Second step
      await page.click('button:has-text("Step →")');
      await expect(page.locator('.node').nth(1)).toHaveClass(/current/);
      
      // Third step
      await page.click('button:has-text("Step →")');
      await expect(page.locator('.node').nth(2)).toHaveClass(/current/);
    });

    test('should wrap around to head after reaching tail', async ({ page }) => {
      // Traverse to end
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Step →")');
        await page.waitForTimeout(100);
      }
      
      // Next step should go back to head
      await page.click('button:has-text("Step →")');
      await expect(page.locator('.node').first()).toHaveClass(/current/);
    });

    test('should update traversal status', async ({ page }) => {
      await page.click('button:has-text("Step →")');
      
      const status4 = page.locator('.status4');
      await expect(status).toContainText(/Current position:/);
    });
  });

  test.describe('Clear All', () => {
    test.beforeEach(async ({ page }) => {
      // Add test nodes
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      await page.fill('#nodeValue', '30');
      await page.click('button:has-text("Add to Tail")');
    });

    test('should clear all nodes with animation', async ({ page }) => {
      // Check initial state
      await expect(page.locator('.node')).toHaveCount(3);
      
      // Clear all
      await page.click('button:has-text("Clear All")');
      
      // Should animate clearing
      await expect(page.locator('.node.clearing')).toBeVisible();
      
      // Wait for animation to complete
      await page.waitForTimeout(1000);
      
      // Should transition to empty state
      await expect(page.locator('.empty-message')).toBeVisible();
      await expect(page.locator('.node')).toHaveCount(0);
    });

    test('should update status when clearing', async ({ page }) => {
      await page.click('button:has-text("Clear All")');
      
      const status5 = page.locator('.status5');
      await expect(status).toContainText('List cleared');
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show arrows between nodes', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      
      // Should have arrow between nodes
      await expect(page.locator('.arrow')).toBeVisible();
    });

    test('should update head and tail labels correctly', async ({ page }) => {
      // Single node should be both head and tail
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      
      const singleNode = page.locator('.node').first();
      await expect(singleNode.locator('.node-label')).toContainText('HEAD');
      await expect(singleNode.locator('.node-label')).toContainText('TAIL');
      
      // Add another node
      await page.fill('#nodeValue', '20');
      await page.click('button:has-text("Add to Tail")');
      
      // Labels should be separated
      await expect(page.locator('.node').first().locator('.node-label')).toContainText('HEAD');
      await expect(page.locator('.node').first().locator('.node-label')).not.toContainText('TAIL');
      await expect(page.locator('.node').last().locator('.node-label')).toContainText('TAIL');
      await expect(page.locator('.node').last().locator('.node-label')).not.toContainText('HEAD');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid operations', async ({ page }) => {
      // Rapidly add nodes
      for (let i = 0; i < 5; i++) {
        await page.fill('#nodeValue', String(i));
        await page.click('button:has-text("Add to Head")');
      }
      
      // Should have all nodes
      await expect(page.locator('.node')).toHaveCount(5);
    });

    test('should handle special characters in node values', async ({ page }) => {
      const specialValues = ['@#$', '123', 'ABC', '   ', '!@#'];
      
      for (const value of specialValues) {
        await page.fill('#nodeValue', value);
        await page.click('button:has-text("Add to Tail")');
      }
      
      await expect(page.locator('.node')).toHaveCount(specialValues.length);
    });

    test('should maintain state consistency during animations', async ({ page }) => {
      await page.fill('#nodeValue', '10');
      await page.click('button:has-text("Add to Head")');
      
      // Try to delete while potentially still animating
      await page.locator('.delete-btn').click();
      
      // Should handle gracefully and end in empty state
      await page.waitForTimeout(1000);
      await expect(page.locator('.empty-message')).toBeVisible();
    });
  });
});