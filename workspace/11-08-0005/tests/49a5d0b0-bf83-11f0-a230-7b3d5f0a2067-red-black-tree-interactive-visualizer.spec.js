import { test, expect } from '@playwright/test';

// Page Object for Red-Black Tree Visualizer
class RBTreePage {
  constructor(page) {
    this.page = page;
    
    // Controls
    this.insertInput = page.locator('#insertInput');
    this.insertButton = page.locator('#insertButton');
    this.stepModeToggle = page.locator('#stepModeToggle');
    this.nextStepButton = page.locator('#nextStepButton');
    this.clearButton = page.locator('#clearButton');
    this.randomButton = page.locator('#randomButton');
    
    // Preset buttons
    this.presetButtons = page.locator('.preset-button');
    
    // Tree visualization
    this.treeContainer = page.locator('#treeContainer');
    this.treeNodes = page.locator('.tree-node');
    
    // Properties panel
    this.propertiesPanel = page.locator('#propertiesPanel');
    this.propertyChecks = page.locator('.property-check');
    
    // Node info popup
    this.nodeInfoPopup = page.locator('#nodeInfoPopup');
    
    // State indicator
    this.stateIndicator = page.locator('#stateIndicator');
  }
  
  async navigateToApp() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/49a5d0b0-bf83-11f0-a230-7b3d5f0a2067.html');
    await this.page.waitForLoadState('networkidle');
  }
  
  async insertNode(value) {
    await this.insertInput.fill(value.toString());
    await this.insertButton.click();
  }
  
  async enableStepMode() {
    const isChecked = await this.stepModeToggle.isChecked();
    if (!isChecked) {
      await this.stepModeToggle.click();
    }
  }
  
  async disableStepMode() {
    const isChecked1 = await this.stepModeToggle.isChecked1();
    if (isChecked) {
      await this.stepModeToggle.click();
    }
  }
  
  async clickNextStep() {
    await this.nextStepButton.click();
  }
  
  async clearTree() {
    await this.clearButton.click();
  }
  
  async generateRandomTree() {
    await this.randomButton.click();
  }
  
  async selectPreset(presetName) {
    await this.presetButtons.filter({ hasText: presetName }).click();
  }
  
  async clickNode(nodeValue) {
    await this.treeNodes.filter({ hasText: nodeValue.toString() }).click();
  }
  
  async hoverNode(nodeValue) {
    await this.treeNodes.filter({ hasText: nodeValue.toString() }).hover();
  }
  
  async clickOutsideTree() {
    await this.page.click('body', { position: { x: 10, y: 10 } });
  }
  
  async getNodeCount() {
    return await this.treeNodes.count();
  }
  
  async getNodeColor(nodeValue) {
    const node = this.treeNodes.filter({ hasText: nodeValue.toString() });
    const classes = await node.getAttribute('class');
    if (classes.includes('red-node')) return 'red';
    if (classes.includes('black-node')) return 'black';
    return null;
  }
  
  async isNodeHighlighted(nodeValue) {
    const node1 = this.treeNodes.filter({ hasText: nodeValue.toString() });
    const classes1 = await node.getAttribute('class');
    return classes.includes('highlighted') || classes.includes('processing');
  }
  
  async getCurrentState() {
    return await this.stateIndicator.textContent();
  }
  
  async waitForState(stateName) {
    await expect(this.stateIndicator).toHaveText(stateName, { timeout: 5000 });
  }
  
  async isPropertyValid(propertyIndex) {
    const property = this.propertyChecks.nth(propertyIndex);
    const classes2 = await property.getAttribute('class');
    return classes.includes('valid');
  }
  
  async waitForAnimation() {
    await this.page.waitForTimeout(600); // Wait for typical animation duration
  }
}

