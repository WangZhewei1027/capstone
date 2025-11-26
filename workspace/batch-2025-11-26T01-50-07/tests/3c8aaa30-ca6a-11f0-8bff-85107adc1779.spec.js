import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8aaa30-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Linear Regression Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state should display no points message', async ({ page }) => {
    const equationText = await page.locator('#equation').textContent();
    expect(equationText).toBe('No points yet');
  });

  test('User can add a point by clicking on the canvas', async ({ page }) => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 400, y: 250 } }); // Click in the middle of the canvas

    const equationText = await page.locator('#equation').textContent();
    expect(equationText).toContain('Only one point:');
  });

  test('User can add multiple points and see the updated equation', async ({ page }) => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 400, y: 250 } });
    await canvas.click({ position: { x: 450, y: 300 } });

    const equationText = await page.locator('#equation').textContent();
    expect(equationText).not.toBe('No points yet');
    expect(equationText).not.toContain('Only one point:');
  });

  test('User can clear points and see the no points message', async ({ page }) => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 400, y: 250 } });
    await canvas.click({ position: { x: 450, y: 300 } });

    await page.locator('#clear-btn').click();

    const equationText = await page.locator('#equation').textContent();
    expect(equationText).toBe('No points yet');
  });

  test('User can click clear button multiple times', async ({ page }) => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 400, y: 250 } });

    await page.locator('#clear-btn').click();
    await page.locator('#clear-btn').click(); // Click again to ensure no error occurs

    const equationText = await page.locator('#equation').textContent();
    expect(equationText).toBe('No points yet');
  });

  test('Adding points and clearing should reset the canvas', async ({ page }) => {
    const canvas = page.locator('#plot');
    await canvas.click({ position: { x: 400, y: 250 } });
    await canvas.click({ position: { x: 450, y: 300 } });

    await page.locator('#clear-btn').click();

    const equationText = await page.locator('#equation').textContent();
    expect(equationText).toBe('No points yet');

    // Verify that the canvas is reset
    const canvasData = await page.evaluate(() => {
      const canvas = document.getElementById('plot');
      const ctx = canvas.getContext('2d');
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    });

    // Check if the canvas is cleared (all pixels should be white)
    const isCanvasCleared = Array.from(canvasData).every(value => value === 255);
    expect(isCanvasCleared).toBe(true);
  });
});