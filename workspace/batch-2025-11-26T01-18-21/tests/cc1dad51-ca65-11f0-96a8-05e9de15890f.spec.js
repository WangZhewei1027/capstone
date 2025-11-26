import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1dad51-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Bubble Sort Visualization Tests', () => {
  
  test('should initialize in Idle state', async ({ page }) => {
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Idle');
  });

  test('should generate a random array and transition to Idle', async ({ page }) => {
    await page.click('#randomBtn');
    const arrayInputValue = await page.inputValue('#arrayInput');
    expect(arrayInputValue).not.toBe('');
    const bars = await page.$$('.bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  test('should shuffle the current array and transition to Idle', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#shuffleBtn');
    const arrayInputValue = await page.inputValue('#arrayInput');
    expect(arrayInputValue).not.toBe('');
    const bars = await page.$$('.bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  test('should reset the array and remain in Idle', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#resetBtn');
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Idle');
  });

  test('should start the sorting process and transition to AutoRunning', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#startBtn');
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Running');
  });

  test('should pause the sorting process and transition to Paused', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#startBtn');
    await page.click('#pauseBtn');
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Paused');
  });

  test('should step through the sorting process and transition to SteppingOne', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#stepBtn');
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Comparing'); // or 'Swapped' based on the state
  });

  test('should handle user input and transition to InputResetFromUser', async ({ page }) => {
    await page.fill('#arrayInput', '5,3,8,1,2');
    await page.click('#useInputBtn');
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Idle'); // should return to Idle after input
  });

  test('should alert on invalid user input', async ({ page }) => {
    await page.fill('#arrayInput', 'invalid,input');
    await page.click('#useInputBtn');
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toBe('Invalid input. Please enter comma separated numbers.');
    await alertText.dismiss();
  });

  test('should change array size and reflect in the UI', async ({ page }) => {
    await page.fill('#size', '20');
    const sizeLabel = await page.textContent('#sizeLabel');
    expect(sizeLabel).toBe('20');
  });

  test('should change speed and reflect in the UI', async ({ page }) => {
    await page.fill('#speed', '500');
    const speedLabel = await page.textContent('#speedLabel');
    expect(speedLabel).toBe('500');
  });

  test('should toggle ascending option', async ({ page }) => {
    await page.check('#ascending');
    const isChecked = await page.isChecked('#ascending');
    expect(isChecked).toBe(true);
  });

  test('should toggle optimized option', async ({ page }) => {
    await page.check('#optimized');
    const isChecked = await page.isChecked('#optimized');
    expect(isChecked).toBe(true);
  });

  test('should complete the sorting process and transition to Done', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#startBtn');
    await page.waitForTimeout(2000); // wait for sorting to complete
    const actionText = await page.textContent('#action');
    expect(actionText).toBe('Finished');
  });

  test('should handle keyboard shortcuts for starting and pausing', async ({ page }) => {
    await page.click('#randomBtn');
    await page.keyboard.press('Space');
    let actionText = await page.textContent('#action');
    expect(actionText).toBe('Running');
    
    await page.keyboard.press('Space');
    actionText = await page.textContent('#action');
    expect(actionText).toBe('Paused');
  });

  test('should step through sorting using keyboard shortcuts', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#startBtn');
    await page.keyboard.press('ArrowRight');
    const actionText = await page.textContent('#action');
    expect(actionText).toMatch(/Comparing|Swapped/); // Check if it's in comparing or swapped state
  });
  
});