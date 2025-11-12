import { test, expect } from '@playwright/test';

test.describe('Binary Search Interactive Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/46899c90-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State - Idle', () => {
    test('should display initial UI elements', async ({ page }) => {
      // Verify title and subtitle
      await expect(page.locator('h1')).toContainText('Binary Search: Divide and Conquer');
      await expect(page.locator('.subtitle')).toContainText('Find elements efficiently in sorted arrays');
      
      // Verify control buttons are present
      await expect(page.locator('button:has-text("Generate New Array")')).toBeVisible();
      await expect(page.locator('input[type="number"]')).toBeVisible();
      await expect(page.locator('button:has-text("Start Search")')).toBeVisible();
      await expect(page.locator('button:has-text("Start Search")')).toBeDisabled();
    });

    test('should generate new array when clicking Generate New Array', async ({ page }) => {
      // Click generate array button
      await page.click('button:has-text("Generate New Array")');
      
      // Verify array elements are displayed
      const arrayElements = page.locator('.array-element');
      const count = await arrayElements.count();
      expect(count).toBeGreaterThanOrEqual(15);
      expect(count).toBeLessThanOrEqual(20);
      
      // Verify elements are sorted
      const values = await arrayElements.allTextContents();
      const numbers = values.map(v => parseInt(v));
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i - 1]);
      }
    });

    test('should remain in idle state when inputting target without array', async ({ page }) => {
      // Input target value
      await page.fill('input[type="number"]', '42');
      
      // Verify Start Search button remains disabled
      await expect(page.locator('button:has-text("Start Search")')).toBeDisabled();
    });
  });

  test.describe('Ready State', () => {
    test.beforeEach(async ({ page }) => {
      // Generate array first
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
    });

    test('should transition to ready state when setting target', async ({ page }) => {
      // Input target value
      await page.fill('input[type="number"]', '42');
      
      // Verify Start Search button is enabled
      await expect(page.locator('button:has-text("Start Search")')).toBeEnabled();
    });

    test('should update target value when changing input', async ({ page }) => {
      // Set initial target
      await page.fill('input[type="number"]', '42');
      await expect(page.locator('button:has-text("Start Search")')).toBeEnabled();
      
      // Change target
      await page.fill('input[type="number"]', '23');
      await expect(page.locator('button:has-text("Start Search")')).toBeEnabled();
    });

    test('should return to idle when generating new array', async ({ page }) => {
      // Set target to enter ready state
      await page.fill('input[type="number"]', '42');
      await expect(page.locator('button:has-text("Start Search")')).toBeEnabled();
      
      // Generate new array
      await page.click('button:has-text("Generate New Array")');
      
      // Verify Start Search is disabled again
      await expect(page.locator('button:has-text("Start Search")')).toBeDisabled();
    });
  });

  test.describe('Searching State', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Generate array and set target
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      // Get a valid target from the array
      const firstElement = await page.locator('.array-element').first().textContent();
      await page.fill('input[type="number"]', firstElement);
      
      // Start search
      await page.click('button:has-text("Start Search")');
      await page.waitForTimeout(300);
    });

    test('should initialize pointers when entering searching state', async ({ page }) => {
      // Verify pointer indicators are visible
      await expect(page.locator('.pointer-left')).toBeVisible();
      await expect(page.locator('.pointer-right')).toBeVisible();
      await expect(page.locator('.pointer-mid')).toBeVisible();
      
      // Verify step counter is initialized
      await expect(page.locator('.step-counter')).toContainText('Step: 0');
    });

    test('should show control buttons in searching state', async ({ page }) => {
      // Verify control buttons
      await expect(page.locator('button:has-text("Step Forward")')).toBeVisible();
      await expect(page.locator('button:has-text("Auto Play")')).toBeVisible();
      await expect(page.locator('button:has-text("Reset")')).toBeVisible();
      
      // Verify Start Search is hidden or disabled
      const startButton = page.locator('button:has-text("Start Search")');
      const isVisible = await startButton.isVisible();
      if (isVisible) {
        await expect(startButton).toBeDisabled();
      }
    });

    test('should adjust speed with slider', async ({ page }) => {
      // Verify speed slider is visible
      const speedSlider = page.locator('input[type="range"]');
      await expect(speedSlider).toBeVisible();
      
      // Change speed
      await speedSlider.fill('500');
      const value = await speedSlider.inputValue();
      expect(value).toBe('500');
    });
  });

  test.describe('Comparing State', () => {
    test.beforeEach(async ({ page }) => {
      // Setup and start search
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const midElement = await page.locator('.array-element').nth(10).textContent();
      await page.fill('input[type="number"]', midElement);
      await page.click('button:has-text("Start Search")');
      await page.waitForTimeout(300);
    });

    test('should highlight mid element when stepping forward', async ({ page }) => {
      // Click step forward
      await page.click('button:has-text("Step Forward")');
      await page.waitForTimeout(300);
      
      // Verify mid element is highlighted
      const midPointer = page.locator('.pointer-mid');
      await expect(midPointer).toBeVisible();
      
      // Verify comparison visualization
      await expect(page.locator('.comparison-display')).toBeVisible();
    });

    test('should update pointers after comparison', async ({ page }) => {
      // Step through multiple comparisons
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Step Forward")');
        await page.waitForTimeout(500);
        
        // Verify step counter increments
        await expect(page.locator('.step-counter')).toContainText(`Step: ${i + 1}`);
      }
    });
  });

  test.describe('Auto Playing State', () => {
    test.beforeEach(async ({ page }) => {
      // Setup with array and target
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const elements = await page.locator('.array-element').allTextContents();
      const target = elements[Math.floor(elements.length / 2)];
      await page.fill('input[type="number"]', target);
      await page.click('button:has-text("Start Search")');
      await page.waitForTimeout(300);
    });

    test('should start auto play and show pause button', async ({ page }) => {
      // Click auto play
      await page.click('button:has-text("Auto Play")');
      
      // Verify pause button appears
      await expect(page.locator('button:has-text("Pause")')).toBeVisible();
      
      // Verify animation is running
      await page.waitForTimeout(1000);
      const stepText = await page.locator('.step-counter').textContent();
      const stepNumber = parseInt(stepText.match(/\d+/)[0]);
      expect(stepNumber).toBeGreaterThan(0);
    });

    test('should pause auto play and return to searching state', async ({ page }) => {
      // Start auto play
      await page.click('button:has-text("Auto Play")');
      await page.waitForTimeout(1000);
      
      // Pause
      await page.click('button:has-text("Pause")');
      
      // Verify returned to manual controls
      await expect(page.locator('button:has-text("Step Forward")')).toBeVisible();
      await expect(page.locator('button:has-text("Auto Play")')).toBeVisible();
    });

    test('should adjust speed during auto play', async ({ page }) => {
      // Start auto play
      await page.click('button:has-text("Auto Play")');
      
      // Adjust speed slider
      const speedSlider1 = page.locator('input[type="range"]');
      await speedSlider.fill('200');
      
      // Verify speed change takes effect
      const value1 = await speedSlider.inputValue();
      expect(value).toBe('200');
    });
  });

  test.describe('Found State', () => {
    test('should show found animation when target is found', async ({ page }) => {
      // Generate array and get an existing element
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const targetElement = await page.locator('.array-element').nth(5).textContent();
      await page.fill('input[type="number"]', targetElement);
      await page.click('button:has-text("Start Search")');
      
      // Auto play to find element
      await page.click('button:has-text("Auto Play")');
      
      // Wait for found state
      await page.waitForSelector('.found-animation', { timeout: 10000 });
      
      // Verify found message
      await expect(page.locator('.result-message')).toContainText('Found');
      
      // Verify found element is highlighted
      const foundElement = page.locator('.array-element.found');
      await expect(foundElement).toHaveClass(/found|highlight|success/);
    });

    test('should allow reset from found state', async ({ page }) => {
      // Setup to reach found state
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const targetElement1 = await page.locator('.array-element').first().textContent();
      await page.fill('input[type="number"]', targetElement);
      await page.click('button:has-text("Start Search")');
      await page.click('button:has-text("Auto Play")');
      
      // Wait for found state
      await page.waitForSelector('.found-animation', { timeout: 10000 });
      
      // Reset
      await page.click('button:has-text("Reset")');
      
      // Verify returned to idle state
      await expect(page.locator('button:has-text("Start Search")')).toBeDisabled();
      await expect(page.locator('.pointer-left')).not.toBeVisible();
    });
  });

  test.describe('Not Found State', () => {
    test('should show not found animation when target is not in array', async ({ page }) => {
      // Generate array
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      // Use a target that's definitely not in the array
      await page.fill('input[type="number"]', '9999');
      await page.click('button:has-text("Start Search")');
      
      // Auto play to exhaust search
      await page.click('button:has-text("Auto Play")');
      
      // Wait for not found state
      await page.waitForSelector('.not-found-animation', { timeout: 10000 });
      
      // Verify not found message
      await expect(page.locator('.result-message')).toContainText('Not Found');
    });

    test('should clear highlights when resetting from not found state', async ({ page }) => {
      // Setup to reach not found state
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      await page.fill('input[type="number"]', '-1');
      await page.click('button:has-text("Start Search")');
      await page.click('button:has-text("Auto Play")');
      
      // Wait for not found state
      await page.waitForSelector('.not-found-animation', { timeout: 10000 });
      
      // Reset
      await page.click('button:has-text("Reset")');
      
      // Verify all highlights are cleared
      const highlightedElements = await page.locator('.array-element.highlighted').count();
      expect(highlightedElements).toBe(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty target input', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      // Clear input
      await page.fill('input[type="number"]', '');
      
      // Verify Start Search is disabled
      await expect(page.locator('button:has-text("Start Search")')).toBeDisabled();
    });

    test('should handle searching for first element', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const firstElement1 = await page.locator('.array-element').first().textContent();
      await page.fill('input[type="number"]', firstElement);
      await page.click('button:has-text("Start Search")');
      await page.click('button:has-text("Auto Play")');
      
      // Should find quickly
      await expect(page.locator('.found-animation')).toBeVisible({ timeout: 5000 });
    });

    test('should handle searching for last element', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const lastElement = await page.locator('.array-element').last().textContent();
      await page.fill('input[type="number"]', lastElement);
      await page.click('button:has-text("Start Search")');
      await page.click('button:has-text("Auto Play")');
      
      // Should find element
      await expect(page.locator('.found-animation')).toBeVisible({ timeout: 10000 });
    });

    test('should handle rapid clicking of step forward', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      const midElement1 = await page.locator('.array-element').nth(8).textContent();
      await page.fill('input[type="number"]', midElement);
      await page.click('button:has-text("Start Search")');
      
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Step Forward")');
        await page.waitForTimeout(100);
      }
      
      // Should handle gracefully without errors
      await expect(page.locator('.step-counter')).toBeVisible();
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show search space highlighting', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      await page.fill('input[type="number"]', '50');
      await page.click('button:has-text("Start Search")');
      await page.click('button:has-text("Step Forward")');
      await page.waitForTimeout(500);
      
      // Verify active search range is highlighted
      const activeElements = await page.locator('.array-element.active').count();
      expect(activeElements).toBeGreaterThan(0);
      
      // Verify excluded elements are grayed out
      const excludedElements = await page.locator('.array-element.excluded').count();
      expect(excludedElements).toBeGreaterThanOrEqual(0);
    });

    test('should show comparison visualization', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      await page.fill('input[type="number"]', '25');
      await page.click('button:has-text("Start Search")');
      await page.click('button:has-text("Step Forward")');
      
      // Verify comparison display shows target vs mid
      await expect(page.locator('.comparison-display')).toBeVisible();
      await expect(page.locator('.comparison-display')).toContainText(/[<>=]/);
    });

    test('should animate pointer movements', async ({ page }) => {
      await page.click('button:has-text("Generate New Array")');
      await page.waitForTimeout(300);
      
      await page.fill('input[type="number"]', '30');
      await page.click('button:has-text("Start Search")');
      
      // Get initial pointer positions
      const leftPointer = page.locator('.pointer-left');
      const initialLeft = await leftPointer.boundingBox();
      
      // Step forward
      await page.click('button:has-text("Step Forward")');
      await page.waitForTimeout(1000);
      
      // Step again to see pointer movement
      await page.click('button:has-text("Step Forward")');
      await page.waitForTimeout(1000);
      
      // Verify pointer has moved
      const newLeft = await leftPointer.boundingBox();
      expect(newLeft).not.toEqual(initialLeft);
    });
  });
});