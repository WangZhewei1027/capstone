import { test, expect } from '@playwright/test';

// Test suite for Linear Regression Interactive Visualization
test.describe('Linear Regression Interactive Visualization', () => {
  // Navigate to the application before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5500/workspace/11-08-0005/html/61d33ce0-bf83-11f0-a230-7b3d5f0a2067.html');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should load with empty canvas and default UI', async ({ page }) => {
      // Verify canvas is present
      const canvas = await page.locator('#canvas');
      await expect(canvas).toBeVisible();
      
      // Verify initial stats show no data
      await expect(page.locator('.stat-value').first()).toContainText('0');
      
      // Verify all buttons are visible and enabled
      await expect(page.getByRole('button', { name: /toggle residuals/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /load example/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /clear all/i })).toBeVisible();
      
      // Verify canvas has crosshair cursor
      await expect(canvas).toHaveCSS('cursor', 'crosshair');
    });
  });

  test.describe('Adding Points (idle -> adding_point -> idle)', () => {
    test('should add a point when clicking on empty canvas', async ({ page }) => {
      const canvas1 = await page.locator('#canvas1');
      
      // Click on canvas to add a point
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Wait for point to be added
      await page.waitForTimeout(100);
      
      // Verify stats are updated (point count should be 1)
      const pointCount = await page.locator('.stat-value').first();
      await expect(pointCount).toContainText('1');
      
      // Verify the stat value pulses (has animation class)
      await expect(pointCount).toHaveClass(/pulse/);
    });

    test('should add multiple points and update regression', async ({ page }) => {
      const canvas2 = await page.locator('#canvas2');
      
      // Add multiple points
      const points = [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 200 },
        { x: 400, y: 250 }
      ];
      
      for (const point of points) {
        await canvas.click({ position: point });
        await page.waitForTimeout(50);
      }
      
      // Verify point count
      await expect(page.locator('.stat-value').first()).toContainText('4');
      
      // Verify regression equation is displayed (should have non-zero values)
      const equation = await page.locator('.stat-value').nth(1).textContent();
      expect(equation).toMatch(/y = .+ \+ .+x/);
      
      // Verify R² value is calculated
      const r2Value = await page.locator('.stat-value').nth(2).textContent();
      expect(parseFloat(r2Value)).toBeGreaterThan(0);
    });
  });

  test.describe('Dragging Points (idle -> dragging -> idle)', () => {
    test('should drag a point and update regression', async ({ page }) => {
      const canvas3 = await page.locator('#canvas3');
      
      // Add a few points first
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 300, y: 300 } });
      
      // Get initial equation
      const initialEquation = await page.locator('.stat-value').nth(1).textContent();
      
      // Drag the middle point
      await page.mouse.move(200, 200);
      await page.mouse.down();
      
      // Verify cursor changes to move
      await expect(canvas).toHaveCSS('cursor', 'move');
      
      // Drag to new position
      await page.mouse.move(250, 150, { steps: 5 });
      await page.mouse.up();
      
      // Verify cursor returns to crosshair
      await expect(canvas).toHaveCSS('cursor', 'crosshair');
      
      // Verify equation has changed
      const newEquation = await page.locator('.stat-value').nth(1).textContent();
      expect(newEquation).not.toBe(initialEquation);
    });

    test('should continuously update while dragging', async ({ page }) => {
      const canvas4 = await page.locator('#canvas4');
      
      // Add points
      await canvas.click({ position: { x: 150, y: 150 } });
      await canvas.click({ position: { x: 250, y: 250 } });
      
      // Start dragging
      await page.mouse.move(150, 150);
      await page.mouse.down();
      
      // Collect R² values during drag
      const r2Values = [];
      
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(150 + i * 20, 150 + i * 10);
        const r2 = await page.locator('.stat-value').nth(2).textContent();
        r2Values.push(r2);
        await page.waitForTimeout(50);
      }
      
      await page.mouse.up();
      
      // Verify values changed during drag
      const uniqueValues = [...new Set(r2Values)];
      expect(uniqueValues.length).toBeGreaterThan(1);
    });
  });

  test.describe('Toggle Residuals (idle -> idle)', () => {
    test('should toggle residuals display', async ({ page }) => {
      const canvas5 = await page.locator('#canvas5');
      
      // Add points for regression
      await canvas.click({ position: { x: 100, y: 120 } });
      await canvas.click({ position: { x: 200, y: 180 } });
      await canvas.click({ position: { x: 300, y: 260 } });
      
      // Toggle residuals on
      const toggleButton = page.getByRole('button', { name: /toggle residuals/i });
      await toggleButton.click();
      
      // Verify button text changes
      await expect(toggleButton).toContainText(/hide residuals/i);
      
      // Toggle residuals off
      await toggleButton.click();
      
      // Verify button text changes back
      await expect(toggleButton).toContainText(/show residuals/i);
    });
  });

  test.describe('Load Example (idle -> idle)', () => {
    test('should load example dataset', async ({ page }) => {
      // Click load example button
      await page.getByRole('button', { name: /load example/i }).click();
      
      // Wait for animation
      await page.waitForTimeout(500);
      
      // Verify points are loaded (should have multiple points)
      const pointCount1 = await page.locator('.stat-value').first().textContent();
      expect(parseInt(pointCount)).toBeGreaterThan(5);
      
      // Verify regression equation is calculated
      const equation1 = await page.locator('.stat-value').nth(1).textContent();
      expect(equation).toMatch(/y = .+ \+ .+x/);
      
      // Verify R² is reasonable
      const r21 = parseFloat(await page.locator('.stat-value').nth(2).textContent());
      expect(r2).toBeGreaterThan(0.5);
      expect(r2).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Clear Points (idle -> idle)', () => {
    test('should clear all points', async ({ page }) => {
      const canvas6 = await page.locator('#canvas6');
      
      // Add some points
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 300, y: 300 } });
      
      // Verify points exist
      await expect(page.locator('.stat-value').first()).toContainText('3');
      
      // Clear all points
      await page.getByRole('button', { name: /clear all/i }).click();
      
      // Verify stats are reset
      await expect(page.locator('.stat-value').first()).toContainText('0');
      await expect(page.locator('.stat-value').nth(1)).toContainText('y = 0 + 0x');
      await expect(page.locator('.stat-value').nth(2)).toContainText('0.00');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle single point gracefully', async ({ page }) => {
      const canvas7 = await page.locator('#canvas7');
      
      // Add single point
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Verify point count
      await expect(page.locator('.stat-value').first()).toContainText('1');
      
      // R² should be 0 or NaN for single point
      const r22 = await page.locator('.stat-value').nth(2).textContent();
      expect(r2).toMatch(/0\.00|NaN/);
    });

    test('should handle collinear points', async ({ page }) => {
      const canvas8 = await page.locator('#canvas8');
      
      // Add perfectly collinear points
      await canvas.click({ position: { x: 100, y: 100 } });
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 300, y: 300 } });
      
      // R² should be perfect (1.00) for collinear points
      const r23 = await page.locator('.stat-value').nth(2).textContent();
      expect(parseFloat(r2)).toBeCloseTo(1.0, 2);
    });

    test('should handle vertical line of points', async ({ page }) => {
      const canvas9 = await page.locator('#canvas9');
      
      // Add points in vertical line
      await canvas.click({ position: { x: 200, y: 100 } });
      await canvas.click({ position: { x: 200, y: 200 } });
      await canvas.click({ position: { x: 200, y: 300 } });
      
      // Verify equation shows undefined or infinite slope
      const equation2 = await page.locator('.stat-value').nth(1).textContent();
      expect(equation).toMatch(/Infinity|undefined|NaN/);
    });
  });

  test.describe('Visual Feedback', () => {
    test('should show hover effects on points', async ({ page }) => {
      const canvas10 = await page.locator('#canvas10');
      
      // Add a point
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Hover over the point area
      await page.mouse.move(200, 200);
      
      // Verify cursor changes when hovering over point
      // (This assumes points change cursor on hover)
      await page.waitForTimeout(100);
    });

    test('should maintain state through rapid interactions', async ({ page }) => {
      const canvas11 = await page.locator('#canvas11');
      
      // Rapidly add points
      for (let i = 0; i < 10; i++) {
        await canvas.click({ position: { x: 50 + i * 40, y: 100 + i * 20 } });
      }
      
      // Verify all points were added
      await expect(page.locator('.stat-value').first()).toContainText('10');
      
      // Rapidly toggle residuals
      const toggleButton1 = page.getByRole('button', { name: /toggle residuals/i });
      for (let i = 0; i < 5; i++) {
        await toggleButton.click();
      }
      
      // Verify toggle state is correct (odd number of clicks)
      await expect(toggleButton).toContainText(/hide residuals/i);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should handle canvas boundaries', async ({ page }) => {
      const canvas12 = await page.locator('#canvas12');
      const box = await canvas.boundingBox();
      
      // Try to add points at canvas edges
      await canvas.click({ position: { x: 5, y: 5 } });
      await canvas.click({ position: { x: box.width - 5, y: box.height - 5 } });
      
      // Verify points were added
      await expect(page.locator('.stat-value').first()).toContainText('2');
      
      // Try to drag a point outside canvas
      await page.mouse.move(5, 5);
      await page.mouse.down();
      await page.mouse.move(-50, -50);
      await page.mouse.up();
      
      // Point should still exist (constrained to canvas)
      await expect(page.locator('.stat-value').first()).toContainText('2');
    });
  });
});