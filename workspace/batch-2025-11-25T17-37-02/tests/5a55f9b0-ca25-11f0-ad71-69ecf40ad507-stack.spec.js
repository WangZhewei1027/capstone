import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-37-02/html/5a55f9b0-ca25-11f0-ad71-69ecf40ad507.html';

test.describe('Stack Finite State Machine Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the stack application before each test
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    // Verify the stack is in idle state by checking the absence of scale and content
    const stack = await page.locator('.stack');
    const stackContent = await page.locator('.stack-content');

    await expect(stack).toBeVisible();
    await expect(stackContent).not.toBeVisible();
  });

  test('should transition to hovered state on mouse over', async ({ page }) => {
    // Simulate mouse hover over the stack
    const stack = await page.locator('.stack');
    await stack.hover();

    // Verify that the stack scales up
    await expect(stack).toHaveCSS('transform', /scale\(1\.1\)/);
  });

  test('should transition to stacked state on click', async ({ page }) => {
    // Click the stack to transition to stacked state
    const stack = await page.locator('.stack');
    await stack.click();

    // Verify that the stack content is displayed
    const stackContent = await page.locator('.stack-content');
    await expect(stackContent).toBeVisible();
  });

  test('should return to idle state on stack content click', async ({ page }) => {
    // Click the stack to enter stacked state first
    const stack = await page.locator('.stack');
    await stack.click();

    // Now click the stack content to transition back to idle
    const stackContent = await page.locator('.stack-content');
    await stackContent.click();

    // Verify that the stack content is hidden and stack is back to idle state
    await expect(stackContent).not.toBeVisible();
    const stack = await page.locator('.stack');
    await expect(stack).toBeVisible();
  });

  test('should return to idle state on stack unhover', async ({ page }) => {
    // Hover over the stack first
    const stack = await page.locator('.stack');
    await stack.hover();

    // Now unhover the stack
    await stack.dispatchEvent('mouseleave');

    // Verify that the stack scales back down
    await expect(stack).toHaveCSS('transform', 'none');
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    // Click the stack to enter stacked state
    const stack = await page.locator('.stack');
    await stack.click();

    // Attempt to click the stack content again to ensure it doesn't cause errors
    const stackContent = await page.locator('.stack-content');
    await stackContent.click();

    // Verify that the stack content is hidden and stack is back to idle state
    await expect(stackContent).not.toBeVisible();
    await expect(stack).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Clean up actions can be performed here if needed
    // Currently, no specific teardown is required
  });
});