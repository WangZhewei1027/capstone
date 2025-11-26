import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92ff6a22-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Linear Regression Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the initial state is Idle by checking the canvas and info text
    const infoText = await page.locator('#info').innerText();
    expect(infoText).toContain('Add points by clicking on the canvas to see the regression line.');
  });

  test('Add a point by clicking on the canvas', async ({ page }) => {
    // Click on the canvas to add a point
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 100, y: 100 } });

    // Verify that the point is added and the regression line is drawn
    const infoText = await page.locator('#info').innerText();
    expect(infoText).toContain('Add at least two points for linear regression.');
  });

  test('Add multiple points and verify regression line', async ({ page }) => {
    // Add multiple points
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 20, y: 80 } });
    await canvas.click({ position: { x: 50, y: 20 } });
    await canvas.click({ position: { x: 80, y: 60 } });

    // Verify the regression line information
    const infoText = await page.locator('#info').innerText();
    expect(infoText).toContain('Regression line:');
    expect(infoText).toContain('R² =');
  });

  test('Reset points clears the canvas', async ({ page }) => {
    // Add points and then reset
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 20, y: 80 } });
    await canvas.click({ position: { x: 50, y: 20 } });
    await canvas.click({ position: { x: 80, y: 60 } });

    // Click the reset button
    await page.locator('#resetBtn').click();

    // Verify that the info text indicates no points
    const infoText = await page.locator('#info').innerText();
    expect(infoText).toContain('Add points by clicking on the canvas to see the regression line.');
  });

  test('Reset points button works when no points are added', async ({ page }) => {
    // Click the reset button without adding any points
    await page.locator('#resetBtn').click();

    // Verify that the info text remains unchanged
    const infoText = await page.locator('#info').innerText();
    expect(infoText).toContain('Add points by clicking on the canvas to see the regression line.');
  });

  test('Adding a point updates the canvas correctly', async ({ page }) => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 30, y: 70 } });

    // Check if the point is drawn on the canvas
    const pointCount = await page.evaluate(() => {
      const canvas = document.getElementById('plot');
      const ctx = canvas.getContext('2d');
      // Check the number of points drawn by counting the red pixels
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 255 && imageData.data[i + 1] === 0 && imageData.data[i + 2] === 0) {
          count++;
        }
      }
      return count;
    });

    expect(pointCount).toBeGreaterThan(0);
  });
});