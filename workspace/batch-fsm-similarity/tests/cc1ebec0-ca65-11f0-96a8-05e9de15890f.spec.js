import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1ebec0-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Topological Sort Visualizer', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Initial state should be Idle', async () => {
    const mode = await page.evaluate(() => window.mode);
    expect(mode).toBe(null);
  });

  test.describe('Node Addition', () => {
    test('Clicking Add Node button should enter AddNodeMode', async () => {
      await page.click('#addNodeBtn');
      const mode = await page.evaluate(() => window.mode);
      expect(mode).toBe('addNode');
    });

    test('Clicking on SVG should add a node', async () => {
      await page.click('#svg', { position: { x: 100, y: 100 } });
      const nodesCount = await page.evaluate(() => window.nodes.length);
      expect(nodesCount).toBe(1);
    });

    test('Double-clicking on SVG should exit AddNodeMode', async () => {
      await page.dblclick('#svg');
      const mode = await page.evaluate(() => window.mode);
      expect(mode).toBe(null);
    });
  });

  test.describe('Edge Addition', () => {
    test('Clicking Add Edge button should enter AddEdgeMode_SelectSource', async () => {
      await page.click('#addEdgeBtn');
      const mode = await page.evaluate(() => window.mode);
      expect(mode).toBe('addEdge');
    });

    test('Clicking on a node should select it as source', async () => {
      await page.click('svg g[data-id="0"]');
      const selectedNode = await page.evaluate(() => window.selectedNodeForEdge);
      expect(selectedNode).toBe(0);
    });

    test('Clicking on another node should create an edge', async () => {
      await page.click('svg g[data-id="1"]');
      const edgesCount = await page.evaluate(() => window.edges.length);
      expect(edgesCount).toBe(1);
    });

    test('Exiting AddEdgeMode_SelectSource by clicking SVG', async () => {
      await page.click('#svg');
      const mode = await page.evaluate(() => window.mode);
      expect(mode).toBe(null);
    });
  });

  test.describe('Node Removal', () => {
    test('Clicking Remove Node button should enter RemoveNodeMode', async () => {
      await page.click('#removeNodeBtn');
      const mode = await page.evaluate(() => window.mode);
      expect(mode).toBe('removeNode');
    });

    test('Clicking on a node should remove it', async () => {
      await page.click('svg g[data-id="0"]');
      const nodesCount = await page.evaluate(() => window.nodes.length);
      expect(nodesCount).toBe(0);
    });
  });

  test.describe('Edge Removal', () => {
    test('Clicking Remove Edge button should enter RemoveEdgeMode', async () => {
      await page.click('#removeEdgeBtn');
      const mode = await page.evaluate(() => window.mode);
      expect(mode).toBe('removeEdge');
    });

    test('Clicking on an edge should remove it', async () => {
      await page.click('svg g[data-edge-index="0"] path');
      const edgesCount = await page.evaluate(() => window.edges.length);
      expect(edgesCount).toBe(0);
    });
  });

  test.describe('Random DAG Generation', () => {
    test('Clicking Generate Random DAG should create nodes and edges', async () => {
      await page.fill('#rndNodes', '5');
      await page.fill('#rndDensity', '0.5');
      await page.click('#randomDagBtn');
      const nodesCount = await page.evaluate(() => window.nodes.length);
      const edgesCount = await page.evaluate(() => window.edges.length);
      expect(nodesCount).toBeGreaterThan(0);
      expect(edgesCount).toBeGreaterThan(0);
    });
  });

  test.describe('Graph Clearing', () => {
    test('Clicking Clear All should reset the graph', async () => {
      await page.click('#clearBtn');
      const nodesCount = await page.evaluate(() => window.nodes.length);
      const edgesCount = await page.evaluate(() => window.edges.length);
      expect(nodesCount).toBe(0);
      expect(edgesCount).toBe(0);
    });
  });

  test.describe('Kahn\'s Algorithm', () => {
    test('Clicking Kahn Initialize should enter Kahn_Initialized state', async () => {
      await page.click('#kahnStartBtn');
      const mode = await page.evaluate(() => window.kahnState.active);
      expect(mode).toBe(true);
    });

    test('Clicking Kahn Step should progress the algorithm', async () => {
      await page.click('#kahnStepBtn');
      const output = await page.evaluate(() => window.kahnOutput.textContent);
      expect(output).not.toBe('');
    });

    test('Clicking Kahn Finish should complete the algorithm', async () => {
      await page.click('#kahnFinishBtn');
      const output = await page.evaluate(() => window.kahnOutput.textContent);
      expect(output).not.toBe('');
    });

    test('Clicking Kahn Reset should clear Kahn state', async () => {
      await page.click('#kahnResetBtn');
      const output = await page.evaluate(() => window.kahnOutput.textContent);
      expect(output).toBe('');
    });
  });

  test.describe('DFS Algorithm', () => {
    test('Clicking DFS Start should initialize DFS', async () => {
      await page.click('#dfsStartBtn');
      const mode = await page.evaluate(() => window.dfsState.active);
      expect(mode).toBe(true);
    });

    test('Clicking DFS Auto should run the algorithm automatically', async () => {
      await page.click('#dfsAutoBtn');
      await page.waitForTimeout(1000); // wait for a few steps
      const output = await page.evaluate(() => window.dfsOutput.textContent);
      expect(output).not.toBe('');
    });

    test('Clicking DFS Finish should complete the algorithm', async () => {
      await page.click('#dfsFinishBtn');
      const output = await page.evaluate(() => window.dfsOutput.textContent);
      expect(output).not.toBe('');
    });

    test('Clicking DFS Reset should clear DFS state', async () => {
      await page.click('#dfsResetBtn');
      const output = await page.evaluate(() => window.dfsOutput.textContent);
      expect(output).toBe('');
    });
  });
});