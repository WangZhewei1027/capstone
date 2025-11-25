import { test, expect } from '@playwright/test';

test.describe('Stack Application FSM Tests', () => {
  const url = 'http://127.0.0.1:5500/workspace/batch-2025-11-24T04-39-34/html/937ae891-c8ef-11f0-bcc4-c376470b46ee.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(url);
  });

  test('should transition from idle to adding state and back to idle on ADD_CLICKED and VALUE_ADDED', async ({ page }) => {
    // Click the Add button to transition to adding state
    await page.click('#add');
    // Simulate prompt input and confirm
    await page.evaluate(() => prompt('Enter a value to add to the stack:', 'testValue'));
    // Check if the button text reflects the added value
    await expect(page.locator('#add')).toHaveText('Added to stack: testValue');
  });

  test('should handle ADD_CANCELLED by remaining in idle state', async ({ page }) => {
    // Click the Add button to transition to adding state
    await page.click('#add');
    // Simulate prompt cancel
    await page.evaluate(() => prompt('Enter a value to add to the stack:', null));
    // Check if the button text has not changed
    await expect(page.locator('#add')).toHaveText('Add');
  });

  test('should transition from idle to removing state and back to idle on REMOVE_CLICKED and VALUE_REMOVED', async ({ page }) => {
    // Pre-add a value to ensure stack is not empty
    await page.evaluate(() => {
      prompt('Enter a value to add to the stack:', 'testValue');
    });
    await page.click('#add');

    // Click the Remove button to transition to removing state
    await page.click('#remove');
    // Simulate prompt input and confirm
    await page.evaluate(() => prompt('Enter the value to remove from the stack:', 'testValue'));
    // Check if the button text reflects the removed value
    await expect(page.locator('#remove')).toHaveText('Removed from stack: testValue');
  });

  test('should handle REMOVE_CANCELLED by remaining in idle state', async ({ page }) => {
    // Pre-add a value to ensure stack is not empty
    await page.evaluate(() => {
      prompt('Enter a value to add to the stack:', 'testValue');
    });
    await page.click('#add');

    // Click the Remove button to transition to removing state
    await page.click('#remove');
    // Simulate prompt cancel
    await page.evaluate(() => prompt('Enter the value to remove from the stack:', null));
    // Check if the button text has not changed
    await expect(page.locator('#remove')).toHaveText('Remove');
  });

  test('should handle STACK_EMPTY by remaining in idle state', async ({ page }) => {
    // Ensure stack is empty
    await page.evaluate(() => {
      stack = [];
    });

    // Click the Remove button to attempt removing from an empty stack
    await page.click('#remove');
    // Check if alert is shown for empty stack
    await expect(page).toHaveDialog();
  });

  test('should transition from idle to printing state and back to idle on PRINT_CLICKED and PRINT_COMPLETE', async ({ page }) => {
    // Click the Print button to transition to printing state
    await page.click('#print');
    // Check if console log is called with the stack content
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    await page.evaluate(() => console.log('Stack: ', stack));
    expect(consoleMessages).toContain('Stack: ');
  });
});