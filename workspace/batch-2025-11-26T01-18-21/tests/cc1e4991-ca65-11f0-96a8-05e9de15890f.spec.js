import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/batch-2025-11-26T01-18-21/html/cc1e4991-ca65-11f0-96a8-05e9de15890f.html';

test.describe('Dijkstra Algorithm Interactive Demo', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Initial State Tests', () => {
    test('should be in Idle state with AddNode mode active', async () => {
      const activeButton = await page.$('.mode-btn.active');
      const activeText = await activeButton.innerText();
      expect(activeText).toBe('Add Node');
    });

    test('should display initial node and edge counts as zero', async () => {
      const nodeCount = await page.$eval('#node-count', el => el.textContent);
      const edgeCount = await page.$eval('#edge-count', el => el.textContent);
      expect(nodeCount).toBe('0');
      expect(edgeCount).toBe('0');
    });
  });

  test.describe('Node Addition Tests', () => {
    test('should add a node on canvas click', async () => {
      await page.click('#svg', { position: { x: 100, y: 100 } });
      const nodeCount = await page.$eval('#node-count', el => el.textContent);
      expect(nodeCount).toBe('1');
    });

    test('should add multiple nodes on canvas clicks', async () => {
      await page.click('#svg', { position: { x: 200, y: 200 } });
      await page.click('#svg', { position: { x: 300, y: 300 } });
      const nodeCount = await page.$eval('#node-count', el => el.textContent);
      expect(nodeCount).toBe('3');
    });
  });

  test.describe('Edge Addition Tests', () => {
    test('should switch to Add Edge mode', async () => {
      await page.click('#mode-addedge');
      const activeButton = await page.$('.mode-btn.active');
      const activeText = await activeButton.innerText();
      expect(activeText).toBe('Add Edge');
    });

    test('should select a source node for edge', async () => {
      await page.click('svg g[data-node-id="1"]');
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Selected node 1 as edge source');
    });

    test('should create an edge between two nodes', async () => {
      await page.click('svg g[data-node-id="2"]');
      const edgeCount = await page.$eval('#edge-count', el => el.textContent);
      expect(edgeCount).toBe('1');
    });

    test('should cancel edge creation on empty space click', async () => {
      await page.click('#svg', { position: { x: 150, y: 150 } });
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Cancelled edge creation.');
    });
  });

  test.describe('Node Movement Tests', () => {
    test('should switch to Move mode', async () => {
      await page.click('#mode-move');
      const activeButton = await page.$('.mode-btn.active');
      const activeText = await activeButton.innerText();
      expect(activeText).toBe('Move');
    });

    test('should drag and move a node', async () => {
      const node = await page.$('svg g[data-node-id="1"]');
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(150, 150);
      await page.mouse.up();
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Node moved');
    });
  });

  test.describe('Algorithm Execution Tests', () => {
    test('should set source node', async () => {
      await page.click('#set-source');
      await page.click('svg g[data-node-id="1"]');
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Source set to node 1');
    });

    test('should set target node', async () => {
      await page.click('#set-target');
      await page.click('svg g[data-node-id="2"]');
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Target set to node 2');
    });

    test('should run the algorithm to completion', async () => {
      await page.click('#init-run');
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Algorithm finished.');
    });

    test('should reset the algorithm', async () => {
      await page.click('#reset-algo');
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Algorithm state reset.');
    });
  });

  test.describe('Graph Clearing Tests', () => {
    test('should clear the graph', async () => {
      await page.click('#btn-clear');
      const confirmDialog = await page.waitForSelector('dialog[open]', { timeout: 5000 });
      await confirmDialog.click('button:has-text("OK")');
      const nodeCount = await page.$eval('#node-count', el => el.textContent);
      const edgeCount = await page.$eval('#edge-count', el => el.textContent);
      expect(nodeCount).toBe('0');
      expect(edgeCount).toBe('0');
    });
  });

  test.describe('Export/Import Tests', () => {
    test('should export graph as JSON', async () => {
      await page.click('#export-json');
      // Assuming the download is handled by the browser
      // Add assertions based on the download behavior
    });

    test('should import graph from JSON', async () => {
      // Simulate file input and import JSON
      const filePath = 'path/to/valid_graph.json'; // Update with a valid path
      await page.setInputFiles('#import-json', filePath);
      const logText = await page.$eval('#log', el => el.innerHTML);
      expect(logText).toContain('Imported graph from file.');
    });
  });
});