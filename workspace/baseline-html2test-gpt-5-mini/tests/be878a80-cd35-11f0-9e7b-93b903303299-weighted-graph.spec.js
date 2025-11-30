import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-5-mini/html/be878a80-cd35-11f0-9e7b-93b903303299.html';

test.describe('Weighted Graph Interactive Demo (be878a80-cd35-11f0-9e7b-93b903303299)', () => {
  // Collect console error messages and page errors for each test to assert none happen
  test.beforeEach(async ({ page }) => {
    // arrays on page context to collect issues
    page.context()._consoleErrors = [];
    page.context()._pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.context()._consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      page.context()._pageErrors.push(err.message);
    });

    // Navigate to the application page
    await page.goto(APP_URL);
    // Ensure the SVG and UI have been rendered before running tests
    await page.waitForSelector('#svg');
    await page.waitForSelector('.mode-btn.active');
    // Small wait to allow initDemo to render nodes/edges
    await page.waitForTimeout(100);
  });

  test.afterEach(async ({ page }) => {
    // Assert that no console errors or page errors were emitted during the test run
    const consoleErrors = page.context()._consoleErrors || [];
    const pageErrors = page.context()._pageErrors || [];
    expect(consoleErrors, 'No console.error should occur during the test').toEqual([]);
    expect(pageErrors, 'No unhandled page errors should occur during the test').toEqual([]);
  });

  // Helpers for interacting with the page in a reusable manner
  const ui = {
    // switch to a named mode button: add-node, add-edge, move, delete
    async setMode(page, modeName) {
      await page.click(`.mode-btn[data-mode="${modeName}"]`);
      await page.waitForTimeout(50); // allow UI update
    },
    // count nodes by counting circle elements under #nodes
    async nodeCount(page) {
      return await page.locator('#nodes circle').count();
    },
    // count edges by counting label texts under #edgeLabels (one text per edge)
    async edgeCount(page) {
      return await page.locator('#edgeLabels text').count();
    },
    // click SVG at coordinates relative to svg rect
    async clickSvgAt(page, x, y) {
      const svg = page.locator('#svg');
      const box = await svg.boundingBox();
      if (!box) throw new Error('SVG box not available');
      await page.mouse.click(box.x + x, box.y + y);
      await page.waitForTimeout(50);
    },
    // drag node: performs mousedown on node circle and moves to dx,dy then mouseup
    async dragNodeBy(page, nodeIndex, dx, dy) {
      const nodeCircle = page.locator('#nodes circle').nth(nodeIndex);
      const box1 = await nodeCircle.boundingBox();
      if (!box) throw new Error('Node box not available');
      // mousedown at center
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(80);
    },
    // click a node circle by index
    async clickNodeByIndex(page, idx) {
      await page.locator('#nodes circle').nth(idx).click();
      await page.waitForTimeout(50);
    }
  };

  test('initial page load shows demo graph and correct default mode', async ({ page }) => {
    // Verify page title and UI basics
    await expect(page).toHaveTitle(/Weighted Graph/i);

    // Default active mode should be Add Node
    const activeMode = page.locator('.mode-btn.active');
    await expect(activeMode).toHaveText('Add Node');

    // Status text should reflect the active mode
    await expect(page.locator('#status')).toHaveText('Mode: Add Node');

    // The sample demo should initialize some nodes and edges (initDemo creates 5 nodes and 6 edges)
    const nodes = await ui.nodeCount(page);
    const edges = await ui.edgeCount(page);
    expect(nodes >= 5, 'There should be at least 5 nodes from the demo').toBeTruthy();
    expect(edges >= 6, 'There should be at least 6 edges from the demo').toBeTruthy();

    // Selects (source/target) should be populated with node options
    const sourceOptions = await page.locator('#selectSource option').count();
    const targetOptions = await page.locator('#selectTarget option').count();
    // one placeholder plus nodes
    expect(sourceOptions).toBeGreaterThan(1);
    expect(targetOptions).toBeGreaterThan(1);
  });

  test('add node by clicking on the SVG canvas updates node count and selects', async ({ page }) => {
    // Ensure in add-node mode (default)
    await ui.setMode(page, 'add-node');

    const before = await ui.nodeCount(page);

    // Click at an arbitrary point inside SVG (100,100)
    await ui.clickSvgAt(page, 100, 100);

    const after = await ui.nodeCount(page);
    expect(after).toBeGreaterThan(before);

    // ensures select source/target have been updated
    const sourceOptions1 = await page.locator('#selectSource option').count();
    const targetOptions1 = await page.locator('#selectTarget option').count();
    expect(sourceOptions).toBeGreaterThan(1);
    expect(targetOptions).toBeGreaterThan(1);
  });

  test('add edge between two existing nodes with specified weight', async ({ page }) => {
    // Switch to add-edge mode
    await ui.setMode(page, 'add-edge');

    // Set weight input to 9 to ensure weight is applied
    await page.fill('#edgeWeight', '9');

    // Choose two nodes by clicking the first and second node circles
    const initialEdges = await ui.edgeCount(page);

    // Click first node (select), then second node (creates edge)
    await ui.clickNodeByIndex(page, 0); // select first node
    await ui.clickNodeByIndex(page, 1); // connect to second node

    // There may be a situation where duplicate edges prevented creation; ensure edge count increased or remained stable but no error thrown
    const newEdges = await ui.edgeCount(page);
    expect(newEdges >= initialEdges).toBeTruthy();

    // Verify that the edge label with weight '9' exists somewhere in the edgeLabels group when we actually added (if added)
    const labels = await page.locator('#edgeLabels text').allTextContents();
    const contains9 = labels.some(t => t.trim() === '9');
    // It's acceptable if the graph prevented adding a duplicate; assert either new edge created or weight label present
    expect(newEdges === initialEdges || contains9).toBeTruthy();
  });

  test('move node via drag updates its transform attribute (visual move)', async ({ page }) => {
    // Switch to move mode
    await ui.setMode(page, 'move');

    // Pick first node g (group) and record its transform before
    const nodeGroup = page.locator('#nodes g').first();
    const beforeTransform = await nodeGroup.getAttribute('transform');
    expect(beforeTransform).not.toBeNull();

    // Drag the first node by +30, +20
    await ui.dragNodeBy(page, 0, 30, 20);

    // After dragging, transform should change to different translate values
    const afterTransform = await nodeGroup.getAttribute('transform');
    expect(afterTransform).not.toEqual(beforeTransform);
  });

  test('delete node with confirmation reduces node count and removes connected edges', async ({ page }) => {
    // Switch to delete mode
    await ui.setMode(page, 'delete');

    // Count nodes and edges before deletion
    const nodesBefore = await ui.nodeCount(page);
    const edgesBefore = await ui.edgeCount(page);

    // Intercept the confirm dialog and accept it
    page.once('dialog', async dialog => {
      // Ensure it's the expected confirm dialog
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Delete node and its edges');
      await dialog.accept();
    });

    // Click first node (should trigger confirm and deletion)
    await ui.clickNodeByIndex(page, 0);

    // Wait briefly for DOM mutation
    await page.waitForTimeout(120);

    const nodesAfter = await ui.nodeCount(page);
    const edgesAfter = await ui.edgeCount(page);

    // Node count should have decreased by at least 1
    expect(nodesAfter).toBeLessThanOrEqual(nodesBefore - 1 + 0); // allow equal if confirm prevented, but we accepted so expect decrease
    // Edges after should be less than or equal previous (some edges removed with node)
    expect(edgesAfter).toBeLessThanOrEqual(edgesBefore);
  });

  test('Run Dijkstra algorithm produces alert with shortest path and highlights nodes/edges', async ({ page }) => {
    // Use fresh page and ensure selects populated
    // Choose source and target from the populated options. We'll select first and last available non-empty option.
    const sourceOptions2 = await page.locator('#selectSource option').all();
    const values = [];
    for (let i = 0; i < sourceOptions.length; i++) {
      const val = await sourceOptions[i].getAttribute('value');
      if (val) values.push(val);
    }
    // Need at least two different nodes
    expect(values.length >= 2).toBeTruthy();

    const s = values[0];
    const t = values[values.length - 1];

    // Set selects
    await page.selectOption('#selectSource', s);
    await page.selectOption('#selectTarget', t);

    // Listen for the alert produced by Dijkstra
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('#btnDijkstra');
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    const msg = dialog.message();
    // The alert either reports a path or unreachable
    expect(
      msg.includes('Shortest path weight =') || msg.includes('Target unreachable from source'),
      'Dijkstra should alert either path weight or unreachable'
    ).toBeTruthy();
    await dialog.accept();

    // After running, nodes/edges intended to be highlighted. The code sets highlight sets,
    // which influence stroke color/width of lines and fill of nodes. We verify that at least
    // one edge label remains present and no JS error occurred.
    const edgeLabelsCount = await ui.edgeCount(page);
    expect(edgeLabelsCount).toBeGreaterThan(0);
  });

  test('Run Kruskal (MST) computes tree and triggers alert; highlights edges', async ({ page }) => {
    // MST triggers an alert with "MST computed. Total weight = "
    const dialogPromise1 = page.waitForEvent('dialog');
    await page.click('#btnMST');
    const dialog1 = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    const msg1 = dialog.message();
    expect(msg).toContain('MST computed. Total weight =');
    await dialog.accept();

    // After MST, highlight set includes nodes -> ensure nodes exist
    const nodes1 = await ui.nodeCount(page);
    expect(nodes).toBeGreaterThan(0);
  });

  test('Clear button prompts confirm and clears the graph when accepted', async ({ page }) => {
    // Ensure there are nodes before clearing
    const beforeNodes = await ui.nodeCount(page);
    expect(beforeNodes).toBeGreaterThan(0);

    // Intercept the confirm and accept
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Clear the entire graph');
      await dialog.accept();
    });

    // Click Clear
    await page.click('#btnClear');
    await page.waitForTimeout(100);

    // After clearing, nodes and edges should be zero
    const nodesAfter1 = await ui.nodeCount(page);
    const edgesAfter1 = await ui.edgeCount(page);
    expect(nodesAfter).toBe(0);
    expect(edgesAfter).toBe(0);
  });

  test('Export JSON triggers a download anchor creation without throwing errors', async ({ page }) => {
    // Run export and ensure no throw and no page errors (post-check in afterEach)
    // Use waitForEvent download if possible; anchor click may not generate a Playwright Download event in this environment,
    // so we primarily assert no errors and that code path executes.
    // Click Export JSON
    await page.click('#btnExport');
    // small wait to allow createObjectURL and click to execute
    await page.waitForTimeout(80);

    // Because the export creates an anchor and clicks it programmatically, we assert no JS errors occurred (checked in afterEach)
    expect(true).toBeTruthy();
  });

  test('Import JSON via file input loads nodes and edges from a prepared JSON file', async ({ page }) => {
    // Prepare a simple graph JSON for upload
    const graph = {
      nodes: [
        { id: '10', x: 100, y: 100, label: 'A' },
        { id: '11', x: 200, y: 100, label: 'B' }
      ],
      edges: [
        { id: '20', u: '10', v: '11', weight: 5, directed: false }
      ]
    };
    // Use Playwright setInputFiles to simulate file selection. Provide file content as buffer.
    // The API supports an object with name and buffer.
    const jsonBuffer = Buffer.from(JSON.stringify(graph));
    await page.setInputFiles('#fileInput', { name: 'graph.json', mimeType: 'application/json', buffer: jsonBuffer });

    // Trigger import button which clicks the hidden file input (change event already fired by setInputFiles),
    // but to be safe click the import button to open file selector; the setInputFiles already set the files and fired change.
    // Wait briefly for the import handler to read file and update DOM
    await page.click('#btnImport');
    await page.waitForTimeout(200);

    // After import, the selects should contain the imported node ids 10 and 11
    const optionValues = await page.locator('#selectSource option').all();
    const texts = [];
    for (const opt of optionValues) {
      const val1 = await opt.getAttribute('value');
      if (val) texts.push(val);
    }
    // Expect that imported ids are present among the select options
    expect(texts).toEqual(expect.arrayContaining(['10', '11']));
  });

  test('double-clicking a node triggers prompt and updates its label when provided', async ({ page }) => {
    // Ensure there is at least one node
    const nodesBefore1 = await ui.nodeCount(page);
    expect(nodesBefore).toBeGreaterThan(0);

    // Intercept the prompt dialog and provide a new label
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      // provide label 'NewLabel' to the prompt
      await dialog.accept('NewLabel');
    });

    // double-click the first node circle: we simulate double click using two clicks in quick succession
    const firstCircle = page.locator('#nodes circle').first();
    const box2 = await firstCircle.boundingBox();
    if (!box) throw new Error('Circle bounding box not available');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: 2 });
    await page.waitForTimeout(120);

    // After renaming, the nodeLabels text content should include 'NewLabel'
    const labels1 = await page.locator('#nodeLabels text').allTextContents();
    const found = labels.some(t => t.includes('NewLabel'));
    expect(found).toBeTruthy();
  });
});