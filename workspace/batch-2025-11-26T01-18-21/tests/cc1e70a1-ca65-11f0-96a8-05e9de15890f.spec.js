import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e70a1-ca65-11f0-96a8-05e9de15890f.html';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test.describe('Kruskal Algorithm Visualizer', () => {
  
  test('Initial state should be Idle', async ({ page }) => {
    const status = await page.textContent('#status');
    expect(status).toBe('Ready');
  });

  test('Add Node button activates Add Node mode', async ({ page }) => {
    await page.click('#addNodeBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Click on canvas to add a node.');
  });

  test('Clicking on canvas adds a node', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    const nodes = await page.$$('.node-g');
    expect(nodes.length).toBe(1); // Check if one node is added
  });

  test('Add Edge button activates Add Edge mode', async ({ page }) => {
    await page.click('#addEdgeBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Click first node to start edge creation.');
  });

  test('Clicking on two nodes adds an edge', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 }); // First node
    await page.click('.node-g', { index: 1 }); // Second node
    await page.fill('text=Edge weight:', '5'); // Assuming prompt appears
    await page.click('text=OK'); // Confirm the prompt

    const edges = await page.$$('.edge-line');
    expect(edges.length).toBe(1); // Check if one edge is added
  });

  test('Random Graph button generates a random graph', async ({ page }) => {
    await page.click('#randomBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Random graph created.');
  });

  test('Clear button clears the graph', async ({ page }) => {
    await page.click('#randomBtn');
    await page.click('#clearBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Cleared graph.');
    const nodes = await page.$$('.node-g');
    const edges = await page.$$('.edge-line');
    expect(nodes.length).toBe(0);
    expect(edges.length).toBe(0);
  });

  test('Run button starts the algorithm', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#runBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Running KRUSKAL...');
  });

  test('Step button advances the algorithm', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#runBtn');
    await page.click('#stepBtn');
    const status = await page.textContent('#status');
    expect(status).toContain('Accepted edge'); // Check for log entry
  });

  test('Back button steps back in the algorithm', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#runBtn');
    await page.click('#stepBtn');
    await page.click('#backBtn');
    const status = await page.textContent('#status');
    expect(status).toContain('Stepped back.');
  });

  test('Auto button toggles auto stepping', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#autoBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Auto stepping...');
  });

  test('Reset Algorithm button resets the algorithm', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#runBtn');
    await page.click('#resetAlgoBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Algorithm reset.');
  });

  test('Shuffle button shuffles edges', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#shuffleBtn');
    const status = await page.textContent('#status');
    expect(status).toBe('Edges shuffled.');
  });

  test('Change speed slider updates auto step speed', async ({ page }) => {
    await page.click('#speedRange');
    await page.fill('#speedRange', '1000');
    const value = await page.inputValue('#speedRange');
    expect(value).toBe('1000');
  });

  test('Focus button highlights an edge', async ({ page }) => {
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 100, y: 100 } });
    await page.click('#addNodeBtn');
    await page.click('#svg', { position: { x: 200, y: 200 } });
    await page.click('#addEdgeBtn');
    await page.click('.node-g', { index: 0 });
    await page.click('.node-g', { index: 1 });
    await page.fill('text=Edge weight:', '5');
    await page.click('text=OK');

    await page.click('#edgeList button'); // Assuming the first edge is focused
    const edge = await page.$('.selected-edge');
    expect(edge).not.toBeNull(); // Check if edge is highlighted
  });

});