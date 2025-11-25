import { test, expect } from '@playwright/test';

test.describe('Queue Application FSM Tests', () => {
  const baseUrl = 'http://127.0.0.1:5500/workspace/batch-2025-11-24T04-39-34/html/937ae892-c8ef-11f0-bcc4-c376470b46ee.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('Initial state should be idle', async ({ page }) => {
    // Verify that the page loads with the input and submit button present
    await expect(page.locator('#input')).toBeVisible();
    await expect(page.locator('#submit')).toBeVisible();
  });

  test.describe('State Transitions', () => {
    test('Transition from idle to updating on INPUT_CHANGED', async ({ page }) => {
      // Simulate input change
      await page.fill('#input', 'Test Message');
      
      // Verify the updating state by checking the queue container
      await expect(page.locator('#queue-container')).toContainText('1. Test Message');
    });

    test('Remain in updating state on subsequent INPUT_CHANGED', async ({ page }) => {
      // Simulate multiple input changes
      await page.fill('#input', 'First Message');
      await page.fill('#input', 'Second Message');
      
      // Verify the queue container updates correctly
      await expect(page.locator('#queue-container')).toContainText('2. Second Message');
    });

    test('Transition from updating to submitted on SUBMIT_CLICKED', async ({ page }) => {
      // Simulate input change
      await page.fill('#input', 'Submit Test');
      
      // Click the submit button
      await page.click('#submit');
      
      // Verify redirection to home
      await expect(page).toHaveURL(/.*index\.html/);
    });

    test('Transition from submitted to updating on INPUT_CHANGED', async ({ page }) => {
      // Simulate input change
      await page.fill('#input', 'Submit Test');
      
      // Click the submit button
      await page.click('#submit');
      
      // Navigate back to the original page
      await page.goto(baseUrl);
      
      // Simulate another input change
      await page.fill('#input', 'New Message');
      
      // Verify the queue container updates correctly
      await expect(page.locator('#queue-container')).toContainText('1. New Message');
    });
  });

  test.describe('Edge Cases', () => {
    test('No transition on empty input', async ({ page }) => {
      // Click the submit button without entering any input
      await page.click('#submit');
      
      // Verify redirection to home
      await expect(page).toHaveURL(/.*index\.html/);
    });

    test('Handle rapid input changes', async ({ page }) => {
      // Simulate rapid input changes
      await page.fill('#input', 'Message 1');
      await page.fill('#input', 'Message 2');
      await page.fill('#input', 'Message 3');
      
      // Verify the queue container updates correctly
      await expect(page.locator('#queue-container')).toContainText('3. Message 3');
    });
  });
});