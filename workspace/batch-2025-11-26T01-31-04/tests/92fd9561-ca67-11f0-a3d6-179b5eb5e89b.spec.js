import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fd9561-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Red-Black Tree Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const message = await page.locator('#message').innerText();
    expect(message).toBe('');
  });

  test('Insert button is enabled initially', async () => {
    const insertButton = await page.locator('#insertBtn');
    await expect(insertButton).toBeEnabled();
  });

  test('Insert without value shows error', async () => {
    await page.click('#insertBtn');
    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Input cannot be empty');
  });

  test('Insert valid value updates tree', async () => {
    await page.fill('#inputValue', '10');
    await page.click('#insertBtn');
    await page.waitForTimeout(1000); // Wait for validation and insertion
    const message = await page.locator('#message').innerText();
    expect(message).toBe('Node inserted successfully');
    const treeSvg = await page.locator('#treeSvg');
    await expect(treeSvg).toHaveCount(1); // Check if tree has been updated
  });

  test('Insert invalid value shows error', async () => {
    await page.fill('#inputValue', 'invalid');
    await page.click('#insertBtn');
    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Invalid input');
  });

  test('Delete button functionality', async () => {
    await page.fill('#inputValue', '10');
    await page.click('#insertBtn');
    await page.waitForTimeout(1000);
    await page.click('#deleteBtn');
    const message = await page.locator('#message').innerText();
    expect(message).toBe('Node deleted successfully');
  });

  test('Clear tree functionality', async () => {
    await page.fill('#inputValue', '20');
    await page.click('#insertBtn');
    await page.waitForTimeout(1000);
    await page.click('#clearBtn');
    const message = await page.locator('#message').innerText();
    expect(message).toBe('Tree cleared successfully');
    const treeSvg = await page.locator('#treeSvg');
    await expect(treeSvg).toHaveCount(0); // Check if tree has been cleared
  });

  test('Clear button disabled when tree is empty', async () => {
    const clearButton = await page.locator('#clearBtn');
    await expect(clearButton).toBeDisabled();
  });

  test('Dismiss error alert', async () => {
    await page.fill('#inputValue', 'invalid');
    await page.click('#insertBtn');
    const message = await page.locator('#message').innerText();
    expect(message).toContain('Error: Invalid input');
    await page.click('#dismissErrorBtn'); // Assuming there's a button to dismiss the error
    const newMessage = await page.locator('#message').innerText();
    expect(newMessage).toBe('');
  });
});