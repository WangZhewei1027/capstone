import { test, expect } from '@playwright/test';

// Page Object for Binary Search Visualization
class BinarySearchPage {
  constructor(page) {
    this.page = page;
    
    // Controls
    this.targetInput = page.locator('#target-input');
    this.searchButton = page.locator('#search-button');
    this.nextStepButton = page.locator('#next-step');
    this.previousStepButton = page.locator('#previous-step');
    this.autoPlayButton = page.locator('#auto-play');
    this.pauseButton = page.locator('#pause');
    this.resetButton = page.locator('#reset');
    this.speedSlider = page.locator('#speed-slider');
    this.generateArrayButton = page.locator('#generate-array');
    this.arraySizeSelect = page.locator('#array-size');
    
    // Visualization elements
    this.arrayContainer = page.locator('#array-container');
    this.arrayElements = page.locator('.array-element');
    this.leftPointer = page.locator('#left-pointer');
    this.midPointer = page.locator('#mid-pointer');
    this.rightPointer = page.locator('#right-pointer');
    this.statusBar = page.locator('#status-bar');
    this.comparisonCount = page.locator('#comparison-count');
    this.currentState = page.locator('#current-state');
    
    // Visual feedback elements
    this.searchSpace = page.locator('.search-space');
    this.fadedElements = page.locator('.faded');
    this.glowingElement = page.locator('.glowing');
    this.pulsingElement = page.locator('.pulsing');
  }

  async navigate() {
    await this.page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/449c7290-bf83-11f0-a230-7b3d5f0a2067.html');
    await this.page.waitForLoadState('networkidle');
  }

  async setTarget(value) {
    await this.targetInput.fill(value.toString());
    await this.searchButton.click();
  }

  async clickArrayElement(index) {
    await this.arrayElements.nth(index).click();
  }

  async waitForState(state) {
    await expect(this.currentState).toHaveText(state, { timeout: 5000 });
  }

  async getArrayValues() {
    const elements = await this.arrayElements.all();
    const values = [];
    for (const element of elements) {
      const text = await element.textContent();
      values.push(parseInt(text));
    }
    return values;
  }

  async getPointerPositions() {
    const left = await this.leftPointer.getAttribute('data-index');
    const mid = await this.midPointer.getAttribute('data-index');
    const right = await this.rightPointer.getAttribute('data-index');
    return {
      left: parseInt(left),
      mid: parseInt(mid),
      right: parseInt(right)
    };
  }
}

