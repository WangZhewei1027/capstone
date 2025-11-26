import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d8641-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Adjacency List Interactive Demo', () => {
  
  test('should add a node by clicking on the SVG canvas', async ({ page }) => {
    await page.click('#svgCanvas'); // Click on the canvas to add a node
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.length);
    expect(nodes).toBe(1); // Expect one node to be added
  });

  test('should enter edge creation mode', async ({ page }) => {
    await page.click('#modeAddEdge'); // Click to enter edge mode
    const isActive = await page.$eval('#modeAddEdge', btn => btn.classList.contains('active'));
    expect(isActive).toBe(true); // Expect the button to be active
  });

  test('should create an edge between two nodes', async ({ page }) => {
    await page.click('#svgCanvas'); // Add first node
    await page.click('#svgCanvas'); // Add second node
    await page.click('#modeAddEdge'); // Enter edge mode
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.map(node => node.getAttribute('data-node-id')));
    await page.click(`[data-node-id="${nodes[0]}"]`); // Select first node
    await page.click(`[data-node-id="${nodes[1]}"]`); // Select second node to create edge
    const edges = await page.$$eval('line[data-edge-id]', edges => edges.length);
    expect(edges).toBe(1); // Expect one edge to be created
  });

  test('should delete a selected node', async ({ page }) => {
    await page.click('#svgCanvas'); // Add a node
    await page.click('[data-node-id]'); // Select the node
    await page.click('#deleteSelected'); // Delete the selected node
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.length);
    expect(nodes).toBe(0); // Expect no nodes to remain
  });

  test('should delete a selected edge', async ({ page }) => {
    await page.click('#svgCanvas'); // Add first node
    await page.click('#svgCanvas'); // Add second node
    await page.click('#modeAddEdge'); // Enter edge mode
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.map(node => node.getAttribute('data-node-id')));
    await page.click(`[data-node-id="${nodes[0]}"]`); // Select first node
    await page.click(`[data-node-id="${nodes[1]}"]`); // Select second node to create edge
    await page.click('line[data-edge-id]'); // Select the edge
    await page.click('#deleteEdge'); // Delete the selected edge
    const edges = await page.$$eval('line[data-edge-id]', edges => edges.length);
    expect(edges).toBe(0); // Expect no edges to remain
  });

  test('should toggle directed edges', async ({ page }) => {
    await page.click('#svgCanvas'); // Add first node
    await page.click('#svgCanvas'); // Add second node
    await page.click('#modeAddEdge'); // Enter edge mode
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.map(node => node.getAttribute('data-node-id')));
    await page.click(`[data-node-id="${nodes[0]}"]`); // Select first node
    await page.click(`[data-node-id="${nodes[1]}"]`); // Select second node to create edge
    await page.click('#directed'); // Toggle directed checkbox
    const edges = await page.$$eval('line[data-edge-id]', edges => edges.length);
    expect(edges).toBe(1); // Expect one directed edge
  });

  test('should clear the graph with confirmation', async ({ page }) => {
    await page.click('#svgCanvas'); // Add a node
    await page.click('#clearBtn'); // Click clear button
    await page.evaluate(() => window.confirm = () => true); // Mock confirm dialog to always return true
    await page.click('#clearBtn'); // Confirm clear
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.length);
    expect(nodes).toBe(0); // Expect no nodes to remain
  });

  test('should load a sample graph', async ({ page }) => {
    await page.click('#sampleBtn'); // Load sample graph
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.length);
    const edges = await page.$$eval('line[data-edge-id]', edges => edges.length);
    expect(nodes).toBeGreaterThan(0); // Expect some nodes to be loaded
    expect(edges).toBeGreaterThan(0); // Expect some edges to be loaded
  });

  test('should export graph as JSON', async ({ page }) => {
    await page.click('#svgCanvas'); // Add a node
    await page.click('#exportBtn'); // Click to export
    const json = await page.evaluate(() => prompt('Copy this JSON', JSON.stringify(graph, null, 2)));
    expect(json).toContain('"nodes":'); // Expect JSON to contain nodes
  });

  test('should import graph from JSON', async ({ page }) => {
    await page.click('#svgCanvas'); // Add a node
    await page.click('#exportBtn'); // Export current graph
    const json = await page.evaluate(() => JSON.stringify({ nodes: [{ id: 1, label: 'A', x: 100, y: 100 }], edges: [] }));
    await page.evaluate((json) => prompt = () => json, json); // Mock prompt to return valid JSON
    await page.click('#importBtn'); // Import graph
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.length);
    expect(nodes).toBe(1); // Expect one node to be imported
  });

  test('should show error alert on invalid JSON import', async ({ page }) => {
    await page.click('#importBtn'); // Click import button
    await page.evaluate(() => prompt = () => 'invalid json'); // Mock prompt to return invalid JSON
    await page.click('#importBtn'); // Attempt to import
    const alertText = await page.waitForEvent('dialog'); // Wait for alert
    expect(alertText.message()).toContain('Failed to import JSON'); // Expect error message
    await alertText.dismiss(); // Dismiss alert
  });

  test('should handle edge already exists alert', async ({ page }) => {
    await page.click('#svgCanvas'); // Add first node
    await page.click('#svgCanvas'); // Add second node
    await page.click('#modeAddEdge'); // Enter edge mode
    const nodes = await page.$$eval('[data-node-id]', nodes => nodes.map(node => node.getAttribute('data-node-id')));
    await page.click(`[data-node-id="${nodes[0]}"]`); // Select first node
    await page.click(`[data-node-id="${nodes[1]}"]`); // Create edge
    await page.click(`[data-node-id="${nodes[0]}"]`); // Attempt to create the same edge again
    const alertText = await page.waitForEvent('dialog'); // Wait for alert
    expect(alertText.message()).toContain('Edge already exists'); // Expect error message
    await alertText.dismiss(); // Dismiss alert
  });

});