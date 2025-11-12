import { test, expect } from '@playwright/test';

// Test suite for Prim's Algorithm Visualization
test.describe('Prim\'s Algorithm Visualization', () => {
  const baseURL = 'http://127.0.0.1:5500/workspace/11-08-0005/html/64ab6320-bf83-11f0-a230-7b3d5f0a2067.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should start in initial state with correct UI elements', async ({ page }) => {
      // Verify initial state elements
      await expect(page.locator('h1')).toContainText("Prim's Algorithm");
      await expect(page.locator('#canvas')).toBeVisible();
      
      // Check that controls are disabled initially
      await expect(page.locator('#nextBtn')).toBeDisabled();
      await expect(page.locator('#prevBtn')).toBeDisabled();
      await expect(page.locator('#playBtn')).toBeDisabled();
      await expect(page.locator('#resetBtn')).toBeDisabled();
      
      // Verify instruction text
      await expect(page.locator('.state-info')).toContainText('Click on any vertex to start');
    });

    test('should display graph with vertices and edges', async ({ page }) => {
      // Wait for canvas to be ready
      const canvas = page.locator('#canvas');
      await expect(canvas).toBeVisible();
      
      // Verify canvas has content (graph is drawn)
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox.width).toBeGreaterThan(0);
      expect(canvasBox.height).toBeGreaterThan(0);
    });
  });

  test.describe('State Transitions', () => {
    test('should transition from initial to ready state on vertex click', async ({ page }) => {
      const canvas1 = page.locator('#canvas1');
      
      // Click on a vertex (approximate center of canvas where vertices are likely to be)
      await canvas.click({ position: { x: 300, y: 250 } });
      
      // Verify transition to ready state
      await expect(page.locator('#nextBtn')).toBeEnabled();
      await expect(page.locator('#playBtn')).toBeEnabled();
      await expect(page.locator('#resetBtn')).toBeEnabled();
      await expect(page.locator('#prevBtn')).toBeDisabled(); // Still at beginning
      
      // Check that a starting vertex is highlighted
      await expect(page.locator('.state-info')).not.toContainText('Click on any vertex to start');
    });

    test('should transition from ready to stepping state on next click', async ({ page }) => {
      const canvas2 = page.locator('#canvas2');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Click next
      await page.locator('#nextBtn').click();
      
      // Verify we're in stepping state
      await expect(page.locator('#prevBtn')).toBeEnabled();
      await expect(page.locator('.step-counter')).toBeVisible();
      await expect(page.locator('.current-edge')).toBeVisible();
    });

    test('should transition from ready to playing state on auto-play click', async ({ page }) => {
      const canvas3 = page.locator('#canvas3');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Click play
      await page.locator('#playBtn').click();
      
      // Verify we're in playing state (play button becomes pause)
      await expect(page.locator('#playBtn')).toContainText('Pause');
      
      // Wait a bit to see animation
      await page.waitForTimeout(2000);
      
      // Verify step counter is incrementing
      const stepText = await page.locator('.step-counter').textContent();
      expect(stepText).toMatch(/Step \d+ of \d+/);
    });

    test('should transition from playing to stepping state on pause click', async ({ page }) => {
      const canvas4 = page.locator('#canvas4');
      
      // Start algorithm and play
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      await page.locator('#playBtn').click();
      
      // Wait for animation to start
      await page.waitForTimeout(1000);
      
      // Pause
      await page.locator('#playBtn').click();
      
      // Verify we're back in stepping state
      await expect(page.locator('#playBtn')).toContainText('Play');
      await expect(page.locator('#nextBtn')).toBeEnabled();
      await expect(page.locator('#prevBtn')).toBeEnabled();
    });

    test('should transition to complete state when algorithm finishes', async ({ page }) => {
      const canvas5 = page.locator('#canvas5');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Click next repeatedly until complete
      let isComplete = false;
      for (let i = 0; i < 50; i++) { // Max iterations to prevent infinite loop
        const nextBtn = page.locator('#nextBtn');
        if (await nextBtn.isDisabled()) {
          break;
        }
        await nextBtn.click();
        await page.waitForTimeout(100);
        
        // Check if we reached complete state
        const stateInfo = await page.locator('.state-info').textContent();
        if (stateInfo.includes('Complete') || stateInfo.includes('Minimum spanning tree found')) {
          isComplete = true;
          break;
        }
      }
      
      // Verify complete state
      expect(isComplete).toBeTruthy();
      await expect(page.locator('#nextBtn')).toBeDisabled();
      await expect(page.locator('#playBtn')).toBeDisabled();
      await expect(page.locator('#prevBtn')).toBeEnabled();
      await expect(page.locator('#resetBtn')).toBeEnabled();
    });

    test('should reset to initial state from any state', async ({ page }) => {
      const canvas6 = page.locator('#canvas6');
      
      // Start algorithm and advance a few steps
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      await page.locator('#nextBtn').click();
      await page.locator('#nextBtn').click();
      
      // Reset
      await page.locator('#resetBtn').click();
      
      // Verify we're back in initial state
      await expect(page.locator('#nextBtn')).toBeDisabled();
      await expect(page.locator('#prevBtn')).toBeDisabled();
      await expect(page.locator('#playBtn')).toBeDisabled();
      await expect(page.locator('#resetBtn')).toBeDisabled();
      await expect(page.locator('.state-info')).toContainText('Click on any vertex to start');
    });
  });

  test.describe('Algorithm Visualization', () => {
    test('should highlight edges as they are added to MST', async ({ page }) => {
      const canvas7 = page.locator('#canvas7');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Take screenshot before
      const screenshotBefore = await canvas.screenshot();
      
      // Advance a few steps
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(300);
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(300);
      
      // Take screenshot after
      const screenshotAfter = await canvas.screenshot();
      
      // Verify visual changes occurred
      expect(Buffer.compare(screenshotBefore, screenshotAfter)).not.toBe(0);
    });

    test('should update MST edges list as algorithm progresses', async ({ page }) => {
      const canvas8 = page.locator('#canvas8');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Check initial MST edges count
      const initialEdges = await page.locator('.mst-edges li').count();
      
      // Advance algorithm
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(300);
      
      // Check MST edges increased
      const afterEdges = await page.locator('.mst-edges li').count();
      expect(afterEdges).toBeGreaterThan(initialEdges);
    });

    test('should display current edge being considered', async ({ page }) => {
      const canvas9 = page.locator('#canvas9');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Advance one step
      await page.locator('#nextBtn').click();
      
      // Verify current edge info is displayed
      await expect(page.locator('.current-edge')).toBeVisible();
      await expect(page.locator('.current-edge')).toContainText(/Edge:.*Weight:/);
    });

    test('should update total weight as edges are added', async ({ page }) => {
      const canvas10 = page.locator('#canvas10');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Get initial weight
      const initialWeightText = await page.locator('.total-weight').textContent();
      const initialWeight = parseFloat(initialWeightText.match(/[\d.]+/)?.[0] || '0');
      
      // Advance algorithm
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(300);
      await page.locator('#nextBtn').click();
      
      // Get updated weight
      const updatedWeightText = await page.locator('.total-weight').textContent();
      const updatedWeight = parseFloat(updatedWeightText.match(/[\d.]+/)?.[0] || '0');
      
      // Verify weight increased
      expect(updatedWeight).toBeGreaterThan(initialWeight);
    });
  });

  test.describe('Navigation Controls', () => {
    test('should navigate forward and backward through steps', async ({ page }) => {
      const canvas11 = page.locator('#canvas11');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Go forward several steps
      await page.locator('#nextBtn').click();
      await page.locator('#nextBtn').click();
      await page.locator('#nextBtn').click();
      
      // Get current step
      const stepForward = await page.locator('.step-counter').textContent();
      
      // Go back
      await page.locator('#prevBtn').click();
      
      // Verify step decreased
      const stepBack = await page.locator('.step-counter').textContent();
      const stepForwardNum = parseInt(stepForward.match(/Step (\d+)/)?.[1] || '0');
      const stepBackNum = parseInt(stepBack.match(/Step (\d+)/)?.[1] || '0');
      expect(stepBackNum).toBe(stepForwardNum - 1);
    });

    test('should disable prev button at first step', async ({ page }) => {
      const canvas12 = page.locator('#canvas12');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // At start, prev should be disabled
      await expect(page.locator('#prevBtn')).toBeDisabled();
      
      // After one step, prev should be enabled
      await page.locator('#nextBtn').click();
      await expect(page.locator('#prevBtn')).toBeEnabled();
      
      // Go back to start
      await page.locator('#prevBtn').click();
      await expect(page.locator('#prevBtn')).toBeDisabled();
    });
  });

  test.describe('Speed Control', () => {
    test('should adjust animation speed with slider', async ({ page }) => {
      const canvas13 = page.locator('#canvas13');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Set speed to minimum
      const speedSlider = page.locator('#speedSlider');
      await speedSlider.fill('1');
      
      // Start auto-play and measure time for a few steps
      const startTime = Date.now();
      await page.locator('#playBtn').click();
      
      // Wait for 3 steps
      await page.waitForFunction(() => {
        const stepText1 = document.querySelector('.step-counter')?.textContent || '';
        const match = stepText.match(/Step (\d+)/);
        return match && parseInt(match[1]) >= 3;
      }, { timeout: 10000 });
      
      const slowDuration = Date.now() - startTime;
      
      // Reset and try with max speed
      await page.locator('#resetBtn').click();
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      await speedSlider.fill('10');
      
      const fastStartTime = Date.now();
      await page.locator('#playBtn').click();
      
      // Wait for 3 steps again
      await page.waitForFunction(() => {
        const stepText2 = document.querySelector('.step-counter')?.textContent || '';
        const match1 = stepText.match1(/Step (\d+)/);
        return match && parseInt(match[1]) >= 3;
      }, { timeout: 10000 });
      
      const fastDuration = Date.now() - fastStartTime;
      
      // Fast should be significantly quicker than slow
      expect(fastDuration).toBeLessThan(slowDuration * 0.5);
    });

    test('should display current speed value', async ({ page }) => {
      const speedSlider1 = page.locator('#speedSlider1');
      const speedValue = page.locator('#speedValue');
      
      // Test different speed values
      await speedSlider.fill('5');
      await expect(speedValue).toHaveText('5');
      
      await speedSlider.fill('10');
      await expect(speedValue).toHaveText('10');
      
      await speedSlider.fill('1');
      await expect(speedValue).toHaveText('1');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle multiple vertex clicks before algorithm starts', async ({ page }) => {
      const canvas14 = page.locator('#canvas14');
      
      // Click multiple vertices
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(200);
      await canvas.click({ position: { x: 400, y: 300 } });
      await page.waitForTimeout(200);
      
      // Should still be in ready state with controls enabled
      await expect(page.locator('#nextBtn')).toBeEnabled();
      await expect(page.locator('#playBtn')).toBeEnabled();
    });

    test('should handle rapid clicking of controls', async ({ page }) => {
      const canvas15 = page.locator('#canvas15');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Rapid fire clicks
      const nextBtn1 = page.locator('#nextBtn1');
      for (let i = 0; i < 5; i++) {
        await nextBtn.click();
      }
      
      // Should still be in valid state
      await expect(page.locator('.step-counter')).toBeVisible();
      await expect(page.locator('.state-info')).not.toContainText('Click on any vertex');
    });

    test('should maintain state consistency during auto-play', async ({ page }) => {
      const canvas16 = page.locator('#canvas16');
      
      // Start algorithm and auto-play
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      await page.locator('#playBtn').click();
      
      // Try clicking next/prev during auto-play (should be disabled or handled)
      await page.waitForTimeout(1000);
      
      // These should either be disabled or pause the auto-play
      const nextBtn2 = page.locator('#nextBtn2');
      const prevBtn = page.locator('#prevBtn');
      
      // Verify controls are in expected state during play
      await expect(page.locator('#playBtn')).toContainText('Pause');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper keyboard navigation', async ({ page }) => {
      const canvas17 = page.locator('#canvas17');
      
      // Start algorithm
      await canvas.click({ position: { x: 300, y: 250 } });
      await page.waitForTimeout(500);
      
      // Tab through controls
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Press Enter on focused button
      await page.keyboard.press('Enter');
      
      // Verify action was taken
      await expect(page.locator('.step-counter')).toContainText(/Step \d+/);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for accessibility attributes
      await expect(page.locator('#nextBtn')).toHaveAttribute('aria-label', /next|forward/i);
      await expect(page.locator('#prevBtn')).toHaveAttribute('aria-label', /prev|back/i);
      await expect(page.locator('#playBtn')).toHaveAttribute('aria-label', /play|pause/i);
      await expect(page.locator('#resetBtn')).toHaveAttribute('aria-label', /reset|restart/i);
    });
  });
});