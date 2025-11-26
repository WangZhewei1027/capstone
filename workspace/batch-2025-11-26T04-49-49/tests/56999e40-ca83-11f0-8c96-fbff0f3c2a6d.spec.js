import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T04-49-49/html/56999e40-ca83-11f0-8c96-fbff0f3c2a6d.html';

test.describe('Deque Visualization Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const dequeDiv = await page.locator('#deque');
    const content = await dequeDiv.evaluate(el => el.innerHTML);
    expect(content).toBe(''); // Expect deque to be empty initially
  });

  test('Push button is enabled in Idle state', async ({ page }) => {
    await expect(page.locator('button#push_button')).toBeEnabled();
  });

  test('Push operation transitions to PushingElement state', async ({ page }) => {
    await page.fill('input#inputField', '5'); // Assuming an input field exists
    await page.click('button#push_button');
    await expect(page.locator('#deque')).toContainText('5'); // Check if the deque contains the pushed element
  });

  test('Pushing element clears input highlight', async ({ page }) => {
    await page.fill('input#inputField', '5');
    await page.click('button#push_button');
    await expect(page.locator('input#inputField')).not.toHaveClass('highlight'); // Assuming highlight class is used
  });

  test('Pop operation transitions to PoppingElement state', async ({ page }) => {
    await page.fill('input#inputField', '5');
    await page.click('button#push_button');
    await page.click('button#pop_button');
    await expect(page.locator('#deque')).not.toContainText('5'); // Check if the deque no longer contains the popped element
  });

  test('Reset operation transitions to DequeResetting state', async ({ page }) => {
    await page.fill('input#inputField', '5');
    await page.click('button#push_button');
    await page.click('button#reset_button');
    const dequeDiv = await page.locator('#deque');
    const content = await dequeDiv.evaluate(el => el.innerHTML);
    expect(content).toBe(''); // Check if the deque is empty after reset
  });

  test('Reset operation enables controls after completion', async ({ page }) => {
    await page.fill('input#inputField', '5');
    await page.click('button#push_button');
    await page.click('button#reset_button');
    await expect(page.locator('button#push_button')).toBeEnabled();
    await expect(page.locator('button#pop_button')).toBeEnabled();
  });

  test('Pushing with empty input does not change state', async ({ page }) => {
    await page.click('button#push_button');
    const dequeDiv = await page.locator('#deque');
    const content = await dequeDiv.evaluate(el => el.innerHTML);
    expect(content).toBe(''); // Check that the deque is still empty
  });

  test('Popping from empty deque does not change state', async ({ page }) => {
    await page.click('button#pop_button');
    const dequeDiv = await page.locator('#deque');
    const content = await dequeDiv.evaluate(el => el.innerHTML);
    expect(content).toBe(''); // Check that the deque is still empty
  });

  test('Reset button is enabled in Idle state', async ({ page }) => {
    await expect(page.locator('button#reset_button')).toBeEnabled();
  });
});