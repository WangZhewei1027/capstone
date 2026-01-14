import { test, expect } from '@playwright/test';

// Test suite for Graph Representation application
// Verifies directed/undirected edge behavior, the broken addVertex implementation (which should produce runtime errors),
// DOM updates, console logs, and input behaviors.
//
// Tests are organized with a small page object (GraphPage) to encapsulate selectors and interactions.

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-4o-mini/html/7e8aa593-d59e-11f0-89ab-2f71529652ac.html';

class GraphPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Graph containers and inputs
    this.graphType = page.locator('#graphType');
    this.verticesA = page.locator('#verticesA');
    this.verticesB = page.locator('#verticesB');
    this.newVertexA = page.locator('#newVertexA');
    this.newVertexB = page.locator('#newVertexB');
    this.buttonAddVertexA = page.locator('#graphA button'); // first Add Vertex
    this.buttonAddVertexB = page.locator('#graphB button'); // second Add Vertex
    this.vertexFrom = page.locator('#vertexFrom');
    this.vertexTo = page.locator('#vertexTo');
    this.buttonAddEdge = page.locator('button', { hasText: 'Add Edge' });
  }

  // Set graph type select to either 'directed' or 'undirected'
  async setGraphType(type) {
    await this.graphType.selectOption(type);
  }

  // Add a vertex to graph 'A' or 'B' (this will trigger the page's onclick handler, which is broken and should produce an error)
  async addVertexTo(graphId, name) {
    if (graphId === 'A') {
      await this.newVertexA.fill(name);
      await this.buttonAddVertexA.click();
    } else {
      await this.newVertexB.fill(name);
      await this.buttonAddVertexB.click();
    }
  }

  // Add an edge by filling from/to and clicking Add Edge
  async addEdge(from, to) {
    await this.vertexFrom.fill(from);
    await this.vertexTo.fill(to);
    await this.buttonAddEdge.click();
  }

  // Count vertex elements inside the given graph container
  async countVertices(graphId) {
    if (graphId === 'A') {
      return await this.verticesA.locator('.vertex').count();
    } else {
      return await this.verticesB.locator('.vertex').count();
    }
  }

  // Read input values (helpful to verify if inputs were cleared)
  async readVertexInputs() {
    return {
      from: await this.vertexFrom.inputValue(),
      to: await this.vertexTo.inputValue(),
      newA: await this.newVertexA.inputValue(),
      newB: await this.newVertexB.inputValue()
    };
  }

  // Read the internal graph edges arrays (graphA / graphB are top-level script variables)
  async readGraphEdges(graphId) {
    if (graphId === 'A') {
      return await this.page.evaluate(() => {
        // Referencing the top-level graphA name directly; do not rely on window.graphA property
        try {
          return typeof graphA !== 'undefined' ? graphA.edges.slice() : null;
        } catch (e) {
          return { error: String(e) };
        }
      });
    } else {
      return await this.page.evaluate(() => {
        try {
          return typeof graphB !== 'undefined' ? graphB.edges.slice() : null;
        } catch (e) {
          return { error: String(e) };
        }
      });
    }
  }
}

