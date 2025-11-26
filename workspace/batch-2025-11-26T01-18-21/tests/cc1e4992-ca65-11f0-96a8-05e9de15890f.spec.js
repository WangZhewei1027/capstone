import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e4992-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Bellman-Ford Algorithm Visualization', () => {
  
  test('should initialize in Idle state', async ({ page }) => {
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Idle. Add nodes and edges, pick a source, then Start or Step.');
  });

  test('should add a node and transition to AddingNode state', async ({ page }) => {
    await page.click('#addNodeBtn');
    const nodesList = await page.locator('#nodesList').innerText();
    expect(nodesList).toContain('A'); // Assuming first node added is 'A'
  });

  test('should enter AddEdgeMode when Add Edge button is clicked', async ({ page }) => {
    await page.click('#addEdgeModeBtn');
    const isActive = await page.locator('#addEdgeModeBtn').evaluate(el => el.classList.contains('active'));
    expect(isActive).toBe(true);
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Edge creation mode: click source then destination');
  });

  test('should select a node and transition to NodeSelected state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('svg g[data-id]'); // Click the added node
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Node selected');
  });

  test('should remove selected node and transition back to Idle state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('svg g[data-id]'); // Select the node
    await page.click('#removeSelectedBtn'); // Remove the selected node
    const nodesList = await page.locator('#nodesList').innerText();
    expect(nodesList).not.toContain('A'); // Assuming the node was 'A'
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Selected node removed');
  });

  test('should generate a random graph', async ({ page }) => {
    await page.fill('#rndN', '5'); // Set number of nodes
    await page.fill('#rndP', '0.5'); // Set probability
    await page.fill('#rndRange', '-5..5'); // Set weight range
    await page.click('#rndGen'); // Generate random graph
    const nodesList = await page.locator('#nodesList').innerText();
    expect(nodesList.split('\n').length).toBeGreaterThan(1); // Expect more than one node
  });

  test('should set a source node and transition to AlgInitialized state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    const sourceSelectValue = await page.locator('#sourceSelect').inputValue();
    expect(sourceSelectValue).toBe('0'); // Assuming the first node has ID 0
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Source set to A'); // Assuming the node label is 'A'
  });

  test('should start the algorithm and transition to AlgInitialized state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    await page.click('#startBtn'); // Start the algorithm
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toContain('Initialized. Starting from A'); // Assuming source node is 'A'
  });

  test('should step through the algorithm and transition to RelaxingEdge state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    await page.click('#startBtn'); // Start the algorithm
    await page.click('#stepBtn'); // Step through
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toContain('Relaxing edge'); // Expect a message about relaxing an edge
  });

  test('should pause the algorithm and transition to Paused state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    await page.click('#startBtn'); // Start the algorithm
    await page.click('#pauseBtn'); // Pause the algorithm
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Paused.');
  });

  test('should reset the algorithm and transition back to Idle state', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    await page.click('#startBtn'); // Start the algorithm
    await page.click('#resetBtn'); // Reset the algorithm
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toBe('Reset complete.');
  });

  test('should detect negative cycles', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node first
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    await page.click('#startBtn'); // Start the algorithm
    await page.click('#detectNegBtn'); // Detect negative cycles
    const statusText = await page.locator('#statusText').innerText();
    expect(statusText).toContain('No negative-weight cycles detected reachable from the source.'); // Expect no cycles detected
  });

  test('should adjust speed and reflect in UI', async ({ page }) => {
    await page.fill('#speedRange', '1000'); // Adjust speed
    const speedValue = await page.locator('#speedVal').innerText();
    expect(speedValue).toBe('1000ms'); // Check if speed value is updated
  });

  test('should handle edge cases when no nodes are present', async ({ page }) => {
    await page.click('#startBtn'); // Attempt to start without nodes
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('No nodes');
  });

  test('should handle edge cases when no edges are present', async ({ page }) => {
    await page.click('#addNodeBtn'); // Add a node
    await page.click('#nodesList button[data-action="setSource"]'); // Set as source
    await page.click('#startBtn'); // Attempt to start without edges
    const alertText = await page.evaluate(() => window.alert);
    expect(alertText).toContain('No edges');
  });

});