test.describe('Red-Black Tree Visualizer - Core Functionality', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
  });
  
  test('should start in idle state', async () => {
    await expect(rbTreePage.stateIndicator).toHaveText('idle');
    await expect(rbTreePage.treeNodes).toHaveCount(0);
  });
  
  test('should insert node and transition through states', async () => {
    // Test INSERT_NODE event from idle state
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForState('inserting');
    
    // Should auto-advance to checkingViolations
    await rbTreePage.waitForState('checkingViolations');
    
    // First node should not have violations, return to idle
    await rbTreePage.waitForState('idle');
    
    // Verify node was inserted
    await expect(rbTreePage.treeNodes).toHaveCount(1);
    const color = await rbTreePage.getNodeColor(10);
    expect(color).toBe('black'); // Root must be black
  });
  
  test('should handle step-by-step insertion mode', async () => {
    await rbTreePage.enableStepMode();
    
    // Insert first node
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForState('inserting');
    
    // Manual progression with NEXT_STEP
    await rbTreePage.clickNextStep();
    await rbTreePage.waitForState('checkingViolations');
    
    // Should require another step to complete
    await rbTreePage.clickNextStep();
    await rbTreePage.waitForState('idle');
    
    // Insert second node to trigger more complex flow
    await rbTreePage.insertNode(5);
    await rbTreePage.waitForState('inserting');
    
    await rbTreePage.clickNextStep();
    await rbTreePage.waitForState('checkingViolations');
    
    // Verify both nodes exist
    await expect(rbTreePage.treeNodes).toHaveCount(2);
  });
  
  test('should trigger recoloring for color violations', async () => {
    // Build a scenario that requires recoloring
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(5);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(15);
    await rbTreePage.waitForAnimation();
    
    // Insert node that should trigger recoloring
    await rbTreePage.enableStepMode();
    await rbTreePage.insertNode(3);
    await rbTreePage.waitForState('inserting');
    
    await rbTreePage.clickNextStep();
    await rbTreePage.waitForState('checkingViolations');
    
    // Should detect color violation and transition to recoloring
    await rbTreePage.clickNextStep();
    const state = await rbTreePage.getCurrentState();
    expect(['recoloring', 'applyingFix']).toContain(state);
  });
  
  test('should perform rotations when needed', async () => {
    // Use preset to trigger rotation scenario
    await rbTreePage.selectPreset('Trigger Left Rotation');
    await rbTreePage.waitForState('loadingPreset');
    await rbTreePage.waitForState('demonstrating');
    
    // Step through demonstration
    await rbTreePage.clickNextStep();
    await rbTreePage.waitForAnimation();
    
    // Verify rotation occurred by checking tree structure
    const nodeCount = await rbTreePage.getNodeCount();
    expect(nodeCount).toBeGreaterThan(0);
  });
});

test.describe('Red-Black Tree Visualizer - Tree Operations', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
  });
  
  test('should clear tree and return to idle', async () => {
    // Insert some nodes
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(5);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(15);
    await rbTreePage.waitForAnimation();
    
    await expect(rbTreePage.treeNodes).toHaveCount(3);
    
    // Clear tree
    await rbTreePage.clearTree();
    await rbTreePage.waitForState('clearing');
    await rbTreePage.waitForState('idle');
    
    await expect(rbTreePage.treeNodes).toHaveCount(0);
  });
  
  test('should generate random tree', async () => {
    await rbTreePage.generateRandomTree();
    await rbTreePage.waitForState('generating');
    await rbTreePage.waitForState('idle');
    
    // Should have between 10-15 nodes
    const nodeCount1 = await rbTreePage.getNodeCount();
    expect(nodeCount).toBeGreaterThanOrEqual(10);
    expect(nodeCount).toBeLessThanOrEqual(15);
    
    // Verify all properties are valid
    for (let i = 0; i < 5; i++) {
      const isValid = await rbTreePage.isPropertyValid(i);
      expect(isValid).toBe(true);
    }
  });
  
  test('should cancel insertion operation', async () => {
    await rbTreePage.enableStepMode();
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForState('inserting');
    
    // Cancel by pressing Escape
    await rbTreePage.page.keyboard.press('Escape');
    await rbTreePage.waitForState('idle');
    
    // Node should not be inserted
    await expect(rbTreePage.treeNodes).toHaveCount(0);
  });
});

