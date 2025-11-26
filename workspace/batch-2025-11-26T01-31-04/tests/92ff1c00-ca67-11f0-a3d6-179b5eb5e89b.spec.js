import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92ff1c00-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Knapsack Problem Solver', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    const resultText = await page.textContent('#result');
    expect(resultText).toBe('');
  });

  test('User inputs items and enables solve button', async ({ page }) => {
    await page.fill('#itemsInput', 'Gold, 10, 60\nSilver, 20, 100\nBronze, 30, 120');
    await page.fill('#capacityInput', '50');
    
    const solveButton = page.locator('#solveBtn');
    await expect(solveButton).toBeEnabled();
  });

  test('User clicks solve with valid inputs and sees result', async ({ page }) => {
    await page.fill('#itemsInput', 'Gold, 10, 60\nSilver, 20, 100\nBronze, 30, 120');
    await page.fill('#capacityInput', '50');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Maximum value achievable: 220');
    expect(resultText).toContain('Items chosen:');
    expect(resultText).toContain('Gold\t10\t60');
    expect(resultText).toContain('Silver\t20\t100');
  });

  test('User clicks solve with empty items input and sees error', async ({ page }) => {
    await page.fill('#capacityInput', '50');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Error: Please enter at least one item.');
  });

  test('User clicks solve with invalid capacity input and sees error', async ({ page }) => {
    await page.fill('#itemsInput', 'Gold, 10, 60\nSilver, 20, 100\nBronze, 30, 120');
    await page.fill('#capacityInput', '0');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Error: Knapsack capacity must be a positive integer.');
  });

  test('User clicks solve with invalid item format and sees error', async ({ page }) => {
    await page.fill('#itemsInput', 'InvalidItemFormat');
    await page.fill('#capacityInput', '50');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Error: Line 1: Invalid format. Expected "name, weight, value".');
  });

  test('User clicks solve with negative weight and sees error', async ({ page }) => {
    await page.fill('#itemsInput', 'Gold, -10, 60');
    await page.fill('#capacityInput', '50');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Error: Line 1: Weight must be a positive integer.');
  });

  test('User clicks solve with empty capacity and sees error', async ({ page }) => {
    await page.fill('#itemsInput', 'Gold, 10, 60\nSilver, 20, 100');
    await page.fill('#capacityInput', '');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Error: Please enter knapsack capacity.');
  });

  test('User clicks solve with invalid value and sees error', async ({ page }) => {
    await page.fill('#itemsInput', 'Gold, 10, -60');
    await page.fill('#capacityInput', '50');
    
    await page.click('#solveBtn');
    
    const resultText = await page.textContent('#result');
    expect(resultText).toContain('Error: Line 1: Value must be a non-negative integer.');
  });
});