import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1b38a7e0-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Interactive Linear Regression Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should be idle', async ({ page }) => {
    const pointX = await page.locator('#pointX');
    const pointY = await page.locator('#pointY');
    const pointsContainer = await page.locator('#points');

    // Verify that the input fields are empty and no points are drawn
    await expect(pointX).toHaveValue('');
    await expect(pointY).toHaveValue('');
    await expect(pointsContainer.locator('div')).toHaveCount(0);
  });

  test('Adding a point transitions to point_added state', async ({ page }) => {
    const pointX1 = await page.locator('#pointX1');
    const pointY1 = await page.locator('#pointY1');
    const addPointButton = await page.locator('#add-point');
    const pointsContainer1 = await page.locator('#points');

    // Add a point
    await pointX.fill('2');
    await pointY.fill('3');
    await addPointButton.click();

    // Verify that the point is added
    const points = await pointsContainer.locator('div');
    await expect(points).toHaveCount(1);
    await expect(points.first()).toHaveCSS('left', '2px'); // Assuming CSS position is based on X
    await expect(points.first()).toHaveCSS('top', '3px'); // Assuming CSS position is based on Y
  });

  test('Adding multiple points remains in point_added state', async ({ page }) => {
    const pointX2 = await page.locator('#pointX2');
    const pointY2 = await page.locator('#pointY2');
    const addPointButton1 = await page.locator('#add-point');
    const pointsContainer2 = await page.locator('#points');

    // Add first point
    await pointX.fill('2');
    await pointY.fill('3');
    await addPointButton.click();

    // Add second point
    await pointX.fill('4');
    await pointY.fill('5');
    await addPointButton.click();

    // Verify that both points are added
    const points1 = await pointsContainer.locator('div');
    await expect(points).toHaveCount(2);
  });

  test('Resetting clears all points and returns to idle state', async ({ page }) => {
    const pointX3 = await page.locator('#pointX3');
    const pointY3 = await page.locator('#pointY3');
    const addPointButton2 = await page.locator('#add-point');
    const resetButton = await page.locator('#reset');
    const pointsContainer3 = await page.locator('#points');

    // Add a point
    await pointX.fill('2');
    await pointY.fill('3');
    await addPointButton.click();

    // Reset the points
    await resetButton.click();

    // Verify that the points are cleared
    const points2 = await pointsContainer.locator('div');
    await expect(points).toHaveCount(0);
  });

  test('Adding points after reset should work correctly', async ({ page }) => {
    const pointX4 = await page.locator('#pointX4');
    const pointY4 = await page.locator('#pointY4');
    const addPointButton3 = await page.locator('#add-point');
    const resetButton1 = await page.locator('#reset');
    const pointsContainer4 = await page.locator('#points');

    // Reset the points
    await resetButton.click();

    // Add a point after reset
    await pointX.fill('1');
    await pointY.fill('1');
    await addPointButton.click();

    // Verify that the point is added
    const points3 = await pointsContainer.locator('div');
    await expect(points).toHaveCount(1);
  });

  test('Edge case: Adding invalid points should not change state', async ({ page }) => {
    const pointX5 = await page.locator('#pointX5');
    const pointY5 = await page.locator('#pointY5');
    const addPointButton4 = await page.locator('#add-point');
    const pointsContainer5 = await page.locator('#points');

    // Try adding invalid points (non-numeric)
    await pointX.fill('abc');
    await pointY.fill('xyz');
    await addPointButton.click();

    // Verify that no points are added
    const points4 = await pointsContainer.locator('div');
    await expect(points).toHaveCount(0);
  });
});