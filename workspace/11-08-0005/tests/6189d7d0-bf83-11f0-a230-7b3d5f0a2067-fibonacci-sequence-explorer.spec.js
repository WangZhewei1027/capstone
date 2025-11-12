import { test, expect } from '@playwright/test';

test.describe('Fibonacci Sequence Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/6189d7d0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should display initial UI elements', async ({ page }) => {
      // Verify title and subtitle
      await expect(page.locator('h1')).toHaveText('Fibonacci Sequence Explorer');
      await expect(page.locator('.subtitle')).toContainText('Discover the mathematical beauty');

      // Verify initial sequence display
      const fibNumbers = page.locator('.fib-number');
      await expect(fibNumbers).toHaveCount(2);
      await expect(fibNumbers.nth(0)).toContainText('0');
      await expect(fibNumbers.nth(1)).toContainText('1');

      // Verify controls are present
      await expect(page.locator('#nextBtn')).toBeVisible();
      await expect(page.locator('#resetBtn')).toBeVisible();
      await expect(page.locator('#spiralSlider')).toBeVisible();
      
      // Verify canvas is present
      await expect(page.locator('#spiralCanvas')).toBeVisible();
    });

    test('should display current state as idle', async ({ page }) => {
      await expect(page.locator('#currentState')).toHaveText('idle');
    });
  });

  test.describe('Generating State', () => {
    test('should transition to generating state when clicking Next', async ({ page }) => {
      // Click Next button
      await page.locator('#nextBtn').click();
      
      // Verify state transition
      await expect(page.locator('#currentState')).toHaveText('generating');
      
      // Wait for generation to complete
      await page.waitForTimeout(100);
      
      // Verify new number is added
      const fibNumbers1 = page.locator('.fib-number');
      await expect(fibNumbers).toHaveCount(3);
      await expect(fibNumbers.nth(2)).toContainText('1');
    });

    test('should calculate correct Fibonacci numbers', async ({ page }) => {
      const expectedSequence = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
      
      // Generate multiple numbers
      for (let i = 2; i < expectedSequence.length; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(150);
        
        const fibNumbers2 = page.locator('.fib-number');
        await expect(fibNumbers).toHaveCount(i + 1);
        await expect(fibNumbers.nth(i)).toContainText(expectedSequence[i].toString());
      }
    });

    test('should update equation display', async ({ page }) => {
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(150);
      
      const equation = page.locator('#equation');
      await expect(equation).toContainText('F(2) = F(1) + F(0) = 1 + 0 = 1');
    });

    test('should stop at maximum length of 20', async ({ page }) => {
      // Generate numbers until max length
      for (let i = 0; i < 20; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(50);
      }
      
      // Verify we have 20 numbers (including initial 2)
      const fibNumbers3 = page.locator('.fib-number');
      await expect(fibNumbers).toHaveCount(20);
      
      // Try to add one more
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(150);
      
      // Should still have 20 numbers
      await expect(fibNumbers).toHaveCount(20);
      
      // Verify state returns to idle
      await expect(page.locator('#currentState')).toHaveText('idle');
    });
  });

  test.describe('Highlighting State', () => {
    test('should highlight numbers after generation', async ({ page }) => {
      await page.locator('#nextBtn').click();
      
      // Wait for highlighting state
      await page.waitForTimeout(100);
      await expect(page.locator('#currentState')).toHaveText('highlighting');
      
      // Check for highlight class
      const highlightedNumbers = page.locator('.fib-number.highlight');
      await expect(highlightedNumbers).toHaveCount(2);
      
      // Wait for highlight timeout
      await page.waitForTimeout(1100);
      
      // Verify highlights are removed and state returns to idle
      await expect(page.locator('.fib-number.highlight')).toHaveCount(0);
      await expect(page.locator('#currentState')).toHaveText('idle');
    });
  });

  test.describe('Resetting State', () => {
    test('should reset sequence when clicking Reset', async ({ page }) => {
      // Generate some numbers first
      for (let i = 0; i < 5; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(150);
      }
      
      // Verify we have more than 2 numbers
      let fibNumbers4 = page.locator('.fib-number');
      await expect(fibNumbers).toHaveCount(7);
      
      // Click reset
      await page.locator('#resetBtn').click();
      
      // Verify state transition
      await expect(page.locator('#currentState')).toHaveText('resetting');
      
      // Wait for reset to complete
      await page.waitForTimeout(100);
      
      // Verify sequence is reset
      fibNumbers = page.locator('.fib-number');
      await expect(fibNumbers).toHaveCount(2);
      await expect(fibNumbers.nth(0)).toContainText('0');
      await expect(fibNumbers.nth(1)).toContainText('1');
      
      // Verify state returns to idle
      await expect(page.locator('#currentState')).toHaveText('idle');
      
      // Verify equation is reset
      await expect(page.locator('#equation')).toHaveText('Click "Next" to generate the next number');
    });
  });

  test.describe('Displaying Info State', () => {
    test('should display number info when clicking a number', async ({ page }) => {
      // Generate a few numbers first
      for (let i = 0; i < 3; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(150);
      }
      
      // Click on a number
      const targetNumber = page.locator('.fib-number').nth(3);
      await targetNumber.click();
      
      // Verify state transition
      await expect(page.locator('#currentState')).toHaveText('displaying_info');
      
      // Verify info panel is visible
      const infoPanel = page.locator('#infoPanel');
      await expect(infoPanel).toBeVisible();
      
      // Verify info content
      await expect(infoPanel.locator('h3')).toContainText('Number Details');
      await expect(infoPanel).toContainText('Position: 3');
      await expect(infoPanel).toContainText('Value: 2');
      
      // Wait for state to return to idle
      await page.waitForTimeout(100);
      await expect(page.locator('#currentState')).toHaveText('idle');
    });

    test('should calculate golden ratio for larger numbers', async ({ page }) => {
      // Generate numbers up to position 6
      for (let i = 0; i < 5; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(150);
      }
      
      // Click on the 6th number (value should be 8)
      const targetNumber1 = page.locator('.fib-number').nth(6);
      await targetNumber.click();
      
      // Verify golden ratio is displayed
      const infoPanel1 = page.locator('#infoPanel1');
      await expect(infoPanel).toContainText('Ratio to previous:');
      await expect(infoPanel).toContainText('Golden ratio difference:');
    });
  });

  test.describe('Updating Spiral State', () => {
    test('should update spiral when adjusting slider', async ({ page }) => {
      // Get initial canvas state
      const canvas = page.locator('#spiralCanvas');
      await expect(canvas).toBeVisible();
      
      // Adjust slider
      const slider = page.locator('#spiralSlider');
      await slider.fill('10');
      
      // Verify state transition
      await expect(page.locator('#currentState')).toHaveText('updating_spiral');
      
      // Wait for spiral to be drawn
      await page.waitForTimeout(100);
      
      // Verify state returns to idle
      await expect(page.locator('#currentState')).toHaveText('idle');
      
      // Verify slider value display
      await expect(page.locator('#sliderValue')).toHaveText('10');
    });

    test('should handle slider range correctly', async ({ page }) => {
      const slider1 = page.locator('#spiralSlider');
      
      // Test minimum value
      await slider.fill('1');
      await expect(page.locator('#sliderValue')).toHaveText('1');
      
      // Test maximum value
      await slider.fill('15');
      await expect(page.locator('#sliderValue')).toHaveText('15');
      
      // Test intermediate value
      await slider.fill('8');
      await expect(page.locator('#sliderValue')).toHaveText('8');
    });
  });

  test.describe('Complex Interactions', () => {
    test('should handle rapid clicking without breaking state', async ({ page }) => {
      // Rapidly click Next button
      for (let i = 0; i < 5; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(50);
      }
      
      // Wait for all transitions to complete
      await page.waitForTimeout(1500);
      
      // Verify state is stable
      await expect(page.locator('#currentState')).toHaveText('idle');
      
      // Verify sequence integrity
      const fibNumbers5 = page.locator('.fib-number');
      const count = await fibNumbers.count();
      expect(count).toBeGreaterThan(2);
      expect(count).toBeLessThanOrEqual(20);
    });

    test('should maintain state consistency during multiple operations', async ({ page }) => {
      // Generate some numbers
      for (let i = 0; i < 3; i++) {
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(200);
      }
      
      // Click a number
      await page.locator('.fib-number').nth(2).click();
      await page.waitForTimeout(100);
      
      // Adjust slider while info is displayed
      await page.locator('#spiralSlider').fill('12');
      await page.waitForTimeout(100);
      
      // Reset
      await page.locator('#resetBtn').click();
      await page.waitForTimeout(100);
      
      // Verify final state
      await expect(page.locator('#currentState')).toHaveText('idle');
      await expect(page.locator('.fib-number')).toHaveCount(2);
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show proper visual feedback during transitions', async ({ page }) => {
      // Test button hover states
      const nextBtn = page.locator('#nextBtn');
      await nextBtn.hover();
      await expect(nextBtn).toHaveCSS('transform', 'matrix(1.05, 0, 0, 1.05, 0, 0)');
      
      // Test number hover effect
      const fibNumber = page.locator('.fib-number').first();
      await fibNumber.hover();
      await expect(fibNumber).toHaveCSS('transform', 'matrix(1.05, 0, 0, 1.05, 0, 0)');
    });

    test('should display proper animations', async ({ page }) => {
      // Click next and verify pulse animation
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(100);
      
      // Check for highlight class with animation
      const highlighted = page.locator('.fib-number.highlight');
      await expect(highlighted).toHaveCount(2);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle reset when already at initial state', async ({ page }) => {
      // Click reset without generating any numbers
      await page.locator('#resetBtn').click();
      
      // Verify state transitions properly
      await expect(page.locator('#currentState')).toHaveText('resetting');
      await page.waitForTimeout(100);
      await expect(page.locator('#currentState')).toHaveText('idle');
      
      // Verify sequence remains unchanged
      const fibNumbers6 = page.locator('.fib-number');
      await expect(fibNumbers).toHaveCount(2);
    });

    test('should handle clicking on initial numbers', async ({ page }) => {
      // Click on the first number (0)
      await page.locator('.fib-number').first().click();
      
      // Verify info is displayed correctly
      const infoPanel2 = page.locator('#infoPanel2');
      await expect(infoPanel).toBeVisible();
      await expect(infoPanel).toContainText('Position: 0');
      await expect(infoPanel).toContainText('Value: 0');
    });
  });
});