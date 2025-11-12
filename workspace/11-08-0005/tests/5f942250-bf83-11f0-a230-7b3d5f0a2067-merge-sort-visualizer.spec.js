import { test, expect } from '@playwright/test';

// Page Object for Merge Sort Visualizer
class MergeSortVisualizerPage {
  constructor(page) {
    this.page = page;
    
    // Control buttons
    this.generateArrayButton = page.locator('button:has-text("Generate New Array")');
    this.startSortingButton = page.locator('button:has-text("Start Sorting")');
    this.stepForwardButton = page.locator('button:has-text("Step Forward")');
    this.resetButton = page.locator('button:has-text("Reset")');
    
    // Speed control
    this.speedSlider = page.locator('input[type="range"]');
    this.speedLabel = page.locator('.speed-control span');
    
    // Visualization elements
    this.arrayContainer = page.locator('.array-container');
    this.bars = page.locator('.bar');
    this.statusText = page.locator('.status');
    this.phaseText = page.locator('.phase');
    
    // Tree visualization
    this.treeContainer = page.locator('.tree-container');
    this.treeNodes = page.locator('.tree-node');
  }
  
  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/5f942250-bf83-11f0-a230-7b3d5f0a2067.html');
  }
  
  async getBarValues() {
    const values = await this.bars.evaluateAll(bars => 
      bars.map(bar => parseInt(bar.querySelector('.bar-value').textContent))
    );
    return values;
  }
  
  async getBarClasses(index) {
    const bar = this.bars.nth(index);
    const classes = await bar.getAttribute('class');
    return classes.split(' ');
  }
  
  async waitForAnimation() {
    await this.page.waitForTimeout(500);
  }
  
  async isControlEnabled(button) {
    return !(await button.isDisabled());
  }
}

