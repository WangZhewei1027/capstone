import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1d5f32-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Interactive Weighted Graph Demo', () => {
  
  test('should start in Idle state', async ({ page }) => {
    const status = await page.locator('#status').innerText();
    expect(status).toContain('Nodes: 0 • Edges: 0');
  });

  test('should switch to Add Node mode', async ({ page }) => {
    await page.click('#mode-add-node');
    const isActive = await page.locator('#mode-add-node').evaluate(node => node.classList.contains('active'));
    expect(isActive).toBe(true);
  });

  test('should add a node in Add Node mode', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Simulate clicking on the canvas
    const nodes = await page.locator('g.node-group').count();
    expect(nodes).toBe(1);
  });

  test('should switch to Add Edge mode and add an edge', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add first node
    await page.mouse.click(200, 200); // Add second node
    await page.click('#mode-add-edge');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click first node as source
    await page.mouse.click('g.node-group[data-id="2"]'); // Click second node as target
    await page.keyboard.type('5'); // Enter weight
    await page.keyboard.press('Enter'); // Confirm weight
    const edges = await page.locator('g.edge-group').count();
    expect(edges).toBe(1);
  });

  test('should switch to Move mode and drag a node', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add a node
    await page.click('#mode-move');
    await page.mouse.move(100, 100);
    await page.mouse.down();
    await page.mouse.move(150, 150); // Drag node
    await page.mouse.up();
    const nodeTransform = await page.locator('g.node-group').getAttribute('transform');
    expect(nodeTransform).toContain('translate(150,150)');
  });

  test('should switch to Delete mode and delete a node', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add a node
    await page.click('#mode-delete');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click node to delete
    await page.click('text=OK'); // Confirm deletion
    const nodes = await page.locator('g.node-group').count();
    expect(nodes).toBe(0);
  });

  test('should clear the graph', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add a node
    await page.click('#clear-graph');
    await page.click('text=OK'); // Confirm clear
    const nodes = await page.locator('g.node-group').count();
    expect(nodes).toBe(0);
  });

  test('should generate a random graph', async ({ page }) => {
    await page.click('#random-graph');
    const nodes = await page.locator('g.node-group').count();
    expect(nodes).toBeGreaterThan(0); // Ensure some nodes were created
  });

  test('should set source and target for Dijkstra', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add first node
    await page.mouse.click(200, 200); // Add second node
    await page.click('#mode-add-edge');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click first node as source
    await page.mouse.click('g.node-group[data-id="2"]'); // Click second node as target
    await page.keyboard.type('5'); // Enter weight
    await page.keyboard.press('Enter'); // Confirm weight
    await page.click('#set-src');
    await page.mouse.click('g.node-group[data-id="1"]'); // Set source
    await page.click('#set-tgt');
    await page.mouse.click('g.node-group[data-id="2"]'); // Set target
    const srcValue = await page.locator('#alg-src').inputValue();
    const tgtValue = await page.locator('#alg-tgt').inputValue();
    expect(srcValue).toBe('1');
    expect(tgtValue).toBe('2');
  });

  test('should run Dijkstra algorithm', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add first node
    await page.mouse.click(200, 200); // Add second node
    await page.click('#mode-add-edge');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click first node as source
    await page.mouse.click('g.node-group[data-id="2"]'); // Click second node as target
    await page.keyboard.type('5'); // Enter weight
    await page.keyboard.press('Enter'); // Confirm weight
    await page.click('#set-src');
    await page.mouse.click('g.node-group[data-id="1"]'); // Set source
    await page.click('#set-tgt');
    await page.mouse.click('g.node-group[data-id="2"]'); // Set target
    await page.click('#dijkstra-btn'); // Run Dijkstra
    const result = await page.locator('#log').innerText();
    expect(result).toContain('Dijkstra: shortest');
  });

  test('should handle edge info shown', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add first node
    await page.mouse.click(200, 200); // Add second node
    await page.click('#mode-add-edge');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click first node as source
    await page.mouse.click('g.node-group[data-id="2"]'); // Click second node as target
    await page.keyboard.type('5'); // Enter weight
    await page.keyboard.press('Enter'); // Confirm weight
    await page.click('g.edge-group line'); // Click edge to show info
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Edge');
    await alertText.dismiss();
  });

  test('should show error alert for invalid weight', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add first node
    await page.mouse.click(200, 200); // Add second node
    await page.click('#mode-add-edge');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click first node as source
    await page.mouse.click('g.node-group[data-id="2"]'); // Click second node as target
    await page.keyboard.type('invalid'); // Enter invalid weight
    await page.keyboard.press('Enter'); // Confirm weight
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Invalid weight');
    await alertText.dismiss();
  });

  test('should handle edge deletion confirmation', async ({ page }) => {
    await page.click('#mode-add-node');
    await page.mouse.click(100, 100); // Add first node
    await page.mouse.click(200, 200); // Add second node
    await page.click('#mode-add-edge');
    await page.mouse.click('g.node-group[data-id="1"]'); // Click first node as source
    await page.mouse.click('g.node-group[data-id="2"]'); // Click second node as target
    await page.keyboard.type('5'); // Enter weight
    await page.keyboard.press('Enter'); // Confirm weight
    await page.click('#mode-delete');
    await page.mouse.click('g.edge-group line'); // Click edge to delete
    const alertText = await page.waitForEvent('dialog');
    expect(alertText.message()).toContain('Delete this edge?');
    await alertText.dismiss(); // Cancel deletion
    const edges = await page.locator('g.edge-group').count();
    expect(edges).toBe(1); // Edge should still exist
  });

});