import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1c74d1-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Stack Visualizer Tests', () => {
  test('should initialize stack with correct default values', async ({ page }) => {
    const size = await page.textContent('#size');
    const capacity = await page.textContent('#cap');
    const empty = await page.textContent('#empty');
    
    expect(size).toBe('0');
    expect(capacity).toBe('8');
    expect(empty).toBe('8');
  });

  test('should push a value onto the stack', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');
    
    const size = await page.textContent('#size');
    const topSlot = await page.locator('#stackContainer .slot.filled').count();
    
    expect(size).toBe('1');
    expect(topSlot).toBe(1);
  });

  test('should log push operation', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Push "42"');
  });

  test('should show overflow error when pushing beyond capacity', async ({ page }) => {
    await page.fill('#capacity', '1');
    await page.click('#capacity');
    await page.fill('#value', '42');
    await page.click('#btnPush');
    
    await page.fill('#value', '43');
    await page.click('#btnPush');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Push "43" — Overflow (capacity 1)');
  });

  test('should pop a value from the stack', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');
    await page.click('#btnPop');

    const size = await page.textContent('#size');
    expect(size).toBe('0');
  });

  test('should log pop operation', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');
    await page.click('#btnPop');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Pop -> "42"');
  });

  test('should show underflow error when popping from an empty stack', async ({ page }) => {
    await page.click('#btnPop');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Pop — Underflow (stack is empty)');
  });

  test('should peek at the top value of the stack', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');
    await page.click('#btnPeek');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Peek -> "42"');
  });

  test('should show error when peeking an empty stack', async ({ page }) => {
    await page.click('#btnPeek');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Peek — stack empty');
  });

  test('should clear the stack', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');
    await page.click('#btnClear');

    const size = await page.textContent('#size');
    expect(size).toBe('0');
  });

  test('should log clear operation', async ({ page }) => {
    await page.fill('#value', '42');
    await page.click('#btnPush');
    await page.click('#btnClear');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Clear — stack emptied');
  });

  test('should change stack capacity and log the change', async ({ page }) => {
    await page.fill('#capacity', '5');
    await page.click('#capacity');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Capacity set to 5');
  });

  test('should handle capacity decrease and log dropped elements', async ({ page }) => {
    await page.fill('#capacity', '1');
    await page.click('#capacity');
    await page.fill('#value', '42');
    await page.click('#btnPush');
    await page.fill('#value', '43');
    await page.click('#btnPush');

    await page.fill('#capacity', '1');
    await page.click('#capacity');

    const logMessage = await page.textContent('#log p:last-child');
    expect(logMessage).toContain('Capacity decreased to 1; top elements dropped');
  });

  test('should toggle animation', async ({ page }) => {
    await page.selectOption('#animate', 'off');
    const selected = await page.$eval('#animate', el => el.value);
    expect(selected).toBe('off');
  });

  test('should run demo push sequence', async ({ page }) => {
    await page.click('#demoPush');
    await page.waitForTimeout(5000); // wait for demo to complete

    const size = await page.textContent('#size');
    expect(size).toBe('8'); // assuming demo fills the stack to capacity
  });

  test('should run demo pop sequence', async ({ page }) => {
    await page.fill('#value', 'A');
    await page.click('#btnPush');
    await page.click('#demoPop');
    await page.waitForTimeout(5000); // wait for demo to complete

    const size = await page.textContent('#size');
    expect(size).toBe('0'); // assuming demo pops all elements
  });
});