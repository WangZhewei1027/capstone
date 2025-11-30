import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:5500/workspace/baseline-html2test-gpt-3.5-turbo/html/20d2d6c2-cd33-11f0-bdf9-b3d97e91273d.html';

// Page object model for interacting with the BFS visualization page
class GraphPage {
  constructor(page) {
    this.page = page;
    this.startBtn = page.locator('#startBtn');
    this.stepBtn = page.locator('#stepBtn');
    this.autoBtn = page.locator('#autoBtn');
    this.resetBtn = page.locator('#resetBtn');
    this.startSelect = page.locator('#startNode');
    this.queueDisplay = page.locator('#queue-display');
    this.speedRange = page.locator('#speedRange');
    this.speedValue = page.locator('#speedValue');
    this.svg = page.locator('svg');
  }

  async goto() {
    await this.page.goto(APP_URL);
  }

  async clickNode(nodeId) {
    // Click the circle element representing the node
    const node = this.page.locator(`svg circle.node[data-id="${nodeId}"]`);
    await node.click();
  }

  async selectStart(nodeId) {
    await this.startSelect.selectOption(nodeId);
  }

  async clickStart() {
    await this.startBtn.click();
  }

  async clickStep() {
    await this.stepBtn.click();
  }

  async clickAuto() {
    await this.autoBtn.click();
  }

  async clickReset() {
    await this.resetBtn.click();
  }

  async setSpeed(ms) {
    // Use evaluate to set value and dispatch input event so handlers run
    await this.page.evaluate((v) => {
      const el = document.getElementById('speedRange');
      el.value = String(v);
      const ev = new Event('input', { bubbles: true });
      el.dispatchEvent(ev);
    }, ms);
  }

  async getQueueText() {
    return (await this.queueDisplay.textContent()).trim();
  }

  async getNodeClasses(nodeId) {
    const cls = await this.page.locator(`svg circle.node[data-id="${nodeId}"]`).getAttribute('class');
    return (cls || '').split(/\s+/).filter(Boolean);
  }

  async edgeHasVisitedClass(u, v) {
    // Edge lines have attributes x1,y1,x2,y2. Find the line between coordinates for u->v.
    // But we can query edge elements and inspect whether their connected nodes match u/v by reading attributes and comparing to node positions in JS context.
    return await this.page.evaluate(([uId, vId]) => {
      // Reconstruct node positions from page script's nodes array in DOM (we cannot access closure variables),
      // so instead find the <text> elements with node labels and use their nearby circle coordinates.
      const getPos = (id) => {
        const circle = Array.from(document.querySelectorAll('svg circle.node')).find(c => c.getAttribute('data-id') === id);
        if (!circle) return null;
        return { x: circle.getAttribute('cx'), y: circle.getAttribute('cy') };
      };
      const posU = getPos(uId);
      const posV = getPos(vId);
      if (!posU || !posV) return false;
      const lines = Array.from(document.querySelectorAll('svg line.edge'));
      for (const line of lines) {
        const match1 = line.getAttribute('x1') === posU.x && line.getAttribute('y1') === posU.y &&
                       line.getAttribute('x2') === posV.x && line.getAttribute('y2') === posV.y;
        const match2 = line.getAttribute('x1') === posV.x && line.getAttribute('y1') === posV.y &&
                       line.getAttribute('x2') === posU.x && line.getAttribute('y2') === posU.y;
        if ((match1 || match2) && line.classList.contains('visited')) return true;
      }
      return false;
    }, [u, v]);
  }

  async isButtonDisabled(selector) {
    return await this.page.locator(selector).isDisabled();
  }
}

