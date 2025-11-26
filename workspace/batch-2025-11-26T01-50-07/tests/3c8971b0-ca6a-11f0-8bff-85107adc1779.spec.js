import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c8971b0-ca6a-11f0-8bff-85107adc1779.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Linear Search Visualization', () => {
  
  test('should initialize with default array and no message', async ({ page }) => {
    const arrayInputValue = await page.locator('#arrayInput').inputValue();
    const messageText = await page.locator('#message').textContent();
    
    expect(arrayInputValue).toBe('4, 2, 9, 7, 3, 8, 10, 1');
    expect(messageText).toBe('');
  });

  test('should reset the array when Reset Array button is clicked', async ({ page }) => {
    await page.locator('#resetArray').click();
    
    const arrayElements = await page.locator('.array-element').count();
    const messageText = await page.locator('#message').textContent();
    
    expect(arrayElements).toBe(8); // Default array length
    expect(messageText).toBe('');
  });

  test('should start searching when Start Search button is clicked', async ({ page }) => {
    await page.locator('#searchInput').fill('9');
    await page.locator('#startSearch').click();
    
    const messageText = await page.locator('#message').textContent();
    expect(messageText).toContain('Starting linear search...');
    
    await page.waitForTimeout(2000); // Wait for search to process
    const foundElement = await page.locator('.array-element.found').count();
    
    expect(foundElement).toBe(1); // Expect one element to be found
  });

  test('should highlight the found element', async ({ page }) => {
    await page.locator('#searchInput').fill('3');
    await page.locator('#startSearch').click();
    
    await page.waitForTimeout(2000); // Wait for search to process
    const foundElement = await page.locator('.array-element.found').count();
    
    expect(foundElement).toBe(1); // Expect one element to be found
  });

  test('should display not found message when element is not in the array', async ({ page }) => {
    await page.locator('#searchInput').fill('100');
    await page.locator('#startSearch').click();
    
    await page.waitForTimeout(2000); // Wait for search to process
    const messageText = await page.locator('#message').textContent();
    
    expect(messageText).toContain('not found in the array');
  });

  test('should alert when searching with invalid input', async ({ page }) => {
    await page.locator('#searchInput').fill('invalid');
    await page.locator('#startSearch').click();
    
    const alertPromise = page.waitForEvent('dialog');
    await alertPromise;
    const alert = await page.locator('dialog');
    
    expect(await alert.textContent()).toContain('Please enter a valid number to search for.');
    await alert.evaluate(dialog => dialog.close());
  });

  test('should alert when searching with empty array', async ({ page }) => {
    await page.locator('#arrayInput').fill('');
    await page.locator('#resetArray').click();
    await page.locator('#searchInput').fill('3');
    await page.locator('#startSearch').click();
    
    const alertPromise = page.waitForEvent('dialog');
    await alertPromise;
    const alert = await page.locator('dialog');
    
    expect(await alert.textContent()).toContain('Array is empty or invalid. Please enter a valid array.');
    await alert.evaluate(dialog => dialog.close());
  });

  test('should not allow searching while already searching', async ({ page }) => {
    await page.locator('#searchInput').fill('9');
    await page.locator('#startSearch').click();
    
    await page.waitForTimeout(1000); // Wait for search to start
    await page.locator('#startSearch').click(); // Attempt to start search again
    
    const messageText = await page.locator('#message').textContent();
    expect(messageText).toContain('Starting linear search...');
  });

  test('should reset the search state when Reset Array button is clicked during search', async ({ page }) => {
    await page.locator('#searchInput').fill('9');
    await page.locator('#startSearch').click();
    
    await page.waitForTimeout(1000); // Wait for search to start
    await page.locator('#resetArray').click(); // Reset during search
    
    const messageText = await page.locator('#message').textContent();
    expect(messageText).toBe('');
    
    const arrayElements = await page.locator('.array-element').count();
    expect(arrayElements).toBe(8); // Default array length
  });

});