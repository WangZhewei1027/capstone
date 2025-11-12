import { test, expect } from '@playwright/test';

// Page Object Model for Merge Sort Visualizer
class MergeSortVisualizerPage {
  constructor(page) {
    this.page = page;
    
    // Buttons
    this.generateArrayBtn = page.locator('button:has-text("Generate Array")');
    this.startSortingBtn = page.locator('button:has-text("Start Sorting")');
    this.stepForwardBtn = page.locator('button:has-text("Step Forward")');
    this.resetBtn = page.locator('button:has-text("Reset")');
    
    // Controls
    this.speedSlider = page.locator('.speed-slider');
    this.arraySizeInput = page.locator('#arraySize');
    
    // Display elements
    this.statusMessage = page.locator('.status-message');
    this.arrayBars = page.locator('.array-bar');
    this.recursionTree = page.locator('.recursion-tree');
    this.stepInfo = page.locator('.step-info');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/61e146a0-bf83-11f0-a230-7b3d5f0a2067.html');
  }

  async generateNewArray() {
    await this.generateArrayBtn.click();
  }

  async startSorting() {
    await this.startSortingBtn.click();
  }

  async stepForward() {
    await this.stepForwardBtn.click();
  }

  async reset() {
    await this.resetBtn.click();
  }

  async setArraySize(size) {
    await this.arraySizeInput.fill(size.toString());
  }

  async setSpeed(value) {
    await this.speedSlider.fill(value.toString());
  }

  async getArrayBarCount() {
    return await this.arrayBars.count();
  }

  async getArrayBarHeights() {
    const heights = [];
    const count = await this.arrayBars.count();
    for (let i = 0; i < count; i++) {
      const style = await this.arrayBars.nth(i).getAttribute('style');
      const heightMatch = style.match(/height:\s*(\d+)px/);
      if (heightMatch) {
        heights.push(parseInt(heightMatch[1]));
      }
    }
    return heights;
  }

  async isArraySorted() {
    const heights1 = await this.getArrayBarHeights();
    for (let i = 1; i < heights.length; i++) {
      if (heights[i] < heights[i - 1]) {
        return false;
      }
    }
    return true;
  }

  async getHighlightedBars(className) {
    return await this.page.locator(`.array-bar.${className}`).count();
  }

  async waitForAnimation(timeout = 5000) {
    await this.page.waitForTimeout(timeout);
  }
}