test.describe('Binary Search Interactive Visualization', () => {
  let page;
  let binarySearch;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    binarySearch = new BinarySearchPage(page);
    await binarySearch.navigate();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial State - Idle', () => {
    test('should start in idle state with controls properly initialized', async () => {
      await binarySearch.waitForState('idle');
      
      // Verify initial UI state
      await expect(binarySearch.targetInput).toBeEnabled();
      await expect(binarySearch.searchButton).toBeEnabled();
      await expect(binarySearch.generateArrayButton).toBeEnabled();
      await expect(binarySearch.nextStepButton).toBeDisabled();
      await expect(binarySearch.autoPlayButton).toBeDisabled();
      await expect(binarySearch.resetButton).toBeDisabled();
    });

    test('should generate new array when clicking generate button', async () => {
      const initialArray = await binarySearch.getArrayValues();
      await binarySearch.generateArrayButton.click();
      const newArray = await binarySearch.getArrayValues();
      
      expect(newArray).not.toEqual(initialArray);
      expect(newArray).toEqual([...newArray].sort((a, b) => a - b)); // Verify sorted
    });

    test('should allow array size selection', async () => {
      await binarySearch.arraySizeSelect.selectOption('15');
      await binarySearch.generateArrayButton.click();
      
      const arrayCount = await binarySearch.arrayElements.count();
      expect(arrayCount).toBe(15);
    });
  });

  test.describe('Ready State - Target Set', () => {
    test('should transition to ready state when target is set', async () => {
      await binarySearch.setTarget(42);
      await binarySearch.waitForState('ready');
      
      // Verify controls are enabled
      await expect(binarySearch.nextStepButton).toBeEnabled();
      await expect(binarySearch.autoPlayButton).toBeEnabled();
      await expect(binarySearch.resetButton).toBeEnabled();
      
      // Verify search space is highlighted
      await expect(binarySearch.searchSpace).toBeVisible();
    });

    test('should set target by clicking array element', async () => {
      await binarySearch.clickArrayElement(3);
      await binarySearch.waitForState('ready');
      
      const targetValue = await binarySearch.targetInput.inputValue();
      const clickedValue = await binarySearch.arrayElements.nth(3).textContent();
      expect(targetValue).toBe(clickedValue);
    });

    test('should update target when new value is set', async () => {
      await binarySearch.setTarget(10);
      await binarySearch.waitForState('ready');
      
      await binarySearch.setTarget(20);
      await expect(binarySearch.targetInput).toHaveValue('20');
      await binarySearch.waitForState('ready');
    });
  });

  test.describe('Searching State - Manual Step Through', () => {
    test('should perform binary search step by step', async () => {
      // Setup array and target
      await binarySearch.setTarget(50);
      await binarySearch.waitForState('ready');
      
      // First step - calculate midpoint
      await binarySearch.nextStepButton.click();
      await binarySearch.waitForState('searching');
      
      // Verify midpoint calculation
      const pointers = await binarySearch.getPointerPositions();
      expect(pointers.mid).toBe(Math.floor((pointers.left + pointers.right) / 2));
      
      // Should transition to comparing state
      await expect(binarySearch.pulsingElement).toBeVisible();
    });

    test('should adjust search space when going left', async () => {
      await binarySearch.setTarget(10); // Small value to go left
      await binarySearch.waitForState('ready');
      
      await binarySearch.nextStepButton.click();
      await page.waitForTimeout(500); // Wait for animation
      
      // Verify right section fades
      const rightElements = await page.locator('.array-element.faded').count();
      expect(rightElements).toBeGreaterThan(0);
      
      // Verify pointers updated
      const pointers1 = await binarySearch.getPointerPositions();
      expect(pointers.right).toBeLessThan(await binarySearch.arrayElements.count() - 1);
    });

    test('should adjust search space when going right', async () => {
      await binarySearch.setTarget(90); // Large value to go right
      await binarySearch.waitForState('ready');
      
      await binarySearch.nextStepButton.click();
      await page.waitForTimeout(500); // Wait for animation
      
      // Verify left section fades
      const leftElements = await page.locator('.array-element.faded').count();
      expect(leftElements).toBeGreaterThan(0);
    });
  });

  test.describe('Auto Play Functionality', () => {
    test('should auto play search with animation', async () => {
      await binarySearch.setTarget(75);
      await binarySearch.waitForState('ready');
      
      // Start auto play
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('autoPlaying');
      
      // Verify pause button is visible
      await expect(binarySearch.pauseButton).toBeVisible();
      await expect(binarySearch.autoPlayButton).not.toBeVisible();
      
      // Wait for some steps to complete
      await page.waitForTimeout(2000);
      
      // Verify comparison count increases
      const comparisons = await binarySearch.comparisonCount.textContent();
      expect(parseInt(comparisons)).toBeGreaterThan(0);
    });

    test('should pause and resume auto play', async () => {
      await binarySearch.setTarget(50);
      await binarySearch.waitForState('ready');
      
      // Start auto play
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('autoPlaying');
      
      // Pause
      await binarySearch.pauseButton.click();
      await binarySearch.waitForState('paused');
      await expect(binarySearch.autoPlayButton).toBeVisible();
      
      // Resume
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('autoPlaying');
    });

    test('should adjust animation speed', async () => {
      await binarySearch.setTarget(60);
      await binarySearch.waitForState('ready');
      
      // Set slow speed
      await binarySearch.speedSlider.fill('100');
      
      await binarySearch.autoPlayButton.click();
      const startTime = Date.now();
      
      // Wait for completion
      await binarySearch.waitForState('success', { timeout: 10000 });
      const slowDuration = Date.now() - startTime;
      
      // Reset and try with fast speed
      await binarySearch.resetButton.click();
      await binarySearch.setTarget(60);
      await binarySearch.speedSlider.fill('10');
      
      const fastStartTime = Date.now();
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('success', { timeout: 10000 });
      const fastDuration = Date.now() - fastStartTime;
      
      expect(fastDuration).toBeLessThan(slowDuration);
    });
  });

  test.describe('Success State - Element Found', () => {
    test('should show success state when element is found', async () => {
      const arrayValues = await binarySearch.getArrayValues();
      const targetValue1 = arrayValues[Math.floor(arrayValues.length / 2)];
      
      await binarySearch.setTarget(targetValue);
      await binarySearch.waitForState('ready');
      
      // Run search
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('success');
      
      // Verify visual feedback
      await expect(binarySearch.glowingElement).toBeVisible();
      await expect(binarySearch.glowingElement).toHaveText(targetValue.toString());
      
      // Verify status message
      await expect(binarySearch.statusBar).toContainText('Found');
    });

    test('should allow reset after success', async () => {
      const arrayValues1 = await binarySearch.getArrayValues();
      await binarySearch.setTarget(arrayValues[0]);
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('success');
      
      await binarySearch.resetButton.click();
      await binarySearch.waitForState('idle');
      
      // Verify visualization is reset
      await expect(binarySearch.glowingElement).not.toBeVisible();
      await expect(binarySearch.fadedElements).toHaveCount(0);
    });
  });

  test.describe('Failure State - Element Not Found', () => {
    test('should show failure state when element is not found', async () => {
      await binarySearch.setTarget(999); // Value not in array
      await binarySearch.waitForState('ready');
      
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('failure');
      
      // Verify visual feedback
      await expect(binarySearch.pulsingElement).toBeVisible();
      await expect(binarySearch.statusBar).toContainText('Not found');
    });

    test('should handle edge case - empty search space', async () => {
      await binarySearch.setTarget(-1); // Value smaller than all elements
      await binarySearch.waitForState('ready');
      
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('failure');
      
      const comparisons1 = await binarySearch.comparisonCount.textContent();
      expect(parseInt(comparisons)).toBeGreaterThan(0);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle invalid target input', async () => {
      await binarySearch.targetInput.fill('abc');
      await binarySearch.searchButton.click();
      
      // Should remain in idle state
      await expect(binarySearch.currentState).toHaveText('idle');
      await expect(binarySearch.nextStepButton).toBeDisabled();
    });

    test('should handle array boundaries correctly', async () => {
      const arrayValues2 = await binarySearch.getArrayValues();
      
      // Test first element
      await binarySearch.setTarget(arrayValues[0]);
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('success');
      
      // Test last element
      await binarySearch.resetButton.click();
      await binarySearch.setTarget(arrayValues[arrayValues.length - 1]);
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('success');
    });

    test('should maintain state consistency during rapid interactions', async () => {
      await binarySearch.setTarget(50);
      await binarySearch.waitForState('ready');
      
      // Rapid clicking
      await binarySearch.nextStepButton.click();
      await binarySearch.nextStepButton.click();
      await binarySearch.resetButton.click();
      
      await binarySearch.waitForState('idle');
      
      // Verify clean state
      await expect(binarySearch.fadedElements).toHaveCount(0);
      await expect(binarySearch.targetInput).toHaveValue('');
    });
  });

  test.describe('Visual Feedback and Animations', () => {
    test('should show pointer animations during search', async () => {
      await binarySearch.setTarget(45);
      await binarySearch.waitForState('ready');
      
      const initialPointers = await binarySearch.getPointerPositions();
      
      await binarySearch.nextStepButton.click();
      await page.waitForTimeout(300); // Wait for animation
      
      const updatedPointers = await binarySearch.getPointerPositions();
      
      // At least one pointer should have moved
      expect(
        initialPointers.left !== updatedPointers.left ||
        initialPointers.mid !== updatedPointers.mid ||
        initialPointers.right !== updatedPointers.right
      ).toBeTruthy();
    });

    test('should highlight current comparison', async () => {
      await binarySearch.setTarget(30);
      await binarySearch.waitForState('ready');
      
      await binarySearch.nextStepButton.click();
      
      // Verify middle element is pulsing
      const midIndex = await binarySearch.midPointer.getAttribute('data-index');
      const midElement = binarySearch.arrayElements.nth(parseInt(midIndex));
      
      await expect(midElement).toHaveClass(/pulsing/);
    });

    test('should show performance metrics', async () => {
      await binarySearch.setTarget(70);
      await binarySearch.waitForState('ready');
      
      await binarySearch.autoPlayButton.click();
      await binarySearch.waitForState('success');
      
      // Verify comparison count
      const comparisons2 = await binarySearch.comparisonCount.textContent();
      const arraySize = await binarySearch.arrayElements.count();
      const maxComparisons = Math.ceil(Math.log2(arraySize));
      
      expect(parseInt(comparisons)).toBeLessThanOrEqual(maxComparisons);
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to smaller viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify controls stack vertically
      const controlPanel = page.locator('#control-panel');
      await expect(controlPanel).toHaveCSS('flex-direction', 'column');
      
      // Verify array elements are smaller
      const firstElement = binarySearch.arrayElements.first();
      const box = await firstElement.boundingBox();
      expect(box.width).toBeLessThanOrEqual(40);
    });

    test('should maintain touch-friendly tap targets', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const buttons = [
        binarySearch.searchButton,
        binarySearch.nextStepButton,
        binarySearch.autoPlayButton,
        binarySearch.resetButton
      ];
      
      for (const button of buttons) {
        const box1 = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });
});