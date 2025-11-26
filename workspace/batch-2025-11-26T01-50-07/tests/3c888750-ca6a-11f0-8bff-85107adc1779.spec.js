import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-50-07/html/3c888750-ca6a-11f0-8bff-85107adc1779.html';

test.describe('Weighted Graph Visualization - Dijkstra\'s Shortest Path Algorithm', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should display initial instructions', async ({ page }) => {
    const instructions = await page.locator('#pathResult').textContent();
    expect(instructions).toContain('Click a node to select Start node.');
  });

  test('should transition to SelectingStartNode state on first node click', async ({ page }) => {
    await page.click('#graphCanvas');
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('Start node selected');
  });

  test('should transition to SelectingEndNode state on second node click', async ({ page }) => {
    await page.click('#graphCanvas'); // Select start node
    await page.click('#graphCanvas'); // Select end node
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('Shortest path distance');
  });

  test('should reset selection when clicking on the same start node', async ({ page }) => {
    await page.click('#graphCanvas'); // Select start node
    await page.click('#graphCanvas'); // Select end node
    await page.click('#graphCanvas'); // Click start node again to reset
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('Click a node to select Start node.');
  });

  test('should display no path message if no path exists', async ({ page }) => {
    await page.click('#graphCanvas'); // Select start node
    await page.click('#graphCanvas'); // Select end node
    // Assuming the selected nodes do not have a path
    await page.click('#graphCanvas'); // Click another node to reset and select again
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('No path found between selected nodes.');
  });

  test('should reset selections on clicking Reset button', async ({ page }) => {
    await page.click('#graphCanvas'); // Select start node
    await page.click('#graphCanvas'); // Select end node
    await page.click('#resetSelection'); // Click reset button
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('Click a node to select Start node.');
  });

  test('should randomize graph on clicking Randomize button', async ({ page }) => {
    await page.click('#randomizeGraph'); // Click randomize button
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('Click a node to select Start node.');
  });

  test('should highlight the path when a valid path is calculated', async ({ page }) => {
    await page.click('#graphCanvas'); // Select start node
    await page.click('#graphCanvas'); // Select end node
    const pathHighlighted = await page.evaluate(() => {
      // Check if any path highlighting is done in the canvas
      const canvas = document.getElementById('graphCanvas');
      const ctx = canvas.getContext('2d');
      // Assuming the path is highlighted in red
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      // Check for red pixels indicating path highlighting
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0) {
          return true; // Found a red pixel
        }
      }
      return false; // No red pixels found
    });
    expect(pathHighlighted).toBe(true);
  });

  test('should handle edge case of clicking on a node with no path', async ({ page }) => {
    await page.click('#graphCanvas'); // Select start node
    await page.click('#graphCanvas'); // Select end node
    // Click on a node that does not connect to the selected nodes
    await page.click('#graphCanvas');
    const resultText = await page.locator('#pathResult').textContent();
    expect(resultText).toContain('No path found between selected nodes.');
  });
});