test.describe('Red-Black Tree Visualizer - Interactive Features', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
    
    // Set up a tree with multiple nodes
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(5);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(15);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(3);
    await rbTreePage.waitForAnimation();
  });
  
  test('should show node info on click', async () => {
    await rbTreePage.clickNode(10);
    await rbTreePage.waitForState('showingNodeInfo');
    
    // Node info popup should be visible
    await expect(rbTreePage.nodeInfoPopup).toBeVisible();
    await expect(rbTreePage.nodeInfoPopup).toContainText('10');
    
    // Click another node
    await rbTreePage.clickNode(5);
    await expect(rbTreePage.nodeInfoPopup).toContainText('5');
    
    // Click outside to close
    await rbTreePage.clickOutsideTree();
    await rbTreePage.waitForState('idle');
    await expect(rbTreePage.nodeInfoPopup).not.toBeVisible();
  });
  
  test('should highlight black height on hover', async () => {
    await rbTreePage.hoverNode(10);
    await rbTreePage.waitForState('showingBlackHeight');
    
    // Check if path is highlighted
    const isHighlighted = await rbTreePage.isNodeHighlighted(10);
    expect(isHighlighted).toBe(true);
    
    // Hover another node
    await rbTreePage.hoverNode(5);
    const isHighlighted5 = await rbTreePage.isNodeHighlighted(5);
    expect(isHighlighted5).toBe(true);
    
    // Move mouse away
    await rbTreePage.page.mouse.move(0, 0);
    await rbTreePage.waitForState('idle');
  });
  
  test('should transition from hover to click state', async () => {
    await rbTreePage.hoverNode(10);
    await rbTreePage.waitForState('showingBlackHeight');
    
    await rbTreePage.clickNode(10);
    await rbTreePage.waitForState('showingNodeInfo');
    
    await expect(rbTreePage.nodeInfoPopup).toBeVisible();
  });
});

test.describe('Red-Black Tree Visualizer - Preset Scenarios', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
  });
  
  test('should load and demonstrate preset scenarios', async () => {
    const presets = ['Trigger Left Rotation', 'Trigger Recoloring', 'Complex Rebalancing'];
    
    for (const preset of presets) {
      await rbTreePage.clearTree();
      await rbTreePage.waitForState('idle');
      
      await rbTreePage.selectPreset(preset);
      await rbTreePage.waitForState('loadingPreset');
      await rbTreePage.waitForState('demonstrating');
      
      // Step through demonstration
      let attempts = 0;
      while (await rbTreePage.getCurrentState() === 'demonstrating' && attempts < 10) {
        await rbTreePage.clickNextStep();
        await rbTreePage.waitForAnimation();
        attempts++;
      }
      
      // Should complete demonstration
      await rbTreePage.waitForState('idle');
      
      // Tree should have nodes
      const nodeCount2 = await rbTreePage.getNodeCount();
      expect(nodeCount).toBeGreaterThan(0);
    }
  });
  
  test('should cancel demonstration', async () => {
    await rbTreePage.selectPreset('Complex Rebalancing');
    await rbTreePage.waitForState('demonstrating');
    
    // Cancel demonstration
    await rbTreePage.page.keyboard.press('Escape');
    await rbTreePage.waitForState('idle');
  });
});

