import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fecde0-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Bellman-Ford Algorithm Visualization', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.reload();
  });

  test('Initial state should be Idle', async () => {
    const buttonState = await page.isDisabled('#step-btn');
    expect(buttonState).toBe(true);
  });

  test('Add Node transitions to AddingNode state', async () => {
    await page.fill('#node-name', 'A');
    await page.click('#add-node-btn');
    const message = await page.textContent('#messages');
    expect(message).toContain('Starting Bellman-Ford from source node: A');
  });

  test('Add Node should succeed and return to Idle state', async () => {
    await page.fill('#node-name', 'B');
    await page.click('#add-node-btn');
    await page.fill('#node-name', 'C');
    await page.click('#add-node-btn');
    
    const nodes = await page.$$eval('circle.node', circles => circles.length);
    expect(nodes).toBe(2); // Expecting 2 nodes added
  });

  test('Add Edge transitions to AddingEdge state', async () => {
    await page.fill('#node-name', 'D');
    await page.click('#add-node-btn');
    await page.selectOption('#edge-from', 'B');
    await page.selectOption('#edge-to', 'C');
    await page.fill('#edge-weight', '5');
    await page.click('#add-edge-btn');

    const message = await page.textContent('#messages');
    expect(message).toContain('Edge already exists.'); // Expecting an error message
  });

  test('Run Algorithm transitions to InitializingAlgorithm state', async () => {
    await page.selectOption('#source-node', 'A');
    await page.click('#start-btn');
    
    const message = await page.textContent('#messages');
    expect(message).toContain('Starting Bellman-Ford from source node: A');
  });

  test('Step Algorithm transitions to SteppingThroughAlgorithm state', async () => {
    await page.click('#step-btn');
    
    const message = await page.textContent('#messages');
    expect(message).toContain('Iteration 1'); // Expecting an iteration message
  });

  test('Reset Graph transitions to ResettingGraph state', async () => {
    await page.click('#reset-btn');
    
    const message = await page.textContent('#messages');
    expect(message).toContain('No negative weight cycles detected.'); // Expecting reset message
  });

  test('Add Node with empty name should show error', async () => {
    await page.fill('#node-name', '');
    await page.click('#add-node-btn');
    
    const message = await page.textContent('#messages');
    expect(message).toContain('Node name cannot be empty.');
  });

  test('Add Edge with same from and to node should show error', async () => {
    await page.fill('#node-name', 'E');
    await page.click('#add-node-btn');
    await page.selectOption('#edge-from', 'E');
    await page.selectOption('#edge-to', 'E');
    await page.fill('#edge-weight', '1');
    await page.click('#add-edge-btn');

    const message = await page.textContent('#messages');
    expect(message).toContain('No loops allowed (edge from and to same node).');
  });

  test('Add Edge with invalid nodes should show error', async () => {
    await page.fill('#node-name', 'F');
    await page.click('#add-node-btn');
    await page.selectOption('#edge-from', 'F');
    await page.selectOption('#edge-to', 'G'); // G does not exist
    await page.fill('#edge-weight', '1');
    await page.click('#add-edge-btn');

    const message = await page.textContent('#messages');
    expect(message).toContain('Invalid nodes selected.');
  });

  test('Run Algorithm with no nodes should show error', async () => {
    await page.click('#start-btn');
    
    const message = await page.textContent('#messages');
    expect(message).toContain('Graph must contain nodes.');
  });

  test('Run Algorithm with no edges should show error', async () => {
    await page.fill('#node-name', 'H');
    await page.click('#add-node-btn');
    await page.selectOption('#source-node', 'H');
    await page.click('#start-btn');

    const message = await page.textContent('#messages');
    expect(message).toContain('Graph must contain edges.');
  });
});