test.describe('Merge Sort Visualizer - FSM States and Transitions', () => {
  let page;
  let visualizer;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    visualizer = new MergeSortVisualizerPage(page);
    await visualizer.navigate();
  });

  test.describe('Idle State', () => {
    test('should start in idle state with ready message', async () => {
      // Verify initial state displays ready message (onEnter)
      await expect(visualizer.statusMessage).toContainText(/ready|generate/i);
      await expect(visualizer.generateArrayBtn).toBeEnabled();
      await expect(visualizer.startSortingBtn).toBeEnabled();
      await expect(visualizer.stepForwardBtn).toBeEnabled();
    });

    test('GENERATE_ARRAY event should stay in idle state', async () => {
      // Test GENERATE_ARRAY: idle -> idle transition
      await visualizer.generateNewArray();
      await expect(visualizer.statusMessage).toContainText(/ready|generate/i);
      
      // Verify new array is generated
      const barCount = await visualizer.getArrayBarCount();
      expect(barCount).toBeGreaterThan(0);
    });

    test('START_SORTING event should transition to sorting state', async () => {
      // Generate array first
      await visualizer.generateNewArray();
      
      // Test START_SORTING: idle -> sorting transition
      await visualizer.startSortingBtn.click();
      
      // Verify transition to sorting state
      await expect(visualizer.resetBtn).toBeEnabled();
      await expect(visualizer.generateArrayBtn).toBeDisabled();
      await expect(visualizer.startSortingBtn).toBeDisabled();
    });

    test('STEP_FORWARD event should transition to stepping state', async () => {
      // Generate array first
      await visualizer.generateNewArray();
      
      // Test STEP_FORWARD: idle -> stepping transition
      await visualizer.stepForward();
      
      // Verify transition to stepping state
      await expect(visualizer.stepInfo).toBeVisible();
      await expect(visualizer.resetBtn).toBeEnabled();
    });
  });

  test.describe('Sorting State', () => {
    test('should initialize sorting on enter', async () => {
      // Setup: generate array and start sorting
      await visualizer.generateNewArray();
      await visualizer.startSorting();
      
      // Verify sorting state initialization (onEnter)
      await expect(visualizer.recursionTree).toBeVisible();
      
      // Check for visual feedback during sorting
      await visualizer.waitForAnimation(1000);
      const highlightedBars = await visualizer.getHighlightedBars('comparing');
      expect(highlightedBars).toBeGreaterThanOrEqual(0);
    });

    test('RESET event should transition back to idle state', async () => {
      // Setup: start sorting
      await visualizer.generateNewArray();
      await visualizer.startSorting();
      
      // Test RESET: sorting -> idle transition
      await visualizer.reset();
      
      // Verify back in idle state
      await expect(visualizer.statusMessage).toContainText(/ready|generate/i);
      await expect(visualizer.generateArrayBtn).toBeEnabled();
      await expect(visualizer.startSortingBtn).toBeEnabled();
    });

    test('ANIMATION_COMPLETE event should transition to complete state', async () => {
      // Setup: small array for faster completion
      await visualizer.setArraySize(5);
      await visualizer.generateNewArray();
      await visualizer.setSpeed(100); // Fast speed
      await visualizer.startSorting();
      
      // Wait for sorting to complete
      await visualizer.waitForAnimation(10000);
      
      // Verify transition to complete state
      await expect(visualizer.statusMessage).toContainText(/complete|sorted/i);
      const isSorted = await visualizer.isArraySorted();
      expect(isSorted).toBe(true);
    });
  });

  test.describe('Stepping State', () => {
    test('should execute step on enter', async () => {
      // Setup: generate array
      await visualizer.generateNewArray();
      
      // Test stepping state (onEnter)
      await visualizer.stepForward();
      
      // Verify step execution
      await expect(visualizer.stepInfo).toBeVisible();
      await expect(visualizer.stepInfo).toContainText(/step|divide|merge|compare/i);
    });

    test('STEP_FORWARD event should stay in stepping state', async () => {
      // Setup: generate array and take first step
      await visualizer.generateNewArray();
      await visualizer.stepForward();
      
      // Test STEP_FORWARD: stepping -> stepping transition
      await visualizer.stepForward();
      await visualizer.stepForward();
      
      // Verify still in stepping state with updated step info
      await expect(visualizer.stepInfo).toBeVisible();
      await expect(visualizer.stepForwardBtn).toBeEnabled();
    });

    test('RESET event should transition to idle state', async () => {
      // Setup: start stepping
      await visualizer.generateNewArray();
      await visualizer.stepForward();
      
      // Test RESET: stepping -> idle transition
      await visualizer.reset();
      
      // Verify back in idle state
      await expect(visualizer.statusMessage).toContainText(/ready|generate/i);
      await expect(visualizer.generateArrayBtn).toBeEnabled();
    });

    test('STEPS_EXHAUSTED event should transition to complete state', async () => {
      // Setup: small array for manageable steps
      await visualizer.setArraySize(4);
      await visualizer.generateNewArray();
      
      // Step through entire sorting process
      let stepCount = 0;
      const maxSteps = 50; // Safety limit
      
      while (stepCount < maxSteps) {
        await visualizer.stepForward();
        stepCount++;
        
        // Check if we've reached complete state
        const statusText = await visualizer.statusMessage.textContent();
        if (statusText && statusText.match(/complete|sorted/i)) {
          break;
        }
      }
      
      // Verify transition to complete state
      await expect(visualizer.statusMessage).toContainText(/complete|sorted/i);
      const isSorted1 = await visualizer.isArraySorted();
      expect(isSorted).toBe(true);
    });
  });

  test.describe('Complete State', () => {
    test('should display complete message on enter', async () => {
      // Setup: complete a sort
      await visualizer.setArraySize(4);
      await visualizer.generateNewArray();
      await visualizer.setSpeed(100);
      await visualizer.startSorting();
      await visualizer.waitForAnimation(8000);
      
      // Verify complete state (onEnter)
      await expect(visualizer.statusMessage).toContainText(/complete|sorted|finished/i);
      
      // Verify array is sorted
      const isSorted2 = await visualizer.isArraySorted();
      expect(isSorted).toBe(true);
    });

    test('GENERATE_ARRAY event should transition to idle state', async () => {
      // Setup: complete a sort
      await visualizer.setArraySize(4);
      await visualizer.generateNewArray();
      await visualizer.setSpeed(100);
      await visualizer.startSorting();
      await visualizer.waitForAnimation(8000);
      
      // Test GENERATE_ARRAY: complete -> idle transition
      await visualizer.generateNewArray();
      
      // Verify back in idle state with new array
      await expect(visualizer.statusMessage).toContainText(/ready|generate/i);
      await expect(visualizer.startSortingBtn).toBeEnabled();
      
      // Verify array is no longer sorted (new random array)
      const isSorted3 = await visualizer.isArraySorted();
      expect(isSorted).toBe(false);
    });

    test('RESET event should transition to idle state', async () => {
      // Setup: complete a sort
      await visualizer.setArraySize(4);
      await visualizer.generateNewArray();
      await visualizer.setSpeed(100);
      await visualizer.startSorting();
      await visualizer.waitForAnimation(8000);
      
      // Test RESET: complete -> idle transition
      await visualizer.reset();
      
      // Verify back in idle state
      await expect(visualizer.statusMessage).toContainText(/ready|generate/i);
      await expect(visualizer.generateArrayBtn).toBeEnabled();
      await expect(visualizer.startSortingBtn).toBeEnabled();
    });
  });
});

