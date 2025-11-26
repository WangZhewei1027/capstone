import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/569fdfd0-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Two Pointers Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the interactive application before each test
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Validate that the initial state is Idle
    const point1Text = await page.textContent('#point1');
    const point2Text = await page.textContent('#point2');
    expect(point1Text).toBe('');
    expect(point2Text).toBe('');
  });

  test('User clicks to move point1', async ({ page }) => {
    // Simulate a user click on the document
    await page.click('body');

    // Validate that point1 has moved after the click
    const point1Text = await page.textContent('#point1');
    expect(point1Text).toMatch(/Point 1 moved to/);
  });

  test('Clicking again moves point1 again', async ({ page }) => {
    // First click to move point1
    await page.click('body');
    const firstMoveText = await page.textContent('#point1');

    // Second click to move point1 again
    await page.click('body');
    const secondMoveText = await page.textContent('#point1');

    // Validate that the text has changed, indicating point1 has moved again
    expect(secondMoveText).not.toBe(firstMoveText);
  });

  test('Clicking does not affect point2', async ({ page }) => {
    // Simulate a user click on the document
    await page.click('body');

    // Validate that point2 remains unchanged
    const point2Text = await page.textContent('#point2');
    expect(point2Text).toBe('');
  });

  test('Edge case: Click with no points defined', async ({ page }) => {
    // Simulate a user click on the document
    await page.click('body');

    // Validate that point1 has moved even if no initial positions are defined
    const point1Text = await page.textContent('#point1');
    expect(point1Text).toMatch(/Point 1 moved to/);
  });

  test('Visual feedback on click', async ({ page }) => {
    // Simulate a user click on the document
    await page.click('body');

    // Check if the DOM has updated to reflect the movement of point1
    const point1Text = await page.textContent('#point1');
    expect(point1Text).toMatch(/Point 1 moved to/);
  });
});