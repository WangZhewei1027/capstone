import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e70a2-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Prim\'s Algorithm Visualizer Tests', () => {
  
  test('should initialize with default graph', async ({ page }) => {
    const nodeCountLabel = await page.locator('#nodeCountLabel');
    const densityLabel = await page.locator('#densityLabel');
    const maxWLabel = await page.locator('#maxWLabel');
    
    await expect(nodeCountLabel).toHaveText('10');
    await expect(densityLabel).toHaveText('0.40');
    await expect(maxWLabel).toHaveText('20');
  });

  test('should generate a new random graph', async ({ page }) => {
    await page.click('#regen');
    const svgCanvas = await page.locator('#svgCanvas');
    
    // Wait for the graph to be generated
    await page.waitForTimeout(2000);
    await expect(svgCanvas).toHaveCount(1);
  });

  test('should allow user to choose a start node', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000); // Wait for graph generation

    await page.click('#selectStart');
    await page.click('svg g[data-id="0"]'); // Click on the first node

    const visitedList = await page.locator('#visitedList');
    await expect(visitedList).toContainText('0');
  });

  test('should step through the algorithm', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000);
    await page.click('#selectStart');
    await page.click('svg g[data-id="0"]');
    
    await page.click('#stepBtn');
    const pqList = await page.locator('#pqList');
    await expect(pqList).toHaveCount(1); // Expect at least one item in the priority queue
  });

  test('should auto run the algorithm', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000);
    await page.click('#selectStart');
    await page.click('svg g[data-id="0"]');
    
    await page.click('#autoRun');
    await page.waitForTimeout(3000); // Allow some time for auto run to execute

    const mstWeight = await page.locator('#mstWeight');
    await expect(mstWeight).not.toHaveText('0'); // Expect MST weight to change
  });

  test('should reset the algorithm', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000);
    await page.click('#selectStart');
    await page.click('svg g[data-id="0"]');
    
    await page.click('#stepBtn');
    await page.click('#clear'); // Reset the algorithm

    const visitedList = await page.locator('#visitedList');
    await expect(visitedList).toHaveText(''); // Expect visited list to be empty
  });

  test('should handle disconnected graph error', async ({ page }) => {
    await page.click('#nodeCount');
    await page.fill('#nodeCount', '3'); // Set a low number of nodes
    await page.click('#regen');
    await page.waitForTimeout(2000);

    await page.click('#selectStart');
    await page.click('svg g[data-id="0"]');
    
    await page.click('#stepBtn');
    await page.click('#stepBtn'); // Step multiple times to trigger error

    const alertMessage = await page.waitForEvent('dialog');
    await expect(alertMessage.message()).toContain('Priority queue empty. Graph might be disconnected.');
    await alertMessage.dismiss();
  });

  test('should allow dragging nodes', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000);
    
    const node = await page.locator('svg g[data-id="0"]');
    const nodeBoundingBox = await node.boundingBox();
    
    await page.mouse.move(nodeBoundingBox.x + nodeBoundingBox.width / 2, nodeBoundingBox.y + nodeBoundingBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(nodeBoundingBox.x + 50, nodeBoundingBox.y + 50); // Drag the node
    await page.mouse.up();

    const updatedNode = await page.locator('svg g[data-id="0"]');
    const updatedBoundingBox = await updatedNode.boundingBox();
    
    expect(updatedBoundingBox.x).not.toEqual(nodeBoundingBox.x); // Expect the node's x position to change
    expect(updatedBoundingBox.y).not.toEqual(nodeBoundingBox.y); // Expect the node's y position to change
  });

  test('should show tooltip on edge hover', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000);
    
    const edge = await page.locator('svg line[data-id="0"]');
    await edge.hover();

    const tooltip = await page.locator('#tooltip');
    await expect(tooltip).toBeVisible(); // Expect tooltip to be visible
  });

  test('should hide tooltip on edge leave', async ({ page }) => {
    await page.click('#regen');
    await page.waitForTimeout(2000);
    
    const edge = await page.locator('svg line[data-id="0"]');
    await edge.hover();
    await edge.hover({ force: true }); // Trigger tooltip to show

    const tooltip = await page.locator('#tooltip');
    await expect(tooltip).toBeVisible(); // Expect tooltip to be visible

    await edge.dispatchEvent('mouseleave'); // Simulate leaving the edge
    await expect(tooltip).toBeHidden(); // Expect tooltip to be hidden
  });

});