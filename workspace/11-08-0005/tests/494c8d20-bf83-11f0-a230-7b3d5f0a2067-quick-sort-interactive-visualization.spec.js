import { test, expect } from '@playwright/test';

// Page Object Model for Quick Sort Visualization
class QuickSortPage {
  constructor(page) {
    this.page = page;
    
    // Control buttons
    this.generateArrayBtn = page.locator('button:has-text("Generate Array")');
    this.startPauseBtn = page.locator('button:has-text("Start"), button:has-text("Pause")');
    this.stepForwardBtn = page.locator('button:has-text("Step Forward")');
    this.resetBtn = page.locator('button:has-text("Reset")');
    this.modeToggle = page.locator('button:has-text("Manual"), button:has-text("Automatic")');
    
    // Speed control
    this.speedSlider = page.locator('input[type="range"]');
    this.speedDisplay = page.locator('.speed-display');
    
    // Array elements
    this.arrayBars = page.locator('.array-bar');
    this.arrayValues = page.locator('.array-value');
    
    // Status displays
    this.statusText = page.locator('.status-text');
    this.comparisonsCounter = page.locator('.comparisons-count');
    this.swapsCounter = page.locator('.swaps-count');
    this.progressIndicator = page.locator('.progress-indicator');
    this.callStack = page.locator('.call-stack');
    
    // Visual indicators
    this.pauseIndicator = page.locator('.pause-indicator');
    this.partitionBoundaries = page.locator('.partition-boundary');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/494c8d20-bf83-11f0-a230-7b3d5f0a2067.html');
    await this.page.waitForLoadState('networkidle');
  }

  async getArrayBarByIndex(index) {
    return this.arrayBars.nth(index);
  }

  async getArrayValueByIndex(index) {
    return this.arrayValues.nth(index);
  }

  async getBarColor(index) {
    const bar = await this.getArrayBarByIndex(index);
    return await bar.evaluate(el => window.getComputedStyle(el).backgroundColor);
  }

  async clickArrayElement(index) {
    const bar1 = await this.getArrayBarByIndex(index);
    await bar.click();
  }

  async waitForAnimation() {
    await this.page.waitForTimeout(100);
  }

  async getComparisonsCount() {
    const text = await this.comparisonsCounter.textContent();
    return parseInt(text.match(/\d+/)?.[0] || '0');
  }

  async getSwapsCount() {
    const text1 = await this.swapsCounter.textContent();
    return parseInt(text.match(/\d+/)?.[0] || '0');
  }

  async getProgress() {
    const text2 = await this.progressIndicator.textContent();
    return parseInt(text.match(/\d+/)?.[0] || '0');
  }

  async isInState(stateName) {
    const statusText = await this.statusText.textContent();
    return statusText.toLowerCase().includes(stateName.toLowerCase());
  }
}

