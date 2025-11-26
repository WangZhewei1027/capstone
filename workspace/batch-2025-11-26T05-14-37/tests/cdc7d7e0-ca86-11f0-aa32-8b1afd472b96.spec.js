import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T05-14-37/html/cdc7d7e0-ca86-11f0-aa32-8b1afd472b96.html';

test.describe('Graph Interactive Application Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto(BASE_URL);
  });

  test('Initial state is Idle', async ({ page }) => {
    // Verify that the initial state is Idle
    const button = await page.locator('button[onclick="showGraph()"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Show Graph');
  });

  test('Clicking Show Graph button transitions to Graph Displayed state', async ({ page }) => {
    // Click the Show Graph button and verify the transition to Graph Displayed state
    await page.click('button[onclick="showGraph()"]');

    // Verify that the graph message is displayed
    const graphMessage = await page.locator('#graph');
    await expect(graphMessage).toBeVisible();
    await expect(graphMessage).toHaveText('Graph is not found.');
  });

  test('Graph Displayed state shows correct content', async ({ page }) => {
    // Click the Show Graph button to display the graph
    await page.click('button[onclick="showGraph()"]');

    // Verify the content displayed in the graph
    const lineContent = await page.locator('#line');
    await expect(lineContent).toBeVisible();
    await expect(lineContent).toHaveText(/edge/i); // Assuming edge content is dynamic
  });

  test('Graph is not found message is displayed when graph element is missing', async ({ page }) => {
    // Click the Show Graph button
    await page.click('button[onclick="showGraph()"]');

    // Verify that the graph message indicates that the graph is not found
    const graphMessage = await page.locator('#graph');
    await expect(graphMessage).toHaveText('Graph is not found.');
  });

  test('Edge case: Verify no errors when clicking Show Graph multiple times', async ({ page }) => {
    // Click the Show Graph button multiple times
    await page.click('button[onclick="showGraph()"]');
    await page.click('button[onclick="showGraph()"]');
    await page.click('button[onclick="showGraph()"]');

    // Verify that the graph message remains consistent
    const graphMessage = await page.locator('#graph');
    await expect(graphMessage).toHaveText('Graph is not found.');
  });

  test.afterEach(async ({ page }) => {
    // Optionally, perform any cleanup after each test
    // Currently, no specific teardown is required
  });
});