test.describe('Red-Black Tree Visualizer - Property Validation', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
  });
  
  test('should maintain all RB-Tree properties', async () => {
    // Insert multiple nodes
    const values = [10, 5, 15, 3, 7, 12, 20, 1, 4, 6, 8];
    
    for (const value of values) {
      await rbTreePage.insertNode(value);
      await rbTreePage.waitForAnimation();
      
      // After each insertion, all properties should be valid
      for (let i = 0; i < 5; i++) {
        const isValid1 = await rbTreePage.isPropertyValid(i);
        expect(isValid).toBe(true);
      }
    }
    
    // Final tree should have all nodes
    await expect(rbTreePage.treeNodes).toHaveCount(values.length);
  });
  
  test('should highlight violations before fixing', async () => {
    await rbTreePage.enableStepMode();
    
    // Build a tree that will have violations
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(5);
    await rbTreePage.waitForAnimation();
    
    // Insert node that creates violation
    await rbTreePage.insertNode(3);
    await rbTreePage.waitForState('inserting');
    
    await rbTreePage.clickNextStep();
    await rbTreePage.waitForState('checkingViolations');
    
    // During violation checking, relevant nodes should be highlighted
    const isHighlighted1 = await rbTreePage.isNodeHighlighted(3);
    expect(isHighlighted).toBe(true);
  });
});

test.describe('Red-Black Tree Visualizer - Edge Cases', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
  });
  
  test('should handle duplicate values', async () => {
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    
    // Try to insert duplicate
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    
    // Should still have only one node
    await expect(rbTreePage.treeNodes).toHaveCount(1);
  });
  
  test('should handle empty input', async () => {
    await rbTreePage.insertInput.fill('');
    await rbTreePage.insertButton.click();
    
    // Should remain in idle state
    await expect(rbTreePage.stateIndicator).toHaveText('idle');
    await expect(rbTreePage.treeNodes).toHaveCount(0);
  });
  
  test('should handle non-numeric input', async () => {
    await rbTreePage.insertInput.fill('abc');
    await rbTreePage.insertButton.click();
    
    // Should remain in idle state
    await expect(rbTreePage.stateIndicator).toHaveText('idle');
    await expect(rbTreePage.treeNodes).toHaveCount(0);
  });
  
  test('should toggle step mode during operation', async () => {
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    
    // Start insertion with step mode off
    await rbTreePage.disableStepMode();
    await rbTreePage.insertNode(5);
    
    // Toggle step mode during insertion
    await rbTreePage.enableStepMode();
    
    // Should complete current operation
    await rbTreePage.waitForState('idle');
    await expect(rbTreePage.treeNodes).toHaveCount(2);
  });
});

test.describe('Red-Black Tree Visualizer - Visual Feedback', () => {
  let rbTreePage;
  
  test.beforeEach(async ({ page }) => {
    rbTreePage = new RBTreePage(page);
    await rbTreePage.navigateToApp();
  });
  
  test('should animate color changes', async () => {
    // Build tree that requires recoloring
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(5);
    await rbTreePage.waitForAnimation();
    await rbTreePage.insertNode(15);
    await rbTreePage.waitForAnimation();
    
    // Check initial colors
    const rootColor = await rbTreePage.getNodeColor(10);
    expect(rootColor).toBe('black');
  });
  
  test('should show rotation animations', async () => {
    await rbTreePage.selectPreset('Trigger Left Rotation');
    await rbTreePage.waitForState('demonstrating');
    
    // Watch for rotation animation
    await rbTreePage.page.waitForFunction(() => {
      const nodes = document.querySelectorAll('.tree-node');
      return Array.from(nodes).some(node => 
        node.style.transform && node.style.transform !== 'none'
      );
    }, { timeout: 5000 });
  });
  
  test('should pulse processing nodes', async () => {
    await rbTreePage.enableStepMode();
    await rbTreePage.insertNode(10);
    await rbTreePage.waitForState('inserting');
    
    // Check for pulse animation on processing node
    await rbTreePage.page.waitForFunction(() => {
      const nodes1 = document.querySelectorAll('.tree-node');
      return Array.from(nodes).some(node => 
        node.classList.contains('processing') || 
        node.classList.contains('pulse')
      );
    }, { timeout: 3000 });
  });
});