import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdcb8160-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Fibonacci Sequence Application Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the Fibonacci Sequence application page before each test
    await page.goto(BASE_URL);
  });

  test('should display the correct title and description', async ({ page }) => {
    // Validate that the title and description are rendered correctly
    const title = await page.locator('h1').innerText();
    const description = await page.locator('p').innerText();

    expect(title).toBe('Fibonacci Series');
    expect(description).toBe(' Fibonacci sequence is an infinite series of numbers where each number after the first two is obtained by adding the previous two numbers together.');
  });

  test('should be in the Idle state on initial load', async ({ page }) => {
    // Validate that the application is in the Idle state by checking the rendered content
    const titleVisible = await page.locator('h1').isVisible();
    const descriptionVisible = await page.locator('p').isVisible();

    expect(titleVisible).toBe(true);
    expect(descriptionVisible).toBe(true);
  });

  test('should not have any interactive elements', async ({ page }) => {
    // Validate that there are no interactive elements in the application
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();

    expect(buttons).toBe(0);
    expect(inputs).toBe(0);
    expect(links).toBe(0);
  });

  test('should load the external script without errors', async ({ page }) => {
    // Validate that the external script loads correctly
    const scriptLoaded = await page.evaluate(() => {
      return typeof window.fibonacci !== 'undefined';
    });

    expect(scriptLoaded).toBe(true);
  });

  test('should handle edge cases gracefully', async ({ page }) => {
    // Since there are no interactive elements, we cannot test for user input edge cases.
    // However, we can check if the page remains stable under repeated loads.
    for (let i = 0; i < 5; i++) {
      await page.reload();
      const title = await page.locator('h1').innerText();
      expect(title).toBe('Fibonacci Series');
    }
  });

  test.afterEach(async ({ page }) => {
    // Any cleanup after each test can be done here if necessary
    // Currently, there is no specific cleanup needed
  });
});