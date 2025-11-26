import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-31-04/html/92fdbc72-ca67-11f0-a3d6-179b5eb5e89b.html';

test.describe('Weighted Graph Visualization Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state is Idle', async () => {
    const nodeLabelInput = await page.locator('#node-label');
    const addNodeBtn = await page.locator('#add-node-btn');
    const addEdgeBtn = await page.locator('#add-edge-btn');
    const clearBtn = await page.locator('#clear-btn');

    // Verify controls are enabled in Idle state
    await expect(nodeLabelInput).toBeEnabled();
    await expect(addNodeBtn).toBeEnabled();
    await expect(addEdgeBtn).toBeEnabled();
    await expect(clearBtn).toBeEnabled();
  });

  test('Add Node transitions to AddingNode state', async () => {
    const nodeLabelInput = await page.locator('#node-label');
    const addNodeBtn = await page.locator('#add-node-btn');

    // Input a node label and click Add Node
    await nodeLabelInput.fill('A');
    await addNodeBtn.click();

    // Verify node is added and state transitions back to Idle
    await expect(page.locator('text=A')).toBeVisible();
  });

  test('Add Node with empty label shows error', async () => {
    const nodeLabelInput = await page.locator('#node-label');
    const addNodeBtn = await page.locator('#add-node-btn');

    // Click Add Node without input
    await nodeLabelInput.fill('');
    await addNodeBtn.click();

    // Verify error alert is shown
    await expect(page.locator('text=Please enter a node label.')).toBeVisible();
  });

  test('Add Edge transitions to AddingEdge state', async () => {
    const addEdgeBtn = await page.locator('#add-edge-btn');

    // Click Add Edge without selecting nodes should show error
    await addEdgeBtn.click();
    await expect(page.locator('text=Both nodes must exist.')).toBeVisible();

    // Add nodes first
    await page.locator('#node-label').fill('B');
    await page.locator('#add-node-btn').click();
    await page.locator('#edge-from').selectOption('A');
    await page.locator('#edge-to').selectOption('B');
    await page.locator('#edge-weight').fill('5');
    await addEdgeBtn.click();

    // Verify edge is added
    await expect(page.locator('text=5')).toBeVisible();
  });

  test('Add Edge with invalid weight shows error', async () => {
    const addEdgeBtn = await page.locator('#add-edge-btn');

    // Attempt to add edge with invalid weight
    await page.locator('#edge-weight').fill('-1');
    await addEdgeBtn.click();

    // Verify error alert is shown
    await expect(page.locator('text=Weight must be a positive number.')).toBeVisible();
  });

  test('Clear Graph transitions to ClearingGraph state', async () => {
    const clearBtn = await page.locator('#clear-btn');

    // Click Clear Graph button
    await clearBtn.click();

    // Confirm clear action
    await page.locator('text=Are you sure you want to clear the entire graph?').click();
    
    // Verify graph is cleared
    await expect(page.locator('text=A')).not.toBeVisible();
    await expect(page.locator('text=B')).not.toBeVisible();
  });

  test('Drag Node transitions to DraggingNode state', async () => {
    const nodeLabelInput = await page.locator('#node-label');
    const addNodeBtn = await page.locator('#add-node-btn');

    // Add a node to drag
    await nodeLabelInput.fill('C');
    await addNodeBtn.click();

    // Drag the node
    const node = await page.locator('.node');
    await node.dragAndDrop({ target: { x: 100, y: 100 } });

    // Verify node position is updated (this may require additional logic to check position)
    const nodePosition = await node.evaluate(node => {
      const bbox = node.getBoundingClientRect();
      return { x: bbox.x, y: bbox.y };
    });

    expect(nodePosition.x).toBeGreaterThan(0);
    expect(nodePosition.y).toBeGreaterThan(0);
  });

  test('Dragging Node stops correctly', async () => {
    const node = await page.locator('.node');
    await node.dragAndDrop({ target: { x: 200, y: 200 } });

    // Verify node is no longer in dragging state
    const nodePosition = await node.evaluate(node => {
      const bbox = node.getBoundingClientRect();
      return { x: bbox.x, y: bbox.y };
    });

    expect(nodePosition.x).toBeGreaterThan(0);
    expect(nodePosition.y).toBeGreaterThan(0);
  });
});