test.describe('Graph Representation - Directed/Undirected', () => {
  // We'll capture console messages and page errors per test
  test.beforeEach(async ({ page }) => {
    // Navigate fresh before each test
    await page.goto(APP_URL);
  });

  test('Initial load: UI elements present and default state is undirected', async ({ page }) => {
    // Verify page title, headings, and default select value
    await expect(page).toHaveTitle(/Graph Representation/);
    await expect(page.locator('h1')).toHaveText('Graph Visualization');

    const gp = new GraphPage(page);

    // Default graph type should be 'undirected'
    await expect(gp.graphType).toHaveValue('undirected');

    // Graph A and Graph B containers and inputs should exist and start empty
    await expect(page.locator('#graphA h3')).toHaveText('Graph A');
    await expect(page.locator('#graphB h3')).toHaveText('Graph B');

    // No vertices initially
    expect(await gp.countVertices('A')).toBe(0);
    expect(await gp.countVertices('B')).toBe(0);

    // Inputs should be empty
    const inputs = await gp.readVertexInputs();
    expect(inputs.newA).toBe('');
    expect(inputs.newB).toBe('');
    expect(inputs.from).toBe('');
    expect(inputs.to).toBe('');
  });

  test.describe('Add Vertex behavior (known broken implementation)', () => {
    // This application contains a broken addVertex implementation that attempts to access a property
    // on a string (graph[graph.toLowerCase()]) which will cause a runtime TypeError. We assert that
    // the error is thrown, that no DOM vertex is added, and that the input value is not cleared because
    // the function aborts before reaching the input-clearing line.

    test('Clicking Add Vertex for Graph A produces a page error and does not modify DOM', async ({ page }) => {
      const gp1 = new GraphPage(page);
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err));

      // Attempt to add a vertex "X" to Graph A - this should throw inside page context
      await gp.addVertexTo('A', 'X');

      // We expect at least one page error to have been emitted
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
      // Ensure the error message references the broken .vertices property access
      const combinedMessages = pageErrors.map(e => e.message || String(e)).join(' | ');
      expect(combinedMessages.toLowerCase()).toContain('vertices');

      // DOM should remain unchanged (no vertex elements added)
      expect(await gp.countVertices('A')).toBe(0);

      // Because the exception occurs before clearing the input, the newVertexA input should still contain "X"
      const inputs1 = await gp.readVertexInputs();
      expect(inputs.newA).toBe('X');
    });

    test('Clicking Add Vertex for Graph B produces a page error and does not modify DOM', async ({ page }) => {
      const gp2 = new GraphPage(page);
      const pageErrors1 = [];
      page.on('pageerror', err => pageErrors.push(err));

      // Attempt to add vertex "Y" to Graph B
      await gp.addVertexTo('B', 'Y');

      // Expect page error(s)
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);
      const combinedMessages1 = pageErrors.map(e => e.message || String(e)).join(' | ');
      expect(combinedMessages.toLowerCase()).toContain('vertices');

      // No DOM vertex added to Graph B
      expect(await gp.countVertices('B')).toBe(0);

      // newVertexB input should still contain the typed value due to aborted execution
      const inputs2 = await gp.readVertexInputs();
      expect(inputs.newB).toBe('Y');
    });
  });

  test.describe('Add Edge behavior - undirected (default) and directed', () => {
    test('Adding an edge in undirected mode logs once and stores both directions in graphB', async ({ page }) => {
      const gp3 = new GraphPage(page);
      const logs = [];
      page.on('console', msg => {
        if (msg.type() === 'log') logs.push(msg.text());
      });

      // Default is undirected; add edge A -> B
      await gp.addEdge('A', 'B');

      // Console should contain the "Added edge" message
      const addedLog = logs.find(l => l.includes('Added edge:'));
      expect(addedLog).toBeDefined();
      expect(addedLog).toContain('A → B');

      // Inputs should be cleared after addEdge
      const inputs3 = await gp.readVertexInputs();
      expect(inputs.from).toBe('');
      expect(inputs.to).toBe('');

      // The undirected behavior in the implementation uses graphB (since undirected) and pushes both A->B and B->A
      const graphBEdges = await gp.readGraphEdges('B');
      // graphBEdges should be an array containing the two directed strings, order depends on implementation
      expect(Array.isArray(graphBEdges)).toBeTruthy();
      expect(graphBEdges).toEqual(expect.arrayContaining(['A → B', 'B → A']));

      // Ensure graphA edges remain empty (or at least not containing the undirected edge)
      const graphAEdges = await gp.readGraphEdges('A');
      // graphAEdges should be an array (initially empty) or null if inaccessible; we assert it does not contain the undirected edge
      if (Array.isArray(graphAEdges)) {
        expect(graphAEdges).not.toEqual(expect.arrayContaining(['A → B', 'B → A']));
      }
    });

    test('Switch to directed and adding an edge logs and stores single directed edge in graphA', async ({ page }) => {
      const gp4 = new GraphPage(page);
      const logs1 = [];
      page.on('console', msg => {
        if (msg.type() === 'log') logs.push(msg.text());
      });

      // Switch to directed graph
      await gp.setGraphType('directed');

      // Add edge C -> D
      await gp.addEdge('C', 'D');

      // Console should contain the added edge log for C -> D
      const addedLog1 = logs.find(l => l.includes('Added edge:'));
      expect(addedLog).toBeDefined();
      expect(addedLog).toContain('C → D');

      // Inputs cleared
      const inputs4 = await gp.readVertexInputs();
      expect(inputs.from).toBe('');
      expect(inputs.to).toBe('');

      // Directed behavior uses graphA; graphA.edges should contain only 'C → D' (single direction)
      const graphAEdges1 = await gp.readGraphEdges('A');
      expect(Array.isArray(graphAEdges)).toBeTruthy();
      expect(graphAEdges).toEqual(expect.arrayContaining(['C → D']));

      // Ensure that the reverse 'D → C' was NOT added to graphA by the directed branch
      expect(graphAEdges).not.toEqual(expect.arrayContaining(['D → C']));
    });

    test('Edge addition with empty inputs does nothing (no console log) but clears inputs', async ({ page }) => {
      const gp5 = new GraphPage(page);
      const logs2 = [];
      page.on('console', msg => {
        if (msg.type() === 'log') logs.push(msg.text());
      });

      // Ensure inputs are empty
      await gp.vertexFrom.fill('');
      await gp.vertexTo.fill('');

      // Click Add Edge with empty fields
      await gp.buttonAddEdge.click();

      // No "Added edge" console log should be created
      const addedLog2 = logs.find(l => l.includes('Added edge:'));
      expect(addedLog).toBeUndefined();

      // Inputs should remain empty (function clears them regardless, but they started empty)
      const inputs5 = await gp.readVertexInputs();
      expect(inputs.from).toBe('');
      expect(inputs.to).toBe('');
    });
  });

  test.describe('Interaction robustness and error observation', () => {
    test('Ensure addVertex errors are page-level errors (pageerror) and do not prevent addEdge console logs', async ({ page }) => {
      const gp6 = new GraphPage(page);
      const pageErrors2 = [];
      const logs3 = [];
      page.on('pageerror', err => pageErrors.push(err));
      page.on('console', msg => {
        if (msg.type() === 'log') logs.push(msg.text());
      });

      // Trigger a vertex add error on Graph A
      await gp.addVertexTo('A', 'Z');

      // Confirm we got a pageerror
      expect(pageErrors.length).toBeGreaterThanOrEqual(1);

      // Now perform an addEdge call that should succeed (undirected by default)
      await gp.addEdge('M', 'N');

      // Confirm addEdge produced a console log even after a prior page error
      const addedLog3 = logs.find(l => l.includes('Added edge:'));
      expect(addedLog).toBeDefined();
      expect(addedLog).toContain('M → N');

      // Confirm graphB received the edges (both directions)
      const graphBEdges1 = await gp.readGraphEdges('B');
      expect(Array.isArray(graphBEdges)).toBeTruthy();
      expect(graphBEdges).toEqual(expect.arrayContaining(['M → N', 'N → M']));
    });
  });
});