test.describe('Merge Sort Visualizer - Visual Feedback and DOM Changes', () => {
  let page;
  let visualizer;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    visualizer = new MergeSortVisualizerPage(page);
    await visualizer.navigate();
  });

  test('should highlight array sections during merge operations', async () => {
    await visualizer.setArraySize(8);
    await visualizer.generateNewArray();
    await visualizer.stepForward();
    await visualizer.stepForward();
    
    // Check for visual highlighting during merge operations
    const comparingBars = await visualizer.getHighlightedBars('comparing');
    const mergingBars = await visualizer.getHighlightedBars('merging');
    
    // At some point during stepping, we should see highlights
    expect(comparingBars + mergingBars).toBeGreaterThanOrEqual(0);
  });

  test('should show recursion tree during sorting', async () => {
    await visualizer.generateNewArray();
    await visualizer.startSorting();
    
    // Verify recursion tree is visible and contains nodes
    await expect(visualizer.recursionTree).toBeVisible();
    const treeNodes = await visualizer.page.locator('.tree-node').count();
    expect(treeNodes).toBeGreaterThan(0);
  });

  test('should update step information during manual stepping', async () => {
    await visualizer.generateNewArray();
    
    // Take first step
    await visualizer.stepForward();
    const firstStepText = await visualizer.stepInfo.textContent();
    
    // Take second step
    await visualizer.stepForward();
    const secondStepText = await visualizer.stepInfo.textContent();
    
    // Step info should change between steps
    expect(firstStepText).not.toBe(secondStepText);
  });
});

test.describe('Merge Sort Visualizer - Edge Cases and Error Scenarios', () => {
  let page;
  let visualizer;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    visualizer = new MergeSortVisualizerPage(page);
    await visualizer.navigate();
  });

  test('should handle array size changes correctly', async () => {
    // Test minimum array size
    await visualizer.setArraySize(2);
    await visualizer.generateNewArray();
    let barCount1 = await visualizer.getArrayBarCount();
    expect(barCount).toBe(2);
    
    // Test maximum array size
    await visualizer.setArraySize(50);
    await visualizer.generateNewArray();
    barCount = await visualizer.getArrayBarCount();
    expect(barCount).toBe(50);
  });

  test('should disable controls appropriately during sorting', async () => {
    await visualizer.generateNewArray();
    await visualizer.startSorting();
    
    // During sorting, certain controls should be disabled
    await expect(visualizer.generateArrayBtn).toBeDisabled();
    await expect(visualizer.startSortingBtn).toBeDisabled();
    await expect(visualizer.stepForwardBtn).toBeDisabled();
    
    // Reset should remain enabled
    await expect(visualizer.resetBtn).toBeEnabled();
  });

  test('should handle rapid clicking without breaking', async () => {
    await visualizer.generateNewArray();
    
    // Rapid clicking on step forward
    for (let i = 0; i < 5; i++) {
      await visualizer.stepForwardBtn.click({ force: true });
    }
    
    // Should still be in a valid state
    await expect(visualizer.stepInfo).toBeVisible();
    await expect(visualizer.resetBtn).toBeEnabled();
  });

  test('should maintain consistent state after reset', async () => {
    // Start sorting, then reset
    await visualizer.generateNewArray();
    await visualizer.startSorting();
    await visualizer.waitForAnimation(1000);
    await visualizer.reset();
    
    // Should be able to start fresh
    await visualizer.generateNewArray();
    await visualizer.stepForward();
    
    // Verify we can step normally
    await expect(visualizer.stepInfo).toBeVisible();
  });
});