test.describe('Merge Sort Visualizer - FSM State Transitions', () => {
  let page;
  let visualizer;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    visualizer = new MergeSortVisualizerPage(page);
    await visualizer.navigate();
  });
  
  test('Initial state should be idle with controls enabled', async () => {
    // Verify idle state
    await expect(visualizer.statusText).toContainText('Ready to sort');
    
    // Verify controls are enabled in idle state
    await expect(visualizer.generateArrayButton).toBeEnabled();
    await expect(visualizer.startSortingButton).toBeEnabled();
    await expect(visualizer.stepForwardButton).toBeEnabled();
    await expect(visualizer.resetButton).toBeEnabled();
  });
  
  test('GENERATE_ARRAY event should stay in idle state', async () => {
    // Generate initial array
    await visualizer.generateArrayButton.click();
    await visualizer.waitForAnimation();
    
    // Should remain in idle state
    await expect(visualizer.statusText).toContainText('Ready to sort');
    await expect(visualizer.generateArrayButton).toBeEnabled();
    
    // Generate another array
    await visualizer.generateArrayButton.click();
    await visualizer.waitForAnimation();
    
    // Still in idle state
    await expect(visualizer.statusText).toContainText('Ready to sort');
  });
  
  test('START_SORTING event should transition from idle to sorting state', async () => {
    // Start from idle
    await expect(visualizer.statusText).toContainText('Ready to sort');
    
    // Trigger START_SORTING
    await visualizer.startSortingButton.click();
    
    // Should transition to sorting state
    await expect(visualizer.statusText).toContainText('Sorting');
    
    // Controls should be disabled (onEnter)
    await expect(visualizer.generateArrayButton).toBeDisabled();
    await expect(visualizer.startSortingButton).toBeDisabled();
    await expect(visualizer.stepForwardButton).toBeDisabled();
  });
  
  test('Sorting state should handle DIVIDE event and transition to dividing', async () => {
    // Start sorting
    await visualizer.startSortingButton.click();
    await visualizer.waitForAnimation();
    
    // Should see dividing phase
    await expect(visualizer.phaseText).toContainText('Dividing');
    
    // Should highlight division range (onEnter)
    const highlightedBars = await visualizer.bars.filter({ hasClass: 'dividing' }).count();
    expect(highlightedBars).toBeGreaterThan(0);
  });
  
  test('Dividing state should complete and return to sorting', async () => {
    // Start sorting
    await visualizer.startSortingButton.click();
    
    // Wait for divide phase to complete
    await page.waitForFunction(() => {
      const phase = document.querySelector('.phase');
      return phase && !phase.textContent.includes('Dividing');
    }, { timeout: 10000 });
    
    // Should clear highlights after dividing (onExit)
    const highlightedBars1 = await visualizer.bars.filter({ hasClass: 'dividing' }).count();
    expect(highlightedBars).toBe(0);
  });
  
  test('Sorting state should handle MERGE event and transition to merging', async () => {
    // Start sorting and wait for merge phase
    await visualizer.startSortingButton.click();
    
    await page.waitForFunction(() => {
      const phase1 = document.querySelector('.phase1');
      return phase && phase.textContent.includes('Merging');
    }, { timeout: 15000 });
    
    // Should be in merging state
    await expect(visualizer.phaseText).toContainText('Merging');
  });
  
  test('Merging state should handle COMPARE event and transition to comparing', async () => {
    // Start sorting
    await visualizer.startSortingButton.click();
    
    // Wait for comparing phase
    await page.waitForFunction(() => {
      const bars = document.querySelectorAll('.bar.comparing');
      return bars.length > 0;
    }, { timeout: 15000 });
    
    // Should highlight compared elements (onEnter)
    const comparingBars = await visualizer.bars.filter({ hasClass: 'comparing' }).count();
    expect(comparingBars).toBeGreaterThan(0);
  });
  
  test('Complete sorting should transition to complete state', async () => {
    // Use a small array for faster completion
    await visualizer.speedSlider.fill('100');
    await visualizer.generateArrayButton.click();
    await visualizer.startSortingButton.click();
    
    // Wait for completion
    await page.waitForFunction(() => {
      const status = document.querySelector('.status');
      return status && status.textContent.includes('Sorted!');
    }, { timeout: 30000 });
    
    // Should be in complete state
    await expect(visualizer.statusText).toContainText('Sorted!');
    
    // All bars should be marked as sorted (onEnter)
    const sortedBars = await visualizer.bars.filter({ hasClass: 'sorted' }).count();
    const totalBars = await visualizer.bars.count();
    expect(sortedBars).toBe(totalBars);
    
    // Controls should be re-enabled
    await expect(visualizer.generateArrayButton).toBeEnabled();
    await expect(visualizer.resetButton).toBeEnabled();
  });
  
  test('RESET event should transition back to idle from any state', async () => {
    // Test reset from sorting state
    await visualizer.startSortingButton.click();
    await visualizer.waitForAnimation();
    await visualizer.resetButton.click();
    
    // Should be back in idle
    await expect(visualizer.statusText).toContainText('Ready to sort');
    await expect(visualizer.startSortingButton).toBeEnabled();
    
    // Test reset from complete state
    await visualizer.speedSlider.fill('100');
    await visualizer.startSortingButton.click();
    await page.waitForFunction(() => {
      const status1 = document.querySelector('.status1');
      return status && status.textContent.includes('Sorted!');
    }, { timeout: 30000 });
    
    await visualizer.resetButton.click();
    await expect(visualizer.statusText).toContainText('Ready to sort');
  });
  
  test('Step-by-step mode should work correctly', async () => {
    // Enable step mode
    await visualizer.stepForwardButton.click();
    
    // Should show step mode indicator
    await expect(visualizer.page.locator('text=Step Mode')).toBeVisible();
    
    // Step through sorting
    await visualizer.startSortingButton.click();
    
    // Should pause after each step
    await expect(visualizer.stepForwardButton).toContainText('Next Step');
    
    // Continue stepping
    await visualizer.stepForwardButton.click();
    await visualizer.waitForAnimation();
    
    // Should still be in step mode
    await expect(visualizer.page.locator('text=Step Mode')).toBeVisible();
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
  
  test('Array bars should update height based on values', async () => {
    await visualizer.generateArrayButton.click();
    await visualizer.waitForAnimation();
    
    const values1 = await visualizer.getBarValues();
    const bars1 = await visualizer.bars1.all();
    
    for (let i = 0; i < bars.length; i++) {
      const height = await bars[i].evaluate(el => parseInt(el.style.height));
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThanOrEqual(280); // Max height based on CSS
    }
  });
  
  test('Tree visualization should show divide and conquer structure', async () => {
    await visualizer.startSortingButton.click();
    await visualizer.waitForAnimation();
    
    // Tree nodes should appear
    await expect(visualizer.treeNodes.first()).toBeVisible();
    
    // Tree should have multiple levels
    const levels = await visualizer.page.locator('.tree-level').count();
    expect(levels).toBeGreaterThan(1);
  });
  
  test('Comparison counter should increment during sorting', async () => {
    const initialComparisons = await visualizer.page.locator('text=/Comparisons: \\d+/').textContent();
    const initialCount = parseInt(initialComparisons.match(/\d+/)[0]);
    
    await visualizer.startSortingButton.click();
    
    // Wait for some comparisons
    await page.waitForFunction(() => {
      const text = document.body.textContent;
      const match = text.match(/Comparisons: (\d+)/);
      return match && parseInt(match[1]) > 0;
    }, { timeout: 10000 });
    
    const finalComparisons = await visualizer.page.locator('text=/Comparisons: \\d+/').textContent();
    const finalCount = parseInt(finalComparisons.match(/\d+/)[0]);
    
    expect(finalCount).toBeGreaterThan(initialCount);
  });
  
  test('Speed control should affect animation speed', async () => {
    // Set to slow speed
    await visualizer.speedSlider.fill('10');
    await expect(visualizer.speedLabel).toContainText('10ms');
    
    const startTime = Date.now();
    await visualizer.startSortingButton.click();
    
    // Wait for first few operations
    await page.waitForTimeout(2000);
    await visualizer.resetButton.click();
    
    // Set to fast speed
    await visualizer.speedSlider.fill('90');
    await expect(visualizer.speedLabel).toContainText('90ms');
    
    // Speed should be reflected in transitions
    const speedValue = await visualizer.speedSlider.inputValue();
    expect(parseInt(speedValue)).toBe(90);
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
  
  test('Should handle multiple rapid clicks gracefully', async () => {
    // Rapid generate array clicks
    await Promise.all([
      visualizer.generateArrayButton.click(),
      visualizer.generateArrayButton.click(),
      visualizer.generateArrayButton.click()
    ]);
    
    // Should still be in valid state
    await expect(visualizer.statusText).toContainText('Ready to sort');
    const barCount = await visualizer.bars.count();
    expect(barCount).toBeGreaterThan(0);
  });
  
  test('Should not allow starting sort while already sorting', async () => {
    await visualizer.startSortingButton.click();
    
    // Button should be disabled
    await expect(visualizer.startSortingButton).toBeDisabled();
    
    // Try to click anyway
    await visualizer.startSortingButton.click({ force: true });
    
    // Should still be sorting normally
    await expect(visualizer.statusText).toContainText('Sorting');
  });
  
  test('Should maintain array integrity after sorting', async () => {
    // Get initial values
    await visualizer.generateArrayButton.click();
    await visualizer.waitForAnimation();
    const initialValues = await visualizer.getBarValues();
    const sortedExpected = [...initialValues].sort((a, b) => a - b);
    
    // Sort
    await visualizer.speedSlider.fill('100');
    await visualizer.startSortingButton.click();
    
    // Wait for completion
    await page.waitForFunction(() => {
      const status2 = document.querySelector('.status2');
      return status && status.textContent.includes('Sorted!');
    }, { timeout: 30000 });
    
    // Verify sorted correctly
    const finalValues = await visualizer.getBarValues();
    expect(finalValues).toEqual(sortedExpected);
  });
  
  test('Should handle browser refresh during sorting', async () => {
    await visualizer.startSortingButton.click();
    await visualizer.waitForAnimation();
    
    // Refresh page
    await page.reload();
    
    // Should be back in idle state
    await expect(visualizer.statusText).toContainText('Ready to sort');
    await expect(visualizer.startSortingButton).toBeEnabled();
  });
  
  test('Should properly clean up highlights after reset', async () => {
    await visualizer.startSortingButton.click();
    
    // Wait for some highlighting
    await page.waitForFunction(() => {
      const highlighted = document.querySelectorAll('.bar.comparing, .bar.dividing, .bar.merging');
      return highlighted.length > 0;
    }, { timeout: 10000 });
    
    // Reset
    await visualizer.resetButton.click();
    await visualizer.waitForAnimation();
    
    // No bars should have special classes
    const highlightedCount = await visualizer.bars.filter({ 
      hasClass: /comparing|dividing|merging|sorted/ 
    }).count();
    expect(highlightedCount).toBe(0);
  });
});