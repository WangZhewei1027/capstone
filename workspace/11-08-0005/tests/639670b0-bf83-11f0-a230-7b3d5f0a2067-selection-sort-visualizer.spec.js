import { test, expect } from '@playwright/test';

test.describe('Selection Sort Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/639670b0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should start in initial state with no bars displayed', async ({ page }) => {
      // Verify initial state
      const barsContainer = await page.locator('.bars-container');
      const bars = await barsContainer.locator('.bar').count();
      expect(bars).toBe(0);
      
      // Verify controls are in correct state
      await expect(page.locator('#generateBtn')).toBeEnabled();
      await expect(page.locator('#stepBtn')).toBeDisabled();
      await expect(page.locator('#autoPlayBtn')).toBeDisabled();
      await expect(page.locator('#resetBtn')).toBeDisabled();
    });
  });

  test.describe('Ready State', () => {
    test('should transition to ready state when generating array', async ({ page }) => {
      // Generate array
      await page.click('#generateBtn');
      
      // Wait for bars to render
      await page.waitForSelector('.bar');
      
      // Verify bars are rendered
      const bars1 = await page.locator('.bar').count();
      expect(bars).toBeGreaterThan(0);
      expect(bars).toBeLessThanOrEqual(10);
      
      // Verify controls are enabled
      await expect(page.locator('#stepBtn')).toBeEnabled();
      await expect(page.locator('#autoPlayBtn')).toBeEnabled();
      await expect(page.locator('#resetBtn')).toBeEnabled();
      
      // Verify status message
      await expect(page.locator('.status-message')).toContainText('Ready to sort');
    });

    test('should generate new array when clicking generate again', async ({ page }) => {
      // Generate first array
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Get first array values
      const firstValues = await page.locator('.bar-value').allTextContents();
      
      // Generate second array
      await page.click('#generateBtn');
      await page.waitForTimeout(300); // Wait for animation
      
      // Get second array values
      const secondValues = await page.locator('.bar-value').allTextContents();
      
      // Arrays should be different (with high probability)
      expect(firstValues.join(',')).not.toBe(secondValues.join(','));
    });

    test('should allow custom array size', async ({ page }) => {
      // Set custom size
      await page.fill('#sizeInput', '5');
      await page.click('#generateBtn');
      
      // Verify correct number of bars
      const bars2 = await page.locator('.bar').count();
      expect(bars).toBe(5);
    });
  });

  test.describe('Finding Min State', () => {
    test('should start finding minimum when stepping', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Start sorting
      await page.click('#stepBtn');
      
      // Verify highlighting
      await expect(page.locator('.bar.current-min')).toHaveCount(1);
      await expect(page.locator('.bar.comparing')).toHaveCount(1);
      
      // Verify status message
      await expect(page.locator('.status-message')).toContainText('Comparing');
    });

    test('should continue finding minimum through multiple steps', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      const totalBars = await page.locator('.bar').count();
      
      // Step through finding minimum
      await page.click('#stepBtn');
      
      for (let i = 0; i < totalBars - 1; i++) {
        const comparingBars = await page.locator('.bar.comparing').count();
        expect(comparingBars).toBeGreaterThan(0);
        
        await page.click('#stepBtn');
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('Swapping State', () => {
    test('should perform swap when minimum is found', async ({ page }) => {
      // Setup small array for predictable behavior
      await page.fill('#sizeInput', '3');
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Get initial values
      const initialValues = await page.locator('.bar-value').allTextContents();
      
      // Step through until swap occurs
      let swapOccurred = false;
      for (let i = 0; i < 10; i++) {
        await page.click('#stepBtn');
        await page.waitForTimeout(100);
        
        if (await page.locator('.bar.swapping').count() > 0) {
          swapOccurred = true;
          break;
        }
      }
      
      // Verify swap animation occurred
      expect(swapOccurred).toBe(true);
    });
  });

  test.describe('Auto Play State', () => {
    test('should start auto play when clicking play button', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Start auto play
      await page.click('#autoPlayBtn');
      
      // Verify button changed to pause
      await expect(page.locator('#autoPlayBtn')).toContainText('Pause');
      
      // Verify automatic progression
      const initialComparingCount = await page.locator('.bar.comparing').count();
      await page.waitForTimeout(1000);
      const laterComparingCount = await page.locator('.bar.comparing').count();
      
      // Should have progressed
      expect(initialComparingCount).not.toBe(laterComparingCount);
    });

    test('should pause auto play when clicking pause', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Start auto play
      await page.click('#autoPlayBtn');
      await page.waitForTimeout(500);
      
      // Pause
      await page.click('#autoPlayBtn');
      
      // Verify button changed back to play
      await expect(page.locator('#autoPlayBtn')).toContainText('Auto Play');
      
      // Verify no further progression
      const pausedState = await page.locator('.bar').evaluateAll(bars => 
        bars.map(bar => bar.className)
      );
      
      await page.waitForTimeout(1000);
      
      const laterState = await page.locator('.bar').evaluateAll(bars => 
        bars.map(bar => bar.className)
      );
      
      expect(pausedState).toEqual(laterState);
    });

    test('should respect speed control', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Set slow speed
      await page.fill('#speedInput', '2000');
      
      // Start auto play
      await page.click('#autoPlayBtn');
      
      const startTime = Date.now();
      
      // Wait for one step
      await page.waitForFunction(() => {
        const comparing = document.querySelectorAll('.bar.comparing');
        return comparing.length > 0;
      });
      
      const firstStepTime = Date.now() - startTime;
      
      // Should take approximately 2 seconds
      expect(firstStepTime).toBeGreaterThan(1500);
      expect(firstStepTime).toBeLessThan(2500);
    });
  });

  test.describe('Sorted State', () => {
    test('should reach sorted state and show completion', async ({ page }) => {
      // Setup small array for faster sorting
      await page.fill('#sizeInput', '3');
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Auto play to completion
      await page.fill('#speedInput', '100');
      await page.click('#autoPlayBtn');
      
      // Wait for completion
      await page.waitForSelector('.bar.sorted', { timeout: 10000 });
      
      // Verify all bars are sorted
      const sortedBars = await page.locator('.bar.sorted').count();
      const totalBars1 = await page.locator('.bar').count();
      expect(sortedBars).toBe(totalBars);
      
      // Verify completion message
      await expect(page.locator('.status-message')).toContainText('Sorting complete');
      
      // Verify controls
      await expect(page.locator('#stepBtn')).toBeDisabled();
      await expect(page.locator('#autoPlayBtn')).toBeDisabled();
    });

    test('should verify array is actually sorted', async ({ page }) => {
      // Setup small array
      await page.fill('#sizeInput', '5');
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Sort array
      await page.fill('#speedInput', '50');
      await page.click('#autoPlayBtn');
      
      // Wait for completion
      await page.waitForSelector('.bar.sorted', { timeout: 15000 });
      
      // Get final values
      const values = await page.locator('.bar-value').allTextContents();
      const numericValues = values.map(v => parseInt(v));
      
      // Verify sorted order
      for (let i = 1; i < numericValues.length; i++) {
        expect(numericValues[i]).toBeGreaterThanOrEqual(numericValues[i - 1]);
      }
    });
  });

  test.describe('Reset Functionality', () => {
    test('should reset to ready state from any state', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Start sorting
      await page.click('#stepBtn');
      await page.waitForSelector('.bar.comparing');
      
      // Reset
      await page.click('#resetBtn');
      
      // Verify reset
      await expect(page.locator('.bar.comparing')).toHaveCount(0);
      await expect(page.locator('.bar.current-min')).toHaveCount(0);
      await expect(page.locator('.bar.sorted')).toHaveCount(0);
      await expect(page.locator('.status-message')).toContainText('Ready to sort');
    });

    test('should reset from auto play state', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Start auto play
      await page.click('#autoPlayBtn');
      await page.waitForTimeout(500);
      
      // Reset
      await page.click('#resetBtn');
      
      // Verify auto play stopped
      await expect(page.locator('#autoPlayBtn')).toContainText('Auto Play');
      
      // Verify reset state
      await expect(page.locator('.bar.comparing')).toHaveCount(0);
      await expect(page.locator('.bar.current-min')).toHaveCount(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle array size limits', async ({ page }) => {
      // Test minimum size
      await page.fill('#sizeInput', '1');
      await page.click('#generateBtn');
      
      let bars3 = await page.locator('.bar').count();
      expect(bars).toBeGreaterThanOrEqual(2); // Should enforce minimum
      
      // Test maximum size
      await page.fill('#sizeInput', '100');
      await page.click('#generateBtn');
      
      bars = await page.locator('.bar').count();
      expect(bars).toBeLessThanOrEqual(20); // Should enforce maximum
    });

    test('should handle invalid size input', async ({ page }) => {
      // Test non-numeric input
      await page.fill('#sizeInput', 'abc');
      await page.click('#generateBtn');
      
      // Should use default size
      const bars4 = await page.locator('.bar').count();
      expect(bars).toBeGreaterThan(0);
      expect(bars).toBeLessThanOrEqual(10);
    });

    test('should handle rapid clicking', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Rapid step clicking
      for (let i = 0; i < 5; i++) {
        await page.click('#stepBtn');
      }
      
      // Should not break
      await expect(page.locator('.visualization-area')).toBeVisible();
      
      // Rapid generate clicking
      for (let i = 0; i < 3; i++) {
        await page.click('#generateBtn');
        await page.waitForTimeout(100);
      }
      
      // Should have bars
      const bars5 = await page.locator('.bar').count();
      expect(bars).toBeGreaterThan(0);
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show proper visual indicators during sorting', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Step through sorting
      await page.click('#stepBtn');
      
      // Verify visual indicators
      await expect(page.locator('.bar.current-min')).toHaveCSS('background-color', 'rgb(231, 76, 60)');
      await expect(page.locator('.bar.comparing')).toHaveCSS('background-color', 'rgb(243, 156, 18)');
      
      // Continue until swap
      for (let i = 0; i < 10; i++) {
        await page.click('#stepBtn');
        if (await page.locator('.bar.swapping').count() > 0) {
          await expect(page.locator('.bar.swapping')).toHaveCSS('background-color', 'rgb(155, 89, 182)');
          break;
        }
      }
    });

    test('should show indices and values on bars', async ({ page }) => {
      // Setup
      await page.click('#generateBtn');
      await page.waitForSelector('.bar');
      
      // Verify indices
      const indices = await page.locator('.bar-index').allTextContents();
      for (let i = 0; i < indices.length; i++) {
        expect(indices[i]).toBe(i.toString());
      }
      
      // Verify values are displayed
      const values1 = await page.locator('.bar-value').allTextContents();
      values.forEach(value => {
        expect(parseInt(value)).toBeGreaterThan(0);
        expect(parseInt(value)).toBeLessThanOrEqual(100);
      });
    });
  });
});