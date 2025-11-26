import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fea6d1-ca67-11f0-a3d6-179b5eb5e89b.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('BFS Visualization Application', () => {
  
  test('Initial state should be Idle', async ({ page }) => {
    const infoText = await page.locator('#info').textContent();
    expect(infoText).toBe('');
  });

  test('Set Start node', async ({ page }) => {
    await page.click('#setStartBtn');
    await page.click('.node:nth-child(1)'); // Click on the first node
    const startNode = await page.locator('.node.start').count();
    expect(startNode).toBe(1); // Verify one start node is set
  });

  test('Set Target node', async ({ page }) => {
    await page.click('#setTargetBtn');
    await page.click('.node:nth-child(2)'); // Click on the second node
    const targetNode = await page.locator('.node.target').count();
    expect(targetNode).toBe(1); // Verify one target node is set
  });

  test('Toggle Wall on a node', async ({ page }) => {
    await page.click('#toggleWallBtn');
    await page.click('.node:nth-child(3)'); // Click on the third node
    const wallNode = await page.locator('.node.wall').count();
    expect(wallNode).toBe(1); // Verify one wall node is set
  });

  test('Run BFS with valid start and target', async ({ page }) => {
    await page.click('#runBFSBtn');
    const infoText = await page.locator('#info').textContent();
    expect(infoText).toContain('Searching...'); // Check if BFS is running
  });

  test('Clear the grid', async ({ page }) => {
    await page.click('#clearBtn');
    const startNode = await page.locator('.node.start').count();
    const targetNode = await page.locator('.node.target').count();
    const wallNode = await page.locator('.node.wall').count();
    expect(startNode).toBe(0); // Verify no start node
    expect(targetNode).toBe(0); // Verify no target node
    expect(wallNode).toBe(0); // Verify no wall nodes
  });

  test('Attempt to run BFS without setting start and target', async ({ page }) => {
    await page.click('#runBFSBtn');
    const infoText = await page.locator('#info').textContent();
    expect(infoText).toContain('Please set both start and target nodes.'); // Check error message
  });

  test('Toggle wall on start or target node should not work', async ({ page }) => {
    await page.click('#setStartBtn');
    await page.click('.node:nth-child(1)'); // Set start
    await page.click('#setTargetBtn');
    await page.click('.node:nth-child(2)'); // Set target
    await page.click('#toggleWallBtn');
    await page.click('.node:nth-child(1)'); // Attempt to toggle start node
    await page.click('.node:nth-child(2)'); // Attempt to toggle target node
    const startNodeClass = await page.locator('.node.start').count();
    const targetNodeClass = await page.locator('.node.target').count();
    expect(startNodeClass).toBe(1); // Start node should remain
    expect(targetNodeClass).toBe(1); // Target node should remain
  });

  test('Run BFS with walls blocking the path', async ({ page }) => {
    await page.click('#setStartBtn');
    await page.click('.node:nth-child(1)'); // Set start
    await page.click('#setTargetBtn');
    await page.click('.node:nth-child(10)'); // Set target
    await page.click('#toggleWallBtn');
    await page.click('.node:nth-child(5)'); // Toggle wall
    await page.click('#runBFSBtn');
    const infoText = await page.locator('#info').textContent();
    expect(infoText).toContain('Target not reachable.'); // Check if BFS finds no path
  });

  test('Clear grid while BFS is running', async ({ page }) => {
    await page.click('#setStartBtn');
    await page.click('.node:nth-child(1)'); // Set start
    await page.click('#setTargetBtn');
    await page.click('.node:nth-child(10)'); // Set target
    await page.click('#runBFSBtn');
    await page.click('#clearBtn'); // Attempt to clear while BFS is running
    const infoText = await page.locator('#info').textContent();
    expect(infoText).toContain('Searching...'); // BFS should still be running
  });

  test('Stop BFS with clear button', async ({ page }) => {
    await page.click('#setStartBtn');
    await page.click('.node:nth-child(1)'); // Set start
    await page.click('#setTargetBtn');
    await page.click('.node:nth-child(10)'); // Set target
    await page.click('#runBFSBtn');
    await page.click('#clearBtn'); // Clear while BFS is running
    const infoText = await page.locator('#info').textContent();
    expect(infoText).toContain('Target not reachable.'); // Check if BFS stops
  });

});