test.describe('Breadth-First Search (BFS) Visualization - End-to-end', () => {
  let page;
  let graph;
  let consoleErrors;
  let pageErrors;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    graph = new GraphPage(page);

    // Collect console errors and page errors for assertions
    consoleErrors = [];
    pageErrors = [];

    page.on('console', msg => {
      // capture runtime console errors
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await graph.goto();
  });

  test.afterEach(async () => {
    // Ensure page is closed after each test
    await page.close();
  });

  test('Initial page load: elements exist and controls default state', async () => {
    // Verify critical UI elements are present and in expected initial state
    await expect(page.locator('h1')).toHaveText('Breadth-First Search (BFS) Visualization');
    await expect(graph.startBtn).toBeVisible();
    await expect(graph.stepBtn).toBeVisible();
    await expect(graph.autoBtn).toBeVisible();
    await expect(graph.resetBtn).toBeVisible();
    await expect(graph.startSelect).toBeVisible();

    // Start button should be enabled, step and auto disabled initially
    expect(await graph.startBtn.isEnabled()).toBe(true);
    expect(await graph.stepBtn.isDisabled()).toBe(true);
    expect(await graph.autoBtn.isDisabled()).toBe(true);

    // Queue display should show empty
    const queue = await graph.getQueueText();
    expect(queue).toContain('Queue:');
    expect(queue).toContain('(empty)');

    // Speed default should be 800ms
    await expect(graph.speedValue).toHaveText('800ms');

    // No console or page errors on initial load
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Clicking a node selects it as the start node (via SVG click)', async () => {
    // Click node C and assert the start select updates and circle receives .start class
    await graph.clickNode('C');

    // The select value should update to 'C'
    const selected = await page.locator('#startNode').inputValue();
    expect(selected).toBe('C');

    // Circle should include 'start' class
    const classes = await graph.getNodeClasses('C');
    expect(classes).toContain('start');

    // No console or page errors produced by clicking
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Selecting start via dropdown and stepping BFS updates queue and node classes', async () => {
    // Select 'A' as start node
    await graph.selectStart('A');

    // Click Start - this will perform the first BFS step automatically
    // The page code runs alert() when BFS finishes; here it won't finish immediately.
    await graph.clickStart();

    // After first step, node A should be the current node (yellow)
    const aClasses = await graph.getNodeClasses('A');
    expect(aClasses).toContain('current');

    // The queue should now contain the neighbors of A (B and C) in the expected order 'B → C'
    const queueText1 = await graph.getQueueText();
    expect(queueText1).toContain('B → C');

    // The edges from A to B and A to C should be highlighted (have visited class)
    const edgeABVisited = await graph.edgeHasVisitedClass('A', 'B');
    const edgeACVisited = await graph.edgeHasVisitedClass('A', 'C');
    expect(edgeABVisited).toBe(true);
    expect(edgeACVisited).toBe(true);

    // Step once more - this should make A visited and B the current node
    await graph.clickStep();
    // After stepping, A should have 'visited' but not 'current'
    const aClassesAfter = await graph.getNodeClasses('A');
    expect(aClassesAfter).toContain('visited');
    expect(aClassesAfter).not.toContain('current');

    // B should be current now
    const bClasses = await graph.getNodeClasses('B');
    expect(bClasses).toContain('current');

    // Queue should show remaining items (C → D) after processing B's unseen neighbor D
    const queueText2 = await graph.getQueueText();
    expect(queueText2).toContain('C'); // C remains
    expect(queueText2).toContain('D'); // D should be enqueued after processing B

    // No console or page errors during stepping
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Auto Run runs to completion and triggers completion alert; queue ends empty and nodes visited', async () => {
    // Select start 'A' and start BFS
    await graph.selectStart('A');

    // Speed up the auto-run to make the test faster
    await graph.setSpeed(200);
    await expect(graph.speedValue).toHaveText('200ms');

    // Start BFS
    await graph.clickStart();

    // Start auto-run: clicking auto Btn will start setInterval and eventually an alert('BFS complete!')
    const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 });
    await graph.clickAuto();

    // Accept the completion dialog when it appears
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('BFS complete');
    await dialog.accept();

    // After completion, queue should be empty
    const finalQueue = await graph.getQueueText();
    expect(finalQueue).toContain('(empty)');

    // All nodes should be marked as visited (or at least not 'current'); verify a subset to confirm traversal:
    const nodesToCheck = ['A','B','C','D','E','F','G','H'];
    for (const id of nodesToCheck) {
      const classes1 = await graph.getNodeClasses(id);
      // At completion, nodes should have been visited (visited class) or at least not be 'current'
      expect(classes).not.toContain('current');
      // The visualization marks visited nodes with 'visited' class (except possibly isolated unreachable nodes)
      // In this graph all nodes are reachable, so assert 'visited' present
      expect(classes).toContain('visited');
    }

    // Auto button should show 'Auto Run' again after finishing
    await expect(graph.autoBtn).toHaveText('Auto Run');

    // No uncaught console or page errors during auto run
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Reset clears visualization and returns UI to initial state', async () => {
    // Start BFS from B, step once, then reset and verify cleared state
    await graph.selectStart('B');
    await graph.clickStart();

    // Ensure some change happened: B is current
    const bClassesBefore = await graph.getNodeClasses('B');
    expect(bClassesBefore).toContain('current');

    // Now click Reset
    await graph.clickReset();

    // All node circles should not have 'visited', 'current', or 'start' classes
    const nodes = ['A','B','C','D','E','F','G','H'];
    for (const id of nodes) {
      const classes2 = await graph.getNodeClasses(id);
      expect(classes).not.toContain('visited');
      expect(classes).not.toContain('current');
      expect(classes).not.toContain('start');
    }

    // Queue should be empty again
    const queueAfterReset = await graph.getQueueText();
    expect(queueAfterReset).toContain('(empty)');

    // Step and Auto should be disabled again
    expect(await graph.stepBtn.isDisabled()).toBe(true);
    expect(await graph.autoBtn.isDisabled()).toBe(true);

    // Start should be enabled
    expect(await graph.startBtn.isEnabled()).toBe(true);

    // No console or page errors due to reset
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Changing speed input updates displayed value and interrupts auto-run if running', async () => {
    // Start BFS and start auto-run
    await graph.selectStart('A');
    await graph.clickStart();

    // Start auto-run
    const dialogPromise1 = page.waitForEvent('dialog', { timeout: 5000 });
    await graph.clickAuto();

    // While auto-run is active, change speed to trigger input event that will stop auto-run in implementation
    await graph.setSpeed(1000);
    await expect(graph.speedValue).toHaveText('1000ms');

    // The code will clear autoInterval on input; either way, BFS will still continue to completion and produce a dialog. Accept it.
    const dialog1 = await dialogPromise;
    await dialog.accept();

    // Ensure speed update did not cause errors
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });

  test('Accessibility checks: controls have ARIA attributes and SVG area exists', async () => {
    // Check graph container ARIA
    const container = page.locator('#graph-container');
    await expect(container).toHaveAttribute('aria-label', 'Graph visualization area');

    // Controls region should have aria-label
    const controls = page.locator('#controls');
    await expect(controls).toHaveAttribute('aria-label', 'Controls for BFS visualization');

    // Queue display should have aria-live and role
    const queue1 = page.locator('#queue1-display');
    await expect(queue).toHaveAttribute('aria-live', 'polite');
    await expect(queue).toHaveAttribute('role', 'region');

    // Each node group has role=button and aria-label describing the node
    const nodeGroup = page.locator('svg g[role="button"]').first();
    await expect(nodeGroup).toBeVisible();
    const ariaLabel = await nodeGroup.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Node [A-Z], click to select as start node/);

    // No console or page errors during accessibility checks
    expect(consoleErrors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});