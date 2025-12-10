import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-test-1205-2/html/2493d1d3-d1d2-11f0-a359-f3a4ddd3c298.html';

test.describe('Graph Adjacency List Application', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application page before each test
    await page.goto(BASE_URL);
  });

  test('Initial state should render input fields and button', async ({ page }) => {
    // Verify that the initial state (Idle) renders the input fields and button
    const vertexInput = await page.locator('#vertex');
    const edgesInput = await page.locator('#edges');
    const addButton = await page.locator('button[onclick="addEdge()"]');

    await expect(vertexInput).toBeVisible();
    await expect(edgesInput).toBeVisible();
    await expect(addButton).toBeVisible();
  });

  test('Adding an edge updates the adjacency list', async ({ page }) => {
    // Test adding a valid edge and verify the adjacency list is updated
    await page.fill('#vertex', 'A');
    await page.fill('#edges', 'B,C');
    await page.click('button[onclick="addEdge()"]');

    const outputDiv = await page.locator('#output');
    await expect(outputDiv).toContainText('A: B, C');
  });

  test('Adding an edge with empty vertex shows alert', async ({ page }) => {
    // Test adding an edge with an empty vertex and verify alert is shown
    await page.fill('#edges', 'B,C');
    await page.click('button[onclick="addEdge()"]');

    page.on('dialog', async dialog => {
      await expect(dialog.message()).toBe('Both vertex and edges are required!');
      await dialog.dismiss();
    });
  });

  test('Adding an edge with empty edges shows alert', async ({ page }) => {
    // Test adding an edge with empty edges and verify alert is shown
    await page.fill('#vertex', 'A');
    await page.click('button[onclick="addEdge()"]');

    page.on('dialog', async dialog => {
      await expect(dialog.message()).toBe('Both vertex and edges are required!');
      await dialog.dismiss();
    });
  });

  test('Adding multiple edges for the same vertex', async ({ page }) => {
    // Test adding multiple edges for the same vertex and verify the adjacency list is updated correctly
    await page.fill('#vertex', 'A');
    await page.fill('#edges', 'B');
    await page.click('button[onclick="addEdge()"]');

    await page.fill('#vertex', 'A');
    await page.fill('#edges', 'C');
    await page.click('button[onclick="addEdge()"]');

    const outputDiv1 = await page.locator('#output');
    await expect(outputDiv).toContainText('A: B, C');
  });

  test('Adding edges for different vertices', async ({ page }) => {
    // Test adding edges for different vertices and verify the adjacency list is updated correctly
    await page.fill('#vertex', 'A');
    await page.fill('#edges', 'B');
    await page.click('button[onclick="addEdge()"]');

    await page.fill('#vertex', 'B');
    await page.fill('#edges', 'C');
    await page.click('button[onclick="addEdge()"]');

    const outputDiv2 = await page.locator('#output');
    await expect(outputDiv).toContainText('A: B');
    await expect(outputDiv).toContainText('B: C');
  });

  test('Check alert for invalid input', async ({ page }) => {
    // Test for invalid input and expect an alert to be shown
    await page.fill('#vertex', 'A');
    await page.fill('#edges', '');
    await page.click('button[onclick="addEdge()"]');

    page.on('dialog', async dialog => {
      await expect(dialog.message()).toBe('Both vertex and edges are required!');
      await dialog.dismiss();
    });
  });

});