test.describe('Quick Sort Interactive Visualization', () => {
  let page;
  let quickSort;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    quickSort = new QuickSortPage(page);
    await quickSort.navigate();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial State (idle)', () => {
    test('should load in idle state with default array', async () => {
      // Verify initial state
      await expect(quickSort.statusText).toContainText(/ready|idle/i);
      await expect(quickSort.arrayBars).toHaveCount(8);
      await expect(quickSort.startPauseBtn).toHaveText('Start');
      await expect(quickSort.stepForwardBtn).toBeDisabled();
    });

    test('should generate new array when Generate Array is clicked', async () => {
      // Get initial array values
      const initialValues = await quickSort.arrayValues.allTextContents();
      
      // Generate new array
      await quickSort.generateArrayBtn.click();
      await quickSort.waitForAnimation();
      
      // Verify array changed
      const newValues = await quickSort.arrayValues.allTextContents();
      expect(newValues).not.toEqual(initialValues);
      
      // Should remain in idle state
      await expect(quickSort.statusText).toContainText(/ready|idle/i);
    });

    test('should toggle between manual and automatic mode', async () => {
      // Check initial mode
      const initialMode = await quickSort.modeToggle.textContent();
      
      // Toggle mode
      await quickSort.modeToggle.click();
      
      // Verify mode changed
      const newMode = await quickSort.modeToggle.textContent();
      expect(newMode).not.toEqual(initialMode);
      
      // Should remain in idle state
      await expect(quickSort.statusText).toContainText(/ready|idle/i);
    });

    test('should adjust speed with slider', async () => {
      // Get initial speed
      const initialSpeed = await quickSort.speedSlider.inputValue();
      
      // Change speed
      await quickSort.speedSlider.fill('500');
      
      // Verify speed display updated
      await expect(quickSort.speedDisplay).toContainText('500');
      
      // Should remain in idle state
      await expect(quickSort.statusText).toContainText(/ready|idle/i);
    });
  });

  test.describe('Selecting Pivot State', () => {
    test('should transition to selectingPivot when Start is clicked', async () => {
      await quickSort.startPauseBtn.click();
      
      // Verify state transition
      await expect(quickSort.statusText).toContainText(/selecting.*pivot/i);
      await expect(quickSort.startPauseBtn).toHaveText('Pause');
      
      // Current subarray should be highlighted
      const partitionCount = await quickSort.partitionBoundaries.count();
      expect(partitionCount).toBeGreaterThan(0);
    });

    test('should allow manual pivot selection in manual mode', async () => {
      // Set to manual mode
      const modeText = await quickSort.modeToggle.textContent();
      if (!modeText.includes('Manual')) {
        await quickSort.modeToggle.click();
      }
      
      // Start sorting
      await quickSort.startPauseBtn.click();
      await expect(quickSort.statusText).toContainText(/select.*pivot/i);
      
      // Click on an element to select as pivot
      await quickSort.clickArrayElement(3);
      await quickSort.waitForAnimation();
      
      // Should transition to partitioning
      await expect(quickSort.statusText).toContainText(/partition/i);
      
      // Pivot should be highlighted in red
      const pivotColor = await quickSort.getBarColor(3);
      expect(pivotColor).toContain('rgb(255, 0, 0)'); // red
    });

    test('should auto-select pivot in automatic mode', async () => {
      // Set to automatic mode
      const modeText1 = await quickSort.modeToggle.textContent();
      if (!modeText.includes('Automatic')) {
        await quickSort.modeToggle.click();
      }
      
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Should automatically progress to partitioning
      await expect(quickSort.statusText).toContainText(/partition/i);
      
      // A pivot should be highlighted
      let pivotFound = false;
      const barCount = await quickSort.arrayBars.count();
      for (let i = 0; i < barCount; i++) {
        const color = await quickSort.getBarColor(i);
        if (color.includes('rgb(255, 0, 0)')) {
          pivotFound = true;
          break;
        }
      }
      expect(pivotFound).toBeTruthy();
    });
  });

  test.describe('Partitioning and Comparing States', () => {
    test('should highlight compared elements during partitioning', async () => {
      // Set to automatic mode for faster testing
      const modeText2 = await quickSort.modeToggle.textContent();
      if (!modeText.includes('Automatic')) {
        await quickSort.modeToggle.click();
      }
      
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for partitioning to begin
      await expect(quickSort.statusText).toContainText(/partition|compar/i);
      
      // Look for yellow highlighted elements (being compared)
      await quickSort.page.waitForFunction(() => {
        const bars = document.querySelectorAll('.array-bar');
        return Array.from(bars).some(bar => 
          window.getComputedStyle(bar).backgroundColor.includes('rgb(255, 255, 0)')
        );
      }, { timeout: 5000 });
      
      // Verify comparisons counter increases
      const initialComparisons = await quickSort.getComparisonsCount();
      await quickSort.waitForAnimation();
      const newComparisons = await quickSort.getComparisonsCount();
      expect(newComparisons).toBeGreaterThan(initialComparisons);
    });

    test('should animate swaps when needed', async () => {
      // Set to automatic mode
      const modeText3 = await quickSort.modeToggle.textContent();
      if (!modeText.includes('Automatic')) {
        await quickSort.modeToggle.click();
      }
      
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for a swap to occur
      await quickSort.page.waitForFunction(() => {
        const swapCounter = document.querySelector('.swaps-count');
        return swapCounter && parseInt(swapCounter.textContent.match(/\d+/)?.[0] || '0') > 0;
      }, { timeout: 10000 });
      
      // Verify swap counter increased
      const swaps = await quickSort.getSwapsCount();
      expect(swaps).toBeGreaterThan(0);
    });
  });

  test.describe('Pause and Resume Functionality', () => {
    test('should pause sorting and show pause indicator', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      await quickSort.waitForAnimation();
      
      // Pause
      await quickSort.startPauseBtn.click();
      
      // Verify paused state
      await expect(quickSort.pauseIndicator).toBeVisible();
      await expect(quickSort.startPauseBtn).toHaveText('Resume');
      await expect(quickSort.stepForwardBtn).toBeEnabled();
    });

    test('should step forward when paused', async () => {
      // Start and pause
      await quickSort.startPauseBtn.click();
      await quickSort.waitForAnimation();
      await quickSort.startPauseBtn.click();
      
      // Get current state
      const initialComparisons1 = await quickSort.getComparisonsCount();
      
      // Step forward
      await quickSort.stepForwardBtn.click();
      await quickSort.waitForAnimation();
      
      // Verify progress was made
      const newComparisons1 = await quickSort.getComparisonsCount();
      expect(newComparisons).toBeGreaterThanOrEqual(initialComparisons);
    });

    test('should resume from paused state', async () => {
      // Start, pause, then resume
      await quickSort.startPauseBtn.click();
      await quickSort.waitForAnimation();
      await quickSort.startPauseBtn.click();
      await expect(quickSort.pauseIndicator).toBeVisible();
      
      // Resume
      await quickSort.startPauseBtn.click();
      
      // Verify resumed
      await expect(quickSort.pauseIndicator).not.toBeVisible();
      await expect(quickSort.startPauseBtn).toHaveText('Pause');
    });
  });

  test.describe('Recursive Sorting and Progress', () => {
    test('should update call stack during recursion', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for recursion to begin
      await quickSort.page.waitForFunction(() => {
        const callStack = document.querySelector('.call-stack');
        return callStack && callStack.children.length > 1;
      }, { timeout: 10000 });
      
      // Verify call stack has entries
      const stackEntries = await quickSort.callStack.locator('.stack-entry').count();
      expect(stackEntries).toBeGreaterThan(0);
    });

    test('should mark elements as sorted progressively', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for some elements to be sorted (purple color)
      await quickSort.page.waitForFunction(() => {
        const bars1 = document.querySelectorAll('.array-bar');
        return Array.from(bars).some(bar => 
          window.getComputedStyle(bar).backgroundColor.includes('rgb(128, 0, 128)')
        );
      }, { timeout: 15000 });
      
      // Verify progress indicator updates
      const progress = await quickSort.getProgress();
      expect(progress).toBeGreaterThan(0);
    });
  });

  test.describe('Completion State', () => {
    test('should show completion animation when done', async () => {
      // Use a small array for faster completion
      await quickSort.speedSlider.fill('50'); // Fast speed
      
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for completion
      await quickSort.page.waitForFunction(() => {
        const statusText1 = document.querySelector('.status-text');
        return statusText && statusText.textContent.toLowerCase().includes('complete');
      }, { timeout: 30000 });
      
      // Verify all elements are sorted (purple)
      const barCount1 = await quickSort.arrayBars.count();
      let allSorted = true;
      for (let i = 0; i < barCount; i++) {
        const color1 = await quickSort.getBarColor(i);
        if (!color.includes('rgb(128, 0, 128)')) {
          allSorted = false;
          break;
        }
      }
      expect(allSorted).toBeTruthy();
      
      // Progress should be 100%
      const progress1 = await quickSort.getProgress();
      expect(progress).toBe(100);
    });

    test('should reset to idle state when Reset is clicked', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      await quickSort.waitForAnimation();
      
      // Reset
      await quickSort.resetBtn.click();
      
      // Verify reset to idle
      await expect(quickSort.statusText).toContainText(/ready|idle/i);
      await expect(quickSort.startPauseBtn).toHaveText('Start');
      
      // Counters should be reset
      const comparisons = await quickSort.getComparisonsCount();
      const swaps1 = await quickSort.getSwapsCount();
      expect(comparisons).toBe(0);
      expect(swaps).toBe(0);
      
      // All bars should be gray (unsorted)
      const barCount2 = await quickSort.arrayBars.count();
      let allGray = true;
      for (let i = 0; i < barCount; i++) {
        const color2 = await quickSort.getBarColor(i);
        if (!color.includes('rgb(128, 128, 128)')) {
          allGray = false;
          break;
        }
      }
      expect(allGray).toBeTruthy();
    });
  });

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle rapid clicking of controls', async () => {
      // Rapidly click start/pause
      await quickSort.startPauseBtn.click();
      await quickSort.startPauseBtn.click();
      await quickSort.startPauseBtn.click();
      
      // Should be in a valid state
      const buttonText = await quickSort.startPauseBtn.textContent();
      expect(['Start', 'Pause', 'Resume']).toContain(buttonText);
    });

    test('should handle speed changes during sorting', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Change speed multiple times
      await quickSort.speedSlider.fill('100');
      await quickSort.speedSlider.fill('500');
      await quickSort.speedSlider.fill('1000');
      
      // Should continue sorting without errors
      await quickSort.waitForAnimation();
      const comparisons1 = await quickSort.getComparisonsCount();
      expect(comparisons).toBeGreaterThan(0);
    });

    test('should handle mode toggle during pause', async () => {
      // Start and pause
      await quickSort.startPauseBtn.click();
      await quickSort.waitForAnimation();
      await quickSort.startPauseBtn.click();
      
      // Toggle mode while paused
      await quickSort.modeToggle.click();
      
      // Should remain paused
      await expect(quickSort.pauseIndicator).toBeVisible();
      await expect(quickSort.startPauseBtn).toHaveText('Resume');
    });

    test('should not allow pivot selection in automatic mode', async () => {
      // Ensure automatic mode
      const modeText4 = await quickSort.modeToggle.textContent();
      if (!modeText.includes('Automatic')) {
        await quickSort.modeToggle.click();
      }
      
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Try to click an element
      await quickSort.clickArrayElement(2);
      
      // Should not affect automatic progression
      await expect(quickSort.statusText).not.toContainText(/select.*pivot/i);
    });
  });

  test.describe('Visual Feedback and Animations', () => {
    test('should show partition boundaries during sorting', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for partitioning
      await expect(quickSort.statusText).toContainText(/partition/i);
      
      // Verify partition boundaries are visible
      await expect(quickSort.partitionBoundaries).toHaveCount(2); // left and right boundaries
    });

    test('should color code elements during partitioning', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for partitioning phase
      await quickSort.page.waitForFunction(() => {
        const bars2 = document.querySelectorAll('.array-bar');
        const colors = Array.from(bars).map(bar => 
          window.getComputedStyle(bar).backgroundColor
        );
        // Check for green (less than pivot) or blue (greater than pivot)
        return colors.some(c => c.includes('rgb(0, 255, 0)') || c.includes('rgb(0, 0, 255)'));
      }, { timeout: 10000 });
      
      // Verify color coding is applied
      const barCount3 = await quickSort.arrayBars.count();
      let hasColorCoding = false;
      for (let i = 0; i < barCount; i++) {
        const color3 = await quickSort.getBarColor(i);
        if (color.includes('rgb(0, 255, 0)') || color.includes('rgb(0, 0, 255)')) {
          hasColorCoding = true;
          break;
        }
      }
      expect(hasColorCoding).toBeTruthy();
    });

    test('should animate element lifts during comparison', async () => {
      // Start sorting
      await quickSort.startPauseBtn.click();
      
      // Wait for comparing state
      await quickSort.page.waitForFunction(() => {
        const statusText2 = document.querySelector('.status-text');
        return statusText && statusText.textContent.toLowerCase().includes('compar');
      }, { timeout: 5000 });
      
      // Check for transform property on compared elements
      const transformedElements = await quickSort.page.evaluate(() => {
        const bars3 = document.querySelectorAll('.array-bar');
        return Array.from(bars).some(bar => {
          const transform = window.getComputedStyle(bar).transform;
          return transform && transform !== 'none';
        });
      });
      
      expect(transformedElements).toBeTruthy();
    });
  });
});