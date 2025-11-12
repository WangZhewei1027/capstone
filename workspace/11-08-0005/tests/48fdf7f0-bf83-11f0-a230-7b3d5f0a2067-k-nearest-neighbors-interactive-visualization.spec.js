import { test, expect } from '@playwright/test';

test.describe('K-Nearest Neighbors Interactive Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/48fdf7f0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should load in idle state with default configuration', async ({ page }) => {
      // Verify canvas is visible and interactive
      const canvas = await page.locator('canvas');
      await expect(canvas).toBeVisible();
      
      // Check default K value
      const kSlider = await page.locator('input[type="range"]');
      await expect(kSlider).toHaveValue('3');
      
      // Verify control buttons are present
      await expect(page.locator('button:has-text("Add Class A")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Class B")')).toBeVisible();
      await expect(page.locator('button:has-text("Clear")')).toBeVisible();
      
      // Check distance toggle checkbox
      const distanceToggle = await page.locator('input[type="checkbox"]');
      await expect(distanceToggle).toBeVisible();
    });
  });

  test.describe('Point Placement Flow', () => {
    test('should place and classify a new point on canvas click', async ({ page }) => {
      const canvas1 = await page.locator('canvas1');
      
      // Click on canvas to place a point
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Wait for classification animation sequence
      await page.waitForTimeout(100); // Wait for point creation
      
      // Verify distance calculation animation
      await expect(page.locator('.expanding-circle')).toBeVisible();
      await page.waitForTimeout(500); // Wait for distance animation
      
      // Check for neighbor highlighting
      await expect(page.locator('.pulsing-neighbor')).toHaveCount(3); // K=3 by default
      
      // Verify vote display updates
      const voteDisplay = await page.locator('.vote-display');
      await expect(voteDisplay).toBeVisible();
      
      // Wait for classification to complete
      await page.waitForTimeout(1000);
      
      // Verify point has been classified (no longer gray)
      const newPoint = await page.locator('.data-point').last();
      const pointColor = await newPoint.evaluate(el => window.getComputedStyle(el).fill);
      expect(pointColor).not.toBe('gray');
    });

    test('should show preview on canvas hover', async ({ page }) => {
      const canvas2 = await page.locator('canvas2');
      
      // Hover over canvas
      await canvas.hover({ position: { x: 150, y: 150 } });
      
      // Check for ghost preview
      await expect(page.locator('.ghost-preview')).toBeVisible();
      
      // Move mouse to different position
      await canvas.hover({ position: { x: 250, y: 250 } });
      
      // Ghost preview should update position
      const ghostPreview = await page.locator('.ghost-preview');
      const position = await ghostPreview.boundingBox();
      expect(position).toBeTruthy();
      
      // Leave canvas area
      await page.mouse.move(0, 0);
      await expect(page.locator('.ghost-preview')).not.toBeVisible();
    });
  });

  test.describe('K Value Adjustment', () => {
    test('should update classification when K value changes', async ({ page }) => {
      // First place a point
      const canvas3 = await page.locator('canvas3');
      await canvas.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(1500); // Wait for initial classification
      
      // Get initial classification
      const initialClass = await page.locator('.data-point').last().getAttribute('data-class');
      
      // Change K value
      const kSlider1 = await page.locator('input[type="range"]');
      await kSlider.fill('7');
      
      // Wait for recalculation
      await page.waitForTimeout(1000);
      
      // Verify neighbor count updated
      await expect(page.locator('.pulsing-neighbor')).toHaveCount(7);
      
      // Check if classification might have changed
      const updatedClass = await page.locator('.data-point').last().getAttribute('data-class');
      // Classification may or may not change depending on data distribution
      expect(updatedClass).toBeTruthy();
    });

    test('should handle K value edge cases', async ({ page }) => {
      const kSlider2 = await page.locator('input[type="range"]');
      
      // Test minimum K value
      await kSlider.fill('1');
      await expect(kSlider).toHaveValue('1');
      
      // Test maximum K value
      await kSlider.fill('15');
      await expect(kSlider).toHaveValue('15');
      
      // Place a point and verify it still works with extreme K values
      const canvas4 = await page.locator('canvas4');
      await canvas.click({ position: { x: 300, y: 300 } });
      await page.waitForTimeout(1500);
      
      // Should still classify the point
      const point = await page.locator('.data-point').last();
      await expect(point).toHaveAttribute('data-class');
    });
  });

  test.describe('Distance Visualization Toggle', () => {
    test('should toggle distance line visibility', async ({ page }) => {
      // Place a point first
      const canvas5 = await page.locator('canvas5');
      await canvas.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(1500);
      
      const distanceToggle1 = await page.locator('input[type="checkbox"]');
      
      // Check if distances are shown by default
      const initialState = await distanceToggle.isChecked();
      
      if (initialState) {
        await expect(page.locator('.distance-line')).toBeVisible();
        
        // Toggle off
        await distanceToggle.uncheck();
        await expect(page.locator('.distance-line')).not.toBeVisible();
        
        // Toggle back on
        await distanceToggle.check();
        await expect(page.locator('.distance-line')).toBeVisible();
      } else {
        await expect(page.locator('.distance-line')).not.toBeVisible();
        
        // Toggle on
        await distanceToggle.check();
        await expect(page.locator('.distance-line')).toBeVisible();
      }
    });
  });

  test.describe('Training Data Management', () => {
    test('should add Class A training points', async ({ page }) => {
      const initialPointCount = await page.locator('.data-point').count();
      
      // Click Add Class A button
      await page.locator('button:has-text("Add Class A")').click();
      await page.waitForTimeout(500);
      
      // Verify new point was added
      const newPointCount = await page.locator('.data-point').count();
      expect(newPointCount).toBe(initialPointCount + 1);
      
      // Verify the new point is Class A
      const newPoint1 = await page.locator('.data-point').last();
      await expect(newPoint).toHaveAttribute('data-class', 'A');
    });

    test('should add Class B training points', async ({ page }) => {
      const initialPointCount1 = await page.locator('.data-point').count();
      
      // Click Add Class B button
      await page.locator('button:has-text("Add Class B")').click();
      await page.waitForTimeout(500);
      
      // Verify new point was added
      const newPointCount1 = await page.locator('.data-point').count();
      expect(newPointCount).toBe(initialPointCount + 1);
      
      // Verify the new point is Class B
      const newPoint2 = await page.locator('.data-point').last();
      await expect(newPoint).toHaveAttribute('data-class', 'B');
    });

    test('should clear all points', async ({ page }) => {
      // Add some points first
      const canvas6 = await page.locator('canvas6');
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(2000);
      
      // Verify points exist
      const pointsBeforeClear = await page.locator('.data-point').count();
      expect(pointsBeforeClear).toBeGreaterThan(0);
      
      // Click Clear button
      await page.locator('button:has-text("Clear")').click();
      await page.waitForTimeout(500);
      
      // Verify all points are removed
      const pointsAfterClear = await page.locator('.data-point').count();
      expect(pointsAfterClear).toBe(0);
      
      // Verify vote display is reset
      const voteDisplay1 = await page.locator('.vote-display');
      await expect(voteDisplay).toContainText('Class A: 0');
      await expect(voteDisplay).toContainText('Class B: 0');
    });
  });

  test.describe('Point Dragging', () => {
    test('should allow dragging existing points', async ({ page }) => {
      // Ensure we have points to drag
      await page.locator('button:has-text("Add Class A")').click();
      await page.waitForTimeout(500);
      
      const point1 = await page.locator('.data-point1').first();
      const initialBox = await point.boundingBox();
      expect(initialBox).toBeTruthy();
      
      // Drag the point
      await point.hover();
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
      await page.mouse.up();
      
      // Wait for recalculation
      await page.waitForTimeout(1000);
      
      // Verify point moved
      const finalBox = await point.boundingBox();
      expect(finalBox.x).not.toBe(initialBox.x);
      expect(finalBox.y).not.toBe(initialBox.y);
    });

    test('should recalculate classifications after dragging', async ({ page }) => {
      // Place a query point
      const canvas7 = await page.locator('canvas7');
      await canvas.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(1500);
      
      // Get initial classification
      const queryPoint = await page.locator('.data-point[data-type="query"]').first();
      const initialClass1 = await queryPoint.getAttribute('data-class');
      
      // Drag a training point closer
      const trainingPoint = await page.locator('.data-point[data-type="training"]').first();
      const trainingBox = await trainingPoint.boundingBox();
      
      await trainingPoint.hover();
      await page.mouse.down();
      await page.mouse.move(190, 190); // Move very close to query point
      await page.mouse.up();
      
      // Wait for recalculation
      await page.waitForTimeout(1500);
      
      // Classification might change based on the new position
      const updatedClass1 = await queryPoint.getAttribute('data-class');
      expect(updatedClass).toBeTruthy();
    });
  });

  test.describe('Animation Sequences', () => {
    test('should show complete animation sequence for classification', async ({ page }) => {
      const canvas8 = await page.locator('canvas8');
      
      // Click to place point
      await canvas.click({ position: { x: 250, y: 250 } });
      
      // Step 1: Point creation
      await expect(page.locator('.data-point').last()).toBeVisible();
      
      // Step 2: Distance calculation (expanding circles)
      await expect(page.locator('.expanding-circle')).toBeVisible();
      await page.waitForTimeout(500);
      
      // Step 3: Neighbor highlighting
      await expect(page.locator('.pulsing-neighbor')).toHaveCount(3);
      await page.waitForTimeout(500);
      
      // Step 4: Vote animation
      const voteBar = await page.locator('.vote-bar');
      await expect(voteBar).toBeVisible();
      
      // Step 5: Classification transition
      await page.waitForTimeout(500);
      const point2 = await page.locator('.data-point2').last();
      await expect(point).toHaveAttribute('data-class');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle rapid clicks gracefully', async ({ page }) => {
      const canvas9 = await page.locator('canvas9');
      
      // Rapid clicking
      for (let i = 0; i < 5; i++) {
        await canvas.click({ position: { x: 100 + i * 50, y: 100 + i * 50 } });
        await page.waitForTimeout(100);
      }
      
      // Should create all points without errors
      await page.waitForTimeout(2000);
      const points = await page.locator('.data-point[data-type="query"]').count();
      expect(points).toBeGreaterThanOrEqual(5);
    });

    test('should handle K value larger than training set', async ({ page }) => {
      // Clear all points first
      await page.locator('button:has-text("Clear")').click();
      await page.waitForTimeout(500);
      
      // Add only 3 training points
      for (let i = 0; i < 3; i++) {
        await page.locator('button:has-text("Add Class A")').click();
        await page.waitForTimeout(200);
      }
      
      // Set K to 5 (larger than training set)
      const kSlider3 = await page.locator('input[type="range"]');
      await kSlider.fill('5');
      
      // Place a query point
      const canvas10 = await page.locator('canvas10');
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Should handle gracefully and use all available neighbors
      await page.waitForTimeout(1500);
      const queryPoint1 = await page.locator('.data-point[data-type="query"]').first();
      await expect(queryPoint).toHaveAttribute('data-class');
    });

    test('should maintain state consistency during interactions', async ({ page }) => {
      // Place initial point
      const canvas11 = await page.locator('canvas11');
      await canvas.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(1500);
      
      // Change K while hovering
      await canvas.hover({ position: { x: 250, y: 250 } });
      const kSlider4 = await page.locator('input[type="range"]');
      await kSlider.fill('5');
      
      // Should maintain preview while updating
      await expect(page.locator('.ghost-preview')).toBeVisible();
      
      // Click to place another point
      await canvas.click();
      await page.waitForTimeout(1500);
      
      // Both points should be properly classified
      const queryPoints = await page.locator('.data-point[data-type="query"]');
      const count = await queryPoints.count();
      expect(count).toBe(2);
      
      for (let i = 0; i < count; i++) {
        await expect(queryPoints.nth(i)).toHaveAttribute('data-class');
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should handle window resize', async ({ page }) => {
      // Set initial viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      
      // Place a point
      const canvas12 = await page.locator('canvas12');
      await canvas.click({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(1500);
      
      // Resize window
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(500);
      
      // Canvas should still be interactive
      await canvas.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(1500);
      
      // Points should still be visible and classified
      const points1 = await page.locator('.data-point[data-type="query"]').count();
      expect(points).toBe(2);
    });
  });
});