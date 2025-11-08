import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/11-08-0003/html/1f66c130-bcac-11f0-a7b3-d9b8a03a03c8.html';

test.describe('Topological Sort Interactive Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should start in the idle state', async ({ page }) => {
    const output = await page.locator('#output').innerText();
    expect(output).toBe('');
  });

  test('should add a node and transition to node_added state', async ({ page }) => {
    await page.click('#addNode');
    const nodes = await page.locator('.node').count();
    expect(nodes).toBe(1);
    const output1 = await page.locator('#output1').innerText();
    expect(output).toBe('');
  });

  test('should add multiple nodes', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#addNode');
    const nodes1 = await page.locator('.node').count();
    expect(nodes).toBe(2);
  });

  test('should sort nodes and transition to sorting state', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#addNode');
    await page.click('#sort');
    await page.waitForTimeout(1000); // Wait for sorting animation
    const output2 = await page.locator('#output2').innerText();
    expect(output).toContain('Sorted Output:');
  });

  test('should complete sorting and transition to done state', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#addNode');
    await page.click('#sort');
    await page.waitForTimeout(1000); // Wait for sorting animation
    const output3 = await page.locator('#output3').innerText();
    expect(output).toContain('Sorted Output:');
  });

  test('should reset and return to idle state', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#sort');
    await page.click('#reset');
    const nodes2 = await page.locator('.node').count();
    expect(nodes).toBe(0);
    const output4 = await page.locator('#output4').innerText();
    expect(output).toBe('');
  });

  test('should handle multiple resets', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#reset');
    await page.click('#addNode');
    await page.click('#reset');
    const nodes3 = await page.locator('.node').count();
    expect(nodes).toBe(0);
  });

  test('should not sort without nodes', async ({ page }) => {
    await page.click('#sort');
    const output5 = await page.locator('#output5').innerText();
    expect(output).toBe(''); // Assuming no output when sorting without nodes
  });

  test('should display error when trying to sort with insufficient nodes', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#sort');
    const output6 = await page.locator('#output6').innerText();
    expect(output).toContain('Error: Not enough nodes to sort'); // Assuming an error message
  });

  test('should allow adding nodes after reset', async ({ page }) => {
    await page.click('#addNode');
    await page.click('#reset');
    await page.click('#addNode');
    const nodes4 = await page.locator('.node').count();
    expect(nodes).toBe(1);
  });
});