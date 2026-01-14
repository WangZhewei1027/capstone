import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/batch-1210-subtest2/html/f7670cf1-d5b8-11f0-9ee1-ef07bdc6053d.html';

test.describe('Weighted Graph Example - FSM states and transitions', () => {
  // Shared variables for each test
  let page;
  let consoleMessages;
  let pageErrors;

  // Simple Page Object for interacting with the graph page
  class GraphPage {
    constructor(page) {
      this.page = page;
    }

    // Returns DOM nodes with their inline left/top and text
    async getNodeInfos() {
      return this.page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('#graph .node'));
        return nodes.map(n => ({
          text: n.innerText,
          left: n.style.left,
          top: n.style.top,
          className: n.className
        }));
      });
    }

    // Returns edge elements with innerText and styles
    async getEdgeInfos() {
      return this.page.evaluate(() => {
        const edges = Array.from(document.querySelectorAll('#graph .edge'));
        return edges.map(e => ({
          text: e.innerText,
          width: e.style.width,
          transform: e.style.transform,
          left: e.style.left,
          top: e.style.top,
          className: e.className
        }));
      });
    }

    // Returns the raw children class order for #graph
    async getGraphChildrenClassOrder() {
      return this.page.evaluate(() => {
        const children = Array.from(document.getElementById('graph').children || []);
        return children.map(c => ({ tag: c.tagName, className: c.className, innerText: c.innerText }));
      });
    }

    // Returns the internal graph JS object if present
    async getGraphInternal() {
      return this.page.evaluate(() => {
        // return a serializable snapshot
        if (window.graph && window.graph.nodes) {
          const nodes = {};
          for (const key in window.graph.nodes) {
            const n = window.graph.nodes[key];
            nodes[key] = { x: n.x, y: n.y, edges: Array.from(n.edges || []) };
          }
          return nodes;
        }
        return null;
      });
    }

    // Count edge DOM elements
    async countEdgeElements() {
      return this.page.evaluate(() => document.querySelectorAll('#graph .edge').length);
    }

    // Count node DOM elements
    async countNodeElements() {
      return this.page.evaluate(() => document.querySelectorAll('#graph .node').length);
    }
  }

  test.beforeEach(async ({ browser }) => {
    // Create a new page for each test
    page = await browser.newPage();
    consoleMessages = [];
    pageErrors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'load' });
  });

  test.afterEach(async () => {
    // Close the page to clean up
    if (page && !page.isClosed()) {
      await page.close();
    }
  });

  test('Initial render (S0_Idle) and nodes created (S1,S2,S3) - verify nodes presence and positions', async () => {
    const gp = new GraphPage(page);

    // Comment: Validate that the internal graph object exists and contains nodes A,B,C with expected coordinates
    const internal = await gp.getGraphInternal();
    expect(internal).not.toBeNull();
    expect(internal).toHaveProperty('A');
    expect(internal).toHaveProperty('B');
    expect(internal).toHaveProperty('C');
    // Validate coordinates match FSM definition
    expect(internal.A.x).toBe(100);
    expect(internal.A.y).toBe(100);
    expect(internal.B.x).toBe(300);