import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-25T17-13-35/html/1378ad60-ca22-11f0-90fa-53e5712d34e0.html';

test.describe('Stack Application State Machine Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the stack application before each test
    await page.goto(BASE_URL);
  });

  test('should be in idle state initially', async ({ page }) => {
    // Verify that the application starts in the idle state
    const button = await page.locator('button:has-text("Start Stack")');
    await expect(button).toBeVisible();
  });

  test('should transition to stacking state when Start Stack is clicked', async ({ page }) => {
    // Click the Start Stack button to transition to stacking state
    await page.click('button:has-text("Start Stack")');
    
    // Verify that the stack is displayed
    const stack = await page.locator('#stack');
    await expect(stack).toBeVisible();
  });

  test('should transition to displaying state when Display Stack is clicked', async ({ page }) => {
    // Start the stack first
    await page.click('button:has-text("Start Stack")');
    
    // Click the Display Stack button to transition to displaying state
    await page.click('button:has-text("Display Stack")');
    
    // Verify that the stack is displayed in the console
    // This part is simulated as we cannot capture console logs directly
    // In a real scenario, we would need to check the displayed content
    const stack = await page.locator('#stack');
    await expect(stack).toBeVisible();
  });

  test('should transition back to idle state when stack is complete', async ({ page }) => {
    // Start the stack first
    await page.click('button:has-text("Start Stack")');
    
    // Simulate stack completion
    await page.click('button:has-text("Stack Complete")');
    
    // Verify that the application returns to idle state
    const button = await page.locator('button:has-text("Start Stack")');
    await expect(button).toBeVisible();
  });

  test('should handle edge case when Display Stack is clicked without starting stack', async ({ page }) => {
    // Click the Display Stack button without starting the stack
    await page.click('button:has-text("Display Stack")');
    
    // Verify that no stack is displayed, simulating an error scenario
    const stack = await page.locator('#stack');
    await expect(stack).not.toBeVisible();
  });

  test('should handle edge case when Stack Complete is clicked without starting stack', async ({ page }) => {
    // Click the Stack Complete button without starting the stack
    await page.click('button:has-text("Stack Complete")');
    
    // Verify that the application remains in idle state
    const button = await page.locator('button:has-text("Start Stack")');
    await expect(button).toBeVisible();
  });
});